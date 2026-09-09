import { describe, expect, it } from 'vitest';
import { gstinChecksum, panFromGstin, validateGstin } from '@/gst/gstin';

// Canonical GSTN-documented example, independently hand-verified against the
// mod-36 alternating-factor checksum algorithm.
const VALID_MH = '27AAPFU0939F1ZV';

describe('validateGstin', () => {
  it('accepts a valid GSTIN and extracts state/PAN/entity', () => {
    const result = validateGstin(VALID_MH);
    expect(result.valid).toBe(true);
    expect(result.stateCode).toBe('27');
    expect(result.stateName).toBe('Maharashtra');
    expect(result.pan).toBe('AAPFU0939F');
    expect(result.entityNumber).toBe('1');
  });

  it('is case-insensitive', () => {
    expect(validateGstin(VALID_MH.toLowerCase()).valid).toBe(true);
  });

  it('rejects wrong length and malformed structure', () => {
    expect(validateGstin('27AAPFU0939F1Z').valid).toBe(false);
    expect(validateGstin('27AAPFU0939F1ZVA').valid).toBe(false);
    expect(validateGstin('27AAPFU0939F1Z!').valid).toBe(false);
    expect(validateGstin('2CAAPFU0939F1ZV').valid).toBe(false);
    expect(validateGstin('27AAPFU0939FZXV').valid).toBe(false);
  });

  it('rejects unknown state codes', () => {
    expect(validateGstin('25AAPFU0939F1ZV').valid).toBe(false);
  });

  it('rejects a corrupted checksum', () => {
    const corrupted = VALID_MH.slice(0, 14) + (VALID_MH[14] === 'V' ? 'X' : 'V');
    const result = validateGstin(corrupted);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('GSTIN checksum failed');
  });

  it('computes the documented checksum value', () => {
    expect(gstinChecksum(VALID_MH)).toBe('V');
  });

  it('refuses to guess a PAN from an invalid GSTIN', () => {
    expect(panFromGstin('not-a-gstin')).toBeNull();
    expect(panFromGstin(VALID_MH)).toBe('AAPFU0939F');
  });
});
