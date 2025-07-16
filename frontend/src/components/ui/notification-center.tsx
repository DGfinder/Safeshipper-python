'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { useTheme } from '@/shared/services/ThemeContext';
import { useAccessibility } from '@/shared/services/AccessibilityContext';
import { useWebSocket } from '@/shared/services/WebSocketContext';
import { cn } from '@/lib/utils';
import { formatDistance } from 'date-fns';
import {
  Bell,
  BellOff,
  X,
  Settings,
  Filter,
  Search,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Info,
  AlertCircle,
  Package,
  Truck,
  Shield,
  Users,
  Clock,
  Eye,
  EyeOff,
  Archive,
  Star,
  ChevronRight,
  Zap,
  Globe,
  Smartphone,
  Mail,
  MessageSquare,
  Volume2,
  VolumeX,
  Calendar,
  MapPin,
  TrendingUp,
  FileText,
  Activity,
  Layers,
  Brain,
  Database,
  CheckSquare,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  Download,
  Share2,
  Copy,
  ExternalLink,
} from 'lucide-react';

// Notification types
export type NotificationType = 
  | 'info' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'system' 
  | 'shipment' 
  | 'fleet' 
  | 'compliance' 
  | 'user' 
  | 'emergency';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export type NotificationStatus = 'unread' | 'read' | 'archived' | 'dismissed';

export interface NotificationAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'secondary' | 'destructive';
}

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: Date;
  status: NotificationStatus;
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
  source?: string;
  category?: string;
  tags?: string[];
  persistent?: boolean;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  autoExpire?: number; // Minutes until auto-dismiss
  relatedEntity?: {
    type: string;
    id: string;
    name: string;
  };
}

// Notification settings
export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  desktop: boolean;
  email: boolean;
  sms: boolean;
  doNotDisturb: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  filters: {
    types: NotificationType[];
    priorities: NotificationPriority[];
    sources: string[];
  };
  autoMarkAsRead: boolean;
  maxNotifications: number;
  groupSimilar: boolean;
}

// Mock data generator
const generateMockNotifications = (): Notification[] => {
  const notifications: Notification[] = [
    {
      id: '1',
      type: 'emergency',
      priority: 'critical',
      title: 'Emergency Alert',
      message: 'Hazardous material spill detected on Route 101. Immediate response required.',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      status: 'unread',
      persistent: true,
      actions: [
        {
          id: 'respond',
          label: 'Respond',
          icon: Activity,
          variant: 'destructive',
          onClick: () => console.log('Emergency response initiated'),
        },
        {
          id: 'view-details',
          label: 'View Details',
          icon: Eye,
          href: '/emergency/incident-1',
        },
      ],
      source: 'Emergency System',
      category: 'Safety',
      tags: ['emergency', 'hazmat', 'route-101'],
    },
    {
      id: '2',
      type: 'shipment',
      priority: 'high',
      title: 'Shipment Delayed',
      message: 'Shipment SH-2024-001 is delayed due to weather conditions. New ETA: 2:30 PM',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      status: 'unread',
      actions: [
        {
          id: 'notify-customer',
          label: 'Notify Customer',
          icon: MessageSquare,
          variant: 'primary',
          onClick: () => console.log('Customer notification sent'),
        },
        {
          id: 'view-shipment',
          label: 'View Shipment',
          icon: Package,
          href: '/shipments/SH-2024-001',
        },
      ],
      source: 'Logistics System',
      category: 'Operations',
      tags: ['shipment', 'delay', 'weather'],
      relatedEntity: {
        type: 'shipment',
        id: 'SH-2024-001',
        name: 'Hazmat Shipment to Houston',
      },
    },
    {
      id: '3',
      type: 'compliance',
      priority: 'medium',
      title: 'Compliance Check Due',
      message: 'Vehicle FL-123 requires compliance inspection by end of week.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'unread',
      actions: [
        {
          id: 'schedule-inspection',
          label: 'Schedule',
          icon: Calendar,
          variant: 'primary',
          onClick: () => console.log('Inspection scheduled'),
        },
        {
          id: 'view-vehicle',
          label: 'View Vehicle',
          icon: Truck,
          href: '/fleet/FL-123',
        },
      ],
      source: 'Compliance System',
      category: 'Regulatory',
      tags: ['compliance', 'inspection', 'vehicle'],
    },
    {
      id: '4',
      type: 'system',
      priority: 'low',
      title: 'System Update Available',
      message: 'SafeShipper v2.1.0 is now available with new features and improvements.',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'read',
      actions: [
        {
          id: 'view-changelog',
          label: 'View Changes',
          icon: FileText,
          href: '/changelog',
        },
        {
          id: 'update-now',
          label: 'Update Now',
          icon: Download,
          variant: 'primary',
          onClick: () => console.log('Starting system update'),
        },
      ],
      source: 'System',
      category: 'Updates',
      tags: ['system', 'update', 'features'],
    },
    {
      id: '5',
      type: 'success',
      priority: 'medium',
      title: 'Training Completed',
      message: '15 employees have completed the new dangerous goods handling training.',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      status: 'read',
      actions: [
        {
          id: 'view-report',
          label: 'View Report',
          icon: TrendingUp,
          href: '/training/reports',
        },
        {
          id: 'generate-certificates',
          label: 'Generate Certificates',
          icon: FileText,
          variant: 'secondary',
          onClick: () => console.log('Generating certificates'),
        },
      ],
      source: 'Training System',
      category: 'HR',
      tags: ['training', 'completion', 'certificates'],
    },
  ];

  return notifications;
};

// Notification component
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onMarkAsUnread: (id: string) => void;
  onArchive: (id: string) => void;
  onDismiss: (id: string) => void;
  onActionClick: (notificationId: string, actionId: string) => void;
  compact?: boolean;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onMarkAsUnread,
  onArchive,
  onDismiss,
  onActionClick,
  compact = false,
}: NotificationItemProps) {
  const { isDark } = useTheme();
  const { preferences } = useAccessibility();

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'info':
        return Info;
      case 'success':
        return CheckCircle;
      case 'warning':
        return AlertTriangle;
      case 'error':
        return AlertCircle;
      case 'emergency':
        return AlertTriangle;
      case 'shipment':
        return Package;
      case 'fleet':
        return Truck;
      case 'compliance':
        return Shield;
      case 'user':
        return Users;
      case 'system':
        return Settings;
      default:
        return Bell;
    }
  };

  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case 'info':
        return 'text-info-600';
      case 'success':
        return 'text-success-600';
      case 'warning':
        return 'text-warning-600';
      case 'error':
        return 'text-error-600';
      case 'emergency':
        return 'text-error-600';
      case 'shipment':
        return 'text-primary-600';
      case 'fleet':
        return 'text-primary-600';
      case 'compliance':
        return 'text-warning-600';
      case 'user':
        return 'text-info-600';
      case 'system':
        return 'text-neutral-600';
      default:
        return 'text-neutral-600';
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'critical':
        return 'border-l-error-600';
      case 'high':
        return 'border-l-warning-600';
      case 'medium':
        return 'border-l-info-600';
      case 'low':
        return 'border-l-neutral-400';
      default:
        return 'border-l-neutral-400';
    }
  };

  const TypeIcon = getTypeIcon(notification.type);
  const isUnread = notification.status === 'unread';

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      isUnread && 'ring-2 ring-primary-500 ring-opacity-20',
      notification.persistent && 'bg-warning-50 dark:bg-warning-900/10',
      getPriorityColor(notification.priority),
      'border-l-4'
    )}>
      <CardContent className={cn('p-4', compact && 'p-3')}>
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            'flex-shrink-0 p-2 rounded-full',
            notification.type === 'emergency' ? 'bg-error-100 dark:bg-error-900/20' :
            notification.type === 'success' ? 'bg-success-100 dark:bg-success-900/20' :
            notification.type === 'warning' ? 'bg-warning-100 dark:bg-warning-900/20' :
            'bg-neutral-100 dark:bg-neutral-800'
          )}>
            <TypeIcon className={cn('h-4 w-4', getTypeColor(notification.type))} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className={cn(
                'font-semibold text-sm',
                isUnread ? 'text-surface-foreground' : 'text-neutral-600'
              )}>
                {notification.title}
              </h4>
              <div className="flex items-center gap-2">
                {notification.priority === 'critical' && (
                  <Badge variant="destructive" className="text-xs">
                    Critical
                  </Badge>
                )}
                {notification.priority === 'high' && (
                  <Badge variant="destructive" className="text-xs bg-warning-600">
                    High
                  </Badge>
                )}
                {isUnread && (
                  <div className="w-2 h-2 bg-primary-600 rounded-full" />
                )}
              </div>
            </div>

            <p className={cn(
              'text-sm mb-2',
              isUnread ? 'text-surface-foreground' : 'text-neutral-600'
            )}>
              {notification.message}
            </p>

            {/* Metadata */}
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span>{formatDistance(notification.timestamp, new Date(), { addSuffix: true })}</span>
                {notification.source && (
                  <>
                    <span>•</span>
                    <span>{notification.source}</span>
                  </>
                )}
              </div>
              {notification.persistent && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-warning-600" />
                  <span>Persistent</span>
                </div>
              )}
            </div>

            {/* Actions */}
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {notification.actions.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <Button
                      key={action.id}
                      variant={action.variant === 'primary' ? 'default' : action.variant || 'outline'}
                      size="sm"
                      onClick={() => onActionClick(notification.id, action.id)}
                      className="h-8 text-xs"
                    >
                      {ActionIcon && <ActionIcon className="h-3 w-3 mr-1" />}
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions menu */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => isUnread ? onMarkAsRead(notification.id) : onMarkAsUnread(notification.id)}
              className="h-8 w-8 p-0"
              title={isUnread ? 'Mark as read' : 'Mark as unread'}
            >
              {isUnread ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onArchive(notification.id)}
              className="h-8 w-8 p-0"
              title="Archive"
            >
              <Archive className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(notification.id)}
              className="h-8 w-8 p-0"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main notification center component
interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxHeight?: number;
  className?: string;
}

export function NotificationCenter({
  isOpen,
  onClose,
  position = 'top-right',
  maxHeight = 600,
  className,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    sound: true,
    vibration: true,
    desktop: true,
    email: false,
    sms: false,
    doNotDisturb: false,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    filters: {
      types: [],
      priorities: [],
      sources: [],
    },
    autoMarkAsRead: false,
    maxNotifications: 50,
    groupSimilar: true,
  });
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const { isDark } = useTheme();
  const { preferences } = useAccessibility();
  const { subscribe } = useWebSocket();

  // Load notifications on mount
  useEffect(() => {
    setNotifications(generateMockNotifications());
  }, []);

  // Subscribe to real-time notifications
  useEffect(() => {
    const handleNewNotification = (data: any) => {
      const notification: Notification = {
        id: data.id || Date.now().toString(),
        type: data.type || 'info',
        priority: data.priority || 'medium',
        title: data.title || 'New Notification',
        message: data.message || '',
        timestamp: new Date(data.timestamp || Date.now()),
        status: 'unread',
        actions: data.actions || [],
        source: data.source || 'System',
        category: data.category || 'General',
        tags: data.tags || [],
        persistent: data.persistent || false,
      };

      setNotifications(prev => [notification, ...prev.slice(0, settings.maxNotifications - 1)]);

      // Play notification sound if enabled
      if (settings.sound && settings.enabled) {
        playNotificationSound(notification.type);
      }

      // Show desktop notification if enabled
      if (settings.desktop && settings.enabled) {
        showDesktopNotification(notification);
      }
    };

    const cleanup = subscribe('notification', handleNewNotification);
    return cleanup;
  }, [subscribe, settings]);

  // Notification actions
  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, status: 'read' as NotificationStatus } : n
    ));
  };

  const handleMarkAsUnread = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, status: 'unread' as NotificationStatus } : n
    ));
  };

  const handleArchive = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, status: 'archived' as NotificationStatus } : n
    ));
  };

  const handleDismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleActionClick = (notificationId: string, actionId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    const action = notification?.actions?.find(a => a.id === actionId);
    
    if (action) {
      if (action.onClick) {
        action.onClick();
      } else if (action.href) {
        window.open(action.href, '_blank');
      }
    }
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as NotificationStatus })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.status !== 'unread') return false;
    if (filter === 'read' && notification.status !== 'read') return false;
    if (filter === 'archived' && notification.status !== 'archived') return false;
    
    if (searchQuery && !notification.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !notification.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Utility functions
  const playNotificationSound = (type: NotificationType) => {
    if (typeof window !== 'undefined' && 'Audio' in window) {
      try {
        const audio = new Audio(`/sounds/notification-${type}.mp3`);
        audio.play().catch(() => {
          // Fallback to default sound
          const defaultAudio = new Audio('/sounds/notification.mp3');
          defaultAudio.play().catch(() => {
            // If all fails, use system beep
            // System beep not available in browser
          });
        });
      } catch (error) {
        console.warn('Could not play notification sound:', error);
      }
    }
  };

  const showDesktopNotification = (notification: Notification) => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192x192.png',
          tag: notification.id,
          requireInteraction: notification.persistent,
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            showDesktopNotification(notification);
          }
        });
      }
    }
  };

  const getPositionClasses = () => {
    const base = 'fixed z-50 shadow-2xl border border-surface-border bg-surface-card';
    
    switch (position) {
      case 'top-right':
        return `${base} top-4 right-4`;
      case 'top-left':
        return `${base} top-4 left-4`;
      case 'bottom-right':
        return `${base} bottom-4 right-4`;
      case 'bottom-left':
        return `${base} bottom-4 left-4`;
      default:
        return `${base} top-4 right-4`;
    }
  };

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-20 z-40"
        onClick={onClose}
      />

      {/* Notification Panel */}
      <div className={cn(
        getPositionClasses(),
        'w-96 max-w-[calc(100vw-2rem)] rounded-lg animate-scale-in',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h2 className="font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="p-4 border-b border-surface-border space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
              className="h-8"
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('unread')}
              className="h-8"
            >
              Unread
            </Button>
            <Button
              variant={filter === 'read' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('read')}
              className="h-8"
            >
              Read
            </Button>
            <Button
              variant={filter === 'archived' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('archived')}
              className="h-8"
            >
              Archived
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-surface-border rounded-md bg-surface-input focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-9 text-xs"
              disabled={unreadCount === 0}
            >
              Mark All Read
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px] max-h-[50vh]">
          <div className="p-4 space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No notifications found</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onMarkAsUnread={handleMarkAsUnread}
                  onArchive={handleArchive}
                  onDismiss={handleDismiss}
                  onActionClick={handleActionClick}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-surface-border">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-error-600 hover:text-error-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
            <div className="text-xs text-neutral-500">
              {filteredNotifications.length} of {notifications.length} notifications
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Notification bell component
interface NotificationBellProps {
  onClick: () => void;
  unreadCount?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export function NotificationBell({
  onClick,
  unreadCount = 0,
  className,
  size = 'md',
  showDot = true,
}: NotificationBellProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 w-8';
      case 'md':
        return 'h-10 w-10';
      case 'lg':
        return 'h-12 w-12';
      default:
        return 'h-10 w-10';
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        getSizeClasses(),
        'relative p-0 rounded-full',
        className
      )}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="h-5 w-5" />
      {showDot && unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
}

// Hook for notification management
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    sound: true,
    vibration: true,
    desktop: true,
    email: false,
    sms: false,
    doNotDisturb: false,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    filters: {
      types: [],
      priorities: [],
      sources: [],
    },
    autoMarkAsRead: false,
    maxNotifications: 50,
    groupSimilar: true,
  });

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'status'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      status: 'unread',
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, settings.maxNotifications - 1)]);
    return newNotification.id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, status: 'read' as NotificationStatus } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as NotificationStatus })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  return {
    notifications,
    settings,
    unreadCount,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    updateSettings,
  };
}