import { z } from 'zod'
import { apiService, ApiResponse } from './api';

// Types matching the Django backend
export type VehicleType = 'rigid-truck' | 'semi-trailer' | 'b-double' | 'road-train' | 'van' | 'other';
export type VehicleStatus = 'available' | 'in-transit' | 'loading' | 'maintenance' | 'out-of-service';

// Zod schema for vehicle creation form validation
export const vehicleCreateSchema = z.object({
  registration_number: z
    .string()
    .min(1, 'Registration number is required')
    .max(20, 'Registration number must be less than 20 characters')
    .regex(/^[A-Z0-9\-\s]+$/i, 'Registration number can only contain letters, numbers, hyphens, and spaces'),
  vehicle_type: z.enum(['rigid-truck', 'semi-trailer', 'b-double', 'road-train', 'van', 'other'], {
    required_error: 'Please select a vehicle type'
  }),
  make: z
    .string()
    .min(1, 'Make is required')
    .max(50, 'Make must be less than 50 characters'),
  model: z
    .string()
    .min(1, 'Model is required')
    .max(50, 'Model must be less than 50 characters'),
  year: z
    .number()
    .min(1900, 'Year must be 1900 or later')
    .max(new Date().getFullYear() + 1, `Year cannot be later than ${new Date().getFullYear() + 1}`)
    .int('Year must be a whole number'),
  payload_capacity: z
    .number()
    .min(0, 'Payload capacity must be 0 or greater')
    .max(100000, 'Payload capacity must be less than 100,000 kg'),
  pallet_spaces: z
    .number()
    .min(0, 'Pallet spaces must be 0 or greater')
    .max(100, 'Pallet spaces must be less than 100')
    .int('Pallet spaces must be a whole number'),
  is_dg_certified: z
    .boolean()
    .default(false),
  assigned_depot: z
    .string()
    .optional(),
  owning_company: z
    .string()
    .optional(),
})

// Infer TypeScript type from create schema
export type VehicleCreateFormValues = z.infer<typeof vehicleCreateSchema>

// Zod schema for vehicle editing (all fields editable)
export const vehicleEditSchema = z.object({
  registration_number: z
    .string()
    .min(1, 'Registration number is required')
    .max(20, 'Registration number must be less than 20 characters')
    .regex(/^[A-Z0-9\-\s]+$/i, 'Registration number can only contain letters, numbers, hyphens, and spaces'),
  vehicle_type: z.enum(['rigid-truck', 'semi-trailer', 'b-double', 'road-train', 'van', 'other'], {
    required_error: 'Please select a vehicle type'
  }),
  make: z
    .string()
    .min(1, 'Make is required')
    .max(50, 'Make must be less than 50 characters'),
  model: z
    .string()
    .min(1, 'Model is required')
    .max(50, 'Model must be less than 50 characters'),
  year: z
    .number()
    .min(1900, 'Year must be 1900 or later')
    .max(new Date().getFullYear() + 1, `Year cannot be later than ${new Date().getFullYear() + 1}`)
    .int('Year must be a whole number'),
  status: z.enum(['available', 'in-transit', 'loading', 'maintenance', 'out-of-service'], {
    required_error: 'Please select a vehicle status'
  }),
  payload_capacity: z
    .number()
    .min(0, 'Payload capacity must be 0 or greater')
    .max(100000, 'Payload capacity must be less than 100,000 kg'),
  pallet_spaces: z
    .number()
    .min(0, 'Pallet spaces must be 0 or greater')
    .max(100, 'Pallet spaces must be less than 100')
    .int('Pallet spaces must be a whole number'),
  is_dg_certified: z
    .boolean()
    .default(false),
  assigned_depot: z
    .string()
    .optional(),
  owning_company: z
    .string()
    .optional(),
})

// Infer TypeScript type from edit schema
export type VehicleEditFormValues = z.infer<typeof vehicleEditSchema>

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