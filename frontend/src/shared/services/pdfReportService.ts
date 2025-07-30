/**
 * PDF Report Generation Service
 * Handles consolidated shipment report generation
 */
import { apiHelpers } from './api';

export interface ReportSection {
  name: string;
  description: string;
  required: boolean;
  default: boolean;
}

export interface ReportSections {
  shipment_report: ReportSection;
  manifest: ReportSection;
  compliance_certificate: ReportSection;
  compatibility_report: ReportSection;
  sds_documents: ReportSection;
  emergency_procedures: ReportSection;
}

export interface PDFReportRequest {
  shipment_id: string;
  include_sections?: {
    shipment_report?: boolean;
    manifest?: boolean;
    compliance_certificate?: boolean;
    compatibility_report?: boolean;
    sds_documents?: boolean;
    emergency_procedures?: boolean;
  };
}

export interface PDFReportResponse {
  success: boolean;
  filename?: string;
  size?: number;
  error?: string;
  details?: string;
}

export class PDFReportService {
  private static baseUrl = '/documents/api/pdf-reports';

  /**
   * Generate consolidated PDF report for a shipment
   */
  static async generateConsolidatedReport(
    request: PDFReportRequest
  ): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-consolidated-report/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 
          errorData.details || 
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Check if response is PDF
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/pdf')) {
        throw new Error('Invalid response format: expected PDF');
      }

      return await response.blob();
    } catch (error) {
      console.error('Error generating PDF report:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }

  /**
   * Get available report sections and their descriptions
   */
  static async getAvailableReportSections(): Promise<{
    available_sections: ReportSections;
    total_sections: number;
    note: string;
  }> {
    return apiHelpers.get(`${this.baseUrl}/report-sections/`);
  }

  /**
   * Download PDF blob as file
   */
  static downloadPDFBlob(blob: Blob, filename: string): void {
    try {
      const url = URL.createObjectURL(blob);
      const element = document.createElement('a');
      element.href = url;
      element.download = filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw new Error('Failed to download PDF file');
    }
  }

  /**
   * Generate filename for consolidated report
   */
  static generateReportFilename(
    trackingNumber: string, 
    sections?: Record<string, boolean>
  ): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const sectionsCount = sections ? Object.values(sections).filter(Boolean).length : 6;
    return `consolidated_report_${trackingNumber}_${sectionsCount}sections_${timestamp}.pdf`;
  }

  /**
   * Validate report request
   */
  static validateReportRequest(request: PDFReportRequest): string[] {
    const errors: string[] = [];

    if (!request.shipment_id || typeof request.shipment_id !== 'string') {
      errors.push('Shipment ID is required and must be a string');
    }

    if (request.include_sections) {
      const validSections = [
        'shipment_report',
        'manifest',
        'compliance_certificate',
        'compatibility_report',
        'sds_documents',
        'emergency_procedures'
      ];

      const invalidSections = Object.keys(request.include_sections).filter(
        section => !validSections.includes(section)
      );

      if (invalidSections.length > 0) {
        errors.push(`Invalid sections: ${invalidSections.join(', ')}`);
      }

      // Check if at least one section is selected
      const selectedSections = Object.values(request.include_sections).filter(Boolean);
      if (selectedSections.length === 0) {
        errors.push('At least one report section must be selected');
      }
    }

    return errors;
  }

  /**
   * Get default report sections configuration
   */
  static getDefaultSections(): Record<string, boolean> {
    return {
      shipment_report: true,
      manifest: true,
      compliance_certificate: true,
      compatibility_report: true,
      sds_documents: true,
      emergency_procedures: true
    };
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if browser supports PDF download
   */
  static supportsPDFDownload(): boolean {
    return typeof window !== 'undefined' && 
           'URL' in window && 
           'createObjectURL' in URL &&
           typeof document !== 'undefined';
  }
}

export default PDFReportService;