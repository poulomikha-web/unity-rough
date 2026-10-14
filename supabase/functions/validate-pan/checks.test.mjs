import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAdvancedFeatures } from './checks.mjs';

// Real `result` returned by eve validate/document for a good PAN front.
const GOOD = {
  detected_doc_side: 'front',
  detected_doc_type: 'ind_pan',
  face_details: { detected: true },
  is_readable: true,
  is_scanned: false,
  readability: { confidence: 67 },
};

test('all three advanced features pass', () => {
  assert.deepEqual(evaluateAdvancedFeatures(GOOD), { ok: true, failed: [] });
});

test('no face on the card fails face_details', () => {
  const r = evaluateAdvancedFeatures({ ...GOOD, face_details: { detected: false } });
  assert.deepEqual(r, { ok: false, failed: ['face_details'] });
});

test('back side (or undetected side) fails detect_doc_side', () => {
  assert.deepEqual(evaluateAdvancedFeatures({ ...GOOD, detected_doc_side: 'back' }).failed, ['detect_doc_side']);
  assert.deepEqual(evaluateAdvancedFeatures({ ...GOOD, detected_doc_side: null }).failed, ['detect_doc_side']);
});

test('a scanned / photocopied card fails check_scan', () => {
  assert.deepEqual(evaluateAdvancedFeatures({ ...GOOD, is_scanned: true }).failed, ['check_scan']);
});

test('missing fields count as failures, all reported together', () => {
  assert.deepEqual(evaluateAdvancedFeatures({}), {
    ok: false,
    failed: ['face_details', 'detect_doc_side', 'check_scan'],
  });
  assert.equal(evaluateAdvancedFeatures(undefined).ok, false);
});
