# SafeShipper Error Handling Guide

![Error Handling](https://img.shields.io/badge/Error%20Handling-Comprehensive-green)
![Recovery](https://img.shields.io/badge/Recovery-Automated-blue)
![Monitoring](https://img.shields.io/badge/Monitoring-Enabled-orange)

**Enterprise-grade error handling and recovery for SafeShipper frontend.**

This guide covers the comprehensive error handling architecture implemented in Phase 4, including error boundaries, recovery strategies, user experience considerations, and production monitoring.

## 🎯 Error Handling Philosophy

### Core Principles

1. **Graceful Degradation**: Never show a blank screen - always provide meaningful feedback
2. **User-Centric Messages**: Clear, actionable error messages without technical jargon
3. **Automatic Recovery**: Attempt to recover from errors without user intervention
4. **Comprehensive Logging**: Track all errors for debugging and monitoring
5. **Performance Impact**: Minimize error handling overhead on application performance

## 🏗️ Error Handling Architecture

```
SafeShipper Error Handling Stack
├── 🛡️ Error Boundaries
│   ├── Global Error Boundary (app-wide)
│   ├── Route Error Boundaries (page-level)
│   ├── Feature Error Boundaries (section-level)
│   └── Component Error Boundaries (granular)
│
├── 🔧 Error Types & Categories
│   ├── Network Errors (API failures)
│   ├── Validation Errors (user input)
│   ├── Permission Errors (authorization)
│   ├── Business Logic Errors (DG rules)
│   └── System Errors (unexpected)
│
├── 🔄 Recovery Strategies
│   ├── Automatic Retry (with backoff)
│   ├── Fallback UI (degraded mode)
│   ├── Cache Recovery (offline data)
│   └── Manual Recovery (user actions)
│
└── 📊 Error Monitoring
    ├── Real-time Tracking
    ├── Error Analytics
    ├── Performance Impact
    └── User Experience Metrics
```

## 🛡️ Error Boundary Implementation

### Global Error Boundary

```typescript
// components/error-boundary.tsx
import React, { Component, ReactNode } from 'react';
import { ErrorFallback } from './error-fallback';
import { errorHandler } from '@/lib/error-handling';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorId: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Report to error tracking
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo, this.state.errorId);
    }
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  private reportError(error: Error, errorInfo: React.ErrorInfo, errorId: string) {
    errorHandler.reportError({
      error,
      errorInfo,
      errorId,
      context: {
        component: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorId: '' });
  };

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || ErrorFallback;
      return (
        <Fallback
          error={this.state.error}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
```

### Error Fallback Component

```typescript
// components/error-fallback.tsx
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export interface ErrorFallbackProps {
  error: Error | null;
  errorId: string;
  onRetry: () => void;
}

export function ErrorFallback({ error, errorId, onRetry }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          
          <p className="text-gray-600">
            We're sorry for the inconvenience. The error has been logged and 
            our team will investigate.
          </p>
          
          {isDevelopment && error && (
            <details className="text-left w-full">
              <summary className="cursor-pointer text-sm text-gray-500">
                Error details
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {error.stack}
              </pre>
            </details>
          )}
          
          <div className="flex gap-3 mt-6">
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            
            <Button onClick={() => window.location.href = '/'}>
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>
          
          {errorId && (
            <p className="text-xs text-gray-400 mt-4">
              Error ID: {errorId}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
```

## 🔧 Error Handler Implementation

### Central Error Handler

```typescript
// lib/error-handling.ts
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  SYSTEM = 'SYSTEM',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface AppError {
  id: string;
  type: ErrorType;
  message: string;
  userMessage: string;
  code?: string;
  statusCode?: number;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
  retryable: boolean;
  severity: ErrorSeverity;
}

class ErrorHandler {
  private errorQueue: AppError[] = [];
  private maxQueueSize = 100;

  createError(
    type: ErrorType,
    message: string,
    options: Partial<AppError> = {}
  ): AppError {
    const error: AppError = {
      id: this.generateErrorId(),
      type,
      message,
      userMessage: this.getDefaultUserMessage(type, options.severity),
      timestamp: new Date().toISOString(),
      retryable: this.isRetryable(type),
      severity: options.severity || ErrorSeverity.MEDIUM,
      ...options,
    };

    this.addToQueue(error);
    this.reportError(error);
    
    return error;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultUserMessage(type: ErrorType, severity?: ErrorSeverity): string {
    const messageMap: Record<ErrorType, Record<ErrorSeverity, string>> = {
      [ErrorType.NETWORK]: {
        [ErrorSeverity.LOW]: 'Connection is slow. Please wait...',
        [ErrorSeverity.MEDIUM]: 'Network error occurred. Please try again.',
        [ErrorSeverity.HIGH]: 'Unable to connect. Please check your connection.',
        [ErrorSeverity.CRITICAL]: 'Service unavailable. Please try again later.',
      },
      [ErrorType.VALIDATION]: {
        [ErrorSeverity.LOW]: 'Please check your input.',
        [ErrorSeverity.MEDIUM]: 'Invalid data provided. Please correct and retry.',
        [ErrorSeverity.HIGH]: 'Required information is missing.',
        [ErrorSeverity.CRITICAL]: 'Data validation failed. Please contact support.',
      },
      [ErrorType.PERMISSION]: {
        [ErrorSeverity.LOW]: 'Access restricted.',
        [ErrorSeverity.MEDIUM]: 'You don't have permission for this action.',
        [ErrorSeverity.HIGH]: 'Authorization required. Please log in.',
        [ErrorSeverity.CRITICAL]: 'Security violation detected.',
      },
      [ErrorType.BUSINESS_LOGIC]: {
        [ErrorSeverity.LOW]: 'Operation not allowed.',
        [ErrorSeverity.MEDIUM]: 'Business rule violation. Please review.',
        [ErrorSeverity.HIGH]: 'Critical compliance issue detected.',
        [ErrorSeverity.CRITICAL]: 'Dangerous goods safety violation.',
      },
      [ErrorType.SYSTEM]: {
        [ErrorSeverity.LOW]: 'Minor issue detected.',
        [ErrorSeverity.MEDIUM]: 'System error occurred. Please try again.',
        [ErrorSeverity.HIGH]: 'System malfunction. Our team has been notified.',
        [ErrorSeverity.CRITICAL]: 'Critical system failure. Please contact support.',
      },
    };

    const severityLevel = severity || ErrorSeverity.MEDIUM;
    return messageMap[type]?.[severityLevel] || 'An error occurred. Please try again.';
  }

  private isRetryable(type: ErrorType): boolean {
    return [ErrorType.NETWORK, ErrorType.SYSTEM].includes(type);
  }

  private addToQueue(error: AppError) {
    this.errorQueue.push(error);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift(); // Remove oldest
    }
  }

  async reportError(error: AppError | { error: Error; errorInfo?: any; errorId: string; context?: any }) {
    if (process.env.NODE_ENV === 'production') {
      try {
        await fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(error),
        });
      } catch (e) {
        console.error('Failed to report error:', e);
      }
    }
  }

  getRecentErrors(): AppError[] {
    return [...this.errorQueue].reverse();
  }

  clearErrors() {
    this.errorQueue = [];
  }
}

export const errorHandler = new ErrorHandler();
```

## 🔄 API Error Handling

### API Error Interceptor

```typescript
// lib/api-error-handler.ts
import { errorHandler, ErrorType, ErrorSeverity } from './error-handling';

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  details?: any;
}

export function handleApiError(error: any): AppError {
  // Network errors
  if (error.name === 'NetworkError' || !navigator.onLine) {
    return errorHandler.createError(
      ErrorType.NETWORK,
      'Network connection failed',
      {
        severity: ErrorSeverity.HIGH,
        retryable: true,
        context: { originalError: error },
      }
    );
  }

  // HTTP errors
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    // Permission errors
    if (status === 401 || status === 403) {
      return errorHandler.createError(
        ErrorType.PERMISSION,
        data?.message || 'Access denied',
        {
          severity: ErrorSeverity.HIGH,
          statusCode: status,
          code: data?.code,
        }
      );
    }

    // Validation errors
    if (status === 400 || status === 422) {
      return errorHandler.createError(
        ErrorType.VALIDATION,
        data?.message || 'Invalid request data',
        {
          severity: ErrorSeverity.MEDIUM,
          statusCode: status,
          context: { validationErrors: data?.errors },
        }
      );
    }

    // Server errors
    if (status >= 500) {
      return errorHandler.createError(
        ErrorType.SYSTEM,
        data?.message || 'Server error occurred',
        {
          severity: ErrorSeverity.CRITICAL,
          statusCode: status,
          retryable: true,
        }
      );
    }
  }

  // Default error
  return errorHandler.createError(
    ErrorType.SYSTEM,
    error.message || 'An unexpected error occurred',
    {
      severity: ErrorSeverity.HIGH,
      context: { originalError: error },
    }
  );
}
```

### Retry Logic with Exponential Backoff

```typescript
// lib/retry-handler.ts
export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    retryCondition = () => true,
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      const appError = handleApiError(error);
      if (!appError.retryable || !retryCondition(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1) + Math.random() * 1000,
        maxDelay
      );

      console.log(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Usage with fetch
export async function fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
  return retryWithBackoff(
    async () => {
      const response = await fetch(url, options);
      
      if (!response.ok && response.status >= 500) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response;
    },
    {
      maxAttempts: 3,
      retryCondition: (error) => {
        // Only retry on network errors or 5xx errors
        return !error.response || error.response.status >= 500;
      },
    }
  );
}
```

## 🎨 User Experience Patterns

### Toast Notifications

```typescript
// components/error-toast.tsx
import { toast } from '@/components/ui/toast';
import { errorHandler } from '@/lib/error-handling';

export function showErrorToast(error: AppError) {
  const action = error.retryable ? {
    label: 'Retry',
    onClick: () => window.location.reload(),
  } : undefined;

  toast({
    title: 'Error',
    description: error.userMessage,
    variant: 'destructive',
    action,
  });
}

// Usage in components
try {
  await dangerousOperation();
} catch (error) {
  const appError = handleApiError(error);
  showErrorToast(appError);
}
```

### Loading States with Error Handling

```typescript
// hooks/use-async-operation.ts
import { useState, useCallback } from 'react';
import { handleApiError } from '@/lib/api-error-handler';

export function useAsyncOperation<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (operation: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await operation();
      setData(result);
      return result;
    } catch (err) {
      const appError = handleApiError(err);
      setError(appError);
      throw appError;
    } finally {
      setLoading(false);
    }
  }, []);

  const retry = useCallback(() => {
    if (error?.retryable && lastOperation) {
      execute(lastOperation);
    }
  }, [error, execute]);

  return { loading, error, data, execute, retry };
}
```

### Form Validation Errors

```typescript
// components/form-field-with-error.tsx
interface FormFieldProps {
  name: string;
  label: string;
  error?: string | string[];
  children: React.ReactNode;
}

export function FormField({ name, label, error, children }: FormFieldProps) {
  const errors = Array.isArray(error) ? error : error ? [error] : [];
  
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      
      {children}
      
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((err, index) => (
            <p key={index} className="text-sm text-red-600">
              {err}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 📊 Error Monitoring & Analytics

### Error Analytics Dashboard

```typescript
// features/developer/components/error-dashboard.tsx
export function ErrorDashboard() {
  const errors = errorHandler.getRecentErrors();
  
  const errorsByType = errors.reduce((acc, error) => {
    acc[error.type] = (acc[error.type] || 0) + 1;
    return acc;
  }, {} as Record<ErrorType, number>);

  const criticalErrors = errors.filter(e => e.severity === ErrorSeverity.CRITICAL);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Error Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <Stat label="Total Errors" value={errors.length} />
            <Stat label="Critical" value={criticalErrors.length} />
            <Stat label="Network Errors" value={errorsByType.NETWORK || 0} />
            <Stat label="Retryable" value={errors.filter(e => e.retryable).length} />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorList errors={errors.slice(0, 10)} />
        </CardContent>
      </Card>
    </div>
  );
}
```

### Performance Impact Tracking

```typescript
// lib/error-performance.ts
class ErrorPerformanceTracker {
  private errorTimings: Map<string, number> = new Map();

  trackErrorImpact(errorId: string, startTime: number) {
    const recoveryTime = performance.now() - startTime;
    this.errorTimings.set(errorId, recoveryTime);
    
    // Report if recovery took too long
    if (recoveryTime > 5000) {
      console.warn(`Error ${errorId} took ${recoveryTime}ms to recover`);
    }
  }

  getAverageRecoveryTime(): number {
    const times = Array.from(this.errorTimings.values());
    return times.reduce((a, b) => a + b, 0) / times.length || 0;
  }
}

export const errorPerformanceTracker = new ErrorPerformanceTracker();
```

## 🚀 Production Error Handling

### Production Configuration

```typescript
// lib/error-config.ts
export const errorConfig = {
  production: {
    showErrorDetails: false,
    enableRetry: true,
    maxRetries: 3,
    reportingEndpoint: process.env.NEXT_PUBLIC_ERROR_REPORTING_URL,
    enableOfflineQueue: true,
  },
  development: {
    showErrorDetails: true,
    enableRetry: true,
    maxRetries: 5,
    reportingEndpoint: '/api/errors',
    enableOfflineQueue: false,
  },
};

export const currentConfig = process.env.NODE_ENV === 'production' 
  ? errorConfig.production 
  : errorConfig.development;
```

### Offline Error Queue

```typescript
// lib/offline-error-queue.ts
class OfflineErrorQueue {
  private readonly STORAGE_KEY = 'safeshipper_error_queue';
  
  async queueError(error: AppError) {
    if (!navigator.onLine) {
      const queue = this.getQueue();
      queue.push(error);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    }
  }

  async flushQueue() {
    if (!navigator.onLine) return;
    
    const queue = this.getQueue();
    if (queue.length === 0) return;
    
    for (const error of queue) {
      try {
        await errorHandler.reportError(error);
      } catch (e) {
        console.error('Failed to report queued error:', e);
      }
    }
    
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private getQueue(): AppError[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}

// Auto-flush when coming online
window.addEventListener('online', () => {
  new OfflineErrorQueue().flushQueue();
});
```

## 🎯 Best Practices

### Error Handling Checklist

- [ ] Wrap components in error boundaries
- [ ] Provide meaningful user messages
- [ ] Log errors for debugging
- [ ] Implement retry mechanisms
- [ ] Track error metrics
- [ ] Test error scenarios
- [ ] Document error codes

### Common Patterns

```typescript
// 1. Async operations with error handling
async function riskyOperation() {
  try {
    const result = await api.dangerousGoods.checkCompatibility(items);
    return result;
  } catch (error) {
    const appError = handleApiError(error);
    
    if (appError.type === ErrorType.BUSINESS_LOGIC) {
      // Handle DG-specific errors
      showDangerousGoodsWarning(appError);
    } else {
      showErrorToast(appError);
    }
    
    throw appError;
  }
}

// 2. Component with error boundary
export function DangerousGoodsChecker() {
  return (
    <ErrorBoundary fallback={DGErrorFallback}>
      <DGCheckerContent />
    </ErrorBoundary>
  );
}

// 3. Form with validation errors
export function ShipmentForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const handleSubmit = async (data: FormData) => {
    try {
      await api.shipments.create(data);
    } catch (error) {
      const appError = handleApiError(error);
      
      if (appError.type === ErrorType.VALIDATION) {
        setErrors(appError.context?.validationErrors || {});
      } else {
        showErrorToast(appError);
      }
    }
  };
}
```

## 📚 Error Code Reference

### Standard Error Codes

| Code | Type | Description | User Action |
|------|------|-------------|-------------|
| `NET_001` | Network | Connection timeout | Check internet connection |
| `VAL_001` | Validation | Required field missing | Fill in required fields |
| `PER_001` | Permission | Unauthorized access | Log in to continue |
| `BIZ_001` | Business | DG compatibility failure | Review dangerous goods rules |
| `SYS_001` | System | Internal server error | Try again later |

### Dangerous Goods Specific Errors

| Code | Description | User Action |
|------|-------------|-------------|
| `DG_001` | Incompatible chemicals | Separate incompatible items |
| `DG_002` | Missing SDS | Upload Safety Data Sheet |
| `DG_003` | Quantity exceeded | Reduce dangerous goods quantity |
| `DG_004` | Invalid UN number | Verify UN number |
| `DG_005` | Placard required | Generate required placards |

---

**Comprehensive error handling ensures SafeShipper maintains high reliability and user satisfaction even when things go wrong.**