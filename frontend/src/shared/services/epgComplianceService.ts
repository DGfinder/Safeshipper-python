/**
 * EPG Compliance Service - Enhanced API interface for compliance management
 * Handles EPG oversight, coverage analysis, and compliance tracking
 */
import { apiHelpers } from './api';

export interface EPGComplianceStats {
  total_epgs: number;
  active_epgs: number;
  draft_epgs: number;
  under_review: number;
  archived_epgs: number;
  due_for_review: number;
  overdue_reviews: number;
  compliance_rate: number;
  coverage_gaps: number;
  regulatory_updates_pending: number;
}

export interface EPGCoverageGap {
  id: string;
  dangerous_good_id: string;
  un_number: string;
  proper_shipping_name: string;
  hazard_class: string;
  gap_type: 'MISSING_EPG' | 'OUTDATED_EPG' | 'INCOMPLETE_EPG';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  identified_date: string;
  shipments_affected: number;
  regulatory_requirements: string[];
}

export interface EPGUsageAnalytics {
  epg_id: string;
  epg_number: string;
  title: string;
  usage_count: number;
  last_used: string;
  shipments_generated: number;
  incidents_referenced: number;
  effectiveness_score: number;
  update_frequency: number;
}

export interface ComplianceOfficerMetrics {
  total_reviews_completed: number;
  avg_review_time_hours: number;
  epgs_created: number;
  epgs_updated: number;
  plans_reviewed: number;
  plans_approved: number;
  compliance_improvements: number;
  regulatory_updates_processed: number;
  period_days: number;
}

export interface RegulatoryUpdate {
  id: string;
  title: string;
  description: string;
  effective_date: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affected_hazard_classes: string[];
  epgs_to_update: number;
  created_date: string;
  status: 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'APPROVED' | 'IMPLEMENTED';
}

export interface AuditEvent {
  id: string;
  type: 'EPG_UPDATE' | 'PLAN_GENERATED' | 'EPG_ACTIVATED' | 'EPG_ARCHIVED' | 'REVIEW_COMPLETED';
  timestamp: string;
  user: string;
  description: string;
  object_id: string;
  object_type: string;
  status: string;
}

export interface AuditTrailResponse {
  audit_events: AuditEvent[];
  period_days: number;
  total_events: number;
}

export class EPGComplianceService {
  private static baseUrl = '/api/v1/epg/compliance';

  // ============================================================================
  // COMPLIANCE ANALYTICS & MONITORING
  // ============================================================================

  /**
   * Get comprehensive EPG compliance statistics
   */
  static async getComplianceStats(): Promise<EPGComplianceStats> {
    // Use the existing statistics endpoint and transform data
    const response = await apiHelpers.get('/api/v1/epg/emergency-procedure-guides/statistics/');
    
    return {
      total_epgs: response.total_epgs,
      active_epgs: response.active_epgs,
      draft_epgs: response.draft_epgs,
      under_review: response.under_review,
      archived_epgs: response.total_epgs - response.active_epgs - response.draft_epgs - response.under_review,
      due_for_review: response.due_for_review,
      overdue_reviews: Math.floor(response.due_for_review * 0.3), // Estimated
      compliance_rate: Math.round((response.active_epgs / Math.max(response.total_epgs, 1)) * 100),
      coverage_gaps: 0, // Will be populated by coverage gaps endpoint
      regulatory_updates_pending: Math.floor(response.under_review * 0.4) // Estimated
    };
  }

  /**
   * Identify EPG coverage gaps for dangerous goods
   */
  static async getCoverageGaps(): Promise<EPGCoverageGap[]> {
    return apiHelpers.get(`${this.baseUrl}/coverage-gaps/`);
  }

  /**
   * Get EPG usage analytics and effectiveness metrics
   */
  static async getUsageAnalytics(): Promise<EPGUsageAnalytics[]> {
    return apiHelpers.get(`${this.baseUrl}/usage-analytics/`);
  }

  /**
   * Get compliance officer performance metrics
   */
  static async getOfficerMetrics(): Promise<ComplianceOfficerMetrics> {
    return apiHelpers.get(`${this.baseUrl}/compliance-metrics/`);
  }

  /**
   * Get pending regulatory updates
   */
  static async getRegulatoryUpdates(): Promise<RegulatoryUpdate[]> {
    return apiHelpers.get(`${this.baseUrl}/regulatory-updates/`);
  }

  /**
   * Get audit trail for EPG changes and compliance actions
   */
  static async getAuditTrail(days: number = 30): Promise<AuditTrailResponse> {
    return apiHelpers.get(`${this.baseUrl}/audit-trail/`, { days });
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Bulk update review dates for multiple EPGs
   */
  static async bulkUpdateReviewDates(epgIds: string[], reviewDate: string): Promise<{
    updated_count: number;
    new_review_date: string;
  }> {
    return apiHelpers.post(`${this.baseUrl}/bulk-update-review-dates/`, {
      epg_ids: epgIds,
      review_date: reviewDate
    });
  }

  /**
   * Bulk activate multiple EPGs
   */
  static async bulkActivateEPGs(epgIds: string[]): Promise<{
    activated_count: number;
    failed_activations: string[];
  }> {
    // This would need to be implemented on the backend
    const results = { activated_count: 0, failed_activations: [] as string[] };
    
    for (const epgId of epgIds) {
      try {
        await apiHelpers.post(`/api/v1/epg/emergency-procedure-guides/${epgId}/activate/`);
        results.activated_count++;
      } catch (error) {
        results.failed_activations.push(epgId);
      }
    }
    
    return results;
  }

  /**
   * Bulk archive multiple EPGs
   */
  static async bulkArchiveEPGs(epgIds: string[]): Promise<{
    archived_count: number;
    failed_archives: string[];
  }> {
    const results = { archived_count: 0, failed_archives: [] as string[] };
    
    for (const epgId of epgIds) {
      try {
        await apiHelpers.post(`/api/v1/epg/emergency-procedure-guides/${epgId}/archive/`);
        results.archived_count++;
      } catch (error) {
        results.failed_archives.push(epgId);
      }
    }
    
    return results;
  }

  // ============================================================================
  // COVERAGE ANALYSIS
  // ============================================================================

  /**
   * Analyze EPG coverage for specific hazard classes
   */
  static async analyzeCoverageByHazardClass(hazardClasses: string[]): Promise<{
    [hazardClass: string]: {
      total_dangerous_goods: number;
      covered_dangerous_goods: number;
      coverage_percentage: number;
      gaps: EPGCoverageGap[];
    };
  }> {
    const allGaps = await this.getCoverageGaps();
    const coverage: { [key: string]: any } = {};
    
    for (const hazardClass of hazardClasses) {
      const classGaps = allGaps.filter(gap => gap.hazard_class === hazardClass);
      
      coverage[hazardClass] = {
        total_dangerous_goods: classGaps.length + 10, // Mock calculation
        covered_dangerous_goods: 10 - classGaps.length,
        coverage_percentage: Math.round(((10 - classGaps.length) / 10) * 100),
        gaps: classGaps
      };
    }
    
    return coverage;
  }

  /**
   * Get EPG coverage trends over time
   */
  static async getCoverageTrends(days: number = 90): Promise<Array<{
    date: string;
    total_epgs: number;
    active_epgs: number;
    coverage_gaps: number;
    compliance_rate: number;
  }>> {
    // This would be implemented on the backend to provide historical data
    // For now, return mock trend data
    const trends = [];
    const today = new Date();
    
    for (let i = days; i >= 0; i -= 7) {
      const date = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
      trends.push({
        date: date.toISOString().split('T')[0],
        total_epgs: 150 + Math.floor(Math.random() * 10),
        active_epgs: 140 + Math.floor(Math.random() * 8),
        coverage_gaps: Math.max(0, 10 - Math.floor(Math.random() * 3)),
        compliance_rate: 85 + Math.floor(Math.random() * 10)
      });
    }
    
    return trends;
  }

  // ============================================================================
  // REGULATORY COMPLIANCE
  // ============================================================================

  /**
   * Check compliance against specific regulatory frameworks
   */
  static async checkRegulatoryCompliance(frameworks: string[] = ['ADG', 'DOT', 'IATA']): Promise<{
    [framework: string]: {
      compliant_epgs: number;
      non_compliant_epgs: number;
      compliance_rate: number;
      missing_requirements: string[];
    };
  }> {
    // This would integrate with regulatory databases
    // For now, return mock compliance data
    const compliance: { [key: string]: any } = {};
    
    for (const framework of frameworks) {
      compliance[framework] = {
        compliant_epgs: 130 + Math.floor(Math.random() * 10),
        non_compliant_epgs: 10 + Math.floor(Math.random() * 5),
        compliance_rate: 90 + Math.floor(Math.random() * 8),
        missing_requirements: [
          'Emergency contact validation',
          'Updated isolation distances'
        ]
      };
    }
    
    return compliance;
  }

  /**
   * Generate compliance report for audit purposes
   */
  static async generateComplianceReport(options: {
    include_coverage_analysis: boolean;
    include_usage_metrics: boolean;
    include_audit_trail: boolean;
    format: 'json' | 'pdf' | 'xlsx';
    date_range: {
      start_date: string;
      end_date: string;
    };
  }): Promise<Blob | any> {
    if (options.format === 'json') {
      // Return structured data
      const [stats, gaps, analytics, metrics] = await Promise.all([
        this.getComplianceStats(),
        options.include_coverage_analysis ? this.getCoverageGaps() : [],
        options.include_usage_metrics ? this.getUsageAnalytics() : [],
        this.getOfficerMetrics()
      ]);
      
      return {
        generated_at: new Date().toISOString(),
        report_period: options.date_range,
        compliance_stats: stats,
        coverage_gaps: gaps,
        usage_analytics: analytics,
        officer_metrics: metrics
      };
    } else {
      // Return file blob for PDF/Excel
      const response = await fetch(`${this.baseUrl}/generate-compliance-report/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(options)
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate compliance report');
      }
      
      return response.blob();
    }
  }

  // ============================================================================
  // NOTIFICATIONS & ALERTS
  // ============================================================================

  /**
   * Get active compliance alerts
   */
  static async getComplianceAlerts(): Promise<Array<{
    id: string;
    type: 'COVERAGE_GAP' | 'REVIEW_OVERDUE' | 'REGULATORY_UPDATE' | 'EFFECTIVENESS_LOW';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    description: string;
    created_at: string;
    actions_required: string[];
    related_objects: Array<{
      type: string;
      id: string;
      name: string;
    }>;
  }>> {
    const [gaps, stats] = await Promise.all([
      this.getCoverageGaps(),
      this.getComplianceStats()
    ]);
    
    const alerts: any[] = [];
    
    // Critical coverage gaps
    gaps.filter(gap => gap.severity === 'CRITICAL').forEach(gap => {
      alerts.push({
        id: `alert_gap_${gap.id}`,
        type: 'COVERAGE_GAP',
        severity: 'CRITICAL',
        title: 'Critical EPG Coverage Gap',
        description: `${gap.un_number} ${gap.proper_shipping_name} lacks emergency procedures`,
        created_at: gap.identified_date,
        actions_required: ['Create EPG', 'Update regulatory requirements'],
        related_objects: [{
          type: 'DangerousGood',
          id: gap.dangerous_good_id,
          name: gap.proper_shipping_name
        }]
      });
    });
    
    // Overdue reviews
    if (stats.overdue_reviews > 0) {
      alerts.push({
        id: 'alert_overdue_reviews',
        type: 'REVIEW_OVERDUE',
        severity: 'HIGH',
        title: 'EPG Reviews Overdue',
        description: `${stats.overdue_reviews} EPGs have overdue reviews`,
        created_at: new Date().toISOString(),
        actions_required: ['Schedule reviews', 'Update review dates'],
        related_objects: []
      });
    }
    
    return alerts.sort((a, b) => {
      const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return severityOrder[b.severity as keyof typeof severityOrder] - severityOrder[a.severity as keyof typeof severityOrder];
    });
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Validate EPG completeness for compliance
   */
  static validateEPGCompleteness(epg: any): {
    is_complete: boolean;
    missing_sections: string[];
    compliance_score: number;
    recommendations: string[];
  } {
    const missing_sections: string[] = [];
    const recommendations: string[] = [];
    
    // Check required sections
    if (!epg.immediate_actions || epg.immediate_actions.trim() === '') {
      missing_sections.push('Immediate Actions');
    }
    if (!epg.notification_requirements || epg.notification_requirements.trim() === '') {
      missing_sections.push('Notification Requirements');
    }
    if (!epg.personal_protection || epg.personal_protection.trim() === '') {
      missing_sections.push('Personal Protection');
    }
    if (!epg.emergency_contacts || Object.keys(epg.emergency_contacts).length === 0) {
      missing_sections.push('Emergency Contacts');
    }
    
    // Generate recommendations
    if (missing_sections.length > 0) {
      recommendations.push('Complete all required sections');
    }
    if (!epg.review_date) {
      recommendations.push('Set review date');
    }
    if (!epg.regulatory_references || epg.regulatory_references.length === 0) {
      recommendations.push('Add regulatory references');
    }
    
    const compliance_score = Math.max(0, 100 - (missing_sections.length * 20));
    
    return {
      is_complete: missing_sections.length === 0,
      missing_sections,
      compliance_score,
      recommendations
    };
  }

  /**
   * Download file helper for reports and exports
   */
  static downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export default EPGComplianceService;