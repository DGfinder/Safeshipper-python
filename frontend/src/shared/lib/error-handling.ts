// Comprehensive error handling utilities

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION', 
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AppError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: any;
  timestamp: string;
  stack?: string;
  context?: Record<string, any>;
  retryable: boolean;
  userMessage: string;
}

class ErrorHandler {
  private errorQueue: AppError[] = [];
  private maxQueueSize = 50;
  private retryAttempts = new Map<string, number>();

  createError(
    type: ErrorType,
    message: string,
    options: {
      severity?: ErrorSeverity;
      details?: any;
      context?: Record<string, any>;
      retryable?: boolean;
      userMessage?: string;
      originalError?: Error;
    } = {}
  ): AppError {
    const {
      severity = ErrorSeverity.MEDIUM,
      details,
      context,
      retryable = false,
      userMessage,
      originalError
    } = options;

    const errorId = `${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const appError: AppError = {
      id: errorId,
      type,
      severity,
      message,
      details,
      context: {
        ...context,
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'SSR',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      stack: originalError?.stack,
      retryable,
      userMessage: userMessage || this.getDefaultUserMessage(type, severity)
    };

    // Add to error queue
    this.addToQueue(appError);

    return appError;
  }

  private getDefaultUserMessage(type: ErrorType, severity: ErrorSeverity): string {
    const messageMap: Record<ErrorType, Record<ErrorSeverity, string>> = {
      [ErrorType.NETWORK]: {
        [ErrorSeverity.LOW]: 'Connection is slow. Please wait...',
        [ErrorSeverity.MEDIUM]: 'Network connection issue. Please check your internet.',
        [ErrorSeverity.HIGH]: 'Network error occurred. Please try again.',
        [ErrorSeverity.CRITICAL]: 'Unable to connect to our servers. Please try again later.'
      },
      [ErrorType.AUTHENTICATION]: {
        [ErrorSeverity.LOW]: 'Please verify your credentials.',
        [ErrorSeverity.MEDIUM]: 'Authentication failed. Please log in again.',
        [ErrorSeverity.HIGH]: 'Your session has expired. Please log in again.',
        [ErrorSeverity.CRITICAL]: 'Account access denied. Please contact support.'
      },
      [ErrorType.AUTHORIZATION]: {
        [ErrorSeverity.LOW]: 'Limited access to this feature.',
        [ErrorSeverity.MEDIUM]: 'You don\'t have permission for this action.',
        [ErrorSeverity.HIGH]: 'Access denied. Please contact your administrator.',
        [ErrorSeverity.CRITICAL]: 'Unauthorized access attempt blocked.'
      },
      [ErrorType.VALIDATION]: {
        [ErrorSeverity.LOW]: 'Please check your input.',
        [ErrorSeverity.MEDIUM]: 'Some information is missing or incorrect.',
        [ErrorSeverity.HIGH]: 'Invalid data provided. Please correct and try again.',
        [ErrorSeverity.CRITICAL]: 'Critical validation failure. Please contact support.'
      },
      [ErrorType.SERVER]: {
        [ErrorSeverity.LOW]: 'Server is processing your request...',
        [ErrorSeverity.MEDIUM]: 'Server error occurred. Please try again.',
        [ErrorSeverity.HIGH]: 'Our servers are experiencing issues. Please try again.',
        [ErrorSeverity.CRITICAL]: 'Service temporarily unavailable. Please try again later.'
      },
      [ErrorType.CLIENT]: {
        [ErrorSeverity.LOW]: 'Something went wrong. Please refresh the page.',
        [ErrorSeverity.MEDIUM]: 'Application error occurred. Please try again.',
        [ErrorSeverity.HIGH]: 'Unexpected error. Please refresh and try again.',
        [ErrorSeverity.CRITICAL]: 'Critical application error. Please contact support.'
      },
      [ErrorType.UNKNOWN]: {
        [ErrorSeverity.LOW]: 'Minor issue occurred.',
        [ErrorSeverity.MEDIUM]: 'Something went wrong. Please try again.',
        [ErrorSeverity.HIGH]: 'Unexpected error occurred.',
        [ErrorSeverity.CRITICAL]: 'Critical error. Please contact support immediately.'
      }
    };

    return messageMap[type]?.[severity] || 'An error occurred. Please try again.';
  }

  private addToQueue(error: AppError) {
    this.errorQueue.push(error);
    
    // Maintain queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Log error
    this.logError(error);

    // Report error if in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error);
    }
  }

  private logError(error: AppError) {
    const logLevel = this.getLogLevel(error.severity);
    
    const logData = {
      id: error.id,
      type: error.type,
      severity: error.severity,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp
    };

    switch (logLevel) {
      case 'error':
        console.error('AppError:', logData);
        break;
      case 'warn':
        console.warn('AppError:', logData);
        break;
      case 'info':
        console.info('AppError:', logData);
        break;
      default:
        console.log('AppError:', logData);
    }
  }

  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' | 'log' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'log';
    }
  }

  private async reportError(error: AppError) {
    try {
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  canRetry(errorId: string, maxAttempts: number = 3): boolean {
    const attempts = this.retryAttempts.get(errorId) || 0;
    return attempts < maxAttempts;
  }

  incrementRetryAttempt(errorId: string): number {
    const attempts = (this.retryAttempts.get(errorId) || 0) + 1;
    this.retryAttempts.set(errorId, attempts);
    return attempts;
  }

  getRecentErrors(count: number = 10): AppError[] {
    return this.errorQueue.slice(-count);
  }

  clearErrorQueue(): void {
    this.errorQueue = [];
    this.retryAttempts.clear();
  }

  getErrorStats() {
    const stats = {
      total: this.errorQueue.length,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      retryable: 0,
      recentCount: 0
    };

    const recentThreshold = Date.now() - (5 * 60 * 1000); // Last 5 minutes

    this.errorQueue.forEach(error => {
      // Count by type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      
      // Count by severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // Count retryable
      if (error.retryable) {
        stats.retryable++;
      }
      
      // Count recent
      if (new Date(error.timestamp).getTime() > recentThreshold) {
        stats.recentCount++;
      }
    });

    return stats;
  }
}

// Singleton error handler
export const errorHandler = new ErrorHandler();

// API Error handling utilities
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: any,
    public url?: string
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: any, context?: string): AppError {
  let errorType = ErrorType.UNKNOWN;
  let severity = ErrorSeverity.MEDIUM;
  let retryable = false;

  if (error instanceof ApiError) {
    const { status } = error;
    
    if (status >= 500) {
      errorType = ErrorType.SERVER;
      severity = ErrorSeverity.HIGH;
      retryable = true;
    } else if (status === 401) {
      errorType = ErrorType.AUTHENTICATION;
      severity = ErrorSeverity.HIGH;
      retryable = false;
    } else if (status === 403) {
      errorType = ErrorType.AUTHORIZATION;
      severity = ErrorSeverity.MEDIUM;
      retryable = false;
    } else if (status >= 400) {
      errorType = ErrorType.VALIDATION;
      severity = ErrorSeverity.MEDIUM;
      retryable = false;
    }
  } else if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR') {
    errorType = ErrorType.NETWORK;
    severity = ErrorSeverity.HIGH;
    retryable = true;
  } else if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
    errorType = ErrorType.NETWORK;
    severity = ErrorSeverity.MEDIUM;
    retryable = true;
  }

  return errorHandler.createError(errorType, error.message || 'Unknown error', {
    severity,
    retryable,
    details: error,
    context: context ? { context } : undefined,
    originalError: error
  });
}

// Promise wrapper with error handling
export async function withErrorHandling<T>(
  promise: Promise<T>,
  context?: string
): Promise<{ data?: T; error?: AppError }> {
  try {
    const data = await promise;
    return { data };
  } catch (error) {
    const appError = handleApiError(error, context);
    return { error: appError };
  }
}

// Retry utility with exponential backoff
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  context?: string
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        throw error;
      }

      // Check if error is retryable
      const appError = handleApiError(error, context);
      if (!appError.retryable) {
        throw error;
      }

      // Exponential backoff: delay = baseDelay * 2^(attempt-1) + jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error instanceof Error ? error.message : String(error));
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}