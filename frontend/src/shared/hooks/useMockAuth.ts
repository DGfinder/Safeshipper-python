// hooks/useMockAuth.ts
// Temporary mock auth hook for demo purposes

import { useAuthStore } from '@/shared/stores/auth-store';
import { useEffect } from 'react';
import { getEnvironmentConfig } from '@/shared/config/environment';

export const useMockAuth = () => {
  const { user, isAuthenticated, getToken, login } = useAuthStore();
  const config = getEnvironmentConfig();

  useEffect(() => {
    // Only auto-login in demo mode if no user is authenticated
    if (config.apiMode === 'demo' && !isAuthenticated && !user) {
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
    }
  }, [isAuthenticated, user, login, config.apiMode]);

  return {
    getToken,
    isAuthenticated,
    user: user || {
      id: "demo-user",
      username: "demo@safeshipper.com",
      email: "demo@safeshipper.com",
      role: "ADMIN",
      avatar: "SA",
    },
  };
};
