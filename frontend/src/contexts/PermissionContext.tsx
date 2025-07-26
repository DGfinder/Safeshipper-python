"use client";

import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { useAuth } from "@/shared/hooks/use-auth";

/**
 * SafeShipper Permission System
 * 
 * This module implements the unified permission system for SafeShipper's frontend,
 * following the "Build Once, Render for Permissions" architectural pattern.
 * 
 * Core Philosophy:
 * - Never create separate components for different user roles
 * - Build unified components that conditionally render based on granular permissions
 * - Single source of truth for all permission logic
 * 
 * @example
 * ```typescript
 * // Component usage
 * function FeatureComponent() {
 *   const { can, hasAnyRole } = usePermissions();
 *   
 *   return (
 *     <div>
 *       <BaseFeature />
 *       {can('feature.advanced') && <AdvancedFeature />}
 *       {hasAnyRole(['admin', 'manager']) && <AdminControls />}
 *     </div>
 *   );
 * }
 * 
 * // Navigation usage
 * const navigationItem = {
 *   name: "Fleet Management",
 *   href: "/fleet",
 *   requiredPermission: "fleet.management"
 * };
 * ```
 */

/**
 * Permission strings follow the pattern: domain.action.scope?
 * 
 * Examples:
 * - "user.view" - View users
 * - "fleet.analytics.export" - Export fleet analytics  
 * - "shipments.view.own" - View own shipments only
 * 
 * Permission Categories:
 * - Navigation: dashboard, operations, search
 * - Fleet: vehicle, fleet, driver management
 * - Shipments: shipment operations and tracking
 * - Safety: SDS, compliance, emergency procedures
 * - Analytics: reports, insights, advanced analytics
 * - Administration: users, settings, system management
 */
type Permission = 
  // Fleet Management
  | "vehicle.view"                    // View vehicle information
  | "vehicle.create"                  // Create new vehicles
  | "vehicle.edit"                    // Edit vehicle details
  | "vehicle.delete"                  // Delete vehicles
  | "vehicle.bulk_edit"              // Bulk edit operations
  | "fleet.analytics.view"           // View fleet analytics
  | "fleet.analytics.export"         // Export analytics data
  | "fleet.analytics.advanced"       // Advanced analytics features
  | "fleet.compliance.view"          // View compliance status
  | "fleet.compliance.edit"          // Edit compliance settings
  | "fleet.compliance.override"      // Override compliance restrictions
  | "fleet.maintenance.view"         // View maintenance schedules
  | "fleet.maintenance.schedule"     // Schedule maintenance
  | "fleet.maintenance.approve"      // Approve maintenance requests
  | "driver.assign"                  // Assign drivers to vehicles
  | "driver.performance.view"        // View driver performance data
  
  // Navigation & Core Features
  | "dashboard.view"                 // Access main dashboard
  | "operations.center.view"         // Access operations center
  | "search.view"                    // Use search functionality
  | "shipments.view.all"             // View all shipments
  | "shipments.view.own"             // View own shipments only
  | "shipments.manifest.upload"     // Upload shipment manifests
  | "erp.integration.view"           // Access ERP integration
  | "api.gateway.view"               // Access API gateway
  | "developer.portal.view"          // Access developer portal
  | "iot.monitoring.view"            // View IoT monitoring data
  
  // Safety & Compliance
  | "safety.compliance.view"         // View safety compliance data
  | "emergency.procedures.view"      // Access emergency procedures
  | "incidents.view"                 // View incident reports
  | "training.view"                  // Access training materials
  | "inspections.view"               // View inspection reports
  | "audits.view"                    // View audit reports
  | "sds.library.view"               // Access SDS library
  | "dg.checker.view"                // Use dangerous goods checker
  | "sds.upload"                     // Upload SDS documents
  | "sds.emergency.info"             // Access emergency SDS information
  | "sds.bulk.operations"            // Perform bulk SDS operations
  | "sds.version.control"            // Manage SDS versions
  | "sds.compliance.analytics"       // View SDS compliance analytics
  | "sds.mobile.interface"           // Access mobile SDS interface
  | "sds.emergency.responder"        // Emergency responder SDS access
  | "sds.mode.selection"             // Switch between interface modes (admin/manager)
  | "sds.advanced.search"            // Use advanced SDS search features
  
  // Analytics & Reporting
  | "ai.insights.view"               // View AI-generated insights
  | "risk.analytics.view"            // View risk analytics
  | "track.shipment.view"            // Track shipment status
  | "reports.view"                   // View reports
  | "analytics.advanced.view"        // Access advanced analytics
  | "analytics.full.access"          // Full analytics access
  | "analytics.insights"             // Analytics insights
  | "analytics.operational"          // Operational analytics
  | "supply.chain.analytics"         // Supply chain analytics
  | "insurance.analytics"            // Insurance analytics
  | "route.optimization"             // Route optimization tools
  | "digital.twin.view"              // View digital twin data
  
  // Document Generation & Management
  | "documents.generate.shipment_report"     // Generate shipment reports
  | "documents.generate.compliance_certificate" // Generate compliance certificates
  | "documents.generate.dg_manifest"         // Generate dangerous goods manifests
  | "documents.generate.batch"               // Generate multiple documents at once
  | "documents.view.all"                     // View all document types
  | "documents.download.all"                 // Download any document type
  | "documents.audit.trail"                  // Include audit trails in documents
  
  // Customer & Portal Management  
  | "customer.portal.admin"          // Administer customer portal
  | "customer.portal.tracking"       // Track via customer portal
  
  // System Administration
  | "users.manage"                   // Manage users
  | "users.view"                     // View user information
  | "users.create"                   // Create new users
  | "users.edit"                     // Edit user details
  | "users.delete"                   // Delete users
  | "users.edit.role"                // Edit user roles
  | "users.edit.status"              // Edit user status (active/inactive)
  | "users.edit.permissions"         // Edit user permissions
  | "users.assign.manager"           // Assign manager role
  | "users.assign.admin"             // Assign admin role
  | "users.view.sensitive"           // View sensitive user data
  | "customers.manage"               // Manage customers
  | "settings.manage"                // Manage system settings
  | "fleet.management"               // Overall fleet management
  | "shipment.creation"              // Create shipments
  | "shipment.editing"               // Edit shipments
  | "user.management"                // User management (legacy)
  | "audit.logs";                    // View audit logs

/**
 * User roles in the SafeShipper system, ordered by hierarchy level.
 * Each role inherits permissions from lower-level roles.
 * 
 * Role Hierarchy: viewer ⊂ driver ⊂ operator ⊂ manager ⊂ admin
 */
type Role = "viewer" | "driver" | "operator" | "manager" | "admin";

/**
 * Permission mappings for each role.
 * 
 * Role Breakdown:
 * - viewer (12 permissions): Read-only access to basic features
 * - driver (16 permissions): Own shipments + emergency information
 * - operator (29 permissions): Operational control + SDS management  
 * - manager (50 permissions): Analytics + user management
 * - admin (70 permissions): Complete system access
 * 
 * Note: Each role inherits all permissions from lower roles.
 */
const rolePermissions: Record<Role, Permission[]> = {
  viewer: [
    "dashboard.view",
    "search.view",
    "vehicle.view",
    "fleet.analytics.view",
    "fleet.compliance.view",
    "fleet.maintenance.view",
    "safety.compliance.view",
    "emergency.procedures.view",
    "sds.library.view",
    "dg.checker.view",
    "track.shipment.view",
    "users.view",
    "documents.view.all"
  ],
  driver: [
    "dashboard.view",
    "search.view",
    "vehicle.view",
    "fleet.analytics.view",
    "fleet.compliance.view",
    "fleet.maintenance.view",
    "driver.performance.view",
    "shipments.view.own",
    "safety.compliance.view",
    "emergency.procedures.view",
    "incidents.view",
    "training.view",
    "sds.library.view",
    "dg.checker.view",
    "track.shipment.view",
    "sds.emergency.info",
    "sds.mobile.interface",
    "sds.emergency.responder",
    "customer.portal.tracking",
    "users.view",
    "documents.view.all",
    "documents.download.all",
    "documents.generate.shipment_report"
  ],
  operator: [
    "dashboard.view",
    "operations.center.view",
    "search.view",
    "vehicle.view",
    "vehicle.edit",
    "fleet.analytics.view",
    "fleet.analytics.export",
    "fleet.compliance.view",
    "fleet.compliance.edit",
    "fleet.maintenance.view",
    "fleet.maintenance.schedule",
    "driver.assign",
    "driver.performance.view",
    "shipments.view.all",
    "shipments.view.own",
    "iot.monitoring.view",
    "safety.compliance.view",
    "emergency.procedures.view",
    "incidents.view",
    "training.view",
    "sds.library.view",
    "dg.checker.view",
    "track.shipment.view",
    "customer.portal.admin",
    "sds.upload",
    "sds.emergency.info",
    "sds.mobile.interface",
    "sds.emergency.responder",
    "sds.bulk.operations",
    "sds.advanced.search",
    "analytics.operational",
    "customer.portal.tracking",
    "fleet.management",
    "shipment.creation",
    "shipment.editing",
    "users.view",
    "users.edit",
    "documents.view.all",
    "documents.download.all",
    "documents.generate.shipment_report",
    "documents.generate.dg_manifest"
  ],
  manager: [
    "dashboard.view",
    "operations.center.view",
    "search.view",
    "vehicle.view",
    "vehicle.create",
    "vehicle.edit",
    "vehicle.delete",
    "vehicle.bulk_edit",
    "fleet.analytics.view",
    "fleet.analytics.export",
    "fleet.analytics.advanced",
    "fleet.compliance.view",
    "fleet.compliance.edit",
    "fleet.compliance.override",
    "fleet.maintenance.view",
    "fleet.maintenance.schedule",
    "fleet.maintenance.approve",
    "driver.assign",
    "driver.performance.view",
    "shipments.view.all",
    "shipments.view.own",
    "shipments.manifest.upload",
    "erp.integration.view",
    "api.gateway.view",
    "developer.portal.view",
    "iot.monitoring.view",
    "safety.compliance.view",
    "emergency.procedures.view",
    "incidents.view",
    "training.view",
    "inspections.view",
    "audits.view",
    "sds.library.view",
    "dg.checker.view",
    "ai.insights.view",
    "risk.analytics.view",
    "track.shipment.view",
    "customer.portal.admin",
    "reports.view",
    "analytics.advanced.view",
    "supply.chain.analytics",
    "insurance.analytics",
    "route.optimization",
    "digital.twin.view",
    "users.manage",
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",
    "users.edit.role",
    "users.edit.status",
    "users.assign.manager",
    "users.view.sensitive",
    "customers.manage",
    "settings.manage",
    "sds.upload",
    "sds.emergency.info",
    "sds.mobile.interface",
    "sds.emergency.responder",
    "sds.bulk.operations",
    "sds.version.control",
    "sds.compliance.analytics",
    "sds.advanced.search",
    "sds.mode.selection",
    "analytics.insights",
    "analytics.operational",
    "customer.portal.tracking",
    "fleet.management",
    "shipment.creation",
    "shipment.editing",
    "audit.logs",
    "documents.view.all",
    "documents.download.all",
    "documents.generate.shipment_report",
    "documents.generate.dg_manifest",
    "documents.generate.compliance_certificate",
    "documents.generate.batch",
    "documents.audit.trail"
  ],
  admin: [
    // Admin has all permissions
    "dashboard.view",
    "operations.center.view",
    "search.view",
    "vehicle.view",
    "vehicle.create",
    "vehicle.edit",
    "vehicle.delete",
    "vehicle.bulk_edit",
    "fleet.analytics.view",
    "fleet.analytics.export",
    "fleet.analytics.advanced",
    "fleet.compliance.view",
    "fleet.compliance.edit",
    "fleet.compliance.override",
    "fleet.maintenance.view",
    "fleet.maintenance.schedule",
    "fleet.maintenance.approve",
    "driver.assign",
    "driver.performance.view",
    "shipments.view.all",
    "shipments.view.own",
    "shipments.manifest.upload",
    "erp.integration.view",
    "api.gateway.view",
    "developer.portal.view",
    "iot.monitoring.view",
    "safety.compliance.view",
    "emergency.procedures.view",
    "incidents.view",
    "training.view",
    "inspections.view",
    "audits.view",
    "sds.library.view",
    "dg.checker.view",
    "ai.insights.view",
    "risk.analytics.view",
    "track.shipment.view",
    "customer.portal.admin",
    "reports.view",
    "analytics.advanced.view",
    "supply.chain.analytics",
    "insurance.analytics",
    "route.optimization",
    "digital.twin.view",
    "users.manage",
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",
    "users.edit.role",
    "users.edit.status",
    "users.edit.permissions",
    "users.assign.manager",
    "users.assign.admin",
    "users.view.sensitive",
    "customers.manage",
    "settings.manage",
    "sds.upload",
    "sds.emergency.info",
    "sds.mobile.interface",
    "sds.emergency.responder",
    "sds.bulk.operations",
    "sds.version.control",
    "sds.compliance.analytics",
    "sds.advanced.search",
    "sds.mode.selection",
    "analytics.full.access",
    "analytics.insights",
    "analytics.operational",
    "customer.portal.tracking",
    "fleet.management",
    "shipment.creation",
    "shipment.editing",
    "user.management",
    "audit.logs",
    "documents.view.all",
    "documents.download.all",
    "documents.generate.shipment_report",
    "documents.generate.compliance_certificate",
    "documents.generate.dg_manifest",
    "documents.generate.batch",
    "documents.audit.trail"
  ]
};

/**
 * Permission context interface providing all permission checking capabilities.
 * 
 * This interface follows the principle of providing both granular permission
 * checks and convenient helper methods for common permission patterns.
 */
interface PermissionContextType {
  // Core permission checking
  /** Check if user has a specific permission */
  can: (permission: Permission) => boolean;
  
  /** Check if user has a specific role */
  hasRole: (role: Role) => boolean;
  
  /** Check if user has any of the provided roles */
  hasAnyRole: (roles: Role[]) => boolean;
  
  // Advanced permission logic
  /** Check if user has any of the provided permissions */
  hasAnyPermission: (permissions: Permission[]) => boolean;
  
  /** Check if user has all of the provided permissions */
  hasAllPermissions: (permissions: Permission[]) => boolean;
  
  // User context
  /** Current user's role */
  userRole: Role | null;
  
  /** All permissions granted to the current user */
  permissions: Permission[];
  
  // Convenience helpers for common permission patterns
  /** Can manage users (create, edit, delete) */
  canManageUsers: boolean;
  
  /** Can view any analytics (basic, insights, or advanced) */
  canViewAnalytics: boolean;
  
  /** Can manage fleet operations */
  canManageFleet: boolean;
  
  /** Can access emergency SDS information */
  canAccessEmergencyInfo: boolean;
  
  /** Can upload SDS documents */
  canUploadSDS: boolean;
  
  /** Can generate any document type */
  canGenerateDocuments: boolean;
  
  /** Can generate dangerous goods related documents */
  canGenerateDGDocuments: boolean;
  
  /** Can generate compliance certificates */
  canGenerateComplianceCertificates: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

/**
 * Permission Provider Component
 * 
 * Provides the permission context to all child components. This should wrap
 * the entire application or at least all components that need permission checking.
 * 
 * @param children - React children that will have access to permission context
 * 
 * @example
 * ```typescript
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <PermissionProvider>
 *         <AppContent />
 *       </PermissionProvider>
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  /**
   * Extract user role from authenticated user data.
   * Defaults to 'viewer' for unauthenticated users or users without a role.
   */
  const userRole = useMemo(() => {
    if (!user) return null;
    // Extract role from user object, with fallback to viewer
    return (user as any).role || 'viewer';
  }, [user]);

  /**
   * Get all permissions for the current user's role.
   * Uses memoization for performance optimization.
   */
  const permissions = useMemo(() => {
    if (!userRole) return [];
    return rolePermissions[userRole as Role] || [];
  }, [userRole]);

  /**
   * Check if the current user has a specific permission.
   * 
   * @param permission - The permission string to check
   * @returns true if user has the permission, false otherwise
   */
  const can = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  /**
   * Check if the current user has a specific role.
   * 
   * @param role - The role to check for
   * @returns true if user has the exact role, false otherwise
   */
  const hasRole = (role: Role): boolean => {
    return userRole === role;
  };

  /**
   * Check if the current user has any of the provided roles.
   * 
   * @param roles - Array of roles to check
   * @returns true if user has any of the roles, false otherwise
   */
  const hasAnyRole = (roles: Role[]): boolean => {
    return roles.includes(userRole as Role);
  };

  /**
   * Check if the current user has any of the provided permissions.
   * 
   * @param perms - Array of permissions to check
   * @returns true if user has any of the permissions, false otherwise
   */
  const hasAnyPermission = (perms: Permission[]): boolean => {
    return perms.some(permission => can(permission));
  };

  /**
   * Check if the current user has all of the provided permissions.
   * 
   * @param perms - Array of permissions to check
   * @returns true if user has all permissions, false otherwise
   */
  const hasAllPermissions = (perms: Permission[]): boolean => {
    return perms.every(permission => can(permission));
  };

  // Convenience permission checkers - memoized for performance
  const canManageUsers = useMemo(() => can("user.management"), [permissions]);
  const canViewAnalytics = useMemo(() => 
    hasAnyPermission(["analytics.full.access", "analytics.insights", "analytics.operational"]),
    [permissions]
  );
  const canManageFleet = useMemo(() => can("fleet.management"), [permissions]);
  const canAccessEmergencyInfo = useMemo(() => can("sds.emergency.info"), [permissions]);
  const canUploadSDS = useMemo(() => can("sds.upload"), [permissions]);
  const canGenerateDocuments = useMemo(() => 
    hasAnyPermission([
      "documents.generate.shipment_report", 
      "documents.generate.compliance_certificate", 
      "documents.generate.dg_manifest"
    ]),
    [permissions]
  );
  const canGenerateDGDocuments = useMemo(() => 
    hasAnyPermission(["documents.generate.dg_manifest", "documents.generate.compliance_certificate"]),
    [permissions]
  );
  const canGenerateComplianceCertificates = useMemo(() => 
    can("documents.generate.compliance_certificate"), 
    [permissions]
  );

  const value: PermissionContextType = {
    can,
    hasRole,
    hasAnyRole,
    userRole: userRole as Role | null,
    permissions,
    hasAnyPermission,
    hasAllPermissions,
    canManageUsers,
    canViewAnalytics,
    canManageFleet,
    canAccessEmergencyInfo,
    canUploadSDS,
    canGenerateDocuments,
    canGenerateDGDocuments,
    canGenerateComplianceCertificates
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

/**
 * Hook to access the permission context.
 * 
 * Must be used within a PermissionProvider component.
 * 
 * @returns PermissionContextType with all permission checking methods
 * @throws Error if used outside of PermissionProvider
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { can, hasAnyRole, canViewAnalytics } = usePermissions();
 *   
 *   if (!can('feature.view')) {
 *     return <AccessDenied />;
 *   }
 *   
 *   return (
 *     <div>
 *       <FeatureContent />
 *       {can('feature.edit') && <EditButton />}
 *       {hasAnyRole(['admin', 'manager']) && <AdminPanel />}
 *       {canViewAnalytics && <AnalyticsWidget />}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

/**
 * Helper component for conditional rendering based on permissions.
 * 
 * Renders children only if the user has the specified permission,
 * otherwise renders the fallback content (or nothing).
 * 
 * @example
 * ```typescript
 * <Can permission="users.manage">
 *   <UserManagementPanel />
 * </Can>
 * 
 * <Can permission="analytics.view" fallback={<AccessDenied />}>
 *   <AnalyticsPanel />
 * </Can>
 * ```
 */
interface CanProps {
  /** The permission required to render the children */
  permission: Permission;
  /** Content to render if permission is granted */
  children: ReactNode;
  /** Content to render if permission is denied (optional) */
  fallback?: ReactNode;
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const { can } = usePermissions();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Helper component for conditional rendering based on roles.
 * 
 * Renders children only if the user has the specified role(s),
 * otherwise renders the fallback content (or nothing).
 * 
 * @example
 * ```typescript
 * <HasRole role="admin">
 *   <AdminPanel />
 * </HasRole>
 * 
 * <HasRole role={["admin", "manager"]} fallback={<AccessDenied />}>
 *   <ManagementTools />
 * </HasRole>
 * ```
 */
interface HasRoleProps {
  /** The role(s) required to render the children */
  role: Role | Role[];
  /** Content to render if role check passes */
  children: ReactNode;
  /** Content to render if role check fails (optional) */
  fallback?: ReactNode;
}

export function HasRole({ role, children, fallback = null }: HasRoleProps) {
  const { hasRole, hasAnyRole } = usePermissions();
  const hasAccess = Array.isArray(role) ? hasAnyRole(role) : hasRole(role);
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}