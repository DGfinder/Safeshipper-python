"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { 
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  BarChart3,
  Target,
  Award
} from "lucide-react";
import { usePermissions, Can } from "@/contexts/PermissionContext";
import { useMockFleetStatus } from "@/shared/hooks/useMockAPI";

export default function ComplianceAnalyticsPage() {
  const { can } = usePermissions();
  const { data: fleetData } = useMockFleetStatus();
  const [timeRange, setTimeRange] = useState("30d");
  const [complianceType, setComplianceType] = useState("all");

  const vehicles = fleetData?.vehicles || [];

  // Check permission for compliance analytics
  if (!can("fleet.compliance.view")) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">
              You don't have permission to view compliance analytics.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mock compliance analytics data
  const getComplianceAnalytics = () => {
    return {
      overview: {
        overallCompliance: 85.3,
        complianceChange: 2.1,
        complianceTrend: "up",
        totalVehicles: vehicles.length,
        compliantVehicles: Math.floor(vehicles.length * 0.853),
        dgVehicles: vehicles.filter(v => v.active_shipment?.has_dangerous_goods).length
      },
      categories: {
        adr: {
          compliance: 92.1,
          expired: 2,
          expiring: 5,
          valid: vehicles.length - 7,
          trend: "up",
          change: 1.5
        },
        equipment: {
          compliance: 78.6,
          missing: 8,
          attention: 12,
          compliant: vehicles.length - 20,
          trend: "down",
          change: -2.3
        },
        inspections: {
          compliance: 89.4,
          overdue: 3,
          upcoming: 15,
          completed: vehicles.length - 18,
          trend: "up",
          change: 3.2
        },
        insurance: {
          compliance: 96.2,
          expired: 1,
          expiring: 2,
          valid: vehicles.length - 3,
          trend: "stable",
          change: 0.1
        }
      },
      monthly: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        overall: [82.1, 83.5, 81.9, 84.2, 83.8, 85.3],
        adr: [89.2, 90.1, 88.9, 91.2, 90.8, 92.1],
        equipment: [79.8, 81.2, 78.9, 80.1, 79.5, 78.6],
        inspections: [85.1, 86.8, 87.2, 88.1, 88.9, 89.4]
      }
    };
  };

  const complianceData = getComplianceAnalytics();

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 80) return "text-yellow-600";
    return "text-red-600";
  };

  const getComplianceBgColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-100";
    if (percentage >= 80) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4"></div>;
  };

  const getVehicleComplianceStatus = () => {
    return vehicles.map(vehicle => {
      const random = Math.random();
      const hasActiveDG = vehicle.active_shipment?.has_dangerous_goods;
      
      return {
        id: vehicle.id,
        registration: vehicle.registration_number,
        type: vehicle.vehicle_type,
        hasActiveDG,
        overallScore: hasActiveDG ? 
          (random > 0.1 ? Math.floor(Math.random() * 20 + 75) : Math.floor(Math.random() * 30 + 45)) :
          Math.floor(Math.random() * 15 + 85),
        adr: hasActiveDG ? (random > 0.9 ? "expired" : random > 0.7 ? "expiring" : "valid") : "valid",
        equipment: random > 0.8 ? "attention" : random > 0.9 ? "missing" : "compliant",
        inspection: random > 0.85 ? "overdue" : random > 0.7 ? "upcoming" : "compliant",
        insurance: random > 0.95 ? "expired" : random > 0.85 ? "expiring" : "valid"
      };
    });
  };

  const vehicleComplianceStatus = getVehicleComplianceStatus();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "valid":
      case "compliant":
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Valid</span>;
      case "expiring":
      case "attention":
      case "upcoming":
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Attention</span>;
      case "expired":
      case "missing":
      case "overdue":
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Critical</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">Unknown</span>;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Compliance Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Detailed compliance metrics and regulatory oversight
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
            <Select value={complianceType} onValueChange={setComplianceType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="adr">ADR Only</SelectItem>
                <SelectItem value="equipment">Equipment Only</SelectItem>
                <SelectItem value="inspections">Inspections Only</SelectItem>
              </SelectContent>
            </Select>
            <Can permission="fleet.analytics.export">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </Can>
          </div>
        </div>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Overall Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${getComplianceColor(complianceData.overview.overallCompliance)}`}>
                {complianceData.overview.overallCompliance}%
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(complianceData.overview.complianceTrend)}
                <span className="text-sm font-medium text-green-600">
                  +{complianceData.overview.complianceChange}%
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {complianceData.overview.compliantVehicles} of {complianceData.overview.totalVehicles} vehicles
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              ADR Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${getComplianceColor(complianceData.categories.adr.compliance)}`}>
                {complianceData.categories.adr.compliance}%
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(complianceData.categories.adr.trend)}
                <span className="text-sm font-medium text-green-600">
                  +{complianceData.categories.adr.change}%
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {complianceData.categories.adr.expired} expired, {complianceData.categories.adr.expiring} expiring
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Equipment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${getComplianceColor(complianceData.categories.equipment.compliance)}`}>
                {complianceData.categories.equipment.compliance}%
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(complianceData.categories.equipment.trend)}
                <span className="text-sm font-medium text-red-600">
                  {complianceData.categories.equipment.change}%
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {complianceData.categories.equipment.missing} missing, {complianceData.categories.equipment.attention} need attention
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Inspections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${getComplianceColor(complianceData.categories.inspections.compliance)}`}>
                {complianceData.categories.inspections.compliance}%
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(complianceData.categories.inspections.trend)}
                <span className="text-sm font-medium text-green-600">
                  +{complianceData.categories.inspections.change}%
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {complianceData.categories.inspections.overdue} overdue, {complianceData.categories.inspections.upcoming} upcoming
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="trends">Compliance Trends</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicle Status</TabsTrigger>
          <TabsTrigger value="risks">Risk Analysis</TabsTrigger>
          <TabsTrigger value="reports">Compliance Reports</TabsTrigger>
        </TabsList>

        {/* Compliance Trends */}
        <TabsContent value="trends">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Monthly Compliance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Compliance trend chart would be displayed here</p>
                    <p className="text-sm text-gray-500">Showing monthly compliance rates for different categories</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Compliance Targets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Overall Target</span>
                    <span className="font-medium">90%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full"
                      style={{ width: `${(complianceData.overview.overallCompliance / 90) * 100}%` }}
                    ></div>
                  </div>
                  
                  <div className="space-y-3 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">ADR Compliance</span>
                      <span className={`font-medium ${getComplianceColor(complianceData.categories.adr.compliance)}`}>
                        {complianceData.categories.adr.compliance}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Equipment Status</span>
                      <span className={`font-medium ${getComplianceColor(complianceData.categories.equipment.compliance)}`}>
                        {complianceData.categories.equipment.compliance}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Inspection Rate</span>
                      <span className={`font-medium ${getComplianceColor(complianceData.categories.inspections.compliance)}`}>
                        {complianceData.categories.inspections.compliance}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vehicle Status */}
        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <CardTitle>Individual Vehicle Compliance Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vehicleComplianceStatus.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className={`p-4 border rounded-lg ${getComplianceBgColor(vehicle.overallScore)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-medium">{vehicle.registration}</div>
                          <div className="text-sm text-gray-600">{vehicle.type}</div>
                          {vehicle.hasActiveDG && (
                            <div className="text-xs text-orange-600 mt-1">
                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                              Carrying DG
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Overall</div>
                          <div className={`text-lg font-bold ${getComplianceColor(vehicle.overallScore)}`}>
                            {vehicle.overallScore}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-600">ADR</div>
                          {getStatusBadge(vehicle.adr)}
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-600">Equipment</div>
                          {getStatusBadge(vehicle.equipment)}
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-600">Inspection</div>
                          {getStatusBadge(vehicle.inspection)}
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-600">Insurance</div>
                          {getStatusBadge(vehicle.insurance)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Analysis */}
        <TabsContent value="risks">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  High-Risk Vehicles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vehicleComplianceStatus
                    .filter(v => v.overallScore < 70)
                    .slice(0, 5)
                    .map((vehicle) => (
                      <div key={vehicle.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-md">
                        <div>
                          <div className="font-medium text-red-800">{vehicle.registration}</div>
                          <div className="text-sm text-red-600">Multiple compliance issues</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-red-700">{vehicle.overallScore}%</div>
                          <Can permission="fleet.compliance.edit">
                            <Button size="sm" variant="outline">
                              Review
                            </Button>
                          </Can>
                        </div>
                      </div>
                    ))}
                  {vehicleComplianceStatus.filter(v => v.overallScore < 70).length === 0 && (
                    <div className="text-center py-4">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No high-risk vehicles identified</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vehicleComplianceStatus
                    .filter(v => v.overallScore >= 95)
                    .slice(0, 5)
                    .map((vehicle) => (
                      <div key={vehicle.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                        <div>
                          <div className="font-medium text-green-800">{vehicle.registration}</div>
                          <div className="text-sm text-green-600">Excellent compliance record</div>
                        </div>
                        <div className="text-lg font-bold text-green-700">{vehicle.overallScore}%</div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Reports */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Regulatory Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">ADR Compliance Report</p>
                    <p className="text-sm text-gray-600">Monthly regulatory submission</p>
                  </div>
                  <Can permission="fleet.analytics.export">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      Generate
                    </Button>
                  </Can>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">Safety Audit Summary</p>
                    <p className="text-sm text-gray-600">Quarterly compliance audit</p>
                  </div>
                  <Can permission="fleet.analytics.export">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      Generate
                    </Button>
                  </Can>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">Equipment Inspection Log</p>
                    <p className="text-sm text-gray-600">Detailed inspection records</p>
                  </div>
                  <Can permission="fleet.analytics.export">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      Generate
                    </Button>
                  </Can>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {complianceData.overview.overallCompliance}%
                    </div>
                    <div className="text-sm text-gray-600">Overall Fleet Compliance</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-3 bg-green-50 rounded">
                      <div className="font-medium text-green-800">Compliant Vehicles</div>
                      <div className="text-2xl font-bold text-green-600">
                        {complianceData.overview.compliantVehicles}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <div className="font-medium text-blue-800">DG Carriers</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {complianceData.overview.dgVehicles}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}