'use client';

// ============================================================================
// Minimal Supabase Realtime "broadcast" client — a plain WebSocket speaking the
// Phoenix channel protocol, so we don't pull in @supabase/supabase-js.
//
// Used as the signaling channel for the agent call: every peer joins one
// topic, broadcasts {type, from, to?, data} and ignores messages not meant for
// it. No server of our own is involved, so the app can be hosted statically.
// ============================================================================

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const CALL_TOPIC = 'unity-svc-call';
export const isRealtimeConfigured = Boolean(url && key);

export interface SignalMessage {
  type: string;
  from: string;
  to?: string;
  data?: any;
}

export interface BroadcastChannel {
  send: (msg: SignalMessage) => void;
  close: () => void;
}

/**
 * Join the call topic. Resolves once the join is acknowledged, or null when
 * Supabase isn't configured / the socket can't connect within `timeoutMs`.
 * After joining, a dropped socket reconnects and re-joins on its own.
 */
export function joinCallChannel(
  onMessage: (msg: SignalMessage) => void,
  timeoutMs = 6000
): Promise<BroadcastChannel | null> {
  if (!url || !key) return Promise.resolve(null);
  const wsUrl = `${url.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(key)}&vsn=1.0.0`;
  const topic = `realtime:${CALL_TOPIC}`;

  let ws: WebSocket | null = null;
  let ref = 0;
  let joinRef = '';
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closed = false;
  let joined = false;
  const outbox: string[] = [];

  const raw = (event: string, payload: unknown, t = topic) =>
    JSON.stringify({ topic: t, event, payload, ref: String(++ref), join_ref: t === topic ? joinRef : undefined });

  const channel: BroadcastChannel = {
    send(msg) {
      const frame = raw('broadcast', { type: 'broadcast', event: 'signal', payload: msg });
      if (joined && ws?.readyState === WebSocket.OPEN) ws.send(frame);
      else outbox.push(frame);
    },
    close() {
      closed = true;
      clearInterval(heartbeat);
      ws?.close();
    },
  };

  return new Promise((resolve) => {
    let settled = false;
    const settle = (v: BroadcastChannel | null) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    const timer = setTimeout(() => {
      if (!joined) {
        channel.close();
        settle(null);
      }
    }, timeoutMs);

    const connect = () => {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        joinRef = String(ref + 1);
        ws!.send(
          raw('phx_join', {
            config: { broadcast: { self: false, ack: false }, presence: { key: '' }, private: false },
          })
        );
        heartbeat = setInterval(() => ws?.readyState === WebSocket.OPEN && ws.send(raw('heartbeat', {}, 'phoenix')), 25000);
      };
      ws.onmessage = (e) => {
        let m: any;
        try {
          m = JSON.parse(e.data);
        } catch {
          return;
        }
        if (m.topic !== topic) return;
        if (m.event === 'phx_reply' && m.ref === joinRef) {
          if (m.payload?.status !== 'ok') return;
          joined = true;
          clearTimeout(timer);
          outbox.splice(0).forEach((f) => ws!.send(f));
          settle(channel);
        } else if (m.event === 'broadcast' && m.payload?.event === 'signal') {
          onMessage(m.payload.payload as SignalMessage);
        }
      };
      ws.onclose = () => {
        clearInterval(heartbeat);
        joined = false;
        if (!closed && settled) setTimeout(connect, 1500);
      };
    };
    connect();
  });
}
