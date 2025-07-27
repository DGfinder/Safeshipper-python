'use client';

import { useState, useEffect, useRef } from 'react';
import { useWebSocketSubscription } from '@/contexts/WebSocketContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { FleetVehicle, FleetStatusResponse } from './useFleetTracking';
import type { DashboardStats, RecentActivity } from './useDashboard';

// Real-time fleet tracking hook
export function useRealTimeFleetTracking() {
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Subscribe to fleet updates
  useWebSocketSubscription(
    'fleet_update',
    (data: { vehicle_id: string; location: { lat: number; lng: number }; timestamp: string }) => {
      // Update specific vehicle in cache
      queryClient.setQueryData(['fleet-status'], (oldData: FleetStatusResponse | undefined) => {
        if (!oldData) return oldData;

        const updatedVehicles = oldData.vehicles.map(vehicle => {
          if (vehicle.id === data.vehicle_id) {
            return {
              ...vehicle,
              location: data.location,
              location_is_fresh: true,
            };
          }
          return vehicle;
        });

        return {
          ...oldData,
          vehicles: updatedVehicles,
          timestamp: data.timestamp,
        };
      });

      setLastUpdate(new Date());
    }
  );

  // Subscribe to shipment status updates
  useWebSocketSubscription(
    'shipment_status_update',
    (data: { shipment_id: string; status: string; vehicle_id?: string }) => {
      queryClient.setQueryData(['fleet-status'], (oldData: FleetStatusResponse | undefined) => {
        if (!oldData) return oldData;

        const updatedVehicles = oldData.vehicles.map(vehicle => {
          if (vehicle.id === data.vehicle_id && vehicle.active_shipment?.id === data.shipment_id) {
            return {
              ...vehicle,
              active_shipment: {
                ...vehicle.active_shipment,
                status: data.status,
              },
            };
          }
          return vehicle;
        });

        return {
          ...oldData,
          vehicles: updatedVehicles,
        };
      });

      // Also update shipment-specific queries
      queryClient.invalidateQueries({ queryKey: ['shipment', data.shipment_id] });
      queryClient.invalidateQueries({ queryKey: ['recent-shipments'] });
    }
  );

  return {
    lastUpdate,
  };
}

// Real-time dashboard stats hook
export function useRealTimeDashboardStats() {
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<string[]>([]);

  // Subscribe to dashboard metrics updates
  useWebSocketSubscription(
    'dashboard_metrics_update',
    (data: Partial<DashboardStats>) => {
      queryClient.setQueryData(['dashboard-stats'], (oldData: DashboardStats | undefined) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          ...data,
          last_updated: new Date().toISOString(),
        };
      });
    }
  );

  // Subscribe to activity updates
  useWebSocketSubscription(
    'activity_update',
    (data: { event: any; unread_count: number }) => {
      queryClient.setQueryData(['recent-activity'], (oldData: RecentActivity | undefined) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          events: [data.event, ...oldData.events.slice(0, 9)], // Keep last 10 events
          unread_count: data.unread_count,
          total_events: oldData.total_events + 1,
        };
      });

      // Add notification for high-priority events
      if (data.event.priority === 'HIGH' || data.event.priority === 'URGENT') {
        setNotifications(prev => [...prev, data.event.title]);
      }
    }
  );

  // Subscribe to compliance alerts
  useWebSocketSubscription(
    'compliance_alert',
    (data: { message: string; severity: 'warning' | 'error' | 'info' }) => {
      setNotifications(prev => [...prev, data.message]);
    }
  );

  return {
    notifications,
    clearNotifications: () => setNotifications([]),
  };
}

// Real-time shipment tracking hook
export function useRealTimeShipmentTracking(shipmentId: string) {
  const queryClient = useQueryClient();
  const [trackingEvents, setTrackingEvents] = useState<any[]>([]);

  useWebSocketSubscription(
    'shipment_tracking_update',
    (data: { shipment_id: string; event: any }) => {
      if (data.shipment_id === shipmentId) {
        setTrackingEvents(prev => [data.event, ...prev]);
        
        // Update shipment query cache
        queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] });
      }
    }
  );

  return {
    trackingEvents,
  };
}

// Real-time emergency alerts hook
export function useRealTimeEmergencyAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useWebSocketSubscription(
    'emergency_alert',
    (data: { 
      id: string; 
      title: string; 
      message: string; 
      severity: 'low' | 'medium' | 'high' | 'critical';
      shipment_id?: string;
      vehicle_id?: string;
    }) => {
      setAlerts(prev => [data, ...prev]);

      // Play alert sound for high-priority alerts
      if (data.severity === 'high' || data.severity === 'critical') {
        if (!audioRef.current) {
          audioRef.current = new Audio('/sounds/alert.mp3');
        }
        audioRef.current.play().catch(console.error);
      }
    }
  );

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  return {
    alerts,
    dismissAlert,
  };
}

// Real-time driver communication hook
export function useRealTimeDriverCommunication(driverId?: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [typingIndicator, setTypingIndicator] = useState<string | null>(null);

  useWebSocketSubscription(
    'driver_message',
    (data: { 
      from_driver_id: string; 
      to_driver_id?: string; 
      message: string; 
      timestamp: string;
      is_broadcast: boolean;
    }) => {
      if (!driverId || data.to_driver_id === driverId || data.is_broadcast) {
        setMessages(prev => [data, ...prev]);
      }
    }
  );

  useWebSocketSubscription(
    'driver_typing',
    (data: { driver_id: string; driver_name: string; is_typing: boolean }) => {
      if (data.is_typing) {
        setTypingIndicator(data.driver_name);
        setTimeout(() => setTypingIndicator(null), 3000);
      } else {
        setTypingIndicator(null);
      }
    }
  );

  return {
    messages,
    typingIndicator,
  };
}

// Real-time load planning collaboration hook
export function useRealTimeLoadPlanningCollab(planId: string) {
  const queryClient = useQueryClient();
  const [collaborators, setCollaborators] = useState<string[]>([]);

  useWebSocketSubscription(
    'load_plan_update',
    (data: { plan_id: string; changes: any; user_id: string }) => {
      if (data.plan_id === planId) {
        queryClient.setQueryData(['load-plan', planId], (oldData: any) => {
          if (!oldData) return oldData;
          return { ...oldData, ...data.changes };
        });
      }
    }
  );

  useWebSocketSubscription(
    'load_plan_collaborator',
    (data: { plan_id: string; user_id: string; action: 'joined' | 'left' }) => {
      if (data.plan_id === planId) {
        setCollaborators(prev => {
          if (data.action === 'joined') {
            return [...prev.filter(id => id !== data.user_id), data.user_id];
          } else {
            return prev.filter(id => id !== data.user_id);
          }
        });
      }
    }
  );

  return {
    collaborators,
  };
}

// Real-time system health monitoring hook
export function useRealTimeSystemHealth() {
  const [systemStatus, setSystemStatus] = useState<{
    api_status: 'healthy' | 'degraded' | 'down';
    database_status: 'healthy' | 'degraded' | 'down';
    background_jobs: 'healthy' | 'degraded' | 'down';
    external_services: 'healthy' | 'degraded' | 'down';
    last_check: string;
  }>({
    api_status: 'healthy',
    database_status: 'healthy',
    background_jobs: 'healthy',
    external_services: 'healthy',
    last_check: new Date().toISOString(),
  });

  useWebSocketSubscription(
    'system_health_update',
    (data: any) => {
      setSystemStatus(prev => ({
        ...prev,
        ...data,
        last_check: new Date().toISOString(),
      }));
    }
  );

  return {
    systemStatus,
  };
}

// Generic real-time data hook
export function useRealTimeData<T>(
  queryKey: string[],
  messageType: string,
  updateFunction: (oldData: T | undefined, newData: any) => T | undefined
) {
  const queryClient = useQueryClient();

  useWebSocketSubscription(
    messageType,
    (data: any) => {
      queryClient.setQueryData(queryKey, (oldData: T | undefined) => {
        return updateFunction(oldData, data);
      });
    }
  );
}