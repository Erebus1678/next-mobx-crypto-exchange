import { makeAutoObservable, runInAction, computed } from 'mobx'
import { Coin, ApiError, ConversionPayload } from '@/types/api'
import { fetchCoins, fetchConversion } from '@/api/client'
import { debounce } from '@/utils/debounce'

const MIN_AMOUNT = 0
const DEBOUNCE_DELAY = 300 // 300ms debounce delay
const AUTO_RETRY_DELAY = 10000 // 10s auto retry delay

class ExchangeStore {
  coins: Coin[] = []
  fromCurrency: Coin | null = null
  toCurrency: Coin | null = null
  fromAmount: string = ''
  toAmount: string = ''
  rateInfo: string | null = null

  isLoadingCoins: boolean = false
  isLoadingRateFrom: boolean = false
  isLoadingRateTo: boolean = false
  error: string | null = null
  hasLoadedCoins: boolean = false
  autoRetryTimeoutId: NodeJS.Timeout | null = null

  private debouncedFetchRate: (
    amount: number,
    fromCoin: Coin,
    toCoin: Coin,
    initiatedBy: 'from' | 'to'
  ) => void

  constructor() {
    makeAutoObservable(
      this,
      {
        filteredCoins: computed,
        activeFromCurrency: computed,
        activeToCurrency: computed,
        canUseExchangeForm: computed,
      },
      { autoBind: true }
    )

    // Initialize the debounced version of _fetchRate
    this.debouncedFetchRate = debounce(this._fetchRate.bind(this), DEBOUNCE_DELAY)
  }

  get filteredCoins() {
    return this.coins.slice().sort((a, b) => a.name.localeCompare(b.name))
  }

  get activeFromCurrency() {
    if (!this.fromCurrency) return null
    return this.coins.find(c => c.id === this.fromCurrency?.id) || null
  }

  get activeToCurrency() {
    if (!this.toCurrency) return null
    return this.coins.find(c => c.id === this.toCurrency?.id) || null
  }

  get formattedRate() {
    if (!this.rateInfo) return null
    return this.rateInfo
  }

  get canUseExchangeForm() {
    return this.hasLoadedCoins && !this.isLoadingCoins && this.coins.length > 0
  }

  // --- Actions ---

  async loadCoins() {
    // Clear any existing auto-retry timeout
    if (this.autoRetryTimeoutId) {
      clearTimeout(this.autoRetryTimeoutId)
      this.autoRetryTimeoutId = null
    }

    this.isLoadingCoins = true
    this.error = null
    try {
      const fetchedCoins = await fetchCoins()
      runInAction(() => {
        this.coins = fetchedCoins
        this.hasLoadedCoins = true

        const btc = fetchedCoins.find(coin => coin.symbol.toLowerCase() === 'btc')
        const usdt = fetchedCoins.find(coin => coin.symbol.toLowerCase() === 'usdt')

        this.fromCurrency = btc || fetchedCoins[0]
        this.toCurrency = usdt || (fetchedCoins.length > 1 ? fetchedCoins[1] : null)
      })
    } catch (err) {
      runInAction(() => {
        this.error = (err as ApiError).message || 'Failed to load currencies'
        this.coins = []
        this.hasLoadedCoins = false

        // Schedule auto-retry
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

  setFromCurrency(currency: Coin | null) {
    if (currency?.id === this.toCurrency?.id) {
      this.swapCurrencies()
    } else {
      this.fromCurrency = currency
      this.toAmount = ''
      this.rateInfo = null
      this.triggerConversion('from')
    }
  }

  setToCurrency(currency: Coin | null) {
    if (currency?.id === this.fromCurrency?.id) {
      this.swapCurrencies()
    } else {
      this.toCurrency = currency
      this.fromAmount = ''
      this.rateInfo = null
      this.triggerConversion('to')
    }
  }

  setAmount(amount: string, type: 'from' | 'to') {
    this.error = null
    const parsedAmount = parseFloat(amount)
    const isValidInput = !isNaN(parsedAmount) && parsedAmount >= MIN_AMOUNT

    if (type === 'from') {
      this.fromAmount = amount
      if (isValidInput && this.fromCurrency && this.toCurrency && parsedAmount > MIN_AMOUNT) {
        this.toAmount = ''
        this.rateInfo = null
        this.isLoadingRateFrom = true
        this.debouncedFetchRate(parsedAmount, this.fromCurrency, this.toCurrency, 'from')
      } else {
        this.toAmount = ''
        this.rateInfo = null
        this.isLoadingRateFrom = false
      }
    } else {
      this.toAmount = amount
      if (isValidInput && this.fromCurrency && this.toCurrency && parsedAmount > MIN_AMOUNT) {
        this.fromAmount = ''
        this.rateInfo = null
        this.isLoadingRateTo = true
        this.debouncedFetchRate(parsedAmount, this.fromCurrency, this.toCurrency, 'to')
      } else {
        this.fromAmount = ''
        this.rateInfo = null
        this.isLoadingRateTo = false
      }
    }
  }

  swapCurrencies() {
    const tempCurrency = this.fromCurrency
    this.fromCurrency = this.toCurrency
    this.toCurrency = tempCurrency

    const tempAmount = this.fromAmount
    this.fromAmount = this.toAmount
    this.toAmount = tempAmount

    this.rateInfo = null
    this.error = null

    this.triggerConversion('from')
  }

  // --- Private Helpers ---

  private triggerConversion(changedField: 'from' | 'to') {
    const amountStr = changedField === 'from' ? this.fromAmount : this.toAmount
    const amount = parseFloat(amountStr)
    if (!isNaN(amount) && amount > MIN_AMOUNT && this.fromCurrency && this.toCurrency) {
      if (changedField === 'from') {
        this.isLoadingRateFrom = true
        this.debouncedFetchRate(amount, this.fromCurrency, this.toCurrency, 'from')
      } else {
        this.isLoadingRateTo = true
        this.debouncedFetchRate(amount, this.toCurrency, this.fromCurrency, 'to')
      }
    }
  }

  private async _fetchRate(
    amount: number,
    fromCoin: Coin,
    toCoin: Coin,
    initiatedBy: 'from' | 'to'
  ) {
    if (!fromCoin || !toCoin || amount <= MIN_AMOUNT) return

    let payload: ConversionPayload
    if (initiatedBy === 'from') {
      payload = {
        from: String(fromCoin.id),
        to: String(toCoin.id),
        fromAmount: amount,
      }
    } else {
      payload = {
        from: String(fromCoin.id),
        to: String(toCoin.id),
        toAmount: amount,
      }
    }

    this.error = null
    this.rateInfo = null

    try {
      const response = await fetchConversion(payload)
      runInAction(() => {
        const resultAmount = response.estimatedAmount
        const rate = response.rate

        if (initiatedBy === 'from') {
          this.toAmount = String(resultAmount)
          const inverseRate = 1 / rate
          this.rateInfo = `1 ${toCoin.symbol} ≈ ${inverseRate.toFixed(6)} ${fromCoin.symbol}`
        } else {
          this.fromAmount = String(resultAmount)
          const inverseRate = 1 / rate
          this.rateInfo = `1 ${toCoin.symbol} ≈ ${inverseRate.toFixed(6)} ${fromCoin.symbol}`
        }

        // Reset loading state
        if (initiatedBy === 'from') {
          this.isLoadingRateFrom = false
        } else {
          this.isLoadingRateTo = false
        }
      })
    } catch (err) {
      runInAction(() => {
        this.error = (err as ApiError).message || 'Failed to fetch conversion rate'
        if (initiatedBy === 'from') this.toAmount = ''
        else this.fromAmount = ''
        this.rateInfo = null

        // Reset loading state on error
        if (initiatedBy === 'from') {
          this.isLoadingRateFrom = false
        } else {
          this.isLoadingRateTo = false
        }
      })
    }
  }
}

export const exchangeStore = new ExchangeStore()
