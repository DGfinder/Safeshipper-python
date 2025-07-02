'use client'

import React, { useState, useCallback } from 'react'
import { useDangerousGoodsList } from '@/hooks/useDangerousGoods'
import { analyzeManifest, TextMatch } from '@/services/manifests'
import FileUpload from '@/components/manifest-analyzer/FileUpload'
import PdfViewer from '@/components/manifest-analyzer/PdfViewer'
import { ExclamationTriangleIcon, DocumentTextIcon, ClockIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface AnalysisResult {
  matches: TextMatch[]
  totalPages: number
  processingTime: number
}

export default function ManifestAnalyzerPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMatch, setSelectedMatch] = useState<TextMatch | null>(null)

  // Fetch dangerous goods data
  const { data: dangerousGoods, isLoading: isLoadingDG, error: dgError } = useDangerousGoodsList()

  const handleFileAccepted = useCallback(async (file: File) => {
    setSelectedFile(file)
    setAnalysisResult(null)
    setCurrentPage(1)
    setSelectedMatch(null)
    
    if (!dangerousGoods || dangerousGoods.length === 0) {
      toast.error('Dangerous goods data not available. Please try again.')
      return
    }

    setIsProcessing(true)
    
    try {
      const result = await analyzeManifest(file, dangerousGoods)
      setAnalysisResult(result)
      
      toast.success(`Analysis complete! Found ${result.matches.length} dangerous goods matches in ${result.totalPages} pages.`)
    } catch (error) {
      console.error('Error analyzing manifest:', error)
      toast.error('Failed to analyze PDF. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [dangerousGoods])

  const handleMatchClick = useCallback((match: TextMatch) => {
    setSelectedMatch(match)
    setCurrentPage(match.pageNumber)
  }, [])

  const handlePageChange = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber)
    setSelectedMatch(null)
  }, [])

  const getHazardClassColor = (hazardClass: string) => {
    const colors: Record<string, string> = {
      '1': 'bg-red-100 text-red-800',
      '2': 'bg-orange-100 text-orange-800',
      '3': 'bg-yellow-100 text-yellow-800',
      '4': 'bg-red-100 text-red-800',
      '5': 'bg-blue-100 text-blue-800',
      '6': 'bg-purple-100 text-purple-800',
      '7': 'bg-green-100 text-green-800',
      '8': 'bg-gray-100 text-gray-800',
      '9': 'bg-indigo-100 text-indigo-800',
    }
    
    const mainClass = hazardClass.split('.')[0]
    return colors[mainClass] || 'bg-gray-100 text-gray-800'
  }

  if (dgError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
            <h3 className="ml-3 text-lg font-medium text-red-800">
              Error Loading Dangerous Goods Data
            </h3>
          </div>
          <p className="mt-2 text-red-700">
            Failed to load the dangerous goods database. Please check your connection and try again.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manifest Analyzer</h1>
        <p className="mt-2 text-gray-600">
          Upload a shipping manifest PDF to automatically detect dangerous goods content. 
          Analysis happens entirely on your device for privacy and security.
        </p>
      </div>

      {/* Loading state for dangerous goods */}
      {isLoadingDG && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-blue-700">Loading dangerous goods database...</span>
          </div>
        </div>
      )}

      {/* File Upload Section */}
      <div className="mb-8">
        <FileUpload
          onFileAccepted={handleFileAccepted}
          isProcessing={isProcessing}
          acceptedFile={selectedFile}
        />
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Results Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Analysis Results</h2>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Pages:</span>
                    <span className="text-sm font-medium">{analysisResult.totalPages}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Matches Found:</span>
                    <span className="text-sm font-medium text-blue-600">
                      {analysisResult.matches.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Processing Time:</span>
                    <span className="text-sm font-medium">
                      {analysisResult.processingTime.toFixed(2)}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Matches List */}
              <div className="p-6">
                <h3 className="text-md font-medium text-gray-900 mb-4">Dangerous Goods Found</h3>
                {analysisResult.matches.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No matches found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      No dangerous goods were detected in this manifest.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {analysisResult.matches.map((match, index) => (
                      <div
                        key={`${match.unNumber}-${match.pageNumber}-${index}`}
                        onClick={() => handleMatchClick(match)}
                        className={`
                          p-3 rounded-lg border cursor-pointer transition-colors
                          ${selectedMatch === match
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {match.unNumber}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getHazardClassColor(match.hazardClass)}`}>
                                Class {match.hazardClass}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {match.properShippingName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Page {match.pageNumber}</span>
                          <span>"{match.keyword}"</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 line-clamp-2">
                          {match.context}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[800px]">
              <PdfViewer
                file={selectedFile}
                matches={analysisResult.matches}
                onPageChange={handlePageChange}
                currentPage={currentPage}
              />
            </div>
          </div>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-blue-900">Analyzing Manifest</h3>
              <p className="text-blue-700">
                Extracting text and searching for dangerous goods content...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 