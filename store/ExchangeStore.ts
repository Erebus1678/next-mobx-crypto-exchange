import { makeAutoObservable, runInAction } from 'mobx'

import { exchangeService, type ExchangeService } from '@/services/exchangeService'
import type { Coin, ApiError } from '@/types/api'
import { AMOUNT_ERROR_MESSAGE, MAX_DECIMALS, isValidAmountFormat, parseAmount } from '@/utils/amount'
import { debounce } from '@/utils/debounce'

const DEBOUNCE_DELAY = 300
const AUTO_RETRY_DELAY = 10000
const DEFAULT_FROM_AMOUNT = '1'

/** Which field the user last edited. The OTHER field is always the derived one. */
type Field = 'from' | 'to'

/** Format a computed numeric result for display, trimming float noise. */
function formatAmount(value: number): string {
  return Number(value.toFixed(MAX_DECIMALS)).toString()
}

/**
 * Widget-local store for the currency converter.
 *
 * Source-of-truth model: `source` marks the field the user last edited; the
 * other field is always *derived* from it. Every currency change and swap
 * recomputes the derived field from the source amount — a previously computed
 * output is never reused as input. Conversion/rate logic lives in the injected
 * {@link ExchangeService}; this store only holds state and orchestrates it.
 */
export class ExchangeStore {
  coins: Coin[] = []
  fromCurrency: Coin | null = null
  toCurrency: Coin | null = null
  fromAmount: string = DEFAULT_FROM_AMOUNT
  toAmount: string = ''
  rateInfo: string | null = null
  amountError: string | null = null
  source: Field = 'from'

  isLoadingCoins = false
  isLoadingRate = false
  error: string | null = null
  hasLoadedCoins = false

  private readonly service: ExchangeService
  private readonly debouncedRecalculate: (() => void) & { cancel: () => void }
  private autoRetryTimeoutId: ReturnType<typeof setTimeout> | null = null
  /** Monotonic token used to ignore stale (out-of-order) conversion responses. */
  private requestId = 0

  constructor(service: ExchangeService = exchangeService) {
    this.service = service
    makeAutoObservable<
      ExchangeStore,
      'service' | 'debouncedRecalculate' | 'autoRetryTimeoutId' | 'requestId'
    >(
      this,
      {
        service: false,
        debouncedRecalculate: false,
        autoRetryTimeoutId: false,
        requestId: false,
      },
      { autoBind: true }
    )
    this.debouncedRecalculate = debounce(this.recalculate, DEBOUNCE_DELAY)
  }

  // --- Computed ---

  get filteredCoins() {
    return this.coins.slice().sort((a, b) => a.name.localeCompare(b.name))
  }

  get activeFromCurrency() {
    if (!this.fromCurrency) return null
    return this.coins.find(c => c.id === this.fromCurrency?.id) ?? null
  }

  get activeToCurrency() {
    if (!this.toCurrency) return null
    return this.coins.find(c => c.id === this.toCurrency?.id) ?? null
  }

  get canUseExchangeForm() {
    return this.hasLoadedCoins && !this.isLoadingCoins && this.coins.length > 0
  }

  /** Spinner belongs on the field being computed (the non-source field). */
  get isLoadingFrom() {
    return this.isLoadingRate && this.source === 'to'
  }

  get isLoadingTo() {
    return this.isLoadingRate && this.source === 'from'
  }

  get fromAmountError() {
    return this.source === 'from' ? this.amountError : null
  }

  get toAmountError() {
    return this.source === 'to' ? this.amountError : null
  }

  // --- Atomic state setters ---

  setCoins(coins: Coin[]) {
    this.coins = coins
  }

  setError(message: string | null) {
    this.error = message
  }

  // --- Coin loading ---

  async loadCoins() {
    this.clearAutoRetry()
    this.isLoadingCoins = true
    this.error = null

    try {
      const coins = await this.service.loadCoins()
      runInAction(() => {
        this.coins = coins
        this.hasLoadedCoins = true
        this.fromCurrency = this.pickDefault(coins, 'btc') ?? coins[0] ?? null
        this.toCurrency = this.pickDefault(coins, 'usdt') ?? (coins.length > 1 ? coins[1] : null)
        this.source = 'from'
        this.fromAmount = DEFAULT_FROM_AMOUNT
        this.toAmount = ''
        this.amountError = null
      })
      this.recalculate()
    } catch (err) {
      runInAction(() => {
        this.error = (err as ApiError).message || 'Failed to load currencies'
        this.coins = []
        this.hasLoadedCoins = false
        this.autoRetryTimeoutId = setTimeout(() => this.retryLoadCoins(), AUTO_RETRY_DELAY)
      })
    } finally {
      runInAction(() => {
        this.isLoadingCoins = false
      })
    }
  }

  retryLoadCoins() {
    return this.loadCoins()
  }

  // --- Currency actions ---

  setFromCurrency(currency: Coin | null) {
    if (currency && currency.id === this.toCurrency?.id) {
      this.swap()
      return
    }
    this.fromCurrency = currency
    this.recalculateFromSource()
  }

  setToCurrency(currency: Coin | null) {
    if (currency && currency.id === this.fromCurrency?.id) {
      this.swap()
      return
    }
    this.toCurrency = currency
    this.recalculateFromSource()
  }

  /** Flip currencies, keep the user's entered source amount, recompute the rest. */
  swap() {
    const previousFrom = this.fromCurrency
    this.fromCurrency = this.toCurrency
    this.toCurrency = previousFrom
    this.recalculateFromSource()
  }

  // --- Amount actions ---

  setFromAmount(value: string) {
    this.source = 'from'
    this.fromAmount = value
    this.handleAmountInput()
  }

  setToAmount(value: string) {
    this.source = 'to'
    this.toAmount = value
    this.handleAmountInput()
  }

  // --- Lifecycle ---

  dispose() {
    this.clearAutoRetry()
    this.cancelPendingRecalculate()
    this.requestId++
  }

  // --- Private helpers ---

  private pickDefault(coins: Coin[], symbol: string): Coin | null {
    return coins.find(c => c.symbol.toLowerCase() === symbol) ?? null
  }

  private sourceAmount(): string {
    return this.source === 'from' ? this.fromAmount : this.toAmount
  }

  /** Clear the derived (non-source) field and the rate display. */
  private clearDerived() {
    if (this.source === 'from') this.toAmount = ''
    else this.fromAmount = ''
    this.rateInfo = null
  }

  private clearAutoRetry() {
    if (this.autoRetryTimeoutId) {
      clearTimeout(this.autoRetryTimeoutId)
      this.autoRetryTimeoutId = null
    }
  }

  private cancelPendingRecalculate() {
    this.debouncedRecalculate.cancel()
  }

  /** Validate the freshly typed value, then debounce a conversion if it's usable. */
  private handleAmountInput() {
    this.error = null
    this.requestId++
    this.cancelPendingRecalculate()
    this.clearDerived()

    const value = this.sourceAmount()

    if (value === '') {
      this.amountError = null
      this.isLoadingRate = false
      return
    }

    if (parseAmount(value) === null) {
      this.amountError = isValidAmountFormat(value) ? null : AMOUNT_ERROR_MESSAGE
      this.isLoadingRate = false
      return
    }

    this.amountError = null
    this.isLoadingRate = true
    this.debouncedRecalculate()
  }

  /** Recompute the derived field from the source amount after a currency change. */
  private recalculateFromSource() {
    this.error = null
    this.rateInfo = null
    this.requestId++
    this.cancelPendingRecalculate()
    this.clearDerived()

    if (parseAmount(this.sourceAmount()) === null || !this.fromCurrency || !this.toCurrency) {
      this.isLoadingRate = false
      return
    }

    this.isLoadingRate = true
    this.recalculate()
  }

  /** Perform the actual conversion for the current source field. */
  private async recalculate() {
    const field = this.source
    const amount = parseAmount(this.sourceAmount())
    const fromCoin = this.fromCurrency
    const toCoin = this.toCurrency

    if (amount === null || !fromCoin || !toCoin) {
      this.clearDerived()
      this.isLoadingRate = false
      return
    }

    const requestId = ++this.requestId
    this.isLoadingRate = true
    this.error = null

    try {
      const { amount: result, rate } = await this.service.convert({
        fromCoin,
        toCoin,
        amount,
        direction: field,
      })
      runInAction(() => {
        if (requestId !== this.requestId) return
        if (field === 'from') this.toAmount = formatAmount(result)
        else this.fromAmount = formatAmount(result)
        this.rateInfo = this.service.formatRate(fromCoin, toCoin, rate)
        this.isLoadingRate = false
      })
    } catch (err) {
      runInAction(() => {
        if (requestId !== this.requestId) return
        this.error = (err as ApiError).message || 'Failed to fetch conversion rate'
        this.clearDerived()
        this.isLoadingRate = false
      })
    }
  }
}

export function createExchangeStore(service: ExchangeService = exchangeService): ExchangeStore {
  return new ExchangeStore(service)
}
