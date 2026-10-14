import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAcceptability, evaluateAdvancedFeatures, evaluateNsdl, pickPanDetails, toIsoDob } from './checks.mjs';

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

// Shape of eve's /v3/tasks/sync/extract/ind_pan response (values made up).
const OCR = {
  status: 'completed',
  result: {
    extraction_output: {
      age: 41,
      date_of_birth: '1985-01-31',
      date_of_issue: '',
      fathers_name: 'RAMESH KUMAR',
      id_number: 'ABCDE1234F',
      is_scanned: false,
      minor: false,
      name_on_card: 'SURESH KUMAR',
      pan_type: 'Individual',
    },
  },
};

test('OCR output maps to PAN details', () => {
  assert.deepEqual(pickPanDetails(OCR), {
    name: 'SURESH KUMAR',
    fathers_name: 'RAMESH KUMAR',
    date_of_birth: '1985-01-31',
    pan_number: 'ABCDE1234F',
    pan_type: 'Individual',
  });
});

test('OCR without a PAN number or name is not a success', () => {
  const out = (o) => ({ ...OCR, result: { extraction_output: { ...OCR.result.extraction_output, ...o } } });
  assert.equal(pickPanDetails(out({ id_number: '' })), null);
  assert.equal(pickPanDetails(out({ name_on_card: '  ' })), null);
  assert.equal(pickPanDetails({ status: 'failed' }), null);
  assert.equal(pickPanDetails(undefined), null);
});

// Real `result` from eve's async check_acceptability/document for a good PAN.
const ACCEPTABLE = {
  details: {
    card_hindrance: ['false'],
    flash_on_card: ['false'],
    is_laminated: ['false'],
    is_live: ['true'],
    is_photocopy: ['false'],
    optimal_dimensions: ['true'],
  },
};
const withDetail = (d) => ({ details: { ...ACCEPTABLE.details, ...d } });

test('a clean live capture is acceptable', () => {
  assert.deepEqual(evaluateAcceptability(ACCEPTABLE), { ok: true, failed: [] });
});

test('each bad acceptability flag is reported', () => {
  assert.deepEqual(evaluateAcceptability(withDetail({ card_hindrance: ['true'] })).failed, ['card_hindrance']);
  assert.deepEqual(evaluateAcceptability(withDetail({ flash_on_card: ['true'] })).failed, ['flash_on_card']);
  assert.deepEqual(evaluateAcceptability(withDetail({ is_photocopy: ['true'] })).failed, ['is_photocopy']);
  assert.deepEqual(evaluateAcceptability(withDetail({ is_live: ['false'] })).failed, ['is_live']);
  assert.deepEqual(evaluateAcceptability(withDetail({ optimal_dimensions: ['false'] })).failed, ['optimal_dimensions']);
});

test('a laminated card is still acceptable', () => {
  assert.equal(evaluateAcceptability(withDetail({ is_laminated: ['true'] })).ok, true);
});

test('missing acceptability details fail every check, booleans also accepted', () => {
  assert.deepEqual(evaluateAcceptability({}).failed, [
    'card_hindrance',
    'flash_on_card',
    'is_photocopy',
    'is_live',
    'optimal_dimensions',
  ]);
  assert.equal(evaluateAcceptability({ details: { card_hindrance: false, flash_on_card: [false], is_photocopy: 'false', is_live: true, optimal_dimensions: ['true'] } }).ok, true);
});

test('OCR dates convert to yyyy-mm-dd for NSDL', () => {
  assert.equal(toIsoDob('1985-06-08'), '1985-06-08');
  assert.equal(toIsoDob('08/06/1985'), '1985-06-08');
  assert.equal(toIsoDob('08-06-1985'), '1985-06-08');
  assert.equal(toIsoDob(' 8/6/1985 '), '1985-06-08');
  assert.equal(toIsoDob('1985/06/08'), '1985-06-08');
  assert.equal(toIsoDob(''), null);
  assert.equal(toIsoDob('31/02/1985'), null);
  assert.equal(toIsoDob('June 1985'), null);
});

// Shape of eve's verify_with_source/ind_pan `result` (values made up).
const NSDL = {
  source_output: {
    aadhaar_seeding_status: true,
    dob_match: true,
    name_match: true,
    pan_status: 'Existing and Valid. PAN is Operative',
    status: 'id_found',
  },
};
const nsdl = (o) => ({ source_output: { ...NSDL.source_output, ...o } });

test('PAN found in NSDL with matching name and DOB passes', () => {
  assert.deepEqual(evaluateNsdl(NSDL), { ok: true, failed: [] });
});

test('only a PAN not found in NSDL blocks the customer', () => {
  assert.deepEqual(evaluateNsdl(nsdl({ status: 'id_not_found' })), { ok: false, failed: ['pan_not_found'] });
  assert.deepEqual(evaluateNsdl(undefined), { ok: false, failed: ['pan_not_found'] });
});

test('name or DOB mismatch does not block once the PAN is found', () => {
  assert.equal(evaluateNsdl(nsdl({ name_match: false, dob_match: false })).ok, true);
});
