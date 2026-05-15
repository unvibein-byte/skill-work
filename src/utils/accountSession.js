import { preserveDeviceLocalKeys, restoreDeviceLocalKeys } from './deviceId';

const SESSION_KEYS = [
  'sw_name',
  'sw_phone',
  'sw_userId',
  'sw_onboarding_complete',
  'sw_pro',
  'sw_balance',
  'sw_completed',
  'sw_withdrawals',
  'sw_team',
  'sw_upi',
  'sw_bank',
  'sw_acc',
  'sw_ifsc',
  'sw_streak_claim_date',
  'sw_seen_ach',
  'sw_premium_enabled',
  'sw_block_message',
];

/** Clears signed-in session; keeps device binding keys. */
export function clearUserSession() {
  const deviceKeys = preserveDeviceLocalKeys();
  SESSION_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  });
  restoreDeviceLocalKeys(deviceKeys);
}

export function setStoredBlockMessage(message) {
  try {
    if (message) {
      localStorage.setItem('sw_block_message', message);
    } else {
      localStorage.removeItem('sw_block_message');
    }
  } catch {
    /* ignore */
  }
}

export function getStoredBlockMessage() {
  try {
    return localStorage.getItem('sw_block_message') || '';
  } catch {
    return '';
  }
}
