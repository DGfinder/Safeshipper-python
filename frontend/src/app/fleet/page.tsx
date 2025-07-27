// app/fleet/page.tsx
"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  RefreshCw,
  Truck,
  Users,
  Activity,
  MapPin,
  Eye,
  Clock,
  Package,
  AlertTriangle,
  BarChart3,
  Settings,
  Plus,
} from "lucide-react";
import { useFleetStatus } from "@/shared/hooks/useVehicles";
import { useAuth } from "@/shared/hooks/use-auth";
import { usePermissions, Can } from "@/contexts/PermissionContext";
import { VehicleList } from "@/features/fleet/components";
import { transformVehiclesToFleetVehicles } from "@/shared/utils/vehicle-transformers";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";

// Dynamically import FleetMap to avoid SSR issues
const FleetMap = dynamic(
  () =>
    import("@/shared/components/maps/FleetMap").then((mod) => ({
      default: mod.FleetMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    ),
  },
);

export default function FleetPage() {
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { data: fleetData, isLoading, refetch } = useFleetStatus(
    10000, // 10 second polling
    user?.role,
    user?.id
  );
  const { can } = usePermissions();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-green-100 text-green-800";
      case "IN_TRANSIT":
      case "DELIVERING":
        return "bg-blue-100 text-blue-800";
      case "AT_HUB":
        return "bg-purple-100 text-purple-800";
      case "MAINTENANCE":
        return "bg-yellow-100 text-yellow-800";
      case "OFFLINE":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDriverStatusColor = (status: string) => {
    switch (status) {
      case "ON_DUTY":
        return "bg-green-100 text-green-800";
      case "OFF_DUTY":
        return "bg-gray-100 text-gray-800";
      case "DRIVING":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const rawVehicles = fleetData?.vehicles || [];
  const vehicles = transformVehiclesToFleetVehicles(rawVehicles);
  const availableVehicles = vehicles.filter((v) => v.status === "AVAILABLE").length;
  const inTransitVehicles = vehicles.filter(
    (v) => v.status === "IN_TRANSIT" || v.status === "DELIVERING"
  ).length;
  const atHubVehicles = vehicles.filter((v) => v.status === "AT_HUB").length;
  const maintenanceVehicles = vehicles.filter(
    (v) => v.status === "MAINTENANCE",
  ).length;
  const offlineVehicles = vehicles.filter((v) => v.status === "OFFLINE").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Fleet Management</h1>
                <p className="text-blue-100 mt-1">
                  Monitor and manage your vehicle fleet
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleRefresh}
                variant="outline"
                disabled={refreshing}
                className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Can permission="vehicle.create">
                <Button className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 shadow-md">
                  <Plus className="h-4 w-4" />
                  Add Vehicle
                </Button>
              </Can>
            </div>
          </div>
        </div>

        {/* Fleet Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Vehicles
              </CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vehicles.length}</div>
              <p className="text-xs text-muted-foreground">Fleet size</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {availableVehicles}
              </div>
              <p className="text-xs text-muted-foreground">
                Ready for dispatch
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Transit</CardTitle>
              <MapPin className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {inTransitVehicles}
              </div>
              <p className="text-xs text-muted-foreground">On delivery</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {maintenanceVehicles}
              </div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Fleet Tabs */}
        <Tabs defaultValue="live-map" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="live-map">Live Map</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="live-map" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Fleet Live Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[600px] rounded-lg border border-t-0">
                  <FleetMap vehicles={vehicles} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vehicles" className="space-y-6">
            <VehicleList vehicles={vehicles} onRefresh={handleRefresh} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Utilization Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Active Vehicles</span>
                      <span className="font-medium">
                        {(
                          ((availableVehicles + inTransitVehicles) /
                            vehicles.length) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${((availableVehicles + inTransitVehicles) / vehicles.length) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Average Delivery Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">2.4h</div>
                  <p className="text-sm text-gray-600">-12% from last week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Deliveries Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">28</div>
                  <p className="text-sm text-gray-600">+8% from yesterday</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Issues Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">
                    {maintenanceVehicles}
                  </div>
                  <p className="text-sm text-gray-600">
                    Vehicles needing attention
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
