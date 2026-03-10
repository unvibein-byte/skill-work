import { useNavigate } from 'react-router-dom';
import { ArrowRight, Download, Edit3, Upload, CheckCircle } from 'lucide-react';
import PageTransition from '../components/PageTransition';

const steps = [
  { icon: Download, title: 'Download Task', desc: 'Get your daily PDF task from the dashboard.' },
  { icon: Edit3, title: 'Edit PDF', desc: 'Follow the specific instructions provided for each task.' },
  { icon: Upload, title: 'Re-upload', desc: 'Submit your completed work for review.' },
  { icon: CheckCircle, title: 'Get Paid', desc: 'Earn ₹100 - ₹200 per approved task instantly.' },
];

const OnboardingInstructions = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>How it works</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Your path to daily earning is simple</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {steps.map((step, idx) => (
            <div key={idx} className="glass-panel animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', animationDelay: `${idx * 0.1}s` }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px', borderRadius: '12px' }}>
                <step.icon size={28} color="var(--accent-primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{step.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.4' }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button 
          className="btn-primary animate-fade-up" 
          style={{ marginTop: 'auto', animationDelay: '0.5s' }}
          onClick={() => navigate('/onboarding-2')}
        >
          Got it, Next <ArrowRight size={20} />
        </button>
      </div>
    </PageTransition>
  );
};

export default OnboardingInstructions;
