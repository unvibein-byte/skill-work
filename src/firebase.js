import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const defaultFirebaseConfig = {
  apiKey: 'AIzaSyAS77O3L7ttzQ-ivVehqODEyu76Uk7vFM0',
  authDomain: 'skillwork-65a18.firebaseapp.com',
  projectId: 'skillwork-65a18',
  storageBucket: 'skillwork-65a18.firebasestorage.app',
  messagingSenderId: '205692579256',
  appId: '1:205692579256:web:eaeb6398dfa5713461b34d',
  measurementId: 'G-PQEEYLP802',
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? defaultFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? defaultFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? defaultFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? defaultFirebaseConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? defaultFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? defaultFirebaseConfig.appId,
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? defaultFirebaseConfig.measurementId,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

export const analytics =
  typeof window !== 'undefined' && isFirebaseConfigured && firebaseConfig.measurementId
    ? getAnalytics(app)
    : null;

export const auth = isFirebaseConfigured ? getAuth(app) : null;
export const db = isFirebaseConfigured ? getFirestore(app) : null;

/**
 * Sign in anonymously (useful for quick demos and storing user data without full auth).
 * Requires enabling "Anonymous" sign-in in your Firebase console.
 */
export async function signInAnonymouslyUser() {
  if (!isFirebaseConfigured || !auth) {
    return Promise.reject(new Error('Firebase is not configured (sign-in disabled).'));
  }

  return signInAnonymously(auth);
}

export async function saveUserProfile(uid, data) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  const ref = doc(db, 'users', uid);
  await setDoc(ref, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
  return ref;
}

/**
 * Watches auth state changes.
 */
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}
