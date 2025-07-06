// app/sds-library/page.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  XCircle
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { 
  useSafetyDataSheets, 
  useSDSStatistics, 
  useExpiringSDS, 
  useSDSDownload,
  useSDSLookup,
  type SafetyDataSheet,
  type SDSSearchParams 
} from '@/hooks/useSDS';

export default function SDSLibraryPage() {
  const [searchParams, setSearchParams] = useState<SDSSearchParams>({});
  const [selectedSDS, setSelectedSDS] = useState<SafetyDataSheet | null>(null);
  
  const { data: sdsData, isLoading: sdsLoading, refetch: refetchSDS } = useSafetyDataSheets(searchParams);
  const { data: statistics } = useSDSStatistics();
  const { data: expiringSDS } = useExpiringSDS(30);
  const downloadSDS = useSDSDownload();
  const lookupSDS = useSDSLookup();

  const handleSearch = (newParams: Partial<SDSSearchParams>) => {
    setSearchParams(prev => ({ ...prev, ...newParams }));
  };

  const handleDownload = (sdsId: string, context: string = 'GENERAL') => {
    downloadSDS.mutate({ sdsId, context });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'EXPIRED': return 'bg-red-100 text-red-800';
      case 'SUPERSEDED': return 'bg-gray-100 text-gray-800';
      case 'UNDER_REVIEW': return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Safety Data Sheet Library</h1>
            <p className="text-gray-600 mt-1">Manage and access safety data sheets for dangerous goods</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => refetchSDS()}
              variant="outline"
              disabled={sdsLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${sdsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload SDS
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total SDS</CardTitle>
                <BookOpen className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{statistics.total_sds}</div>
                <p className="text-xs text-muted-foreground">
                  {statistics.active_sds} active documents
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
                <Calendar className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{statistics.expiring_soon}</div>
                <p className="text-xs text-muted-foreground">Within 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expired</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{statistics.expired_sds}</div>
                <p className="text-xs text-muted-foreground">Need updating</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Languages</CardTitle>
                <Globe className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(statistics.by_language).length}
                </div>
                <p className="text-xs text-muted-foreground">Available languages</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Expiring SDS Alert */}
        {expiringSDS && expiringSDS.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              You have {expiringSDS.length} SDS documents expiring within 30 days. 
              <Button variant="link" className="p-0 h-auto text-yellow-700 underline ml-1">
                View expiring documents
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Product name, manufacturer, UN number..."
                  value={searchParams.query || ''}
                  onChange={(e) => handleSearch({ query: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">UN Number</label>
                <Input
                  placeholder="e.g. UN1090"
                  value={searchParams.un_number || ''}
                  onChange={(e) => handleSearch({ un_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Manufacturer</label>
                <Input
                  placeholder="Manufacturer name"
                  value={searchParams.manufacturer || ''}
                  onChange={(e) => handleSearch({ manufacturer: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  value={searchParams.status || ''}
                  onChange={(e) => handleSearch({ status: e.target.value })}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="SUPERSEDED">Superseded</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Language</label>
                <select
                  value={searchParams.language || ''}
                  onChange={(e) => handleSearch({ language: e.target.value })}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Languages</option>
                  <option value="EN">English</option>
                  <option value="FR">French</option>
                  <option value="ES">Spanish</option>
                  <option value="DE">German</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Include Expired</label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={searchParams.include_expired || false}
                    onChange={(e) => handleSearch({ include_expired: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Show expired SDS</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SDS Table */}
        <Tabs defaultValue="list" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">SDS List</TabsTrigger>
            <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
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
                    <p className="text-gray-500 mt-2">Loading SDS documents...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sdsData?.results?.map((sds) => (
                      <div
                        key={sds.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-lg">{sds.product_name}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              <span className="flex items-center gap-1">
                                <Factory className="h-3 w-3" />
                                {sds.manufacturer}
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {sds.dangerous_good.un_number}
                              </span>
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {sds.language_display}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getStatusColor(sds.status)}>
                                {sds.status_display}
                              </Badge>
                              {sds.is_expired && (
                                <Badge className="bg-red-100 text-red-800">
                                  Expired
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              <p>Version {sds.version}</p>
                              <p>{new Date(sds.revision_date).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm text-gray-600 mb-1">
                              <p>{formatFileSize(sds.document.file_size)}</p>
                              {sds.expiration_date && (
                                <p className={sds.days_until_expiration < 30 ? 'text-yellow-600' : ''}>
                                  {sds.days_until_expiration < 0 ? 'Expired' : 
                                   `${sds.days_until_expiration} days left`}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedSDS(sds)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownload(sds.id)}
                              disabled={downloadSDS.isPending}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {sdsData?.results?.length === 0 && (
                      <div className="text-center py-8">
                        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No SDS Found</h3>
                        <p className="text-gray-600">Try adjusting your search criteria</p>
                      </div>
                    )}
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
                      <div key={sds.id} className="flex items-center justify-between p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <AlertTriangle className="h-6 w-6 text-yellow-600" />
                          <div>
                            <h3 className="font-medium">{sds.product_name}</h3>
                            <p className="text-sm text-gray-600">{sds.manufacturer} - {sds.dangerous_good.un_number}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-yellow-100 text-yellow-800">
                            {sds.days_until_expiration} days left
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">
                            Expires: {sds.expiration_date ? new Date(sds.expiration_date).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">All Good!</h3>
                    <p className="text-gray-600">No SDS documents expiring in the next 30 days</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {statistics && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>By Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(statistics.by_status).map(([status, count]) => (
                          <div key={status} className="flex justify-between items-center">
                            <span className="text-sm capitalize">{status.toLowerCase()}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>By Language</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(statistics.by_language).map(([language, count]) => (
                          <div key={language} className="flex justify-between items-center">
                            <span className="text-sm">{language}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Top Manufacturers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {statistics.top_manufacturers.slice(0, 10).map(([manufacturer, count]) => (
                          <div key={manufacturer} className="flex justify-between items-center">
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
      </div>
    </AuthGuard>
  );
}