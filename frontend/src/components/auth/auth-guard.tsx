'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, user, isHydrated, setUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // TEMPORARY: Bypass authentication for demo purposes
    if (isHydrated && !isAuthenticated && !user) {
      // Set a demo user to bypass login
      setUser({
        id: 'demo-user',
        username: 'demo@safeshipper.com',
        email: 'demo@safeshipper.com',
        role: 'DISPATCHER',
        avatar: 'DE'
      });
      return;
    }

    // Original auth logic (commented out for demo)
    // if (isHydrated && !isAuthenticated && !user) {
    //   router.push('/login');
    // }
  }, [isAuthenticated, user, router, isHydrated, setUser]);

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

  // Show loading if not authenticated (about to redirect)
  if (!isAuthenticated && !user) {
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

  return <>{children}</>;
}