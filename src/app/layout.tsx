import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'SafeShipper - Dangerous Goods Transportation Management',
  description: 'Comprehensive dangerous goods transportation management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
} 