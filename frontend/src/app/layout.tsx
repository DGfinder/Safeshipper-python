import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Poppins } from "next/font/google";
import "../styles/globals.css";
import Providers from "./providers";
import { ErrorBoundary } from "../components/error-boundary";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "SafeShipper",
  description:
    "A comprehensive logistics and dangerous goods management platform.",
  keywords: ["logistics", "dangerous goods", "shipping", "compliance", "fleet management"],
  authors: [{ name: "SafeShipper Team" }],
  robots: "index, follow",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/symbol.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#153F9F" },
    { media: "(prefers-color-scheme: dark)", color: "#153F9F" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#153F9F" />
        <meta name="color-scheme" content="light dark" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="icon" type="image/svg+xml" href="/symbol.svg" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${poppins.variable} ${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-surface-background text-surface-foreground`}
      >
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ErrorBoundary>
          <Providers>
            <main id="main-content" className="min-h-screen">
              {children}
            </main>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
