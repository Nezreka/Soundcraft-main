import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SoundCraft - Web Audio Design Studio',
  description: 'Create, design and export custom sounds with this powerful web audio application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-background text-text-primary">
          {children}
        </main>
      </body>
    </html>
  )
}