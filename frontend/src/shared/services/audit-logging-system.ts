/**
 * Enhanced Audit Logging System
 * Comprehensive regulatory compliance logging for dangerous goods operations
 * Provides immutable audit trails, forensic analysis, and automated reporting
 */

interface AuditEvent {
  id: string;
  eventType: 'SHIPMENT' | 'COMPLIANCE' | 'DOCUMENT' | 'CERTIFICATE' | 'INCIDENT' | 'ACCESS' | 'SYSTEM';
  category: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'VALIDATE' | 'AUTHENTICATE' | 'AUTHORIZE' | 'ERROR';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: Date;
  userId: string;
  userRole: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  resource: {
    type: string;
    id: string;
    name?: string;
  };
  action: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  details: Record<string, any>;
  metadata: {
    ruleReference?: string;
    regulatoryRequirement?: string;
    complianceImpact?: boolean;
    businessCritical?: boolean;
  };
  correlationId?: string;
  parentEventId?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    country: string;
    region: string;
  };
}

interface AuditQuery {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: string[];
  categories?: string[];
  severities?: string[];
  userIds?: string[];
  resourceIds?: string[];
  outcomes?: string[];
  correlationId?: string;
  complianceOnly?: boolean;
  limit?: number;
  offset?: number;
}

interface AuditReport {
  id: string;
  reportType: 'SOX' | 'DOT' | 'IATA' | 'ADG' | 'GDPR' | 'CUSTOM';
  title: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  generatedAt: Date;
  generatedBy: string;
  events: AuditEvent[];
  summary: {
    totalEvents: number;
    criticalEvents: number;
    complianceEvents: number;
    failureRate: number;
    topUsers: Array<{ userId: string; eventCount: number }>;
    topResources: Array<{ resource: string; eventCount: number }>;
  };
  findings: string[];
  recommendations: string[];
  regulatoryCompliance: {
    [requirement: string]: boolean;
  };
}

interface RetentionPolicy {
  eventType: string;
  retentionPeriod: number; // days
  archiveAfter: number; // days
  compressionEnabled: boolean;
  encryptionRequired: boolean;
}

export class AuditLoggingSystem {
  private eventBuffer: AuditEvent[] = [];
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();
  private isInitialized = false;
  private bufferSize = 100;
  private flushInterval = 30000; // 30 seconds
  private correlationIdGenerator: () => string;

  constructor() {
    this.correlationIdGenerator = () => `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.initializeAuditSystem();
  }

  /**
   * Initialize audit logging system with retention policies
   */
  private async initializeAuditSystem(): Promise<void> {
    try {
      // Set up retention policies for different event types
      this.setupRetentionPolicies();

      // Start buffer flush interval
      this.startBufferFlush();

      // Set up system event listeners
      this.setupSystemEventListeners();

      this.isInitialized = true;
      console.log('Audit logging system initialized');
    } catch (error) {
      console.error('Failed to initialize audit system:', error);
    }
  }

  /**
   * Set up data retention policies for compliance
   */
  private setupRetentionPolicies(): void {
    // SOX compliance - 7 years
    this.retentionPolicies.set('FINANCIAL', {
      eventType: 'FINANCIAL',
      retentionPeriod: 7 * 365,
      archiveAfter: 2 * 365,
      compressionEnabled: true,
      encryptionRequired: true
    });

    // DOT/Transportation - 3 years
    this.retentionPolicies.set('SHIPMENT', {
      eventType: 'SHIPMENT',
      retentionPeriod: 3 * 365,
      archiveAfter: 365,
      compressionEnabled: true,
      encryptionRequired: true
    });

    // GDPR - 3 years for personal data
    this.retentionPolicies.set('ACCESS', {
      eventType: 'ACCESS',
      retentionPeriod: 3 * 365,
      archiveAfter: 365,
      compressionEnabled: false,
      encryptionRequired: true
    });

    // Compliance events - 10 years
    this.retentionPolicies.set('COMPLIANCE', {
      eventType: 'COMPLIANCE',
      retentionPeriod: 10 * 365,
      archiveAfter: 2 * 365,
      compressionEnabled: true,
      encryptionRequired: true
    });

    // Security events - 7 years
    this.retentionPolicies.set('SECURITY', {
      eventType: 'SECURITY',
      retentionPeriod: 7 * 365,
      archiveAfter: 365,
      compressionEnabled: false,
      encryptionRequired: true
    });
  }

  /**
   * Log an audit event
   */
  public async logEvent(
    eventType: AuditEvent['eventType'],
    category: AuditEvent['category'],
    action: string,
    resource: AuditEvent['resource'],
    details: Record<string, any> = {},
    options: {
      severity?: AuditEvent['severity'];
      outcome?: AuditEvent['outcome'];
      userId?: string;
      correlationId?: string;
      parentEventId?: string;
      metadata?: AuditEvent['metadata'];
    } = {}
  ): Promise<string> {
    try {
      // Get user context (would be from auth store in production)
      const userContext = await this.getUserContext();
      
      // Generate event ID
      const eventId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get geolocation if available
      const geolocation = await this.getGeolocation();

      // Create audit event
      const auditEvent: AuditEvent = {
        id: eventId,
        eventType,
        category,
        severity: options.severity || this.determineSeverity(eventType, category, details),
        timestamp: new Date(),
        userId: options.userId || userContext.userId || 'system',
        userRole: userContext.userRole || 'system',
        sessionId: userContext.sessionId || 'no-session',
        ipAddress: userContext.ipAddress || '0.0.0.0',
        userAgent: userContext.userAgent || 'unknown',
        resource,
        action,
        outcome: options.outcome || 'SUCCESS',
        details: this.sanitizeDetails(details),
        metadata: {
          ruleReference: this.getRuleReference(eventType, action),
          regulatoryRequirement: this.getRegulatoryRequirement(eventType),
          complianceImpact: this.hasComplianceImpact(eventType, category),
          businessCritical: this.isBusinessCritical(eventType, options.severity),
          ...options.metadata
        },
        correlationId: options.correlationId || this.correlationIdGenerator(),
        parentEventId: options.parentEventId,
        geolocation
      };

      // Add to buffer
      this.eventBuffer.push(auditEvent);

      // Immediate flush for critical events
      if (auditEvent.severity === 'CRITICAL') {
        await this.flushBuffer();
      }

      // Check buffer size
      if (this.eventBuffer.length >= this.bufferSize) {
        await this.flushBuffer();
      }

      return eventId;
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Failsafe: ensure critical events are still logged
      await this.logFailsafeEvent(eventType, action, error);
      throw error;
    }
  }

  /**
   * Log compliance-specific events with enhanced context
   */
  public async logComplianceEvent(
    action: string,
    dangerousGoodsInfo: {
      unNumber?: string;
      hazardClass?: string;
      packingGroup?: string;
      quantity?: number;
    },
    complianceResult: {
      isCompliant: boolean;
      violations: string[];
      ruleReference: string;
    },
    shipmentId?: string,
    options: {
      userId?: string;
      correlationId?: string;
    } = {}
  ): Promise<string> {
    const details = {
      dangerousGoods: dangerousGoodsInfo,
      complianceCheck: complianceResult,
      shipmentId,
      automaticValidation: true,
      timestamp: new Date().toISOString()
    };

    const severity = complianceResult.violations.length > 0 ? 'HIGH' : 'MEDIUM';
    const outcome = complianceResult.isCompliant ? 'SUCCESS' : 'FAILURE';

    return this.logEvent(
      'COMPLIANCE',
      'VALIDATE',
      action,
      {
        type: 'dangerous_goods',
        id: dangerousGoodsInfo.unNumber || 'unknown',
        name: `DG Compliance Check: ${action}`
      },
      details,
      {
        severity,
        outcome,
        userId: options.userId,
        correlationId: options.correlationId,
        metadata: {
          ruleReference: complianceResult.ruleReference,
          regulatoryRequirement: 'ADG/IATA/DOT',
          complianceImpact: true,
          businessCritical: !complianceResult.isCompliant
        }
      }
    );
  }

  /**
   * Log document processing events
   */
  public async logDocumentEvent(
    action: string,
    documentInfo: {
      documentId: string;
      documentType: string;
      fileName: string;
      fileSize: number;
    },
    processingResult: {
      success: boolean;
      extractedFields: number;
      validationScore: number;
      processingTime: number;
    },
    options: {
      userId?: string;
      correlationId?: string;
    } = {}
  ): Promise<string> {
    const details = {
      document: documentInfo,
      processing: processingResult,
      aiAssisted: true,
      timestamp: new Date().toISOString()
    };

    return this.logEvent(
      'DOCUMENT',
      action.includes('upload') ? 'CREATE' : 'UPDATE',
      action,
      {
        type: 'document',
        id: documentInfo.documentId,
        name: documentInfo.fileName
      },
      details,
      {
        severity: processingResult.success ? 'MEDIUM' : 'HIGH',
        outcome: processingResult.success ? 'SUCCESS' : 'FAILURE',
        userId: options.userId,
        correlationId: options.correlationId,
        metadata: {
          regulatoryRequirement: 'Document Management',
          complianceImpact: true,
          businessCritical: false
        }
      }
    );
  }

  /**
   * Query audit events with advanced filtering
   */
  public async queryEvents(query: AuditQuery): Promise<{
    events: AuditEvent[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const response = await fetch('/api/audit/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(query)
      });

      if (!response.ok) {
        throw new Error(`Audit query failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Audit query failed:', error);
      return {
        events: [],
        totalCount: 0,
        hasMore: false
      };
    }
  }

  /**
   * Generate compliance report for regulatory authorities
   */
  public async generateComplianceReport(
    reportType: AuditReport['reportType'],
    period: { startDate: Date; endDate: Date },
    options: {
      includeDetails?: boolean;
      exportFormat?: 'JSON' | 'PDF' | 'CSV';
      userId?: string;
    } = {}
  ): Promise<AuditReport> {
    try {
      // Log report generation
      const correlationId = this.correlationIdGenerator();
      await this.logEvent(
        'SYSTEM',
        'CREATE',
        'generate_compliance_report',
        {
          type: 'report',
          id: correlationId,
          name: `${reportType} Compliance Report`
        },
        {
          reportType,
          period,
          requestedBy: options.userId
        },
        {
          severity: 'MEDIUM',
          correlationId,
          metadata: {
            regulatoryRequirement: reportType,
            complianceImpact: true,
            businessCritical: true
          }
        }
      );

      // Query relevant events for the report
      const query: AuditQuery = {
        startDate: period.startDate,
        endDate: period.endDate,
        complianceOnly: true,
        limit: 10000
      };

      const queryResult = await this.queryEvents(query);
      const events = queryResult.events;

      // Generate report summary
      const summary = this.generateReportSummary(events);

      // Generate findings and recommendations
      const findings = this.generateFindings(events, reportType);
      const recommendations = this.generateRecommendations(events, reportType);

      // Check regulatory compliance
      const regulatoryCompliance = this.checkRegulatoryCompliance(events, reportType);

      const report: AuditReport = {
        id: correlationId,
        reportType,
        title: `${reportType} Compliance Audit Report`,
        period,
        generatedAt: new Date(),
        generatedBy: options.userId || 'system',
        events: options.includeDetails ? events : [],
        summary,
        findings,
        recommendations,
        regulatoryCompliance
      };

      // Log successful report generation
      await this.logEvent(
        'SYSTEM',
        'CREATE',
        'compliance_report_generated',
        {
          type: 'report',
          id: report.id,
          name: report.title
        },
        {
          reportType,
          eventsIncluded: events.length,
          findingsCount: findings.length,
          complianceStatus: Object.values(regulatoryCompliance).every(v => v)
        },
        {
          severity: 'LOW',
          correlationId,
          metadata: {
            regulatoryRequirement: reportType,
            complianceImpact: true,
            businessCritical: false
          }
        }
      );

      return report;
    } catch (error) {
      console.error('Report generation failed:', error);
      throw error;
    }
  }

  /**
   * Perform forensic analysis on events
   */
  public async performForensicAnalysis(
    incidentId: string,
    timeWindow: { startDate: Date; endDate: Date },
    focusAreas: string[] = []
  ): Promise<{
    timeline: AuditEvent[];
    rootCauseAnalysis: string[];
    impactAssessment: {
      affectedResources: string[];
      complianceImpact: boolean;
      businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    };
    recommendations: string[];
  }> {
    try {
      // Query events related to the incident
      const query: AuditQuery = {
        startDate: timeWindow.startDate,
        endDate: timeWindow.endDate,
        correlationId: incidentId,
        limit: 1000
      };

      const queryResult = await this.queryEvents(query);
      const events = queryResult.events;

      // Perform root cause analysis
      const rootCauseAnalysis = this.performRootCauseAnalysis(events);

      // Assess impact
      const impactAssessment = this.assessIncidentImpact(events);

      // Generate recommendations
      const recommendations = this.generateIncidentRecommendations(events, rootCauseAnalysis);

      // Log forensic analysis
      await this.logEvent(
        'SYSTEM',
        'READ',
        'forensic_analysis_performed',
        {
          type: 'incident',
          id: incidentId,
          name: `Forensic Analysis: ${incidentId}`
        },
        {
          timeWindow,
          eventsAnalyzed: events.length,
          rootCauses: rootCauseAnalysis.length,
          impactLevel: impactAssessment.businessImpact
        },
        {
          severity: 'HIGH',
          metadata: {
            regulatoryRequirement: 'Incident Investigation',
            complianceImpact: true,
            businessCritical: true
          }
        }
      );

      return {
        timeline: events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
        rootCauseAnalysis,
        impactAssessment,
        recommendations
      };
    } catch (error) {
      console.error('Forensic analysis failed:', error);
      throw error;
    }
  }

  /**
   * Helper methods for event processing
   */
  private async getUserContext(): Promise<{
    userId: string;
    userRole: string;
    sessionId: string;
    ipAddress: string;
    userAgent: string;
  }> {
    // In production, this would get context from auth store and request headers
    return {
      userId: 'current_user',
      userRole: 'admin',
      sessionId: 'session_123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    };
  }

  private async getGeolocation(): Promise<AuditEvent['geolocation']> {
    // In production, this would use IP geolocation services
    return {
      latitude: -31.9505,
      longitude: 115.8605,
      country: 'Australia',
      region: 'Western Australia'
    };
  }

  private determineSeverity(
    eventType: string,
    category: string,
    details: Record<string, any>
  ): AuditEvent['severity'] {
    if (eventType === 'COMPLIANCE' && details.violations?.length > 0) return 'HIGH';
    if (eventType === 'INCIDENT') return 'CRITICAL';
    if (eventType === 'ACCESS' && category === 'AUTHENTICATE') return 'MEDIUM';
    return 'LOW';
  }

  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    // Remove sensitive information from audit logs
    const sanitized = { ...details };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.ssn;
    delete sanitized.creditCard;
    return sanitized;
  }

  private getRuleReference(eventType: string, action: string): string {
    const references: Record<string, string> = {
      'COMPLIANCE_segregation': 'ADG 7.2.4',
      'COMPLIANCE_classification': 'ADG 2.0.2.1',
      'DOCUMENT_sds_validation': 'ADG 5.4.1',
      'SHIPMENT_dangerous_goods': 'IATA DGR 8.1'
    };
    
    return references[`${eventType}_${action}`] || 'General Compliance';
  }

  private getRegulatoryRequirement(eventType: string): string {
    const requirements: Record<string, string> = {
      'COMPLIANCE': 'ADG/IATA/DOT Compliance',
      'DOCUMENT': 'Document Management Requirements',
      'SHIPMENT': 'Transportation Safety Regulations',
      'ACCESS': 'Data Protection & Privacy',
      'INCIDENT': 'Safety Incident Reporting'
    };
    
    return requirements[eventType] || 'General Requirements';
  }

  private hasComplianceImpact(eventType: string, category: string): boolean {
    return ['COMPLIANCE', 'DOCUMENT', 'SHIPMENT', 'INCIDENT'].includes(eventType);
  }

  private isBusinessCritical(eventType: string, severity?: string): boolean {
    return severity === 'CRITICAL' || eventType === 'INCIDENT';
  }

  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await fetch('/api/audit/batch-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ events: eventsToFlush })
      });
    } catch (error) {
      console.error('Failed to flush audit buffer:', error);
      // Re-add events to buffer for retry
      this.eventBuffer = [...eventsToFlush, ...this.eventBuffer];
    }
  }

  private startBufferFlush(): void {
    setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);
  }

  private setupSystemEventListeners(): void {
    // Listen for unhandled errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.logEvent(
          'SYSTEM',
          'ERROR',
          'unhandled_error',
          { type: 'error', id: 'js_error', name: 'JavaScript Error' },
          {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack
          },
          { severity: 'HIGH' }
        );
      });
    }
  }

  private async logFailsafeEvent(eventType: string, action: string, error: any): Promise<void> {
    // Basic logging when main audit system fails
    console.error('AUDIT FAILSAFE:', {
      eventType,
      action,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }

  private generateReportSummary(events: AuditEvent[]): AuditReport['summary'] {
    const totalEvents = events.length;
    const criticalEvents = events.filter(e => e.severity === 'CRITICAL').length;
    const complianceEvents = events.filter(e => e.eventType === 'COMPLIANCE').length;
    const failedEvents = events.filter(e => e.outcome === 'FAILURE').length;
    const failureRate = totalEvents > 0 ? (failedEvents / totalEvents) * 100 : 0;

    // Top users and resources
    const userCounts = new Map<string, number>();
    const resourceCounts = new Map<string, number>();

    events.forEach(event => {
      userCounts.set(event.userId, (userCounts.get(event.userId) || 0) + 1);
      const resourceKey = `${event.resource.type}:${event.resource.id}`;
      resourceCounts.set(resourceKey, (resourceCounts.get(resourceKey) || 0) + 1);
    });

    const topUsers = Array.from(userCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, eventCount]) => ({ userId, eventCount }));

    const topResources = Array.from(resourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([resource, eventCount]) => ({ resource, eventCount }));

    return {
      totalEvents,
      criticalEvents,
      complianceEvents,
      failureRate: Math.round(failureRate * 100) / 100,
      topUsers,
      topResources
    };
  }

  private generateFindings(events: AuditEvent[], reportType: string): string[] {
    const findings: string[] = [];

    // Analyze compliance violations
    const violationEvents = events.filter(e => 
      e.eventType === 'COMPLIANCE' && e.outcome === 'FAILURE'
    );
    
    if (violationEvents.length > 0) {
      findings.push(`Identified ${violationEvents.length} compliance violations during the audit period`);
    }

    // Analyze access patterns
    const accessEvents = events.filter(e => e.eventType === 'ACCESS');
    const failedAccess = accessEvents.filter(e => e.outcome === 'FAILURE');
    
    if (failedAccess.length > accessEvents.length * 0.1) {
      findings.push(`High rate of failed access attempts detected (${failedAccess.length}/${accessEvents.length})`);
    }

    return findings;
  }

  private generateRecommendations(events: AuditEvent[], reportType: string): string[] {
    const recommendations: string[] = [];

    // Based on compliance failures
    const complianceFailures = events.filter(e => 
      e.eventType === 'COMPLIANCE' && e.outcome === 'FAILURE'
    );
    
    if (complianceFailures.length > 0) {
      recommendations.push('Implement additional training on dangerous goods compliance requirements');
      recommendations.push('Review and update compliance validation procedures');
    }

    return recommendations;
  }

  private checkRegulatoryCompliance(events: AuditEvent[], reportType: string): Record<string, boolean> {
    return {
      'Data Retention': true,
      'Access Controls': events.filter(e => e.eventType === 'ACCESS').length > 0,
      'Audit Trail Completeness': events.length > 0,
      'Incident Reporting': events.filter(e => e.eventType === 'INCIDENT').length >= 0
    };
  }

  private performRootCauseAnalysis(events: AuditEvent[]): string[] {
    const causes: string[] = [];
    
    // Analyze event patterns
    const errorEvents = events.filter(e => e.outcome === 'FAILURE');
    
    if (errorEvents.length > 0) {
      causes.push('System or process failures detected');
    }

    return causes;
  }

  private assessIncidentImpact(events: AuditEvent[]): {
    affectedResources: string[];
    complianceImpact: boolean;
    businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  } {
    const affectedResources = [...new Set(events.map(e => `${e.resource.type}:${e.resource.id}`))];
    const complianceImpact = events.some(e => e.metadata.complianceImpact);
    const criticalEvents = events.filter(e => e.severity === 'CRITICAL').length;
    
    let businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (criticalEvents > 0) businessImpact = 'CRITICAL';
    else if (complianceImpact) businessImpact = 'HIGH';
    else if (events.length > 10) businessImpact = 'MEDIUM';

    return {
      affectedResources,
      complianceImpact,
      businessImpact
    };
  }

  private generateIncidentRecommendations(events: AuditEvent[], rootCauses: string[]): string[] {
    return [
      'Implement additional monitoring for early detection',
      'Review and update incident response procedures',
      'Conduct staff training on identified risk areas'
    ];
  }
}

// Export singleton instance
export const auditLogger = new AuditLoggingSystem();

// Export convenience functions
export const logAuditEvent = (
  eventType: AuditEvent['eventType'],
  category: AuditEvent['category'],
  action: string,
  resource: AuditEvent['resource'],
  details?: Record<string, any>,
  options?: any
) => auditLogger.logEvent(eventType, category, action, resource, details, options);

export const logComplianceEvent = (
  action: string,
  dangerousGoodsInfo: any,
  complianceResult: any,
  shipmentId?: string,
  options?: any
) => auditLogger.logComplianceEvent(action, dangerousGoodsInfo, complianceResult, shipmentId, options);

export const generateComplianceReport = (
  reportType: AuditReport['reportType'],
  period: { startDate: Date; endDate: Date },
  options?: any
) => auditLogger.generateComplianceReport(reportType, period, options);

export default AuditLoggingSystem;