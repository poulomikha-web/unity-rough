'use client';

import type { ComponentType } from 'react';
import { useJourney } from '@/lib/JourneyContext';
import type { Screen } from '@/lib/journey';
import { IdfyLogoDefs } from '@/components/shared';

import { RedirectScreen } from '@/components/screens/RedirectScreen';
import { KycWelcomeScreen } from '@/components/screens/KycWelcomeScreen';
import {
  ObInternetScreen,
  ObStrongScreen,
  ObPermIntroScreen,
  ObLocationScreen,
  ObCameraScreen,
  ObMicScreen,
  ObSuccessScreen,
  PermPopup,
  PermBlockedSheet,
} from '@/components/screens/OnboardScreens';
import { CaptureScreen } from '@/components/screens/CaptureScreen';
import { PanFrontScreen, PanCapturedScreen, PanVerifyScreen } from '@/components/screens/PanScreens';
import { CompareScreen } from '@/components/screens/CompareScreen';
import { SuccessScreen } from '@/components/screens/SuccessScreen';
import { ConnectingScreen } from '@/components/screens/ConnectingScreen';
import { VideoCallScreen, ReadCodeScreen } from '@/components/screens/CallScreens';

const SCREENS: Record<Screen, ComponentType> = {
  redirect: RedirectScreen,
  kycWelcome: KycWelcomeScreen,
  obPermIntro: ObPermIntroScreen,
  obLocation: ObLocationScreen,
  obCamera: ObCameraScreen,
  obMic: ObMicScreen,
  obSuccess: ObSuccessScreen,
  obInternet: ObInternetScreen,
  obStrong: ObStrongScreen,
  capture: CaptureScreen,
  panFront: PanFrontScreen,
  panCaptured: PanCapturedScreen,
  panVerify: PanVerifyScreen,
  compare: CompareScreen,
  success: SuccessScreen,
  connecting: ConnectingScreen,
  videoCall: VideoCallScreen,
  readCode: ReadCodeScreen,
};

export function JourneyRoot() {
  const { screen } = useJourney();
  const Active = SCREENS[screen];

  return (
    <>
      <IdfyLogoDefs />
      <div className="phone-frame">
        <Active />
        <PermPopup />
        <PermBlockedSheet />
      </div>
    </>
  );
}
