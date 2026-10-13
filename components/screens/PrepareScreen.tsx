'use client';

import { useEffect, useState } from 'react';
import { useJourney } from '@/lib/JourneyContext';
import { TIMING } from '@/lib/journey';
import { CamVideo } from '@/components/shared';

/** Screen 1 — Prepare for recording. Simulates face detection, then enables Start. */
export function PrepareScreen() {
  const { go } = useJourney();
  const [faceVisible, setFaceVisible] = useState(false);

  useEffect(() => {
    setFaceVisible(false);
    const t = setTimeout(() => setFaceVisible(true), TIMING.prepareFaceDetect);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="screen screen-prepare active" id="screenPrepare">
      <div className="prepare-title">Prepare For Recording</div>
      <div className="prepare-video-wrap">
        <CamVideo id="prepareVideo" />
        <div className="face-oval" />
      </div>
      <div className="prepare-spacer" />
      <div className="prepare-instructions">
        Position your face into the oval
        <br />
        Ensure your face is clearly visible
      </div>
      <div className={`prepare-status-pill${faceVisible ? ' visible' : ''}`} id="prepareStatusPill">
        {faceVisible ? 'Click start to continue the journey' : 'Face not visible'}
      </div>
      <button
        className="start-btn"
        id="prepareStartBtn"
        onClick={() => go('capture')}
        disabled={!faceVisible}
      >
        Start
      </button>
      <div className="secured-footer">
        <span>Secured by</span>
        <span style={{ fontWeight: 800, letterSpacing: '-0.5px', fontSize: 15, color: '#8a8f98' }}>
          ID<span style={{ color: '#c9ccd1' }}>fy</span>
        </span>
      </div>
    </div>
  );
}
