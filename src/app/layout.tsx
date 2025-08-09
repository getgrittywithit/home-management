import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Family Ops - Greenhouse Playbook',
  description: 'Complete family management system for organizing 8 family members',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}