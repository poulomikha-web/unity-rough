'use client';

import { useEffect, useRef, useState } from 'react';
import { useJourney } from '@/lib/JourneyContext';
import { TIMING } from '@/lib/journey';
import { attachStream, grabFrame } from '@/lib/useCamera';
import { FACE_MESSAGES, useFaceInOval } from '@/lib/useFaceInOval';
import { SecuredFooter, UniHeader } from '@/components/shared';

/** SS2 — Capture selfie, plus the full-screen selfie camera modal (SS3). */
export function CaptureScreen() {
  const { go, camera, selfieUrl, setSelfieUrl } = useJourney();

  const captureVideoRef = useRef<HTMLVideoElement>(null);
  const selfieVideoRef = useRef<HTMLVideoElement>(null);
  const ovalRef = useRef<HTMLDivElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<'live' | 'preview'>('live');
  const [tempUrl, setTempUrl] = useState<string | null>(null);

  // Green oval + shutter only while exactly one face sits fully inside the oval.
  const faceStatus = useFaceInOval(selfieVideoRef, ovalRef, modalOpen && view === 'live');
  // If the detector can't load (offline / old browser), fall back to the
  // prototype's timed "detection" so the journey never gets stuck.
  const [fallbackReady, setFallbackReady] = useState(false);
  useEffect(() => {
    setFallbackReady(false);
    if (faceStatus !== 'unavailable') return;
    const t = setTimeout(() => setFallbackReady(true), TIMING.selfieFaceDetect);
    return () => clearTimeout(t);
  }, [faceStatus]);
  const faceReady = faceStatus === 'ok' || (faceStatus === 'unavailable' && fallbackReady);

  useEffect(() => {
    attachStream(captureVideoRef.current, camera.stream);
  }, [camera.stream]);
  useEffect(() => {
    if (modalOpen) attachStream(selfieVideoRef.current, camera.stream);
  }, [camera.stream, modalOpen, view]);

  const openModal = () => {
    setModalOpen(true);
    setView('live');
  };

  const closeModal = () => setModalOpen(false);

  const captureSelfie = () => {
    if (!faceReady) return;
    const url = grabFrame(selfieVideoRef.current, { mirror: true, placeholder: 'selfie' });
    setTempUrl(url);
    setView('preview');
  };

  const retakeSelfie = () => setView('live');

  const doneSelfie = () => {
    setSelfieUrl(tempUrl);
    closeModal();
  };

  const removeSelfie = () => setSelfieUrl(null);

  return (
    <>
      <div className="screen screen-capture active" id="screenCapture">
        <UniHeader />
        <div className="capture-video-wrap">
          <video id="captureVideo" autoPlay playsInline muted ref={captureVideoRef} />
        </div>
        <div className="capture-bottom">
          <div className="capture-title">Capture Selfie</div>

          <div
            className="capture-dashed"
            id="captureTapBlock"
            style={{ display: selfieUrl ? 'none' : 'block' }}
          >
            <div className="capture-card" id="captureCard" onClick={openModal}>
              <div className="avatar-circle">
                <svg id="captureCardIcon" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <div className="cap-text" id="captureCardText">
                Tap to Capture
              </div>
            </div>
          </div>

          <div
            className="capture-result"
            id="captureResultBlock"
            style={{ display: selfieUrl ? 'flex' : 'none' }}
          >
            <div className="capture-thumb-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img id="captureThumb" alt="Captured selfie" src={selfieUrl ?? undefined} />
            </div>
            <div className="capture-result-actions">
              <button className="retake-img-btn" onClick={openModal}>
                <svg viewBox="0 0 24 24">
                  <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                </svg>
                Retake
              </button>
              <button className="remove-btn" onClick={removeSelfie}>
                <svg viewBox="0 0 24 24">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
                Remove
              </button>
            </div>
          </div>

          <button
            className={`capture-proceed${selfieUrl ? ' enabled' : ''}`}
            id="captureProceedBtn"
            onClick={() => selfieUrl && go('panFront')}
          >
            Proceed
          </button>
        </div>
        <SecuredFooter variant="ob" />
      </div>

      {/* Selfie camera modal (SS3) */}
      <div className={`selfie-modal${modalOpen ? ' active' : ''}`} id="selfieModal">
        <div className="selfie-top">
          <button className="modal-close" onClick={closeModal} aria-label="Close">
            <svg viewBox="0 0 24 24">
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
          <div className="s-title">Capture Selfie</div>
          <div className="s-sub">Keep your face in the frame for selfie</div>
        </div>

        <div className="selfie-live" id="selfieLive" style={{ display: view === 'live' ? 'flex' : 'none' }}>
          <div className="selfie-cam">
            <video id="selfieVideo" autoPlay playsInline muted ref={selfieVideoRef} />
            <div className={`selfie-oval${faceReady ? ' detected' : ''}`} id="selfieOval" ref={ovalRef} />
            <div className={`selfie-status ${faceReady ? 'ok' : 'err'}`} id="selfieStatus">
              {faceReady ? (
                <svg id="selfieStatusIcon" viewBox="0 0 24 24">
                  <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h11.5l-2.5-2.5 1.4-1.4 2.09 2.08 4.08-4.09L23 15.5 18.5 20H23v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              ) : (
                <svg id="selfieStatusIcon" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
              )}
              <span id="selfieStatusText">
                {faceReady ? FACE_MESSAGES.ok : FACE_MESSAGES[faceStatus === 'unavailable' ? 'loading' : faceStatus]}
              </span>
            </div>
          </div>
          <div className="selfie-shutter-bar">
            <button
              className={`selfie-shutter${faceReady ? ' ready' : ''}`}
              id="selfieShutter"
              onClick={captureSelfie}
              disabled={!faceReady}
              aria-label="Capture"
            />
          </div>
        </div>

        <div className="selfie-preview" id="selfiePreview" style={{ display: view === 'preview' ? 'flex' : 'none' }}>
          <div className="selfie-preview-img-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img id="selfiePreviewImg" alt="Captured selfie" src={tempUrl ?? undefined} />
          </div>
          <div className="selfie-preview-actions">
            <button className="btn-retake" onClick={retakeSelfie}>
              Retake
            </button>
            <button className="btn-done" onClick={doneSelfie}>
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
