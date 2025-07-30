/**
 * Audit Service - API interface for comprehensive audit and compliance monitoring
 */
import { apiHelpers } from './api';

// Type definitions for audit data
export interface AuditLog {
  id: string;
  timestamp: string;
  action_type: string;
  action_description: string;
  user: {
    id: string;
    username: string;
    email: string;
    full_name?: string;
  } | null;
  user_role: string;
  content_type?: string;
  object_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  session_key?: string;
  metadata?: any;
}

export interface ComplianceAuditLog {
  id: string;
  audit_log: AuditLog;
  company: string;
  regulation_type: string;
  compliance_status: 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNING' | 'UNDER_REVIEW' | 'REMEDIATED' | 'EXEMPTION_GRANTED';
  un_numbers_affected: string[];
  hazard_classes_affected: string[];
  shipment_reference?: string;
  vehicle_reference?: string;
  driver_reference?: string;
  violation_details?: string;
  risk_assessment_score?: number;
  regulatory_citation?: string;
  remediation_required: boolean;
  remediation_deadline?: string;
  remediation_status: 'NOT_REQUIRED' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'ESCALATED';
  regulatory_authority_notified: boolean;
  notification_reference?: string;
  estimated_financial_impact?: number;
  actual_financial_impact?: number;
  compliance_hash: string;
}

export interface DangerousGoodsAuditLog {
  id: string;
  audit_log: AuditLog;
  company: string;
  un_number: string;
  proper_shipping_name: string;
  hazard_class: string;
  subsidiary_hazard_classes: string[];
  packing_group: string;
  operation_type: string;
  operation_details: any;
  quantity_before?: number;
  quantity_after?: number;
  quantity_unit: string;
  packaging_type_before?: string;
  packaging_type_after?: string;
  adg_compliant: boolean;
  iata_compliant: boolean;
  imdg_compliant: boolean;
  compliance_notes?: string;
  emergency_response_guide?: string;
  safety_data_sheet_version?: string;
  transport_document_number?: string;
  manifest_reference?: string;
  regulatory_notification_required: boolean;
  regulatory_notification_sent: boolean;
  notification_reference_number?: string;
}

export interface ComplianceStatus {
  company_id: string;
  period: {
    start_date: string;
    end_date: string;
    days: number;
  };
  overall_compliance_score: number;
  total_audits: number;
  status_breakdown: Record<string, number>;
  risk_analysis: {
    average_risk: number;
    max_risk: number;
    min_risk: number;
    high_risk_count: number;
    critical_risk_count: number;
  };
  remediation_status: {
    required: number;
    completed: number;
    overdue: number;
    completion_rate: number;
  };
  regulation_compliance: Record<string, {
    total_audits: number;
    compliant_count: number;
    compliance_rate: number;
    violations: number;
    warnings: number;
  }>;
  dangerous_goods_compliance: {
    total_dg_audits: number;
    adg_compliance_rate: number;
    iata_compliance_rate: number;
    imdg_compliance_rate: number;
    operations_by_type: Record<string, number>;
    most_frequent_un_numbers: [string, number][];
    regulatory_notifications_pending: number;
  };
  alerts: ComplianceAlert[];
  trends: ComplianceTrend[];
  last_updated: string;
}

export interface ComplianceAlert {
  id: string;
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  count?: number;
  timestamp: string;
  requires_immediate_attention: boolean;
  type?: string;
  value?: any;
  threshold?: any;
}

export interface ComplianceTrend {
  week_start: string;
  week_end: string;
  total_audits: number;
  compliance_rate: number;
  average_risk_score: number;
}

export interface ComplianceThresholdStatus {
  status: 'WITHIN_THRESHOLDS' | 'THRESHOLD_BREACHED' | 'NO_DATA';
  violation_rate: number;
  average_risk_score: number;
  remediation_completion_rate: number;
  threshold_breaches: {
    metric: string;
    current_value: number;
    threshold: number;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
  evaluation_period: string;
  last_updated: string;
}

export interface DashboardSummary {
  overall_compliance_score: number;
  score_trend: 'up' | 'down' | 'stable';
  score_change: number;
  total_audits_30_days: number;
  active_alerts: number;
  critical_alerts: number;
  threshold_breaches: number;
  top_violation_categories: Record<string, number>;
  remediation_efficiency: number;
  dangerous_goods_audits: number;
  last_updated: string;
}

// Filter and pagination interfaces
export interface AuditLogFilters {
  action_type?: string;
  user?: string;
  user_email?: string;
  user_role?: string;
  ip_address?: string;
  date_from?: string;
  date_to?: string;
  today_only?: boolean;
  this_week?: boolean;
  this_month?: boolean;
  content_type?: string;
  object_id?: string;
  failed_logins_only?: boolean;
  security_events_only?: boolean;
  high_risk_only?: boolean;
  compliance_violations_only?: boolean;
  dangerous_goods_only?: boolean;
  search?: string;
  advanced_search?: string;
}

export interface ComplianceAuditFilters {
  regulation_type?: string;
  compliance_status?: string;
  remediation_status?: string;
  risk_score_min?: number;
  risk_score_max?: number;
  un_number?: string;
  hazard_class?: string;
  shipment_reference?: string;
  vehicle_reference?: string;
  driver_reference?: string;
  remediation_overdue?: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export class AuditService {
  private static baseUrl = '/audits/api';

  // Audit Logs API
  static async getAuditLogs(
    filters?: AuditLogFilters,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResponse<AuditLog>> {
    const params = {
      ...filters,
      page,
      page_size: pageSize,
    };
    return apiHelpers.get(`${this.baseUrl}/logs/`, params);
  }

  static async getAuditLog(id: string): Promise<AuditLog> {
    return apiHelpers.get(`${this.baseUrl}/logs/${id}/`);
  }

  static async getAuditAnalytics(filters?: {
    date_from?: string;
    date_to?: string;
  }): Promise<any> {
    return apiHelpers.get(`${this.baseUrl}/logs/analytics/`, filters);
  }

  static async searchAuditLogs(
    query: string,
    searchType: 'basic' | 'advanced' | 'semantic' = 'basic',
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResponse<AuditLog>> {
    const params = {
      q: query,
      type: searchType,
      page,
      page_size: pageSize,
    };
    return apiHelpers.get(`${this.baseUrl}/logs/search/`, params);
  }

  static async exportAuditLogs(
    format: 'csv' | 'json' | 'excel',
    filters?: AuditLogFilters
  ): Promise<Blob> {
    const data = {
      format,
      filters: filters || {},
    };
    return apiHelpers.post(`${this.baseUrl}/logs/export/`, data);
  }

  static async verifyAuditIntegrity(id: string): Promise<{
    audit_log_id: string;
    verified: boolean;
    compliance_checks: any[];
  }> {
    return apiHelpers.post(`${this.baseUrl}/logs/${id}/verify_integrity/`);
  }

  // Compliance Audit Logs API
  static async getComplianceAudits(
    filters?: ComplianceAuditFilters,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResponse<ComplianceAuditLog>> {
    const params = {
      ...filters,
      page,
      page_size: pageSize,
    };
    return apiHelpers.get(`${this.baseUrl}/compliance/`, params);
  }

  static async getComplianceDashboard(): Promise<{
    total_audits: number;
    status_breakdown: Record<string, number>;
    regulation_breakdown: Record<string, number>;
    risk_statistics: any;
    remediation_statistics: any;
    recent_violations: ComplianceAuditLog[];
    dangerous_goods_summary: any;
  }> {
    return apiHelpers.get(`${this.baseUrl}/compliance/dashboard/`);
  }

  static async getViolationsReport(filters?: {
    date_from?: string;
    date_to?: string;
    regulation_type?: string;
  }): Promise<any> {
    return apiHelpers.get(`${this.baseUrl}/compliance/violations_report/`, filters);
  }

  // Dangerous Goods Audit Logs API
  static async getDangerousGoodsAudits(
    filters?: any,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResponse<DangerousGoodsAuditLog>> {
    const params = {
      ...filters,
      page,
      page_size: pageSize,
    };
    return apiHelpers.get(`${this.baseUrl}/dangerous-goods/`, params);
  }

  static async getUNNumberAnalytics(): Promise<{
    un_number_operations: Record<string, number>;
    operation_breakdown: Record<string, number>;
    compliance_rates: {
      adg: number;
      iata: number;
      imdg: number;
    };
    recent_updates: DangerousGoodsAuditLog[];
  }> {
    return apiHelpers.get(`${this.baseUrl}/dangerous-goods/un_number_analytics/`);
  }

  static async getRegulatoryNotifications(): Promise<{
    total_requiring_notification: number;
    notifications_sent: number;
    pending_notifications: number;
    pending_items: DangerousGoodsAuditLog[];
  }> {
    return apiHelpers.get(`${this.baseUrl}/dangerous-goods/regulatory_notifications/`);
  }

  // Compliance Monitoring API
  static async getComplianceStatus(periodDays: number = 30): Promise<ComplianceStatus> {
    return apiHelpers.get(`${this.baseUrl}/monitoring/status/`, { period_days: periodDays });
  }

  static async getComplianceAlerts(): Promise<{
    alerts: ComplianceAlert[];
    alert_count: number;
    last_updated: string;
  }> {
    return apiHelpers.get(`${this.baseUrl}/monitoring/alerts/`);
  }

  static async getComplianceThresholds(): Promise<ComplianceThresholdStatus> {
    return apiHelpers.get(`${this.baseUrl}/monitoring/thresholds/`);
  }

  static async getDashboardSummary(): Promise<DashboardSummary> {
    return apiHelpers.get(`${this.baseUrl}/monitoring/dashboard_summary/`);
  }

  static async acknowledgeAlert(alertId: string, note?: string): Promise<{
    status: string;
    alert_id: string;
    acknowledged_by: string;
    acknowledged_at: string;
  }> {
    return apiHelpers.post(`${this.baseUrl}/monitoring/acknowledge_alert/`, {
      alert_id: alertId,
      note,
    });
  }

  static async getRegulationCompliance(
    regulationType?: string,
    periodDays: number = 30
  ): Promise<{
    regulation_type: string;
    period_days: number;
    total_audits: number;
    compliance_breakdown: Record<string, number>;
    regulation_breakdown: Record<string, number>;
    risk_distribution: {
      low_risk: number;
      medium_risk: number;
      high_risk: number;
      critical_risk: number;
    };
    compliance_rate: number;
    recent_violations: ComplianceAuditLog[];
    generated_at: string;
  }> {
    const params = {
      regulation_type: regulationType,
      period_days: periodDays,
    };
    return apiHelpers.get(`${this.baseUrl}/monitoring/regulation_compliance/`, params);
  }

  // Legacy endpoints (for backwards compatibility)
  static async getAuditSummary(filters?: {
    date_from?: string;
    date_to?: string;
  }): Promise<any> {
    return apiHelpers.get('/audits/summary/', filters);
  }

  static async exportLegacyLogs(filters?: any): Promise<any> {
    return apiHelpers.post('/audits/export/', { filters });
  }

  static async getUserActivity(userId: string): Promise<any> {
    return apiHelpers.get(`/audits/users/${userId}/activity/`);
  }

  static async getShipmentAuditLogs(shipmentId: string): Promise<any> {
    return apiHelpers.get(`/audits/shipments/${shipmentId}/logs/`);
  }
}

export default AuditService;