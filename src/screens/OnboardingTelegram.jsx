import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { getTelegramConfig, DEFAULT_TELEGRAM_CONFIG } from '../firebase';

const OnboardingTelegram = () => {
    const navigate = useNavigate();
    const [tg, setTg] = useState(() => ({ ...DEFAULT_TELEGRAM_CONFIG }));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        getTelegramConfig().then((cfg) => {
            if (!cancelled) setTg(cfg);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (
            localStorage.getItem('sw_onboarding_complete') === 'true' &&
            localStorage.getItem('sw_name')?.trim() &&
            localStorage.getItem('sw_phone')?.trim()
        ) {
            navigate('/main', { replace: true });
        }
    }, [navigate]);

    const handleJoin = () => {
        const url = tg.channelUrl || DEFAULT_TELEGRAM_CONFIG.channelUrl;
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch {
            window.location.href = url;
        }
        localStorage.setItem('sw_onboarding_complete', 'true');
        navigate('/main');
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f0f2f8' }}
        >
            <div style={{
                background: 'linear-gradient(160deg,#0f1220 0%,#1a2040 60%,#2d1b69 100%)',
                padding: '44px 24px 64px', position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(0,195,126,0.15)' }} />
                <div style={{ position: 'absolute', bottom: -50, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(59,130,246,0.2)' }} />

                <motion.div
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    style={{ position: 'relative', zIndex: 1 }}
                >
                    <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg,#3b82f6,#60a5fa)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 24px rgba(59,130,246,0.4)', marginBottom: 18 }}>
                        <Send size={28} />
                    </div>
                    <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.3px', marginBottom: 8 }}>
                        Join Community
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6 }}>
                        Stay updated with daily proofs and get exclusive bonuses.
                    </p>
                </motion.div>
            </div>

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
                    display: 'flex', flexDirection: 'column'
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <p style={{ color: '#4a5568', fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px 0', fontWeight: 500 }}>
                        Don&apos;t miss out! Join our official Telegram channel to see thousands of <span style={{ color: '#3b82f6', fontWeight: 700 }}>Withdrawal Proofs</span> and get a{' '}
                        <span style={{ background: '#e6f8f0', color: '#00c37e', padding: '2px 8px', borderRadius: '8px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            {tg.bonusLabel}
                        </span>
                        {' '}!
                    </p>

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 }}
                        style={{
                            width: '100%', background: '#f0f5ff', border: '1px solid #cce0ff',
                            borderRadius: '16px', padding: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: 'auto',
                            opacity: loading ? 0.85 : 1,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '46px', height: '46px', background: 'linear-gradient(135deg, #3b82f6, #60a5fa)', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                            }}>
                                <Send size={22} color="white" style={{ transform: 'translateX(-1px) translateY(1px)' }} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ color: '#0f1220', fontSize: '15px', fontWeight: 800, marginBottom: '2px', fontFamily: "'Outfit',sans-serif" }}>
                                    {loading ? '…' : tg.channelName}
                                </div>
                                <div style={{ color: '#3b82f6', fontSize: '13px', fontWeight: 600 }}>
                                    {loading ? 'Loading…' : tg.memberSubtitle}
                                </div>
                            </div>
                        </div>

                        <div style={{
                            background: 'linear-gradient(135deg,#00c37e,#00e896)', color: 'white', fontSize: '14px',
                            fontWeight: 800, padding: '6px 14px', borderRadius: '24px', boxShadow: '0 4px 10px rgba(0,195,126,0.3)'
                        }}>
                            {tg.bonusLabel}
                        </div>
                    </motion.div>
                </div>

                <div style={{ marginTop: '24px' }}>
                    <motion.button
                        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        disabled={loading}
                        onClick={handleJoin}
                        style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '16px',
                            borderRadius: '14px',
                            fontSize: '16px',
                            fontWeight: 800,
                            fontFamily: "'Outfit', sans-serif",
                            cursor: loading ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 6px 24px rgba(59, 130, 246, 0.4)',
                            transition: 'all 0.2s',
                            opacity: loading ? 0.75 : 1,
                        }}
                    >
                        Join & See Proofs <ArrowRight size={20} />
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default OnboardingTelegram;
