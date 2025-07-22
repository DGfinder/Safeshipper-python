/**
 * Smart Document Processing Plugin
 * AI-powered document intelligence for dangerous goods compliance
 * Automatically extracts, validates, and cross-references critical safety data
 */

interface DocumentType {
  type: 'SDS' | 'DGD' | 'MANIFEST' | 'CERTIFICATE' | 'INSPECTION' | 'PERMIT';
  mimeType: string;
  maxSizeBytes: number;
  requiredFields: string[];
  validationRules: string[];
}

interface ExtractedField {
  fieldName: string;
  value: string;
  confidence: number;
  location?: {
    page: number;
    bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  };
  validationStatus: 'VALID' | 'INVALID' | 'WARNING' | 'PENDING';
  validationMessage?: string;
}

interface ProcessingResult {
  documentId: string;
  documentType: DocumentType['type'];
  processingStatus: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REQUIRES_REVIEW';
  extractedFields: ExtractedField[];
  validationSummary: {
    overallScore: number;
    criticalIssues: number;
    warnings: number;
    missingFields: string[];
  };
  crossReferenceResults?: {
    unNumberValidation?: boolean;
    regulatoryCompliance?: boolean;
    consistencyCheck?: boolean;
  };
  recommendations: string[];
  processingTime: number;
  timestamp: Date;
}

interface AIModelConfig {
  ocrModel: 'tesseract' | 'aws-textract' | 'google-vision' | 'azure-form-recognizer';
  nlpModel: 'openai-gpt' | 'anthropic-claude' | 'azure-openai' | 'custom';
  confidenceThreshold: number;
  enableCrossReference: boolean;
  enableRegulatoryValidation: boolean;
}

export class SmartDocumentProcessor {
  private config: AIModelConfig;
  private supportedDocTypes: Map<string, DocumentType>;
  private processingQueue: Map<string, ProcessingResult>;
  private regulatoryDatabase: Map<string, any>;

  constructor(config: Partial<AIModelConfig> = {}) {
    this.config = {
      ocrModel: 'aws-textract',
      nlpModel: 'openai-gpt',
      confidenceThreshold: 0.8,
      enableCrossReference: true,
      enableRegulatoryValidation: true,
      ...config
    };

    this.supportedDocTypes = new Map();
    this.processingQueue = new Map();
    this.regulatoryDatabase = new Map();
    
    this.initializeDocumentTypes();
    this.loadRegulatoryDatabase();
  }

  /**
   * Initialize supported document types and their validation rules
   */
  private initializeDocumentTypes(): void {
    // Safety Data Sheet (SDS)
    this.supportedDocTypes.set('SDS', {
      type: 'SDS',
      mimeType: 'application/pdf',
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      requiredFields: [
        'product_name',
        'un_number',
        'hazard_class',
        'packing_group',
        'proper_shipping_name',
        'emergency_contact',
        'manufacturer_name',
        'revision_date'
      ],
      validationRules: [
        'UN_NUMBER_FORMAT',
        'HAZARD_CLASS_VALID',
        'PACKING_GROUP_VALID',
        'EMERGENCY_CONTACT_VALID',
        'DATE_FORMAT_VALID'
      ]
    });

    // Dangerous Goods Declaration (DGD)
    this.supportedDocTypes.set('DGD', {
      type: 'DGD',
      mimeType: 'application/pdf',
      maxSizeBytes: 5 * 1024 * 1024, // 5MB
      requiredFields: [
        'shipper_name',
        'consignee_name',
        'un_number',
        'proper_shipping_name',
        'hazard_class',
        'packing_group',
        'total_quantity',
        'packaging_type',
        'declaration_signature',
        'date_signed'
      ],
      validationRules: [
        'UN_NUMBER_CROSS_REFERENCE',
        'QUANTITY_LIMITS_CHECK',
        'PACKAGING_COMPATIBILITY',
        'SIGNATURE_PRESENT',
        'DATE_VALIDITY'
      ]
    });

    // Shipping Manifest
    this.supportedDocTypes.set('MANIFEST', {
      type: 'MANIFEST',
      mimeType: 'application/pdf',
      maxSizeBytes: 20 * 1024 * 1024, // 20MB
      requiredFields: [
        'vessel_name',
        'voyage_number',
        'port_of_loading',
        'port_of_discharge',
        'container_numbers',
        'dangerous_goods_list',
        'segregation_plan'
      ],
      validationRules: [
        'SEGREGATION_COMPLIANCE',
        'CONTAINER_WEIGHT_LIMITS',
        'PORT_RESTRICTIONS',
        'STOWAGE_REQUIREMENTS'
      ]
    });
  }

  /**
   * Load regulatory database for cross-referencing
   */
  private async loadRegulatoryDatabase(): Promise<void> {
    try {
      // In production, this would load from actual regulatory APIs
      const response = await fetch('/api/documents/regulatory-database');
      if (response.ok) {
        const data = await response.json();
        data.forEach((item: any) => {
          this.regulatoryDatabase.set(item.unNumber, item);
        });
      }
    } catch (error) {
      console.error('Failed to load regulatory database:', error);
      // Load fallback data
      this.loadFallbackRegulatoryData();
    }
  }

  /**
   * Process document using AI-powered extraction and validation
   */
  public async processDocument(
    file: File,
    documentType: DocumentType['type'],
    options: {
      expedited?: boolean;
      skipValidation?: boolean;
      customFields?: string[];
    } = {}
  ): Promise<ProcessingResult> {
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Initialize processing result
    const result: ProcessingResult = {
      documentId,
      documentType,
      processingStatus: 'PROCESSING',
      extractedFields: [],
      validationSummary: {
        overallScore: 0,
        criticalIssues: 0,
        warnings: 0,
        missingFields: []
      },
      recommendations: [],
      processingTime: 0,
      timestamp: new Date()
    };

    this.processingQueue.set(documentId, result);

    try {
      // Step 1: Validate file format and size
      await this.validateFile(file, documentType);

      // Step 2: Extract text using OCR
      const ocrResult = await this.performOCR(file);

      // Step 3: Extract structured data using NLP
      const extractedFields = await this.extractFields(ocrResult, documentType, options.customFields);

      // Step 4: Validate extracted data
      if (!options.skipValidation) {
        await this.validateExtractedData(extractedFields, documentType);
      }

      // Step 5: Cross-reference with regulatory databases
      if (this.config.enableCrossReference) {
        await this.performCrossReference(extractedFields);
      }

      // Step 6: Generate validation summary and recommendations
      const validationSummary = this.generateValidationSummary(extractedFields);
      const recommendations = this.generateRecommendations(extractedFields, documentType);

      // Update result
      result.extractedFields = extractedFields;
      result.validationSummary = validationSummary;
      result.recommendations = recommendations;
      result.processingStatus = validationSummary.criticalIssues > 0 ? 'REQUIRES_REVIEW' : 'COMPLETED';
      result.processingTime = Date.now() - startTime;

      // Store in queue
      this.processingQueue.set(documentId, result);

      return result;

    } catch (error) {
      console.error('Document processing failed:', error);
      
      result.processingStatus = 'FAILED';
      result.processingTime = Date.now() - startTime;
      result.recommendations = ['Document processing failed. Please try again or contact support.'];
      
      this.processingQueue.set(documentId, result);
      return result;
    }
  }

  /**
   * Validate uploaded file
   */
  private async validateFile(file: File, documentType: DocumentType['type']): Promise<void> {
    const docType = this.supportedDocTypes.get(documentType);
    if (!docType) {
      throw new Error(`Unsupported document type: ${documentType}`);
    }

    if (file.size > docType.maxSizeBytes) {
      throw new Error(`File size exceeds limit of ${docType.maxSizeBytes / 1024 / 1024}MB`);
    }

    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      throw new Error('Only PDF and image files are supported');
    }
  }

  /**
   * Perform OCR on document
   */
  private async performOCR(file: File): Promise<{
    text: string;
    pages: Array<{
      pageNumber: number;
      text: string;
      confidence: number;
      elements: Array<{
        text: string;
        bbox: [number, number, number, number];
        confidence: number;
      }>;
    }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', this.config.ocrModel);

    try {
      const response = await fetch('/api/documents/ocr', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`OCR failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('OCR processing failed:', error);
      
      // Fallback to basic text extraction
      return {
        text: 'OCR processing unavailable',
        pages: [{
          pageNumber: 1,
          text: 'OCR processing unavailable',
          confidence: 0.1,
          elements: []
        }]
      };
    }
  }

  /**
   * Extract structured fields using NLP
   */
  private async extractFields(
    ocrResult: any,
    documentType: DocumentType['type'],
    customFields?: string[]
  ): Promise<ExtractedField[]> {
    const docType = this.supportedDocTypes.get(documentType)!;
    const fieldsToExtract = customFields || docType.requiredFields;
    
    try {
      const response = await fetch('/api/documents/extract-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          text: ocrResult.text,
          pages: ocrResult.pages,
          documentType,
          fields: fieldsToExtract,
          model: this.config.nlpModel
        })
      });

      if (!response.ok) {
        throw new Error(`Field extraction failed: ${response.statusText}`);
      }

      const extractedData = await response.json();
      
      // Transform to ExtractedField format
      return extractedData.fields.map((field: any) => ({
        fieldName: field.name,
        value: field.value,
        confidence: field.confidence,
        location: field.location,
        validationStatus: 'PENDING',
        validationMessage: undefined
      }));

    } catch (error) {
      console.error('Field extraction failed:', error);
      
      // Return fallback extracted fields
      return fieldsToExtract.map(fieldName => ({
        fieldName,
        value: '',
        confidence: 0.1,
        validationStatus: 'PENDING' as const
      }));
    }
  }

  /**
   * Validate extracted data against regulatory rules
   */
  private async validateExtractedData(
    fields: ExtractedField[],
    documentType: DocumentType['type']
  ): Promise<void> {
    const docType = this.supportedDocTypes.get(documentType)!;

    for (const field of fields) {
      // Skip if confidence is too low
      if (field.confidence < this.config.confidenceThreshold) {
        field.validationStatus = 'WARNING';
        field.validationMessage = `Low confidence extraction (${Math.round(field.confidence * 100)}%)`;
        continue;
      }

      // Apply validation rules
      switch (field.fieldName) {
        case 'un_number':
          this.validateUNNumber(field);
          break;
        case 'hazard_class':
          this.validateHazardClass(field);
          break;
        case 'packing_group':
          this.validatePackingGroup(field);
          break;
        case 'emergency_contact':
          this.validateEmergencyContact(field);
          break;
        case 'date_signed':
        case 'revision_date':
          this.validateDate(field);
          break;
        default:
          field.validationStatus = 'VALID';
      }
    }
  }

  /**
   * Validate UN number format and existence
   */
  private validateUNNumber(field: ExtractedField): void {
    const unPattern = /^UN\d{4}$/i;
    
    if (!unPattern.test(field.value)) {
      field.validationStatus = 'INVALID';
      field.validationMessage = 'Invalid UN number format (expected UNXXXX)';
      return;
    }

    // Check against regulatory database
    const unNumber = field.value.toUpperCase();
    if (this.regulatoryDatabase.has(unNumber)) {
      field.validationStatus = 'VALID';
      field.validationMessage = 'UN number verified in regulatory database';
    } else {
      field.validationStatus = 'WARNING';
      field.validationMessage = 'UN number not found in regulatory database';
    }
  }

  /**
   * Validate hazard class
   */
  private validateHazardClass(field: ExtractedField): void {
    const validClasses = [
      '1', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6',
      '2.1', '2.2', '2.3',
      '3',
      '4.1', '4.2', '4.3',
      '5.1', '5.2',
      '6.1', '6.2',
      '7',
      '8',
      '9'
    ];

    if (validClasses.includes(field.value)) {
      field.validationStatus = 'VALID';
    } else {
      field.validationStatus = 'INVALID';
      field.validationMessage = `Invalid hazard class: ${field.value}`;
    }
  }

  /**
   * Validate packing group
   */
  private validatePackingGroup(field: ExtractedField): void {
    const validGroups = ['I', 'II', 'III', 'PG I', 'PG II', 'PG III'];
    
    if (validGroups.some(group => field.value.includes(group))) {
      field.validationStatus = 'VALID';
    } else {
      field.validationStatus = 'INVALID';
      field.validationMessage = `Invalid packing group: ${field.value}`;
    }
  }

  /**
   * Validate emergency contact information
   */
  private validateEmergencyContact(field: ExtractedField): void {
    const phonePattern = /\+?[\d\s\-\(\)]{10,}/;
    
    if (phonePattern.test(field.value)) {
      field.validationStatus = 'VALID';
    } else {
      field.validationStatus = 'WARNING';
      field.validationMessage = 'Emergency contact may be incomplete';
    }
  }

  /**
   * Validate date format
   */
  private validateDate(field: ExtractedField): void {
    const datePattern = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}/;
    
    if (datePattern.test(field.value)) {
      const date = new Date(field.value);
      if (!isNaN(date.getTime())) {
        field.validationStatus = 'VALID';
      } else {
        field.validationStatus = 'INVALID';
        field.validationMessage = 'Invalid date format';
      }
    } else {
      field.validationStatus = 'INVALID';
      field.validationMessage = 'Date not recognized';
    }
  }

  /**
   * Cross-reference extracted data with regulatory databases
   */
  private async performCrossReference(fields: ExtractedField[]): Promise<void> {
    const unField = fields.find(f => f.fieldName === 'un_number');
    const hazardField = fields.find(f => f.fieldName === 'hazard_class');

    if (unField && hazardField && unField.validationStatus === 'VALID') {
      const regulatoryData = this.regulatoryDatabase.get(unField.value);
      
      if (regulatoryData && regulatoryData.hazardClass !== hazardField.value) {
        hazardField.validationStatus = 'WARNING';
        hazardField.validationMessage = 
          `Hazard class mismatch: Document shows ${hazardField.value}, ` +
          `regulatory database shows ${regulatoryData.hazardClass}`;
      }
    }
  }

  /**
   * Generate validation summary
   */
  private generateValidationSummary(fields: ExtractedField[]): ProcessingResult['validationSummary'] {
    const criticalIssues = fields.filter(f => f.validationStatus === 'INVALID').length;
    const warnings = fields.filter(f => f.validationStatus === 'WARNING').length;
    const validFields = fields.filter(f => f.validationStatus === 'VALID').length;
    const totalFields = fields.length;

    const overallScore = totalFields > 0 ? Math.round((validFields / totalFields) * 100) : 0;

    const docType = this.supportedDocTypes.get(fields[0]?.fieldName.includes('un_') ? 'DGD' : 'SDS');
    const requiredFields = docType?.requiredFields || [];
    const extractedFieldNames = fields.map(f => f.fieldName);
    const missingFields = requiredFields.filter(rf => !extractedFieldNames.includes(rf));

    return {
      overallScore,
      criticalIssues,
      warnings,
      missingFields
    };
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(
    fields: ExtractedField[],
    documentType: DocumentType['type']
  ): string[] {
    const recommendations: string[] = [];

    // Check for critical issues
    const invalidFields = fields.filter(f => f.validationStatus === 'INVALID');
    if (invalidFields.length > 0) {
      recommendations.push(
        `Review and correct ${invalidFields.length} invalid field(s): ` +
        invalidFields.map(f => f.fieldName).join(', ')
      );
    }

    // Check for low confidence extractions
    const lowConfidenceFields = fields.filter(f => f.confidence < this.config.confidenceThreshold);
    if (lowConfidenceFields.length > 0) {
      recommendations.push(
        'Manual verification recommended for fields with low extraction confidence'
      );
    }

    // Document type specific recommendations
    if (documentType === 'SDS') {
      const unField = fields.find(f => f.fieldName === 'un_number');
      if (unField?.validationStatus === 'VALID') {
        recommendations.push('Cross-reference SDS with latest regulatory updates');
      }
    }

    if (documentType === 'DGD') {
      recommendations.push('Verify segregation requirements with other dangerous goods in shipment');
    }

    return recommendations;
  }

  /**
   * Get processing status
   */
  public getProcessingStatus(documentId: string): ProcessingResult | null {
    return this.processingQueue.get(documentId) || null;
  }

  /**
   * Get processing history
   */
  public getProcessingHistory(limit: number = 50): ProcessingResult[] {
    return Array.from(this.processingQueue.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Load fallback regulatory data
   */
  private loadFallbackRegulatoryData(): void {
    const fallbackData = [
      {
        unNumber: 'UN1203',
        properShippingName: 'Gasoline',
        hazardClass: '3',
        packingGroup: 'II'
      },
      {
        unNumber: 'UN1863',
        properShippingName: 'Fuel, aviation, turbine engine',
        hazardClass: '3',
        packingGroup: 'III'
      }
    ];

    fallbackData.forEach(item => {
      this.regulatoryDatabase.set(item.unNumber, item);
    });
  }
}

// Export singleton instance
export const smartDocumentProcessor = new SmartDocumentProcessor();

// Export utility functions
export const processDocument = (
  file: File,
  documentType: DocumentType['type'],
  options?: any
) => smartDocumentProcessor.processDocument(file, documentType, options);

export const getProcessingStatus = (documentId: string) => 
  smartDocumentProcessor.getProcessingStatus(documentId);

export default SmartDocumentProcessor;