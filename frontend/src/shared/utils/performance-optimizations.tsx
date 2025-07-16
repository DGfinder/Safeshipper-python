/**
 * Performance optimization utilities for SafeShipper frontend
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

// Debounce utility function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Throttle utility function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Lazy loading hook for images
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting) {
          setHasIntersected(true);
        }
      },
      options
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, options]);

  return { isIntersecting, hasIntersected };
}

// Debounced search hook
export function useDebouncedSearch(
  initialValue: string = '',
  delay: number = 300
) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, delay]);

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
  };
}

// Throttled scroll hook
export function useThrottledScroll(delay: number = 100) {
  const [scrollY, setScrollY] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    const handleScroll = throttle(() => {
      setScrollY(window.scrollY);
      setIsScrolling(true);
      
      setTimeout(() => {
        setIsScrolling(false);
      }, delay);
    }, delay);

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [delay]);

  return { scrollY, isScrolling };
}

// Memoized callback hook
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const ref = useRef<T>(callback);
  
  useEffect(() => {
    ref.current = callback;
  }, deps);

  return useCallback((...args: Parameters<T>) => {
    return ref.current(...args);
  }, []) as T;
}

// Virtual scrolling hook
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
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

// Image optimization utility
export function optimizeImageUrl(
  url: string,
  width?: number,
  height?: number,
  quality: number = 75
): string {
  // This would integrate with a CDN or image optimization service
  // For now, we'll just return the original URL
  const params = new URLSearchParams();
  
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  params.append('q', quality.toString());
  
  // Example for Next.js Image Optimization API
  if (params.toString()) {
    return `/_next/image?url=${encodeURIComponent(url)}&${params.toString()}`;
  }
  
  return url;
}

// Lazy loading component
export function LazyImage({
  src,
  alt,
  className,
  width,
  height,
  quality = 75,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZjNmNGY2IiBzdG9wLW9wYWNpdHk9IjAuOCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2Y5ZmFmYiIgc3RvcC1vcGFjaXR5PSIwLjgiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0idXJsKCNncmFkaWVudCkiLz48L3N2Zz4=',
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  width?: number;
  height?: number;
  quality?: number;
  placeholder?: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const { hasIntersected } = useIntersectionObserver(imgRef, {
    rootMargin: '50px',
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const optimizedSrc = optimizeImageUrl(src || '', width, height, quality);

  return (
    <img
      ref={imgRef}
      src={hasIntersected ? optimizedSrc : placeholder}
      alt={alt}
      className={className}
      onLoad={() => setIsLoaded(true)}
      onError={() => setHasError(true)}
      style={{
        transition: 'opacity 0.3s ease',
        opacity: isLoaded ? 1 : 0.7,
      }}
      {...props}
    />
  );
}

// Code splitting utility
export function loadComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  return React.lazy(importFunc);
}

// Bundle size analyzer (for development)
export function analyzeBundleSize() {
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle analysis - check webpack-bundle-analyzer for detailed report');
    
    // Log approximate component sizes
    const componentSizes = {
      'Dashboard': '~45KB',
      'Shipments': '~38KB',
      'Analytics': '~52KB',
      'Fleet': '~28KB',
      'Reports': '~35KB',
    };
    
    console.table(componentSizes);
  }
}

// Performance monitoring utility
export function measurePerformance(name: string, fn: () => void) {
  const start = performance.now();
  fn();
  const end = performance.now();
  
  console.log(`${name} took ${end - start} milliseconds`);
  
  // In production, send to analytics
  if (process.env.NODE_ENV === 'production') {
    // Example: analytics.track('performance', { name, duration: end - start });
  }
}

// Memory usage monitor
export function useMemoryMonitor() {
  const [memoryUsage, setMemoryUsage] = useState<{
    used: number;
    total: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    const monitor = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryUsage({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
        });
      }
    };

    monitor();
    const interval = setInterval(monitor, 5000);
    return () => clearInterval(interval);
  }, []);

  return memoryUsage;
}

// Network status monitor
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setConnectionType(connection.effectiveType || 'unknown');
      
      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || 'unknown');
      };
      
      connection.addEventListener('change', handleConnectionChange);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionType };
}

// Cache management utility
export class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// Global cache instance
export const globalCache = new CacheManager();

// React Query-like hook for caching
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttl?: number; enabled?: boolean } = {}
) {
  const { ttl = 5 * 60 * 1000, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Check cache first
    const cachedData = globalCache.get(key);
    if (cachedData) {
      setData(cachedData);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      globalCache.set(key, result, ttl);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, ttl, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// Performance budget checker
export function checkPerformanceBudget() {
  if (process.env.NODE_ENV === 'development') {
    // Check various performance metrics
    const paintTiming = performance.getEntriesByType('paint');
    const navigationTiming = performance.getEntriesByType('navigation');
    
    console.group('Performance Budget Check');
    
    paintTiming.forEach(entry => {
      const budget = entry.name === 'first-contentful-paint' ? 1500 : 2500;
      const status = entry.startTime <= budget ? '✅' : '❌';
      console.log(`${status} ${entry.name}: ${entry.startTime.toFixed(2)}ms (budget: ${budget}ms)`);
    });
    
    console.groupEnd();
  }
}

// Resource preloader
export function preloadResources(urls: string[]) {
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    
    if (url.endsWith('.css')) {
      link.as = 'style';
    } else if (url.endsWith('.js')) {
      link.as = 'script';
    } else if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
      link.as = 'image';
    }
    
    document.head.appendChild(link);
  });
}

// Component performance wrapper
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    const renderStart = useRef<number>();
    const [renderTime, setRenderTime] = useState<number>();

    useEffect(() => {
      renderStart.current = performance.now();
    });

    useEffect(() => {
      if (renderStart.current) {
        const time = performance.now() - renderStart.current;
        setRenderTime(time);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`${componentName} render time: ${time.toFixed(2)}ms`);
        }
      }
    });

    return <Component {...props} />;
  };
}