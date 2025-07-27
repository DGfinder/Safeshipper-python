/**
 * Emergency Procedure Guide (EPG) Type Definitions
 */

export interface EmergencyContact {
  poison_control?: string;
  emergency_services?: string;
  chemtrec?: string;
  company_emergency?: string;
}

export interface IsolationDistances {
  spill?: {
    small: number;
    large: number;
  };
  fire?: {
    initial: number;
    full: number;
  };
}

export interface ProtectiveActionDistances {
  day?: {
    initial: number;
    protective: number;
  };
  night?: {
    initial: number;
    protective: number;
  };
}

export interface HazardAssessment {
  primary_hazard_classes: string[];
  subsidiary_risks: string[];
  overall_severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  applicable_emergency_types: string[];
  dangerous_goods_count: number;
  compatibility_assessment: {
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    concerns: string[];
    recommendations: string[];
  };
  dangerous_goods_details: Array<{
    un_number: string;
    proper_shipping_name: string;
    hazard_class: string;
    packing_group?: string;
  }>;
}

export interface SpecializedProcedure {
  applicable_to: string;
  procedure: string;
}

export interface NotificationTimeline {
  immediate: string[];
  within_15_minutes: string[];
  within_1_hour: string[];
}

export interface NotificationMatrix {
  [emergencyType: string]: {
    emergency_type: string;
    notification_timeline: NotificationTimeline;
  };
}

export interface EmergencyProcedureGuide {
  id: string;
  dangerous_good?: string;
  dangerous_good_display?: string;
  epg_number: string;
  title: string;
  hazard_class: string;
  subsidiary_risks: string[];
  emergency_types: string[];
  immediate_actions: string;
  personal_protection: string;
  fire_procedures: string;
  spill_procedures: string;
  medical_procedures: string;
  evacuation_procedures: string;
  notification_requirements: string;
  emergency_contacts: { [countryCode: string]: EmergencyContact };
  isolation_distances: IsolationDistances;
  protective_action_distances: ProtectiveActionDistances;
  environmental_precautions: string;
  water_pollution_response: string;
  transport_specific_guidance?: string;
  weather_considerations?: string;
  status: 'ACTIVE' | 'DRAFT' | 'UNDER_REVIEW' | 'ARCHIVED';
  status_display: string;
  severity_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  severity_level_display: string;
  version: string;
  effective_date: string;
  review_date: string;
  regulatory_references: string[];
  country_code: string;
  is_active: boolean;
  is_due_for_review: boolean;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface ShipmentEmergencyPlan {
  id: string;
  shipment: string;
  shipment_display: string;
  plan_number: string;
  referenced_epgs: string[];
  referenced_epgs_display: Array<{
    id: string;
    epg_number: string;
    title: string;
  }>;
  executive_summary: string;
  hazard_assessment: HazardAssessment;
  immediate_response_actions: string;
  specialized_procedures: {
    fire_response?: SpecializedProcedure[];
    spill_response?: SpecializedProcedure[];
    exposure_response?: SpecializedProcedure[];
    transport_accident_response?: SpecializedProcedure[];
  };
  route_emergency_contacts: {
    origin?: EmergencyContact;
    destination?: EmergencyContact;
    en_route?: EmergencyContact;
  };
  hospital_locations: Array<{
    name: string;
    address: string;
    phone: string;
    distance_km: number;
  }>;
  special_considerations: string;
  notification_matrix: NotificationMatrix;
  status: 'GENERATED' | 'REVIEWED' | 'APPROVED' | 'ACTIVE' | 'EXPIRED';
  status_display: string;
  generated_at: string;
  generated_by: string;
  generated_by_name: string;
  reviewed_at?: string;
  reviewed_by?: string;
  reviewed_by_name?: string;
  approved_at?: string;
  approved_by?: string;
  approved_by_name?: string;
}

export interface EmergencyIncident {
  id: string;
  incident_number: string;
  shipment?: string;
  emergency_plan?: string;
  incident_type: 'FIRE' | 'SPILL' | 'EXPOSURE' | 'TRANSPORT_ACCIDENT' | 'CONTAINER_DAMAGE' | 'ENVIRONMENTAL' | 'MULTI_HAZARD';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location: string;
  incident_datetime: string;
  response_actions_taken: string;
  response_effectiveness: 'EXCELLENT' | 'GOOD' | 'ADEQUATE' | 'POOR' | 'FAILED';
  lessons_learned: string;
  epg_improvements: string;
  created_at: string;
  updated_at: string;
}

export interface EPGSearchFilters {
  hazard_class?: string;
  status?: string;
  severity_level?: string;
  emergency_type?: string;
  country_code?: string;
  due_for_review?: boolean;
}

export interface EPGSearchResult {
  count: number;
  next?: string;
  previous?: string;
  results: EmergencyProcedureGuide[];
}

export interface EPGStatistics {
  total_epgs: number;
  active_epgs: number;
  due_for_review: number;
  by_hazard_class: { [hazardClass: string]: number };
  by_severity: { [severity: string]: number };
  recent_updates: number;
}

export interface EmergencyPlanGenerationRequest {
  shipment_id: string;
  force_regenerate?: boolean;
}

export interface EmergencyPlanGenerationResponse {
  plan: ShipmentEmergencyPlan;
  generation_log: string[];
  warnings: string[];
}