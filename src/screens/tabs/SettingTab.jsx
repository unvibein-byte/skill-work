import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../i18n/LangContext';

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
const Field = ({ label, placeholder, value, onChange, type='text' }) => (
  <div style={{ marginBottom:16 }}>
    <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--text-secondary)', marginBottom:6 }}>{label}</label>
    <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
      style={{ width:'100%', background:'#f0f2f8', border:'1.5px solid var(--border-color)', color:'var(--text-primary)', padding:'12px 14px', borderRadius:12, fontFamily:'var(--font-sans)', fontSize:14, outline:'none', transition:'all 0.2s' }}
      onFocus={e => { e.target.style.border='1.5px solid var(--green)'; e.target.style.background='white'; e.target.style.boxShadow='0 0 0 3px rgba(0,195,126,0.1)'; }}
      onBlur={e  => { e.target.style.border='1.5px solid var(--border-color)'; e.target.style.background='#f0f2f8'; e.target.style.boxShadow='none'; }}
    />
  </div>
);

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
  const [sheet, setSheet] = useState(null); // 'profile'|'bank'|'password'|'kyc'|'support'|'terms'|'language'|'deleteConfirm'|'logoutConfirm'

  // ── form state ──
  const [name,        setName]        = useState(userName);
  const [phone,       setPhone]       = useState(localStorage.getItem('sw_phone') || '');
  const [upi,         setUpi]         = useState(localStorage.getItem('sw_upi')   || '');
  const [bankName,    setBankName]    = useState(localStorage.getItem('sw_bank')   || '');
  const [accNo,       setAccNo]       = useState(localStorage.getItem('sw_acc')    || '');
  const [ifsc,        setIfsc]        = useState(localStorage.getItem('sw_ifsc')   || '');
  const [oldPass,     setOldPass]     = useState('');
  const [newPass,     setNewPass]     = useState('');
  const [toast,       setToast]       = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2400); };

  const toggle = (key, val, setter) => { setter(val); localStorage.setItem(key, String(val)); };

  const saveProfile = () => {
    localStorage.setItem('sw_name', name);
    localStorage.setItem('sw_phone', phone);
    showToast('✅ Profile updated!');
    setSheet(null);
  };

  const saveBank = () => {
    if (!upi && !accNo) { showToast('⚠️ Enter UPI or bank details'); return; }
    localStorage.setItem('sw_upi',  upi);
    localStorage.setItem('sw_bank', bankName);
    localStorage.setItem('sw_acc',  accNo);
    localStorage.setItem('sw_ifsc', ifsc);
    showToast('✅ Payment details saved!');
    setSheet(null);
  };

  const changePassword = () => {
    if (newPass.length < 6) { showToast('⚠️ Password must be 6+ characters'); return; }
    showToast('✅ Password updated!');
    setOldPass(''); setNewPass('');
    setSheet(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('sw_name');
    navigate('/login');
  };

  const handleDeleteAccount = () => {
    localStorage.clear();
    navigate('/login');
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

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', background:'#1a2040', color:'white', padding:'10px 20px', borderRadius:100, fontSize:13, fontWeight:600, zIndex:999, boxShadow:'0 8px 24px rgba(0,0,0,0.3)', whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}

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
          <MenuItem icon="🔒" label={t('change_password')} sub="Update your login password" onClick={() => setSheet('password')} accent="#7F56D9" />
          <MenuItem icon="📱" label={t('kyc')}          sub="Required for withdrawals"    onClick={() => setSheet('kyc')}      accent="#B54708" />
        </div>

        {/* ── SUBSCRIPTION ── */}
        <div className="card animate-fade-up" style={{ overflow:'hidden', marginBottom:14, animationDelay:'0.1s' }}>
          <Section label={t('subscription')} />
          {isPro ? (
            <MenuItem icon="👑" label={t('pro_active')} sub="Lifetime · All features unlocked"
              rightEl={<span style={{ fontSize:11, fontWeight:700, color:'#7F56D9', background:'rgba(127,86,217,0.1)', padding:'4px 10px', borderRadius:100 }}>Active</span>}
              accent="#7F56D9" onClick={() => setSheet('downgrade')} />
          ) : (
            <MenuItem icon="🚀" label={t('upgrade_to_pro')} sub="₹399 Lifetime · 50 tasks/day"
              rightEl={<span style={{ fontSize:11, fontWeight:800, background:'var(--grad-purple)', color:'white', padding:'4px 12px', borderRadius:100 }}>Upgrade</span>}
              onClick={onUpgrade} accent="#7F56D9" />
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
          <Field label="Mobile Number" placeholder="10-digit no" value={phone} onChange={setPhone} type="tel" />
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
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <div style={{ fontSize:52, marginBottom:14 }}>🪪</div>
            <h4 style={{ fontSize:16, fontWeight:800, marginBottom:8, fontFamily:'var(--font-display)' }}>Identity Verification</h4>
            <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:20 }}>
              KYC is required to withdraw your earnings. You need to submit your Aadhaar Card or PAN Card.
            </p>
            <div style={{ display:'grid', gap:10 }}>
              {['📄 Upload Aadhaar Card','🪪 Upload PAN Card','📸 Take Selfie'].map((item, i) => (
                <button key={i} onClick={() => showToast('📤 Upload feature coming soon!')}
                  style={{ width:'100%', padding:'13px', borderRadius:12, background:'#f8f9fc', border:'1.5px solid var(--border-color)', fontFamily:'var(--font-sans)', fontWeight:600, fontSize:14, color:'var(--text-primary)', cursor:'pointer', transition:'all 0.2s' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor='var(--green)'; e.currentTarget.style.background='var(--green-light)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor='var(--border-color)'; e.currentTarget.style.background='#f8f9fc'; }}>
                  {item}
                </button>
              ))}
            </div>
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
          <button onClick={() => showToast('📧 support@skillwork.in')} style={{ width:'100%', padding:'13px', borderRadius:12, background:'var(--green-light)', border:'1.5px solid var(--green-border)', fontFamily:'var(--font-sans)', fontWeight:700, fontSize:14, color:'var(--green)', cursor:'pointer' }}>
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
    </div>
  );
};

export default SettingTab;
