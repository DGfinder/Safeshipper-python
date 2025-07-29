import { api } from "@/shared/services/api";

// Types for API responses
export interface VehicleSafetyEquipment {
  id: string;
  vehicle: string;
  vehicle_registration: string;
  equipment_type: {
    id: string;
    name: string;
    category: string;
    required_for_adr_classes: string[];
    certification_standard: string;
    minimum_capacity: string;
    inspection_interval_months: number;
  };
  serial_number: string;
  manufacturer: string;
  model: string;
  capacity: string;
  installation_date: string;
  expiry_date: string | null;
  last_inspection_date: string | null;
  next_inspection_date: string | null;
  status: "ACTIVE" | "EXPIRED" | "MAINTENANCE" | "DECOMMISSIONED";
  location_on_vehicle: string;
  certification_number: string;
  compliance_notes: string;
  is_expired: boolean;
  inspection_overdue: boolean;
  is_compliant: boolean;
  latest_inspection?: SafetyEquipmentInspection;
  certifications: SafetyEquipmentCertification[];
}

export interface SafetyEquipmentInspection {
  id: string;
  inspection_type: "ROUTINE" | "MAINTENANCE" | "INCIDENT" | "PRE_TRIP" | "CERTIFICATION";
  inspection_date: string;
  inspector: string;
  inspector_name: string;
  result: "PASSED" | "FAILED" | "CONDITIONAL" | "MAINTENANCE_REQUIRED";
  findings: string;
  actions_required: string;
  next_inspection_due: string | null;
  maintenance_completed: boolean;
}

export interface SafetyEquipmentCertification {
  id: string;
  certification_type: "MANUFACTURING" | "TESTING" | "CALIBRATION" | "COMPLIANCE" | "WARRANTY" | "OTHER";
  certificate_number: string;
  issuing_authority: string;
  standard_reference: string;
  issue_date: string;
  expiry_date: string | null;
  document_file: string | null;
  notes: string;
  is_valid: boolean;
}

export interface VehicleComplianceStatus {
  vehicle_id: string;
  vehicle_registration: string;
  adr_classes: string[];
  compliant: boolean;
  issues: string[];
  equipment_summary: {
    [category: string]: {
      name: string;
      capacity: string;
      expiry_date: string | null;
      compliant: boolean;
    }[];
  };
}

export interface FleetComplianceStats {
  total_vehicles: number;
  compliant_vehicles: number;
  non_compliant_vehicles: number;
  compliance_percentage: number;
  equipment_expiring_30_days: number;
  certifications_expiring_60_days: number;
  inspections_overdue: number;
  vehicles_without_equipment: number;
}

export interface ADGFleetReport {
  total_vehicles: number;
  adg_compliant_vehicles: number;
  non_compliant_vehicles: number;
  vehicles_without_equipment: number;
  compliance_percentage: number;
  australian_standards_percentage: number;
  compliance_by_level: {
    [level: string]: number;
  };
  compliance_summary: {
    vehicle_id: string;
    vehicle_registration: string;
    compliance_level: string;
    issues: string[];
  }[];
  critical_issues: string[];
  upcoming_adg_inspections: {
    vehicle_registration: string;
    equipment_name: string;
    inspection_due: string;
    days_overdue?: number;
  }[];
  generated_at: string;
  regulatory_framework: string;
}

export interface EquipmentFilter {
  vehicle_id?: string;
  equipment_type?: string;
  status?: string;
  search?: string;
  expiring_days?: number;
  inspection_due?: boolean;
}

class FleetComplianceService {
  private baseUrl = "/api/v1/vehicles";

  // Vehicle Safety Equipment Management
  async getVehicleSafetyEquipment(filters?: EquipmentFilter): Promise<VehicleSafetyEquipment[]> {
    const params = new URLSearchParams();
    
    if (filters?.vehicle_id) params.append("vehicle_id", filters.vehicle_id);
    if (filters?.equipment_type) params.append("equipment_type__category", filters.equipment_type);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.search) params.append("search", filters.search);
    
    const response = await api.get(`${this.baseUrl}/safety-equipment/?${params.toString()}`);
    return response.data;
  }

  async createSafetyEquipment(data: Partial<VehicleSafetyEquipment>): Promise<VehicleSafetyEquipment> {
    const response = await api.post(`${this.baseUrl}/safety-equipment/`, data);
    return response.data;
  }

  async updateSafetyEquipment(id: string, data: Partial<VehicleSafetyEquipment>): Promise<VehicleSafetyEquipment> {
    const response = await api.patch(`${this.baseUrl}/safety-equipment/${id}/`, data);
    return response.data;
  }

  async deleteSafetyEquipment(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/safety-equipment/${id}/`);
  }

  // Equipment Expiration and Inspection Tracking
  async getExpiringEquipment(days = 30): Promise<VehicleSafetyEquipment[]> {
    const response = await api.get(`${this.baseUrl}/safety-equipment/expiring_soon/?days=${days}`);
    return response.data;
  }

  async getInspectionDueEquipment(): Promise<VehicleSafetyEquipment[]> {
    const response = await api.get(`${this.baseUrl}/safety-equipment/inspection_due/`);
    return response.data;
  }

  async scheduleInspection(equipmentId: string, data: {
    inspection_date: string;
    inspection_type?: string;
    inspector?: string;
  }): Promise<SafetyEquipmentInspection> {
    const response = await api.post(
      `${this.baseUrl}/safety-equipment/${equipmentId}/schedule_inspection/`, 
      data
    );
    return response.data;
  }

  // Vehicle Compliance Checking
  async checkVehicleCompliance(vehicleId: string, adrClasses?: string[]): Promise<VehicleComplianceStatus> {
    const params = new URLSearchParams();
    if (adrClasses && adrClasses.length > 0) {
      adrClasses.forEach(cls => params.append("adr_classes", cls));
    }
    
    const response = await api.get(`${this.baseUrl}/${vehicleId}/safety_compliance/?${params.toString()}`);
    return response.data;
  }

  async getVehicleADGCompliance(vehicleId: string, adgClasses?: string[]): Promise<any> {
    const params = new URLSearchParams();
    if (adgClasses && adgClasses.length > 0) {
      adgClasses.forEach(cls => params.append("adg_classes", cls));
    }
    
    const response = await api.get(`${this.baseUrl}/${vehicleId}/adg-compliance/?${params.toString()}`);
    return response.data;
  }

  // Fleet-wide Compliance Reporting
  async getFleetComplianceStats(): Promise<FleetComplianceStats> {
    // This would be a custom endpoint that aggregates compliance data
    const response = await api.get(`${this.baseUrl}/fleet-compliance-stats/`);
    return response.data;
  }

  async generateADGFleetReport(companyId?: string): Promise<ADGFleetReport> {
    const params = new URLSearchParams();
    if (companyId) params.append("company_id", companyId);
    
    const response = await api.get(`${this.baseUrl}/adg-fleet-report/?${params.toString()}`);
    return response.data;
  }

  async getUpcomingADGInspections(daysAhead = 30): Promise<any[]> {
    const response = await api.get(`${this.baseUrl}/adg-inspections-due/?days_ahead=${daysAhead}`);
    return response.data.inspections_due;
  }

  // Safety Equipment Type Management
  async getSafetyEquipmentTypes(): Promise<any[]> {
    const response = await api.get(`${this.baseUrl}/safety-equipment-types/`);
    return response.data;
  }

  // Inspection Management
  async getInspections(equipmentId?: string): Promise<SafetyEquipmentInspection[]> {
    const params = new URLSearchParams();
    if (equipmentId) params.append("equipment", equipmentId);
    
    const response = await api.get(`${this.baseUrl}/inspections/?${params.toString()}`);
    return response.data;
  }

  async createInspection(data: Partial<SafetyEquipmentInspection>): Promise<SafetyEquipmentInspection> {
    const response = await api.post(`${this.baseUrl}/inspections/`, data);
    return response.data;
  }

  async updateInspection(id: string, data: Partial<SafetyEquipmentInspection>): Promise<SafetyEquipmentInspection> {
    const response = await api.patch(`${this.baseUrl}/inspections/${id}/`, data);
    return response.data;
  }

  // Certification Management
  async getCertifications(equipmentId?: string): Promise<SafetyEquipmentCertification[]> {
    const params = new URLSearchParams();
    if (equipmentId) params.append("equipment", equipmentId);
    
    const response = await api.get(`${this.baseUrl}/certifications/?${params.toString()}`);
    return response.data;
  }

  async getExpiringCertifications(days = 60): Promise<SafetyEquipmentCertification[]> {
    const response = await api.get(`${this.baseUrl}/certifications/expiring_soon/?days=${days}`);
    return response.data;
  }

  async createCertification(data: Partial<SafetyEquipmentCertification>): Promise<SafetyEquipmentCertification> {
    const response = await api.post(`${this.baseUrl}/certifications/`, data);
    return response.data;
  }

  async updateCertification(id: string, data: Partial<SafetyEquipmentCertification>): Promise<SafetyEquipmentCertification> {
    const response = await api.patch(`${this.baseUrl}/certifications/${id}/`, data);
    return response.data;
  }

  // Bulk Operations
  async bulkUpdateEquipmentStatus(equipmentIds: string[], status: string): Promise<void> {
    await api.post(`${this.baseUrl}/safety-equipment/bulk_update_status/`, {
      equipment_ids: equipmentIds,
      status
    });
  }

  async bulkScheduleInspections(equipmentIds: string[], inspectionDate: string): Promise<void> {
    await api.post(`${this.baseUrl}/safety-equipment/bulk_schedule_inspections/`, {
      equipment_ids: equipmentIds,
      inspection_date: inspectionDate
    });
  }

  // Export and Reporting
  async exportComplianceReport(format: "pdf" | "csv" | "xlsx" = "pdf", filters?: EquipmentFilter): Promise<Blob> {
    const params = new URLSearchParams();
    params.append("format", format);
    
    if (filters?.vehicle_id) params.append("vehicle_id", filters.vehicle_id);
    if (filters?.equipment_type) params.append("equipment_type", filters.equipment_type);
    if (filters?.status) params.append("status", filters.status);
    
    const response = await api.get(`${this.baseUrl}/export/compliance-report/?${params.toString()}`, {
      responseType: "blob"
    });
    
    return response.data;
  }

  async exportADGFleetReport(format: "pdf" | "csv" = "pdf", companyId?: string): Promise<Blob> {
    const params = new URLSearchParams();
    params.append("format", format);
    if (companyId) params.append("company_id", companyId);
    
    const response = await api.get(`${this.baseUrl}/export/adg-fleet-report/?${params.toString()}`, {
      responseType: "blob"
    });
    
    return response.data;
  }

  // Download exported file
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const fleetComplianceService = new FleetComplianceService();