import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { SessionProvider } from 'next-auth/react'

export const metadata: Metadata = {
  title: 'MQTT IoT Dashboard',
  description: 'Monitor and manage your IoT devices',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-mesh">
        <SessionProvider>
          {children}
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-primary)',
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  )
}
