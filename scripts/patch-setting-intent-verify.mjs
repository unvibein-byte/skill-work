import fs from 'fs';

const path = 'd:/website/skill-work/src/screens/tabs/SettingTab.jsx';
let s = fs.readFileSync(path, 'utf8');

const start = s.indexOf('    const details = await getIntentUpiDetails();');
const end = s.indexOf('  const handlePaymentQR = async () => {', start);
if (start === -1 || end === -1) {
  console.error('markers not found', { start, end });
  process.exit(1);
}

const newBlock = `    const details = await getIntentUpiDetails();
    const upiString = \`upi://pay?pa=\${encodeURIComponent(details.upiId)}&pn=\${encodeURIComponent(details.name)}&am=\${pricing.amount.toFixed(2)}&cu=\${encodeURIComponent(pricing.currency)}&tn=\${encodeURIComponent(pricing.description)}\`;

    if (intentVerifyCleanupRef.current) {
      intentVerifyCleanupRef.current();
      intentVerifyCleanupRef.current = null;
    }

    const opened = window.open(upiString, '_blank');
    if (!opened) {
      window.location.href = upiString;
    }

    setSheet(null);
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

    // UPI intent has no server callback; QR flow marks \`payments\` via payment.itechvertical.in.
    // When the user comes back from the UPI app (tab hidden → visible), finalize in Firestore and upgrade.
    const tryComplete = async () => {
      if (cancelled || verificationDone) return;
      if (!userLeftForPayment) return;

      try {
        const existing = await getPaymentStatus(payment.id);
        if (existing?.status === 'completed' && (await hasCompletedPremiumPayment(userId))) {
          verificationDone = true;
          await handleUpgrade();
          setCurrentPayment({ ...payment, status: 'completed' });
          cleanup();
          return;
        }

        verificationDone = true;
        await createSuccessfulPayment(userId, pricing.amount, 'intent', payment.id);
        await updatePaymentStatus(payment.id, 'completed');

        const hasPayment = await hasCompletedPremiumPayment(userId);
        if (hasPayment) {
          await handleUpgrade();
          setCurrentPayment({ ...payment, status: 'completed' });
          cleanup();
        } else {
          verificationDone = false;
        }
      } catch (error) {
        verificationDone = false;
        console.error('Intent payment verification', error);
        showToast('Could not confirm payment. Try again.');
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
`;

s = s.slice(0, start) + newBlock + s.slice(end);

const hStart = s.indexOf('  const handlePaymentCompleted = async () => {');
const hEnd = s.indexOf('  const totalEarned = (() => {', hStart);
if (hStart === -1 || hEnd === -1) {
  console.error('handlePaymentCompleted markers not found', { hStart, hEnd });
  process.exit(1);
}
s = s.slice(0, hStart) + s.slice(hEnd);

const verifyStart = s.indexOf('      {/* Verify Payment Sheet - Auto-verifies when user returns */}');
if (verifyStart === -1) {
  console.error('verify sheet start not found');
  process.exit(1);
}
const vEndMarker = s.indexOf('\n        </Sheet>\n      )}\n', verifyStart);
if (vEndMarker === -1) {
  console.error('verify sheet end not found');
  process.exit(1);
}
const endAfterVerify = vEndMarker + '\n        </Sheet>\n      )}\n'.length;
s = s.slice(0, verifyStart) + s.slice(endAfterVerify);

fs.writeFileSync(path, s);
console.log('SettingTab.jsx patched: intent flow, removed manual verify + sheet');
