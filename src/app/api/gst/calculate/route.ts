import type { NextRequest } from 'next/server';
import { gstCalculateSchema } from '@/validators/gst';
import { ok, toErrorResponse } from '@/security/http';
import { rateLimit, clientIp, RateLimitError } from '@/security/rate-limit';
import { requireApiUser } from '@/auth/session';
import { computeGst, stateNameFromCode } from '@/gst';

export const dynamic = 'force-dynamic';

/**
 * POST /api/gst/calculate — deterministic GST computation (the ONLY tax
 * engine; spec §20/§50). Authenticated + rate limited. Input validation is
 * strict (statutory rates, 4-8 digit HSN/SAC); state codes resolve against
 * the official GST state list.
 */
export async function POST(request: NextRequest) {
  try {
    rateLimit(`gst-calc:${clientIp(request)}`, 60, 60_000);
    await requireApiUser();
    const body = gstCalculateSchema.parse(await request.json());
    const result = computeGst({
      supplierStateCode: body.supplier_state_code,
      placeOfSupplyCode: body.place_of_supply_code,
      reverseCharge: body.reverse_charge,
      lines: body.lines.map((line) => ({
        quantity: line.quantity,
        unitPricePaise: line.unit_price_paise,
        discountPaise: line.discount_paise,
        gstRateBps: line.gst_rate_bps,
        cessRateBps: line.cess_rate_bps,
      })),
    });
    return ok({
      supply_type: result.supplyType,
      supplier_state: stateNameFromCode(body.supplier_state_code),
      place_of_supply: stateNameFromCode(body.place_of_supply_code),
      reverse_charge: result.reverseCharge,
      lines: result.lines,
      subtotal_taxable_paise: result.subtotalTaxablePaise,
      cgst_paise: result.cgstPaise,
      sgst_paise: result.sgstPaise,
      igst_paise: result.igstPaise,
      cess_paise: result.cessPaise,
      total_tax_paise: result.totalTaxPaise,
      grand_total_paise: result.grandTotalPaise,
      round_off_paise: result.roundOffPaise,
      invoice_total_paise: result.invoiceTotalPaise,
    });
  } catch (error) {
    if ((error as Error & { retryAfterSeconds?: number }).retryAfterSeconds !== undefined) {
      return toErrorResponse(new RateLimitError((error as Error & { retryAfterSeconds: number }).retryAfterSeconds));
    }
    return toErrorResponse(error);
  }
}
