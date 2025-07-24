// app/chat/page.tsx
'use client';

import React from 'react';
import { ChatInterface } from '@/shared/components/communications/ChatInterface';
import { useAuthStore } from '@/shared/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User as ChatUser } from '@/shared/hooks/useChat';

export default function ChatPage() {
  const { user } = useAuthStore();

  // Convert auth store user to chat user format
  const convertToChatUser = (authUser: any): ChatUser => {
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
  };

  // Mock current user for testing
  const currentUser = user ? convertToChatUser(user) : {
    id: 'demo-user-1',
    name: 'Demo User',
    email: 'demo@safeshipper.com',
    avatar: undefined,
    status: 'online' as const
  };

  const handleCreateChannel = () => {
    console.log('Create channel clicked');
    // Implement channel creation logic
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>SafeShipper Real-Time Communication</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Real-time messaging system for coordinating shipments, emergency communications, and team collaboration.
          </p>
        </CardContent>
      </Card>

      <ChatInterface
        currentUser={currentUser}
        onCreateChannel={handleCreateChannel}
        className="w-full max-w-7xl mx-auto"
      />
    </div>
  );
}