"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  BookOpen,
  Search,
  Download,
  Upload,
  AlertTriangle,
  Calendar,
  Globe,
  Factory,
  FileText,
  Eye,
  Filter,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
  Star,
  Phone,
  MapPin,
  Zap,
  Navigation,
  Beaker,
  Plus,
  Trash2,
} from "lucide-react";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import { usePermissions } from "@/contexts/PermissionContext";

// Component imports
import SDSUploadModal from "@/shared/components/sds/SDSUploadModal";
import SDSAdvancedSearch from "@/shared/components/sds/SDSAdvancedSearch";
import SDSBulkOperations from "@/shared/components/sds/SDSBulkOperations";
import SDSViewerModal from "@/shared/components/sds/SDSViewerModal";
import SDSEmergencyInfo from "@/shared/components/sds/SDSEmergencyInfo";
import SDSMobileLookup from "@/shared/components/sds/SDSMobileLookup";

// Hook imports
import {
  useSafetyDataSheets,
  useSDSStatistics,
  useExpiringSDS,
  useSDSDownload,
  useSDSLookup,
  useSDSBulkStatusUpdate,
  useSDSBulkDownload,
  type SafetyDataSheet,
  type SDSSearchParams,
} from "@/shared/hooks/useSDS";
import { useSearchDangerousGoods } from "@/shared/hooks/useDangerousGoods";

// Service imports
import { sdsService, type SDSDocument as BackendSDSDocument } from "@/services/sdsService";
import dynamic from "next/dynamic";

const SDSViewer = dynamic(() => import("@/shared/components/sds/SDSViewer"), {
  ssr: false,
});

export default function UnifiedSDSPage() {
  // Role-based access control
  const { can, canUploadSDS, canAccessEmergencyInfo } = usePermissions();

  // Determine interface mode based on role and screen size
  const [interfaceMode, setInterfaceMode] = useState<'library' | 'emergency' | 'enhanced' | 'mobile'>('library');
  const [searchParams, setSearchParams] = useState<SDSSearchParams>({});
  const [selectedSDS, setSelectedSDS] = useState<SafetyDataSheet | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedSDSIds, setSelectedSDSIds] = useState<string[]>([]);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Emergency-specific state
  const [searchTerm, setSearchTerm] = useState("");
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [emergencyContacted, setEmergencyContacted] = useState(false);

  // Enhanced processing state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sdsData, setSDSData] = useState<any>(null);
  const [sdsDocuments, setSDSDocuments] = useState<BackendSDSDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  // Hook calls
  const {
    data: sdsLibraryData,
    isLoading: sdsLoading,
    refetch: refetchSDS,
  } = useSafetyDataSheets(searchParams);
  const { data: statistics } = useSDSStatistics();
  const { data: expiringSDS } = useExpiringSDS(30);
  const { data: searchResults } = useSearchDangerousGoods(searchTerm, searchTerm.length >= 2);
  const downloadSDS = useSDSDownload();
  const lookupSDS = useSDSLookup();
  const lookupMutation = useSDSLookup();
  const bulkStatusUpdate = useSDSBulkStatusUpdate();
  const bulkDownload = useSDSBulkDownload();

  // Determine default interface mode based on user permissions
  useEffect(() => {
    if (canAccessEmergencyInfo && can('emergency.procedures.view')) {
      setInterfaceMode('emergency');
    } else if (can('shipments.view.own')) {
      setInterfaceMode('mobile');
    } else if (canUploadSDS) {
      setInterfaceMode('enhanced');
    } else {
      setInterfaceMode('library');
    }
  }, [canAccessEmergencyInfo, canUploadSDS, can]);

  // Get user location for emergency mode
  useEffect(() => {
    if (interfaceMode === 'emergency' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation(
            `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
          );
        },
        (error) => {
          console.warn("Geolocation error:", error);
          setCurrentLocation("Location unavailable");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    }
  }, [interfaceMode]);

  // Load enhanced SDS documents
  useEffect(() => {
    if (interfaceMode === 'enhanced') {
      loadSDSDocuments();
    }
  }, [searchTerm, interfaceMode]);

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

  // Get available tabs based on role
  const getAvailableTabs = () => {
    const tabs = [];
    
    if (can('sds.emergency.info')) {
      tabs.push({ value: 'emergency', label: 'Emergency Lookup', icon: AlertTriangle });
    }
    
    tabs.push({ value: 'library', label: 'SDS Library', icon: BookOpen });
    
    if (can('sds.upload')) {
      tabs.push({ value: 'enhanced', label: 'Upload & Process', icon: Upload });
    }
    
    if (can('sds.version.control')) {
      tabs.push({ value: 'versions', label: 'Version Control', icon: Clock });
    }
    
    if (can('sds.compliance.analytics')) {
      tabs.push({ value: 'compliance', label: 'Compliance', icon: Shield });
      tabs.push({ value: 'analytics', label: 'Analytics', icon: FileText });
    }

    return tabs;
  };

  // Event handlers
  const handleSearch = (newParams: Partial<SDSSearchParams>) => {
    setSearchParams((prev) => ({ ...prev, ...newParams }));
  };

  const handleDownload = (sdsId: string, context: string = "GENERAL") => {
    downloadSDS.mutate({ sdsId, context });
  };

  const handleUploadSuccess = (sdsId: string) => {
    refetchSDS();
    setShowUploadModal(false);
  };

  const handleSearchReset = () => {
    setSearchParams({});
  };

  const handleViewSDS = (sds: SafetyDataSheet) => {
    setSelectedSDS(sds);
    setShowViewerModal(true);
  };

  const handleQuickLookup = async (dangerousGoodId: string) => {
    try {
      await lookupMutation.mutateAsync({
        dangerous_good_id: dangerousGoodId,
        language: "EN",
        country_code: "AU",
      });
    } catch (error) {
      console.error("Emergency SDS lookup failed:", error);
    }
  };

  const handleEmergencyCall = () => {
    if (window.confirm("Call emergency services (000)?")) {
      setEmergencyContacted(true);
      window.location.href = "tel:000";
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
      const { sdsExtractionService } = await import("@/services/sdsExtractionService");

      const validation = sdsExtractionService.validateSDSFile(selectedFile);
      if (!validation.valid) {
        alert(`File validation failed:\n${validation.errors.join("\n")}`);
        setIsProcessing(false);
        return;
      }

      const result = await sdsExtractionService.extractSDSData(selectedFile);

      if (result.success) {
        setSDSData(result);
        alert(`SDS Processing Complete!\nChemical: ${result.chemicalName}\nConfidence: ${Math.round(result.processingMetadata.confidence * 100)}%`);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-800";
      case "EXPIRED": return "bg-red-100 text-red-800";
      case "SUPERSEDED": return "bg-gray-100 text-gray-800";
      case "UNDER_REVIEW": return "bg-yellow-100 text-yellow-800";
      case "DRAFT": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "ACTIVE": return <Badge className="bg-green-600">Active</Badge>;
      case "EXPIRED": return <Badge className="bg-red-600">Expired</Badge>;
      case "SUPERSEDED": return <Badge className="bg-yellow-600">Superseded</Badge>;
      case "UNDER_REVIEW": return <Badge className="bg-blue-600">Under Review</Badge>;
      case "DRAFT": return <Badge className="bg-gray-600">Draft</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Mobile-first interface for users with mobile access
  if (can('sds.mobile.interface') && interfaceMode === 'mobile') {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 p-4">
          <SDSMobileLookup />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50">
          {/* Emergency Header - only for emergency responders or emergency mode */}
          {(can('sds.emergency.responder') || interfaceMode === 'emergency') && (
            <Card className="border-red-500 bg-red-600 text-white mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6" />
                    EMERGENCY SDS LOOKUP
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {currentLocation && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {currentLocation}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button onClick={handleEmergencyCall} className="bg-red-800 hover:bg-red-900 text-white">
                    <Phone className="h-4 w-4 mr-2" />
                    Call 000
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-300 text-white hover:bg-red-700"
                    onClick={() => window.location.href = "tel:131126"}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Poison Control
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-300 text-white hover:bg-red-700"
                    onClick={() => window.location.href = "tel:1800803772"}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    HAZMAT Hotline
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Standard Header */}
          <div className="bg-white border-b border-gray-200">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Safety Data Sheet Management
                    </h1>
                    <p className="text-gray-600">
                      {can('sds.emergency.responder') 
                        ? "Emergency access to critical safety information"
                        : can('sds.mobile.interface')
                        ? "Mobile SDS lookup and emergency procedures"
                        : "Comprehensive SDS management and compliance tools"
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {can('sds.upload') && (
                    <Button onClick={() => setShowUploadModal(true)}>
                      <Upload className="h-4 w-4" />
                      Upload SDS
                    </Button>
                  )}
                  <Button onClick={() => refetchSDS()} variant="outline" disabled={sdsLoading}>
                    <RefreshCw className={`h-4 w-4 ${sdsLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Mode Selector for users with mode selection permission */}
            {can('sds.mode.selection') && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Interface Mode:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={interfaceMode === 'library' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setInterfaceMode('library')}
                    >
                      Library View
                    </Button>
                    <Button
                      variant={interfaceMode === 'emergency' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setInterfaceMode('emergency')}
                    >
                      Emergency Mode
                    </Button>
                    <Button
                      variant={interfaceMode === 'enhanced' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setInterfaceMode('enhanced')}
                    >
                      Enhanced Processing
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Role-based tabs */}
            <Tabs value={interfaceMode} onValueChange={(value: any) => setInterfaceMode(value)}>
              <TabsList className="grid w-full grid-cols-auto">
                {getAvailableTabs().map(tab => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger key={tab.value} value={tab.value}>
                      <Icon className="h-4 w-4 mr-2" />
                      {tab.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* Emergency Tab */}
              {can('sds.emergency.info') && (
                <TabsContent value="emergency" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-900">
                        <Zap className="h-5 w-5" />
                        Quick SDS Lookup
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                          <Input
                            placeholder="Enter UN number or chemical name (e.g. UN1090, Acetone)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 text-lg h-12"
                            autoFocus
                          />
                        </div>

                        {searchResults && searchResults.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-900">Quick Results:</h4>
                            {searchResults.slice(0, 3).map((dg) => (
                              <Button
                                key={dg.id}
                                onClick={() => handleQuickLookup(dg.id)}
                                variant="outline"
                                className="w-full justify-start h-auto p-4 text-left"
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">
                                    {dg.un_number} - {dg.proper_shipping_name}
                                  </div>
                                  <div className="text-sm text-red-600">
                                    Class {dg.hazard_class} Dangerous Good
                                  </div>
                                </div>
                                <Navigation className="h-4 w-4 text-gray-400" />
                              </Button>
                            ))}
                          </div>
                        )}

                        {lookupMutation.data && (
                          <SDSEmergencyInfo
                            sds={lookupMutation.data}
                            currentLocation={currentLocation || undefined}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Library Tab */}
              <TabsContent value="library" className="space-y-6">
                {/* Statistics - visible to all roles */}
                {statistics && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total SDS</CardTitle>
                        <BookOpen className="h-4 w-4 text-blue-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {statistics.total_sds}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {statistics.active_sds} active
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
                        <Calendar className="h-4 w-4 text-yellow-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                          {statistics.expiring_soon}
                        </div>
                        <p className="text-xs text-muted-foreground">Next 30 days</p>
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expired</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          {statistics.expired_sds}
                        </div>
                        <p className="text-xs text-muted-foreground">Need renewal</p>
                      </CardContent>
                    </Card>

                    {can('sds.compliance.analytics') && (
                      <>
                        <Card className="hover:shadow-lg transition-shadow">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
                            <Clock className="h-4 w-4 text-orange-600" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-orange-600">
                              {statistics.by_status.UNDER_REVIEW || 0}
                            </div>
                            <p className="text-xs text-muted-foreground">In progress</p>
                          </CardContent>
                        </Card>

                        <Card className="hover:shadow-lg transition-shadow">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Compliance</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                              {Math.round((statistics.active_sds / (statistics.total_sds - statistics.by_status.DRAFT || 0)) * 100)}%
                            </div>
                            <p className="text-xs text-muted-foreground">Compliant rate</p>
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </div>
                )}

                {/* Advanced Search - only for users with appropriate access */}
                {can('sds.bulk.operations') && (
                  <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-4 border-b">
                      <h3 className="text-lg font-semibold">Search & Filters</h3>
                      <SDSAdvancedSearch
                        searchParams={searchParams}
                        onSearchChange={handleSearch}
                        onReset={handleSearchReset}
                      />
                    </div>
                  </div>
                )}

                {/* SDS Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Safety Data Sheets ({sdsLibraryData?.count || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sdsLoading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                        <p className="text-gray-500 mt-2">Loading SDS documents...</p>
                      </div>
                    ) : sdsLibraryData?.results && sdsLibraryData.results.length > 0 ? (
                      can('sds.bulk.operations') ? (
                        <SDSBulkOperations
                          sdsDocuments={sdsLibraryData.results}
                          selectedIds={selectedSDSIds}
                          onSelectionChange={setSelectedSDSIds}
                          onBulkStatusUpdate={async (ids, status, reason) => 
                            await bulkStatusUpdate.mutateAsync({ sds_ids: ids, new_status: status, reason })
                          }
                          onBulkDownload={async (ids) => await bulkDownload.mutateAsync(ids)}
                          onViewSDS={handleViewSDS}
                          isLoading={bulkStatusUpdate.isPending || bulkDownload.isPending}
                        />
                      ) : (
                        // Simple table for limited access users
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 text-sm font-medium text-gray-500">Product Name</th>
                                <th className="text-left py-3 text-sm font-medium text-gray-500">Manufacturer</th>
                                <th className="text-left py-3 text-sm font-medium text-gray-500">Status</th>
                                <th className="text-left py-3 text-sm font-medium text-gray-500">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sdsLibraryData.results.map((sds) => (
                                <tr key={sds.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-4">
                                    <div className="font-medium">{sds.product_name}</div>
                                    <div className="text-sm text-gray-500">UN {sds.dangerous_good.un_number}</div>
                                  </td>
                                  <td className="py-4 text-sm">{sds.manufacturer}</td>
                                  <td className="py-4">
                                    <Badge className={getStatusColor(sds.status)}>
                                      {sds.status}
                                    </Badge>
                                  </td>
                                  <td className="py-4">
                                    <div className="flex items-center gap-2">
                                      <Button variant="ghost" size="sm" onClick={() => handleViewSDS(sds)}>
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => handleDownload(sds.id)}>
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No SDS Found</h3>
                        <p className="text-gray-600">Try adjusting your search criteria</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Enhanced Processing Tab */}
              {can('sds.upload') && (
                <TabsContent value="enhanced" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Upload & Process SDS Document
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                        <div className="text-center">
                          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <div className="space-y-2">
                            <p className="text-lg font-medium text-gray-700">
                              {selectedFile ? selectedFile.name : "Upload Safety Data Sheet"}
                            </p>
                            <p className="text-gray-500">Supports PDF documents up to 25MB</p>
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

                      {selectedFile && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-blue-900">Selected File</h3>
                              <p className="text-sm text-blue-700">
                                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
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
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Version Control Tab */}
              {can('sds.version.control') && (
                <TabsContent value="versions" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-purple-600" />
                        Version Control & Document History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {sdsLibraryData?.results && sdsLibraryData.results.length > 0 ? (
                        <div className="space-y-4">
                          {sdsLibraryData.results
                            .filter(sds => sds.supersedes_version || sds.status === 'SUPERSEDED')
                            .map((sds) => (
                              <div key={sds.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold">{sds.product_name}</h4>
                                  <Badge>v{sds.version}</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span>{sds.manufacturer}</span>
                                  <span>•</span>
                                  <span>UN{sds.dangerous_good.un_number}</span>
                                  {sds.supersedes_version && (
                                    <>
                                      <span>•</span>
                                      <span>Supersedes v{sds.supersedes_version}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Version History</h3>
                          <p className="text-gray-600">Documents with version history will appear here</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Compliance Tab */}
              {can('sds.compliance.analytics') && (
                <TabsContent value="compliance" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-green-600" />
                        Compliance Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <h3 className="font-semibold text-green-800">Compliant</h3>
                            <p className="text-2xl font-bold text-green-600">
                              {statistics?.active_sds || 0}
                            </p>
                            <p className="text-sm text-green-700">Active documents</p>
                          </div>
                          <div className="text-center p-4 bg-yellow-50 rounded-lg">
                            <h3 className="font-semibold text-yellow-800">Action Required</h3>
                            <p className="text-2xl font-bold text-yellow-600">
                              {(statistics?.expiring_soon || 0) + (statistics?.expired_sds || 0)}
                            </p>
                            <p className="text-sm text-yellow-700">Need attention</p>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <h3 className="font-semibold text-blue-800">Coverage</h3>
                            <p className="text-2xl font-bold text-blue-600">
                              {Object.keys(statistics?.by_language || {}).length}
                            </p>
                            <p className="text-sm text-blue-700">Languages</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Analytics Tab */}
              {can('sds.compliance.analytics') && (
                <TabsContent value="analytics" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {statistics && (
                      <>
                        <Card>
                          <CardHeader>
                            <CardTitle>Document Status Distribution</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {Object.entries(statistics.by_status).map(([status, count]) => (
                                <div key={status} className="flex justify-between items-center">
                                  <span className="text-sm capitalize">
                                    {status.toLowerCase().replace('_', ' ')}
                                  </span>
                                  <Badge variant="outline">{count as number}</Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>Language Coverage</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {Object.entries(statistics.by_language).map(([language, count]) => (
                                <div key={language} className="flex justify-between items-center">
                                  <span className="text-sm">{language}</span>
                                  <Badge variant="outline">{count as number}</Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>

            {/* Upload Modal */}
            {can('sds.upload') && (
              <SDSUploadModal
                open={showUploadModal}
                onOpenChange={setShowUploadModal}
                onUploadSuccess={handleUploadSuccess}
              />
            )}

            {/* SDS Viewer Modal */}
            <SDSViewerModal
              sds={selectedSDS}
              open={showViewerModal}
              onOpenChange={setShowViewerModal}
              onDownload={(sdsId) => handleDownload(sdsId, "PREVIEW")}
            />
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}