// SafeShipper Service Worker
// Enhanced PWA capabilities for offline functionality and background sync

const CACHE_NAME = 'safeshipper-v1.0.0';
const STATIC_CACHE_NAME = 'safeshipper-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'safeshipper-dynamic-v1.0.0';
const API_CACHE_NAME = 'safeshipper-api-v1.0.0';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/shipments',
  '/fleet',
  '/analytics',
  '/customer-portal',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/offline.html',
  '/_next/static/css/app.css',
  '/_next/static/js/app.js',
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/dashboard/stats',
  '/api/shipments/recent',
  '/api/fleet/status',
  '/api/notifications',
  '/api/user/profile',
];

// Routes that should work offline
const OFFLINE_ROUTES = [
  '/dashboard',
  '/shipments',
  '/fleet',
  '/analytics',
  '/customer-portal',
  '/track',
  '/notifications',
  '/settings',
];

// Background sync tags
const SYNC_TAGS = {
  SHIPMENT_CREATE: 'shipment-create',
  SHIPMENT_UPDATE: 'shipment-update',
  TRACKING_UPDATE: 'tracking-update',
  NOTIFICATION_READ: 'notification-read',
  ANALYTICS_EXPORT: 'analytics-export',
};

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('SafeShipper SW: Installing service worker');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('SafeShipper SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(API_CACHE_NAME).then(cache => {
        console.log('SafeShipper SW: Pre-caching API endpoints');
        return Promise.all(
          API_ENDPOINTS.map(url => 
            fetch(url).then(response => {
              if (response.ok) {
                cache.put(url, response.clone());
              }
              return response;
            }).catch(() => {
              // Silently fail for pre-caching
            })
          )
        );
      })
    ])
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('SafeShipper SW: Activating service worker');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== API_CACHE_NAME) {
              console.log('SafeShipper SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and external URLs
  if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - cache first, then network
    event.respondWith(handleAPIRequest(request));
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Static assets - cache first
    event.respondWith(handleStaticAssets(request));
  } else if (OFFLINE_ROUTES.some(route => url.pathname.startsWith(route))) {
    // App routes - network first, then cache
    event.respondWith(handleAppRoutes(request));
  } else {
    // Other requests - network first
    event.respondWith(handleOtherRequests(request));
  }
});

// Handle API requests with intelligent caching
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Try network first for real-time data
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const responseClone = networkResponse.clone();
      
      // Set cache expiration based on endpoint
      const cacheExpiration = getCacheExpiration(url.pathname);
      if (cacheExpiration > 0) {
        const responseWithExpiration = new Response(responseClone.body, {
          status: responseClone.status,
          statusText: responseClone.statusText,
          headers: {
            ...responseClone.headers,
            'sw-cache-timestamp': Date.now().toString(),
            'sw-cache-expiration': cacheExpiration.toString()
          }
        });
        cache.put(request, responseWithExpiration);
      }
      
      return networkResponse;
    }
  } catch (error) {
    console.log('SafeShipper SW: Network failed, trying cache for:', request.url);
  }
  
  // Fallback to cache
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    // Check if cache is still valid
    const cacheTimestamp = parseInt(cachedResponse.headers.get('sw-cache-timestamp') || '0');
    const cacheExpiration = parseInt(cachedResponse.headers.get('sw-cache-expiration') || '0');
    
    if (Date.now() - cacheTimestamp < cacheExpiration) {
      return cachedResponse;
    }
  }
  
  // Return offline response for critical endpoints
  if (url.pathname.includes('/dashboard/stats')) {
    return new Response(JSON.stringify({
      offline: true,
      message: 'Offline mode - showing cached data',
      data: {
        activeShipments: 0,
        totalFleet: 0,
        notifications: 0,
        lastUpdate: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Offline', { status: 503 });
}

// Handle static assets
async function handleStaticAssets(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('SafeShipper SW: Failed to load static asset:', request.url);
    return new Response('Asset not available offline', { status: 404 });
  }
}

// Handle app routes
async function handleAppRoutes(request) {
  try {
    // Try network first for latest content
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('SafeShipper SW: Network failed for route:', request.url);
  }
  
  // Fallback to cache
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Return offline page
  return caches.match('/offline.html');
}

// Handle other requests
async function handleOtherRequests(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Not available offline', { status: 404 });
  }
}

// Get cache expiration time based on endpoint
function getCacheExpiration(pathname) {
  // Real-time data - 30 seconds
  if (pathname.includes('/fleet/live') || pathname.includes('/tracking/live')) {
    return 30 * 1000;
  }
  
  // Frequently updated data - 5 minutes
  if (pathname.includes('/notifications') || pathname.includes('/dashboard/stats')) {
    return 5 * 60 * 1000;
  }
  
  // Moderate update frequency - 30 minutes
  if (pathname.includes('/shipments') || pathname.includes('/analytics')) {
    return 30 * 60 * 1000;
  }
  
  // Rarely updated data - 24 hours
  if (pathname.includes('/users') || pathname.includes('/settings')) {
    return 24 * 60 * 60 * 1000;
  }
  
  // Default - 1 hour
  return 60 * 60 * 1000;
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('SafeShipper SW: Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case SYNC_TAGS.SHIPMENT_CREATE:
      event.waitUntil(syncShipmentCreate());
      break;
    case SYNC_TAGS.SHIPMENT_UPDATE:
      event.waitUntil(syncShipmentUpdate());
      break;
    case SYNC_TAGS.TRACKING_UPDATE:
      event.waitUntil(syncTrackingUpdate());
      break;
    case SYNC_TAGS.NOTIFICATION_READ:
      event.waitUntil(syncNotificationRead());
      break;
    case SYNC_TAGS.ANALYTICS_EXPORT:
      event.waitUntil(syncAnalyticsExport());
      break;
  }
});

// Sync functions
async function syncShipmentCreate() {
  const pendingShipments = await getFromIndexedDB('pendingShipments');
  
  for (const shipment of pendingShipments) {
    try {
      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipment.data)
      });
      
      if (response.ok) {
        await removeFromIndexedDB('pendingShipments', shipment.id);
        await showNotification('Shipment Created', {
          body: `Shipment ${shipment.data.trackingNumber} has been created successfully`,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'shipment-created'
        });
      }
    } catch (error) {
      console.log('SafeShipper SW: Failed to sync shipment:', error);
    }
  }
}

async function syncShipmentUpdate() {
  const pendingUpdates = await getFromIndexedDB('pendingShipmentUpdates');
  
  for (const update of pendingUpdates) {
    try {
      const response = await fetch(`/api/shipments/${update.shipmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update.data)
      });
      
      if (response.ok) {
        await removeFromIndexedDB('pendingShipmentUpdates', update.id);
      }
    } catch (error) {
      console.log('SafeShipper SW: Failed to sync shipment update:', error);
    }
  }
}

async function syncTrackingUpdate() {
  const pendingTracking = await getFromIndexedDB('pendingTrackingUpdates');
  
  for (const tracking of pendingTracking) {
    try {
      const response = await fetch(`/api/tracking/${tracking.shipmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tracking.data)
      });
      
      if (response.ok) {
        await removeFromIndexedDB('pendingTrackingUpdates', tracking.id);
      }
    } catch (error) {
      console.log('SafeShipper SW: Failed to sync tracking update:', error);
    }
  }
}

async function syncNotificationRead() {
  const pendingReads = await getFromIndexedDB('pendingNotificationReads');
  
  for (const read of pendingReads) {
    try {
      const response = await fetch(`/api/notifications/${read.notificationId}/read`, {
        method: 'PUT'
      });
      
      if (response.ok) {
        await removeFromIndexedDB('pendingNotificationReads', read.id);
      }
    } catch (error) {
      console.log('SafeShipper SW: Failed to sync notification read:', error);
    }
  }
}

async function syncAnalyticsExport() {
  const pendingExports = await getFromIndexedDB('pendingAnalyticsExports');
  
  for (const exportRequest of pendingExports) {
    try {
      const response = await fetch('/api/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportRequest.data)
      });
      
      if (response.ok) {
        await removeFromIndexedDB('pendingAnalyticsExports', exportRequest.id);
        await showNotification('Export Ready', {
          body: 'Your analytics export is ready for download',
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'export-ready'
        });
      }
    } catch (error) {
      console.log('SafeShipper SW: Failed to sync analytics export:', error);
    }
  }
}

// Push notifications
self.addEventListener('push', event => {
  console.log('SafeShipper SW: Push notification received');
  
  let notificationData = {
    title: 'SafeShipper',
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'default'
  };
  
  if (event.data) {
    try {
      notificationData = { ...notificationData, ...event.data.json() };
    } catch (error) {
      console.log('SafeShipper SW: Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(
    showNotification(notificationData.title, notificationData)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('SafeShipper SW: Notification clicked');
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const url = notificationData.url || '/dashboard';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      // Check if there's already a window open
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: notificationData
          });
          return;
        }
      }
      
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});

// Message handler for communication with main thread
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
    case 'QUEUE_BACKGROUND_SYNC':
      if (data.tag && SYNC_TAGS[data.tag]) {
        self.registration.sync.register(data.tag);
      }
      break;
    case 'STORE_OFFLINE_DATA':
      storeInIndexedDB(data.store, data.key, data.value);
      break;
  }
});

// Utility functions
async function showNotification(title, options) {
  const permission = await self.registration.showNotification(title, {
    ...options,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icon-dismiss.png'
      }
    ]
  });
  
  return permission;
}

// IndexedDB helpers
async function getFromIndexedDB(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SafeShipperDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getRequest = store.getAll();
      
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => resolve(getRequest.result);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
  });
}

async function storeInIndexedDB(storeName, key, value) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SafeShipperDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const putRequest = store.put({ id: key, ...value });
      
      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve(putRequest.result);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
  });
}

async function removeFromIndexedDB(storeName, key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SafeShipperDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const deleteRequest = store.delete(key);
      
      deleteRequest.onerror = () => reject(deleteRequest.error);
      deleteRequest.onsuccess = () => resolve(deleteRequest.result);
    };
  });
}

console.log('SafeShipper SW: Service worker loaded successfully');