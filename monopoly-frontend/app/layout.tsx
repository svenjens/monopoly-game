import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toast'

/**
 * Font configuration.
 * Using Inter for clean, modern typography.
 */
const inter = Inter({ subsets: ['latin'] })

/**
 * Application metadata.
 */
export const metadata: Metadata = {
  title: 'Monopoly Game - Vereenvoudigde Versie',
  description: 'Modern Monopoly game with real-time multiplayer support',
}

/**
 * Root Layout Component
 * 
 * Wraps all pages with common layout and providers.
 * Applies global styles and fonts.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}

