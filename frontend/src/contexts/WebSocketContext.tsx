'use client';

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { toast } from 'react-hot-toast';

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

// WebSocket connection states
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

// WebSocket context type
interface WebSocketContextType {
  connectionState: ConnectionState;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => void;
  subscribe: (type: string, callback: (data: any) => void) => () => void;
  isConnected: boolean;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// WebSocket provider component
interface WebSocketProviderProps {
  children: ReactNode;
  url?: string;
}

export function WebSocketProvider({ children, url }: WebSocketProviderProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const { getToken, isAuthenticated } = useAuthStore();

  // Get WebSocket URL - fallback to mock WebSocket for development
  const getWebSocketUrl = () => {
    if (url) return url;
    
    // In production, this would be your actual WebSocket endpoint
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/`;
  };

  // Mock WebSocket for development
  const createMockWebSocket = () => {
    const mockSocket = {
      readyState: WebSocket.OPEN,
      send: (data: string) => {
        console.log('Mock WebSocket sending:', data);
      },
      close: () => {
        console.log('Mock WebSocket closing');
      },
      addEventListener: (event: string, handler: any) => {
        if (event === 'open') {
          setTimeout(() => handler({}), 100);
        }
      },
      removeEventListener: () => {},
    };
    return mockSocket as unknown as WebSocket;
  };

  // Connect to WebSocket
  const connect = () => {
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping WebSocket connection');
      return;
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState('connecting');
    
    try {
      // Use mock WebSocket for development
      if (process.env.NODE_ENV === 'development') {
        socketRef.current = createMockWebSocket();
        setConnectionState('connected');
        reconnectAttempts.current = 0;
        
        // Simulate periodic updates for development
        const mockUpdateInterval = setInterval(() => {
          if (socketRef.current) {
            const mockMessage: WebSocketMessage = {
              type: 'fleet_update',
              data: {
                vehicle_id: 'mock-vehicle-1',
                location: {
                  lat: 51.5074 + (Math.random() - 0.5) * 0.01,
                  lng: -0.1278 + (Math.random() - 0.5) * 0.01,
                },
                timestamp: new Date().toISOString(),
              },
              timestamp: new Date().toISOString(),
            };
            handleMessage(mockMessage);
          }
        }, 5000);

        // Cleanup mock updates on disconnect
        const originalClose = socketRef.current.close;
        socketRef.current.close = () => {
          clearInterval(mockUpdateInterval);
          originalClose.call(socketRef.current);
        };

        return;
      }

      // Real WebSocket connection
      const wsUrl = getWebSocketUrl();
      const token = getToken();
      
      socketRef.current = new WebSocket(`${wsUrl}?token=${token}`);
      
      socketRef.current.onopen = () => {
        setConnectionState('connected');
        reconnectAttempts.current = 0;
        toast.success('Connected to real-time updates');
      };

      socketRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      socketRef.current.onclose = () => {
        setConnectionState('disconnected');
        attemptReconnect();
      };

      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState('error');
        toast.error('Connection error - attempting to reconnect');
      };

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setConnectionState('error');
      attemptReconnect();
    }
  };

  // Handle incoming messages
  const handleMessage = (message: WebSocketMessage) => {
    setLastMessage(message);
    
    // Notify subscribers
    const subscribers = subscribersRef.current.get(message.type);
    if (subscribers) {
      subscribers.forEach(callback => callback(message.data));
    }
  };

  // Attempt to reconnect
  const attemptReconnect = () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      toast.error('Connection failed. Please refresh the page.');
      return;
    }

    reconnectAttempts.current += 1;
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, reconnectDelay * reconnectAttempts.current);
  };

  // Send message
  const sendMessage = (message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  };

  // Subscribe to message types
  const subscribe = (type: string, callback: (data: any) => void) => {
    if (!subscribersRef.current.has(type)) {
      subscribersRef.current.set(type, new Set());
    }
    
    subscribersRef.current.get(type)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = subscribersRef.current.get(type);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          subscribersRef.current.delete(type);
        }
      }
    };
  };

  // Reconnect manually
  const reconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    connect();
  };

  // Connect on mount and auth changes
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [isAuthenticated]);

  const value: WebSocketContextType = {
    connectionState,
    lastMessage,
    sendMessage,
    subscribe,
    isConnected: connectionState === 'connected',
    reconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook to use WebSocket
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

// Hook for specific message types
export function useWebSocketSubscription<T = any>(
  messageType: string,
  callback: (data: T) => void,
  dependencies: any[] = []
) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe(messageType, callback);
    return unsubscribe;
  }, [messageType, subscribe, ...dependencies]);
}