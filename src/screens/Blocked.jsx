import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getStoredBlockMessage, clearUserSession } from '../utils/accountSession';
import { DEFAULT_USER_BLOCKED_MESSAGE } from '../firebase';
import AppLogo from '../components/AppLogo';

const Blocked = () => {
  const navigate = useNavigate();
  const message = getStoredBlockMessage() || DEFAULT_USER_BLOCKED_MESSAGE;

  const handleBack = () => {
    clearUserSession();
    navigate('/login', { replace: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
        background: '#f0f2f8',
        textAlign: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        style={{
          background: 'white',
          borderRadius: 20,
          padding: '32px 24px',
          maxWidth: 360,
          width: '100%',
          boxShadow: '0 8px 32px rgba(15,18,32,0.08)',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <AppLogo size={56} rounded={14} />
        </div>
        <motion.div style={{ fontSize: 48, marginBottom: 16 }}>🚫</motion.div>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, fontFamily: "'Outfit',sans-serif" }}>
          Account Blocked
        </h1>
        <p style={{ fontSize: 14, color: '#5a6480', lineHeight: 1.65, marginBottom: 24 }}>
          {message}
        </p>
        <button
          type="button"
          onClick={handleBack}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(135deg,#00c37e,#00e896)',
            color: 'white',
            fontWeight: 800,
            fontSize: 15,
            cursor: 'pointer',
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          Back to Login
        </button>
      </motion.div>
      <p style={{ marginTop: 20, fontSize: 12, color: '#9aa0b8', maxWidth: 320, lineHeight: 1.5 }}>
        Contact support if you believe this is a mistake.
      </p>
    </motion.div>
  );
};

export default Blocked;
