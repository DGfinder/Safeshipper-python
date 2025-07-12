"use client";

import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

// Set worker URL with fallbacks
if (typeof window !== 'undefined') {
  // Try multiple worker sources for better reliability
  const workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  const fallbackWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  
  // Set up fallback worker if primary fails
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = fallbackWorkerSrc;
  }
}

interface PDFViewerProps {
  file: File | string;
  onPageChange?: (page: number, totalPages: number) => void;
  highlightAreas?: Array<{
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export default function PDFViewer({
  file,
  onPageChange,
  highlightAreas = [],
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
    if (onPageChange) {
      onPageChange(1, numPages);
    }
  }

  function onDocumentLoadError(error: Error) {
    console.error("PDF load error:", error);
    setError(`Failed to load PDF: ${error.message}`);
    setIsRetrying(false);
  }

  const retryLoad = () => {
    if (retryCount < 3) {
      setIsRetrying(true);
      setError(null);
      setRetryCount(prev => prev + 1);
      
      // Try alternative worker URL on retry
      if (retryCount === 1) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
      }
      
      // Force re-render by updating a state
      setTimeout(() => {
        setIsRetrying(false);
      }, 1000);
    }
  };

  function changePage(offset: number) {
    const newPage = pageNumber + offset;
    if (newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage);
      if (onPageChange) {
        onPageChange(newPage, numPages);
      }
    }
  }

  function changeZoom(delta: number) {
    const newScale = Math.max(0.5, Math.min(2.0, scale + delta));
    setScale(newScale);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 min-w-[100px] text-center">
            Page {pageNumber} of {numPages || "?"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => changePage(1)}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeZoom(-0.1)}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeZoom(0.1)}
            disabled={scale >= 2.0}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <div className="flex justify-center">
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading PDF...</p>
                </div>
              </div>
            }
            error={
              <div className="flex items-center justify-center h-96">
                <div className="text-center text-red-600 max-w-md">
                  <p className="font-medium">Error loading PDF</p>
                  {error && <p className="text-sm mt-1">{error}</p>}
                  <p className="text-xs text-gray-500 mt-2">
                    Please check if the file is a valid PDF
                  </p>
                  {retryCount < 3 && (
                    <Button
                      onClick={retryLoad}
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      disabled={isRetrying}
                    >
                      {isRetrying ? "Retrying..." : `Retry (${3 - retryCount} attempts left)`}
                    </Button>
                  )}
                </div>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderAnnotationLayer={true}
              renderTextLayer={true}
              className="shadow-lg"
            />
          </Document>
        </div>
      </div>
    </div>
  );
}
