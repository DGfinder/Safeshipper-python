// components/manifests/ManifestDropzone.tsx
'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ManifestDropzoneProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  isUploading?: boolean;
  uploadProgress?: number;
  uploadError?: string | null;
  selectedFile?: File | null;
  disabled?: boolean;
}

export function ManifestDropzone({
  onFileSelect,
  onFileRemove,
  isUploading = false,
  uploadProgress = 0,
  uploadError = null,
  selectedFile = null,
  disabled = false
}: ManifestDropzoneProps) {
  const [dragError, setDragError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setDragError(null);
    
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors.some((error: any) => error.code === 'file-too-large')) {
        setDragError('File is too large. Maximum size is 50MB.');
      } else if (rejection.errors.some((error: any) => error.code === 'file-invalid-type')) {
        setDragError('Invalid file type. Only PDF files are allowed.');
      } else {
        setDragError('File rejected. Please check the file and try again.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Additional validation
      if (file.size > 50 * 1024 * 1024) { // 50MB
        setDragError('File is too large. Maximum size is 50MB.');
        return;
      }
      
      if (file.type !== 'application/pdf') {
        setDragError('Invalid file type. Only PDF files are allowed.');
        return;
      }
      
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 1,
    disabled: disabled || isUploading
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDropzoneClassName = () => {
    let className = "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ";
    
    if (disabled || isUploading) {
      className += "border-gray-300 bg-gray-50 cursor-not-allowed ";
    } else if (isDragReject || dragError) {
      className += "border-red-300 bg-red-50 ";
    } else if (isDragActive) {
      className += "border-blue-400 bg-blue-50 ";
    } else {
      className += "border-gray-300 hover:border-blue-400 hover:bg-blue-50 ";
    }
    
    return className;
  };

  if (selectedFile && !uploadError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <FileText className="h-10 w-10 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(selectedFile.size)} • PDF Document
                </p>
                {isUploading && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {Math.round(uploadProgress)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Uploading manifest...
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isUploading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {!isUploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onFileRemove}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div {...getRootProps()} className={getDropzoneClassName()}>
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <Upload className="h-12 w-12" />
          </div>
          
          {isDragActive ? (
            <div>
              <p className="text-lg font-medium text-blue-600">
                Drop the PDF manifest here
              </p>
              <p className="text-sm text-gray-500">
                Release to upload your manifest document
              </p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-900">
                Upload Manifest PDF
              </p>
              <p className="text-sm text-gray-500">
                Drag and drop your manifest PDF here, or click to browse
              </p>
            </div>
          )}
          
          <div className="text-xs text-gray-400">
            <p>Supported format: PDF</p>
            <p>Maximum file size: 50MB</p>
          </div>
          
          {!isDragActive && !disabled && !isUploading && (
            <Button
              type="button"
              variant="outline"
              className="mt-4"
            >
              Choose File
            </Button>
          )}
        </div>
      </div>

      {(dragError || uploadError) && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {dragError || uploadError}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}