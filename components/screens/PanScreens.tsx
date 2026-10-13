'use client';

import { useEffect, useRef, useState } from 'react';
import { useJourney } from '@/lib/JourneyContext';
import { TIMING } from '@/lib/journey';
import { attachStream, grabFrame } from '@/lib/useCamera';
import { SecuredFooter, UniHeader } from '@/components/shared';
import { asset } from '@/lib/asset';

/** PAN — capture front. */
export function PanFrontScreen() {
  const { go, camera, setPanFrontUrl } = useJourney();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    attachStream(videoRef.current, camera.stream);
  }, [camera.stream]);

  const capture = () => {
    setPanFrontUrl(grabFrame(videoRef.current, { placeholder: 'doc' }));
    go('panCaptured');
  };

  return (
    <div className="screen pan-cap-screen active" id="screenPanFront">
      <UniHeader />
      <div className="pan-cap-body">
        <div className="pan-cap-title">Capture PAN Card Front</div>
        <div className="pan-guide">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pan-card-illus" src={asset('/assets/pan-guide.png')} alt="" />
        </div>
        <div className="doc-viewfinder pan-vf scanning">
          <video id="panVideoFront" autoPlay playsInline muted ref={videoRef} />
          <div className="doc-corners">
            <span className="tl" />
            <span className="tr" />
            <span className="bl" />
            <span className="br" />
          </div>
          <div className="scan-line" />
        </div>
        <div className="pan-safe">
          <svg viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" />
          </svg>
          <span>Your documents are safe with us</span>
        </div>
        <div className="pan-controls">
          <div className="pan-ctrl-btn">
            <svg viewBox="0 0 24 24">
              <path d="M7 2v11h3v9l7-12h-4l3-8z" />
            </svg>
          </div>
          <div className="pan-shutter" onClick={capture} />
          <div className="pan-ctrl-btn">
            <svg viewBox="0 0 24 24">
              <path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 3c1.63 0 3.06.79 3.98 2H14v2h5V6h-2v1.14C15.76 5.83 13.98 5 12 5c-2.8 0-5.19 1.66-6.3 4.03l1.84.55C8.35 8.06 10.03 7 12 7zm0 10c-1.63 0-3.06-.79-3.98-2H10v-2H5v5h2v-1.14C8.24 18.17 10.02 19 12 19c2.8 0 5.19-1.66 6.3-4.03l-1.84-.55C15.65 15.94 13.97 17 12 17z" />
            </svg>
          </div>
        </div>
      </div>
      <SecuredFooter variant="doc" />
    </div>
  );
}

/** PAN — "Captured!" confirmation, auto-advances to verify. */
export function PanCapturedScreen() {
  const { go, panFrontUrl } = useJourney();

  useEffect(() => {
    const t = setTimeout(() => go('panVerify'), TIMING.panCapturedHold);
    return () => clearTimeout(t);
  }, [go]);

  return (
    <div className="screen pan-verify-screen active" id="screenPanCaptured">
      <div className="doc-title-center green">Captured !</div>
      <div className="doc-doc-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="pan-card-illus" src={asset('/assets/pan-captured.png')} alt="" />
        <div className="mini-check">
          <svg viewBox="0 0 24 24">
            <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </div>
      </div>
      <div className="doc-viewfinder" style={{ margin: '0 16px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="panCapturedImg" alt="Captured PAN" src={panFrontUrl ?? undefined} />
        <div className="doc-corners">
          <span className="tl" />
          <span className="tr" />
          <span className="bl" />
          <span className="br" />
        </div>
        <div className="doc-vf-spinner" />
      </div>
      <div className="doc-safe-row">
        <svg viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
        </svg>
        <span>Your Documents are safe with us</span>
      </div>
      <div className="doc-shutter-wrap">
        <div className="doc-shutter" />
      </div>
      <SecuredFooter variant="doc" />
    </div>
  );
}

type VerifyPhase = 'uploading' | 'verifying' | 'verified';

/** PAN — verify: Uploading -> Verifying Document -> Document Verified -> Continue. */
export function PanVerifyScreen() {
  const { go, panFrontUrl } = useJourney();
  const [phase, setPhase] = useState<VerifyPhase>('uploading');

  useEffect(() => {
    setPhase('uploading');
    const t1 = setTimeout(() => setPhase('verifying'), TIMING.panUploading);
    const t2 = setTimeout(() => setPhase('verified'), TIMING.panVerified);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const verified = phase === 'verified';

  return (
    <div className="screen pan-verify-screen active" id="screenPanVerify">
      <div className="doc-topbar">
        <div className="doc-title">Verify Capture</div>
      </div>
      <div className="doc-status-wrap">
        <div className={`doc-pill${verified ? ' done' : ''}`} id="verifyPill">
          {verified ? (
            <>
              <svg className="mini-tick" viewBox="0 0 24 24">
                <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              <span>Document Verified</span>
            </>
          ) : (
            <>
              <span className="mini-spin" />
              <span>{phase === 'uploading' ? 'Uploading...' : 'Verifying Document...'}</span>
            </>
          )}
        </div>
      </div>
      <div className="doc-label">PAN</div>
      <div className={`doc-frame${verified ? ' ok' : ''}`} id="verifyFrame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="verifyImg" alt="PAN capture" src={panFrontUrl ?? undefined} />
        {verified && (
          <div className="frame-check">
            <svg viewBox="0 0 24 24">
              <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
        )}
      </div>
      <div className="doc-spacer" />
      <button
        className="doc-continue"
        id="panContinueBtn"
        style={{ display: verified ? 'block' : 'none' }}
        onClick={() => go('compare')}
      >
        Continue
      </button>
      <SecuredFooter variant="doc" />
    </div>
  );
}
