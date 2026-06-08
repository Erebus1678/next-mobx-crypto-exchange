import { fetchCoins, fetchConversion } from '@/api/client'
import type { Coin, ConversionPayload } from '@/types/api'

/**
 * Direction of a conversion request.
 * - `from`: the user supplied a source amount, we want the resulting target amount.
 * - `to`:   the user supplied a target amount, we want the required source amount.
 */
export type ConversionDirection = 'from' | 'to'

export interface ConversionRequest {
  fromCoin: Coin
  toCoin: Coin
  amount: number
  direction: ConversionDirection
}

export interface ConversionResult {
  /** The computed amount for the field the user did NOT edit. */
  amount: number
  /** Rate as returned by the API (target units per 1 source unit). */
  rate: number
}

/**
 * Domain service for the exchange widget.
 *
 * Owns all rate-fetching/conversion orchestration so the store and components
 * never talk to the HTTP layer directly. The HTTP + schema-validation concerns
 * stay in `api/client`; this layer maps domain intent onto those calls.
 */
export interface ExchangeService {
  loadCoins(): Promise<Coin[]>
  convert(request: ConversionRequest): Promise<ConversionResult>
  formatRate(fromCoin: Coin, toCoin: Coin, rate: number): string
}

const RATE_DISPLAY_DECIMALS = 6

export const exchangeService: ExchangeService = {
  loadCoins() {
    return fetchCoins()
  },

  async convert({ fromCoin, toCoin, amount, direction }: ConversionRequest): Promise<ConversionResult> {
    const payload: ConversionPayload =
      direction === 'from'
        ? { from: String(fromCoin.id), to: String(toCoin.id), fromAmount: amount }
        : { from: String(fromCoin.id), to: String(toCoin.id), toAmount: amount }

    const response = await fetchConversion(payload)
    return { amount: response.estimatedAmount, rate: response.rate }
  },

  formatRate(fromCoin: Coin, toCoin: Coin, rate: number): string {
    return `1 ${fromCoin.symbol} ≈ ${rate.toFixed(RATE_DISPLAY_DECIMALS)} ${toCoin.symbol}`
  },
}
