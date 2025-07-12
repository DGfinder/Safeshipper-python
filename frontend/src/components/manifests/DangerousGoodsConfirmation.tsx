// components/manifests/DangerousGoodsConfirmation.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  AlertTriangle,
  Package,
  Edit,
  Trash2,
  Eye,
  Target,
} from "lucide-react";
import {
  type ManifestValidationResult,
  type DangerousGoodConfirmation,
  type DangerousGoodMatch,
} from "@/hooks/useManifests";

interface DangerousGoodsConfirmationProps {
  validationResults: ManifestValidationResult;
  onConfirmation: (confirmed: DangerousGoodConfirmation[]) => void;
  confirmedDGs: DangerousGoodConfirmation[];
}

export function DangerousGoodsConfirmation({
  validationResults,
  onConfirmation,
  confirmedDGs,
}: DangerousGoodsConfirmationProps) {
  const [localConfirmed, setLocalConfirmed] = useState<
    DangerousGoodConfirmation[]
  >([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<
    Partial<DangerousGoodConfirmation>
  >({});

  // Initialize with existing confirmed DGs or convert from validation results
  useEffect(() => {
    if (confirmedDGs.length > 0) {
      setLocalConfirmed(confirmedDGs);
    } else {
      // Convert potential DGs to confirmation format
      const initialConfirmed = validationResults.potential_dangerous_goods.map(
        (dg) => ({
          un_number: dg.un_number,
          description: dg.proper_shipping_name,
          quantity: dg.quantity || 1,
          weight_kg: dg.weight_kg || 0,
          found_text: dg.found_text,
          confidence_score: dg.confidence_score,
          page_number: dg.page_number,
          matched_term: dg.matched_term,
        }),
      );
      setLocalConfirmed(initialConfirmed);
    }
  }, [validationResults, confirmedDGs]);

  // Update parent when local state changes
  useEffect(() => {
    onConfirmation(localConfirmed);
  }, [localConfirmed, onConfirmation]);

  const getHazardClassColor = (hazardClass: string) => {
    const classNum = hazardClass.split(".")[0];
    const colors: { [key: string]: string } = {
      "1": "bg-orange-100 text-orange-800 border-orange-200",
      "2": "bg-green-100 text-green-800 border-green-200",
      "3": "bg-red-100 text-red-800 border-red-200",
      "4": "bg-yellow-100 text-yellow-800 border-yellow-200",
      "5": "bg-blue-100 text-blue-800 border-blue-200",
      "6": "bg-purple-100 text-purple-800 border-purple-200",
      "7": "bg-pink-100 text-pink-800 border-pink-200",
      "8": "bg-gray-100 text-gray-800 border-gray-200",
      "9": "bg-indigo-100 text-indigo-800 border-indigo-200",
    };
    return colors[classNum] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return "text-green-600";
    if (score >= 0.7) return "text-yellow-600";
    return "text-red-600";
  };

  const handleStartEdit = (dg: DangerousGoodConfirmation) => {
    setEditingId(dg.un_number);
    setEditValues(dg);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editValues.un_number) return;

    setLocalConfirmed((prev) =>
      prev.map((dg) =>
        dg.un_number === editingId
          ? ({ ...dg, ...editValues } as DangerousGoodConfirmation)
          : dg,
      ),
    );
    setEditingId(null);
    setEditValues({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleRemove = (unNumber: string) => {
    setLocalConfirmed((prev) => prev.filter((dg) => dg.un_number !== unNumber));
  };

  const findOriginalMatch = (
    unNumber: string,
  ): DangerousGoodMatch | undefined => {
    return validationResults.potential_dangerous_goods.find(
      (dg) => dg.un_number === unNumber,
    );
  };

  if (validationResults.potential_dangerous_goods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            No Dangerous Goods Found
          </CardTitle>
          <CardDescription>
            The manifest analysis did not identify any dangerous goods that
            require special handling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              This shipment can proceed with standard processing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Confirm Dangerous Goods
        </CardTitle>
        <CardDescription>
          Review and confirm the dangerous goods identified in your manifest.
          Adjust quantities and weights as needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {localConfirmed.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No dangerous goods confirmed yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {localConfirmed.map((confirmedDG) => {
              const originalMatch = findOriginalMatch(confirmedDG.un_number);
              const isEditing = editingId === confirmedDG.un_number;

              return (
                <div
                  key={confirmedDG.un_number}
                  className="border rounded-lg p-4 bg-blue-50 border-blue-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-blue-600">
                        {confirmedDG.un_number}
                      </span>
                      {originalMatch && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${getHazardClassColor(originalMatch.hazard_class)}`}
                        >
                          Class {originalMatch.hazard_class}
                        </Badge>
                      )}
                      {originalMatch?.confidence_score && (
                        <span
                          className={`text-xs ${getConfidenceColor(originalMatch.confidence_score)}`}
                        >
                          {Math.round(originalMatch.confidence_score * 100)}%
                          match
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!isEditing && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(confirmedDG)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(confirmedDG.un_number)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <Input
                          value={editValues.description || ""}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Enter description"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={editValues.quantity || ""}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                quantity: parseInt(e.target.value) || 1,
                              }))
                            }
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Weight (kg)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            value={editValues.weight_kg || ""}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                weight_kg: parseFloat(e.target.value) || 0,
                              }))
                            }
                            placeholder="0.0"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={handleSaveEdit}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-900">
                        {confirmedDG.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Quantity: {confirmedDG.quantity}</span>
                        <span>Weight: {confirmedDG.weight_kg} kg</span>
                        {originalMatch?.packing_group && (
                          <span>PG: {originalMatch.packing_group}</span>
                        )}
                      </div>
                      {confirmedDG.found_text && (
                        <div className="mt-2 space-y-2">
                          {/* Matched term information */}
                          {originalMatch?.matched_term && (
                            <div className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                              <div className="flex items-center gap-2 mb-1">
                                <Target className="h-3 w-3 text-green-600" />
                                <span className="font-medium text-green-800">
                                  Matched term:
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-green-100 text-green-800 border-green-300"
                                >
                                  {originalMatch.match_type.replace("_", " ")}
                                </Badge>
                              </div>
                              <p className="font-mono text-green-700 bg-green-100 px-2 py-1 rounded">
                                &ldquo;{originalMatch.matched_term}&rdquo;
                              </p>
                            </div>
                          )}

                          {/* Found text context */}
                          <div className="p-2 bg-gray-100 rounded text-xs text-gray-600">
                            <div className="flex items-center gap-2 mb-1">
                              <Eye className="h-3 w-3" />
                              <span className="font-medium">
                                Found in manifest:
                              </span>
                            </div>
                            <p className="italic">
                              &ldquo;{confirmedDG.found_text}&rdquo;
                            </p>
                            {confirmedDG.page_number && (
                              <p className="text-xs text-gray-500 mt-1">
                                Page {confirmedDG.page_number}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {localConfirmed.length > 0 && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Important:</strong> Please verify that all quantities and
              weights are accurate. These will be used to create the official
              dangerous goods transport documentation.
            </AlertDescription>
          </Alert>
        )}

        <div className="border-t pt-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Dangerous goods to confirm: {localConfirmed.length}</span>
            <span>
              Total weight:{" "}
              {localConfirmed
                .reduce((sum, dg) => sum + dg.weight_kg, 0)
                .toFixed(2)}{" "}
              kg
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
