"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState, useEffect, Suspense, Component, ReactNode } from "react";
import dynamic from "next/dynamic";

// Dynamically import providers that need client-side features
const DynamicWebSocketProvider = dynamic(
  () => import("@/contexts/WebSocketContext").then(mod => ({ default: mod.WebSocketProvider })),
  { 
    ssr: false,
    loading: () => <>{/* WebSocket provider loading... */}</>
  }
);

const DynamicAccessibilityProvider = dynamic(
  () => import("@/contexts/AccessibilityContext").then(mod => ({ default: mod.AccessibilityProvider })),
  { 
    ssr: false,
    loading: () => <>{/* Accessibility provider loading... */}</>
  }
);

// Import theme provider normally as it's designed to handle SSR
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PermissionProvider } from "@/contexts/PermissionContext";

// Error boundary for provider initialization failures
interface ProviderErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

class ProviderErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ProviderErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): ProviderErrorBoundaryState {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Provider initialization error:', error, errorInfo);
    
    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // Could integrate with Sentry, DataDog, etc.
      console.error('Provider error reported:', { error: error.message, stack: error.stack });
    }
  }

  retry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      retryCount: prevState.retryCount + 1
    }));
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI or use provided fallback
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Provider Initialization Error</h3>
          <p className="text-red-700 text-center mb-4 max-w-md">
            Some application features may not work correctly. This could be due to network issues or configuration problems.
          </p>
          {this.state.retryCount < 3 && (
            <button
              onClick={this.retry}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry ({3 - this.state.retryCount} attempts remaining)
            </button>
          )}
          {this.state.retryCount >= 3 && (
            <div className="text-sm text-red-600">
              Please refresh the page or contact support if the problem persists.
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Client-side performance monitoring component
function PerformanceMonitor() {
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;
    
    // Dynamically import and use performance monitor
    import("@/shared/utils/performance-monitor").then(({ performanceMonitor }) => {
      // Mark hydration start
      performanceMonitor.markHydrationStart();
      
      // Mark hydration end after component mounts
      const timer = setTimeout(() => {
        performanceMonitor.markHydrationEnd();
        performanceMonitor.reportMetrics();
      }, 0);

      // Cleanup function
      return () => {
        clearTimeout(timer);
        performanceMonitor.cleanup();
      };
    }).catch(error => {
      console.warn('Performance monitoring failed to initialize:', error);
    });
  }, []);

  return null; // This component doesn't render anything
}

// Fallback wrapper for providers that need SSR compatibility
function ProviderWrapper({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <ProviderErrorBoundary>
      <Suspense fallback={<div className="flex items-center justify-center p-8 text-gray-600">Loading providers...</div>}>
        {isClient ? (
          <ProviderErrorBoundary fallback={
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">Some features may not be available. The application will continue to work with basic functionality.</p>
            </div>
          }>
            <PermissionProvider>
              <DynamicAccessibilityProvider>
                <DynamicWebSocketProvider>
                  {children}
                  <PerformanceMonitor />
                </DynamicWebSocketProvider>
              </DynamicAccessibilityProvider>
            </PermissionProvider>
          </ProviderErrorBoundary>
        ) : (
          // SSR fallback - render children without client-specific providers
          children
        )}
      </Suspense>
    </ProviderErrorBoundary>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient with SSR-safe pattern
  const [queryClient] = useState(() => {
    if (typeof window === 'undefined') {
      // Server-side: create a basic client
      return new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
          },
        },
      });
    }
    
    // Client-side: create full-featured client
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
          retry: 1,
          refetchOnWindowFocus: false, // Reduce unnecessary refetches
          refetchOnMount: false,
        },
      },
    });
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ProviderWrapper>
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
        </ProviderWrapper>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
