'use client';

import { useEffect, useMemo } from 'react';
import { useJourney } from '@/lib/JourneyContext';
import { TIMING } from '@/lib/journey';
import { CamVideo, SecuredFooter } from '@/components/shared';

const HangupIcon = (
  <svg viewBox="0 0 24 24">
    <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 010-1.41C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.74-1.69-1.36-2.67-1.85a.998.998 0 01-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
  </svg>
);

const AudioBars = ({ size }: { size: 'big' | 'small' }) => (
  <div className={`call-audio ${size}`}>
    <svg viewBox="0 0 24 24">
      <path d="M7 9h2v6H7zm4-4h2v14h-2zm4 6h2v4h-2z" />
    </svg>
  </div>
);

/** SS3 — Agent video call. Jumps to the read-the-code step after 3 minutes
 *  (or immediately when "c" is pressed, a demo shortcut from the prototype). */
export function VideoCallScreen() {
  const { go, restart, holdMusic } = useJourney();

  useEffect(() => {
    // Entering the call: stop hold music, play the connect chime.
    holdMusic.stopHold();
    holdMusic.chime();

    const t = setTimeout(() => go('readCode'), TIMING.codeStepDelay);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'c') go('readCode');
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="screen call-screen active" id="screenVideoCall">
      <div className="call-topbar">
        <span className="call-net">
          <svg viewBox="0 0 24 24">
            <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
          </svg>
          STRONG
        </span>
        <span className="call-kbps">
          <svg viewBox="0 0 24 24">
            <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" />
          </svg>
          214 kbps
        </span>
        <span className="call-kbps">
          <svg viewBox="0 0 24 24">
            <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z" />
          </svg>
          145 kbps
        </span>
        <svg className="call-fs" viewBox="0 0 24 24">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
        </svg>
      </div>
      <div className="call-main">
        <CamVideo id="callMainVideo" />
        <AudioBars size="big" />
        <div className="call-pip">
          <CamVideo id="callPipVideo" />
          <div className="call-stamp">
            Date: 27/07/2025
            <br />
            Time: 12:41:43
            <br />
            Latitude: 19.10427
            <br />
            Longitude: 72.886307
          </div>
          <AudioBars size="small" />
        </div>
      </div>
      <div className="call-controls">
        <button className="call-ctrl">
          <svg viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        </button>
        <button className="call-ctrl">
          <svg viewBox="0 0 24 24">
            <path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 3c1.63 0 3.06.79 3.98 2H14v2h5V6h-2v1.14C15.76 5.83 13.98 5 12 5c-2.8 0-5.19 1.66-6.3 4.03l1.84.55C8.35 8.06 10.03 7 12 7zm0 10c-1.63 0-3.06-.79-3.98-2H10v-2H5v5h2v-1.14C8.24 18.17 10.02 19 12 19c2.8 0 5.19-1.66 6.3-4.03l-1.84-.55C15.65 15.94 13.97 17 12 17z" />
          </svg>
        </button>
        <button className="call-ctrl">
          <svg viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </button>
        <button className="call-ctrl">
          <svg viewBox="0 0 24 24">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
          </svg>
        </button>
        <button className="call-ctrl hangup" onClick={restart}>
          {HangupIcon}
        </button>
      </div>
      <div className="call-issues">
        <button className="call-issue">Can&apos;t See</button>
        <button className="call-issue">Can&apos;t Hear</button>
      </div>
      <SecuredFooter variant="doc" />
    </div>
  );
}

/** SS4 — Read-the-code: agent asks the customer to read a 4-digit code aloud. */
export function ReadCodeScreen() {
  const { restart } = useJourney();

  const stamp = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      date: `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    };
  }, []);

  return (
    <div className="screen call-screen code-screen active" id="screenReadCode">
      <div className="call-topbar">
        <span className="call-net">
          <svg viewBox="0 0 24 24">
            <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
          </svg>
          STRONG
        </span>
        <span className="call-kbps up">
          <svg viewBox="0 0 24 24">
            <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" />
          </svg>
          118 kbps
        </span>
        <span className="call-kbps down">
          <svg viewBox="0 0 24 24">
            <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z" />
          </svg>
          0 kbps
        </span>
        <svg className="call-fs" viewBox="0 0 24 24">
          <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
        </svg>
      </div>
      <div className="code-stage">
        <CamVideo id="codeMainVideo" />
        <AudioBars size="big" />
        <div className="code-panel">
          <div className="code-digits" id="codeDigits">
            9-1-4-1
          </div>
          <div className="code-hint">Read these digits aloud</div>
        </div>
      </div>
      <div className="call-controls">
        <button className="call-ctrl">
          <svg viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        </button>
        <button className="call-ctrl">
          <svg viewBox="0 0 24 24">
            <path d="M12 4V1L8 5l4 4V6c2.21 0 4 1.79 4 4 0 .68-.17 1.32-.47 1.88l1.46 1.46A5.94 5.94 0 0018 10c0-3.31-2.69-6-6-6zm0 12c-2.21 0-4-1.79-4-4 0-.68.17-1.32.47-1.88L7.01 8.66A5.94 5.94 0 006 12c0 3.31 2.69 6 6 6v3l4-4-4-4v3z" />
          </svg>
        </button>
        <button className="call-ctrl">
          <svg viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </button>
        <button className="call-ctrl hangup" onClick={restart}>
          {HangupIcon}
        </button>
      </div>
      <div className="call-issues">
        <button className="call-issue">Can&apos;t See</button>
        <button className="call-issue">Can&apos;t Hear</button>
      </div>
      <div className="code-pip">
        <CamVideo id="codePipVideo" />
        <div className="call-stamp" id="codeStamp">
          Date: {stamp.date}
          <br />
          Time: {stamp.time}
          <br />
          Latitude: 19.105564
          <br />
          Longitude: 72.88121
        </div>
        <button className="code-more">
          <svg viewBox="0 0 24 24">
            <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>
      </div>
      <SecuredFooter variant="doc" />
    </div>
  );
}
