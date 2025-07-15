// Performance monitoring utilities for SafeShipper
import React from 'react';

// Performance metrics interface
export interface PerformanceMetrics {
  componentName: string;
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  timestamp: number;
}

// Performance tracker class
class PerformanceTracker {
  private metrics: PerformanceMetrics[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    // Track navigation timing
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            console.log('Navigation timing:', entry);
          }
        });
      });

      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);

      // Track resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.includes('chunk') || entry.name.includes('component')) {
            console.log('Resource loaded:', entry.name, entry.duration);
          }
        });
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    }
  }

  // Track component performance
  trackComponent(componentName: string, loadTime: number, renderTime: number) {
    const metric: PerformanceMetrics = {
      componentName,
      loadTime,
      renderTime,
      memoryUsage: this.getMemoryUsage(),
      timestamp: Date.now(),
    };

    this.metrics.push(metric);
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Component Performance: ${componentName}`, {
        load: `${loadTime.toFixed(2)}ms`,
        render: `${renderTime.toFixed(2)}ms`,
        memory: `${metric.memoryUsage?.toFixed(2)}MB`,
      });
    }

    // Send to analytics in production
    this.sendToAnalytics(metric);
  }

  // Get memory usage
  private getMemoryUsage(): number | undefined {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    return undefined;
  }

  // Send metrics to analytics service
  private sendToAnalytics(metric: PerformanceMetrics) {
    // In production, send to your analytics service
    // analytics.track('component_performance', metric);
  }

  // Get performance summary
  getSummary() {
    const summary = {
      totalComponents: this.metrics.length,
      averageLoadTime: this.metrics.reduce((sum, m) => sum + m.loadTime, 0) / this.metrics.length,
      averageRenderTime: this.metrics.reduce((sum, m) => sum + m.renderTime, 0) / this.metrics.length,
      slowestComponents: this.metrics
        .sort((a, b) => b.loadTime - a.loadTime)
        .slice(0, 5)
        .map(m => ({ name: m.componentName, loadTime: m.loadTime })),
    };

    return summary;
  }

  // Clear metrics
  clear() {
    this.metrics = [];
  }

  // Cleanup observers
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Global performance tracker instance
export const performanceTracker = new PerformanceTracker();

// React hook for performance monitoring
export function usePerformanceMonitoring(componentName: string) {
  const [startTime] = React.useState(() => performance.now());
  const [loadTime, setLoadTime] = React.useState<number | null>(null);

  React.useEffect(() => {
    const loadEndTime = performance.now();
    const componentLoadTime = loadEndTime - startTime;
    setLoadTime(componentLoadTime);

    // Track render time
    const renderStartTime = performance.now();
    
    const trackRender = () => {
      const renderEndTime = performance.now();
      const renderTime = renderEndTime - renderStartTime;
      
      performanceTracker.trackComponent(componentName, componentLoadTime, renderTime);
    };

    // Use requestAnimationFrame to track after render
    requestAnimationFrame(trackRender);
  }, [componentName, startTime]);

  return { loadTime };
}

// Performance monitoring HOC
export function withPerformanceMonitoring<T extends React.ComponentType<any>>(
  componentName: string,
  Component: T
): T {
  const WrappedComponent = (props: any) => {
    const { loadTime } = usePerformanceMonitoring(componentName);
    
    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName})`;
  return WrappedComponent as T;
}

// Bundle size analyzer
export const bundleAnalyzer = {
  trackChunkLoad: (chunkName: string, size: number) => {
    console.log(`Chunk loaded: ${chunkName} (${(size / 1024).toFixed(2)}KB)`);
  },

  getChunkSizes: async () => {
    if (typeof window !== 'undefined') {
      const entries = performance.getEntriesByType('resource');
      return entries
        .filter(entry => entry.name.includes('chunk'))
        .map(entry => ({
          name: entry.name,
          size: entry.transferSize,
          duration: entry.duration,
        }));
    }
    return [];
  },
};

// Memory usage monitoring
export const memoryMonitor = {
  getCurrentUsage: () => {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize / (1024 * 1024), // MB
        total: memory.totalJSHeapSize / (1024 * 1024), // MB
        limit: memory.jsHeapSizeLimit / (1024 * 1024), // MB
      };
    }
    return null;
  },

  watchMemoryUsage: (callback: (usage: any) => void) => {
    const interval = setInterval(() => {
      const usage = memoryMonitor.getCurrentUsage();
      if (usage) {
        callback(usage);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  },
};

// Performance optimization utilities
export const optimizationUtils = {
  // Debounce function for performance
  debounce: <T extends (...args: any[]) => any>(func: T, delay: number): T => {
    let timeoutId: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    }) as T;
  },

  // Throttle function for performance
  throttle: <T extends (...args: any[]) => any>(func: T, limit: number): T => {
    let lastFunc: NodeJS.Timeout;
    let lastRan: number;
    return ((...args: any[]) => {
      if (!lastRan) {
        func.apply(null, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(() => {
          if (Date.now() - lastRan >= limit) {
            func.apply(null, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    }) as T;
  },

  // Intersection observer for lazy loading
  createIntersectionObserver: (
    callback: (entries: IntersectionObserverEntry[]) => void,
    options?: IntersectionObserverInit
  ) => {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      return new IntersectionObserver(callback, {
        root: null,
        rootMargin: '50px',
        threshold: 0.1,
        ...options,
      });
    }
    return null;
  },

  // Preload critical resources
  preloadResource: (href: string, as: string) => {
    if (typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      document.head.appendChild(link);
    }
  },

  // Prefetch resources
  prefetchResource: (href: string) => {
    if (typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    }
  },
};

// Performance budget monitoring
export const performanceBudget = {
  // Define performance budgets
  budgets: {
    componentLoadTime: 200, // ms
    renderTime: 16, // ms (60fps)
    memoryUsage: 50, // MB
    bundleSize: 1000, // KB
  },

  // Check if metric exceeds budget
  checkBudget: (metric: Partial<PerformanceMetrics>) => {
    const violations = [];

    if (metric.loadTime && metric.loadTime > performanceBudget.budgets.componentLoadTime) {
      violations.push(`Load time budget exceeded: ${metric.loadTime}ms > ${performanceBudget.budgets.componentLoadTime}ms`);
    }

    if (metric.renderTime && metric.renderTime > performanceBudget.budgets.renderTime) {
      violations.push(`Render time budget exceeded: ${metric.renderTime}ms > ${performanceBudget.budgets.renderTime}ms`);
    }

    if (metric.memoryUsage && metric.memoryUsage > performanceBudget.budgets.memoryUsage) {
      violations.push(`Memory budget exceeded: ${metric.memoryUsage}MB > ${performanceBudget.budgets.memoryUsage}MB`);
    }

    return violations;
  },

  // Alert on budget violations
  alertOnViolation: (metric: Partial<PerformanceMetrics>) => {
    const violations = performanceBudget.checkBudget(metric);
    if (violations.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn('Performance budget violations:', violations);
    }
  },
};

// Export performance data for analysis
export const exportPerformanceData = () => {
  const data = {
    summary: performanceTracker.getSummary(),
    memory: memoryMonitor.getCurrentUsage(),
    chunks: bundleAnalyzer.getChunkSizes(),
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('Performance Data:', data);
  }

  return data;
};

// Cleanup function for performance monitoring
export const cleanupPerformanceMonitoring = () => {
  performanceTracker.cleanup();
};