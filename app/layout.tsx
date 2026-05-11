import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Quote & Invoice | Presupuestos y Facturas con IA',
  description: 'Genera presupuestos profesionales con inteligencia artificial, conviértelos en facturas y expórtalos en PDF.',
  keywords: 'presupuestos, facturas, IA, freelance, autónomo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2437',
              color: '#f0f2f7',
              border: '1px solid #363d54',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif',
            },
            success: {
              iconTheme: { primary: '#34d399', secondary: '#1f2437' },
            },
            error: {
              iconTheme: { primary: '#f87171', secondary: '#1f2437' },
            },
          }}
        />
      </body>
    </html>
  )
}
