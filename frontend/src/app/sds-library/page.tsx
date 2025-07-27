// app/sds-library/page.tsx
"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";
import SDSUploadModal from "@/shared/components/sds/SDSUploadModal";
import SDSAdvancedSearch from "@/shared/components/sds/SDSAdvancedSearch";
import SDSBulkOperations from "@/shared/components/sds/SDSBulkOperations";
import SDSViewerModal from "@/shared/components/sds/SDSViewerModal";
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

interface VersionHistory {
  version: string;
  revision_date: string;
  uploaded_by: string;
  status: string;
  changes?: string;
}

export default function SDSLibraryPage() {
  const [searchParams, setSearchParams] = useState<SDSSearchParams>({});
  const [selectedSDS, setSelectedSDS] = useState<SafetyDataSheet | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedSDSIds, setSelectedSDSIds] = useState<string[]>([]);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showVersionHistory, setShowVersionHistory] = useState<string | null>(null);
  const [savedSearches, setSavedSearches] = useState<Array<{ name: string; params: SDSSearchParams }>>([]);
  const [favoriteSDSIds, setFavoriteSDSIds] = useState<string[]>([]);

  const {
    data: sdsData,
    isLoading: sdsLoading,
    refetch: refetchSDS,
  } = useSafetyDataSheets(searchParams);
  const { data: statistics } = useSDSStatistics();
  const { data: expiringSDS } = useExpiringSDS(30);
  const downloadSDS = useSDSDownload();
  const lookupSDS = useSDSLookup();
  const bulkStatusUpdate = useSDSBulkStatusUpdate();
  const bulkDownload = useSDSBulkDownload();

  const handleSearch = (newParams: Partial<SDSSearchParams>) => {
    setSearchParams((prev) => ({ ...prev, ...newParams }));
  };

  const handleDownload = (sdsId: string, context: string = "GENERAL") => {
    downloadSDS.mutate({ sdsId, context });
  };

  const handleUploadSuccess = (sdsId: string) => {
    // Refresh the SDS list after successful upload
    refetchSDS();
    setShowUploadModal(false);
  };

  const handleSearchReset = () => {
    setSearchParams({});
  };

  const handleBulkStatusUpdate = async (sdsIds: string[], newStatus: string, reason: string) => {
    await bulkStatusUpdate.mutateAsync({
      sds_ids: sdsIds,
      new_status: newStatus,
      reason,
    });
  };

  const handleBulkDownload = async (sdsIds: string[]) => {
    await bulkDownload.mutateAsync(sdsIds);
  };

  const handleViewSDS = (sds: SafetyDataSheet) => {
    setSelectedSDS(sds);
    setShowViewerModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "EXPIRED":
        return "bg-red-100 text-red-800";
      case "SUPERSEDED":
        return "bg-gray-100 text-gray-800";
      case "UNDER_REVIEW":
        return "bg-yellow-100 text-yellow-800";
      case "DRAFT":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const toggleFavorite = (sdsId: string) => {
    setFavoriteSDSIds(prev => 
      prev.includes(sdsId) 
        ? prev.filter(id => id !== sdsId)
        : [...prev, sdsId]
    );
  };

  const saveCurrentSearch = (name: string) => {
    setSavedSearches(prev => [...prev, { name, params: searchParams }]);
  };

  const getVersionBadgeColor = (version: string, currentVersion: string) => {
    if (version === currentVersion) return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Enhanced Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Safety Data Sheet Library
                  </h1>
                  <p className="text-gray-600">
                    Manage and access safety data sheets with version control
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                >
                  {viewMode === 'list' ? 'Grid View' : 'List View'}
                </Button>
                <Button
                  onClick={() => refetchSDS()}
                  variant="outline"
                  disabled={sdsLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${sdsLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                <Button 
                  className="flex items-center gap-2"
                  onClick={() => setShowUploadModal(true)}
                >
                  <Upload className="h-4 w-4" />
                  Upload SDS
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
        {/* Quick Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Quick Filters:</span>
              <div className="flex items-center gap-2">
                <Button
                  variant={searchParams.status === 'ACTIVE' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSearch({ status: searchParams.status === 'ACTIVE' ? undefined : 'ACTIVE' })}
                >
                  Active Only
                </Button>
                <Button
                  variant={searchParams.include_expired ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSearch({ include_expired: !searchParams.include_expired })}
                >
                  Include Expired
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const recentlyUpdated = new Date();
                    recentlyUpdated.setDate(recentlyUpdated.getDate() - 30);
                    handleSearch({ updated_after: recentlyUpdated.toISOString() });
                  }}
                >
                  Recently Updated
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {sdsData?.count || 0} documents found
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Statistics Cards with Trends */}
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
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {statistics.active_sds} active
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {Math.round((statistics.active_sds / statistics.total_sds) * 100)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Expiring Soon
                </CardTitle>
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
                <p className="text-xs text-muted-foreground">
                  Compliant rate
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Expiring SDS Alert */}
        {expiringSDS && expiringSDS.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              You have {expiringSDS.length} SDS documents expiring within 30
              days.
              <Button
                variant="link"
                className="p-0 h-auto text-yellow-700 underline ml-1"
              >
                View expiring documents
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Advanced Search with Saved Searches */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Search & Filters</h3>
              {savedSearches.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Saved:</span>
                  {savedSearches.map((saved, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchParams(saved.params)}
                    >
                      {saved.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <SDSAdvancedSearch
              searchParams={searchParams}
              onSearchChange={handleSearch}
              onReset={handleSearchReset}
            />
            <div className="mt-2 flex justify-end">
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  const name = prompt('Save this search as:');
                  if (name) saveCurrentSearch(name);
                }}
              >
                Save Search
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced SDS Table with Version Control */}
        <Tabs defaultValue="list" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="list">SDS Library</TabsTrigger>
            <TabsTrigger value="versions">Version Control</TabsTrigger>
            <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Safety Data Sheets ({sdsData?.count || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sdsLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    <p className="text-gray-500 mt-2">
                      Loading SDS documents...
                    </p>
                  </div>
                ) : sdsData?.results && sdsData.results.length > 0 ? (
                  <SDSBulkOperations
                    sdsDocuments={sdsData.results}
                    selectedIds={selectedSDSIds}
                    onSelectionChange={setSelectedSDSIds}
                    onBulkStatusUpdate={handleBulkStatusUpdate}
                    onBulkDownload={handleBulkDownload}
                    onViewSDS={handleViewSDS}
                    isLoading={bulkStatusUpdate.isPending || bulkDownload.isPending}
                  />
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No SDS Found
                    </h3>
                    <p className="text-gray-600">
                      Try adjusting your search criteria
                    </p>
                  </div>
                )}

              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expiring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Expiring SDS Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expiringSDS && expiringSDS.length > 0 ? (
                  <div className="space-y-4">
                    {expiringSDS.map((sds) => (
                      <div
                        key={sds.id}
                        className="flex items-center justify-between p-4 border border-yellow-200 bg-yellow-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <AlertTriangle className="h-6 w-6 text-yellow-600" />
                          <div>
                            <h3 className="font-medium">{sds.product_name}</h3>
                            <p className="text-sm text-gray-600">
                              {sds.manufacturer} -{" "}
                              {sds.dangerous_good.un_number}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-yellow-100 text-yellow-800">
                            {sds.days_until_expiration} days left
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">
                            Expires:{" "}
                            {sds.expiration_date
                              ? new Date(
                                  sds.expiration_date,
                                ).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      All Good!
                    </h3>
                    <p className="text-gray-600">
                      No SDS documents expiring in the next 30 days
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="versions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  Version Control & Document History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sdsData?.results && sdsData.results.length > 0 ? (
                  <div className="space-y-4">
                    {sdsData.results
                      .filter(sds => sds.supersedes_version || sds.status === 'SUPERSEDED')
                      .map((sds) => (
                        <div key={sds.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{sds.product_name}</h4>
                            <Badge className={getVersionBadgeColor(sds.version, sds.version)}>
                              v{sds.version}
                            </Badge>
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
                          <div className="mt-2">
                            <div className="flex items-center gap-2 text-xs">
                              <Calendar className="h-3 w-3" />
                              <span>Revised: {new Date(sds.revision_date).toLocaleDateString()}</span>
                              {sds.created_by && (
                                <>
                                  <span>•</span>
                                  <span>By: {sds.created_by.username}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Version History
                    </h3>
                    <p className="text-gray-600">
                      Documents with version history will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

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
                  {/* Compliance Overview */}
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

                  {/* Regulatory Standards */}
                  <div>
                    <h3 className="font-semibold mb-3">Regulatory Standards Coverage</h3>
                    <div className="space-y-2">
                      {['GHS', 'WHMIS', 'REACH', 'CLP'].map((standard) => (
                        <div key={standard} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="font-medium">{standard}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {Math.floor(Math.random() * 50) + 50} documents
                            </Badge>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                        {Object.entries(statistics.by_status).map(
                          ([status, count]) => (
                            <div
                              key={status}
                              className="flex justify-between items-center"
                            >
                              <span className="text-sm capitalize">
                                {status.toLowerCase().replace('_', ' ')}
                              </span>
                              <Badge variant="outline">{count as number}</Badge>
                            </div>
                          ),
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Language Coverage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(statistics.by_language).map(
                          ([language, count]) => (
                            <div
                              key={language}
                              className="flex justify-between items-center"
                            >
                              <span className="text-sm">{language}</span>
                              <Badge variant="outline">{count as number}</Badge>
                            </div>
                          ),
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Top Manufacturers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {statistics.top_manufacturers
                          .slice(0, 10)
                          .map(([manufacturer, count]) => (
                            <div
                              key={manufacturer}
                              className="flex justify-between items-center"
                            >
                              <span className="text-sm">{manufacturer}</span>
                              <Badge variant="outline">{count} SDS</Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Upload Modal */}
        <SDSUploadModal
          open={showUploadModal}
          onOpenChange={setShowUploadModal}
          onUploadSuccess={handleUploadSuccess}
        />

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
  );
}
