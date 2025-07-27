/**
 * Analytics Component Registry
 * Central registry for managing and dynamically loading analytics components
 * Supports role-based access control and component lifecycle management
 */

"use client";

import React, { ComponentType, lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  BarChart3, 
  LineChart,
  PieChart,
  TrendingUp,
  Users,
  Truck,
  Package,
  Shield,
  DollarSign,
  Activity,
  AlertTriangle,
  Settings,
  Plus,
  Eye,
  RefreshCw,
  Filter,
  Search,
  Grid,
  List
} from 'lucide-react';
import { UnifiedAnalyticsRenderer } from './UnifiedAnalyticsRenderer';
import { useUnifiedAnalytics } from '../../shared/hooks/useUnifiedAnalytics';

// Component interface for analytics widgets
interface AnalyticsComponentProps {
  filters?: Record<string, any>;
  time_range?: string;
  granularity?: string;
  real_time?: boolean;
  className?: string;
}

// Registry entry interface
interface AnalyticsRegistryEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: ComponentType<{ className?: string }>;
  component: ComponentType<AnalyticsComponentProps>;
  analytics_type: string;
  required_permissions: string[];
  default_config: {
    time_range: string;
    granularity: string;
    real_time: boolean;
    auto_refresh: boolean;
  };
  tags: string[];
  version: string;
  deprecated?: boolean;
  experimental?: boolean;
}

// Lazy load analytics components
const FleetUtilizationWidget = lazy(() => import('./widgets/FleetUtilizationWidget'));
// TODO: Create these widget components when needed
// const ShipmentTrendsWidget = lazy(() => import('./widgets/ShipmentTrendsWidget'));
// const ComplianceMetricsWidget = lazy(() => import('./widgets/ComplianceMetricsWidget'));
// const GenericAnalyticsWidget = lazy(() => import('./widgets/GenericAnalyticsWidget'));
// const OperationalEfficiencyWidget = lazy(() => import('./widgets/OperationalEfficiencyWidget'));
// const RiskAnalyticsWidget = lazy(() => import('./widgets/RiskAnalyticsWidget'));

// Factory function to create analytics widgets with specific types
const createAnalyticsWidget = (analyticsType: string): ComponentType<AnalyticsComponentProps> => 
  (props) => (
    <UnifiedAnalyticsRenderer
      analytics_type={analyticsType}
      {...props}
    />
  );

// Analytics component registry
const ANALYTICS_REGISTRY: Record<string, AnalyticsRegistryEntry> = {
  fleet_utilization: {
    id: 'fleet_utilization',
    name: 'Fleet Utilization',
    description: 'Monitor vehicle utilization rates and availability metrics',
    category: 'Fleet Management',
    icon: Truck,
    component: FleetUtilizationWidget,
    analytics_type: 'fleet_utilization',
    required_permissions: ['view_fleet_analytics'],
    default_config: {
      time_range: '7d',
      granularity: 'hour',
      real_time: true,
      auto_refresh: true
    },
    tags: ['fleet', 'utilization', 'vehicles', 'real-time'],
    version: '1.0.0'
  },
  
  shipment_trends: {
    id: 'shipment_trends',
    name: 'Shipment Trends',
    description: 'Track shipment volume and performance trends over time',
    category: 'Operations',
    icon: Package,
    component: createAnalyticsWidget('shipment_trends'),
    analytics_type: 'shipment_trends',
    required_permissions: ['view_shipment_analytics'],
    default_config: {
      time_range: '30d',
      granularity: 'day',
      real_time: false,
      auto_refresh: false
    },
    tags: ['shipments', 'trends', 'operations', 'performance'],
    version: '1.0.0'
  },
  
  compliance_metrics: {
    id: 'compliance_metrics',
    name: 'Compliance Metrics',
    description: 'Monitor safety and regulatory compliance status',
    category: 'Compliance',
    icon: Shield,
    component: createAnalyticsWidget('compliance_metrics'),
    analytics_type: 'compliance_metrics',
    required_permissions: ['view_compliance_analytics'],
    default_config: {
      time_range: '30d',
      granularity: 'day',
      real_time: false,
      auto_refresh: false
    },
    tags: ['compliance', 'safety', 'regulatory', 'audits'],
    version: '1.0.0'
  },
  
  financial_performance: {
    id: 'financial_performance',
    name: 'Financial Performance',
    description: 'Analyze revenue, costs, and profitability metrics',
    category: 'Finance',
    icon: DollarSign,
    component: createAnalyticsWidget('financial_performance'),
    analytics_type: 'financial_performance',
    required_permissions: ['view_financial_analytics'],
    default_config: {
      time_range: '90d',
      granularity: 'week',
      real_time: false,
      auto_refresh: false
    },
    tags: ['finance', 'revenue', 'costs', 'profitability'],
    version: '1.0.0'
  },
  
  operational_efficiency: {
    id: 'operational_efficiency',
    name: 'Operational Efficiency',
    description: 'KPI dashboard for operational performance metrics',
    category: 'Operations',
    icon: Activity,
    component: createAnalyticsWidget('operational_efficiency'),
    analytics_type: 'operational_efficiency',
    required_permissions: ['view_operations_analytics'],
    default_config: {
      time_range: '7d',
      granularity: 'hour',
      real_time: true,
      auto_refresh: true
    },
    tags: ['operations', 'efficiency', 'kpi', 'performance'],
    version: '1.0.0'
  },
  
  risk_analytics: {
    id: 'risk_analytics',
    name: 'Risk Analytics',
    description: 'Advanced risk assessment and predictive analytics',
    category: 'Risk Management',
    icon: AlertTriangle,
    component: createAnalyticsWidget('risk_analytics'),
    analytics_type: 'risk_analytics',
    required_permissions: ['view_risk_analytics'],
    default_config: {
      time_range: '30d',
      granularity: 'day',
      real_time: true,
      auto_refresh: true
    },
    tags: ['risk', 'predictive', 'analytics', 'safety'],
    version: '1.0.0',
    experimental: true
  }
};

interface AnalyticsRegistryProps {
  view_mode?: 'grid' | 'list';
  categories_filter?: string[];
  search_query?: string;
  show_deprecated?: boolean;
  show_experimental?: boolean;
  user_permissions?: string[];
  onComponentSelect?: (entry: AnalyticsRegistryEntry) => void;
  selected_components?: string[];
  max_components?: number;
}

export function AnalyticsRegistry({
  view_mode = 'grid',
  categories_filter = [],
  search_query = '',
  show_deprecated = false,
  show_experimental = true,
  user_permissions = [],
  onComponentSelect,
  selected_components = [],
  max_components
}: AnalyticsRegistryProps) {
  
  const [viewMode, setViewMode] = useState(view_mode);
  const [searchQuery, setSearchQuery] = useState(search_query);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  // Get available categories
  const categories = useMemo(() => {
    const categorySet = new Set(Object.values(ANALYTICS_REGISTRY).map(entry => entry.category));
    return ['all', ...Array.from(categorySet).sort()];
  }, []);

  // Filter registry entries based on criteria
  const filteredEntries = useMemo(() => {
    return Object.values(ANALYTICS_REGISTRY).filter(entry => {
      // Permission check
      if (entry.required_permissions.length > 0) {
        const hasPermission = entry.required_permissions.some(permission => 
          user_permissions.includes(permission) || user_permissions.includes('admin')
        );
        if (!hasPermission) return false;
      }

      // Deprecated filter
      if (entry.deprecated && !show_deprecated) return false;

      // Experimental filter
      if (entry.experimental && !show_experimental) return false;

      // Category filter
      if (selectedCategory !== 'all' && entry.category !== selectedCategory) return false;

      // Categories filter (prop)
      if (categories_filter.length > 0 && !categories_filter.includes(entry.category)) return false;

      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = entry.name.toLowerCase().includes(query);
        const matchesDescription = entry.description.toLowerCase().includes(query);
        const matchesTags = entry.tags.some(tag => tag.toLowerCase().includes(query));
        const matchesCategory = entry.category.toLowerCase().includes(query);
        
        if (!matchesName && !matchesDescription && !matchesTags && !matchesCategory) {
          return false;
        }
      }

      return true;
    });
  }, [user_permissions, show_deprecated, show_experimental, selectedCategory, categories_filter, searchQuery]);

  // Toggle entry expansion
  const toggleEntryExpansion = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  // Handle component selection
  const handleComponentSelect = (entry: AnalyticsRegistryEntry) => {
    if (onComponentSelect) {
      onComponentSelect(entry);
    }
  };

  // Check if component is selected
  const isComponentSelected = (entryId: string) => {
    return selected_components.includes(entryId);
  };

  // Check if max components reached
  const isMaxComponentsReached = () => {
    return max_components !== undefined && selected_components.length >= max_components;
  };

  // Render component entry card
  const renderComponentCard = (entry: AnalyticsRegistryEntry) => {
    const IconComponent = entry.icon;
    const isSelected = isComponentSelected(entry.id);
    const isExpanded = expandedEntries.has(entry.id);
    const canSelect = !isMaxComponentsReached() || isSelected;

    return (
      <Card 
        key={entry.id} 
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
        } ${!canSelect ? 'opacity-50' : ''}`}
        onClick={() => canSelect && handleComponentSelect(entry)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <IconComponent className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle className="text-lg">{entry.name}</CardTitle>
                <Badge variant="outline" className="mt-1">
                  {entry.category}
                </Badge>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {entry.experimental && (
                <Badge variant="secondary" className="text-xs">
                  Experimental
                </Badge>
              )}
              {entry.deprecated && (
                <Badge variant="destructive" className="text-xs">
                  Deprecated
                </Badge>
              )}
              {isSelected && (
                <Badge variant="default" className="text-xs">
                  Selected
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-gray-600 mb-3">
            {entry.description}
          </p>

          <div className="flex flex-wrap gap-1 mb-3">
            {entry.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>v{entry.version}</span>
            <span>{entry.analytics_type}</span>
          </div>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Default Configuration</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Time Range:</span>
                  <span className="ml-1">{entry.default_config.time_range}</span>
                </div>
                <div>
                  <span className="text-gray-500">Granularity:</span>
                  <span className="ml-1">{entry.default_config.granularity}</span>
                </div>
                <div>
                  <span className="text-gray-500">Real-time:</span>
                  <span className="ml-1">{entry.default_config.real_time ? 'Yes' : 'No'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Auto-refresh:</span>
                  <span className="ml-1">{entry.default_config.auto_refresh ? 'Yes' : 'No'}</span>
                </div>
              </div>
              
              {entry.required_permissions.length > 0 && (
                <div className="mt-2">
                  <span className="text-gray-500 text-xs">Required Permissions:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {entry.required_permissions.map(permission => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleEntryExpansion(entry.id);
              }}
            >
              <Eye className="w-4 h-4 mr-1" />
              {isExpanded ? 'Less' : 'More'} Info
            </Button>

            {onComponentSelect && (
              <Button
                variant={isSelected ? "destructive" : "default"}
                size="sm"
                disabled={!canSelect}
                onClick={(e) => {
                  e.stopPropagation();
                  handleComponentSelect(entry);
                }}
              >
                {isSelected ? 'Remove' : 'Add'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Registry</h2>
          <p className="text-gray-600">
            {filteredEntries.length} available analytics components
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search components..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg text-sm w-64"
            />
          </div>
        </div>
      </div>

      {/* Selection Summary */}
      {onComponentSelect && selected_components.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">
                  {selected_components.length} component{selected_components.length !== 1 ? 's' : ''} selected
                </span>
                {max_components && (
                  <span className="text-sm text-gray-500 ml-2">
                    (max {max_components})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selected_components.map(componentId => {
                  const entry = ANALYTICS_REGISTRY[componentId];
                  return entry ? (
                    <Badge key={componentId} variant="default" className="text-xs">
                      {entry.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registry Grid/List */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
      }>
        {filteredEntries.map(renderComponentCard)}
      </div>

      {/* Empty State */}
      {filteredEntries.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Analytics Components Found
            </h3>
            <p className="text-gray-600 mb-4">
              No components match your current filters and permissions.
            </p>
            <Button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper function to get registry entry by ID
export function getAnalyticsRegistryEntry(id: string): AnalyticsRegistryEntry | undefined {
  return ANALYTICS_REGISTRY[id];
}

// Helper function to get all registry entries
export function getAllAnalyticsRegistryEntries(): AnalyticsRegistryEntry[] {
  return Object.values(ANALYTICS_REGISTRY);
}

// Helper function to get entries by category
export function getAnalyticsRegistryEntriesByCategory(category: string): AnalyticsRegistryEntry[] {
  return Object.values(ANALYTICS_REGISTRY).filter(entry => entry.category === category);
}

// Helper function to render component with error boundary
export function renderAnalyticsComponent(
  entryId: string, 
  props: AnalyticsComponentProps = {}
): React.ReactElement | null {
  const entry = ANALYTICS_REGISTRY[entryId];
  
  if (!entry) {
    console.warn(`Analytics component '${entryId}' not found in registry`);
    return null;
  }

  const Component = entry.component;
  
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading {entry.name}...</span>
        </div>
      }
    >
      <Component {...props} />
    </Suspense>
  );
}

export default AnalyticsRegistry;