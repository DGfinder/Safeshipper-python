/**
 * Unified Analytics Renderer
 * Central component for rendering all analytics visualizations with role-based access control
 * Integrates with the backend UnifiedAnalyticsEngine
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  BarChart3, 
  LineChart,
  PieChart,
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  RefreshCw,
  Download,
  Settings,
  Eye,
  Clock,
  Users,
  Truck,
  Package,
  Shield,
  DollarSign,
  Activity,
  Zap,
  Filter,
  Calendar,
  ExternalLink
} from 'lucide-react';

interface AnalyticsPermissions {
  can_export: string[];
  can_real_time: boolean;
  data_scope: string;
  max_time_range: string;
}

interface AnalyticsMetadata {
  analytics_type: string;
  time_range: string;
  granularity: string;
  record_count: number;
  generated_at: string;
  data_scope: string;
  real_time: boolean;
}

interface CacheInfo {
  cache_hit: boolean;
  cache_level: string;
  computation_time_ms: number;
}

interface ExecutionInfo {
  query_optimized: boolean;
  materialized_view_used: boolean;
}

interface AnalyticsResult {
  data: any[];
  metadata: AnalyticsMetadata;
  cache_info: CacheInfo;
  execution_info: ExecutionInfo;
  permissions: AnalyticsPermissions;
}

interface AnalyticsConfig {
  analytics_type: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  chart_type: 'bar' | 'line' | 'pie' | 'metric' | 'table';
  default_time_range: string;
  real_time_capable: boolean;
  category: string;
}

interface UnifiedAnalyticsRendererProps {
  analytics_type: string;
  title?: string;
  filters?: Record<string, any>;
  time_range?: string;
  granularity?: string;
  real_time?: boolean;
  auto_refresh?: boolean;
  export_enabled?: boolean;
  className?: string;
  onDataUpdate?: (data: any[]) => void;
  onError?: (error: Error) => void;
}

// Available analytics configurations
const ANALYTICS_CONFIGS: Record<string, AnalyticsConfig> = {
  fleet_utilization: {
    analytics_type: 'fleet_utilization',
    title: 'Fleet Utilization',
    description: 'Vehicle utilization rates and availability metrics',
    icon: Truck,
    chart_type: 'bar',
    default_time_range: '7d',
    real_time_capable: true,
    category: 'Fleet'
  },
  shipment_trends: {
    analytics_type: 'shipment_trends',
    title: 'Shipment Trends',
    description: 'Shipment volume and performance trends over time',
    icon: Package,
    chart_type: 'line',
    default_time_range: '30d',
    real_time_capable: true,
    category: 'Operations'
  },
  compliance_metrics: {
    analytics_type: 'compliance_metrics',
    title: 'Compliance Metrics',
    description: 'Safety and regulatory compliance tracking',
    icon: Shield,
    chart_type: 'pie',
    default_time_range: '30d',
    real_time_capable: false,
    category: 'Compliance'
  },
  financial_performance: {
    analytics_type: 'financial_performance',
    title: 'Financial Performance',
    description: 'Revenue, costs, and profitability analysis',
    icon: DollarSign,
    chart_type: 'line',
    default_time_range: '90d',
    real_time_capable: false,
    category: 'Financial'
  },
  operational_efficiency: {
    analytics_type: 'operational_efficiency',
    title: 'Operational Efficiency',
    description: 'KPI dashboard for operational performance',
    icon: Activity,
    chart_type: 'metric',
    default_time_range: '7d',
    real_time_capable: true,
    category: 'Operations'
  }
};

export function UnifiedAnalyticsRenderer({
  analytics_type,
  title,
  filters = {},
  time_range,
  granularity = 'auto',
  real_time = false,
  auto_refresh = false,
  export_enabled = true,
  className = '',
  onDataUpdate,
  onError
}: UnifiedAnalyticsRendererProps) {
  
  // Component state
  const [analyticsResult, setAnalyticsResult] = useState<AnalyticsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [currentTimeRange, setCurrentTimeRange] = useState(time_range || '7d');
  const [currentGranularity, setCurrentGranularity] = useState(granularity);
  const [activeFilters, setActiveFilters] = useState(filters);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(auto_refresh);

  // Get analytics configuration
  const config = useMemo(() => 
    ANALYTICS_CONFIGS[analytics_type] || {
      analytics_type,
      title: title || analytics_type,
      description: 'Custom analytics visualization',
      icon: BarChart3,
      chart_type: 'bar' as const,
      default_time_range: '7d',
      real_time_capable: false,
      category: 'Custom'
    }, 
    [analytics_type, title]
  );

  // Available time ranges
  const timeRanges = [
    { value: '1h', label: '1 Hour' },
    { value: '6h', label: '6 Hours' },
    { value: '1d', label: '1 Day' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' }
  ];

  // Available granularities
  const granularities = [
    { value: 'auto', label: 'Auto' },
    { value: 'minute', label: 'Per Minute' },
    { value: 'hour', label: 'Hourly' },
    { value: 'day', label: 'Daily' },
    { value: 'week', label: 'Weekly' },
    { value: 'month', label: 'Monthly' }
  ];

  // Load analytics data
  const loadAnalyticsData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }
      setError(null);

      // Build request parameters
      const params = new URLSearchParams({
        analytics_type,
        time_range: currentTimeRange,
        granularity: currentGranularity,
        real_time: real_time.toString(),
        cache_enabled: (!real_time).toString(),
        ...Object.entries(activeFilters).reduce((acc, [key, value]) => ({
          ...acc,
          [`filter_${key}`]: Array.isArray(value) ? value.join(',') : String(value)
        }), {})
      });

      // Make API request to backend analytics engine
      const response = await fetch(`/api/analytics/unified/?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Or your auth method
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to fetch analytics: ${response.status}`);
      }

      const result: AnalyticsResult = await response.json();
      
      setAnalyticsResult(result);
      setLastUpdate(new Date());
      
      // Notify parent component of data update
      if (onDataUpdate && result.data) {
        onDataUpdate(result.data);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
      
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
      
      console.error('Analytics loading error:', err);
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }, [analytics_type, currentTimeRange, currentGranularity, real_time, activeFilters, onDataUpdate, onError]);

  // Initial data load
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      loadAnalyticsData(false); // Don't show loader for auto-refresh
    }, real_time ? 30000 : 300000); // 30s for real-time, 5min for cached

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, real_time, loadAnalyticsData]);

  // Export analytics data
  const handleExport = async (format: string) => {
    if (!analyticsResult?.permissions?.can_export?.includes(format)) {
      setError(`Export format ${format} not permitted for your role`);
      return;
    }

    try {
      const params = new URLSearchParams({
        analytics_type,
        time_range: currentTimeRange,
        granularity: currentGranularity,
        export_format: format,
        ...Object.entries(activeFilters).reduce((acc, [key, value]) => ({
          ...acc,
          [`filter_${key}`]: Array.isArray(value) ? value.join(',') : String(value)
        }), {})
      });

      const response = await fetch(`/api/analytics/unified/export/?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${analytics_type}_${currentTimeRange}_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
    }
  };

  // Render performance indicators
  const renderPerformanceInfo = () => {
    if (!analyticsResult) return null;

    const { cache_info, execution_info, metadata } = analyticsResult;

    return (
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${cache_info.cache_hit ? 'bg-green-500' : 'bg-yellow-500'}`} />
          {cache_info.cache_hit ? `${cache_info.cache_level} cache` : 'Live data'}
        </div>
        
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {cache_info.computation_time_ms}ms
        </div>
        
        {execution_info.materialized_view_used && (
          <Badge variant="outline" className="text-xs">
            Optimized
          </Badge>
        )}
        
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {metadata.record_count} records
        </div>
        
        {metadata.real_time && (
          <Badge variant="default" className="text-xs">
            Real-time
          </Badge>
        )}
      </div>
    );
  };

  // Render chart based on type
  const renderChart = () => {
    if (!analyticsResult?.data) return null;

    // This would integrate with your charting library (Chart.js, Recharts, etc.)
    // For now, showing a placeholder that demonstrates the structure
    
    return (
      <div className="h-64 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
        <div className="text-center">
          <config.icon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">
            {config.chart_type.toUpperCase()} Chart: {analyticsResult.data.length} data points
          </p>
          <p className="text-sm text-gray-500">
            Chart integration placeholder - integrate with your preferred charting library
          </p>
        </div>
      </div>
    );
  };

  // Render data table
  const renderDataTable = () => {
    if (!analyticsResult?.data || analyticsResult.data.length === 0) return null;

    const data = analyticsResult.data.slice(0, 10); // Show first 10 rows
    const columns = Object.keys(data[0] || {});

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {columns.map(column => (
                <th key={column} className="text-left py-2 px-3 font-medium text-gray-700">
                  {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="border-b">
                {columns.map(column => (
                  <td key={column} className="py-2 px-3 text-gray-600">
                    {String(row[column] || '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {analyticsResult.data.length > 10 && (
          <p className="text-xs text-gray-500 mt-2 px-3">
            Showing 10 of {analyticsResult.data.length} records
          </p>
        )}
      </div>
    );
  };

  const IconComponent = config.icon;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconComponent className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle className="text-lg">{config.title}</CardTitle>
                <p className="text-sm text-gray-600">{config.description}</p>
              </div>
              <Badge variant="outline">{config.category}</Badge>
            </div>

            <div className="flex items-center gap-2">
              {/* Time Range Selector */}
              <select
                value={currentTimeRange}
                onChange={(e) => setCurrentTimeRange(e.target.value)}
                className="px-2 py-1 border rounded text-sm"
                disabled={isLoading}
              >
                {timeRanges.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>

              {/* Granularity Selector */}
              <select
                value={currentGranularity}
                onChange={(e) => setCurrentGranularity(e.target.value)}
                className="px-2 py-1 border rounded text-sm"
                disabled={isLoading}
              >
                {granularities.map(gran => (
                  <option key={gran.value} value={gran.value}>
                    {gran.label}
                  </option>
                ))}
              </select>

              {/* Auto-refresh toggle */}
              {(config.real_time_capable || real_time) && (
                <Button
                  variant={autoRefreshEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                >
                  <Zap className="w-4 h-4 mr-1" />
                  {autoRefreshEnabled ? 'Live' : 'Manual'}
                </Button>
              )}

              {/* Refresh button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadAnalyticsData()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              {/* Export dropdown */}
              {export_enabled && analyticsResult?.permissions?.can_export && analyticsResult.permissions.can_export.length > 0 && (
                <div className="relative">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                  {/* Export options would be implemented with a dropdown component */}
                </div>
              )}
            </div>
          </div>

          {/* Performance Info */}
          {renderPerformanceInfo()}
        </CardHeader>

        <CardContent>
          {/* Error State */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  loadAnalyticsData();
                }}
                className="ml-auto"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                <p className="text-gray-600">Loading analytics...</p>
              </div>
            </div>
          )}

          {/* Data Display */}
          {!isLoading && !error && analyticsResult && (
            <Tabs defaultValue="chart" className="space-y-4">
              <TabsList>
                <TabsTrigger value="chart">Visualization</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="info">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="chart">
                {renderChart()}
              </TabsContent>

              <TabsContent value="data">
                {renderDataTable()}
              </TabsContent>

              <TabsContent value="info">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Query Information</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Analytics Type: {analyticsResult.metadata.analytics_type}</p>
                      <p>Time Range: {analyticsResult.metadata.time_range}</p>
                      <p>Granularity: {analyticsResult.metadata.granularity}</p>
                      <p>Data Scope: {analyticsResult.metadata.data_scope}</p>
                      <p>Records: {analyticsResult.metadata.record_count}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Performance</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Cache Level: {analyticsResult.cache_info.cache_level}</p>
                      <p>Computation Time: {analyticsResult.cache_info.computation_time_ms}ms</p>
                      <p>Query Optimized: {analyticsResult.execution_info.query_optimized ? 'Yes' : 'No'}</p>
                      <p>Materialized View: {analyticsResult.execution_info.materialized_view_used ? 'Yes' : 'No'}</p>
                      <p>Generated: {new Date(analyticsResult.metadata.generated_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Empty State */}
          {!isLoading && !error && analyticsResult && analyticsResult.data.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-600 mb-4">
                No data found for the selected time range and filters.
              </p>
              <Button onClick={() => loadAnalyticsData()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Footer */}
      {analyticsResult && (
        <div className="text-xs text-gray-500 text-center">
          Last updated: {lastUpdate.toLocaleTimeString()} • 
          {autoRefreshEnabled ? ' Auto-refresh enabled' : ' Manual refresh mode'}
        </div>
      )}
    </div>
  );
}

export default UnifiedAnalyticsRenderer;