import { SavedVideo, StorageStats } from '../types';

const DB_NAME = 'TubeVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'saved_videos';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('youtubeId', 'youtubeId', { unique: false });
        store.createIndex('folder', 'folder', { unique: false });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getAllSavedVideos(): Promise<SavedVideo[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const results: SavedVideo[] = request.result || [];
      // Sort newest first
      results.sort((a, b) => b.savedAt - a.savedAt);
      resolve(results);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getSavedVideoById(id: string): Promise<SavedVideo | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveVideoToVault(video: SavedVideo): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(video);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteVideoFromVault(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function updateVideoFolder(id: string, folder: string): Promise<void> {
  const video = await getSavedVideoById(id);
  if (!video) return;
  video.folder = folder;
  await saveVideoToVault(video);
}

export async function updateVideoProgress(id: string, progress: number): Promise<void> {
  const video = await getSavedVideoById(id);
  if (!video) return;
  video.watchProgress = progress;
  await saveVideoToVault(video);
}

export async function updateVideoNotes(id: string, notes: string): Promise<void> {
  const video = await getSavedVideoById(id);
  if (!video) return;
  video.notes = notes;
  await saveVideoToVault(video);
}

export async function clearAllSavedVideos(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getStorageStats(): Promise<StorageStats> {
  const videos = await getAllSavedVideos();
  let totalBytes = 0;
  for (const v of videos) {
    if (v.fileSize) {
      totalBytes += v.fileSize;
    } else if (v.blob) {
      totalBytes += v.blob.size;
    }
  }

  let quotaBytes: number | undefined;
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota) {
        quotaBytes = estimate.quota;
      }
    } catch {
      // Ignore
    }
  }

  return {
    usedBytes: totalBytes,
    formattedUsed: formatBytes(totalBytes),
    videoCount: videos.length,
    quotaBytes,
    formattedQuota: quotaBytes ? formatBytes(quotaBytes) : undefined,
    percentageUsed: quotaBytes ? Math.min(100, Math.round((totalBytes / quotaBytes) * 100)) : undefined
  };
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
