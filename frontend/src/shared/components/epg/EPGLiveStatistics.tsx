// components/epg/EPGLiveStatistics.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { 
  Shield, 
  Clock, 
  Edit, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Activity,
  RefreshCw,
  Eye,
  Users
} from "lucide-react";
import { useEPGStatistics } from "@/shared/hooks/useEPG";

interface StatisticCard {
  title: string;
  value: number;
  previousValue?: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  trend?: "up" | "down" | "stable";
}

interface EPGLiveStatisticsProps {
  refreshInterval?: number; // milliseconds
  showTrends?: boolean;
  compact?: boolean;
}

export const EPGLiveStatistics: React.FC<EPGLiveStatisticsProps> = ({
  refreshInterval = 30000, // 30 seconds default
  showTrends = true,
  compact = false
}) => {
  const { data: statistics, refetch, isLoading } = useEPGStatistics();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [previousStats, setPreviousStats] = useState<any>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  // Auto-refresh effect
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      if (statistics) {
        setPreviousStats(statistics);
      }
      refetch();
      setLastUpdate(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, refetch, isAutoRefresh, statistics]);

  const getTrend = (current: number, previous: number): "up" | "down" | "stable" => {
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "stable";
  };

  const getTrendColor = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up": return "text-green-600";
      case "down": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up": return TrendingUp;
      case "down": return TrendingDown;
      default: return Activity;
    }
  };

  if (!statistics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statisticCards: StatisticCard[] = [
    {
      title: "Total EPGs",
      value: statistics.total_epgs,
      previousValue: previousStats?.total_epgs,
      icon: Shield,
      color: "text-blue-600",
      description: `${statistics.active_epgs} active guides`,
      trend: previousStats ? getTrend(statistics.total_epgs, previousStats.total_epgs) : undefined
    },
    {
      title: "Due for Review",
      value: statistics.due_for_review,
      previousValue: previousStats?.due_for_review,
      icon: Clock,
      color: "text-yellow-600",
      description: "Require attention",
      trend: previousStats ? getTrend(statistics.due_for_review, previousStats.due_for_review) : undefined
    },
    {
      title: "Under Review",
      value: statistics.under_review,
      previousValue: previousStats?.under_review,
      icon: AlertCircle,
      color: "text-orange-600",
      description: "Being reviewed",
      trend: previousStats ? getTrend(statistics.under_review, previousStats.under_review) : undefined
    },
    {
      title: "Draft EPGs",
      value: statistics.draft_epgs,
      previousValue: previousStats?.draft_epgs,
      icon: Edit,
      color: "text-purple-600",
      description: "In development",
      trend: previousStats ? getTrend(statistics.draft_epgs, previousStats.draft_epgs) : undefined
    }
  ];

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Statistics
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Updated {formatTimeAgo(lastUpdate)}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 ${isAutoRefresh ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {statisticCards.map((stat) => {
              const IconComponent = stat.icon;
              const TrendIcon = stat.trend ? getTrendIcon(stat.trend) : null;
              
              return (
                <div key={stat.title} className="text-center">
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                    <IconComponent className="h-3 w-3" />
                    <span>{stat.title}</span>
                    {showTrends && TrendIcon && stat.previousValue !== undefined && (
                      React.createElement(TrendIcon, { className: `h-3 w-3 ${getTrendColor(stat.trend!)}` })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Live Statistics</h3>
          <Badge variant="outline">
            Auto-refresh: {isAutoRefresh ? 'ON' : 'OFF'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Last updated {formatTimeAgo(lastUpdate)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (statistics) setPreviousStats(statistics);
              refetch();
              setLastUpdate(new Date());
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={isAutoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
          >
            {isAutoRefresh ? 'Disable' : 'Enable'} Auto-refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statisticCards.map((stat) => {
          const IconComponent = stat.icon;
          const TrendIcon = stat.trend ? getTrendIcon(stat.trend) : null;
          const trendValue = stat.previousValue !== undefined ? stat.value - stat.previousValue : 0;
          
          return (
            <Card key={stat.title} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <IconComponent className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline space-x-2">
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                  {showTrends && TrendIcon && stat.previousValue !== undefined && (
                    <div className={`flex items-center text-sm ${getTrendColor(stat.trend!)}`}>
                      {React.createElement(TrendIcon, { className: "h-3 w-3 mr-1" })}
                      {Math.abs(trendValue)}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
                
                {/* Trend indicator */}
                {showTrends && stat.trend && stat.previousValue !== undefined && TrendIcon && (
                  <div className={`text-xs mt-2 flex items-center gap-1 ${getTrendColor(stat.trend)}`}>
                    {React.createElement(TrendIcon, { className: "h-3 w-3" })}
                    <span>
                      {stat.trend === 'up' ? '+' : stat.trend === 'down' ? '-' : ''}
                      {Math.abs(trendValue)} since last update
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      {statistics.recent_updates && statistics.recent_updates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {statistics.recent_updates.slice(0, 5).map((update: any) => (
                <div key={update.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <div>
                      <span className="font-medium text-sm">{update.epg_number}</span>
                      <p className="text-xs text-gray-600">{update.title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {update.status}
                    </Badge>
                    <p className="text-xs text-gray-500">
                      {new Date(update.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-refresh notification */}
      {isAutoRefresh && (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            Statistics are updating automatically every {refreshInterval / 1000} seconds. 
            Disable auto-refresh to pause updates.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};