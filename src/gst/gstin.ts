import { STATE_CODES } from './states';

/**
 * GSTIN structural validation (per GSTN format) with the official checksum.
 *
 * Format (15 characters):
 *   [0-9]{2}   — state code
 *   [A-Z]{5}   — PAN letters
 *   [0-9]{4}   — PAN digits
 *   [A-Z]      — PAN check letter
 *   [0-9]      — entity number
 *   [A-Z]      — 'Z' (fixed by GSTN)
 *   [0-9A-Z]   — checksum (mod-36 algorithm below)
 *
 * Deterministic application logic — this is the single validation path for
 * every GSTIN entered or stored in the system.
 */

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9][A-Z][0-9A-Z]$/;
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Official GSTIN checksum: mod-36 with alternating factor 1,2. */
export function gstinChecksum(gstin15: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = ALPHABET.indexOf(gstin15[i]);
    if (value < 0) return '';
    const factor = i % 2 === 0 ? 1 : 2;
    const product = value * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }
  return ALPHABET[(36 - (sum % 36)) % 36];
}

export interface GstinValidation {
  valid: boolean;
  reason?: string;
  stateCode?: string;
  stateName?: string;
  pan?: string;
  entityNumber?: string;
}

export function validateGstin(input: string): GstinValidation {
  const gstin = (input ?? '').trim().toUpperCase();
  if (gstin.length !== 15) {
    return { valid: false, reason: 'GSTIN must be exactly 15 characters' };
  }
  if (!GSTIN_REGEX.test(gstin)) {
    return { valid: false, reason: 'GSTIN does not match the required format' };
  }
  const stateCode = gstin.slice(0, 2);
  if (!STATE_CODES.has(stateCode)) {
    return { valid: false, reason: `Unknown state code "${stateCode}"` };
  }
  if (gstin[13] !== 'Z') {
    return { valid: false, reason: 'Position 14 must be "Z"' };
  }
  const expected = gstinChecksum(gstin);
  if (expected !== gstin[14]) {
    return { valid: false, reason: 'GSTIN checksum failed' };
  }
  return {
    valid: true,
    stateCode,
    stateName: STATE_CODES.get(stateCode),
    pan: gstin.slice(2, 12),
    entityNumber: gstin[12],
  };
}

/**
 * Extracts the PAN from a valid GSTIN. Returns null for invalid GSTINs —
 * the caller must never receive a guessed PAN.
 */
export function panFromGstin(input: string): string | null {
  const validation = validateGstin(input);
  return validation.valid ? validation.pan ?? null : null;
}
