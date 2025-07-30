/**
 * React hook for PDF report generation
 * Handles state management, API calls, and error handling
 */
import { useState, useCallback } from 'react';
import { PDFReportService, PDFReportRequest, ReportSections } from '@/shared/services/pdfReportService';

interface UseReportGenerationState {
  isGenerating: boolean;
  progress: number;
  error: string | null;
  lastGeneratedReport: string | null;
}

interface UseReportGenerationOptions {
  onSuccess?: (filename: string, blob: Blob) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
  autoDownload?: boolean;
}

interface UseReportGenerationReturn {
  // State
  isGenerating: boolean;
  progress: number;
  error: string | null;
  lastGeneratedReport: string | null;
  
  // Actions
  generateReport: (request: PDFReportRequest) => Promise<void>;
  clearError: () => void;
  resetState: () => void;
  
  // Helper functions
  getDefaultSections: () => Record<string, boolean>;
  validateRequest: (request: PDFReportRequest) => string[];
  formatFileSize: (bytes: number) => string;
  supportsPDFDownload: () => boolean;
}

export const useReportGeneration = (
  options: UseReportGenerationOptions = {}
): UseReportGenerationReturn => {
  const {
    onSuccess,
    onError,
    onProgress,
    autoDownload = true
  } = options;

  const [state, setState] = useState<UseReportGenerationState>({
    isGenerating: false,
    progress: 0,
    error: null,
    lastGeneratedReport: null
  });

  const updateState = useCallback((updates: Partial<UseReportGenerationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const resetState = useCallback(() => {
    setState({
      isGenerating: false,
      progress: 0,
      error: null,
      lastGeneratedReport: null
    });
  }, []);

  const generateReport = useCallback(async (request: PDFReportRequest) => {
    try {
      // Clear previous state
      updateState({
        isGenerating: true,
        progress: 0,
        error: null
      });

      // Validate request
      const validationErrors = PDFReportService.validateReportRequest(request);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Check browser support
      if (autoDownload && !PDFReportService.supportsPDFDownload()) {
        throw new Error('PDF download is not supported in this browser');
      }

      // Simulate progress updates during API call
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
        onProgress?.(Math.min(state.progress + 10, 90));
      }, 200);

      try {
        // Generate PDF
        const blob = await PDFReportService.generateConsolidatedReport(request);
        
        // Clear progress interval
        clearInterval(progressInterval);
        
        // Complete progress
        updateState({ progress: 100 });
        onProgress?.(100);

        // Generate filename
        const trackingNumber = `SHIP-${request.shipment_id.slice(-8)}`;
        const filename = PDFReportService.generateReportFilename(
          trackingNumber,
          request.include_sections
        );

        // Auto-download if enabled
        if (autoDownload) {
          PDFReportService.downloadPDFBlob(blob, filename);
        }

        // Update state with success
        updateState({
          isGenerating: false,
          lastGeneratedReport: filename,
          error: null
        });

        // Call success callback
        onSuccess?.(filename, blob);

      } catch (apiError) {
        clearInterval(progressInterval);
        throw apiError;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      updateState({
        isGenerating: false,
        progress: 0,
        error: errorMessage
      });

      onError?.(error instanceof Error ? error : new Error(errorMessage));
      
      console.error('Report generation failed:', error);
    }
  }, [updateState, onSuccess, onError, onProgress, autoDownload, state.progress]);

  return {
    // State
    isGenerating: state.isGenerating,
    progress: state.progress,
    error: state.error,
    lastGeneratedReport: state.lastGeneratedReport,
    
    // Actions
    generateReport,
    clearError,
    resetState,
    
    // Helper functions
    getDefaultSections: PDFReportService.getDefaultSections,
    validateRequest: PDFReportService.validateReportRequest,
    formatFileSize: PDFReportService.formatFileSize,
    supportsPDFDownload: PDFReportService.supportsPDFDownload
  };
};

export default useReportGeneration;