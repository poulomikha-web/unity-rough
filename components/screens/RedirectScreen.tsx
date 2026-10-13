'use client';

import { useEffect, useState } from 'react';
import { useJourney } from '@/lib/JourneyContext';
import { TIMING } from '@/lib/journey';
import { SecuredFooter } from '@/components/shared';

/** Secure-page loader shown on entry (and after a hang-up), ~5s, then KYC welcome. */
export function RedirectScreen() {
  const { go } = useJourney();
  const [secs, setSecs] = useState(5);

  useEffect(() => {
    setSecs(5);
    const tick = setInterval(() => {
      setSecs((s) => Math.max(s - 1, 0));
    }, 1000);
    const done = setTimeout(() => go('kycWelcome'), TIMING.redirect);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [go]);

  return (
    <div className="screen screen-redirect active" id="screenRedirect">
      <div className="redirect-header">
        <div className="idfy-badge">
          <span className="uni-logo" />
        </div>
        <div className="rh-title">Self Video KYC</div>
      </div>
      <div className="redirect-body">
        <div className="redirect-shield-wrap">
          <div className="halftone" />
          <svg className="shield" viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg">
            <path d="M60 4 L112 22 V64 C112 98 88 116 60 126 C32 116 8 98 8 64 V22 Z" fill="#2a3f9e" />
            <path d="M60 4 L112 22 V64 C112 98 88 116 60 126 V4 Z" fill="#1e2f7a" />
            <path d="M22 30 C24 26 30 24 34 30 L34 54 L24 54 Z" fill="#4a63c4" opacity="0.5" />
            <rect x="42" y="58" width="36" height="30" rx="4" fill="#e7eaf5" />
            <path d="M48 58 V50 a12 12 0 0 1 24 0 V58" fill="none" stroke="#e7eaf5" strokeWidth="6" />
            <circle cx="60" cy="70" r="5" fill="#2a3f9e" />
            <rect x="57.5" y="70" width="5" height="11" rx="2.5" fill="#2a3f9e" />
          </svg>
        </div>
        <div className="redirect-main">You&apos;re being redirected to a secure page for verification.</div>
        <div className="redirect-sub" id="redirectTimer">
          This may take up to {String(secs).padStart(2, '0')}s
        </div>
        <div className="redirect-safe">
          <svg viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
          </svg>
          <span>Your information is safe with us</span>
        </div>
      </div>
      <SecuredFooter variant="ob" />
    </div>
  );
}
