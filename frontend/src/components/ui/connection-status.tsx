'use client';

import React from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { 
  Wifi, 
  WifiOff, 
  Loader2, 
  AlertTriangle, 
  RefreshCw,
  Activity,
  Clock
} from 'lucide-react';

// Connection status indicator component
export function ConnectionStatus() {
  const { connectionState, lastMessage, reconnect, isConnected } = useWebSocket();

  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <Activity className="h-3 w-3 text-green-500" />;
      case 'connecting':
        return <Loader2 className="h-3 w-3 text-yellow-500 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="h-3 w-3 text-gray-500" />;
      case 'error':
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      default:
        return <WifiOff className="h-3 w-3 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Live';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Offline';
      case 'error':
        return 'Error';
      default:
        return 'Offline';
    }
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'connecting':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'disconnected':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTooltipContent = () => {
    const lastMessageTime = lastMessage 
      ? new Date(lastMessage.timestamp).toLocaleString()
      : 'No messages received';

    return (
      <div className="space-y-2">
        <div className="font-medium">Connection Status</div>
        <div className="text-sm space-y-1">
          <div>Status: {getStatusText()}</div>
          <div>Last Update: {lastMessageTime}</div>
          {connectionState === 'error' && (
            <div className="text-red-200">
              Connection failed. Click to retry.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`text-xs ${getStatusColor()}`}
            >
              <div className="flex items-center gap-1">
                {getStatusIcon()}
                <span>{getStatusText()}</span>
              </div>
            </Badge>
            
            {connectionState === 'error' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={reconnect}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact connection status for mobile
export function CompactConnectionStatus() {
  const { connectionState, isConnected } = useWebSocket();

  return (
    <div className="flex items-center gap-1">
      <div 
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        } ${connectionState === 'connecting' ? 'animate-pulse' : ''}`}
      />
      <span className="text-xs text-gray-500">
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}

// Real-time data freshness indicator
export function DataFreshnessIndicator({ 
  lastUpdate, 
  maxAge = 60000 // 1 minute
}: { 
  lastUpdate: Date | null; 
  maxAge?: number; 
}) {
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!lastUpdate) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Clock className="h-3 w-3" />
        <span>No data</span>
      </div>
    );
  }

  const age = now.getTime() - lastUpdate.getTime();
  const isStale = age > maxAge;
  
  const formatAge = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  return (
    <div className={`flex items-center gap-1 text-xs ${
      isStale ? 'text-orange-600' : 'text-green-600'
    }`}>
      <Clock className="h-3 w-3" />
      <span>{formatAge(age)}</span>
    </div>
  );
}

// Real-time metrics display
export function RealTimeMetrics() {
  const { connectionState, lastMessage } = useWebSocket();
  const [messageCount, setMessageCount] = React.useState(0);
  const [lastMessageType, setLastMessageType] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (lastMessage) {
      setMessageCount(prev => prev + 1);
      setLastMessageType(lastMessage.type);
    }
  }, [lastMessage]);

  if (connectionState !== 'connected') {
    return null;
  }

  return (
    <div className="flex items-center gap-4 text-xs text-gray-500">
      <div className="flex items-center gap-1">
        <Activity className="h-3 w-3" />
        <span>{messageCount} updates</span>
      </div>
      {lastMessageType && (
        <div className="flex items-center gap-1">
          <span>Last: {lastMessageType.replace('_', ' ')}</span>
        </div>
      )}
    </div>
  );
}

// System health indicator
export function SystemHealthIndicator() {
  const { connectionState } = useWebSocket();

  const getHealthStatus = () => {
    switch (connectionState) {
      case 'connected':
        return { status: 'healthy', color: 'text-green-500', text: 'All systems operational' };
      case 'connecting':
        return { status: 'checking', color: 'text-yellow-500', text: 'Checking systems...' };
      case 'disconnected':
        return { status: 'offline', color: 'text-gray-500', text: 'Systems offline' };
      case 'error':
        return { status: 'degraded', color: 'text-red-500', text: 'System issues detected' };
      default:
        return { status: 'unknown', color: 'text-gray-500', text: 'Status unknown' };
    }
  };

  const health = getHealthStatus();

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${
        health.status === 'healthy' ? 'bg-green-500' : 
        health.status === 'checking' ? 'bg-yellow-500 animate-pulse' :
        health.status === 'degraded' ? 'bg-red-500' : 'bg-gray-500'
      }`} />
      <span className={`text-sm ${health.color}`}>
        {health.text}
      </span>
    </div>
  );
}