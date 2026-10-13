'use client';

// ============================================================================
// Customer side of the live agent call: signaling over a Supabase Realtime
// broadcast channel (lib/realtime.ts) and the RTCPeerConnection. The customer
// is always the offerer; the agent console answers.
//
//   ring (repeated) ─▶ agents ring-ack ─▶ first 'accept' wins ─▶ 'accepted'
//   ─▶ journey images ─▶ offer / answer / ice ─▶ connected
//
// When no agent console acks the ring (or Realtime is unreachable) the journey
// falls back to the original simulated call — see `mode`.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { joinCallChannel, type BroadcastChannel, type SignalMessage } from './realtime';

const RING_EVERY_MS = 3000; // re-announce while queued (agents expire stale rings)
const ACK_WINDOW_MS = 2500; // how long to wait for agents to answer the first ring
const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

export type CallStatus = 'idle' | 'ringing' | 'accepted' | 'connected' | 'ended';
/** live = a real agent is on the other end; demo = the simulated prototype call. */
export type CallMode = 'live' | 'demo';

export interface RingMeta {
  /** Sent privately to the accepting agent, not in the broadcast ring. */
  selfie?: string | null;
  pan?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CallHandlers {
  onAccept?: () => void;
  onConnected?: () => void;
  onCode?: (code: string) => void;
  onHangup?: () => void;
}

interface Bitrate {
  up: number;
  down: number;
}

function newPeerId() {
  try {
    return `cust-${crypto.randomUUID()}`;
  } catch {
    return `cust-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export function useAgentCall(handlers: CallHandlers) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [mode, setMode] = useState<CallMode>('demo');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [bitrate, setBitrate] = useState<Bitrate | null>(null);

  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const idRef = useRef('');
  const chanRef = useRef<BroadcastChannel | null>(null);
  const ringTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const acksRef = useRef<Set<string>>(new Set());
  const metaRef = useRef<RingMeta>({});
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const agentRef = useRef<string | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const camRef = useRef<MediaStream | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const statsTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef<CallStatus>('idle');

  const setStat = useCallback((s: CallStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const post = useCallback((type: string, data?: unknown, to?: string) => {
    chanRef.current?.send({ type, from: idRef.current, to, data });
  }, []);

  const stopRinging = useCallback(() => {
    if (ringTimer.current) clearInterval(ringTimer.current);
    ringTimer.current = null;
  }, []);

  /** Tear down the peer connection + media we own (the camera stream is shared, so it stays). */
  const teardown = useCallback(() => {
    stopRinging();
    if (statsTimer.current) clearInterval(statsTimer.current);
    statsTimer.current = null;
    pcRef.current?.getSenders().forEach((s) => s.track?.kind === 'audio' && s.track.stop());
    pcRef.current?.close();
    pcRef.current = null;
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
    chanRef.current?.close();
    chanRef.current = null;
    agentRef.current = null;
    pendingIce.current = [];
    setRemoteStream(null);
    setBitrate(null);
  }, [stopRinging]);

  const startStats = useCallback(() => {
    let last: { t: number; sent: number; recv: number } | null = null;
    statsTimer.current = setInterval(async () => {
      const pc = pcRef.current;
      if (!pc) return;
      let sent = 0;
      let recv = 0;
      (await pc.getStats()).forEach((r) => {
        if (r.type === 'outbound-rtp') sent += r.bytesSent ?? 0;
        if (r.type === 'inbound-rtp') recv += r.bytesReceived ?? 0;
      });
      const now = performance.now();
      if (last) {
        const secs = (now - last.t) / 1000;
        setBitrate({
          up: Math.round(((sent - last.sent) * 8) / 1000 / secs),
          down: Math.round(((recv - last.recv) * 8) / 1000 / secs),
        });
      }
      last = { t: now, sent, recv };
    }, 2000);
  }, []);

  const makeOffer = useCallback(
    async (iceRestart = false) => {
      const pc = pcRef.current;
      if (!pc) return;
      const offer = await pc.createOffer({ iceRestart });
      await pc.setLocalDescription(offer);
      post('offer', pc.localDescription?.toJSON(), agentRef.current ?? undefined);
    },
    [post]
  );

  const startPeer = useCallback(async () => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    const remote = new MediaStream();
    setRemoteStream(remote);
    pc.ontrack = (e) => {
      remote.addTrack(e.track);
      // New MediaStream identity so <video> elements re-attach.
      setRemoteStream(new MediaStream(remote.getTracks()));
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) post('ice', e.candidate.toJSON(), agentRef.current ?? undefined);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected' && statusRef.current !== 'connected') {
        setStat('connected');
        startStats();
        handlersRef.current.onConnected?.();
      }
      // Agent tab closed / network gone for good — there is no server to tell us.
      if (pc.connectionState === 'failed' && pcRef.current === pc) {
        teardown();
        setStat('ended');
        handlersRef.current.onHangup?.();
      }
    };

    // Camera video (already acquired during onboarding) + a fresh mic track.
    const camTrack = camRef.current?.getVideoTracks()[0];
    try {
      micRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    } catch {
      micRef.current = null;
    }
    const micTrack = micRef.current?.getAudioTracks()[0];
    const send = new MediaStream([camTrack, micTrack].filter(Boolean) as MediaStreamTrack[]);

    if (micTrack) pc.addTrack(micTrack, send);
    else pc.addTransceiver('audio', { direction: 'recvonly' });
    if (camTrack) pc.addTrack(camTrack, send);
    else pc.addTransceiver('video', { direction: 'recvonly' });

    await makeOffer();
  }, [post, makeOffer, setStat, startStats, teardown]);

  const onMessage = useCallback(
    async (msg: SignalMessage) => {
      if (msg.to && msg.to !== idRef.current) return;
      // Once paired, only listen to our agent.
      if (agentRef.current && msg.from !== agentRef.current) return;
      const pc = pcRef.current;
      switch (msg.type) {
        case 'ring-ack':
          acksRef.current.add(msg.from);
          break;
        case 'accept': {
          if (statusRef.current !== 'ringing' || agentRef.current) return;
          agentRef.current = msg.from;
          stopRinging();
          // Everyone sees who won, so the other agents drop this ring.
          chanRef.current?.send({ type: 'accepted', from: idRef.current, data: { agent: msg.from } });
          // Journey captures go privately to the winning agent, one per message.
          const { selfie, pan } = metaRef.current;
          if (selfie) post('journey', { kind: 'selfie', src: selfie }, msg.from);
          if (pan) post('journey', { kind: 'pan', src: pan }, msg.from);
          setMode('live');
          setStat('accepted');
          handlersRef.current.onAccept?.();
          await startPeer();
          break;
        }
        case 'answer':
          if (!pc) return;
          await pc.setRemoteDescription(msg.data);
          for (const c of pendingIce.current.splice(0)) await pc.addIceCandidate(c).catch(() => {});
          break;
        case 'ice':
          if (!pc || !pc.remoteDescription) pendingIce.current.push(msg.data);
          else await pc.addIceCandidate(msg.data).catch(() => {});
          break;
        case 'restart':
          await makeOffer(true);
          break;
        case 'code':
          if (msg.data?.code) {
            setCode(String(msg.data.code));
            handlersRef.current.onCode?.(String(msg.data.code));
          }
          break;
        case 'hangup':
          teardown();
          setStat('ended');
          handlersRef.current.onHangup?.();
          break;
      }
    },
    [makeOffer, post, setStat, startPeer, stopRinging, teardown]
  );

  /**
   * Join the agent queue. Resolves with the number of agents that answered
   * the first ring (0 → caller should fall back to the simulated demo call).
   */
  const ring = useCallback(
    async (camera: MediaStream | null, meta: RingMeta): Promise<number> => {
      teardown();
      camRef.current = camera;
      metaRef.current = meta;
      const id = newPeerId();
      idRef.current = id;
      acksRef.current = new Set();
      setCode(null);
      setMicOn(true);
      setCamOn(true);
      setMode('demo');

      const chan = await joinCallChannel((m) => void onMessage(m));
      // A newer ring()/teardown() replaced us while we were connecting.
      if (idRef.current !== id) {
        chan?.close();
        return 0;
      }
      if (!chan) return 0;
      chanRef.current = chan;
      setStat('ringing');

      const announce = () =>
        post('ring', {
          latitude: meta.latitude ?? null,
          longitude: meta.longitude ?? null,
          ringingAt: Date.now(),
          hasSelfie: Boolean(meta.selfie),
          hasPan: Boolean(meta.pan),
        });
      announce();
      ringTimer.current = setInterval(announce, RING_EVERY_MS);

      await new Promise((r) => setTimeout(r, ACK_WINDOW_MS));
      return idRef.current === id ? acksRef.current.size : 0;
    },
    [onMessage, post, setStat, teardown]
  );

  /** Leave the queue without a call (e.g. falling back to the demo). */
  const cancel = useCallback(() => {
    if (statusRef.current === 'ringing') post('cancel');
    teardown();
    setStat('idle');
  }, [post, setStat, teardown]);

  const hangup = useCallback(() => {
    if (statusRef.current === 'ringing') post('cancel');
    else if (statusRef.current !== 'idle' && statusRef.current !== 'ended') post('hangup', null, agentRef.current ?? undefined);
    teardown();
    setStat('idle');
    setMode('demo');
    setCode(null);
  }, [post, setStat, teardown]);

  const toggleMic = useCallback(() => {
    setMicOn((on) => {
      micRef.current?.getAudioTracks().forEach((t) => (t.enabled = !on));
      return !on;
    });
  }, []);

  const toggleCam = useCallback(() => {
    setCamOn((on) => {
      const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === 'video');
      if (sender?.track) sender.track.enabled = !on;
      return !on;
    });
  }, []);

  // Closing the tab: tell the agent (best effort — the socket may not flush).
  useEffect(() => {
    const bye = () => {
      if (statusRef.current === 'ringing') post('cancel');
      else if (agentRef.current) post('hangup', null, agentRef.current);
    };
    window.addEventListener('pagehide', bye);
    return () => {
      window.removeEventListener('pagehide', bye);
      teardown();
    };
  }, [post, teardown]);

  return useMemo(
    () => ({ status, mode, remoteStream, code, micOn, camOn, bitrate, ring, cancel, hangup, toggleMic, toggleCam }),
    [status, mode, remoteStream, code, micOn, camOn, bitrate, ring, cancel, hangup, toggleMic, toggleCam]
  );
}

export type AgentCall = ReturnType<typeof useAgentCall>;
