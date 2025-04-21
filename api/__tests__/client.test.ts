import { fetchCoins, fetchConversion } from '../client'
import axios from 'axios'

jest.mock('axios', () => {
  const axiosMock = {
    get: jest.fn(),
  }
  return {
    create: jest.fn(() => axiosMock),
    isAxiosError: jest.fn(),
  }
})

describe('API Client', () => {
  let axiosMock: { get: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()
    axiosMock = axios.create() as unknown as { get: jest.Mock }
  })

  describe('fetchCoins', () => {
    it('should fetch and validate coins successfully', async () => {
      const mockCoins = [
        { id: 1, name: 'Bitcoin', symbol: 'BTC' },
        { id: 2, name: 'Ethereum', symbol: 'ETH' },
      ]

      axiosMock.get.mockResolvedValueOnce({ data: mockCoins })

      const result = await fetchCoins()

      expect(result).toEqual(mockCoins)
      expect(axiosMock.get).toHaveBeenCalledWith('/coins')
    })

    it('should handle Zod validation error', async () => {
      const invalidCoins = [{ invalid: 'data' }]

      axiosMock.get.mockResolvedValueOnce({ data: invalidCoins })

      await expect(fetchCoins()).rejects.toEqual(
        expect.objectContaining({
          message: expect.stringContaining('Invalid coin data'),
        })
      )
    })

    it('should handle axios error', async () => {
      const axiosError = new Error('Network error')
      Object.defineProperty(axiosError, 'response', {
        value: { data: { message: 'API error' } },
      })

      axiosMock.get.mockRejectedValueOnce(axiosError)
      jest.mocked(axios.isAxiosError).mockReturnValueOnce(true)

      await expect(fetchCoins()).rejects.toEqual(
        expect.objectContaining({
          message: 'API error',
        })
      )
    })
  })

  describe('fetchConversion', () => {
    it('should fetch and validate conversion successfully', async () => {
      const mockPayload = { from: '1', to: '2', fromAmount: 1 }
      const mockResponse = { rate: 0.5, estimatedAmount: 0.5 }

      axiosMock.get.mockResolvedValueOnce({ data: mockResponse })

      const result = await fetchConversion(mockPayload)

      expect(result).toEqual(mockResponse)
      expect(axiosMock.get).toHaveBeenCalledWith('/conversion', {
        params: mockPayload,
      })
    })

    it('should handle invalid conversion response', async () => {
      const mockPayload = { from: '1', to: '2', fromAmount: 1 }
      const invalidResponse = { invalid: 'data' }

      axiosMock.get.mockResolvedValueOnce({ data: invalidResponse })

      await expect(fetchConversion(mockPayload)).rejects.toEqual(
        expect.objectContaining({
          message: expect.stringContaining('Invalid conversion data'),
        })
      )
    })
  })
})
