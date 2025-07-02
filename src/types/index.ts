// User types
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  role: 'admin' | 'dispatch' | 'driver';
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'dispatch' | 'driver';
}

export interface UserUpdate {
  email?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  role?: 'admin' | 'dispatch' | 'driver';
}

// Company types
export interface Company {
  id: number;
  name: string;
  abn: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyCreate {
  name: string;
  abn: string;
}

export interface CompanyUpdate {
  name?: string;
  abn?: string;
  is_active?: boolean;
}

// Vehicle types
export interface Vehicle {
  id: number;
  registration_number: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleCreate {
  registration_number: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  capacity: number;
}

export interface VehicleUpdate {
  registration_number?: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  capacity?: number;
  is_active?: boolean;
}

// Dangerous Goods types
export interface DangerousGood {
  id: number;
  un_number: string;
  proper_shipping_name: string;
  class: string;
  packing_group: string;
  is_bulk_transport_allowed: boolean;
  created_at: string;
  updated_at: string;
}

export interface DangerousGoodCreate {
  un_number: string;
  proper_shipping_name: string;
  class: string;
  packing_group: string;
  is_bulk_transport_allowed: boolean;
}

export interface DangerousGoodUpdate {
  un_number?: string;
  proper_shipping_name?: string;
  class?: string;
  packing_group?: string;
  is_bulk_transport_allowed?: boolean;
}

// Location types
export interface Location {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  location_type: 'depot' | 'customer' | 'supplier';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationCreate {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  location_type: 'depot' | 'customer' | 'supplier';
}

export interface LocationUpdate {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  location_type?: 'depot' | 'customer' | 'supplier';
  is_active?: boolean;
}

// Authentication types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
}

export interface AuthUser {
  user: User;
  token: string;
} 