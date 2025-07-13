"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  ChevronRight,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { HazardSymbol, HazardClassBadge } from "@/components/ui/hazard-symbol";
import { CollapsibleNotification } from "@/components/ui/collapsible-notification";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef } from "react";
import type { PDFViewerRef, HighlightArea } from "@/components/pdf/PDFViewer";

// Dynamically import PDF viewer to avoid SSR issues
const PDFViewer = dynamic(() => import("@/components/pdf/PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ),
});

const ManifestTable = dynamic(
  () => import("@/components/manifests/ManifestTable"),
  {
    ssr: false,
  },
);

const URLUploadModal = dynamic(
  () => import("@/components/manifests/URLUploadModal"),
  {
    ssr: false,
  },
);

// Mock data for previously searched manifests
const mockPreviousSearches = [
  {
    id: "1",
    fileName: "695637717.3909516-scan-check.pdf",
    pagesSearched: 87,
    resultsFound: 16,
    date: "2024-01-10 19:10:23",
    status: "completed",
  },
  {
    id: "2",
    fileName: "manifest-chemical-batch-2024.pdf",
    pagesSearched: 45,
    resultsFound: 8,
    date: "2024-01-09 14:22:15",
    status: "completed",
  },
  {
    id: "3",
    fileName: "transport-manifest-001.pdf",
    pagesSearched: 23,
    resultsFound: 3,
    date: "2024-01-08 11:45:30",
    status: "processing",
  },
];

// Mock data for comprehensive manifest table
const mockManifestTableData = [
  {
    id: "1",
    un: "3500",
    properShippingName: "Batteries wet filled with acid",
    class: "6.1",
    subHazard: "6.1",
    packingGroup: "III",
    typeOfContainer: "14",
    quantity: "20,000L",
    weight: "20,000L",
  },
  {
    id: "2",
    un: "2794",
    properShippingName: "-",
    class: "6.3",
    subHazard: "-",
    packingGroup: "III",
    typeOfContainer: "14",
    quantity: "20,000L",
    weight: "20,000L",
  },
  {
    id: "3",
    un: "3500",
    properShippingName: "Electric storage",
    class: "6.1",
    subHazard: "6.1",
    packingGroup: "III",
    typeOfContainer: "14",
    quantity: "20,000L",
    weight: "20,000L",
    skipped: true,
  },
  {
    id: "4",
    un: "3500",
    properShippingName: "Electric storage",
    class: "6.1",
    subHazard: "6.1",
    packingGroup: "III",
    typeOfContainer: "14",
    quantity: "20,000L",
    weight: "20,000L",
  },
  {
    id: "5",
    un: "3500",
    properShippingName: "Electric storage",
    class: "6.1",
    subHazard: "6.1",
    packingGroup: "III",
    typeOfContainer: "14",
    quantity: "20,000L",
    weight: "20,000L",
    skipped: true,
  },
];

// Mock search results organized by keywords found in manifest
const mockKeywordResults = [
  {
    id: "paint-1",
    keyword: "paint",
    page: 1,
    context: "Line 15: Industrial paint, lacquer solutions - 200L containers",
    highlightArea: {
      page: 1,
      x: 85,
      y: 470,
      width: 120,
      height: 15,
      color: 'green' as const,
      keyword: "paint",
      id: "paint-1"
    },
    dangerousGoods: [
      {
        id: "1",
        un: "1263",
        properShippingName:
          "Paint including paint, lacquer, enamel, stain, shellac solutions, varnish, polish, liquid filler, and liquid lacquer base",
        class: "3",
        materialNumber: "1263",
        materialName: "Paint including paint",
        details: "Confidence: 92% | Source: automatic | Qty: 200L",
        confidence: 0.92,
      },
    ],
  },
  {
    id: "resin-1",
    keyword: "resin solution",
    page: 1,
    context: "Line 28: Resin solution batch RS-2024-001, flammable grade",
    highlightArea: {
      page: 1,
      x: 85,
      y: 495,
      width: 150,
      height: 15,
      color: 'green' as const,
      keyword: "resin solution",
      id: "resin-1"
    },
    dangerousGoods: [
      {
        id: "2",
        un: "1866",
        properShippingName: "Resin solution, flammable",
        class: "3",
        materialNumber: "1866",
        materialName: "Resin solution",
        details: "Confidence: 87% | Source: automatic | Qty: 50L",
        confidence: 0.87,
      },
    ],
  },
  {
    id: "adhesives-1",
    keyword: "adhesives",
    page: 1,
    context:
      "Line 45: Adhesives containing flammable liquid - Industrial grade",
    highlightArea: {
      page: 1,
      x: 85,
      y: 520,
      width: 110,
      height: 15,
      color: 'yellow' as const,
      keyword: "adhesives",
      id: "adhesives-1"
    },
    dangerousGoods: [
      {
        id: "3",
        un: "1133",
        properShippingName: "Adhesives containing flammable liquid",
        class: "3",
        materialNumber: "1133",
        materialName: "Adhesives containing flammable liquid",
        details: "Confidence: 78% | Source: automatic | Qty: 100L",
        confidence: 0.78,
      },
    ],
  },
];

const getDGClassColor = (dgClass: string) => {
  const colors: { [key: string]: string } = {
    "1.1D": "bg-orange-500",
    "5.1": "bg-yellow-600",
    "3": "bg-red-600",
    "4.1": "bg-yellow-500",
    "8": "bg-gray-600",
  };
  return colors[dgClass] || "bg-gray-400";
};

export default function ManifestUploadPage() {
  const pdfViewerRef = useRef<PDFViewerRef>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [keywordResults, setKeywordResults] = useState<Array<{
    id: string;
    keyword: string;
    page: number;
    context: string;
    highlightArea: {
      page: number;
      x: number;
      y: number;
      width: number;
      height: number;
      color: 'green' | 'yellow' | 'orange';
      keyword: string;
      id: string;
    };
    dangerousGoods: Array<{
      id: string;
      un: string;
      properShippingName: string;
      class: string;
      materialNumber: string;
      materialName: string;
      details: string;
      confidence: number;
    }>;
  }> | null>(null);
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUrlUpload, setShowUrlUpload] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [viewMode, setViewMode] = useState<"search" | "table">("search");
  const [manifestTableData, setManifestTableData] = useState<
    typeof mockManifestTableData
  >([]);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [analysisWarnings, setAnalysisWarnings] = useState<string[]>([]);
  const [analysisRecommendations, setAnalysisRecommendations] = useState<
    string[]
  >([]);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: "warning" | "recommendation" | "info" | "error";
    title: string;
    message: string;
    dismissible?: boolean;
  }>>([]);

  // Handle PDF URL creation and cleanup
  useEffect(() => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      setPdfUrl(url);

      // Cleanup function to revoke URL when component unmounts or file changes
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPdfUrl(null);
    }
  }, [uploadedFile]);

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
      const isPDF =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      if (isPDF) {
        setUploadedFile(file);
        processManifest(file);
      } else {
        alert("Please upload a PDF file");
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const isPDF =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      if (isPDF) {
        setUploadedFile(file);
        processManifest(file);
      } else {
        alert("Please upload a PDF file");
      }
    }
  };

  const processManifest = async (file: File) => {
    setIsProcessing(true);
    setProcessingError(null);
    setAnalysisWarnings([]);
    setAnalysisRecommendations([]);

    try {
      // Import the manifest service and text extractor dynamically to avoid SSR issues
      const { manifestService } = await import("@/services/manifestService");
      const { PDFTextExtractor } = await import("@/services/pdfTextExtractor");

      // Validate the PDF file first
      const validation = manifestService.validatePDFFile(file);
      if (!validation.valid) {
        setProcessingError(
          `File validation failed: ${validation.errors.join(", ")}`,
        );
        setIsProcessing(false);
        return;
      }

      // Upload and analyze the manifest
      const response = await manifestService.uploadAndAnalyzeManifest({
        file,
        analysisOptions: {
          detectDangerousGoods: true,
          extractMetadata: true,
          validateFormat: true,
        },
      });

      if (response.success && response.results) {
        // Extract keywords from dangerous goods
        const keywords = response.results.dangerousGoods.flatMap(item => {
          const words = [];
          // Add UN number
          words.push(item.un);
          // Add first word of proper shipping name
          const firstWord = item.properShippingName.split(" ")[0];
          if (firstWord.length > 3) {
            words.push(firstWord);
          }
          // Add full proper shipping name if it's short
          if (item.properShippingName.length < 20) {
            words.push(item.properShippingName);
          }
          return words;
        });

        // Extract actual text positions from PDF
        const highlightAreas = await PDFTextExtractor.searchDangerousGoods(file, keywords);

        // Transform API response to keyword results format
        const transformedResults = response.results.dangerousGoods.map(
          (item, index) => {
            const keyword = item.properShippingName.split(" ")[0].toLowerCase();
            const resultId = `api-result-${index}`;
            
            // Find corresponding highlight area
            const matchingHighlight = highlightAreas.find(h => 
              h.keyword?.toLowerCase() === keyword || 
              h.keyword === item.un
            ) || {
              // Fallback to simulated position if no match found
              page: Math.floor(index / 3) + 1,
              x: 85 + (index % 3) * 5,
              y: 470 + (index * 25),
              width: keyword.length * 8 + 40,
              height: 15,
              color: 'yellow' as const,
              keyword,
              id: resultId
            };
            
            return {
              id: resultId,
              keyword,
              page: matchingHighlight.page,
              context: `Detected ${item.properShippingName} - ${item.quantity || "Unknown quantity"}`,
              highlightArea: {
                ...matchingHighlight,
                id: resultId,
                color: matchingHighlight.color || 'yellow' as const,
                keyword: matchingHighlight.keyword || keyword
              },
              dangerousGoods: [
                {
                  id: item.id,
                  un: item.un,
                  properShippingName: item.properShippingName,
                  class: item.class,
                  materialNumber: item.un,
                  materialName: item.properShippingName,
                  details: `Confidence: ${Math.round(item.confidence * 100)}% | Source: ${item.source} | Qty: ${item.quantity || "N/A"}`,
                  confidence: item.confidence,
                },
              ],
            };
          }
        );

        setKeywordResults(
          transformedResults.length > 0
            ? transformedResults
            : mockKeywordResults,
        );
        setCurrentKeywordIndex(0);

        // Transform dangerous goods to table format
        const tableData = response.results.dangerousGoods.map((item) => ({
          id: item.id,
          un: item.un,
          properShippingName: item.properShippingName,
          class: item.class,
          subHazard: item.subHazard || "-",
          packingGroup: item.packingGroup || "-",
          typeOfContainer: "14", // Default value - would come from manifest parsing
          quantity: item.quantity || "-",
          weight: item.weight || "-",
        }));

        setManifestTableData(
          tableData.length > 0 ? tableData : mockManifestTableData,
        );

        // Store warnings and recommendations
        if (response.results.warnings.length > 0) {
          setAnalysisWarnings(response.results.warnings);
        }
        if (response.results.recommendations.length > 0) {
          setAnalysisRecommendations(response.results.recommendations);
        }

        // Create notifications
        const newNotifications = [
          ...response.results.warnings.map((warning, index) => ({
            id: `warning-${index}`,
            type: "warning" as const,
            title: "Dangerous Goods Detected",
            message: warning,
            dismissible: true,
          })),
          ...response.results.recommendations.map((rec, index) => ({
            id: `rec-${index}`,
            type: "recommendation" as const,
            title: "Recommendation",
            message: rec,
            dismissible: true,
          })),
        ];
        setNotifications(newNotifications);
      } else {
        setProcessingError(response.error || "Manifest analysis failed");
        // Fallback to mock results for demonstration with real text positions
        try {
          const { PDFTextExtractor } = await import("@/services/pdfTextExtractor");
          const mockKeywords = ["paint", "adhesive", "acid", "flammable"];
          const highlightAreas = await PDFTextExtractor.searchDangerousGoods(file, mockKeywords);
          
          // Update mock results with real positions
          const updatedMockResults = mockKeywordResults.map((result, index) => {
            const foundHighlight = highlightAreas[index];
            return {
              ...result,
              highlightArea: foundHighlight ? {
                ...foundHighlight,
                color: foundHighlight.color || 'yellow' as const,
                keyword: foundHighlight.keyword || result.keyword,
                id: foundHighlight.id || result.id
              } : result.highlightArea
            };
          });
          
          setKeywordResults(updatedMockResults);
        } catch (error) {
          console.error("Error extracting text for fallback:", error);
          setKeywordResults(mockKeywordResults);
        }
        
        setManifestTableData(mockManifestTableData);
        setCurrentKeywordIndex(0);
        
        // Set default notifications for demo
        setNotifications([
          {
            id: "warning-1",
            type: "warning",
            title: "Low Confidence Detection",
            message: "Some dangerous goods were detected with low confidence. Manual verification recommended.",
            dismissible: true,
          },
          {
            id: "warning-2", 
            type: "warning",
            title: "Flammable Liquids Detected",
            message: "Flammable liquids detected. Ensure proper ventilation and fire safety measures.",
            dismissible: true,
          },
          {
            id: "rec-1",
            type: "recommendation",
            title: "Review Detected Items",
            message: "Review all detected dangerous goods for accuracy before finalizing manifest.",
            dismissible: true,
          },
        ]);
      }
    } catch (error) {
      console.error("Manifest processing error:", error);
      setProcessingError(
        "Manifest processing failed. Using demonstration data.",
      );
      // Fallback to mock results with real text positions if possible
      try {
        const { PDFTextExtractor } = await import("@/services/pdfTextExtractor");
        const mockKeywords = ["paint", "adhesive", "acid", "flammable"];
        const highlightAreas = await PDFTextExtractor.searchDangerousGoods(file, mockKeywords);
        
        // Update mock results with real positions
        const updatedMockResults = mockKeywordResults.map((result, index) => {
          const foundHighlight = highlightAreas[index];
          return {
            ...result,
            highlightArea: foundHighlight ? {
              ...foundHighlight,
              color: foundHighlight.color || 'yellow' as const,
              keyword: foundHighlight.keyword || result.keyword,
              id: foundHighlight.id || result.id
            } : result.highlightArea
          };
        });
        
        setKeywordResults(updatedMockResults);
      } catch (extractError) {
        console.error("Error extracting text for fallback:", extractError);
        setKeywordResults(mockKeywordResults);
      }
      
      setManifestTableData(mockManifestTableData);
      setCurrentKeywordIndex(0);
      
      // Set default notifications for demo
      setNotifications([
        {
          id: "warning-1",
          type: "warning", 
          title: "Low Confidence Detection",
          message: "Some dangerous goods were detected with low confidence. Manual verification recommended.",
          dismissible: true,
        },
        {
          id: "warning-2",
          type: "warning",
          title: "Flammable Liquids Detected", 
          message: "Flammable liquids detected. Ensure proper ventilation and fire safety measures.",
          dismissible: true,
        },
        {
          id: "rec-1",
          type: "recommendation",
          title: "Review Detected Items",
          message: "Review all detected dangerous goods for accuracy before finalizing manifest.",
          dismissible: true,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const addToManifest = (item: any) => {
    // Handle adding item to manifest
    console.log("Adding to manifest:", item);
  };

  const navigateToKeyword = (direction: "next" | "previous") => {
    if (!keywordResults) return;

    let newIndex = currentKeywordIndex;
    if (
      direction === "next" &&
      currentKeywordIndex < keywordResults.length - 1
    ) {
      newIndex = currentKeywordIndex + 1;
    } else if (direction === "previous" && currentKeywordIndex > 0) {
      newIndex = currentKeywordIndex - 1;
    }

    if (newIndex !== currentKeywordIndex) {
      setCurrentKeywordIndex(newIndex);
      const currentResult = keywordResults[newIndex];
      
      // Navigate PDF to the highlight
      if (currentResult.highlightArea && pdfViewerRef.current) {
        pdfViewerRef.current.navigateToHighlight(currentResult.highlightArea.id);
      }
    }
  };

  const currentKeyword = keywordResults && Array.isArray(keywordResults)
    ? keywordResults[currentKeywordIndex]
    : null;

  const hasKeywordResults = keywordResults && Array.isArray(keywordResults) && keywordResults.length > 0;

  // Notification management
  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const dismissAllNotifications = () => {
    setNotifications([]);
  };

  const handleURLUpload = async (url: string) => {
    try {
      // In a real implementation, this would call an API to fetch the URL
      // For now, we'll simulate the process
      setIsProcessing(true);

      // Simulate URL fetching and processing
      setTimeout(() => {
        // Create a mock file object for the URL
        const mockFile = new File(
          [""],
          url.split("/").pop() || "document.pdf",
          {
            type: "application/pdf",
          },
        );
        setUploadedFile(mockFile);
        setKeywordResults(mockKeywordResults);
        setManifestTableData(mockManifestTableData);
        setCurrentKeywordIndex(0);
        setIsProcessing(false);
        setShowUrlUpload(false);
      }, 2000);
    } catch (error) {
      console.error("URL upload failed:", error);
      throw new Error("Failed to fetch document from URL");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Manifest Search
            </h1>
            <p className="text-gray-600">
              Search your shipment manifest to find dangerous goods
            </p>
          </div>
          <Link href="/shipments">
            <Button variant="outline">Back to Shipments</Button>
          </Link>
        </div>

        {!keywordResults ? (
          <>
            {/* Upload Section */}
            <Card className="max-w-4xl mx-auto">
              <CardContent className="p-12">
                <div className="text-center space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Search your shipment manifest to find dangerous goods
                  </h2>

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
                            ? "border-blue-500 bg-blue-50 scale-105"
                            : "border-gray-300 bg-gray-50 hover:border-gray-400"
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
                            <label
                              htmlFor="file-upload"
                              className="cursor-pointer"
                            >
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
                              <p className="font-medium text-gray-900">
                                {uploadedFile.name}
                              </p>
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
                              setKeywordResults(null);
                              setManifestTableData([]);
                              setPdfUrl(null);
                              setCurrentKeywordIndex(0);
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
                              "Search Manifest"
                            )}
                          </Button>
                        </div>

                        {/* Enhanced Error Display */}
                        {processingError && (
                          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-red-800 mb-1">
                                  Processing Error
                                </p>
                                <p className="text-sm text-red-700">
                                  {processingError}
                                </p>
                                <p className="text-xs text-red-600 mt-2">
                                  Try uploading the file again or contact support if the issue persists.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Success feedback */}
                        {!processingError && hasKeywordResults && (
                          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-green-800">
                                Analysis Complete
                              </p>
                              <p className="text-xs text-green-700">
                                Found {(keywordResults as typeof mockKeywordResults)?.length || 0} potential dangerous goods matches.
                              </p>
                            </div>
                          </div>
                        )}
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
                        <th className="text-left py-3 text-sm font-medium text-gray-500">
                          FILE
                        </th>
                        <th className="text-left py-3 text-sm font-medium text-gray-500">
                          PAGES SEARCHED
                        </th>
                        <th className="text-left py-3 text-sm font-medium text-gray-500">
                          RESULTS FOUND
                        </th>
                        <th className="text-left py-3 text-sm font-medium text-gray-500">
                          DATE
                        </th>
                        <th className="text-left py-3 text-sm font-medium text-gray-500">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockPreviousSearches.map((search) => (
                        <tr
                          key={search.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-4 flex items-center gap-3">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{search.fileName}</span>
                          </td>
                          <td className="py-4 text-sm">
                            {search.pagesSearched}
                          </td>
                          <td className="py-4 text-sm">
                            {search.resultsFound}
                          </td>
                          <td className="py-4 text-sm text-gray-600">
                            {search.date}
                          </td>
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
                  <span className="text-sm text-gray-500">
                    Showing 1 to 10 of 100 entries
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-blue-600 text-white"
                    >
                      1
                    </Button>
                    <Button variant="outline" size="sm">
                      2
                    </Button>
                    <Button variant="outline" size="sm">
                      3
                    </Button>
                    <Button variant="outline" size="sm">
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : viewMode === "search" ? (
          <>
            {/* Collapsible Notifications and View Toggle */}
            <div className="flex justify-between items-start gap-4 mb-4">
              <div className="flex-1">
                {notifications.length > 0 && (
                  <CollapsibleNotification
                    notifications={notifications}
                    onDismiss={dismissNotification}
                    onDismissAll={dismissAllNotifications}
                    defaultExpanded={false}
                  />
                )}
              </div>
              <Button
                onClick={() => setViewMode("table")}
                className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
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
                      <p className="text-sm text-gray-600">
                        {uploadedFile?.name}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 h-[calc(100%-80px)]">
                  {pdfUrl && keywordResults && (
                    <PDFViewer
                      ref={pdfViewerRef}
                      file={pdfUrl}
                      onPageChange={(page, total) => {
                        setCurrentPage(page);
                        setTotalPages(total);
                      }}
                      highlightAreas={keywordResults.map(result => result.highlightArea)}
                      currentHighlight={currentKeyword?.highlightArea?.id}
                      onHighlightClick={(highlight) => {
                        const index = keywordResults.findIndex(r => r.highlightArea.id === highlight.id);
                        if (index !== -1) {
                          setCurrentKeywordIndex(index);
                        }
                      }}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Right Panel - Results Table */}
              <Card className="h-[calc(100vh-200px)]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Potential Results
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>
                          Search pages: {currentPage} of {totalPages || "?"}
                        </span>
                        <span>
                          Results: {manifestTableData.length} of{" "}
                          {(keywordResults as typeof mockKeywordResults)?.reduce((acc, kw) => acc + kw.dangerousGoods.length, 0) || 0}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      title="Download results"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="overflow-y-auto h-[calc(100%-100px)] p-0">
                  {currentKeyword && currentKeyword.dangerousGoods.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 w-12">
                              #
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                              UN
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                              PROPER SHIPPING NAME
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 w-20">
                              CLASS
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentKeyword.dangerousGoods.map((item, itemIndex) => (
                            <tr
                              key={`current-${itemIndex}`}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="py-3 px-4 text-sm font-medium">
                                {itemIndex + 1}
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="font-semibold">
                                  {item.un}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {item.properShippingName}
                                  </p>
                                  <div className="flex items-center gap-4 mt-1">
                                    <span className="text-xs text-gray-500">
                                      Material number: {item.materialNumber}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      Material name: {item.materialName}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {item.details}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs h-6 px-2"
                                    >
                                      View SDS
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-blue-600 hover:bg-blue-700 text-xs h-6 px-2"
                                      onClick={() => addToManifest(item)}
                                    >
                                      Add to manifest
                                    </Button>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <HazardSymbol hazardClass={item.class} size="sm" />
                                  <HazardClassBadge hazardClass={item.class} />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {/* Context Information */}
                      <div className="p-4 bg-gray-50 border-t">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Context: "{currentKeyword.keyword}"
                        </h4>
                        <p className="text-xs text-gray-600">
                          {currentKeyword.context}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Page {currentKeyword.page} of document
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium">No dangerous goods detected</p>
                        <p className="text-sm">Upload and analyze a manifest to see results</p>
                      </div>
                    </div>
                  )}

                  {keywordResults && Array.isArray(keywordResults) && keywordResults.length > 0 && (
                    <div className="border-t bg-white p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Button
                          variant="outline"
                          onClick={() => navigateToKeyword("previous")}
                          disabled={currentKeywordIndex <= 0}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <span className="text-sm text-gray-600">
                          {currentKeyword ? `"${currentKeyword.keyword}"` : ""} (
                          {currentKeywordIndex + 1} of{" "}
                          {keywordResults?.length || 0})
                        </span>
                        <Button
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => navigateToKeyword("next")}
                          disabled={
                            !keywordResults ||
                            currentKeywordIndex >= keywordResults.length - 1
                          }
                        >
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
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          /* Simplified Table View */
          <>
            <div className="flex justify-between items-center mb-4">
              <Button onClick={() => setViewMode("search")} variant="outline">
                Back to Search View
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Detected Dangerous Goods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">
                          UN Number
                        </th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">
                          Proper Shipping Name
                        </th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">
                          Class
                        </th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">
                          Packing Group
                        </th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {manifestTableData.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-2">
                            <Badge variant="outline" className="font-semibold">
                              {item.un}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-sm">
                            {item.properShippingName}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <HazardSymbol hazardClass={item.class} size="sm" />
                              <HazardClassBadge hazardClass={item.class} />
                            </div>
                          </td>
                          <td className="py-3 px-2 text-sm">{item.packingGroup}</td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => addToManifest(item)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* URL Upload Modal */}
        <URLUploadModal
          isOpen={showUrlUpload}
          onClose={() => setShowUrlUpload(false)}
          onUpload={handleURLUpload}
        />
      </div>
    </DashboardLayout>
  );
}
