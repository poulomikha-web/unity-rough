'use client';

import { useEffect } from 'react';
import { useJourney } from '@/lib/JourneyContext';
import { TIMING } from '@/lib/journey';
import { CamVideo, SecuredFooter, UniHeader } from '@/components/shared';

/** KYC gateway — "Verification is in progress" over the live selfie feed. */
export function CompareScreen() {
  const { go } = useJourney();

  useEffect(() => {
    const t = setTimeout(() => go('success'), TIMING.verifyDuration);
    return () => clearTimeout(t);
  }, [go]);

  return (
    <div className="screen face-compare-screen active" id="screenCompare">
      <UniHeader />
      <div className="verify-stage">
        <CamVideo id="verifyVideo" />
        <div className="verify-scrim" />
        <div className="verify-overlay">
          <div className="verify-ring" />
          <div className="verify-title">
            Verification is in progress<span className="verify-dots" />
          </div>
        </div>
      </div>
      <SecuredFooter variant="doc" />
    </div>
  );
}
