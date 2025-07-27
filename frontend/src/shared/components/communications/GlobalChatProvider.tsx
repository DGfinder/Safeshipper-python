'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FloatingChatWidget } from './FloatingChatWidget';
import { usePermissions } from '@/contexts/PermissionContext';
import { useAuthStore } from '@/shared/stores/auth-store';

interface GlobalChatContextType {
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  isEnabled: boolean;
}

const GlobalChatContext = createContext<GlobalChatContextType | undefined>(undefined);

interface GlobalChatProviderProps {
  children: ReactNode;
  enabledRoles?: string[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  defaultMinimized?: boolean;
}

export function GlobalChatProvider({
  children,
  enabledRoles = ['admin', 'manager', 'operator', 'driver'],
  position = 'bottom-right',
  defaultMinimized = true,
}: GlobalChatProviderProps) {
  const [isChatOpen, setIsChatOpen] = useState(!defaultMinimized);
  const { can } = usePermissions();
  const { user } = useAuthStore();

  // Check if chat is enabled for current user
  const isEnabled = can('communications.chat.view') && 
    (enabledRoles.length === 0 || (user?.role ? enabledRoles.includes(user.role) : false));

  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);
  const toggleChat = () => setIsChatOpen(prev => !prev);

  // Keyboard shortcut for opening chat
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to open chat
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        toggleChat();
      }
      
      // Escape to close chat
      if (event.key === 'Escape' && isChatOpen) {
        closeChat();
      }
    };

    if (isEnabled) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [isEnabled, isChatOpen, toggleChat]);

  const value: GlobalChatContextType = {
    isChatOpen,
    openChat,
    closeChat,
    toggleChat,
    isEnabled,
  };

  return (
    <GlobalChatContext.Provider value={value}>
      {children}
      
      {/* Render floating chat widget if enabled */}
      {isEnabled && (
        <FloatingChatWidget
          position={position}
          defaultMinimized={defaultMinimized}
          showOnlyForRoles={enabledRoles}
        />
      )}
    </GlobalChatContext.Provider>
  );
}

// Hook to use global chat context
export function useGlobalChat() {
  const context = useContext(GlobalChatContext);
  if (context === undefined) {
    throw new Error('useGlobalChat must be used within a GlobalChatProvider');
  }
  return context;
}

// Chat trigger button component
interface ChatTriggerButtonProps {
  className?: string;
  variant?: 'floating' | 'button' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  showUnreadCount?: boolean;
}

export function ChatTriggerButton({
  className,
  variant = 'button',
  size = 'md',
  showUnreadCount = true,
}: ChatTriggerButtonProps) {
  const { toggleChat, isEnabled } = useGlobalChat();

  if (!isEnabled) {
    return null;
  }

  // This would integrate with the actual unread count from the chat system
  const unreadCount = 0; // TODO: Connect to actual unread count

  const handleClick = () => {
    toggleChat();
  };

  if (variant === 'floating') {
    return (
      <button
        onClick={handleClick}
        className={`fixed bottom-4 right-4 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 z-40 ${className}`}
        aria-label="Open chat"
      >
        <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a9.863 9.863 0 01-4.906-1.289L3 21l1.71-5.094A9.863 9.863 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
        </svg>
        
        {showUnreadCount && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        className={`relative p-2 text-gray-500 hover:text-gray-700 transition-colors ${className}`}
        aria-label="Open chat"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a9.863 9.863 0 01-4.906-1.289L3 21l1.71-5.094A9.863 9.863 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
        </svg>
        
        {showUnreadCount && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${className}`}
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a9.863 9.863 0 01-4.906-1.289L3 21l1.71-5.094A9.863 9.863 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
      </svg>
      Chat
      
      {showUnreadCount && unreadCount > 0 && (
        <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}