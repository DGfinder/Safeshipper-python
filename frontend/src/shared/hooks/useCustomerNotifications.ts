// hooks/useCustomerNotifications.ts
// Enhanced notification system with compliance alerts integration

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useCustomerAccess, useCustomerCompliance } from "@/shared/hooks/useCustomerProfile";
import { customerApiService } from "@/shared/services/customerApiService";
import { simulatedDataService } from "@/shared/services/simulatedDataService";
import { getEnvironmentConfig } from "@/shared/config/environment";

export interface CustomerNotification {
  id: string;
  type: "shipment_status" | "shipment_delayed" | "compliance_alert" | "system_update" | "billing" | "document_ready" | "inspection_required" | "certificate_expiry";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: "low" | "medium" | "high" | "urgent";
  category: "delivery" | "compliance" | "system" | "financial" | "safety";
  actionUrl?: string;
  actionLabel?: string;
  metadata: {
    shipmentId?: string;
    documentId?: string;
    certificateId?: string;
    violationId?: string;
    expiryDate?: string;
    severity?: "Low" | "Medium" | "High";
  };
  dismissible: boolean;
  autoExpire?: string;
}

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    shipmentUpdates: boolean;
    complianceAlerts: boolean;
    systemUpdates: boolean;
    documentReady: boolean;
  };
  sms: {
    enabled: boolean;
    urgentOnly: boolean;
    complianceAlerts: boolean;
    emergencyAlerts: boolean;
  };
  push: {
    enabled: boolean;
    shipmentUpdates: boolean;
    complianceAlerts: boolean;
    realTimeTracking: boolean;
  };
  inApp: {
    enabled: boolean;
    showPopups: boolean;
    soundEnabled: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
}

// Generate compliance-related notifications based on customer profile
function generateComplianceNotifications(customerId: string): CustomerNotification[] {
  const customer = simulatedDataService.getCustomerProfiles().find(c => c.id === customerId);
  if (!customer) return [];

  const complianceProfile = simulatedDataService.getCustomerComplianceProfile(customer.name);
  if (!complianceProfile) return [];

  const notifications: CustomerNotification[] = [];
  const now = Date.now();

  // Certificate expiry warnings
  complianceProfile.authorizedGoods.forEach((dg, index) => {
    const expiryDate = new Date(dg.authorizedUntil);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      notifications.push({
        id: `cert-expiry-${index}`,
        type: "certificate_expiry",
        title: `DG Authorization Expiring Soon`,
        message: `Your UN${dg.unNumber} (${dg.properShippingName}) authorization expires in ${daysUntilExpiry} days. Please renew to maintain compliance.`,
        timestamp: new Date(now - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        read: Math.random() > 0.7,
        priority: daysUntilExpiry <= 7 ? "urgent" : daysUntilExpiry <= 14 ? "high" : "medium",
        category: "compliance",
        actionUrl: "/customer-portal/documents",
        actionLabel: "Renew Authorization",
        metadata: {
          certificateId: `cert-${dg.unNumber}`,
          expiryDate: dg.authorizedUntil,
          severity: daysUntilExpiry <= 7 ? "High" : "Medium"
        },
        dismissible: true,
        autoExpire: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
  });

  // Compliance violations
  complianceProfile.violations.forEach((violation) => {
    if (violation.status === "Open") {
      notifications.push({
        id: `violation-${violation.id}`,
        type: "compliance_alert",
        title: `Compliance Violation Requires Attention`,
        message: `${violation.type}: ${violation.description}. Please review and take corrective action.`,
        timestamp: violation.date,
        read: Math.random() > 0.5,
        priority: violation.severity === "High" ? "urgent" : violation.severity === "Medium" ? "high" : "medium",
        category: "compliance",
        actionUrl: `/customer-portal/compliance`,
        actionLabel: "Review Violation",
        metadata: {
          violationId: violation.id,
          shipmentId: violation.shipmentId,
          severity: violation.severity
        },
        dismissible: false, // Compliance violations cannot be dismissed until resolved
      });
    }
  });

  // Low compliance rate warning
  if (complianceProfile.complianceRate < 85) {
    notifications.push({
      id: `compliance-rate-warning`,
      type: "compliance_alert",
      title: `Compliance Rate Below Target`,
      message: `Your current compliance rate is ${complianceProfile.complianceRate}%. Consider reviewing your processes to maintain good standing.`,
      timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read: false,
      priority: complianceProfile.complianceRate < 70 ? "high" : "medium",
      category: "compliance",
      actionUrl: "/customer-portal/compliance",
      actionLabel: "View Details",
      metadata: {
        severity: complianceProfile.complianceRate < 70 ? "High" : "Medium"
      },
      dismissible: true,
    });
  }

  return notifications;
}

// Generate shipment-related notifications
function generateShipmentNotifications(customerId: string): CustomerNotification[] {
  const customer = simulatedDataService.getCustomerProfiles().find(c => c.id === customerId);
  if (!customer) return [];

  const shipments = simulatedDataService.getCustomerShipments(customer.name);
  const notifications: CustomerNotification[] = [];
  const now = Date.now();

  shipments.slice(0, 5).forEach((shipment) => {
    // Delivery notifications
    if (shipment.status === "DELIVERED") {
      notifications.push({
        id: `delivery-${shipment.id}`,
        type: "shipment_status",
        title: `Shipment Delivered Successfully`,
        message: `Your shipment ${shipment.trackingNumber} has been delivered to ${shipment.route.split(' → ')[1]}.`,
        timestamp: shipment.estimatedDelivery,
        read: Math.random() > 0.3,
        priority: "medium",
        category: "delivery",
        actionUrl: `/customer-portal/track/${shipment.trackingNumber}`,
        actionLabel: "View Details",
        metadata: {
          shipmentId: shipment.id
        },
        dismissible: true,
      });
    }

    // In transit updates
    if (shipment.status === "IN_TRANSIT") {
      notifications.push({
        id: `transit-${shipment.id}`,
        type: "shipment_status",
        title: `Shipment Update - In Transit`,
        message: `Your shipment ${shipment.trackingNumber} is currently in transit and on schedule for delivery.`,
        timestamp: new Date(now - Math.random() * 12 * 60 * 60 * 1000).toISOString(),
        read: Math.random() > 0.6,
        priority: "low",
        category: "delivery",
        actionUrl: `/customer-portal/track/${shipment.trackingNumber}`,
        actionLabel: "Track Shipment",
        metadata: {
          shipmentId: shipment.id
        },
        dismissible: true,
      });
    }

    // Document ready notifications
    if (shipment.dangerousGoods && shipment.dangerousGoods.length > 0) {
      notifications.push({
        id: `docs-${shipment.id}`,
        type: "document_ready",
        title: `Safety Documents Available`,
        message: `SDS and compliance documents for shipment ${shipment.trackingNumber} are now available for download.`,
        timestamp: new Date(new Date(shipment.createdAt).getTime() + 2 * 60 * 60 * 1000).toISOString(),
        read: Math.random() > 0.4,
        priority: "medium",
        category: "safety",
        actionUrl: "/customer-portal/documents",
        actionLabel: "Download Documents",
        metadata: {
          shipmentId: shipment.id
        },
        dismissible: true,
      });
    }
  });

  return notifications;
}

// Main notifications hook
export function useCustomerNotifications() {
  const { getToken } = useAuthStore();
  const { data: customerAccess } = useCustomerAccess();
  const config = getEnvironmentConfig();

  return useQuery({
    queryKey: ["customer-notifications", customerAccess?.customerId],
    queryFn: async (): Promise<CustomerNotification[]> => {
      if (!customerAccess?.customerId) return [];

      if (config.apiMode === "demo") {
        // Generate comprehensive demo notifications
        const complianceNotifications = generateComplianceNotifications(customerAccess.customerId);
        const shipmentNotifications = generateShipmentNotifications(customerAccess.customerId);
        
        // Add some system notifications
        const systemNotifications: CustomerNotification[] = [
          {
            id: "system-maintenance",
            type: "system_update",
            title: "Scheduled Maintenance Notice",
            message: "SafeShipper will undergo maintenance on January 25th from 2:00 AM to 4:00 AM AEDT. Some features may be temporarily unavailable.",
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            read: true,
            priority: "low",
            category: "system",
            metadata: {},
            dismissible: true,
          },
          {
            id: "billing-invoice",
            type: "billing",
            title: "Monthly Invoice Available",
            message: "Your January 2024 invoice is now available for download and payment.",
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            read: false,
            priority: "medium",
            category: "financial",
            actionUrl: "/customer-portal/billing",
            actionLabel: "View Invoice",
            metadata: {},
            dismissible: true,
          }
        ];

        const allNotifications = [
          ...complianceNotifications,
          ...shipmentNotifications,
          ...systemNotifications
        ];

        // Sort by timestamp (newest first)
        return allNotifications.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }

      // For hybrid and production modes, try API first
      const token = getToken();
      if (token || config.apiMode !== "production") {
        const response = await customerApiService.getCustomerNotifications(customerAccess.customerId, token || '');
        
        if (response.success && response.data) {
          return response.data;
        }
      }

      // Fallback to simulated notifications
      const complianceNotifications = generateComplianceNotifications(customerAccess.customerId);
      const shipmentNotifications = generateShipmentNotifications(customerAccess.customerId);
      
      return [...complianceNotifications, ...shipmentNotifications].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    },
    enabled: !!customerAccess?.customerId,
    refetchInterval: 60000, // Refetch every minute for notifications
  });
}

// Mark notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { data: customerAccess } = useCustomerAccess();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      // In a real app, this would call the API
      // For demo, we'll just simulate the action
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate notifications to trigger refetch
      queryClient.invalidateQueries({ 
        queryKey: ["customer-notifications", customerAccess?.customerId] 
      });
    },
  });
}

// Dismiss notification
export function useDismissNotification() {
  const queryClient = useQueryClient();
  const { data: customerAccess } = useCustomerAccess();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      // In a real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["customer-notifications", customerAccess?.customerId] 
      });
    },
  });
}

// Get notification preferences
export function useNotificationPreferences() {
  const { data: customerAccess } = useCustomerAccess();

  return useQuery({
    queryKey: ["notification-preferences", customerAccess?.customerId],
    queryFn: async (): Promise<NotificationPreferences> => {
      // Return default preferences for demo
      return {
        email: {
          enabled: true,
          shipmentUpdates: true,
          complianceAlerts: true,
          systemUpdates: false,
          documentReady: true,
        },
        sms: {
          enabled: true,
          urgentOnly: true,
          complianceAlerts: true,
          emergencyAlerts: true,
        },
        push: {
          enabled: true,
          shipmentUpdates: true,
          complianceAlerts: true,
          realTimeTracking: true,
        },
        inApp: {
          enabled: true,
          showPopups: true,
          soundEnabled: false,
          quietHours: {
            enabled: true,
            start: "22:00",
            end: "07:00",
          },
        },
      };
    },
    enabled: !!customerAccess?.customerId,
  });
}

// Update notification preferences
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { data: customerAccess } = useCustomerAccess();

  return useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>) => {
      // In a real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true, preferences };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["notification-preferences", customerAccess?.customerId] 
      });
    },
  });
}