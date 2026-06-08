import { configure } from 'mobx'

import type { ExchangeService } from '@/services/exchangeService'
import type { Coin } from '@/types/api'

import { createExchangeStore, ExchangeStore } from '../ExchangeStore'

// Allow direct state reads/writes in assertions without action warnings.
configure({ enforceActions: 'never' })

const BTC: Coin = { id: 1, name: 'Bitcoin', symbol: 'BTC' }
const USDT: Coin = { id: 2, name: 'Tether', symbol: 'USDT' }
const ETH: Coin = { id: 3, name: 'Ethereum', symbol: 'ETH' }
const COINS = [BTC, USDT, ETH]

// Deterministic pair rates (target units per 1 source unit).
const RATES: Record<string, number> = {
  '1->2': 90000, // BTC -> USDT
  '2->1': 1 / 90000,
  '1->3': 30, // BTC -> ETH
  '3->1': 1 / 30,
  '2->3': 30 / 90000,
  '3->2': 90000 / 30,
}

function createMockService(overrides: Partial<ExchangeService> = {}): jest.Mocked<ExchangeService> {
  return {
    loadCoins: jest.fn().mockResolvedValue(COINS),
    convert: jest.fn(async ({ fromCoin, toCoin, amount, direction }) => {
      const rate = RATES[`${fromCoin.id}->${toCoin.id}`]
      // direction 'from': amount is the source, return the target amount.
      // direction 'to': amount is the desired target, return the source needed.
      return { amount: direction === 'from' ? amount * rate : amount / rate, rate }
    }),
    formatRate: (fromCoin, toCoin, rate) =>
      `1 ${fromCoin.symbol} ≈ ${rate.toFixed(6)} ${toCoin.symbol}`,
    ...overrides,
  }
}

/** Flush pending microtasks + the (non-debounced) async conversion. */
const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0))

async function loadedStore(service = createMockService()): Promise<ExchangeStore> {
  const store = createExchangeStore(service)
  await store.loadCoins()
  await flush()
  return store
}

describe('ExchangeStore', () => {
  describe('loadCoins', () => {
    it('loads coins and sets BTC/USDT defaults', async () => {
      const store = await loadedStore()
      expect(store.coins).toEqual(COINS)
      expect(store.fromCurrency).toEqual(BTC)
      expect(store.toCurrency).toEqual(USDT)
      expect(store.isLoadingCoins).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles load errors', async () => {
      const service = createMockService({
        loadCoins: jest.fn().mockRejectedValue({ message: 'API error' }),
      })
      const store = createExchangeStore(service)
      await store.loadCoins()
      expect(store.coins).toEqual([])
      expect(store.error).toBe('API error')
      expect(store.hasLoadedCoins).toBe(false)
      store.dispose() // cancel the scheduled auto-retry
    })
  })

  // Finding #4: the top input defaults to 1.
  describe('finding #4 — default source amount', () => {
    it('defaults the From amount to "1" after coins load', async () => {
      const store = await loadedStore()
      expect(store.fromAmount).toBe('1')
    })

    it('computes the initial To amount from the default 1', async () => {
      const store = await loadedStore()
      expect(store.toAmount).toBe('90000') // 1 BTC * 90000
    })
  })

  // Finding #2: weak input validation.
  describe('finding #2 — input validation', () => {
    it.each([
      '1234123-12341234-12341234',
      'abc',
      '1.2.3',
      '--5',
      '1-2',
      '01',
      '0.123456789', // 9 decimals > cap of 8
    ])('rejects malformed input %p without crashing or converting', async malformed => {
      const service = createMockService()
      const store = await loadedStore(service)
      service.convert.mockClear()

      store.setFromAmount(malformed)

      expect(store.fromAmountError).toBeTruthy()
      expect(store.toAmount).toBe('') // derived field cleared, not garbage
      await flush()
      expect(service.convert).not.toHaveBeenCalled() // no conversion fired for bad input
    })

    it('accepts a valid positive decimal', async () => {
      const store = await loadedStore()
      store.setFromAmount('2.5')
      expect(store.fromAmountError).toBeNull()
    })
  })

  // Finding #1: swap must flip currencies, keep the source amount, recompute.
  describe('finding #1 — swap logic', () => {
    it('flips currencies, keeps the entered source amount, and recomputes', async () => {
      const store = await loadedStore()
      expect(store.fromAmount).toBe('1')
      expect(store.toAmount).toBe('90000')

      store.swap()
      await flush()

      expect(store.fromCurrency).toEqual(USDT)
      expect(store.toCurrency).toEqual(BTC)
      // Source amount preserved (NOT swapped with the computed output).
      expect(store.fromAmount).toBe('1')
      // To recomputed from source through the flipped pair, not the stale 90000.
      expect(store.toAmount).not.toBe('90000')
      expect(Number(store.toAmount)).toBeCloseTo(1 / 90000, 8)
    })
  })

  // Finding #3: clearing the bottom currency must NOT wipe the top input.
  describe('finding #3 — clearing the To currency', () => {
    it('keeps the From amount when the To currency is cleared', async () => {
      const store = await loadedStore()
      expect(store.fromAmount).toBe('1')

      store.setToCurrency(null)
      await flush()

      expect(store.toCurrency).toBeNull()
      expect(store.fromAmount).toBe('1') // top input preserved
      expect(store.toAmount).toBe('') // derived cleared
    })
  })

  // Finding #5: changing a currency must recompute from the ORIGINAL source
  // amount, never reuse the previously computed output as the new input.
  describe('finding #5 — recompute from source, not computed output', () => {
    it('recomputes from the source amount when the target currency changes', async () => {
      const service = createMockService()
      const store = await loadedStore(service)

      // BTC/USDT, 1 -> 90000 computed.
      expect(store.toAmount).toBe('90000')

      service.convert.mockClear()
      store.setToCurrency(ETH) // USDT -> ETH
      await flush()

      // The conversion must use the source amount (1), NOT the computed 90000.
      expect(service.convert).toHaveBeenCalledTimes(1)
      expect(service.convert.mock.calls[0][0]).toMatchObject({
        amount: 1,
        direction: 'from',
        fromCoin: BTC,
        toCoin: ETH,
      })
      expect(store.toAmount).toBe('30') // 1 BTC -> 30 ETH, not an explosion
    })

    it('recomputes from the source amount when the source currency changes', async () => {
      const service = createMockService()
      const store = await loadedStore(service)

      service.convert.mockClear()
      store.setFromCurrency(ETH) // BTC -> ETH on the source side
      await flush()

      expect(service.convert).toHaveBeenCalledTimes(1)
      expect(service.convert.mock.calls[0][0]).toMatchObject({ amount: 1, direction: 'from' })
    })
  })

  describe('conversion result', () => {
    it('updates the rate display on success', async () => {
      const store = await loadedStore()
      expect(store.rateInfo).toBe('1 BTC ≈ 90000.000000 USDT')
    })

    it('surfaces API errors and clears the derived field', async () => {
      const service = createMockService({
        convert: jest.fn().mockRejectedValue({ message: 'API error' }),
      })
      const store = createExchangeStore(service)
      await store.loadCoins()
      await flush()
      expect(store.error).toBe('API error')
      expect(store.toAmount).toBe('')
    })
  })

  describe('reverse editing (To field)', () => {
    it('recomputes the From amount when the user types in To', async () => {
      jest.useFakeTimers()
      try {
        const service = createMockService()
        const store = createExchangeStore(service)
        await store.loadCoins()
        await Promise.resolve()

        store.setToAmount('90000') // want 90000 USDT, how much BTC?
        jest.advanceTimersByTime(300) // flush debounce
        await Promise.resolve()
        await Promise.resolve()

        expect(service.convert).toHaveBeenLastCalledWith(
          expect.objectContaining({ amount: 90000, direction: 'to' })
        )
        store.dispose()
      } finally {
        jest.useRealTimers()
      }
    })
  })
})
