"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { getEnvironmentConfig } from "@/shared/config/environment";
import { usePermissions } from "@/contexts/PermissionContext";
import { CustomerLogin } from "@/shared/components/auth/customer-login";
import { Button } from "@/shared/components/ui/button";

interface AuthGuardProps {
  children: React.ReactNode;
  mode?: "admin" | "customer" | "auto"; // "auto" detects based on route
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, mode = "auto", fallback }: AuthGuardProps) {
  const { isAuthenticated, user, isHydrated, login } = useAuthStore();
  const router = useRouter();
  const config = getEnvironmentConfig();
  const [showCustomerLogin, setShowCustomerLogin] = useState(false);
  
  // Determine authentication mode based on current route
  const authMode = mode === "auto" ? 
    (typeof window !== 'undefined' && window.location.pathname.includes('/customer-portal') ? "customer" : "admin") : 
    mode;

  useEffect(() => {
    if (isHydrated && !isAuthenticated && !user) {
      if (authMode === "customer") {
        // Show customer login interface
        setShowCustomerLogin(true);
      } else {
        // Admin/regular user flow
        if (config.apiMode === 'demo') {
          // Auto-login with default admin user for demo
          login({
            id: 'admin-001',
            email: 'admin@safeshipper.com',
            firstName: 'Sarah',
            lastName: 'Richardson',
            role: 'admin',
            department: 'IT Administration',
            permissions: [
              'user_management',
              'system_configuration',
              'audit_logs',
              'all_shipments',
              'all_customers',
              'reports',
              'compliance_management'
            ],
          });
        } else {
          // Redirect to login for production/hybrid modes
          router.push('/login');
        }
      }
    }
  }, [isAuthenticated, user, router, isHydrated, login, config.apiMode, authMode]);

  // Show loading skeleton while hydrating
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }

  // Show customer login if needed
  if (showCustomerLogin && authMode === "customer") {
    return fallback || <CustomerLogin onSuccess={() => setShowCustomerLogin(false)} />;
  }

  // Show loading if not authenticated (about to redirect or auto-login)
  if (!isAuthenticated && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-8 w-32 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
          <Skeleton className="h-10 w-24 mx-auto" />
          <p className="text-sm text-gray-600 mt-4">
            {config.apiMode === 'demo' ? 'Loading demo environment...' : 'Redirecting to login...'}
          </p>
        </div>
      </div>
    );
  }

  // Only show children if user is authenticated and has appropriate access
  if (isAuthenticated && user) {
    // For customer portal routes, verify customer access
    if (authMode === "customer") {
      // Check if user has customer portal permissions
      // Note: This requires the component to be wrapped in PermissionProvider
      try {
        const userRole = (user as any).role?.toLowerCase();
        if (userRole !== "customer") {
          return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="max-w-md mx-auto text-center p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Restricted</h2>
                <p className="text-gray-600 mb-6">
                  This area is restricted to customer accounts. Please contact your administrator for access.
                </p>
                <Button onClick={() => useAuthStore.getState().logout()} variant="outline">
                  Sign Out
                </Button>
              </div>
            </div>
          );
        }
      } catch {
        // If permission context is not available, proceed with basic role check
      }
    }
    
    return <>{children}</>;
  }

  // Fallback loading state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="space-y-4 text-center">
        <Skeleton className="h-8 w-32 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
        <Skeleton className="h-10 w-24 mx-auto" />
        <p className="text-sm text-gray-600 mt-4">Loading...</p>
      </div>
    </div>
  );
}
