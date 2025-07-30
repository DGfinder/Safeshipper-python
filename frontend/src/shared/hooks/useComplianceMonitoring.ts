/**
 * React hook for real-time compliance monitoring via WebSocket
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { ComplianceAlert, ComplianceStatus, ComplianceThresholdStatus } from '@/shared/services/auditService';

interface ComplianceMonitoringData {
  complianceScore: number;
  activeAlerts: number;
  criticalAlerts: number;
  thresholdBreaches: number;
  lastUpdated?: string;
}

interface ComplianceWebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseComplianceMonitoringOptions {
  enabled?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  updateTypes?: string[];
}

interface UseComplianceMonitoringReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Real-time data
  alerts: ComplianceAlert[];
  complianceData: ComplianceMonitoringData | null;
  statusUpdates: ComplianceStatus | null;
  thresholdBreaches: any[];
  
  // Actions
  acknowledgeAlert: (alertId: string, note?: string) => void;
  subscribeToUpdates: (updateTypes: string[]) => void;
  unsubscribeFromUpdates: (updateTypes: string[]) => void;
  reconnect: () => void;
  disconnect: () => void;
  
  // Metadata
  lastMessageTime: Date | null;
  messageCount: number;
}

export const useComplianceMonitoring = (
  options: UseComplianceMonitoringOptions = {}
): UseComplianceMonitoringReturn => {
  const {
    enabled = true,
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    updateTypes = ['all']
  } = options;

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Real-time data
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [complianceData, setComplianceData] = useState<ComplianceMonitoringData | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<ComplianceStatus | null>(null);
  const [thresholdBreaches, setThresholdBreaches] = useState<any[]>([]);
  
  // Metadata
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  
  // Refs for managing WebSocket and reconnection
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<Set<string>>(new Set(updateTypes));

  // Get WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_WS_HOST || window.location.host;
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return `${protocol}//${host}/ws/compliance/?token=${token}`;
  }, []);

  // Handle WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: ComplianceWebSocketMessage = JSON.parse(event.data);
      
      setLastMessageTime(new Date());
      setMessageCount(prev => prev + 1);
      
      switch (message.type) {
        case 'connection_established':
          setIsConnected(true);
          setIsConnecting(false);
          setConnectionError(null);
          reconnectAttempts.current = 0;
          
          if (message.initial_data) {
            setComplianceData(message.initial_data);
          }
          break;
          
        case 'new_compliance_alert':
          setAlerts(prev => [message.alert, ...prev.slice(0, 49)]); // Keep last 50 alerts
          break;
          
        case 'compliance_status_update':
          setStatusUpdates(message.data);
          
          // Update summary data if available
          if (message.data.overall_compliance_score !== undefined) {
            setComplianceData(prev => prev ? {
              ...prev,
              complianceScore: message.data.overall_compliance_score,
              lastUpdated: message.data.last_updated
            } : null);
          }
          break;
          
        case 'compliance_threshold_breach':
          setThresholdBreaches(prev => [message.breach, ...prev.slice(0, 19)]); // Keep last 20
          break;
          
        case 'alert_acknowledged':
          setAlerts(prev => prev.map(alert => 
            alert.id === message.alert_id 
              ? { ...alert, acknowledged: true, acknowledged_by: message.user_name }
              : alert
          ));
          break;
          
        case 'compliance_violation_detected':
          setAlerts(prev => [
            {
              id: `violation_${Date.now()}`,
              level: 'HIGH' as const,
              title: 'Compliance Violation Detected',
              message: `New compliance violation: ${message.violation.violation_details || 'Details unavailable'}`,
              timestamp: new Date().toISOString(),
              requires_immediate_attention: true
            },
            ...prev.slice(0, 49)
          ]);
          break;
          
        case 'remediation_overdue':
          setAlerts(prev => [
            {
              id: `remediation_${Date.now()}`,
              level: 'MEDIUM' as const,
              title: 'Remediation Overdue',
              message: `Remediation action is overdue: ${message.remediation.violation_details || 'Action required'}`,
              timestamp: new Date().toISOString(),
              requires_immediate_attention: false
            },
            ...prev.slice(0, 49)
          ]);
          break;
          
        case 'error':
          console.error('WebSocket error:', message.message);
          setConnectionError(message.message);
          break;
          
        default:
          console.debug('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, []);

  // Handle WebSocket connection events
  const handleOpen = useCallback(() => {
    console.log('Compliance monitoring WebSocket connected');
    setIsConnected(true);
    setIsConnecting(false);
    setConnectionError(null);
    reconnectAttempts.current = 0;
    
    // Subscribe to update types
    if (subscriptionRef.current.size > 0) {
      const message = {
        type: 'subscribe_to_updates',
        update_types: Array.from(subscriptionRef.current)
      };
      wsRef.current?.send(JSON.stringify(message));
    }
  }, []);

  const handleClose = useCallback((event: CloseEvent) => {
    console.log('Compliance monitoring WebSocket disconnected:', event.code, event.reason);
    setIsConnected(false);
    setIsConnecting(false);
    
    if (event.code !== 1000 && autoReconnect && reconnectAttempts.current < maxReconnectAttempts) {
      setConnectionError(`Connection lost. Reconnecting... (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttempts.current++;
        connect();
      }, reconnectInterval);
    } else if (reconnectAttempts.current >= maxReconnectAttempts) {
      setConnectionError('Maximum reconnection attempts reached. Please refresh the page.');
    }
  }, [autoReconnect, maxReconnectAttempts, reconnectInterval]);

  const handleError = useCallback((event: Event) => {
    console.error('Compliance monitoring WebSocket error:', event);
    setConnectionError('WebSocket connection error occurred');
    setIsConnecting(false);
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }
    
    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      const url = getWebSocketUrl();
      wsRef.current = new WebSocket(url);
      
      wsRef.current.onopen = handleOpen;
      wsRef.current.onmessage = handleMessage;
      wsRef.current.onclose = handleClose;
      wsRef.current.onerror = handleError;
      
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setIsConnecting(false);
    }
  }, [enabled, getWebSocketUrl, handleOpen, handleMessage, handleClose, handleError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    reconnectAttempts.current = 0;
  }, []);

  // Reconnect manually
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  // Send message to WebSocket
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }, []);

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string, note?: string) => {
    sendMessage({
      type: 'acknowledge_alert',
      alert_id: alertId,
      note
    });
  }, [sendMessage]);

  // Subscribe to update types
  const subscribeToUpdates = useCallback((newUpdateTypes: string[]) => {
    newUpdateTypes.forEach(type => subscriptionRef.current.add(type));
    
    sendMessage({
      type: 'subscribe_to_updates',
      update_types: newUpdateTypes
    });
  }, [sendMessage]);

  // Unsubscribe from update types
  const unsubscribeFromUpdates = useCallback((updateTypesToRemove: string[]) => {
    updateTypesToRemove.forEach(type => subscriptionRef.current.delete(type));
    
    sendMessage({
      type: 'unsubscribe_from_updates',
      update_types: updateTypesToRemove
    });
  }, [sendMessage]);

  // Initialize connection on mount
  useEffect(() => {
    if (enabled) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Update subscription types
  useEffect(() => {
    subscriptionRef.current = new Set(updateTypes);
  }, [updateTypes]);

  return {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    
    // Real-time data
    alerts,
    complianceData,
    statusUpdates,
    thresholdBreaches,
    
    // Actions
    acknowledgeAlert,
    subscribeToUpdates,
    unsubscribeFromUpdates,
    reconnect,
    disconnect,
    
    // Metadata
    lastMessageTime,
    messageCount
  };
};

export default useComplianceMonitoring;