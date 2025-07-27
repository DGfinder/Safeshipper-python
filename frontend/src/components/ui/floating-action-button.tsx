'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { useTheme } from '@/contexts/ThemeContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Plus,
  Package,
  Upload,
  Search,
  Bell,
  MessageSquare,
  Zap,
  ChevronUp,
  ChevronDown,
  X,
  Navigation,
  Truck,
  Shield,
  FileText,
  Calendar,
  Users,
  Settings,
  Activity,
  TrendingUp,
  MapPin,
  Camera,
  Mic,
  Phone,
  Video,
  HelpCircle,
  BookOpen,
  Star,
} from 'lucide-react';

// FAB action interface
interface FABAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  badge?: number;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  disabled?: boolean;
  requiresAuth?: boolean;
}

// Common FAB actions
const commonActions: FABAction[] = [
  {
    id: 'new-shipment',
    label: 'New Shipment',
    icon: Package,
    href: '/shipments/new',
    color: 'primary',
  },
  {
    id: 'upload-manifest',
    label: 'Upload Manifest',
    icon: Upload,
    href: '/shipments/manifest-upload',
    color: 'secondary',
  },
  {
    id: 'search',
    label: 'Search',
    icon: Search,
    href: '/search',
    color: 'secondary',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    href: '/notifications',
    color: 'warning',
    badge: 3,
  },
  {
    id: 'help',
    label: 'Help & Support',
    icon: HelpCircle,
    href: '/help',
    color: 'secondary',
  },
];

const quickActions: FABAction[] = [
  {
    id: 'emergency',
    label: 'Emergency',
    icon: Shield,
    href: '/emergency',
    color: 'error',
  },
  {
    id: 'live-map',
    label: 'Live Map',
    icon: MapPin,
    href: '/dashboard/live-map',
    color: 'success',
  },
  {
    id: 'scan',
    label: 'Scan QR/Barcode',
    icon: Camera,
    onClick: () => {
      // Would integrate with camera API
      console.log('Opening camera scanner...');
    },
    color: 'secondary',
  },
  {
    id: 'voice-command',
    label: 'Voice Commands',
    icon: Mic,
    onClick: () => {
      // Would integrate with speech recognition
      console.log('Starting voice recognition...');
    },
    color: 'secondary',
  },
];

const contextualActions: Record<string, FABAction[]> = {
  '/dashboard': [
    ...commonActions,
    {
      id: 'quick-stats',
      label: 'Quick Stats',
      icon: TrendingUp,
      href: '/analytics',
      color: 'primary',
    },
  ],
  '/shipments': [
    {
      id: 'new-shipment',
      label: 'New Shipment',
      icon: Package,
      href: '/shipments/new',
      color: 'primary',
    },
    {
      id: 'bulk-upload',
      label: 'Bulk Upload',
      icon: Upload,
      href: '/shipments/bulk-upload',
      color: 'secondary',
    },
    {
      id: 'track-shipment',
      label: 'Track Shipment',
      icon: Search,
      href: '/track',
      color: 'secondary',
    },
  ],
  '/fleet': [
    {
      id: 'add-vehicle',
      label: 'Add Vehicle',
      icon: Truck,
      href: '/fleet/new',
      color: 'primary',
    },
    {
      id: 'maintenance',
      label: 'Schedule Maintenance',
      icon: Settings,
      href: '/fleet/maintenance',
      color: 'warning',
    },
    {
      id: 'live-tracking',
      label: 'Live Tracking',
      icon: Navigation,
      href: '/fleet/tracking',
      color: 'success',
    },
  ],
  '/analytics': [
    {
      id: 'export-data',
      label: 'Export Data',
      icon: FileText,
      onClick: () => {
        // Would trigger export dialog
        console.log('Opening export dialog...');
      },
      color: 'secondary',
    },
    {
      id: 'custom-report',
      label: 'Custom Report',
      icon: TrendingUp,
      href: '/reports/custom',
      color: 'primary',
    },
  ],
  '/training': [
    {
      id: 'new-course',
      label: 'New Course',
      icon: BookOpen,
      href: '/training/new',
      color: 'primary',
    },
    {
      id: 'schedule-training',
      label: 'Schedule Training',
      icon: Calendar,
      href: '/training/schedule',
      color: 'secondary',
    },
  ],
};

// Main FAB component
interface FloatingActionButtonProps {
  variant?: 'single' | 'expandable' | 'contextual';
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  size?: 'sm' | 'md' | 'lg';
  actions?: FABAction[];
  primaryAction?: FABAction;
  className?: string;
  disabled?: boolean;
  hideOnScroll?: boolean;
  showLabels?: boolean;
}

export function FloatingActionButton({
  variant = 'contextual',
  position = 'bottom-right',
  size = 'md',
  actions = [],
  primaryAction,
  className,
  disabled = false,
  hideOnScroll = true,
  showLabels = false,
}: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [currentPath, setCurrentPath] = useState('');
  const { isDark } = useTheme();
  const { preferences } = useAccessibility();
  const router = useRouter();

  // Get current path for contextual actions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
    }
  }, []);

  // Handle scroll visibility
  useEffect(() => {
    if (!hideOnScroll) return;

    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsVisible(currentScrollY <= lastScrollY || currentScrollY <= 100);
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hideOnScroll]);

  // Get actions based on variant
  const getActions = (): FABAction[] => {
    if (actions.length > 0) return actions;
    
    switch (variant) {
      case 'contextual':
        return contextualActions[currentPath] || commonActions;
      case 'expandable':
        return [...commonActions, ...quickActions];
      case 'single':
        return primaryAction ? [primaryAction] : [commonActions[0]];
      default:
        return commonActions;
    }
  };

  const fabActions = getActions();
  const mainAction = primaryAction || fabActions[0];

  // Handle action click
  const handleActionClick = (action: FABAction) => {
    if (action.disabled) return;
    
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      router.push(action.href as any);
    }
    
    if (variant === 'expandable') {
      setIsExpanded(false);
    }
  };

  // Get position classes
  const getPositionClasses = () => {
    const base = 'fixed z-50 transition-all duration-300';
    
    switch (position) {
      case 'bottom-right':
        return `${base} bottom-6 right-6`;
      case 'bottom-left':
        return `${base} bottom-6 left-6`;
      case 'bottom-center':
        return `${base} bottom-6 left-1/2 transform -translate-x-1/2`;
      default:
        return `${base} bottom-6 right-6`;
    }
  };

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-12 w-12';
      case 'md':
        return 'h-14 w-14';
      case 'lg':
        return 'h-16 w-16';
      default:
        return 'h-14 w-14';
    }
  };

  // Get color classes
  const getColorClasses = (color: FABAction['color'] = 'primary') => {
    switch (color) {
      case 'primary':
        return 'bg-primary-600 hover:bg-primary-700 text-white';
      case 'secondary':
        return 'bg-neutral-600 hover:bg-neutral-700 text-white';
      case 'success':
        return 'bg-success-600 hover:bg-success-700 text-white';
      case 'warning':
        return 'bg-warning-600 hover:bg-warning-700 text-white';
      case 'error':
        return 'bg-error-600 hover:bg-error-700 text-white';
      default:
        return 'bg-primary-600 hover:bg-primary-700 text-white';
    }
  };

  if (!isVisible || disabled) return null;

  // Single action FAB
  if (variant === 'single' && mainAction) {
    const Icon = mainAction.icon;
    
    return (
      <div className={cn(getPositionClasses(), className)}>
        <Button
          onClick={() => handleActionClick(mainAction)}
          className={cn(
            getSizeClasses(),
            getColorClasses(mainAction.color),
            'rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
          )}
          aria-label={mainAction.label}
          disabled={mainAction.disabled}
        >
          <Icon className="h-6 w-6" />
          {mainAction.badge && mainAction.badge > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {mainAction.badge > 99 ? '99+' : mainAction.badge}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  // Expandable FAB
  if (variant === 'expandable') {
    return (
      <div className={cn(getPositionClasses(), className)}>
        {/* Backdrop */}
        {isExpanded && (
          <div
            className="fixed inset-0 bg-black bg-opacity-20 -z-10"
            onClick={() => setIsExpanded(false)}
          />
        )}

        {/* Action buttons */}
        {isExpanded && (
          <div className="absolute bottom-20 right-0 flex flex-col gap-3 items-end">
            {fabActions.slice(1).map((action, index) => {
              const Icon = action.icon;
              
              return (
                <div
                  key={action.id}
                  className="flex items-center gap-3 animate-slide-in"
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  {(showLabels || preferences.announcements) && (
                    <div className="bg-neutral-900 text-white px-3 py-1 rounded-lg text-sm font-medium shadow-lg">
                      {action.label}
                    </div>
                  )}
                  <Button
                    onClick={() => handleActionClick(action)}
                    className={cn(
                      'h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105',
                      getColorClasses(action.color),
                      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                    )}
                    aria-label={action.label}
                    disabled={action.disabled}
                  >
                    <Icon className="h-5 w-5" />
                    {action.badge && action.badge > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                      >
                        {action.badge > 99 ? '99+' : action.badge}
                      </Badge>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Main button */}
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            getSizeClasses(),
            getColorClasses(mainAction.color),
            'rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
          )}
          aria-label={isExpanded ? 'Close menu' : 'Open menu'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </Button>
      </div>
    );
  }

  // Contextual FAB (default)
  const contextualAction = fabActions[0];
  if (!contextualAction) return null;

  const Icon = contextualAction.icon;

  return (
    <div className={cn(getPositionClasses(), className)}>
      <Button
        onClick={() => handleActionClick(contextualAction)}
        className={cn(
          getSizeClasses(),
          getColorClasses(contextualAction.color),
          'rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
        )}
        aria-label={contextualAction.label}
        disabled={contextualAction.disabled}
      >
        <Icon className="h-6 w-6" />
        {contextualAction.badge && contextualAction.badge > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
          >
            {contextualAction.badge > 99 ? '99+' : contextualAction.badge}
          </Badge>
        )}
      </Button>
    </div>
  );
}

// Speed dial component (alternative expandable FAB)
export function SpeedDial({
  actions = commonActions,
  position = 'bottom-right',
  size = 'md',
  className,
  triggerIcon = Plus,
  closeIcon = X,
  disabled = false,
}: {
  actions?: FABAction[];
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  triggerIcon?: React.ComponentType<{ className?: string }>;
  closeIcon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleActionClick = (action: FABAction) => {
    if (action.disabled) return;
    
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      router.push(action.href as any);
    }
    
    setIsOpen(false);
  };

  const getPositionClasses = () => {
    const base = 'fixed z-50';
    
    switch (position) {
      case 'bottom-right':
        return `${base} bottom-6 right-6`;
      case 'bottom-left':
        return `${base} bottom-6 left-6`;
      case 'bottom-center':
        return `${base} bottom-6 left-1/2 transform -translate-x-1/2`;
      default:
        return `${base} bottom-6 right-6`;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-12 w-12';
      case 'md':
        return 'h-14 w-14';
      case 'lg':
        return 'h-16 w-16';
      default:
        return 'h-14 w-14';
    }
  };

  if (disabled) return null;

  const TriggerIcon = triggerIcon;
  const CloseIcon = closeIcon;

  return (
    <div className={cn(getPositionClasses(), className)}>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Action items */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 flex flex-col gap-3 items-end">
          {actions.map((action, index) => {
            const Icon = action.icon;
            
            return (
              <div
                key={action.id}
                className="flex items-center gap-3 animate-slide-in"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <div className="bg-neutral-900 text-white px-3 py-1 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap">
                  {action.label}
                </div>
                <Button
                  onClick={() => handleActionClick(action)}
                  className={cn(
                    'h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105',
                    'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                  )}
                  aria-label={action.label}
                  disabled={action.disabled}
                >
                  <Icon className="h-5 w-5" />
                  {action.badge && action.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                    >
                      {action.badge > 99 ? '99+' : action.badge}
                    </Badge>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Main trigger button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          getSizeClasses(),
          'bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
        )}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <CloseIcon className="h-6 w-6" />
        ) : (
          <TriggerIcon className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
}

// Hook for managing FAB state
export function useFAB() {
  const [isVisible, setIsVisible] = useState(true);
  const [currentActions, setCurrentActions] = useState<FABAction[]>([]);
  
  const showFAB = () => setIsVisible(true);
  const hideFAB = () => setIsVisible(false);
  const toggleFAB = () => setIsVisible(!isVisible);
  
  const updateActions = (actions: FABAction[]) => setCurrentActions(actions);
  const addAction = (action: FABAction) => setCurrentActions(prev => [...prev, action]);
  const removeAction = (actionId: string) => setCurrentActions(prev => prev.filter(a => a.id !== actionId));
  
  return {
    isVisible,
    currentActions,
    showFAB,
    hideFAB,
    toggleFAB,
    updateActions,
    addAction,
    removeAction,
  };
}