"use client";

import React, { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  CheckSquare,
  Square,
  Trash2,
  Download,
  Edit,
  AlertTriangle,
  CheckCircle,
  X,
  FileDown,
  Eye,
} from "lucide-react";
import { type SafetyDataSheet } from "@/shared/hooks/useSDS";

interface SDSBulkOperationsProps {
  sdsDocuments: SafetyDataSheet[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onBulkStatusUpdate?: (sdsIds: string[], newStatus: string, reason: string) => void;
  onBulkDownload?: (sdsIds: string[]) => void;
  onViewSDS?: (sds: SafetyDataSheet) => void;
  isLoading?: boolean;
}

type BulkOperation = "status_update" | "download" | "delete" | null;

export default function SDSBulkOperations({
  sdsDocuments,
  selectedIds,
  onSelectionChange,
  onBulkStatusUpdate,
  onBulkDownload,
  onViewSDS,
  isLoading = false,
}: SDSBulkOperationsProps) {
  const [activeOperation, setActiveOperation] = useState<BulkOperation>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [updateReason, setUpdateReason] = useState<string>("");
  const [operationResult, setOperationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const allSelected = selectedIds.length === sdsDocuments.length && sdsDocuments.length > 0;
  const someSelected = selectedIds.length > 0;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(sdsDocuments.map(sds => sds.id));
    }
  };

  const handleSelectItem = (sdsId: string) => {
    if (selectedIds.includes(sdsId)) {
      onSelectionChange(selectedIds.filter(id => id !== sdsId));
    } else {
      onSelectionChange([...selectedIds, sdsId]);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!newStatus || !updateReason.trim()) {
      setOperationResult({
        success: false,
        message: "Please select a status and provide a reason for the update."
      });
      return;
    }

    try {
      if (onBulkStatusUpdate) {
        await onBulkStatusUpdate(selectedIds, newStatus, updateReason.trim());
        setOperationResult({
          success: true,
          message: `Successfully updated ${selectedIds.length} SDS document${selectedIds.length !== 1 ? 's' : ''}.`
        });
        setActiveOperation(null);
        setNewStatus("");
        setUpdateReason("");
        onSelectionChange([]);
      }
    } catch (error) {
      setOperationResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to update SDS documents"
      });
    }
  };

  const handleBulkDownload = () => {
    if (onBulkDownload) {
      onBulkDownload(selectedIds);
      setOperationResult({
        success: true,
        message: `Downloading ${selectedIds.length} SDS document${selectedIds.length !== 1 ? 's' : ''}...`
      });
    }
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

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "Active";
      case "EXPIRED":
        return "Expired";
      case "SUPERSEDED":
        return "Superseded";
      case "UNDER_REVIEW":
        return "Under Review";
      case "DRAFT":
        return "Draft";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Bulk Selection Header */}
      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4 text-blue-600" />
            ) : someSelected ? (
              <div className="h-4 w-4 border-2 border-gray-400 rounded bg-gray-200 flex items-center justify-center">
                <div className="h-2 w-2 bg-blue-600 rounded"></div>
              </div>
            ) : (
              <Square className="h-4 w-4 text-gray-400" />
            )}
            <span>
              {allSelected
                ? "Deselect All"
                : someSelected
                ? `${selectedIds.length} Selected`
                : "Select All"}
            </span>
          </button>

          {someSelected && (
            <Badge variant="secondary" className="ml-2">
              {selectedIds.length} of {sdsDocuments.length} selected
            </Badge>
          )}
        </div>

        {/* Bulk Actions */}
        {someSelected && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveOperation("download")}
              disabled={isLoading}
              className="flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              Download ({selectedIds.length})
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveOperation("status_update")}
              disabled={isLoading}
              className="flex items-center gap-1"
            >
              <Edit className="h-3 w-3" />
              Update Status
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectionChange([])}
              className="text-gray-500 hover:text-red-600"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Individual Item Selection */}
      <div className="space-y-2">
        {sdsDocuments.map((sds) => (
          <div
            key={sds.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              selectedIds.includes(sds.id)
                ? "bg-blue-50 border-blue-200"
                : "bg-white hover:bg-gray-50"
            }`}
          >
            <button
              onClick={() => handleSelectItem(sds.id)}
              className="flex-shrink-0"
            >
              {selectedIds.includes(sds.id) ? (
                <CheckSquare className="h-4 w-4 text-blue-600" />
              ) : (
                <Square className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900 truncate">
                  {sds.product_name}
                </h4>
                <Badge className={getStatusColor(sds.status)}>
                  {sds.status_display}
                </Badge>
                {sds.is_expired && (
                  <Badge className="bg-red-100 text-red-800">
                    Expired
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                <span>{sds.manufacturer}</span>
                <span>{sds.dangerous_good.un_number}</span>
                <span>Version {sds.version}</span>
                <span>{sds.language_display}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onViewSDS && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewSDS(sds);
                  }}
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bulk Download Confirmation */}
      <Dialog open={activeOperation === "download"} onOpenChange={() => setActiveOperation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5 text-blue-600" />
              Download SDS Documents
            </DialogTitle>
            <DialogDescription>
              You are about to download {selectedIds.length} SDS document{selectedIds.length !== 1 ? 's' : ''}. 
              The files will be downloaded individually to your device.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                Selected documents will be downloaded as separate PDF files. 
                Large downloads may take a moment to process.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setActiveOperation(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleBulkDownload();
                  setActiveOperation(null);
                }}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download {selectedIds.length} Files
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={activeOperation === "status_update"} onOpenChange={() => setActiveOperation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Update SDS Status
            </DialogTitle>
            <DialogDescription>
              Update the status of {selectedIds.length} selected SDS document{selectedIds.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_status">New Status</Label>
              <select
                id="new_status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select Status</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="SUPERSEDED">Superseded</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="update_reason">Reason for Update</Label>
              <Textarea
                id="update_reason"
                value={updateReason}
                onChange={(e) => setUpdateReason(e.target.value)}
                placeholder="Provide a reason for this status update..."
                rows={3}
              />
              <p className="text-xs text-gray-500">
                This reason will be logged for audit purposes.
              </p>
            </div>

            {operationResult && (
              <Alert className={operationResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {operationResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={operationResult.success ? "text-green-800" : "text-red-800"}>
                  {operationResult.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setActiveOperation(null);
                  setNewStatus("");
                  setUpdateReason("");
                  setOperationResult(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkStatusUpdate}
                disabled={isLoading || !newStatus || !updateReason.trim()}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Edit className="h-4 w-4" />
                )}
                Update Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Operation Result Alert */}
      {operationResult && activeOperation === null && (
        <Alert className={operationResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {operationResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={operationResult.success ? "text-green-800" : "text-red-800"}>
            {operationResult.message}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOperationResult(null)}
              className="ml-2 h-auto p-0 text-xs underline"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}