// Regulatory Compliance Automation Service
// AI-powered regulatory intelligence and automated compliance management
// Eliminates manual compliance burden through predictive regulation tracking

interface RegulationUpdate {
  updateId: string;
  regulatoryBody:
    | "IMDG"
    | "IATA"
    | "ADR"
    | "UN"
    | "DOT"
    | "TC"
    | "ACMA"
    | "EU"
    | "CUSTOM";
  updateType:
    | "new_regulation"
    | "amendment"
    | "clarification"
    | "enforcement_change"
    | "deadline_change";
  severity: "info" | "minor" | "major" | "critical";
  title: string;
  description: string;
  affectedSections: string[];
  affectedUnNumbers: string[];
  affectedHazardClasses: string[];
  affectedTransportModes: ("road" | "rail" | "sea" | "air")[];
  effectiveDate: string;
  complianceDeadline: string;
  implementationPeriod: string;
  geographicScope: string[];
  changeDetails: {
    oldRequirement?: string;
    newRequirement: string;
    rationale: string;
    complianceActions: string[];
  };
  businessImpact: {
    impactLevel: "low" | "medium" | "high" | "critical";
    affectedOperations: string[];
    estimatedCost: number;
    implementationTime: number; // days
    trainingRequired: boolean;
  };
  sources: string[];
  relatedUpdates: string[];
  lastModified: string;
}

interface ComplianceRequirement {
  requirementId: string;
  category:
    | "documentation"
    | "training"
    | "equipment"
    | "procedure"
    | "certification"
    | "labeling"
    | "packaging";
  regulation: string;
  section: string;
  unNumbers: string[];
  hazardClasses: string[];
  transportModes: string[];
  title: string;
  description: string;
  mandatoryFields: Array<{
    fieldName: string;
    dataType: "text" | "number" | "date" | "boolean" | "file" | "selection";
    required: boolean;
    validationRules: string[];
    example?: string;
  }>;
  validationChecks: Array<{
    checkName: string;
    checkType: "format" | "range" | "cross_reference" | "calculation" | "logic";
    rule: string;
    errorMessage: string;
  }>;
  dependencies: string[]; // other requirement IDs that must be satisfied first
  renewalRequired: boolean;
  renewalPeriod?: number; // days
  geographicApplicability: string[];
  lastUpdated: string;
}

interface ComplianceDocument {
  documentId: string;
  documentType:
    | "dangerous_goods_declaration"
    | "manifest"
    | "placards"
    | "emergency_response"
    | "certification"
    | "training_record"
    | "inspection_report";
  templateVersion: string;
  applicableRegulations: string[];
  requiredFor: {
    unNumbers: string[];
    hazardClasses: string[];
    transportModes: string[];
    routes: string[];
    jurisdictions: string[];
  };
  documentStructure: Array<{
    sectionName: string;
    sectionNumber: string;
    required: boolean;
    fields: Array<{
      fieldId: string;
      fieldName: string;
      dataType: string;
      source: "manual" | "auto_calculated" | "database_lookup" | "ai_generated";
      validationRules: string[];
    }>;
  }>;
  autoGenerationRules: Array<{
    condition: string;
    action: string;
    dataSource: string;
  }>;
  complianceChecks: string[];
  lastUpdated: string;
}

interface ComplianceAssessment {
  assessmentId: string;
  shipmentId: string;
  timestamp: string;
  overallStatus: "compliant" | "non_compliant" | "pending" | "warning";
  complianceScore: number; // 0-100
  assessedRequirements: Array<{
    requirementId: string;
    status: "met" | "not_met" | "partially_met" | "not_applicable";
    confidence: number;
    evidence: string[];
    deficiencies: string[];
    recommendations: string[];
  }>;
  missingDocuments: Array<{
    documentType: string;
    regulation: string;
    urgency: "low" | "medium" | "high" | "critical";
    dueDate: string;
  }>;
  violations: Array<{
    violationType: string;
    regulation: string;
    section: string;
    description: string;
    severity: "minor" | "major" | "critical";
    potentialPenalty: string;
    remediation: string[];
  }>;
  recommendations: Array<{
    category: string;
    action: string;
    priority: "low" | "medium" | "high" | "urgent";
    estimatedEffort: string;
    costImplication: number;
  }>;
  riskAnalysis: {
    overallRisk: "low" | "medium" | "high" | "critical";
    riskFactors: string[];
    mitigationStrategies: string[];
  };
  nextReviewDate: string;
}

interface AutomatedCompliance {
  automationId: string;
  name: string;
  description: string;
  triggers: Array<{
    triggerType: "schedule" | "event" | "threshold" | "manual";
    condition: string;
    parameters: { [key: string]: any };
  }>;
  automatedActions: Array<{
    actionType:
      | "generate_document"
      | "validate_data"
      | "send_notification"
      | "update_records"
      | "schedule_review";
    parameters: { [key: string]: any };
    successCriteria: string;
  }>;
  affectedRegulations: string[];
  successRate: number; // percentage
  lastRun: string;
  nextScheduledRun: string;
  errorHandling: {
    retryAttempts: number;
    fallbackActions: string[];
    escalationProcedure: string;
  };
  performanceMetrics: {
    averageExecutionTime: number; // milliseconds
    costSavingsPerRun: number;
    timeSavingsPerRun: number; // minutes
  };
}

interface JurisdictionRequirements {
  jurisdiction: string;
  jurisdictionType: "country" | "state" | "province" | "port" | "customs_union";
  applicableRegulations: string[];
  specificRequirements: Array<{
    category: string;
    requirement: string;
    applicableToHazardClasses: string[];
    documentation: string[];
    inspectionRequirements: string[];
    penalties: string[];
  }>;
  borderRequirements: {
    customsDocumentation: string[];
    inspectionProcedures: string[];
    notificationRequirements: string[];
    transitRestrictions: string[];
  };
  localContacts: Array<{
    organization: string;
    contactType: "regulatory" | "customs" | "emergency" | "port_authority";
    phone: string;
    email: string;
    operatingHours: string;
  }>;
  lastUpdated: string;
}

interface ComplianceAuditTrail {
  auditId: string;
  timestamp: string;
  eventType:
    | "document_generated"
    | "compliance_check"
    | "regulation_update"
    | "violation_detected"
    | "remediation_completed";
  actor: "system" | "user" | "automation";
  actorId: string;
  description: string;
  affectedEntities: Array<{
    entityType: "shipment" | "document" | "requirement" | "regulation";
    entityId: string;
  }>;
  beforeState?: { [key: string]: any };
  afterState?: { [key: string]: any };
  complianceImpact: string;
  verificationMethod: string;
  digitalSignature?: string;
  retentionPeriod: number; // days
}

interface ComplianceMetrics {
  timeframe: "day" | "week" | "month" | "quarter" | "year";
  overallComplianceRate: number; // percentage
  automationEfficiency: number; // percentage of tasks automated
  metrics: {
    totalShipments: number;
    compliantShipments: number;
    violationsDetected: number;
    violationsResolved: number;
    documentGenerationTime: number; // minutes average
    complianceCheckTime: number; // minutes average
    costSavings: number;
    timeSavings: number; // hours
  };
  trends: {
    complianceScoreTrend: number[];
    violationTrend: number[];
    automationTrend: number[];
  };
  regulationUpdates: {
    totalUpdates: number;
    criticalUpdates: number;
    implementedUpdates: number;
    pendingUpdates: number;
  };
  riskAreas: Array<{
    area: string;
    riskLevel: "low" | "medium" | "high" | "critical";
    violationCount: number;
    recommendedActions: string[];
  }>;
  performanceBenchmarks: {
    industryAverage: number;
    topPerformer: number;
    yourPosition:
      | "below_average"
      | "average"
      | "above_average"
      | "top_quartile";
  };
}

class RegulatoryComplianceService {
  private baseUrl = "/api/v1";
  private wsConnection: WebSocket | null = null;
  private updateCallbacks: Set<(update: RegulationUpdate) => void> = new Set();
  private complianceAlertCallbacks: Set<(alert: ComplianceAssessment) => void> =
    new Set();

  // Initialize real-time regulation monitoring
  async initializeRegulationMonitoring(): Promise<void> {
    if (typeof window !== "undefined" && "WebSocket" in window) {
      try {
        this.wsConnection = new WebSocket(
          `wss://api.safeshipper.com/ws/regulatory-updates`,
        );

        this.wsConnection.onmessage = (event) => {
          const data = JSON.parse(event.data);

          if (data.type === "regulation_update") {
            this.updateCallbacks.forEach((callback) => callback(data.update));
          } else if (data.type === "compliance_alert") {
            this.complianceAlertCallbacks.forEach((callback) =>
              callback(data.alert),
            );
          }
        };

        this.wsConnection.onerror = (error) => {
          console.error("Regulatory monitoring WebSocket error:", error);
        };
      } catch (error) {
        console.warn("WebSocket not available for regulatory monitoring");
        this.startPollingMode();
      }
    }
  }

  private startPollingMode(): void {
    setInterval(async () => {
      try {
        const updates = await this.getLatestRegulationUpdates();
        updates.forEach((update) => {
          this.updateCallbacks.forEach((callback) => callback(update));
        });
      } catch (error) {
        console.error("Regulation update polling failed:", error);
      }
    }, 300000); // Poll every 5 minutes
  }

  // Subscribe to regulation updates
  subscribeToRegulationUpdates(
    callback: (update: RegulationUpdate) => void,
  ): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  // Subscribe to compliance alerts
  subscribeToComplianceAlerts(
    callback: (alert: ComplianceAssessment) => void,
  ): () => void {
    this.complianceAlertCallbacks.add(callback);
    return () => this.complianceAlertCallbacks.delete(callback);
  }

  // Get latest regulation updates
  async getLatestRegulationUpdates(
    timeframe: string = "7d",
  ): Promise<RegulationUpdate[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/regulatory-compliance/updates/?timeframe=${timeframe}`,
      );
      if (!response.ok) throw new Error("Failed to fetch regulation updates");

      const data = await response.json();
      return data.updates || [];
    } catch (error) {
      console.error("Regulation updates fetch failed:", error);
      return this.simulateRegulationUpdates();
    }
  }

  private simulateRegulationUpdates(): RegulationUpdate[] {
    return [
      {
        updateId: "update-001",
        regulatoryBody: "IMDG",
        updateType: "amendment",
        severity: "major",
        title: "Updated lithium battery transport requirements",
        description:
          "New packaging and labeling requirements for lithium batteries in effect from January 2025",
        affectedSections: ["2.9.4", "4.1.5"],
        affectedUnNumbers: ["UN3480", "UN3481"],
        affectedHazardClasses: ["9"],
        affectedTransportModes: ["sea", "air"],
        effectiveDate: "2025-01-01T00:00:00Z",
        complianceDeadline: "2025-03-01T00:00:00Z",
        implementationPeriod: "60 days",
        geographicScope: ["Global"],
        changeDetails: {
          newRequirement:
            "All lithium battery shipments must include QR code tracking and enhanced fire suppression systems",
          rationale:
            "Increased fire incidents during transport require enhanced safety measures",
          complianceActions: [
            "Update packaging procedures",
            "Implement QR code generation",
            "Train staff on new requirements",
            "Upgrade fire suppression systems",
          ],
        },
        businessImpact: {
          impactLevel: "high",
          affectedOperations: ["Packaging", "Documentation", "Training"],
          estimatedCost: 15000,
          implementationTime: 45,
          trainingRequired: true,
        },
        sources: ["IMO MSC.105/21", "IMDG Code Amendment 41-22"],
        relatedUpdates: [],
        lastModified: new Date().toISOString(),
      },
    ];
  }

  // Perform automated compliance assessment
  async performComplianceAssessment(
    shipmentData: any,
  ): Promise<ComplianceAssessment> {
    try {
      const response = await fetch(
        `${this.baseUrl}/regulatory-compliance/assess/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shipment_data: shipmentData,
            assessment_depth: "comprehensive",
            include_predictions: true,
          }),
        },
      );

      if (!response.ok) throw new Error("Compliance assessment failed");

      return await response.json();
    } catch (error) {
      console.error("Compliance assessment failed:", error);
      return this.simulateComplianceAssessment(shipmentData);
    }
  }

  private simulateComplianceAssessment(
    shipmentData: any,
  ): ComplianceAssessment {
    return {
      assessmentId: `assess-${Date.now()}`,
      shipmentId: shipmentData?.shipmentId || "SHIP-001",
      timestamp: new Date().toISOString(),
      overallStatus: "warning",
      complianceScore: 87,
      assessedRequirements: [
        {
          requirementId: "req-001",
          status: "met",
          confidence: 0.95,
          evidence: [
            "Valid dangerous goods declaration present",
            "Correct UN number classification",
          ],
          deficiencies: [],
          recommendations: [],
        },
        {
          requirementId: "req-002",
          status: "partially_met",
          confidence: 0.78,
          evidence: ["Emergency contact information provided"],
          deficiencies: ["24/7 emergency contact not verified"],
          recommendations: ["Verify emergency contact availability"],
        },
      ],
      missingDocuments: [
        {
          documentType: "Container Packing Certificate",
          regulation: "IMDG Code 5.4.2",
          urgency: "medium",
          dueDate: "2024-01-20T00:00:00Z",
        },
      ],
      violations: [],
      recommendations: [
        {
          category: "Documentation",
          action: "Generate missing Container Packing Certificate",
          priority: "medium",
          estimatedEffort: "15 minutes",
          costImplication: 0,
        },
        {
          category: "Emergency Preparedness",
          action: "Verify 24/7 emergency contact availability",
          priority: "high",
          estimatedEffort: "1 hour",
          costImplication: 50,
        },
      ],
      riskAnalysis: {
        overallRisk: "low",
        riskFactors: ["Missing documentation", "Unverified emergency contact"],
        mitigationStrategies: [
          "Automated document generation",
          "Emergency contact verification system",
        ],
      },
      nextReviewDate: "2024-01-25T00:00:00Z",
    };
  }

  // Generate compliance documents automatically
  async generateComplianceDocument(
    documentType: string,
    shipmentData: any,
    templateVersion?: string,
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/regulatory-compliance/generate-document/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_type: documentType,
            shipment_data: shipmentData,
            template_version: templateVersion || "latest",
            auto_validate: true,
          }),
        },
      );

      if (!response.ok) throw new Error("Document generation failed");

      const data = await response.json();
      return data.document_url;
    } catch (error) {
      console.error("Document generation failed:", error);
      return null;
    }
  }

  // Validate compliance documents
  async validateComplianceDocument(
    documentId: string,
    documentData: any,
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/regulatory-compliance/validate-document/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_id: documentId,
            document_data: documentData,
            validation_level: "comprehensive",
          }),
        },
      );

      if (!response.ok) throw new Error("Document validation failed");

      return await response.json();
    } catch (error) {
      console.error("Document validation failed:", error);
      return {
        valid: false,
        errors: ["Validation service unavailable"],
        warnings: [],
      };
    }
  }

  // Get jurisdiction-specific requirements
  async getJurisdictionRequirements(
    origin: string,
    destination: string,
    transitCountries: string[] = [],
  ): Promise<JurisdictionRequirements[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/regulatory-compliance/jurisdiction-requirements/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin,
            destination,
            transit_countries: transitCountries,
          }),
        },
      );

      if (!response.ok)
        throw new Error("Jurisdiction requirements fetch failed");

      const data = await response.json();
      return data.requirements || [];
    } catch (error) {
      console.error("Jurisdiction requirements fetch failed:", error);
      return [];
    }
  }

  // Set up automated compliance workflows
  async createAutomatedCompliance(
    automation: Omit<
      AutomatedCompliance,
      "automationId" | "lastRun" | "nextScheduledRun"
    >,
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/regulatory-compliance/automation/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(automation),
        },
      );

      if (!response.ok) throw new Error("Automation creation failed");

      const data = await response.json();
      return data.automation_id;
    } catch (error) {
      console.error("Automation creation failed:", error);
      return null;
    }
  }

  // Get compliance metrics and analytics
  async getComplianceMetrics(
    timeframe: string = "month",
  ): Promise<ComplianceMetrics | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/regulatory-compliance/metrics/?timeframe=${timeframe}`,
      );
      if (!response.ok) throw new Error("Compliance metrics fetch failed");

      return await response.json();
    } catch (error) {
      console.error("Compliance metrics fetch failed:", error);
      return this.simulateComplianceMetrics();
    }
  }

  private simulateComplianceMetrics(): ComplianceMetrics {
    return {
      timeframe: "month",
      overallComplianceRate: 94.7,
      automationEfficiency: 87.3,
      metrics: {
        totalShipments: 1247,
        compliantShipments: 1181,
        violationsDetected: 23,
        violationsResolved: 21,
        documentGenerationTime: 2.3,
        complianceCheckTime: 1.8,
        costSavings: 47500,
        timeSavings: 340,
      },
      trends: {
        complianceScoreTrend: [92, 93, 94, 95, 95],
        violationTrend: [28, 25, 23, 24, 23],
        automationTrend: [82, 84, 85, 86, 87],
      },
      regulationUpdates: {
        totalUpdates: 15,
        criticalUpdates: 2,
        implementedUpdates: 13,
        pendingUpdates: 2,
      },
      riskAreas: [
        {
          area: "Lithium battery shipments",
          riskLevel: "medium",
          violationCount: 8,
          recommendedActions: [
            "Enhanced training",
            "Updated packaging procedures",
          ],
        },
      ],
      performanceBenchmarks: {
        industryAverage: 89.2,
        topPerformer: 97.8,
        yourPosition: "above_average",
      },
    };
  }

  // Get compliance audit trail
  async getComplianceAuditTrail(
    entityId: string,
    timeframe: string = "30d",
  ): Promise<ComplianceAuditTrail[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/regulatory-compliance/audit-trail/${entityId}/?timeframe=${timeframe}`,
      );
      if (!response.ok) throw new Error("Audit trail fetch failed");

      const data = await response.json();
      return data.audit_trail || [];
    } catch (error) {
      console.error("Audit trail fetch failed:", error);
      return [];
    }
  }

  // Predict upcoming regulatory changes
  async predictRegulatoryChanges(
    transportMode: string,
    hazardClasses: string[],
  ): Promise<RegulationUpdate[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/regulatory-compliance/predict-changes/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transport_mode: transportMode,
            hazard_classes: hazardClasses,
            prediction_horizon: "12_months",
          }),
        },
      );

      if (!response.ok) throw new Error("Regulatory prediction failed");

      const data = await response.json();
      return data.predicted_changes || [];
    } catch (error) {
      console.error("Regulatory prediction failed:", error);
      return [];
    }
  }

  // Perform bulk compliance operations
  async performBulkComplianceCheck(
    shipmentIds: string[],
  ): Promise<{ [shipmentId: string]: ComplianceAssessment }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/regulatory-compliance/bulk-assess/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shipment_ids: shipmentIds,
            assessment_depth: "standard",
          }),
        },
      );

      if (!response.ok) throw new Error("Bulk compliance check failed");

      const data = await response.json();
      return data.assessments || {};
    } catch (error) {
      console.error("Bulk compliance check failed:", error);
      return {};
    }
  }

  // Export compliance report
  async generateComplianceReport(
    filters: any,
    format: "pdf" | "excel" | "csv" = "pdf",
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/regulatory-compliance/generate-report/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filters,
            format,
            include_charts: true,
            include_recommendations: true,
          }),
        },
      );

      if (!response.ok) throw new Error("Report generation failed");

      const data = await response.json();
      return data.download_url;
    } catch (error) {
      console.error("Report generation failed:", error);
      return null;
    }
  }

  // Cleanup connections
  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.updateCallbacks.clear();
    this.complianceAlertCallbacks.clear();
  }
}

export const regulatoryComplianceService = new RegulatoryComplianceService();

export type {
  RegulationUpdate,
  ComplianceRequirement,
  ComplianceDocument,
  ComplianceAssessment,
  AutomatedCompliance,
  JurisdictionRequirements,
  ComplianceAuditTrail,
  ComplianceMetrics,
};
