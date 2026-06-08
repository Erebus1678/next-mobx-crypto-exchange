# Crypto Exchange App

A modern cryptocurrency exchange application built with Next.js, allowing users to convert between different cryptocurrencies with real-time rates.

## Features

- **Real-time Currency Conversion**: Convert between various cryptocurrencies with up-to-date exchange rates
- **Search Functionality**: Easily find cryptocurrencies in the dropdown list
- **Input Validation**: Strict positive-decimal validation rejects malformed input with clear messages
- **Responsive Design**: Works on both desktop and mobile devices
- **Loading States**: Visual feedback during API requests
- **Error Handling**: User-friendly error messages

## Tech Stack

- **Frontend**: Next.js 15+, React 19
- **UI Library**: Material UI 7.0
- **State Management**: MobX (widget-scoped store)
- **Validation**: Zod schemas
- **HTTP Client**: Axios
- **Styling**: Emotion (CSS-in-JS)
- **Type Safety**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- pnpm (recommended package manager)

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/crypto-exchange-app.git
   cd crypto-exchange-app
   ```

2. Install dependencies:

   ```
   pnpm install
   ```

3. Create a `.env.local` file in the root directory with your API configuration:

   ```
   NEXT_PUBLIC_API_BASE_URL=https://api.example.com
   ```

4. Start the development server:

   ```
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
├── app/                      # Next.js app router components
├── components/               # Reusable UI components
├── services/                 # Domain service layer (rate fetching / conversion)
├── api/                      # API client and type-safe API interactions
├── store/                    # MobX store (widget-scoped, created via factory)
├── utils/                    # Helpers (amount validation, debounce)
├── types/                    # TypeScript type definitions and schemas
├── public/                   # Static assets
└── components/ThemeRegistry/ # Material UI theme configuration
```

## Key Components

- **ExchangeForm**: Main form component for currency exchange; owns a widget-scoped store
- **CurrencyInput**: Reusable input component with dropdown for currency selection
- **ExchangeStore**: Widget-local MobX store (created via `createExchangeStore`) holding converter state with atomic actions
- **exchangeService**: Service layer that owns rate fetching and conversion orchestration
- **API Client**: Type-safe API client with Zod validation

## API Integration

The application connects to a cryptocurrency API that provides:

- List of available cryptocurrencies
- Currency conversion rates

All API responses are validated using Zod schemas to ensure type safety and proper error handling.

## Development

### Code Style

The project uses ESLint and Prettier for code formatting and style checking:

```
pnpm lint     # Run ESLint
pnpm format   # Run Prettier
```

### Testing

Run tests with:

```
pnpm test
```

## Deployment

This application can be deployed to any platform that supports Next.js applications, such as Vercel or Netlify.

For production deployment:

```
pnpm build
pnpm start
```
