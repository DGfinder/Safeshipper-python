// Real Vehicle API Service - replaces mock services
import { apiHelpers } from './api';

export interface VehicleLocation {
  latitude: number;
  longitude: number;
  address: string;
  lastUpdated: string;
}

export interface AssignedDriver {
  id: string;
  name: string;
  email: string;
}

export interface DangerousGood {
  unNumber: string;
  properShippingName: string;
  class: string;
  packingGroup: string;
  quantity: string;
}

export interface ActiveShipment {
  id: string;
  trackingNumber: string;
  status: string;
  origin: string;
  destination: string;
  customerName: string;
  estimatedDelivery: string | null;
  hasDangerousGoods: boolean;
  dangerousGoods: DangerousGood[];
  emergencyContact: string;
  specialInstructions: string;
}

export interface Vehicle {
  id: string;
  registration: string;
  type: string;
  status: string;
  location: VehicleLocation;
  locationIsFresh: boolean;
  assignedDriver: AssignedDriver | null;
  activeShipment: ActiveShipment | null;
  make: string;
  year: number | null;
  configuration: string;
  maxWeight: number | null;
  maxLength: number | null;
  axles: number | null;
  engineSpec: string;
  gearbox: string;
  fuel: string;
  odometer: number | null;
  nextService: string | null;
  lastInspection: string | null;
}

export interface FleetStatusResponse {
  vehicles: Vehicle[];
  timestamp: string;
}

export interface VehicleCreateData {
  registration_number: string;
  vehicle_type: string;
  make?: string;
  year?: number;
  configuration?: string;
  gvm_kg?: number;
  max_length_m?: number;
  axles?: number;
  engine_details?: string;
  transmission?: string;
  fuel_type?: string;
  owning_company?: string;
  assigned_depot?: string;
}

export interface VehicleUpdateData extends Partial<VehicleCreateData> {
  status?: string;
  odometer_km?: number;
  next_service_date?: string;
  last_inspection_date?: string;
}

export interface AssignDriverData {
  driver_id: string;
}

export interface SafetyEquipment {
  id: string;
  equipment_type: {
    id: string;
    name: string;
    category: string;
    description: string;
  };
  serial_number: string;
  manufacturer: string;
  model: string;
  installation_date: string;
  expiry_date: string | null;
  next_inspection_date: string | null;
  status: string;
}

export interface VehicleDetail extends Vehicle {
  safety_equipment: SafetyEquipment[];
  compliance_status: {
    is_compliant: boolean;
    missing_equipment: string[];
    expired_equipment: string[];
    inspection_due: string[];
  };
}

class VehicleService {
  private baseUrl = '/vehicles';

  // Get fleet status with real-time data
  async getFleetStatus(params?: {
    limit?: number;
    userRole?: string;
    userId?: string;
  }): Promise<FleetStatusResponse> {
    try {
      const response = await apiHelpers.get(`${this.baseUrl}/fleet-status/`, params);
      return response;
    } catch (error) {
      console.error('Failed to fetch fleet status:', error);
      throw new Error('Failed to fetch fleet status');
    }
  }

  // Get all vehicles with filtering
  async getVehicles(params?: {
    vehicle_type?: string;
    status?: string;
    assigned_depot?: string;
    owning_company?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ results: Vehicle[]; count: number }> {
    try {
      const response = await apiHelpers.get(this.baseUrl + '/', params);
      return response;
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      throw new Error('Failed to fetch vehicles');
    }
  }

  // Get single vehicle details
  async getVehicle(vehicleId: string): Promise<VehicleDetail> {
    try {
      const response = await apiHelpers.get(`${this.baseUrl}/${vehicleId}/`);
      return response;
    } catch (error) {
      console.error(`Failed to fetch vehicle ${vehicleId}:`, error);
      throw new Error('Failed to fetch vehicle details');
    }
  }

  // Create new vehicle
  async createVehicle(data: VehicleCreateData): Promise<Vehicle> {
    try {
      const response = await apiHelpers.post(this.baseUrl + '/', data);
      return response;
    } catch (error) {
      console.error('Failed to create vehicle:', error);
      throw new Error('Failed to create vehicle');
    }
  }

  // Update vehicle
  async updateVehicle(vehicleId: string, data: VehicleUpdateData): Promise<Vehicle> {
    try {
      const response = await apiHelpers.patch(`${this.baseUrl}/${vehicleId}/`, data);
      return response;
    } catch (error) {
      console.error(`Failed to update vehicle ${vehicleId}:`, error);
      throw new Error('Failed to update vehicle');
    }
  }

  // Delete vehicle
  async deleteVehicle(vehicleId: string): Promise<void> {
    try {
      await apiHelpers.delete(`${this.baseUrl}/${vehicleId}/`);
    } catch (error) {
      console.error(`Failed to delete vehicle ${vehicleId}:`, error);
      throw new Error('Failed to delete vehicle');
    }
  }

  // Assign driver to vehicle
  async assignDriver(vehicleId: string, driverId: string): Promise<Vehicle> {
    try {
      const response = await apiHelpers.post(
        `${this.baseUrl}/${vehicleId}/assign_driver/`,
        { driver_id: driverId }
      );
      return response;
    } catch (error) {
      console.error(`Failed to assign driver to vehicle ${vehicleId}:`, error);
      throw new Error('Failed to assign driver');
    }
  }

  // Get available vehicles at depot
  async getAvailableVehiclesAtDepot(depotId: string): Promise<Vehicle[]> {
    try {
      const response = await apiHelpers.get(
        `${this.baseUrl}/available_at_depot/`,
        { depot_id: depotId }
      );
      return response;
    } catch (error) {
      console.error(`Failed to fetch available vehicles at depot ${depotId}:`, error);
      throw new Error('Failed to fetch available vehicles');
    }
  }

  // Get vehicle safety compliance
  async getVehicleSafetyCompliance(
    vehicleId: string, 
    adrClasses?: string[]
  ): Promise<any> {
    try {
      const params = adrClasses ? { adr_classes: adrClasses } : undefined;
      const response = await apiHelpers.get(
        `${this.baseUrl}/${vehicleId}/safety_compliance/`,
        params
      );
      return response;
    } catch (error) {
      console.error(`Failed to fetch safety compliance for vehicle ${vehicleId}:`, error);
      throw new Error('Failed to fetch safety compliance');
    }
  }

  // Get ADG safety compliance
  async getADGSafetyCompliance(
    vehicleId: string,
    adgClasses?: string[]
  ): Promise<any> {
    try {
      const params = adgClasses ? { adg_classes: adgClasses } : undefined;
      const response = await apiHelpers.get(
        `${this.baseUrl}/${vehicleId}/adg-compliance/`,
        params
      );
      return response;
    } catch (error) {
      console.error(`Failed to fetch ADG compliance for vehicle ${vehicleId}:`, error);
      throw new Error('Failed to fetch ADG compliance');
    }
  }

  // Get fleet compliance report
  async getFleetComplianceReport(companyId?: string): Promise<any> {
    try {
      const params = companyId ? { company_id: companyId } : undefined;
      const response = await apiHelpers.get(
        `${this.baseUrl}/adg-fleet-report/`,
        params
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch fleet compliance report:', error);
      throw new Error('Failed to fetch fleet compliance report');
    }
  }

  // Get ADG inspections due
  async getADGInspectionsDue(daysAhead: number = 30): Promise<any> {
    try {
      const response = await apiHelpers.get(
        `${this.baseUrl}/adg-inspections-due/`,
        { days_ahead: daysAhead }
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch ADG inspections due:', error);
      throw new Error('Failed to fetch ADG inspections due');
    }
  }
}

export const vehicleService = new VehicleService();