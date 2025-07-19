"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { MobileNavWrapper } from "@/shared/components/layout/mobile-bottom-nav";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import { useAccessibility } from "@/shared/services/AccessibilityContext";
import { useTheme } from "@/shared/services/ThemeContext";
import { usePerformanceMonitoring } from "@/shared/utils/performance";
import {
  ShipmentTrendsChart,
  FleetUtilizationChart,
  ComplianceRadarChart,
  IncidentDistributionChart,
  RoutePerformanceChart,
  RealTimeMetricsChart,
  KPIGrid,
  DemurrageRevenueChart,
} from "@/components/charts/ChartComponents";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  Shield,
  AlertTriangle,
  Clock,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  PieChart,
  Activity,
  Target,
  Zap,
  Eye,
  FileText,
  Settings,
  Maximize2,
  Database,
  Search,
  Users,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Plus,
  Minus,
  Share2,
  Layout,
  Grid,
  BarChart,
  LineChart,
  Bookmark,
  Bell,
} from "lucide-react";
import { ExportDialog } from "@/shared/components/ui/export-dialog";
import { toast } from "react-hot-toast";

export default function AnalyticsPage() {
  const { loadTime } = usePerformanceMonitoring('AnalyticsPage');
  const { preferences } = useAccessibility();
  const { isDark } = useTheme();
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [selectedView, setSelectedView] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);

  // Time range options
  const timeRanges = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' },
  ];

  // Chart view options
  const chartViews = [
    { value: 'overview', label: 'Overview', icon: Layout },
    { value: 'performance', label: 'Performance', icon: TrendingUp },
    { value: 'compliance', label: 'Compliance', icon: Shield },
    { value: 'incidents', label: 'Incidents', icon: AlertTriangle },
    { value: 'realtime', label: 'Real-time', icon: Activity },
  ];

  const handleExportComplete = (success: boolean, message: string) => {
    if (success) {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const handleRefreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <AuthGuard>
      <MobileNavWrapper>
        <div className="space-y-6 p-4 lg:p-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600">
                Advanced insights and performance metrics for dangerous goods logistics
                {loadTime && (
                  <span className="ml-2 text-xs text-gray-400">
                    (Loaded in {loadTime.toFixed(0)}ms)
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger className="w-40">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRanges.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <ExportDialog 
                timeRange={selectedTimeRange} 
                onExportComplete={handleExportComplete}
              >
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </ExportDialog>
              
              <Button variant="outline" size="sm" onClick={handleRefreshData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Alert Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Real-time Analytics Available
                </p>
                <p className="text-sm text-blue-700">
                  Your dashboard is now connected to live data streams. Charts update automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Key Performance Indicators */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Key Performance Indicators</h2>
              <Button variant="outline" size="sm">
                <Target className="h-4 w-4 mr-2" />
                Set Targets
              </Button>
            </div>
            <KPIGrid />
          </div>

          {/* Charts Dashboard */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Analytics Dashboard</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save View
                </Button>
                <Button variant="outline" size="sm">
                  <Bell className="h-4 w-4 mr-2" />
                  Alerts
                </Button>
              </div>
            </div>

            <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
                {chartViews.map((view) => {
                  const Icon = view.icon;
                  return (
                    <TabsTrigger key={view.value} value={view.value} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{view.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ShipmentTrendsChart />
                  <FleetUtilizationChart />
                  <DemurrageRevenueChart />
                  <RoutePerformanceChart />
                  <IncidentDistributionChart />
                </div>
              </TabsContent>

              {/* Performance Tab */}
              <TabsContent value="performance" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <FleetUtilizationChart />
                  <RoutePerformanceChart />
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Performance Trends
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Overall Performance</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Excellent
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">94.2%</div>
                            <div className="text-sm text-gray-600">On-time Delivery</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">87.3%</div>
                            <div className="text-sm text-gray-600">Fleet Utilization</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">1.2h</div>
                            <div className="text-sm text-gray-600">Avg Response</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Compliance Tab */}
              <TabsContent value="compliance" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ComplianceRadarChart />
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Compliance Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Overall Compliance</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            91.0%
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          {[
                            { name: 'DG Classification', score: 95 },
                            { name: 'Documentation', score: 92 },
                            { name: 'Packaging', score: 88 },
                            { name: 'Labeling', score: 94 },
                            { name: 'Training', score: 90 },
                          ].map((item) => (
                            <div key={item.name} className="flex items-center justify-between">
                              <span className="text-sm">{item.name}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${item.score}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{item.score}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Incidents Tab */}
              <TabsContent value="incidents" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <IncidentDistributionChart />
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Recent Incidents
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { type: 'Minor Leak', severity: 'Low', time: '2 hours ago', status: 'Resolved' },
                          { type: 'Documentation', severity: 'Medium', time: '1 day ago', status: 'In Progress' },
                          { type: 'Equipment Failure', severity: 'Medium', time: '3 days ago', status: 'Resolved' },
                          { type: 'Spill', severity: 'High', time: '1 week ago', status: 'Resolved' },
                        ].map((incident, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium">{incident.type}</div>
                              <div className="text-sm text-gray-600">{incident.time}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={
                                  incident.severity === 'High' ? 'bg-red-50 text-red-700' :
                                  incident.severity === 'Medium' ? 'bg-yellow-50 text-yellow-700' :
                                  'bg-green-50 text-green-700'
                                }
                              >
                                {incident.severity}
                              </Badge>
                              <Badge variant="outline">
                                {incident.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Real-time Tab */}
              <TabsContent value="realtime" className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <RealTimeMetricsChart />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Live Fleet Status
                          <div className="ml-auto flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-sm text-green-600">Live</span>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-2xl font-bold text-green-600">156</div>
                              <div className="text-sm text-gray-600">Active</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-yellow-600">23</div>
                              <div className="text-sm text-gray-600">Maintenance</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-gray-600">12</div>
                              <div className="text-sm text-gray-600">Offline</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Shipment Status
                          <div className="ml-auto flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-sm text-blue-600">Updating</span>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                              <div className="text-2xl font-bold text-blue-600">234</div>
                              <div className="text-sm text-gray-600">In Transit</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-green-600">89</div>
                              <div className="text-sm text-gray-600">Delivered</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </MobileNavWrapper>
    </AuthGuard>
  );
}