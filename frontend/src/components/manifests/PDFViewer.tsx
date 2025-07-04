// components/manifests/PDFViewer.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download,
  AlertCircle,
  FileText
} from 'lucide-react';

interface PDFViewerProps {
  file: File;
  highlightedTexts?: string[];
  className?: string;
}

export function PDFViewer({ 
  file, 
  highlightedTexts = [], 
  className = "" 
}: PDFViewerProps) {
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileUrl = React.useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  // Cleanup URL when component unmounts or file changes
  React.useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    if (!fileUrl) return;
    
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No document to display</p>
        </div>
      </div>
    );
  }

  if (!file.type.includes('pdf')) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          PDF viewer only supports PDF files. Please upload a PDF document.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 3.0}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRotate}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Highlighted Texts Info */}
      {highlightedTexts.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>{highlightedTexts.length} potential dangerous goods</strong> were found in this document.
            Look for highlighted text that matches: {highlightedTexts.slice(0, 3).join(', ')}
            {highlightedTexts.length > 3 && ` and ${highlightedTexts.length - 3} more`}.
          </AlertDescription>
        </Alert>
      )}

      {/* PDF Display */}
      <div className="border rounded-lg overflow-hidden bg-gray-100">
        {error ? (
          <Alert className="m-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="overflow-auto max-h-[600px]">
            <div 
              className="flex justify-center p-4"
              style={{ 
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center top'
              }}
            >
              {fileUrl && (
                <iframe
                  src={fileUrl}
                  className="w-full h-[800px] border-0"
                  title={`PDF Viewer - ${file.name}`}
                  onError={() => setError('Failed to load PDF. Please try downloading the file instead.')}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="text-xs text-gray-500 text-center">
        {file.name} • {(file.size / 1024 / 1024).toFixed(2)} MB
      </div>
    </div>
  );
}