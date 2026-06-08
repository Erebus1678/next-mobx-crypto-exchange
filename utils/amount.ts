import * as z from 'zod'

/** Maximum number of decimal places accepted for an amount (crypto-friendly). */
export const MAX_DECIMALS = 8

export const AMOUNT_ERROR_MESSAGE = `Enter a valid amount (up to ${MAX_DECIMALS} decimals)`

/**
 * Strict positive-decimal pattern.
 *
 * Accepts: `0`, `0.5`, `1`, `123.45678901`-capped-to-8-decimals.
 * Rejects: letters, multiple dots, embedded/multiple dashes (e.g.
 * `1234123-12341234`), leading-zero garbage (`01`, `007`), thousands
 * separators, signs, whitespace, and more than `MAX_DECIMALS` fractional digits.
 */
const AMOUNT_PATTERN = new RegExp(`^(0|[1-9]\\d*)(\\.\\d{1,${MAX_DECIMALS}})?$`)

/** Zod schema for a structurally valid amount string. */
export const amountSchema = z
  .string()
  .refine(val => AMOUNT_PATTERN.test(val), { message: AMOUNT_ERROR_MESSAGE })

/** True when the string is a structurally valid amount. */
export function isValidAmountFormat(value: string): boolean {
  return AMOUNT_PATTERN.test(value)
}

/**
 * Parse a user-entered amount.
 *
 * Returns the numeric value only when the string is a structurally valid,
 * strictly-positive decimal. Returns `null` for empty, malformed, zero, or
 * non-positive input so callers never feed garbage into a conversion.
 */
export function parseAmount(value: string): number | null {
  if (!isValidAmountFormat(value)) return null
  const parsed = Number(value)
  return parsed > 0 ? parsed : null
}
