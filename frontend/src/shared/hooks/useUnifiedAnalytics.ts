/**
 * Unified Analytics Hook
 * Provides a clean API for components to interact with the unified analytics system
 * Handles caching, permissions, real-time updates, and error management
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface AnalyticsPermissions {
  can_export: string[];
  can_real_time: boolean;
  data_scope: string;
  max_time_range: string;
}

export interface AnalyticsMetadata {
  analytics_type: string;
  time_range: string;
  granularity: string;
  record_count: number;
  generated_at: string;
  data_scope: string;
  real_time: boolean;
}

export interface CacheInfo {
  cache_hit: boolean;
  cache_level: string;
  computation_time_ms: number;
}

export interface ExecutionInfo {
  query_optimized: boolean;
  materialized_view_used: boolean;
}

export interface AnalyticsResult {
  data: any[];
  metadata: AnalyticsMetadata;
  cache_info: CacheInfo;
  execution_info: ExecutionInfo;
  permissions: AnalyticsPermissions;
}

export interface AnalyticsRequestParams {
  analytics_type: string;
  filters?: Record<string, any>;
  time_range?: string;
  granularity?: string;
  real_time?: boolean;
  cache_enabled?: boolean;
  export_format?: string;
}

export interface UseUnifiedAnalyticsOptions {
  auto_refresh?: boolean;
  refresh_interval?: number;
  enable_cache?: boolean;
  on_error?: (error: Error) => void;
  on_data_update?: (data: any[]) => void;
}

export interface UseUnifiedAnalyticsReturn {
  // Data
  data: any[] | null;
  result: AnalyticsResult | null;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  
  // Error handling
  error: string | null;
  clearError: () => void;
  
  // Actions
  loadAnalytics: (params: AnalyticsRequestParams) => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  exportAnalytics: (format: string) => Promise<void>;
  
  // Auto-refresh control
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  isAutoRefreshEnabled: boolean;
  
  // Performance info
  lastUpdate: Date | null;
  cacheInfo: CacheInfo | null;
  executionInfo: ExecutionInfo | null;
  permissions: AnalyticsPermissions | null;
}

// Cache for analytics results to avoid unnecessary API calls
const analyticsCache = new Map<string, { result: AnalyticsResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useUnifiedAnalytics(
  initialParams?: AnalyticsRequestParams,
  options: UseUnifiedAnalyticsOptions = {}
): UseUnifiedAnalyticsReturn {
  
  const {
    auto_refresh = false,
    refresh_interval = 300000, // 5 minutes default
    enable_cache = true,
    on_error,
    on_data_update
  } = options;

  // State management
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(auto_refresh);
  const [currentParams, setCurrentParams] = useState<AnalyticsRequestParams | null>(initialParams || null);

  // Refs for cleanup and avoiding stale closures
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generate cache key for request
  const generateCacheKey = useCallback((params: AnalyticsRequestParams): string => {
    const { analytics_type, filters, time_range, granularity, real_time } = params;
    const filterString = JSON.stringify(filters || {});
    return `${analytics_type}_${time_range}_${granularity}_${real_time}_${filterString}`;
  }, []);

  // Get cached result if available and fresh
  const getCachedResult = useCallback((cacheKey: string): AnalyticsResult | null => {
    if (!enable_cache) return null;
    
    const cached = analyticsCache.get(cacheKey);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
    if (isExpired) {
      analyticsCache.delete(cacheKey);
      return null;
    }
    
    return cached.result;
  }, [enable_cache]);

  // Cache analytics result
  const cacheResult = useCallback((cacheKey: string, result: AnalyticsResult) => {
    if (!enable_cache) return;
    
    analyticsCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }, [enable_cache]);

  // Get auth token (customize based on your auth implementation)
  const getAuthToken = useCallback((): string | null => {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Main function to load analytics data
  const loadAnalytics = useCallback(async (params: AnalyticsRequestParams, isRefresh = false) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Check cache first (unless real-time or refresh)
      const cacheKey = generateCacheKey(params);
      if (!params.real_time && !isRefresh) {
        const cached = getCachedResult(cacheKey);
        if (cached) {
          setResult(cached);
          setLastUpdate(new Date());
          if (on_data_update) {
            on_data_update(cached.data);
          }
          return;
        }
      }

      // Build request parameters
      const queryParams = new URLSearchParams({
        analytics_type: params.analytics_type,
        time_range: params.time_range || '7d',
        granularity: params.granularity || 'auto',
        real_time: String(params.real_time || false),
        cache_enabled: String(params.cache_enabled !== false)
      });

      // Add filters
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          const filterValue = Array.isArray(value) ? value.join(',') : String(value);
          queryParams.append(`filter_${key}`, filterValue);
        });
      }

      // Add export format if specified
      if (params.export_format) {
        queryParams.append('export_format', params.export_format);
      }

      // Get auth token
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('Authentication required. Please log in.');
      }

      // Make API request
      const response = await fetch(`/api/analytics/unified/?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // If response body is not JSON, use default message
        }
        
        throw new Error(errorMessage);
      }

      const analyticsResult: AnalyticsResult = await response.json();

      // Update state
      setResult(analyticsResult);
      setCurrentParams(params);
      setLastUpdate(new Date());

      // Cache the result (unless real-time)
      if (!params.real_time) {
        cacheResult(cacheKey, analyticsResult);
      }

      // Notify callbacks
      if (on_data_update && analyticsResult.data) {
        on_data_update(analyticsResult.data);
      }

    } catch (err) {
      // Handle aborted requests
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Don't set error for cancelled requests
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);

      if (on_error) {
        on_error(err instanceof Error ? err : new Error(errorMessage));
      }

      console.error('Analytics loading error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      abortControllerRef.current = null;
    }
  }, [generateCacheKey, getCachedResult, cacheResult, getAuthToken, on_data_update, on_error]);

  // Refresh current analytics
  const refreshAnalytics = useCallback(async () => {
    if (!currentParams) {
      setError('No analytics parameters available for refresh');
      return;
    }
    
    await loadAnalytics(currentParams, true);
  }, [currentParams, loadAnalytics]);

  // Export analytics data
  const exportAnalytics = useCallback(async (format: string) => {
    if (!currentParams) {
      setError('No analytics parameters available for export');
      return;
    }

    if (!result?.permissions.can_export.includes(format)) {
      setError(`Export format '${format}' not permitted for your role`);
      return;
    }

    try {
      setError(null);

      const exportParams = {
        ...currentParams,
        export_format: format
      };

      const queryParams = new URLSearchParams({
        analytics_type: exportParams.analytics_type,
        time_range: exportParams.time_range || '7d',
        granularity: exportParams.granularity || 'auto',
        export_format: format
      });

      // Add filters
      if (exportParams.filters) {
        Object.entries(exportParams.filters).forEach(([key, value]) => {
          const filterValue = Array.isArray(value) ? value.join(',') : String(value);
          queryParams.append(`filter_${key}`, filterValue);
        });
      }

      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('Authentication required for export');
      }

      const response = await fetch(`/api/analytics/unified/export/?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        let errorMessage = `Export failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // Use default message if response is not JSON
        }
        throw new Error(errorMessage);
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `${currentParams.analytics_type}_${timestamp}.${format}`;
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);

      if (on_error) {
        on_error(err instanceof Error ? err : new Error(errorMessage));
      }
    }
  }, [currentParams, result, getAuthToken, on_error]);

  // Start auto-refresh
  const startAutoRefresh = useCallback(() => {
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
    }

    setAutoRefreshEnabled(true);

    autoRefreshIntervalRef.current = setInterval(() => {
      if (currentParams) {
        loadAnalytics(currentParams, true);
      }
    }, refresh_interval);
  }, [currentParams, loadAnalytics, refresh_interval]);

  // Stop auto-refresh
  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }
    setAutoRefreshEnabled(false);
  }, []);

  // Load initial data if provided
  useEffect(() => {
    if (initialParams) {
      loadAnalytics(initialParams);
    }
  }, [initialParams, loadAnalytics]);

  // Setup auto-refresh if enabled
  useEffect(() => {
    if (auto_refresh && currentParams) {
      startAutoRefresh();
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [auto_refresh, currentParams, startAutoRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, []);

  return {
    // Data
    data: result?.data || null,
    result,
    
    // Loading states
    isLoading,
    isRefreshing,
    
    // Error handling
    error,
    clearError,
    
    // Actions
    loadAnalytics,
    refreshAnalytics,
    exportAnalytics,
    
    // Auto-refresh control
    startAutoRefresh,
    stopAutoRefresh,
    isAutoRefreshEnabled: autoRefreshEnabled,
    
    // Performance info
    lastUpdate,
    cacheInfo: result?.cache_info || null,
    executionInfo: result?.execution_info || null,
    permissions: result?.permissions || null
  };
}

export default useUnifiedAnalytics;