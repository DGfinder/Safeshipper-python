"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { CustomerAuthGuard } from "@/shared/components/auth/customer-auth-guard";
import { MobileNavWrapper } from "@/shared/components/layout/mobile-bottom-nav";
import { LoadingSpinner } from "@/shared/components/ui/loading-spinner";
import { DemoIndicator } from "@/shared/components/ui/demo-indicator";
import { getEnvironmentConfig } from "@/shared/config/environment";
import {
  useCustomerDocuments,
  useDownloadCustomerDocument,
  useDocumentCategories,
  useDocumentTypes,
  type DocumentSearchFilters
} from "@/shared/hooks/useCustomerDocuments";
import { useCustomerProfile, useCustomerAccess } from "@/shared/hooks/useCustomerProfile";
import {
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  Truck,
  Building2,
  Award,
  Info,
  ExternalLink,
  Archive,
  Star,
  BookOpen,
  Beaker,
  ClipboardCheck,
  FileCheck,
  Receipt
} from "lucide-react";
import { toast } from "react-hot-toast";

function CustomerDocumentsContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<DocumentSearchFilters>({});
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const { data: customerAccess } = useCustomerAccess();
  const { data: customerProfile } = useCustomerProfile(customerAccess?.customerId || "");
  const { data: documents, isLoading, refetch } = useCustomerDocuments(filters);
  const downloadMutation = useDownloadCustomerDocument();
  const documentCategories = useDocumentCategories();
  const documentTypes = useDocumentTypes();
  const config = getEnvironmentConfig();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // In a real app, you'd debounce this and update filters
  };

  const handleDownload = async (documentId: string, fileName: string) => {
    try {
      await downloadMutation.mutateAsync(documentId);
      toast.success(`Downloaded ${fileName}`);
    } catch (error) {
      toast.error("Failed to download document");
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Documents refreshed");
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "sds":
        return <Beaker className="h-5 w-5 text-orange-600" />;
      case "compliance_certificate":
        return <Award className="h-5 w-5 text-green-600" />;
      case "inspection_report":
        return <ClipboardCheck className="h-5 w-5 text-blue-600" />;
      case "manifest":
        return <FileText className="h-5 w-5 text-purple-600" />;
      case "invoice":
        return <Receipt className="h-5 w-5 text-yellow-600" />;
      case "pod":
        return <FileCheck className="h-5 w-5 text-green-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "expired":
        return "bg-red-100 text-red-800";
      case "restricted":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "safety":
        return "bg-orange-100 text-orange-800";
      case "compliance":
        return "bg-green-100 text-green-800";
      case "operational":
        return "bg-blue-100 text-blue-800";
      case "financial":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredDocuments = documents?.filter((doc) => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
    const matchesType = selectedType === "all" || doc.type === selectedType;
    const matchesStatus = selectedStatus === "all" || doc.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesType && matchesStatus;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-background">
      {/* Header */}
      <div className="bg-surface-card border-b border-surface-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-surface-foreground">Documents & Certificates</h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Access your safety documents, compliance certificates, and shipment records
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Demo Indicator */}
        {(config.apiMode === "demo" || config.enableTerryMode) && (
          <div className="mb-6">
            <DemoIndicator type="demo" label="Customer Portal Demo" />
          </div>
        )}

        {/* Customer Profile Summary */}
        {customerProfile && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Building2 className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{customerProfile.name}</h2>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        {customerProfile.tier} Tier
                      </span>
                      <span>•</span>
                      <span>{customerProfile.category}</span>
                      <span>•</span>
                      <span>{documents?.length || 0} Documents Available</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Account ID</div>
                  <div className="font-medium">{customerProfile.id}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Documents</p>
                  <p className="text-3xl font-bold text-blue-600">{documents?.length || 0}</p>
                </div>
                <Archive className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Safety Documents</p>
                  <p className="text-3xl font-bold text-orange-600">{documentCategories.safety || 0}</p>
                </div>
                <Shield className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Compliance Certs</p>
                  <p className="text-3xl font-bold text-green-600">{documentCategories.compliance || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Recent</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {documents?.filter(d => {
                      const docDate = new Date(d.uploadDate);
                      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                      return docDate > weekAgo;
                    }).length || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Document Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sds">SDS</SelectItem>
                  <SelectItem value="compliance_certificate">Certificates</SelectItem>
                  <SelectItem value="inspection_report">Inspections</SelectItem>
                  <SelectItem value="manifest">Manifests</SelectItem>
                  <SelectItem value="pod">Proof of Delivery</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Document Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All Documents</TabsTrigger>
            <TabsTrigger value="safety">Safety</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="operational">Operational</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {filteredDocuments.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredDocuments.map((document) => (
                  <Card key={document.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            {getDocumentIcon(document.type)}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-lg">{document.title}</h3>
                              <Badge className={getStatusColor(document.status)}>
                                {document.status}
                              </Badge>
                              <Badge className={getCategoryColor(document.category)}>
                                {document.category}
                              </Badge>
                              {document.metadata.unNumber && (
                                <Badge variant="outline" className="text-orange-600 border-orange-600">
                                  UN{document.metadata.unNumber}
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-gray-600 mb-3">{document.description}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">File:</span> {document.fileName}
                              </div>
                              <div>
                                <span className="font-medium">Size:</span> {document.fileSize}
                              </div>
                              <div>
                                <span className="font-medium">Uploaded:</span> {formatDate(document.uploadDate)}
                              </div>
                              {document.shipmentId && (
                                <div>
                                  <span className="font-medium">Shipment:</span> {document.shipmentId}
                                </div>
                              )}
                              {document.expiryDate && (
                                <div>
                                  <span className="font-medium">Expires:</span> {formatDate(document.expiryDate)}
                                </div>
                              )}
                              {document.metadata.regulatory && (
                                <div>
                                  <span className="font-medium">Regulatory:</span> {document.metadata.regulatory.join(", ")}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {document.previewUrl && (
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownload(document.id, document.fileName)}
                            disabled={downloadMutation.isPending || document.status !== "available"}
                          >
                            {downloadMutation.isPending ? (
                              <LoadingSpinner className="h-4 w-4 mr-1" />
                            ) : (
                              <Download className="h-4 w-4 mr-1" />
                            )}
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Found</h3>
                  <p className="text-gray-600">
                    {searchQuery || selectedCategory !== "all" || selectedType !== "all" || selectedStatus !== "all"
                      ? "Try adjusting your search filters to find documents."
                      : "Documents will appear here as they become available for your shipments."}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Category-specific tabs */}
          {["safety", "compliance", "operational", "financial"].map((category) => (
            <TabsContent key={category} value={category} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {filteredDocuments
                  .filter((doc) => doc.category === category)
                  .map((document) => (
                    <Card key={document.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="p-3 bg-gray-50 rounded-lg">
                              {getDocumentIcon(document.type)}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-semibold text-lg">{document.title}</h3>
                                <Badge className={getStatusColor(document.status)}>
                                  {document.status}
                                </Badge>
                                {document.metadata.unNumber && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                                    UN{document.metadata.unNumber}
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-gray-600 mb-3">{document.description}</p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">File:</span> {document.fileName}
                                </div>
                                <div>
                                  <span className="font-medium">Uploaded:</span> {formatDate(document.uploadDate)}
                                </div>
                                {document.shipmentId && (
                                  <div>
                                    <span className="font-medium">Shipment:</span> {document.shipmentId}
                                  </div>
                                )}
                                {document.expiryDate && (
                                  <div>
                                    <span className="font-medium">Expires:</span> {formatDate(document.expiryDate)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {document.previewUrl && (
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownload(document.id, document.fileName)}
                              disabled={downloadMutation.isPending || document.status !== "available"}
                            >
                              {downloadMutation.isPending ? (
                                <LoadingSpinner className="h-4 w-4 mr-1" />
                              ) : (
                                <Download className="h-4 w-4 mr-1" />
                              )}
                              Download
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

export default function CustomerDocumentsPage() {
  return (
    <CustomerAuthGuard>
      <MobileNavWrapper>
        <CustomerDocumentsContent />
      </MobileNavWrapper>
    </CustomerAuthGuard>
  );
}