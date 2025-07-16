'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Eye, Edit, Trash2, MoreHorizontal, ChevronDown, ChevronRight } from 'lucide-react';

// Hook to detect mobile breakpoint
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
}

// Column definition interface
export interface TableColumn<T> {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  mobileRender?: (item: T) => React.ReactNode;
  hideOnMobile?: boolean;
  priority?: 'high' | 'medium' | 'low'; // For mobile column prioritization
}

// Table action interface
export interface TableAction<T> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive' | 'outline';
  disabled?: (item: T) => boolean;
}

// Main responsive table props
export interface ResponsiveTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];
  selectable?: boolean;
  onSelectionChange?: (selectedItems: T[]) => void;
  loading?: boolean;
  emptyMessage?: string;
  keyField?: string;
  className?: string;
  cardClassName?: string;
  tableClassName?: string;
  mobileCardComponent?: React.ComponentType<{ item: T; columns: TableColumn<T>[]; actions?: TableAction<T>[] }>;
}

// Mobile card component
interface MobileCardProps<T> {
  item: T;
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];
  selectable?: boolean;
  selected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  keyField?: string;
  className?: string;
}

function MobileCard<T>({ 
  item, 
  columns, 
  actions, 
  selectable, 
  selected, 
  onSelectionChange, 
  keyField = 'id', 
  className 
}: MobileCardProps<T>) {
  const [expanded, setExpanded] = useState(false);
  
  // Sort columns by priority for mobile display
  const prioritizedColumns = columns
    .filter(col => !col.hideOnMobile)
    .sort((a, b) => {
      const priorities = { high: 0, medium: 1, low: 2 };
      return (priorities[a.priority || 'medium'] - priorities[b.priority || 'medium']);
    });

  const primaryColumns = prioritizedColumns.filter(col => col.priority === 'high' || !col.priority);
  const secondaryColumns = prioritizedColumns.filter(col => col.priority === 'medium' || col.priority === 'low');

  return (
    <Card className={cn('mb-3', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            {selectable && (
              <Checkbox
                checked={selected}
                onCheckedChange={onSelectionChange}
                className="mt-1"
              />
            )}
            
            <div className="flex-1 min-w-0">
              {/* Primary information */}
              <div className="space-y-2">
                {primaryColumns.map((column) => (
                  <div key={column.key} className="flex items-center gap-2">
                    {column.mobileRender ? 
                      column.mobileRender(item) : 
                      column.render ? 
                      column.render(item) : 
                      <span className="text-sm">{(item as any)[column.key]}</span>
                    }
                  </div>
                ))}
              </div>

              {/* Secondary information (expandable) */}
              {secondaryColumns.length > 0 && (
                <div className="mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(!expanded)}
                    className="h-auto p-0 text-xs text-gray-500"
                  >
                    {expanded ? (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Less details
                      </>
                    ) : (
                      <>
                        <ChevronRight className="h-3 w-3 mr-1" />
                        More details
                      </>
                    )}
                  </Button>
                  
                  {expanded && (
                    <div className="mt-2 space-y-1 pl-4 border-l-2 border-gray-100">
                      {secondaryColumns.map((column) => (
                        <div key={column.key} className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{column.label}:</span>
                          <div className="text-xs">
                            {column.mobileRender ? 
                              column.mobileRender(item) : 
                              column.render ? 
                              column.render(item) : 
                              <span>{(item as any)[column.key]}</span>
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && actions.length > 0 && (
            <div className="flex items-center gap-1 ml-2">
              {actions.slice(0, 2).map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'ghost'}
                  size="sm"
                  onClick={() => action.onClick(item)}
                  disabled={action.disabled?.(item)}
                  className="h-8 w-8 p-0"
                >
                  {action.icon && <action.icon className="h-4 w-4" />}
                </Button>
              ))}
              
              {actions.length > 2 && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Main responsive table component
export function ResponsiveTable<T>({
  data,
  columns,
  actions,
  selectable = false,
  onSelectionChange,
  loading = false,
  emptyMessage = 'No data available',
  keyField = 'id',
  className,
  cardClassName,
  tableClassName,
  mobileCardComponent: CustomMobileCard,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();
  const [selectedItems, setSelectedItems] = useState<T[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    const newSelection = checked ? data : [];
    setSelectedItems(newSelection);
    onSelectionChange?.(newSelection);
  };

  const handleSelectItem = (item: T, checked: boolean) => {
    const newSelection = checked
      ? [...selectedItems, item]
      : selectedItems.filter(selectedItem => (selectedItem as any)[keyField] !== (item as any)[keyField]);
    
    setSelectedItems(newSelection);
    setSelectAll(newSelection.length === data.length);
    onSelectionChange?.(newSelection);
  };

  const isSelected = (item: T) => {
    return selectedItems.some(selectedItem => (selectedItem as any)[keyField] === (item as any)[keyField]);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  // Mobile view
  if (isMobile) {
    const CardComponent = CustomMobileCard || MobileCard;
    
    return (
      <div className={cn('space-y-3', className)}>
        {selectable && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <Checkbox
              checked={selectAll}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-gray-600">
              Select all ({selectedItems.length} of {data.length})
            </span>
          </div>
        )}
        
        {data.map((item) => (
          <CardComponent
            key={(item as any)[keyField]}
            item={item}
            columns={columns}
            actions={actions}
            selectable={selectable}
            selected={isSelected(item)}
            onSelectionChange={(checked) => handleSelectItem(item, checked)}
            keyField={keyField}
            className={cardClassName}
          />
        ))}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className={cn('w-full', tableClassName)}>
          <thead className="bg-gray-50 border-b">
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'text-left px-4 py-3 text-sm font-medium text-gray-700',
                    column.width
                  )}
                >
                  {column.label}
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th className="w-24 px-4 py-3 text-sm font-medium text-gray-700">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((item) => (
              <tr
                key={(item as any)[keyField]}
                className="hover:bg-gray-50"
              >
                {selectable && (
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={isSelected(item)}
                      onCheckedChange={(checked) => handleSelectItem(item, checked as boolean)}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3">
                    {column.render ? 
                      column.render(item) : 
                      <span className="text-sm">{(item as any)[column.key]}</span>
                    }
                  </td>
                ))}
                {actions && actions.length > 0 && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {actions.map((action, index) => (
                        <Button
                          key={index}
                          variant={action.variant || 'ghost'}
                          size="sm"
                          onClick={() => action.onClick(item)}
                          disabled={action.disabled?.(item)}
                          className="h-8 w-8 p-0"
                        >
                          {action.icon && <action.icon className="h-4 w-4" />}
                        </Button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}