"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { getEnvironmentConfig } from "@/shared/config/environment";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, user, isHydrated, login } = useAuthStore();
  const router = useRouter();
  const config = getEnvironmentConfig();

  useEffect(() => {
    if (isHydrated && !isAuthenticated && !user) {
      // In demo mode, auto-login with admin user
      // In other modes, redirect to login
      if (config.apiMode === 'demo') {
        // Auto-login with default admin user for demo
        login({
          id: 'admin-001',
          email: 'admin@safeshipper.com',
          firstName: 'Sarah',
          lastName: 'Richardson',
          role: 'ADMIN',
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
  }, [isAuthenticated, user, router, isHydrated, login, config.apiMode]);

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

  // Only show children if user is authenticated
  if (isAuthenticated && user) {
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
