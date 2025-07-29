/**
 * API Service for SafeShipper Mobile App
 * Handles communication with the Django backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = __DEV__ 
  ? 'http://10.0.2.2:8000/api/v1'  // Android emulator
  : 'https://api.safeshipper.com/api/v1';  // Production

// Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  message: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  role_display: string;
  company?: {
    id: string;
    name: string;
  };
}

export interface Shipment {
  id: string;
  tracking_number: string;
  reference_number?: string;
  status: string;
  customer: {
    id: string;
    name: string;
  };
  carrier: {
    id: string;
    name: string;
  };
  origin_location: string;
  destination_location: string;
  estimated_pickup_date?: string;
  actual_pickup_date?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  instructions?: string;
  assigned_vehicle?: {
    id: string;
    registration_number: string;
    vehicle_type: string;
  };
  consignment_items?: ConsignmentItem[];
  created_at: string;
  updated_at: string;
}

export interface ConsignmentItem {
  id: string;
  description: string;
  quantity: number;
  weight_kg?: number;
  is_dangerous_good: boolean;
  dangerous_good_entry?: {
    id: string;
    un_number: string;
    proper_shipping_name: string;
    hazard_class: string;
    packing_group?: string;
  };
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp?: string;
}

export interface LocationUpdateResponse {
  message: string;
  vehicle_id: string;
  vehicle_registration: string;
  timestamp: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

// Enhanced POD Types
export interface PODSubmissionData {
  recipient_name: string;
  signature_file: string;
  delivery_notes?: string;
  delivery_location?: string;
  photos_data?: Array<{
    image_url: string;
    file_name: string;
    file_size: number;
    caption?: string;
  }>;
}

export interface PODResponse {
  id: string;
  shipment_id: string;
  shipment_tracking: string;
  status: string;
  delivered_at: string;
  driver: {
    name: string;
    id: string;
  };
  recipient: string;
  photos_processed: number;
  signature_processed: boolean;
  delivery_location?: string;
  validation_warnings: string[];
  processing_summary: {
    total_photos: number;
    signature_captured: boolean;
    shipment_status_updated: boolean;
    notifications_triggered: boolean;
  };
}

export interface PODValidationResponse {
  can_submit_pod: boolean;
  shipment_validation: {
    can_submit: boolean;
    reason: string;
    issues: string[];
  };
  data_validation: {
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  };
  overall_valid: boolean;
  recommendations: {
    required_fields: string[];
    recommended_fields: string[];
    max_photos: number;
    supported_signature_formats: string[];
  };
}

export interface PODDetailsResponse {
  has_pod: boolean;
  message?: string;
  pod_details?: {
    id: string;
    shipment: {
      id: string;
      tracking_number: string;
      customer_name: string;
      status: string;
    };
    delivered_by: {
      id: string;
      name: string;
      email: string;
    };
    recipient_name: string;
    recipient_signature_url: string;
    delivery_notes: string;
    delivery_location: string;
    delivered_at: string;
    photos: Array<{
      id: string;
      image_url: string;
      thumbnail_url?: string;
      file_name: string;
      file_size_mb?: number;
      caption: string;
      taken_at: string;
    }>;
    photo_count: number;
  };
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = BASE_URL;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('access_token');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Authentication
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>('/users/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.makeRequest('/users/auth/logout/', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.makeRequest<User>('/users/auth/me/');
  }

  // Driver Shipments
  async getDriverShipments(status?: string): Promise<Shipment[]> {
    const params = status ? `?status=${status}` : '';
    const response = await this.makeRequest<{results: Shipment[]}>(`/shipments/my-shipments/${params}`);
    return response.results || [];
  }

  async getShipmentDetail(shipmentId: string): Promise<Shipment> {
    return this.makeRequest<Shipment>(`/shipments/${shipmentId}/`);
  }

  // Location Updates
  async updateLocation(locationData: LocationUpdate): Promise<LocationUpdateResponse> {
    return this.makeRequest<LocationUpdateResponse>('/tracking/update-location/', {
      method: 'POST',
      body: JSON.stringify(locationData),
    });
  }

  // Shipment Status Updates
  async updateShipmentStatus(shipmentId: string, status: string, podData?: any): Promise<Shipment> {
    const body: any = { status };
    if (podData) {
      body.proof_of_delivery = podData;
    }
    
    return this.makeRequest<Shipment>(`/shipments/${shipmentId}/update-status/`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  // Enhanced POD Methods
  async submitPOD(shipmentId: string, podData: PODSubmissionData): Promise<PODResponse> {
    return this.makeRequest<PODResponse>(`/shipments/${shipmentId}/submit-pod/`, {
      method: 'POST',
      body: JSON.stringify(podData),
    });
  }

  async validatePODData(shipmentId: string, podData: PODSubmissionData): Promise<PODValidationResponse> {
    return this.makeRequest<PODValidationResponse>(`/shipments/${shipmentId}/validate-pod-data/`, {
      method: 'POST',
      body: JSON.stringify(podData),
    });
  }

  async getPODDetails(shipmentId: string): Promise<PODDetailsResponse> {
    return this.makeRequest<PODDetailsResponse>(`/shipments/${shipmentId}/pod-details/`);
  }

  // Enhanced Inspection Management
  async getInspectionTemplates(inspectionType?: string): Promise<any[]> {
    let url = '/inspections/templates/';
    if (inspectionType) {
      url += `?inspection_type=${inspectionType}`;
    }
    const response = await this.makeRequest<{success: boolean; templates: any[]}>(url);
    return response.templates || [];
  }

  async getShipmentInspections(shipmentId: string): Promise<any[]> {
    return this.makeRequest<any[]>(`/inspections/?shipment=${shipmentId}`);
  }

  async createInspectionFromTemplate(templateId: string, shipmentId: string): Promise<any> {
    return this.makeRequest<any>('/inspections/hazard-inspection/create-from-template/', {
      method: 'POST',
      body: JSON.stringify({
        template_id: templateId,
        shipment_id: shipmentId
      }),
    });
  }

  async updateInspectionItem(itemId: string, itemData: any): Promise<any> {
    return this.makeRequest<any>('/inspections/hazard-inspection/update-item/', {
      method: 'POST',
      body: JSON.stringify({
        item_id: itemId,
        item_data: itemData
      }),
    });
  }

  async completeInspection(inspectionId: string, completionData: any): Promise<any> {
    return this.makeRequest<any>('/inspections/hazard-inspection/complete/', {
      method: 'POST',
      body: JSON.stringify({
        inspection_id: inspectionId,
        completion_data: completionData
      }),
    });
  }

  // Legacy inspection methods for backward compatibility
  async createInspection(data: any): Promise<any> {
    return this.makeRequest<any>('/inspections/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInspection(inspectionId: string, data: any): Promise<any> {
    return this.makeRequest<any>(`/inspections/${inspectionId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Communication & Events
  async getShipmentEvents(shipmentId: string): Promise<any[]> {
    return this.makeRequest<any[]>(`/communications/events/for_shipment/?shipment_id=${shipmentId}`);
  }

  async createShipmentEvent(data: any): Promise<any> {
    return this.makeRequest<any>('/communications/events/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async postComment(shipmentId: string, details: string, mentionedUsers?: string[]): Promise<any> {
    const data = {
      shipment: shipmentId,
      details,
      mentioned_users: mentionedUsers || [],
    };
    
    return this.makeRequest<any>('/communications/events/comment/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markEventRead(eventId: string): Promise<any> {
    return this.makeRequest<any>(`/communications/events/${eventId}/mark_read/`, {
      method: 'POST',
    });
  }

  async getUnreadEventCount(): Promise<{unread_count: number}> {
    return this.makeRequest<{unread_count: number}>('/communications/events/unread_count/');
  }

  // Emergency Response System
  async initiateEmergency(shipmentId: string, emergencyType: string): Promise<any> {
    return this.makeRequest<any>('/compliance/emergency/initiate/', {
      method: 'POST',
      body: JSON.stringify({
        shipment_id: shipmentId,
        emergency_type: emergencyType,
      }),
    });
  }

  async confirmEmergency(activationToken: string, pin: string, confirmText: string): Promise<any> {
    return this.makeRequest<any>('/compliance/emergency/confirm/', {
      method: 'POST',
      body: JSON.stringify({
        activation_token: activationToken,
        pin: pin,
        confirm_text: confirmText,
      }),
    });
  }

  async activateEmergency(activationToken: string, locationData: any, notes: string, severityLevel: string): Promise<any> {
    return this.makeRequest<any>('/compliance/emergency/activate/', {
      method: 'POST',
      body: JSON.stringify({
        activation_token: activationToken,
        location: locationData,
        notes: notes,
        severity_level: severityLevel,
      }),
    });
  }

  async markFalseAlarm(emergencyId: string, reason: string): Promise<any> {
    return this.makeRequest<any>('/compliance/emergency/false-alarm/', {
      method: 'POST',
      body: JSON.stringify({
        emergency_id: emergencyId,
        reason: reason,
      }),
    });
  }

  async getEmergencyStatus(emergencyId: string): Promise<any> {
    return this.makeRequest<any>(`/compliance/emergency/status/${emergencyId}/`);
  }

  // Push Notification Management
  async registerPushToken(token: string, deviceInfo: {
    platform: string;
    app_version: string;
    device_id: string;
  }): Promise<{success: boolean; message: string}> {
    return this.makeRequest<{success: boolean; message: string}>('/notifications/register-push-token/', {
      method: 'POST',
      body: JSON.stringify({
        expo_push_token: token,
        device_platform: deviceInfo.platform,
        app_version: deviceInfo.app_version,
        device_identifier: deviceInfo.device_id
      }),
    });
  }

  async unregisterPushToken(token: string): Promise<{success: boolean; message: string}> {
    return this.makeRequest<{success: boolean; message: string}>('/notifications/unregister-push-token/', {
      method: 'DELETE',
      body: JSON.stringify({
        expo_push_token: token
      }),
    });
  }

  async updatePushTokenPreferences(preferences: {
    feedback_notifications: boolean;
    shipment_updates: boolean;
    emergency_alerts: boolean;
  }): Promise<{success: boolean; message: string}> {
    return this.makeRequest<{success: boolean; message: string}>('/notifications/push-preferences/', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    });
  }
}

export const apiService = new ApiService();
export default apiService;