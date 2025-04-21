import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry'
import { StoreProvider } from '@/store/StoreProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Crypto Exchange',
  description: 'Cryptocurrency exchange form',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StoreProvider>
          <ThemeRegistry>{children}</ThemeRegistry>
        </StoreProvider>
      </body>
    </html>
  )
}
