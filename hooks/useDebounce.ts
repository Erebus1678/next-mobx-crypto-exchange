import { useState, useEffect } from 'react'
import { debounce as debounceUtil } from '@/utils/debounce'

/**
 * A hook that returns a debounced version of the value
 * @param value The value to debounce
 * @param delay The debounce delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay || 300)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * A hook that returns a debounced callback function
 * @param callback The callback function to debounce
 * @param delay The debounce delay in milliseconds
 * @returns The debounced callback function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay?: number
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return debounceUtil(callback, delay) as unknown as T
}

export default useDebounce
