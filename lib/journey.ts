// ============================================================================
// Journey model — screen ids, the onboarding sequence, permission popup copy,
// and all the timing constants. Ported 1:1 from the HTML prototype so the
// rebuilt flow behaves identically.
// ============================================================================

export type Screen =
  | 'redirect'
  | 'kycWelcome'
  | 'obPermIntro'
  | 'obLocation'
  | 'obCamera'
  | 'obMic'
  | 'obSuccess'
  | 'obInternet'
  | 'obStrong'
  | 'capture'
  | 'panFront'
  | 'panCaptured'
  | 'panVerify'
  | 'compare'
  | 'success'
  | 'connecting'
  | 'videoCall'
  | 'readCode';

export type PermKind = 'location' | 'camera' | 'microphone';

export interface OnboardStep {
  screen: Screen;
  /** Auto-advance after this many ms (null => waits for a user action). */
  dur?: number | null;
  /** Shows the simulated browser permission popup; waits for "Allow". */
  perm?: PermKind;
}

// Order matters — mirrors OB_SEQUENCE in the prototype.
export const OB_SEQUENCE: OnboardStep[] = [
  { screen: 'obPermIntro', dur: null }, // manual: waits for "Proceed"
  { screen: 'obLocation', perm: 'location' }, // manual: waits for "Allow"
  { screen: 'obCamera', perm: 'camera' }, // manual: waits for "Allow"
  { screen: 'obMic', perm: 'microphone' }, // manual: waits for "Allow"
  { screen: 'obSuccess', dur: 1600 },
  { screen: 'obInternet', dur: 2200 },
  { screen: 'obStrong', dur: 1400 },
];

export const PERM_INFO: Record<PermKind, { what: string; icon: string }> = {
  location: {
    what: 'know your location',
    icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z',
  },
  camera: {
    what: 'use your camera',
    icon: 'M12 15.2c1.77 0 3.2-1.43 3.2-3.2s-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2 1.43 3.2 3.2 3.2zM9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z',
  },
  microphone: {
    what: 'use your microphone',
    icon: 'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z',
  },
};

// ---- Timing constants (ms) ----
export const TIMING = {
  redirect: 5000, // secure-page loader before KYC welcome
  panCapturedHold: 1700, // "Captured!" -> verify screen
  panUploading: 1700, // "Uploading..." -> "Verifying Document..."
  panVerified: 3600, // verify enter -> "Document Verified" + Continue
  verifyDuration: 6000, // "Verification in progress" hold
  waitCountdownFrom: 6, // estimated wait seconds on the success screen
  connecting: 2600, // "Connecting to agent..." -> video call (demo)
  liveConnectTimeout: 20000, // live call: give ICE this long before showing the call anyway
  codeStepDelay: 3 * 60 * 1000, // call -> read-the-code (3 minutes)
  selfieFaceDetect: 2600, // selfie modal: detect face
  selfieRetakeDetect: 2000, // after retake
} as const;

export const CIRCUMFERENCE = 2 * Math.PI * 32; // consent timer ring, r=32

// Synthesised hold-music melody (frequencies in Hz) + playback settings.
export const HOLD_NOTES = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.0, 698.46];
export const HOLD_VOLUME = 0.075;
