import { StagingProduct } from '../excel/excelParser';

const DB_NAME = 'ZutechAdminStash';
const STORE_NAME = 'bulk_import_session';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveStash(products: StagingProduct[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    // Blobs are supported by structured clone algorithm in IDB
    const req = store.put(products, 'current_session');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadStash(): Promise<StagingProduct[] | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get('current_session');
    req.onsuccess = () => {
      const data = req.result as StagingProduct[] | undefined;
      // Re-create object URLs for blobs if they exist
      if (data) {
        data.forEach(p => {
          if (p.imagenBlob) {
            p.previewUrl = URL.createObjectURL(p.imagenBlob);
          }
        });
      }
      resolve(data || null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearStash(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete('current_session');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
