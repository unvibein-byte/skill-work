import { useEffect, useRef } from 'react';

/**
 * Full-screen in-app WebView (iframe) for QR payment on Capacitor.
 * Keeps the user inside the app instead of an external browser tab.
 */
const PaymentWebView = ({ url, title = 'Payment', subtitle, onClose }) => {
  const iframeRef = useRef(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20000,
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'max(12px, env(safe-area-inset-top)) 14px 12px',
          borderBottom: '1px solid var(--border-color, #e4e7f0)',
          background: '#f8f9fc',
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0, flex: 1, paddingRight: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-display, sans-serif)' }}>
            {title}
          </div>
          {subtitle ? (
            <div style={{ fontSize: 11, color: 'var(--text-muted, #9aa0b8)', marginTop: 2 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: '#e5e7eb',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 800,
            color: '#5a6480',
            flexShrink: 0,
          }}
          aria-label="Close payment"
        >
          ✕
        </button>
      </div>

      <iframe
        ref={iframeRef}
        title={title}
        src={url}
        style={{
          flex: 1,
          width: '100%',
          border: 'none',
          background: '#fff',
        }}
        allow="payment *; clipboard-write"
      />
    </div>
  );
};

export default PaymentWebView;
