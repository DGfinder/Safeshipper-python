"use client";

import React, { useState, useRef, useCallback } from "react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Separator } from "@/shared/components/ui/separator";
import PDFViewer, { type HighlightArea, type PDFViewerRef } from "@/shared/components/pdf/PDFViewer";
import { ManifestSearchResults } from "./ManifestSearchResults";
import { PDFTextExtractor } from "@/shared/services/pdfTextExtractor";
import { manifestService, type ManifestAnalysisResponse } from "@/shared/services/manifestService";
import { 
  Search, 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface DangerousGood {
  id: string;
  un: string;
  properShippingName: string;
  class: string;
  subHazard?: string;
  packingGroup?: string;
  quantity?: string;
  weight?: string;
  confidence: number;
  source: "automatic" | "manual";
  foundText?: string;
  matchedTerm?: string;
  pageNumber?: number;
  matchType?: string;
}

interface SearchResult {
  keyword: string;
  matches: HighlightArea[];
  dangerousGoods: DangerousGood[];
}

interface ManifestSearchPluginProps {
  onClose?: () => void;
  initialFile?: File;
}

export default function ManifestSearchPlugin({ 
  onClose, 
  initialFile 
}: ManifestSearchPluginProps) {
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search and results state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [highlightAreas, setHighlightAreas] = useState<HighlightArea[]>([]);
  const [currentHighlight, setCurrentHighlight] = useState<string | null>(null);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  
  // Analysis results
  const [dangerousGoods, setDangerousGoods] = useState<DangerousGood[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  const pdfViewerRef = useRef<PDFViewerRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload with enhanced AI processing
  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    setFile(uploadedFile);
    setError(null);
    setAnalysisComplete(false);
    setSearchResults([]);
    setHighlightAreas([]);
    setDangerousGoods([]);
    
    // Start enhanced analysis
    setIsAnalyzing(true);
    
    try {
      // Create FormData for the enhanced upload endpoint
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('use_ocr', 'true');
      formData.append('extract_tables', 'true');
      formData.append('use_ai_detection', 'true');
      formData.append('ocr_engines', 'tesseract');
      formData.append('shipment_id', `temp_${Date.now()}`);

      // Upload to enhanced AI endpoint
      const uploadResponse = await fetch('/api/v1/manifests/enhanced-upload/', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      const documentId = uploadResult.document_id;

      // Poll for processing status
      const pollForResults = async () => {
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes at 5-second intervals
        
        while (attempts < maxAttempts) {
          try {
            const statusResponse = await fetch(`/api/v1/manifests/processing-status/${documentId}/`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            });

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              const processingStatus = statusData.processing_status;

              if (processingStatus.status === 'completed') {
                // Get full analysis results
                const resultsResponse = await fetch(`/api/v1/manifests/analysis-results/${documentId}/`, {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  },
                });

                if (resultsResponse.ok) {
                  const resultsData = await resultsResponse.json();
                  const results = resultsData.results;

                  // Process dangerous goods from enhanced results
                  const dgItems = results.dangerous_goods.items.map((item: any) => ({
                    id: item.dangerous_good.id,
                    un: item.dangerous_good.un_number,
                    properShippingName: item.dangerous_good.proper_shipping_name,
                    class: item.dangerous_good.hazard_class,
                    subHazard: item.dangerous_good.sub_hazard,
                    packingGroup: item.dangerous_good.packing_group,
                    quantity: item.extracted_quantity,
                    weight: item.extracted_weight,
                    confidence: item.confidence,
                    source: 'automatic',
                    foundText: item.context,
                    matchedTerm: item.matched_term,
                    pageNumber: Math.floor(Math.random() * 5) + 1, // Placeholder
                    matchType: item.match_type
                  }));

                  setDangerousGoods(dgItems);

                  // Create search results and highlights with enhanced data
                  await createSearchHighlights(uploadedFile, dgItems);

                  setAnalysisComplete(true);
                  return;
                }
              } else if (processingStatus.status === 'failed') {
                throw new Error(processingStatus.error || 'Processing failed');
              }
              
              // Update progress if available
              if (processingStatus.progress !== undefined) {
                // Could show progress bar here
                console.log(`Processing progress: ${processingStatus.progress}% - ${processingStatus.stage}`);
              }
            }
          } catch (pollError) {
            console.warn('Status polling error:', pollError);
          }

          attempts++;
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        }

        throw new Error('Processing timeout - please try again');
      };

      await pollForResults();
      
    } catch (err) {
      console.error('Enhanced analysis error:', err);
      setError(err instanceof Error ? err.message : 'Enhanced analysis failed');
      
      // Fallback to basic analysis if enhanced fails
      try {
        console.log('Falling back to basic analysis...');
        const analysisRequest = {
          file: uploadedFile,
          shipmentId: `temp_${Date.now()}`,
          analysisOptions: {
            detectDangerousGoods: true,
            extractMetadata: true,
            validateFormat: true,
          },
        };

        const result = await manifestService.uploadAndAnalyzeManifest(analysisRequest);
        
        if (result.success && result.results) {
          const dgItems = result.results.dangerousGoods.map(item => ({
            ...item,
            id: item.id || `dg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          }));
          
          setDangerousGoods(dgItems);
          await createSearchHighlights(uploadedFile, dgItems);
          setAnalysisComplete(true);
          setError(null); // Clear error if fallback succeeds
        }
      } catch (fallbackError) {
        console.error('Fallback analysis also failed:', fallbackError);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Create search highlights from dangerous goods
  const createSearchHighlights = async (pdfFile: File, dgItems: DangerousGood[]) => {
    try {
      // Extract keywords from dangerous goods
      const keywords = dgItems.flatMap(item => [
        item.un,
        item.properShippingName,
        item.matchedTerm,
        item.foundText
      ]).filter(Boolean) as string[];

      // Get highlights using enhanced text extractor with fuzzy matching
      const highlights = await PDFTextExtractor.searchDangerousGoodsEnhanced(pdfFile, keywords, {
        fuzzyMatch: true,
        unNumberPattern: true,
        confidenceThreshold: 0.6
      });
      
      // Color-code highlights based on hazard class
      const coloredHighlights = highlights.map(highlight => {
        const relatedDG = dgItems.find(dg => 
          dg.un === highlight.keyword || 
          dg.properShippingName.toLowerCase().includes(highlight.keyword?.toLowerCase() || '') ||
          dg.matchedTerm === highlight.keyword
        );
        
        let color: HighlightArea['color'] = 'yellow';
        if (relatedDG) {
          if (relatedDG.class.startsWith('1')) color = 'orange'; // Explosives
          else if (relatedDG.class === '3') color = 'orange'; // Flammable liquids
          else if (relatedDG.class === '5.1') color = 'yellow'; // Oxidizers
          else if (['6.1', '8'].includes(relatedDG.class)) color = 'orange'; // Toxic/Corrosive
        }
        
        return {
          ...highlight,
          color,
          id: `highlight_${highlight.page}_${Math.random().toString(36).substr(2, 9)}`,
        };
      });

      setHighlightAreas(coloredHighlights);

      // Group results by keyword
      const resultsByKeyword = new Map<string, { matches: HighlightArea[], dangerousGoods: DangerousGood[] }>();
      
      coloredHighlights.forEach(highlight => {
        const keyword = highlight.keyword || '';
        if (!resultsByKeyword.has(keyword)) {
          resultsByKeyword.set(keyword, { matches: [], dangerousGoods: [] });
        }
        resultsByKeyword.get(keyword)!.matches.push(highlight);
        
        // Find related dangerous goods
        const relatedDGs = dgItems.filter(dg => 
          dg.un === keyword || 
          dg.properShippingName.toLowerCase().includes(keyword.toLowerCase()) ||
          dg.matchedTerm === keyword
        );
        
        resultsByKeyword.get(keyword)!.dangerousGoods.push(...relatedDGs);
      });

      const searchResults = Array.from(resultsByKeyword.entries()).map(([keyword, data]) => ({
        keyword,
        matches: data.matches,
        dangerousGoods: Array.from(new Set(data.dangerousGoods)), // Remove duplicates
      }));

      setSearchResults(searchResults);
    } catch (err) {
      console.error('Error creating search highlights:', err);
    }
  };

  // Navigate between search results
  const navigateResults = (direction: 'next' | 'prev') => {
    const totalResults = highlightAreas.length;
    if (totalResults === 0) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = currentResultIndex >= totalResults - 1 ? 0 : currentResultIndex + 1;
    } else {
      newIndex = currentResultIndex <= 0 ? totalResults - 1 : currentResultIndex - 1;
    }

    setCurrentResultIndex(newIndex);
    const highlight = highlightAreas[newIndex];
    setCurrentHighlight(highlight.id || null);
    
    if (highlight.id) {
      pdfViewerRef.current?.navigateToHighlight(highlight.id);
    }
  };

  // Handle highlight click
  const handleHighlightClick = (highlight: HighlightArea) => {
    setCurrentHighlight(highlight.id || null);
    const index = highlightAreas.findIndex(h => h.id === highlight.id);
    if (index !== -1) {
      setCurrentResultIndex(index);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white" role="application" aria-label="PDF Manifest Search Plugin">
      {/* Header */}
      <div className="border-b bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Manifest Search Plugin
              </h1>
              <p className="text-sm text-gray-600">
                Upload and analyze PDF manifests for dangerous goods
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!file && (
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload PDF
              </Button>
            )}
            
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* File info and search controls */}
        {file && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-medium">
                {file.name}
              </Badge>
              <span className="text-sm text-gray-600">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analyzing...</span>
                </div>
              )}
              
              {analysisComplete && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Found {dangerousGoods.length} dangerous goods
                  </span>
                </div>
              )}
            </div>

            {highlightAreas.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateResults('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 min-w-[80px] text-center">
                  {currentResultIndex + 1} of {highlightAreas.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateResults('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {!file ? (
          // Upload area
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload PDF Manifest
              </h3>
              <p className="text-gray-600 mb-6">
                Upload a PDF manifest to automatically detect and highlight dangerous goods
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            </div>
          </div>
        ) : error ? (
          // Error state
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Analysis Failed
              </h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button
                onClick={() => setFile(null)}
                variant="outline"
              >
                Try Another File
              </Button>
            </div>
          </div>
        ) : (
          // PDF viewer and results - responsive layout
          <div className="flex-1 flex flex-col lg:flex-row">
            {/* PDF Viewer */}
            <div className="flex-1 lg:border-r min-h-0">
              <PDFViewer
                ref={pdfViewerRef}
                file={file}
                highlightAreas={highlightAreas}
                currentHighlight={currentHighlight}
                onHighlightClick={handleHighlightClick}
              />
            </div>

            {/* Results Panel */}
            <div className="w-full lg:w-96 bg-gray-50 border-t lg:border-t-0 min-h-0">
              <ManifestSearchResults
                dangerousGoods={dangerousGoods}
                searchResults={searchResults}
                selectedItems={selectedItems}
                onItemSelect={setSelectedItems}
                onNavigateToResult={(resultIndex) => {
                  setCurrentResultIndex(resultIndex);
                  const highlight = highlightAreas[resultIndex];
                  setCurrentHighlight(highlight.id || null);
                  if (highlight.id) {
                    pdfViewerRef.current?.navigateToHighlight(highlight.id);
                  }
                }}
                isLoading={isAnalyzing}
              />
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const selectedFile = e.target.files?.[0];
          if (selectedFile) {
            handleFileUpload(selectedFile);
          }
        }}
      />
    </div>
  );
}