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
  async updateShipmentStatus(shipmentId: string, status: string): Promise<Shipment> {
    return this.makeRequest<Shipment>(`/shipments/${shipmentId}/update-status/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}

export const apiService = new ApiService();
export default apiService;