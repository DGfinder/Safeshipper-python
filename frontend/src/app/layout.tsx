import type { Metadata, Viewport } from "next";
// Using system fonts to avoid network dependency issues during build
import "../styles/globals.css";
import ClientLayout from "./client-layout";
import { ErrorBoundary } from "../components/error-boundary";


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
      </head>
      <body
        className="font-sans antialiased bg-surface-background text-surface-foreground"
        style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      >
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ErrorBoundary>
          <ClientLayout>
            <main id="main-content" className="min-h-screen">
              {children}
            </main>
          </ClientLayout>
        </ErrorBoundary>
      </body>
    </html>
  );
}
