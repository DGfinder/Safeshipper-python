/**
 * Mobile Permission Context
 * Implements the "Build Once, Render for Permissions" architectural pattern for React Native
 * 
 * This is the mobile adaptation of the web PermissionContext, providing
 * unified permission checking across the mobile application.
 */

import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { useAuth } from "./AuthContext";

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
 * - Mobile: mobile-specific permissions
 */
type Permission = 
  // Fleet Management
  | "vehicle.view"                    // View vehicle information
  | "vehicle.create"                  // Create new vehicles
  | "vehicle.edit"                    // Edit vehicle details
  | "fleet.analytics.view"           // View fleet analytics
  | "fleet.compliance.view"          // View compliance status
  | "fleet.maintenance.view"         // View maintenance schedules
  | "driver.performance.view"        // View driver performance data
  
  // Navigation & Core Features
  | "dashboard.view"                 // Access main dashboard
  | "search.view"                    // Use search functionality
  | "shipments.view.all"             // View all shipments
  | "shipments.view.own"             // View own shipments only
  | "shipments.update.status"        // Update shipment status
  | "shipments.pod.capture"          // Capture proof of delivery
  
  // Safety & Compliance
  | "safety.compliance.view"         // View safety compliance data
  | "emergency.procedures.view"      // Access emergency procedures
  | "incidents.report"               // Report incidents
  | "training.view"                  // Access training materials
  | "sds.library.view"               // Access SDS library
  | "dg.checker.view"                // Use dangerous goods checker
  | "sds.emergency.info"             // Access emergency SDS information
  
  // Mobile-Specific Permissions
  | "mobile.location.track"          // Track device location
  | "mobile.camera.access"           // Access device camera
  | "mobile.notifications.receive"   // Receive push notifications
  | "mobile.offline.sync"            // Sync data when offline
  | "mobile.scanner.qr"              // Use QR code scanner
  | "mobile.pod.signature"           // Capture digital signatures
  | "mobile.photos.upload"           // Upload photos
  
  // Document & Reporting
  | "documents.view.all"             // View all document types
  | "documents.download.all"         // Download any document type
  | "documents.generate.shipment_report" // Generate shipment reports
  
  // Customer & Portal Management  
  | "customer.portal.tracking"       // Track via customer portal
  
  // System
  | "users.view"                     // View user information
  | "audit.logs";                    // View audit logs

/**
 * User roles in the SafeShipper mobile system, ordered by hierarchy level.
 * Each role inherits permissions from lower-level roles.
 * 
 * Role Hierarchy: viewer ⊂ driver ⊂ operator ⊂ manager ⊂ admin
 */
type Role = "viewer" | "driver" | "operator" | "manager" | "admin";

/**
 * Permission mappings for each role in the mobile context.
 * 
 * Role Breakdown:
 * - viewer: Read-only access to basic features
 * - driver: Field operations + mobile-specific permissions
 * - operator: Operational control + fleet management
 * - manager: Analytics + user management
 * - admin: Complete system access
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
    "shipments.update.status",
    "shipments.pod.capture",
    "safety.compliance.view",
    "emergency.procedures.view",
    "incidents.report",
    "training.view",
    "sds.library.view",
    "dg.checker.view",
    "sds.emergency.info",
    "customer.portal.tracking",
    "users.view",
    "documents.view.all",
    "documents.download.all",
    "documents.generate.shipment_report",
    // Mobile-specific permissions for drivers
    "mobile.location.track",
    "mobile.camera.access",
    "mobile.notifications.receive",
    "mobile.offline.sync",
    "mobile.scanner.qr",
    "mobile.pod.signature",
    "mobile.photos.upload"
  ],
  operator: [
    "dashboard.view",
    "search.view",
    "vehicle.view",
    "vehicle.edit",
    "fleet.analytics.view",
    "fleet.compliance.view",
    "fleet.maintenance.view",
    "driver.performance.view",
    "shipments.view.all",
    "shipments.view.own",
    "shipments.update.status",
    "shipments.pod.capture",
    "safety.compliance.view",
    "emergency.procedures.view",
    "incidents.report",
    "training.view",
    "sds.library.view",
    "dg.checker.view",
    "sds.emergency.info",
    "customer.portal.tracking",
    "users.view",
    "documents.view.all",
    "documents.download.all",
    "documents.generate.shipment_report",
    // Mobile permissions
    "mobile.location.track",
    "mobile.camera.access",
    "mobile.notifications.receive",
    "mobile.offline.sync",
    "mobile.scanner.qr",
    "mobile.pod.signature",
    "mobile.photos.upload"
  ],
  manager: [
    "dashboard.view",
    "search.view",
    "vehicle.view",
    "vehicle.create",
    "vehicle.edit",
    "fleet.analytics.view",
    "fleet.compliance.view",
    "fleet.maintenance.view",
    "driver.performance.view",
    "shipments.view.all",
    "shipments.view.own",
    "shipments.update.status",
    "shipments.pod.capture",
    "safety.compliance.view",
    "emergency.procedures.view",
    "incidents.report",
    "training.view",
    "sds.library.view",
    "dg.checker.view",
    "sds.emergency.info",
    "customer.portal.tracking",
    "users.view",
    "documents.view.all",
    "documents.download.all",
    "documents.generate.shipment_report",
    "audit.logs",
    // Mobile permissions
    "mobile.location.track",
    "mobile.camera.access",
    "mobile.notifications.receive",
    "mobile.offline.sync",
    "mobile.scanner.qr",
    "mobile.pod.signature",
    "mobile.photos.upload"
  ],
  admin: [
    // Admin has all permissions
    "dashboard.view",
    "search.view",
    "vehicle.view",
    "vehicle.create",
    "vehicle.edit",
    "fleet.analytics.view",
    "fleet.compliance.view",
    "fleet.maintenance.view",
    "driver.performance.view",
    "shipments.view.all",
    "shipments.view.own",
    "shipments.update.status",
    "shipments.pod.capture",
    "safety.compliance.view",
    "emergency.procedures.view",
    "incidents.report",
    "training.view",
    "sds.library.view",
    "dg.checker.view",
    "sds.emergency.info",
    "customer.portal.tracking",
    "users.view",
    "documents.view.all",
    "documents.download.all",
    "documents.generate.shipment_report",
    "audit.logs",
    // All mobile permissions
    "mobile.location.track",
    "mobile.camera.access",
    "mobile.notifications.receive",
    "mobile.offline.sync",
    "mobile.scanner.qr",
    "mobile.pod.signature",
    "mobile.photos.upload"
  ]
};

/**
 * Permission context interface providing all permission checking capabilities.
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
  
  // Convenience helpers for common mobile permission patterns
  /** Can access driver-specific features */
  canAccessDriverFeatures: boolean;
  
  /** Can update shipment status */
  canUpdateShipments: boolean;
  
  /** Can capture proof of delivery */
  canCapturePOD: boolean;
  
  /** Can access device location */
  canAccessLocation: boolean;
  
  /** Can access device camera */
  canAccessCamera: boolean;
  
  /** Can capture digital signatures */
  canCaptureSignatures: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

/**
 * Permission Provider Component for Mobile
 * 
 * Provides the permission context to all child components in the mobile app.
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
    return (user as any).role?.toLowerCase() || 'viewer';
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
   */
  const can = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  /**
   * Check if the current user has a specific role.
   */
  const hasRole = (role: Role): boolean => {
    return userRole === role;
  };

  /**
   * Check if the current user has any of the provided roles.
   */
  const hasAnyRole = (roles: Role[]): boolean => {
    return roles.includes(userRole as Role);
  };

  /**
   * Check if the current user has any of the provided permissions.
   */
  const hasAnyPermission = (perms: Permission[]): boolean => {
    return perms.some(permission => can(permission));
  };

  /**
   * Check if the current user has all of the provided permissions.
   */
  const hasAllPermissions = (perms: Permission[]): boolean => {
    return perms.every(permission => can(permission));
  };

  // Convenience permission checkers - memoized for performance
  const canAccessDriverFeatures = useMemo(() => 
    hasAnyPermission(["shipments.view.own", "shipments.update.status", "shipments.pod.capture"]),
    [permissions]
  );
  const canUpdateShipments = useMemo(() => can("shipments.update.status"), [permissions]);
  const canCapturePOD = useMemo(() => can("shipments.pod.capture"), [permissions]);
  const canAccessLocation = useMemo(() => can("mobile.location.track"), [permissions]);
  const canAccessCamera = useMemo(() => can("mobile.camera.access"), [permissions]);
  const canCaptureSignatures = useMemo(() => can("mobile.pod.signature"), [permissions]);

  const value: PermissionContextType = {
    can,
    hasRole,
    hasAnyRole,
    userRole: userRole as Role | null,
    permissions,
    hasAnyPermission,
    hasAllPermissions,
    canAccessDriverFeatures,
    canUpdateShipments,
    canCapturePOD,
    canAccessLocation,
    canAccessCamera,
    canCaptureSignatures
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
 * Mobile adaptation with React Native compatibility.
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
 * Mobile adaptation with React Native compatibility.
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

export type { Permission, Role };