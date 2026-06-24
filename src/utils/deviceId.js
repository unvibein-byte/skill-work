const DEVICE_ID_KEY = 'sw_device_id';
const DEVICE_PHONE_KEY = 'sw_device_phone';

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/** Stable per-install device identifier (survives logout). */
export function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = createId();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return createId();
  }
}

export function normalizePhone(phone) {
  return String(phone ?? '').replace(/\D/g, '');
}

export function getBoundDevicePhone() {
  try {
    return localStorage.getItem(DEVICE_PHONE_KEY) || '';
  } catch {
    return '';
  }
}

export function setBoundDevicePhone(normalizedPhone) {
  try {
    if (normalizedPhone) {
      localStorage.setItem(DEVICE_PHONE_KEY, normalizedPhone);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

/** Keys that must stay after logout / account delete so one device = one account. */
export function preserveDeviceLocalKeys() {
  const deviceId = localStorage.getItem(DEVICE_ID_KEY);
  const devicePhone = localStorage.getItem(DEVICE_PHONE_KEY);
  return { deviceId, devicePhone };
}

export function restoreDeviceLocalKeys({ deviceId, devicePhone }) {
  try {
    if (deviceId) localStorage.setItem(DEVICE_ID_KEY, deviceId);
    if (devicePhone) localStorage.setItem(DEVICE_PHONE_KEY, devicePhone);
  } catch {
    /* ignore */
  }
}

export function isDevicePhoneConflict(attemptPhone) {
  const bound = getBoundDevicePhone();
  if (!bound) return false;
  return bound !== normalizePhone(attemptPhone);
}
