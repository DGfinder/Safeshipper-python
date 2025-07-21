"use client";

import React, { Component, ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string) => void;
  showErrorDetails?: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Generate a unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = this.state.errorId || 'unknown';
    
    // Log error details
    console.error('ErrorBoundary caught an error:', {
      error,
      errorInfo,
      errorId,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    });

    // Update state with error info
    this.setState({
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo, errorId);
    }
  }

  private reportError(error: Error, errorInfo: React.ErrorInfo, errorId: string) {
    try {
      fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorId,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          userId: localStorage.getItem('userId'), // If available
        }),
      }).catch(reportError => {
        console.error('Failed to report error:', reportError);
      });
    } catch (reportError) {
      console.error('Error reporting failed:', reportError);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportBug = () => {
    const { error, errorId } = this.state;
    const bugReportUrl = `mailto:support@safeshipper.com?subject=Bug Report - ${errorId}&body=Error ID: ${errorId}%0AError: ${encodeURIComponent(error?.message || 'Unknown error')}%0ATimestamp: ${new Date().toISOString()}`;
    window.open(bugReportUrl);
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId } = this.state;
      const { fallback, showErrorDetails = false } = this.props;

      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-xl text-gray-900">Something went wrong</CardTitle>
              <p className="text-gray-600 mt-2">
                We're sorry! An unexpected error occurred. Our team has been notified.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorId && (
                <div className="bg-gray-100 p-3 rounded text-center">
                  <p className="text-xs text-gray-600">Error ID</p>
                  <p className="text-sm font-mono text-gray-800">{errorId}</p>
                </div>
              )}
              
              {(showErrorDetails || process.env.NODE_ENV === 'development') && error && (
                <details className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
                  <summary className="cursor-pointer mb-2 font-medium">
                    Technical Details (for developers)
                  </summary>
                  <div className="space-y-2">
                    <div>
                      <strong>Error:</strong>
                      <pre className="whitespace-pre-wrap mt-1 text-red-600">{error.message}</pre>
                    </div>
                    {error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="whitespace-pre-wrap mt-1 text-xs overflow-auto max-h-32">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1 text-xs overflow-auto max-h-32">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
              
              <div className="flex flex-col space-y-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={this.handleGoHome} 
                    className="w-full"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={this.handleReportBug}
                    className="w-full"
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    Report Bug
                  </Button>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                If this problem persists, please contact our support team.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Hook for manual error reporting
export function useErrorReporting() {
  const reportError = (error: Error, context?: string) => {
    const errorId = `manual_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.error('Manual error report:', {
      error,
      context,
      errorId,
      timestamp: new Date().toISOString(),
    });

    if (process.env.NODE_ENV === 'production') {
      fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorId,
          message: error.message,
          stack: error.stack,
          context,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          type: 'manual',
        }),
      }).catch(reportingError => {
        console.error('Failed to report manual error:', reportingError);
      });
    }

    return errorId;
  };

  return { reportError };
}