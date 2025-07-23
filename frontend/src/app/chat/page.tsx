// app/chat/page.tsx
'use client';

import React from 'react';
import { ChatInterface } from '@/components/communications/ChatInterface';
import { useAuthStore } from '@/shared/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ChatPage() {
  const { user } = useAuthStore();

  // Mock current user for testing
  const currentUser = user || {
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