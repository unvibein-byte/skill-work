import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import PageTransition from '../components/PageTransition';

const OnboardingVideo = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="animate-fade-up">
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Quick Tutorial</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Watch this 2-minute video to master the workflow</p>
        </div>

        <div className="glass-panel animate-fade-up" style={{ padding: '8px', overflow: 'hidden', animationDelay: '0.1s' }}>
          <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000' }}>
            {/* Embedded YouTube video (using a placeholder tutorial video id) */}
            <iframe
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1"
              title="Tutorial Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        <button 
          className="btn-primary animate-fade-up" 
          style={{ marginTop: 'auto', animationDelay: '0.2s' }}
          onClick={() => navigate('/dashboard')}
        >
          Start Earning Tasks <Play size={20} fill="currentColor" />
        </button>
      </div>
    </PageTransition>
  );
};

export default OnboardingVideo;
