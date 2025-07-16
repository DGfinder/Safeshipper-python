// components/epg/EPGSystemMonitor.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Progress } from "@/shared/components/ui/progress";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database,
  Server,
  Zap,
  TrendingUp,
  RefreshCw,
  Settings,
  Eye,
  Shield
} from "lucide-react";
import { useEPGStatistics, useEPGsDueForReview } from "@/shared/hooks/useEPG";

interface SystemHealth {
  overall_status: "healthy" | "warning" | "critical";
  api_response_time: number;
  database_status: "connected" | "slow" | "disconnected";
  cache_hit_rate: number;
  active_users: number;
  recent_errors: number;
  uptime_percentage: number;
  last_backup: string;
}

interface EPGSystemMonitorProps {
  refreshInterval?: number;
  showDetails?: boolean;
}

export const EPGSystemMonitor: React.FC<EPGSystemMonitorProps> = ({
  refreshInterval = 60000, // 1 minute default
  showDetails = true
}) => {
  const { data: statistics, refetch: refetchStats } = useEPGStatistics();
  const { data: dueForReview } = useEPGsDueForReview(30);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    overall_status: "healthy",
    api_response_time: 125,
    database_status: "connected",
    cache_hit_rate: 94.2,
    active_users: 23,
    recent_errors: 0,
    uptime_percentage: 99.8,
    last_backup: new Date().toISOString()
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Simulate system health monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate system health data
      setSystemHealth(prev => ({
        ...prev,
        api_response_time: Math.floor(Math.random() * 100) + 80,
        cache_hit_rate: Math.floor(Math.random() * 10) + 90,
        active_users: Math.floor(Math.random() * 20) + 15,
        recent_errors: Math.floor(Math.random() * 3),
        uptime_percentage: 99.8 + (Math.random() * 0.2 - 0.1)
      }));
      setLastUpdate(new Date());
      refetchStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, refetchStats]);

  const getHealthColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-green-600";
      case "warning": return "text-yellow-600";
      case "critical": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getHealthBadgeColor = (status: string) => {
    switch (status) {
      case "healthy": return "bg-green-100 text-green-800";
      case "warning": return "bg-yellow-100 text-yellow-800";
      case "critical": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getDatabaseStatusColor = (status: string) => {
    switch (status) {
      case "connected": return "text-green-600";
      case "slow": return "text-yellow-600";
      case "disconnected": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  // System alerts based on conditions
  const getSystemAlerts = () => {
    const alerts = [];
    
    if (systemHealth.recent_errors > 0) {
      alerts.push({
        type: "warning",
        message: `${systemHealth.recent_errors} recent error(s) detected`,
        action: "View logs"
      });
    }
    
    if (dueForReview && dueForReview.length > 10) {
      alerts.push({
        type: "warning",
        message: `${dueForReview.length} EPGs require review`,
        action: "Review queue"
      });
    }
    
    if (systemHealth.api_response_time > 200) {
      alerts.push({
        type: "warning",
        message: "API response time is elevated",
        action: "Check performance"
      });
    }
    
    if (systemHealth.cache_hit_rate < 80) {
      alerts.push({
        type: "critical",
        message: "Cache hit rate is below optimal",
        action: "Check cache"
      });
    }

    return alerts;
  };

  const alerts = getSystemAlerts();

  if (!showDetails) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${systemHealth.overall_status === 'healthy' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                {systemHealth.overall_status === 'healthy' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
              </div>
              <div>
                <p className="font-medium">EPG System</p>
                <p className="text-sm text-gray-600 capitalize">{systemHealth.overall_status}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {systemHealth.active_users} users
              </Badge>
              <Badge variant="outline">
                {systemHealth.api_response_time}ms
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold">EPG System Monitor</h2>
          <Badge className={getHealthBadgeColor(systemHealth.overall_status)}>
            {systemHealth.overall_status.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Last updated {formatTimeAgo(lastUpdate)}
          </span>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* System Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert 
              key={index} 
              className={alert.type === 'critical' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}
            >
              <AlertTriangle className={`h-4 w-4 ${alert.type === 'critical' ? 'text-red-600' : 'text-yellow-600'}`} />
              <AlertDescription className={`flex items-center justify-between ${alert.type === 'critical' ? 'text-red-800' : 'text-yellow-800'}`}>
                <span>{alert.message}</span>
                <Button variant="link" size="sm" className="h-auto p-0">
                  {alert.action}
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4" />
              API Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-bold">{systemHealth.api_response_time}ms</div>
              <div className={`text-sm ${systemHealth.api_response_time < 150 ? 'text-green-600' : 'text-yellow-600'}`}>
                {systemHealth.api_response_time < 150 ? 'Good' : 'Slow'}
              </div>
            </div>
            <div className="mt-2">
              <Progress 
                value={Math.max(0, 100 - (systemHealth.api_response_time / 5))} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className={`h-4 w-4 ${getDatabaseStatusColor(systemHealth.database_status)}`} />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-bold">{systemHealth.cache_hit_rate}%</div>
              <div className="text-sm text-gray-600">cache hit</div>
            </div>
            <div className="mt-1">
              <span className={`text-sm capitalize ${getDatabaseStatusColor(systemHealth.database_status)}`}>
                {systemHealth.database_status}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-bold">{systemHealth.active_users}</div>
              <div className="text-sm text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                Online
              </div>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Peak: {systemHealth.active_users + 5} users
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              System Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-bold">{systemHealth.uptime_percentage.toFixed(1)}%</div>
              <div className="text-sm text-green-600">
                Excellent
              </div>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Last 30 days
            </div>
          </CardContent>
        </Card>
      </div>

      {/* EPG Statistics Integration */}
      {statistics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              EPG Content Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium">Content Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Active EPGs</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {statistics.active_epgs}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Draft EPGs</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {statistics.draft_epgs}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Under Review</span>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                      {statistics.under_review}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Content Coverage</h4>
                <div className="space-y-2">
                  {Object.entries(statistics.by_hazard_class).map(([hazardClass, count]) => (
                    <div key={hazardClass} className="flex justify-between items-center text-sm">
                      <span>Class {hazardClass}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, (count as number / 10) * 100)}%` }}
                          />
                        </div>
                        <span className="w-6 text-right">{count as number}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Maintenance Required</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span>Due for Review</span>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {statistics.due_for_review}
                    </Badge>
                  </div>
                  
                  {systemHealth.recent_errors > 0 && (
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span>Recent Errors</span>
                      </div>
                      <Badge className="bg-red-100 text-red-800">
                        {systemHealth.recent_errors}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>System Backup</span>
                    </div>
                    <span className="text-xs text-green-700">
                      {formatTimeAgo(new Date(systemHealth.last_backup))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View Logs
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Cache
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Run Backup
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EPGSystemMonitor;