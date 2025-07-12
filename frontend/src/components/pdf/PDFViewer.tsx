"use client";

import React, { useState, useImperativeHandle, forwardRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

// Set worker URL - use local worker file to avoid CORS issues
if (typeof window !== 'undefined') {
  // Use local worker file served from public directory
  const localWorkerSrc = '/pdf-worker/pdf.worker.min.js';
  const fallbackWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  
  pdfjs.GlobalWorkerOptions.workerSrc = localWorkerSrc;
  
  // Set up fallback worker if local worker fails
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (args[0]?.includes?.('Failed to fetch dynamically imported module') && 
        args[0]?.includes?.(localWorkerSrc)) {
      console.log('Local PDF worker failed, falling back to CDN worker...');
      pdfjs.GlobalWorkerOptions.workerSrc = fallbackWorkerSrc;
    }
    originalConsoleError.apply(console, args);
  };
}

interface HighlightArea {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: 'green' | 'yellow' | 'orange';
  keyword?: string;
  id?: string;
}

interface PDFViewerProps {
  file: File | string;
  onPageChange?: (page: number, totalPages: number) => void;
  highlightAreas?: HighlightArea[];
  currentHighlight?: string;
  onHighlightClick?: (highlight: HighlightArea) => void;
}

export interface PDFViewerRef {
  navigateToHighlight: (highlightId: string) => void;
  changePage: (offset: number) => void;
  setPage: (page: number) => void;
}

const PDFViewer = forwardRef<PDFViewerRef, PDFViewerProps>(function PDFViewer({
  file,
  onPageChange,
  highlightAreas = [],
  currentHighlight,
  onHighlightClick,
}, ref) {
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
      
      // Try alternative worker URL on second retry only
      if (retryCount === 1 && pdfjs.GlobalWorkerOptions.workerSrc?.includes('/pdf-worker/')) {
        console.log('Switching to CDN worker for retry...');
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

  // Navigate to a specific highlight
  function navigateToHighlight(highlightId: string) {
    const highlight = highlightAreas.find(h => h.id === highlightId);
    if (highlight && highlight.page !== pageNumber) {
      setPageNumber(highlight.page);
      if (onPageChange) {
        onPageChange(highlight.page, numPages);
      }
    }
  }

  // Get highlights for current page
  const currentPageHighlights = highlightAreas.filter(h => h.page === pageNumber);

  // Get highlight color class
  const getHighlightColor = (color: HighlightArea['color'], isCurrent: boolean) => {
    const opacity = isCurrent ? '0.6' : '0.3';
    switch (color) {
      case 'green':
        return `rgba(34, 197, 94, ${opacity})`; // green-500
      case 'yellow':
        return `rgba(250, 204, 21, ${opacity})`; // yellow-400
      case 'orange':
        return `rgba(249, 115, 22, ${opacity})`; // orange-500
      default:
        return `rgba(59, 130, 246, ${opacity})`; // blue-500
    }
  };

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    navigateToHighlight,
    changePage,
    setPage: (page: number) => {
      if (page >= 1 && page <= numPages) {
        setPageNumber(page);
        if (onPageChange) {
          onPageChange(page, numPages);
        }
      }
    },
  }));

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
          <div className="relative">
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
              <div className="relative">
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderAnnotationLayer={true}
                  renderTextLayer={true}
                  className="shadow-lg"
                />
                
                {/* Highlight Overlays */}
                {currentPageHighlights.length > 0 && (
                  <div className="absolute top-0 left-0 pointer-events-none">
                    {currentPageHighlights.map((highlight, index) => (
                      <div
                        key={highlight.id || index}
                        className="absolute pointer-events-auto cursor-pointer"
                        style={{
                          left: `${highlight.x * scale}px`,
                          top: `${highlight.y * scale}px`,
                          width: `${highlight.width * scale}px`,
                          height: `${highlight.height * scale}px`,
                          backgroundColor: getHighlightColor(
                            highlight.color,
                            highlight.id === currentHighlight
                          ),
                          border: highlight.id === currentHighlight 
                            ? '2px solid rgba(59, 130, 246, 0.8)' 
                            : '1px solid rgba(0, 0, 0, 0.1)',
                          borderRadius: '2px',
                          transition: 'all 0.2s ease-in-out',
                        }}
                        onClick={() => onHighlightClick?.(highlight)}
                        title={`${highlight.keyword || 'Highlight'} - Click to view details`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PDFViewer;
