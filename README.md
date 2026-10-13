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
  → Prepare (face oval, simulated detection → Start)
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
  screens/            One component per screen (Redirect, KycWelcome, Onboard*, Prepare,
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
