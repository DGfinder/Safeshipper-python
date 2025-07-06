// components/manifests/CompatibilityErrorDialog.tsx
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Shield, 
  X,
  ExternalLink
} from 'lucide-react';

interface CompatibilityConflict {
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  regulation_reference?: string;
  items_involved?: string[];
  recommendation?: string;
}

interface CompatibilityResult {
  is_compatible: boolean;
  conflicts: CompatibilityConflict[];
  safety_analysis?: {
    risk_level: string;
    mitigation_options: string[];
  };
}

interface CompatibilityErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  compatibilityResult: CompatibilityResult;
  confirmedItems: Array<{
    un_number: string;
    description: string;
  }>;
  onEditSelection: () => void;
}

export function CompatibilityErrorDialog({
  isOpen,
  onClose,
  compatibilityResult,
  confirmedItems,
  onEditSelection
}: CompatibilityErrorDialogProps) {
  const { conflicts, safety_analysis } = compatibilityResult;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'MEDIUM':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Shield className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Dangerous Goods Compatibility Issue
          </DialogTitle>
          <DialogDescription>
            The selected dangerous goods cannot be transported together due to safety regulations.
            Please review the conflicts below and modify your selection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Items Summary */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Selected Items</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {confirmedItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-md"
                >
                  <Badge variant="outline" className="text-xs font-mono">
                    {item.un_number}
                  </Badge>
                  <span className="text-sm text-gray-700 truncate">
                    {item.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Compatibility Conflicts */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Compatibility Conflicts ({conflicts.length})
            </h3>
            <div className="space-y-3">
              {conflicts.map((conflict, index) => (
                <Alert key={index} className="border-l-4 border-l-red-500">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(conflict.severity)}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={getSeverityColor(conflict.severity)}
                          variant="outline"
                        >
                          {conflict.severity} RISK
                        </Badge>
                        {conflict.regulation_reference && (
                          <Badge variant="outline" className="text-xs">
                            {conflict.regulation_reference}
                          </Badge>
                        )}
                      </div>
                      
                      <AlertDescription className="text-gray-800">
                        {conflict.description}
                      </AlertDescription>

                      {conflict.items_involved && conflict.items_involved.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">
                            Items involved:
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {conflict.items_involved.map((item, i) => (
                              <Badge 
                                key={i} 
                                variant="outline" 
                                className="text-xs bg-red-50 border-red-200"
                              >
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {conflict.recommendation && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                          <span className="text-sm font-medium text-blue-800">
                            Recommendation:
                          </span>
                          <p className="text-sm text-blue-700 mt-1">
                            {conflict.recommendation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </div>

          {/* Safety Analysis */}
          {safety_analysis && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Safety Analysis</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Risk Level:</span>
                  <Badge 
                    className={getSeverityColor(safety_analysis.risk_level)}
                    variant="outline"
                  >
                    {safety_analysis.risk_level}
                  </Badge>
                </div>

                {safety_analysis.mitigation_options && safety_analysis.mitigation_options.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-700 mb-2 block">
                      Possible Mitigation Options:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      {safety_analysis.mitigation_options.map((option, index) => (
                        <li key={index}>{option}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Regulatory Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Regulatory Information</h4>
            <p className="text-sm text-gray-600 mb-3">
              These compatibility checks are based on international dangerous goods regulations 
              including IATA DGR, IMDG Code, and ADR/ADN requirements.
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://www.iata.org/en/cargo/dgr/', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View IATA DGR Guidelines
            </Button>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            ⚠️ Transportation of incompatible dangerous goods may violate safety regulations
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={onEditSelection} className="bg-blue-600 hover:bg-blue-700">
              Edit Selection
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}