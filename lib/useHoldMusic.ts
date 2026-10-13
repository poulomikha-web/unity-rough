'use client';

import { useCallback, useEffect, useRef } from 'react';
import { HOLD_NOTES, HOLD_VOLUME } from './journey';

/**
 * Synthesised "hold music" + a connect chime, built with the Web Audio API so
 * nothing has to be bundled and it works offline. Ported from the prototype:
 * a soft marimba-ish pluck loop that plays quietly under the wait screen, and
 * a short rising two-note chime when the agent picks up.
 */
export function useHoldMusic() {
  const ctxRef = useRef<AudioContext | null>(null);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const stepRef = useRef(0);

  const ensureCtx = useCallback((): AudioContext | null => {
    const AC =
      typeof window !== 'undefined'
        ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!AC) return null;
    if (!ctxRef.current) ctxRef.current = new AC();
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  // Browsers block audio until the user interacts; keep a resume fallback.
  useEffect(() => {
    const resume = () => {
      if (ctxRef.current && ctxRef.current.state === 'suspended') void ctxRef.current.resume();
    };
    const events: (keyof DocumentEventMap)[] = ['pointerdown', 'touchstart', 'keydown'];
    events.forEach((ev) => document.addEventListener(ev, resume, { passive: true }));
    return () => events.forEach((ev) => document.removeEventListener(ev, resume));
  }, []);

  const startHold = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx || holdTimer.current) return;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(HOLD_VOLUME, ctx.currentTime + 0.9); // fade in
    master.connect(ctx.destination);
    masterRef.current = master;
    stepRef.current = 0;

    const pluck = () => {
      const c = ctxRef.current;
      const m = masterRef.current;
      if (!c || !m) return;
      const t = c.currentTime;
      const freq = HOLD_NOTES[stepRef.current++ % HOLD_NOTES.length];
      // note + a quieter octave above gives it a soft marimba edge
      ([[freq, 1], [freq * 2, 0.22]] as const).forEach(([f, peak]) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 1.1);
        osc.connect(g);
        g.connect(m);
        osc.start(t);
        osc.stop(t + 1.2);
      });
    };

    pluck();
    holdTimer.current = setInterval(pluck, 620);
  }, [ensureCtx]);

  const stopHold = useCallback(() => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
    const m = masterRef.current;
    const c = ctxRef.current;
    if (m && c) {
      const t = c.currentTime;
      m.gain.cancelScheduledValues(t);
      m.gain.setValueAtTime(m.gain.value, t);
      m.gain.linearRampToValueAtTime(0, t + 0.35); // fade out
      setTimeout(() => {
        try {
          m.disconnect();
        } catch {
          /* already disconnected */
        }
      }, 500);
    }
    masterRef.current = null;
  }, []);

  const chime = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    ([[659.25, 0], [987.77, 0.14]] as const).forEach(([freq, delay]) => {
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.5);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  }, [ensureCtx]);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      if (holdTimer.current) clearInterval(holdTimer.current);
    };
  }, []);

  return { startHold, stopHold, chime };
}
