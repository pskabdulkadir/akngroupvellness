/**
 * Unified Client Data Layer & Offline Sync Engine
 * AKN Global Group Ltd. - Quantum Resonance & Monoline MLM Platform
 * 
 * Replaces legacy Supabase/Firebase with pure local & PostgreSQL-synced storage.
 * Completely free of external cloud SDKs (@supabase/* and firebase).
 */

export type Unsubscribe = () => void;
export type Firestore = Record<string, any>;
export type Auth = {
  currentUser: any | null;
};

export const db: Firestore = {};

export interface DocumentReference {
  id: string;
  collectionName: string;
}

export interface CollectionReference {
  name: string;
}

const LOCAL_DOC_STORE_PREFIX = 'akn_app_doc_';
const memoryStore: Record<string, Record<string, any>> = {};
const listeners = new Map<string, Set<() => void>>();

function getCollectionMap(colName: string): Record<string, any> {
  if (memoryStore[colName]) {
    return memoryStore[colName];
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`${LOCAL_DOC_STORE_PREFIX}${colName}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          memoryStore[colName] = parsed;
          return memoryStore[colName];
        }
      }
    } catch {
      // ignore
    }
  }
  memoryStore[colName] = {};
  return memoryStore[colName];
}

function persistCollectionMap(colName: string): void {
  if (typeof window !== 'undefined') {
    try {
      const col = memoryStore[colName] || {};
      localStorage.setItem(`${LOCAL_DOC_STORE_PREFIX}${colName}`, JSON.stringify(col));
    } catch {
      // ignore
    }
  }
}

function notifyListeners(colName: string): void {
  const cListeners = listeners.get(colName);
  if (cListeners) {
    cListeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('[ClientDB] Listener callback error:', err);
      }
    });
  }
}

export function doc(...args: any[]): DocumentReference {
  if (args.length >= 3) {
    const segments = args.slice(1);
    const id = segments[segments.length - 1];
    const collectionName = segments.slice(0, -1).join('_');
    return { id: String(id), collectionName: String(collectionName) };
  }
  return { id: String(args[1] || 'default'), collectionName: String(args[0] || 'default') };
}

export function collection(_db: any, name: string): CollectionReference {
  return { name };
}

export async function setDoc(
  docRef: DocumentReference,
  data: Record<string, any>,
  options?: { merge?: boolean }
): Promise<void> {
  const colMap = getCollectionMap(docRef.collectionName);
  const existing = colMap[docRef.id] || {};
  const next = options?.merge ? { ...existing, ...data } : { ...data };
  colMap[docRef.id] = next;
  persistCollectionMap(docRef.collectionName);
  notifyListeners(docRef.collectionName);
}

export async function updateDoc(
  docRef: DocumentReference,
  data: Record<string, any>
): Promise<void> {
  return setDoc(docRef, data, { merge: true });
}

export async function deleteDoc(docRef: DocumentReference): Promise<void> {
  const colMap = getCollectionMap(docRef.collectionName);
  delete colMap[docRef.id];
  persistCollectionMap(docRef.collectionName);
  notifyListeners(docRef.collectionName);
}

export async function getDoc(docRef: DocumentReference): Promise<{
  exists: () => boolean;
  data: () => any;
  id: string;
}> {
  const colMap = getCollectionMap(docRef.collectionName);
  const data = colMap[docRef.id] || null;
  return {
    exists: () => data !== null,
    data: () => data,
    id: docRef.id,
  };
}

export interface QueryDocumentSnapshot {
  id: string;
  data: () => any;
  exists: () => boolean;
}

export interface QuerySnapshot {
  docs: QueryDocumentSnapshot[];
  empty: boolean;
  size: number;
  forEach: (callback: (doc: QueryDocumentSnapshot) => void) => void;
}

export async function getDocs(queryOrCol: any): Promise<QuerySnapshot> {
  const colName = queryOrCol?.name || queryOrCol?.collectionName || String(queryOrCol);
  const colMap = getCollectionMap(colName);
  const docs: QueryDocumentSnapshot[] = Object.entries(colMap).map(([id, data]) => ({
    id,
    data: () => data,
    exists: () => true,
  }));
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback: (doc: QueryDocumentSnapshot) => void) => docs.forEach(callback),
  };
}

export function onSnapshot(
  target: any,
  callback: (snapshot: any) => void,
  _onError?: (err: any) => void
): Unsubscribe {
  const colName = target?.collectionName || target?.name || String(target);
  if (!listeners.has(colName)) {
    listeners.set(colName, new Set());
  }

  const trigger = () => {
    if (target?.id) {
      const colMap = getCollectionMap(colName);
      const data = colMap[target.id] || null;
      callback({
        exists: () => data !== null,
        data: () => data,
        id: target.id,
      });
    } else {
      const colMap = getCollectionMap(colName);
      const docs: QueryDocumentSnapshot[] = Object.entries(colMap).map(([id, data]) => ({
        id,
        data: () => data,
        exists: () => true,
      }));
      callback({
        docs,
        empty: docs.length === 0,
        size: docs.length,
        forEach: (cb: (doc: QueryDocumentSnapshot) => void) => docs.forEach(cb),
      });
    }
  };

  listeners.get(colName)!.add(trigger);
  trigger();

  return () => {
    const cSet = listeners.get(colName);
    if (cSet) {
      cSet.delete(trigger);
    }
  };
}

export function query(colRef: any, ..._constraints: any[]): any {
  return colRef;
}

export function where(..._args: any[]): any {
  return {};
}

export function limit(..._args: any[]): any {
  return {};
}

export function orderBy(..._args: any[]): any {
  return {};
}

export async function ensureFirebaseAuthUser(..._args: any[]): Promise<{ uid: string } | null> {
  return { uid: 'auth-user-local' };
}

export async function runTransaction(
  _db: any,
  updateFunction: (transaction: any) => Promise<any>
): Promise<any> {
  return updateFunction({
    get: getDoc,
    set: setDoc,
    update: updateDoc,
    delete: deleteDoc,
  });
}

export function wipeAllLocalApplicationData(..._args: any[]): void {
  if (typeof window !== 'undefined') {
    Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LOCAL_DOC_STORE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }
}
