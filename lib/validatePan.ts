'use client';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type PanFeature =
  // validate/document advanced_features
  | 'face_details'
  | 'detect_doc_side'
  | 'check_scan'
  // check_acceptability/document
  | 'card_hindrance'
  | 'flash_on_card'
  | 'is_photocopy'
  | 'is_live'
  | 'optimal_dimensions';

/** PAN details read by eve OCR (extract/ind_pan). */
export interface PanDetails {
  name: string;
  fathers_name: string;
  date_of_birth: string;
  pan_number: string;
  pan_type: string;
}

export interface PanValidation {
  ok: boolean;
  /** Checks that failed (empty when eve itself errored). */
  failed: PanFeature[];
  /** eve / transport error code, e.g. INVALID_IMAGE, NETWORK. */
  error?: string;
  message?: string | null;
  /** Present when ok: what the OCR read off the card. */
  pan_details?: PanDetails;
}

/** Customer-facing text for each failed advanced feature. */
export const PAN_FEATURE_MESSAGES: Record<PanFeature, string> = {
  face_details: 'Your photo on the PAN card is not clearly visible.',
  detect_doc_side: 'Please capture the front side of your PAN card.',
  check_scan: 'Please capture the original PAN card, not a scan or photocopy.',
  card_hindrance: 'Make sure nothing, like your fingers, is covering the card.',
  flash_on_card: 'Avoid glare or flash on the card.',
  is_photocopy: 'Please capture the original PAN card, not a photocopy.',
  is_live: 'Please capture the physical card, not a photo of it on a screen or paper.',
  optimal_dimensions: 'Hold the card closer so it fills the frame.',
};

/**
 * Validate the captured PAN front via the `validate-pan` edge function, which
 * stores the image, passes its signed URL to IDfy eve as `document1`
 * (doc_type ind_pan) and checks every advanced_features result.
 *
 * Never throws: transport failures come back as `{ ok: false, error }`.
 */
export async function validatePan(image: string, sessionId: string, signal?: AbortSignal): Promise<PanValidation> {
  if (!url || !anonKey) {
    console.info('[validate-pan] Supabase not configured — skipping validation.');
    return { ok: true, failed: [] };
  }
  try {
    const res = await fetch(`${url}/functions/v1/validate-pan`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, session_id: sessionId }),
      signal,
    });
    const out = (await res.json().catch(() => null)) as PanValidation | null;
    if (!out || typeof out.ok !== 'boolean') return { ok: false, failed: [], error: `HTTP_${res.status}` };
    return { ok: out.ok, failed: out.failed ?? [], error: out.error, message: out.message, pan_details: out.pan_details };
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return { ok: false, failed: [], error: 'ABORTED' };
    console.warn('[validate-pan] request failed:', err);
    return { ok: false, failed: [], error: 'NETWORK' };
  }
}
