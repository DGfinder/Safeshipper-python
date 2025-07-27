// environment.ts
// Environment configuration for SafeShipper demo and production modes

export type ApiMode = 'demo' | 'hybrid' | 'production';

export interface EnvironmentConfig {
  apiMode: ApiMode;
  apiUrl: string;
  enableFallback: boolean;
  showDemoIndicators: boolean;
  simulateNetworkDelay: boolean;
  enableTerryMode: boolean; // Special demo features for Terry
}

// Get environment configuration
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    apiMode: (process.env.NEXT_PUBLIC_API_MODE as ApiMode) || 'hybrid',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
    enableFallback: process.env.NEXT_PUBLIC_ENABLE_FALLBACK !== 'false',
    showDemoIndicators: isDevelopment || process.env.NEXT_PUBLIC_SHOW_DEMO_INDICATORS === 'true',
    simulateNetworkDelay: process.env.NEXT_PUBLIC_SIMULATE_DELAY === 'true',
    enableTerryMode: process.env.NEXT_PUBLIC_TERRY_MODE === 'true',
  };
};

// Demo mode utilities
export const isDemoMode = (): boolean => {
  // Disable demo mode in production environment unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ALLOW_DEMO_IN_PRODUCTION !== 'true') {
    return false;
  }
  
  const config = getEnvironmentConfig();
  return config.apiMode === 'demo' || config.apiMode === 'hybrid';
};

export const isProductionMode = (): boolean => {
  const config = getEnvironmentConfig();
  return config.apiMode === 'production';
};

export const shouldShowDemoIndicators = (): boolean => {
  const config = getEnvironmentConfig();
  return config.showDemoIndicators;
};

export const isTerryMode = (): boolean => {
  const config = getEnvironmentConfig();
  return config.enableTerryMode;
};

// Network simulation for realistic demo experience
export const simulateNetworkDelay = async (minMs: number = 500, maxMs: number = 1500): Promise<void> => {
  const config = getEnvironmentConfig();
  if (!config.simulateNetworkDelay) return;
  
  const delay = Math.random() * (maxMs - minMs) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// API endpoint resolver
export const resolveApiEndpoint = (endpoint: string): string => {
  const config = getEnvironmentConfig();
  return `${config.apiUrl}${endpoint}`;
};

// Demo data configuration
export const DEMO_CONFIG = {
  // OutbackHaul Transport company details
  company: {
    name: "OutbackHaul Transport Pty Ltd",
    abn: "54 123 456 789",
    location: "Perth, WA",
    established: "1987"
  },
  
  // Demo security controls
  security: {
    sessionTimeoutMinutes: parseInt(process.env.NEXT_PUBLIC_DEMO_SESSION_TIMEOUT || '60'), // 1 hour default
    maxConcurrentSessions: parseInt(process.env.NEXT_PUBLIC_DEMO_MAX_SESSIONS || '3'),
    restrictedActions: [
      'user_management',
      'system_configuration', 
      'delete_shipments',
      'delete_customers',
      'modify_audit_logs'
    ],
    allowedOperations: [
      'view_shipments',
      'create_shipments', 
      'update_shipments',
      'view_customers',
      'create_customers',
      'update_customers',
      'view_reports',
      'export_data'
    ]
  },
  
  // Demo scenarios for Terry
  scenarios: {
    complianceViolation: {
      shipmentId: "OH-15-2024",
      customerName: "BHP Billiton",
      violationType: "Missing DG Documentation"
    },
    emergencyScenario: {
      shipmentId: "OH-23-2024", 
      customerName: "Fortescue Metals Group",
      scenario: "Hazardous spill response"
    },
    customerShowcase: {
      customerId: "customer-bhpbilliton",
      totalShipments: 89,
      complianceRate: 98.5
    }
  }
} as const;

// Demo security utilities
export const isDemoActionAllowed = (action: string): boolean => {
  if (!isDemoMode()) return true; // Production mode allows all actions based on user permissions
  
  const { restrictedActions, allowedOperations } = DEMO_CONFIG.security;
  
  // Block restricted actions in demo mode
  if (restrictedActions.includes(action as any)) {
    console.warn(`Demo Mode: Action "${action}" is restricted in demo environment`);
    return false;
  }
  
  // Allow explicitly permitted operations
  return allowedOperations.includes(action as any);
};

export const getDemoSessionTimeout = (): number => {
  return DEMO_CONFIG.security.sessionTimeoutMinutes * 60 * 1000; // Convert to milliseconds
};

export const showDemoWarning = (action: string): string => {
  return `Demo Mode: The "${action}" action is restricted in this demonstration environment. In production, this would be available based on your user permissions.`;
};

export const isDemoSessionExpired = (loginTime: number): boolean => {
  if (!isDemoMode()) return false;
  
  const sessionTimeout = getDemoSessionTimeout();
  const currentTime = Date.now();
  
  return (currentTime - loginTime) > sessionTimeout;
};

export default getEnvironmentConfig();