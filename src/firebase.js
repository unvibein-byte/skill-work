import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  updateDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  limit,
  runTransaction,
} from 'firebase/firestore';

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

const DEVICE_ALREADY_REGISTERED = 'DEVICE_ALREADY_REGISTERED';
export const DEVICE_ALREADY_REGISTERED_MESSAGE =
  'This device is already registered. Please use your original account.';

export const USER_STATUS_ACTIVE = 'active';
export const USER_STATUS_BLOCKED = 'blocked';
export const DEFAULT_USER_BLOCKED_MESSAGE =
  'Your account has been blocked. Please contact support.';

const ADMIN_ONLY_USER_FIELDS = ['blocked', 'status', 'blockReason', 'blockedAt', 'blockedBy', 'kycStatus'];

function stripAdminOnlyUserFields(data = {}) {
  const safe = { ...data };
  ADMIN_ONLY_USER_FIELDS.forEach((key) => {
    delete safe[key];
  });
  return safe;
}

/** True when user is blocked via Firebase (`blocked: true` or `status: "blocked"`). */
export function isUserBlocked(profile) {
  if (!profile) return false;
  if (profile.blocked === true) return true;
  if (String(profile.status || '').toLowerCase() === USER_STATUS_BLOCKED) return true;
  return false;
}

export function getBlockedUserMessage(profile) {
  const custom = profile?.blockReason?.trim() || profile?.blockMessage?.trim();
  return custom || DEFAULT_USER_BLOCKED_MESSAGE;
}

/**
 * Check if a user may use the app (by phone or uid).
 * Set in Firebase Console on users/{phone}:
 *   blocked: true
 *   status: "blocked"
 *   blockReason: "optional message shown to user"
 */
export async function checkUserAccountStatus(phoneNumberOrUid) {
  if (!phoneNumberOrUid) {
    return { allowed: true, profile: null, message: '' };
  }

  const profile = await getUserProfile(phoneNumberOrUid);
  if (!profile || !isUserBlocked(profile)) {
    return { allowed: true, profile, message: '' };
  }

  return {
    allowed: false,
    profile,
    message: getBlockedUserMessage(profile),
  };
}

/** Admin: block or unblock a user from the users collection. */
export async function updateUserBlockStatus(identifier, blocked, blockReason = '') {
  if (!isFirebaseConfigured || !db) {
    return false;
  }

  try {
    const ref = await getUserDocRefByIdentifier(identifier);
    const payload = {
      blocked: !!blocked,
      status: blocked ? USER_STATUS_BLOCKED : USER_STATUS_ACTIVE,
      updatedAt: new Date().toISOString(),
    };

    if (blocked) {
      payload.blockedAt = new Date().toISOString();
      if (blockReason?.trim()) {
        payload.blockReason = blockReason.trim();
      }
    } else {
      payload.blockReason = '';
      payload.blockedAt = null;
    }

    await setDoc(ref, payload, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to update user block status', error);
    return false;
  }
}

/** Find the user doc that owns this device (users/{phone}.deviceId). */
async function findUserByDeviceId(deviceId) {
  if (!isFirebaseConfigured || !db || !deviceId) {
    return null;
  }

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('deviceId', '==', deviceId), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      return null;
    }
    const docSnap = snap.docs[0];
    return { phone: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error('Failed to find user by device id', error);
    return null;
  }
}

export async function syncDeviceBindingFromServer(deviceId) {
  const user = await findUserByDeviceId(deviceId);
  if (user?.phone && typeof window !== 'undefined') {
    try {
      localStorage.setItem('sw_device_phone', user.phone);
    } catch {
      /* ignore */
    }
  }
  return user;
}

/**
 * Returns whether this device may sign in / register with the given phone.
 */
export async function checkDeviceAllowsPhone(deviceId, normalizedPhone) {
  if (!normalizedPhone) {
    return { allowed: false, message: 'Please enter a valid mobile number.' };
  }

  let localBound = '';
  if (typeof window !== 'undefined') {
    try {
      localBound = localStorage.getItem('sw_device_phone') || '';
    } catch {
      /* ignore */
    }
  }

  if (localBound && localBound !== normalizedPhone) {
    return { allowed: false, message: DEVICE_ALREADY_REGISTERED_MESSAGE };
  }

  if (!isFirebaseConfigured || !db || !deviceId) {
    return { allowed: true };
  }

  const user = await findUserByDeviceId(deviceId);
  if (!user?.phone) {
    return { allowed: true };
  }
  if (user.phone === normalizedPhone) {
    return { allowed: true };
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('sw_device_phone', user.phone);
    } catch {
      /* ignore */
    }
  }

  return { allowed: false, message: DEVICE_ALREADY_REGISTERED_MESSAGE };
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

  if (data.deviceId) {
    const bound = await findUserByDeviceId(data.deviceId);
    if (bound && bound.phone !== normalizedPhone) {
      const err = new Error(DEVICE_ALREADY_REGISTERED);
      err.code = DEVICE_ALREADY_REGISTERED;
      throw err;
    }
  }

  const ref = doc(db, 'users', normalizedPhone);
  const existingSnap = await getDoc(ref);
  const payload = {
    ...stripAdminOnlyUserFields(data),
    phone: normalizedPhone,
    uid,
    updatedAt: new Date().toISOString(),
  };

  if (!existingSnap.exists()) {
    payload.isPremium = false;
    payload.taskCount = 0;
    payload.walletBalance = 0;
    payload.totalEarned = 0;
    payload.totalWithdrawn = 0;
    payload.blocked = false;
    payload.status = USER_STATUS_ACTIVE;
    if (data.deviceId) {
      payload.deviceRegisteredAt = new Date().toISOString();
    }
  }

  await setDoc(ref, payload, { merge: true });

  if (data.deviceId && typeof window !== 'undefined') {
    try {
      localStorage.setItem('sw_device_phone', normalizedPhone);
    } catch {
      /* ignore */
    }
  }

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
        ...stripAdminOnlyUserFields(data),
        phone: newPhone,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      
      // Delete old document if phone changed
      if (userPhone !== newPhone) {
        await deleteDoc(ref);
      }
      
      return newRef;
    } else {
      // Normal update (client cannot change blocked / status — set those in Firebase Console)
      await setDoc(ref, {
        ...stripAdminOnlyUserFields(data),
        phone: userPhone,
        updatedAt: new Date().toISOString(),
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

/**
 * Toggle payment buttons in the app (Firestore: `config/payment_methods`).
 * Set `upiIntentEnabled` / `qrEnabled` to false to hide that option for Pro & KYC.
 */
export const DEFAULT_PAYMENT_METHODS = Object.freeze({
  upiIntentEnabled: true,
  qrEnabled: true,
});

/** Onboarding Telegram channel — document `config/telegram` in Firestore. */
export const DEFAULT_TELEGRAM_CONFIG = Object.freeze({
  channelUrl: 'https://t.me/skillwork_official',
  channelName: 'SkillWork Official',
  memberSubtitle: 'Join our community for proofs & updates',
  bonusLabel: '+₹10',
});

/**
 * Contact support WebView URL (Firestore: `config/support`).
 * Set `supportUrl` to your help desk, WhatsApp web, or contact page.
 */
export const DEFAULT_SUPPORT_CONFIG = Object.freeze({
  supportUrl: 'https://user.24hrwork.space/',
  pageTitle: 'Contact Support',
  adminPin: 'skillwork2026',
});

/**
 * Payment proof WebView on home screen (Firestore: `config/payment_proof`).
 * Set `proofUrl` to your receipts / payment history page.
 */
export const DEFAULT_PAYMENT_PROOF_CONFIG = Object.freeze({
  proofUrl: 'https://payment.itechvertical.in/',
  pageTitle: 'Payment Proof',
});

export function normalizePaymentProofConfig(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  const fromUrl =
    typeof d.proofUrl === 'string' && d.proofUrl.trim().startsWith('http')
      ? d.proofUrl.trim()
      : typeof d.url === 'string' && d.url.trim().startsWith('http')
        ? d.url.trim()
        : null;
  const proofUrl = fromUrl || DEFAULT_PAYMENT_PROOF_CONFIG.proofUrl;
  const pageTitle =
    typeof d.pageTitle === 'string' && d.pageTitle.trim()
      ? d.pageTitle.trim()
      : DEFAULT_PAYMENT_PROOF_CONFIG.pageTitle;
  return { proofUrl, pageTitle };
}

/** Creates `config/payment_proof` once if missing; backfills `proofUrl` / `pageTitle` when absent. */
export async function ensurePaymentProofConfig() {
  if (!isFirebaseConfigured || !db) {
    return normalizePaymentProofConfig(null);
  }

  const ref = doc(db, 'config', 'payment_proof');

  try {
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const defaultData = {
        ...DEFAULT_PAYMENT_PROOF_CONFIG,
        createdAt: new Date().toISOString(),
      };
      await setDoc(ref, defaultData);
      console.debug('Created config/payment_proof with defaults');
      return normalizePaymentProofConfig(defaultData);
    }

    const existing = snap.data() || {};
    const patch = {};

    if (!Object.prototype.hasOwnProperty.call(existing, 'proofUrl')) {
      patch.proofUrl = DEFAULT_PAYMENT_PROOF_CONFIG.proofUrl;
    }
    if (!Object.prototype.hasOwnProperty.call(existing, 'pageTitle')) {
      patch.pageTitle = DEFAULT_PAYMENT_PROOF_CONFIG.pageTitle;
    }

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = new Date().toISOString();
      await setDoc(ref, patch, { merge: true });
      console.debug('Backfilled config/payment_proof fields', patch);
      return normalizePaymentProofConfig({ ...existing, ...patch });
    }

    return normalizePaymentProofConfig(existing);
  } catch (error) {
    console.error('Failed to ensure payment proof config', error);
    return normalizePaymentProofConfig(null);
  }
}

export async function getPaymentProofConfig() {
  return ensurePaymentProofConfig();
}

/** Old support links pointed at Telegram; those break inside the in-app WebView. */
function isLegacyTelegramSupportUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const u = url.toLowerCase();
  return u.includes('t.me/') || u.includes('telegram.org') || u.includes('telegram.me');
}

export function normalizeSupportConfig(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  let fromUrl =
    typeof d.supportUrl === 'string' && d.supportUrl.trim().startsWith('http')
      ? d.supportUrl.trim()
      : typeof d.url === 'string' && d.url.trim().startsWith('http')
        ? d.url.trim()
        : null;
  if (isLegacyTelegramSupportUrl(fromUrl)) {
    fromUrl = DEFAULT_SUPPORT_CONFIG.supportUrl;
  }
  const supportUrl = fromUrl || DEFAULT_SUPPORT_CONFIG.supportUrl;
  const pageTitle =
    typeof d.pageTitle === 'string' && d.pageTitle.trim()
      ? d.pageTitle.trim()
      : DEFAULT_SUPPORT_CONFIG.pageTitle;
  const adminPin =
    typeof d.adminPin === 'string' && d.adminPin.trim()
      ? d.adminPin.trim()
      : DEFAULT_SUPPORT_CONFIG.adminPin;
  return { supportUrl, pageTitle, adminPin };
}

/** Creates `config/support` once if missing; backfills `supportUrl` / `pageTitle` when absent. */
export async function ensureSupportConfig() {
  if (!isFirebaseConfigured || !db) {
    return normalizeSupportConfig(null);
  }

  const ref = doc(db, 'config', 'support');

  try {
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const defaultData = {
        ...DEFAULT_SUPPORT_CONFIG,
        createdAt: new Date().toISOString(),
      };
      await setDoc(ref, defaultData);
      console.debug('Created config/support with defaults');
      return normalizeSupportConfig(defaultData);
    }

    const existing = snap.data() || {};
    const patch = {};

    if (!Object.prototype.hasOwnProperty.call(existing, 'supportUrl')) {
      patch.supportUrl = DEFAULT_SUPPORT_CONFIG.supportUrl;
    }
    if (!Object.prototype.hasOwnProperty.call(existing, 'pageTitle')) {
      patch.pageTitle = DEFAULT_SUPPORT_CONFIG.pageTitle;
    }
    if (!Object.prototype.hasOwnProperty.call(existing, 'adminPin')) {
      patch.adminPin = DEFAULT_SUPPORT_CONFIG.adminPin;
    }
    if (isLegacyTelegramSupportUrl(existing.supportUrl)) {
      patch.supportUrl = DEFAULT_SUPPORT_CONFIG.supportUrl;
    }

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = new Date().toISOString();
      await setDoc(ref, patch, { merge: true });
      console.debug('Backfilled config/support fields', patch);
      return normalizeSupportConfig({ ...existing, ...patch });
    }

    return normalizeSupportConfig(existing);
  } catch (error) {
    console.error('Failed to ensure support config', error);
    return normalizeSupportConfig(null);
  }
}

export async function getSupportConfig() {
  return ensureSupportConfig();
}

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

function readPaymentMethodFlag(value, defaultEnabled) {
  if (value === true || value === 'true' || value === 1) return true;
  if (value === false || value === 'false' || value === 0) return false;
  return defaultEnabled;
}

/** Build payment method toggles from Firestore `config/payment_methods`. */
export function normalizePaymentMethods(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  return {
    upiIntentEnabled: readPaymentMethodFlag(
      d.upiIntentEnabled ?? d.upiIntent ?? d.intentEnabled,
      DEFAULT_PAYMENT_METHODS.upiIntentEnabled
    ),
    qrEnabled: readPaymentMethodFlag(
      d.qrEnabled ?? d.qr ?? d.qrPaymentEnabled,
      DEFAULT_PAYMENT_METHODS.qrEnabled
    ),
  };
}

function buildPaymentMethodsFirestorePayload(includeCreatedAt = false) {
  const payload = {
    upiIntentEnabled: DEFAULT_PAYMENT_METHODS.upiIntentEnabled,
    qrEnabled: DEFAULT_PAYMENT_METHODS.qrEnabled,
    updatedAt: new Date().toISOString(),
  };
  if (includeCreatedAt) {
    payload.createdAt = new Date().toISOString();
  }
  return payload;
}

/**
 * Creates `config/payment_methods` if missing and backfills `upiIntentEnabled` / `qrEnabled`
 * when older documents do not have them yet.
 */
export async function ensurePaymentMethodsConfig() {
  if (!isFirebaseConfigured || !db) {
    return normalizePaymentMethods(null);
  }

  const ref = doc(db, 'config', 'payment_methods');

  try {
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const defaultData = buildPaymentMethodsFirestorePayload(true);
      await setDoc(ref, defaultData);
      console.debug('Created config/payment_methods with defaults');
      return normalizePaymentMethods(defaultData);
    }

    const existing = snap.data() || {};
    const patch = {};

    if (!Object.prototype.hasOwnProperty.call(existing, 'upiIntentEnabled')) {
      patch.upiIntentEnabled = DEFAULT_PAYMENT_METHODS.upiIntentEnabled;
    }
    if (!Object.prototype.hasOwnProperty.call(existing, 'qrEnabled')) {
      patch.qrEnabled = DEFAULT_PAYMENT_METHODS.qrEnabled;
    }

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = new Date().toISOString();
      await setDoc(ref, patch, { merge: true });
      console.debug('Backfilled config/payment_methods fields', patch);
      return normalizePaymentMethods({ ...existing, ...patch });
    }

    return normalizePaymentMethods(existing);
  } catch (error) {
    console.error('Failed to ensure payment methods config', error);
    return normalizePaymentMethods(null);
  }
}

export async function getPaymentMethods() {
  return ensurePaymentMethodsConfig();
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

    await ensurePaymentMethodsConfig();
    await ensureSupportConfig();
    await ensurePaymentProofConfig();

    console.debug('Firestore data initialization complete');
  } catch (error) {
    console.error('Failed to initialize Firestore data', error);
  }
}

/** @typedef {'premium' | 'kyc'} PaymentPurpose */
/** @typedef {'intent' | 'qr'} PaymentMethod */

/** Local order id for QR URL / dedup — nothing is written to Firestore until success. */
export function createPaymentOrderId() {
  return generatePaymentTransactionId();
}

/**
 * Validates eligibility and returns an in-memory order (no Firestore write).
 * Firestore is updated only in {@link recordSuccessfulPayment} after success callback.
 */
export async function preparePaymentOrder(uid, amount, method, purpose = 'premium') {
  if (purpose === 'premium') {
    if (isFirebaseConfigured && db && (await hasCompletedPremiumPayment(uid))) {
      throw new Error('User already has a completed payment for premium upgrade');
    }
  } else if (purpose === 'kyc') {
    if (isFirebaseConfigured && db && (await isUserKycFeePaid(uid))) {
      throw new Error('User already completed KYC fee payment');
    }
  }

  const order = {
    id: createPaymentOrderId(),
    userId: uid,
    amount,
    method,
    purpose,
  };
  console.debug('Prepared payment order (local only)', { id: order.id, purpose, method });
  return order;
}

/** @deprecated Use {@link preparePaymentOrder} — pending `payments` docs are no longer created. */
export async function createPaymentRecord(uid, amount, method, purpose = 'premium') {
  return preparePaymentOrder(uid, amount, method, purpose);
}

/** Single ledger for all successful payments: payment_success/{date}/transactions/{id} */
export const PAYMENT_SUCCESS_COLLECTION = 'payment_success';

function generatePaymentTransactionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** QR postMessage from payment.itechvertical.in after OCR / admin approval. */
export function isQrPaymentVerifiedMessage(data) {
  if (!data || data.type !== 'verification_complete') {
    return false;
  }
  if (data.success === false || data.verified === false) {
    return false;
  }
  return data.verified === true || data.status === 'approved' || data.status === 'verified';
}

export function sortPaymentsByDateTime(payments) {
  return [...payments].sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    if (dateB !== dateA) {
      return dateB.localeCompare(dateA);
    }
    const sortA = a.sortAt ?? new Date(a.completedAt || a.createdAt || 0).getTime();
    const sortB = b.sortAt ?? new Date(b.completedAt || b.createdAt || 0).getTime();
    return sortB - sortA;
  });
}

async function collectLedgerTransactions({ uid, purpose } = {}) {
  const payments = [];
  const rootRef = collection(db, PAYMENT_SUCCESS_COLLECTION);
  const dateDocs = await getDocs(rootRef);

  for (const dateDoc of dateDocs.docs) {
    const dateStr = dateDoc.id;
    const transactionsRef = collection(db, PAYMENT_SUCCESS_COLLECTION, dateStr, 'transactions');
    const transactionsSnapshot = await getDocs(transactionsRef);

    transactionsSnapshot.forEach((transactionDoc) => {
      const data = transactionDoc.data();
      if (data.status && data.status !== 'completed') {
        return;
      }
      if (uid && data.userId !== uid) {
        return;
      }
      if (purpose && data.purpose !== purpose) {
        return;
      }
      payments.push({
        id: transactionDoc.id,
        date: dateStr,
        ...data,
      });
    });
  }

  return sortPaymentsByDateTime(payments);
}

/** Legacy premium_payments / kyc_payments (read-only fallback). */
async function collectLegacySuccessfulTransactions({ uid, purpose } = {}) {
  const legacyRoot = purpose === 'kyc' ? 'kyc_payments' : 'premium_payments';
  const payments = [];
  const dateDocs = await getDocs(collection(db, legacyRoot));

  for (const dateDoc of dateDocs.docs) {
    const dateStr = dateDoc.id;
    const transactionsRef = collection(db, legacyRoot, dateStr, 'transactions');
    const transactionsSnapshot = await getDocs(transactionsRef);

    transactionsSnapshot.forEach((transactionDoc) => {
      const data = transactionDoc.data();
      if (data.status !== 'completed') {
        return;
      }
      if (uid && data.userId !== uid) {
        return;
      }
      payments.push({
        id: transactionDoc.id,
        date: dateStr,
        purpose: purpose || 'premium',
        ...data,
      });
    });
  }

  return payments;
}

/**
 * Record a successful payment only (intent return or verified QR).
 * Structure: payment_success/{YYYY-MM-DD}/transactions/{transactionId}
 * Fields distinguish premium vs kyc and intent vs qr.
 */
export async function recordSuccessfulPayment(uid, amount, method, purpose, paymentId = null) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const transactionId = paymentId || generatePaymentTransactionId();
    const transactionRef = doc(db, PAYMENT_SUCCESS_COLLECTION, dateStr, 'transactions', transactionId);

    const existingSnap = await getDoc(transactionRef);
    if (existingSnap.exists()) {
      return { id: transactionId, date: dateStr, ...existingSnap.data(), alreadyRecorded: true };
    }

    const paymentData = {
      userId: uid,
      amount: Number(amount),
      purpose,
      method,
      completedAt: now.toISOString(),
      sortAt: now.getTime(),
    };

    await setDoc(transactionRef, paymentData);

    console.debug('Recorded successful payment', {
      date: dateStr,
      transactionId,
      purpose,
      method,
    });
    return { id: transactionId, date: dateStr, ...paymentData };
  } catch (error) {
    console.error('Failed to record successful payment', error);
    throw error;
  }
}

/** @deprecated Use {@link recordSuccessfulPayment} with purpose `premium`. */
export async function createSuccessfulPayment(uid, amount, method, paymentId = null) {
  return recordSuccessfulPayment(uid, amount, method, 'premium', paymentId);
}

/** @deprecated Use {@link recordSuccessfulPayment} with purpose `kyc`. */
export async function createSuccessfulKycPayment(uid, amount, method, paymentId = null) {
  return recordSuccessfulPayment(uid, amount, method, 'kyc', paymentId);
}

/**
 * Marks KYC fee as paid without a real UPI flow (dev/demo). Writes `payment_success` + `users.kycFeePaid`.
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
 * Get successful premium payments for a user (newest date/time first).
 */
export async function getSuccessfulPayments(uid, limit = 50) {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  try {
    const ledger = await collectLedgerTransactions({ uid, purpose: 'premium' });
    const legacy = await collectLegacySuccessfulTransactions({ uid, purpose: 'premium' });
    const merged = sortPaymentsByDateTime([...ledger, ...legacy]);
    const seen = new Set();
    const unique = merged.filter((p) => {
      const key = p.transactionId || p.id;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    return unique.slice(0, limit);
  } catch (error) {
    console.error('Failed to get successful payments', error);
    return [];
  }
}

/**
 * Get all successful premium payments (newest date/time first).
 */
export async function getAllSuccessfulPayments(limit = 100) {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  try {
    const ledger = await collectLedgerTransactions({ purpose: 'premium' });
    const legacy = await collectLegacySuccessfulTransactions({ purpose: 'premium' });
    const merged = sortPaymentsByDateTime([...ledger, ...legacy]);
    const seen = new Set();
    const unique = merged.filter((p) => {
      const key = p.transactionId || p.id;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    return unique.slice(0, limit);
  } catch (error) {
    console.error('Failed to get all successful payments', error);
    return [];
  }
}

/** @deprecated Legacy `payments` pending rows — new flows do not create these. */
export async function updatePaymentStatus() {
  return;
}

/** @deprecated Nothing stored in Firestore until success. */
export async function hasPendingPayment() {
  return null;
}

/** @deprecated Check {@link hasCompletedPremiumPayment} / ledger instead. */
export async function getPaymentStatus() {
  return null;
}

/**
 * Removes old pending rows from legacy `payments` collection (if any exist).
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

/**
 * Check if user has a completed premium payment in the success ledger.
 */
export async function hasCompletedPremiumPayment(uid) {
  if (!isFirebaseConfigured || !db) {
    return false;
  }

  try {
    const ledger = await collectLedgerTransactions({ uid, purpose: 'premium' });
    if (ledger.length > 0) {
      return true;
    }
    const legacy = await collectLegacySuccessfulTransactions({ uid, purpose: 'premium' });
    return legacy.length > 0;
  } catch (error) {
    console.error('Failed to check premium payment', error);
    return false;
  }
}

/**
 * Whether the user has a completed KYC fee in the success ledger (any date).
 */
export async function hasCompletedKycPayment(uid) {
  if (!isFirebaseConfigured || !db) {
    return false;
  }

  try {
    const ledger = await collectLedgerTransactions({ uid, purpose: 'kyc' });
    if (ledger.length > 0) {
      return true;
    }
    const legacy = await collectLegacySuccessfulTransactions({ uid, purpose: 'kyc' });
    return legacy.length > 0;
  } catch (error) {
    console.error('Failed to check KYC payment', error);
    return false;
  }
}

/**
 * KYC fee satisfied if profile flag is true or a completed `payment_success` row exists.
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

/** Save KYC identity details after fee payment (status set to pending for admin review). */
export async function saveUserKycDetails(identifier, details) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const ref = await getUserDocRefByIdentifier(identifier);
    await setDoc(
      ref,
      {
        kycFullName: details.fullName?.trim() || '',
        kycAadhaar: details.aadhaar?.replace(/\D/g, '') || '',
        kycPan: (details.pan || '').trim().toUpperCase(),
        kycDob: details.dob?.trim() || '',
        kycAddress: details.address?.trim() || '',
        kycDocuments: {
          aadhaar: details.aadhaarFileName || null,
          pan: details.panFileName || null,
          selfie: details.selfieFileName || null,
        },
        kycSubmittedAt: new Date().toISOString(),
        kycStatus: 'pending',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Failed to save KYC details', error);
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
 * Apply a wallet change atomically (Firestore source of truth).
 * @param {string} identifier phone or uid
 * @param {{ type: 'task_reward'|'streak_bonus'|'withdrawal', amount: number, meta?: object }} tx
 *   amount: positive for credits, positive for withdrawal (deducted internally)
 */
export async function applyWalletTransaction(identifier, { type, amount, meta = {} }) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  const delta = Number(amount);
  if (!Number.isFinite(delta) || delta === 0) {
    return null;
  }

  try {
    const ref = await getUserDocRefByIdentifier(identifier);

    const result = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      const data = snap.exists() ? snap.data() : {};
      const currentBalance = Number(data.walletBalance) || 0;
      const currentEarned = Number(data.totalEarned) || 0;
      const currentWithdrawn = Number(data.totalWithdrawn) || 0;

      let balanceDelta = delta;
      if (type === 'withdrawal') {
        balanceDelta = -Math.abs(delta);
      } else if (type === 'task_reward' || type === 'streak_bonus') {
        balanceDelta = Math.abs(delta);
      }

      const newBalance = Math.max(0, parseFloat((currentBalance + balanceDelta).toFixed(2)));
      let newEarned = currentEarned;
      let newWithdrawn = currentWithdrawn;

      if (type === 'task_reward' || type === 'streak_bonus') {
        newEarned = parseFloat((currentEarned + Math.abs(delta)).toFixed(2));
      } else if (type === 'withdrawal') {
        newWithdrawn = parseFloat((currentWithdrawn + Math.abs(delta)).toFixed(2));
      }

      const update = {
        walletBalance: newBalance,
        totalEarned: newEarned,
        totalWithdrawn: newWithdrawn,
        updatedAt: new Date().toISOString(),
      };

      transaction.set(ref, update, { merge: true });
      return update;
    });

    const ledgerRef = doc(collection(db, 'wallet_ledger', ref.id, 'transactions'));
    await setDoc(ledgerRef, {
      type,
      amount: type === 'withdrawal' ? -Math.abs(delta) : Math.abs(delta),
      balanceAfter: result.walletBalance,
      totalEarnedAfter: result.totalEarned,
      createdAt: new Date().toISOString(),
      ...meta,
    });

    return result;
  } catch (error) {
    console.error('Failed to apply wallet transaction', error);
    throw error;
  }
}

/** @deprecated Use {@link applyWalletTransaction} — direct balance overwrites are not allowed. */
export async function updateUserWalletBalance(identifier, walletBalance) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const ref = await getUserDocRefByIdentifier(identifier);
    await setDoc(
      ref,
      {
        walletBalance: Number(walletBalance) || 0,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Failed to update user wallet balance', error);
    return false;
  }
}

/** One-time backfill when `totalEarned` is missing on the user doc. */
export async function ensureUserWalletTotals(identifier, localEarnedFallback = 0) {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const ref = await getUserDocRefByIdentifier(identifier);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }

    const data = snap.data();
    const patch = {};
    if (data.totalEarned === undefined || data.totalEarned === null) {
      const earned = Math.max(Number(data.walletBalance) || 0, Number(localEarnedFallback) || 0);
      patch.totalEarned = parseFloat(earned.toFixed(2));
    }
    if (data.totalWithdrawn === undefined || data.totalWithdrawn === null) {
      patch.totalWithdrawn = 0;
    }
    if (Object.keys(patch).length === 0) {
      return data;
    }
    patch.updatedAt = new Date().toISOString();
    await setDoc(ref, patch, { merge: true });
    return { ...data, ...patch };
  } catch (error) {
    console.error('Failed to ensure user wallet totals', error);
    return null;
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
