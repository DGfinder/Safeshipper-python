// app/dashboard/live-map/page.tsx
"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
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
} from "lucide-react";
import { useFleetStatus } from "@/shared/hooks/useVehicles";
import { useAuth } from "@/shared/hooks/use-auth";
import { useRealTimeFleetTracking } from "@/shared/hooks/useRealTimeData";
import { FleetVehicle } from "@/shared/hooks/useFleetTracking";
import { MapDashboardLayout } from "@/shared/components/layout/map-dashboard-layout";
import { DataFreshnessIndicator } from "@/shared/components/ui/connection-status";
import { useAuthStore } from "@/shared/stores/auth-store";
import { transformVehicleToFleetVehicle } from "@/shared/utils/vehicle-transformers";

// Dynamically import FleetMap to avoid SSR issues
const FleetMap = dynamic(
  () =>
    import("@/shared/components/maps/FleetMap").then((mod) => ({
      default: mod.FleetMap,
    })),
  {
    ssr: false,
    loading: () => (
      <Card className="h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-pulse" />
            <p className="text-gray-500">Loading map...</p>
          </div>
        </CardContent>
      </Card>
    ),
  },
);

export default function LiveMapPage() {
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds
  const { user } = useAuth();

  // Use real API with real-time updates and role-based filtering
  const {
    data: fleetData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useFleetStatus(refreshInterval, user?.role, user?.id);
  
  // Enable real-time updates
  const { lastUpdate } = useRealTimeFleetTracking();

  const handleRefresh = () => {
    refetch();
  };

  const handleVehicleSelect = (vehicle: FleetVehicle) => {
    setSelectedVehicle(vehicle);
  };

  const getVehicleStats = () => {
    if (!fleetData?.vehicles)
      return { total: 0, active: 0, online: 0, inTransit: 0 };

    const vehicles = fleetData.vehicles;
    return {
      total: vehicles.length,
      active: vehicles.filter((v) => v.activeShipment).length,
      online: vehicles.filter((v) => v.locationIsFresh).length,
      inTransit: vehicles.filter(
        (v) => v.activeShipment?.status === "IN_TRANSIT",
      ).length,
    };
  };

  const stats = getVehicleStats();

  if (error) {
    return (
      <MapDashboardLayout 
        mapTitle="Live Fleet Map - Error"
        mapDescription="Failed to load fleet data"
      >
        <div className="p-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Failed to load fleet data: {error.message}
            </AlertDescription>
          </Alert>
          <Button onClick={handleRefresh} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </MapDashboardLayout>
    );
  }

  const headerActions = (
    <>
      {/* Refresh Interval Selector */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">Update every:</span>
        <select
          value={refreshInterval}
          onChange={(e) => setRefreshInterval(Number(e.target.value))}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value={5000}>5s</option>
          <option value={10000}>10s</option>
          <option value={30000}>30s</option>
          <option value={60000}>1m</option>
        </select>
      </div>

      <Button
        onClick={handleRefresh}
        variant="outline"
        size="sm"
        disabled={isRefetching}
      >
        <RefreshCw
          className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`}
        />
        Refresh
      </Button>
    </>
  );

  return (
    <MapDashboardLayout 
      mapTitle="Live Fleet Map"
      mapDescription="Real-time tracking of all active vehicles and shipments"
      headerActions={headerActions}
    >
      <div className="h-full flex flex-col p-6 space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Vehicles
                  </p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Truck className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Active Shipments
                  </p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
                <Package className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Online</p>
                  <p className="text-2xl font-bold">{stats.online}</p>
                </div>
                <Activity className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    In Transit
                  </p>
                  <p className="text-2xl font-bold">{stats.inTransit}</p>
                </div>
                <MapPin className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
          {/* Map */}
          <div className="lg:col-span-3 h-full">
            {isLoading ? (
              <Card className="h-full min-h-[500px]">
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-spin" />
                    <p className="text-gray-500">Loading fleet data...</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full min-h-[500px]">
                <FleetMap
                  vehicles={(fleetData?.vehicles || []).map(transformVehicleToFleetVehicle)}
                  onVehicleSelect={handleVehicleSelect}
                />
              </div>
            )}
          </div>

          {/* Vehicle Details Sidebar */}
          <div className="space-y-4">
            {/* Last Update */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Last Updated
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600">
                  {fleetData?.timestamp
                    ? new Date(fleetData.timestamp).toLocaleString()
                    : "Never"}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <DataFreshnessIndicator 
                    lastUpdate={lastUpdate} 
                    maxAge={30000} // 30 seconds
                  />
                </div>
              </CardContent>
            </Card>

            {/* Selected Vehicle Details */}
            {selectedVehicle ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Selected Vehicle
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div>
                    <h3 className="font-semibold">
                      {selectedVehicle.registration_number}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedVehicle.vehicle_type}
                    </p>
                  </div>

                  {selectedVehicle.assigned_driver && (
                    <div>
                      <p className="text-sm font-medium">Driver</p>
                      <p className="text-sm text-gray-600">
                        {selectedVehicle.assigned_driver.name}
                      </p>
                    </div>
                  )}

                  {selectedVehicle.location && (
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-xs font-mono text-gray-600">
                        {selectedVehicle.location.lat.toFixed(6)},{" "}
                        {selectedVehicle.location.lng.toFixed(6)}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-xs mt-1 ${
                          selectedVehicle.location_is_fresh
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {selectedVehicle.location_is_fresh ? "Fresh" : "Stale"}
                      </Badge>
                    </div>
                  )}

                  {selectedVehicle.active_shipment && (
                    <div className="border-t pt-3">
                      <p className="text-sm font-medium">Active Shipment</p>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Tracking:</span>{" "}
                          {selectedVehicle.active_shipment.tracking_number}
                        </p>
                        <p>
                          <span className="font-medium">Customer:</span>{" "}
                          {selectedVehicle.active_shipment.customer_name}
                        </p>
                        <p>
                          <span className="font-medium">Status:</span>{" "}
                          {selectedVehicle.active_shipment.status.replace(
                            "_",
                            " ",
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4 text-center text-gray-500">
                  <MapPin className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">
                    Click on a vehicle marker to view details
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Drivers
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Vehicle Status
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Active Shipments
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MapDashboardLayout>
  );
}
