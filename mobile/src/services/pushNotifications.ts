/**
 * Push Notification Service for SafeShipper Mobile App
 * Handles registration, receiving, and managing push notifications
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api';

// Configure notification handling behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export interface PushNotificationData {
  type: 'feedback_received' | 'feedback_request' | 'shipment_update' | 'emergency_alert';
  title: string;
  body: string;
  data?: {
    shipment_id?: string;
    tracking_number?: string;
    feedback_id?: string;
    feedback_score?: number;
    requires_action?: boolean;
    [key: string]: any;
  };
}

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
}

class PushNotificationService {
  private pushToken: string | null = null;
  private isRegistered: boolean = false;

  /**
   * Initialize the push notification service
   */
  async initialize(): Promise<void> {
    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.warn('Push notifications are only supported on physical devices');
        return;
      }

      // Get existing permission status
      const permission = await this.checkPermission();
      
      if (permission.granted) {
        await this.registerForPushNotifications();
      } else {
        console.log('Push notification permission not granted');
      }

      // Set up notification listeners
      this.setupNotificationListeners();

    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  /**
   * Check current notification permission status
   */
  async checkPermission(): Promise<NotificationPermissionStatus> {
    const settings = await Notifications.getPermissionsAsync();
    
    return {
      granted: settings.granted,
      canAskAgain: settings.canAskAgain,
      status: settings.status,
    };
  }

  /**
   * Request notification permissions from user
   */
  async requestPermission(): Promise<NotificationPermissionStatus> {
    try {
      const settings = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      return {
        granted: settings.granted,
        canAskAgain: settings.canAskAgain,
        status: settings.status,
      };
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: Notifications.PermissionStatus.UNDETERMINED,
      };
    }
  }

  /**
   * Register for push notifications and get push token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check permission first
      const permission = await this.checkPermission();
      
      if (!permission.granted) {
        const requestResult = await this.requestPermission();
        if (!requestResult.granted) {
          console.log('Push notification permission denied');
          return null;
        }
      }

      // Get push token
      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId || 'safeshipper-mobile-app',
      });

      this.pushToken = pushToken.data;
      
      // Store token locally
      await AsyncStorage.setItem('push_token', this.pushToken);
      
      // Register token with backend
      await this.registerTokenWithBackend(this.pushToken);
      
      this.isRegistered = true;
      console.log('Push notification registration successful:', this.pushToken);
      
      return this.pushToken;

    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      return null;
    }
  }

  /**
   * Register push token with SafeShipper backend
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      await apiService.registerPushToken(token, {
        platform: Platform.OS,
        app_version: '1.0.0', // This should come from your app config
        device_id: Device.deviceName || 'unknown',
      });
      
      console.log('Push token registered with backend');
    } catch (error) {
      console.error('Failed to register push token with backend:', error);
      throw error;
    }
  }

  /**
   * Setup notification event listeners
   */
  private setupNotificationListeners(): void {
    // Handle notifications when app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received (foreground):', notification);
      this.handleNotificationReceived(notification);
    });

    // Handle notification taps
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
      this.handleNotificationTapped(response);
    });
  }

  /**
   * Handle notification received (app in foreground)
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    const data = notification.request.content.data as PushNotificationData['data'];
    
    // Update badge count for feedback notifications
    if (data?.type === 'feedback_received') {
      this.updateBadgeCount();
    }

    // Log analytics
    this.logNotificationEvent('received', data);
  }

  /**
   * Handle notification tap (user interaction)
   */
  private handleNotificationTapped(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data as PushNotificationData['data'];
    
    // Navigate based on notification type
    this.handleNotificationNavigation(data);
    
    // Log analytics
    this.logNotificationEvent('tapped', data);
  }

  /**
   * Handle navigation based on notification type
   */
  private handleNotificationNavigation(data: PushNotificationData['data']): void {
    if (!data) return;

    // This would integrate with your navigation service
    switch (data.type) {
      case 'feedback_received':
        if (data.tracking_number) {
          // Navigate to feedback details screen
          console.log('Navigate to feedback for shipment:', data.tracking_number);
          // NavigationService.navigate('FeedbackDetails', { trackingNumber: data.tracking_number });
        }
        break;
        
      case 'shipment_update':
        if (data.shipment_id) {
          // Navigate to shipment details
          console.log('Navigate to shipment:', data.shipment_id);
          // NavigationService.navigate('ShipmentDetails', { shipmentId: data.shipment_id });
        }
        break;
        
      case 'emergency_alert':
        // Navigate to emergency response screen
        console.log('Navigate to emergency response');
        // NavigationService.navigate('EmergencyResponse', data);
        break;
        
      default:
        console.log('Unknown notification type:', data.type);
    }
  }

  /**
   * Update app badge count
   */
  async updateBadgeCount(): Promise<void> {
    try {
      // Get unread count from API
      const unreadData = await apiService.getUnreadEventCount();
      await Notifications.setBadgeCountAsync(unreadData.unread_count);
    } catch (error) {
      console.error('Failed to update badge count:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }

  /**
   * Cancel a specific notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  /**
   * Schedule a local notification (for testing or offline scenarios)
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          sound: 'default',
        },
        trigger: trigger || null, // null means immediate
      });
      
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule local notification:', error);
      throw error;
    }
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Check if device is registered for push notifications
   */
  isDeviceRegistered(): boolean {
    return this.isRegistered && this.pushToken !== null;
  }

  /**
   * Unregister from push notifications
   */
  async unregister(): Promise<void> {
    try {
      if (this.pushToken) {
        // Unregister with backend
        await apiService.unregisterPushToken(this.pushToken);
        
        // Clear local storage
        await AsyncStorage.removeItem('push_token');
        
        // Clear badge
        await Notifications.setBadgeCountAsync(0);
        
        this.pushToken = null;
        this.isRegistered = false;
        
        console.log('Push notifications unregistered');
      }
    } catch (error) {
      console.error('Failed to unregister push notifications:', error);
      throw error;
    }
  }

  /**
   * Log notification analytics
   */
  private logNotificationEvent(event: 'received' | 'tapped', data?: any): void {
    // This would integrate with your analytics service
    console.log(`Notification ${event}:`, {
      event,
      type: data?.type,
      shipment_id: data?.shipment_id,
      tracking_number: data?.tracking_number,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Test push notification (development only)
   */
  async testNotification(): Promise<void> {
    if (__DEV__) {
      await this.scheduleLocalNotification(
        'Test Notification',
        'This is a test push notification from SafeShipper',
        {
          type: 'test',
          timestamp: new Date().toISOString(),
        }
      );
    }
  }
}

// Create and export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;