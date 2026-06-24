import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AppLogo from '../components/AppLogo';
import { getPostSplashPath } from '../utils/sessionRoute';
import { checkUserAccountStatus, isFirebaseConfigured } from '../firebase';
import { clearUserSession, setStoredBlockMessage } from '../utils/accountSession';

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const goNext = async () => {
      const next = getPostSplashPath();
      const phone = localStorage.getItem('sw_phone');

      if (phone?.trim() && isFirebaseConfigured && next !== '/login') {
        try {
          const status = await checkUserAccountStatus(phone);
          if (!cancelled && !status.allowed) {
            setStoredBlockMessage(status.message);
            clearUserSession();
            navigate('/blocked', { replace: true });
            return;
          }
        } catch {
          /* continue if check fails */
        }
      }

      if (!cancelled) {
        navigate(next, { replace: true });
      }
    };

    const timer = setTimeout(goNext, 2500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-primary)' }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-center flex-column"
        style={{ flexDirection: 'column', gap: '16px' }}
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <AppLogo size={72} rounded="50%" />
        </motion.div>
        <h1 className="text-gradient" style={{ fontSize: '32px', marginTop: '16px' }}>24hrwork</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Complete tasks and earn money</p>
      </motion.div>
    </div>
  );
}

export default Splash;
