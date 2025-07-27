'use client';

import React, { useEffect, useState } from 'react';
import { Avatar } from '@/shared/components/ui/avatar';
import { cn } from '@/shared/lib/utils';
import type { User } from '@/shared/hooks/useChat';

interface TypingIndicatorProps {
  users: User[];
  className?: string;
  showAvatars?: boolean;
  maxUsersShown?: number;
}

export function TypingIndicator({
  users,
  className,
  showAvatars = true,
  maxUsersShown = 3,
}: TypingIndicatorProps) {
  const [currentDot, setCurrentDot] = useState(0);

  // Animate typing dots
  useEffect(() => {
    if (users.length === 0) return;

    const interval = setInterval(() => {
      setCurrentDot((prev) => (prev + 1) % 3);
    }, 500);

    return () => clearInterval(interval);
  }, [users.length]);

  if (users.length === 0) {
    return null;
  }

  const displayUsers = users.slice(0, maxUsersShown);
  const remainingCount = users.length - maxUsersShown;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].name} is typing`;
    } else if (users.length === 2) {
      return `${users[0].name} and ${users[1].name} are typing`;
    } else if (users.length === 3) {
      return `${users[0].name}, ${users[1].name} and ${users[2].name} are typing`;
    } else {
      return `${users[0].name}, ${users[1].name} and ${users.length - 2} others are typing`;
    }
  };

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400',
      className
    )}>
      {/* User avatars */}
      {showAvatars && (
        <div className="flex -space-x-1">
          {displayUsers.map((user, index) => (
            <Avatar
              key={user.id}
              className="w-6 h-6 border-2 border-white dark:border-gray-800"
              style={{ zIndex: displayUsers.length - index }}
            >
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6B7280&color=fff&size=24`}
                alt={user.name}
                className="w-full h-full rounded-full"
              />
            </Avatar>
          ))}
          
          {remainingCount > 0 && (
            <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
              +{remainingCount}
            </div>
          )}
        </div>
      )}

      {/* Typing text and dots */}
      <div className="flex items-center gap-1">
        <span className="text-xs">{getTypingText()}</span>
        
        {/* Animated typing dots */}
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((dotIndex) => (
            <div
              key={dotIndex}
              className={cn(
                'w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500 transition-all duration-300',
                currentDot === dotIndex ? 'animate-bounce bg-blue-500' : ''
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Enhanced typing indicator with sound wave animation
interface SoundWaveTypingIndicatorProps {
  users: User[];
  className?: string;
}

export function SoundWaveTypingIndicator({
  users,
  className,
}: SoundWaveTypingIndicatorProps) {
  if (users.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2',
      className
    )}>
      {/* User avatar */}
      {users.length === 1 && (
        <Avatar className="w-6 h-6">
          <img
            src={users[0].avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(users[0].name)}&background=6B7280&color=fff&size=24`}
            alt={users[0].name}
            className="w-full h-full rounded-full"
          />
        </Avatar>
      )}

      {/* Multiple users indicator */}
      {users.length > 1 && (
        <div className="flex -space-x-1">
          {users.slice(0, 2).map((user, index) => (
            <Avatar
              key={user.id}
              className="w-6 h-6 border-2 border-white dark:border-gray-800"
              style={{ zIndex: 2 - index }}
            >
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6B7280&color=fff&size=24`}
                alt={user.name}
                className="w-full h-full rounded-full"
              />
            </Avatar>
          ))}
        </div>
      )}

      {/* Sound wave animation */}
      <div className="flex items-center gap-1">
        <div className="sound-wave">
          <span style={{ height: '4px', animationDelay: '0s' }} />
          <span style={{ height: '8px', animationDelay: '0.1s' }} />
          <span style={{ height: '12px', animationDelay: '0.2s' }} />
          <span style={{ height: '8px', animationDelay: '0.3s' }} />
          <span style={{ height: '4px', animationDelay: '0.4s' }} />
        </div>
        
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
          {users.length === 1 ? `${users[0].name} is typing` : `${users.length} people are typing`}
        </span>
      </div>
    </div>
  );
}

// Compact typing indicator for mobile
interface CompactTypingIndicatorProps {
  users: User[];
  className?: string;
}

export function CompactTypingIndicator({
  users,
  className,
}: CompactTypingIndicatorProps) {
  if (users.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full',
      className
    )}>
      {/* Typing dots only */}
      <div className="typing-indicator">
        <span />
        <span />
        <span />
      </div>
      
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {users.length === 1 ? users[0].name.split(' ')[0] : `${users.length} typing`}
      </span>
    </div>
  );
}

// Hook for managing typing state
export function useTypingIndicator() {
  const [typingUsers, setTypingUsers] = useState<User[]>([]);
  const [typingTimeouts, setTypingTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());

  const addTypingUser = (user: User, timeout = 3000) => {
    setTypingUsers(prev => {
      if (prev.some(u => u.id === user.id)) {
        return prev;
      }
      return [...prev, user];
    });

    // Clear existing timeout for this user
    const existingTimeout = typingTimeouts.get(user.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const newTimeout = setTimeout(() => {
      removeTypingUser(user.id);
    }, timeout);

    setTypingTimeouts(prev => {
      const newMap = new Map(prev);
      newMap.set(user.id, newTimeout);
      return newMap;
    });
  };

  const removeTypingUser = (userId: string) => {
    setTypingUsers(prev => prev.filter(u => u.id !== userId));
    
    setTypingTimeouts(prev => {
      const newMap = new Map(prev);
      const timeout = newMap.get(userId);
      if (timeout) {
        clearTimeout(timeout);
        newMap.delete(userId);
      }
      return newMap;
    });
  };

  const clearAllTypingUsers = () => {
    // Clear all timeouts
    typingTimeouts.forEach(timeout => clearTimeout(timeout));
    setTypingTimeouts(new Map());
    setTypingUsers([]);
  };

  return {
    typingUsers,
    addTypingUser,
    removeTypingUser,
    clearAllTypingUsers,
  };
}