// hooks/useFleetTracking.ts
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/stores/auth-store";

// Types
export interface VehicleLocation {
  lat: number;
  lng: number;
}

export interface DangerousGoodsInfo {
  un_number: string;
  proper_shipping_name: string;
  hazard_class: string;
  packing_group?: string;
  quantity?: string;
  is_marine_pollutant?: boolean;
}

export interface ActiveShipment {
  id: string;
  tracking_number: string;
  status: string;
  origin_location: string;
  destination_location: string;
  customer_name: string;
  estimated_delivery_date?: string;
  dangerous_goods?: DangerousGoodsInfo[];
  has_dangerous_goods?: boolean;
  emergency_contact?: string;
  special_instructions?: string;
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
async function getFleetStatus(token?: string): Promise<FleetStatusResponse> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  // Only add Authorization header if token is provided
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/tracking/fleet-status/`, {
    method: "GET",
    headers,
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
      const token = getToken(); // Optional token
      return getFleetStatus(token || undefined);
    },
    enabled: true, // Always enabled - backend handles auth
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: true,
  });
}
