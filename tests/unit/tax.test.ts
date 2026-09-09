import { describe, expect, it } from 'vitest';
import { ALLOWED_GST_RATES_BPS, GstEngineError, computeGst, formatInr } from '@/gst/tax';

describe('computeGst — intra-state (CGST + SGST)', () => {
  it('splits 18% into equal CGST and SGST halves', () => {
    const result = computeGst({
      supplierStateCode: '27',
      placeOfSupplyCode: '27',
      lines: [{ quantity: 1, unitPricePaise: 10_000, gstRateBps: 1800 }],
    });
    expect(result.supplyType).toBe('intra_state');
    expect(result.lines[0].taxableValuePaise).toBe(10_000);
    expect(result.lines[0].cgstPaise).toBe(900);
    expect(result.lines[0].sgstPaise).toBe(900);
    expect(result.lines[0].igstPaise).toBe(0);
    expect(result.invoiceTotalPaise).toBe(11_800);
    expect(result.roundOffPaise).toBe(0);
  });

  it('handles fractional quantities and discounts deterministically', () => {
    const result = computeGst({
      supplierStateCode: '27',
      placeOfSupplyCode: '27',
      lines: [
        { quantity: 1.5, unitPricePaise: 10_000, gstRateBps: 1800, discountPaise: 500 },
      ],
    });
    expect(result.lines[0].taxableValuePaise).toBe(14_500);
    expect(result.lines[0].cgstPaise).toBe(1_305);
    expect(result.grandTotalPaise).toBe(17_110);
    expect(result.roundOffPaise).toBe(-10);
    expect(result.invoiceTotalPaise).toBe(17_100);
  });
});

describe('computeGst — inter-state (IGST)', () => {
  it('charges full IGST across states', () => {
    const result = computeGst({
      supplierStateCode: '27',
      placeOfSupplyCode: '29',
      lines: [{ quantity: 2, unitPricePaise: 5_000, gstRateBps: 1800 }],
    });
    expect(result.supplyType).toBe('inter_state');
    expect(result.lines[0].igstPaise).toBe(1_800);
    expect(result.lines[0].cgstPaise).toBe(0);
    expect(result.invoiceTotalPaise).toBe(11_800);
  });

  it('applies compensation cess when provided', () => {
    const result = computeGst({
      supplierStateCode: '27',
      placeOfSupplyCode: '29',
      lines: [{ quantity: 1, unitPricePaise: 10_000, gstRateBps: 2800, cessRateBps: 1000 }],
    });
    expect(result.lines[0].igstPaise).toBe(2_800);
    expect(result.lines[0].cessPaise).toBe(1_000);
    expect(result.totalTaxPaise).toBe(3_800);
  });
});

describe('computeGst — reverse charge and round-off', () => {
  it('reports tax under reverse charge but does not charge it on the invoice', () => {
    const result = computeGst({
      supplierStateCode: '27',
      placeOfSupplyCode: '27',
      reverseCharge: true,
      lines: [{ quantity: 1, unitPricePaise: 10_000, gstRateBps: 1800 }],
    });
    expect(result.reverseCharge).toBe(true);
    expect(result.totalTaxPaise).toBe(1_800);
    expect(result.lines[0].lineTotalPaise).toBe(10_000);
    expect(result.invoiceTotalPaise).toBe(10_000);
  });

  it('rounds the invoice total to whole rupees with an explicit adjustment', () => {
    const result = computeGst({
      supplierStateCode: '27',
      placeOfSupplyCode: '27',
      lines: [{ quantity: 1, unitPricePaise: 10_050, gstRateBps: 1800 }],
    });
    expect(result.grandTotalPaise).toBe(11_860);
    expect(result.roundOffPaise).toBe(40);
    expect(result.invoiceTotalPaise).toBe(11_900);
  });
});

describe('computeGst — guards', () => {
  const base = { supplierStateCode: '27', placeOfSupplyCode: '27' };

  it('rejects non-statutory GST rates', () => {
    expect(() =>
      computeGst({ ...base, lines: [{ quantity: 1, unitPricePaise: 100, gstRateBps: 1900 }] }),
    ).toThrow(GstEngineError);
  });

  it('rejects negative money, discount exceeding value, bad quantities', () => {
    expect(() =>
      computeGst({ ...base, lines: [{ quantity: 1, unitPricePaise: -5, gstRateBps: 1800 }] }),
    ).toThrow(GstEngineError);
    expect(() =>
      computeGst({ ...base, lines: [{ quantity: 1, unitPricePaise: 100, discountPaise: 200, gstRateBps: 1800 }] }),
    ).toThrow(GstEngineError);
    expect(() =>
      computeGst({ ...base, lines: [{ quantity: 0, unitPricePaise: 100, gstRateBps: 1800 }] }),
    ).toThrow(GstEngineError);
  });

  it('rejects unknown state codes and empty lines', () => {
    expect(() => computeGst({ ...base, supplierStateCode: '99', lines: [{ quantity: 1, unitPricePaise: 100, gstRateBps: 500 }] })).toThrow(GstEngineError);
    expect(() => computeGst({ ...base, placeOfSupplyCode: 'AA', lines: [{ quantity: 1, unitPricePaise: 100, gstRateBps: 500 }] })).toThrow(GstEngineError);
    expect(() => computeGst({ ...base, lines: [] })).toThrow(GstEngineError);
  });

  it('exposes exactly the statutory rate schedule', () => {
    expect(ALLOWED_GST_RATES_BPS).toEqual([0, 25, 300, 500, 1200, 1800, 2800]);
  });
});

describe('formatInr', () => {
  it('formats paise with Indian digit grouping', () => {
    expect(formatInr(123450)).toBe('₹1,234.50');
    expect(formatInr(100)).toBe('₹1.00');
    expect(formatInr(5)).toBe('₹0.05');
    expect(formatInr(12_34_56_789)).toBe('₹12,34,567.89');
  });
});
