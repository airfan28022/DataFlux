import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Connection test
export async function testConnection(): Promise<boolean> {
  try {
    await getDoc(doc(db, 'test', 'connection'));
    console.log('[Firestore] Connected to Firebase successfully');
    return true;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('offline') || error.message.includes('unavailable'))) {
      console.warn('[Firestore] Operating in local offline mode:', error.message);
    } else {
      console.log('[Firestore] Initialized');
    }
    return false;
  }
}
