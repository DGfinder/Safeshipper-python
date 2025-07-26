// Real Shipment API Service - replaces mock services
import { apiHelpers } from './api';

export interface ShipmentEvent {
  id: string;
  timestamp: string;
  user: {
    name: string;
    role: string;
  };
  event_type: string;
  details: string;
}

export interface InspectionItem {
  id: string;
  description: string;
  status: 'PASS' | 'FAIL' | 'NOT_APPLICABLE';
  photos: string[];
  notes: string;
}

export interface Inspection {
  id: string;
  shipment_id: string;
  inspector: {
    name: string;
    role: string;
  };
  inspection_type: string;
  timestamp: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  items: InspectionItem[];
}

export interface ProofOfDelivery {
  id: string;
  shipment_id: string;
  signature: string;
  photos: string[];
  recipient: string;
  timestamp: string;
  driver: {
    name: string;
    id: string;
  };
}

export interface PublicTrackingInfo {
  tracking_number: string;
  status: string;
  status_display: string;
  customer_reference: string;
  origin_location: string;
  destination_location: string;
  estimated_delivery_date: string | null;
  created_at: string;
  updated_at: string;
  vehicle_location: {
    latitude: number;
    longitude: number;
    last_updated: string;
    is_fresh: boolean;
  } | null;
  driver_name: string;
  vehicle_registration: string;
  status_timeline: Array<{
    status: string;
    timestamp: string;
    description: string;
  }>;
  route_info: {
    has_live_tracking: boolean;
    tracking_available: boolean;
    note: string;
  };
  documents: Array<{
    id: string;
    type: string;
    type_display: string;
    filename: string;
    status: string;
    status_display: string;
    upload_date: string;
    download_url: string;
  }>;
  communications: Array<{
    id: string;
    type: string;
    type_display: string;
    subject: string;
    message: string;
    sent_at: string;
    sender: string;
    status: string;
  }>;
  items_summary: {
    total_items: number;
    total_weight_kg: number;
    has_dangerous_goods: boolean;
    dangerous_goods_count: number;
  };
  proof_of_delivery?: {
    delivery_date: string;
    recipient_name: string;
    recipient_signature_url: string;
    delivery_photos: string[];
    delivery_notes: string;
    delivered_by: string;
  };
}

export interface Shipment {
  id: string;
  tracking_number: string;
  status: string;
  origin_location: string;
  destination_location: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  estimated_delivery_date: string | null;
  created_at: string;
  updated_at: string;
  has_dangerous_goods: boolean;
  items_count: number;
  total_weight_kg: number;
  assigned_vehicle?: {
    id: string;
    registration_number: string;
  };
  assigned_driver?: {
    id: string;
    name: string;
  };
}

export interface ShipmentCreateData {
  customer_id: string;
  origin_location: string;
  destination_location: string;
  estimated_delivery_date?: string;
  special_instructions?: string;
  emergency_contact?: string;
  items: Array<{
    description: string;
    quantity: number;
    weight_kg: number;
    dimensions?: {
      length_cm: number;
      width_cm: number;
      height_cm: number;
    };
    dangerous_good_id?: string;
  }>;
}

export interface AddEventData {
  shipment_id: string;
  event_type: string;
  details: string;
}

export interface CreateInspectionData {
  shipment_id: string;
  inspection_type: string;
  items: Array<{
    description: string;
    status: 'PASS' | 'FAIL' | 'NOT_APPLICABLE';
    photos?: string[];
    notes?: string;
  }>;
}

export interface SubmitPODData {
  shipment_id: string;
  signature: string;
  photos: string[];
  recipient: string;
  delivery_notes?: string;
}

class ShipmentService {
  private baseUrl = '/shipments';

  // Get all shipments with filtering
  async getShipments(params?: {
    status?: string;
    customer_id?: string;
    assigned_driver?: string;
    has_dangerous_goods?: boolean;
    created_after?: string;
    created_before?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ results: Shipment[]; count: number }> {
    try {
      const response = await apiHelpers.get(this.baseUrl + '/', params);
      return response;
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
      throw new Error('Failed to fetch shipments');
    }
  }

  // Get single shipment details
  async getShipment(shipmentId: string): Promise<Shipment> {
    try {
      const response = await apiHelpers.get(`${this.baseUrl}/${shipmentId}/`);
      return response;
    } catch (error) {
      console.error(`Failed to fetch shipment ${shipmentId}:`, error);
      throw new Error('Failed to fetch shipment details');
    }
  }

  // Create new shipment
  async createShipment(data: ShipmentCreateData): Promise<Shipment> {
    try {
      const response = await apiHelpers.post(this.baseUrl + '/', data);
      return response;
    } catch (error) {
      console.error('Failed to create shipment:', error);
      throw new Error('Failed to create shipment');
    }
  }

  // Update shipment
  async updateShipment(shipmentId: string, data: Partial<ShipmentCreateData>): Promise<Shipment> {
    try {
      const response = await apiHelpers.patch(`${this.baseUrl}/${shipmentId}/`, data);
      return response;
    } catch (error) {
      console.error(`Failed to update shipment ${shipmentId}:`, error);
      throw new Error('Failed to update shipment');
    }
  }

  // Delete shipment
  async deleteShipment(shipmentId: string): Promise<void> {
    try {
      await apiHelpers.delete(`${this.baseUrl}/${shipmentId}/`);
    } catch (error) {
      console.error(`Failed to delete shipment ${shipmentId}:`, error);
      throw new Error('Failed to delete shipment');
    }
  }

  // Get shipment events/activity log
  async getShipmentEvents(shipmentId: string): Promise<ShipmentEvent[]> {
    try {
      const response = await apiHelpers.get(`${this.baseUrl}/${shipmentId}/events/`);
      return response.results || response;
    } catch (error) {
      console.error(`Failed to fetch events for shipment ${shipmentId}:`, error);
      throw new Error('Failed to fetch shipment events');
    }
  }

  // Add event to shipment
  async addShipmentEvent(data: AddEventData): Promise<ShipmentEvent> {
    try {
      const response = await apiHelpers.post(
        `${this.baseUrl}/${data.shipment_id}/events/`,
        {
          event_type: data.event_type,
          details: data.details
        }
      );
      return response;
    } catch (error) {
      console.error('Failed to add shipment event:', error);
      throw new Error('Failed to add shipment event');
    }
  }

  // Get shipment inspections
  async getShipmentInspections(shipmentId: string): Promise<Inspection[]> {
    try {
      const response = await apiHelpers.get(`${this.baseUrl}/${shipmentId}/inspections/`);
      return response.results || response;
    } catch (error) {
      console.error(`Failed to fetch inspections for shipment ${shipmentId}:`, error);
      throw new Error('Failed to fetch shipment inspections');
    }
  }

  // Create shipment inspection
  async createShipmentInspection(data: CreateInspectionData): Promise<Inspection> {
    try {
      const response = await apiHelpers.post(
        `${this.baseUrl}/${data.shipment_id}/inspections/`,
        {
          inspection_type: data.inspection_type,
          items: data.items
        }
      );
      return response;
    } catch (error) {
      console.error('Failed to create shipment inspection:', error);
      throw new Error('Failed to create shipment inspection');
    }
  }

  // Submit proof of delivery
  async submitProofOfDelivery(data: SubmitPODData): Promise<ProofOfDelivery> {
    try {
      const response = await apiHelpers.post(
        `${this.baseUrl}/${data.shipment_id}/proof-of-delivery/`,
        {
          signature: data.signature,
          photos: data.photos,
          recipient: data.recipient,
          delivery_notes: data.delivery_notes
        }
      );
      return response;
    } catch (error) {
      console.error('Failed to submit proof of delivery:', error);
      throw new Error('Failed to submit proof of delivery');
    }
  }

  // Get public tracking information (no auth required)
  async getPublicTracking(trackingNumber: string): Promise<PublicTrackingInfo> {
    try {
      const response = await apiHelpers.get(`/public/tracking/${trackingNumber}/`);
      return response;
    } catch (error) {
      console.error(`Failed to fetch public tracking for ${trackingNumber}:`, error);
      throw new Error('Failed to fetch tracking information');
    }
  }

  // Assign vehicle to shipment
  async assignVehicle(shipmentId: string, vehicleId: string): Promise<Shipment> {
    try {
      const response = await apiHelpers.post(
        `${this.baseUrl}/${shipmentId}/assign-vehicle/`,
        { vehicle_id: vehicleId }
      );
      return response;
    } catch (error) {
      console.error(`Failed to assign vehicle to shipment ${shipmentId}:`, error);
      throw new Error('Failed to assign vehicle');
    }
  }

  // Assign driver to shipment
  async assignDriver(shipmentId: string, driverId: string): Promise<Shipment> {
    try {
      const response = await apiHelpers.post(
        `${this.baseUrl}/${shipmentId}/assign-driver/`,
        { driver_id: driverId }
      );
      return response;
    } catch (error) {
      console.error(`Failed to assign driver to shipment ${shipmentId}:`, error);
      throw new Error('Failed to assign driver');
    }
  }

  // Update shipment status
  async updateShipmentStatus(shipmentId: string, status: string, notes?: string): Promise<Shipment> {
    try {
      const response = await apiHelpers.post(
        `${this.baseUrl}/${shipmentId}/update-status/`,
        { status, notes }
      );
      return response;
    } catch (error) {
      console.error(`Failed to update status for shipment ${shipmentId}:`, error);
      throw new Error('Failed to update shipment status');
    }
  }
}

export const shipmentService = new ShipmentService();