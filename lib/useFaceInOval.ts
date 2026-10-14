'use client';

// ============================================================================
// Live "is the face fully inside the oval?" check for the selfie camera.
//
// Runs MediaPipe's BlazeFace detector in the browser (no server): the model is
// served from public/models, the WASM runtime from jsdelivr (pinned to the
// installed package version). Each frame, the detected face box + keypoints
// are mapped from video pixels to on-screen coordinates (object-fit: cover,
// mirrored) and tested against the oval element.
// ============================================================================

import { useEffect, useRef, useState, type RefObject } from 'react';
import { asset } from './asset';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm';
const MODEL_URL = asset('/models/blaze_face_short_range.tflite');

export type FaceStatus =
  | 'loading' // detector still starting
  | 'none' // no face
  | 'multiple' // more than one face
  | 'outside' // face not fully inside the oval
  | 'far' // too small in the oval
  | 'close' // too big for the oval
  | 'ok' // fully inside → capture allowed
  | 'unavailable'; // detector failed to load (caller decides the fallback)

export const FACE_MESSAGES: Record<FaceStatus, string> = {
  loading: 'Starting face check…',
  none: "Can't Detect Face",
  multiple: 'Only one face please',
  outside: 'Fit your face inside the oval',
  far: 'Move closer',
  close: 'Move back a little',
  ok: 'Ready to Capture',
  unavailable: 'Ready to Capture',
};

// Frames in a row needed to flip state — stops the oval flickering.
const OK_FRAMES = 3;
const BAD_FRAMES = 2;
const MIN_SCORE = 0.6;
const DETECT_EVERY_MS = 100;

type Detector = import('@mediapipe/tasks-vision').FaceDetector;
let detectorPromise: Promise<Detector> | null = null;

function loadDetector(): Promise<Detector> {
  detectorPromise ??= (async () => {
    const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    const make = (delegate: 'GPU' | 'CPU') =>
      FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5,
      });
    return make('GPU').catch(() => make('CPU'));
  })().catch((e) => {
    detectorPromise = null; // allow a retry next time the camera opens
    throw e;
  });
  return detectorPromise;
}

/** Classify one frame's detections against the oval (all in element pixels). */
export function classify(
  video: HTMLVideoElement,
  oval: HTMLElement,
  detections: { boundingBox?: { originX: number; originY: number; width: number; height: number }; keypoints: { x: number; y: number }[]; categories: { score: number }[] }[]
): FaceStatus {
  const faces = detections.filter((d) => (d.categories[0]?.score ?? 0) >= MIN_SCORE && d.boundingBox);
  if (faces.length === 0) return 'none';
  if (faces.length > 1) return 'multiple';

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const vr = video.getBoundingClientRect();
  const or = oval.getBoundingClientRect();
  const border = parseFloat(getComputedStyle(oval).borderTopWidth) || 0;

  // object-fit: cover → uniform scale + centred crop; the preview is mirrored.
  const scale = Math.max(vr.width / vw, vr.height / vh);
  const offX = (vr.width - vw * scale) / 2;
  const offY = (vr.height - vh * scale) / 2;
  const toEl = (x: number, y: number) => ({ x: vr.width - (offX + x * scale), y: offY + y * scale });

  const cx = or.left - vr.left + or.width / 2;
  const cy = or.top - vr.top + or.height / 2;
  const rx = or.width / 2 - border;
  const ry = or.height / 2 - border;
  const inOval = (p: { x: number; y: number }, slack = 1) =>
    ((p.x - cx) / rx) ** 2 + ((p.y - cy) / ry) ** 2 <= slack;

  const b = faces[0].boundingBox!;
  const corners = [
    toEl(b.originX, b.originY),
    toEl(b.originX + b.width, b.originY),
    toEl(b.originX, b.originY + b.height),
    toEl(b.originX + b.width, b.originY + b.height),
  ];
  const faceW = b.width * scale;

  // BlazeFace's box spans brows→mouth, so the real head is a bit larger:
  // demand a sensible size, every keypoint (eyes, nose, mouth, ears) inside,
  // and the box corners inside the oval (small slack for the rounded box).
  if (faceW < rx * 2 * 0.38) return 'far';
  if (faceW > rx * 2 * 0.9) return 'close';
  const keypoints = faces[0].keypoints.map((k) => toEl(k.x * vw, k.y * vh));
  if (!keypoints.every((p) => inOval(p)) || !corners.every((p) => inOval(p, 1.08))) return 'outside';
  return 'ok';
}

/**
 * Watch `videoRef` while `active` and report whether exactly one face sits
 * fully inside `ovalRef`. Returns 'unavailable' if the detector can't load.
 */
export function useFaceInOval(
  videoRef: RefObject<HTMLVideoElement>,
  ovalRef: RefObject<HTMLElement>,
  active: boolean
): FaceStatus {
  const [status, setStatus] = useState<FaceStatus>('loading');
  const streak = useRef<{ status: FaceStatus; count: number }>({ status: 'loading', count: 0 });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let raf = 0;
    let last = 0;
    let lastTs = 0;
    setStatus('loading');
    streak.current = { status: 'loading', count: 0 };

    // Debounce: go green after OK_FRAMES good frames, back to red after BAD_FRAMES.
    const report = (next: FaceStatus) => {
      const s = streak.current;
      s.count = s.status === next ? s.count + 1 : 1;
      s.status = next;
      setStatus((cur) => {
        if (cur === next) return cur;
        const need = next === 'ok' ? OK_FRAMES : cur === 'ok' ? BAD_FRAMES : 1;
        return s.count >= need ? next : cur;
      });
    };

    loadDetector()
      .then((detector) => {
        if (cancelled) return;
        const tick = (now: number) => {
          if (cancelled) return;
          raf = requestAnimationFrame(tick);
          const video = videoRef.current;
          const oval = ovalRef.current;
          if (!video || !oval || video.readyState < 2 || !video.videoWidth || now - last < DETECT_EVERY_MS) return;
          last = now;
          const ts = Math.max(now, lastTs + 1); // detectForVideo needs increasing timestamps
          lastTs = ts;
          try {
            report(classify(video, oval, detector.detectForVideo(video, ts).detections));
          } catch {
            /* frame not ready — try the next one */
          }
        };
        raf = requestAnimationFrame(tick);
      })
      .catch((err) => {
        console.warn('[face] detector unavailable:', err);
        if (!cancelled) setStatus('unavailable');
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [active, videoRef, ovalRef]);

  return status;
}
