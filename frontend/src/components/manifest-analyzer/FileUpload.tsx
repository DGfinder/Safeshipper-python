'use client'

import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { DocumentArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

interface FileUploadProps {
  onFileAccepted: (file: File) => void
  isProcessing?: boolean
  acceptedFile?: File | null
}

export default function FileUpload({ onFileAccepted, isProcessing = false, acceptedFile }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileAccepted(acceptedFiles[0])
    }
  }, [onFileAccepted])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: isProcessing
  })

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive && !isDragReject
            ? 'border-blue-500 bg-blue-50'
            : isDragReject
            ? 'border-red-500 bg-red-50'
            : acceptedFile
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          {acceptedFile ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <DocumentTextIcon className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {acceptedFile.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatFileSize(acceptedFile.size)} • PDF Document
                </p>
              </div>
              {!isProcessing && (
                <p className="text-sm text-gray-600">
                  Click or drag to replace this file
                </p>
              )}
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <DocumentArrowUpIcon className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {isDragActive && !isDragReject
                    ? 'Drop the PDF here'
                    : isDragReject
                    ? 'Invalid file type'
                    : 'Upload Shipping Manifest'
                  }
                </h3>
                <p className="text-sm text-gray-500">
                  {isDragReject
                    ? 'Please upload a PDF file'
                    : 'Drag and drop a PDF file here, or click to select'
                  }
                </p>
              </div>
            </>
          )}
          
          {isProcessing && (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Processing PDF...</span>
            </div>
          )}
        </div>
      </div>
      
      {isDragReject && (
        <div className="mt-2 text-sm text-red-600 text-center">
          Only PDF files are accepted
        </div>
      )}
      
      {acceptedFile && !isProcessing && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Ready to Analyze
          </h4>
          <p className="text-sm text-blue-700">
            This PDF will be analyzed for dangerous goods content. The analysis happens entirely on your device - no files are uploaded to our servers.
          </p>
        </div>
      )}
    </div>
  )
} 