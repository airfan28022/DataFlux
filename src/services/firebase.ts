import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDocFromServer,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const dbId = firebaseConfig.firestoreDatabaseId || '(default)';

// Initialize Firestore with auto-detect long polling and robust local caching
// experimentalAutoDetectLongPolling prevents WebChannel streaming dropouts in sandboxed iframes
export const db = (() => {
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
        ignoreUndefinedProperties: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      dbId
    );
  } catch (_e) {
    try {
      // Fallback for private browsing or iframe environments where IndexedDB is blocked
      return initializeFirestore(
        app,
        {
          experimentalAutoDetectLongPolling: true,
          ignoreUndefinedProperties: true,
          localCache: memoryLocalCache(),
        },
        dbId
      );
    } catch (_e2) {
      // Already initialized
      return getFirestore(app, dbId);
    }
  }
})();

export const auth = getAuth(app);

// Connection test according to Firebase Integration Skill
export async function testConnection(): Promise<boolean> {
  try {
    // Attempt getDocFromServer with a 6-second timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection check timeout')), 6000)
    );
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')),
      timeoutPromise,
    ]);
    console.log('[Firestore] Connected to Firebase successfully');
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('offline') ||
        error.message.includes('unavailable') ||
        error.message.includes('timeout') ||
        error.message.includes('the client is offline'))
    ) {
      console.warn('[Firestore] Operating in local offline cache mode:', error.message);
    } else {
      console.log('[Firestore] Initialized (local storage active)');
    }
    return false;
  }
}
