import { useAuth } from "./use-auth";

// Define available user roles
export type UserRole = 
  | 'ADMIN' 
  | 'MANAGER' 
  | 'SUPERVISOR'
  | 'DRIVER' 
  | 'CUSTOMER' 
  | 'EMERGENCY_RESPONDER'
  | 'AUDITOR'
  | 'USER';

// Define features that can be controlled by role
export type FeatureKey = 
  | 'sds_upload'
  | 'sds_emergency_info'
  | 'sds_bulk_operations'
  | 'sds_version_control'
  | 'sds_compliance_analytics'
  | 'analytics_full_access'
  | 'analytics_insights'
  | 'analytics_operational'
  | 'customer_portal_admin'
  | 'customer_portal_tracking'
  | 'fleet_management'
  | 'shipment_creation'
  | 'shipment_editing'
  | 'user_management'
  | 'audit_logs';

// Define role-based feature access matrix
const ROLE_PERMISSIONS: Record<UserRole, FeatureKey[]> = {
  ADMIN: [
    'sds_upload',
    'sds_emergency_info', 
    'sds_bulk_operations',
    'sds_version_control',
    'sds_compliance_analytics',
    'analytics_full_access',
    'analytics_insights',
    'analytics_operational',
    'customer_portal_admin',
    'customer_portal_tracking',
    'fleet_management',
    'shipment_creation',
    'shipment_editing',
    'user_management',
    'audit_logs'
  ],
  MANAGER: [
    'sds_upload',
    'sds_emergency_info',
    'sds_bulk_operations',
    'sds_version_control',
    'sds_compliance_analytics',
    'analytics_insights',
    'analytics_operational',
    'customer_portal_admin',
    'customer_portal_tracking',
    'fleet_management',
    'shipment_creation',
    'shipment_editing',
    'audit_logs'
  ],
  SUPERVISOR: [
    'sds_upload',
    'sds_emergency_info',
    'sds_bulk_operations',
    'analytics_operational',
    'customer_portal_tracking',
    'fleet_management',
    'shipment_creation',
    'shipment_editing'
  ],
  DRIVER: [
    'sds_emergency_info',
    'customer_portal_tracking'
  ],
  CUSTOMER: [
    'customer_portal_tracking'
  ],
  EMERGENCY_RESPONDER: [
    'sds_emergency_info'
  ],
  AUDITOR: [
    'sds_compliance_analytics',
    'analytics_insights',
    'audit_logs'
  ],
  USER: [
    'customer_portal_tracking'
  ]
};

// Define role hierarchy for UI display
const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 100,
  MANAGER: 80,
  SUPERVISOR: 60,
  AUDITOR: 50,
  EMERGENCY_RESPONDER: 40,
  DRIVER: 30,
  CUSTOMER: 20,
  USER: 10
};

export interface RoleBasedAccess {
  // Current user's role
  userRole: UserRole;
  
  // Check if user has access to a specific feature
  hasAccess: (feature: FeatureKey) => boolean;
  
  // Check if user has any of the given features
  hasAnyAccess: (features: FeatureKey[]) => boolean;
  
  // Check if user has all of the given features
  hasAllAccess: (features: FeatureKey[]) => boolean;
  
  // Check if user role meets minimum hierarchy level
  hasMinimumRole: (minimumRole: UserRole) => boolean;
  
  // Get all features the user has access to
  getAccessibleFeatures: () => FeatureKey[];
  
  // Check if user is in specific roles
  isAdmin: boolean;
  isManager: boolean;
  isSupervisor: boolean;
  isDriver: boolean;
  isCustomer: boolean;
  isEmergencyResponder: boolean;
  isAuditor: boolean;
  
  // Context helpers for UI
  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canManageFleet: boolean;
  canAccessEmergencyInfo: boolean;
}

export function useRoleBasedAccess(): RoleBasedAccess {
  const { user } = useAuth();
  
  // Get user role with fallback to USER
  const userRole: UserRole = (user?.role as UserRole) || 'USER';
  
  // Get permissions for current role
  const userPermissions = ROLE_PERMISSIONS[userRole] || [];
  
  const hasAccess = (feature: FeatureKey): boolean => {
    return userPermissions.includes(feature);
  };
  
  const hasAnyAccess = (features: FeatureKey[]): boolean => {
    return features.some(feature => hasAccess(feature));
  };
  
  const hasAllAccess = (features: FeatureKey[]): boolean => {
    return features.every(feature => hasAccess(feature));
  };
  
  const hasMinimumRole = (minimumRole: UserRole): boolean => {
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const minimumLevel = ROLE_HIERARCHY[minimumRole] || 0;
    return userLevel >= minimumLevel;
  };
  
  const getAccessibleFeatures = (): FeatureKey[] => {
    return userPermissions;
  };
  
  return {
    userRole,
    hasAccess,
    hasAnyAccess,
    hasAllAccess,
    hasMinimumRole,
    getAccessibleFeatures,
    
    // Role checks
    isAdmin: userRole === 'ADMIN',
    isManager: userRole === 'MANAGER',
    isSupervisor: userRole === 'SUPERVISOR',
    isDriver: userRole === 'DRIVER',
    isCustomer: userRole === 'CUSTOMER',
    isEmergencyResponder: userRole === 'EMERGENCY_RESPONDER',
    isAuditor: userRole === 'AUDITOR',
    
    // Context helpers
    canManageUsers: hasAccess('user_management'),
    canViewAnalytics: hasAnyAccess(['analytics_full_access', 'analytics_insights', 'analytics_operational']),
    canManageFleet: hasAccess('fleet_management'),
    canAccessEmergencyInfo: hasAccess('sds_emergency_info')
  };
}