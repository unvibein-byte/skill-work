import { useEffect, useState } from 'react';
import { DEFAULT_PRO_PRICING, getHowToWorkConfig, isDirectVideoUrl } from '../../firebase';
import PaymentWebView from '../../components/PaymentWebView';
import TaskDetails from '../TaskDetails';
import AppLogo from '../../components/AppLogo';
import { resolveTaskReward } from '../../utils/dummyTasks';

// ─── Task Data ────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    name: 'Document Digitization', emoji: '📄', category: 'Basic', difficulty: 'Easy',
    banner: 'linear-gradient(135deg,#7F56D9 0%,#9B72EF 100%)',
    accentColor: '#7F56D9', bgLight: 'rgba(127,86,217,0.08)',
    reward: 105, avgTime: '15 mins',
    tagline: 'Convert scanned images into editable PDF format.',
    description: 'You will be given a scanned document. Type out the content into a clean, well-formatted PDF and upload it back.',
    pdfUrl: '/pdfs/task-digitization.pdf',
    steps: ['Download the scanned document PDF below','Open in Adobe Acrobat, Smallpdf, or ILovePDF','Type out the content with correct formatting','Export as PDF and upload your edited file'],
  },
  {
    name: 'Legal Watermarking', emoji: '⚖️', category: 'Legal', difficulty: 'Easy',
    banner: 'linear-gradient(135deg,#027A48 0%,#12B76A 100%)',
    accentColor: '#027A48', bgLight: 'rgba(2,122,72,0.08)',
    reward: 150, avgTime: '10 mins',
    tagline: 'Add "Confidential" watermarks to legal contracts.',
    description: 'Download the contract PDF. Add a diagonal semi-transparent "CONFIDENTIAL" watermark on every page and re-upload.',
    pdfUrl: '/pdfs/task-watermarking.pdf',
    steps: ['Download the contract PDF below','Open in any editor that supports watermarking (Smallpdf, PDF24)','Add diagonal semi-transparent "CONFIDENTIAL" text watermark','Export and upload the watermarked PDF'],
  },
  {
    name: 'Invoice Correction', emoji: '🧾', category: 'Finance', difficulty: 'Easy',
    banner: 'linear-gradient(135deg,#B54708 0%,#F79009 100%)',
    accentColor: '#B54708', bgLight: 'rgba(181,71,8,0.08)',
    reward: 180, avgTime: '20 mins',
    tagline: 'Fix misaligned text and data errors in tax invoices.',
    description: `Download the invoice PDF. Correct all misaligned columns, fix totals, and ensure GST details are properly spaced. Re-upload the corrected file.`,
    pdfUrl: '/pdfs/task-invoice.pdf',
    steps: ['Download the invoice PDF below','Open in a PDF editor and identify all alignment errors','Fix column widths, row heights, and totals','Export corrected PDF and upload below'],
  },
  {
    name: 'Resume Formatting', emoji: '📝', category: 'Career', difficulty: 'Easy',
    banner: 'linear-gradient(135deg,#175CD3 0%,#2E90FA 100%)',
    accentColor: '#175CD3', bgLight: 'rgba(23,92,211,0.08)',
    reward: 200, avgTime: '25 mins',
    tagline: 'Polish layouts, margins and fonts for resumes.',
    description: `Download the resume PDF. Fix fonts to Inter/Arial 11pt, set 1-inch margins, bold section headings, and align bullet points. Re-upload.`,
    pdfUrl: '/pdfs/task-resume.pdf',
    steps: ['Download the resume PDF below','Set fonts to Inter/Arial 11pt, margins 1 inch all sides','Ensure headings are bold and bullets are aligned','Export as PDF and upload the polished version'],
  },
  {
    name: 'Medical Redaction', emoji: '🏥', category: 'Medical', difficulty: 'Hard',
    banner: 'linear-gradient(135deg,#C11574 0%,#EE46BC 100%)',
    accentColor: '#C11574', bgLight: 'rgba(193,21,116,0.08)',
    reward: 550, avgTime: '30 mins',
    tagline: 'Redact sensitive patient info from medical reports.',
    description: `Download the medical report PDF. Black-out all personally identifiable information using solid black rectangles. Ensure no PII is visible and re-upload.`,
    pdfUrl: '/pdfs/task-medical.pdf',
    steps: ['Download the medical report PDF below','Identify all PII: name, DOB, ID numbers, address','Apply solid black redaction blocks over each PII field','Export and upload — confirm no PII visible'],
  },
  {
    name: 'Signature Page Setup', emoji: '✍️', category: 'Legal', difficulty: 'Easy',
    banner: 'linear-gradient(135deg,#344054 0%,#667085 100%)',
    accentColor: '#344054', bgLight: 'rgba(52,64,84,0.08)',
    reward: 120, avgTime: '12 mins',
    tagline: 'Add signature placeholders to contract PDFs.',
    description: 'Download the contract PDF and add properly formatted signature blocks on the last page as per instructions. Re-upload.',
    pdfUrl: '/pdfs/task-signature.pdf',
    steps: ['Download the contract PDF below','Locate or add a signature section on the last page','Insert formatted signature placeholder blocks for both parties','Export and upload the updated PDF'],
  },
  {
    name: 'Brochure Layout Fix', emoji: '🖼️', category: 'Design', difficulty: 'Medium',
    banner: 'linear-gradient(135deg,#D92D8A 0%,#F97066 100%)',
    accentColor: '#D92D8A', bgLight: 'rgba(217,45,138,0.08)',
    reward: 300, avgTime: '20 mins',
    tagline: 'Fix overlapping text and images in brochure PDFs.',
    description: 'Download the brochure PDF. Reposition any overlapping images and text boxes so nothing overlaps. Re-upload the corrected file.',
    pdfUrl: '/pdfs/task-brochure.pdf',
    steps: ['Download the brochure PDF below','Open in PDF editor and identify overlapping regions','Adjust element positions so nothing overlaps','Export and upload the corrected brochure'],
  },
  {
    name: 'Table Extraction', emoji: '📊', category: 'Finance', difficulty: 'Medium',
    banner: 'linear-gradient(135deg,#0086C9 0%,#36BFFA 100%)',
    accentColor: '#0086C9', bgLight: 'rgba(0,134,201,0.08)',
    reward: 260, avgTime: '18 mins',
    tagline: 'Extract and reformat table data from scanned PDFs.',
    description: 'Download the scanned PDF containing tables. Recreate each table in a new structured PDF with proper alignment and borders.',
    pdfUrl: '/pdfs/task-table.pdf',
    steps: ['Download the scanned PDF below','Identify all tables and their data','Recreate tables with proper borders and alignment in a PDF editor','Upload the re-created structured PDF'],
  },
  {
    name: 'Certificate Generation', emoji: '🏆', category: 'Basic', difficulty: 'Easy',
    banner: 'linear-gradient(135deg,#DC6803 0%,#FDB022 100%)',
    accentColor: '#DC6803', bgLight: 'rgba(220,104,3,0.08)',
    reward: 120, avgTime: '10 mins',
    tagline: 'Fill in names and details on certificate templates.',
    description: 'Download the certificate template PDF. Fill in the provided name and details using a PDF editor. Export and upload.',
    pdfUrl: '/pdfs/task-certificate.pdf',
    steps: ['Download the certificate template PDF below','Fill in the name and details as required','Ensure font and alignment match the template style','Export and upload the completed certificate'],
  },
  {
    name: 'Form Completion', emoji: '📋', category: 'Basic', difficulty: 'Easy',
    banner: 'linear-gradient(135deg,#099250 0%,#3CCB7F 100%)',
    accentColor: '#099250', bgLight: 'rgba(9,146,80,0.08)',
    reward: 105, avgTime: '8 mins',
    tagline: 'Fill out standard form templates with provided data.',
    description: 'Download the blank form PDF. Fill in all fields with the sample data provided in the task description. Upload the completed form.',
    pdfUrl: '/pdfs/task-form.pdf',
    steps: ['Download the blank form PDF below','Fill every field with the exact values listed','Double-check no fields are left blank','Save and upload the completed form PDF'],
  },
];

const FREE_LIMIT = 15;
const PRO_LIMIT  = 50;

const TASKS = Array.from({ length: PRO_LIMIT }, (_, i) => {
  const t = TEMPLATES[i % TEMPLATES.length];
  const v = Math.floor(i / TEMPLATES.length) + 1;
  const baseReward = t.reward + (v - 1) * 10;
  return {
    ...t,
    id: i + 1,
    likes: (i * 7 + 3) % 22 + 1,
    name: v > 1 ? `${t.name} (Part ${v})` : t.name,
    reward: resolveTaskReward(baseReward, t.difficulty || 'Easy'),
  };
});

const CATEGORY_COLORS = {
  Basic: '#7F56D9', Legal: '#027A48', Finance: '#B54708',
  Career: '#175CD3', Medical: '#C11574', Design: '#D92D8A',
};

const HOW_TO_STEPS = [
  { label: 'Pick Task', icon: '📋' },
  { label: 'Choose Mode', icon: '📝' },
  { label: 'Complete Task', icon: '✅' },
];

// ─── How To Work Modal ────────────────────────────────────────────────────────
const HowToWorkModal = ({ onClose, config, isPro, onOpenPage }) => {
  const hasVideo = Boolean(config?.videoUrl);
  const hasPage = Boolean(config?.pageUrl);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 28, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
            {config?.pageTitle || 'How To Work'}
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {HOW_TO_STEPS.map((s, i) => (
            <div key={i} style={{ flex: 1, background: '#f8f9fc', borderRadius: 12, padding: '10px 6px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {hasVideo && (
          <div style={{ background: '#f8f9fc', padding: 10, borderRadius: 16, border: '1px solid var(--border-color)', marginBottom: 14 }}>
            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
              {isDirectVideoUrl(config.videoUrl) ? (
                <video
                  src={config.videoUrl}
                  controls
                  playsInline
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <iframe
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                  src={config.videoUrl}
                  title={config.pageTitle || 'How To Work'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        )}

        {hasPage && (
          <button
            type="button"
            className="btn-blue"
            style={{ marginBottom: 12 }}
            onClick={() => onOpenPage(config.pageUrl, config.pageTitle)}
          >
            📖 Open Tutorial Guide
          </button>
        )}

        {!hasVideo && !hasPage && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
            Tutorial video is not configured yet. Add <strong>videoUrl</strong> or <strong>pageUrl</strong> in Firebase → config/how_to_work.
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--green-light)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--green-border)' }}>
          <span style={{ fontSize: 24 }}>🪙</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>₹100 Per Work</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Earn up to ₹{isPro ? '5,000' : '1,500'} daily</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Upgrade Modal ────────────────────────────────────────────────────────────
const UpgradeModal = ({ onClose, onUpgrade, onNavigateToPayment, proPriceAmount }) => {
  const handleUpgradeClick = async () => {
    const success = await onUpgrade();
    if (!success) {
      onClose();
      onNavigateToPayment();
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ paddingBottom: 36 }}>
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          {/* Crown glow */}
          <div style={{ width: 80, height: 80, margin: '0 auto 16px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(127,86,217,0.15),rgba(255,107,107,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, border: '2px solid rgba(127,86,217,0.2)' }}>
            👑
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 8 }}>Upgrade to Pro</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
            Unlock <strong style={{ color: '#7F56D9' }}>50 PDF tasks/day</strong> and earn up to{' '}
            <strong style={{ color: 'var(--green)' }}>₹5,000 daily</strong>
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {[
              { icon: '📋', label: '50 tasks/day',     sub: 'vs 15 on Free'      },
              { icon: '💰', label: '₹5,000/day max',   sub: 'vs ₹1,500 on Free'  },
              { icon: '⚡', label: '24-hr payouts',    sub: 'vs 48 hrs on Free'   },
              { icon: '🎯', label: 'Priority tasks',   sub: 'Higher reward tasks' },
            ].map((c, i) => (
              <div key={i} style={{ background: '#f8f9fc', borderRadius: 14, padding: '14px 12px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          <button onClick={handleUpgradeClick} className="btn-purple" style={{ marginBottom: 10 }}>
            👑 Upgrade Now — ₹{proPriceAmount} Lifetime
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)', width: '100%', padding: '8px' }}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Task Card ────────────────────────────────────────────────────────────────
const TaskCard = ({ task, locked, claimed, onPress }) => (
  <div
    onClick={() => !claimed && onPress(task, locked)}
    style={{
      background: claimed ? '#f8fdf8' : 'white',
      borderRadius: 20, overflow: 'hidden',
      border: claimed ? '1.5px solid var(--green-border)' : '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-card)',
      cursor: claimed ? 'default' : 'pointer',
      marginBottom: 14, opacity: locked ? 0.72 : 1,
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
    onMouseOver={e => { if (!locked && !claimed) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-elevated)'; } }}
    onMouseOut={e  => { e.currentTarget.style.transform = 'translateY(0)';  e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
  >
    {/* Gradient banner */}
    <div style={{ background: (claimed || locked) ? 'linear-gradient(135deg,#d1d5db,#e5e7eb)' : task.banner, height: 88, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', right: -20, top: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
      <div style={{ position: 'absolute', left: -10, bottom: -20, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
      <span style={{ fontSize: 34, filter: (claimed || locked) ? 'grayscale(1) brightness(0.8)' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))', position: 'relative', zIndex: 1 }}>{task.emoji}</span>
      {/* Category pill */}
      <div style={{ position: 'absolute', left: 12, top: 10, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)', borderRadius: 100, padding: '3px 10px', border: '1px solid rgba(255,255,255,0.15)' }}>
        <span style={{ fontSize: 10, color: 'white', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{task.category}</span>
      </div>
      {/* Status badge */}
      <div style={{ position: 'absolute', right: 12, top: 10, background: claimed ? 'rgba(0,195,126,0.85)' : 'rgba(0,0,0,0.3)', backdropFilter: 'blur(6px)', borderRadius: 100, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.15)' }}>
        <span style={{ fontSize: 12, color: 'white', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
          {claimed ? '✅ Claimed' : locked ? '🔒 Pro' : `₹${task.reward}`}
        </span>
      </div>
    </div>
    {/* Card body */}
    <div style={{ padding: '14px 16px' }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: (claimed || locked) ? 'var(--text-secondary)' : 'var(--text-primary)', marginBottom: 4, fontFamily: 'var(--font-display)' }}>{task.name}</div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>{task.tagline}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f8f9fc', borderRadius: 100, padding: '5px 10px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: 12 }}>⏱️</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>~{task.avgTime}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f8f9fc', borderRadius: 100, padding: '5px 10px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: 12 }}>👍</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{task.likes}</span>
        </div>
        <div style={{ marginLeft: 'auto', padding: '5px 14px', borderRadius: 100,
          background: claimed ? 'var(--green-light)' : locked ? 'rgba(127,86,217,0.1)' : 'var(--green-light)',
          border: `1px solid ${claimed ? 'var(--green-border)' : locked ? 'rgba(127,86,217,0.2)' : 'var(--green-border)'}`,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: claimed ? 'var(--green)' : locked ? '#7F56D9' : 'var(--green)' }}>
            {claimed ? '✔ Done' : locked ? 'Upgrade →' : 'Start →'}
          </span>
        </div>
      </div>
    </div>
  </div>
);

// ─── Main Task Tab ────────────────────────────────────────────────────────────
const TaskTab = ({ userName, isPro, onUpgrade, onTaskComplete, onNavigateToPayment, proPriceAmount = DEFAULT_PRO_PRICING.amount }) => {
  const [showTaskOptions, setShowTaskOptions] = useState(false);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState('pdf');
  const [taskDetailsOpenState, setTaskDetailsOpenState] = useState('select');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showHowToWork, setShowHowToWork] = useState(false);
  const [howToWorkConfig, setHowToWorkConfig] = useState(null);
  const [howToWorkWebView, setHowToWorkWebView] = useState(null);
  const [doneIds, setDoneIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sw_done_ids') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    let active = true;
    getHowToWorkConfig().then((config) => {
      if (active) setHowToWorkConfig(config);
    });
    return () => { active = false; };
  }, []);

  const handleSelectTask = (task, locked) => {
    const body = document.querySelector('.screen-body');
    if (body) body.scrollTo({ top: 0, behavior: 'smooth' });
    if (locked) {
      setShowUpgrade(true);
      return;
    }
    setSelectedTaskType('pdf');
    setShowTaskOptions(true);
  };

  const handleTaskDone = (reward) => {
    try { setDoneIds(JSON.parse(localStorage.getItem('sw_done_ids') || '[]')); } catch {}
    if (onTaskComplete) onTaskComplete(reward);
    setShowTaskDetails(false);
    setTaskDetailsOpenState('select');
  };

  const handleUpgrade = () => { onUpgrade(); setShowUpgrade(false); };

  return (
    <div>
      {/* ── HERO HEADER ── */}
      <div style={{
        background: 'linear-gradient(160deg,#0f1220 0%,#1a2040 55%,#1a3260 100%)',
        padding: '28px 20px 44px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Blobs */}
        <div style={{ position:'absolute', top:-40, right:-30, width:160, height:160, borderRadius:'50%', background:'rgba(67,97,238,0.2)' }} />
        <div style={{ position:'absolute', bottom:-40, left:-20, width:120, height:120, borderRadius:'50%', background:'rgba(0,195,126,0.15)' }} />
        <div style={{ position:'absolute', top:30, right:60, width:60, height:60, borderRadius:'50%', background:'rgba(127,86,217,0.2)' }} />

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <AppLogo size={36} rounded={10} />
            <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', margin: 0, letterSpacing: '-0.3px' }}>
              Daily Tasks
            </h2>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 18, lineHeight: 1.5 }}>
            Choose · Edit · Earn · Get Paid by{' '}
            <span style={{ color: '#4ade80', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, verticalAlign: 'middle' }}>
              <AppLogo size={18} rounded={4} style={{ display: 'inline-block' }} />
              24hrwork
            </span>
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { icon: '🪙', label: '₹100+', sub: 'Per task' },
              { icon: '📋', label: isPro ? '50' : '15', sub: 'Tasks/day' },
              { icon: '⚡', label: '24hrs', sub: 'Payout' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '10px 8px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{s.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'white', fontFamily: 'var(--font-display)' }}>{s.label}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding: '0 16px', marginTop: -20 }}>

        {/* How to use card — content opens from button */}
        <div className="card animate-fade-up" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>How To Use</h3>
            <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, background: 'var(--green-light)', padding: '3px 10px', borderRadius: 100, border: '1px solid var(--green-border)' }}>
              {isPro ? '👑 Pro' : '🆓 Free'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--green-light)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--green-border)', marginBottom: 14 }}>
            <span style={{ fontSize: 24 }}>🪙</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>₹100 Per Work</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Earn up to ₹{isPro ? '5,000' : '1,500'} daily</div>
            </div>
          </div>

          <button className="btn-blue" onClick={() => setShowHowToWork(true)}>
            📖 How To Work
          </button>
        </div>

        {/* Task list header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>PDF Editing Tasks</h3>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
              {isPro ? '50 tasks available today' : `15 free · ${PRO_LIMIT - FREE_LIMIT} locked (Pro)`}
            </p>
          </div>
          {!isPro && (
            <button onClick={() => setShowUpgrade(true)} style={{ background: 'var(--grad-purple)', border: 'none', borderRadius: 100, padding: '6px 14px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 12, color: 'white', boxShadow: 'var(--purple-glow)' }}>
              👑 Upgrade
            </button>
          )}
        </div>

        {/* Task cards */}
        {TASKS.map((task, idx) => {
          const locked = !isPro && idx >= FREE_LIMIT;
          return (
            <div key={task.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(idx, 8) * 0.05}s` }}>
              <TaskCard task={task} idx={idx} locked={locked} claimed={doneIds.includes(task.id)} onPress={handleSelectTask} />
            </div>
          );
        })}

        {/* Pro upgrade banner */}
        {!isPro && (
          <div className="animate-fade-up" style={{ background: 'linear-gradient(160deg,#0f1220 0%,#2d1b69 100%)', borderRadius: 22, padding: '24px 20px', marginBottom: 24, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(127,86,217,0.25)' }} />
            <div style={{ position: 'absolute', bottom: -20, left: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,195,126,0.2)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>👑</div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: 18, marginBottom: 6, fontFamily: 'var(--font-display)' }}>
                Unlock 35 More Tasks
              </div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
                Upgrade to Pro and earn up to <span style={{ color: '#4ade80', fontWeight: 700 }}>₹5,000/day</span>
              </div>
              <button onClick={() => setShowUpgrade(true)} style={{ background: 'linear-gradient(135deg,#00c37e,#00e896)', border: 'none', borderRadius: 100, padding: '12px 28px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 14, color: 'white', boxShadow: 'var(--green-glow)' }}>
                Upgrade to Pro →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showTaskOptions && (
        <div className="modal-overlay" onClick={() => setShowTaskOptions(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 30, background: 'linear-gradient(180deg,#ffffff,#f8fafe)', borderRadius: 28, border: '1px solid rgba(15,18,32,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 12 }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 6, color: 'var(--text-primary)' }}>Pick Your Task Style</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>Choose a task type to open the full-screen task workspace.</p>
              </div>
              <button onClick={() => setShowTaskOptions(false)} style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18, borderRadius: 20, background: 'white', border: '1px solid rgba(15,18,32,0.08)', boxShadow: '0 20px 40px rgba(15,18,32,0.05)' }}>
                <div style={{ width: 52, height: 52, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(23,92,211,0.12)', color: '#175CD3', fontSize: 26 }}>📄</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>PDF Editing</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Fix invoices, contracts, or scanned documents with a smart editor flow.</div>
                </div>
              </div>
              <button onClick={() => { setSelectedTaskType('pdf'); setTaskDetailsOpenState('active'); setShowTaskOptions(false); setShowTaskDetails(true); }} style={{ width: '100%', background: 'linear-gradient(135deg,#175CD3,#2E90FA)', border: 'none', padding: '16px', borderRadius: 16, color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
                Start PDF Task
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18, borderRadius: 20, background: 'white', border: '1px solid rgba(15,18,32,0.08)', boxShadow: '0 20px 40px rgba(15,18,32,0.05)' }}>
                <div style={{ width: 52, height: 52, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(127,86,217,0.12)', color: '#7F56D9', fontSize: 26 }}>👤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Resume Filling</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Fill resume details, format sections, and submit a polished candidate profile.</div>
                </div>
              </div>
              <button onClick={() => { setSelectedTaskType('resume'); setTaskDetailsOpenState('active'); setShowTaskOptions(false); setShowTaskDetails(true); }} style={{ width: '100%', background: 'linear-gradient(135deg,#7F56D9,#A855F7)', border: 'none', padding: '16px', borderRadius: 16, color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
                Start Resume Task
              </button>
            </div>
          </div>
        </div>
      )}
      {showTaskDetails && (
        <TaskDetails
          initialTaskType={selectedTaskType}
          initialTaskState={taskDetailsOpenState}
          onClose={() => { setShowTaskDetails(false); setTaskDetailsOpenState('select'); }}
          onComplete={handleTaskDone}
        />
      )}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} onUpgrade={handleUpgrade} onNavigateToPayment={onNavigateToPayment} proPriceAmount={proPriceAmount} />}
      {showHowToWork && (
        <HowToWorkModal
          config={howToWorkConfig}
          isPro={isPro}
          onClose={() => setShowHowToWork(false)}
          onOpenPage={(url, title) => {
            setShowHowToWork(false);
            setHowToWorkWebView({ url, title: title || 'How To Work' });
          }}
        />
      )}
      {howToWorkWebView && (
        <PaymentWebView
          url={howToWorkWebView.url}
          title={howToWorkWebView.title}
          subtitle="Tutorial guide"
          onClose={() => setHowToWorkWebView(null)}
        />
      )}
    </div>
  );
};

export default TaskTab;
