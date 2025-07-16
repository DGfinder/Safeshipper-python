// app/reports/page.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Package,
  Truck,
  DollarSign,
  Users,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  FileText,
  PieChart,
  Activity,
} from "lucide-react";
import { useShipments } from "@/shared/hooks/useShipments";
import { AuthGuard } from "@/shared/components/common/auth-guard";

interface ReportMetrics {
  totalShipments: number;
  deliveredShipments: number;
  onTimeDeliveries: number;
  totalRevenue: number;
  averageDeliveryTime: number;
  customerSatisfaction: number;
  complianceRate: number;
  inspectionsPassed: number;
  inspectionsFailed: number;
  podCaptured: number;
  communicationEvents: number;
}

export default function ReportsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const { data: shipments, isLoading: shipmentsLoading } = useShipments();

  const handleRefresh = async () => {
    setRefreshing(true);
    // Add refresh logic here
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Mock metrics data - in production this would come from the backend
  const metrics: ReportMetrics = {
    totalShipments: 1847,
    deliveredShipments: 1689,
    onTimeDeliveries: 1521,
    totalRevenue: 3850000,
    averageDeliveryTime: 2.3,
    customerSatisfaction: 4.6,
    complianceRate: 94.2,
    inspectionsPassed: 1456,
    inspectionsFailed: 89,
    podCaptured: 1689,
    communicationEvents: 4832,
  };

  const deliveryRate = (
    (metrics.deliveredShipments / metrics.totalShipments) *
    100
  ).toFixed(1);
  const onTimeRate = (
    (metrics.onTimeDeliveries / metrics.deliveredShipments) *
    100
  ).toFixed(1);
  const inspectionPassRate = (
    (metrics.inspectionsPassed /
      (metrics.inspectionsPassed + metrics.inspectionsFailed)) *
    100
  ).toFixed(1);

  const reportCategories = [
    {
      title: "Operational Reports",
      reports: [
        {
          name: "Shipment Performance",
          description: "Delivery times, on-time rates, and status tracking",
        },
        {
          name: "Fleet Utilization",
          description: "Vehicle usage, driver hours, and route efficiency",
        },
        {
          name: "Customer Activity",
          description: "Shipment volumes, revenue, and satisfaction metrics",
        },
        {
          name: "Inspection Summary",
          description: "Safety checks, compliance rates, and violations",
        },
      ],
    },
    {
      title: "Compliance Reports",
      reports: [
        {
          name: "DG Compliance",
          description: "Dangerous goods handling and regulatory compliance",
        },
        {
          name: "Safety Inspections",
          description: "Pre/post-trip inspections and safety metrics",
        },
        {
          name: "Document Compliance",
          description: "Required documentation and certification status",
        },
        {
          name: "Audit Trail",
          description: "Complete activity logs and event tracking",
        },
      ],
    },
    {
      title: "Financial Reports",
      reports: [
        {
          name: "Revenue Analysis",
          description: "Income breakdown by customer, route, and service type",
        },
        {
          name: "Cost Analysis",
          description: "Operational costs, fuel consumption, and profitability",
        },
        {
          name: "Customer Billing",
          description: "Invoicing status, payment tracking, and receivables",
        },
        {
          name: "Profitability",
          description: "Margin analysis and performance by business segment",
        },
      ],
    },
  ];

  const recentReports = [
    {
      name: "Monthly Shipment Summary",
      date: "2024-01-15",
      type: "Operational",
      status: "Ready",
    },
    {
      name: "Q4 Compliance Report",
      date: "2024-01-10",
      type: "Compliance",
      status: "Processing",
    },
    {
      name: "Customer Revenue Analysis",
      date: "2024-01-08",
      type: "Financial",
      status: "Ready",
    },
    {
      name: "Fleet Performance Review",
      date: "2024-01-05",
      type: "Operational",
      status: "Ready",
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Reports & Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Comprehensive business intelligence and reporting
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 3 months</option>
                <option value="365">Last year</option>
              </select>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export All
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                +18.2% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Delivery Rate
              </CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {deliveryRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.deliveredShipments} of {metrics.totalShipments}{" "}
                shipments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                On-Time Performance
              </CardTitle>
              <Clock className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {onTimeRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                Avg: {metrics.averageDeliveryTime}h delivery time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Compliance Rate
              </CardTitle>
              <Shield className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {metrics.complianceRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                Safety & regulatory compliance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Inspection Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pass Rate</span>
                  <span className="font-bold text-green-600">
                    {inspectionPassRate}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Passed</span>
                  <span className="font-medium">
                    {metrics.inspectionsPassed}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Failed</span>
                  <span className="font-medium text-red-600">
                    {metrics.inspectionsFailed}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${inspectionPassRate}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Proof of Delivery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">POD Capture Rate</span>
                  <span className="font-bold text-blue-600">100%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Digital Signatures</span>
                  <span className="font-medium">{metrics.podCaptured}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Photos Captured</span>
                  <span className="font-medium">
                    {metrics.podCaptured * 2.3}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                Communication Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Events</span>
                  <span className="font-bold text-purple-600">
                    {metrics.communicationEvents}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Avg per Shipment</span>
                  <span className="font-medium">
                    {(
                      metrics.communicationEvents / metrics.totalShipments
                    ).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Response Time</span>
                  <span className="font-medium">2.3h avg</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Tabs */}
        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories">Report Categories</TabsTrigger>
            <TabsTrigger value="recent">Recent Reports</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {reportCategories.map((category) => (
                <Card key={category.title}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      {category.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {category.reports.map((report) => (
                        <div
                          key={report.name}
                          className="p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <h4 className="font-medium text-sm">{report.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {report.description}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Generate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              Schedule
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recent Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentReports.map((report, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{report.name}</h3>
                          <p className="text-sm text-gray-600">
                            Generated on {report.date} • {report.type}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            report.status === "Ready"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {report.status}
                        </Badge>
                        {report.status === "Ready" && (
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Scheduled Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Scheduled Reports
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Set up automatic report generation to save time
                  </p>
                  <Button>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
}
