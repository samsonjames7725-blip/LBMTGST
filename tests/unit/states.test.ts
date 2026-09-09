import { describe, expect, it } from 'vitest';
import { STATE_CODES, stateCodeFromGstin, stateNameFromCode } from '@/gst/states';

describe('state codes', () => {
  it('maps key state codes correctly', () => {
    expect(stateNameFromCode('27')).toBe('Maharashtra');
    expect(stateNameFromCode('29')).toBe('Karnataka');
    expect(stateNameFromCode('07')).toBe('Delhi');
    expect(stateNameFromCode('33')).toBe('Tamil Nadu');
    expect(stateNameFromCode('38')).toBe('Ladakh');
  });

  it('does not include withdrawn codes (25 = old Daman & Diu, 28 = old AP)', () => {
    expect(STATE_CODES.has('25')).toBe(false);
    expect(STATE_CODES.has('28')).toBe(false);
  });

  it('extracts the state code from a GSTIN', () => {
    expect(stateCodeFromGstin('27AAPFU0939F1ZV')).toBe('27');
    expect(stateCodeFromGstin('ZZAAPFU0939F1ZV')).toBeNull();
  });

  it('returns null for unknown codes', () => {
    expect(stateNameFromCode('99')).toBeNull();
  });
});
