import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, updateDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';

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

if (typeof window !== 'undefined' && auth) {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

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

/**
 * Reuses the persisted anonymous user if one exists; otherwise signs in anonymously.
 * Keeps the same UID across visits when browser storage is intact.
 */
export async function ensureAnonymousUser() {
  if (!isFirebaseConfigured || !auth) {
    return null;
  }
  if (auth.currentUser) {
    return auth.currentUser;
  }
  const cred = await signInAnonymously(auth);
  return cred.user;
}

/**
 * Save user profile - stored by phone number
 * Structure: users/{phoneNumber}
 */
export async function saveUserProfile(uid, data) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  // Use phone number as document ID, but also store uid for Firebase Auth reference
  const phoneNumber = data.phone || data.phoneNumber;
  if (!phoneNumber) {
    console.error('Phone number is required to save user profile');
    return null;
  }

  // Normalize phone number (remove spaces, dashes, etc.)
  const normalizedPhone = phoneNumber.replace(/\D/g, '');
  
  const ref = doc(db, 'users', normalizedPhone);
  await setDoc(ref, { 
    ...data, 
    phone: normalizedPhone,
    uid: uid,
    isPremium: false, // Initialize premium status
    taskCount: 0, // Initialize task count
    walletBalance: 0, // Initialize wallet balance
    updatedAt: new Date().toISOString() 
  }, { merge: true });
  return ref;
}

/**
 * Get user profile by phone number
 * Structure: users/{phoneNumber}
 */
export async function getUserProfile(phoneNumberOrUid) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    // Normalize phone number if provided
    const normalizedPhone = phoneNumberOrUid.replace(/\D/g, '');
    
    // Try to get by phone number first
    const ref = doc(db, 'users', normalizedPhone);
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
      return snap.data();
    }
    
    // If not found by phone, try to find by uid (backward compatibility)
    if (phoneNumberOrUid.length > 10) {
      // Likely a UID, search by uid field
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', phoneNumberOrUid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data();
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to fetch user profile', error);
    return null;
  }
}

/**
 * Get user profile by phone number (primary method)
 * Structure: users/{phoneNumber}
 */
export async function getUserProfileByPhone(phoneNumber) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    const ref = doc(db, 'users', normalizedPhone);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error('Failed to fetch user profile by phone', error);
    return null;
  }
}

/**
 * Update user profile by phone number
 * Structure: users/{phoneNumber}
 */
export async function updateUserProfile(phoneNumberOrUid, data) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    // Normalize phone number if provided
    const normalizedPhone = phoneNumberOrUid.replace(/\D/g, '');
    
    // Try to get existing user to find phone number
    let userPhone = normalizedPhone;
    
    // If it looks like a UID, find the user first
    if (phoneNumberOrUid.length > 10) {
      const existingUser = await getUserProfile(phoneNumberOrUid);
      if (existingUser && existingUser.phone) {
        userPhone = existingUser.phone.replace(/\D/g, '');
      } else {
        // If phone is in data, use it
        if (data.phone) {
          userPhone = data.phone.replace(/\D/g, '');
        } else {
          console.error('Cannot update user: phone number not found');
          return null;
        }
      }
    }
    
    const ref = doc(db, 'users', userPhone);
    
    // If phone number is being updated, we need to handle document migration
    if (data.phone && data.phone.replace(/\D/g, '') !== userPhone) {
      const newPhone = data.phone.replace(/\D/g, '');
      const newRef = doc(db, 'users', newPhone);
      
      // Get existing data
      const existingData = await getUserProfile(userPhone);
      
      // Create new document with new phone number
      await setDoc(newRef, {
        ...existingData,
        ...data,
        phone: newPhone,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Delete old document if phone changed
      if (userPhone !== newPhone) {
        await deleteDoc(ref);
      }
      
      return newRef;
    } else {
      // Normal update
      await setDoc(ref, { 
        ...data, 
        phone: userPhone, // Ensure phone is always set
        updatedAt: new Date().toISOString() 
      }, { merge: true });
      return ref;
    }
  } catch (error) {
    console.error('Failed to update user profile', error);
    throw error;
  }
}

/** Defaults for Pro upgrade (also written to Firestore on first read). */
export const DEFAULT_PRO_PRICING = Object.freeze({
  amount: 399,
  currency: 'INR',
  description: 'Lifetime Pro Access',
});

/** When wallet balance reaches this threshold, user must complete KYC fee payment (Firestore: `config/kyc_requirements`). */
export const DEFAULT_KYC_REQUIREMENTS = Object.freeze({
  balanceThreshold: 2000,
  feeAmount: 300,
  currency: 'INR',
  description: 'KYC verification fee',
});

/** Onboarding Telegram channel — document `config/telegram` in Firestore. */
export const DEFAULT_TELEGRAM_CONFIG = Object.freeze({
  channelUrl: 'https://t.me/skillwork_official',
  channelName: 'SkillWork Official',
  memberSubtitle: 'Join our community for proofs & updates',
  bonusLabel: '+₹10',
});

export function normalizeTelegramConfig(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  const channelUrl =
    typeof d.channelUrl === 'string' && d.channelUrl.trim().startsWith('http')
      ? d.channelUrl.trim()
      : DEFAULT_TELEGRAM_CONFIG.channelUrl;
  const channelName =
    typeof d.channelName === 'string' && d.channelName.trim()
      ? d.channelName.trim()
      : DEFAULT_TELEGRAM_CONFIG.channelName;
  const memberSubtitle =
    typeof d.memberSubtitle === 'string' && d.memberSubtitle.trim()
      ? d.memberSubtitle.trim()
      : DEFAULT_TELEGRAM_CONFIG.memberSubtitle;
  const bonusLabel =
    typeof d.bonusLabel === 'string' && d.bonusLabel.trim()
      ? d.bonusLabel.trim()
      : DEFAULT_TELEGRAM_CONFIG.bonusLabel;
  return { channelUrl, channelName, memberSubtitle, bonusLabel };
}

export async function getTelegramConfig() {
  if (!isFirebaseConfigured || !db) {
    return normalizeTelegramConfig(null);
  }
  try {
    const ref = doc(db, 'config', 'telegram');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return normalizeTelegramConfig(snap.data());
    }
    const defaultData = {
      ...DEFAULT_TELEGRAM_CONFIG,
      createdAt: new Date().toISOString(),
    };
    await setDoc(ref, defaultData);
    return normalizeTelegramConfig(defaultData);
  } catch (error) {
    console.error('Failed to get Telegram config', error);
    return normalizeTelegramConfig(null);
  }
}

const DEFAULT_UPI_MERCHANT = Object.freeze({ upiId: 'default@upi', name: 'Default Name' });

/**
 * Build the in-app pricing object from Firestore `config/pricing`.
 * Only these fields are read: amount, currency, description (e.g. int64 amount, "INR", "Lifetime Pro Access").
 * Other document fields (createdAt, etc.) are ignored and not returned.
 */
export function normalizeProPricing(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  const n = Number(d.amount);
  const amount = Number.isFinite(n) && n >= 0 ? n : DEFAULT_PRO_PRICING.amount;
  const currency =
    typeof d.currency === 'string' && d.currency.trim()
      ? d.currency.trim()
      : DEFAULT_PRO_PRICING.currency;
  const description =
    typeof d.description === 'string' && d.description.trim()
      ? d.description.trim()
      : DEFAULT_PRO_PRICING.description;
  return { amount, currency, description };
}

/**
 * Build KYC gate config from Firestore `config/kyc_requirements`.
 * Fields: balanceThreshold, feeAmount, currency, description.
 */
export function normalizeKycRequirements(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  const th = Number(d.balanceThreshold);
  const fee = Number(d.feeAmount);
  const balanceThreshold =
    Number.isFinite(th) && th >= 0 ? th : DEFAULT_KYC_REQUIREMENTS.balanceThreshold;
  const feeAmount = Number.isFinite(fee) && fee >= 0 ? fee : DEFAULT_KYC_REQUIREMENTS.feeAmount;
  const currency =
    typeof d.currency === 'string' && d.currency.trim()
      ? d.currency.trim()
      : DEFAULT_KYC_REQUIREMENTS.currency;
  const description =
    typeof d.description === 'string' && d.description.trim()
      ? d.description.trim()
      : DEFAULT_KYC_REQUIREMENTS.description;
  return { balanceThreshold, feeAmount, currency, description };
}

export async function getKycRequirements() {
  if (!isFirebaseConfigured || !db) {
    return normalizeKycRequirements(null);
  }

  try {
    const ref = doc(db, 'config', 'kyc_requirements');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return normalizeKycRequirements(snap.data());
    }
    const defaultData = {
      ...DEFAULT_KYC_REQUIREMENTS,
      createdAt: new Date().toISOString(),
    };
    await setDoc(ref, defaultData);
    return normalizeKycRequirements(defaultData);
  } catch (error) {
    console.error('Failed to get KYC requirements', error);
    return normalizeKycRequirements(null);
  }
}

/**
 * From Firestore UPI docs (`payment/intent_upi`, `payment/upi`): only **upiId** and **name** are used.
 * Fields like **createdAt** are ignored and not returned.
 */
function normalizeUpiMerchant(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  const upiId =
    typeof d.upiId === 'string' && d.upiId.trim() ? d.upiId.trim() : DEFAULT_UPI_MERCHANT.upiId;
  const name =
    typeof d.name === 'string' && d.name.trim() ? d.name.trim() : DEFAULT_UPI_MERCHANT.name;
  return { upiId, name };
}

/** Legacy / generic merchant UPI (e.g. QR host). Intent flow uses {@link getIntentUpiDetails}. */
export async function getUpiDetails() {
  if (!isFirebaseConfigured || !db) {
    return normalizeUpiMerchant(null);
  }

  try {
    const ref = doc(db, 'payment', 'upi');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return normalizeUpiMerchant(snap.data());
    }
    const defaultData = { ...DEFAULT_UPI_MERCHANT, createdAt: new Date().toISOString() };
    await setDoc(ref, defaultData);
    return normalizeUpiMerchant(defaultData);
  } catch (error) {
    console.error('Failed to get UPI details', error);
    return normalizeUpiMerchant(null);
  }
}

/**
 * UPI for in-app **Intent** deep links only (QR/web flow unchanged).
 * Document: **payment/intent_upi** — fields used: **upiId**, **name** (plus optional **createdAt** in DB, ignored by the app).
 */
export async function getIntentUpiDetails() {
  if (!isFirebaseConfigured || !db) {
    return normalizeUpiMerchant(null);
  }

  try {
    const ref = doc(db, 'payment', 'intent_upi');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return normalizeUpiMerchant(snap.data());
    }
    const defaultData = { ...DEFAULT_UPI_MERCHANT, createdAt: new Date().toISOString() };
    await setDoc(ref, defaultData);
    return normalizeUpiMerchant(defaultData);
  } catch (error) {
    console.error('Failed to get intent UPI details', error);
    return normalizeUpiMerchant(null);
  }
}

export async function getProPricing() {
  if (!isFirebaseConfigured || !db) {
    return normalizeProPricing(null);
  }

  try {
    const ref = doc(db, 'config', 'pricing');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return normalizeProPricing(snap.data());
    }
    const defaultData = {
      ...DEFAULT_PRO_PRICING,
      createdAt: new Date().toISOString(),
    };
    await setDoc(ref, defaultData);
    return normalizeProPricing(defaultData);
  } catch (error) {
    console.error('Failed to get pro pricing', error);
    return normalizeProPricing(null);
  }
}

export async function initializeFirestoreData() {
  if (!isFirebaseConfigured || !db) {
    console.warn('Skipping Firestore initialization: Firebase not configured.');
    return;
  }

  try {
    // Initialize UPI details
    const upiRef = doc(db, 'payment', 'upi');
    const upiSnap = await getDoc(upiRef);
    if (!upiSnap.exists()) {
      await setDoc(upiRef, {
        ...DEFAULT_UPI_MERCHANT,
        createdAt: new Date().toISOString(),
      });
      console.debug('Created default UPI document');
    }

    const intentUpiRef = doc(db, 'payment', 'intent_upi');
    const intentUpiSnap = await getDoc(intentUpiRef);
    if (!intentUpiSnap.exists()) {
      await setDoc(intentUpiRef, {
        ...DEFAULT_UPI_MERCHANT,
        createdAt: new Date().toISOString(),
      });
      console.debug('Created default intent UPI document');
    }

    // Initialize pricing
    const pricingRef = doc(db, 'config', 'pricing');
    const pricingSnap = await getDoc(pricingRef);
    if (!pricingSnap.exists()) {
      await setDoc(pricingRef, {
        ...DEFAULT_PRO_PRICING,
        createdAt: new Date().toISOString(),
      });
      console.debug('Created default pricing document');
    }

    const kycRef = doc(db, 'config', 'kyc_requirements');
    const kycSnap = await getDoc(kycRef);
    if (!kycSnap.exists()) {
      await setDoc(kycRef, {
        ...DEFAULT_KYC_REQUIREMENTS,
        createdAt: new Date().toISOString(),
      });
      console.debug('Created default KYC requirements document');
    }

    const tgRef = doc(db, 'config', 'telegram');
    const tgSnap = await getDoc(tgRef);
    if (!tgSnap.exists()) {
      await setDoc(tgRef, {
        ...DEFAULT_TELEGRAM_CONFIG,
        createdAt: new Date().toISOString(),
      });
      console.debug('Created default Telegram config document');
    }

    console.debug('Firestore data initialization complete');
  } catch (error) {
    console.error('Failed to initialize Firestore data', error);
  }
}

/** @typedef {'premium' | 'kyc'} PaymentPurpose */

export async function createPaymentRecord(uid, amount, method, purpose = 'premium') {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    if (purpose === 'premium') {
      const hasCompleted = await hasCompletedPremiumPayment(uid);
      if (hasCompleted) {
        throw new Error('User already has a completed payment for premium upgrade');
      }
    } else if (purpose === 'kyc') {
      const paid = await isUserKycFeePaid(uid);
      if (paid) {
        throw new Error('User already completed KYC fee payment');
      }
    }

    const existingPending = await hasPendingPayment(uid, purpose);
    if (existingPending) {
      console.debug('User already has pending payment, returning existing', {
        id: existingPending.id,
        purpose,
      });
      return existingPending;
    }

    const paymentRef = doc(collection(db, 'payments'));
    const paymentData = {
      userId: uid,
      amount: amount,
      currency: 'INR',
      method: method, // 'intent' or 'qr'
      status: 'pending', // 'pending', 'completed', 'failed'
      purpose,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(paymentRef, paymentData);
    console.debug('Created payment record', { id: paymentRef.id, purpose });
    return { id: paymentRef.id, ...paymentData };
  } catch (error) {
    console.error('Failed to create payment record', error);
    throw error;
  }
}

export async function updatePaymentStatus(paymentId, status) {
  if (!isFirebaseConfigured || !db) {
    return;
  }

  try {
    const paymentRef = doc(db, 'payments', paymentId);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format for easy sorting
    
    if (status === 'completed') {
      // Only store successful payments with date organization
      await updateDoc(paymentRef, {
        status: status,
        completedAt: now.toISOString(),
        date: dateStr, // Date field for sorting
        updatedAt: now.toISOString(),
      });
      console.debug('Payment marked as completed', { paymentId, date: dateStr });
    } else {
      // For other statuses, just update status
      await updateDoc(paymentRef, {
        status: status,
        updatedAt: now.toISOString(),
      });
      console.debug('Updated payment status', { paymentId, status });
    }
  } catch (error) {
    console.error('Failed to update payment status', error);
    throw error;
  }
}

/**
 * Create a successful payment record (only for completed payments)
 * Structure: premium_payments/{date}/transactions/{transactionId}
 */
export async function createSuccessfulPayment(uid, amount, method, paymentId = null) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Generate transaction ID (UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const transactionId = paymentId || generateUUID();
    
    // Create payment record in premium_payments/{date}/transactions/{transactionId}
    const transactionRef = doc(db, 'premium_payments', dateStr, 'transactions', transactionId);
    
    const paymentData = {
      userId: uid,
      amount: amount,
      currency: 'INR',
      method: method, // 'intent' or 'qr'
      status: 'completed', // Only store successful payments
      date: dateStr, // Date field for sorting (YYYY-MM-DD)
      transactionId: transactionId,
      createdAt: now.toISOString(),
      completedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await setDoc(transactionRef, paymentData);
    console.debug('Created successful payment record', { date: dateStr, transactionId });
    return { id: transactionId, ...paymentData };
  } catch (error) {
    console.error('Failed to create successful payment record', error);
    throw error;
  }
}

/**
 * Completed KYC fee payments — same date layout as {@link createSuccessfulPayment}.
 * Structure: kyc_payments/{date}/transactions/{transactionId}
 */
export async function createSuccessfulKycPayment(uid, amount, method, paymentId = null) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };

    const transactionId = paymentId || generateUUID();
    const transactionRef = doc(db, 'kyc_payments', dateStr, 'transactions', transactionId);

    const paymentData = {
      userId: uid,
      amount: amount,
      currency: 'INR',
      method: method,
      status: 'completed',
      date: dateStr,
      transactionId: transactionId,
      createdAt: now.toISOString(),
      completedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await setDoc(transactionRef, paymentData);
    console.debug('Created successful KYC payment record', { date: dateStr, transactionId });
    return { id: transactionId, ...paymentData };
  } catch (error) {
    console.error('Failed to create successful KYC payment record', error);
    throw error;
  }
}

/**
 * Marks KYC fee as paid without a real UPI flow (dev/demo). Writes `kyc_payments` + `users.kycFeePaid`.
 * Enable UI with `import.meta.env.DEV` or `VITE_ENABLE_FAKE_KYC=true`.
 */
export async function completeFakeKycPayment(uid) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured');
  }
  if (await isUserKycFeePaid(uid)) {
    return { ok: true, already: true };
  }
  const pricing = await getKycRequirements();
  await createSuccessfulKycPayment(uid, pricing.feeAmount, 'demo');
  await updateUserKycFeePaid(uid, true);
  return { ok: true };
}

/**
 * Get all successful payments for a user, sorted by date (newest first)
 * Structure: premium_payments/{date}/transactions/{transactionId}
 */
export async function getSuccessfulPayments(uid, limit = 50) {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  try {
    const payments = [];
    
    // Get all date documents from premium_payments
    const premiumPaymentsRef = collection(db, 'premium_payments');
    const dateDocs = await getDocs(premiumPaymentsRef);
    
    // Iterate through each date
    for (const dateDoc of dateDocs.docs) {
      const dateStr = dateDoc.id; // Date in YYYY-MM-DD format
      
      // Get transactions for this date
      const transactionsRef = collection(db, 'premium_payments', dateStr, 'transactions');
      const transactionsSnapshot = await getDocs(transactionsRef);
      
      transactionsSnapshot.forEach((transactionDoc) => {
        const data = transactionDoc.data();
        // Filter by userId
        if (data.userId === uid && data.status === 'completed') {
          payments.push({ 
            id: transactionDoc.id, 
            date: dateStr,
            ...data 
          });
        }
      });
    }

    // Sort by date (newest first), then by completedAt
    payments.sort((a, b) => {
      const dateA = a.date || a.completedAt || a.createdAt || '';
      const dateB = b.date || b.completedAt || b.createdAt || '';
      if (dateB !== dateA) {
        return dateB.localeCompare(dateA);
      }
      // If same date, sort by completedAt
      const completedA = a.completedAt || a.createdAt || '';
      const completedB = b.completedAt || b.createdAt || '';
      return completedB.localeCompare(completedA);
    });

    return payments.slice(0, limit);
  } catch (error) {
    console.error('Failed to get successful payments', error);
    return [];
  }
}

/**
 * Get all successful payments, sorted by date (newest first)
 * Structure: premium_payments/{date}/transactions/{transactionId}
 */
export async function getAllSuccessfulPayments(limit = 100) {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  try {
    const payments = [];
    
    // Get all date documents from premium_payments
    const premiumPaymentsRef = collection(db, 'premium_payments');
    const dateDocs = await getDocs(premiumPaymentsRef);
    
    // Iterate through each date
    for (const dateDoc of dateDocs.docs) {
      const dateStr = dateDoc.id; // Date in YYYY-MM-DD format
      
      // Get transactions for this date
      const transactionsRef = collection(db, 'premium_payments', dateStr, 'transactions');
      const transactionsSnapshot = await getDocs(transactionsRef);
      
      transactionsSnapshot.forEach((transactionDoc) => {
        const data = transactionDoc.data();
        // Only get completed payments
        if (data.status === 'completed') {
          payments.push({ 
            id: transactionDoc.id, 
            date: dateStr,
            ...data 
          });
        }
      });
    }

    // Sort by date (newest first), then by completedAt
    payments.sort((a, b) => {
      const dateA = a.date || a.completedAt || a.createdAt || '';
      const dateB = b.date || b.completedAt || b.createdAt || '';
      if (dateB !== dateA) {
        return dateB.localeCompare(dateA);
      }
      // If same date, sort by completedAt
      const completedA = a.completedAt || a.createdAt || '';
      const completedB = b.completedAt || b.createdAt || '';
      return completedB.localeCompare(completedA);
    });

    return payments.slice(0, limit);
  } catch (error) {
    console.error('Failed to get all successful payments', error);
    return [];
  }
}

/**
 * Clean up old pending payments that were never completed (older than 24 hours)
 * Note: Pending payments are still stored in 'payments' collection, not in premium_payments
 */
export async function cleanupOldPendingPayments() {
  if (!isFirebaseConfigured || !db) {
    return;
  }

  try {
    const paymentsRef = collection(db, 'payments');
    const q = query(
      paymentsRef,
      where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);
    
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000); // 24 hours in milliseconds
    
    const deletePromises = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : 0;
      
      // Delete pending payments older than 24 hours
      if (createdAt < oneDayAgo) {
        deletePromises.push(
          deleteDoc(doc(db, 'payments', docSnap.id))
            .then(() => {
              console.debug('Deleted old pending payment', { id: docSnap.id });
              return 1;
            })
            .catch((error) => {
              console.error('Failed to delete old pending payment', error);
              return 0;
            })
        );
      }
    });

    const results = await Promise.all(deletePromises);
    const deletedCount = results.reduce((sum, count) => sum + count, 0);

    if (deletedCount > 0) {
      console.debug(`Cleaned up ${deletedCount} old pending payments`);
    }
  } catch (error) {
    console.error('Failed to cleanup old pending payments', error);
  }
}

export async function getPaymentStatus(paymentId) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const paymentRef = doc(db, 'payments', paymentId);
    const snap = await getDoc(paymentRef);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error('Failed to get payment status', error);
    return null;
  }
}

/**
 * Check if user has a completed payment for premium upgrade
 * Structure: premium_payments/{date}/transactions/{transactionId}
 */
export async function hasCompletedPremiumPayment(uid) {
  if (!isFirebaseConfigured || !db) {
    return false;
  }

  try {
    // Get all date documents from premium_payments
    const premiumPaymentsRef = collection(db, 'premium_payments');
    const dateDocs = await getDocs(premiumPaymentsRef);
    
    // Check each date's transactions
    for (const dateDoc of dateDocs.docs) {
      const dateStr = dateDoc.id;
      const transactionsRef = collection(db, 'premium_payments', dateStr, 'transactions');
      const transactionsSnapshot = await getDocs(transactionsRef);
      
      // Check if any transaction belongs to this user and is completed
      for (const transactionDoc of transactionsSnapshot.docs) {
        const data = transactionDoc.data();
        if (data.userId === uid && data.status === 'completed') {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Failed to check premium payment', error);
    return false;
  }
}

/**
 * Check if user has a pending payment (`purpose` defaults to `premium`; legacy docs without `purpose` count as premium).
 */
export async function hasPendingPayment(uid, purpose = 'premium') {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const paymentsRef = collection(db, 'payments');
    const q = query(
      paymentsRef,
      where('userId', '==', uid),
      where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);
    for (const d of querySnapshot.docs) {
      const data = d.data();
      const p = data.purpose || 'premium';
      if (p === purpose) {
        return { id: d.id, ...data };
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to check pending payment', error);
    return null;
  }
}

/**
 * Whether the user has a completed KYC fee in `kyc_payments` (any date).
 */
export async function hasCompletedKycPayment(uid) {
  if (!isFirebaseConfigured || !db) {
    return false;
  }

  try {
    const kycPaymentsRef = collection(db, 'kyc_payments');
    const dateDocs = await getDocs(kycPaymentsRef);

    for (const dateDoc of dateDocs.docs) {
      const dateStr = dateDoc.id;
      const transactionsRef = collection(db, 'kyc_payments', dateStr, 'transactions');
      const transactionsSnapshot = await getDocs(transactionsRef);

      for (const transactionDoc of transactionsSnapshot.docs) {
        const data = transactionDoc.data();
        if (data.userId === uid && data.status === 'completed') {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Failed to check KYC payment', error);
    return false;
  }
}

/**
 * KYC fee satisfied if profile flag is true or a completed `kyc_payments` row exists.
 */
export async function isUserKycFeePaid(uid) {
  if (!isFirebaseConfigured || !db) {
    return false;
  }

  try {
    const userProfile = await getUserProfile(uid);
    if (userProfile && userProfile.kycFeePaid === true) {
      return true;
    }
    return await hasCompletedKycPayment(uid);
  } catch (error) {
    console.error('Failed to check KYC fee status', error);
    return false;
  }
}

/**
 * Watches auth state changes.
 */
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}

async function getUserDocRefByIdentifier(identifier) {
  const rawIdentifier = String(identifier ?? '').trim();
  if (!rawIdentifier) {
    throw new Error('User identifier is required');
  }

  // 1) Exact document ID match (works for both phone-based IDs and legacy UID-based IDs).
  const directRef = doc(db, 'users', rawIdentifier);
  const directSnap = await getDoc(directRef);
  if (directSnap.exists()) {
    return directRef;
  }

  // 2) Normalized phone document ID.
  const normalizedPhone = rawIdentifier.replace(/\D/g, '');
  if (normalizedPhone && normalizedPhone !== rawIdentifier) {
    const phoneRef = doc(db, 'users', normalizedPhone);
    const phoneSnap = await getDoc(phoneRef);
    if (phoneSnap.exists()) {
      return phoneRef;
    }
  }

  // 3) Lookup by uid field.
  const usersRef = collection(db, 'users');
  const uidQuery = query(usersRef, where('uid', '==', rawIdentifier));
  const uidSnapshot = await getDocs(uidQuery);
  if (!uidSnapshot.empty) {
    return doc(db, 'users', uidSnapshot.docs[0].id);
  }

  // Fallback: create/update normalized phone doc when possible, otherwise raw identifier.
  const fallbackId = normalizedPhone || rawIdentifier;
  return doc(db, 'users', fallbackId);
}

/**
 * Update user premium status manually (admin function)
 */
export async function updateUserPremiumStatus(identifier, isPremium) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const ref = await getUserDocRefByIdentifier(identifier);
    
    await setDoc(ref, { 
      isPremium: isPremium,
      updatedAt: new Date().toISOString() 
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to update user premium status', error);
    return false;
  }
}

export async function updateUserKycFeePaid(identifier, kycFeePaid) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const ref = await getUserDocRefByIdentifier(identifier);
    await setDoc(
      ref,
      {
        kycFeePaid: kycFeePaid,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Failed to update KYC fee status', error);
    return false;
  }
}

/**
 * Update user task count
 */
export async function updateUserTaskCount(identifier, taskCount) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const ref = await getUserDocRefByIdentifier(identifier);
    
    await setDoc(ref, { 
      taskCount: taskCount,
      updatedAt: new Date().toISOString() 
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to update user task count', error);
    return false;
  }
}

/**
 * Update user wallet balance
 */
export async function updateUserWalletBalance(identifier, walletBalance) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const ref = await getUserDocRefByIdentifier(identifier);
    
    await setDoc(ref, { 
      walletBalance: walletBalance,
      updatedAt: new Date().toISOString() 
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to update user wallet balance', error);
    return false;
  }
}

/**
 * Get all users (admin function)
 */
export async function getAllUsers() {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    return users;
  } catch (error) {
    console.error('Failed to get all users', error);
    return [];
  }
}

/**
 * Check if user is premium (considering manual override)
 */
export async function isUserPremium(uid) {
  if (!isFirebaseConfigured || !db) {
    return false;
  }

  try {
    const userProfile = await getUserProfile(uid);
    if (userProfile && userProfile.isPremium !== undefined) {
      return userProfile.isPremium;
    }
    
    // Fallback to payment check
    return await hasCompletedPremiumPayment(uid);
  } catch (error) {
    console.error('Failed to check user premium status', error);
    return false;
  }
}
