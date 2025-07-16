"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState } from "react";
import { WebSocketProvider } from "@/shared/services/WebSocketContext";
import { AccessibilityProvider } from "@/shared/services/AccessibilityContext";
import { ThemeProvider } from "@/shared/services/ThemeContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AccessibilityProvider>
          <WebSocketProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "var(--surface-card)",
                  color: "var(--surface-foreground)",
                  border: "1px solid var(--surface-border)",
                },
                success: {
                  duration: 3000,
                  style: {
                    background: "var(--success-600)",
                    color: "var(--neutral-50)",
                  },
                },
                error: {
                  duration: 5000,
                  style: {
                    background: "var(--error-600)",
                    color: "var(--neutral-50)",
                  },
                },
              }}
            />
          </WebSocketProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
