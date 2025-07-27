"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Download, 
  Calendar,
  Fuel,
  MapPin,
  Clock,
  DollarSign,
  Truck,
  Shield,
  AlertTriangle,
  Activity,
  Target
} from "lucide-react";
import { usePermissions, Can, HasRole } from "@/contexts/PermissionContext";
import { useMockFleetStatus } from "@/shared/hooks/useMockAPI";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";

export default function AnalyticsPage() {
  const { can, userRole } = usePermissions();
  const { data: fleetData } = useMockFleetStatus();
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedMetric, setSelectedMetric] = useState("utilization");

  const vehicles = fleetData?.vehicles || [];

  // Mock analytics data based on user role
  const getAnalyticsData = () => {
    const baseData = {
      utilization: {
        current: 78.5,
        change: 5.2,
        trend: "up"
      },
      fuelEfficiency: {
        current: 8.4,
        change: -0.3,
        trend: "down"
      },
      onTimeDelivery: {
        current: 94.2,
        change: 2.1,
        trend: "up"
      },
      maintenance: {
        current: 12500,
        change: -850,
        trend: "down"
      }
    };

    // Advanced metrics only for managers and admins
    if (can("fleet.analytics.advanced")) {
      return {
        ...baseData,
        operatingCost: {
          current: 2.45,
          change: 0.12,
          trend: "up"
        },
        profitability: {
          current: 18.7,
          change: 3.2,
          trend: "up"
        },
        riskScore: {
          current: 2.1,
          change: -0.4,
          trend: "down"
        }
      };
    }

    return baseData;
  };

  const analyticsData = getAnalyticsData();

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case "utilization":
        return <Activity className="h-4 w-4" />;
      case "fuelEfficiency":
        return <Fuel className="h-4 w-4" />;
      case "onTimeDelivery":
        return <Clock className="h-4 w-4" />;
      case "maintenance":
        return <DollarSign className="h-4 w-4" />;
      case "operatingCost":
        return <DollarSign className="h-4 w-4" />;
      case "profitability":
        return <TrendingUp className="h-4 w-4" />;
      case "riskScore":
        return <Shield className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getMetricColor = (trend: string) => {
    return trend === "up" ? "text-green-600" : "text-red-600";
  };

  const getTrendIcon = (trend: string) => {
    return trend === "up" ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const formatMetricValue = (key: string, value: number) => {
    switch (key) {
      case "utilization":
      case "onTimeDelivery":
      case "profitability":
        return `${value}%`;
      case "fuelEfficiency":
        return `${value} km/L`;
      case "maintenance":
        return `$${value.toLocaleString()}`;
      case "operatingCost":
        return `$${value}/km`;
      case "riskScore":
        return `${value}/10`;
      default:
        return value.toString();
    }
  };

  const getMetricLabel = (key: string) => {
    switch (key) {
      case "utilization":
        return "Fleet Utilization";
      case "fuelEfficiency":
        return "Fuel Efficiency";
      case "onTimeDelivery":
        return "On-Time Delivery";
      case "maintenance":
        return "Maintenance Cost";
      case "operatingCost":
        return "Operating Cost";
      case "profitability":
        return "Profit Margin";
      case "riskScore":
        return "Risk Score";
      default:
        return key;
    }
  };

  const getComplianceMetrics = () => {
    if (!can("fleet.compliance.view")) return null;

    return {
      overallCompliance: 85.3,
      adrCompliance: 92.1,
      equipmentCompliance: 78.6,
      inspectionCompliance: 89.4
    };
  };

  const complianceMetrics = getComplianceMetrics();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Fleet Analytics</h1>
                <p className="text-blue-100 mt-1">
                  {can("fleet.analytics.advanced") 
                    ? "Advanced performance insights and business intelligence"
                    : "Essential fleet performance metrics"
                  }
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Can permission="fleet.analytics.export">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </Can>
          </div>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Object.entries(analyticsData).map(([key, data]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                {getMetricIcon(key)}
                {getMetricLabel(key)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {formatMetricValue(key, data.current)}
                </div>
                <div className="flex items-center gap-1">
                  {getTrendIcon(data.trend)}
                  <span className={`text-sm font-medium ${getMetricColor(data.trend)}`}>
                    {Math.abs(data.change)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                vs previous {timeRange === "7d" ? "week" : timeRange === "30d" ? "month" : "period"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <HasRole role={["manager", "admin"]}>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </HasRole>
          <HasRole role={["manager", "admin"]}>
            <TabsTrigger value="predictive">Predictive</TabsTrigger>
          </HasRole>
        </TabsList>

        {/* Performance Analytics */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Vehicle Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active Vehicles</span>
                    <span className="font-medium">
                      {vehicles.filter(v => v.status === "ACTIVE" || v.status === "IN_TRANSIT").length} / {vehicles.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full"
                      style={{
                        width: `${(vehicles.filter(v => v.status === "ACTIVE" || v.status === "IN_TRANSIT").length / vehicles.length) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="font-medium text-green-800">Avg. Daily Hours</div>
                      <div className="text-green-600">8.4</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="font-medium text-blue-800">Distance/Day</div>
                      <div className="text-blue-600">245 km</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fuel className="h-5 w-5" />
                  Fuel Efficiency Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-3xl font-bold text-center">8.4 km/L</div>
                  <div className="text-center text-sm text-gray-600">Fleet Average</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Best Performer</span>
                      <span className="font-medium text-green-600">9.2 km/L</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Needs Attention</span>
                      <span className="font-medium text-red-600">6.8 km/L</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="text-sm text-gray-600">Monthly Savings: <span className="font-medium text-green-600">$1,250</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Route Efficiency */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Route Efficiency Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">94.2%</div>
                  <div className="text-sm text-gray-600">On-Time Delivery</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">245 km</div>
                  <div className="text-sm text-gray-600">Avg. Daily Distance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">2.4 hrs</div>
                  <div className="text-sm text-gray-600">Avg. Delivery Time</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Analytics */}
        <TabsContent value="compliance">
          {complianceMetrics ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Overall Compliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {complianceMetrics.overallCompliance}%
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      ADR Compliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {complianceMetrics.adrCompliance}%
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Equipment Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {complianceMetrics.equipmentCompliance}%
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Inspections
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {complianceMetrics.inspectionCompliance}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Compliance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Vehicles with Active DG</span>
                      <span className="font-medium">{vehicles.filter(v => v.active_shipment?.has_dangerous_goods).length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Certificates Expiring (30 days)</span>
                      <span className="font-medium text-yellow-600">3</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Overdue Inspections</span>
                      <span className="font-medium text-red-600">1</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-600">
                  You don't have permission to view compliance analytics.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Financial Analytics - Manager/Admin Only */}
        <TabsContent value="financial">
          <HasRole role={["manager", "admin"]}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Operating Costs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-3xl font-bold">$2.45/km</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Fuel Costs</span>
                        <span>$1.20/km (49%)</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Maintenance</span>
                        <span>$0.65/km (27%)</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Driver Costs</span>
                        <span>$0.45/km (18%)</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Other</span>
                        <span>$0.15/km (6%)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Profitability Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-3xl font-bold text-green-600">18.7%</div>
                    <div className="text-sm text-gray-600">Net Profit Margin</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Revenue per km</span>
                        <span className="font-medium">$3.12</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Cost per km</span>
                        <span className="font-medium">$2.45</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Profit per km</span>
                        <span className="font-medium text-green-600">$0.67</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </HasRole>
        </TabsContent>

        {/* Predictive Analytics - Manager/Admin Only */}
        <TabsContent value="predictive">
          <HasRole role={["manager", "admin"]}>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Predictive Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium">Maintenance Alert</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Vehicle ABC-123 likely to need maintenance in 5-7 days based on usage patterns.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Fuel className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Fuel Optimization</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Route adjustments could save 12% fuel costs on delivery route A-B.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Risk Assessment</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Current fleet risk score: 2.1/10 (Low). All systems operating normally.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Demand Forecasting</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Advanced forecasting charts would be displayed here</p>
                    <p className="text-sm text-gray-500">Showing demand predictions, capacity planning, and seasonal trends</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </HasRole>
        </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}