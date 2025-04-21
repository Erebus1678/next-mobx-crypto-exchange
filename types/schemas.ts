import * as z from 'zod'

export const coinSchema = z.object({
  id: z.number(),
  name: z.string(),
  symbol: z.string(),
})

export const coinsSchema = z.array(coinSchema)

export const conversionResponseSchema = z.object({
  rate: z.number(),
  estimatedAmount: z.number(),
})

export type Coin = z.infer<typeof coinSchema>
export type ConversionResponse = z.infer<typeof conversionResponseSchema>
