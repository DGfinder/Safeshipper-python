"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  FileText,
  Download,
  Shield,
  Package,
  Archive,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import {
  useGenerateShipmentReport,
  useGenerateComplianceCertificate,
  useGenerateDGManifest,
  useGenerateBatchDocuments,
} from "@/shared/hooks/useShipments";
import { usePermissions } from "@/contexts/PermissionContext";
// Toast notifications - replace with your preferred toast library

interface DocumentGeneratorProps {
  shipmentId: string;
  shipment: {
    items?: Array<{ is_dangerous_good: boolean }>;
    status: string;
  };
  className?: string;
}

interface DocumentType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  requiresDG: boolean;
  requiredPermission: string;
  statusRequirement?: string[];
}

const documentTypes: DocumentType[] = [
  {
    id: "shipment_report",
    name: "Shipment Report",
    description: "Comprehensive shipment details and history",
    icon: FileText,
    requiresDG: false,
    requiredPermission: "documents.generate.shipment_report",
  },
  {
    id: "compliance_certificate",
    name: "Compliance Certificate",
    description: "DG compliance certification document",
    icon: Shield,
    requiresDG: true,
    requiredPermission: "documents.generate.compliance_certificate",
  },
  {
    id: "dg_manifest",
    name: "DG Manifest",
    description: "Dangerous goods transport manifest",
    icon: Package,
    requiresDG: true,
    requiredPermission: "documents.generate.dg_manifest",
  },
];

const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({
  shipmentId,
  shipment,
  className = "",
}) => {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [includeAuditTrail, setIncludeAuditTrail] = useState(true);

  // Permission and document generation hooks
  const { can, canGenerateDocuments } = usePermissions();
  const generateReport = useGenerateShipmentReport();
  const generateCertificate = useGenerateComplianceCertificate();
  const generateManifest = useGenerateDGManifest();
  const generateBatch = useGenerateBatchDocuments();

  // Check if shipment has dangerous goods
  const hasDangerousGoods =
    shipment.items?.some((item) => item.is_dangerous_good) || false;

  // Early return if user has no document generation permissions
  if (!canGenerateDocuments) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">
            You don't have permission to generate documents for this shipment.
          </p>
        </CardContent>
      </Card>
    );
  }

  const canAccessDocument = (docType: DocumentType) => {
    // Check if dangerous goods are required but not present
    if (docType.requiresDG && !hasDangerousGoods) return false;
    
    // Check if user has the required permission
    return can(docType.requiredPermission as any);
  };

  const handleSingleDocumentGeneration = async (documentType: string) => {
    try {
      switch (documentType) {
        case "shipment_report":
          await generateReport.mutateAsync({
            shipmentId,
            includeAudit: includeAuditTrail,
          });
          console.log("Shipment report generated successfully");
          break;
        case "compliance_certificate":
          await generateCertificate.mutateAsync(shipmentId);
          console.log("Compliance certificate generated successfully");
          break;
        case "dg_manifest":
          await generateManifest.mutateAsync(shipmentId);
          console.log("DG manifest generated successfully");
          break;
        default:
          throw new Error("Unknown document type");
      }
    } catch (error: any) {
      console.error("Failed to generate document:", error.message || error);
    }
  };

  const handleBatchGeneration = async () => {
    if (selectedDocuments.length === 0) {
      console.error("Please select at least one document type");
      return;
    }

    try {
      await generateBatch.mutateAsync({
        shipmentId,
        documentTypes: selectedDocuments,
      });
      console.log(
        `Generated ${selectedDocuments.length} documents successfully`,
      );
      setSelectedDocuments([]);
    } catch (error: any) {
      console.error(
        "Failed to generate batch documents:",
        error.message || error,
      );
    }
  };

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId],
    );
  };

  const isLoading =
    generateReport.isPending ||
    generateCertificate.isPending ||
    generateManifest.isPending ||
    generateBatch.isPending;

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Generate Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document Status Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {hasDangerousGoods ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
            <span className="text-gray-600">
              {hasDangerousGoods
                ? "DG documents available"
                : "No dangerous goods"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-blue-500" />
            <span className="text-gray-600">Shipment Status: </span>
            <Badge variant="outline">{shipment.status}</Badge>
          </div>
        </div>

        {/* Individual Document Generation */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">
            Individual Documents
          </h4>

          {documentTypes.map((docType) => {
            const IconComponent = docType.icon;
            const canAccess = canAccessDocument(docType);

            return (
              <div key={docType.id} className="space-y-2">
                <div className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50">
                  <div className="mt-0.5">
                    <IconComponent className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium text-gray-900">
                      {docType.name}
                    </h5>
                    <p className="text-xs text-gray-500 mb-2">
                      {docType.description}
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleSingleDocumentGeneration(docType.id)
                        }
                        disabled={!canAccess || isLoading}
                        className="text-xs"
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Download className="h-3 w-3 mr-1" />
                        )}
                        Generate
                      </Button>

                      {canAccess && (
                        <label className="flex items-center gap-1 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={selectedDocuments.includes(docType.id)}
                            onChange={() => toggleDocumentSelection(docType.id)}
                            className="rounded"
                          />
                          Include in batch
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {!canAccess && (
                  <p className="text-xs text-red-500 ml-7">
                    {docType.requiresDG && !hasDangerousGoods
                      ? "Requires dangerous goods"
                      : "Insufficient permissions"}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Shipment Report Options */}
        {documentTypes.find((d) => d.id === "shipment_report") &&
          canAccessDocument(
            documentTypes.find((d) => d.id === "shipment_report")!,
          ) && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">
                Report Options
              </h4>
              {can("documents.audit.trail") && (
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={includeAuditTrail}
                    onChange={(e) => setIncludeAuditTrail(e.target.checked)}
                    className="rounded"
                  />
                  Include audit trail in shipment report
                </label>
              )}
            </div>
          )}

        {/* Batch Generation */}
        {selectedDocuments.length > 0 && can("documents.generate.batch") && (
          <div className="pt-4 border-t">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">
                  Batch Generation
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {selectedDocuments.length} selected
                </Badge>
              </div>

              <Button
                onClick={handleBatchGeneration}
                disabled={isLoading}
                className="w-full"
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Archive className="h-4 w-4 mr-2" />
                )}
                Generate All as ZIP
              </Button>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="pt-4 border-t">
          <p className="text-xs text-gray-500">
            Documents will be automatically downloaded when generated. ZIP files
            contain multiple documents for easy sharing.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentGenerator;
