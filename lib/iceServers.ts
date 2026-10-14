// STUN + optional TURN for the agent call. TURN is what makes calls work when
// either side is behind carrier-grade NAT (mobile data, many office networks):
// set NEXT_PUBLIC_TURN_URLS (comma-separated), NEXT_PUBLIC_TURN_USERNAME and
// NEXT_PUBLIC_TURN_CREDENTIAL in .env.local. The agent console gets the same
// values through svc-config.js.

const turnUrls = (process.env.NEXT_PUBLIC_TURN_URLS ?? '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
  ...(turnUrls.length
    ? [
        {
          urls: turnUrls,
          username: process.env.NEXT_PUBLIC_TURN_USERNAME,
          credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
        },
      ]
    : []),
];

export const hasTurn = turnUrls.length > 0;
