'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { OB_SEQUENCE, PERM_INFO, type PermKind, type Screen } from './journey';
import {
  checkPermission,
  emptyPermResults,
  rememberGranted,
  requestCamera,
  requestLocation,
  requestMicrophone,
  wasGranted,
  type PermResults,
} from './permissions';
import { saveUnityRough } from './supabase';
import { useHoldMusic } from './useHoldMusic';
import { useAgentCall, type AgentCall } from './useAgentCall';

interface PermPopup {
  open: boolean;
  kind: PermKind | null;
}

interface CameraState {
  stream: MediaStream | null;
  failed: boolean;
}

interface JourneyValue {
  screen: Screen;
  go: (screen: Screen) => void;
  /** Restart the whole journey (hang-up / loop back to the secure-page loader). */
  restart: () => void;

  camera: CameraState;
  holdMusic: ReturnType<typeof useHoldMusic>;
  /** Live WebRTC call with the agent console (falls back to the demo call). */
  call: AgentCall;
  /** Join the agent queue from the waiting screen; resolves with agents online (-1 = no call server). */
  ringAgent: () => Promise<number>;

  // Onboarding (permissions) sequence
  permPopup: PermPopup;
  permInfo: typeof PERM_INFO;
  startOnboarding: () => void;
  obProceed: () => void;
  permRespond: (allow: boolean) => void;

  // Shared capture artefacts
  selfieUrl: string | null;
  setSelfieUrl: (url: string | null) => void;
  panFrontUrl: string | null;
  setPanFrontUrl: (url: string | null) => void;
}

const JourneyCtx = createContext<JourneyValue | null>(null);

export function useJourney(): JourneyValue {
  const ctx = useContext(JourneyCtx);
  if (!ctx) throw new Error('useJourney must be used inside <JourneyProvider>');
  return ctx;
}

function newSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>('redirect');
  const holdMusic = useHoldMusic();

  // Camera stream is acquired lazily, only once the user grants the camera
  // permission during onboarding — not on page load.
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camFailed, setCamFailed] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const [obIndex, setObIndex] = useState(-1); // -1 => not onboarding
  const [permPopup, setPermPopup] = useState<PermPopup>({ open: false, kind: null });

  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [panFrontUrl, setPanFrontUrl] = useState<string | null>(null);

  // Collected across the permission steps; read when we persist to Supabase.
  const permResultsRef = useRef<PermResults>(emptyPermResults());
  const restartRef = useRef<() => void>(() => {});
  const sessionIdRef = useRef<string>('');
  if (!sessionIdRef.current) sessionIdRef.current = newSessionId();

  const obTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const permTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearObTimers = useCallback(() => {
    if (obTimer.current) clearTimeout(obTimer.current);
    if (permTimer.current) clearTimeout(permTimer.current);
    obTimer.current = null;
    permTimer.current = null;
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const go = useCallback(
    (next: Screen) => {
      clearObTimers();
      setObIndex(-1);
      setPermPopup({ open: false, kind: null });
      setScreen(next);
    },
    [clearObTimers]
  );

  const call = useAgentCall({
    onAccept: () => go('connecting'),
    onCode: () => go('readCode'),
    onHangup: () => restartRef.current(),
  });

  const ringAgent = useCallback(
    () =>
      call.ring(streamRef.current, {
        selfie: selfieUrl,
        pan: panFrontUrl,
        latitude: permResultsRef.current.latitude,
        longitude: permResultsRef.current.longitude,
      }),
    [call, selfieUrl, panFrontUrl]
  );

  const advanceOnboard = useCallback(() => {
    setObIndex((i) => i + 1);
  }, []);

  const startOnboarding = useCallback(() => {
    permResultsRef.current = emptyPermResults();
    sessionIdRef.current = newSessionId();
    setObIndex(0);
  }, []);

  const obProceed = useCallback(() => {
    advanceOnboard();
  }, [advanceOnboard]);

  // Perform (allow) or record a denial for one permission. When allowed and the
  // device hasn't granted it yet this triggers the real native prompt; when the
  // device already granted it, the underlying API resolves silently (no prompt).
  const recordPermission = useCallback(async (kind: PermKind, allow: boolean) => {
    const results = permResultsRef.current;
    if (allow) {
      if (kind === 'camera') {
        const { granted, stream: s } = await requestCamera();
        if (s) {
          streamRef.current = s;
          setStream(s);
        }
        setCamFailed(!granted);
        results.camera = granted;
        if (granted) rememberGranted('camera');
      } else if (kind === 'microphone') {
        const g = (await requestMicrophone()).granted;
        results.microphone = g;
        if (g) rememberGranted('microphone');
      } else if (kind === 'location') {
        const r = await requestLocation();
        results.location = r.granted;
        results.latitude = r.latitude;
        results.longitude = r.longitude;
        results.accuracy = r.accuracy;
        if (r.granted) rememberGranted('location');
      }
    } else {
      if (kind === 'camera') {
        results.camera = false;
        setCamFailed(true);
      } else if (kind === 'microphone') {
        results.microphone = false;
      } else if (kind === 'location') {
        results.location = false;
      }
    }
  }, []);

  // "Allow" / "Deny" on the in-app prompt.
  const permRespond = useCallback(
    async (allow: boolean) => {
      setPermPopup({ open: false, kind: null });
      const kind = OB_SEQUENCE[obIndex]?.perm;
      if (kind) await recordPermission(kind, allow);
      advanceOnboard();
    },
    [obIndex, advanceOnboard, recordPermission]
  );

  // Drive the onboarding sequence whenever the index changes.
  useEffect(() => {
    if (obIndex < 0) return;
    clearObTimers();
    let cancelled = false;

    if (obIndex >= OB_SEQUENCE.length) {
      setObIndex(-1);
      // Persist the collected permission + location data for this run.
      void saveUnityRough({
        session_id: sessionIdRef.current,
        camera_granted: permResultsRef.current.camera,
        microphone_granted: permResultsRef.current.microphone,
        location_granted: permResultsRef.current.location,
        latitude: permResultsRef.current.latitude,
        longitude: permResultsRef.current.longitude,
        accuracy: permResultsRef.current.accuracy,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });
      setScreen('prepare');
      return;
    }

    const step = OB_SEQUENCE[obIndex];
    setScreen(step.screen);

    if (step.perm) {
      const kind = step.perm;
      // Only prompt when the device hasn't already granted it. If it's granted
      // (or we granted it before on a browser that can't report state), acquire
      // silently and move on — no popup, no second native prompt.
      (async () => {
        const state = await checkPermission(kind);
        if (cancelled) return;
        const alreadyGranted = state === 'granted' || (state === 'unsupported' && wasGranted(kind));
        if (alreadyGranted) {
          await recordPermission(kind, true);
          if (!cancelled) advanceOnboard();
        } else {
          permTimer.current = setTimeout(() => setPermPopup({ open: true, kind }), 450);
        }
      })();
    } else if (step.dur != null) {
      obTimer.current = setTimeout(() => advanceOnboard(), step.dur);
    }
    // dur === null && no perm => obPermIntro, waits for obProceed()

    return () => {
      cancelled = true;
      clearObTimers();
    };
  }, [obIndex, advanceOnboard, clearObTimers, recordPermission]);

  const restart = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    holdMusic.stopHold();
    call.hangup();
    clearObTimers();
    stopStream();
    setCamFailed(false);
    permResultsRef.current = emptyPermResults();
    sessionIdRef.current = newSessionId();
    setObIndex(-1);
    setPermPopup({ open: false, kind: null });
    setSelfieUrl(null);
    setPanFrontUrl(null);
    setScreen('redirect');
  }, [holdMusic, call, clearObTimers, stopStream]);
  restartRef.current = restart;

  const value = useMemo<JourneyValue>(
    () => ({
      screen,
      go,
      restart,
      camera: { stream, failed: camFailed },
      holdMusic,
      call,
      ringAgent,
      permPopup,
      permInfo: PERM_INFO,
      startOnboarding,
      obProceed,
      permRespond,
      selfieUrl,
      setSelfieUrl,
      panFrontUrl,
      setPanFrontUrl,
    }),
    [
      screen,
      go,
      restart,
      stream,
      camFailed,
      holdMusic,
      call,
      ringAgent,
      permPopup,
      startOnboarding,
      obProceed,
      permRespond,
      selfieUrl,
      panFrontUrl,
    ]
  );

  return <JourneyCtx.Provider value={value}>{children}</JourneyCtx.Provider>;
}
