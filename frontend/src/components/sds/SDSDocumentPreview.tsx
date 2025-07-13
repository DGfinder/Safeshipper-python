"use client";

import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { type SafetyDataSheet } from "@/hooks/useSDS";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface SDSDocumentPreviewProps {
  sds: SafetyDataSheet;
  onDownload?: () => void;
  className?: string;
}

export default function SDSDocumentPreview({
  sds,
  onDownload,
  className = "",
}: SDSDocumentPreviewProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: any) => {
    setIsLoading(false);
    setError("Failed to load PDF document. The file may be corrupted or unsupported.");
    console.error("PDF load error:", error);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => Math.max(1, Math.min(numPages, prevPageNumber + offset)));
  };

  const zoomIn = () => {
    setScale(prevScale => Math.min(3.0, prevScale + 0.2));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(0.5, prevScale - 0.2));
  };

  const rotate = () => {
    setRotation(prevRotation => (prevRotation + 90) % 360);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            SDS Document Preview
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {sds.document.mime_type}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {formatFileSize(sds.document.file_size)}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1"
            >
              {showPreview ? (
                <>
                  <EyeOff className="h-3 w-3" />
                  Hide Preview
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" />
                  Show Preview
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Document Info */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>📄 {sds.document.original_filename}</span>
          <span>📅 {new Date(sds.revision_date).toLocaleDateString()}</span>
          <span>🏭 {sds.manufacturer}</span>
          <span>🌐 {sds.language_display}</span>
        </div>
      </CardHeader>

      {showPreview && (
        <CardContent className="space-y-4">
          {/* Preview Controls */}
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(-1)}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              
              <span className="text-sm font-medium">
                Page {pageNumber} of {numPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(1)}
                disabled={pageNumber >= numPages}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={zoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              
              <span className="text-sm font-medium">
                {Math.round(scale * 100)}%
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={zoomIn}
                disabled={scale >= 3.0}
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={rotate}
              >
                <RotateCw className="h-3 w-3" />
              </Button>

              {onDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownload}
                  className="flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Download
                </Button>
              )}
            </div>
          </div>

          {/* PDF Preview */}
          <div className="border rounded-lg bg-gray-100 min-h-[600px] flex items-center justify-center overflow-auto">
            {isLoading && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-gray-600">Loading PDF document...</p>
              </div>
            )}

            {error && (
              <Alert className="max-w-md border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                  {onDownload && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={onDownload}
                      className="p-0 h-auto text-red-700 underline ml-2"
                    >
                      Download to view locally
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {!error && sds.document.file_url && (
              <Document
                file={sds.document.file_url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-gray-600">Loading PDF...</p>
                  </div>
                }
                error={
                  <Alert className="max-w-md border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      Failed to load PDF. The document may be protected or corrupted.
                      {onDownload && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={onDownload}
                          className="p-0 h-auto text-red-700 underline ml-2"
                        >
                          Download instead
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="shadow-lg"
                />
              </Document>
            )}
          </div>

          {/* Quick Info Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50 p-4 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-900">
                {sds.dangerous_good.un_number}
              </div>
              <div className="text-sm text-blue-700">UN Number</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-900">
                Class {sds.dangerous_good.hazard_class}
              </div>
              <div className="text-sm text-blue-700">Hazard Class</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-900">
                Version {sds.version}
              </div>
              <div className="text-sm text-blue-700">SDS Version</div>
            </div>
          </div>

          {/* Emergency Contact Info */}
          {sds.emergency_contacts && Object.keys(sds.emergency_contacts).length > 0 && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <h4 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Emergency Contact Information
              </h4>
              <div className="text-sm text-red-800">
                {Object.entries(sds.emergency_contacts).map(([key, value]: [string, any]) => (
                  <div key={key} className="mb-1">
                    <span className="font-medium capitalize">{key}:</span>{" "}
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}