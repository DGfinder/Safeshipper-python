/**
 * Type definitions for dangerous goods and related entities
 */

export interface DangerousGood {
  id: string;
  un_number: string;
  proper_shipping_name: string;
  simplified_name?: string;
  hazard_class: string;
  subsidiary_risks?: string;
  packing_group?: 'I' | 'II' | 'III' | 'NONE';
  hazard_labels_required?: string;
  special_provisions?: string;
  limited_quantities_exception?: string;
  excepted_quantities_exception?: string;
  physical_form?: 'SOLID' | 'LIQUID' | 'GAS' | 'UNKNOWN';
  flash_point_celsius?: number;
  technical_name?: string;
  cas_number?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CompatibilityResult {
  compatibility_level: 'compatible' | 'caution' | 'incompatible';
  description: string;
  recommendations: string[];
  segregation_distance?: string;
  created_at: Date;
}

export interface CompatibilityCheck {
  material1: DangerousGood;
  material2: DangerousGood;
  result: CompatibilityResult;
}

export interface CompatibilityMatrix {
  materials: DangerousGood[];
  results: {
    [material1Id: string]: {
      [material2Id: string]: CompatibilityResult;
    };
  };
}

export interface PhAnalysisResult {
  ph_value: number;
  classification: 'strongly_acidic' | 'acidic' | 'neutral' | 'alkaline' | 'strongly_alkaline';
  description: string;
  segregation_requirements: string[];
  safety_recommendations: string[];
  created_at: Date;
}

export interface PHAnalysis {
  material: DangerousGood;
  result: PhAnalysisResult;
}

export interface SearchFilters {
  hazardClass?: string[];
  packingGroup?: string[];
  physicalForm?: string[];
  query?: string;
}

export interface SearchResult {
  items: DangerousGood[];
  totalCount: number;
  hasMore: boolean;
  nextPage?: number;
}

export interface HazardClassInfo {
  class: string;
  name: string;
  description: string;
  color: string;
  iconPath: string;
  examples: string[];
}

export interface SegregationRule {
  class1: string;
  class2: string;
  segregationType: 'AWAY_FROM' | 'SEPARATED_FROM' | 'SEPARATED_BY' | 'CLEAR_OF';
  minDistance: number; // in meters
  restrictions: string[];
}

export interface EmergencyProcedure {
  id: string;
  unNumber: string;
  emergencySchedule: string;
  fireResponse: string[];
  spillageResponse: string[];
  firstAid: string[];
  personalProtection: string[];
  emergencyContacts: {
    authority: string;
    phoneNumber: string;
    region: string;
  }[];
}

export interface SDS {
  id: string;
  dangerousGoodId: string;
  documentUrl: string;
  manufacturer: string;
  revisionDate: Date;
  sections: {
    identification: any;
    hazardIdentification: any;
    composition: any;
    firstAidMeasures: any;
    fireFightingMeasures: any;
    accidentalReleaseMeasures: any;
    handlingAndStorage: any;
    exposureControlsPersonalProtection: any;
    physicalAndChemicalProperties: any;
    stabilityAndReactivity: any;
    toxicologicalInformation: any;
    ecologicalInformation: any;
    disposalConsiderations: any;
    transportInformation: any;
    regulatoryInformation: any;
    otherInformation: any;
  };
}

export interface VoiceSearchResult {
  transcript: string;
  confidence: number;
  suggestions: DangerousGood[];
}

export interface OfflineData {
  dangerousGoods: DangerousGood[];
  hazardClasses: HazardClassInfo[];
  segregationRules: SegregationRule[];
  lastSync: Date;
  version: string;
}