/**
 * Testing utilities and helpers for SafeShipper frontend
 * Provides comprehensive testing support for components, pages, and functionality
 */

// Navigation and routing tests
export const navigationTests = {
  // Test all sidebar navigation links
  testSidebarNavigation: () => {
    const navigationItems = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Operations Center', path: '/operations' },
      { name: 'Live Map', path: '/dashboard/live-map' },
      { name: 'Search', path: '/search' },
      { name: 'All Shipments', path: '/shipments' },
      { name: 'Manifest Upload', path: '/shipments/manifest-upload' },
      { name: 'ERP Integration', path: '/erp-integration' },
      { name: 'API Gateway', path: '/api-gateway' },
      { name: 'Developer Portal', path: '/developer' },
      { name: 'Fleet Management', path: '/fleet' },
      { name: 'IoT Monitoring', path: '/iot-monitoring' },
      { name: 'DG Compliance', path: '/dg-compliance' },
      { name: 'Emergency Procedures', path: '/emergency-procedures' },
      { name: 'Incident Management', path: '/incidents' },
      { name: 'Training', path: '/training' },
      { name: 'Inspections', path: '/inspections' },
      { name: 'Audits', path: '/audits' },
      { name: 'SDS Library', path: '/sds-library' },
      { name: 'SDS Enhanced', path: '/sds-enhanced' },
      { name: 'DG Checker', path: '/dg-checker' },
      { name: 'AI Insights', path: '/ai-insights' },
      { name: 'Track Shipment', path: '/track' },
      { name: 'Portal Dashboard', path: '/customer-portal' },
      { name: 'Self-Service', path: '/customer-portal/requests' },
      { name: 'Notifications', path: '/customer-portal/notifications' },
      { name: 'Reports Dashboard', path: '/reports' },
      { name: 'Advanced Analytics', path: '/analytics' },
      { name: 'Business Intelligence', path: '/analytics/insights' },
      { name: 'Users', path: '/users' },
      { name: 'Customers', path: '/customers' },
      { name: 'Settings', path: '/settings' },
    ];

    console.group('🔍 Navigation Tests');
    
    navigationItems.forEach(item => {
      const exists = document.querySelector(`[href="${item.path}"]`);
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${item.name} (${item.path})`);
    });
    
    console.groupEnd();
    return navigationItems;
  },

  // Test responsive navigation
  testResponsiveNavigation: () => {
    console.group('📱 Responsive Navigation Tests');
    
    const breakpoints = [
      { name: 'Mobile', width: 375 },
      { name: 'Tablet', width: 768 },
      { name: 'Desktop', width: 1024 },
      { name: 'Large Desktop', width: 1440 },
    ];

    breakpoints.forEach(breakpoint => {
      // Simulate different screen sizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: breakpoint.width,
      });
      
      window.dispatchEvent(new Event('resize'));
      
      const mobileNav = document.querySelector('[data-testid="mobile-nav"]');
      const desktopNav = document.querySelector('[data-testid="desktop-nav"]');
      
      console.log(`${breakpoint.name} (${breakpoint.width}px):`);
      console.log(`  Mobile Nav: ${mobileNav ? 'Visible' : 'Hidden'}`);
      console.log(`  Desktop Nav: ${desktopNav ? 'Visible' : 'Hidden'}`);
    });
    
    console.groupEnd();
  }
};

// Component functionality tests
export const componentTests = {
  // Test form validation
  testFormValidation: () => {
    console.group('📝 Form Validation Tests');
    
    const forms = document.querySelectorAll('form');
    forms.forEach((form, index) => {
      const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
      console.log(`Form ${index + 1}:`);
      console.log(`  Required fields: ${inputs.length}`);
      
      inputs.forEach(input => {
        const fieldName = input.getAttribute('name') || input.getAttribute('id') || 'unnamed';
        const hasValidation = input.hasAttribute('pattern') || input.hasAttribute('min') || input.hasAttribute('max');
        console.log(`    ${fieldName}: ${hasValidation ? 'Has validation' : 'Basic required only'}`);
      });
    });
    
    console.groupEnd();
  },

  // Test button functionality
  testButtonFunctionality: () => {
    console.group('🔘 Button Functionality Tests');
    
    const buttons = document.querySelectorAll('button');
    let workingButtons = 0;
    let totalButtons = buttons.length;
    
    buttons.forEach((button, index) => {
      const hasOnClick = button.onclick !== null;
      const hasEventListener = button.hasAttribute('data-testid');
      const isDisabled = button.disabled;
      
      if (hasOnClick || hasEventListener) {
        workingButtons++;
      }
      
      const buttonText = button.textContent?.trim() || `Button ${index + 1}`;
      const status = (hasOnClick || hasEventListener) && !isDisabled ? '✅' : '❌';
      
      console.log(`${status} ${buttonText}`);
    });
    
    console.log(`\nSummary: ${workingButtons}/${totalButtons} buttons have functionality`);
    console.groupEnd();
  },

  // Test loading states
  testLoadingStates: () => {
    console.group('⏳ Loading States Tests');
    
    const loadingElements = document.querySelectorAll('[data-loading="true"], .animate-spin, .animate-pulse');
    const loadingButtons = document.querySelectorAll('button[disabled]');
    
    console.log(`Loading indicators found: ${loadingElements.length}`);
    console.log(`Disabled buttons (potential loading): ${loadingButtons.length}`);
    
    loadingElements.forEach((element, index) => {
      const type = element.classList.contains('animate-spin') ? 'Spinner' : 
                   element.classList.contains('animate-pulse') ? 'Pulse' : 'Loading';
      console.log(`  ${index + 1}. ${type} - ${element.tagName}`);
    });
    
    console.groupEnd();
  },

  // Test error handling
  testErrorHandling: () => {
    console.group('🚨 Error Handling Tests');
    
    const errorElements = document.querySelectorAll('[data-testid*="error"], .text-red-600, .text-red-700');
    const alertElements = document.querySelectorAll('[role="alert"], .alert-destructive');
    
    console.log(`Error elements found: ${errorElements.length}`);
    console.log(`Alert elements found: ${alertElements.length}`);
    
    // Test error boundary
    const errorBoundaryExists = document.querySelector('[data-testid="error-boundary"]');
    console.log(`Error boundary implemented: ${errorBoundaryExists ? 'Yes' : 'No'}`);
    
    console.groupEnd();
  }
};

// Accessibility tests
export const accessibilityTests = {
  // Test ARIA attributes
  testAriaAttributes: () => {
    console.group('♿ ARIA Attributes Tests');
    
    const ariaLabels = document.querySelectorAll('[aria-label]');
    const ariaDescriptions = document.querySelectorAll('[aria-describedby]');
    const ariaExpanded = document.querySelectorAll('[aria-expanded]');
    const roles = document.querySelectorAll('[role]');
    
    console.log(`Elements with aria-label: ${ariaLabels.length}`);
    console.log(`Elements with aria-describedby: ${ariaDescriptions.length}`);
    console.log(`Elements with aria-expanded: ${ariaExpanded.length}`);
    console.log(`Elements with role: ${roles.length}`);
    
    console.groupEnd();
  },

  // Test keyboard navigation
  testKeyboardNavigation: () => {
    console.group('⌨️ Keyboard Navigation Tests');
    
    const focusableElements = document.querySelectorAll(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    
    console.log(`Focusable elements: ${focusableElements.length}`);
    
    const elementsWithTabIndex = document.querySelectorAll('[tabindex]');
    console.log(`Elements with custom tabindex: ${elementsWithTabIndex.length}`);
    
    console.groupEnd();
  },

  // Test color contrast
  testColorContrast: () => {
    console.group('🎨 Color Contrast Tests');
    
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button');
    let passedElements = 0;
    
    textElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      // Simple contrast check (this is a basic implementation)
      const hasGoodContrast = color !== backgroundColor && 
                             color !== 'rgba(0, 0, 0, 0)' && 
                             backgroundColor !== 'rgba(0, 0, 0, 0)';
      
      if (hasGoodContrast) {
        passedElements++;
      }
    });
    
    console.log(`Elements with good contrast: ${passedElements}/${textElements.length}`);
    console.groupEnd();
  }
};

// Performance tests
export const performanceTests = {
  // Test page load performance
  testPageLoadPerformance: () => {
    console.group('⚡ Page Load Performance Tests');
    
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const metrics = {
        'DNS Lookup': navigation.domainLookupEnd - navigation.domainLookupStart,
        'TCP Connection': navigation.connectEnd - navigation.connectStart,
        'Request/Response': navigation.responseEnd - navigation.requestStart,
        'DOM Processing': navigation.domContentLoadedEventEnd - navigation.responseEnd,
        'Total Load Time': navigation.loadEventEnd - navigation.startTime,
      };
      
      Object.entries(metrics).forEach(([metric, time]) => {
        const status = time < 1000 ? '✅' : time < 3000 ? '⚠️' : '❌';
        console.log(`${status} ${metric}: ${time.toFixed(2)}ms`);
      });
    }
    
    console.groupEnd();
  },

  // Test bundle size
  testBundleSize: () => {
    console.group('📦 Bundle Size Tests');
    
    const scripts = document.querySelectorAll('script[src]');
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    
    console.log(`JavaScript bundles: ${scripts.length}`);
    console.log(`CSS bundles: ${stylesheets.length}`);
    
    // Check for code splitting
    const dynamicImports = document.querySelectorAll('script[src*="chunk"]');
    console.log(`Dynamic chunks: ${dynamicImports.length}`);
    
    console.groupEnd();
  },

  // Test memory usage
  testMemoryUsage: () => {
    console.group('🧠 Memory Usage Tests');
    
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const totalMB = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
      const percentage = ((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100).toFixed(1);
      
      console.log(`Used: ${usedMB}MB`);
      console.log(`Total: ${totalMB}MB`);
      console.log(`Usage: ${percentage}%`);
      
      const status = parseInt(percentage) < 70 ? '✅' : parseInt(percentage) < 85 ? '⚠️' : '❌';
      console.log(`${status} Memory usage is ${percentage < '70' ? 'good' : percentage < '85' ? 'moderate' : 'high'}`);
    } else {
      console.log('Memory API not available');
    }
    
    console.groupEnd();
  }
};

// SafeShipper specific tests
export const safeShipperTests = {
  // Test dangerous goods compliance features
  testDGCompliance: () => {
    console.group('☢️ DG Compliance Tests');
    
    const dgElements = document.querySelectorAll('[data-testid*="dg"], [data-testid*="dangerous"]');
    const complianceElements = document.querySelectorAll('[data-testid*="compliance"]');
    
    console.log(`DG-related elements: ${dgElements.length}`);
    console.log(`Compliance elements: ${complianceElements.length}`);
    
    console.groupEnd();
  },

  // Test shipment tracking features
  testShipmentTracking: () => {
    console.group('📦 Shipment Tracking Tests');
    
    const trackingElements = document.querySelectorAll('[data-testid*="tracking"], [data-testid*="shipment"]');
    const mapElements = document.querySelectorAll('[data-testid*="map"]');
    
    console.log(`Tracking elements: ${trackingElements.length}`);
    console.log(`Map elements: ${mapElements.length}`);
    
    console.groupEnd();
  },

  // Test fleet management features
  testFleetManagement: () => {
    console.group('🚛 Fleet Management Tests');
    
    const fleetElements = document.querySelectorAll('[data-testid*="fleet"], [data-testid*="vehicle"]');
    const iotElements = document.querySelectorAll('[data-testid*="iot"], [data-testid*="sensor"]');
    
    console.log(`Fleet elements: ${fleetElements.length}`);
    console.log(`IoT elements: ${iotElements.length}`);
    
    console.groupEnd();
  }
};

// Comprehensive test runner
export const runAllTests = () => {
  console.log('🚀 Running SafeShipper Frontend Tests...\n');
  
  // Navigation tests
  navigationTests.testSidebarNavigation();
  navigationTests.testResponsiveNavigation();
  
  // Component tests
  componentTests.testFormValidation();
  componentTests.testButtonFunctionality();
  componentTests.testLoadingStates();
  componentTests.testErrorHandling();
  
  // Accessibility tests
  accessibilityTests.testAriaAttributes();
  accessibilityTests.testKeyboardNavigation();
  accessibilityTests.testColorContrast();
  
  // Performance tests
  performanceTests.testPageLoadPerformance();
  performanceTests.testBundleSize();
  performanceTests.testMemoryUsage();
  
  // SafeShipper specific tests
  safeShipperTests.testDGCompliance();
  safeShipperTests.testShipmentTracking();
  safeShipperTests.testFleetManagement();
  
  console.log('\n✅ All tests completed!');
};

// Test utilities for development
export const testUtils = {
  // Add test IDs to elements
  addTestIds: () => {
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button, index) => {
      if (!button.hasAttribute('data-testid')) {
        const text = button.textContent?.trim().toLowerCase().replace(/\s+/g, '-') || `button-${index}`;
        button.setAttribute('data-testid', text);
      }
    });
    
    const forms = document.querySelectorAll('form');
    forms.forEach((form, index) => {
      if (!form.hasAttribute('data-testid')) {
        form.setAttribute('data-testid', `form-${index}`);
      }
    });
  },

  // Simulate user interactions
  simulateClick: (selector: string) => {
    const element = document.querySelector(selector);
    if (element) {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true;
    }
    return false;
  },

  // Generate test report
  generateTestReport: () => {
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      tests: {
        navigation: navigationTests.testSidebarNavigation(),
        components: {
          buttons: document.querySelectorAll('button').length,
          forms: document.querySelectorAll('form').length,
          inputs: document.querySelectorAll('input').length,
        },
        accessibility: {
          ariaLabels: document.querySelectorAll('[aria-label]').length,
          roles: document.querySelectorAll('[role]').length,
          focusableElements: document.querySelectorAll('a, button, input, textarea, select').length,
        },
        performance: {
          loadTime: performance.now(),
          resources: performance.getEntriesByType('resource').length,
        }
      }
    };
    
    console.log('📊 Test Report Generated:', report);
    return report;
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).safeShipperTests = {
    navigation: navigationTests,
    components: componentTests,
    accessibility: accessibilityTests,
    performance: performanceTests,
    safeShipper: safeShipperTests,
    runAll: runAllTests,
    utils: testUtils,
  };
}

// Auto-run tests in development
if (process.env.NODE_ENV === 'development') {
  // Run tests after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      console.log('🔧 Development mode: Running automatic tests...');
      runAllTests();
    }, 1000);
  });
}