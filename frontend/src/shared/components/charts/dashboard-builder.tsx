'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { useTheme } from '@/shared/services/ThemeContext';
import { useAccessibility } from '@/shared/services/AccessibilityContext';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
  DragStart,
  DragUpdate,
} from 'react-beautiful-dnd';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
  Package,
  Truck,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Shield,
  Bell,
  FileText,
  Calendar,
  Target,
  Zap,
  Eye,
  EyeOff,
  Settings,
  Plus,
  Minus,
  Copy,
  Trash2,
  Move,
  Grid,
  Layout,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Save,
  Undo,
  Redo,
  Download,
  Upload,
  Share2,
  Lock,
  Unlock,
  Palette,
  Type,
  Layers,
  Filter,
  Search,
  RefreshCw,
  ExternalLink,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

// Widget types and interfaces
export type WidgetType = 
  | 'kpi'
  | 'chart'
  | 'table'
  | 'map'
  | 'calendar'
  | 'notifications'
  | 'activity'
  | 'weather'
  | 'clock'
  | 'iframe'
  | 'text'
  | 'image'
  | 'separator';

export type ChartType = 
  | 'line'
  | 'bar'
  | 'pie'
  | 'doughnut'
  | 'area'
  | 'scatter'
  | 'radar'
  | 'funnel';

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetConfig {
  chartType?: ChartType;
  dataSource?: string;
  metrics?: string[];
  timeRange?: string;
  refreshInterval?: number;
  filters?: Record<string, any>;
  customProps?: Record<string, any>;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  fontSize?: number;
  fontWeight?: string;
  value?: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  format?: 'number' | 'currency' | 'percentage';
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  config: WidgetConfig;
}

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  widgets: Widget[];
  settings: {
    gridSize: number;
    backgroundColor: string;
    padding: number;
    autoSave: boolean;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    tags: string[];
  };
}

// Widget templates
const widgetTemplates: Record<WidgetType, Partial<WidgetConfig>> = {
  kpi: {
    value: 0,
    unit: '',
    trend: 'stable',
    format: 'number',
    backgroundColor: '#f8fafc',
    textColor: '#1f2937',
    fontSize: 24,
    fontWeight: 'bold',
  },
  chart: {
    chartType: 'line',
    dataSource: 'shipments',
    metrics: ['count'],
    refreshInterval: 30000,
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  table: {
    dataSource: 'shipments',
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  map: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  calendar: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  notifications: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  activity: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  weather: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  clock: {
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    fontWeight: 'normal',
  },
  iframe: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 0,
  },
  text: {
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 14,
    fontWeight: 'normal',
  },
  image: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  separator: {
    backgroundColor: '#e5e7eb',
    borderColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    padding: 0,
  },
};

// Widget icons mapping
const widgetIcons: Record<WidgetType, any> = {
  kpi: TrendingUp,
  chart: BarChart3,
  table: Grid,
  map: MapPin,
  calendar: Calendar,
  notifications: Bell,
  activity: Activity,
  weather: Zap,
  clock: Clock,
  iframe: ExternalLink,
  text: Type,
  image: Grid,
  separator: Minus,
};

// Default dashboard layouts
const defaultLayouts: DashboardLayout[] = [
  {
    id: 'overview',
    name: 'Overview Dashboard',
    description: 'General overview of shipments and key metrics',
    widgets: [
      {
        id: 'kpi-shipments',
        type: 'kpi',
        title: 'Total Shipments',
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: { ...widgetTemplates.kpi, value: 2847, unit: '', trend: 'up' },
      },
      {
        id: 'kpi-delivery',
        type: 'kpi',
        title: 'On-Time Delivery',
        position: { x: 3, y: 0, w: 3, h: 2 },
        config: { ...widgetTemplates.kpi, value: 94.2, unit: '%', trend: 'up', format: 'percentage' },
      },
      {
        id: 'chart-trends',
        type: 'chart',
        title: 'Shipment Trends',
        position: { x: 0, y: 2, w: 6, h: 4 },
        config: { ...widgetTemplates.chart, chartType: 'line' },
      },
    ],
    settings: {
      gridSize: 80,
      backgroundColor: '#f8fafc',
      padding: 16,
      autoSave: true,
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
      tags: ['overview', 'shipments'],
    },
  },
];

// Dashboard builder component
interface DashboardBuilderProps {
  layout?: DashboardLayout;
  onSave?: (layout: DashboardLayout) => void;
  onPreview?: (layout: DashboardLayout) => void;
  className?: string;
}

export function DashboardBuilder({
  layout: initialLayout,
  onSave,
  onPreview,
  className,
}: DashboardBuilderProps) {
  const { isDark } = useTheme();
  const { preferences } = useAccessibility();
  const [layout, setLayout] = useState<DashboardLayout>(
    initialLayout || defaultLayouts[0]
  );
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Widget management
  const addWidget = useCallback((type: WidgetType) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type,
      title: `New ${type} Widget`,
      position: { x: 0, y: 0, w: 4, h: 3 },
      config: { ...widgetTemplates[type] },
    };

    setLayout(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
      metadata: {
        ...prev.metadata,
        updatedAt: new Date().toISOString(),
      },
    }));

    toast.success('Widget added successfully');
  }, []);

  const updateWidget = useCallback((widgetId: string, updates: Partial<Widget>) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === widgetId ? { ...w, ...updates } : w
      ),
      metadata: {
        ...prev.metadata,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const removeWidget = useCallback((widgetId: string) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== widgetId),
      metadata: {
        ...prev.metadata,
        updatedAt: new Date().toISOString(),
      },
    }));

    if (selectedWidget?.id === widgetId) {
      setSelectedWidget(null);
    }

    toast.success('Widget removed successfully');
  }, [selectedWidget]);

  const duplicateWidget = useCallback((widgetId: string) => {
    const widget = layout.widgets.find(w => w.id === widgetId);
    if (!widget) return;

    const newWidget: Widget = {
      ...widget,
      id: `widget-${Date.now()}`,
      title: `Copy of ${widget.title}`,
      position: {
        ...widget.position,
        x: widget.position.x + 1,
        y: widget.position.y + 1,
      },
    };

    setLayout(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
      metadata: {
        ...prev.metadata,
        updatedAt: new Date().toISOString(),
      },
    }));

    toast.success('Widget duplicated successfully');
  }, [layout.widgets]);

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(layout);
      toast.success('Dashboard saved successfully');
    }
  }, [layout, onSave]);

  // Handle preview
  const handlePreview = useCallback(() => {
    setPreviewMode(!previewMode);
    if (onPreview && !previewMode) {
      onPreview(layout);
    }
  }, [layout, onPreview, previewMode]);

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-border">
        <div>
          <h2 className="text-lg font-semibold">{layout.name}</h2>
          <p className="text-sm text-neutral-600">{layout.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePreview}>
            {previewMode ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Widget Palette */}
        {!previewMode && (
          <div className="w-64 border-r border-surface-border p-4">
            <h3 className="text-sm font-medium mb-4">Widget Palette</h3>
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {Object.entries(widgetIcons).map(([type, Icon]) => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => addWidget(type as WidgetType)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 p-4">
          {previewMode ? (
            <DashboardPreview layout={layout} />
          ) : (
            <div className="h-full border border-surface-border rounded-lg bg-surface-background">
              {/* Canvas content would go here */}
              <div className="h-full flex items-center justify-center text-neutral-500">
                <div className="text-center">
                  <Layout className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Dashboard Canvas</p>
                  <p className="text-sm">Add widgets from the palette to get started</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Properties Panel */}
        {!previewMode && selectedWidget && (
          <div className="w-80 border-l border-surface-border p-4">
            <h3 className="text-sm font-medium mb-4">Widget Properties</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="widget-title">Title</Label>
                <Input
                  id="widget-title"
                  value={selectedWidget.title}
                  onChange={(e) =>
                    updateWidget(selectedWidget.id, { title: e.target.value })
                  }
                />
              </div>
              {/* Additional property controls would go here */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Widget renderer component
interface WidgetRendererProps {
  widget: Widget;
  previewMode?: boolean;
  className?: string;
}

export function WidgetRenderer({ widget, previewMode = false, className }: WidgetRendererProps) {
  const renderWidget = () => {
    switch (widget.type) {
      case 'kpi':
        return (
          <div className="h-full flex flex-col justify-center p-4">
            <div className="text-2xl font-bold" style={{ color: widget.config.textColor }}>
              {widget.config.value}
            </div>
            <div className="text-sm text-neutral-600 mt-1">
              {widget.title}
            </div>
          </div>
        );
      
      case 'chart':
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-neutral-500">
              <BarChart3 className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">{widget.config.chartType} Chart</p>
            </div>
          </div>
        );
      
      case 'table':
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-neutral-500">
              <Grid className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Data Table</p>
            </div>
          </div>
        );
      
      case 'map':
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-neutral-500">
              <MapPin className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Map View</p>
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div className="h-full p-2">
            <div 
              className="text-sm"
              style={{ 
                color: widget.config.textColor,
                fontSize: widget.config.fontSize,
                fontWeight: widget.config.fontWeight 
              }}
            >
              {widget.config.customProps?.content || 'Enter your text here...'}
            </div>
          </div>
        );
      
      case 'clock':
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-neutral-500" />
              <div className="text-lg font-mono">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        );
      
      default:
        const Icon = widgetIcons[widget.type] || Package;
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-neutral-500">
              <Icon className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">{widget.title}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full w-full overflow-hidden">
      {renderWidget()}
    </div>
  );
}

// Dashboard preview component
interface DashboardPreviewProps {
  layout: DashboardLayout;
  className?: string;
}

export function DashboardPreview({ layout, className }: DashboardPreviewProps) {
  return (
    <div className={cn('bg-surface-background p-4', className)}>
      <div 
        className="relative rounded-lg border border-surface-border"
        style={{
          backgroundColor: layout.settings.backgroundColor,
          padding: layout.settings.padding,
          minHeight: '600px',
        }}
      >
        {layout.widgets.map((widget) => (
          <div
            key={widget.id}
            className="absolute rounded-lg"
            style={{
              left: widget.position.x * layout.settings.gridSize,
              top: widget.position.y * layout.settings.gridSize,
              width: widget.position.w * layout.settings.gridSize,
              height: widget.position.h * layout.settings.gridSize,
              backgroundColor: widget.config.backgroundColor,
              borderColor: widget.config.borderColor,
              borderWidth: widget.config.borderWidth,
              borderRadius: widget.config.borderRadius,
              padding: widget.config.padding,
            }}
          >
            <WidgetRenderer widget={widget} previewMode={true} />
          </div>
        ))}
        
        {layout.widgets.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-neutral-500">
              <Layout className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Dashboard is empty</p>
              <p className="text-sm">No widgets configured</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}