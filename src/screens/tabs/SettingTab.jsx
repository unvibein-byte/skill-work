import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../i18n/LangContext';
import { signOut } from 'firebase/auth';
import { auth, getIntentUpiDetails, getProPricing, getKycRequirements, getPaymentMethods, getSupportConfig, preparePaymentOrder, recordSuccessfulPayment, isQrPaymentVerifiedMessage, completeFakeKycPayment, getUserProfile, updateUserProfile, updateUserKycFeePaid, saveUserKycDetails, hasCompletedPremiumPayment, hasCompletedKycPayment, isUserKycFeePaid, isFirebaseConfigured, DEFAULT_PRO_PRICING, DEFAULT_KYC_REQUIREMENTS, DEFAULT_PAYMENT_METHODS } from '../../firebase';
import {
  preserveDeviceLocalKeys,
  restoreDeviceLocalKeys,
  getBoundDevicePhone,
  normalizePhone,
} from '../../utils/deviceId';
import { DEVICE_ALREADY_REGISTERED_MESSAGE } from '../../firebase';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import PaymentWebView from '../../components/PaymentWebView';
import { buildPaymentUrl, openQrPaymentPage, PAYMENT_ORIGIN } from '../../utils/paymentPage';
import { buildSupportChatUrl } from '../../utils/supportChat';

/* ─── Toggle Switch ──────────────────────────────────────────────────────── */
const Toggle = ({ value, onChange }) => (
  <div onClick={() => onChange(!value)} style={{ width:44, height:24, borderRadius:100, background: value ? 'var(--green)' : '#d1d5db', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}>
    <div style={{ position:'absolute', top:3, left: value ? 'calc(100% - 21px)' : 3, width:18, height:18, borderRadius:'50%', background:'white', transition:'left 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }} />
  </div>
);

/* ─── Section Header ─────────────────────────────────────────────────────── */
const Section = ({ label }) => (
  <div style={{ padding:'12px 16px', background:'#fafafa', borderBottom:'1px solid var(--border-color)' }}>
    <span style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.7px' }}>{label}</span>
  </div>
);

/* ─── Menu Item ──────────────────────────────────────────────────────────── */
const MenuItem = ({ icon, label, sub, rightEl, danger = false, onClick, accent }) => (
  <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 16px', borderBottom:'1px solid var(--border-color)', cursor:'pointer', transition:'background 0.15s' }}
    onMouseOver={e => e.currentTarget.style.background = '#f9fafb'}
    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
    <div style={{ width:36, height:36, borderRadius:11, background: danger ? 'rgba(239,68,68,0.1)' : (accent ? `${accent}18` : 'var(--green-light)'), display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
      {icon}
    </div>
    <div style={{ flex:1 }}>
      <div style={{ fontSize:14, fontWeight:600, color: danger ? 'var(--red)' : 'var(--text-primary)' }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{sub}</div>}
    </div>
    {rightEl || (!rightEl && <span style={{ fontSize:16, color:'var(--text-muted)' }}>›</span>)}
  </div>
);

/* ─── Bottom Sheet Modal ─────────────────────────────────────────────────── */
const Sheet = ({ title, children, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ paddingBottom:36 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <h3 style={{ fontSize:18, fontWeight:800, fontFamily:'var(--font-display)' }}>{title}</h3>
        <button onClick={onClose} style={{ width:30, height:30, borderRadius:'50%', background:'#f0f2f8', border:'none', cursor:'pointer', fontSize:14, fontWeight:800, color:'var(--text-secondary)' }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

/* ─── Input Field ────────────────────────────────────────────────────────── */
const Field = ({ label, placeholder, value, onChange, type='text', readOnly=false }) => (
  <div style={{ marginBottom:16 }}>
    <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--text-secondary)', marginBottom:6 }}>{label}</label>
    <input type={type} placeholder={placeholder} value={value} readOnly={readOnly} onChange={e => onChange(e.target.value)}
      style={{ width:'100%', background:'#f0f2f8', border:'1.5px solid var(--border-color)', color:'var(--text-primary)', padding:'12px 14px', borderRadius:12, fontFamily:'var(--font-sans)', fontSize:14, outline:'none', transition:'all 0.2s', opacity: readOnly ? 0.75 : 1 }}
      onFocus={e => { e.target.style.border='1.5px solid var(--green)'; e.target.style.background='white'; e.target.style.boxShadow='0 0 0 3px rgba(0,195,126,0.1)'; }}
      onBlur={e  => { e.target.style.border='1.5px solid var(--border-color)'; e.target.style.background='#f0f2f8'; e.target.style.boxShadow='none'; }}
    />
  </div>
);

const SHOW_FAKE_KYC =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_FAKE_KYC === 'true';

/* ══════════════════════════════════════════════════════════════════════════ */
const SettingTab = ({ userName, isPro, onUpgrade, onDowngrade }) => {
  const navigate = useNavigate();
  const { t, isDark, toggleDark } = useLang();

  // ── preferences (persisted) ──
  const [notif,     setNotif]     = useState(() => localStorage.getItem('sw_notif')   !== 'false');
  const [darkHint,  setDarkHint]  = useState(isDark); // synced from context
  const [soundOn,   setSoundOn]   = useState(() => localStorage.getItem('sw_sound')   !== 'false');
  const [language,  setLanguage]  = useState(() => localStorage.getItem('sw_lang')    || 'English');

  // ── sheets ──
  const [sheet, setSheet] = useState(null); // 'profile'|'bank'|'password'|'kyc'|'support'|'terms'|'language'|'deleteConfirm'|'logoutConfirm'|'payment'

  // ── form state ──
  const [name,        setName]        = useState(userName);
  const [phone,       setPhone]       = useState(localStorage.getItem('sw_phone') || '');
  const [upi,         setUpi]         = useState(localStorage.getItem('sw_upi')   || '');
  const [bankName,    setBankName]    = useState(localStorage.getItem('sw_bank')   || '');
  const [accNo,       setAccNo]       = useState(localStorage.getItem('sw_acc')    || '');
  const [ifsc,        setIfsc]        = useState(localStorage.getItem('sw_ifsc')   || '');
  const [oldPass,     setOldPass]     = useState('');
  const [newPass,     setNewPass]     = useState('');

  // ── user detail state ──
  const [walletBalance, setWalletBalance] = useState(() => Number(localStorage.getItem('sw_balance') || 0));
  const [premiumEnabled, setPremiumEnabled] = useState(() => {
    const v = localStorage.getItem('sw_premium_enabled');
    return v === null ? true : v === 'true';
  });

  // ── payment state ──
  const [paymentMethod, setPaymentMethod] = useState('intent'); // 'intent' or 'qr'
  const [proPricing, setProPricing] = useState(() => ({ ...DEFAULT_PRO_PRICING }));
  const [kycRequirements, setKycRequirements] = useState(() => ({ ...DEFAULT_KYC_REQUIREMENTS }));
  const [paymentMethods, setPaymentMethods] = useState(() => ({ ...DEFAULT_PAYMENT_METHODS }));
  const [kycFeePaid, setKycFeePaid] = useState(false);
  const [kycFullName, setKycFullName] = useState('');
  const [kycAadhaar, setKycAadhaar] = useState('');
  const [kycPan, setKycPan] = useState('');
  const [kycDob, setKycDob] = useState('');
  const [kycAddress, setKycAddress] = useState('');
  const [kycSubmitted, setKycSubmitted] = useState(false);
  const [kycApproved, setKycApproved] = useState(false);
  const [kycAadhaarFile, setKycAadhaarFile] = useState(null);
  const [kycPanFile, setKycPanFile] = useState(null);
  const [kycSelfieFile, setKycSelfieFile] = useState(null);
  const [kycSaving, setKycSaving] = useState(false);
  const [currentPayment, setCurrentPayment] = useState(null); // { id, status, ... }
  const [currentKycPayment, setCurrentKycPayment] = useState(null);
  const [inAppPaymentWebView, setInAppPaymentWebView] = useState(null);
  const intentVerifyCleanupRef = useRef(null);
  const kycIntentVerifyCleanupRef = useRef(null);
  const kycAadhaarInputRef = useRef(null);
  const kycPanInputRef = useRef(null);
  const kycSelfieInputRef = useRef(null);

  const closeInAppPaymentWebView = () => setInAppPaymentWebView(null);

  const applyKycFromProfile = (profile) => {
    if (!profile) return;
    if (profile.kycFullName) setKycFullName(profile.kycFullName);
    if (profile.kycAadhaar) setKycAadhaar(profile.kycAadhaar);
    if (profile.kycPan) setKycPan(profile.kycPan);
    if (profile.kycDob) setKycDob(profile.kycDob);
    if (profile.kycAddress) setKycAddress(profile.kycAddress);
    if (profile.kycSubmittedAt) setKycSubmitted(true);
    if (String(profile.kycStatus || '').toLowerCase() === 'approved') {
      setKycApproved(true);
      setKycSubmitted(true);
    } else if (String(profile.kycStatus || '').toLowerCase() === 'pending') {
      setKycSubmitted(true);
    }
  };

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
    kycIntentVerifyCleanupRef.current?.();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const [pricing, kycReq, methods] = await Promise.all([
        getProPricing(),
        getKycRequirements(),
        getPaymentMethods(),
      ]);
      setProPricing(pricing);
      setKycRequirements(kycReq);
      setPaymentMethods(methods);

      const userId = localStorage.getItem('sw_userId');
      const userPhone = localStorage.getItem('sw_phone');

      if (userId) {
        const paid = await isUserKycFeePaid(userId);
        setKycFeePaid(paid);
      }
      
      // Try to get profile by phone number first, fallback to userId
      if (userPhone) {
        const profile = await getUserProfile(userPhone);
        if (profile) {
          if (typeof profile.walletBalance === 'number') setWalletBalance(profile.walletBalance);
          if (typeof profile.premiumEnabled === 'boolean') setPremiumEnabled(profile.premiumEnabled);
          if (profile.kycFeePaid === true) setKycFeePaid(true);
          applyKycFromProfile(profile);
        }
      } else if (userId) {
        // Fallback to userId for backward compatibility
        const profile = await getUserProfile(userId);
        if (profile) {
          if (typeof profile.walletBalance === 'number') setWalletBalance(profile.walletBalance);
          if (typeof profile.premiumEnabled === 'boolean') setPremiumEnabled(profile.premiumEnabled);
          if (profile.kycFeePaid === true) setKycFeePaid(true);
          applyKycFromProfile(profile);
        }
      }

      // Check if we should open payment sheet automatically
      const shouldOpenPayment = localStorage.getItem('sw_open_payment');
      if (shouldOpenPayment === 'true') {
        localStorage.removeItem('sw_open_payment');
        setSheet('payment');
      }
      const shouldOpenKyc = localStorage.getItem('sw_open_kyc_payment');
      if (shouldOpenKyc === 'true') {
        localStorage.removeItem('sw_open_kyc_payment');
        setSheet('kyc');
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (sheet !== 'payment') return;
    let cancelled = false;
    Promise.all([getProPricing(), getPaymentMethods()]).then(([p, methods]) => {
      if (!cancelled) {
        setProPricing(p);
        setPaymentMethods(methods);
      }
    });
    return () => { cancelled = true; };
  }, [sheet]);

  useEffect(() => {
    if (sheet !== 'kyc') return;
    let cancelled = false;
    Promise.all([getKycRequirements(), getPaymentMethods()]).then(([k, methods]) => {
      if (!cancelled) {
        setKycRequirements(k);
        setPaymentMethods(methods);
      }
    });
    const uid = localStorage.getItem('sw_userId');
    const userPhone = localStorage.getItem('sw_phone');
    if (uid) {
      isUserKycFeePaid(uid).then((paid) => {
        if (!cancelled) setKycFeePaid(paid);
      });
    }
    const id = userPhone || uid;
    if (id) {
      getUserProfile(id).then((profile) => {
        if (!cancelled) applyKycFromProfile(profile);
      });
    }
    return () => { cancelled = true; };
  }, [sheet]);

  const showToast = (msg) => {
    if (import.meta.env.DEV) console.debug('[toast]', msg);
  };

  const handleContactSupport = async () => {
    const config = await getSupportConfig();
    if (!config.supportUrl?.startsWith('http')) {
      showToast('⚠️ Support URL not configured in Firebase');
      return;
    }
    if (/t\.me|telegram\.org/i.test(config.supportUrl)) {
      showToast('⚠️ Update config/support.supportUrl to your chat site (not Telegram)');
      return;
    }
    const userPhone = localStorage.getItem('sw_phone') || phone;
    const displayName = localStorage.getItem('sw_name') || name || userName;
    const chatUrl = buildSupportChatUrl(config.supportUrl, userPhone, displayName);
    setInAppPaymentWebView({
      url: chatUrl,
      title: config.pageTitle,
      subtitle: 'Chat with support',
    });
  };

  const toggle = (key, val, setter) => { setter(val); localStorage.setItem(key, String(val)); };

  const setWallet = async (value) => {
    const parsed = Number(value) || 0;
    setWalletBalance(parsed);
    localStorage.setItem('sw_balance', String(parsed));
    const userPhone = localStorage.getItem('sw_phone') || phone;
    const userId = localStorage.getItem('sw_userId');
    
    // Update by phone number (primary), fallback to userId
    if (userPhone) {
      await updateUserProfile(userPhone, { walletBalance: parsed });
    } else if (userId) {
      await updateUserProfile(userId, { walletBalance: parsed });
    }
  };

  const setPremiumEnabledState = async (value) => {
    setPremiumEnabled(value);
    localStorage.setItem('sw_premium_enabled', String(value));
    const userPhone = localStorage.getItem('sw_phone') || phone;
    const userId = localStorage.getItem('sw_userId');
    
    // Update by phone number (primary), fallback to userId
    if (userPhone) {
      await updateUserProfile(userPhone, { premiumEnabled: value });
    } else if (userId) {
      await updateUserProfile(userId, { premiumEnabled: value });
    }
  };

  const saveProfile = async () => {
    const normalizedPhone = normalizePhone(phone);
    const boundPhone = getBoundDevicePhone();
    if (boundPhone && boundPhone !== normalizedPhone) {
      showToast(DEVICE_ALREADY_REGISTERED_MESSAGE);
      setPhone(boundPhone);
      return;
    }

    localStorage.setItem('sw_name', name);
    localStorage.setItem('sw_phone', normalizedPhone || phone);

    const userPhone = localStorage.getItem('sw_phone') || phone;
    const userId = localStorage.getItem('sw_userId');
    
    // Update by phone number (primary), fallback to userId
    if (userPhone) {
      await updateUserProfile(userPhone, { name, phone: userPhone });
    } else if (userId) {
      await updateUserProfile(userId, { name, phone });
    }

    showToast('✅ Profile updated!');
    setSheet(null);
  };

  const saveBank = async () => {
    if (!upi && !accNo) { showToast('⚠️ Enter UPI or bank details'); return; }
    localStorage.setItem('sw_upi',  upi);
    localStorage.setItem('sw_bank', bankName);
    localStorage.setItem('sw_acc',  accNo);
    localStorage.setItem('sw_ifsc', ifsc);

    const userPhone = localStorage.getItem('sw_phone') || phone;
    const userId = localStorage.getItem('sw_userId');
    
    // Update by phone number (primary), fallback to userId
    if (userPhone) {
      await updateUserProfile(userPhone, { upi, bankName, accNo, ifsc });
    } else if (userId) {
      await updateUserProfile(userId, { upi, bankName, accNo, ifsc });
    }

    showToast('✅ Payment details saved!');
    setSheet(null);
  };

  const changePassword = () => {
    if (newPass.length < 6) { showToast('⚠️ Password must be 6+ characters'); return; }
    showToast('✅ Password updated!');
    setOldPass(''); setNewPass('');
    setSheet(null);
  };

  const handleLogout = async () => {
    const { deviceId, devicePhone } = preserveDeviceLocalKeys();
    localStorage.removeItem('sw_name');
    localStorage.removeItem('sw_phone');
    localStorage.removeItem('sw_userId');
    localStorage.removeItem('sw_onboarding_complete');
    restoreDeviceLocalKeys({ deviceId, devicePhone });
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch {
        /* ignore */
      }
    }
    navigate('/login');
  };

  const handleDeleteAccount = () => {
    const { deviceId, devicePhone } = preserveDeviceLocalKeys();
    localStorage.clear();
    restoreDeviceLocalKeys({ deviceId, devicePhone });
    navigate('/login');
  };

  const handleUpgrade = async () => {
    const userId = localStorage.getItem('sw_userId');
    if (!userId) {
      showToast('❌ User not logged in');
      return;
    }

    // Verify payment before upgrading
    const hasPayment = await hasCompletedPremiumPayment(userId);
    if (!hasPayment) {
      showToast('❌ Payment verification required. Please complete payment first.');
      return;
    }

    // Only upgrade if payment is verified
    onUpgrade();
    showToast('✅ Upgraded to Pro!');
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

    // Check if user already has completed payment
    const hasCompleted = await hasCompletedPremiumPayment(userId);
    if (hasCompleted) {
      showToast('✅ You already have premium access!');
      await handleUpgrade();
      return;
    }

    const payment = await preparePaymentOrder(userId, pricing.amount, 'intent', 'premium');
    setCurrentPayment(payment);
    setPaymentMethod('intent');

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

    // Intent: write to Firestore only after user returns from UPI (success callback).
    const tryComplete = async () => {
      if (cancelled || verificationDone) return;
      if (!userLeftForPayment) return;

      try {
        if (await hasCompletedPremiumPayment(userId)) {
          verificationDone = true;
          await handleUpgrade();
          cleanup();
          return;
        }

        verificationDone = true;
        await recordSuccessfulPayment(userId, pricing.amount, 'intent', 'premium', payment.id);

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

    // Check if user already has completed payment
    const hasCompleted = await hasCompletedPremiumPayment(userId);
    if (hasCompleted) {
      showToast('✅ You already have premium access!');
      await handleUpgrade();
      return;
    }

    const payment = await preparePaymentOrder(userId, pricing.amount, 'qr', 'premium');
    setCurrentPayment(payment);
    setPaymentMethod('qr');

    if (!launchQrPaymentPage(userId, pricing.amount, payment.id, 'Pro payment')) {
      showToast('⚠️ Could not open payment page');
      return;
    }

    setSheet('qrPayment');

    const finalizePremiumQrSuccess = async () => {
      await recordSuccessfulPayment(userId, pricing.amount, 'qr', 'premium', payment.id);

      const hasPayment = await hasCompletedPremiumPayment(userId);
      if (!hasPayment) {
        return false;
      }

      closeInAppPaymentWebView();
      await handleUpgrade();
      setSheet(null);
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

  const handleKycPaymentIntent = async () => {
    if (!paymentMethods.upiIntentEnabled) {
      showToast('⚠️ UPI payment is disabled right now');
      return;
    }

    const userId = localStorage.getItem('sw_userId');
    if (!userId) {
      showToast('❌ User not logged in');
      return;
    }

    const pricing = await getKycRequirements();
    setKycRequirements(pricing);

    const paid = await isUserKycFeePaid(userId);
    if (paid) {
      showToast('✅ KYC fee already paid!');
      setKycFeePaid(true);
      return;
    }

    const payment = await preparePaymentOrder(userId, pricing.feeAmount, 'intent', 'kyc');
    setCurrentKycPayment(payment);
    setPaymentMethod('intent');

    const details = await getIntentUpiDetails();
    const upiString = `upi://pay?pa=${encodeURIComponent(details.upiId)}&pn=${encodeURIComponent(details.name)}&am=${pricing.feeAmount.toFixed(2)}&cu=${encodeURIComponent(pricing.currency)}&tn=${encodeURIComponent(pricing.description)}`;

    if (kycIntentVerifyCleanupRef.current) {
      kycIntentVerifyCleanupRef.current();
      kycIntentVerifyCleanupRef.current = null;
    }

    const opened = window.open(upiString, '_blank');
    if (!opened) {
      window.location.href = upiString;
    }

    setSheet(null);
    showToast('Pay KYC fee in your UPI app. When you return, we will confirm payment.');

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
      kycIntentVerifyCleanupRef.current = null;
    };

    const userPhone = localStorage.getItem('sw_phone') || phone;

    const tryComplete = async () => {
      if (cancelled || verificationDone) return;
      if (!userLeftForPayment) return;

      try {
        if (await isUserKycFeePaid(userId)) {
          verificationDone = true;
          setKycFeePaid(true);
          cleanup();
          return;
        }

        verificationDone = true;
        await recordSuccessfulPayment(userId, pricing.feeAmount, 'intent', 'kyc', payment.id);
        if (userPhone) {
          await updateUserKycFeePaid(userPhone, true);
        } else {
          await updateUserKycFeePaid(userId, true);
        }

        const ok = await isUserKycFeePaid(userId);
        if (ok) {
          setKycFeePaid(true);
          setCurrentKycPayment({ ...payment, status: 'completed' });
          setSheet('kyc');
          showToast('✅ KYC fee paid! Now upload your documents.');
          cleanup();
        } else {
          verificationDone = false;
        }
      } catch (error) {
        verificationDone = false;
        console.error('KYC intent payment verification', error);
        showToast('❌ Could not confirm KYC payment. Try again.');
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
    kycIntentVerifyCleanupRef.current = cleanup;
  };

  const handleKycPaymentQR = async () => {
    if (!paymentMethods.qrEnabled) {
      showToast('⚠️ QR payment is disabled right now');
      return;
    }

    const userId = localStorage.getItem('sw_userId');
    if (!userId) {
      showToast('❌ User not logged in');
      return;
    }

    const pricing = await getKycRequirements();
    setKycRequirements(pricing);

    const paid = await isUserKycFeePaid(userId);
    if (paid) {
      showToast('✅ KYC fee already paid!');
      setKycFeePaid(true);
      return;
    }

    const payment = await preparePaymentOrder(userId, pricing.feeAmount, 'qr', 'kyc');
    setCurrentKycPayment(payment);
    setPaymentMethod('qr');

    if (!launchQrPaymentPage(userId, pricing.feeAmount, payment.id, 'KYC payment')) {
      showToast('⚠️ Could not open payment page');
      return;
    }

    setSheet('kycQrPayment');

    const userPhone = localStorage.getItem('sw_phone') || phone;
    let pollInterval;

    const markKycFeePaid = async () => {
      if (userPhone) {
        await updateUserKycFeePaid(userPhone, true);
      } else {
        await updateUserKycFeePaid(userId, true);
      }
    };

    const finalizeKycQrSuccess = async () => {
      await recordSuccessfulPayment(userId, pricing.feeAmount, 'qr', 'kyc', payment.id);
      await markKycFeePaid();

      const ok = await isUserKycFeePaid(userId);
      if (!ok) {
        return false;
      }

      closeInAppPaymentWebView();
      setKycFeePaid(true);
      setSheet('kyc');
      showToast('✅ KYC fee verified! Upload your documents below.');
      return true;
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
          await finalizeKycQrSuccess();
        } else if (data.type === 'verification_complete' && data.success === false) {
          clearInterval(pollInterval);
          window.removeEventListener('message', handleMessage);
          closeInAppPaymentWebView();
          showToast(`❌ Payment verification failed: ${data.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error handling KYC payment message', error);
      }
    };

    const autoVerifyKyc = async () => {
      try {
        if (!(await hasCompletedKycPayment(userId)) && !(await isUserKycFeePaid(userId))) {
          return false;
        }
        clearInterval(pollInterval);
        window.removeEventListener('message', handleMessage);
        return finalizeKycQrSuccess();
      } catch (error) {
        console.error('Error auto-verifying KYC payment', error);
        return false;
      }
    };

    window.addEventListener('message', handleMessage);

    pollInterval = setInterval(async () => {
      const verified = await autoVerifyKyc();
      if (verified) {
        closeInAppPaymentWebView();
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(pollInterval);
      window.removeEventListener('message', handleMessage);
    }, 15 * 60 * 1000);

    showToast('📱 Complete KYC payment in the app. We verify automatically after upload.');
  };

  const handleFakeKycComplete = async () => {
    const userId = localStorage.getItem('sw_userId');
    if (!userId) {
      showToast('❌ User not logged in');
      return;
    }
    if (!isFirebaseConfigured) {
      showToast('⚠️ Firebase not configured');
      return;
    }
    try {
      await completeFakeKycPayment(userId);
      setKycFeePaid(true);
      setSheet('kyc');
      showToast('✅ Demo: fee paid — upload Aadhaar & PAN below');
    } catch (e) {
      console.error(e);
      showToast('❌ Could not complete demo KYC');
    }
  };

  const handleSaveKycDocuments = async () => {
    if (!kycFeePaid) {
      showToast('⚠️ Pay the KYC fee first');
      return;
    }
    if (kycApproved) {
      showToast('✅ Your KYC is already approved');
      return;
    }

    const fullName = kycFullName.trim();
    const aadhaarDigits = kycAadhaar.replace(/\D/g, '');
    const pan = kycPan.trim().toUpperCase();

    if (!fullName) {
      showToast('⚠️ Enter name as on your ID');
      return;
    }
    if (aadhaarDigits.length !== 12) {
      showToast('⚠️ Enter a valid 12-digit Aadhaar number');
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      showToast('⚠️ Enter a valid PAN (e.g. ABCDE1234F)');
      return;
    }
    if (!kycAadhaarFile && !kycPanFile) {
      showToast('⚠️ Upload at least Aadhaar or PAN photo');
      return;
    }
    if (!kycSelfieFile) {
      showToast('⚠️ Take or upload a selfie');
      return;
    }

    const userPhone = localStorage.getItem('sw_phone') || phone;
    const userId = localStorage.getItem('sw_userId');
    const identifier = userPhone || userId;
    if (!identifier) {
      showToast('❌ User not logged in');
      return;
    }

    setKycSaving(true);
    try {
      const ok = await saveUserKycDetails(identifier, {
        fullName,
        aadhaar: aadhaarDigits,
        pan,
        dob: kycDob,
        address: kycAddress,
        aadhaarFileName: kycAadhaarFile?.name || null,
        panFileName: kycPanFile?.name || null,
        selfieFileName: kycSelfieFile?.name || null,
      });
      if (ok) {
        setKycSubmitted(true);
        showToast('✅ KYC submitted! We will review within 24–48 hours.');
      } else {
        showToast('❌ Could not save KYC. Try again.');
      }
    } catch (e) {
      console.error(e);
      showToast('❌ Could not save KYC. Try again.');
    } finally {
      setKycSaving(false);
    }
  };

  const totalEarned = (() => {
    try { return JSON.parse(localStorage.getItem('sw_completed') || '[]').reduce((s, t) => s + t.reward, 0); }
    catch { return 0; }
  })();
  const tasksDone = (() => {
    try { return JSON.parse(localStorage.getItem('sw_completed') || '[]').length; }
    catch { return 0; }
  })();

  return (
    <div style={{ paddingBottom:32 }}>

      {/* ── PROFILE HERO ── */}
      <div style={{ background:'linear-gradient(160deg,#0f1220 0%,#1a2040 55%,#0d2a4a 100%)', padding:'28px 20px 56px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-20, width:120, height:120, borderRadius:'50%', background:'rgba(0,195,126,0.15)' }} />
        <div style={{ position:'absolute', bottom:-30, left:-10, width:100, height:100, borderRadius:'50%', background:'rgba(127,86,217,0.15)' }} />

        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:'linear-gradient(135deg,#e53e3e,#c53030)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:900, fontSize:26, fontFamily:'var(--font-display)', boxShadow:'0 8px 24px rgba(229,62,62,0.4)' }}>
            {(name || userName).charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:'white', fontFamily:'var(--font-display)' }}>{name || userName}</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginTop:3 }}>SkillWork Member</div>
            <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
              <div style={{ background: isPro ? 'rgba(127,86,217,0.25)' : 'rgba(0,195,126,0.15)', border:`1px solid ${isPro ? 'rgba(127,86,217,0.4)' : 'rgba(0,195,126,0.3)'}`, borderRadius:100, padding:'3px 10px' }}>
                <span style={{ fontSize:11, color: isPro ? '#a78bfa' : '#4ade80', fontWeight:700 }}>{isPro ? '👑 Pro Member' : '🆓 Free Plan'}</span>
              </div>
              <div style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:100, padding:'3px 10px' }}>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)', fontWeight:600 }}>✅ {tasksDone} tasks</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'0 16px', marginTop:-24 }}>

        {/* ── STATS ROW ── */}
        <div className="card animate-fade-up" style={{ padding:0, marginBottom:16, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr' }}>
            {[
              { label:'Earned',  val:`₹${totalEarned.toLocaleString()}`, color:'var(--green)'  },
              { label:'Tasks',   val:tasksDone,         color:'#4361ee'        },
              { label:'Plan',    val: isPro ? 'Pro' : 'Free',  color: isPro ? '#7F56D9' : 'var(--green)' },
            ].map((s, i) => (
              <div key={i} style={{ padding:'14px 12px', textAlign:'center', borderRight: i < 2 ? '1px solid var(--border-color)' : 'none' }}>
                <div style={{ fontSize:18, fontWeight:900, color:s.color, fontFamily:'var(--font-display)' }}>{s.val}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, marginTop:2, textTransform:'uppercase', letterSpacing:'0.4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ACCOUNT ── */}
        <div className="card animate-fade-up" style={{ overflow:'hidden', marginBottom:14, animationDelay:'0.06s' }}>
          <Section label={t('account')} />
          <MenuItem icon="👤" label={t('edit_profile')}  sub={name || userName}           onClick={() => setSheet('profile')}  accent="#4361ee" />
          <MenuItem icon="🏦" label={t('bank_upi')}     sub={upi || 'Not set'}           onClick={() => setSheet('bank')}     accent="#027A48" />
          <MenuItem icon="🧾" label="User Details" sub={`Wallet ₹${walletBalance.toFixed(2)}`} onClick={() => setSheet('userDetails')} accent="#7F56D9" />
          <MenuItem icon="🔒" label={t('change_password')} sub="Update your login password" onClick={() => setSheet('password')} accent="#7F56D9" />
          <MenuItem
            icon="📱"
            label={t('kyc')}
            sub={
              kycApproved
                ? 'Verified'
                : kycSubmitted
                  ? 'Under review'
                  : kycFeePaid
                    ? 'Step 2: Upload Aadhaar & PAN'
                    : walletBalance >= kycRequirements.balanceThreshold
                      ? `Step 1: Pay ₹${kycRequirements.feeAmount} fee`
                      : 'Required for withdrawals'
            }
            onClick={() => setSheet('kyc')}
            accent="#B54708"
          />
        </div>

        {/* ── SUBSCRIPTION ── */}
        <div className="card animate-fade-up" style={{ overflow:'hidden', marginBottom:14, animationDelay:'0.1s' }}>
          <Section label={t('subscription')} />
          {isPro ? (
            <MenuItem icon="👑" label={t('pro_active')} sub="Lifetime · All features unlocked"
              rightEl={<span style={{ fontSize:11, fontWeight:700, color:'#7F56D9', background:'rgba(127,86,217,0.1)', padding:'4px 10px', borderRadius:100 }}>Active</span>}
              accent="#7F56D9" onClick={() => setSheet('downgrade')} />
          ) : (
            <MenuItem icon="🚀" label={t('upgrade_to_pro')} sub={`₹${proPricing.amount} ${proPricing.description}`}
              rightEl={<span style={{ fontSize:11, fontWeight:800, background:'var(--grad-purple)', color:'white', padding:'4px 12px', borderRadius:100 }}>Upgrade</span>}
              onClick={() => setSheet('payment')} accent="#7F56D9" />
          )}
        </div>

        {/* ── PREFERENCES ── */}
        <div className="card animate-fade-up" style={{ overflow:'hidden', marginBottom:14, animationDelay:'0.14s' }}>
          <Section label={t('preferences')} />
          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 16px', borderBottom:'1px solid var(--border-color)' }}>
            <div style={{ width:36, height:36, borderRadius:11, background:'var(--green-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🔔</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600 }}>{t('notifications')}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{t('notifications_sub')}</div>
            </div>
            <Toggle value={notif} onChange={v => toggle('sw_notif', v, setNotif)} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 16px', borderBottom:'1px solid var(--border-color)' }}>
            <div style={{ width:36, height:36, borderRadius:11, background:'rgba(100,100,120,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🌙</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600 }}>{t('dark_mode')}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>Switch app to dark theme</div>
            </div>
            <Toggle value={isDark} onChange={v => { toggleDark(v); setDarkHint(v); }} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 16px', borderBottom:'1px solid var(--border-color)' }}>
            <div style={{ width:36, height:36, borderRadius:11, background:'rgba(245,158,11,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🔊</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600 }}>{t('sound')}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{t('sound_sub')}</div>
            </div>
            <Toggle value={soundOn} onChange={v => toggle('sw_sound', v, setSoundOn)} />
          </div>
          <MenuItem icon="🌐" label={t('language_setting')} sub={language} onClick={() => setSheet('language')} accent="#175CD3" />
        </div>

        {/* ── SUPPORT ── */}
        <div className="card animate-fade-up" style={{ overflow:'hidden', marginBottom:14, animationDelay:'0.18s' }}>
          <Section label={t('support')} />
          <MenuItem icon="❓" label={t('help_support')}  sub="FAQs and contact us"          onClick={() => setSheet('support')} accent="#4361ee" />
          <MenuItem icon="📋" label={t('terms')}        sub="Read our policies"            onClick={() => setSheet('terms')}   accent="#7F56D9" />
          <MenuItem icon="⭐" label={t('rate_app')}     sub="Tell us what you think"       onClick={() => showToast('⭐ Thank you for rating us!')} accent="#f59e0b" />
          <MenuItem icon="📤" label={t('share_app')}    sub="Invite friends to SkillWork"  onClick={() => showToast('🔗 Link copied to clipboard!')} accent="#027A48" />
        </div>

        {/* ── DANGER ── */}
        <div className="card animate-fade-up" style={{ overflow:'hidden', marginBottom:16, animationDelay:'0.22s' }}>
          <Section label={t('account_actions')} />
          <MenuItem icon="🚪" label={t('log_out')}         danger onClick={() => setSheet('logoutConfirm')} />
          <MenuItem icon="🗑️" label={t('delete_account')} danger onClick={() => setSheet('deleteConfirm')} />
        </div>
        <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:12, marginBottom:8 }}>{t('skillwork_version')}</p>
      </div>

      {/* ══ SHEETS ══════════════════════════════════════════════════════════ */}

      {/* Edit Profile */}
      {sheet === 'profile' && (
        <Sheet title="✏️ Edit Profile" onClose={() => setSheet(null)}>
          <Field label="Full Name"     placeholder="Your name"   value={name}  onChange={setName}  />
          <Field
            label="Mobile Number"
            placeholder="10-digit no"
            value={phone}
            onChange={setPhone}
            type="tel"
            readOnly={Boolean(getBoundDevicePhone())}
          />
          <button className="btn-green" style={{ width:'100%', borderRadius:12 }} onClick={saveProfile}>Save Changes</button>
        </Sheet>
      )}

      {/* Bank / UPI */}
      {sheet === 'bank' && (
        <Sheet title="🏦 Payment Details" onClose={() => setSheet(null)}>
          <div style={{ background:'var(--green-light)', border:'1px solid var(--green-border)', borderRadius:12, padding:'12px 14px', marginBottom:16, fontSize:12, color:'var(--green)', fontWeight:600 }}>
            💡 Add UPI ID or Bank Account to receive earnings.
          </div>
          <Field label="UPI ID"        placeholder="name@upi"      value={upi}      onChange={setUpi}      />
          <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:12, margin:'4px 0 14px' }}>— or add bank account —</div>
          <Field label="Bank Name"     placeholder="e.g. SBI"      value={bankName} onChange={setBankName}  />
          <Field label="Account No."   placeholder="Account number" value={accNo}   onChange={setAccNo}    type="tel" />
          <Field label="IFSC Code"     placeholder="e.g. SBIN0001234" value={ifsc}  onChange={setIfsc}      />
          <button className="btn-green" style={{ width:'100%', borderRadius:12 }} onClick={saveBank}>Save Payment Details</button>
        </Sheet>
      )}

      {/* Change Password */}
      {sheet === 'password' && (
        <Sheet title="🔒 Change Password" onClose={() => setSheet(null)}>
          <Field label="Current Password" placeholder="Enter current password" value={oldPass} onChange={setOldPass} type="password" />
          <Field label="New Password"     placeholder="Min 6 characters"       value={newPass} onChange={setNewPass} type="password" />
          <button className="btn-purple" style={{ width:'100%', borderRadius:12 }} onClick={changePassword}>Update Password</button>
        </Sheet>
      )}

      {/* KYC */}
      {sheet === 'kyc' && (
        <Sheet title="📱 KYC Verification" onClose={() => setSheet(null)}>
          <div style={{ padding:'4px 0 8px' }}>
            <div style={{ display:'flex', gap:8, marginBottom:20 }}>
              {[
                { n: 1, label: 'Pay fee', done: kycFeePaid },
                { n: 2, label: 'Documents', done: kycSubmitted || kycApproved },
              ].map((step) => (
                <div key={step.n} style={{ flex:1, textAlign:'center' }}>
                  <div style={{
                    width:28, height:28, borderRadius:'50%', margin:'0 auto 6px',
                    background: step.done ? 'var(--green)' : ((step.n === 1 && !kycFeePaid) || (step.n === 2 && kycFeePaid && !step.done)) ? '#4361ee' : '#e5e7eb',
                    color: step.done || ((step.n === 1 && !kycFeePaid) || (step.n === 2 && kycFeePaid)) ? 'white' : 'var(--text-muted)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800,
                  }}>
                    {step.done ? '✓' : step.n}
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, color: step.done ? 'var(--green)' : 'var(--text-secondary)' }}>{step.label}</div>
                </div>
              ))}
            </div>

            {kycApproved && (
              <div style={{ background:'var(--green-light)', border:'1px solid var(--green-border)', borderRadius:12, padding:'14px 16px', marginBottom:16, fontSize:13, color:'var(--green)', fontWeight:600, textAlign:'center' }}>
                ✅ KYC verified. You can withdraw earnings.
              </div>
            )}

            {!kycFeePaid && walletBalance < kycRequirements.balanceThreshold && !SHOW_FAKE_KYC && (
              <div style={{ background:'#f8f9fc', border:'1px solid var(--border-color)', borderRadius:12, padding:'14px 16px', marginBottom:16, fontSize:13, color:'var(--text-secondary)', lineHeight:1.65 }}>
                Complete more tasks to reach <strong>₹{kycRequirements.balanceThreshold.toLocaleString('en-IN')}</strong> wallet balance. KYC fee payment unlocks after that.
              </div>
            )}

            {!kycFeePaid && (walletBalance >= kycRequirements.balanceThreshold || SHOW_FAKE_KYC) && (
              <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.35)', borderRadius:14, padding:'14px 16px', marginBottom:18, textAlign:'left' }}>
                <h4 style={{ fontSize:15, fontWeight:800, margin:'0 0 8px', fontFamily:'var(--font-display)' }}>Step 1 — Pay KYC fee</h4>
                <p style={{ fontSize:13, color:'var(--text-primary)', lineHeight:1.65, margin:0 }}>
                  Pay <strong>₹{kycRequirements.feeAmount.toLocaleString('en-IN')}</strong> first. After payment succeeds, you can enter Aadhaar, PAN, and upload documents.
                </p>
                <div style={{ display:'grid', gap:10, marginTop:14 }}>
                  {paymentMethods.upiIntentEnabled && (
                  <button
                    type="button"
                    onClick={handleKycPaymentIntent}
                    style={{ width:'100%', padding:'14px', borderRadius:12, background:'var(--green-light)', border:'1.5px solid var(--green-border)', fontFamily:'var(--font-sans)', fontWeight:700, fontSize:14, color:'var(--green)', cursor:'pointer' }}
                  >
                    📱 Pay ₹{kycRequirements.feeAmount} (UPI Intent)
                  </button>
                  )}
                  {paymentMethods.qrEnabled && (
                  <button
                    type="button"
                    onClick={handleKycPaymentQR}
                    style={{ width:'100%', padding:'14px', borderRadius:12, background:'rgba(127,86,217,0.1)', border:'1.5px solid rgba(127,86,217,0.3)', fontFamily:'var(--font-sans)', fontWeight:700, fontSize:14, color:'#7F56D9', cursor:'pointer' }}
                  >
                    📷 Pay via QR Code
                  </button>
                  )}
                  {!paymentMethods.upiIntentEnabled && !paymentMethods.qrEnabled && (
                    <p style={{ fontSize:12, color:'var(--text-secondary)', margin:0, lineHeight:1.6, textAlign:'center' }}>
                      Payment options are turned off. Enable UPI or QR in Firebase → config/payment_methods.
                    </p>
                  )}
                  {SHOW_FAKE_KYC && (
                    <button
                      type="button"
                      onClick={handleFakeKycComplete}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 12,
                        background: 'rgba(148, 163, 184, 0.15)',
                        border: '1px dashed rgba(148, 163, 184, 0.6)',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 600,
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      🧪 Demo: skip payment
                    </button>
                  )}
                </div>
              </div>
            )}

            {kycFeePaid && !kycApproved && (
              <>
                <div style={{ background:'var(--green-light)', border:'1px solid var(--green-border)', borderRadius:12, padding:'10px 14px', marginBottom:16, fontSize:12, color:'var(--green)', fontWeight:600 }}>
                  ✅ Fee paid — Step 2: enter Aadhaar, PAN, and upload ID photos.
                </div>
                {kycSubmitted && (
                  <div style={{ background:'rgba(67,97,238,0.08)', border:'1px solid rgba(67,97,238,0.25)', borderRadius:12, padding:'12px 14px', marginBottom:14, fontSize:12, color:'#4361ee', fontWeight:600, lineHeight:1.6 }}>
                    📋 Submitted — pending review (24–48 hours).
                  </div>
                )}
                <h4 style={{ fontSize:15, fontWeight:800, margin:'0 0 12px', fontFamily:'var(--font-display)' }}>Step 2 — Identity details</h4>
                <Field label="Full name (as on ID)" placeholder="Legal name" value={kycFullName} onChange={setKycFullName} />
                <Field label="Aadhaar number" placeholder="12 digits" value={kycAadhaar} onChange={setKycAadhaar} type="tel" />
                <Field label="PAN number" placeholder="ABCDE1234F" value={kycPan} onChange={(v) => setKycPan(v.toUpperCase())} />
                <Field label="Date of birth" placeholder="DD/MM/YYYY" value={kycDob} onChange={setKycDob} />
                <Field label="Address (optional)" placeholder="City, state" value={kycAddress} onChange={setKycAddress} />
                <input ref={kycAadhaarInputRef} type="file" accept="image/*,.pdf" style={{ display:'none' }} onChange={(e) => setKycAadhaarFile(e.target.files?.[0] || null)} />
                <input ref={kycPanInputRef} type="file" accept="image/*,.pdf" style={{ display:'none' }} onChange={(e) => setKycPanFile(e.target.files?.[0] || null)} />
                <input ref={kycSelfieInputRef} type="file" accept="image/*" capture="user" style={{ display:'none' }} onChange={(e) => setKycSelfieFile(e.target.files?.[0] || null)} />
                <div style={{ display:'grid', gap:10, marginBottom:16 }}>
                  {[
                    { label: '📄 Upload Aadhaar', file: kycAadhaarFile, open: () => kycAadhaarInputRef.current?.click() },
                    { label: '🪪 Upload PAN', file: kycPanFile, open: () => kycPanInputRef.current?.click() },
                    { label: '📸 Upload selfie', file: kycSelfieFile, open: () => kycSelfieInputRef.current?.click() },
                  ].map((row) => (
                    <button key={row.label} type="button" onClick={row.open}
                      style={{ width:'100%', padding:'13px', borderRadius:12, background: row.file ? 'var(--green-light)' : '#f8f9fc', border:`1.5px solid ${row.file ? 'var(--green-border)' : 'var(--border-color)'}`, fontFamily:'var(--font-sans)', fontWeight:600, fontSize:14, color:'var(--text-primary)', cursor:'pointer', textAlign:'left' }}>
                      {row.label}
                      {row.file && <span style={{ display:'block', fontSize:11, color:'var(--green)', marginTop:4, fontWeight:500 }}>{row.file.name}</span>}
                    </button>
                  ))}
                </div>
                <button type="button" className="btn-green" style={{ width:'100%', borderRadius:12, opacity: kycSaving ? 0.7 : 1 }} disabled={kycSaving} onClick={handleSaveKycDocuments}>
                  {kycSaving ? 'Saving…' : (kycSubmitted ? 'Resubmit KYC' : 'Submit KYC')}
                </button>
              </>
            )}
          </div>
        </Sheet>
      )}

      {sheet === 'kycQrPayment' && currentKycPayment && (
        <Sheet title="📷 KYC payment" onClose={() => setSheet(null)}>
          <div style={{ textAlign:'center', padding:'8px 0' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>💳</div>
            <h4 style={{ fontSize:16, fontWeight:800, marginBottom:8, fontFamily:'var(--font-display)' }}>Payment page opened</h4>
            <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:20 }}>
              Complete payment and upload the screenshot on the payment page.
              <br /><br />
              <strong>Amount:</strong> ₹{kycRequirements.feeAmount}<br />
              <strong>Payment ID:</strong> {currentKycPayment.id.substring(0, 12)}...
            </p>
            <button
              type="button"
              onClick={() => {
                const userId = localStorage.getItem('sw_userId');
                if (launchQrPaymentPage(userId, kycRequirements.feeAmount, currentKycPayment.id, 'KYC payment')) {
                  showToast('📱 Payment opened in app');
                } else {
                  showToast('⚠️ Could not open payment page');
                }
              }}
              className="btn-purple"
              style={{ width:'100%', borderRadius:12, marginBottom:10 }}
            >
              🔄 Reopen payment page
            </button>
            <button
              type="button"
              onClick={() => setSheet(null)}
              style={{ width:'100%', padding:'12px', borderRadius:12, background:'transparent', border:'1px solid var(--border-color)', fontFamily:'var(--font-sans)', fontWeight:600, fontSize:14, color:'var(--text-secondary)', cursor:'pointer' }}
            >
              Close (verifies automatically)
            </button>
          </div>
        </Sheet>
      )}

      {/* Language */}
      {sheet === 'language' && (
        <Sheet title="🌐 Select Language" onClose={() => setSheet(null)}>
          {['English','हिन्दी (Hindi)','मराठी (Marathi)','தமிழ் (Tamil)','తెలుగు (Telugu)','বাংলা (Bengali)'].map(lang => (
            <div key={lang} onClick={() => { setLanguage(lang); localStorage.setItem('sw_lang', lang); showToast(`✅ Language set to ${lang}`); setSheet(null); }}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 4px', borderBottom:'1px solid var(--border-color)', cursor:'pointer' }}>
              <span style={{ fontSize:14, fontWeight: language===lang ? 700 : 500, color: language===lang ? 'var(--green)' : 'var(--text-primary)' }}>{lang}</span>
              {language === lang && <span style={{ fontSize:16, color:'var(--green)' }}>✓</span>}
            </div>
          ))}
        </Sheet>
      )}

      {/* User Details */}
      {sheet === 'userDetails' && (
        <Sheet title="🧾 User Details" onClose={() => setSheet(null)}>
          <div style={{ textAlign:'center', padding:'8px 0' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>👤</div>
            <h4 style={{ fontSize:16, fontWeight:800, marginBottom:8, fontFamily:'var(--font-display)' }}>Account Settings</h4>
            <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:20 }}>
              Manage your wallet balance and control whether premium upgrades are allowed.
            </p>
            <div style={{ textAlign:'left', fontSize:12, color:'var(--text-muted)', marginBottom:16, background:'rgba(0,0,0,0.04)', padding:12, borderRadius:12 }}>
              <div><strong>User ID:</strong> {localStorage.getItem('sw_userId') || 'Not logged in'}</div>
              <div><strong>Name:</strong> {name || userName}</div>
              <div><strong>Phone:</strong> {phone || 'Not set'}</div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, marginBottom:4 }}>Wallet Balance</div>
                <input
                  type="number"
                  value={walletBalance}
                  onChange={e => setWallet(Number(e.target.value))}
                  style={{ width:'100%', padding:'10px', borderRadius:10, border:'1px solid var(--border-color)', fontSize:14 }}
                />
              </div>
              <button
                onClick={() => { setWallet(walletBalance); showToast('✅ Wallet updated'); }}
                style={{ padding:'10px 14px', borderRadius:12, background:'var(--green-light)', border:'1px solid var(--green-border)', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                Save
              </button>
            </div>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:12, background:'rgba(127,86,217,0.08)', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700 }}>Premium upgrades</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>Toggle whether upgrade to Pro is allowed.</div>
              </div>
              <div>
                <Toggle value={premiumEnabled} onChange={setPremiumEnabledState} />
              </div>
            </div>

            <button
              onClick={() => setSheet(null)}
              className="btn-green"
              style={{ width:'100%', borderRadius:12 }}>
              Done
            </button>
          </div>
        </Sheet>
      )}

      {/* Help & Support */}
      {sheet === 'support' && (
        <Sheet title="❓ Help & Support" onClose={() => setSheet(null)}>
          {[
            { q:'How do I withdraw my earnings?',   a:'Go to Home → Withdraw. You need at least ₹500 and verified KYC.' },
            { q:'When will my task earnings show?',  a:'Earnings are credited within 24 hours after QA approval of your submitted PDF.' },
            { q:'My uploaded PDF was rejected?',    a:'Common reasons: incomplete edits, wrong format, or unreadable content. Redo and resubmit.' },
            { q:'How do I contact support?',        a:'Email us at support@skillwork.in or WhatsApp +91-9876543210 (10am–6pm IST).' },
          ].map((f, i) => (
            <div key={i} style={{ marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:5 }}>Q: {f.q}</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.6, background:'#f8f9fc', borderRadius:10, padding:'10px 12px' }}>{f.a}</div>
            </div>
          ))}
          <button type="button" onClick={handleContactSupport} style={{ width:'100%', padding:'13px', borderRadius:12, background:'var(--green-light)', border:'1.5px solid var(--green-border)', fontFamily:'var(--font-sans)', fontWeight:700, fontSize:14, color:'var(--green)', cursor:'pointer' }}>
            📧 Contact Support
          </button>
        </Sheet>
      )}

      {/* Terms */}
      {sheet === 'terms' && (
        <Sheet title="📋 Terms & Privacy" onClose={() => setSheet(null)}>
          {[
            { h:'Terms of Service', p:'By using SkillWork, you agree to complete PDF editing tasks honestly and to the best of your ability. Fraudulent submissions will result in account suspension.' },
            { h:'Privacy Policy',   p:'We collect only the information necessary to operate the service (name, phone, payment details). We never sell your data to third parties.' },
            { h:'Payment Policy',   p:'Earnings are credited within 24 hours (Pro) or 48 hours (Free) of QA approval. Minimum withdrawal is ₹500 with verified KYC.' },
            { h:'Refund Policy',    p:'Pro plan upgrades are non-refundable. However, if you face issues, contact support within 7 days for resolution.' },
          ].map((s, i) => (
            <div key={i} style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>{s.h}</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.7 }}>{s.p}</div>
              {i < 3 && <div style={{ height:1, background:'var(--border-color)', marginTop:16 }} />}
            </div>
          ))}
        </Sheet>
      )}

      {/* Downgrade Confirm */}
      {sheet === 'downgrade' && (
        <Sheet title="Manage Subscription" onClose={() => setSheet(null)}>
          <div style={{ textAlign:'center', padding:'8px 0' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>👑</div>
            <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:20 }}>
              You are on the <strong style={{ color:'#7F56D9' }}>Pro Lifetime</strong> plan.<br />
              Downgrading will reduce your tasks from <strong>50 to 15</strong> per day.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setSheet(null)} className="btn-purple" style={{ flex:1, borderRadius:12 }}>Keep Pro 👑</button>
              <button onClick={() => { onDowngrade(); setSheet(null); showToast('Downgraded to Free plan'); }}
                style={{ flex:1, padding:'13px', borderRadius:12, background:'#fee2e2', border:'1px solid #fecaca', fontFamily:'var(--font-sans)', fontWeight:700, fontSize:14, color:'var(--red)', cursor:'pointer' }}>
                Downgrade
              </button>
            </div>
          </div>
        </Sheet>
      )}

      {/* Logout Confirm */}
      {sheet === 'logoutConfirm' && (
        <Sheet title="Log Out?" onClose={() => setSheet(null)}>
          <div style={{ textAlign:'center', padding:'8px 0' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🚪</div>
            <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:20 }}>
              Are you sure you want to log out? Your earnings and stats are saved.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setSheet(null)} className="btn-green" style={{ flex:1, borderRadius:12 }}>Stay</button>
              <button onClick={handleLogout} style={{ flex:1, padding:'13px', borderRadius:12, background:'#fee2e2', border:'1px solid #fecaca', fontFamily:'var(--font-sans)', fontWeight:700, fontSize:14, color:'var(--red)', cursor:'pointer' }}>
                Log Out
              </button>
            </div>
          </div>
        </Sheet>
      )}

      {/* Delete Account */}
      {sheet === 'deleteConfirm' && (
        <Sheet title="⚠️ Delete Account" onClose={() => setSheet(null)}>
          <div style={{ textAlign:'center', padding:'8px 0' }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'#fee2e2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:30 }}>🗑️</div>
            <h4 style={{ fontSize:16, fontWeight:800, marginBottom:8 }}>This is permanent</h4>
            <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:20 }}>
              All your data — earnings, tasks, plan — will be <strong style={{ color:'var(--red)' }}>permanently deleted</strong> and cannot be recovered.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setSheet(null)} className="btn-green" style={{ flex:1, borderRadius:12 }}>Cancel</button>
              <button onClick={handleDeleteAccount} style={{ flex:1, padding:'13px', borderRadius:12, background:'#ef4444', border:'none', fontFamily:'var(--font-sans)', fontWeight:700, fontSize:14, color:'white', cursor:'pointer' }}>
                Delete
              </button>
            </div>
          </div>
        </Sheet>
      )}

      {/* Payment Sheet */}
      {sheet === 'payment' && (
        <Sheet title="💳 Upgrade to Pro" onClose={() => setSheet(null)}>
          <div style={{ textAlign:'center', padding:'8px 0' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>👑</div>
            <h4 style={{ fontSize:16, fontWeight:800, marginBottom:8, fontFamily:'var(--font-display)' }}>Lifetime Pro Access</h4>
            <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:20 }}>
              Get unlimited tasks, priority support, and premium features for just ₹{proPricing.amount}.
            </p>
            <div style={{ display:'grid', gap:12 }}>
              {paymentMethods.upiIntentEnabled && (
              <button
                onClick={handlePaymentIntent}
                style={{ width:'100%', padding:'14px', borderRadius:12, background:'var(--green-light)', border:'1.5px solid var(--green-border)', fontFamily:'var(--font-sans)', fontWeight:700, fontSize:14, color:'var(--green)', cursor:'pointer', transition:'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor='var(--green)'; e.currentTarget.style.background='var(--green-light)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor='var(--green-border)'; e.currentTarget.style.background='var(--green-light)'; }}>
                📱 Pay ₹{proPricing.amount} (UPI Intent)
              </button>
              )}
              {paymentMethods.qrEnabled && (
              <button
                onClick={handlePaymentQR}
                style={{ width:'100%', padding:'14px', borderRadius:12, background:'rgba(127,86,217,0.1)', border:'1.5px solid rgba(127,86,217,0.3)', fontFamily:'var(--font-sans)', fontWeight:700, fontSize:14, color:'#7F56D9', cursor:'pointer', transition:'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor='rgba(127,86,217,0.5)'; e.currentTarget.style.background='rgba(127,86,217,0.15)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor='rgba(127,86,217,0.3)'; e.currentTarget.style.background='rgba(127,86,217,0.1)'; }}>
                📷 Pay via QR Code
              </button>
              )}
              {!paymentMethods.upiIntentEnabled && !paymentMethods.qrEnabled && (
                <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6, margin:0 }}>
                  No payment methods are enabled. Turn on <strong>upiIntentEnabled</strong> or <strong>qrEnabled</strong> in Firebase → <strong>config/payment_methods</strong>.
                </p>
              )}
            </div>
          </div>
        </Sheet>
      )}

      {/* QR Payment Status Sheet - Shows when payment page is opened */}
      {sheet === 'qrPayment' && currentPayment && (
        <Sheet title="📷 Payment Verification" onClose={() => setSheet(null)}>
          <div style={{ textAlign:'center', padding:'8px 0' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>💳</div>
            <h4 style={{ fontSize:16, fontWeight:800, marginBottom:8, fontFamily:'var(--font-display)' }}>Payment Open In App</h4>
            <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:20 }}>
              Complete your payment in the in-app page and upload the screenshot for verification.
              <br /><br />
              <strong>Amount:</strong> ₹{proPricing.amount}<br />
              <strong>Payment ID:</strong> {currentPayment.id.substring(0, 12)}...
            </p>
            <div style={{ background:'rgba(127,86,217,0.1)', border:'1px solid rgba(127,86,217,0.3)', borderRadius:12, padding:'12px', marginBottom:16, fontSize:12, color:'var(--text-secondary)' }}>
              <div style={{ fontWeight:700, marginBottom:4 }}>📋 Instructions:</div>
              <div style={{ textAlign:'left', lineHeight:1.6 }}>
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
              style={{ width:'100%', borderRadius:12, marginBottom:10 }}>
              🔄 Open Payment In App
            </button>
            <button
              onClick={() => setSheet(null)}
              style={{ width:'100%', padding:'12px', borderRadius:12, background:'transparent', border:'1px solid var(--border-color)', fontFamily:'var(--font-sans)', fontWeight:600, fontSize:14, color:'var(--text-secondary)', cursor:'pointer' }}>
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

    </div>
  );
};

export default SettingTab;
