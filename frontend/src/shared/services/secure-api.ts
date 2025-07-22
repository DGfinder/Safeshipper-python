/**
 * Secure API Client
 * Replaces insecure localStorage-based authentication with secure httpOnly cookies
 * Implements CSRF protection and automatic session management
 */

import { secureAuth } from './secure-auth';

interface APIError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export class SecureAPIError extends Error {
  public status?: number;
  public code?: string;
  public details?: any;

  constructor(error: APIError) {
    super(error.message);
    this.name = 'SecureAPIError';
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
  }
}

export class SecureAPIClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Make a secure API request
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const requestOptions: RequestInit = {
      ...options,
      credentials: 'include', // Always include cookies for authentication
      headers: {
        ...this.defaultHeaders,
        ...secureAuth.getSecureHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await secureAuth.authenticatedFetch(url, requestOptions);
      
      // Handle different response types
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Check if response has content
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return response.text() as T;
      }
    } catch (error) {
      if (error instanceof SecureAPIError) {
        throw error;
      }
      
      console.error('API request failed:', error);
      throw new SecureAPIError({
        message: 'Network error occurred',
        details: error,
      });
    }
  }

  /**
   * Handle error responses
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any;
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        errorData = { message: await response.text() };
      }
    } catch {
      errorData = { message: 'Unknown error occurred' };
    }

    // Handle specific error codes
    switch (response.status) {
      case 401:
        throw new SecureAPIError({
          message: 'Authentication required',
          status: 401,
          code: 'UNAUTHORIZED',
        });
      
      case 403:
        throw new SecureAPIError({
          message: errorData.message || 'Access forbidden',
          status: 403,
          code: 'FORBIDDEN',
          details: errorData,
        });
      
      case 422:
        throw new SecureAPIError({
          message: 'Validation failed',
          status: 422,
          code: 'VALIDATION_ERROR',
          details: errorData,
        });
      
      case 429:
        throw new SecureAPIError({
          message: 'Too many requests. Please try again later.',
          status: 429,
          code: 'RATE_LIMITED',
        });
      
      default:
        throw new SecureAPIError({
          message: errorData.message || `Request failed with status ${response.status}`,
          status: response.status,
          details: errorData,
        });
    }
  }

  /**
   * GET request
   */
  public async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
    return this.request<T>(url, { method: 'GET' });
  }

  /**
   * POST request
   */
  public async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  public async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  public async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  public async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Upload file with progress tracking
   */
  public async uploadFile<T = any>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
    }

    // Create a custom request for file upload
    const url = `${this.baseURL}${endpoint}`;
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Set up progress tracking
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
      }

      // Set up response handling
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            resolve(xhr.responseText as T);
          }
        } else {
          reject(new SecureAPIError({
            message: 'File upload failed',
            status: xhr.status,
            details: xhr.responseText,
          }));
        }
      };

      xhr.onerror = () => {
        reject(new SecureAPIError({
          message: 'Network error during file upload',
        }));
      };

      // Set up request
      xhr.open('POST', url);
      xhr.withCredentials = true; // Include cookies
      
      // Add CSRF token
      const csrfToken = secureAuth.getCSRFToken();
      if (csrfToken) {
        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
      }

      xhr.send(formData);
    });
  }

  /**
   * Batch requests with automatic retry
   */
  public async batchRequest<T = any>(
    requests: Array<{
      endpoint: string;
      method?: string;
      data?: any;
    }>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      failFast?: boolean;
    } = {}
  ): Promise<Array<{ success: boolean; data?: T; error?: SecureAPIError }>> {
    const { maxRetries = 2, retryDelay = 1000, failFast = false } = options;
    const results: Array<{ success: boolean; data?: T; error?: SecureAPIError }> = [];

    for (const request of requests) {
      let attempts = 0;
      let success = false;
      let lastError: SecureAPIError | null = null;

      while (attempts <= maxRetries && !success) {
        try {
          const result = await this.request<T>(request.endpoint, {
            method: request.method || 'GET',
            body: request.data ? JSON.stringify(request.data) : undefined,
          });

          results.push({ success: true, data: result });
          success = true;
        } catch (error) {
          lastError = error instanceof SecureAPIError ? error : new SecureAPIError({
            message: 'Request failed',
            details: error,
          });

          attempts++;
          
          if (attempts <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }

      if (!success) {
        results.push({ success: false, error: lastError! });
        
        if (failFast) {
          break;
        }
      }
    }

    return results;
  }
}

// Create and export singleton instance
export const secureAPI = new SecureAPIClient();

// Export commonly used methods for convenience
export const { get, post, put, patch, delete: del, uploadFile, batchRequest } = secureAPI;