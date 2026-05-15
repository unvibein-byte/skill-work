import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ensureAnonymousUser,
  saveUserProfile,
  isFirebaseConfigured,
  checkDeviceAllowsPhone,
  syncDeviceBindingFromServer,
  checkUserAccountStatus,
  DEVICE_ALREADY_REGISTERED_MESSAGE,
} from '../firebase';
import { getPostSplashPath } from '../utils/sessionRoute';
import { getDeviceId, normalizePhone, isDevicePhoneConflict } from '../utils/deviceId';
import { setStoredBlockMessage } from '../utils/accountSession';

const Login = () => {
  const navigate = useNavigate();
  const [name, setName] = useState(() => localStorage.getItem('sw_name') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('sw_phone') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const next = getPostSplashPath();
    if (next !== '/login') navigate(next, { replace: true });
  }, [navigate]);

  useEffect(() => {
    const deviceId = getDeviceId();
    syncDeviceBindingFromServer(deviceId).catch(() => {});
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!name || !phone) return;

    setError('');
    setLoading(true);

    const normalizedPhone = normalizePhone(phone);
    const deviceId = getDeviceId();

    if (isDevicePhoneConflict(phone)) {
      setError(DEVICE_ALREADY_REGISTERED_MESSAGE);
      setLoading(false);
      return;
    }

    try {
      const deviceCheck = await checkDeviceAllowsPhone(deviceId, normalizedPhone);
      if (!deviceCheck.allowed) {
        setError(deviceCheck.message || DEVICE_ALREADY_REGISTERED_MESSAGE);
        setLoading(false);
        return;
      }

      const accountCheck = await checkUserAccountStatus(normalizedPhone);
      if (!accountCheck.allowed) {
        setStoredBlockMessage(accountCheck.message);
        setError(accountCheck.message);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Device check failed', err);
      setError('Could not verify this device. Please try again.');
      setLoading(false);
      return;
    }

    const alreadyFinishedOnboarding = localStorage.getItem('sw_onboarding_complete') === 'true';
    let uid = localStorage.getItem('sw_userId') || null;

    if (isFirebaseConfigured) {
      try {
        const user = await ensureAnonymousUser();
        if (user?.uid) {
          uid = user.uid;
          await saveUserProfile(uid, { name, phone: normalizedPhone, deviceId });

          const afterSave = await checkUserAccountStatus(normalizedPhone);
          if (!afterSave.allowed) {
            setStoredBlockMessage(afterSave.message);
            setError(afterSave.message);
            setLoading(false);
            return;
          }

          localStorage.setItem('sw_userId', uid);
        }
      } catch (err) {
        if (err?.code === 'DEVICE_ALREADY_REGISTERED' || err?.message === 'DEVICE_ALREADY_REGISTERED') {
          await syncDeviceBindingFromServer(deviceId);
          setError(DEVICE_ALREADY_REGISTERED_MESSAGE);
        } else {
          console.error('Firebase login failed', err);
          setError('Sign in failed. Please try again.');
        }
        setLoading(false);
        return;
      }
    } else {
      try {
        localStorage.setItem('sw_device_phone', normalizedPhone);
      } catch {
        /* ignore */
      }
    }

    localStorage.setItem('sw_name', name);
    localStorage.setItem('sw_phone', normalizedPhone);
    // Only new users need the onboarding flow; do not reset returning users
    if (!alreadyFinishedOnboarding) {
      localStorage.setItem('sw_onboarding_complete', 'false');
    }

    setTimeout(() => {
      if (alreadyFinishedOnboarding) {
        navigate('/main', { replace: true });
      } else {
        navigate('/onboarding-1');
      }
    }, 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f0f2f8' }}
    >
      {/* ── HERO TOP ── */}
      <div style={{
        background: 'linear-gradient(160deg,#0f1220 0%,#1a2040 60%,#2d1b69 100%)',
        padding: '44px 24px 64px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(0,195,126,0.15)' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(127,86,217,0.2)' }} />

        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg,#00c37e,#00e896)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: '0 8px 24px rgba(0,195,126,0.4)', marginBottom: 18 }}>
            💼
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.3px', marginBottom: 8 }}>
            Start Earning Today
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6 }}>
            Join thousands of users completing PDF tasks and getting paid daily.
          </p>

          {/* Trust badges */}
          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            {['✅ Free to join', '💰 Daily payouts', '🔒 100% secure'].map((b, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 100, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.12)' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{b}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── FORM CARD ── */}
      <motion.div
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{
          flex: 1, padding: '28px 22px',
          background: 'white',
          marginTop: -22, borderRadius: '22px 22px 0 0',
          position: 'relative', zIndex: 2,
          boxShadow: '0 -4px 24px rgba(15,18,32,0.1)',
          overflowY: 'auto',
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, fontFamily: "'Outfit',sans-serif" }}>
          Create Account
        </h2>
        <p style={{ color: 'var(--text-secondary,#5a6480)', fontSize: 13, marginBottom: 26 }}>
          Just fill in your details to get started
        </p>

        {error && (
          <div
            role="alert"
            style={{
              background: '#fef2f2',
              border: '1.5px solid #fecaca',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 18,
              fontSize: 13,
              color: '#b91c1c',
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#5a6480', marginBottom: 7, fontWeight: 600 }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>👤</span>
              <input
                type="text" placeholder="e.g. Aman Kumar" value={name}
                onChange={e => { setName(e.target.value); setError(''); }} required
                style={{ width: '100%', background: '#f0f2f8', border: '1.5px solid #e4e7f0', color: '#0f1220', padding: '14px 14px 14px 44px', borderRadius: 14, fontFamily: "'Inter',sans-serif", fontSize: 15, transition: 'all 0.2s', outline: 'none' }}
                onFocus={e => { e.target.style.borderColor = '#00c37e'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 3px rgba(0,195,126,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = '#e4e7f0'; e.target.style.background = '#f0f2f8'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#5a6480', marginBottom: 7, fontWeight: 600 }}>
              Mobile Number
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>📱</span>
              <input
                type="tel" placeholder="Enter 10-digit number" value={phone}
                onChange={e => { setPhone(e.target.value); setError(''); }} required
                style={{ width: '100%', background: '#f0f2f8', border: '1.5px solid #e4e7f0', color: '#0f1220', padding: '14px 14px 14px 44px', borderRadius: 14, fontFamily: "'Inter',sans-serif", fontSize: 15, transition: 'all 0.2s', outline: 'none' }}
                onFocus={e => { e.target.style.borderColor = '#00c37e'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 3px rgba(0,195,126,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = '#e4e7f0'; e.target.style.background = '#f0f2f8'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            style={{
              marginTop: 8, padding: '15px', borderRadius: 14,
              background: 'linear-gradient(135deg,#00c37e,#00e896)',
              border: 'none', color: 'white', fontWeight: 800, fontSize: 16,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'Outfit',sans-serif",
              boxShadow: '0 6px 24px rgba(0,195,126,0.4)',
              transition: 'all 0.2s', letterSpacing: '0.2px',
              opacity: loading ? 0.85 : 1,
            }}
            onMouseOver={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {loading
              ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                Setting up your account...
              </span>
              : '🚀 Get Started — It\'s Free'
            }
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#9aa0b8', fontSize: 11, marginTop: 22, lineHeight: 1.6 }}>
          By continuing, you agree to our Terms of Service & Privacy Policy
        </p>
      </motion.div>
    </motion.div>
  );
};

export default Login;
