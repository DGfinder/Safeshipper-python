"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Separator } from "@/shared/components/ui/separator";
import { 
  AlertTriangle, 
  Shield, 
  FileText, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Eye,
  MapPin,
  Loader2,
  Package
} from "lucide-react";
import { 
  compatibilityService, 
  type CompatibilityResult, 
  type DangerousGood as CompatibilityDangerousGood 
} from "@/shared/services/compatibilityService";

interface DangerousGood {
  id: string;
  un: string;
  properShippingName: string;
  class: string;
  subHazard?: string;
  packingGroup?: string;
  quantity?: string;
  weight?: string;
  confidence: number;
  source: "automatic" | "manual";
  foundText?: string;
  matchedTerm?: string;
  pageNumber?: number;
  matchType?: string;
}

interface HighlightArea {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: 'green' | 'yellow' | 'orange';
  keyword?: string;
  id?: string;
}

interface SearchResult {
  keyword: string;
  matches: HighlightArea[];
  dangerousGoods: DangerousGood[];
}

interface ManifestSearchResultsProps {
  dangerousGoods: DangerousGood[];
  searchResults: SearchResult[];
  selectedItems: string[];
  onItemSelect: (selectedIds: string[]) => void;
  onNavigateToResult?: (resultIndex: number) => void;
  isLoading?: boolean;
}

// Get hazard class color
const getDGClassColor = (dgClass: string) => {
  const colors: { [key: string]: string } = {
    "1": "bg-orange-500",
    "1.1": "bg-orange-500", 
    "1.1D": "bg-orange-500",
    "2.1": "bg-red-500",
    "3": "bg-red-600",
    "4.1": "bg-yellow-500",
    "5.1": "bg-yellow-600",
    "6.1": "bg-purple-600",
    "8": "bg-gray-600",
  };
  
  // Check for exact match first, then prefix match
  return colors[dgClass] || colors[dgClass.split('.')[0]] || "bg-gray-400";
};

// Get confidence color
const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.9) return "text-green-600 bg-green-50";
  if (confidence >= 0.7) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
};

export function ManifestSearchResults({
  dangerousGoods,
  searchResults,
  selectedItems,
  onItemSelect,
  onNavigateToResult,
  isLoading
}: ManifestSearchResultsProps) {
  const [compatibilityResult, setCompatibilityResult] = useState<CompatibilityResult | null>(null);
  const [isCheckingCompatibility, setIsCheckingCompatibility] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'compatibility'>('results');

  // Handle item selection
  const handleItemToggle = (itemId: string, checked: boolean) => {
    const newSelection = checked 
      ? [...selectedItems, itemId]
      : selectedItems.filter(id => id !== itemId);
    onItemSelect(newSelection);
  };

  // Check compatibility when selection changes
  useEffect(() => {
    if (selectedItems.length > 1) {
      checkCompatibility();
    } else {
      setCompatibilityResult(null);
    }
  }, [selectedItems, dangerousGoods]);

  const checkCompatibility = async () => {
    setIsCheckingCompatibility(true);
    try {
      const selectedDG: CompatibilityDangerousGood[] = dangerousGoods
        .filter(item => selectedItems.includes(item.id))
        .map(item => ({
          id: item.id,
          un: item.un,
          class: item.class,
          subHazard: item.subHazard,
          packingGroup: item.packingGroup,
          properShippingName: item.properShippingName,
        }));

      if (selectedDG.length > 1) {
        const result = await compatibilityService.checkCompatibility(selectedDG);
        setCompatibilityResult(result);
      }
    } catch (error) {
      console.error("Compatibility check failed:", error);
    } finally {
      setIsCheckingCompatibility(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Analyzing manifest...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with tabs */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Analysis Results
          </h3>
          <Badge variant="outline" className="font-medium">
            {dangerousGoods.length} items
          </Badge>
        </div>

        {dangerousGoods.length > 0 && (
          <div className="flex gap-1 bg-gray-100 p-1 rounded-md">
            <button
              onClick={() => setActiveTab('results')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                activeTab === 'results' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="h-4 w-4 inline-block mr-1" />
              Items ({dangerousGoods.length})
            </button>
            <button
              onClick={() => setActiveTab('compatibility')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                activeTab === 'compatibility' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Shield className="h-4 w-4 inline-block mr-1" />
              Compatibility ({selectedItems.length})
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {dangerousGoods.length === 0 ? (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No dangerous goods detected</p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {activeTab === 'results' ? (
              /* Results Tab */
              <div className="p-4 space-y-3">
                {dangerousGoods.map((item, index) => (
                  <Card key={item.id} className="border border-gray-200 hover:border-gray-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) => handleItemToggle(item.id, checked as boolean)}
                          className="mt-1"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${getDGClassColor(item.class)}`}
                            >
                              <AlertTriangle className="h-4 w-4 text-white" />
                            </div>
                            <Badge variant="outline" className="font-semibold">
                              UN{item.un}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Class {item.class}
                            </Badge>
                          </div>

                          <h4 className="font-medium text-gray-900 mb-1 text-sm leading-tight">
                            {item.properShippingName}
                          </h4>

                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                            {item.packingGroup && (
                              <span>PG: {item.packingGroup}</span>
                            )}
                            {item.quantity && (
                              <span>Qty: {item.quantity}</span>
                            )}
                            {item.weight && (
                              <span>Weight: {item.weight}</span>
                            )}
                            {item.pageNumber && (
                              <span>Page: {item.pageNumber}</span>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(item.confidence)}`}>
                              {Math.round(item.confidence * 100)}% confidence
                            </div>

                            {item.pageNumber && onNavigateToResult && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => onNavigateToResult(index)}
                              >
                                <MapPin className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            )}
                          </div>

                          {item.foundText && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                              <span className="text-gray-500">Found text: </span>
                              <span className="font-medium">{item.foundText}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* Compatibility Tab */
              <div className="p-4">
                {selectedItems.length < 2 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 text-sm">
                      Select 2 or more items to check compatibility
                    </p>
                  </div>
                ) : isCheckingCompatibility ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
                    <p className="text-gray-600 text-sm">Checking compatibility...</p>
                  </div>
                ) : compatibilityResult ? (
                  <Card className={`border ${
                    compatibilityResult.compatible 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        {compatibilityResult.compatible ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        <CardTitle className={`text-base ${
                          compatibilityResult.compatible ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {compatibilityResult.compatible 
                            ? 'Compatible for Transport' 
                            : 'Compatibility Issues Found'
                          }
                        </CardTitle>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      {compatibilityResult.issues.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-red-800 mb-2">
                            Incompatible Combinations:
                          </h4>
                          <div className="space-y-2">
                            {compatibilityResult.issues.map((issue, index) => (
                              <div key={index} className="text-sm p-2 bg-red-100 rounded border border-red-200">
                                <div className="font-medium text-red-900">
                                  {issue.item1} ↔ {issue.item2}
                                </div>
                                <div className="text-xs text-red-700 mt-1">
                                  Code: {issue.segregationCode} | {issue.explanation}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {compatibilityResult.warnings.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-amber-800 mb-2">
                            Warnings:
                          </h4>
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
                        <div>
                          <h4 className="text-sm font-medium text-blue-800 mb-2">
                            Recommendations:
                          </h4>
                          <ul className="list-disc list-inside space-y-1">
                            {compatibilityResult.recommendations.map((rec, index) => (
                              <li key={index} className="text-sm text-blue-700">
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {dangerousGoods.length > 0 && (
        <div className="border-t p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={selectedItems.length === 0}
              className="flex-1"
              onClick={() => {
                const selectedDG = dangerousGoods.filter(item => selectedItems.includes(item.id));
                const csvContent = [
                  ['UN', 'Proper Shipping Name', 'Class', 'Packing Group', 'Quantity', 'Weight', 'Confidence'],
                  ...selectedDG.map(item => [
                    item.un,
                    item.properShippingName,
                    item.class,
                    item.packingGroup || '',
                    item.quantity || '',
                    item.weight || '',
                    `${Math.round(item.confidence * 100)}%`
                  ])
                ].map(row => row.join(',')).join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dangerous_goods_export_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              Export Selected ({selectedItems.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedItems.length < 2}
              onClick={checkCompatibility}
            >
              <Shield className="h-4 w-4 mr-1" />
              Check
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}