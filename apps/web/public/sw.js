// Service Worker for SOS App PWA
const CACHE_NAME = 'sos-app-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/login',
  '/register',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      return fetch(event.request).then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline emergency triggers
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-emergency') {
    event.waitUntil(syncEmergencies());
  }
});

async function syncEmergencies() {
  // Get queued emergencies from IndexedDB
  const db = await openDB();
  const tx = db.transaction('emergency-queue', 'readonly');
  const store = tx.objectStore('emergency-queue');
  const emergencies = await store.getAll();

  // Send each emergency to server
  for (const emergency of emergencies) {
    try {
      await fetch('/api/v1/emergency/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emergency.data),
      });

      // Remove from queue if successful
      const deleteTx = db.transaction('emergency-queue', 'readwrite');
      const deleteStore = deleteTx.objectStore('emergency-queue');
      await deleteStore.delete(emergency.id);
    } catch (error) {
      console.error('Failed to sync emergency:', error);
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sos-app-db', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('emergency-queue')) {
        db.createObjectStore('emergency-queue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}
