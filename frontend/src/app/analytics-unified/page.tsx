"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Progress } from "@/shared/components/ui/progress";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import { usePermissions } from "@/contexts/PermissionContext";

// Chart components
import {
  ShipmentTrendsChart,
  FleetUtilizationChart,
  ComplianceRadarChart,
  IncidentDistributionChart,
  RoutePerformanceChart,
  RealTimeMetricsChart,
  KPIGrid,
  DemurrageRevenueChart,
} from "@/shared/components/charts/ChartComponents";

// Icons
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
  Database,
  Search,
  Users,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Bookmark,
  Bell,
  Brain,
  Lightbulb,
  DollarSign,
  LineChart,
  FileCheck,
  MessageSquare,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Star,
  Layout,
} from "lucide-react";

// Hooks
import {
  useDashboardStats,
  useInspectionStats,
  useRecentActivity,
  usePODStats,
  useRecentShipments
} from "@/shared/hooks/useDashboard";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useTheme } from "@/contexts/ThemeContext";
import { usePerformanceMonitoring } from "@/shared/utils/performance";
import { ExportDialog } from "@/shared/components/ui/export-dialog";
import { toast } from "react-hot-toast";

// Mock data for AI insights (for advanced users)
const mockInsights = [
  {
    id: "1",
    type: "predictive",
    title: "Shipment Volume Forecast",
    description: "Expected 15% increase in shipment volume next quarter based on seasonal trends and market analysis",
    confidence: 87,
    impact: "high",
    category: "operational",
    timeframe: "next_quarter",
    actionItems: [
      "Prepare additional fleet capacity",
      "Optimize warehouse space allocation",
      "Review staffing requirements"
    ],
    metrics: {
      current: 1250,
      predicted: 1438,
      variance: 188
    },
    lastUpdated: "2024-01-15T10:30:00Z"
  },
  {
    id: "2",
    type: "optimization",
    title: "Cost Reduction Opportunity",
    description: "Consolidating DG shipments to Eastern region could reduce costs by $45K annually",
    confidence: 78,
    impact: "high",
    category: "financial",
    timeframe: "next_month",
    actionItems: [
      "Analyze customer delivery requirements",
      "Negotiate consolidated shipping rates",
      "Implement route consolidation pilot"
    ],
    metrics: {
      current: 180000,
      optimized: 135000,
      savings: 45000
    },
    lastUpdated: "2024-01-15T08:45:00Z"
  }
];

const mockTrends = [
  {
    id: "1",
    title: "Dangerous Goods Volume",
    value: 15234,
    change: 12.3,
    trend: "up",
    period: "month",
    category: "volume"
  },
  {
    id: "2",
    title: "Average Delivery Time",
    value: 2.8,
    change: -5.2,
    trend: "down",
    period: "week",
    category: "performance"
  },
  {
    id: "3",
    title: "Fleet Utilization",
    value: 87.5,
    change: 3.1,
    trend: "up",
    period: "month",
    category: "efficiency"
  },
  {
    id: "4",
    title: "Compliance Score",
    value: 94.2,
    change: 1.8,
    trend: "up",
    period: "quarter",
    category: "compliance"
  }
];

export default function UnifiedAnalyticsPage() {
  const { can, hasAnyRole, canViewAnalytics } = usePermissions();
  const { loadTime } = usePerformanceMonitoring('UnifiedAnalyticsPage');
  const { preferences } = useAccessibility();
  const { isDark } = useTheme();

  // State management
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [selectedView, setSelectedView] = useState('overview');
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  // Data hooks
  const { data: stats, error: statsError, isLoading: statsLoading } = useDashboardStats();
  const { data: inspectionStats, isLoading: inspectionLoading } = useInspectionStats();
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity(5);
  const { data: podStats, isLoading: podLoading } = usePODStats();
  const { data: recentShipments, isLoading: shipmentsLoading } = useRecentShipments(5);

  // Get available tabs based on permissions
  const getAvailableTabs = () => {
    const tabs = [];
    
    // Dashboard - always available
    tabs.push({ value: 'dashboard', label: 'Dashboard', icon: Layout });
    
    // Performance analytics - for operators and above
    if (can('analytics.operational')) {
      tabs.push({ value: 'performance', label: 'Performance', icon: TrendingUp });
    }
    
    // Compliance - for managers and above
    if (can('analytics.insights') || hasAnyRole(['manager', 'admin'])) {
      tabs.push({ value: 'compliance', label: 'Compliance', icon: Shield });
    }
    
    // Incidents - for operators and above
    if (can('analytics.operational')) {
      tabs.push({ value: 'incidents', label: 'Incidents', icon: AlertTriangle });
    }
    
    // Real-time - for all authenticated users
    tabs.push({ value: 'realtime', label: 'Real-time', icon: Activity });
    
    // AI Insights - only for users with analytics insights access
    if (can('analytics.full.access') || can('analytics.insights')) {
      tabs.push({ value: 'insights', label: 'AI Insights', icon: Brain });
    }

    return tabs;
  };

  // Event handlers
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

  // Utility functions
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "predictive":
        return <Brain className="h-4 w-4 text-purple-600" />;
      case "anomaly":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "optimization":
        return <Target className="h-4 w-4 text-blue-600" />;
      case "compliance":
        return <Shield className="h-4 w-4 text-green-600" />;
      case "trend":
        return <TrendingUp className="h-4 w-4 text-orange-600" />;
      default:
        return <Lightbulb className="h-4 w-4 text-gray-600" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-red-50 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // Stats cards data
  const statCardsData = [
    {
      id: "1",
      title: "Total Shipments",
      value: stats?.totalShipments?.toLocaleString() || "0",
      description: "Active shipments in transit",
      change: stats?.trends?.shipments_change || "+0%",
      trend: (stats?.trends?.shipments_change?.startsWith('+') ? "up" : "down") as "up" | "down",
      icon: Truck,
      color: "rgba(21, 63, 159, 0.08)",
      borderColor: "#153F9F",
    },
    {
      id: "2",
      title: "Pending Reviews",
      value: stats?.pendingReviews?.toString() || "0",
      description: "Documents requiring approval",
      change: "-8.2%",
      trend: "down" as const,
      icon: FileText,
      color: "rgba(255, 159, 67, 0.08)",
      borderColor: "#FF9F43",
    },
    {
      id: "3",
      title: "Compliance Rate",
      value: `${stats?.complianceRate || 0}%`,
      description: "Safety compliance score",
      change: stats?.trends?.compliance_trend || "+0%",
      trend: (stats?.trends?.compliance_trend?.startsWith('+') ? "up" : "down") as "up" | "down",
      icon: Shield,
      color: "rgba(234, 84, 85, 0.08)",
      borderColor: "#EA5455",
    },
    {
      id: "4",
      title: "Active Routes",
      value: stats?.activeRoutes?.toString() || "0",
      description: "Currently operating routes",
      change: stats?.trends?.routes_change || "+0%",
      trend: (stats?.trends?.routes_change?.startsWith('+') ? "up" : "down") as "up" | "down",
      icon: MapPin,
      color: "rgba(0, 207, 232, 0.08)",
      borderColor: "#00CFE8",
    },
  ];

  // Filtered insights for AI tab
  const filteredInsights = mockInsights.filter(insight => {
    const matchesSearch = insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         insight.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || insight.type === filterType;
    return matchesSearch && matchesType;
  });

  if (statsError) {
    console.warn("Dashboard error:", statsError);
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6 p-4 lg:p-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {can('customer.portal.view') ? "Customer Dashboard" :
                 can('driver.operations.view') ? "Driver Dashboard" :
                 can('audits.view') ? "Compliance Analytics" :
                 "Analytics Dashboard"}
              </h1>
              <p className="text-gray-600">
                {can('customer.portal.view') ? "Track your shipments and view delivery status" :
                 can('driver.operations.view') ? "Your assigned routes and vehicle status" :
                 can('audits.view') ? "Compliance monitoring and audit reports" :
                 "Advanced insights and performance metrics for dangerous goods logistics"}
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
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                </SelectContent>
              </Select>
              
              {can('analytics.operational') && (
                <ExportDialog 
                  timeRange={selectedTimeRange} 
                  onExportComplete={handleExportComplete}
                >
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </ExportDialog>
              )}
              
              <Button variant="outline" size="sm" onClick={handleRefreshData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Company Header - for operational dashboard */}
          {selectedView === 'dashboard' && can('analytics.operational') && (
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">OutbackHaul Transport Operations</h2>
                  <p className="text-blue-100 mt-1">
                    Road Train & Dangerous Goods Specialist • Perth, WA • 40 Trucks • Established 1987
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-blue-100">Fleet Status</div>
                  <div className="text-xl font-bold">
                    {Math.round((stats?.activeRoutes || 23) / 40 * 100)}% Active
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards - role-based visibility */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCardsData.map((card, index) => {
              const Icon = card.icon;
              
              // Role-based filtering
              if (can('customer.portal.view') && !['Total Shipments'].includes(card.title)) return null;
              if (can('driver.operations.view') && !['Total Shipments', 'Active Routes'].includes(card.title)) return null;
              
              return (
                <Card
                  key={card.id}
                  className={index === 0 ? "border-b-4" : ""}
                  style={index === 0 ? { borderBottomColor: card.borderColor } : {}}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: card.color }}
                      >
                        <Icon className="w-6 h-6" color={card.borderColor} />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {card.value}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-600 text-sm">{card.description}</p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            card.trend === "up" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {card.change}
                        </span>
                        <span className="text-gray-500 text-xs">this month</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Key Performance Indicators - for managers and above */}
          {can('analytics.advanced.view') && (
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
          )}

          {/* Main Tabbed Content */}
          <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-4">
            <TabsList className="grid w-full grid-cols-auto">
              {getAvailableTabs().map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              {/* Operational Stats Row - for supervisors and above */}
              {can('analytics.operational') && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Inspection Performance */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <CardTitle>Inspection Performance</CardTitle>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {inspectionStats?.pass_rate || 0}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {inspectionLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Pass Rate</span>
                            <span className="font-bold text-green-600">{inspectionStats?.pass_rate || 0}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Completed Today</span>
                            <span className="font-medium">{inspectionStats?.completed_today || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Failed Inspections</span>
                            <span className="font-medium text-red-600">{inspectionStats?.failed_count || 0}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${inspectionStats?.pass_rate || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Communication Activity */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-blue-600" />
                          <CardTitle>Communication Activity</CardTitle>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {recentActivity?.unread_count ? `${recentActivity.unread_count} New` : 'Live'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {activityLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {recentActivity?.events?.slice(0, 3).map((event, index) => (
                            <div key={event.id} className={`flex items-center gap-3 ${index < 2 ? 'pb-2 border-b' : ''}`}>
                              <div className={`w-2 h-2 rounded-full ${
                                event.priority === 'HIGH' ? 'bg-red-500' : 
                                event.priority === 'MEDIUM' ? 'bg-yellow-500' : 
                                'bg-green-500'
                              }`}></div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{event.title}</p>
                                <p className="text-xs text-gray-500">
                                  {event.shipment_identifier} • {new Date(event.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          )) || []}
                          {!recentActivity?.events?.length && (
                            <div className="text-center py-4 text-gray-500">
                              <p className="text-sm">No recent activity</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Proof of Delivery Stats */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-5 w-5 text-purple-600" />
                          <CardTitle>Proof of Delivery</CardTitle>
                        </div>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                          {podStats?.capture_rate || 0}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {podLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Capture Rate</span>
                            <span className="font-bold text-purple-600">{podStats?.capture_rate || 0}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Digital Signatures</span>
                            <span className="font-medium">{podStats?.digital_signatures || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Photos Captured</span>
                            <span className="font-medium">{podStats?.photos_captured || 0}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${podStats?.capture_rate || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Shipments Table - visible to all roles */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {can('customer.portal.view') ? "Your Shipments" : "Shipments in Transit"}
                    </CardTitle>
                    {can('analytics.operational') && (
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {[
                            "Identifier",
                            "Origin",
                            "Destination",
                            ...(can('analytics.operational') ? ["Dangerous Goods", "Hazchem Code"] : []),
                            "Progress",
                            "Actions",
                          ].map((header) => (
                            <th
                              key={header}
                              className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {shipmentsLoading ? (
                          <tr>
                            <td colSpan={can('analytics.operational') ? 7 : 5} className="px-6 py-8 text-center">
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              </div>
                            </td>
                          </tr>
                        ) : recentShipments?.shipments?.length ? (
                          recentShipments.shipments.map((shipment) => (
                            <tr key={shipment.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                    <Truck className="w-5 h-5 text-gray-600" />
                                  </div>
                                  <span className="font-semibold text-gray-900">
                                    {shipment.identifier}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                                {shipment.origin}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                                {shipment.destination}
                              </td>
                              {can('analytics.operational') && (
                                <>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex -space-x-2">
                                      {shipment.dangerous_goods?.slice(0, 3).map((dg, index) => (
                                        <Badge
                                          key={index}
                                          variant="secondary"
                                          className="w-8 h-8 rounded-full p-0 text-xs border-2 border-white"
                                          title={dg}
                                        >
                                          DG
                                        </Badge>
                                      ))}
                                      {(shipment.dangerous_goods?.length || 0) > 3 && (
                                        <Badge
                                          variant="outline"
                                          className="w-8 h-8 rounded-full p-0 text-xs border-2 border-white"
                                        >
                                          +{(shipment.dangerous_goods?.length || 0) - 3}
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                                    {shipment.hazchem_code}
                                  </td>
                                </>
                              )}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <Progress value={shipment.progress} className="flex-1" />
                                  <span className="text-sm text-gray-600 w-12">
                                    {shipment.progress}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="icon">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon">
                                    <MapPin className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={can('analytics.operational') ? 7 : 5} className="px-6 py-8 text-center text-gray-500">
                              No recent shipments found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Tab - for supervisors and above */}
            {can('analytics.operational') && (
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
            )}

            {/* Compliance Tab - for managers and above, or auditors */}
            {(can('analytics.advanced.view') || can('audits.view')) && (
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
            )}

            {/* Incidents Tab - for supervisors and above */}
            {can('analytics.operational') && (
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
            )}

            {/* Real-time Tab - for all authenticated users */}
            <TabsContent value="realtime" className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <RealTimeMetricsChart />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        {can('driver.operations.view') ? "Your Vehicle Status" : "Live Fleet Status"}
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
                            <div className="text-2xl font-bold text-green-600">
                              {can('driver.operations.view') ? "1" : "156"}
                            </div>
                            <div className="text-sm text-gray-600">Active</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-yellow-600">
                              {can('driver.operations.view') ? "0" : "23"}
                            </div>
                            <div className="text-sm text-gray-600">Maintenance</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-gray-600">
                              {can('driver.operations.view') ? "0" : "12"}
                            </div>
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
                        {can('customer.portal.view') ? "Your Shipments" : 
                         can('driver.operations.view') ? "Assigned Shipments" : "Shipment Status"}
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
                            <div className="text-2xl font-bold text-blue-600">
                              {can('driver.operations.view') ? "3" : "234"}
                            </div>
                            <div className="text-sm text-gray-600">In Transit</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              {can('driver.operations.view') ? "12" : "89"}
                            </div>
                            <div className="text-sm text-gray-600">Delivered</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* AI Insights Tab - only for admins and managers */}
            {(can('analytics.full.access') || can('analytics.insights')) && (
              <TabsContent value="insights" className="space-y-6">
                {/* AI Status Banner */}
                <Alert>
                  <Brain className="h-4 w-4" />
                  <AlertDescription>
                    AI analysis is active. Last update: {new Date().toLocaleTimeString()}
                    <Button variant="link" size="sm" className="ml-2 p-0 h-auto">
                      View AI model details
                    </Button>
                  </AlertDescription>
                </Alert>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {mockTrends.map((trend) => (
                    <Card key={trend.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">{trend.title}</div>
                          <div className={`flex items-center gap-1 text-xs ${
                            trend.trend === 'up' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {trend.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(trend.change)}%
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">
                          {trend.category === 'volume' ? trend.value.toLocaleString() : 
                           trend.category === 'performance' ? `${trend.value} days` :
                           `${trend.value}%`}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">vs last {trend.period}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search insights..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="predictive">Predictive</SelectItem>
                      <SelectItem value="anomaly">Anomaly</SelectItem>
                      <SelectItem value="optimization">Optimization</SelectItem>
                      <SelectItem value="compliance">Compliance</SelectItem>
                      <SelectItem value="trend">Trend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Insights List */}
                <div className="space-y-4">
                  {filteredInsights.map((insight) => (
                    <Card key={insight.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getTypeIcon(insight.type)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{insight.title}</h3>
                                <Badge className={getImpactColor(insight.impact)}>
                                  {insight.impact} impact
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>Confidence: {insight.confidence}%</span>
                                <span>Category: {insight.category}</span>
                                <span>Timeframe: {insight.timeframe.replace('_', ' ')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right text-sm">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-green-600">{insight.confidence}%</span>
                              </div>
                              <div className="text-xs text-gray-500">confidence</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <div className="text-sm font-medium mb-2">Confidence Score</div>
                          <Progress value={insight.confidence} className="h-2" />
                        </div>
                        
                        <div className="mt-4">
                          <div className="text-sm font-medium mb-2">Recommended Actions</div>
                          <div className="space-y-1">
                            {insight.actionItems.slice(0, 2).map((action, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                <span>{action}</span>
                              </div>
                            ))}
                            {insight.actionItems.length > 2 && (
                              <div className="text-sm text-gray-500">
                                +{insight.actionItems.length - 2} more actions
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}