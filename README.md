# Unity SVC journey — Next.js app

A production-structured rebuild of the **SBI Life / IDfy Self Video KYC (SVC)** journey,
ported from the single-file HTML prototype (`Unity_SVC_journey (32).html`) into a componentised
Next.js 14 (App Router, TypeScript) application. The look and behaviour match the prototype 1:1;
the CSS is carried over verbatim as a global stylesheet and the imperative flow has been
re-expressed as React components, context and hooks.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
```

```bash
npm run build && npm start   # production build
```

> The journey uses the front camera (`getUserMedia`). Browsers only grant camera access over
> `localhost` or HTTPS. Where the camera is unavailable the flow still runs — document/selfie
> capture paint a neutral placeholder frame, exactly like the prototype.

## The journey

Linear flow, with a hang-up (red phone) on the call screens looping back to the start:

```
Redirect (secure-page loader, ~5s)
  → KYC Welcome  ── "Accept & Proceed"
  → Onboarding:  Permissions intro → Location → Camera → Microphone   (simulated Allow/Deny popups)
                 → All Set → Checking Internet → Strong Connection
  → Capture Selfie (full-screen camera modal: detect → shutter → preview → Done)
  → PAN Front capture → "Captured!" → Verify (Uploading → Verifying → Verified)
  → Face Compare ("Verification in progress")
  → Waiting for agent (estimated-wait countdown + synthesised hold music)
  → Connecting → Agent Video Call
  → Read-the-code (reached 3 min into the call, or press "c" to jump — a demo shortcut)
```

## Structure

```
app/
  layout.tsx          Root layout; loads Inter (Google Fonts) + globals.css
  globals.css         Full prototype stylesheet, ported verbatim
  page.tsx            Wraps <JourneyRoot> in <JourneyProvider>
components/
  JourneyRoot.tsx     Phone frame + active-screen switch + permission popup
  shared.tsx          IDfy logo defs, "Secured by" footer, Uni header, <CamVideo>
  screens/            One component per screen (Redirect, KycWelcome, Onboard*,
                      Capture (+selfie modal), Pan*, Compare, Success, Connecting, Call screens)
lib/
  journey.ts          Screen ids, onboarding sequence, permission copy, timing constants
  JourneyContext.tsx  screen state + navigation + onboarding orchestration + shared capture data
  useCamera.ts        Single shared getUserMedia stream; frame-grab helper
  useHoldMusic.ts     Web Audio hold-music loop + connect chime (no audio files bundled)
public/assets/        Illustrations extracted from the prototype (kyc-welcome, net-*, pan-*)
```

## Device permissions & Supabase (`unity_rough`)

During onboarding, the **Allow** button on each permission step fires the **real**
browser permission prompt:

| Step     | API                                   | Captured |
|----------|---------------------------------------|----------|
| Location | `navigator.geolocation`               | granted + latitude / longitude / accuracy |
| Camera   | `getUserMedia({ video })`             | granted (stream is reused for all video feeds) |
| Mic      | `getUserMedia({ audio })`             | granted |

**Ask once:** before each step the app checks the device's permission state via the
Permissions API. If it's already `granted` (remembered by the browser from a previous
run), the step auto-skips silently — no in-app popup and no second native prompt — and
the camera stream is re-acquired without interrupting the user. Only not-yet-granted
permissions are prompted for.

When onboarding finishes, one row is inserted into the **`unity_rough`** table
(`lib/supabase.ts`) with: `session_id`, `camera_granted`, `microphone_granted`,
`location_granted`, `latitude`, `longitude`, `accuracy`, `user_agent`.

Setup:

1. Create the table — run [`supabase/unity_rough.sql`](supabase/unity_rough.sql)
   in the Supabase SQL Editor. It enables RLS and allows anonymous `INSERT` only.
2. Configure keys — copy `.env.local.example` to `.env.local` and set
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Project Settings → API). Both are public, client-side values.

Implementation note: the insert is a plain `fetch` POST to PostgREST sending only
the `apikey` header — **not** the `@supabase/supabase-js` SDK. This is deliberate:
the new `sb_publishable_…` keys are not JWTs, so sending them as `Authorization:
Bearer` makes PostgREST reject the `anon` role (RLS `42501`); apikey-only resolves
to `anon`, which the policy allows. It also avoids the SDK's Node 22+ requirement.
A failed/missing-config insert is logged and swallowed, never breaking the journey.

## Live agent call (WebRTC)

The waiting room connects the customer to a real agent in the agent console
(`public/agent/index.html`) — locally at **http://localhost:3000/agent**, deployed at
**https://poulomikha-web.github.io/unity-rough/agent/**.

1. Open the agent console and switch **Online**.
2. Run the journey in another tab/device. On the waiting screen the customer joins the queue.
3. The agent console rings (auto-accepts after 9 s). Both sides get two-way video + audio.
4. In the agent console, **Generate code** (task 3) pushes the digits to the customer's
   read-the-code screen. Either side hanging up ends the call on the other.

How it works — no server of our own:

- **Signaling = Supabase Realtime broadcast** on the `unity-svc-call` topic of the same
  unity-rough project, over a plain WebSocket (`lib/realtime.ts`; the console has the same
  ~30 lines inline). Peers broadcast `{type, from, to?, data}` and ignore messages for others.
- Customer (`lib/useAgentCall.ts`) re-broadcasts `ring` every 3 s while queued; online agents
  reply `ring-ack` (no ack in 2.5 s → the original simulated call). The first agent `accept`
  wins and the customer announces `accepted` so the others drop the ring. The customer then
  sends its journey selfie + PAN (`journey`) privately to that agent and makes the WebRTC offer;
  `answer` / `ice` / `code` / `restart` / `hangup` follow.
- Agents expire a ring not repeated for 9 s. A peer whose tab closes without saying goodbye is
  detected when the RTCPeerConnection goes `failed`.
- The console reads the Supabase URL + publishable key from `svc-config.js`, generated from
  `.env.local` by `scripts/gen-svc-config.mjs` (runs before `dev` / `build`; gitignored).

Deploy (GitHub Pages, static export with base path `/unity-rough`):

```bash
npm run build:pages     # → out/
```

then publish `out/` to the `gh-pages` branch. Only STUN is configured; peers behind strict NAT
need a TURN server (`ICE_SERVERS` in `useAgentCall.ts`, `ICE` in the console). Camera/mic need
a secure context (`localhost` or HTTPS — GitHub Pages is HTTPS).

## Notes on fidelity

- **Images**: the prototype embedded its illustrations as base64. They've been extracted to
  `public/assets/` and referenced by URL.
- **Audio**: the waiting-screen hold music and the agent-connect chime are synthesised with the
  Web Audio API (ported from the prototype) — nothing is bundled, and it works offline.
- **Timings** (redirect 5s, verify 6s, 3-min code step, etc.) live in `lib/journey.ts:TIMING`.

## Intentionally left out (vestigial in the prototype)

The prototype's source still contained an **audio-consent** flow (Agree/Disagree overlays with a
10-second mic countdown) and a set of **policy-detail screens** (PIVC, Product, Medical, Benefits,
Death benefit, Important points) with text-to-speech narration. In v32 these are **unreachable** —
nothing in the live journey triggers them. They were therefore omitted from this clean rebuild.
If you want that consent + detail-screen flow wired back into the journey (e.g. after the welcome
or during the call), it can be added as a dedicated set of screens + an overlay component.
