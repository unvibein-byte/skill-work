import { useCallback, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { EmbeddedWebView } from '../plugins/embeddedWebView';
import { isIframeEmbeddableUrl } from '../utils/embeddableUrl';

/**
 * Full-screen in-app WebView for payments and external pages on Capacitor.
 * Embeddable URLs use an iframe; blocked hosts (e.g. Google Sites) use a native WebView below the header.
 */
const PaymentWebView = ({ url, title = 'Payment', subtitle, onClose }) => {
  const iframeRef = useRef(null);
  const headerRef = useRef(null);
  const useNativeEmbed = Capacitor.isNativePlatform() && !isIframeEmbeddableUrl(url);

  const closeNativeEmbed = useCallback(async () => {
    if (!useNativeEmbed) return;
    try {
      await EmbeddedWebView.close();
    } catch {
      // Plugin may already be closed.
    }
  }, [useNativeEmbed]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    if (!useNativeEmbed) return undefined;

    let cancelled = false;

    const openNativeEmbed = async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (cancelled) return;

      const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 56;
      const topPx = Math.round(headerHeight * (window.devicePixelRatio || 1));

      try {
        await EmbeddedWebView.open({ url, topPx });
      } catch (err) {
        console.error('EmbeddedWebView open failed', err);
      }
    };

    openNativeEmbed();

    return () => {
      cancelled = true;
      closeNativeEmbed();
    };
  }, [url, useNativeEmbed, closeNativeEmbed]);

  const handleClose = async () => {
    await closeNativeEmbed();
    onClose();
  };

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
        background: useNativeEmbed ? 'transparent' : '#fff',
        pointerEvents: useNativeEmbed ? 'none' : 'auto',
      }}
    >
      <div
        ref={headerRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'max(12px, env(safe-area-inset-top)) 14px 12px',
          borderBottom: '1px solid var(--border-color, #e4e7f0)',
          background: '#f8f9fc',
          flexShrink: 0,
          pointerEvents: 'auto',
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
          onClick={handleClose}
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
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {useNativeEmbed ? (
        <div style={{ flex: 1, background: 'transparent' }} aria-hidden="true" />
      ) : (
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
      )}
    </div>
  );
};

export default PaymentWebView;
