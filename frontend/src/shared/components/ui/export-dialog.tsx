'use client';

import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { useAccessibility } from '@/shared/services/AccessibilityContext';
import { exportAnalyticsData, type ExportFormat } from '@/shared/utils/export';
import { cn } from '@/lib/utils';
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  Settings,
  Clock,
  Filter,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface ExportDialogProps {
  children?: React.ReactNode;
  timeRange: string;
  onExportComplete?: (success: boolean, message: string) => void;
}

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  format: ExportFormat;
  recommended?: boolean;
}

const exportOptions: ExportOption[] = [
  {
    id: 'excel',
    label: 'Excel Spreadsheet',
    description: 'Multiple sheets with all data and calculations',
    icon: FileSpreadsheet,
    format: 'excel',
    recommended: true,
  },
  {
    id: 'pdf',
    label: 'PDF Report',
    description: 'Formatted report with charts and tables',
    icon: FileText,
    format: 'pdf',
  },
  {
    id: 'csv',
    label: 'CSV Files',
    description: 'Separate CSV files for each dataset',
    icon: FileText,
    format: 'csv',
  },
  {
    id: 'json',
    label: 'JSON Data',
    description: 'Raw data in JSON format for developers',
    icon: FileText,
    format: 'json',
  },
];

interface ChartSelection {
  id: string;
  label: string;
  description: string;
  dataPoints: number;
  enabled: boolean;
}

const availableCharts: ChartSelection[] = [
  {
    id: 'shipments',
    label: 'Shipment Trends',
    description: 'Monthly shipment volumes and dangerous goods data',
    dataPoints: 12,
    enabled: true,
  },
  {
    id: 'fleet',
    label: 'Fleet Utilization',
    description: 'Daily fleet utilization and maintenance data',
    dataPoints: 30,
    enabled: true,
  },
  {
    id: 'compliance',
    label: 'Compliance Scores',
    description: 'Current and target compliance scores',
    dataPoints: 6,
    enabled: true,
  },
  {
    id: 'incidents',
    label: 'Incident Distribution',
    description: 'Types and frequency of incidents',
    dataPoints: 5,
    enabled: false,
  },
  {
    id: 'routes',
    label: 'Route Performance',
    description: 'On-time delivery by route',
    dataPoints: 5,
    enabled: false,
  },
];

export function ExportDialog({ children, timeRange, onExportComplete }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel');
  const [selectedCharts, setSelectedCharts] = useState<string[]>(['shipments', 'fleet', 'compliance']);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ success: boolean; message: string } | null>(null);

  const { preferences } = useAccessibility();

  const handleChartToggle = (chartId: string, checked: boolean) => {
    setSelectedCharts(prev => 
      checked 
        ? [...prev, chartId]
        : prev.filter(id => id !== chartId)
    );
  };

  const handleExport = async () => {
    if (selectedCharts.length === 0) {
      setExportStatus({ success: false, message: 'Please select at least one chart to export' });
      return;
    }

    setIsExporting(true);
    setExportStatus(null);

    try {
      const result = await exportAnalyticsData(timeRange, selectedCharts, selectedFormat);
      setExportStatus(result);
      
      if (result.success) {
        onExportComplete?.(true, result.message);
        // Close dialog after successful export
        setTimeout(() => setOpen(false), 1500);
      } else {
        onExportComplete?.(false, result.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      setExportStatus({ success: false, message });
      onExportComplete?.(false, message);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedOption = exportOptions.find(opt => opt.format === selectedFormat);
  const totalDataPoints = selectedCharts.reduce((sum, chartId) => {
    const chart = availableCharts.find(c => c.id === chartId);
    return sum + (chart?.dataPoints || 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Analytics Data
          </DialogTitle>
          <DialogDescription>
            Export your analytics data in various formats. Choose the charts and format that best suit your needs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <RadioGroup value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as ExportFormat)}>
              <div className="grid grid-cols-1 gap-3">
                {exportOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <div key={option.id} className="flex items-center space-x-3">
                      <RadioGroupItem value={option.format} id={option.id} />
                      <Label 
                        htmlFor={option.id} 
                        className="flex items-center gap-3 cursor-pointer flex-1 p-3 rounded-lg border hover:bg-gray-50"
                      >
                        <Icon className="h-5 w-5 text-gray-600" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{option.label}</span>
                            {option.recommended && (
                              <Badge variant="secondary" className="text-xs">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Chart Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Charts to Export</Label>
            <div className="space-y-2">
              {availableCharts.map((chart) => (
                <div key={chart.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={chart.id}
                    checked={selectedCharts.includes(chart.id)}
                    onCheckedChange={(checked) => handleChartToggle(chart.id, checked as boolean)}
                    disabled={!chart.enabled}
                  />
                  <Label 
                    htmlFor={chart.id} 
                    className={cn(
                      "flex-1 cursor-pointer p-2 rounded border",
                      chart.enabled ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{chart.label}</div>
                        <div className="text-sm text-gray-600">{chart.description}</div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {chart.dataPoints} data points
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metadata"
                  checked={includeMetadata}
                  onCheckedChange={(checked) => setIncludeMetadata(checked === true)}
                />
                <Label htmlFor="metadata" className="text-sm">
                  Include metadata (generation time, filters, etc.)
                </Label>
              </div>
            </div>
          </div>

          {/* Export Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Settings className="h-4 w-4 text-gray-600" />
              <span className="font-medium">Export Summary</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Format:</span>
                <span className="font-medium">{selectedOption?.label}</span>
              </div>
              <div className="flex justify-between">
                <span>Charts:</span>
                <span className="font-medium">{selectedCharts.length} selected</span>
              </div>
              <div className="flex justify-between">
                <span>Data Points:</span>
                <span className="font-medium">{totalDataPoints} total</span>
              </div>
              <div className="flex justify-between">
                <span>Time Range:</span>
                <span className="font-medium">{timeRange}</span>
              </div>
            </div>
          </div>

          {/* Export Status */}
          {exportStatus && (
            <div className={cn(
              "flex items-center gap-2 p-3 rounded-lg text-sm",
              exportStatus.success 
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            )}>
              {exportStatus.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {exportStatus.message}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || selectedCharts.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Quick export button component
interface QuickExportProps {
  format: ExportFormat;
  timeRange: string;
  selectedCharts: string[];
  className?: string;
  onExportComplete?: (success: boolean, message: string) => void;
}

export function QuickExport({ 
  format, 
  timeRange, 
  selectedCharts, 
  className, 
  onExportComplete 
}: QuickExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleQuickExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportAnalyticsData(timeRange, selectedCharts, format);
      onExportComplete?.(result.success, result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      onExportComplete?.(false, message);
    } finally {
      setIsExporting(false);
    }
  };

  const formatInfo = exportOptions.find(opt => opt.format === format);
  const Icon = formatInfo?.icon || Download;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleQuickExport}
      disabled={isExporting}
      className={className}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Icon className="h-4 w-4 mr-2" />
      )}
      {formatInfo?.label || format.toUpperCase()}
    </Button>
  );
}