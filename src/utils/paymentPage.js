import { Capacitor } from '@capacitor/core';

export const PAYMENT_ORIGIN = 'https://payment.itechvertical.in';

/** True when running inside the Capacitor Android/iOS shell (not desktop browser). */
export function shouldUseInAppPaymentWebView() {
  return Capacitor.isNativePlatform();
}

export function buildPaymentUrl(userId, amount, orderId) {
  const params = new URLSearchParams({
    userId: String(userId),
    amount: String(amount),
    orderId: String(orderId),
    embed: '1',
  });
  return `${PAYMENT_ORIGIN}/?${params.toString()}`;
}

/**
 * Opens QR payment: in-app WebView on native, popup on web (falls back to in-app if blocked).
 * @returns {{ mode: 'inApp' | 'external', url: string, window?: Window }}
 */
export function openQrPaymentPage(url) {
  if (shouldUseInAppPaymentWebView()) {
    return { mode: 'inApp', url };
  }

  const popup = window.open(url, '_blank', 'width=600,height=800');
  if (!popup) {
    return { mode: 'inApp', url };
  }

  return { mode: 'external', url, window: popup };
}
