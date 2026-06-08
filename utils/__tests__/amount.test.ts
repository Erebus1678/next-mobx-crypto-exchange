import { isValidAmountFormat, parseAmount } from '../amount'

describe('amount validation', () => {
  describe('isValidAmountFormat', () => {
    it.each(['0', '1', '0.5', '123', '123.45678901'.slice(0, 11), '1000.12345678'])(
      'accepts valid decimal %p',
      value => {
        expect(isValidAmountFormat(value)).toBe(true)
      }
    )

    it.each([
      '', // empty
      ' ', // whitespace
      'abc', // letters
      '1.2.3', // multiple dots
      '1234123-12341234-12341234', // embedded/multiple dashes (the reported bug)
      '1-2', // single embedded dash
      '-5', // sign
      '+5', // sign
      '01', // leading-zero garbage
      '007', // leading-zero garbage
      '00.5', // leading-zero garbage
      '1.', // trailing dot
      '.5', // missing integer part
      '1,000', // thousands separator
      '0.123456789', // 9 decimals (cap is 8)
      '1e3', // exponent
    ])('rejects malformed input %p', value => {
      expect(isValidAmountFormat(value)).toBe(false)
    })
  })

  describe('parseAmount', () => {
    it('returns the number for a valid positive decimal', () => {
      expect(parseAmount('2.5')).toBe(2.5)
      expect(parseAmount('1')).toBe(1)
    })

    it('returns null for zero, non-positive, empty, or malformed input', () => {
      expect(parseAmount('0')).toBeNull()
      expect(parseAmount('0.0')).toBeNull()
      expect(parseAmount('')).toBeNull()
      expect(parseAmount('1234123-12341234-12341234')).toBeNull()
      expect(parseAmount('abc')).toBeNull()
    })
  })
})
