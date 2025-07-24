/**
 * CSRF Protection System
 * Implements comprehensive Cross-Site Request Forgery protection
 * Addresses critical security gap in state-changing operations
 */

import { getCookie, setCookie } from 'cookies-next';

interface CSRFConfig {
  tokenLength: number;
  cookieName: string;
  headerName: string;
  expiryHours: number;
  sameSite: 'strict' | 'lax' | 'none';
  secure: boolean;
}

const DEFAULT_CONFIG: CSRFConfig = {
  tokenLength: 32,
  cookieName: 'csrf_token',
  headerName: 'X-CSRF-Token',
  expiryHours: 24,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
};

export class CSRFProtection {
  private config: CSRFConfig;
  private currentToken: string | null = null;

  constructor(config: Partial<CSRFConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeToken();
  }

  /**
   * Initialize CSRF token from existing cookie or generate new one
   */
  private initializeToken(): void {
    if (typeof window === 'undefined') return;

    // Try to get existing token from cookie
    this.currentToken = getCookie(this.config.cookieName) as string || null;

    // If no token exists, request one from server
    if (!this.currentToken) {
      this.requestNewToken();
    }
  }

  /**
   * Generate a cryptographically secure random token
   */
  private generateToken(): string {
    if (typeof window === 'undefined') {
      // Server-side: use crypto module
      const crypto = require('crypto');
      return crypto.randomBytes(this.config.tokenLength).toString('hex');
    } else {
      // Client-side: use Web Crypto API
      const array = new Uint8Array(this.config.tokenLength);
      window.crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
  }

  /**
   * Request a new CSRF token from the server
   */
  async requestNewToken(): Promise<string | null> {
    try {
      const response = await fetch('/api/security/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.currentToken = data.csrf_token;
        
        // Store token in cookie
        if (this.currentToken) {
          this.setTokenCookie(this.currentToken);
        }
        
        return this.currentToken;
      } else {
        console.error('Failed to fetch CSRF token:', response.statusText);
        return null;
      }
    } catch (error) {
      console.error('Error requesting CSRF token:', error);
      return null;
    }
  }

  /**
   * Set CSRF token in secure cookie
   */
  private setTokenCookie(token: string): void {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + this.config.expiryHours);

    setCookie(this.config.cookieName, token, {
      expires: expiryDate,
      httpOnly: false, // Need to read from client for header
      secure: this.config.secure,
      sameSite: this.config.sameSite,
      path: '/',
    });
  }

  /**
   * Get current CSRF token
   */
  getToken(): string | null {
    if (!this.currentToken) {
      // Try to get from cookie again
      this.currentToken = getCookie(this.config.cookieName) as string || null;
    }
    return this.currentToken;
  }

  /**
   * Get CSRF headers for API requests
   */
  getHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { [this.config.headerName]: token } : {};
  }

  /**
   * Validate CSRF token for incoming request
   */
  async validateToken(requestToken: string): Promise<boolean> {
    const currentToken = this.getToken();
    
    if (!currentToken || !requestToken) {
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    return this.constantTimeEquals(currentToken, requestToken);
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Refresh CSRF token
   */
  async refreshToken(): Promise<string | null> {
    this.currentToken = null;
    return await this.requestNewToken();
  }

  /**
   * Clear CSRF token
   */
  clearToken(): void {
    this.currentToken = null;
    
    // Remove from cookie
    setCookie(this.config.cookieName, '', {
      expires: new Date(0),
      httpOnly: false,
      secure: this.config.secure,
      sameSite: this.config.sameSite,
      path: '/',
    });
  }

  /**
   * Create a hidden form field with CSRF token
   */
  createHiddenField(): HTMLInputElement | null {
    if (typeof window === 'undefined') return null;

    const token = this.getToken();
    if (!token) return null;

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = '_csrf_token';
    input.value = token;
    
    return input;
  }

  /**
   * Add CSRF protection to form
   */
  protectForm(form: HTMLFormElement): void {
    if (typeof window === 'undefined') return;

    // Remove existing CSRF field
    const existingField = form.querySelector('input[name="_csrf_token"]');
    if (existingField) {
      existingField.remove();
    }

    // Add new CSRF field
    const csrfField = this.createHiddenField();
    if (csrfField) {
      form.appendChild(csrfField);
    }
  }

  /**
   * Middleware for fetch requests
   */
  fetchMiddleware = (url: string, options: RequestInit = {}): RequestInit => {
    // Only add CSRF token to state-changing requests
    const method = options.method?.toUpperCase() || 'GET';
    const requiresCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (requiresCSRF) {
      const csrfHeaders = this.getHeaders();
      options.headers = {
        ...csrfHeaders,
        ...options.headers,
      };

      // Always include credentials for CSRF-protected requests
      options.credentials = options.credentials || 'include';
    }

    return options;
  };

  /**
   * Axios interceptor for CSRF protection
   */
  axiosRequestInterceptor = (config: any) => {
    // Add CSRF token to state-changing requests
    const method = config.method?.toUpperCase() || 'GET';
    const requiresCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (requiresCSRF) {
      const csrfHeaders = this.getHeaders();
      config.headers = {
        ...config.headers,
        ...csrfHeaders,
      };

      // Ensure credentials are included
      config.withCredentials = true;
    }

    return config;
  };

  /**
   * Handle CSRF token expiry or invalidity
   */
  async handleCSRFError(): Promise<void> {
    console.warn('CSRF token invalid or expired, refreshing...');
    
    // Clear current token
    this.clearToken();
    
    // Request new token
    await this.requestNewToken();
    
    // Emit event for components to handle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('csrf-token-refreshed', {
        detail: { token: this.currentToken }
      }));
    }
  }

  /**
   * Check if CSRF token is expired (client-side heuristic)
   */
  isTokenExpired(): boolean {
    // This is a simple heuristic - actual validation happens server-side
    const token = this.getToken();
    if (!token) return true;

    // Check if cookie is about to expire (within 1 hour)
    const cookieExpiry = this.getCookieExpiry();
    if (cookieExpiry) {
      const oneHourFromNow = new Date();
      oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
      return cookieExpiry <= oneHourFromNow;
    }

    return false;
  }

  /**
   * Get cookie expiry date
   */
  private getCookieExpiry(): Date | null {
    // This would need to be implemented based on how cookies store expiry
    // For now, return null as we can't easily read cookie expiry from JS
    return null;
  }

  /**
   * Proactively refresh token if it's about to expire
   */
  async proactiveRefresh(): Promise<void> {
    if (this.isTokenExpired()) {
      await this.refreshToken();
    }
  }
}

// Create singleton instance
const csrfProtection = new CSRFProtection();

// Enhanced fetch function with CSRF protection
export const secureFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Apply CSRF middleware
  const protectedOptions = csrfProtection.fetchMiddleware(url, options);
  
  try {
    const response = await fetch(url, protectedOptions);
    
    // Handle CSRF errors
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.code === 'CSRF_TOKEN_INVALID') {
        await csrfProtection.handleCSRFError();
        
        // Retry request with new token
        const retryOptions = csrfProtection.fetchMiddleware(url, options);
        return fetch(url, retryOptions);
      }
    }
    
    return response;
  } catch (error) {
    console.error('Secure fetch error:', error);
    throw error;
  }
};

// React hook for CSRF protection
export const useCSRFProtection = () => {
  const token = csrfProtection.getToken();
  
  return {
    token,
    headers: csrfProtection.getHeaders(),
    refreshToken: () => csrfProtection.refreshToken(),
    protectForm: (form: HTMLFormElement) => csrfProtection.protectForm(form),
    isTokenExpired: () => csrfProtection.isTokenExpired(),
  };
};

// Form protection utility
export const protectAllForms = (): void => {
  if (typeof window === 'undefined') return;

  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    // Only protect forms that submit to the same origin
    const action = form.getAttribute('action');
    if (!action || action.startsWith('/') || action.startsWith(window.location.origin)) {
      csrfProtection.protectForm(form as HTMLFormElement);
    }
  });
};

// Initialize CSRF protection on page load
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', protectAllForms);
  
  // Re-protect forms when new content is added
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          const forms = element.querySelectorAll('form');
          forms.forEach(form => {
            csrfProtection.protectForm(form as HTMLFormElement);
          });
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Export singleton and utilities
export { csrfProtection };
export default CSRFProtection;