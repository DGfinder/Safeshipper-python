/**
 * Secure Authentication Service
 * Implements secure token management with httpOnly cookies and CSRF protection
 * Replaces insecure localStorage token storage
 */

import { getCookie } from 'cookies-next';

interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
  csrfToken?: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  csrf_token: string;
  expires_in: number;
  user: any;
}

export class SecureAuthService {
  private static instance: SecureAuthService;
  private csrfToken: string | null = null;

  private constructor() {
    // Initialize CSRF token from cookie or meta tag
    this.initializeCSRFToken();
  }

  public static getInstance(): SecureAuthService {
    if (!SecureAuthService.instance) {
      SecureAuthService.instance = new SecureAuthService();
    }
    return SecureAuthService.instance;
  }

  /**
   * Initialize CSRF token from server
   */
  private initializeCSRFToken(): void {
    // Try to get CSRF token from cookie first
    this.csrfToken = getCookie('csrf_token') as string || null;
    
    // Fallback to meta tag if cookie not available
    if (!this.csrfToken && typeof window !== 'undefined') {
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      this.csrfToken = metaTag?.getAttribute('content') || null;
    }
  }

  /**
   * Get CSRF token for requests
   */
  public getCSRFToken(): string | null {
    return this.csrfToken;
  }

  /**
   * Set CSRF token (called after successful authentication)
   */
  public setCSRFToken(token: string): void {
    this.csrfToken = token;
  }

  /**
   * Check if user is authenticated by checking httpOnly cookie presence
   * Note: We can't directly access httpOnly cookies, but we can check for session validity
   */
  public async isAuthenticated(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/verify-session', {
        method: 'GET',
        credentials: 'include', // Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          ...(this.csrfToken && { 'X-CSRF-Token': this.csrfToken }),
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Session verification failed:', error);
      return false;
    }
  }

  /**
   * Secure login with CSRF protection
   */
  public async login(email: string, password: string, mfaCode?: string): Promise<{
    success: boolean;
    user?: any;
    error?: string;
    requiresMFA?: boolean;
  }> {
    try {
      // Get fresh CSRF token for login
      await this.refreshCSRFToken();

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include', // Include cookies for CSRF protection
        headers: {
          'Content-Type': 'application/json',
          ...(this.csrfToken && { 'X-CSRF-Token': this.csrfToken }),
        },
        body: JSON.stringify({
          email,
          password,
          ...(mfaCode && { mfa_code: mfaCode }),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update CSRF token from response
        if (data.csrf_token) {
          this.setCSRFToken(data.csrf_token);
        }

        return {
          success: true,
          user: data.user,
        };
      } else {
        return {
          success: false,
          error: data.error || 'Login failed',
          requiresMFA: data.requires_mfa,
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Network error during login',
      };
    }
  }

  /**
   * Secure logout with CSRF protection
   */
  public async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(this.csrfToken && { 'X-CSRF-Token': this.csrfToken }),
        },
      });

      // Clear CSRF token
      this.csrfToken = null;
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Refresh CSRF token
   */
  public async refreshCSRFToken(): Promise<void> {
    try {
      const response = await fetch('/api/auth/csrf-token', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        this.setCSRFToken(data.csrf_token);
      }
    } catch (error) {
      console.error('CSRF token refresh failed:', error);
    }
  }

  /**
   * Get secure API headers with CSRF protection
   */
  public getSecureHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    return headers;
  }

  /**
   * Make authenticated API request with automatic token refresh
   */
  public async authenticatedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const requestOptions: RequestInit = {
      ...options,
      credentials: 'include', // Include httpOnly cookies
      headers: {
        ...this.getSecureHeaders(),
        ...options.headers,
      },
    };

    let response = await fetch(url, requestOptions);

    // If unauthorized, try to refresh session
    if (response.status === 401) {
      const refreshed = await this.refreshSession();
      if (refreshed) {
        // Retry the request with fresh session
        response = await fetch(url, {
          ...requestOptions,
          headers: {
            ...this.getSecureHeaders(),
            ...options.headers,
          },
        });
      }
    }

    return response;
  }

  /**
   * Attempt to refresh session
   */
  private async refreshSession(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/refresh-session', {
        method: 'POST',
        credentials: 'include',
        headers: this.getSecureHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.csrf_token) {
          this.setCSRFToken(data.csrf_token);
        }
        return true;
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
    }

    return false;
  }

  /**
   * Demo mode: Secure demo authentication
   */
  public async demoLogin(userType: string): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      await this.refreshCSRFToken();

      const response = await fetch('/api/auth/demo-login', {
        method: 'POST',
        credentials: 'include',
        headers: this.getSecureHeaders(),
        body: JSON.stringify({
          demo_user_type: userType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.csrf_token) {
          this.setCSRFToken(data.csrf_token);
        }

        return {
          success: true,
          user: data.user,
        };
      } else {
        return {
          success: false,
          error: data.error || 'Demo login failed',
        };
      }
    } catch (error) {
      console.error('Demo login error:', error);
      return {
        success: false,
        error: 'Network error during demo login',
      };
    }
  }
}

// Export singleton instance
export const secureAuth = SecureAuthService.getInstance();

// Utility functions for backward compatibility
export const getCSRFToken = () => secureAuth.getCSRFToken();
export const isAuthenticated = () => secureAuth.isAuthenticated();
export const secureLogin = (email: string, password: string, mfaCode?: string) => 
  secureAuth.login(email, password, mfaCode);
export const secureLogout = () => secureAuth.logout();
export const authenticatedFetch = (url: string, options?: RequestInit) => 
  secureAuth.authenticatedFetch(url, options);