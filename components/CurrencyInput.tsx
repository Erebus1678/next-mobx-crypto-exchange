'use client'

import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'
import React, { useCallback, useMemo } from 'react'

import { Coin } from '@/types/api'

const AnimatedProgress = styled(CircularProgress)({
  animation: 'fadeInOut 1.5s infinite ease-in-out',
  '@keyframes fadeInOut': {
    '0%': { opacity: 0.4 },
    '50%': { opacity: 1 },
    '100%': { opacity: 0.4 },
  },
})

interface CurrencyInputProps {
  label: string
  amountValue: string
  onAmountChange: (value: string) => void
  amountError?: string | null
  selectedCurrency: Coin | null
  onCurrencyChange: (currency: Coin | null) => void
  readonly currencyOptions: readonly Coin[]
  loadingOptions: boolean
  loadingRate: boolean
  disabled?: boolean
}

function CurrencyInput({
  label,
  amountValue,
  onAmountChange,
  amountError,
  selectedCurrency,
  onCurrencyChange,
  currencyOptions,
  loadingOptions,
  loadingRate,
  disabled = false,
}: CurrencyInputProps) {
  const handleAmountChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onAmountChange(event.target.value)
    },
    [onAmountChange]
  )

  const handleAutocompleteChange = useCallback(
    (_event: React.SyntheticEvent, newValue: Coin | null) => {
      onCurrencyChange(newValue)
    },
    [onCurrencyChange]
  )

  const filterOptions = useMemo(() => {
    return (options: Coin[], { inputValue }: { inputValue: string }): Coin[] => {
      const lowerCaseInput = inputValue.toLowerCase()
      return options.filter(
        option =>
          option.name.toLowerCase().includes(lowerCaseInput) ||
          option.symbol.toLowerCase().includes(lowerCaseInput)
      )
    }
  }, [])

  const renderOption = useCallback(
    (props: React.HTMLAttributes<HTMLLIElement>, option: Coin) => (
      <Box
        component="li"
        {...props}
        key={option.id}
        sx={{
          transition: 'background-color 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <Typography variant="body2">
          {option.symbol} - {option.name}
        </Typography>
      </Box>
    ),
    []
  )

  const getOptionLabel = useCallback((option: Coin) => `${option.symbol} - ${option.name}`, [])

  const isOptionEqualToValue = useCallback(
    (option: Coin, value: Coin) => option.id === value.id,
    []
  )

  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <TextField
        label={label}
        value={amountValue}
        onChange={handleAmountChange}
        variant="outlined"
        fullWidth
        disabled={disabled}
        error={!!amountError}
        helperText={amountError ?? ' '}
        slotProps={{
          input: {
            inputProps: {
              inputMode: 'decimal',
              // Custom validation lives in the store; keep the field as text so
              // malformed strings reach the validator instead of being silently
              // dropped by the browser's number input.
              autoComplete: 'off',
              'aria-invalid': !!amountError,
            },
            endAdornment: loadingRate ? (
              <InputAdornment position="end">
                <AnimatedProgress size={20} aria-label="Calculating rate" />
              </InputAdornment>
            ) : null,
            sx: {
              transition: 'background-color 0.3s ease',
            },
          },
        }}
        sx={{
          flexGrow: 1,
          '& .MuiOutlinedInput-root': {
            transition: 'border-color 0.3s ease',
          },
        }}
      />

      <Autocomplete
        options={currencyOptions}
        loading={loadingOptions}
        loadingText="Loading currencies..."
        value={selectedCurrency}
        onChange={handleAutocompleteChange}
        filterOptions={filterOptions}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={isOptionEqualToValue}
        disabled={disabled || loadingOptions}
        renderInput={params => (
          <TextField
            {...params}
            label="Currency"
            variant="outlined"
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <React.Fragment>
                    {loadingOptions ? <AnimatedProgress color="inherit" size={20} /> : null}
                    {params.InputProps?.endAdornment}
                  </React.Fragment>
                ),
              },
            }}
          />
        )}
        renderOption={renderOption}
        sx={{
          width: 400,
          transition: 'width 0.3s ease, box-shadow 0.3s ease',
        }}
      />
    </Stack>
  )
}

export default React.memo(CurrencyInput)
