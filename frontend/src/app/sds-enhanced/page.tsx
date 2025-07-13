"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Search,
  Beaker,
  FileText,
  AlertTriangle,
  CheckCircle,
  Download,
  Eye,
  Trash2,
  Plus,
} from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import dynamic from "next/dynamic";

const SDSViewer = dynamic(() => import("@/components/sds/SDSViewer"), {
  ssr: false,
});

import { sdsService, type SDSDocument as BackendSDSDocument } from "@/services/sdsService";

interface SDSDocument {
  id: string;
  chemicalName: string;
  casNumber?: string;
  manufacturer?: string;
  uploadDate: string;
  status: "processed" | "processing" | "failed";
  confidence: number;
}

export default function EnhancedSDSLibraryPage() {
  const [activeTab, setActiveTab] = useState("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sdsData, setSDSData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sdsDocuments, setSDSDocuments] = useState<BackendSDSDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  // Load SDS documents from backend
  useEffect(() => {
    loadSDSDocuments();
  }, [searchTerm]);

  const loadSDSDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      const result = await sdsService.searchSDS({ 
        search: searchTerm || undefined,
        include_expired: true 
      });
      setSDSDocuments(result.sds);
    } catch (error) {
      console.error("Failed to load SDS documents:", error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleProcessSDS = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const { sdsExtractionService } = await import(
        "@/services/sdsExtractionService"
      );

      // Validate file
      const validation = sdsExtractionService.validateSDSFile(selectedFile);
      if (!validation.valid) {
        alert(`File validation failed:\n${validation.errors.join("\n")}`);
        setIsProcessing(false);
        return;
      }

      // Extract SDS data
      const result = await sdsExtractionService.extractSDSData(selectedFile);

      if (result.success) {
        setSDSData(result);
        setActiveTab("viewer");

        // Show success message
        const summary = [
          "SDS Processing Complete!",
          `Chemical: ${result.chemicalName}`,
          `Confidence: ${Math.round(result.processingMetadata.confidence * 100)}%`,
          `Sections Extracted: ${result.sections.length}/16`,
          result.warnings.length > 0
            ? `Warnings: ${result.warnings.length}`
            : "",
          result.recommendations.length > 0
            ? `Recommendations: ${result.recommendations.length}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        alert(summary);
      } else {
        alert("SDS processing failed. Please try again.");
      }
    } catch (error) {
      console.error("SDS processing error:", error);
      alert("SDS processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "ACTIVE":
        return <Badge className="bg-green-600">Active</Badge>;
      case "EXPIRED":
        return <Badge className="bg-red-600">Expired</Badge>;
      case "SUPERSEDED":
        return <Badge className="bg-yellow-600">Superseded</Badge>;
      case "UNDER_REVIEW":
        return <Badge className="bg-blue-600">Under Review</Badge>;
      case "DRAFT":
        return <Badge className="bg-gray-600">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const result = await sdsService.downloadSDS(id);
      if (result.success && result.url) {
        window.open(result.url, '_blank');
      } else {
        alert(`Download failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed. Please try again.");
    }
  };

  const handleView = async (id: string) => {
    try {
      const sds = await sdsService.getSDSById(id);
      if (sds) {
        setSDSData(sds);
        setActiveTab("viewer");
      } else {
        alert("Failed to load SDS details");
      }
    } catch (error) {
      console.error("Failed to view SDS:", error);
      alert("Failed to load SDS details");
    }
  };

  // No client-side filtering since backend handles search
  const filteredDocuments = sdsDocuments;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Beaker className="h-8 w-8 text-[#153F9F]" />
                Safety Data Sheet Library
              </h1>
              <p className="text-gray-600 mt-1">
                Automated SDS processing with intelligent data extraction
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">Upload & Process</TabsTrigger>
              <TabsTrigger value="library">SDS Library</TabsTrigger>
              <TabsTrigger value="viewer" disabled={!sdsData}>
                SDS Viewer
              </TabsTrigger>
            </TabsList>

            {/* Upload & Process Tab */}
            <TabsContent value="upload" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload SDS Document
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* File Upload */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-gray-700">
                          {selectedFile
                            ? selectedFile.name
                            : "Upload Safety Data Sheet"}
                        </p>
                        <p className="text-gray-500">
                          Supports PDF documents up to 25MB
                        </p>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <Button variant="outline" className="mt-2">
                            {selectedFile ? "Change File" : "Choose File"}
                          </Button>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* File Details */}
                  {selectedFile && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-blue-900">
                            Selected File
                          </h3>
                          <p className="text-sm text-blue-700">
                            {selectedFile.name} (
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        </div>
                        <Button
                          onClick={handleProcessSDS}
                          disabled={isProcessing}
                          className="bg-[#153F9F] hover:bg-[#153F9F]/90"
                        >
                          {isProcessing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Beaker className="h-4 w-4 mr-2" />
                              Process SDS
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Processing Features */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <FileText className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-medium">Text Extraction</h3>
                            <p className="text-sm text-gray-600">
                              PDF parsing with OCR fallback
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Beaker className="h-5 w-5 text-[#153F9F]" />
                          </div>
                          <div>
                            <h3 className="font-medium">Data Parsing</h3>
                            <p className="text-sm text-gray-600">
                              16 SDS sections automated
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-medium">Validation</h3>
                            <p className="text-sm text-gray-600">
                              Quality assessment & confidence
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Library Tab */}
            <TabsContent value="library" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>SDS Documents</CardTitle>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search by chemical name, CAS, or manufacturer..."
                          className="pl-10 w-80"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Button onClick={() => setActiveTab("upload")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add New
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 text-sm font-medium text-gray-500">
                            PRODUCT NAME
                          </th>
                          <th className="text-left py-3 text-sm font-medium text-gray-500">
                            PRODUCT CODE
                          </th>
                          <th className="text-left py-3 text-sm font-medium text-gray-500">
                            MANUFACTURER
                          </th>
                          <th className="text-left py-3 text-sm font-medium text-gray-500">
                            REVISION DATE
                          </th>
                          <th className="text-left py-3 text-sm font-medium text-gray-500">
                            STATUS
                          </th>
                          <th className="text-left py-3 text-sm font-medium text-gray-500">
                            VERSION
                          </th>
                          <th className="text-left py-3 text-sm font-medium text-gray-500">
                            ACTIONS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingDocuments ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center">
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-2">Loading SDS documents...</span>
                              </div>
                            </td>
                          </tr>
                        ) : filteredDocuments.map((doc) => (
                          <tr
                            key={doc.id}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                <Beaker className="h-4 w-4 text-gray-400" />
                                <div>
                                  <span className="font-medium block">
                                    {doc.product_name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    UN {doc.dangerous_good.un_number}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 text-sm">
                              {doc.manufacturer_code || "N/A"}
                            </td>
                            <td className="py-4 text-sm">
                              {doc.manufacturer || "Unknown"}
                            </td>
                            <td className="py-4 text-sm">
                              {new Date(doc.revision_date).toLocaleDateString()}
                            </td>
                            <td className="py-4">
                              {getStatusBadge(doc.status)}
                            </td>
                            <td className="py-4 text-sm">
                              <div>
                                <span className="block">v{doc.version}</span>
                                {doc.is_expired && (
                                  <Badge variant="destructive" className="text-xs">
                                    Expired
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="View Details"
                                  onClick={() => handleView(doc.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Download"
                                  onClick={() => handleDownload(doc.id)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Delete"
                                  disabled
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredDocuments.length === 0 && (
                    <div className="text-center py-8">
                      <Beaker className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {searchTerm
                          ? "No SDS documents match your search."
                          : "No SDS documents uploaded yet."}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Viewer Tab */}
            <TabsContent value="viewer">
              {sdsData ? (
                <SDSViewer sdsData={sdsData} />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      No SDS data to display. Upload and process an SDS first.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  );
}
