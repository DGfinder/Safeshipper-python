"use client";

import React from "react";
import { useFleetStatus } from "@/shared/hooks/useFleetTracking";
import { useMockFleetStatus } from "@/shared/hooks/useMockAPI";
import { VehicleList } from "@/features/fleet/components";
import { usePermissions } from "@/contexts/PermissionContext";
import { Loader2 } from "lucide-react";

export default function VehiclesPage() {
  const { can } = usePermissions();
  const { data: fleetData, isLoading, refetch } = useMockFleetStatus();

  // Early access check - if user can't view vehicles, show access denied
  if (!can('vehicle.view')) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">
              You don't have permission to view vehicle management.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  const vehicles = fleetData?.vehicles || [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Vehicle Management</h1>
        <p className="text-gray-600 mt-1">
          Manage your fleet vehicles, drivers, and maintenance schedules
        </p>
      </div>
      
      <VehicleList vehicles={vehicles} onRefresh={refetch} />
    </div>
  );
}