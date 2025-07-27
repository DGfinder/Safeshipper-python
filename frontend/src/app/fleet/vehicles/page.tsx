"use client";

import React from "react";
import { useFleetStatus } from "@/shared/hooks/useVehicles";
import { useAuth } from "@/shared/hooks/use-auth";
import { VehicleList } from "@/features/fleet/components";
import { usePermissions } from "@/contexts/PermissionContext";
import { transformVehiclesToFleetVehicles } from "@/shared/utils/vehicle-transformers";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";
import { Loader2, Truck } from "lucide-react";

export default function VehiclesPage() {
  const { can } = usePermissions();
  const { user } = useAuth();
  const { data: fleetData, isLoading, refetch } = useFleetStatus(
    10000,
    user?.role,
    user?.id
  );

  // Early access check - if user can't view vehicles, show access denied
  if (!can('vehicle.view')) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">
              You don't have permission to view vehicle management.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  const vehicles = fleetData?.vehicles || [];
  const fleetVehicles = transformVehiclesToFleetVehicles(vehicles);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
              <Truck className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Vehicle Management</h1>
              <p className="text-blue-100 mt-1">
                Manage your fleet vehicles, drivers, and maintenance schedules
              </p>
            </div>
          </div>
        </div>
        
        <VehicleList vehicles={fleetVehicles} onRefresh={refetch} />
      </div>
    </DashboardLayout>
  );
}