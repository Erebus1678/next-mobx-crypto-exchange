import '@testing-library/jest-dom'

// Создаем mock для global fetch
global.fetch = jest.fn()

// Мок для window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Мок для процессорных переменных
process.env = {
  ...process.env,
  NEXT_PUBLIC_API_BASE_URL: 'https://namig.pro/api',
}
