"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText,
  Truck,
  Eye,
  Download,
  Settings,
  AlertCircle
} from "lucide-react";
import { usePermissions, Can } from "@/contexts/PermissionContext";
import { useMockFleetStatus } from "@/shared/hooks/useMockAPI";

export default function CompliancePage() {
  const { can } = usePermissions();
  const { data: fleetData } = useMockFleetStatus();

  const vehicles = fleetData?.vehicles || [];
  const dgVehicles = vehicles.filter(v => v.active_shipment?.has_dangerous_goods);
  
  // Mock compliance data
  const complianceStats = {
    totalVehicles: vehicles.length,
    compliantVehicles: Math.floor(vehicles.length * 0.85),
    dgVehicles: dgVehicles.length,
    certificatesExpiring: Math.floor(vehicles.length * 0.15),
    overdueInspections: Math.floor(vehicles.length * 0.05)
  };

  const getComplianceStatus = (vehicle: any) => {
    // Mock compliance logic
    const hasActiveDG = vehicle.active_shipment?.has_dangerous_goods;
    const random = Math.random();
    
    if (hasActiveDG && random < 0.1) return { status: "critical", label: "Non-Compliant", color: "bg-red-100 text-red-800" };
    if (hasActiveDG && random < 0.3) return { status: "warning", label: "Attention Required", color: "bg-yellow-100 text-yellow-800" };
    return { status: "compliant", label: "Compliant", color: "bg-green-100 text-green-800" };
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              DG Compliance Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor dangerous goods compliance across your fleet
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Can permission="fleet.analytics.export">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </Can>
            <Can permission="fleet.compliance.edit">
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Manage Compliance
              </Button>
            </Can>
          </div>
        </div>
      </div>

      {/* Compliance Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-gray-400" />
              <span className="text-2xl font-bold">{complianceStats.totalVehicles}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Compliant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold text-green-600">
                {complianceStats.compliantVehicles}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Carrying DG
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold text-blue-600">
                {complianceStats.dgVehicles}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-600">
                {complianceStats.certificatesExpiring}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-2xl font-bold text-red-600">
                {complianceStats.overdueInspections}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Tabs */}
      <Tabs defaultValue="vehicles" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="vehicles">Vehicle Compliance</TabsTrigger>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="reports">Compliance Reports</TabsTrigger>
        </TabsList>

        {/* Vehicle Compliance Tab */}
        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Fleet Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vehicles.map((vehicle) => {
                  const compliance = getComplianceStatus(vehicle);
                  return (
                    <div
                      key={vehicle.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Truck className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{vehicle.registration_number}</h3>
                          <p className="text-sm text-gray-600">{vehicle.vehicle_type}</p>
                          {vehicle.active_shipment?.has_dangerous_goods && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertCircle className="h-3 w-3 text-orange-600" />
                              <span className="text-xs text-orange-600">Carrying DG</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Badge className={compliance.color}>
                            {compliance.label}
                          </Badge>
                          {vehicle.assigned_driver && (
                            <p className="text-sm text-gray-600 mt-1">
                              Driver: {vehicle.assigned_driver.name}
                            </p>
                          )}
                        </div>

                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Alerts Tab */}
        <TabsContent value="alerts">
          <div className="space-y-4">
            {/* Critical Alerts */}
            <Card className="border-red-200">
              <CardHeader className="bg-red-50">
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  Critical Alerts (2)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-md">
                    <div>
                      <p className="font-medium text-red-800">ADR Certificate Expired</p>
                      <p className="text-sm text-red-600">Vehicle ABC-789 - Expired 3 days ago</p>
                    </div>
                    <Can permission="fleet.compliance.edit">
                      <Button size="sm" variant="outline">
                        Resolve
                      </Button>
                    </Can>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-md">
                    <div>
                      <p className="font-medium text-red-800">Missing Safety Equipment</p>
                      <p className="text-sm text-red-600">Vehicle DEF-456 - Fire extinguisher inspection overdue</p>
                    </div>
                    <Can permission="fleet.compliance.edit">
                      <Button size="sm" variant="outline">
                        Resolve
                      </Button>
                    </Can>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warning Alerts */}
            <Card className="border-yellow-200">
              <CardHeader className="bg-yellow-50">
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <Clock className="h-5 w-5" />
                  Warning Alerts (5)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-md">
                    <div>
                      <p className="font-medium text-yellow-800">Certificate Expiring Soon</p>
                      <p className="text-sm text-yellow-600">Vehicle GHI-123 - ADR expires in 15 days</p>
                    </div>
                    <Button size="sm" variant="outline">
                      Schedule Renewal
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-md">
                    <div>
                      <p className="font-medium text-yellow-800">Inspection Due</p>
                      <p className="text-sm text-yellow-600">Vehicle JKL-789 - Safety inspection due in 7 days</p>
                    </div>
                    <Button size="sm" variant="outline">
                      Schedule Inspection
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Reports Tab */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Compliance Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">Monthly Compliance Report</p>
                    <p className="text-sm text-gray-600">December 2024</p>
                  </div>
                  <Can permission="fleet.analytics.export">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </Can>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">ADR Compliance Summary</p>
                    <p className="text-sm text-gray-600">Q4 2024</p>
                  </div>
                  <Can permission="fleet.analytics.export">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </Can>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">Safety Equipment Audit</p>
                    <p className="text-sm text-gray-600">November 2024</p>
                  </div>
                  <Can permission="fleet.analytics.export">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </Can>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Compliance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Overall Compliance Rate</span>
                      <span className="font-medium">85%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: "85%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>ADR Certification Rate</span>
                      <span className="font-medium">92%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: "92%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Safety Equipment Status</span>
                      <span className="font-medium">78%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{ width: "78%" }}></div>
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