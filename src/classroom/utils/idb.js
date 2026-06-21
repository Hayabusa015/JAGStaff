// Tiny raw-IndexedDB blob store for client-side "file uploads" — no backend.
// Production upgrade: swap these for Supabase Storage put/get/remove.
// All functions are browser-guarded and resolve to safe no-ops during SSR.

const DB_NAME = 'gmen-materials';
const STORE = 'blobs';

function hasIDB() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!hasIDB()) return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const result = fn(store);
    t.oncomplete = () => {
      db.close();
      resolve(result?.result ?? result);
    };
    t.onerror = () => reject(t.error);
  });
}

export async function putBlob(key, blob) {
  if (!hasIDB()) return;
  await tx('readwrite', (store) => store.put(blob, key));
}

export async function getBlob(key) {
  if (!hasIDB()) return null;
  try {
    return await tx('readonly', (store) => store.get(key));
  } catch {
    return null;
  }
}

export async function deleteBlob(key) {
  if (!hasIDB()) return;
  try {
    await tx('readwrite', (store) => store.delete(key));
  } catch {
    /* ignore */
  }
}
