// components/inspections/HazardInspection.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Input } from "@/shared/components/ui/input";
import {
  CheckCircle,
  XCircle,
  Camera,
  FileText,
  AlertTriangle,
  Clock,
  User,
  Package,
  Truck,
  Shield,
  Eye,
  Plus,
  Loader2,
} from "lucide-react";
import {
  useMockInspections,
  useMockCreateInspection,
} from "@/shared/hooks/useMockAPI";

interface HazardInspectionProps {
  shipmentId: string;
  inspectionType?: string;
  className?: string;
}

interface InspectionItem {
  id: string;
  description: string;
  category: string;
  is_mandatory: boolean;
  result?: "PASS" | "FAIL" | "N/A";
  notes?: string;
  photos?: string[];
}

// Standard inspection checklist items
const INSPECTION_CHECKLISTS = {
  PRE_TRIP: [
    {
      id: "1",
      description: "Check vehicle for fluid leaks (oil, fuel, coolant)",
      category: "VEHICLE",
      is_mandatory: true,
    },
    {
      id: "2",
      description: "Verify dangerous goods placarding is correct and visible",
      category: "PLACARDING",
      is_mandatory: true,
    },
    {
      id: "3",
      description: "Inspect load securing and restraint systems",
      category: "CARGO",
      is_mandatory: true,
    },
    {
      id: "4",
      description: "Check fire extinguisher is present and accessible",
      category: "SAFETY",
      is_mandatory: true,
    },
    {
      id: "5",
      description: "Verify emergency response documentation is available",
      category: "DOCUMENTATION",
      is_mandatory: true,
    },
    {
      id: "6",
      description: "Check tire condition and pressure",
      category: "VEHICLE",
      is_mandatory: true,
    },
    {
      id: "7",
      description:
        "Inspect lighting systems (headlights, taillights, hazard lights)",
      category: "VEHICLE",
      is_mandatory: true,
    },
    {
      id: "8",
      description: "Verify spill kit is complete and accessible",
      category: "SAFETY",
      is_mandatory: true,
    },
  ],
  POST_TRIP: [
    {
      id: "1",
      description: "Check for any new fluid leaks after trip",
      category: "VEHICLE",
      is_mandatory: true,
    },
    {
      id: "2",
      description: "Inspect cargo area for damage or contamination",
      category: "CARGO",
      is_mandatory: true,
    },
    {
      id: "3",
      description: "Verify all dangerous goods have been properly unloaded",
      category: "CARGO",
      is_mandatory: true,
    },
    {
      id: "4",
      description: "Check that placarding has been removed if required",
      category: "PLACARDING",
      is_mandatory: true,
    },
    {
      id: "5",
      description: "Document any incidents or issues during transport",
      category: "DOCUMENTATION",
      is_mandatory: true,
    },
  ],
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "VEHICLE":
      return <Truck className="h-4 w-4" />;
    case "CARGO":
      return <Package className="h-4 w-4" />;
    case "SAFETY":
      return <Shield className="h-4 w-4" />;
    case "PLACARDING":
      return <FileText className="h-4 w-4" />;
    case "DOCUMENTATION":
      return <FileText className="h-4 w-4" />;
    default:
      return <CheckCircle className="h-4 w-4" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "VEHICLE":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "CARGO":
      return "bg-green-100 text-green-800 border-green-200";
    case "SAFETY":
      return "bg-red-100 text-red-800 border-red-200";
    case "PLACARDING":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "DOCUMENTATION":
      return "bg-purple-100 text-purple-800 border-purple-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export function HazardInspection({
  shipmentId,
  inspectionType = "PRE_TRIP",
  className,
}: HazardInspectionProps) {
  const [selectedItems, setSelectedItems] = useState<{
    [key: string]: InspectionItem;
  }>({});
  const [isStarted, setIsStarted] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [notes, setNotes] = useState("");

  const { data: existingInspections, isLoading } =
    useMockInspections(shipmentId);
  const createInspectionMutation = useMockCreateInspection();

  const checklist =
    INSPECTION_CHECKLISTS[
      inspectionType as keyof typeof INSPECTION_CHECKLISTS
    ] || [];
  const currentItem = checklist[currentItemIndex];
  const isLastItem = currentItemIndex === checklist.length - 1;

  // Check if there's already a completed inspection of this type
  const existingInspection = existingInspections?.find(
    (inspection: any) => inspection.inspection_type === inspectionType,
  );

  const handleStartInspection = () => {
    setIsStarted(true);
    // Initialize all items in selectedItems
    const initialItems: { [key: string]: InspectionItem } = {};
    checklist.forEach((item) => {
      initialItems[item.id] = { ...item };
    });
    setSelectedItems(initialItems);
  };

  const handleItemResult = (result: "PASS" | "FAIL" | "N/A") => {
    if (!currentItem) return;

    setSelectedItems((prev) => ({
      ...prev,
      [currentItem.id]: {
        ...prev[currentItem.id],
        result,
        notes: notes,
      },
    }));

    setNotes("");

    if (isLastItem) {
      // Complete inspection
      handleCompleteInspection();
    } else {
      setCurrentItemIndex((prev) => prev + 1);
    }
  };

  const handleCompleteInspection = async () => {
    const items = Object.values(selectedItems).map((item) => ({
      description: item.description,
      category: item.category,
      is_mandatory: item.is_mandatory,
      result: item.result,
      notes: item.notes || "",
      photos: item.photos || [],
    }));

    try {
      await createInspectionMutation.mutateAsync({
        shipmentId,
        inspectionType,
        items,
      });

      // Reset state
      setIsStarted(false);
      setCurrentItemIndex(0);
      setSelectedItems({});
    } catch (error) {
      console.error("Failed to complete inspection:", error);
    }
  };

  const handlePreviousItem = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex((prev) => prev - 1);
      setNotes(selectedItems[checklist[currentItemIndex - 1]?.id]?.notes || "");
    }
  };

  const getCompletionPercentage = () => {
    if (!isStarted) return 0;
    return Math.round((currentItemIndex / checklist.length) * 100);
  };

  const getOverallResult = () => {
    const items = Object.values(selectedItems);
    const completedItems = items.filter((item) => item.result);
    const failedItems = completedItems.filter((item) => item.result === "FAIL");

    if (completedItems.length === 0) return null;
    return failedItems.length === 0 ? "PASS" : "FAIL";
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center">
          <Loader2 className="h-6 w-6 mx-auto mb-2 text-gray-400 animate-spin" />
          <p className="text-gray-500 text-sm">Loading inspections...</p>
        </CardContent>
      </Card>
    );
  }

  if (existingInspection && !isStarted) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {inspectionType.replace("_", " ")} Inspection Complete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              This inspection was completed on{" "}
              {new Date(existingInspection.timestamp).toLocaleString()}.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p>
                <span className="font-medium">Inspector:</span>{" "}
                {existingInspection.inspector.name}
              </p>
              <p>
                <span className="font-medium">Items Checked:</span>{" "}
                {existingInspection.items.length}
              </p>
            </div>
            <div>
              <p>
                <span className="font-medium">Status:</span>{" "}
                {existingInspection.status}
              </p>
              <p>
                <span className="font-medium">Photos:</span>{" "}
                {existingInspection.items.reduce(
                  (sum: number, item: any) => sum + item.photos.length,
                  0,
                )}
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" className="w-full">
            <Eye className="h-4 w-4 mr-2" />
            View Inspection Details
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isStarted) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {inspectionType.replace("_", " ")} Hazard Inspection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6">
            <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>

            <h3 className="text-lg font-semibold mb-2">
              Ready to Start {inspectionType.replace("_", " ")} Inspection
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Complete the mandatory safety checklist for shipment {shipmentId}
            </p>

            <div className="space-y-2 text-sm text-gray-500 mb-6">
              <p>✓ {checklist.length} inspection points to verify</p>
              <p>✓ Photo documentation required for failed items</p>
              <p>
                ✓ Estimated completion time: {Math.ceil(checklist.length * 1.5)}{" "}
                minutes
              </p>
            </div>

            <Button
              onClick={handleStartInspection}
              size="lg"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Start Inspection
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {inspectionType.replace("_", " ")} Inspection
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {currentItemIndex + 1} of {checklist.length}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getCompletionPercentage()}%` }}
          ></div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {currentItem && (
          <>
            {/* Current Item */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={`p-2 rounded-full ${getCategoryColor(currentItem.category)}`}
                >
                  {getCategoryIcon(currentItem.category)}
                </div>
                <div className="flex-1">
                  <Badge
                    variant="outline"
                    className={`text-xs mb-2 ${getCategoryColor(currentItem.category)}`}
                  >
                    {currentItem.category}
                  </Badge>
                  <h4 className="font-medium text-gray-900 mb-2">
                    {currentItem.description}
                  </h4>
                  {currentItem.is_mandatory && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-red-50 text-red-700 border-red-200"
                    >
                      Mandatory
                    </Badge>
                  )}
                </div>
              </div>

              {/* Notes Input */}
              <div className="mb-4">
                <Input
                  placeholder="Add notes or observations (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => handleItemResult("PASS")}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Pass
                </Button>
                <Button
                  onClick={() => handleItemResult("FAIL")}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Fail
                </Button>
                <Button
                  onClick={() => handleItemResult("N/A")}
                  variant="outline"
                  size="sm"
                >
                  N/A
                </Button>
              </div>

              {/* Photo Button */}
              <Button variant="outline" size="sm" className="w-full mt-3">
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                onClick={handlePreviousItem}
                variant="outline"
                size="sm"
                disabled={currentItemIndex === 0}
              >
                Previous
              </Button>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{getCompletionPercentage()}% complete</span>
              </div>
            </div>
          </>
        )}

        {/* Completion Summary */}
        {createInspectionMutation.isPending && (
          <Alert className="border-blue-200 bg-blue-50">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <AlertDescription className="text-blue-800">
              Completing inspection and uploading data...
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
