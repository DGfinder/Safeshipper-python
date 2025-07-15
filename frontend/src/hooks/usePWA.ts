'use client';

import { useState, useEffect, useCallback } from 'react';

// PWA installation and capabilities hook
export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if app is installed
  useEffect(() => {
    const checkInstallation = () => {
      // Check if running as PWA
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      
      setIsStandalone(isStandaloneMode || isIOSStandalone);
      setIsInstalled(isStandaloneMode || isIOSStandalone);
    };

    checkInstallation();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkInstallation);

    return () => {
      mediaQuery.removeEventListener('change', checkInstallation);
    };
  }, []);

  // Handle installation prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Service worker registration and updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          setSwRegistration(registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setSwUpdateAvailable(true);
                }
              });
            }
          });
        })
        .catch(error => {
          console.error('Service worker registration failed:', error);
        });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', event => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'NOTIFICATION_CLICK':
            // Handle notification click
            handleNotificationClick(data);
            break;
          case 'BACKGROUND_SYNC_COMPLETE':
            // Handle background sync completion
            handleBackgroundSyncComplete(data);
            break;
        }
      });
    }
  }, []);

  // Install PWA
  const installPWA = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('PWA installation failed:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Update service worker
  const updateServiceWorker = useCallback(() => {
    if (!swRegistration) return;

    if (swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setSwUpdateAvailable(false);
      window.location.reload();
    }
  }, [swRegistration]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return 'not-supported';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }, []);

  // Subscribe to push notifications
  const subscribeToPushNotifications = useCallback(async () => {
    if (!swRegistration) return null;

    try {
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }, [swRegistration]);

  // Queue background sync
  const queueBackgroundSync = useCallback((tag: string, data: any) => {
    if (!swRegistration) return;

    // Store data in IndexedDB for background sync
    navigator.serviceWorker.ready.then(registration => {
      registration.sync.register(tag);
      
      // Send data to service worker
      if (registration.active) {
        registration.active.postMessage({
          type: 'STORE_OFFLINE_DATA',
          data: {
            store: `pending${tag}`,
            key: Date.now().toString(),
            value: data
          }
        });
      }
    });
  }, [swRegistration]);

  // Share content
  const shareContent = useCallback(async (shareData: {
    title?: string;
    text?: string;
    url?: string;
    files?: File[];
  }) => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (error) {
        console.error('Share failed:', error);
        return false;
      }
    }
    
    // Fallback for browsers without Web Share API
    if (shareData.url) {
      await navigator.clipboard.writeText(shareData.url);
      return true;
    }
    
    return false;
  }, []);

  // Add to home screen (iOS)
  const addToHomeScreen = useCallback(() => {
    // For iOS, we need to show instructions
    if (isIOSDevice()) {
      return {
        isIOS: true,
        instructions: [
          'Tap the Share button',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" to confirm'
        ]
      };
    }
    
    return installPWA();
  }, [installPWA]);

  // Handle notification click
  const handleNotificationClick = useCallback((data: any) => {
    // Navigate to relevant page based on notification data
    if (data.url) {
      window.location.href = data.url;
    }
  }, []);

  // Handle background sync completion
  const handleBackgroundSyncComplete = useCallback((data: any) => {
    // Show success message or update UI
    console.log('Background sync completed:', data);
  }, []);

  // Get PWA capabilities
  const capabilities = {
    canInstall: isInstallable,
    canShare: 'share' in navigator,
    canNotify: 'Notification' in window,
    canSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
    canPush: 'serviceWorker' in navigator && 'PushManager' in window,
    hasCamera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    hasGeolocation: 'geolocation' in navigator,
    hasVibration: 'vibrate' in navigator,
    hasStorage: 'localStorage' in window && 'sessionStorage' in window,
    hasIndexedDB: 'indexedDB' in window,
    hasWebGL: !!document.createElement('canvas').getContext('webgl'),
    hasWebRTC: 'RTCPeerConnection' in window,
    hasWebSockets: 'WebSocket' in window,
    hasFileSystem: 'showOpenFilePicker' in window,
    hasClipboard: 'clipboard' in navigator,
    hasWakeLock: 'wakeLock' in navigator,
    hasBattery: 'getBattery' in navigator,
    hasGamepad: 'getGamepads' in navigator,
    hasPayment: 'PaymentRequest' in window,
  };

  return {
    // Installation
    isInstallable,
    isInstalled,
    isStandalone,
    installPWA,
    addToHomeScreen,
    
    // Network
    isOnline,
    
    // Service Worker
    swUpdateAvailable,
    updateServiceWorker,
    
    // Notifications
    requestNotificationPermission,
    subscribeToPushNotifications,
    
    // Background Sync
    queueBackgroundSync,
    
    // Sharing
    shareContent,
    
    // Capabilities
    capabilities,
    
    // Utilities
    isIOSDevice: isIOSDevice(),
    isAndroidDevice: isAndroidDevice(),
    isMobile: isMobileDevice(),
  };
}

// Utility functions
function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isAndroidDevice(): boolean {
  return /Android/.test(navigator.userAgent);
}

function isMobileDevice(): boolean {
  return /Mobi|Android/i.test(navigator.userAgent);
}

// Background sync hook
export function useBackgroundSync() {
  const [isPending, setIsPending] = useState(false);
  const [syncQueue, setSyncQueue] = useState<any[]>([]);

  const queueAction = useCallback((action: {
    type: string;
    data: any;
    timestamp: number;
  }) => {
    setSyncQueue(prev => [...prev, action]);
    setIsPending(true);
    
    // Register for background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register(`safeshipper-${action.type}`);
      });
    }
  }, []);

  const clearQueue = useCallback(() => {
    setSyncQueue([]);
    setIsPending(false);
  }, []);

  return {
    isPending,
    syncQueue,
    queueAction,
    clearQueue,
  };
}

// Notification hook
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return 'not-supported';
    
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') return null;
    
    const notification = new Notification(title, {
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      ...options
    });
    
    return notification;
  }, [permission]);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
  };
}

// Install prompt hook
export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!prompt) return false;

    try {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      
      if (outcome === 'accepted') {
        setPrompt(null);
        setIsInstallable(false);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Install failed:', error);
      return false;
    }
  }, [prompt]);

  return {
    isInstallable,
    install,
  };
}