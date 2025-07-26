/**
 * Fleet Utilization Widget
 * Specialized analytics widget for fleet utilization metrics
 * Demonstrates integration with the unified analytics system
 */

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Progress } from '../../ui/progress';
import { 
  Truck, 
  TrendingUp, 
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  RefreshCw,
  Calendar,
  MapPin
} from 'lucide-react';
import { useUnifiedAnalytics } from '../../../shared/hooks/useUnifiedAnalytics';

interface FleetUtilizationWidgetProps {
  filters?: Record<string, any>;
  time_range?: string;
  granularity?: string;
  real_time?: boolean;
  className?: string;
}

interface FleetMetrics {
  total_vehicles: number;
  active_vehicles: number;
  utilization_rate: number;
  avg_hours_per_day: number;
  efficiency_score: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

interface VehicleStatus {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

interface UtilizationTrend {
  time_bucket: string;
  utilization_percentage: number;
  active_vehicles: number;
  total_vehicles: number;
}

export function FleetUtilizationWidget({
  filters = {},
  time_range = '7d',
  granularity = 'hour',
  real_time = true,
  className = ''
}: FleetUtilizationWidgetProps) {

  // Use the unified analytics hook
  const {
    data,
    result,
    isLoading,
    isRefreshing,
    error,
    clearError,
    refreshAnalytics,
    lastUpdate,
    cacheInfo,
    permissions
  } = useUnifiedAnalytics(
    {
      analytics_type: 'fleet_utilization',
      filters,
      time_range,
      granularity,
      real_time
    },
    {
      auto_refresh: real_time,
      refresh_interval: real_time ? 30000 : 300000, // 30s for real-time, 5min otherwise
      on_error: (error) => console.error('Fleet utilization error:', error)
    }
  );

  // Process analytics data into widget-specific metrics
  const metrics = useMemo((): FleetMetrics | null => {
    if (!data || data.length === 0) return null;

    // Calculate metrics from the raw analytics data
    const latestData = data[0]; // Most recent data point
    const previousData = data[1]; // Previous data point for trend calculation

    const total_vehicles = latestData?.total_vehicles || 0;
    const active_vehicles = latestData?.active_vehicles || 0;
    const utilization_rate = total_vehicles > 0 ? (active_vehicles / total_vehicles) * 100 : 0;
    
    // Calculate trend
    let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    if (previousData) {
      const previousRate = previousData.total_vehicles > 0 
        ? (previousData.active_vehicles / previousData.total_vehicles) * 100 
        : 0;
      
      if (utilization_rate > previousRate + 2) trend = 'UP';
      else if (utilization_rate < previousRate - 2) trend = 'DOWN';
    }

    return {
      total_vehicles,
      active_vehicles,
      utilization_rate: Math.round(utilization_rate),
      avg_hours_per_day: latestData?.avg_utilization || 0,
      efficiency_score: Math.round((utilization_rate + (latestData?.avg_utilization || 0) * 10) / 2),
      trend
    };
  }, [data]);

  // Process vehicle status distribution
  const vehicleStatuses = useMemo((): VehicleStatus[] => {
    if (!data || data.length === 0) return [];

    const latestData = data[0];
    const total = latestData?.total_vehicles || 0;
    
    if (total === 0) return [];

    return [
      {
        status: 'Active',
        count: latestData?.active_vehicles || 0,
        percentage: Math.round(((latestData?.active_vehicles || 0) / total) * 100),
        color: 'bg-green-500'
      },
      {
        status: 'Idle',
        count: (latestData?.idle_vehicles || 0),
        percentage: Math.round(((latestData?.idle_vehicles || 0) / total) * 100),
        color: 'bg-yellow-500'
      },
      {
        status: 'Maintenance',
        count: (latestData?.maintenance_vehicles || 0),
        percentage: Math.round(((latestData?.maintenance_vehicles || 0) / total) * 100),
        color: 'bg-orange-500'
      },
      {
        status: 'Offline',
        count: (latestData?.offline_vehicles || 0),
        percentage: Math.round(((latestData?.offline_vehicles || 0) / total) * 100),
        color: 'bg-red-500'
      }
    ].filter(status => status.count > 0);
  }, [data]);

  // Process utilization trends for mini chart
  const utilizationTrends = useMemo((): UtilizationTrend[] => {
    if (!data || data.length === 0) return [];

    return data.slice(0, 24).map(item => ({
      time_bucket: item.time_bucket,
      utilization_percentage: item.total_vehicles > 0 
        ? Math.round((item.active_vehicles / item.total_vehicles) * 100)
        : 0,
      active_vehicles: item.active_vehicles,
      total_vehicles: item.total_vehicles
    })).reverse(); // Show chronological order
  }, [data]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'UP': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'DOWN': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEfficiencyBadge = (score: number) => {
    if (score >= 80) return { variant: 'default' as const, text: 'Excellent' };
    if (score >= 60) return { variant: 'secondary' as const, text: 'Good' };
    if (score >= 40) return { variant: 'outline' as const, text: 'Fair' };
    return { variant: 'destructive' as const, text: 'Poor' };
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Metrics Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle className="text-lg">Fleet Utilization</CardTitle>
                <p className="text-sm text-gray-600">Real-time vehicle utilization metrics</p>
              </div>
              {real_time && (
                <Badge variant="default" className="text-xs">
                  Live
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {cacheInfo && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <div className={`w-2 h-2 rounded-full ${cacheInfo.cache_hit ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  {cacheInfo.computation_time_ms}ms
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAnalytics}
                disabled={isLoading || isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${(isLoading || isRefreshing) ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Error State */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={clearError}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Loading State */}
          {(isLoading || isRefreshing) && !metrics && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 text-blue-500 animate-spin mr-2" />
              <span className="text-gray-600">Loading fleet data...</span>
            </div>
          )}

          {/* Main Content */}
          {metrics && !error && (
            <div className="space-y-6">
              {/* Key Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Overall Utilization */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className={`text-3xl font-bold ${getUtilizationColor(metrics.utilization_rate)}`}>
                      {metrics.utilization_rate}%
                    </span>
                    {getTrendIcon(metrics.trend)}
                  </div>
                  <p className="text-sm text-gray-600">Overall Utilization</p>
                  <Progress value={metrics.utilization_rate} className="mt-2" />
                </div>

                {/* Active Vehicles */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {metrics.active_vehicles}
                    <span className="text-lg text-gray-500">/{metrics.total_vehicles}</span>
                  </div>
                  <p className="text-sm text-gray-600">Active Vehicles</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">Operational</span>
                  </div>
                </div>

                {/* Average Hours */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {metrics.avg_hours_per_day.toFixed(1)}h
                  </div>
                  <p className="text-sm text-gray-600">Avg. Hours/Day</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-blue-600">Per Vehicle</span>
                  </div>
                </div>

                {/* Efficiency Score */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {metrics.efficiency_score}
                  </div>
                  <p className="text-sm text-gray-600">Efficiency Score</p>
                  <Badge 
                    variant={getEfficiencyBadge(metrics.efficiency_score).variant}
                    className="mt-2"
                  >
                    {getEfficiencyBadge(metrics.efficiency_score).text}
                  </Badge>
                </div>
              </div>

              {/* Vehicle Status Distribution */}
              {vehicleStatuses.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Vehicle Status Distribution</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {vehicleStatuses.map((status) => (
                      <div key={status.status} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${status.color}`} />
                          <span className="text-sm font-medium">{status.status}</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {status.count}
                        </div>
                        <div className="text-sm text-gray-600">
                          {status.percentage}% of fleet
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mini Utilization Trend */}
              {utilizationTrends.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Utilization Trend</h4>
                  <div className="h-20 flex items-end gap-1">
                    {utilizationTrends.slice(-12).map((trend, index) => (
                      <div
                        key={index}
                        className="flex-1 bg-blue-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                        style={{ height: `${Math.max(trend.utilization_percentage * 0.8, 4)}%` }}
                        title={`${new Date(trend.time_bucket).toLocaleTimeString()}: ${trend.utilization_percentage}%`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>12 periods ago</span>
                    <span>Current</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isRefreshing && !error && !metrics && (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Fleet Data</h3>
              <p className="text-gray-600 mb-4">
                No fleet utilization data available for the selected time range.
              </p>
              <Button onClick={refreshAnalytics}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Footer */}
      {lastUpdate && (
        <div className="text-xs text-gray-500 text-center">
          Last updated: {lastUpdate.toLocaleTimeString()} • 
          {result?.metadata.record_count || 0} data points • 
          Data scope: {result?.metadata.data_scope || 'N/A'}
        </div>
      )}
    </div>
  );
}

export default FleetUtilizationWidget;