// hooks/useChat.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuthStore } from '@/shared/stores/auth-store';
import { toast } from 'react-hot-toast';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'away';
}

export interface Message {
  id: string;
  content: string;
  sender: User;
  timestamp: Date;
  message_type: 'TEXT' | 'FILE' | 'IMAGE' | 'VOICE' | 'LOCATION' | 'SYSTEM' | 'EMERGENCY';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  is_emergency: boolean;
  reply_to?: Message;
  reactions?: { emoji: string; users: User[] }[];
  file_url?: string;
  file_name?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  channel_id: string;
  thread_id?: string;
  metadata?: Record<string, any>;
}

export interface Channel {
  id: string;
  name: string;
  channel_type: 'GENERAL' | 'SHIPMENT' | 'EMERGENCY' | 'COMPLIANCE' | 'DIRECT' | 'COMPANY' | 'DRIVER' | 'CUSTOMER';
  is_private: boolean;
  is_emergency_channel: boolean;
  emergency_level?: number;
  participants: User[];
  unread_count: number;
  last_message?: Message;
}

interface TypingUser {
  user_id: string;
  channel_id: string;
  is_typing: boolean;
}

interface ChatState {
  channels: Channel[];
  selectedChannelId: string | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, User[]>;
  onlineUsers: Set<string>;
  unreadCounts: Record<string, number>;
}

export const useChat = () => {
  const { sendMessage, subscribe, isConnected } = useWebSocket();
  const { user } = useAuthStore();
  const [chatState, setChatState] = useState<ChatState>({
    channels: [],
    selectedChannelId: null,
    messages: {},
    typingUsers: {},
    onlineUsers: new Set(),
    unreadCounts: {},
  });

  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Convert API message to frontend Message format
  const convertApiMessage = useCallback((apiMessage: any): Message => {
    return {
      id: apiMessage.id,
      content: apiMessage.content,
      sender: {
        id: apiMessage.sender.id,
        name: apiMessage.sender.name,
        email: apiMessage.sender.email,
        avatar: apiMessage.sender.avatar,
      },
      timestamp: new Date(apiMessage.created_at),
      message_type: apiMessage.message_type,
      priority: apiMessage.priority,
      is_emergency: apiMessage.is_emergency,
      reply_to: apiMessage.reply_to ? convertApiMessage(apiMessage.reply_to) : undefined,
      reactions: apiMessage.reactions || [],
      file_url: apiMessage.file_url,
      file_name: apiMessage.file_name,
      latitude: apiMessage.latitude,
      longitude: apiMessage.longitude,
      location_name: apiMessage.location_name,
      channel_id: apiMessage.channel_id,
      thread_id: apiMessage.thread_id,
      metadata: apiMessage.metadata || {},
    };
  }, []);

  // Handle incoming chat messages
  useEffect(() => {
    const unsubscribeChatMessage = subscribe('chat_message', (data: any) => {
      const message = convertApiMessage(data.message);
      setChatState(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [message.channel_id]: [
            ...(prev.messages[message.channel_id] || []),
            message
          ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        }
      }));

      // Show notification if not in current channel
      if (message.channel_id !== chatState.selectedChannelId && message.sender.id !== user?.id) {
        toast(`New message from ${message.sender.name}`, { icon: '💬' });
      }
    });

    const unsubscribeTyping = subscribe('typing_indicator', (data: any) => {
      const { user_id, channel_id, is_typing } = data;
      
      setChatState(prev => {
        const channelTypers = prev.typingUsers[channel_id] || [];
        const existingUser = channelTypers.find(u => u.id === user_id);
        
        if (is_typing && !existingUser) {
          // Add typing user
          return {
            ...prev,
            typingUsers: {
              ...prev.typingUsers,
              [channel_id]: [...channelTypers, { id: user_id, name: `User ${user_id}`, email: '' }]
            }
          };
        } else if (!is_typing && existingUser) {
          // Remove typing user
          return {
            ...prev,
            typingUsers: {
              ...prev.typingUsers,
              [channel_id]: channelTypers.filter(u => u.id !== user_id)
            }
          };
        }
        
        return prev;
      });

      // Clear typing indicator after timeout
      if (is_typing) {
        if (typingTimeoutRef.current[`${channel_id}_${user_id}`]) {
          clearTimeout(typingTimeoutRef.current[`${channel_id}_${user_id}`]);
        }
        
        typingTimeoutRef.current[`${channel_id}_${user_id}`] = setTimeout(() => {
          setChatState(prev => ({
            ...prev,
            typingUsers: {
              ...prev.typingUsers,
              [channel_id]: (prev.typingUsers[channel_id] || []).filter(u => u.id !== user_id)
            }
          }));
        }, 3000);
      }
    });

    const unsubscribeUserStatus = subscribe('user_status_update', (data: any) => {
      const { user_id, status } = data;
      setChatState(prev => {
        const newOnlineUsers = new Set(prev.onlineUsers);
        if (status === 'online') {
          newOnlineUsers.add(user_id);
        } else {
          newOnlineUsers.delete(user_id);
        }
        return {
          ...prev,
          onlineUsers: newOnlineUsers
        };
      });
    });

    const unsubscribeUserJoined = subscribe('user_joined', (data: any) => {
      const { user_id, channel_id } = data;
      toast(`User joined ${channel_id}`, { icon: '👋' });
    });

    const unsubscribeUserLeft = subscribe('user_left', (data: any) => {
      const { user_id, channel_id } = data;
      toast(`User left ${channel_id}`, { icon: '👋' });
    });

    const unsubscribeReaction = subscribe('reaction_update', (data: any) => {
      const { message_id, reaction, user_id, action } = data;
      // Update message reactions in state
      setChatState(prev => {
        const newMessages = { ...prev.messages };
        for (const channelId in newMessages) {
          const messageIndex = newMessages[channelId].findIndex(m => m.id === message_id);
          if (messageIndex !== -1) {
            const message = { ...newMessages[channelId][messageIndex] };
            const reactions = message.reactions || [];
            const reactionIndex = reactions.findIndex(r => r.emoji === reaction);
            
            if (action === 'added') {
              if (reactionIndex !== -1) {
                reactions[reactionIndex].users.push({ id: user_id, name: `User ${user_id}`, email: '' });
              } else {
                reactions.push({ emoji: reaction, users: [{ id: user_id, name: `User ${user_id}`, email: '' }] });
              }
            } else if (action === 'removed' && reactionIndex !== -1) {
              reactions[reactionIndex].users = reactions[reactionIndex].users.filter(u => u.id !== user_id);
              if (reactions[reactionIndex].users.length === 0) {
                reactions.splice(reactionIndex, 1);
              }
            }
            
            message.reactions = reactions;
            newMessages[channelId][messageIndex] = message;
          }
        }
        return {
          ...prev,
          messages: newMessages
        };
      });
    });

    const unsubscribeError = subscribe('error', (data: any) => {
      toast.error(`Chat error: ${data.message}`);
    });

    const unsubscribeConnection = subscribe('connection_established', (data: any) => {
      console.log('Chat connection established:', data);
      toast.success('Connected to chat');
    });

    return () => {
      unsubscribeChatMessage();
      unsubscribeTyping();
      unsubscribeUserStatus();
      unsubscribeUserJoined();
      unsubscribeUserLeft();
      unsubscribeReaction();
      unsubscribeError();
      unsubscribeConnection();
    };
  }, [subscribe, convertApiMessage, chatState.selectedChannelId, user?.id]);

  // Chat actions
  const sendChatMessage = useCallback((content: string, channelId: string, options: any = {}) => {
    if (!isConnected) {
      toast.error('Not connected to chat server');
      return;
    }

    const message = {
      type: 'send_message',
      channel_id: channelId,
      content,
      message_type: options.message_type || 'TEXT',
      reply_to: options.reply_to_id,
      metadata: options.metadata || {}
    };

    sendMessage(message);
  }, [sendMessage, isConnected]);

  const joinChannel = useCallback((channelId: string) => {
    if (!isConnected) {
      toast.error('Not connected to chat server');
      return;
    }

    sendMessage({
      type: 'join_channel',
      channel_id: channelId
    });
  }, [sendMessage, isConnected]);

  const leaveChannel = useCallback((channelId: string) => {
    if (!isConnected) {
      toast.error('Not connected to chat server');
      return;
    }

    sendMessage({
      type: 'leave_channel',
      channel_id: channelId
    });
  }, [sendMessage, isConnected]);

  const markAsRead = useCallback((channelId: string, messageId?: string) => {
    if (!isConnected) return;

    sendMessage({
      type: 'mark_read',
      channel_id: channelId,
      message_id: messageId
    });
  }, [sendMessage, isConnected]);

  const startTyping = useCallback((channelId: string) => {
    if (!isConnected) return;

    sendMessage({
      type: 'typing_start',
      channel_id: channelId
    });
  }, [sendMessage, isConnected]);

  const stopTyping = useCallback((channelId: string) => {
    if (!isConnected) return;

    sendMessage({
      type: 'typing_stop',
      channel_id: channelId
    });
  }, [sendMessage, isConnected]);

  const reactToMessage = useCallback((messageId: string, emoji: string) => {
    if (!isConnected) return;

    sendMessage({
      type: 'react_to_message',
      message_id: messageId,
      reaction: emoji
    });
  }, [sendMessage, isConnected]);

  const selectChannel = useCallback((channelId: string) => {
    setChatState(prev => ({
      ...prev,
      selectedChannelId: channelId,
      unreadCounts: {
        ...prev.unreadCounts,
        [channelId]: 0
      }
    }));
    
    // Mark channel as read when selected
    markAsRead(channelId);
  }, [markAsRead]);

  const selectedChannel = chatState.channels.find(c => c.id === chatState.selectedChannelId);
  const selectedChannelMessages = chatState.selectedChannelId 
    ? chatState.messages[chatState.selectedChannelId] || []
    : [];
  const selectedChannelTypingUsers = chatState.selectedChannelId
    ? chatState.typingUsers[chatState.selectedChannelId] || []
    : [];

  return {
    // State
    channels: chatState.channels,
    selectedChannel,
    selectedChannelMessages,
    typingUsers: selectedChannelTypingUsers,
    onlineUsers: chatState.onlineUsers,
    isConnected,
    
    // Actions
    sendMessage: sendChatMessage,
    joinChannel,
    leaveChannel,
    selectChannel,
    markAsRead,
    startTyping,
    stopTyping,
    reactToMessage,
    
    // Development utilities
    _devUtils: {
      setChannels: (channels: Channel[]) => setChatState(prev => ({ ...prev, channels })),
      setMessages: (channelId: string, messages: Message[]) => 
        setChatState(prev => ({
          ...prev,
          messages: { ...prev.messages, [channelId]: messages }
        }))
    }
  };
};