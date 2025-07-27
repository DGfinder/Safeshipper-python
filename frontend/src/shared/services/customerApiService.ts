// services/customerApiService.ts
// Enhanced API service for customer portal with intelligent fallback to simulated data

import { simulatedDataService } from './simulatedDataService';
import { getEnvironmentConfig } from '@/shared/config/environment';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: 'api' | 'simulated' | 'cache';
  timestamp: string;
}

export interface ApiStatus {
  connected: boolean;
  latency?: number;
  lastCheck: string;
  endpoint: string;
  version?: string;
}

class CustomerApiService {
  private baseUrl: string;
  private apiStatus: ApiStatus;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';
    this.apiStatus = {
      connected: false,
      lastCheck: new Date().toISOString(),
      endpoint: this.baseUrl
    };
    
    // Initialize API health check
    this.checkApiHealth();
    
    // Periodic health checks
    setInterval(() => this.checkApiHealth(), 30000); // Every 30 seconds
  }

  private async checkApiHealth(): Promise<boolean> {
    const config = getEnvironmentConfig();
    
    if (config.apiMode === 'demo') {
      this.apiStatus = {
        connected: false,
        lastCheck: new Date().toISOString(),
        endpoint: 'Demo Mode - No API',
        version: 'Simulated'
      };
      return false;
    }

    // Skip health check during SSR to avoid URL parsing errors
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const startTime = Date.now();
      // Construct absolute URL for fetch
      const healthUrl = this.baseUrl.startsWith('http') 
        ? `${this.baseUrl}/health/`
        : `${window.location.origin}${this.baseUrl}/health/`;
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Short timeout for health check
        signal: AbortSignal.timeout(5000)
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      if (response.ok) {
        const healthData = await response.json();
        this.apiStatus = {
          connected: true,
          latency,
          lastCheck: new Date().toISOString(),
          endpoint: this.baseUrl,
          version: healthData.version || 'Unknown'
        };
        return true;
      } else {
        throw new Error(`API health check failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('API health check failed:', error);
      this.apiStatus = {
        connected: false,
        lastCheck: new Date().toISOString(),
        endpoint: this.baseUrl,
      };
      return false;
    }
  }

  public getApiStatus(): ApiStatus {
    return { ...this.apiStatus };
  }

  private getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${endpoint}:${paramString}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  private setCache<T>(key: string, data: T, ttlMs: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  private async makeApiRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string
  ): Promise<ApiResponse<T>> {
    const config = getEnvironmentConfig();
    
    // Force simulated data in demo mode
    if (config.apiMode === 'demo') {
      return {
        success: false,
        error: 'Demo mode - using simulated data',
        source: 'simulated',
        timestamp: new Date().toISOString()
      };
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        // 10 second timeout for API requests
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data,
        source: 'api',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn(`API request to ${endpoint} failed:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown API error',
        source: 'api',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Customer Profile API with intelligent fallback
  public async getCustomerProfile(customerId: string, token: string): Promise<ApiResponse<any>> {
    const cacheKey = this.getCacheKey('/customers/profile', { customerId });
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached,
        source: 'cache',
        timestamp: new Date().toISOString()
      };
    }

    const apiResponse = await this.makeApiRequest(`/customers/${customerId}/`, {}, token);
    
    if (apiResponse.success && apiResponse.data) {
      this.setCache(cacheKey, apiResponse.data);
      return apiResponse as ApiResponse<any>;
    }

    // Fallback to simulated data
    const customers = simulatedDataService.getCustomerProfiles();
    const customer = customers.find(c => c.id === customerId);
    
    if (customer) {
      return {
        success: true,
        data: customer,
        source: 'simulated',
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: false,
      error: 'Customer not found in API or simulated data',
      source: 'simulated',
      timestamp: new Date().toISOString()
    };
  }

  // Customer Shipments API with intelligent fallback
  public async getCustomerShipments(customerId: string, token: string): Promise<ApiResponse<any[]>> {
    const cacheKey = this.getCacheKey('/customers/shipments', { customerId });
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached as any[],
        source: 'cache',
        timestamp: new Date().toISOString()
      };
    }

    const apiResponse = await this.makeApiRequest(`/customers/${customerId}/shipments/`, {}, token);
    
    if (apiResponse.success && apiResponse.data) {
      this.setCache(cacheKey, apiResponse.data);
      return apiResponse as ApiResponse<any[]>;
    }

    // Fallback to simulated data
    const customer = simulatedDataService.getCustomerProfiles().find(c => c.id === customerId);
    
    if (customer) {
      const shipments = simulatedDataService.getCustomerShipments(customer.name);
      return {
        success: true,
        data: shipments,
        source: 'simulated',
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: false,
      error: 'Customer shipments not found',
      source: 'simulated',
      timestamp: new Date().toISOString()
    };
  }

  // Customer Documents API with intelligent fallback
  public async getCustomerDocuments(customerId: string, token: string, filters?: any): Promise<ApiResponse<any[]>> {
    const cacheKey = this.getCacheKey('/customers/documents', { customerId, ...filters });
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached as any[],
        source: 'cache',
        timestamp: new Date().toISOString()
      };
    }

    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
    }

    const endpoint = `/customers/${customerId}/documents/${params.toString() ? '?' + params.toString() : ''}`;
    const apiResponse = await this.makeApiRequest(endpoint, {}, token);
    
    if (apiResponse.success && apiResponse.data) {
      this.setCache(cacheKey, apiResponse.data, 180000); // 3 minutes for documents
      return apiResponse as ApiResponse<any[]>;
    }

    // Fallback to simulated data - this would be implemented in useCustomerDocuments hook
    return {
      success: false,
      error: 'Documents API not available - falling back to simulated data',
      source: 'simulated',
      timestamp: new Date().toISOString()
    };
  }

  // Compliance Profile API with intelligent fallback
  public async getCustomerCompliance(customerId: string, token: string): Promise<ApiResponse<any>> {
    const cacheKey = this.getCacheKey('/customers/compliance', { customerId });
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached as any,
        source: 'cache',
        timestamp: new Date().toISOString()
      };
    }

    const apiResponse = await this.makeApiRequest(`/customers/${customerId}/compliance/`, {}, token);
    
    if (apiResponse.success && apiResponse.data) {
      this.setCache(cacheKey, apiResponse.data);
      return apiResponse as ApiResponse<any>;
    }

    // Fallback to simulated data
    const customer = simulatedDataService.getCustomerProfiles().find(c => c.id === customerId);
    
    if (customer) {
      const compliance = simulatedDataService.getCustomerComplianceProfile(customer.name);
      return {
        success: true,
        data: compliance,
        source: 'simulated',
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: false,
      error: 'Customer compliance profile not found',
      source: 'simulated',
      timestamp: new Date().toISOString()
    };
  }

  // Real-time notifications API
  public async getCustomerNotifications(customerId: string, token: string): Promise<ApiResponse<any[]>> {
    const cacheKey = this.getCacheKey('/customers/notifications', { customerId });
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached as any[],
        source: 'cache',
        timestamp: new Date().toISOString()
      };
    }

    const apiResponse = await this.makeApiRequest(`/customers/${customerId}/notifications/`, {}, token);
    
    if (apiResponse.success && apiResponse.data) {
      this.setCache(cacheKey, apiResponse.data, 60000); // 1 minute for notifications
      return apiResponse as ApiResponse<any[]>;
    }

    // Fallback to mock notifications
    const mockNotifications = [
      {
        id: '1',
        type: 'shipment_update',
        title: 'Shipment Status Update',
        message: 'Your shipment is in transit and on schedule',
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'medium'
      }
    ];

    return {
      success: true,
      data: mockNotifications,
      source: 'simulated',
      timestamp: new Date().toISOString()
    };
  }

  // Clear cache (useful for refreshing data)
  public clearCache(pattern?: string): void {
    if (pattern) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(pattern));
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  // Get cache statistics
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const customerApiService = new CustomerApiService();
export default customerApiService;