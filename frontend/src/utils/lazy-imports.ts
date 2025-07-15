import { lazy } from 'react';

// Utility function for lazy loading with error handling
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  return lazy(async () => {
    try {
      const module = await importFunc();
      return module;
    } catch (error) {
      console.error('Error loading component:', error);
      
      // Return fallback component if import fails
      if (fallback) {
        return { default: fallback };
      }
      
      // Return a basic error component
      return {
        default: (() => (
          <div className="p-4 text-center text-red-600">
            <p>Error loading component. Please try refreshing the page.</p>
          </div>
        )) as T
      };
    }
  });
}

// Lazy loaded components with proper error handling
export const LazyComponents = {
  // Dashboard Components
  AIInsightsDashboard: createLazyComponent(
    () => import('@/components/dashboard/AIInsightsDashboard'),
    () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
  ),

  // Fleet Management
  FleetMap: createLazyComponent(
    () => import('@/components/maps/FleetMap').then(mod => ({ default: mod.FleetMap })),
    () => <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
  ),

  // Shipment Tracking
  ShipmentTrackingMap: createLazyComponent(
    () => import('@/components/maps/ShipmentTrackingMap').then(mod => ({ default: mod.ShipmentTrackingMap })),
    () => <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
  ),

  // Load Planning
  LoadPlanner3D: createLazyComponent(
    () => import('@/components/load-planner/LoadPlanner3D'),
    () => <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
  ),

  // ERP Integration
  ERPSystemsDashboard: createLazyComponent(
    () => import('@/components/erp/ERPSystemsDashboard'),
    () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
  ),

  ConnectionWizard: createLazyComponent(
    () => import('@/components/erp/ConnectionWizard'),
    () => <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
  ),

  FieldMappingStudio: createLazyComponent(
    () => import('@/components/erp/FieldMappingStudio'),
    () => <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
  ),

  // SDS Management
  SDSViewer: createLazyComponent(
    () => import('@/components/sds/SDSViewer'),
    () => <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
  ),

  SDSAdvancedSearch: createLazyComponent(
    () => import('@/components/sds/SDSAdvancedSearch'),
    () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
  ),

  // Emergency Procedures
  EPGViewer: createLazyComponent(
    () => import('@/components/epg/EPGViewer'),
    () => <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
  ),

  EPGSystemMonitor: createLazyComponent(
    () => import('@/components/epg/EPGSystemMonitor'),
    () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
  ),

  // Testing Components
  ManifestWorkflowTest: createLazyComponent(
    () => import('@/components/testing/ManifestWorkflowTest'),
    () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
  ),

  // PDF Components
  PDFViewer: createLazyComponent(
    () => import('@/components/pdf/PDFViewer'),
    () => <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
  ),

  // Safety Equipment
  SafetyEquipmentManager: createLazyComponent(
    () => import('@/components/safety-equipment/SafetyEquipmentManager'),
    () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
  ),

  // Inspections
  HazardInspection: createLazyComponent(
    () => import('@/components/inspections/HazardInspection'),
    () => <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
  ),

  // Document Generation
  DocumentGenerator: createLazyComponent(
    () => import('@/components/documents/DocumentGenerator'),
    () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
  ),

  // Proof of Delivery
  ProofOfDelivery: createLazyComponent(
    () => import('@/components/delivery/ProofOfDelivery'),
    () => <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
  ),

  // Multi-Factor Authentication
  MFASetup: createLazyComponent(
    () => import('@/components/mfa/MFASetup'),
    () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
  ),

  MFAVerification: createLazyComponent(
    () => import('@/components/mfa/MFAVerification'),
    () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
  ),

  // User Management
  UserCreateForm: createLazyComponent(
    () => import('@/components/users/UserCreateForm'),
    () => <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
  ),

  UserEditForm: createLazyComponent(
    () => import('@/components/users/UserEditForm'),
    () => <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
  ),

  // Customer Components
  CustomerDashboard: createLazyComponent(
    () => import('@/components/customer/CustomerDashboard'),
    () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
  ),
};

// Preload important components
export const preloadComponents = {
  dashboard: () => {
    // Preload dashboard components
    import('@/components/dashboard/AIInsightsDashboard');
    import('@/components/maps/FleetMap');
  },
  
  fleet: () => {
    // Preload fleet components
    import('@/components/maps/FleetMap');
    import('@/components/maps/ShipmentTrackingMap');
  },
  
  shipments: () => {
    // Preload shipment components
    import('@/components/maps/ShipmentTrackingMap');
    import('@/components/load-planner/LoadPlanner3D');
  },
  
  sds: () => {
    // Preload SDS components
    import('@/components/sds/SDSViewer');
    import('@/components/sds/SDSAdvancedSearch');
  },
  
  erp: () => {
    // Preload ERP components
    import('@/components/erp/ERPSystemsDashboard');
    import('@/components/erp/ConnectionWizard');
    import('@/components/erp/FieldMappingStudio');
  },
};

// Route-based preloading
export const preloadForRoute = (route: string) => {
  switch (route) {
    case '/dashboard':
      preloadComponents.dashboard();
      break;
    case '/fleet':
      preloadComponents.fleet();
      break;
    case '/shipments':
      preloadComponents.shipments();
      break;
    case '/sds-library':
    case '/sds-enhanced':
      preloadComponents.sds();
      break;
    case '/erp-integration':
      preloadComponents.erp();
      break;
    default:
      // Preload commonly used components
      preloadComponents.dashboard();
      break;
  }
};

// Component size tracking for optimization
export const componentSizes = {
  small: ['forms', 'buttons', 'badges'],
  medium: ['tables', 'cards', 'modals'],
  large: ['maps', 'charts', 'viewers'],
  xlarge: ['3d-components', 'pdf-viewers', 'video-players'],
};

// Performance monitoring for lazy loading
export const trackComponentLoad = (componentName: string, loadTime: number) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Component ${componentName} loaded in ${loadTime}ms`);
  }
  
  // In production, you could send this to your analytics service
  // analytics.track('component_load', { component: componentName, load_time: loadTime });
};

// Utility to measure component load time
export const withLoadTimeTracking = <T extends React.ComponentType<any>>(
  componentName: string,
  Component: T
): T => {
  const WrappedComponent = (props: any) => {
    const startTime = performance.now();
    
    React.useEffect(() => {
      const endTime = performance.now();
      trackComponentLoad(componentName, endTime - startTime);
    }, []);
    
    return React.createElement(Component, props);
  };
  
  return WrappedComponent as T;
};