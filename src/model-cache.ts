import type { TrainedClassifier } from './shared';
function openCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hist-trained-models', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('models');
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
export async function readModelCache(roomId: string): Promise<TrainedClassifier | null> {
  try {
    const db = await openCache();
    return await new Promise((resolve, reject) => {
      const request = db.transaction('models').objectStore('models').get(roomId);
      request.onsuccess = () => { db.close(); resolve(request.result || null); }; request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch { return null; }
}
export async function writeModelCache(roomId: string, model: TrainedClassifier) {
  try {
    const db = await openCache();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('models', 'readwrite'); tx.objectStore('models').put(model, roomId);
      tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch { /* Recognition remains usable when browser storage is unavailable. */ }
}
