/**
 * Comprehensive Compliance Monitoring Dashboard
 * Real-time compliance status, alerts, and analytics
 */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Progress } from '@/shared/components/ui/progress';
import { useComplianceMonitoring } from '@/shared/hooks/useComplianceMonitoring';
import { AuditService, ComplianceAlert, ComplianceStatus } from '@/shared/services/auditService';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Bell,
  AlertCircle,
  Target,
  Activity,
  BarChart3,
  Users,
  Package,
  Truck,
  FileText,
  Eye,
  Download,
  Settings,
  Filter,
  ChevronRight,
  Wifi,
  WifiOff,
  CheckSquare
} from 'lucide-react';

interface ComplianceMonitoringDashboardProps {
  className?: string;
}

export const ComplianceMonitoringDashboard: React.FC<ComplianceMonitoringDashboardProps> = ({
  className = ''
}) => {
  // WebSocket connection for real-time updates
  const {
    isConnected,
    isConnecting,
    connectionError,
    alerts: realtimeAlerts,
    complianceData: wsComplianceData,
    statusUpdates,
    thresholdBreaches,
    acknowledgeAlert,
    reconnect
  } = useComplianceMonitoring({
    enabled: true,
    updateTypes: ['status', 'alerts', 'thresholds']
  });

  // Local state
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statusData, summaryData] = await Promise.all([
          AuditService.getComplianceStatus(selectedPeriod),
          AuditService.getDashboardSummary()
        ]);

        setComplianceStatus(statusData);
        setDashboardSummary(summaryData);
      } catch (err) {
        console.error('Error loading compliance data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load compliance data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [selectedPeriod]);

  // Update status when WebSocket data arrives
  useEffect(() => {
    if (statusUpdates) {
      setComplianceStatus(statusUpdates);
    }
  }, [statusUpdates]);

  // Merge real-time and API alerts
  const allAlerts = useMemo(() => {
    const apiAlerts = complianceStatus?.alerts || [];
    const alerts = [...realtimeAlerts, ...apiAlerts];
    
    // Remove duplicates by ID
    const uniqueAlerts = alerts.filter((alert, index, self) => 
      index === self.findIndex(a => a.id === alert.id)
    );
    
    // Filter by acknowledgment status if needed
    return showAcknowledged 
      ? uniqueAlerts 
      : uniqueAlerts.filter(alert => !(alert as any).acknowledged);
  }, [realtimeAlerts, complianceStatus?.alerts, showAcknowledged]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!complianceStatus && !dashboardSummary) return null;

    const score = wsComplianceData?.complianceScore ?? 
                  dashboardSummary?.overall_compliance_score ?? 
                  complianceStatus?.overall_compliance_score ?? 0;

    const activeAlerts = wsComplianceData?.activeAlerts ?? 
                        dashboardSummary?.active_alerts ?? 
                        allAlerts.filter(a => a.requires_immediate_attention).length;

    const criticalAlerts = wsComplianceData?.criticalAlerts ?? 
                          dashboardSummary?.critical_alerts ?? 
                          allAlerts.filter(a => a.level === 'CRITICAL').length;

    const thresholdBreaches = wsComplianceData?.thresholdBreaches ?? 
                             dashboardSummary?.threshold_breaches ?? 0;

    return {
      complianceScore: score,
      activeAlerts,
      criticalAlerts,
      thresholdBreaches,
      totalAudits: complianceStatus?.total_audits ?? dashboardSummary?.total_audits_30_days ?? 0,
      scoreTrend: dashboardSummary?.score_trend ?? 'stable',
      scoreChange: dashboardSummary?.score_change ?? 0
    };
  }, [complianceStatus, dashboardSummary, wsComplianceData, allAlerts]);

  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-yellow-600';
    if (score >= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBackgroundColor = (score: number) => {
    if (score >= 95) return 'bg-green-50';
    if (score >= 85) return 'bg-yellow-50';
    if (score >= 70) return 'bg-orange-50';
    return 'bg-red-50';
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'MEDIUM':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId, 'Acknowledged from dashboard');
      // Alert will be updated via WebSocket
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading compliance data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2" 
              onClick={handleRefresh}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isConnected 
              ? 'bg-green-50 text-green-700' 
              : isConnecting 
              ? 'bg-yellow-50 text-yellow-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                Live Monitoring
              </>
            ) : isConnecting ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Disconnected
              </>
            )}
          </div>
          {connectionError && (
            <span className="text-xs text-red-600">{connectionError}</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={reconnect}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      {summaryMetrics && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className={getScoreBackgroundColor(summaryMetrics.complianceScore)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">Compliance Score</div>
                  <div className={`text-2xl font-bold ${getScoreColor(summaryMetrics.complianceScore)}`}>
                    {summaryMetrics.complianceScore.toFixed(1)}%
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {getTrendIcon(summaryMetrics.scoreTrend)}
                  <span className="text-xs text-gray-600">
                    {summaryMetrics.scoreChange > 0 ? '+' : ''}{summaryMetrics.scoreChange.toFixed(1)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-red-600" />
                <div className="text-sm text-gray-600">Active Alerts</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {summaryMetrics.activeAlerts}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <div className="text-sm text-gray-600">Critical</div>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {summaryMetrics.criticalAlerts}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-600" />
                <div className="text-sm text-gray-600">Threshold Breaches</div>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {summaryMetrics.thresholdBreaches}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <div className="text-sm text-gray-600">Total Audits</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {summaryMetrics.totalAudits}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts ({allAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Status
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="thresholds" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Thresholds
          </TabsTrigger>
        </TabsList>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Real-time Compliance Alerts</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAcknowledged(!showAcknowledged)}
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                {showAcknowledged ? 'Hide' : 'Show'} Acknowledged
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {allAlerts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-gray-900">All Clear!</h3>
                  <p className="text-gray-600">No active compliance alerts at this time.</p>
                </CardContent>
              </Card>
            ) : (
              allAlerts.map((alert) => (
                <Card key={alert.id} className={`border-l-4 ${
                  alert.level === 'CRITICAL' ? 'border-l-red-500' :
                  alert.level === 'HIGH' ? 'border-l-orange-500' :
                  alert.level === 'MEDIUM' ? 'border-l-yellow-500' :
                  'border-l-blue-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.level)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getAlertColor(alert.level)}>
                              {alert.level}
                            </Badge>
                            {(alert as any).acknowledged && (
                              <Badge variant="outline" className="text-green-600">
                                Acknowledged
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                          <p className="text-gray-600 text-sm">{alert.message}</p>
                          {alert.count && (
                            <p className="text-xs text-gray-500 mt-1">
                              Count: {alert.count}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-right text-xs text-gray-500">
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                        {!(alert as any).acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-4">
          {complianceStatus && (
            <div className="grid gap-6">
              {/* Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Compliance Status Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(complianceStatus.status_breakdown).map(([status, count]) => (
                      <div key={status} className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{count}</div>
                        <div className="text-sm text-gray-600">{status.replace('_', ' ')}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Risk Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Risk Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Average Risk</div>
                      <div className="text-lg font-bold text-gray-900">
                        {complianceStatus.risk_analysis.average_risk.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">High Risk Items</div>
                      <div className="text-lg font-bold text-orange-600">
                        {complianceStatus.risk_analysis.high_risk_count}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Critical Risk Items</div>
                      <div className="text-lg font-bold text-red-600">
                        {complianceStatus.risk_analysis.critical_risk_count}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Max Risk Score</div>
                      <div className="text-lg font-bold text-gray-900">
                        {complianceStatus.risk_analysis.max_risk.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Remediation Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Remediation Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Completion Rate</span>
                      <span className="text-sm font-semibold">
                        {(complianceStatus.remediation_status.completion_rate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={complianceStatus.remediation_status.completion_rate * 100} 
                      className="h-2"
                    />
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-gray-900">
                          {complianceStatus.remediation_status.required}
                        </div>
                        <div className="text-xs text-gray-600">Required</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {complianceStatus.remediation_status.completed}
                        </div>
                        <div className="text-xs text-gray-600">Completed</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600">
                          {complianceStatus.remediation_status.overdue}
                        </div>
                        <div className="text-xs text-gray-600">Overdue</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Trends Tab - Placeholder for now */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Compliance trends chart will be implemented here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thresholds Tab */}
        <TabsContent value="thresholds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Threshold Breaches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {thresholdBreaches.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="text-gray-600">No threshold breaches detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {thresholdBreaches.map((breach, index) => (
                    <div key={index} className="p-3 border rounded-lg bg-orange-50">
                      <div className="font-semibold text-orange-800">{breach.title}</div>
                      <div className="text-sm text-orange-700">{breach.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComplianceMonitoringDashboard;