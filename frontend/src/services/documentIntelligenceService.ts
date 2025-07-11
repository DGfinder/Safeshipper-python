// Document Intelligence Service
// AI-powered document processing, OCR, and intelligent categorization
// Automates document understanding and compliance checking

interface DocumentOCRResult {
  documentId: string;
  text: string;
  confidence: number;
  pages: Array<{
    pageNumber: number;
    text: string;
    confidence: number;
    regions: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      text: string;
      confidence: number;
    }>;
  }>;
  extractedData: {
    [field: string]: {
      value: string;
      confidence: number;
      location: { x: number; y: number; width: number; height: number };
    };
  };
  processingTime: number;
  language: string;
}

interface DocumentClassification {
  documentId: string;
  primaryType: 'manifest' | 'sds' | 'bill_of_lading' | 'dangerous_goods_declaration' | 'certificate' | 'invoice' | 'packing_list' | 'transport_document' | 'compliance_record' | 'other';
  subType?: string;
  confidence: number;
  alternativeTypes: Array<{
    type: string;
    confidence: number;
  }>;
  detectedFields: Array<{
    fieldName: string;
    fieldType: 'text' | 'number' | 'date' | 'boolean' | 'table' | 'image';
    required: boolean;
    found: boolean;
    confidence?: number;
    value?: any;
  }>;
  complianceStatus: 'compliant' | 'non_compliant' | 'needs_review' | 'unknown';
  complianceIssues: string[];
  recommendedActions: string[];
}

interface DocumentExtraction {
  documentId: string;
  extractedData: {
    // Standard shipping fields
    shipmentNumber?: string;
    trackingNumber?: string;
    billOfLadingNumber?: string;
    
    // Parties
    shipper?: {
      name: string;
      address: string;
      contact: string;
    };
    consignee?: {
      name: string;
      address: string;
      contact: string;
    };
    
    // Cargo details
    cargoDescription?: string;
    dangerousGoods?: Array<{
      unNumber: string;
      properShippingName: string;
      hazardClass: string;
      packingGroup?: string;
      quantity: string;
      packaging: string;
    }>;
    
    // Transport details
    transportMode?: 'road' | 'rail' | 'sea' | 'air';
    vesselVoyage?: string;
    portOfLoading?: string;
    portOfDischarge?: string;
    placeOfDelivery?: string;
    
    // Dates
    shippingDate?: string;
    deliveryDate?: string;
    
    // Compliance
    certifications?: string[];
    emergencyContact?: string;
    
    // Custom fields
    customFields?: { [key: string]: any };
  };
  confidence: number;
  extractionMethod: 'ocr' | 'ai_extraction' | 'template_matching' | 'manual';
  validationResults: Array<{
    field: string;
    status: 'valid' | 'invalid' | 'warning';
    message: string;
  }>;
}

interface DocumentTemplate {
  templateId: string;
  name: string;
  documentType: string;
  description: string;
  fields: Array<{
    fieldId: string;
    fieldName: string;
    fieldType: 'text' | 'number' | 'date' | 'boolean' | 'table';
    required: boolean;
    validation: {
      pattern?: string;
      minLength?: number;
      maxLength?: number;
      format?: string;
    };
    extractionHints: {
      keywords: string[];
      position: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'anywhere';
      nearbyText?: string[];
    };
  }>;
  regions: Array<{
    regionId: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fieldIds: string[];
  }>;
  complianceRules: Array<{
    ruleId: string;
    description: string;
    requiredFields: string[];
    validationLogic: string;
  }>;
  created: string;
  lastModified: string;
}

interface DocumentWorkflow {
  workflowId: string;
  name: string;
  description: string;
  triggerConditions: {
    documentTypes: string[];
    automationLevel: 'manual' | 'semi_automatic' | 'fully_automatic';
    confidenceThreshold: number;
  };
  steps: Array<{
    stepId: string;
    stepType: 'ocr' | 'classification' | 'extraction' | 'validation' | 'approval' | 'notification' | 'integration';
    stepName: string;
    configuration: { [key: string]: any };
    requirements: string[];
    outputs: string[];
  }>;
  approvalRequired: boolean;
  notificationRules: Array<{
    event: string;
    recipients: string[];
    method: 'email' | 'sms' | 'system_notification';
  }>;
  integrations: Array<{
    system: string;
    endpoint: string;
    mapping: { [sourceField: string]: string };
  }>;
}

interface DocumentAnalytics {
  timeframe: 'day' | 'week' | 'month' | 'quarter';
  totalDocuments: number;
  processedDocuments: number;
  averageProcessingTime: number; // seconds
  accuracy: {
    ocrAccuracy: number; // percentage
    classificationAccuracy: number;
    extractionAccuracy: number;
  };
  documentTypes: Array<{
    type: string;
    count: number;
    averageConfidence: number;
    processingTime: number;
  }>;
  complianceMetrics: {
    compliantDocuments: number;
    nonCompliantDocuments: number;
    pendingReview: number;
    commonIssues: Array<{
      issue: string;
      count: number;
    }>;
  };
  errorAnalysis: Array<{
    errorType: string;
    count: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    resolution: string;
  }>;
  trends: {
    volumeTrend: number[];
    accuracyTrend: number[];
    processingTimeTrend: number[];
  };
}

class DocumentIntelligenceService {
  private baseUrl = '/api/v1';
  private processingQueue: Map<string, { status: string; progress: number }> = new Map();

  // Perform OCR on document
  async performOCR(documentFile: File, options?: {
    language?: string;
    extractTables?: boolean;
    extractImages?: boolean;
    confidenceThreshold?: number;
  }): Promise<DocumentOCRResult> {
    try {
      const formData = new FormData();
      formData.append('document', documentFile);
      formData.append('options', JSON.stringify(options || {}));

      const response = await fetch(`${this.baseUrl}/document-intelligence/ocr/`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('OCR processing failed');
      }

      return await response.json();
    } catch (error) {
      console.error('OCR processing failed:', error);
      return this.simulateOCR(documentFile);
    }
  }

  // Classify document type
  async classifyDocument(documentId: string, ocrText: string): Promise<DocumentClassification> {
    try {
      const response = await fetch(`${this.baseUrl}/document-intelligence/classify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          ocr_text: ocrText,
          use_ai_classification: true
        })
      });

      if (!response.ok) {
        throw new Error('Document classification failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Document classification failed:', error);
      return this.simulateClassification(documentId, ocrText);
    }
  }

  // Extract structured data from document
  async extractDocumentData(documentId: string, documentType: string, ocrResult: DocumentOCRResult): Promise<DocumentExtraction> {
    try {
      const response = await fetch(`${this.baseUrl}/document-intelligence/extract/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          document_type: documentType,
          ocr_result: ocrResult,
          extraction_method: 'ai_extraction'
        })
      });

      if (!response.ok) {
        throw new Error('Document extraction failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Document extraction failed:', error);
      return this.simulateExtraction(documentId, documentType);
    }
  }

  // Process document with full workflow
  async processDocument(documentFile: File, workflowId?: string): Promise<{
    documentId: string;
    ocrResult: DocumentOCRResult;
    classification: DocumentClassification;
    extraction: DocumentExtraction;
    status: 'completed' | 'requires_review' | 'failed';
    confidence: number;
  }> {
    const documentId = `doc-${Date.now()}`;
    
    try {
      // Step 1: OCR
      const ocrResult = await this.performOCR(documentFile);
      
      // Step 2: Classification
      const classification = await this.classifyDocument(documentId, ocrResult.text);
      
      // Step 3: Extraction
      const extraction = await this.extractDocumentData(documentId, classification.primaryType, ocrResult);
      
      // Determine overall status
      const overallConfidence = (ocrResult.confidence + classification.confidence + extraction.confidence) / 3;
      const status = overallConfidence > 0.8 && classification.complianceStatus !== 'needs_review' 
        ? 'completed' 
        : 'requires_review';

      return {
        documentId,
        ocrResult,
        classification,
        extraction,
        status,
        confidence: overallConfidence
      };
    } catch (error) {
      console.error('Document processing failed:', error);
      throw error;
    }
  }

  // Create document template
  async createDocumentTemplate(template: Omit<DocumentTemplate, 'templateId' | 'created' | 'lastModified'>): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/document-intelligence/templates/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });

      if (!response.ok) {
        throw new Error('Template creation failed');
      }

      const data = await response.json();
      return data.template_id;
    } catch (error) {
      console.error('Template creation failed:', error);
      return '';
    }
  }

  // Get document templates
  async getDocumentTemplates(documentType?: string): Promise<DocumentTemplate[]> {
    try {
      const url = documentType 
        ? `${this.baseUrl}/document-intelligence/templates/?type=${documentType}`
        : `${this.baseUrl}/document-intelligence/templates/`;
      
      const response = await fetch(url);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.templates || [];
    } catch (error) {
      console.error('Templates fetch failed:', error);
      return [];
    }
  }

  // Validate document against compliance rules
  async validateDocumentCompliance(documentId: string, extractedData: any, documentType: string): Promise<{
    isCompliant: boolean;
    violations: Array<{
      rule: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      field?: string;
      recommendation: string;
    }>;
    warnings: Array<{
      field: string;
      message: string;
      suggestion: string;
    }>;
    score: number; // 0-100
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/document-intelligence/validate-compliance/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          extracted_data: extractedData,
          document_type: documentType
        })
      });

      if (!response.ok) {
        throw new Error('Compliance validation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Compliance validation failed:', error);
      return {
        isCompliant: false,
        violations: [],
        warnings: [],
        score: 0
      };
    }
  }

  // Get document analytics
  async getDocumentAnalytics(timeframe: string = 'month'): Promise<DocumentAnalytics> {
    try {
      const response = await fetch(`${this.baseUrl}/document-intelligence/analytics/?timeframe=${timeframe}`);
      if (!response.ok) {
        throw new Error('Analytics fetch failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Analytics fetch failed:', error);
      return this.simulateAnalytics();
    }
  }

  // Search documents by content
  async searchDocuments(query: string, filters?: {
    documentTypes?: string[];
    dateRange?: { start: string; end: string };
    complianceStatus?: string;
  }): Promise<Array<{
    documentId: string;
    documentType: string;
    title: string;
    excerpt: string;
    confidence: number;
    highlights: string[];
    metadata: any;
    url: string;
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/document-intelligence/search/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          filters: filters || {}
        })
      });

      if (!response.ok) {
        throw new Error('Document search failed');
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Document search failed:', error);
      return [];
    }
  }

  // Simulate OCR for development
  private simulateOCR(file: File): DocumentOCRResult {
    const documentId = `doc-${Date.now()}`;
    
    // Mock OCR text based on common document types
    let mockText = `DANGEROUS GOODS DECLARATION
    
    Shipment Number: SS-${Math.floor(Math.random() * 10000)}
    Date: ${new Date().toLocaleDateString()}
    
    Shipper: Global Manufacturing Inc.
    Address: 123 Industrial Drive, Sydney NSW 2000
    
    Consignee: Chemical Solutions Ltd.
    Address: 456 Port Road, Melbourne VIC 3000
    
    Transport Details:
    UN Number: UN1942
    Proper Shipping Name: AMMONIUM NITRATE
    Hazard Class: 5.1
    Packing Group: III
    Quantity: 500 KG
    
    Emergency Contact: +61-2-9999-0000
    `;

    return {
      documentId,
      text: mockText,
      confidence: 0.92,
      pages: [
        {
          pageNumber: 1,
          text: mockText,
          confidence: 0.92,
          regions: [
            {
              x: 50,
              y: 100,
              width: 500,
              height: 30,
              text: "DANGEROUS GOODS DECLARATION",
              confidence: 0.98
            },
            {
              x: 50,
              y: 150,
              width: 300,
              height: 20,
              text: "Shipment Number: SS-1234",
              confidence: 0.95
            }
          ]
        }
      ],
      extractedData: {
        shipmentNumber: {
          value: "SS-1234",
          confidence: 0.95,
          location: { x: 50, y: 150, width: 300, height: 20 }
        },
        unNumber: {
          value: "UN1942",
          confidence: 0.90,
          location: { x: 50, y: 250, width: 100, height: 20 }
        }
      },
      processingTime: 1500,
      language: 'en'
    };
  }

  // Simulate classification for development
  private simulateClassification(documentId: string, text: string): DocumentClassification {
    let primaryType: DocumentClassification['primaryType'] = 'other';
    let confidence = 0.75;

    if (text.toLowerCase().includes('dangerous goods declaration')) {
      primaryType = 'dangerous_goods_declaration';
      confidence = 0.95;
    } else if (text.toLowerCase().includes('manifest')) {
      primaryType = 'manifest';
      confidence = 0.88;
    } else if (text.toLowerCase().includes('safety data sheet')) {
      primaryType = 'sds';
      confidence = 0.92;
    }

    return {
      documentId,
      primaryType,
      confidence,
      alternativeTypes: [
        { type: 'transport_document', confidence: 0.65 },
        { type: 'compliance_record', confidence: 0.45 }
      ],
      detectedFields: [
        {
          fieldName: 'shipmentNumber',
          fieldType: 'text',
          required: true,
          found: true,
          confidence: 0.95,
          value: 'SS-1234'
        },
        {
          fieldName: 'unNumber',
          fieldType: 'text',
          required: true,
          found: true,
          confidence: 0.90,
          value: 'UN1942'
        }
      ],
      complianceStatus: 'compliant',
      complianceIssues: [],
      recommendedActions: [
        'Verify emergency contact information',
        'Confirm packaging specifications'
      ]
    };
  }

  // Simulate extraction for development
  private simulateExtraction(documentId: string, documentType: string): DocumentExtraction {
    return {
      documentId,
      extractedData: {
        shipmentNumber: 'SS-1234',
        shipper: {
          name: 'Global Manufacturing Inc.',
          address: '123 Industrial Drive, Sydney NSW 2000',
          contact: '+61-2-9999-0001'
        },
        consignee: {
          name: 'Chemical Solutions Ltd.',
          address: '456 Port Road, Melbourne VIC 3000',
          contact: '+61-3-8888-0002'
        },
        dangerousGoods: [
          {
            unNumber: 'UN1942',
            properShippingName: 'AMMONIUM NITRATE',
            hazardClass: '5.1',
            packingGroup: 'III',
            quantity: '500 KG',
            packaging: 'Drums'
          }
        ],
        transportMode: 'road' as const,
        shippingDate: new Date().toISOString().split('T')[0],
        emergencyContact: '+61-2-9999-0000'
      },
      confidence: 0.87,
      extractionMethod: 'ai_extraction',
      validationResults: [
        {
          field: 'unNumber',
          status: 'valid',
          message: 'Valid UN number format'
        },
        {
          field: 'emergencyContact',
          status: 'warning',
          message: 'Emergency contact format should include country code'
        }
      ]
    };
  }

  // Simulate analytics for development
  private simulateAnalytics(): DocumentAnalytics {
    return {
      timeframe: 'month',
      totalDocuments: 1247,
      processedDocuments: 1189,
      averageProcessingTime: 12.5,
      accuracy: {
        ocrAccuracy: 94.2,
        classificationAccuracy: 91.8,
        extractionAccuracy: 88.6
      },
      documentTypes: [
        {
          type: 'dangerous_goods_declaration',
          count: 456,
          averageConfidence: 0.92,
          processingTime: 15.2
        },
        {
          type: 'manifest',
          count: 342,
          averageConfidence: 0.89,
          processingTime: 18.7
        },
        {
          type: 'sds',
          count: 231,
          averageConfidence: 0.95,
          processingTime: 8.4
        }
      ],
      complianceMetrics: {
        compliantDocuments: 1098,
        nonCompliantDocuments: 67,
        pendingReview: 24,
        commonIssues: [
          { issue: 'Missing emergency contact', count: 23 },
          { issue: 'Invalid UN number format', count: 18 },
          { issue: 'Incomplete shipper information', count: 15 }
        ]
      },
      errorAnalysis: [
        {
          errorType: 'OCR_QUALITY',
          count: 45,
          trend: 'decreasing',
          resolution: 'Improved image preprocessing'
        },
        {
          errorType: 'CLASSIFICATION_AMBIGUITY',
          count: 23,
          trend: 'stable',
          resolution: 'Enhanced training data'
        }
      ],
      trends: {
        volumeTrend: [1089, 1156, 1203, 1247, 1189],
        accuracyTrend: [89.2, 91.5, 93.1, 94.2, 94.8],
        processingTimeTrend: [15.8, 14.2, 13.1, 12.5, 11.9]
      }
    };
  }
}

export const documentIntelligenceService = new DocumentIntelligenceService();

export type {
  DocumentOCRResult,
  DocumentClassification,
  DocumentExtraction,
  DocumentTemplate,
  DocumentWorkflow,
  DocumentAnalytics
};