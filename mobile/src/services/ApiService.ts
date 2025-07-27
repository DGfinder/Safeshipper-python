/**
 * API Service Layer
 * Handles all API calls with offline-first architecture
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { DangerousGood, SearchResult, SearchFilters, CompatibilityResult, PhAnalysisResult } from '../types/DangerousGoods';
import { 
  EmergencyProcedureGuide, 
  ShipmentEmergencyPlan, 
  EmergencyIncident,
  EPGSearchFilters,
  EPGSearchResult,
  EPGStatistics,
  EmergencyPlanGenerationRequest,
  EmergencyPlanGenerationResponse
} from '../types/EPG';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  fromCache?: boolean;
}

interface QueuedRequest {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  timestamp: number;
  retryCount: number;
}

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;
  private isOnline: boolean = true;
  private requestQueue: QueuedRequest[] = [];
  private readonly CACHE_PREFIX = 'api_cache_';
  private readonly QUEUE_KEY = 'api_queue';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_RETRY_COUNT = 3;

  constructor() {
    this.baseURL = __DEV__ 
      ? 'http://localhost:8000/api/v1' 
      : 'https://api.safeshipper.com/api/v1';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.initializeNetworkListener();
    this.loadRequestQueue();
  }

  private setupInterceptors() {
    // Request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  private async initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (wasOffline && this.isOnline) {
        this.processRequestQueue();
      }
    });
  }

  private async handleUnauthorized() {
    await AsyncStorage.multiRemove(['access_token', 'user_data']);
    // Navigate to login screen (implement based on your navigation setup)
  }

  private async loadRequestQueue() {
    try {
      const queueData = await AsyncStorage.getItem(this.QUEUE_KEY);
      if (queueData) {
        this.requestQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Failed to load request queue:', error);
    }
  }

  private async saveRequestQueue() {
    try {
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.requestQueue));
    } catch (error) {
      console.error('Failed to save request queue:', error);
    }
  }

  private async queueRequest(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', data?: any) {
    const request: QueuedRequest = {
      id: `${Date.now()}_${Math.random()}`,
      url,
      method,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.requestQueue.push(request);
    await this.saveRequestQueue();
  }

  private async processRequestQueue() {
    if (!this.isOnline || this.requestQueue.length === 0) return;

    const currentQueue = [...this.requestQueue];
    this.requestQueue = [];

    for (const request of currentQueue) {
      try {
        await this.executeQueuedRequest(request);
      } catch (error) {
        request.retryCount++;
        if (request.retryCount < this.MAX_RETRY_COUNT) {
          this.requestQueue.push(request);
        }
      }
    }

    await this.saveRequestQueue();
  }

  private async executeQueuedRequest(request: QueuedRequest) {
    const config: AxiosRequestConfig = {
      method: request.method,
      url: request.url,
      data: request.data,
    };

    await this.client.request(config);
  }

  private getCacheKey(url: string, params?: any): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${this.CACHE_PREFIX}${url}_${paramsStr}`;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > this.CACHE_DURATION;
      
      if (isExpired) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  private async setCache<T>(key: string, data: T): Promise<void> {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  private async makeRequest<T>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    useCache: boolean = true
  ): Promise<ApiResponse<T>> {
    const cacheKey = this.getCacheKey(url, data);

    // Try cache first for GET requests
    if (method === 'GET' && useCache) {
      const cached = await this.getFromCache<T>(cacheKey);
      if (cached) {
        return { success: true, data: cached, fromCache: true };
      }
    }

    // If offline, return cached data or queue request
    if (!this.isOnline) {
      if (method === 'GET') {
        const cached = await this.getFromCache<T>(cacheKey);
        if (cached) {
          return { success: true, data: cached, fromCache: true };
        }
        return { success: false, error: 'No cached data available offline' };
      } else {
        await this.queueRequest(url, method, data);
        return { success: true, data: undefined as any };
      }
    }

    // Make online request
    try {
      const config: AxiosRequestConfig = {
        method,
        url,
        data,
      };

      const response: AxiosResponse<T> = await this.client.request(config);
      
      // Cache successful GET responses
      if (method === 'GET' && useCache) {
        await this.setCache(cacheKey, response.data);
      }

      return { success: true, data: response.data };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      
      // For GET requests, try to return cached data on error
      if (method === 'GET') {
        const cached = await this.getFromCache<T>(cacheKey);
        if (cached) {
          return { success: true, data: cached, fromCache: true };
        }
      }

      return { success: false, error: errorMessage };
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: any }>> {
    return this.makeRequest('/auth/login/', 'POST', { email, password }, false);
  }

  async logout(): Promise<ApiResponse<void>> {
    const result = await this.makeRequest('/auth/logout/', 'POST', {}, false);
    await AsyncStorage.multiRemove(['access_token', 'user_data']);
    return result;
  }

  // Dangerous Goods API
  async searchDangerousGoods(
    query: string,
    filters?: SearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<SearchResult>> {
    const params = {
      q: query,
      page,
      limit,
      ...filters,
    };

    return this.makeRequest(`/dangerous-goods/search/`, 'GET', params);
  }

  async getDangerousGood(id: string): Promise<ApiResponse<DangerousGood>> {
    return this.makeRequest(`/dangerous-goods/${id}/`);
  }

  async getPopularDangerousGoods(): Promise<ApiResponse<DangerousGood[]>> {
    return this.makeRequest('/dangerous-goods/popular/');
  }

  async getRecentSearches(): Promise<ApiResponse<DangerousGood[]>> {
    try {
      const recent = await AsyncStorage.getItem('recent_searches');
      const data = recent ? JSON.parse(recent) : [];
      return { success: true, data, fromCache: true };
    } catch (error) {
      return { success: false, error: 'Failed to load recent searches' };
    }
  }

  async addToRecentSearches(material: DangerousGood): Promise<void> {
    try {
      const recent = await AsyncStorage.getItem('recent_searches');
      let searches: DangerousGood[] = recent ? JSON.parse(recent) : [];
      
      // Remove if already exists
      searches = searches.filter(item => item.id !== material.id);
      
      // Add to beginning
      searches.unshift(material);
      
      // Keep only last 10
      searches = searches.slice(0, 10);
      
      await AsyncStorage.setItem('recent_searches', JSON.stringify(searches));
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  }

  // Compatibility API
  async checkCompatibility(
    material1Id: string,
    material2Id: string
  ): Promise<ApiResponse<CompatibilityResult>> {
    return this.makeRequest(
      `/compatibility/check/`,
      'POST',
      { material1_id: material1Id, material2_id: material2Id }
    );
  }

  async compareMultipleCompatibility(
    materialIds: string[]
  ): Promise<ApiResponse<CompatibilityResult[]>> {
    return this.makeRequest(
      `/compatibility/compare/`,
      'POST',
      { material_ids: materialIds }
    );
  }

  async analyzePhLevel(materialId: string): Promise<ApiResponse<PhAnalysisResult>> {
    return this.makeRequest(`/compatibility/ph-analysis/`, 'POST', { material_id: materialId });
  }

  // SDS API
  async getSDS(materialId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/sds/${materialId}/`);
  }

  // EPG API - Emergency Procedure Guides
  async getEmergencyProcedureGuides(
    filters?: EPGSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<EPGSearchResult>> {
    const params = {
      page,
      limit,
      ...filters,
    };
    return this.makeRequest('/epg/emergency-procedure-guides/', 'GET', params);
  }

  async getEmergencyProcedureGuide(id: string): Promise<ApiResponse<EmergencyProcedureGuide>> {
    return this.makeRequest(`/epg/emergency-procedure-guides/${id}/`);
  }

  async searchEmergencyProcedureGuides(
    query: string,
    filters?: EPGSearchFilters
  ): Promise<ApiResponse<EPGSearchResult>> {
    const params = {
      q: query,
      ...filters,
    };
    return this.makeRequest('/epg/emergency-procedure-guides/search/', 'POST', params);
  }

  async getEPGStatistics(): Promise<ApiResponse<EPGStatistics>> {
    return this.makeRequest('/epg/emergency-procedure-guides/statistics/');
  }

  async getEPGsDueForReview(): Promise<ApiResponse<EmergencyProcedureGuide[]>> {
    return this.makeRequest('/epg/emergency-procedure-guides/due_for_review/');
  }

  // Emergency Plans API
  async getShipmentEmergencyPlan(shipmentId: string): Promise<ApiResponse<ShipmentEmergencyPlan>> {
    return this.makeRequest(`/epg/emergency-plans/?shipment=${shipmentId}`);
  }

  async getEmergencyPlan(planId: string): Promise<ApiResponse<ShipmentEmergencyPlan>> {
    return this.makeRequest(`/epg/emergency-plans/${planId}/`);
  }

  async generateEmergencyPlan(
    request: EmergencyPlanGenerationRequest
  ): Promise<ApiResponse<EmergencyPlanGenerationResponse>> {
    return this.makeRequest('/epg/emergency-plans/generate_plan/', 'POST', request);
  }

  async reviewEmergencyPlan(planId: string): Promise<ApiResponse<ShipmentEmergencyPlan>> {
    return this.makeRequest(`/epg/emergency-plans/${planId}/review/`, 'POST');
  }

  async approveEmergencyPlan(planId: string): Promise<ApiResponse<ShipmentEmergencyPlan>> {
    return this.makeRequest(`/epg/emergency-plans/${planId}/approve/`, 'POST');
  }

  async activateEmergencyPlan(planId: string): Promise<ApiResponse<ShipmentEmergencyPlan>> {
    return this.makeRequest(`/epg/emergency-plans/${planId}/activate/`, 'POST');
  }

  // Emergency Incidents API
  async getEmergencyIncidents(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<{ count: number; results: EmergencyIncident[] }>> {
    const params = { page, limit };
    return this.makeRequest('/epg/incidents/', 'GET', params);
  }

  async getEmergencyIncident(id: string): Promise<ApiResponse<EmergencyIncident>> {
    return this.makeRequest(`/epg/incidents/${id}/`);
  }

  async createEmergencyIncident(
    incident: Partial<EmergencyIncident>
  ): Promise<ApiResponse<EmergencyIncident>> {
    return this.makeRequest('/epg/incidents/', 'POST', incident);
  }

  async getRecentEmergencyIncidents(): Promise<ApiResponse<EmergencyIncident[]>> {
    return this.makeRequest('/epg/incidents/recent/');
  }

  // Offline data sync
  async syncOfflineData(): Promise<ApiResponse<any>> {
    if (!this.isOnline) {
      return { success: false, error: 'Cannot sync while offline' };
    }

    try {
      // Sync essential data for offline use
      const [dangerousGoods, hazardClasses, segregationRules, emergencyProcedureGuides] = await Promise.all([
        this.makeRequest('/dangerous-goods/essential/', 'GET', {}, false),
        this.makeRequest('/hazard-classes/', 'GET', {}, false),
        this.makeRequest('/segregation-rules/', 'GET', {}, false),
        this.makeRequest('/epg/emergency-procedure-guides/?status=ACTIVE', 'GET', {}, false),
      ]);

      const offlineData = {
        dangerousGoods: dangerousGoods.data || [],
        hazardClasses: hazardClasses.data || [],
        segregationRules: segregationRules.data || [],
        emergencyProcedureGuides: emergencyProcedureGuides.data?.results || [],
        lastSync: new Date(),
        version: '1.0.0',
      };

      await AsyncStorage.setItem('offline_data', JSON.stringify(offlineData));
      return { success: true, data: offlineData };
    } catch (error) {
      return { success: false, error: 'Failed to sync offline data' };
    }
  }

  async getOfflineData(): Promise<ApiResponse<any>> {
    try {
      const data = await AsyncStorage.getItem('offline_data');
      if (!data) {
        return { success: false, error: 'No offline data available' };
      }
      return { success: true, data: JSON.parse(data), fromCache: true };
    } catch (error) {
      return { success: false, error: 'Failed to load offline data' };
    }
  }

  // Utility methods
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  isOnlineMode(): boolean {
    return this.isOnline;
  }

  getQueueLength(): number {
    return this.requestQueue.length;
  }
}

export const apiService = new ApiService();
export default apiService;