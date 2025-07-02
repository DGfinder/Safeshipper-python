import { apiService, ApiResponse } from './api';

// Types matching the Django backend
export type VehicleType = 'rigid-truck' | 'semi-trailer' | 'b-double' | 'road-train' | 'van' | 'other';
export type VehicleStatus = 'available' | 'in-transit' | 'loading' | 'maintenance' | 'out-of-service';

export interface Vehicle {
  id: string;
  registration_number: string;
  vehicle_type: VehicleType;
  make: string;
  model: string;
  year: number;
  status: VehicleStatus;
  payload_capacity: number; // kg
  pallet_spaces: number;
  is_dg_certified: boolean;
  assigned_depot?: {
    id: string;
    name: string;
  };
  owning_company?: {
    id: string;
    name: string;
  };
  assigned_driver?: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
  current_location?: {
    latitude: number;
    longitude: number;
  };
  created_at: string;
  updated_at: string;
}

export interface VehicleCreateData {
  registration_number: string;
  vehicle_type: VehicleType;
  make: string;
  model: string;
  year: number;
  payload_capacity: number;
  pallet_spaces: number;
  is_dg_certified: boolean;
  assigned_depot?: string;
  owning_company?: string;
}

export interface VehicleUpdateData {
  registration_number?: string;
  vehicle_type?: VehicleType;
  make?: string;
  model?: string;
  year?: number;
  status?: VehicleStatus;
  payload_capacity?: number;
  pallet_spaces?: number;
  is_dg_certified?: boolean;
  assigned_depot?: string;
  owning_company?: string;
}

export interface VehiclesListParams {
  search?: string;
  vehicle_type?: VehicleType;
  status?: VehicleStatus;
  assigned_depot?: string;
  owning_company?: string;
  is_dg_certified?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export const vehiclesApi = {
  // Get all vehicles with optional filtering
  async getVehicles(params?: VehiclesListParams): Promise<ApiResponse<Vehicle[]>> {
    return apiService.get<Vehicle[]>('/vehicles/', params);
  },

  // Get a specific vehicle by ID
  async getVehicle(id: string): Promise<ApiResponse<Vehicle>> {
    return apiService.get<Vehicle>(`/vehicles/${id}/`);
  },

  // Create a new vehicle
  async createVehicle(data: VehicleCreateData): Promise<ApiResponse<Vehicle>> {
    return apiService.post<Vehicle>('/vehicles/', data);
  },

  // Update a vehicle
  async updateVehicle(id: string, data: VehicleUpdateData): Promise<ApiResponse<Vehicle>> {
    return apiService.patch<Vehicle>(`/vehicles/${id}/`, data);
  },

  // Delete a vehicle
  async deleteVehicle(id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/vehicles/${id}/`);
  },

  // Assign a driver to a vehicle
  async assignDriver(vehicleId: string, driverId: string): Promise<ApiResponse<Vehicle>> {
    return apiService.post<Vehicle>(`/vehicles/${vehicleId}/assign_driver/`, {
      driver_id: driverId
    });
  },

  // Get available vehicles at a depot
  async getAvailableAtDepot(depotId: string): Promise<ApiResponse<Vehicle[]>> {
    return apiService.get<Vehicle[]>('/vehicles/available_at_depot/', {
      depot_id: depotId
    });
  }
}; 