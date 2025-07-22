// Performance monitoring utilities for SSR optimization

export interface PerformanceMetrics {
  ttfb: number; // Time to First Byte
  fcp: number;  // First Contentful Paint
  lcp: number;  // Largest Contentful Paint
  cls: number;  // Cumulative Layout Shift
  fid: number;  // First Input Delay
  serverRenderTime?: number;
  hydrationTime?: number;
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    // Observe Core Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime: number; loadTime: number };
        this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.fid = entry.processingStart - entry.startTime;
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.cls = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

      // Navigation timing
      if (performance.getEntriesByType) {
        const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navigationEntries.length > 0) {
          const nav = navigationEntries[0];
          this.metrics.ttfb = nav.responseStart - nav.requestStart;
          this.metrics.fcp = nav.loadEventEnd - nav.navigationStart;
        }
      }
    }
  }

  markServerRenderStart() {
    if (typeof performance !== 'undefined') {
      performance.mark('server-render-start');
    }
  }

  markServerRenderEnd() {
    if (typeof performance !== 'undefined') {
      performance.mark('server-render-end');
      try {
        performance.measure('server-render-time', 'server-render-start', 'server-render-end');
        const measure = performance.getEntriesByName('server-render-time')[0];
        this.metrics.serverRenderTime = measure.duration;
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }
    }
  }

  markHydrationStart() {
    if (typeof performance !== 'undefined') {
      performance.mark('hydration-start');
    }
  }

  markHydrationEnd() {
    if (typeof performance !== 'undefined') {
      performance.mark('hydration-end');
      try {
        performance.measure('hydration-time', 'hydration-start', 'hydration-end');
        const measure = performance.getEntriesByName('hydration-time')[0];
        this.metrics.hydrationTime = measure.duration;
      } catch (error) {
        console.warn('Hydration measurement failed:', error);
      }
    }
  }

  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  reportMetrics() {
    // Report to analytics service
    if (typeof window !== 'undefined' && this.hasValidMetrics()) {
      console.info('Performance Metrics:', this.metrics);
      
      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        this.sendToAnalytics(this.metrics);
      }
    }
  }

  private hasValidMetrics(): boolean {
    return Object.keys(this.metrics).length > 0;
  }

  private sendToAnalytics(metrics: Partial<PerformanceMetrics>) {
    // Implementation would send to your analytics service
    // Example: Google Analytics, DataDog, etc.
    try {
      fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      }).catch(err => console.warn('Analytics reporting failed:', err));
    } catch (error) {
      console.warn('Analytics error:', error);
    }
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitoring(componentName: string) {
  if (typeof window !== 'undefined') {
    const startTime = performance.now();
    
    return {
      loadTime: performance.now() - startTime,
      reportComponentLoad: () => {
        const loadTime = performance.now() - startTime;
        console.debug(`Component ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
        return loadTime;
      }
    };
  }
  
  return {
    loadTime: 0,
    reportComponentLoad: () => 0
  };
}

// Web Vitals reporting function
export function reportWebVitals(metric: any) {
  console.debug('Web Vital:', metric);
  
  // Report to analytics service
  if (process.env.NODE_ENV === 'production') {
    try {
      fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: metric.name,
          value: metric.value,
          id: metric.id,
          timestamp: Date.now(),
        }),
      }).catch(err => console.warn('Web Vitals reporting failed:', err));
    } catch (error) {
      console.warn('Web Vitals error:', error);
    }
  }
}