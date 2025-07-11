'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Upload, 
  FileText, 
  Search,
  Eye,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Package,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import PDF viewer to avoid SSR issues
const PDFViewer = dynamic(() => import('@/components/pdf/PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ),
});

const ManifestTable = dynamic(() => import('@/components/manifests/ManifestTable'), {
  ssr: false,
});

const URLUploadModal = dynamic(() => import('@/components/manifests/URLUploadModal'), {
  ssr: false,
});

// Mock data for previously searched manifests
const mockPreviousSearches = [
  {
    id: '1',
    fileName: '695637717.3909516-scan-check.pdf',
    pagesSearched: 87,
    resultsFound: 16,
    date: '2024-01-10 19:10:23',
    status: 'completed'
  },
  {
    id: '2',
    fileName: 'manifest-chemical-batch-2024.pdf',
    pagesSearched: 45,
    resultsFound: 8,
    date: '2024-01-09 14:22:15',
    status: 'completed'
  },
  {
    id: '3',
    fileName: 'transport-manifest-001.pdf',
    pagesSearched: 23,
    resultsFound: 3,
    date: '2024-01-08 11:45:30',
    status: 'processing'
  }
];

// Mock data for comprehensive manifest table
const mockManifestTableData = [
  {
    id: '1',
    un: '3500',
    properShippingName: 'Batteries wet filled with acid',
    class: '6.1',
    subHazard: '6.1',
    packingGroup: 'III',
    typeOfContainer: '14',
    quantity: '20,000L',
    weight: '20,000L'
  },
  {
    id: '2',
    un: '2794',
    properShippingName: '-',
    class: '6.3',
    subHazard: '-',
    packingGroup: 'III',
    typeOfContainer: '14',
    quantity: '20,000L',
    weight: '20,000L'
  },
  {
    id: '3',
    un: '3500',
    properShippingName: 'Electric storage',
    class: '6.1',
    subHazard: '6.1',
    packingGroup: 'III',
    typeOfContainer: '14',
    quantity: '20,000L',
    weight: '20,000L',
    skipped: true
  },
  {
    id: '4',
    un: '3500',
    properShippingName: 'Electric storage',
    class: '6.1',
    subHazard: '6.1',
    packingGroup: 'III',
    typeOfContainer: '14',
    quantity: '20,000L',
    weight: '20,000L'
  },
  {
    id: '5',
    un: '3500',
    properShippingName: 'Electric storage',
    class: '6.1',
    subHazard: '6.1',
    packingGroup: 'III',
    typeOfContainer: '14',
    quantity: '20,000L',
    weight: '20,000L',
    skipped: true
  },
];

// Mock search results after manifest upload
const mockSearchResults = [
  {
    id: '1',
    un: '1438',
    properShippingName: 'Ammonium nitrate',
    class: '5.1',
    materialNumber: '1438',
    materialName: '1438',
    details: 'Basic ammonium nitrate compound'
  },
  {
    id: '2',
    un: '2528',
    properShippingName: 'Ammonium nitrate (with more than 0.2% combustible substances, including any organic substance calculated as carbon, to the exclusion of any other added substance)',
    class: '1.1D',
    materialNumber: '2528',
    materialName: 'Ammonium nitrate compound',
    details: 'Enhanced formula with combustible additives'
  },
  {
    id: '3',
    un: '1942',
    properShippingName: 'Ammonium nitrate (with 0.2% or less combustible substances, including any A863 organic substance calculated as carbon, to the exclusion of any other added substance)',
    class: '5.1',
    materialNumber: '1942',
    materialName: 'Pure ammonium nitrate',
    details: 'Low combustible content formula'
  }
];

const getDGClassColor = (dgClass: string) => {
  const colors: { [key: string]: string } = {
    '1.1D': 'bg-orange-500',
    '5.1': 'bg-yellow-600',
    '3': 'bg-red-600',
    '4.1': 'bg-yellow-500',
    '8': 'bg-gray-600'
  };
  return colors[dgClass] || 'bg-gray-400';
};

export default function ManifestUploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchResults, setSearchResults] = useState<typeof mockSearchResults | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUrlUpload, setShowUrlUpload] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [viewMode, setViewMode] = useState<'search' | 'table'>('search');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (isPDF) {
        setUploadedFile(file);
        processManifest(file);
      } else {
        alert('Please upload a PDF file');
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (isPDF) {
        setUploadedFile(file);
        processManifest(file);
      } else {
        alert('Please upload a PDF file');
      }
    }
  };

  const processManifest = async (file: File) => {
    setIsProcessing(true);
    
    try {
      // Import the manifest service dynamically to avoid SSR issues
      const { manifestService } = await import('@/services/manifestService');
      
      // Validate the PDF file first
      const validation = manifestService.validatePDFFile(file);
      if (!validation.valid) {
        alert(`File validation failed:\n${validation.errors.join('\n')}`);
        setIsProcessing(false);
        return;
      }

      // Upload and analyze the manifest
      const response = await manifestService.uploadAndAnalyzeManifest({
        file,
        analysisOptions: {
          detectDangerousGoods: true,
          extractMetadata: true,
          validateFormat: true
        }
      });

      if (response.success && response.results) {
        // Transform the results to match our current mockSearchResults format
        const transformedResults = response.results.dangerousGoods.map(dg => ({
          id: dg.id,
          un: dg.un,
          properShippingName: dg.properShippingName,
          class: dg.class,
          materialNumber: dg.un, // Use UN number as material number
          materialName: dg.properShippingName.split(',')[0], // Use first part of shipping name
          details: `Confidence: ${Math.round(dg.confidence * 100)}% | Source: ${dg.source} | Qty: ${dg.quantity || 'N/A'}`,
          subHazard: dg.subHazard,
          packingGroup: dg.packingGroup,
          quantity: dg.quantity || '20,000L',
          weight: dg.weight || '20,000L'
        }));

        setSearchResults(transformedResults);
        
        // Show analysis summary
        if (response.results.warnings.length > 0 || response.results.recommendations.length > 0) {
          const summary = [
            'Manifest Analysis Complete!',
            `Found ${transformedResults.length} dangerous goods`,
            ...response.results.warnings.map(w => `⚠️ ${w}`),
            ...response.results.recommendations.map(r => `💡 ${r}`)
          ].join('\n\n');
          
          alert(summary);
        }
      } else {
        alert(`Manifest analysis failed: ${response.error || 'Unknown error'}`);
        // Fallback to mock results for demonstration
        setSearchResults(mockSearchResults);
      }
    } catch (error) {
      console.error('Manifest processing error:', error);
      alert('Manifest processing failed. Using demonstration data.');
      // Fallback to mock results
      setSearchResults(mockSearchResults);
    } finally {
      setIsProcessing(false);
    }
  };

  const addToManifest = (item: typeof mockSearchResults[0]) => {
    // Handle adding item to manifest
    console.log('Adding to manifest:', item);
  };

  const handleURLUpload = async (url: string) => {
    try {
      // In a real implementation, this would call an API to fetch the URL
      // For now, we'll simulate the process
      setIsProcessing(true);
      
      // Simulate URL fetching and processing
      setTimeout(() => {
        // Create a mock file object for the URL
        const mockFile = new File([''], url.split('/').pop() || 'document.pdf', {
          type: 'application/pdf'
        });
        setUploadedFile(mockFile);
        setSearchResults(mockSearchResults);
        setIsProcessing(false);
        setShowUrlUpload(false);
      }, 2000);
    } catch (error) {
      console.error('URL upload failed:', error);
      throw new Error('Failed to fetch document from URL');
    }
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manifest Search</h1>
            <p className="text-gray-600">Search your shipment manifest to find dangerous goods</p>
          </div>
          <Link href="/shipments">
            <Button variant="outline">
              Back to Shipments
            </Button>
          </Link>
        </div>

        {!searchResults ? (
          <>
            {/* Upload Section */}
            <Card className="max-w-4xl mx-auto">
              <CardContent className="p-12">
                <div className="text-center space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Search your shipment manifest to find dangerous goods</h2>
                  
                  {!uploadedFile ? (
                    <>
                      <div className="flex justify-end">
                        <Button 
                          variant="ghost" 
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => setShowUrlUpload(true)}
                        >
                          Add media from URL
                        </Button>
                      </div>

                      {/* Drag and Drop Area */}
                      <div
                        className={`relative border-2 border-dashed rounded-xl p-20 transition-all duration-200 ${
                          isDragging 
                            ? 'border-blue-500 bg-blue-50 scale-105' 
                            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <div className="flex flex-col items-center space-y-4">
                          <FileText className="h-16 w-16 text-gray-400" />
                          <div className="text-center space-y-2">
                            <p className="text-lg font-medium text-gray-700">
                              Drag and Drop your Manifest here
                            </p>
                            <p className="text-gray-500">or</p>
                            <label htmlFor="file-upload" className="cursor-pointer">
                              <input
                                id="file-upload"
                                type="file"
                                accept=".pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                              />
                              <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-blue-600 text-white shadow hover:bg-blue-700 h-10 px-6 py-2">
                                Browse other file
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* File Uploaded State */
                    <div className="space-y-6">
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-gray-600" />
                            <div className="text-left">
                              <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                              <p className="text-sm text-gray-500">
                                {(uploadedFile.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUploadedFile(null);
                              setSearchResults(null);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex gap-3">
                          <label htmlFor="file-reupload" className="flex-1">
                            <input
                              id="file-reupload"
                              type="file"
                              accept=".pdf"
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                            <span className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 h-10 px-4 py-2 cursor-pointer">
                              Browse other file
                            </span>
                          </label>
                          <Button 
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            onClick={() => processManifest(uploadedFile)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Searching...
                              </>
                            ) : (
                              'Search Manifest'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Previously Searched */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Previously searched</CardTitle>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">5</span>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search"
                        className="pl-10 w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 text-sm font-medium text-gray-500">FILE</th>
                        <th className="text-left py-3 text-sm font-medium text-gray-500">PAGES SEARCHED</th>
                        <th className="text-left py-3 text-sm font-medium text-gray-500">RESULTS FOUND</th>
                        <th className="text-left py-3 text-sm font-medium text-gray-500">DATE</th>
                        <th className="text-left py-3 text-sm font-medium text-gray-500">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockPreviousSearches.map((search) => (
                        <tr key={search.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 flex items-center gap-3">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{search.fileName}</span>
                          </td>
                          <td className="py-4 text-sm">{search.pagesSearched}</td>
                          <td className="py-4 text-sm">{search.resultsFound}</td>
                          <td className="py-4 text-sm text-gray-600">{search.date}</td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <span className="text-sm text-gray-500">Showing 1 to 10 of 100 entries</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Previous</Button>
                    <Button variant="outline" size="sm" className="bg-blue-600 text-white">1</Button>
                    <Button variant="outline" size="sm">2</Button>
                    <Button variant="outline" size="sm">3</Button>
                    <Button variant="outline" size="sm">Next</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : viewMode === 'search' ? (
          <>
            {/* View Toggle */}
            <div className="flex justify-end mb-4">
              <Button 
                onClick={() => setViewMode('table')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                View as Table
              </Button>
            </div>
            
            {/* Search Results - Split View */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left Panel - PDF Viewer */}
            <Card className="h-[calc(100vh-200px)]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Uploaded pdf</CardTitle>
                    <p className="text-sm text-gray-600">{uploadedFile?.name}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-80px)]">
                {uploadedFile && (
                  <PDFViewer 
                    file={uploadedFile}
                    onPageChange={(page, total) => {
                      setCurrentPage(page);
                      setTotalPages(total);
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Right Panel - Search Results */}
            <Card className="h-[calc(100vh-200px)]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Potential Results</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span>Search pages: {currentPage} of {totalPages || '?'}</span>
                      <span>Results: {searchResults.length} of 12</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" title="Download results">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto h-[calc(100%-100px)]">
                <div className="space-y-4">
                  {searchResults.map((result, index) => (
                    <div key={result.id} className="border rounded-lg p-4 space-y-3 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className="text-lg font-bold text-gray-500 mt-1">#{index + 1}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs font-semibold">{result.un}</Badge>
                              <span className="font-medium text-sm">{result.properShippingName}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 rounded text-white text-xs font-semibold ${getDGClassColor(result.class)}`}>
                                Class {result.class}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className={`w-10 h-10 ${getDGClassColor(result.class)} rounded-lg flex items-center justify-center`}>
                          <AlertTriangle className="h-5 w-5 text-white" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 text-xs">Material number:</span>
                          <p className="font-medium">{result.materialNumber}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Material name:</span>
                          <p className="font-medium">{result.materialName}</p>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600">
                        <p>{result.details}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          View SDS
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => addToManifest(result)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Add to manifest
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="sticky bottom-0 bg-white pt-4 border-t mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Button 
                      variant="outline"
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  
                  <div className="p-3 bg-amber-50 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-800">
                      These results may require further investigation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          </>
        ) : (
          /* Table View */
          <>
            <div className="flex justify-between items-center mb-4">
              <Button 
                onClick={() => setViewMode('search')}
                variant="outline"
              >
                Back to Search View
              </Button>
            </div>
            
            <ManifestTable 
              items={mockManifestTableData}
              onCompare={() => console.log('Compare clicked')}
              onGenerateFile={() => console.log('Generate file clicked')}
              onItemSelect={(ids) => console.log('Selected items:', ids)}
            />
          </>
        )}
        
        {/* URL Upload Modal */}
        <URLUploadModal
          isOpen={showUrlUpload}
          onClose={() => setShowUrlUpload(false)}
          onUpload={handleURLUpload}
        />
      </div>
    </AuthGuard>
  );
}