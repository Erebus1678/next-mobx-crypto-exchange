/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @returns A debounced version of the original function with a cancel method
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300 // Default 300ms
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null

  const debounced = function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)

    timeout = setTimeout(() => {
      func(...args)
      timeout = null
    }, wait)
  }

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  return debounced
}

// For immediate invocation with a trailing debounce
export function debounceWithImmediate<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null
  let isFirstCall = true

  const debounced = function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)

    if (isFirstCall) {
      func(...args)
      isFirstCall = false
    }

    timeout = setTimeout(() => {
      func(...args)
      timeout = null
      isFirstCall = true
    }, wait)
  }

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
    isFirstCall = true
  }

  return debounced
}
