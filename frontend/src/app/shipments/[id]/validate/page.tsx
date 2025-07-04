// app/shipments/[id]/validate/page.tsx
'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Eye,
  Download,
  Shield
} from 'lucide-react';
import { ManifestDropzone } from '@/components/manifests/ManifestDropzone';
import { DangerousGoodsConfirmation } from '@/components/manifests/DangerousGoodsConfirmation';
import { PDFViewer } from '@/components/manifests/PDFViewer';
import { 
  useUploadManifest, 
  useDocumentStatus, 
  useValidationResults,
  useFinalizeShipmentFromManifest,
  type DangerousGoodConfirmation 
} from '@/hooks/useManifests';
import { useShipment } from '@/hooks/useShipments';
import { toast } from 'react-hot-toast';

export default function ShipmentValidationPage() {
  const params = useParams();
  const router = useRouter();
  const shipmentId = params.id as string;

  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);
  const [confirmedDGs, setConfirmedDGs] = useState<DangerousGoodConfirmation[]>([]);
  const [showPDFViewer, setShowPDFViewer] = useState(false);

  // Queries and mutations
  const { data: shipment, isLoading: shipmentLoading, error: shipmentError } = useShipment(shipmentId);
  const uploadManifestMutation = useUploadManifest();
  const { data: documentStatus } = useDocumentStatus(uploadedDocumentId);
  const { data: validationResults } = useValidationResults(
    documentStatus?.is_validated ? uploadedDocumentId : null
  );
  const finalizeShipmentMutation = useFinalizeShipmentFromManifest();

  // Handle file upload
  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    
    try {
      const result = await uploadManifestMutation.mutateAsync({
        shipmentId,
        file
      });
      
      setUploadedDocumentId(result.document.id);
      toast.success('Manifest uploaded successfully! Processing started...');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload manifest');
      setSelectedFile(null);
    }
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    setUploadedDocumentId(null);
    setConfirmedDGs([]);
  };

  const handleDGConfirmation = (confirmed: DangerousGoodConfirmation[]) => {
    setConfirmedDGs(confirmed);
  };

  const handleFinalizeShipment = async () => {
    if (!uploadedDocumentId || confirmedDGs.length === 0) {
      toast.error('Please confirm dangerous goods before finalizing');
      return;
    }

    try {
      const result = await finalizeShipmentMutation.mutateAsync({
        shipmentId,
        documentId: uploadedDocumentId,
        confirmedDGs
      });

      toast.success(result.message);
      router.push(`/shipments/${shipmentId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to finalize shipment');
    }
  };

  // Loading state
  if (shipmentLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (shipmentError || !shipment) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {shipmentError?.message || 'Shipment not found'}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  // Check if shipment is in correct status
  if (shipment.status !== 'PENDING' && shipment.status !== 'AWAITING_VALIDATION') {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              This shipment cannot be validated. Current status: {shipment.status}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  const isProcessing = documentStatus?.is_processing || uploadManifestMutation.isPending;
  const hasValidationResults = documentStatus?.is_validated && validationResults;
  const canFinalize = hasValidationResults && confirmedDGs.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Validate Manifest</h1>
              <p className="text-gray-600 mt-1">
                Shipment {shipment.tracking_number} • {shipment.reference_number}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              {shipment.status.replace('_', ' ')}
            </Badge>
            {canFinalize && (
              <Button 
                onClick={handleFinalizeShipment}
                disabled={finalizeShipmentMutation.isPending}
                className="bg-[#153F9F] hover:bg-blue-700"
              >
                {finalizeShipmentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Finalize & Create Transport Docs
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Upload and DG Confirmation */}
          <div className="space-y-6">
            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Upload Manifest
                </CardTitle>
                <CardDescription>
                  Upload a PDF manifest to automatically detect dangerous goods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ManifestDropzone
                  onFileSelect={handleFileSelect}
                  onFileRemove={handleFileRemove}
                  isUploading={uploadManifestMutation.isPending}
                  uploadError={uploadManifestMutation.error?.message}
                  selectedFile={selectedFile}
                  disabled={isProcessing}
                />
              </CardContent>
            </Card>

            {/* Processing Status */}
            {isProcessing && (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 mx-auto mb-4 text-blue-600 animate-spin" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Processing Manifest...
                    </h3>
                    <p className="text-gray-600">
                      Analyzing document for dangerous goods. This may take a few moments.
                    </p>
                    {documentStatus?.potential_dg_count !== undefined && (
                      <p className="text-sm text-blue-600 mt-2">
                        Found {documentStatus.potential_dg_count} potential matches so far
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dangerous Goods Confirmation */}
            {hasValidationResults && (
              <DangerousGoodsConfirmation
                validationResults={validationResults}
                onConfirmation={handleDGConfirmation}
                confirmedDGs={confirmedDGs}
              />
            )}
          </div>

          {/* Right Panel: PDF Viewer and Results */}
          <div className="space-y-6">
            {/* PDF Viewer */}
            {selectedFile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Manifest Document
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPDFViewer(!showPDFViewer)}
                      >
                        {showPDFViewer ? 'Hide' : 'Show'} PDF
                      </Button>
                      {selectedFile && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = URL.createObjectURL(selectedFile);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = selectedFile.name;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                {showPDFViewer && (
                  <CardContent>
                    <PDFViewer
                      file={selectedFile}
                      highlightedTexts={
                        validationResults?.potential_dangerous_goods.map(dg => dg.found_text) || []
                      }
                    />
                  </CardContent>
                )}
              </Card>
            )}

            {/* Processing Summary */}
            {hasValidationResults && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Analysis Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Pages:</span>
                      <div className="font-medium">{validationResults.processing_metadata.total_pages}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Processing Time:</span>
                      <div className="font-medium">
                        {validationResults.processing_metadata.processing_time_seconds}s
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Potential DGs Found:</span>
                      <div className="font-medium">{validationResults.potential_dangerous_goods.length}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Confirmed DGs:</span>
                      <div className="font-medium">{confirmedDGs.length}</div>
                    </div>
                  </div>

                  {validationResults.unmatched_text.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Unmatched Text</h4>
                      <div className="text-sm text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                        {validationResults.unmatched_text.slice(0, 5).map((text, index) => (
                          <div key={index} className="truncate">
                            &ldquo;{text}&rdquo;
                          </div>
                        ))}
                        {validationResults.unmatched_text.length > 5 && (
                          <div className="text-xs text-gray-500">
                            +{validationResults.unmatched_text.length - 5} more items
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}