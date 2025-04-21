import axios from 'axios'
import { ZodError } from 'zod'
import type { Coin, ConversionPayload, ConversionResponse, ApiError } from '@/types/api'
import { coinsSchema, conversionResponseSchema } from '@/types/schemas'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const fetchCoins = async (): Promise<Coin[]> => {
  try {
    const response = await apiClient.get<unknown>('/coins')

    const validatedData = coinsSchema.parse(response.data)
    return validatedData
  } catch (error) {
    console.error('Error fetching or validating coins:', error)
    if (error instanceof ZodError) {
      throw {
        message: `Invalid coin data received from API: ${error.errors.map(e => e.message).join(', ')}`,
      } as ApiError
    }
    if (axios.isAxiosError(error) && error.response) {
      throw { message: error.response.data?.message || 'Failed to fetch coins' } as ApiError
    } else {
      throw { message: (error as Error).message || 'An unknown error occurred' } as ApiError
    }
  }
}

export const fetchConversion = async (payload: ConversionPayload): Promise<ConversionResponse> => {
  try {
    const response = await apiClient.get<unknown>('/conversion', {
      params: payload,
    })

    const validatedData = conversionResponseSchema.parse(response.data)
    return validatedData
  } catch (error) {
    console.error('Error fetching or validating conversion:', error)
    if (error instanceof ZodError) {
      throw {
        message: `Invalid conversion data received from API: ${error.errors.map(e => e.message).join(', ')}`,
      } as ApiError
    }
    if (axios.isAxiosError(error) && error.response) {
      throw {
        message: error.response.data?.message || 'Failed to fetch conversion rate',
      } as ApiError
    } else {
      throw { message: (error as Error).message || 'An unknown error occurred' } as ApiError
    }
  }
}
