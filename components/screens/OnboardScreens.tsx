'use client';

import { useEffect, useRef, useState } from 'react';
import { watchPermissions, type PermStates } from '@/lib/permissions';
import { useJourney } from '@/lib/JourneyContext';
import type { PermKind } from '@/lib/journey';
import { SecuredFooter, UniHeader } from '@/components/shared';
import { asset } from '@/lib/asset';

const WARNING = (
  <div className="ob-instructions">
    <div className="obi-lead">To avoid being disconnected, follow these instructions</div>
    <div className="ob-warning">
      <svg viewBox="0 0 24 24">
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
      </svg>
      <span>DO NOT press back or leave this window</span>
    </div>
    <div className="obi-note">Please be appropriately dressed for the call</div>
  </div>
);

const ALLOW_BANNER = (
  <div className="ob-allow-banner">
    Please click on <b>&quot;Allow&quot;</b> when the pop up appears
  </div>
);

/** OB1 — Checking internet connection. */
export function ObInternetScreen() {
  return (
    <div className="screen onboard active" id="obInternet">
      <UniHeader />
      <div className="ob-body">
        <div className="ob-center">
          <div className="ob-ring-wrap net-img-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ob-halftone-img" src={asset('/assets/net-checking.png')} alt="" />
            <div className="net-spin-ring" />
            <svg className="net-wifi" viewBox="0 0 24 24">
              <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
            </svg>
          </div>
          <div className="ob-title" style={{ marginTop: 44 }}>
            Checking Internet Connection
          </div>
        </div>
      </div>
      {WARNING}
      <SecuredFooter variant="ob" />
    </div>
  );
}

/** OB2 — Strong internet connection. */
export function ObStrongScreen() {
  return (
    <div className="screen onboard active" id="obStrong">
      <UniHeader />
      <div className="ob-body">
        <div className="ob-center">
          <div className="ob-ring-wrap net-img-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ob-halftone-img" src={asset('/assets/net-strong.png')} alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ob-ring-img" src={asset('/assets/net-ring.png')} alt="" />
          </div>
          <div className="ob-title green" style={{ marginTop: 44 }}>
            Strong Internet Connection
          </div>
          <div className="ob-strong-sub">We&apos;ll assign an agent to you now.</div>
        </div>
      </div>
      {WARNING}
      <SecuredFooter variant="ob" />
    </div>
  );
}

/** OB3 — Permissions intro. "Proceed" advances to the first permission prompt. */
export function ObPermIntroScreen() {
  const { obProceed } = useJourney();
  return (
    <div className="screen onboard active" id="obPermIntro">
      <UniHeader />
      <div className="ob-body">
        <div className="ob-center">
          <div className="perm-wrap">
            <div className="perm-ring o2" />
            <div className="perm-ring o1" />
            <div className="perm-person">
              <svg viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          </div>
          <div className="ob-title" style={{ marginTop: 24 }}>
            Let&apos;s Set You up for Verification
          </div>
        </div>
        <button className="ob-proceed" onClick={obProceed}>
          Proceed
        </button>
      </div>
      <SecuredFooter variant="ob" />
    </div>
  );
}

/** Shared "setup in progress" ring screen (location / camera / mic). */
function SetupRingScreen({
  id,
  stepIndex,
  icon,
  title,
  desc,
}: {
  id: string;
  stepIndex: 0 | 1 | 2;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  const dot = (i: number) =>
    i < stepIndex ? 'ob-step-dot done' : i === stepIndex ? 'ob-step-dot active' : 'ob-step-dot';
  const line = (i: number) => (i < stepIndex ? 'ob-step-line done' : 'ob-step-line');

  return (
    <div className="screen onboard active" id={id}>
      <UniHeader />
      <div className="ob-body">
        <div className="ob-subtitle">Setup in Progress ...</div>
        <div className="ob-steps">
          <div className={dot(0)} />
          <div className={line(0)} />
          <div className={dot(1)} />
          <div className={line(1)} />
          <div className={dot(2)} />
        </div>
        <div className="ob-center">
          <div className="ob-ring-wrap">
            <div className="ob-ring">
              <svg viewBox="0 0 180 180">
                <circle className="track" cx="90" cy="90" r="82" />
                <circle className="arc" cx="90" cy="90" r="82" />
              </svg>
            </div>
            <div className="ring-icon ob-ring-icon">{icon}</div>
          </div>
          <div className="ob-title">{title}</div>
          <div className="ob-desc">{desc}</div>
        </div>
      </div>
      {ALLOW_BANNER}
      <SecuredFooter variant="ob" />
    </div>
  );
}

/** OB4 — Fetching location. */
export function ObLocationScreen() {
  return (
    <SetupRingScreen
      id="obLocation"
      stepIndex={0}
      title="Fetching Location"
      desc="Please ensure your Location is on"
      icon={
        <svg viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
        </svg>
      }
    />
  );
}

/** OB5 — Checking camera. */
export function ObCameraScreen() {
  return (
    <SetupRingScreen
      id="obCamera"
      stepIndex={1}
      title="Checking Camera"
      desc="To make sure you're visible during the call"
      icon={
        <svg viewBox="0 0 24 24" fillRule="evenodd" clipRule="evenodd">
          <path d="M12 15.2c1.77 0 3.2-1.43 3.2-3.2s-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2 1.43 3.2 3.2 3.2zM9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z" />
        </svg>
      }
    />
  );
}

/** OB6 — Checking microphone / audio. */
export function ObMicScreen() {
  return (
    <SetupRingScreen
      id="obMic"
      stepIndex={2}
      title="Checking Audio"
      desc="This is to ensure you and the representative can hear each other"
      icon={
        <svg viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      }
    />
  );
}

/** OB7 — All set. */
export function ObSuccessScreen() {
  return (
    <div className="screen onboard active" id="obSuccess">
      <UniHeader />
      <div className="ob-body">
        <div className="ob-center">
          <div className="ob-success-circle">
            <svg viewBox="0 0 24 24">
              <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
          <div className="ob-title" style={{ marginTop: 34 }}>
            All Set!
          </div>
          <div className="ob-desc" style={{ marginTop: 12 }}>
            Taking you to the next page ...
          </div>
        </div>
      </div>
      <SecuredFooter variant="ob" />
    </div>
  );
}

/** Simulated browser permission popup (Allow / Deny). */
export function PermPopup() {
  const { permPopup, permInfo, permRespond } = useJourney();
  const info = permPopup.kind ? permInfo[permPopup.kind] : null;

  return (
    <div className={`perm-popup${permPopup.open ? ' show' : ''}`} id="permPopup">
      <div className="pp-top">
        <svg className="pp-what-ico" id="ppIcon" viewBox="0 0 24 24">
          <path d={info?.icon ?? ''} />
        </svg>
        <div className="pp-text">
          <span className="pp-site">idfy</span> wants to <span id="ppWhat">{info?.what ?? ''}</span>
        </div>
      </div>
      <div className="pp-actions">
        <button className="pp-btn pp-block" onClick={() => permRespond(false)}>
          Deny
        </button>
        <button className="pp-btn pp-allow" onClick={() => permRespond(true)}>
          Allow
        </button>
      </div>
    </div>
  );
}

const PERM_NAME: Record<PermKind, string> = {
  camera: 'Camera',
  microphone: 'Microphone',
  location: 'Location',
};

type Platform = 'ios' | 'android' | 'desktop';
function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** Where to flip blocked site permissions back on, per platform (wording matches the browser UI). */
function settingsSteps(names: string, platform: Platform, live: boolean): string[] {
  const last = live ? "Come back here — we'll continue automatically" : 'Come back here and tap Try again';
  if (platform === 'ios')
    return ['Tap "aA" in the address bar → Website Settings', `Set ${names} to Allow`, last];
  if (platform === 'android')
    return ['Tap the tune icon at the left of the address bar', `Tap Permissions and turn on ${names}`, last];
  return [
    'Click the tune icon at the left of the address bar',
    `Switch on ${names} — or click "Reset permissions"`,
    live ? "We'll continue automatically (reload the page if Chrome asks)" : 'Reload the page if asked, then click Try again',
  ];
}

/** Title, explanation and fix-it steps for one failed permission. */
function blockedCopy(kind: PermKind, reason: string, platform: Platform, blockedNames: string[], live: boolean) {
  const name = PERM_NAME[kind];
  const lower = name.toLowerCase();
  switch (reason) {
    case 'denied-in-app':
      return {
        title: `${name} access is required`,
        body: `Your Video KYC can't continue without your ${lower}. Tap Allow, then accept the browser's prompt.`,
        steps: [] as string[],
        cta: `Allow ${lower}`,
      };
    case 'NotAllowedError':
    case 'SecurityError':
    case 'PERMISSION_DENIED':
    {
      // Name every blocked permission so they're all fixed in one visit.
      const names = blockedNames.length ? blockedNames : [name];
      const steps = settingsSteps(joinNames(names), platform, live);
      if (names.includes('Location') && platform !== 'desktop')
        steps.splice(2, 0, 'Also make sure Location is on in your phone settings');
      return {
        title: names.length > 1 ? 'Allow access to continue' : `${name} access is blocked`,
        body: `Your browser is blocking ${joinNames(names.map((n) => n.toLowerCase()))} for this site, so it can't ask you again. Video KYC needs ${names.length > 1 ? 'all of them' : 'it'}:`,
        steps,
        cta: 'Try again',
      };
    }
    case 'NotReadableError':
    case 'AbortError':
    case 'TrackStartError':
      return {
        title: `${name} is busy`,
        body: `Another app is using your ${lower}. Close video-call or camera apps (and other tabs using the ${lower}), then try again.`,
        steps: [],
        cta: 'Try again',
      };
    case 'NotFoundError':
    case 'OverconstrainedError':
      return {
        title: `No ${lower} found`,
        body: `We couldn't find a ${lower} on this device. Connect one or switch to a phone, then try again.`,
        steps: [],
        cta: 'Try again',
      };
    case 'POSITION_UNAVAILABLE':
    case 'TIMEOUT':
      return {
        title: "Couldn't get your location",
        body: 'Turn on Location (GPS) in your phone settings, move near a window if indoors, then try again.',
        steps: [],
        cta: 'Try again',
      };
    case 'unsupported':
      return {
        title: 'Open in your browser',
        body: `This in-app browser can't use your ${lower}. Open this link in ${
          platform === 'ios' ? 'Safari' : 'Chrome'
        } to continue.`,
        steps: ['Tap ⋯ / ⋮ in the top corner', `Choose "Open in ${platform === 'ios' ? 'Safari' : 'Chrome'}" (or "Open in browser")`],
        cta: 'Try again',
      };
    default:
      return {
        title: `Couldn't access your ${lower}`,
        body: `Something went wrong (${reason}). Please try again.`,
        steps: [],
        cta: 'Try again',
      };
  }
}

/**
 * Shown when a permission step fails. The journey stays on that step until
 * access is granted — camera, microphone and location are all required.
 */
const BLOCKED_REASONS = ['NotAllowedError', 'SecurityError', 'PERMISSION_DENIED'];

export function PermBlockedSheet() {
  const { permBlocked, permRetry, permInfo } = useJourney();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [states, setStates] = useState<PermStates | null>(null);
  const isBlockedReason = !!permBlocked && BLOCKED_REASONS.includes(permBlocked.reason);
  const kind = permBlocked?.kind;

  const retry = async () => {
    setBusy(true);
    try {
      await permRetry();
    } finally {
      setBusy(false);
    }
  };
  const retryRef = useRef(retry);
  retryRef.current = retry;

  // Live permission states while blocked: the user flips the switches in the
  // browser's site settings and we carry on by ourselves.
  useEffect(() => {
    if (!isBlockedReason || !kind) {
      setStates(null);
      return;
    }
    let prev: PermissionState | 'unsupported' | undefined;
    return watchPermissions((next) => {
      setStates(next);
      const now = next[kind];
      if (prev === 'denied' && (now === 'granted' || now === 'prompt')) void retryRef.current();
      prev = now;
    });
  }, [isBlockedReason, kind]);

  if (!permBlocked) return null;

  const platform = detectPlatform();
  const live = !!states && states[permBlocked.kind] !== 'unsupported';
  const blockedNames = states
    ? (Object.keys(PERM_NAME) as PermKind[]).filter((k) => states[k] === 'denied').map((k) => PERM_NAME[k])
    : [];
  if (isBlockedReason && !blockedNames.includes(PERM_NAME[permBlocked.kind])) blockedNames.unshift(PERM_NAME[permBlocked.kind]);
  const copy = blockedCopy(permBlocked.kind, permBlocked.reason, platform, blockedNames, live);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="perm-blocked" role="alertdialog" aria-labelledby="pbTitle">
      <div className="pb-card">
        <div className="pb-icon">
          <svg viewBox="0 0 24 24">
            <path d={permInfo[permBlocked.kind].icon} />
          </svg>
        </div>
        <div className="pb-title" id="pbTitle">
          {copy.title}
        </div>
        <p className="pb-body">{copy.body}</p>
        {isBlockedReason && states && (
          <ul className="pb-perms">
            {(Object.keys(PERM_NAME) as PermKind[]).map((k) => {
              const st = states[k];
              const label = st === 'granted' ? 'Allowed' : st === 'denied' ? 'Blocked' : st === 'prompt' ? 'Will ask' : '—';
              return (
                <li key={k} className={`pb-perm ${st}`}>
                  <svg viewBox="0 0 24 24">
                    <path d={permInfo[k].icon} />
                  </svg>
                  <span>{PERM_NAME[k]}</span>
                  <em>{label}</em>
                </li>
              );
            })}
          </ul>
        )}
        {copy.steps.length > 0 && (
          <ol className="pb-steps">
            {copy.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        )}
        <button className="pb-cta" onClick={retry} disabled={busy}>
          {busy ? 'Checking…' : copy.cta}
        </button>
        {permBlocked.reason === 'unsupported' && (
          <button className="pb-secondary" onClick={copyLink}>
            {copied ? 'Link copied' : 'Copy link'}
          </button>
        )}
      </div>
    </div>
  );
}
