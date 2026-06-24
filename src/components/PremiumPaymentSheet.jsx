import { useState, useEffect, useRef } from 'react';
import {
  getIntentUpiDetails,
  getProPricing,
  getPaymentMethods,
  preparePaymentOrder,
  recordSuccessfulPayment,
  isQrPaymentVerifiedMessage,
  hasCompletedPremiumPayment,
  DEFAULT_PRO_PRICING,
  DEFAULT_PAYMENT_METHODS,
} from '../firebase';
import PaymentWebView from './PaymentWebView';
import { buildPaymentUrl, openQrPaymentPage, PAYMENT_ORIGIN } from '../utils/paymentPage';

const Sheet = ({ title, children, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ paddingBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{title}</h3>
        <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: '#f0f2f8', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, color: 'var(--text-secondary)' }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const showToast = (msg) => {
  if (import.meta.env.DEV) console.debug('[toast]', msg);
};

const PremiumPaymentSheet = ({
  open,
  onClose,
  onUpgrade,
  onAfterUpgrade,
  proPriceAmount = DEFAULT_PRO_PRICING.amount,
}) => {
  const [phase, setPhase] = useState('select');
  const [proPricing, setProPricing] = useState(() => ({ ...DEFAULT_PRO_PRICING, amount: proPriceAmount }));
  const [paymentMethods, setPaymentMethods] = useState(() => ({ ...DEFAULT_PAYMENT_METHODS }));
  const [currentPayment, setCurrentPayment] = useState(null);
  const [inAppPaymentWebView, setInAppPaymentWebView] = useState(null);
  const intentVerifyCleanupRef = useRef(null);

  const closeInAppPaymentWebView = () => setInAppPaymentWebView(null);

  const launchQrPaymentPage = (userId, amount, orderId, title) => {
    const url = buildPaymentUrl(userId, amount, orderId);
    const result = openQrPaymentPage(url);
    if (result.mode === 'inApp') {
      setInAppPaymentWebView({ url, title, subtitle: 'Scan QR · pay · upload screenshot' });
      return true;
    }
    return Boolean(result.window);
  };

  useEffect(() => () => {
    intentVerifyCleanupRef.current?.();
  }, []);

  useEffect(() => {
    if (!open) {
      setPhase('select');
      return;
    }
    let cancelled = false;
    Promise.all([getProPricing(), getPaymentMethods()]).then(([p, methods]) => {
      if (!cancelled) {
        setProPricing(p);
        setPaymentMethods(methods);
      }
    });
    return () => { cancelled = true; };
  }, [open]);

  const completeUpgrade = async () => {
    await onUpgrade?.();
    onAfterUpgrade?.();
  };

  const handlePaymentIntent = async () => {
    if (!paymentMethods.upiIntentEnabled) {
      showToast('⚠️ UPI payment is disabled right now');
      return;
    }

    const userId = localStorage.getItem('sw_userId');
    if (!userId) {
      showToast('❌ User not logged in');
      return;
    }

    const pricing = await getProPricing();
    setProPricing(pricing);

    const hasCompleted = await hasCompletedPremiumPayment(userId);
    if (hasCompleted) {
      showToast('✅ You already have premium access!');
      await completeUpgrade();
      onClose?.();
      return;
    }

    const payment = await preparePaymentOrder(userId, pricing.amount, 'intent', 'premium');
    setCurrentPayment(payment);

    const details = await getIntentUpiDetails();
    const upiString = `upi://pay?pa=${encodeURIComponent(details.upiId)}&pn=${encodeURIComponent(details.name)}&am=${pricing.amount.toFixed(2)}&cu=${encodeURIComponent(pricing.currency)}&tn=${encodeURIComponent(pricing.description)}`;

    if (intentVerifyCleanupRef.current) {
      intentVerifyCleanupRef.current();
      intentVerifyCleanupRef.current = null;
    }

    const opened = window.open(upiString, '_blank');
    if (!opened) {
      window.location.href = upiString;
    }

    onClose?.();
    showToast('Pay in your UPI app. When you return here after paying, Pro will activate.');

    let cancelled = false;
    let verificationDone = false;
    let expireTimer;
    let userLeftForPayment = false;

    const cleanup = () => {
      if (cancelled) return;
      cancelled = true;
      if (expireTimer) clearTimeout(expireTimer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      intentVerifyCleanupRef.current = null;
    };

    const tryComplete = async () => {
      if (cancelled || verificationDone) return;
      if (!userLeftForPayment) return;

      try {
        if (await hasCompletedPremiumPayment(userId)) {
          verificationDone = true;
          await completeUpgrade();
          cleanup();
          return;
        }

        verificationDone = true;
        await recordSuccessfulPayment(userId, pricing.amount, 'intent', 'premium', payment.id);

        const hasPayment = await hasCompletedPremiumPayment(userId);
        if (hasPayment) {
          await completeUpgrade();
          setCurrentPayment({ ...payment, status: 'completed' });
          cleanup();
        } else {
          verificationDone = false;
        }
      } catch (error) {
        verificationDone = false;
        console.error('Intent payment verification', error);
        showToast('❌ Could not confirm payment. Try again.');
      }
    };

    const onFocus = () => {
      setTimeout(tryComplete, 1200);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        userLeftForPayment = true;
      } else if (document.visibilityState === 'visible') {
        setTimeout(tryComplete, 1200);
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    expireTimer = setTimeout(cleanup, 15 * 60 * 1000);
    intentVerifyCleanupRef.current = cleanup;
  };

  const handlePaymentQR = async () => {
    if (!paymentMethods.qrEnabled) {
      showToast('⚠️ QR payment is disabled right now');
      return;
    }

    const userId = localStorage.getItem('sw_userId');
    if (!userId) {
      showToast('❌ User not logged in');
      return;
    }

    const pricing = await getProPricing();
    setProPricing(pricing);

    const hasCompleted = await hasCompletedPremiumPayment(userId);
    if (hasCompleted) {
      showToast('✅ You already have premium access!');
      await completeUpgrade();
      onClose?.();
      return;
    }

    const payment = await preparePaymentOrder(userId, pricing.amount, 'qr', 'premium');
    setCurrentPayment(payment);

    if (!launchQrPaymentPage(userId, pricing.amount, payment.id, 'Pro payment')) {
      showToast('⚠️ Could not open payment page');
      return;
    }

    setPhase('qrPayment');

    const finalizePremiumQrSuccess = async () => {
      await recordSuccessfulPayment(userId, pricing.amount, 'qr', 'premium', payment.id);

      const hasPayment = await hasCompletedPremiumPayment(userId);
      if (!hasPayment) {
        return false;
      }

      closeInAppPaymentWebView();
      await completeUpgrade();
      onClose?.();
      showToast('✅ Payment verified! Upgraded to Pro!');
      return true;
    };

    const autoVerifyPayment = async () => {
      try {
        if (!(await hasCompletedPremiumPayment(userId))) {
          return false;
        }
        clearInterval(pollInterval);
        window.removeEventListener('message', handleMessage);
        return finalizePremiumQrSuccess();
      } catch (error) {
        console.error('Error auto-verifying payment', error);
        return false;
      }
    };

    const handleMessage = async (event) => {
      if (event.origin !== PAYMENT_ORIGIN) {
        return;
      }

      try {
        let data = event.data;
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }

        if (isQrPaymentVerifiedMessage(data)) {
          clearInterval(pollInterval);
          window.removeEventListener('message', handleMessage);
          closeInAppPaymentWebView();
          await finalizePremiumQrSuccess();
        } else if (data.type === 'verification_complete' && data.success === false) {
          clearInterval(pollInterval);
          window.removeEventListener('message', handleMessage);
          closeInAppPaymentWebView();
          showToast(`❌ Payment verification failed: ${data.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error handling payment message', error);
      }
    };

    window.addEventListener('message', handleMessage);

    const pollInterval = setInterval(async () => {
      const verified = await autoVerifyPayment();
      if (verified) {
        closeInAppPaymentWebView();
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(pollInterval);
      window.removeEventListener('message', handleMessage);
    }, 15 * 60 * 1000);

    showToast('📱 Complete payment in the app. We will verify automatically after upload.');
  };

  if (!open && !inAppPaymentWebView) return null;

  return (
    <>
      {open && phase === 'select' && (
        <Sheet title="💳 Upgrade to Pro" onClose={onClose}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👑</div>
            <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, fontFamily: 'var(--font-display)' }}>Lifetime Pro Access</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
              Get unlimited tasks, priority support, and premium features for just ₹{proPricing.amount}.
            </p>
            <div style={{ display: 'grid', gap: 12 }}>
              {paymentMethods.upiIntentEnabled && (
                <button
                  onClick={handlePaymentIntent}
                  style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'var(--green-light)', border: '1.5px solid var(--green-border)', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, color: 'var(--green)', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  📱 Pay ₹{proPricing.amount} (UPI Intent)
                </button>
              )}
              {paymentMethods.qrEnabled && (
                <button
                  onClick={handlePaymentQR}
                  style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'rgba(127,86,217,0.1)', border: '1.5px solid rgba(127,86,217,0.3)', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, color: '#7F56D9', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  📷 Pay via QR Code
                </button>
              )}
              {!paymentMethods.upiIntentEnabled && !paymentMethods.qrEnabled && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  No payment methods are enabled. Turn on <strong>upiIntentEnabled</strong> or <strong>qrEnabled</strong> in Firebase → <strong>config/payment_methods</strong>.
                </p>
              )}
            </div>
          </div>
        </Sheet>
      )}

      {open && phase === 'qrPayment' && currentPayment && (
        <Sheet title="📷 Payment Verification" onClose={onClose}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💳</div>
            <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, fontFamily: 'var(--font-display)' }}>Payment Open In App</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
              Complete your payment in the in-app page and upload the screenshot for verification.
              <br /><br />
              <strong>Amount:</strong> ₹{proPricing.amount}<br />
              <strong>Payment ID:</strong> {currentPayment.id.substring(0, 12)}...
            </p>
            <div style={{ background: 'rgba(127,86,217,0.1)', border: '1px solid rgba(127,86,217,0.3)', borderRadius: 12, padding: '12px', marginBottom: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>📋 Instructions:</div>
              <div style={{ textAlign: 'left', lineHeight: 1.6 }}>
                1. Scan the QR code on the payment page<br />
                2. Complete payment in your UPI app<br />
                3. Take a screenshot of payment confirmation<br />
                4. Upload screenshot on the payment page<br />
                5. Wait for automatic verification
              </div>
            </div>
            <button
              onClick={() => {
                const userId = localStorage.getItem('sw_userId');
                if (launchQrPaymentPage(userId, proPricing.amount, currentPayment.id, 'Pro payment')) {
                  showToast('📱 Payment opened in app');
                } else {
                  showToast('⚠️ Could not open payment page');
                }
              }}
              className="btn-purple"
              style={{ width: '100%', borderRadius: 12, marginBottom: 10 }}
            >
              🔄 Open Payment In App
            </button>
            <button
              onClick={onClose}
              style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'transparent', border: '1px solid var(--border-color)', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Close (Payment will verify automatically)
            </button>
          </div>
        </Sheet>
      )}

      {inAppPaymentWebView && (
        <PaymentWebView
          url={inAppPaymentWebView.url}
          title={inAppPaymentWebView.title}
          subtitle={inAppPaymentWebView.subtitle}
          onClose={closeInAppPaymentWebView}
        />
      )}
    </>
  );
};

export default PremiumPaymentSheet;
