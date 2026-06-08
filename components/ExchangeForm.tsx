'use client'

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
import React, { useCallback, useEffect, useState } from 'react'

import { createExchangeStore } from '@/store/ExchangeStore'

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

const ExchangeForm: React.FC = observer(() => {
  // Store is scoped to this widget — created once, disposed on unmount.
  const [store] = useState(() => createExchangeStore())

  // The only effect: sync with the external API (load coins) and clean up.
  useEffect(() => {
    store.loadCoins()
    return () => store.dispose()
  }, [store])

  const handleSwap = useCallback(() => {
    store.swap()
  }, [store])

  const handleRetryLoadCoins = useCallback(() => {
    store.retryLoadCoins()
  }, [store])

  const isBusy = store.isLoadingRate

  return (
    <Box component="form" noValidate sx={{ maxWidth: 600, margin: 'auto' }}>
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

        <CurrencyInput
          label="From"
          amountValue={store.fromAmount}
          onAmountChange={store.setFromAmount}
          amountError={store.fromAmountError}
          selectedCurrency={store.activeFromCurrency}
          onCurrencyChange={store.setFromCurrency}
          currencyOptions={store.filteredCoins}
          loadingOptions={store.isLoadingCoins}
          loadingRate={store.isLoadingFrom}
          disabled={!store.canUseExchangeForm}
        />

        <Stack direction="row" justifyContent="center" alignItems="center" marginY={-1}>
          <IconButton
            aria-label="Swap currencies"
            onClick={handleSwap}
            disabled={!store.canUseExchangeForm || isBusy}
            color="primary"
          >
            <AnimatedSwapIcon />
          </IconButton>
        </Stack>

        <CurrencyInput
          label="To"
          amountValue={store.toAmount}
          onAmountChange={store.setToAmount}
          amountError={store.toAmountError}
          selectedCurrency={store.activeToCurrency}
          onCurrencyChange={store.setToCurrency}
          currencyOptions={store.filteredCoins}
          loadingOptions={store.isLoadingCoins}
          loadingRate={store.isLoadingTo}
          disabled={!store.canUseExchangeForm}
        />

        <Typography
          variant="body2"
          align="center"
          aria-live="polite"
          sx={{
            minHeight: '1.5em',
            opacity: store.rateInfo && !isBusy ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
          }}
        >
          {store.rateInfo && !isBusy ? store.rateInfo : ' '}
        </Typography>
      </Stack>
    </Box>
  )
})

export default ExchangeForm
