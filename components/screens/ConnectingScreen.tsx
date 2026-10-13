'use client';

import { useEffect } from 'react';
import { useJourney } from '@/lib/JourneyContext';
import { TIMING } from '@/lib/journey';
import { SecuredFooter } from '@/components/shared';

/**
 * "Connecting to agent..." loader before the video call. In a live call it
 * holds until the peer connection is up (with a safety timeout); in the demo
 * call it is a fixed delay.
 */
export function ConnectingScreen() {
  const { go, call } = useJourney();
  const live = call.mode === 'live';

  useEffect(() => {
    if (live && call.status === 'connected') {
      go('videoCall');
      return;
    }
    const t = setTimeout(() => go('videoCall'), live ? TIMING.liveConnectTimeout : TIMING.connecting);
    return () => clearTimeout(t);
  }, [go, live, call.status]);

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
