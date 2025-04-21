'use client'

import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'
import React, { useMemo, useCallback } from 'react'
import { Control, FieldError, Path } from 'react-hook-form'

import { Coin } from '@/types/api'

import DebouncedInput from './DebouncedInput'

const AnimatedProgress = styled(CircularProgress)({
  animation: 'fadeInOut 1.5s infinite ease-in-out',
  '@keyframes fadeInOut': {
    '0%': { opacity: 0.4 },
    '50%': { opacity: 1 },
    '100%': { opacity: 0.4 },
  },
})

interface CurrencyInputProps<T extends Record<string, string | number>> {
  control: Control<T>
  name: Path<T>
  error?: FieldError

  label: string
  amountValue?: string
  selectedCurrency: Coin | null
  onCurrencyChange: (currency: Coin | null) => void
  readonly currencyOptions: readonly Coin[]
  loadingOptions: boolean
  loadingRate: boolean
  disabled?: boolean
}

function CurrencyInput<T extends Record<string, string | number>>({
  control,
  name,
  error,
  label,
  // amountValue, // RHF handles the value via Controller
  selectedCurrency,
  onCurrencyChange,
  currencyOptions,
  loadingOptions,
  loadingRate,
  disabled = false,
}: CurrencyInputProps<T>) {
  const handleAutocompleteChange = useCallback(
    (event: React.SyntheticEvent, newValue: Coin | null) => {
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
      <DebouncedInput
        name={name}
        control={control}
        label={label}
        type="number"
        variant="outlined"
        fullWidth
        disabled={disabled}
        fieldError={error}
        delay={300}
        slotProps={{
          input: {
            inputProps: {
              min: 0,
              step: 'any',
            },
            endAdornment: loadingRate ? (
              <InputAdornment position="end">
                <AnimatedProgress size={20} />
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

export default React.memo(CurrencyInput) as typeof CurrencyInput
