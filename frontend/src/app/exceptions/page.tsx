// app/exceptions/page.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Brain,
  Zap,
  Target,
  Shield,
  RefreshCw,
  Play,
  Settings,
  Download,
  Calendar,
  Users,
  Truck,
  DollarSign,
  BarChart3,
  Eye,
  Wrench,
  Bell,
  ThumbsUp,
  X,
} from "lucide-react";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import {
  useActiveExceptions,
  useExceptionPatterns,
  useAIInsights,
  useProactiveAlerts,
  useSystemPerformance,
  useExceptionDashboard,
  useExceptionAnalytics,
  useExceptionTimeline,
  useRealTimeMonitoring,
  useImpactAssessment,
  useResolveException,
  useImplementAction,
  useDismissAlert,
} from "@/shared/hooks/useProactiveExceptions";

export default function ExceptionsManagementDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d'>('24h');

  const { summary, exceptions, alerts, performance, isLoading: dashboardLoading } = useExceptionDashboard();
  const { analytics, isLoading: analyticsLoading } = useExceptionAnalytics();
  const { timeline, isLoading: timelineLoading } = useExceptionTimeline();
  const { monitoring, isLoading: monitoringLoading } = useRealTimeMonitoring();
  const { impact, isLoading: impactLoading } = useImpactAssessment();
  const { data: insights, isLoading: insightsLoading } = useAIInsights();

  const resolveException = useResolveException();
  const implementAction = useImplementAction();
  const dismissAlert = useDismissAlert();

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'resolving': return 'bg-blue-100 text-blue-800';
      case 'analyzing': return 'bg-purple-100 text-purple-800';
      case 'detected': return 'bg-orange-100 text-orange-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'urgent': return 'bg-orange-100 text-orange-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (dashboardLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading Exception Management Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Proactive Exception Management</h1>
            <p className="text-muted-foreground">
              AI-powered system monitoring and automatic issue resolution
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Configure</span>
            </Button>
          </div>
        </div>

        {/* System Status Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge className={`${monitoring?.systemStatus === 'normal' ? 'bg-green-100 text-green-800' : 
                  monitoring?.systemStatus === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  monitoring?.systemStatus === 'critical' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                  {monitoring?.systemStatus?.toUpperCase() || 'UNKNOWN'}
                </Badge>
                <span className="text-2xl font-bold">{monitoring?.healthScore || 0}%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {monitoring?.activeIncidents || 0} active incidents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Exceptions</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalActiveExceptions || 0}</div>
              <p className="text-xs text-muted-foreground">
                {summary?.criticalExceptions || 0} critical, {summary?.highPriorityExceptions || 0} high priority
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auto-Resolution Rate</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.resolutionRate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {summary?.autoResolvingExceptions || 0} auto-resolving now
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Savings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary?.monthlySavings || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {summary?.customerImpactPrevented || 0}% impact prevented
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="exceptions">Active Exceptions</TabsTrigger>
            <TabsTrigger value="alerts">Proactive Alerts</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Exception Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Exception Distribution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics && (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(analytics.exceptionsByType).map(([type, count]) => ({
                            name: type.replace('_', ' '),
                            value: count,
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(analytics.exceptionsByType).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Impact Assessment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Impact Assessment</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Financial Impact</span>
                      <span className="text-lg font-bold text-red-600">
                        {formatCurrency(impact?.totalFinancialImpact || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Delay Hours</span>
                      <span className="text-lg font-bold">{impact?.totalDelayHours || 0}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Affected Customers</span>
                      <span className="text-lg font-bold">{impact?.affectedCustomers || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Affected Shipments</span>
                      <span className="text-lg font-bold">{impact?.affectedShipments || 0}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Compliance Risk</span>
                        <Badge className={impact?.complianceRisk && impact.complianceRisk > 70 ? 'bg-red-100 text-red-800' :
                          impact?.complianceRisk && impact.complianceRisk > 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                          {impact?.complianceRisk || 0}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>System Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {performance?.exceptionsResolved || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Exceptions Resolved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {performance?.averageResolutionTime || 0}m
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Resolution Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {performance?.preventionSuccessRate || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Prevention Success</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      +{performance?.customerSatisfactionImprovement || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Satisfaction Points</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exceptions" className="space-y-4">
            <div className="grid gap-4">
              {exceptions?.map((exception) => (
                <Card key={exception.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge className={getSeverityColor(exception.severity)}>
                          {exception.severity.toUpperCase()}
                        </Badge>
                        <Badge className={getStatusColor(exception.status)}>
                          {exception.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{exception.estimatedResolutionTime}m estimated</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{exception.confidence}% confidence</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveException.mutate({
                            exceptionId: exception.id,
                            resolutionMethod: 'manual',
                            notes: 'Resolved via dashboard'
                          })}
                          disabled={resolveException.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg">{exception.title}</h3>
                        <p className="text-muted-foreground">{exception.description}</p>
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h4 className="font-medium mb-2">Impact Assessment</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Financial Impact:</span>
                              <span className="font-medium">{formatCurrency(exception.predictedImpact.financialImpact)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Delay Hours:</span>
                              <span className="font-medium">{exception.predictedImpact.deliveryDelayHours}h</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Affected Shipments:</span>
                              <span className="font-medium">{exception.predictedImpact.affectedShipments}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Details</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Shipment:</span>
                              <span className="font-medium">{exception.shipmentId}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Customer:</span>
                              <span className="font-medium">{exception.customerId}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Detected:</span>
                              <span className="font-medium">
                                {new Date(exception.detectedAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Root Cause</h4>
                        <p className="text-sm text-muted-foreground">{exception.rootCause}</p>
                      </div>

                      {exception.suggestedActions.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Suggested Actions</h4>
                          <div className="space-y-2">
                            {exception.suggestedActions.slice(0, 3).map((action) => (
                              <div key={action.id} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{action.action}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {action.estimatedEffectiveness}% effectiveness • {formatCurrency(action.estimatedCost)} cost
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => implementAction.mutate({
                                    exceptionId: exception.id,
                                    actionId: action.id,
                                    autoImplement: action.automationPossible
                                  })}
                                  disabled={implementAction.isPending}
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  {action.automationPossible ? 'Auto' : 'Manual'}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {exception.autoResolutionAttempts.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Auto-Resolution Attempts</h4>
                          <div className="space-y-1">
                            {exception.autoResolutionAttempts.map((attempt) => (
                              <div key={attempt.id} className="flex items-center space-x-2 text-sm">
                                <Badge className={attempt.result === 'success' ? 'bg-green-100 text-green-800' :
                                  attempt.result === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                                  {attempt.result}
                                </Badge>
                                <span>{attempt.action}</span>
                                <span className="text-muted-foreground">({attempt.impactReduction}% impact reduction)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="grid gap-4">
              {alerts?.map((alert) => (
                <Card key={alert.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge className={getUrgencyColor(alert.urgency)}>
                          {alert.urgency.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{alert.type.replace('_', ' ')}</Badge>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{Math.floor(alert.timeToAct / 60)}h {alert.timeToAct % 60}m to act</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{alert.confidenceLevel}% confidence</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => dismissAlert.mutate(alert.id)}
                          disabled={dismissAlert.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Potential savings: {formatCurrency(alert.potentialSavings)}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Affected Shipments</h4>
                        <div className="flex flex-wrap gap-1">
                          {alert.affectedShipments.map((shipmentId) => (
                            <Badge key={shipmentId} variant="outline">{shipmentId}</Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Recommended Actions</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {alert.recommendedActions.map((action, index) => (
                            <li key={index}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="grid gap-4">
              {insights?.map((insight, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge className={insight.category === 'pattern' ? 'bg-blue-100 text-blue-800' :
                          insight.category === 'prediction' ? 'bg-purple-100 text-purple-800' :
                          insight.category === 'optimization' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                          {insight.category.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{insight.timeframe.replace('_', ' ')}</Badge>
                        <div className="flex items-center space-x-1">
                          <Brain className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">{insight.confidence}% confidence</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(insight.estimatedValue)}
                        </span>
                        {insight.actionable && (
                          <Button size="sm">
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            Implement
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg">{insight.title}</h3>
                        <p className="text-muted-foreground">{insight.description}</p>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span>Implementation Complexity:</span>
                        <Badge className={insight.implementationComplexity === 'low' ? 'bg-green-100 text-green-800' :
                          insight.implementationComplexity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                          {insight.implementationComplexity.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Exception Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics && (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={Object.entries(analytics.exceptionsBySeverity).map(([severity, count]) => ({
                        severity,
                        count,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="severity" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resolution Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {analytics?.averageResolutionTime || 0}m
                      </div>
                      <div className="text-sm text-muted-foreground">Average Resolution Time</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {formatCurrency(analytics?.totalFinancialImpact || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Financial Impact</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {analytics?.autoResolutionSuccess || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Auto-Resolution Successes</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Exception Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timeline?.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 border-l-2 border-gray-200 pl-4">
                      <div className="flex-shrink-0">
                        <Badge className={getSeverityColor(item.severity)}>
                          {item.severity}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(item.timestamp).toLocaleString()} • 
                          {item.autoResolutionAttempts} auto attempts • 
                          ETA: {new Date(item.estimatedResolution).toLocaleString()}
                        </div>
                      </div>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
}