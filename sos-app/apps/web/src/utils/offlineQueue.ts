import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Background Sync API types
declare global {
  interface ServiceWorkerRegistration {
    sync: {
      register(tag: string): Promise<void>;
    };
  }
}

interface OfflineQueueDB extends DBSchema {
  'emergency-queue': {
    key: number;
    value: {
      id?: number;
      data: any;
      timestamp: number;
    };
  };
}

let dbInstance: IDBPDatabase<OfflineQueueDB> | null = null;

async function getDB(): Promise<IDBPDatabase<OfflineQueueDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineQueueDB>('sos-app-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('emergency-queue')) {
        db.createObjectStore('emergency-queue', {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    },
  });

  return dbInstance;
}

export async function queueEmergency(emergencyData: any): Promise<void> {
  const db = await getDB();
  await db.add('emergency-queue', {
    data: emergencyData,
    timestamp: Date.now(),
  });

  // Request background sync if available
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-emergency');
  }
}

export async function getQueuedEmergencies(): Promise<any[]> {
  const db = await getDB();
  return db.getAll('emergency-queue');
}

export async function clearQueue(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('emergency-queue', 'readwrite');
  await tx.objectStore('emergency-queue').clear();
}

export async function removeQueuedEmergency(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('emergency-queue', id);
}

// Check if online and sync queue
export async function syncQueueIfOnline(): Promise<void> {
  if (!navigator.onLine) return;

  const queued = await getQueuedEmergencies();
  if (queued.length === 0) return;

  for (const item of queued) {
    try {
      // Would make actual API call here
      // await apiClient.triggerEmergency(item.data);
      await removeQueuedEmergency(item.id!);
    } catch (error) {
      console.error('Failed to sync emergency:', error);
    }
  }
}

// Listen for online event
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncQueueIfOnline();
  });
}
