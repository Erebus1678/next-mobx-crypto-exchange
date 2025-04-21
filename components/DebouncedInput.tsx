'use client'

import { TextField, TextFieldProps } from '@mui/material'
import React, { useEffect } from 'react'
import { Control, Controller, FieldError, Path } from 'react-hook-form'

import { debounce } from '@/utils/debounce'

interface DebouncedInputProps<T extends Record<string, unknown>>
  extends Omit<TextFieldProps, 'name'> {
  name: Path<T>
  control: Control<T>
  delay?: number
  fieldError?: FieldError
  onChangeDebounced?: (value: string) => void
}

function DebouncedInput<T extends Record<string, unknown>>({
  name,
  control,
  delay = 300,
  fieldError,
  onChangeDebounced,
  ...textFieldProps
}: DebouncedInputProps<T>) {
  const debouncedChange = React.useMemo(
    () =>
      debounce((value: string) => {
        if (onChangeDebounced) {
          onChangeDebounced(value)
        }
      }, delay),
    [delay, onChangeDebounced]
  )

  useEffect(() => {
    return () => {
      if (debouncedChange.cancel) {
        debouncedChange.cancel()
      }
    }
  }, [debouncedChange])

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          {...textFieldProps}
          {...field}
          value={field.value ?? ''}
          onChange={e => {
            const value = e.target.value
            field.onChange(value)

            debouncedChange(value)
          }}
          error={!!fieldError}
          helperText={fieldError?.message}
        />
      )}
    />
  )
}

export default React.memo(DebouncedInput) as typeof DebouncedInput
