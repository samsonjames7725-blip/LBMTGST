import { describe, expect, it } from 'vitest';
import { gstCalculateSchema } from '@/validators/gst';

const validPayload = {
  supplier_state_code: '27',
  place_of_supply_code: '29',
  lines: [
    {
      description: 'Patient monitor',
      hsn_sac: '9018',
      quantity: 1,
      unit_price_paise: 10_000,
      gst_rate_bps: 1800,
    },
  ],
};

describe('gstCalculateSchema', () => {
  it('accepts a valid calculation payload', () => {
    expect(gstCalculateSchema.safeParse(validPayload).success).toBe(true);
  });

  it('rejects non-statutory GST rates', () => {
    const bad = { ...validPayload, lines: [{ ...validPayload.lines[0], gst_rate_bps: 1900 }] };
    expect(gstCalculateSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects malformed HSN/SAC', () => {
    const bad = { ...validPayload, lines: [{ ...validPayload.lines[0], hsn_sac: '90' }] };
    expect(gstCalculateSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects empty line lists and negative money', () => {
    expect(gstCalculateSchema.safeParse({ ...validPayload, lines: [] }).success).toBe(false);
    const bad = { ...validPayload, lines: [{ ...validPayload.lines[0], unit_price_paise: -1 }] };
    expect(gstCalculateSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects malformed state codes and unknown fields (strict)', () => {
    expect(gstCalculateSchema.safeParse({ ...validPayload, supplier_state_code: '2A' }).success).toBe(false);
    expect(gstCalculateSchema.safeParse({ ...validPayload, hack: true }).success).toBe(false);
  });
});
