export interface Coin {
  id: number
  name: string
  symbol: string
}

export interface ConversionPayload {
  from: string
  to: string
  fromAmount?: number
  toAmount?: number
}

export interface ConversionResponse {
  rate: number
  estimatedAmount: number
}

export interface ApiError {
  message: string
}
