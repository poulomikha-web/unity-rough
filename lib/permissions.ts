'use client';

import type { PermKind } from './journey';

export interface LocationResult {
  granted: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}

/**
 * Request the real device camera. On success the live MediaStream is returned
 * so it can be shared across the journey's <video> elements.
 */
export async function requestCamera(): Promise<{ granted: boolean; stream: MediaStream | null }> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    return { granted: true, stream };
  } catch {
    return { granted: false, stream: null };
  }
}

/**
 * Request the real device microphone. We only need the permission grant here,
 * not the audio itself, so the tracks are stopped immediately.
 */
export async function requestMicrophone(): Promise<{ granted: boolean }> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    stream.getTracks().forEach((t) => t.stop());
    return { granted: true };
  } catch {
    return { granted: false };
  }
}

/** Request the real device location via the Geolocation API. */
export function requestLocation(): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ granted: false, latitude: null, longitude: null, accuracy: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          granted: true,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve({ granted: false, latitude: null, longitude: null, accuracy: null }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

/** The data a single permission step contributes to the final record. */
export interface PermResults {
  camera: boolean | null;
  microphone: boolean | null;
  location: boolean | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}

export const emptyPermResults = (): PermResults => ({
  camera: null,
  microphone: null,
  location: null,
  latitude: null,
  longitude: null,
  accuracy: null,
});

export const PERM_LABEL: Record<PermKind, string> = {
  location: 'location',
  camera: 'camera',
  microphone: 'microphone',
};

/**
 * Query the device's current permission state via the Permissions API so we can
 * skip prompting when it's already granted. Returns 'unsupported' when the
 * browser can't answer (e.g. Safari/Firefox don't expose camera/microphone).
 */
export async function checkPermission(
  kind: PermKind
): Promise<PermissionState | 'unsupported'> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      return 'unsupported';
    }
    const name = (kind === 'location' ? 'geolocation' : kind) as PermissionName;
    const status = await navigator.permissions.query({ name });
    return status.state;
  } catch {
    // Some browsers throw for camera/microphone names.
    return 'unsupported';
  }
}

// Remember a prior grant so we can still skip the in-app prompt on browsers
// where the Permissions API can't report camera/microphone state.
const flagKey = (kind: PermKind) => `unity_perm_${kind}`;

export function rememberGranted(kind: PermKind): void {
  try {
    localStorage.setItem(flagKey(kind), 'granted');
  } catch {
    /* storage unavailable — ignore */
  }
}

export function wasGranted(kind: PermKind): boolean {
  try {
    return localStorage.getItem(flagKey(kind)) === 'granted';
  } catch {
    return false;
  }
}
