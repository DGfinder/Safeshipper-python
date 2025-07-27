"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error: Error;
    errorInfo: React.ErrorInfo;
    resetError: () => void;
  }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to external service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error);
      console.error('Error info:', errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo!}
            resetError={this.resetError}
          />
        );
      }

      // Default error UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          showDetails={this.props.showDetails}
        />
      );
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo | null;
  resetError: () => void;
  showDetails?: boolean;
}

function DefaultErrorFallback({
  error,
  errorInfo,
  resetError,
  showDetails = false
}: DefaultErrorFallbackProps) {
  const [showFullDetails, setShowFullDetails] = React.useState(false);

  const goHome = () => {
    window.location.href = '/dashboard';
  };

  const reloadPage = () => {
    window.location.reload();
  };

  const reportError = () => {
    // This would typically send error to monitoring service
    console.error('User reported error:', error);
    
    // For now, we'll just copy to clipboard
    const errorText = `Error: ${error.message}\n\nStack: ${error.stack}\n\nComponent Stack: ${errorInfo?.componentStack}`;
    navigator.clipboard.writeText(errorText).then(() => {
      alert('Error details copied to clipboard. Please share with support.');
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The SafeShipper application encountered an unexpected error. Our team has been notified and is working to resolve this issue.
            </AlertDescription>
          </Alert>

          {/* Error Summary */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="font-medium text-red-800 mb-2">Error Details</div>
            <div className="text-sm text-red-700">
              <div><strong>Message:</strong> {error.message}</div>
              <div><strong>Type:</strong> {error.name}</div>
              <div><strong>Time:</strong> {new Date().toLocaleString()}</div>
            </div>
          </div>

          {/* Technical Details (collapsible) */}
          {(showDetails || process.env.NODE_ENV === 'development') && (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFullDetails(!showFullDetails)}
                className="w-full"
              >
                <Bug className="h-4 w-4 mr-2" />
                {showFullDetails ? 'Hide' : 'Show'} Technical Details
              </Button>

              {showFullDetails && (
                <div className="bg-gray-100 rounded-lg p-4 text-xs font-mono overflow-auto max-h-64">
                  <div className="mb-4">
                    <strong>Stack Trace:</strong>
                    <pre className="whitespace-pre-wrap text-red-600 mt-1">
                      {error.stack}
                    </pre>
                  </div>
                  
                  {errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap text-blue-600 mt-1">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4">
            <Button onClick={resetError} className="flex-1 min-w-0">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" onClick={reloadPage} className="flex-1 min-w-0">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
            <Button variant="outline" onClick={goHome} className="flex-1 min-w-0">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          <div className="flex justify-center pt-2">
            <Button variant="ghost" size="sm" onClick={reportError}>
              <Bug className="h-4 w-4 mr-2" />
              Report Error
            </Button>
          </div>

          {/* Support Information */}
          <div className="text-center text-sm text-gray-600 pt-4 border-t">
            <p>Need help? Contact SafeShipper support at:</p>
            <p className="font-medium">support@safeshipper.com</p>
            <p>or call: 1-800-SAFESHIPPER</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// HOC for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for error reporting
export function useErrorHandler() {
  const reportError = React.useCallback((error: Error, context?: string) => {
    // Log error
    console.error('Error reported:', error, context);
    
    // In production, this would send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry, LogRocket, etc.
      // errorMonitoringService.captureException(error, { context });
    }
  }, []);

  return { reportError };
}

// Simple error boundary for specific components
export function SimpleErrorBoundary({ 
  children, 
  fallback = "Something went wrong" 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={({ resetError }) => (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-red-600 text-sm mb-3">{fallback}</p>
          <Button size="sm" variant="outline" onClick={resetError}>
            Try Again
          </Button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;