// frontend/src/components/communications/ChatInterface.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Phone,
  Video,
  AlertTriangle,
  MapPin,
  Mic,
  MicOff,
  Users,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { useChat, type User, type Message, type Channel } from '@/hooks/useChat';

// Types are imported from useChat hook

interface ChatInterfaceProps {
  currentUser: User;
  onCreateChannel?: () => void;
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  currentUser,
  onCreateChannel,
  className = ''
}) => {
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

  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Mock data for development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && channels.length === 0) {
      // Set up mock channels for testing
      const mockChannels: Channel[] = [
        {
          id: 'general',
          name: 'General',
          channel_type: 'GENERAL',
          is_private: false,
          is_emergency_channel: false,
          participants: [currentUser],
          unread_count: 0
        },
        {
          id: 'emergency',
          name: 'Emergency',
          channel_type: 'EMERGENCY',
          is_private: false,
          is_emergency_channel: true,
          emergency_level: 1,
          participants: [currentUser],
          unread_count: 2
        }
      ];
      
      // For development testing
      _devUtils.setChannels(mockChannels);
    }
  }, [channels, currentUser, _devUtils]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedChannel) return;

    const messageOptions: any = {};
    
    if (replyingTo) {
      messageOptions.reply_to_id = replyingTo.id;
    }
    
    if (selectedFile) {
      messageOptions.message_type = selectedFile.type.startsWith('image/') ? 'IMAGE' : 'FILE';
      // Handle file upload logic here
    }

    sendChatMessage(newMessage.trim(), selectedChannel.id, messageOptions);
    
    setNewMessage('');
    setReplyingTo(null);
    setSelectedFile(null);
    setIsTyping(false);
    
    // Stop typing indicator
    if (selectedChannel) {
      stopTyping(selectedChannel.id);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleReaction = (message: Message, emoji: string) => {
    reactToMessage(message.id, emoji);
  };

  const handleVoiceRecord = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
    } else {
      // Start recording
      setIsRecording(true);
    }
  };

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.sender.id === currentUser.id;
    const isEmergency = message.is_emergency || message.priority === 'URGENT';
    
    return (
      <div
        key={message.id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 group`}
      >
        {!isOwnMessage && (
          <Avatar className="w-8 h-8 mr-2 mt-1">
            <img 
              src={message.sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender.name)}`}
              alt={message.sender.name}
              className="w-full h-full rounded-full"
            />
          </Avatar>
        )}
        
        <div className={`max-w-[70%] ${isOwnMessage ? 'text-right' : 'text-left'}`}>
          {!isOwnMessage && (
            <div className="text-xs text-muted-foreground mb-1">
              {message.sender.name}
            </div>
          )}
          
          {message.reply_to && (
            <div className="text-xs bg-muted p-2 rounded mb-1 border-l-2 border-primary">
              <div className="font-medium">{message.reply_to.sender.name}</div>
              <div className="truncate">{message.reply_to.content}</div>
            </div>
          )}
          
          <div
            className={`
              rounded-lg p-3 relative
              ${isOwnMessage 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted'
              }
              ${isEmergency 
                ? 'border-2 border-red-500 shadow-red-500/20 shadow-lg' 
                : ''
              }
            `}
          >
            {isEmergency && (
              <div className="flex items-center gap-1 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold text-red-500">EMERGENCY</span>
              </div>
            )}
            
            {message.message_type === 'TEXT' && (
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
            )}
            
            {message.message_type === 'IMAGE' && (
              <div>
                <img 
                  src={message.file_url} 
                  alt={message.file_name}
                  className="max-w-full rounded mb-2"
                />
                {message.content && (
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                )}
              </div>
            )}
            
            {message.message_type === 'FILE' && (
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                <a 
                  href={message.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  {message.file_name}
                </a>
              </div>
            )}
            
            {message.message_type === 'LOCATION' && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <div>
                  <div className="font-medium">{message.location_name}</div>
                  <div className="text-xs opacity-75">
                    {message.latitude?.toFixed(6)}, {message.longitude?.toFixed(6)}
                  </div>
                </div>
              </div>
            )}
            
            {message.message_type === 'SYSTEM' && (
              <div className="italic text-center">
                {message.content}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs opacity-75">
                {format(message.timestamp, 'HH:mm')}
              </div>
              
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex gap-1">
                  {message.reactions.map((reaction, index) => (
                    <button
                      key={index}
                      onClick={() => handleReaction(message, reaction.emoji)}
                      className="text-xs bg-white/20 rounded px-1 hover:bg-white/30"
                    >
                      {reaction.emoji} {reaction.users.length}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Message actions on hover */}
            <div className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setReplyingTo(message)}
                  className="w-6 h-6 p-0"
                >
                  ↩️
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleReaction(message, '👍')}
                  className="w-6 h-6 p-0"
                >
                  <Smile className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {isOwnMessage && (
          <Avatar className="w-8 h-8 ml-2 mt-1">
            <img 
              src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}`}
              alt={currentUser.name}
              className="w-full h-full rounded-full"
            />
          </Avatar>
        )}
      </div>
    );
  };

  const renderChannelList = () => (
    <div className="w-80 border-r bg-muted/20">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Channels</h2>
          {onCreateChannel && (
            <Button size="sm" onClick={onCreateChannel}>
              +
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[600px]">
          {channels.map((channel) => (
            <div
              key={channel.id}
              onClick={() => selectChannel(channel.id)}
              className={`
                p-3 rounded-lg cursor-pointer transition-colors mb-1
                ${selectedChannel?.id === channel.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {channel.is_emergency_channel && (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  <div className="font-medium truncate">{channel.name}</div>
                </div>
                
                {channel.unread_count > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {channel.unread_count > 99 ? '99+' : channel.unread_count}
                  </Badge>
                )}
              </div>
              
              {channel.last_message && (
                <div className="text-sm opacity-75 truncate mt-1">
                  {channel.last_message.sender.name}: {channel.last_message.content}
                </div>
              )}
              
              <div className="flex items-center justify-between mt-2">
                <Badge variant="outline" className="text-xs">
                  {channel.channel_type}
                </Badge>
                
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span className="text-xs">{channel.participants.length}</span>
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>
    </div>
  );

  if (!selectedChannel) {
    return (
      <Card className={`flex h-[700px] ${className}`}>
        {renderChannelList()}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <h3 className="text-lg font-medium mb-2">Select a channel to start messaging</h3>
            <p>Choose a channel from the sidebar to view and send messages.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`flex h-[700px] ${className}`}>
      {renderChannelList()}
      
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Channel header */}
        <CardHeader className="border-b py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedChannel.is_emergency_channel && (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{selectedChannel.name}</CardTitle>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                       title={isConnected ? 'Connected' : 'Disconnected'} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedChannel.participants.length} participants
                  {typingUsers.length > 0 && (
                    <span className="ml-2 italic">
                      {typingUsers.map(u => u.name).join(', ')} 
                      {typingUsers.length === 1 ? ' is' : ' are'} typing...
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost">
                <Phone className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost">
                <Video className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost">
                <Settings className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Messages area */}
        <CardContent className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full pr-4">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </ScrollArea>
        </CardContent>

        {/* Reply indicator */}
        {replyingTo && (
          <div className="px-4 py-2 bg-muted border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">Replying to {replyingTo.sender.name}:</span>
                <span className="ml-2 opacity-75">{replyingTo.content}</span>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setReplyingTo(null)}
              >
                ✕
              </Button>
            </div>
          </div>
        )}

        {/* File preview */}
        {selectedFile && (
          <div className="px-4 py-2 bg-muted border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                <span className="text-sm">{selectedFile.name}</span>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setSelectedFile(null)}
              >
                ✕
              </Button>
            </div>
          </div>
        )}

        {/* Message input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.txt"
            />
            
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            
            <div className="flex-1 relative">
              <Input
                ref={messageInputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message ${selectedChannel.name}...`}
                className="pr-10"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 transform -translate-y-1/2"
              >
                <Smile className="w-4 h-4" />
              </Button>
            </div>
            
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleVoiceRecord}
              className={isRecording ? 'text-red-500' : ''}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            
            <Button type="submit" size="sm" disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
};