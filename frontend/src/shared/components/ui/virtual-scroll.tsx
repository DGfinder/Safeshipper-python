'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

// Virtual scrolling hook
interface UseVirtualScrollProps {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualScroll({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
}: UseVirtualScrollProps) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
    }));
  }, [items, startIndex, endIndex]);

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    setScrollTop,
  };
}

// Virtual scroll container component
interface VirtualScrollContainerProps {
  items: any[];
  itemHeight: number;
  height: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  overscan?: number;
}

export function VirtualScrollContainer({
  items,
  itemHeight,
  height,
  renderItem,
  className,
  onScroll,
  loading = false,
  loadingComponent,
  emptyComponent,
  overscan = 3,
}: VirtualScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const { visibleItems, totalHeight, offsetY } = useVirtualScroll({
    items,
    itemHeight,
    containerHeight: height,
    overscan,
  });

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop;
      setScrollTop(scrollTop);
      onScroll?.(scrollTop);
    },
    [onScroll]
  );

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height }}>
        {loadingComponent || (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height }}>
        {emptyComponent || (
          <div className="text-center">
            <p className="text-sm text-gray-500">No items to display</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div key={index} style={{ height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Infinite scroll virtual list
interface InfiniteVirtualScrollProps extends VirtualScrollContainerProps {
  hasNextPage: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  loadMoreThreshold?: number;
}

export function InfiniteVirtualScroll({
  hasNextPage,
  isLoadingMore,
  onLoadMore,
  loadMoreThreshold = 200,
  ...props
}: InfiniteVirtualScrollProps) {
  const handleScroll = useCallback(
    (scrollTop: number) => {
      props.onScroll?.(scrollTop);

      // Check if we need to load more
      if (hasNextPage && !isLoadingMore) {
        const container = document.querySelector('[data-virtual-scroll]');
        if (container) {
          const { scrollTop, scrollHeight, clientHeight } = container as HTMLElement;
          const distanceToBottom = scrollHeight - scrollTop - clientHeight;
          
          if (distanceToBottom < loadMoreThreshold) {
            onLoadMore();
          }
        }
      }
    },
    [hasNextPage, isLoadingMore, onLoadMore, loadMoreThreshold, props.onScroll]
  );

  const renderItem = useCallback(
    (item: any, index: number) => {
      const isLastItem = index === props.items.length - 1;
      
      return (
        <div>
          {props.renderItem(item, index)}
          {isLastItem && isLoadingMore && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2" />
              <span className="text-sm text-gray-500">Loading more...</span>
            </div>
          )}
        </div>
      );
    },
    [props.renderItem, props.items.length, isLoadingMore]
  );

  return (
    <div data-virtual-scroll>
      <VirtualScrollContainer
        {...props}
        renderItem={renderItem}
        onScroll={handleScroll}
      />
    </div>
  );
}

// Virtual table component
interface VirtualTableProps<T> {
  data: T[];
  columns: Array<{
    key: string;
    label: string;
    width?: number;
    render?: (item: T, index: number) => React.ReactNode;
  }>;
  rowHeight?: number;
  height: number;
  onRowClick?: (item: T, index: number) => void;
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  keyField?: string;
}

export function VirtualTable<T>({
  data,
  columns,
  rowHeight = 48,
  height,
  onRowClick,
  className,
  headerClassName,
  rowClassName,
  keyField = 'id',
}: VirtualTableProps<T>) {
  const headerHeight = 40;
  const listHeight = height - headerHeight;

  const renderRow = useCallback(
    (item: T, index: number) => {
      const rowClass = typeof rowClassName === 'function' 
        ? rowClassName(item, index)
        : rowClassName || '';

      return (
        <div
          className={cn(
            'flex items-center border-b border-gray-200 hover:bg-gray-50 cursor-pointer',
            rowClass
          )}
          onClick={() => onRowClick?.(item, index)}
          style={{ height: rowHeight }}
        >
          {columns.map((column) => (
            <div
              key={column.key}
              className="px-4 py-2 text-sm"
              style={{ width: column.width || 'auto', flex: column.width ? 'none' : 1 }}
            >
              {column.render ? 
                column.render(item, index) : 
                <span>{(item as any)[column.key]}</span>
              }
            </div>
          ))}
        </div>
      );
    },
    [columns, rowHeight, onRowClick, rowClassName]
  );

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div
        className={cn('flex items-center bg-gray-50 border-b font-medium text-sm', headerClassName)}
        style={{ height: headerHeight }}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className="px-4 py-2 text-gray-700"
            style={{ width: column.width || 'auto', flex: column.width ? 'none' : 1 }}
          >
            {column.label}
          </div>
        ))}
      </div>

      {/* Virtual scrolling list */}
      <VirtualScrollContainer
        items={data}
        itemHeight={rowHeight}
        height={listHeight}
        renderItem={renderRow}
      />
    </div>
  );
}

// Grid virtual scroll (for card layouts)
interface VirtualGridProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  columns: number;
  gap?: number;
  height: number;
  className?: string;
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function VirtualGrid<T>({
  data,
  renderItem,
  itemHeight,
  columns,
  gap = 16,
  height,
  className,
  loading = false,
  onLoadMore,
  hasMore = false,
}: VirtualGridProps<T>) {
  const rowHeight = itemHeight + gap;
  const totalRows = Math.ceil(data.length / columns);
  
  const renderRow = useCallback(
    (rowData: T[], rowIndex: number) => {
      const actualRowIndex = Math.floor(rowIndex);
      const startIndex = actualRowIndex * columns;
      const rowItems = data.slice(startIndex, startIndex + columns);

      return (
        <div 
          className="flex gap-4" 
          style={{ height: itemHeight, marginBottom: gap }}
        >
          {rowItems.map((item, itemIndex) => (
            <div key={startIndex + itemIndex} style={{ flex: `0 0 calc((100% - ${(columns - 1) * gap}px) / ${columns})` }}>
              {renderItem(item, startIndex + itemIndex)}
            </div>
          ))}
        </div>
      );
    },
    [data, columns, itemHeight, gap, renderItem]
  );

  // Create array of row data for virtual scrolling
  const rowData = useMemo(() => {
    const rows = [];
    for (let i = 0; i < totalRows; i++) {
      rows.push(data.slice(i * columns, (i + 1) * columns));
    }
    return rows;
  }, [data, totalRows, columns]);

  return (
    <div className={className}>
      <VirtualScrollContainer
        items={rowData}
        itemHeight={rowHeight}
        height={height}
        renderItem={renderRow}
        loading={loading}
        emptyComponent={
          <div className="text-center py-8">
            <p className="text-gray-500">No items to display</p>
          </div>
        }
      />
    </div>
  );
}