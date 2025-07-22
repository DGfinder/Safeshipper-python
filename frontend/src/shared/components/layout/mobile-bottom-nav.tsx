'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/shared/components/ui/badge';
import { useAccessibility } from '@/shared/services/AccessibilityContext';
import { useRealTimeDashboardStats } from '@/shared/hooks/useRealTimeData';
import { NotificationCenter, NotificationBell, useNotifications } from '@/shared/components/ui/notification-center';
import {
  Home,
  Package,
  Truck,
  BarChart3,
  User,
  Bell,
  Search,
  Settings,
  MapPin,
  AlertTriangle,
  Plus,
  Calendar,
  FileText,
  Shield,
} from 'lucide-react';

// Navigation item interface
interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  disabled?: boolean;
  requiresAuth?: boolean;
}

// Main navigation items (always visible)
const mainNavItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    id: 'shipments',
    label: 'Shipments',
    href: '/shipments',
    icon: Package,
  },
  {
    id: 'fleet',
    label: 'Fleet',
    href: '/fleet',
    icon: Truck,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    id: 'more',
    label: 'More',
    href: '/more',
    icon: Settings,
  },
];

// Secondary navigation items (for "More" menu)
const secondaryNavItems: NavItem[] = [
  {
    id: 'live-map',
    label: 'Live Map',
    href: '/dashboard/live-map',
    icon: MapPin,
  },
  {
    id: 'operations',
    label: 'Operations',
    href: '/operations',
    icon: AlertTriangle,
  },
  {
    id: 'dg-compliance',
    label: 'DG Compliance',
    href: '/dg-compliance',
    icon: Shield,
  },
  {
    id: 'sds-library',
    label: 'SDS Library',
    href: '/sds-library',
    icon: FileText,
  },
  {
    id: 'training',
    label: 'Training',
    href: '/training',
    icon: Calendar,
  },
  {
    id: 'users',
    label: 'Users',
    href: '/users',
    icon: User,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

// Quick action items
const quickActions: NavItem[] = [
  {
    id: 'new-shipment',
    label: 'New Shipment',
    href: '/shipments/new',
    icon: Plus,
  },
  {
    id: 'search',
    label: 'Search',
    href: '/search',
    icon: Search,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    href: '/notifications',
    icon: Bell,
  },
];

// Mobile bottom navigation component
export function MobileBottomNav() {
  const pathname = usePathname();
  const { preferences } = useAccessibility();
  const { notifications } = useRealTimeDashboardStats();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const getItemBadge = (item: NavItem) => {
    switch (item.id) {
      case 'notifications':
        return notifications.length;
      case 'shipments':
        return 0; // Would be connected to real data
      default:
        return item.badge || 0;
    }
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const badge = getItemBadge(item);

          return (
            <Link
              key={item.id}
              href={item.href as any}
              className={cn(
                'flex flex-col items-center justify-center min-w-0 flex-1 px-2 py-1 text-xs font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md',
                active
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
                item.disabled && 'opacity-50 cursor-not-allowed'
              )}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
                  >
                    {badge > 99 ? '99+' : badge}
                  </Badge>
                )}
              </div>
              <span className="mt-1 truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Mobile "More" menu component
export function MobileMoreMenu() {
  const pathname = usePathname();
  const { preferences } = useAccessibility();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            
            return (
              <Link
                key={action.id}
                href={action.href as any}
                className={cn(
                  'flex flex-col items-center justify-center p-4 rounded-lg border-2 border-gray-200',
                  'hover:border-blue-300 hover:bg-blue-50 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                )}
              >
                <Icon className="h-6 w-6 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Navigation Items */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Navigation</h2>
        <div className="space-y-2">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.id}
                href={item.href as any}
                className={cn(
                  'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="h-5 w-5 mr-3" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* System Information */}
      <div className="border-t pt-4">
        <div className="text-xs text-gray-500 space-y-1">
          <div>SafeShipper Mobile v2.0</div>
          <div>Last sync: {new Date().toLocaleTimeString()}</div>
          {preferences.announcements && (
            <div className="text-blue-600">Accessibility: Enhanced</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Floating Action Button for mobile
interface FloatingActionButtonProps {
  variant?: 'single' | 'expandable' | 'contextual';
  primaryAction?: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
  };
  className?: string;
  disabled?: boolean;
}

export function FloatingActionButton({ 
  variant = 'single',
  primaryAction,
  className,
  disabled = false 
}: FloatingActionButtonProps) {
  if (!primaryAction) return null;

  const { icon: Icon, label, onClick } = primaryAction;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'fixed bottom-20 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'transition-all duration-200 hover:scale-105',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'md:hidden', // Hide on desktop
        className
      )}
      aria-label={label}
    >
      <Icon className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}

// Mobile navigation wrapper for pages
interface MobileNavWrapperProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
  showFAB?: boolean;
  fabVariant?: 'single' | 'expandable' | 'contextual';
  fabAction?: () => void;
  fabIcon?: React.ComponentType<{ className?: string }>;
  fabLabel?: string;
  showNotifications?: boolean;
}

export function MobileNavWrapper({
  children,
  showBottomNav = true,
  showFAB = true,
  fabVariant = 'contextual',
  fabAction,
  fabIcon = Plus,
  fabLabel = 'Add new',
  showNotifications = true,
}: MobileNavWrapperProps) {
  const { preferences } = useAccessibility();
  const { unreadCount } = useNotifications();
  const [showNotificationCenter, setShowNotificationCenter] = React.useState(false);

  return (
    <div className="min-h-screen bg-surface-background">
      {/* Main content with bottom padding for navigation */}
      <div className={cn(
        'min-h-screen',
        showBottomNav && 'pb-16 md:pb-0' // Add bottom padding on mobile only
      )}>
        {children}
      </div>

      {/* Bottom Navigation */}
      {showBottomNav && <MobileBottomNav />}

      {/* Floating Action Button */}
      {showFAB && (
        <FloatingActionButton
          variant={fabVariant}
          primaryAction={fabAction ? {
            id: 'custom-action',
            label: fabLabel,
            icon: fabIcon,
            onClick: fabAction,
          } : undefined}
          className="md:hidden"
        />
      )}

      {/* Notification Bell */}
      {showNotifications && (
        <div className="fixed top-4 right-4 z-50 md:hidden">
          <NotificationBell
            onClick={() => setShowNotificationCenter(true)}
            unreadCount={unreadCount}
            className="bg-surface-card shadow-lg"
          />
        </div>
      )}

      {/* Notification Center */}
      <NotificationCenter
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
        position="top-right"
      />

      {/* Accessibility status indicator */}
      {preferences.announcements && (
        <div className="fixed top-4 left-4 z-50 md:hidden">
          <div className="bg-primary-600 text-white px-2 py-1 rounded text-xs">
            A11y: On
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for mobile navigation state
export function useMobileNav() {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = React.useState(false);
  const pathname = usePathname();

  // Close more menu when navigating
  React.useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [pathname]);

  return {
    isMoreMenuOpen,
    setIsMoreMenuOpen,
    openMoreMenu: () => setIsMoreMenuOpen(true),
    closeMoreMenu: () => setIsMoreMenuOpen(false),
  };
}