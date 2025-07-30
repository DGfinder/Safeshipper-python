/**
 * Consolidated Report Generator Component
 * Provides interface for generating consolidated shipment reports with section selection
 */
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { useReportGeneration } from '@/shared/hooks/useReportGeneration';
import { PDFReportService } from '@/shared/services/pdfReportService';
import { ReportSectionSelector } from './ReportSectionSelector';
import {
  Download,
  FileText,
  Settings,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Clock,
  FileCheck
} from 'lucide-react';

interface ConsolidatedReportGeneratorProps {
  shipmentId: string;
  trackingNumber: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'card';
  showProgress?: boolean;
}

export const ConsolidatedReportGenerator: React.FC<ConsolidatedReportGeneratorProps> = ({
  shipmentId,
  trackingNumber,
  disabled = false,
  className = '',
  size = 'md',
  variant = 'button',
  showProgress = true
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>(
    PDFReportService.getDefaultSections()
  );

  const {
    isGenerating,
    progress,
    error,
    lastGeneratedReport,
    generateReport,
    clearError,
    resetState
  } = useReportGeneration({
    onSuccess: (filename, blob) => {
      console.log(`Report generated successfully: ${filename}, size: ${blob.size} bytes`);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      console.error('Report generation failed:', error);
    },
    autoDownload: true
  });

  const selectedCount = Object.values(selectedSections).filter(Boolean).length;
  const canGenerate = selectedCount > 0 && !isGenerating;

  const handleGenerateReport = async () => {
    if (!canGenerate) return;

    clearError();
    
    try {
      await generateReport({
        shipment_id: shipmentId,
        include_sections: selectedSections
      });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleDialogClose = () => {
    if (!isGenerating) {
      setIsDialogOpen(false);
      if (error) {
        resetState();
      }
    }
  };

  const buttonSizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-9 px-4',
    lg: 'h-10 px-6'
  };

  const GenerateButton = (
    <Button
      onClick={() => setIsDialogOpen(true)}
      disabled={disabled || isGenerating}
      className={`${buttonSizeClasses[size]} ${className}`}
      variant="outline"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download Report
        </>
      )}
    </Button>
  );

  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Consolidated Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Generate a comprehensive PDF report including manifest, compliance certificates, 
            safety data sheets, and emergency procedures.
          </p>
          
          {lastGeneratedReport && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Last generated: {lastGeneratedReport}
              </AlertDescription>
            </Alert>
          )}
          
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              {GenerateButton}
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generate Consolidated Report
                </DialogTitle>
                <DialogDescription>
                  Customize which sections to include in your consolidated report for shipment {trackingNumber}.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Section Selector */}
                <ReportSectionSelector
                  selectedSections={selectedSections}
                  onSectionsChange={setSelectedSections}
                  disabled={isGenerating}
                />
                
                {/* Error Display */}
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Progress Display */}
                {isGenerating && showProgress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Generating report...</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>This may take a few moments</span>
                    </div>
                  </div>
                )}
                
                {/* Generation Controls */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileCheck className="h-4 w-4" />
                    <span>
                      {selectedCount} section{selectedCount !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handleDialogClose}
                      disabled={isGenerating}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGenerateReport}
                      disabled={!canGenerate}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Generate Report
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        {GenerateButton}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Consolidated Report
          </DialogTitle>
          <DialogDescription>
            Customize which sections to include in your consolidated report for shipment {trackingNumber}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Section Selector */}
          <ReportSectionSelector
            selectedSections={selectedSections}
            onSectionsChange={setSelectedSections}
            disabled={isGenerating}
          />
          
          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Progress Display */}
          {isGenerating && showProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Generating report...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>This may take a few moments</span>
              </div>
            </div>
          )}
          
          {/* Generation Controls */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileCheck className="h-4 w-4" />
              <span>
                {selectedCount} section{selectedCount !== 1 ? 's' : ''} selected
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleDialogClose}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateReport}
                disabled={!canGenerate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConsolidatedReportGenerator;