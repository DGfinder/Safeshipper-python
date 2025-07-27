// Centralized vehicle type transformation utilities
// Handles conversion between Vehicle (camelCase API) and FleetVehicle (snake_case UI) types

import { Vehicle } from '@/shared/services/vehicleService';
import { FleetVehicle, DangerousGoodsInfo } from '@/shared/hooks/useFleetTracking';

/**
 * Transform Vehicle (API format) to FleetVehicle (UI format)
 * Converts camelCase properties to snake_case for UI components
 */
export const transformVehicleToFleetVehicle = (vehicle: Vehicle): FleetVehicle => {
  return {
    id: vehicle.id,
    registration_number: vehicle.registration,
    vehicle_type: vehicle.type,
    status: vehicle.status,
    location: vehicle.location ? {
      lat: vehicle.location.latitude,
      lng: vehicle.location.longitude,
    } : null,
    location_is_fresh: vehicle.locationIsFresh,
    assigned_driver: vehicle.assignedDriver,
    active_shipment: vehicle.activeShipment ? {
      id: vehicle.activeShipment.id,
      tracking_number: vehicle.activeShipment.trackingNumber,
      status: vehicle.activeShipment.status,
      origin_location: vehicle.activeShipment.origin,
      destination_location: vehicle.activeShipment.destination,
      customer_name: vehicle.activeShipment.customerName,
      estimated_delivery_date: vehicle.activeShipment.estimatedDelivery || undefined,
      dangerous_goods: vehicle.activeShipment.dangerousGoods?.map(transformDangerousGoodsToUI) || [],
      has_dangerous_goods: vehicle.activeShipment.hasDangerousGoods,
      emergency_contact: vehicle.activeShipment.emergencyContact,
      special_instructions: vehicle.activeShipment.specialInstructions,
    } : null,
    company: null, // Vehicle type doesn't have company field in API
  };
};

/**
 * Transform multiple Vehicle objects to FleetVehicle objects
 */
export const transformVehiclesToFleetVehicles = (vehicles: Vehicle[]): FleetVehicle[] => {
  return vehicles.map(transformVehicleToFleetVehicle);
};

/**
 * Transform DangerousGood (API format) to DangerousGoodsInfo (UI format)
 */
const transformDangerousGoodsToUI = (dg: any): DangerousGoodsInfo => {
  return {
    un_number: dg.unNumber,
    proper_shipping_name: dg.properShippingName,
    hazard_class: dg.class,
    packing_group: dg.packingGroup,
    quantity: dg.quantity,
  };
};

/**
 * Type guard to check if data is in Vehicle format (API)
 */
export const isVehicleFormat = (data: any): data is Vehicle => {
  return data && typeof data === 'object' && 'registration' in data && 'type' in data;
};

/**
 * Type guard to check if data is in FleetVehicle format (UI)
 */
export const isFleetVehicleFormat = (data: any): data is FleetVehicle => {
  return data && typeof data === 'object' && 'registration_number' in data && 'vehicle_type' in data;
};

/**
 * Utility to ensure vehicle data is in FleetVehicle format for UI components
 * Automatically transforms if needed
 */
export const ensureFleetVehicleFormat = (vehicle: Vehicle | FleetVehicle): FleetVehicle => {
  if (isFleetVehicleFormat(vehicle)) {
    return vehicle;
  }
  if (isVehicleFormat(vehicle)) {
    return transformVehicleToFleetVehicle(vehicle);
  }
  throw new Error('Invalid vehicle data format');
};

/**
 * Utility to ensure multiple vehicles are in FleetVehicle format for UI components
 */
export const ensureFleetVehiclesFormat = (vehicles: (Vehicle | FleetVehicle)[]): FleetVehicle[] => {
  return vehicles.map(ensureFleetVehicleFormat);
};