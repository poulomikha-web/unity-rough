'use client';

/** Attach a shared MediaStream to a <video> element ref. */
export function attachStream(
  video: HTMLVideoElement | null,
  stream: MediaStream | null
): void {
  if (!video) return;
  if (video.srcObject !== stream) {
    video.srcObject = stream;
  }
}

/**
 * Capture a still frame from a <video> as a JPEG data URL. When the video has
 * no frame yet (camera blocked / denied) it paints a neutral placeholder so the
 * flow still has an image to show — same fallback behaviour as the prototype.
 */
export function grabFrame(
  video: HTMLVideoElement | null,
  opts: { mirror?: boolean; placeholder?: 'doc' | 'selfie' } = {}
): string {
  const w = (video && video.videoWidth) || 640;
  const h = (video && video.videoHeight) || (opts.placeholder === 'doc' ? 420 : 480);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (video && video.videoWidth) {
    if (opts.mirror) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    try {
      ctx.drawImage(video, 0, 0, w, h);
    } catch {
      /* drawImage can throw if the frame isn't ready — ignore */
    }
  } else if (opts.placeholder === 'doc') {
    ctx.fillStyle = '#e9edf6';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#9fb4d8';
    ctx.fillRect(w * 0.1, h * 0.18, w * 0.8, h * 0.64);
  } else {
    ctx.fillStyle = '#33384a';
    ctx.fillRect(0, 0, w, h);
  }
  return canvas.toDataURL('image/jpeg', 0.9);
}
