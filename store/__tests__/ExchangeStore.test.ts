// @ts-nocheck
// Для запуска тестов нужно установить типы: npm install --save-dev @types/jest
import { exchangeStore } from '../ExchangeStore'
import { fetchCoins, fetchConversion } from '@/api/client'
import { Coin } from '@/types/api'
import { configure } from 'mobx'

// Разрешить синхронные действия в MobX для тестов
configure({ enforceActions: 'never' })

// Мокаем модули API
jest.mock('@/api/client', () => ({
  fetchCoins: jest.fn(),
  fetchConversion: jest.fn(),
}))

describe('ExchangeStore', () => {
  // Создаем свежее состояние перед каждым тестом
  beforeEach(() => {
    jest.clearAllMocks()

    // Сбрасываем состояние стора
    exchangeStore.coins = []
    exchangeStore.fromCurrency = null
    exchangeStore.toCurrency = null
    exchangeStore.fromAmount = ''
    exchangeStore.toAmount = ''
    exchangeStore.rateInfo = null
    exchangeStore.error = null
    exchangeStore.isLoadingCoins = false
    exchangeStore.isLoadingRateFrom = false
    exchangeStore.isLoadingRateTo = false
  })

  describe('loadCoins', () => {
    it('should load coins successfully and set default currencies', async () => {
      // Подготавливаем тестовые данные
      const mockCoins = [
        { id: 1, name: 'Bitcoin', symbol: 'BTC' },
        { id: 2, name: 'Ethereum', symbol: 'ETH' },
      ]

      // Мокируем API
      ;(fetchCoins as jest.Mock).mockResolvedValueOnce(mockCoins)

      // Действие
      await exchangeStore.loadCoins()

      // Проверка
      expect(exchangeStore.coins).toEqual(mockCoins)
      expect(exchangeStore.fromCurrency).toEqual(mockCoins[0])
      expect(exchangeStore.toCurrency).toEqual(mockCoins[1])
      expect(exchangeStore.isLoadingCoins).toBe(false)
      expect(exchangeStore.error).toBeNull()
      expect(fetchCoins).toHaveBeenCalledTimes(1)
    })

    it('should handle errors when loading coins', async () => {
      // Подготавливаем тестовые данные
      const error = { message: 'API error' }

      // Мокируем API для возврата ошибки
      ;(fetchCoins as jest.Mock).mockRejectedValueOnce(error)

      // Действие
      await exchangeStore.loadCoins()

      // Проверка
      expect(exchangeStore.coins).toEqual([])
      expect(exchangeStore.error).toBe('API error')
      expect(exchangeStore.isLoadingCoins).toBe(false)
    })
  })

  describe('setFromCurrency', () => {
    // Тестовые данные
    const mockCoins = [
      { id: 1, name: 'Bitcoin', symbol: 'BTC' },
      { id: 2, name: 'Ethereum', symbol: 'ETH' },
      { id: 3, name: 'Litecoin', symbol: 'LTC' },
    ]

    beforeEach(() => {
      // Устанавливаем начальное состояние
      exchangeStore.coins = mockCoins
      exchangeStore.fromCurrency = mockCoins[0]
      exchangeStore.toCurrency = mockCoins[1]

      // Мокируем API, чтобы предотвратить реальные вызовы
      ;(fetchConversion as jest.Mock).mockResolvedValue({
        rate: 15.5,
        estimatedAmount: 15.5,
      })
    })

    it('should set fromCurrency correctly', () => {
      // Действие - установка новой валюты
      exchangeStore.setFromCurrency(mockCoins[2])

      // Проверка
      expect(exchangeStore.fromCurrency).toEqual(mockCoins[2])
      expect(exchangeStore.toAmount).toBe('')
      expect(exchangeStore.rateInfo).toBeNull()
    })
  })

  describe('setToCurrency', () => {
    // Тестовые данные
    const mockCoins = [
      { id: 1, name: 'Bitcoin', symbol: 'BTC' },
      { id: 2, name: 'Ethereum', symbol: 'ETH' },
      { id: 3, name: 'Litecoin', symbol: 'LTC' },
    ]

    beforeEach(() => {
      // Устанавливаем начальное состояние
      exchangeStore.coins = mockCoins
      exchangeStore.fromCurrency = mockCoins[0]
      exchangeStore.toCurrency = mockCoins[1]

      // Мокируем API, чтобы предотвратить реальные вызовы
      ;(fetchConversion as jest.Mock).mockResolvedValue({
        rate: 15.5,
        estimatedAmount: 15.5,
      })
    })

    it('should set toCurrency correctly', () => {
      // Действие
      exchangeStore.setToCurrency(mockCoins[2])

      // Проверка
      expect(exchangeStore.toCurrency).toEqual(mockCoins[2])
      expect(exchangeStore.fromAmount).toBe('')
      expect(exchangeStore.rateInfo).toBeNull()
    })
  })

  describe('swapCurrencies', () => {
    // Тестовые данные
    const mockCoins = [
      { id: 1, name: 'Bitcoin', symbol: 'BTC' },
      { id: 2, name: 'Ethereum', symbol: 'ETH' },
    ]

    beforeEach(() => {
      // Устанавливаем начальное состояние
      exchangeStore.coins = mockCoins
      exchangeStore.fromCurrency = mockCoins[0]
      exchangeStore.toCurrency = mockCoins[1]
      exchangeStore.fromAmount = '10'
      exchangeStore.toAmount = '150'
      exchangeStore.rateInfo = '1 BTC = 15 ETH'
      exchangeStore.error = 'Previous error'

      // Мокируем API, чтобы предотвратить реальные вызовы
      ;(fetchConversion as jest.Mock).mockResolvedValue({
        rate: 15.5,
        estimatedAmount: 15.5,
      })
    })

    it('should swap currencies and amounts correctly', () => {
      // Сохраняем значения для проверки
      const originalFrom = exchangeStore.fromCurrency
      const originalTo = exchangeStore.toCurrency
      const originalFromAmount = exchangeStore.fromAmount
      const originalToAmount = exchangeStore.toAmount

      // Действие
      exchangeStore.swapCurrencies()

      // Проверка
      expect(exchangeStore.fromCurrency).toEqual(originalTo)
      expect(exchangeStore.toCurrency).toEqual(originalFrom)
      expect(exchangeStore.fromAmount).toBe(originalToAmount)
      expect(exchangeStore.toAmount).toBe(originalFromAmount)
      expect(exchangeStore.rateInfo).toBeNull()
      expect(exchangeStore.error).toBeNull()
    })
  })

  describe('setAmount', () => {
    // Тестовые данные
    const mockCoins = [
      { id: 1, name: 'Bitcoin', symbol: 'BTC' },
      { id: 2, name: 'Ethereum', symbol: 'ETH' },
    ]

    beforeEach(() => {
      // Устанавливаем начальное состояние
      exchangeStore.coins = mockCoins
      exchangeStore.fromCurrency = mockCoins[0]
      exchangeStore.toCurrency = mockCoins[1]

      // Мокируем API, чтобы предотвратить реальные вызовы
      ;(fetchConversion as jest.Mock).mockResolvedValue({
        rate: 15.5,
        estimatedAmount: 15.5,
      })
    })

    it('should handle setting invalid amount correctly', () => {
      // Действие с невалидным значением
      exchangeStore.setAmount('invalid', 'from')

      // Проверка
      expect(exchangeStore.fromAmount).toBe('invalid')
      expect(exchangeStore.toAmount).toBe('')
      expect(exchangeStore.rateInfo).toBeNull()
    })

    // Тест на валидное значение требует асинхронного ожидания
    it('should trigger rate calculation with valid amount', async () => {
      // Устанавливаем валидное значение
      exchangeStore.setAmount('10', 'from')

      // Проверка, что вызвался запрос к API с правильными параметрами
      expect(fetchConversion).toHaveBeenCalledWith({
        from: '1', // ID первой монеты
        to: '2', // ID второй монеты
        fromAmount: 10,
      })
    })
  })

  describe('API interaction', () => {
    // Тестовые данные
    const mockCoins = [
      { id: 1, name: 'Bitcoin', symbol: 'BTC' },
      { id: 2, name: 'Ethereum', symbol: 'ETH' },
    ]

    const mockConversionResponse = {
      rate: 15.5,
      estimatedAmount: 15.5,
    }

    beforeEach(() => {
      // Устанавливаем начальное состояние
      exchangeStore.coins = mockCoins
      exchangeStore.fromCurrency = mockCoins[0]
      exchangeStore.toCurrency = mockCoins[1]

      // Мокируем API для полной конверсии
      ;(fetchConversion as jest.Mock).mockResolvedValue(mockConversionResponse)
    })

    it('should update store with conversion result', async () => {
      // Устанавливаем валидное значение и ждем обновление состояния
      exchangeStore.setAmount('10', 'from')

      // Даем время для обработки асинхронного запроса
      await new Promise(resolve => setTimeout(resolve, 100))

      // Проверка обновления стора после получения ответа
      expect(exchangeStore.toAmount).toBe('15.5')
      expect(exchangeStore.rateInfo).toBe('1 BTC = 15.500000 ETH')
    })

    it('should handle API errors correctly', async () => {
      // Мокируем ошибку API
      const error = { message: 'API error' }
      ;(fetchConversion as jest.Mock).mockRejectedValueOnce(error)

      // Устанавливаем валидное значение, которое вызовет API и ошибку
      exchangeStore.setAmount('10', 'from')

      // Даем время для обработки асинхронного запроса
      await new Promise(resolve => setTimeout(resolve, 100))

      // Проверка, что ошибка корректно обработана
      expect(exchangeStore.error).toBe('API error')
      expect(exchangeStore.toAmount).toBe('')
    })
  })
})
