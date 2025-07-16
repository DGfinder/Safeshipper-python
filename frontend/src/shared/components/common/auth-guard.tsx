"use client";

import React from 'react';
import { useAuth } from '@/shared/hooks/use-auth';
import { LoadingSpinner } from '@/shared/components/ui/loading-spinner';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return fallback || <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  return <>{children}</>;
}

export default AuthGuard;