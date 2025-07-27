"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { 
  ArrowLeft, 
  Edit, 
  Truck, 
  MapPin, 
  User, 
  Calendar,
  Fuel,
  Package,
  AlertCircle,
  Shield,
  Wrench,
  History,
  BarChart3
} from "lucide-react";
import { usePermissions, Can } from "@/contexts/PermissionContext";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";
import { useMockFleetStatus } from "@/shared/hooks/useMockAPI";

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { can } = usePermissions();
  const { data: fleetData } = useMockFleetStatus();
  
  const vehicleId = params.id as string;
  const vehicle = fleetData?.vehicles.find(v => v.id === vehicleId);

  if (!vehicle) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Vehicle not found</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "IN_TRANSIT":
        return "bg-blue-100 text-blue-800";
      case "MAINTENANCE":
        return "bg-yellow-100 text-yellow-800";
      case "OFFLINE":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {vehicle.registration_number}
            </h1>
            <p className="text-gray-600 mt-1">{vehicle.vehicle_type}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(vehicle.status)}>
              {vehicle.status}
            </Badge>
            <Can permission="vehicle.edit">
              <Button onClick={() => router.push(`/fleet/vehicles/${vehicleId}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Vehicle
              </Button>
            </Can>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Current Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="font-medium">
                {vehicle.location ? "En Route" : "Base Station"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Assigned Driver
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium">
                {vehicle.assigned_driver?.name || "Unassigned"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Shipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-400" />
              <span className="font-medium">
                {vehicle.active_shipment?.tracking_number || "None"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Last Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-gray-400" />
              <span className="font-medium">15 days ago</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Registration</label>
                  <p className="font-medium">{vehicle.registration_number}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Type</label>
                  <p className="font-medium">{vehicle.vehicle_type}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Make & Model</label>
                  <p className="font-medium">Mercedes-Benz Actros</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Year</label>
                  <p className="font-medium">2023</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">VIN</label>
                  <p className="font-medium">WDB1234567890123</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operational Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Fuel Type</label>
                  <p className="font-medium">Diesel</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Capacity</label>
                  <p className="font-medium">25 tons</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Mileage</label>
                  <p className="font-medium">45,230 km</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Fuel Efficiency</label>
                  <p className="font-medium">8.2 km/L</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Company</label>
                  <p className="font-medium">{vehicle.company?.name || "N/A"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Shipment Info */}
          {vehicle.active_shipment && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Current Shipment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Tracking Number</label>
                    <p className="font-medium">{vehicle.active_shipment.tracking_number}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">From</label>
                    <p className="font-medium">{vehicle.active_shipment.origin_location}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">To</label>
                    <p className="font-medium">{vehicle.active_shipment.destination_location}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Customer</label>
                    <p className="font-medium">{vehicle.active_shipment.customer_name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Status</label>
                    <Badge variant="outline">{vehicle.active_shipment.status}</Badge>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">ETA</label>
                    <p className="font-medium">{vehicle.active_shipment.estimated_delivery_date || "N/A"}</p>
                  </div>
                </div>
                
                {vehicle.active_shipment.has_dangerous_goods && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Carrying Dangerous Goods</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">ADR Certification</p>
                      <p className="text-sm text-gray-600">Valid until Dec 2025</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">View Certificate</Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Safety Equipment</p>
                      <p className="text-sm text-gray-600">Last inspection: 30 days ago</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">View Checklist</Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Insurance</p>
                      <p className="text-sm text-gray-600">Renewal due in 45 days</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">View Policy</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Maintenance Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Maintenance history and upcoming services will be shown here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Vehicle History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Trip history and events will be shown here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Vehicle performance metrics and analytics will be shown here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}