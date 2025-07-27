// components/customer/shipment-documents.tsx
// Component for displaying documents related to a specific shipment

"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { LoadingSpinner } from "@/shared/components/ui/loading-spinner";
import {
  useCustomerDocumentsByShipment,
  useDownloadCustomerDocument,
} from "@/shared/hooks/useCustomerDocuments";
import {
  FileText,
  Download,
  Eye,
  Beaker,
  Award,
  ClipboardCheck,
  Package,
  Receipt,
  FileCheck,
  ExternalLink,
  AlertTriangle,
  Shield,
  Info
} from "lucide-react";
import { toast } from "react-hot-toast";

interface ShipmentDocumentsProps {
  shipmentId: string;
  shipmentTrackingNumber?: string;
  className?: string;
}

export function ShipmentDocuments({ 
  shipmentId, 
  shipmentTrackingNumber,
  className = "" 
}: ShipmentDocumentsProps) {
  const { data: documents, isLoading, error } = useCustomerDocumentsByShipment(shipmentId);
  const downloadMutation = useDownloadCustomerDocument();

  const handleDownload = async (documentId: string, fileName: string) => {
    try {
      await downloadMutation.mutateAsync(documentId);
      toast.success(`Downloaded ${fileName}`);
    } catch (error) {
      toast.error("Failed to download document");
    }
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
        return <Package className="h-5 w-5 text-purple-600" />;
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

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-gray-600">Loading shipment documents...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load shipment documents. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const safetyDocuments = documents.filter(doc => doc.category === "safety");
  const complianceDocuments = documents.filter(doc => doc.category === "compliance");
  const operationalDocuments = documents.filter(doc => doc.category === "operational");
  const financialDocuments = documents.filter(doc => doc.category === "financial");

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Shipment Documents
            {shipmentTrackingNumber && (
              <span className="text-sm font-normal text-gray-600">
                - {shipmentTrackingNumber}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{safetyDocuments.length}</div>
              <div className="text-sm text-gray-600">Safety</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{complianceDocuments.length}</div>
              <div className="text-sm text-gray-600">Compliance</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{operationalDocuments.length}</div>
              <div className="text-sm text-gray-600">Operational</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{financialDocuments.length}</div>
              <div className="text-sm text-gray-600">Financial</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safety Documents */}
      {safetyDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-600" />
              Safety Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {safetyDocuments.map((document) => (
                <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 rounded">
                      {getDocumentIcon(document.type)}
                    </div>
                    <div>
                      <div className="font-medium">{document.title}</div>
                      <div className="text-sm text-gray-600">{document.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(document.status)}>
                          {document.status}
                        </Badge>
                        {document.metadata.unNumber && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            UN{document.metadata.unNumber}
                          </Badge>
                        )}
                        {document.metadata.hazardClass && (
                          <Badge variant="outline">
                            Class {document.metadata.hazardClass}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {document.fileSize} • Uploaded {formatDate(document.uploadDate)}
                        {document.expiryDate && (
                          <span> • Expires {formatDate(document.expiryDate)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Documents */}
      {complianceDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-600" />
              Compliance Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {complianceDocuments.map((document) => (
                <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded">
                      {getDocumentIcon(document.type)}
                    </div>
                    <div>
                      <div className="font-medium">{document.title}</div>
                      <div className="text-sm text-gray-600">{document.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(document.status)}>
                          {document.status}
                        </Badge>
                        {document.metadata.certificateType && (
                          <Badge variant="outline">
                            {document.metadata.certificateType.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {document.fileSize} • Uploaded {formatDate(document.uploadDate)}
                        {document.expiryDate && (
                          <span> • Expires {formatDate(document.expiryDate)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operational Documents */}
      {operationalDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Operational Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {operationalDocuments.map((document) => (
                <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded">
                      {getDocumentIcon(document.type)}
                    </div>
                    <div>
                      <div className="font-medium">{document.title}</div>
                      <div className="text-sm text-gray-600">{document.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(document.status)}>
                          {document.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {document.fileSize} • Uploaded {formatDate(document.uploadDate)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Documents Message */}
      {documents.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Available</h3>
            <p className="text-gray-600">
              Documents for this shipment will appear here once they are uploaded and processed.
            </p>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <Info className="h-4 w-4 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-blue-800">
                Safety data sheets, compliance certificates, and other documents are typically available 
                within 24 hours of shipment creation.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}