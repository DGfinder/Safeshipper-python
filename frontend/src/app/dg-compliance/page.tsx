// app/dg-compliance/page.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  Users,
  TrendingUp,
  Search,
  Download,
  RefreshCw,
  Eye,
  Edit,
} from "lucide-react";
import { useDangerousGoods } from "@/shared/hooks/useDangerousGoods";
import { useShipments } from "@/shared/hooks/useShipments";
import { AuthGuard } from "@/shared/components/common/auth-guard";

interface ComplianceMetrics {
  totalShipments: number;
  compliantShipments: number;
  pendingValidation: number;
  violations: number;
  inspectionsPassed: number;
  inspectionsFailed: number;
  documentsUploaded: number;
  certificatesValid: number;
}

export default function DGCompliancePage() {
  const [refreshing, setRefreshing] = useState(false);
  const { data: dangerousGoods, isLoading: dgLoading } = useDangerousGoods();
  const { data: shipments, isLoading: shipmentsLoading } = useShipments();

  const handleRefresh = async () => {
    setRefreshing(true);
    // Add refresh logic here
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Mock compliance data - in production this would come from the backend
  const complianceMetrics: ComplianceMetrics = {
    totalShipments: 156,
    compliantShipments: 142,
    pendingValidation: 8,
    violations: 6,
    inspectionsPassed: 89,
    inspectionsFailed: 12,
    documentsUploaded: 145,
    certificatesValid: 138,
  };

  const complianceRate = (
    (complianceMetrics.compliantShipments / complianceMetrics.totalShipments) *
    100
  ).toFixed(1);

  const recentViolations = [
    {
      id: "1",
      shipmentId: "SS1234567890AB",
      type: "Missing Documentation",
      severity: "High",
      date: "2024-01-15",
      status: "Open",
    },
    {
      id: "2",
      shipmentId: "SS9876543210CD",
      type: "Incorrect Packaging",
      severity: "Medium",
      date: "2024-01-14",
      status: "Resolved",
    },
    {
      id: "3",
      shipmentId: "SS5555666677EF",
      type: "Label Requirements",
      severity: "Low",
      date: "2024-01-14",
      status: "Open",
    },
  ];

  const pendingInspections = [
    {
      id: "1",
      shipmentId: "SS1111222233GH",
      type: "Pre-Trip Inspection",
      dueDate: "2024-01-16",
      priority: "High",
    },
    {
      id: "2",
      shipmentId: "SS4444555566IJ",
      type: "Loading Inspection",
      dueDate: "2024-01-16",
      priority: "Medium",
    },
    {
      id: "3",
      shipmentId: "SS7777888899KL",
      type: "Post-Trip Inspection",
      dueDate: "2024-01-17",
      priority: "Low",
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-red-100 text-red-800";
      case "Resolved":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (dgLoading || shipmentsLoading) {
    return (
      <AuthGuard>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              DG Compliance Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor dangerous goods compliance and safety requirements
            </p>
          </div>
          <div className="flex items-center gap-3">
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
              Export Report
            </Button>
          </div>
        </div>

        {/* Compliance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Compliance Rate
              </CardTitle>
              <Shield className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {complianceRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {complianceMetrics.compliantShipments} of{" "}
                {complianceMetrics.totalShipments} shipments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Validation
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {complianceMetrics.pendingValidation}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Violations
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {complianceMetrics.violations}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inspections</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {complianceMetrics.inspectionsPassed}/
                {complianceMetrics.inspectionsPassed +
                  complianceMetrics.inspectionsFailed}
              </div>
              <p className="text-xs text-muted-foreground">
                Pass rate:{" "}
                {(
                  (complianceMetrics.inspectionsPassed /
                    (complianceMetrics.inspectionsPassed +
                      complianceMetrics.inspectionsFailed)) *
                  100
                ).toFixed(1)}
                %
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alert for critical issues */}
        {complianceMetrics.violations > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              You have {complianceMetrics.violations} active compliance
              violations that require immediate attention.
            </AlertDescription>
          </Alert>
        )}

        {/* Detailed Tabs */}
        <Tabs defaultValue="violations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="violations">Violations</TabsTrigger>
            <TabsTrigger value="inspections">Inspections</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="violations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Recent Violations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentViolations.map((violation) => (
                    <div
                      key={violation.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <XCircle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{violation.type}</h3>
                          <p className="text-sm text-gray-600">
                            Shipment: {violation.shipmentId}
                          </p>
                          <p className="text-xs text-gray-500">
                            {violation.date}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge className={getSeverityColor(violation.severity)}>
                          {violation.severity}
                        </Badge>
                        <Badge className={getStatusColor(violation.status)}>
                          {violation.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inspections" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  Pending Inspections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingInspections.map((inspection) => (
                    <div
                      key={inspection.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Search className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{inspection.type}</h3>
                          <p className="text-sm text-gray-600">
                            Shipment: {inspection.shipmentId}
                          </p>
                          <p className="text-xs text-gray-500">
                            Due: {inspection.dueDate}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          className={getPriorityColor(inspection.priority)}
                        >
                          {inspection.priority}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Schedule
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Document Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 border rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {complianceMetrics.documentsUploaded}
                    </div>
                    <p className="text-sm text-gray-600">Documents Uploaded</p>
                  </div>
                  <div className="text-center p-6 border rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {complianceMetrics.certificatesValid}
                    </div>
                    <p className="text-sm text-gray-600">Valid Certificates</p>
                  </div>
                  <div className="text-center p-6 border rounded-lg">
                    <div className="text-3xl font-bold text-yellow-600">
                      {complianceMetrics.documentsUploaded -
                        complianceMetrics.certificatesValid}
                    </div>
                    <p className="text-sm text-gray-600">Pending Review</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Compliance Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">This Month</span>
                      <span className="font-medium text-green-600">↑ 5.2%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Last Month</span>
                      <span className="font-medium">89.8%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">3 Months Ago</span>
                      <span className="font-medium">87.1%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Top Violation Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Missing Documentation</span>
                      <Badge variant="outline">42%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Incorrect Packaging</span>
                      <Badge variant="outline">28%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Label Requirements</span>
                      <Badge variant="outline">19%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Other</span>
                      <Badge variant="outline">11%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
}
