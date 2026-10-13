'use client';

import { useEffect, useState } from 'react';
import { useJourney } from '@/lib/JourneyContext';
import { TIMING } from '@/lib/journey';
import { CamVideo, SecuredFooter } from '@/components/shared';

/** Waiting-for-agent screen with an estimated-wait countdown + hold music. */
export function SuccessScreen() {
  const { go, restart, holdMusic } = useJourney();
  const [secs, setSecs] = useState<number>(TIMING.waitCountdownFrom);

  useEffect(() => {
    let s = TIMING.waitCountdownFrom;
    setSecs(s);
    holdMusic.startHold();
    const tick = setInterval(() => {
      s -= 1;
      setSecs(Math.max(s, 0));
      if (s <= 0) {
        clearInterval(tick);
        go('connecting');
      }
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="screen wait-screen active" id="screenSuccess" onClick={restart}>
      <div className="wait-topbar">
        <div className="wait-eta">
          <span>Estimated wait time</span>
          <span className="wait-sep">|</span>
          <span id="waitSecs">{secs} s</span>
        </div>
      </div>
      <div className="wait-video-wrap">
        <CamVideo id="waitVideo" />
        <div className="wait-dress">Please be appropriately dressed for the call</div>
      </div>
      <div className="wait-tips">
        <div className="wait-tip">
          <div className="wt-circle">
            <svg className="wt-phone" viewBox="0 0 40 40">
              <rect x="12" y="6" width="20" height="30" rx="4" fill="#e9edf3" stroke="#c3ccd8" strokeWidth="1.5" />
              <rect x="12" y="6" width="20" height="7" rx="4" fill="#20242c" />
              <circle cx="16" cy="24" r="6" fill="#dbe6fb" />
              <path d="M17.5 21.5 15 24l2.5 2.5" fill="none" stroke="#214698" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 24h4.5" stroke="#214698" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span className="wt-x">
              <svg viewBox="0 0 24 24">
                <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </span>
          </div>
          <div className="wt-label">Don&apos;t press back button</div>
        </div>
        <div className="wait-tip">
          <div className="wt-circle">
            <svg className="wt-phone" viewBox="0 0 40 40">
              <rect x="9" y="6" width="18" height="30" rx="4" fill="#fff" stroke="#20242c" strokeWidth="1.6" />
              <text x="26" y="16" fontSize="9" fontWeight="700" fill="#214698" fontFamily="Inter">Z</text>
              <text x="30" y="11" fontSize="6" fontWeight="700" fill="#7c93e6" fontFamily="Inter">z</text>
            </svg>
            <span className="wt-x">
              <svg viewBox="0 0 24 24">
                <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </span>
          </div>
          <div className="wt-label">Don&apos;t let the screen sleep</div>
        </div>
        <div className="wait-tip">
          <div className="wt-circle">
            <svg className="wt-phone" viewBox="0 0 40 40">
              <rect x="16" y="9" width="16" height="26" rx="3.5" fill="#dbe6fb" stroke="#b9c8ee" strokeWidth="1.4" />
              <rect x="10" y="6" width="16" height="26" rx="3.5" fill="#fff" stroke="#20242c" strokeWidth="1.6" />
            </svg>
            <span className="wt-x">
              <svg viewBox="0 0 24 24">
                <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </span>
          </div>
          <div className="wt-label">Don&apos;t put app in background</div>
        </div>
      </div>
      <SecuredFooter variant="doc" />
    </div>
  );
}
