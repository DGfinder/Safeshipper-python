"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { ResponsiveTable, type TableColumn, type TableAction } from "@/shared/components/ui/responsive-table";
import { ManifestMobileCard } from "@/shared/components/ui/mobile-cards";
import {
  AlertTriangle,
  Download,
  FileText,
  CheckCircle,
  Shield,
  AlertCircle,
  Eye,
  Edit,
} from "lucide-react";
import {
  compatibilityService,
  type CompatibilityResult,
  type DangerousGood,
} from "@/services/compatibilityService";
import {
  documentService,
  type DocumentRequest,
} from "@/services/documentService";

interface ManifestItem {
  id: string;
  un: string;
  properShippingName: string;
  class: string;
  subHazard?: string;
  packingGroup: string;
  typeOfContainer: string;
  quantity: string;
  weight: string;
  skipped?: boolean;
}

interface ManifestTableProps {
  items: ManifestItem[];
  onCompare?: () => void;
  onGenerateFile?: () => void;
  onItemSelect?: (selectedIds: string[]) => void;
}

const getDGClassColor = (dgClass: string) => {
  const colors: { [key: string]: string } = {
    "1.1D": "bg-orange-500",
    "5.1": "bg-yellow-600",
    "3": "bg-red-600",
    "4.1": "bg-yellow-500",
    "6.1": "bg-purple-600",
    "8": "bg-gray-600",
  };
  return colors[dgClass] || "bg-gray-400";
};

export default function ManifestTable({
  items,
  onCompare,
  onGenerateFile,
  onItemSelect,
}: ManifestTableProps) {
  const [selectedItems, setSelectedItems] = useState<ManifestItem[]>([]);
  const [compatibilityResult, setCompatibilityResult] =
    useState<CompatibilityResult | null>(null);
  const [isCheckingCompatibility, setIsCheckingCompatibility] = useState(false);
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const [showDocumentOptions, setShowDocumentOptions] = useState(false);

  const handleSelectionChange = (selectedItems: ManifestItem[]) => {
    setSelectedItems(selectedItems);
    onItemSelect?.(selectedItems.map(item => item.id));

    // Check compatibility when selection changes
    if (selectedItems.length > 1) {
      checkCompatibility(selectedItems.map(item => item.id));
    } else {
      setCompatibilityResult(null);
    }
  };

  const checkCompatibility = async (selectedIds: string[]) => {
    setIsCheckingCompatibility(true);
    try {
      const selectedDG: DangerousGood[] = items
        .filter((item) => selectedIds.includes(item.id) && !item.skipped)
        .map((item) => ({
          id: item.id,
          un: item.un,
          class: item.class,
          subHazard: item.subHazard,
          packingGroup: item.packingGroup,
          properShippingName: item.properShippingName,
        }));

      if (selectedDG.length > 1) {
        const result =
          await compatibilityService.checkCompatibility(selectedDG);
        setCompatibilityResult(result);
      }
    } catch (error) {
      console.error("Compatibility check failed:", error);
    } finally {
      setIsCheckingCompatibility(false);
    }
  };

  const handleCompare = () => {
    if (selectedItems.length > 1) {
      checkCompatibility(selectedItems.map(item => item.id));
    }
    onCompare?.();
  };

  const handleGenerateFile = async (
    documentType:
      | "DG_TRANSPORT"
      | "SDS_COLLECTION"
      | "EPG_PACKAGE"
      | "COMPLETE_PACKAGE" = "COMPLETE_PACKAGE",
  ) => {
    if (selectedItems.length === 0) return;

    setIsGeneratingDocs(true);
    try {
      const selectedDG = items
        .filter((item) => selectedItems.some(selected => selected.id === item.id) && !item.skipped)
        .map((item) => ({
          id: item.id,
          un: item.un,
          class: item.class,
          properShippingName: item.properShippingName,
          quantity: item.quantity,
          weight: item.weight,
        }));

      const request: DocumentRequest = {
        type: documentType,
        dangerousGoods: selectedDG,
        shipmentDetails: {
          origin: "Origin Port", // These would come from shipment details
          destination: "Destination Port",
          transportMode: "Sea",
        },
      };

      const validation = documentService.validateDocumentRequest(request);
      if (!validation.valid) {
        alert(`Document generation failed:\n${validation.errors.join("\n")}`);
        return;
      }

      let result;
      switch (documentType) {
        case "DG_TRANSPORT":
          result = await documentService.generateDGTransportDocument(request);
          break;
        case "SDS_COLLECTION":
          const sdsDocuments =
            await documentService.collectSDSDocuments(selectedDG);
          console.log("SDS Documents collected:", sdsDocuments);
          alert(`Collected ${sdsDocuments.length} SDS documents`);
          return;
        case "EPG_PACKAGE":
          const epgDocuments =
            await documentService.collectEPGDocuments(selectedDG);
          console.log("EPG Documents collected:", epgDocuments);
          alert(`Collected ${epgDocuments.length} EPG documents`);
          return;
        default:
          result = await documentService.generateCompletePackage(request);
      }

      if (result.success && result.downloadUrl) {
        await documentService.downloadDocument(
          result.downloadUrl,
          result.fileName || "document.pdf",
        );
        alert("Document generated and downloaded successfully!");
      } else {
        alert(`Document generation failed: ${result.error}`);
      }

      onGenerateFile?.();
    } catch (error) {
      console.error("Document generation failed:", error);
      alert("Document generation failed. Please try again.");
    } finally {
      setIsGeneratingDocs(false);
      setShowDocumentOptions(false);
    }
  };

  // Define table columns
  const columns: TableColumn<ManifestItem>[] = [
    {
      key: 'index',
      label: '#',
      width: 'w-12',
      priority: 'high',
      render: (item) => items.indexOf(item) + 1,
      mobileRender: () => null, // Hide index on mobile
    },
    {
      key: 'un',
      label: 'UN',
      priority: 'high',
      render: (item) => (
        <Badge variant="outline" className="font-semibold">
          {item.un}
        </Badge>
      ),
    },
    {
      key: 'properShippingName',
      label: 'PROPER SHIPPING NAME',
      priority: 'high',
      render: (item) => (
        <span className="text-sm font-medium">{item.properShippingName}</span>
      ),
    },
    {
      key: 'class',
      label: 'CLASS',
      priority: 'high',
      render: (item) => (
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${getDGClassColor(item.class)}`}
          >
            <AlertTriangle className="h-5 w-5 text-white" />
          </span>
          <span className="text-sm font-semibold">{item.class}</span>
        </div>
      ),
    },
    {
      key: 'subHazard',
      label: 'SUB HAZARD',
      priority: 'low',
      render: (item) => <span className="text-sm">{item.subHazard || '-'}</span>,
    },
    {
      key: 'packingGroup',
      label: 'PACKING GROUP',
      priority: 'medium',
      render: (item) => <span className="text-sm">{item.packingGroup}</span>,
    },
    {
      key: 'typeOfContainer',
      label: 'TYPE OF CONTAINER',
      priority: 'low',
      render: (item) => <span className="text-sm">{item.typeOfContainer}</span>,
    },
    {
      key: 'quantity',
      label: 'QUANTITY',
      priority: 'medium',
      render: (item) => <span className="text-sm">{item.quantity}</span>,
    },
    {
      key: 'weight',
      label: 'WEIGHT',
      priority: 'medium',
      render: (item) => <span className="text-sm">{item.weight}</span>,
    },
  ];

  // Define table actions
  const actions: TableAction<ManifestItem>[] = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: (item) => {
        console.log('View details for:', item);
      },
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (item) => {
        console.log('Edit:', item);
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dangerous Goods Transport</h2>
          <p className="text-gray-600 mt-1">
            Results checked: {items.filter((i) => !i.skipped).length} of{" "}
            {items.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleCompare}
            disabled={selectedItems.length < 2 || isCheckingCompatibility}
          >
            {isCheckingCompatibility ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Checking...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-1" />
                Compare ({selectedItems.length})
              </>
            )}
          </Button>
          <div className="relative">
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowDocumentOptions(!showDocumentOptions)}
              disabled={selectedItems.length === 0 || isGeneratingDocs}
            >
              {isGeneratingDocs ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-1" />
                  Generate Documents
                </>
              )}
            </Button>

            {showDocumentOptions && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-10">
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 mb-3">
                    Select Document Type
                  </h3>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left h-auto p-3"
                      onClick={() => handleGenerateFile("COMPLETE_PACKAGE")}
                    >
                      <div>
                        <div className="font-medium">Complete Package</div>
                        <div className="text-xs text-gray-500">
                          All documents (DG Transport + SDS + EPG)
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left h-auto p-3"
                      onClick={() => handleGenerateFile("DG_TRANSPORT")}
                    >
                      <div>
                        <div className="font-medium">DG Transport Document</div>
                        <div className="text-xs text-gray-500">
                          Official dangerous goods declaration
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left h-auto p-3"
                      onClick={() => handleGenerateFile("SDS_COLLECTION")}
                    >
                      <div>
                        <div className="font-medium">Safety Data Sheets</div>
                        <div className="text-xs text-gray-500">
                          Chemical safety information
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left h-auto p-3"
                      onClick={() => handleGenerateFile("EPG_PACKAGE")}
                    >
                      <div>
                        <div className="font-medium">Emergency Procedures</div>
                        <div className="text-xs text-gray-500">
                          Emergency response guides
                        </div>
                      </div>
                    </Button>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDocumentOptions(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Responsive Table */}
      <ResponsiveTable
        data={items}
        columns={columns}
        actions={actions}
        selectable={true}
        onSelectionChange={handleSelectionChange}
        keyField="id"
        mobileCardComponent={ManifestMobileCard}
        emptyMessage="No dangerous goods items found"
      />

      {/* Compatibility Results */}
      {compatibilityResult && (
        <div
          className={`border rounded-lg p-4 ${compatibilityResult.compatible ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
        >
          <div className="flex items-start gap-3">
            {compatibilityResult.compatible ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p
                className={`font-medium ${compatibilityResult.compatible ? "text-green-900" : "text-red-900"}`}
              >
                {compatibilityResult.compatible
                  ? "Compatible for Transport"
                  : "Compatibility Issues Found"}
              </p>

              {compatibilityResult.issues.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-red-800 mb-2">
                    Incompatible Combinations:
                  </p>
                  <ul className="space-y-1">
                    {compatibilityResult.issues.map((issue, index) => (
                      <li
                        key={index}
                        className="text-sm text-red-700 bg-red-100 rounded p-2"
                      >
                        <strong>{issue.item1}</strong> ↔{" "}
                        <strong>{issue.item2}</strong>
                        <br />
                        <span className="text-xs">
                          Code: {issue.segregationCode} | {issue.explanation}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {compatibilityResult.warnings.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-amber-800 mb-1">
                    Warnings:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {compatibilityResult.warnings.map((warning, index) => (
                      <li key={index} className="text-sm text-amber-700">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {compatibilityResult.recommendations.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-blue-800 mb-1">
                    Recommendations:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {compatibilityResult.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-blue-700">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Skipped Items Notice */}
      {items.some((item) => item.skipped) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-900">Some items were skipped</p>
            <p className="text-sm text-blue-800 mt-1">
              {items.filter((i) => i.skipped).length} items were skipped during
              processing and require manual review.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
