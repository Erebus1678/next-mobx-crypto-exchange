'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import RefreshIcon from '@mui/icons-material/Refresh'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'
import { observer } from 'mobx-react-lite'
import React, { useEffect, useMemo } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import * as z from 'zod'

import { useStore } from '@/store/StoreProvider'

import CurrencyInput from './CurrencyInput'

const AnimatedSwapIcon = styled(SwapHorizIcon)({
  transition: 'transform 0.3s ease-in-out',
  '&:hover': {
    transform: 'rotate(180deg)',
  },
})

const AnimatedAlert = styled(Alert)({
  animation: 'errorShake 0.5s',
  '@keyframes errorShake': {
    '0%, 100%': { transform: 'translateX(0)' },
    '20%, 60%': { transform: 'translateX(-5px)' },
    '40%, 80%': { transform: 'translateX(5px)' },
  },
})

const exchangeFormSchema = z.object({
  fromAmount: z.string().refine(
    val => {
      if (val === '') return true
      const num = parseFloat(val)
      return !isNaN(num) && num >= 0
    },
    { message: 'Must be a non-negative number' }
  ),
  toAmount: z.string().refine(
    val => {
      if (val === '') return true
      const num = parseFloat(val)
      return !isNaN(num) && num >= 0
    },
    { message: 'Must be a non-negative number' }
  ),
})

type ExchangeFormValues = z.infer<typeof exchangeFormSchema>

const ExchangeForm: React.FC = observer(() => {
  const store = useStore()

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExchangeFormValues>({
    resolver: zodResolver(exchangeFormSchema),
    defaultValues: {
      fromAmount: '',
      toAmount: '',
    },
    mode: 'onChange',
  })

  const fromAmountValue = watch('fromAmount')
  const toAmountValue = watch('toAmount')

  const sortedCoins = useMemo(() => store.filteredCoins, [store.filteredCoins])

  useEffect(() => {
    store.loadCoins()
  }, [store])

  // Update MobX store when RHF values change
  useEffect(() => {
    const currentStoreAmount = store.fromAmount
    if (fromAmountValue !== currentStoreAmount) {
      store.setAmount(fromAmountValue, 'from')
    }
  }, [fromAmountValue, store])

  useEffect(() => {
    const currentStoreAmount = store.toAmount
    if (toAmountValue !== currentStoreAmount) {
      store.setAmount(toAmountValue, 'to')
    }
  }, [toAmountValue, store])

  // Update RHF fields when MobX store changes (e.g., after calculation)
  useEffect(() => {
    if (store.fromAmount !== fromAmountValue) {
      setValue('fromAmount', store.fromAmount, { shouldValidate: true, shouldDirty: true })
    }
  }, [store.fromAmount, setValue, fromAmountValue])

  useEffect(() => {
    if (store.toAmount !== toAmountValue) {
      setValue('toAmount', store.toAmount, { shouldValidate: true, shouldDirty: true })
    }
  }, [store.toAmount, setValue, toAmountValue])

  const handleSwap = useMemo(
    () => () => {
      store.swapCurrencies()
    },
    [store]
  )

  const handleFormSubmit: SubmitHandler<ExchangeFormValues> = data => {
    console.log('Form submitted (optional):', data)
  }

  const handleRetryLoadCoins = () => {
    store.retryLoadCoins()
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(handleFormSubmit)}
      sx={{ maxWidth: 600, margin: 'auto' }}
    >
      <Stack spacing={2}>
        {store.error && (
          <Stack spacing={1}>
            <AnimatedAlert
              severity="error"
              action={
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={handleRetryLoadCoins}
                  aria-label="Retry loading"
                >
                  <RefreshIcon fontSize="inherit" />
                </IconButton>
              }
            >
              {store.error}
            </AnimatedAlert>
            {!store.hasLoadedCoins && (
              <Button
                variant="outlined"
                color="primary"
                onClick={handleRetryLoadCoins}
                startIcon={<RefreshIcon />}
                disabled={store.isLoadingCoins}
              >
                {store.isLoadingCoins ? 'Loading...' : 'Retry Loading Currencies'}
              </Button>
            )}
          </Stack>
        )}

        <CurrencyInput<ExchangeFormValues>
          control={control}
          name="fromAmount"
          label="From"
          selectedCurrency={store.activeFromCurrency}
          onCurrencyChange={store.setFromCurrency}
          currencyOptions={sortedCoins}
          loadingOptions={store.isLoadingCoins}
          loadingRate={store.isLoadingRateTo}
          error={errors.fromAmount}
          disabled={!store.canUseExchangeForm}
        />

        <Stack direction="row" justifyContent="center" alignItems="center" marginY={-1}>
          <IconButton
            aria-label="Swap currencies"
            onClick={handleSwap}
            disabled={!store.canUseExchangeForm || store.isLoadingRateFrom || store.isLoadingRateTo}
            color="primary"
          >
            <AnimatedSwapIcon />
          </IconButton>
        </Stack>

        <CurrencyInput<ExchangeFormValues>
          control={control}
          name="toAmount"
          label="To"
          selectedCurrency={store.activeToCurrency}
          onCurrencyChange={store.setToCurrency}
          currencyOptions={sortedCoins}
          loadingOptions={store.isLoadingCoins}
          loadingRate={store.isLoadingRateFrom}
          error={errors.toAmount}
          disabled={!store.canUseExchangeForm}
        />

        {store.formattedRate && !store.isLoadingRateFrom && !store.isLoadingRateTo && (
          <Typography
            variant="body2"
            align="center"
            sx={{
              height: '1.5em',
              opacity: 1,
              transition: 'opacity 0.3s ease-in-out',
            }}
          >
            {store.formattedRate}
          </Typography>
        )}
        {(!store.formattedRate || store.isLoadingRateFrom || store.isLoadingRateTo) && (
          <Box sx={{ height: '1.5em' }} />
        )}
      </Stack>
    </Box>
  )
})

export default ExchangeForm
