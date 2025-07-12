// hooks/useFleetTracking.ts
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";

// Types
export interface VehicleLocation {
  lat: number;
  lng: number;
}

export interface ActiveShipment {
  id: string;
  tracking_number: string;
  status: string;
  origin_location: string;
  destination_location: string;
  customer_name: string;
  estimated_delivery_date?: string;
}

export interface AssignedDriver {
  id: string;
  name: string;
  email: string;
}

export interface VehicleCompany {
  id: string;
  name: string;
}

export interface FleetVehicle {
  id: string;
  registration_number: string;
  vehicle_type: string;
  status: string;
  location: VehicleLocation | null;
  location_is_fresh: boolean;
  assigned_driver: AssignedDriver | null;
  active_shipment: ActiveShipment | null;
  company: VehicleCompany | null;
}

export interface FleetStatusResponse {
  vehicles: FleetVehicle[];
  total_vehicles: number;
  timestamp: string;
}

const API_BASE_URL = "/api/v1";

// API Functions
async function getFleetStatus(token: string): Promise<FleetStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/tracking/fleet-status/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to get fleet status");
  }

  return response.json();
}

// Hooks
export function useFleetStatus(pollingInterval = 10000) {
  const { getToken } = useAuthStore();

  return useQuery({
    queryKey: ["fleet-status"],
    queryFn: () => {
      const token = getToken() || "demo-token"; // Bypass for demo
      return getFleetStatus(token);
    },
    enabled: true, // Always enabled for demo
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: true,
  });
}
