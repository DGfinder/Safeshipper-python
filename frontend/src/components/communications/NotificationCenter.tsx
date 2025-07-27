// frontend/src/components/communications/NotificationCenter.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  Phone,
  AlertTriangle,
  Settings,
  Clock,
  Volume2,
  VolumeX,
  Smartphone,
  Globe
} from 'lucide-react';
import { format } from 'date-fns';

interface NotificationPreference {
  id: string;
  notification_type: 'CHANNEL_MESSAGE' | 'DIRECT_MESSAGE' | 'MENTION' | 'SHIPMENT_UPDATE' | 'EMERGENCY';
  delivery_method: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  is_enabled: boolean;
  immediate: boolean;
  digest_frequency?: 'REALTIME' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone: string;
}

interface QueuedNotification {
  id: string;
  notification_type: string;
  subject: string;
  message: string;
  created_at: Date;
  priority: number;
  is_read: boolean;
  delivery_method: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED';
}

interface NotificationCenterProps {
  currentUser: any;
  preferences: NotificationPreference[];
  queuedNotifications: QueuedNotification[];
  onPreferenceUpdate: (preferenceId: string, updates: Partial<NotificationPreference>) => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  currentUser,
  preferences,
  queuedNotifications,
  onPreferenceUpdate,
  onMarkAsRead,
  onMarkAllAsRead,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'preferences'>('notifications');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const unreadCount = queuedNotifications.filter(n => !n.is_read).length;

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case 'CHANNEL_MESSAGE':
        return <MessageSquare className="w-4 h-4" />;
      case 'DIRECT_MESSAGE':
        return <Mail className="w-4 h-4" />;
      case 'EMERGENCY':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'SHIPMENT_UPDATE':
        return <Globe className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getDeliveryMethodIcon = (method: string) => {
    switch (method) {
      case 'EMAIL':
        return <Mail className="w-3 h-3" />;
      case 'SMS':
        return <Phone className="w-3 h-3" />;
      case 'PUSH':
        return <Smartphone className="w-3 h-3" />;
      default:
        return <Bell className="w-3 h-3" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return 'bg-red-500';
    if (priority <= 4) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const filteredNotifications = queuedNotifications.filter(notification => {
    if (showUnreadOnly && notification.is_read) return false;
    if (filterType !== 'ALL' && notification.notification_type !== filterType) return false;
    return true;
  });

  const handlePreferenceToggle = (preferenceId: string, field: keyof NotificationPreference, value: any) => {
    onPreferenceUpdate(preferenceId, { [field]: value });
  };

  const renderNotificationsList = () => (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark All Read
          </Button>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={showUnreadOnly}
              onCheckedChange={setShowUnreadOnly}
            />
            <Label className="text-sm">Unread only</Label>
          </div>
        </div>
      </div>

      {/* Filter by type */}
      <div className="flex items-center gap-2">
        <Label className="text-sm">Filter:</Label>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="CHANNEL_MESSAGE">Channel Messages</SelectItem>
            <SelectItem value="DIRECT_MESSAGE">Direct Messages</SelectItem>
            <SelectItem value="EMERGENCY">Emergency Alerts</SelectItem>
            <SelectItem value="SHIPMENT_UPDATE">Shipment Updates</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Notifications list */}
      <ScrollArea className="h-[500px]">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Bell className="w-8 h-8 mb-2" />
            <p>No notifications to show</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`cursor-pointer transition-colors ${
                  !notification.is_read ? 'border-l-4 border-l-primary bg-muted/20' : ''
                }`}
                onClick={() => onMarkAsRead(notification.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getNotificationTypeIcon(notification.notification_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{notification.subject}</h4>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(notification.priority)}`} />
                          {getDeliveryMethodIcon(notification.delivery_method)}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{format(notification.created_at, 'MMM dd, HH:mm')}</span>
                        <Badge 
                          variant={notification.status === 'DELIVERED' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {notification.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  const renderPreferences = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Notification Preferences</h3>
        <Button size="sm" variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Export Settings
        </Button>
      </div>

      <ScrollArea className="h-[500px]">
        <div className="space-y-6">
          {preferences.map((preference) => (
            <Card key={preference.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getNotificationTypeIcon(preference.notification_type)}
                    <CardTitle className="text-base">
                      {preference.notification_type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </CardTitle>
                  </div>
                  
                  <Switch
                    checked={preference.is_enabled}
                    onCheckedChange={(checked) => 
                      handlePreferenceToggle(preference.id, 'is_enabled', checked)
                    }
                  />
                </div>
              </CardHeader>

              {preference.is_enabled && (
                <CardContent className="space-y-4">
                  {/* Delivery Method */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Delivery Method</Label>
                    <Select
                      value={preference.delivery_method}
                      onValueChange={(value) => 
                        handlePreferenceToggle(preference.id, 'delivery_method', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="PUSH">Push Notification</SelectItem>
                        <SelectItem value="IN_APP">In-App Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Immediate vs Digest */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Immediate Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified right away instead of in digest
                      </p>
                    </div>
                    <Switch
                      checked={preference.immediate}
                      onCheckedChange={(checked) => 
                        handlePreferenceToggle(preference.id, 'immediate', checked)
                      }
                    />
                  </div>

                  {/* Digest Frequency (if not immediate) */}
                  {!preference.immediate && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Digest Frequency</Label>
                      <Select
                        value={preference.digest_frequency || 'DAILY'}
                        onValueChange={(value) => 
                          handlePreferenceToggle(preference.id, 'digest_frequency', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HOURLY">Every Hour</SelectItem>
                          <SelectItem value="DAILY">Daily</SelectItem>
                          <SelectItem value="WEEKLY">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Quiet Hours */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Quiet Hours
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Start</Label>
                        <input
                          type="time"
                          className="w-full px-3 py-1 border rounded text-sm"
                          value={preference.quiet_hours_start || ''}
                          onChange={(e) => 
                            handlePreferenceToggle(preference.id, 'quiet_hours_start', e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">End</Label>
                        <input
                          type="time"
                          className="w-full px-3 py-1 border rounded text-sm"
                          value={preference.quiet_hours_end || ''}
                          onChange={(e) => 
                            handlePreferenceToggle(preference.id, 'quiet_hours_end', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Timezone */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Timezone</Label>
                    <Select
                      value={preference.timezone}
                      onValueChange={(value) => 
                        handlePreferenceToggle(preference.id, 'timezone', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <Card className={`w-full h-[700px] ${className}`}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <CardTitle>Notification Center</CardTitle>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={activeTab === 'notifications' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('notifications')}
              className="relative"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'preferences' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('preferences')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Preferences
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {activeTab === 'notifications' ? renderNotificationsList() : renderPreferences()}
      </CardContent>
    </Card>
  );
};