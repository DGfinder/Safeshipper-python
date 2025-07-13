// components/epg/EPGBulkOperations.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckSquare, 
  Square, 
  Archive, 
  CheckCircle, 
  Download, 
  Copy, 
  Trash2,
  AlertTriangle,
  Settings,
  FileText
} from "lucide-react";
import { useArchiveEPG, useActivateEPG, type EmergencyProcedureGuide } from "@/hooks/useEPG";

interface EPGBulkOperationsProps {
  epgs: EmergencyProcedureGuide[];
  selectedEPGs: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onRefresh: () => void;
}

type BulkOperation = 
  | "activate" 
  | "archive" 
  | "export" 
  | "duplicate" 
  | "delete" 
  | "update_status" 
  | "update_country";

interface BulkOperationConfig {
  id: BulkOperation;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "default" | "destructive" | "outline";
  requiresConfirmation: boolean;
  allowedStatuses?: string[];
}

const bulkOperations: BulkOperationConfig[] = [
  {
    id: "activate",
    label: "Activate EPGs",
    description: "Set selected EPGs to active status",
    icon: CheckCircle,
    variant: "default",
    requiresConfirmation: true,
    allowedStatuses: ["DRAFT", "UNDER_REVIEW"]
  },
  {
    id: "archive",
    label: "Archive EPGs",
    description: "Archive selected EPGs",
    icon: Archive,
    variant: "outline",
    requiresConfirmation: true,
    allowedStatuses: ["ACTIVE", "DRAFT", "UNDER_REVIEW"]
  },
  {
    id: "export",
    label: "Export EPGs",
    description: "Download selected EPGs as PDF/JSON",
    icon: Download,
    variant: "outline",
    requiresConfirmation: false
  },
  {
    id: "duplicate",
    label: "Duplicate EPGs",
    description: "Create copies of selected EPGs",
    icon: Copy,
    variant: "outline",
    requiresConfirmation: true
  },
  {
    id: "delete",
    label: "Delete EPGs",
    description: "Permanently delete selected EPGs",
    icon: Trash2,
    variant: "destructive",
    requiresConfirmation: true,
    allowedStatuses: ["DRAFT"]
  }
];

export const EPGBulkOperations: React.FC<EPGBulkOperationsProps> = ({
  epgs,
  selectedEPGs,
  onSelectionChange,
  onRefresh,
}) => {
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null);
  const [exportFormat, setExportFormat] = useState<"pdf" | "json">("pdf");
  
  const archiveEPG = useArchiveEPG();
  const activateEPG = useActivateEPG();

  const selectedEPGData = epgs.filter(epg => selectedEPGs.includes(epg.id));
  const allSelected = epgs.length > 0 && selectedEPGs.length === epgs.length;
  const someSelected = selectedEPGs.length > 0 && selectedEPGs.length < epgs.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(epgs.map(epg => epg.id));
    }
  };

  const handleSelectEPG = (epgId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedEPGs, epgId]);
    } else {
      onSelectionChange(selectedEPGs.filter(id => id !== epgId));
    }
  };

  const getAvailableOperations = () => {
    if (selectedEPGData.length === 0) return [];
    
    return bulkOperations.filter(op => {
      if (!op.allowedStatuses) return true;
      return selectedEPGData.some(epg => op.allowedStatuses!.includes(epg.status));
    });
  };

  const executeBulkOperation = async (operation: BulkOperation) => {
    try {
      switch (operation) {
        case "activate":
          for (const epgId of selectedEPGs) {
            const epg = selectedEPGData.find(e => e.id === epgId);
            if (epg && ["DRAFT", "UNDER_REVIEW"].includes(epg.status)) {
              await activateEPG.mutateAsync(epgId);
            }
          }
          break;
          
        case "archive":
          for (const epgId of selectedEPGs) {
            const epg = selectedEPGData.find(e => e.id === epgId);
            if (epg && ["ACTIVE", "DRAFT", "UNDER_REVIEW"].includes(epg.status)) {
              await archiveEPG.mutateAsync(epgId);
            }
          }
          break;
          
        case "export":
          handleExport();
          break;
          
        case "duplicate":
          // Implementation would create copies
          console.log("Duplicating EPGs:", selectedEPGs);
          break;
          
        case "delete":
          // Implementation would delete EPGs
          console.log("Deleting EPGs:", selectedEPGs);
          break;
      }
      
      onRefresh();
      onSelectionChange([]);
      setShowBulkDialog(false);
    } catch (error) {
      console.error("Bulk operation failed:", error);
    }
  };

  const handleExport = () => {
    const exportData = selectedEPGData.map(epg => ({
      epg_number: epg.epg_number,
      title: epg.title,
      hazard_class: epg.hazard_class,
      status: epg.status,
      version: epg.version,
      effective_date: epg.effective_date,
      immediate_actions: epg.immediate_actions,
      personal_protection: epg.personal_protection,
      emergency_contacts: epg.emergency_contacts
    }));

    if (exportFormat === "json") {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: "application/json" 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `epg-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // PDF export would be implemented here
      console.log("PDF export not yet implemented");
    }
  };

  const confirmOperation = (operation: BulkOperation) => {
    setSelectedOperation(operation);
    setShowBulkDialog(true);
  };

  if (selectedEPGs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Bulk Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No EPGs Selected
            </h3>
            <p className="text-gray-600">
              Select one or more EPGs to perform bulk operations
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Bulk Operations
          </div>
          <Badge variant="secondary">
            {selectedEPGs.length} selected
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selection Controls */}
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              {allSelected ? "Deselect All" : someSelected ? "Select All" : "Select All"}
            </span>
          </div>
          
          <div className="text-sm text-gray-600">
            {selectedEPGs.length} of {epgs.length} EPGs selected
          </div>
          
          {selectedEPGs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectionChange([])}
            >
              Clear Selection
            </Button>
          )}
        </div>

        {/* Selected EPGs Summary */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Selected EPGs:</h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {selectedEPGData.map((epg) => (
              <div key={epg.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div>
                  <span className="font-medium">{epg.epg_number}</span>
                  <span className="text-gray-600 ml-2">{epg.title}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {epg.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Available Operations */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Available Operations:</h4>
          <div className="grid grid-cols-2 gap-2">
            {getAvailableOperations().map((operation) => {
              const IconComponent = operation.icon;
              return (
                <Button
                  key={operation.id}
                  variant={operation.variant}
                  size="sm"
                  onClick={() => {
                    if (operation.requiresConfirmation) {
                      confirmOperation(operation.id);
                    } else {
                      executeBulkOperation(operation.id);
                    }
                  }}
                  className="justify-start"
                >
                  <IconComponent className="h-4 w-4 mr-2" />
                  {operation.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Bulk Operation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedOperation && (
                <>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Are you sure you want to {bulkOperations.find(op => op.id === selectedOperation)?.label.toLowerCase()} {selectedEPGs.length} EPG(s)?
                    </AlertDescription>
                  </Alert>

                  {selectedOperation === "export" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Export Format:</label>
                      <Select value={exportFormat} onValueChange={(value: "pdf" | "json") => setExportFormat(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowBulkDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant={selectedOperation === "delete" ? "destructive" : "default"}
                      onClick={() => executeBulkOperation(selectedOperation)}
                    >
                      Confirm
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};