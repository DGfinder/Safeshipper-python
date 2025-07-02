'use client'

import React, { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, MagnifyingGlassMinusIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline'
import { TextMatch } from '@/services/manifests'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

interface PdfViewerProps {
  file: File | null
  matches: TextMatch[]
  onPageChange?: (pageNumber: number) => void
  currentPage?: number
}

export default function PdfViewer({ file, matches, onPageChange, currentPage = 1 }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [scale, setScale] = useState<number>(1.0)
  const [loading, setLoading] = useState<boolean>(false)

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
  }, [])

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error)
    setLoading(false)
  }, [])

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      onPageChange?.(newPage)
    }
  }, [currentPage, onPageChange])

  const goToNextPage = useCallback(() => {
    if (currentPage < numPages) {
      const newPage = currentPage + 1
      onPageChange?.(newPage)
    }
  }, [currentPage, numPages, onPageChange])

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.2, 3.0))
  }, [])

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.2, 0.5))
  }, [])

  // Custom text renderer for highlighting
  const customTextRenderer = useCallback((textItem: any) => {
    const text = textItem.str
    
    // Check if this text item contains any matches
    const pageMatches = matches.filter(match => match.pageNumber === currentPage)
    
    if (pageMatches.length === 0) {
      return text
    }

    // Create a highlighted version of the text
    let highlightedText = text
    
    pageMatches.forEach(match => {
      const regex = new RegExp(`(${match.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      highlightedText = highlightedText.replace(regex, (matchStr: string, keyword: string) => {
        return `<mark class="bg-yellow-300 text-black px-1 rounded" title="${match.properShippingName} (${match.unNumber})">${keyword}</mark>`
      })
    })

    return highlightedText
  }, [matches, currentPage])

  if (!file) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No PDF selected</h3>
          <p className="mt-1 text-sm text-gray-500">Upload a PDF file to view it here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {numPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage >= numPages}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
          
          {matches.length > 0 && (
            <div className="text-sm text-gray-600">
              {matches.filter(m => m.pageNumber === currentPage).length} matches on this page
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MagnifyingGlassMinusIcon className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 3.0}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <div className="flex justify-center">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              onLoadProgress={() => setLoading(true)}
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading PDF...</span>
                </div>
              }
              error={
                <div className="flex items-center justify-center p-8 text-red-600">
                  <span>Error loading PDF. Please try again.</span>
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                customTextRenderer={customTextRenderer}
                loading={
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                }
              />
            </Document>
          </div>
        </div>
      </div>

      {/* Legend */}
      {matches.length > 0 && (
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-300 rounded"></div>
              <span className="text-gray-600">Dangerous Goods Found</span>
            </div>
            <div className="text-gray-500">
              Total matches: {matches.length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 