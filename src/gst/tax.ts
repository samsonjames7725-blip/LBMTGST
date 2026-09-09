/**
 * Deterministic GST computation engine — the single source of truth for all
 * tax math in LBMTGST (spec §20, §50). AI never calculates tax; this module
 * does, with integer paise arithmetic so money never hits floating-point
 * drift. Every invoice/credit note/debit note must route through here.
 *
 * Units:
 *   - amounts  : integer paise (₹1 = 100)
 *   - GST rates: integer basis points (18% = 1800, 0.25% = 25)
 */

import { STATE_CODES } from './states';

export type SupplyType = 'intra_state' | 'inter_state';

export class GstEngineError extends Error {
  readonly code = 'GST_ENGINE_ERROR';
}

/** Statutory GST rates (basis points). Nothing outside this schedule may be used. */
export const ALLOWED_GST_RATES_BPS = [0, 25, 300, 500, 1200, 1800, 2800] as const;

export interface TaxLineInput {
  /** Units supplied (may be fractional, e.g. 1.5 hours of service). */
  quantity: number;
  /** Per-unit price, pre-tax, in paise. */
  unitPricePaise: number;
  /** Total discount for the line, pre-tax, in paise. */
  discountPaise?: number;
  /** GST rate in basis points — must be in ALLOWED_GST_RATES_BPS. */
  gstRateBps: number;
  /** Compensation cess in basis points, if applicable to the goods. */
  cessRateBps?: number;
}

export interface TaxLineResult {
  taxableValuePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  cessPaise: number;
  totalTaxPaise: number;
  /** taxable + tax. Under reverse charge this is taxable only (see below). */
  lineTotalPaise: number;
}

export interface TaxComputationInput {
  /** State code (GSTIN prefix) of the supplier. */
  supplierStateCode: string;
  /** Place of supply state code. */
  placeOfSupplyCode: string;
  lines: TaxLineInput[];
  /**
   * Reverse charge: tax is still computed for reporting, but is NOT charged
   * on the invoice — the recipient self-accounts for it.
   */
  reverseCharge?: boolean;
}

export interface TaxComputationResult {
  supplyType: SupplyType;
  reverseCharge: boolean;
  lines: TaxLineResult[];
  subtotalTaxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  cessPaise: number;
  totalTaxPaise: number;
  /** Sum of line totals before invoice round-off. */
  grandTotalPaise: number;
  /** Adjustment applied so the invoice total is a whole number of rupees. */
  roundOffPaise: number;
  /** Grand total ± round-off, i.e. the amount payable on the document. */
  invoiceTotalPaise: number;
}

function assertPaise(value: number, label: string): number {
  if (!Number.isFinite(value) || Math.round(value) !== value) {
    throw new GstEngineError(`${label} must be an integer number of paise`);
  }
  if (value < 0) {
    throw new GstEngineError(`${label} cannot be negative`);
  }
  return value;
}

function computeLine(line: TaxLineInput, supplyType: SupplyType, chargeTax: boolean): TaxLineResult {
  const { quantity, unitPricePaise } = line;
  const discountPaise = assertPaise(line.discountPaise ?? 0, 'discountPaise');
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new GstEngineError('quantity must be a positive number');
  }
  const unit = assertPaise(unitPricePaise, 'unitPricePaise');
  if (!ALLOWED_GST_RATES_BPS.includes(line.gstRateBps as (typeof ALLOWED_GST_RATES_BPS)[number])) {
    throw new GstEngineError(`gstRateBps ${line.gstRateBps} is not in the statutory rate schedule`);
  }
  const cessRateBps = line.cessRateBps ?? 0;
  if (!Number.isFinite(cessRateBps) || cessRateBps < 0) {
    throw new GstEngineError('cessRateBps must be a non-negative number');
  }

  const grossPaise = Math.round(quantity * unit);
  const taxableValuePaise = grossPaise - discountPaise;
  if (taxableValuePaise < 0) {
    throw new GstEngineError('discount cannot exceed the line gross value');
  }

  // Halves are computed per-component and rounded independently — this is how
  // CGST/SGST appear on real invoices (e.g. 18% → 9% + 9%). Under reverse
  // charge the amounts are still computed (the recipient self-accounts for
  // them) but are not added to the payable line total.
  const halfTax = Math.round((taxableValuePaise * line.gstRateBps) / 2 / 10_000);
  const igst = Math.round((taxableValuePaise * line.gstRateBps) / 10_000);
  const cess = Math.round((taxableValuePaise * cessRateBps) / 10_000);

  const cgstPaise = supplyType === 'intra_state' ? halfTax : 0;
  const sgstPaise = cgstPaise;
  const igstPaise = supplyType === 'inter_state' ? igst : 0;
  const cessPaise = cess;
  const totalTaxPaise = cgstPaise + sgstPaise + igstPaise + cessPaise;

  return {
    taxableValuePaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    cessPaise,
    totalTaxPaise,
    lineTotalPaise: taxableValuePaise + (chargeTax ? totalTaxPaise : 0),
  };
}

export function computeGst(input: TaxComputationInput): TaxComputationResult {
  const supplier = input.supplierStateCode;
  const pos = input.placeOfSupplyCode;
  if (!STATE_CODES.has(supplier)) throw new GstEngineError(`Unknown supplier state code "${supplier}"`);
  if (!STATE_CODES.has(pos)) throw new GstEngineError(`Unknown place-of-supply state code "${pos}"`);
  if (!input.lines || input.lines.length === 0) {
    throw new GstEngineError('At least one line item is required');
  }

  const supplyType: SupplyType = supplier === pos ? 'intra_state' : 'inter_state';
  const reverseCharge = input.reverseCharge === true;
  const lines = input.lines.map((line) => computeLine(line, supplyType, !reverseCharge));

  const sum = (pick: (l: TaxLineResult) => number) => lines.reduce((acc, l) => acc + pick(l), 0);
  const subtotalTaxablePaise = sum((l) => l.taxableValuePaise);
  const cgstPaise = sum((l) => l.cgstPaise);
  const sgstPaise = sum((l) => l.sgstPaise);
  const igstPaise = sum((l) => l.igstPaise);
  const cessPaise = sum((l) => l.cessPaise);
  const totalTaxPaise = cgstPaise + sgstPaise + igstPaise + cessPaise;
  const grandTotalPaise = sum((l) => l.lineTotalPaise);

  const invoiceTotalPaise = Math.round(grandTotalPaise / 100) * 100;
  const roundOffPaise = invoiceTotalPaise - grandTotalPaise;

  return {
    supplyType,
    reverseCharge,
    lines,
    subtotalTaxablePaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    cessPaise,
    totalTaxPaise,
    grandTotalPaise,
    roundOffPaise,
    invoiceTotalPaise,
  };
}

/** Formats integer paise as an INR string with two decimals (₹1,234.50). */
export function formatInr(paise: number): string {
  assertPaise(paise, 'paise');
  const rupees = Math.trunc(paise / 100);
  const paisePart = Math.abs(paise % 100).toString().padStart(2, '0');
  const sign = rupees < 0 ? '-' : '';
  const digits = Math.abs(rupees).toString();
  const grouped = digits.replace(/(\d)(?=(\d\d)+\d$)/g, '$1,');
  return `₹${sign}${grouped}.${paisePart}`;
}
