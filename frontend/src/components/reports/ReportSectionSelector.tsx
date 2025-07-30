/**
 * Report Section Selector Component
 * Allows users to customize which sections to include in consolidated reports
 */
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { Separator } from '@/shared/components/ui/separator';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import {
  FileText,
  Shield,
  Truck,
  AlertTriangle,
  BookOpen,
  ClipboardCheck,
  Info,
  CheckCircle,
  X,
  Settings
} from 'lucide-react';

interface ReportSection {
  key: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  required: boolean;
  default: boolean;
  category: 'core' | 'compliance' | 'safety';
}

interface ReportSectionSelectorProps {
  selectedSections: Record<string, boolean>;
  onSectionsChange: (sections: Record<string, boolean>) => void;
  disabled?: boolean;
  showSelectAll?: boolean;
  className?: string;
}

const REPORT_SECTIONS: ReportSection[] = [
  {
    key: 'shipment_report',
    name: 'Shipment Report',
    description: 'Detailed shipment information and summary',
    icon: FileText,
    required: false,
    default: true,
    category: 'core'
  },
  {
    key: 'manifest',
    name: 'Dangerous Goods Manifest',
    description: 'Official dangerous goods manifest and declarations',
    icon: ClipboardCheck,
    required: false,
    default: true,
    category: 'compliance'
  },
  {
    key: 'compliance_certificate',
    name: 'Compliance Certificate',
    description: 'Transport compliance certification and approvals',
    icon: Shield,
    required: false,
    default: true,
    category: 'compliance'
  },
  {
    key: 'compatibility_report',
    name: 'Compatibility Analysis',
    description: 'Dangerous goods compatibility and segregation analysis',
    icon: AlertTriangle,
    required: false,
    default: true,
    category: 'safety'
  },
  {
    key: 'sds_documents',
    name: 'Safety Data Sheets',
    description: 'Safety information and handling instructions for dangerous goods',
    icon: BookOpen,
    required: false,
    default: true,
    category: 'safety'
  },
  {
    key: 'emergency_procedures',
    name: 'Emergency Procedures',
    description: 'Emergency response procedures and contact information',
    icon: Truck,
    required: false,
    default: true,
    category: 'safety'
  }
];

const CATEGORY_COLORS = {
  core: 'bg-blue-50 border-blue-200 text-blue-800',
  compliance: 'bg-green-50 border-green-200 text-green-800',
  safety: 'bg-orange-50 border-orange-200 text-orange-800'
};

const CATEGORY_NAMES = {
  core: 'Core Information',
  compliance: 'Compliance & Legal',
  safety: 'Safety & Emergency'
};

export const ReportSectionSelector: React.FC<ReportSectionSelectorProps> = ({
  selectedSections,
  onSectionsChange,
  disabled = false,
  showSelectAll = true,
  className = ''
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['core', 'compliance', 'safety'])
  );

  const selectedCount = Object.values(selectedSections).filter(Boolean).length;
  const totalSections = REPORT_SECTIONS.length;
  const allSelected = selectedCount === totalSections;
  const noneSelected = selectedCount === 0;

  const handleSectionToggle = (sectionKey: string) => {
    if (disabled) return;
    
    onSectionsChange({
      ...selectedSections,
      [sectionKey]: !selectedSections[sectionKey]
    });
  };

  const handleSelectAll = () => {
    if (disabled) return;
    
    const allSections = REPORT_SECTIONS.reduce((acc, section) => {
      acc[section.key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    
    onSectionsChange(allSections);
  };

  const handleSelectNone = () => {
    if (disabled) return;
    
    const noSections = REPORT_SECTIONS.reduce((acc, section) => {
      acc[section.key] = false;
      return acc;
    }, {} as Record<string, boolean>);
    
    onSectionsChange(noSections);
  };

  const handleSelectDefaults = () => {
    if (disabled) return;
    
    const defaultSections = REPORT_SECTIONS.reduce((acc, section) => {
      acc[section.key] = section.default;
      return acc;
    }, {} as Record<string, boolean>);
    
    onSectionsChange(defaultSections);
  };

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const groupedSections = REPORT_SECTIONS.reduce((acc, section) => {
    if (!acc[section.category]) {
      acc[section.category] = [];
    }
    acc[section.category].push(section);
    return acc;
  }, {} as Record<string, ReportSection[]>);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            <CardTitle>Report Sections</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Badge variant="outline">
              {selectedCount} of {totalSections} selected
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Selection Controls */}
        {showSelectAll && (
          <div className="flex items-center gap-2 pb-4 border-b">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={disabled || allSelected}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectNone}
              disabled={disabled || noneSelected}
            >
              <X className="h-4 w-4 mr-1" />
              Select None
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectDefaults}
              disabled={disabled}
            >
              <Settings className="h-4 w-4 mr-1" />
              Defaults
            </Button>
          </div>
        )}

        {/* Warning for no sections selected */}
        {noneSelected && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              At least one section must be selected to generate a report.
            </AlertDescription>
          </Alert>
        )}

        {/* Section Categories */}
        <div className="space-y-4">
          {Object.entries(groupedSections).map(([category, sections]) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]}
                  >
                    {CATEGORY_NAMES[category as keyof typeof CATEGORY_NAMES]}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    ({sections.filter(s => selectedSections[s.key]).length}/{sections.length})
                  </span>
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleCategoryExpansion(category)}
                  className="text-xs"
                >
                  {expandedCategories.has(category) ? 'Collapse' : 'Expand'}
                </Button>
              </div>

              {expandedCategories.has(category) && (
                <div className="space-y-3 pl-4 border-l-2 border-gray-100">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    const isSelected = selectedSections[section.key];
                    
                    return (
                      <div
                        key={section.key}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                        onClick={() => handleSectionToggle(section.key)}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={disabled}
                          className="mt-1"
                        />
                        <Icon className={`h-5 w-5 mt-0.5 ${
                          isSelected ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Label className="font-medium text-gray-900 cursor-pointer">
                              {section.name}
                            </Label>
                            {section.default && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {section.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Info className="h-4 w-4" />
            <span>
              Report will include {selectedCount} section{selectedCount !== 1 ? 's' : ''}.
              {selectedCount === 0 && ' Select at least one section to continue.'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportSectionSelector;