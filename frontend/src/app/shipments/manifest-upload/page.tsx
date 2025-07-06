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
  Plus
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import Link from 'next/link';

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
    if (files.length > 0 && files[0].type === 'application/pdf') {
      setUploadedFile(files[0]);
      processManifest(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedFile(files[0]);
      processManifest(files[0]);
    }
  };

  const processManifest = async (file: File) => {
    setIsProcessing(true);
    // Simulate API processing
    setTimeout(() => {
      setSearchResults(mockSearchResults);
      setIsProcessing(false);
    }, 3000);
  };

  const addToManifest = (item: typeof mockSearchResults[0]) => {
    // Handle adding item to manifest
    console.log('Adding to manifest:', item);
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
            <Card>
              <CardContent className="p-8">
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-semibold">Search your shipment manifest to find dangerous goods</h2>
                  
                  <div className="flex justify-end">
                    <Button variant="outline" className="text-blue-600">
                      Add media from URL
                    </Button>
                  </div>

                  {/* Drag and Drop Area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-16 transition-colors ${
                      isDragging 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 bg-gray-50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="flex flex-col items-center space-y-4">
                      <Upload className="h-12 w-12 text-gray-400" />
                      <div className="text-center">
                        <p className="text-lg font-medium text-gray-700">
                          {uploadedFile ? uploadedFile.name : 'Drag and Drop your Manifest here'}
                        </p>
                        <p className="text-gray-500">or</p>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <Button className="mt-2">Browse file</Button>
                        </label>
                      </div>
                    </div>
                  </div>

                  {isProcessing && (
                    <div className="flex items-center justify-center space-x-3 mt-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="text-gray-600">Processing manifest...</span>
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
        ) : (
          /* Search Results */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Uploaded PDF Viewer */}
            <Card>
              <CardHeader>
                <CardTitle>Uploaded pdf</CardTitle>
                <p className="text-sm text-gray-600">{uploadedFile?.name}</p>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 rounded-lg p-8 text-center h-96 flex items-center justify-center">
                  <div>
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">PDF Preview</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Interactive PDF viewer would be displayed here
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search Results */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Potential Results</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span>Search pages: 1 of 39</span>
                      <span>Results: 1 of 12</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {searchResults.map((result, index) => (
                    <div key={result.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-600">#{index + 1}</span>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="text-xs">{result.un}</Badge>
                              <span className="font-medium text-sm">{result.properShippingName}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                              <span className={`px-2 py-1 rounded text-white ${getDGClassColor(result.class)}`}>
                                {result.class}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className={`w-8 h-8 ${getDGClassColor(result.class)} rounded flex items-center justify-center`}>
                          <AlertTriangle className="h-4 w-4 text-white" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Material number:</span>
                          <p className="font-medium">{result.materialNumber}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Material name:</span>
                          <p className="font-medium">{result.materialName}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            View SDS
                          </Button>
                        </div>
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

                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <Button variant="outline">
                    Previous
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Next
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    These results may require further investigation
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}