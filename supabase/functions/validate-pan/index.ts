// validate-pan — Supabase Edge Function (Deno).
//
// The browser can't call IDfy eve directly: the api-key/account-id must stay
// secret and eve sends no CORS headers. So the customer app POSTs the captured
// PAN frame here, and this function:
//   1. stores it in the private `pan-captures` bucket,
//   2. makes a short-lived signed URL for it (eve's `document1`),
//   3. calls eve /v3/tasks/sync/validate/document with doc_type=ind_pan and
//      all advanced_features on, and
//   4. if every advanced feature passed, OCRs the same image with
//      /v3/tasks/sync/extract/ind_pan,
//   5. if the OCR read the card, runs the async
//      /v3/tasks/async/check_acceptability/document (live_captured) and polls
//      /v3/tasks?request_id= for its result,
//   6. if acceptable, verifies the OCR'd PAN number, name and DOB against
//      NSDL with /v3/tasks/sync/verify_with_source/ind_pan, and
//   7. returns { ok, failed[], pan_details } — ok only when all four passed.
// Every eve call gets its own fresh task_id/group_id.
//
// Secrets (set with `supabase secrets set`): IDFY_API_KEY, IDFY_ACCOUNT_ID.
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided by the runtime.
// Deploy with --no-verify-jwt: the app's sb_publishable key is not a JWT.

import { evaluateAcceptability, evaluateAdvancedFeatures, evaluateNsdl, pickPanDetails, toIsoDob } from './checks.mjs';

const EVE_URL = 'https://eve.idfy.com/v3/tasks/sync/validate/document';
const EVE_OCR_URL = 'https://eve.idfy.com/v3/tasks/sync/extract/ind_pan';
const EVE_ACCEPTABILITY_URL = 'https://eve.idfy.com/v3/tasks/async/check_acceptability/document';
const EVE_TASKS_URL = 'https://eve.idfy.com/v3/tasks';
const EVE_NSDL_URL = 'https://eve.idfy.com/v3/tasks/sync/verify_with_source/ind_pan';
const ACCEPTABILITY_POLL_MS = 1000;
const ACCEPTABILITY_TIMEOUT_MS = 25_000;
const BUCKET = 'pan-captures';
const SIGNED_URL_TTL_S = 600;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ALLOWED_ORIGINS = [/^https:\/\/poulomikha-web\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const IDFY_API_KEY = Deno.env.get('IDFY_API_KEY');
const IDFY_ACCOUNT_ID = Deno.env.get('IDFY_ACCOUNT_ID');

function cors(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.some((re) => re.test(origin));
  return {
    'Access-Control-Allow-Origin': allowed ? origin! : 'https://poulomikha-web.github.io',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info',
    Vary: 'Origin',
  };
}

function storageHeaders(extra: Record<string, string> = {}): Record<string, string> {
  // Legacy service_role keys are JWTs and go in Authorization too; the newer
  // sb_secret_ keys are not JWTs and work through `apikey` alone.
  const h: Record<string, string> = { apikey: SERVICE_KEY, ...extra };
  if (SERVICE_KEY.startsWith('eyJ')) h.Authorization = `Bearer ${SERVICE_KEY}`;
  return h;
}

async function ensureBucket(): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: storageHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  });
  // 409/400 "already exists" is the normal case after the first call.
  if (!res.ok && res.status !== 409 && res.status !== 400) {
    throw new Error(`bucket create failed: ${res.status} ${await res.text()}`);
  }
}

/**
 * Keep eve's exact response next to the image (<session>/<task>.json) so a
 * journey's result can be read back later. Never fails the request.
 */
async function saveResponse(path: string, record: unknown): Promise<void> {
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: storageHeaders({ 'Content-Type': 'application/json', 'x-upsert': 'true' }),
      body: JSON.stringify(record, null, 2),
    });
    if (!res.ok) console.warn('[validate-pan] save response failed', res.status, await res.text());
  } catch (err) {
    console.warn('[validate-pan] save response threw', err);
  }
}

type EveHeaders = Record<string, string>;

/**
 * Start eve's async check_acceptability task and poll until it finishes.
 * Returns the final task (status completed/failed), or null on timeout.
 */
async function runAcceptability(
  headers: EveHeaders,
  documentUrl: string,
  taskId: string,
  groupId: string
): Promise<{ http_status: number; request_id: string | null; task: any }> {
  const start = await fetch(EVE_ACCEPTABILITY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ task_id: taskId, group_id: groupId, data: { document1: documentUrl, live_captured: true } }),
  });
  const started = await start.json().catch(() => ({}));
  const requestId: string | null = started.request_id ?? null;
  if (!start.ok || !requestId) return { http_status: start.status, request_id: requestId, task: started };

  const deadline = Date.now() + ACCEPTABILITY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, ACCEPTABILITY_POLL_MS));
    const res = await fetch(`${EVE_TASKS_URL}?request_id=${encodeURIComponent(requestId)}`, { headers });
    const tasks = await res.json().catch(() => null);
    const task = Array.isArray(tasks) ? tasks[0] : null;
    if (task && task.status !== 'in_progress') return { http_status: res.status, request_id: requestId, task };
  }
  return { http_status: 0, request_id: requestId, task: null };
}

/** Upload the image and return a signed URL eve can fetch. */
async function storeAndSign(bytes: Uint8Array, contentType: string, path: string): Promise<string> {
  const upload = () =>
    fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: storageHeaders({ 'Content-Type': contentType, 'x-upsert': 'true' }),
      body: bytes,
    });
  let res = await upload();
  if (!res.ok) {
    // First call on a fresh project: the bucket doesn't exist yet.
    await ensureBucket();
    res = await upload();
  }
  if (!res.ok) throw new Error(`upload failed: ${res.status} ${await res.text()}`);

  const sign = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: 'POST',
    headers: storageHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_S }),
  });
  if (!sign.ok) throw new Error(`sign failed: ${sign.status} ${await sign.text()}`);
  const { signedURL } = (await sign.json()) as { signedURL: string };
  return `${SUPABASE_URL}/storage/v1${signedURL}`;
}

function decodeDataUrl(dataUrl: unknown): { bytes: Uint8Array; contentType: string } | null {
  if (typeof dataUrl !== 'string') return null;
  const m = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, contentType: m[1] };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const headers = { ...cors(req.headers.get('Origin')), 'Content-Type': 'application/json' };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  // Each call costs an eve request: refuse anything not coming from our pages.
  // (Origin can be forged outside a browser, so this only stops casual abuse.)
  const origin = req.headers.get('Origin');
  if (!origin || !ALLOWED_ORIGINS.some((re) => re.test(origin))) return reply(403, { ok: false, error: 'FORBIDDEN_ORIGIN' });
  if (!IDFY_API_KEY || !IDFY_ACCOUNT_ID) return reply(500, { ok: false, error: 'NOT_CONFIGURED' });

  let body: { image?: unknown; session_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return reply(400, { ok: false, error: 'BAD_JSON' });
  }
  const img = decodeDataUrl(body.image);
  if (!img) return reply(400, { ok: false, error: 'BAD_IMAGE' });
  if (img.bytes.length > MAX_IMAGE_BYTES) return reply(413, { ok: false, error: 'IMAGE_TOO_LARGE' });

  const sessionId = typeof body.session_id === 'string' && UUID_RE.test(body.session_id) ? body.session_id : crypto.randomUUID();
  // Fresh eve ids on every click (retakes included); the session id only
  // groups the stored images.
  const taskId = crypto.randomUUID();
  const groupId = crypto.randomUUID();
  const ext = img.contentType === 'image/png' ? 'png' : 'jpg';

  try {
    const documentUrl = await storeAndSign(img.bytes, img.contentType, `${sessionId}/${taskId}.${ext}`);

    const eveHeaders: EveHeaders = { 'Content-Type': 'application/json', 'api-key': IDFY_API_KEY, 'account-id': IDFY_ACCOUNT_ID };
    const eve = await fetch(EVE_URL, {
      method: 'POST',
      headers: eveHeaders,
      body: JSON.stringify({
        task_id: taskId,
        group_id: groupId,
        data: {
          document1: documentUrl,
          doc_type: 'ind_pan',
          advanced_features: { face_details: true, detect_doc_side: true, check_scan: true },
        },
      }),
    });
    const out = await eve.json().catch(() => ({}));
    const verdict = eve.ok && out.status === 'completed' ? evaluateAdvancedFeatures(out.result) : null;

    // Validation passed -> OCR the same image, again with fresh eve ids.
    let ocr: { task_id: string; group_id: string; http_status: number; response: any } | null = null;
    if (verdict?.ok) {
      const ocrTaskId = crypto.randomUUID();
      const ocrGroupId = crypto.randomUUID();
      const res = await fetch(EVE_OCR_URL, {
        method: 'POST',
        headers: eveHeaders,
        body: JSON.stringify({ task_id: ocrTaskId, group_id: ocrGroupId, data: { document1: documentUrl } }),
      });
      ocr = { task_id: ocrTaskId, group_id: ocrGroupId, http_status: res.status, response: await res.json().catch(() => ({})) };
    }
    const details = ocr ? pickPanDetails(ocr.response) : null;

    // OCR read the card -> check the capture is acceptable (async task).
    let acceptability: { task_id: string; group_id: string; http_status: number; request_id: string | null; response: any } | null = null;
    if (details) {
      const accTaskId = crypto.randomUUID();
      const accGroupId = crypto.randomUUID();
      const run = await runAcceptability(eveHeaders, documentUrl, accTaskId, accGroupId);
      acceptability = { task_id: accTaskId, group_id: accGroupId, http_status: run.http_status, request_id: run.request_id, response: run.task };
    }
    const accVerdict = acceptability?.response?.status === 'completed' ? evaluateAcceptability(acceptability.response.result) : null;

    // Acceptable -> confirm the PAN exists in NSDL with the OCR'd name and DOB.
    const dob = details ? toIsoDob(details.date_of_birth) : null;
    let nsdl: { task_id: string; group_id: string; http_status: number; request: unknown; response: any } | null = null;
    if (accVerdict?.ok && details && dob) {
      const nsdlTaskId = crypto.randomUUID();
      const nsdlGroupId = crypto.randomUUID();
      const data = { id_number: details.pan_number, full_name: details.name, dob };
      const res = await fetch(EVE_NSDL_URL, {
        method: 'POST',
        headers: eveHeaders,
        body: JSON.stringify({ task_id: nsdlTaskId, group_id: nsdlGroupId, data }),
      });
      nsdl = { task_id: nsdlTaskId, group_id: nsdlGroupId, http_status: res.status, request: data, response: await res.json().catch(() => ({})) };
    }
    const nsdlVerdict = nsdl?.response?.status === 'completed' ? evaluateNsdl(nsdl.response.result) : null;

    await saveResponse(`${sessionId}/${taskId}.json`, {
      at: new Date().toISOString(),
      request: { task_id: taskId, group_id: groupId, doc_type: 'ind_pan' },
      http_status: eve.status,
      verdict,
      response: out,
      ocr,
      acceptability: acceptability && { ...acceptability, verdict: accVerdict },
      nsdl: nsdl && { ...nsdl, verdict: nsdlVerdict },
    });

    const ids = {
      task_id: taskId,
      group_id: groupId,
      request_id: out.request_id,
      ocr_task_id: ocr?.task_id,
      ocr_group_id: ocr?.group_id,
      acceptability_task_id: acceptability?.task_id,
      acceptability_group_id: acceptability?.group_id,
      nsdl_task_id: nsdl?.task_id,
      nsdl_group_id: nsdl?.group_id,
    };

    if (!verdict) {
      // e.g. 422 INVALID_IMAGE (too small / unreadable) — the customer retakes.
      console.warn('[validate-pan] eve error', eve.status, JSON.stringify(out));
      return reply(200, { ok: false, failed: [], error: out.error ?? `EVE_${eve.status}`, message: out.message ?? null, ...ids });
    }
    if (!verdict.ok) return reply(200, { ...verdict, ...ids, result: out.result });
    if (!details) {
      console.warn('[validate-pan] ocr failed', ocr?.http_status, JSON.stringify(ocr?.response));
      return reply(200, {
        ok: false,
        failed: [],
        error: 'OCR_FAILED',
        message: ocr?.response?.message ?? null,
        ...ids,
        result: out.result,
      });
    }
    if (!accVerdict) {
      // Task failed to start, failed on eve's side, or didn't finish in time.
      console.warn('[validate-pan] acceptability error', JSON.stringify(acceptability));
      const timedOut = acceptability?.http_status === 0;
      return reply(200, {
        ok: false,
        failed: [],
        error: timedOut ? 'ACCEPTABILITY_TIMEOUT' : 'ACCEPTABILITY_FAILED',
        message: acceptability?.response?.message ?? null,
        ...ids,
      });
    }
    if (!accVerdict.ok) return reply(200, { ...accVerdict, ...ids, acceptability: acceptability?.response?.result });
    if (!dob) {
      // OCR gave no usable date of birth, so NSDL can't be asked.
      return reply(200, { ok: false, failed: [], error: 'DOB_UNREADABLE', message: null, ...ids });
    }
    if (!nsdlVerdict) {
      console.warn('[validate-pan] nsdl error', JSON.stringify(nsdl));
      return reply(200, {
        ok: false,
        failed: [],
        error: nsdl?.response?.error ?? 'NSDL_FAILED',
        message: nsdl?.response?.message ?? null,
        ...ids,
      });
    }
    if (!nsdlVerdict.ok) return reply(200, { ...nsdlVerdict, ...ids });
    return reply(200, { ok: true, failed: [], ...ids, result: out.result, pan_details: details, pan_status: nsdl?.response?.result?.source_output?.pan_status ?? null });
  } catch (err) {
    console.error('[validate-pan]', err);
    return reply(502, { ok: false, failed: [], error: 'UPSTREAM_FAILED' });
  }
});
