// Plain JS (with JSDoc types) so it runs in both the Deno edge function and
// `node --test` on Node 20 without a TypeScript build step.

/** @typedef {'face_details' | 'detect_doc_side' | 'check_scan'} AdvancedFeature */

/**
 * Decide whether each requested advanced feature passed, from the `result`
 * object of eve's /v3/tasks/sync/validate/document response.
 *
 *  - face_details    -> result.face_details.detected must be true
 *  - detect_doc_side -> result.detected_doc_side must be "front" (PAN front capture)
 *  - check_scan      -> result.is_scanned must be false (a scan/photocopy fails)
 *
 * A missing field counts as a failure. Every failure is reported, so the
 * customer sees a single error listing all of them.
 *
 * @param {any} result
 * @returns {{ ok: boolean, failed: AdvancedFeature[] }}
 */
export function evaluateAdvancedFeatures(result) {
  const r = result ?? {};
  /** @type {AdvancedFeature[]} */
  const failed = [];
  if (r.face_details?.detected !== true) failed.push('face_details');
  if (r.detected_doc_side !== 'front') failed.push('detect_doc_side');
  if (r.is_scanned !== false) failed.push('check_scan');
  return { ok: failed.length === 0, failed };
}

/**
 * @typedef {{ name: string, fathers_name: string, date_of_birth: string,
 *   pan_number: string, pan_type: string }} PanDetails
 */

/**
 * Pull the customer's PAN details out of eve's extract/ind_pan response.
 * Returns null unless the task completed with at least a PAN number and name.
 *
 * @param {any} out
 * @returns {PanDetails | null}
 */
export function pickPanDetails(out) {
  if (out?.status !== 'completed') return null;
  const x = out.result?.extraction_output ?? {};
  const s = (v) => (typeof v === 'string' ? v.trim() : '');
  const details = {
    name: s(x.name_on_card),
    fathers_name: s(x.fathers_name),
    date_of_birth: s(x.date_of_birth),
    pan_number: s(x.id_number),
    pan_type: s(x.pan_type),
  };
  return details.name && details.pan_number ? details : null;
}

/**
 * @typedef {'card_hindrance' | 'flash_on_card' | 'is_photocopy' | 'is_live' |
 *   'optimal_dimensions'} AcceptabilityCheck
 */

/** Each checked flag and the value it must have to pass. is_laminated is informational. */
const ACCEPTABLE_WHEN = /** @type {const} */ ([
  ['card_hindrance', false],
  ['flash_on_card', false],
  ['is_photocopy', false],
  ['is_live', true],
  ['optimal_dimensions', true],
]);

/** eve returns flags as ["true"]; also tolerate bare strings/booleans. */
function flag(v) {
  const x = Array.isArray(v) ? v[0] : v;
  if (x === true || x === 'true') return true;
  if (x === false || x === 'false') return false;
  return undefined;
}

/**
 * Decide whether the capture is acceptable, from the `result` of eve's async
 * check_acceptability/document task. A missing flag counts as a failure.
 *
 * @param {any} result
 * @returns {{ ok: boolean, failed: AcceptabilityCheck[] }}
 */
export function evaluateAcceptability(result) {
  const d = result?.details ?? {};
  /** @type {AcceptabilityCheck[]} */
  const failed = [];
  for (const [key, want] of ACCEPTABLE_WHEN) {
    if (flag(d[key]) !== want) failed.push(key);
  }
  return { ok: failed.length === 0, failed };
}

/**
 * Normalise an OCR date of birth to the yyyy-mm-dd NSDL expects. Accepts
 * yyyy-mm-dd, yyyy/mm/dd, dd/mm/yyyy and dd-mm-yyyy; returns null for
 * anything else or an impossible date.
 *
 * @param {unknown} raw
 * @returns {string | null}
 */
export function toIsoDob(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(s);
  let y, mo, d;
  if (m) [, y, mo, d] = m;
  else if ((m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(s))) [, d, mo, y] = m;
  else return null;
  const date = new Date(Date.UTC(+y, +mo - 1, +d));
  if (date.getUTCFullYear() !== +y || date.getUTCMonth() !== +mo - 1 || date.getUTCDate() !== +d) return null;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** @typedef {'pan_not_found'} NsdlCheck */

/**
 * Decide the NSDL check from eve's verify_with_source/ind_pan `result`: the
 * customer proceeds only if the PAN exists (source_output.status id_found).
 * name_match / dob_match are recorded but don't block. The caller only
 * evaluates tasks whose status is "completed".
 *
 * @param {any} result
 * @returns {{ ok: boolean, failed: NsdlCheck[] }}
 */
export function evaluateNsdl(result) {
  return result?.source_output?.status === 'id_found' ? { ok: true, failed: [] } : { ok: false, failed: ['pan_not_found'] };
}
