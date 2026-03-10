import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Splash = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate('/login'), 2800);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div style={{ width:'100%', height:'100%', background:'linear-gradient(160deg,#0f1220 0%,#1a2040 60%,#2d1b69 100%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>

      {/* Background blobs */}
      <div style={{ position:'absolute', top:-80, right:-60, width:250, height:250, borderRadius:'50%', background:'rgba(127,86,217,0.15)' }} />
      <div style={{ position:'absolute', bottom:-60, left:-40, width:200, height:200, borderRadius:'50%', background:'rgba(0,195,126,0.12)' }} />
      <div style={{ position:'absolute', top:'40%', right:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,107,107,0.1)' }} />

      <motion.div
        initial={{ scale:0.7, opacity:0, y:20 }}
        animate={{ scale:1, opacity:1, y:0 }}
        transition={{ duration:0.6, ease:[0.16,1,0.3,1] }}
        style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:24, position:'relative', zIndex:1 }}
      >
        {/* Logo */}
        <motion.div
          animate={{ y:[0,-10,0] }}
          transition={{ repeat:Infinity, duration:2.5, ease:'easeInOut' }}
        >
          <div style={{
            width:96, height:96, background:'linear-gradient(135deg,#00c37e,#00e896)',
            borderRadius:28, display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 16px 48px rgba(0,195,126,0.45), 0 0 0 1px rgba(255,255,255,0.1)',
            fontSize:48,
          }}>
            💼
          </div>
        </motion.div>

        {/* Brand name */}
        <div style={{ textAlign:'center' }}>
          <h1 style={{ fontSize:34, fontWeight:900, fontFamily:"'Outfit',sans-serif", letterSpacing:'-0.5px', color:'white' }}>
            Skill<span style={{ color:'#00c37e' }}>Work</span>
          </h1>
          <p style={{ color:'rgba(255,255,255,0.45)', marginTop:8, fontSize:14, fontWeight:500 }}>
            Complete tasks · Earn daily · Get paid
          </p>
        </div>

        {/* Animated dots */}
        <div style={{ display:'flex', gap:8 }}>
          {[0,1,2].map(i => (
            <motion.div
              key={i}
              style={{ width:8, height:8, borderRadius:'50%', background:'var(--green,#00c37e)' }}
              animate={{ opacity:[0.3,1,0.3], scale:[1,1.4,1] }}
              transition={{ repeat:Infinity, duration:1.2, delay:i*0.2 }}
            />
          ))}
        </div>
      </motion.div>

      {/* Bottom tagline */}
      <motion.p
        initial={{ opacity:0, y:20 }}
        animate={{ opacity:1, y:0 }}
        transition={{ delay:0.4, duration:0.5 }}
        style={{ position:'absolute', bottom:40, color:'rgba(255,255,255,0.3)', fontSize:12, fontWeight:500, letterSpacing:'0.5px' }}
      >
        Made with ❤️ in India
      </motion.p>
    </div>
  );
};

export default Splash;
