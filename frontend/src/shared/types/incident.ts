// Incident Management Types for SafeShipper

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  full_name: string;
}

export interface Company {
  id: string;
  name: string;
  company_type: string;
}

export interface DangerousGood {
  id: string;
  un_number: string;
  proper_shipping_name: string;
  hazard_class: string;
  packing_group?: string;
}

export interface IncidentDangerousGood {
  id: string;
  dangerous_good: DangerousGood;
  quantity_involved: number;
  quantity_unit: string;
  packaging_type?: string;
  release_amount?: number;
  containment_status: 'contained' | 'partial' | 'released' | 'unknown';
}

export interface IncidentType {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncidentDocument {
  id: string;
  document_type: 'photo' | 'report' | 'witness_statement' | 'insurance_claim' | 'corrective_action' | 'other';
  title: string;
  description?: string;
  file: string;
  file_url?: string;
  uploaded_by: User;
  uploaded_at: string;
}

export interface IncidentUpdate {
  id: string;
  update_type: 'status_change' | 'assignment' | 'investigation' | 'resolution' | 'closure' | 'other';
  description: string;
  created_by: User;
  created_at: string;
  metadata: Record<string, any>;
}

export interface CorrectiveAction {
  id: string;
  title: string;
  description: string;
  assigned_to: User;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string;
  completed_at?: string;
  completion_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ShipmentInfo {
  id: string;
  tracking_number: string;
  status: string;
  customer?: string;
}

export interface VehicleInfo {
  id: string;
  registration_number: string;
  vehicle_type: string;
  driver?: string;
}

export interface DurationInfo {
  days: number;
  hours: number;
  total_hours: number;
}

// Base incident interface for list view
export interface IncidentListItem {
  id: string;
  incident_number: string;
  title: string;
  incident_type: IncidentType;
  location: string;
  address?: string;
  occurred_at: string;
  reported_at: string;
  reporter: User;
  assigned_to?: User;
  company: Company;
  status: 'reported' | 'investigating' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  injuries_count: number;
  environmental_impact: boolean;
  authority_notified: boolean;
  emergency_services_called: boolean;
  quality_impact: 'none' | 'minor' | 'moderate' | 'major' | 'severe';
  updates_count: number;
  documents_count: number;
  dangerous_goods_count: number;
  severity_display: string;
  is_overdue: boolean;
  requires_regulatory_notification: boolean;
  created_at: string;
}

// Full incident interface for detail view
export interface Incident extends IncidentListItem {
  description: string;
  coordinates?: { lat: number; lng: number };
  location_point?: any; // PostGIS point
  witnesses: User[];
  investigators: User[];
  authority_reference?: string;
  regulatory_deadline?: string;
  root_cause?: string;
  contributing_factors: string[];
  emergency_response_time?: string;
  safety_officer_notified: boolean;
  weather_conditions: Record<string, any>;
  resolution_notes?: string;
  resolved_at?: string;
  closed_at?: string;
  dangerous_goods_involved: DangerousGood[];
  dangerous_goods_details: IncidentDangerousGood[];
  duration_open: DurationInfo;
  shipment?: string;
  vehicle?: string;
  shipment_info?: ShipmentInfo;
  vehicle_info?: VehicleInfo;
  metadata: Record<string, any>;
  updated_at: string;
  documents: IncidentDocument[];
  updates: IncidentUpdate[];
  corrective_actions: CorrectiveAction[];
  property_damage_estimate?: number;
}

// Create incident request
export interface CreateIncidentRequest {
  title: string;
  description: string;
  incident_type_id: string;
  location: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  occurred_at: string;
  witness_ids?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  injuries_count?: number;
  property_damage_estimate?: number;
  environmental_impact?: boolean;
  shipment?: string;
  vehicle?: string;
  metadata?: Record<string, any>;
}

// Update incident request
export interface UpdateIncidentRequest extends Partial<CreateIncidentRequest> {
  assigned_to_id?: string;
  investigator_ids?: string[];
  status?: 'reported' | 'investigating' | 'resolved' | 'closed';
  authority_notified?: boolean;
  authority_reference?: string;
  regulatory_deadline?: string;
  root_cause?: string;
  contributing_factors?: string[];
  emergency_services_called?: boolean;
  emergency_response_time?: string;
  safety_officer_notified?: boolean;
  quality_impact?: 'none' | 'minor' | 'moderate' | 'major' | 'severe';
  weather_conditions?: Record<string, any>;
  resolution_notes?: string;
}

// Add dangerous good to incident request
export interface AddDangerousGoodRequest {
  dangerous_good_id: string;
  quantity_involved: number;
  quantity_unit?: string;
  packaging_type?: string;
  release_amount?: number;
  containment_status?: 'contained' | 'partial' | 'released' | 'unknown';
}

// Incident statistics
export interface IncidentStatistics {
  total_incidents: number;
  open_incidents: number;
  resolved_incidents: number;
  critical_incidents: number;
  incidents_by_type: Record<string, number>;
  incidents_by_status: Record<string, number>;
  incidents_by_priority: Record<string, number>;
  monthly_trend: Array<{ month: string; count: number }>;
  average_resolution_time: number;
}

// API response types
export interface IncidentListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: IncidentListItem[];
}

export interface IncidentFilters {
  status?: string | string[];
  priority?: string | string[];
  incident_type?: string;
  reporter?: string;
  assigned_to?: string;
  occurred_at__gte?: string;
  occurred_at__lte?: string;
  reported_at__gte?: string;
  reported_at__lte?: string;
  environmental_impact?: boolean;
  injuries_count__gte?: number;
  authority_notified?: boolean;
  emergency_services_called?: boolean;
  hazard_class?: string;
  search?: string;
  ordering?: string;
}