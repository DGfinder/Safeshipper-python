'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Avatar } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuthStore } from '@/shared/stores/auth-store';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Circle, 
  Clock, 
  Phone, 
  Smartphone, 
  Monitor, 
  MapPin,
  Eye,
  Users,
  MessageSquare
} from 'lucide-react';

export interface UserPresence {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen: Date;
  is_typing?: boolean;
  typing_in_channel?: string;
  device_type?: 'desktop' | 'mobile' | 'tablet';
  location?: {
    country?: string;
    city?: string;
    coordinates?: [number, number];
  };
  current_page?: string;
  activity?: string;
}

interface PresenceSystemProps {
  channelId?: string;
  showDetailedPresence?: boolean;
  maxUsersShown?: number;
  className?: string;
}

interface UserPresenceIndicatorProps {
  presence: UserPresence;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  showActivity?: boolean;
  className?: string;
}

// Individual user presence indicator
export function UserPresenceIndicator({
  presence,
  size = 'md',
  showDetails = false,
  showActivity = false,
  className,
}: UserPresenceIndicatorProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400',
  };

  const statusIcons = {
    online: Circle,
    away: Clock,
    busy: Phone,
    offline: Circle,
  };

  const deviceIcons = {
    desktop: Monitor,
    mobile: Smartphone,
    tablet: Smartphone,
  };

  const StatusIcon = statusIcons[presence.status];
  const DeviceIcon = presence.device_type ? deviceIcons[presence.device_type] : null;

  const getStatusText = () => {
    switch (presence.status) {
      case 'online':
        return 'Active now';
      case 'away':
        return `Away • ${formatDistanceToNow(presence.last_seen)} ago`;
      case 'busy':
        return 'Busy';
      case 'offline':
        return `Last seen ${formatDistanceToNow(presence.last_seen)} ago`;
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Avatar with status indicator */}
      <div className="relative">
        <Avatar className={sizeClasses[size]}>
          {presence.user_avatar ? (
            <img
              src={presence.user_avatar}
              alt={presence.user_name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-medium">
              {presence.user_name.charAt(0).toUpperCase()}
            </div>
          )}
        </Avatar>
        
        {/* Status indicator */}
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
            statusColors[presence.status]
          )}
        />
        
        {/* Typing indicator */}
        {presence.is_typing && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
            <MessageSquare className="w-2 h-2 text-white" />
          </div>
        )}
      </div>

      {/* User details */}
      {showDetails && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{presence.user_name}</span>
            {DeviceIcon && (
              <DeviceIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
            )}
          </div>
          
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <StatusIcon className="w-3 h-3" />
            <span>{getStatusText()}</span>
          </div>
          
          {/* Activity and location */}
          {showActivity && (
            <div className="mt-1 text-xs text-gray-400 space-y-1">
              {presence.activity && (
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span className="truncate">{presence.activity}</span>
                </div>
              )}
              {presence.location?.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{presence.location.city}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main presence system component
export function PresenceSystem({
  channelId,
  showDetailedPresence = false,
  maxUsersShown = 10,
  className,
}: PresenceSystemProps) {
  const [presenceData, setPresenceData] = useState<Map<string, UserPresence>>(new Map());
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { sendMessage, subscribe } = useWebSocket();
  const { user } = useAuthStore();

  // Subscribe to presence updates
  useEffect(() => {
    const unsubscribePresence = subscribe('user_presence_update', (data: UserPresence) => {
      setPresenceData(prev => new Map(prev).set(data.user_id, data));
    });

    const unsubscribeTyping = subscribe('user_typing', (data: { user_id: string; channel_id: string; is_typing: boolean }) => {
      setPresenceData(prev => {
        const newMap = new Map(prev);
        const userPresence = newMap.get(data.user_id);
        if (userPresence) {
          newMap.set(data.user_id, {
            ...userPresence,
            is_typing: data.is_typing,
            typing_in_channel: data.is_typing ? data.channel_id : undefined,
          });
        }
        return newMap;
      });
    });

    const unsubscribeUserJoined = subscribe('user_joined_channel', (data: { user: UserPresence; channel_id: string }) => {
      if (!channelId || data.channel_id === channelId) {
        setPresenceData(prev => new Map(prev).set(data.user.user_id, data.user));
      }
    });

    const unsubscribeUserLeft = subscribe('user_left_channel', (data: { user_id: string; channel_id: string }) => {
      if (!channelId || data.channel_id === channelId) {
        setPresenceData(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.user_id);
          return newMap;
        });
      }
    });

    // Request initial presence data
    if (channelId) {
      sendMessage({
        type: 'get_channel_presence',
        channel_id: channelId,
      });
    } else {
      sendMessage({
        type: 'get_global_presence',
      });
    }

    return () => {
      unsubscribePresence();
      unsubscribeTyping();
      unsubscribeUserJoined();
      unsubscribeUserLeft();
    };
  }, [channelId, subscribe, sendMessage]);

  // Update own presence periodically
  useEffect(() => {
    if (!user) return;

    const updatePresence = () => {
      sendMessage({
        type: 'update_presence',
        status: 'online',
        device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        current_page: window.location.pathname,
        activity: document.title,
      });
    };

    // Update immediately
    updatePresence();

    // Update every 30 seconds
    const interval = setInterval(updatePresence, 30000);

    // Update on page focus
    const handleFocus = () => updatePresence();
    const handleBlur = () => {
      sendMessage({
        type: 'update_presence',
        status: 'away',
      });
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [user, sendMessage]);

  // Process presence data
  const { onlineUsers, typingUsers, totalUsers } = useMemo(() => {
    const users = Array.from(presenceData.values());
    const online = users.filter(u => u.status === 'online');
    const typing = users.filter(u => u.is_typing && (!channelId || u.typing_in_channel === channelId));
    
    return {
      onlineUsers: online,
      typingUsers: typing,
      totalUsers: users.length,
    };
  }, [presenceData, channelId]);

  // Get users to display
  const usersToShow = isExpanded ? onlineUsers : onlineUsers.slice(0, maxUsersShown);
  const remainingCount = onlineUsers.length - maxUsersShown;

  if (totalUsers === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Online users summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Circle className="w-3 h-3 text-green-500 fill-current" />
            <span className="text-sm font-medium">
              {onlineUsers.length} online
            </span>
          </div>
          {typingUsers.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {typingUsers.length} typing
            </Badge>
          )}
        </div>
        
        {onlineUsers.length > maxUsersShown && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? 'Show less' : `+${remainingCount} more`}
          </Button>
        )}
      </div>

      {/* User list */}
      <div className="space-y-2">
        {usersToShow.map((presence) => (
          <UserPresenceIndicator
            key={presence.user_id}
            presence={presence}
            showDetails={showDetailedPresence}
            showActivity={showDetailedPresence}
          />
        ))}
      </div>

      {/* Typing indicators */}
      {typingUsers.length > 0 && (
        <div className="border-t pt-2">
          <div className="text-xs text-gray-500 mb-2">Currently typing:</div>
          <div className="space-y-1">
            {typingUsers.map((presence) => (
              <div key={presence.user_id} className="flex items-center gap-2">
                <UserPresenceIndicator
                  presence={presence}
                  size="sm"
                  showDetails={false}
                />
                <div className="typing-indicator">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for managing user presence
export function usePresence() {
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const { sendMessage, subscribe } = useWebSocket();
  const { user } = useAuthStore();

  const updateStatus = useCallback((status: UserPresence['status']) => {
    if (!user) return;

    const newPresence: Partial<UserPresence> = {
      user_id: user.id,
      status,
      last_seen: new Date(),
    };

    setPresence(prev => prev ? { ...prev, ...newPresence } : null);
    
    sendMessage({
      type: 'update_presence',
      ...newPresence,
    });
  }, [user, sendMessage]);

  const setTyping = useCallback((isTyping: boolean, channelId?: string) => {
    sendMessage({
      type: 'user_typing',
      is_typing: isTyping,
      channel_id: channelId,
    });
  }, [sendMessage]);

  useEffect(() => {
    const unsubscribe = subscribe('presence_updated', (data: UserPresence) => {
      if (user && data.user_id === user.id) {
        setPresence(data);
      }
    });

    return unsubscribe;
  }, [user, subscribe]);

  return {
    presence,
    updateStatus,
    setTyping,
  };
}

export default PresenceSystem;