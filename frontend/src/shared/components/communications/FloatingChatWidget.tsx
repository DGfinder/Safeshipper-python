'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar } from '@/shared/components/ui/avatar';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { useAuthStore } from '@/shared/stores/auth-store';
import { useChat, type User, type Message, type Channel } from '@/shared/hooks/useChat';
import { usePermissions } from '@/contexts/PermissionContext';
import { cn } from '@/shared/lib/utils';
import { format } from 'date-fns';
import {
  MessageSquare,
  Send,
  Paperclip,
  Smile,
  Mic,
  MicOff,
  Phone,
  Video,
  MoreVertical,
  X,
  Minus,
  Maximize2,
  AlertTriangle,
  Users,
  Settings,
  Plus,
  Search,
  ArrowDown,
  Circle,
  Check,
  CheckCheck,
  Clock,
  Volume2,
  Image,
  FileText,
  MapPin,
  Zap,
  Star,
  Reply,
  Heart,
  ThumbsUp,
  Laugh,
  Angry,
  Frown,
} from 'lucide-react';

// Enhanced message interface with modern chat styling
interface ModernMessage extends Message {
  isDelivered?: boolean;
  isRead?: boolean;
  readBy?: User[];
  deliveredAt?: Date;
  readAt?: Date;
}

interface FloatingChatWidgetProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  defaultMinimized?: boolean;
  showOnlyForRoles?: string[];
}

export function FloatingChatWidget({
  className,
  position = 'bottom-right',
  defaultMinimized = true,
  showOnlyForRoles,
}: FloatingChatWidgetProps) {
  const { user } = useAuthStore();
  const { can } = usePermissions();
  const {
    channels,
    selectedChannel,
    selectedChannelMessages: messages,
    typingUsers,
    isConnected,
    sendMessage: sendChatMessage,
    selectChannel,
    startTyping,
    stopTyping,
    reactToMessage,
    joinChannel,
    _devUtils
  } = useChat();

  // Widget states
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ModernMessage | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Check permissions
  const canUseChat = can('communications.chat.view');
  const canUseVoice = can('voice.interface.view');
  const canAccessEmergency = can('voice.interface.emergency');

  // Convert user to chat user format
  const convertToChatUser = useCallback((authUser: any): User => {
    const name = authUser?.firstName && authUser?.lastName 
      ? `${authUser.firstName} ${authUser.lastName}`
      : authUser?.username || authUser?.email || 'Unknown User';
    
    return {
      id: authUser?.id || 'demo-user-1',
      name,
      email: authUser?.email || 'demo@safeshipper.com',
      avatar: authUser?.avatar,
      status: 'online' as const
    };
  }, []);

  const currentUser = user ? convertToChatUser(user) : {
    id: 'demo-user-1',
    name: 'Demo User',
    email: 'demo@safeshipper.com',
    avatar: undefined,
    status: 'online' as const
  };

  // Mock data setup for development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && channels.length === 0) {
      const mockChannels: Channel[] = [
        {
          id: 'general',
          name: 'General',
          channel_type: 'GENERAL',
          is_private: false,
          is_emergency_channel: false,
          participants: [currentUser],
          unread_count: 3
        },
        {
          id: 'shipment-alerts',
          name: 'Shipment Alerts',
          channel_type: 'SHIPMENT',
          is_private: false,
          is_emergency_channel: false,
          participants: [currentUser],
          unread_count: 1
        },
        {
          id: 'emergency',
          name: 'Emergency',
          channel_type: 'EMERGENCY',
          is_private: false,
          is_emergency_channel: true,
          emergency_level: 1,
          participants: [currentUser],
          unread_count: 0
        }
      ];
      
      _devUtils.setChannels(mockChannels);
      
      // Select first channel by default
      selectChannel('general');
      
      // Add some mock messages
      const mockMessages: ModernMessage[] = [
        {
          id: '1',
          content: 'Hey team, how are the shipments looking today?',
          sender: {
            id: 'user-2',
            name: 'Sarah Johnson',
            email: 'sarah@example.com',
            status: 'online'
          },
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          message_type: 'TEXT',
          priority: 'NORMAL',
          is_emergency: false,
          channel_id: 'general',
          isDelivered: true,
          isRead: true,
          readBy: [currentUser]
        },
        {
          id: '2',
          content: 'All shipments are on track. SH-2024-001 just departed from Toronto.',
          sender: currentUser,
          timestamp: new Date(Date.now() - 8 * 60 * 1000),
          message_type: 'TEXT',
          priority: 'NORMAL',
          is_emergency: false,
          channel_id: 'general',
          isDelivered: true,
          isRead: false
        },
        {
          id: '3',
          content: 'Perfect! Thanks for the update. The customer will be pleased.',
          sender: {
            id: 'user-2',
            name: 'Sarah Johnson',
            email: 'sarah@example.com',
            status: 'online'
          },
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          message_type: 'TEXT',
          priority: 'NORMAL',
          is_emergency: false,
          channel_id: 'general',
          isDelivered: true,
          isRead: false
        }
      ];
      
      _devUtils.setMessages('general', mockMessages);
    }
  }, [channels, currentUser, _devUtils, selectChannel]);

  // Calculate total unread count
  useEffect(() => {
    const total = channels.reduce((sum, channel) => sum + (channel.unread_count || 0), 0);
    setUnreadCount(total);
  }, [channels]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!isMinimized) {
      scrollToBottom();
    }
  }, [messages, isMinimized, scrollToBottom]);

  // Handle typing indicators
  useEffect(() => {
    if (selectedChannel) {
      if (newMessage.trim() && !isTyping) {
        setIsTyping(true);
        startTyping(selectedChannel.id);
      } else if (!newMessage.trim() && isTyping) {
        setIsTyping(false);
        stopTyping(selectedChannel.id);
      }
    }
  }, [newMessage, isTyping, selectedChannel, startTyping, stopTyping]);

  // Handle message sending
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedChannel) return;

    const messageOptions: any = {};
    
    if (replyingTo) {
      messageOptions.reply_to_id = replyingTo.id;
    }
    
    if (selectedFile) {
      messageOptions.message_type = selectedFile.type.startsWith('image/') ? 'IMAGE' : 'FILE';
    }

    sendChatMessage(newMessage.trim(), selectedChannel.id, messageOptions);
    
    setNewMessage('');
    setReplyingTo(null);
    setSelectedFile(null);
    setIsTyping(false);
    
    if (selectedChannel) {
      stopTyping(selectedChannel.id);
    }
  };

  // Quick emoji reactions
  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  const handleQuickReaction = (message: ModernMessage, emoji: string) => {
    reactToMessage(message.id, emoji);
  };

  // Get position classes for the widget
  const getPositionClasses = () => {
    const base = 'fixed z-50';
    
    switch (position) {
      case 'bottom-right':
        return `${base} bottom-4 right-4`;
      case 'bottom-left':
        return `${base} bottom-4 left-4`;
      case 'top-right':
        return `${base} top-4 right-4`;
      case 'top-left':
        return `${base} top-4 left-4`;
      default:
        return `${base} bottom-4 right-4`;
    }
  };

  // Render modern message bubble
  const renderModernMessage = (message: ModernMessage) => {
    const isOwnMessage = message.sender.id === currentUser.id;
    const isEmergency = message.is_emergency || message.priority === 'URGENT';
    
    return (
      <div
        key={message.id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3 group`}
      >
        {!isOwnMessage && (
          <Avatar className="w-8 h-8 mr-2 mt-1 flex-shrink-0">
            <img 
              src={message.sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender.name)}&background=3B82F6&color=fff`}
              alt={message.sender.name}
              className="w-full h-full rounded-full"
            />
          </Avatar>
        )}
        
        <div className={`max-w-[75%] ${isOwnMessage ? 'text-right' : 'text-left'}`}>
          {!isOwnMessage && (
            <div className="text-xs text-gray-500 mb-1 ml-2">
              {message.sender.name}
            </div>
          )}
          
          {message.reply_to && (
            <div className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded-lg mb-1 ml-2 border-l-2 border-blue-500">
              <div className="font-medium text-blue-600 dark:text-blue-400">
                {message.reply_to.sender.name}
              </div>
              <div className="truncate text-gray-600 dark:text-gray-300">
                {message.reply_to.content}
              </div>
            </div>
          )}
          
          <div
            className={cn(
              'rounded-2xl px-4 py-2 relative shadow-sm',
              isOwnMessage 
                ? 'bg-blue-500 text-white rounded-br-md' 
                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-bl-md',
              isEmergency && 'ring-2 ring-red-500 shadow-red-500/20'
            )}
          >
            {isEmergency && (
              <div className="flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-xs font-bold text-red-400">EMERGENCY</span>
              </div>
            )}
            
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </div>
            
            {/* Message metadata */}
            <div className={cn(
              'flex items-center justify-end gap-1 mt-1 text-xs',
              isOwnMessage ? 'text-blue-100' : 'text-gray-500'
            )}>
              <span>{format(message.timestamp, 'HH:mm')}</span>
              {isOwnMessage && (
                <div className="flex items-center">
                  {message.isDelivered ? (
                    message.isRead ? (
                      <CheckCheck className="w-3 h-3 text-blue-200" />
                    ) : (
                      <CheckCheck className="w-3 h-3 text-gray-300" />
                    )
                  ) : (
                    <Check className="w-3 h-3 text-gray-300" />
                  )}
                </div>
              )}
            </div>
            
            {/* Quick reactions on hover */}
            <div className={cn(
              'absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 p-1 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-600',
              isOwnMessage ? '-left-8 top-0' : '-right-8 top-0'
            )}>
              {quickReactions.slice(0, 3).map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleQuickReaction(message, emoji)}
                  className="w-6 h-6 hover:scale-110 transition-transform duration-150 text-sm"
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
              <button
                onClick={() => setReplyingTo(message)}
                className="w-6 h-6 hover:scale-110 transition-transform duration-150 flex items-center justify-center"
                title="Reply"
              >
                <Reply className="w-3 h-3 text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Message reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 ml-2">
              {message.reactions.map((reaction, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickReaction(message, reaction.emoji)}
                  className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-1 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-gray-600 dark:text-gray-400">{reaction.users.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {isOwnMessage && (
          <Avatar className="w-8 h-8 ml-2 mt-1 flex-shrink-0">
            <img 
              src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=3B82F6&color=fff`}
              alt={currentUser.name}
              className="w-full h-full rounded-full"
            />
          </Avatar>
        )}
      </div>
    );
  };

  // Don't render if user doesn't have permission
  if (!canUseChat) {
    return null;
  }

  // Check role restrictions
  if (showOnlyForRoles && user && !showOnlyForRoles.includes(user.role)) {
    return null;
  }

  // Floating chat bubble (minimized state)
  if (isMinimized) {
    return (
      <div className={cn(getPositionClasses(), className)} ref={widgetRef}>
        <Button
          onClick={() => setIsMinimized(false)}
          className={cn(
            'w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105',
            'bg-blue-500 hover:bg-blue-600 text-white',
            'relative overflow-hidden'
          )}
          aria-label={`Open chat${unreadCount > 0 ? ` (${unreadCount} unread messages)` : ''}`}
        >
          <MessageSquare className="w-6 h-6" />
          
          {/* Unread count badge */}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-6 w-6 p-0 text-xs flex items-center justify-center animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          
          {/* Online status indicator */}
          <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
          
          {/* Connection status */}
          {!isConnected && (
            <div className="absolute top-1 left-1 w-3 h-3 bg-red-400 rounded-full border-2 border-white animate-pulse" />
          )}
        </Button>
      </div>
    );
  }

  // Expanded chat interface
  return (
    <div className={cn(getPositionClasses(), className)} ref={widgetRef}>
      <Card className={cn(
        'w-80 h-96 shadow-2xl border-0 overflow-hidden',
        'transform transition-all duration-300 ease-out',
        isExpanded ? 'w-96 h-[32rem]' : '',
        'animate-scale-in'
      )}>
        {/* Chat header */}
        <CardHeader className="p-3 bg-blue-500 text-white border-b-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1">
                <Circle className={cn(
                  'w-2 h-2 rounded-full',
                  isConnected ? 'bg-green-400' : 'bg-red-400'
                )} />
                <span className="text-xs opacity-75">
                  {isConnected ? 'Online' : 'Offline'}
                </span>
              </div>
              
              {selectedChannel && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    {selectedChannel.is_emergency_channel && (
                      <AlertTriangle className="w-3 h-3 text-red-300" />
                    )}
                    <CardTitle className="text-sm font-medium truncate">
                      {selectedChannel.name}
                    </CardTitle>
                  </div>
                  
                  {typingUsers.length > 0 && (
                    <div className="text-xs opacity-75 truncate">
                      {typingUsers.map(u => u.name).join(', ')} typing...
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {canUseVoice && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-white hover:bg-blue-600"
                >
                  <Phone className="w-3 h-3" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 w-7 p-0 text-white hover:bg-blue-600"
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-7 w-7 p-0 text-white hover:bg-blue-600"
              >
                <Minus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Messages area */}
        <CardContent className="p-0 flex-1 flex flex-col h-full">
          <ScrollArea className="flex-1 p-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Start a conversation!</p>
              </div>
            ) : (
              <>
                {messages.map(renderModernMessage)}
                <div ref={messagesEndRef} />
              </>
            )}
          </ScrollArea>

          {/* Reply indicator */}
          {replyingTo && (
            <div className="p-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Reply className="w-3 h-3 text-gray-500" />
                  <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    Replying to {replyingTo.sender.name}: {replyingTo.content}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(null)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Message input */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.txt"
              />
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              
              <div className="flex-1 relative">
                <Input
                  ref={messageInputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message ${selectedChannel?.name || 'chat'}...`}
                  className="pr-8 rounded-full border-gray-300 dark:border-gray-600"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Smile className="w-3 h-3" />
                </Button>
              </div>
              
              {canUseVoice && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 w-8 p-0 flex-shrink-0',
                    isRecording && 'text-red-500 bg-red-50'
                  )}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              )}
              
              <Button
                type="submit"
                size="sm"
                disabled={!newMessage.trim()}
                className="h-8 w-8 p-0 rounded-full flex-shrink-0"
              >
                <Send className="w-3 h-3" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}