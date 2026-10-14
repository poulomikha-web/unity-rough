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
