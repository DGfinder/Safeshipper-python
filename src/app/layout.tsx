// import './globals.css' // Temporarily disabled

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
        <div>SafeShipper - Development Mode</div>
        {children}
      </body>
    </html>
  )
} 