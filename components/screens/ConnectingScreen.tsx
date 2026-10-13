'use client';

import { useEffect } from 'react';
import { useJourney } from '@/lib/JourneyContext';
import { TIMING } from '@/lib/journey';
import { SecuredFooter } from '@/components/shared';

/** "Connecting to agent..." loader before the video call. */
export function ConnectingScreen() {
  const { go } = useJourney();

  useEffect(() => {
    const t = setTimeout(() => go('videoCall'), TIMING.connecting);
    return () => clearTimeout(t);
  }, [go]);

  return (
    <div className="screen conn-screen active" id="screenConnecting">
      <div className="conn-inner">
        <div className="conn-spinner" />
        <div className="conn-text">Connecting to agent...</div>
      </div>
      <SecuredFooter variant="doc" />
    </div>
  );
}
