import { z } from 'zod';

/** GST rates are constrained to the statutory schedule (basis points). */
export const gstRateBpsSchema = z
  .number()
  .int()
  .refine((v) => [0, 25, 300, 500, 1200, 1800, 2800].includes(v), {
    message: 'GST rate must be one of the statutory rates (0, 0.25%, 3%, 5%, 12%, 18%, 28%)',
  });

export const taxLineSchema = z
  .object({
    description: z.string().trim().min(1).max(500).optional(),
    hsn_sac: z.string().trim().regex(/^[0-9]{4,8}$/, 'HSN/SAC must be 4-8 digits').optional(),
    quantity: z.number().positive().max(1_000_000),
    unit_price_paise: z.number().int().min(0).max(1_000_000_000_000),
    discount_paise: z.number().int().min(0).optional(),
    gst_rate_bps: gstRateBpsSchema,
    cess_rate_bps: z.number().int().min(0).max(1_000_000).optional(),
  })
  .strict();

export const gstCalculateSchema = z
  .object({
    supplier_state_code: z.string().regex(/^[0-9]{2}$/),
    place_of_supply_code: z.string().regex(/^[0-9]{2}$/),
    reverse_charge: z.boolean().optional(),
    lines: z.array(taxLineSchema).min(1).max(500),
  })
  .strict();

export type GstCalculateInput = z.infer<typeof gstCalculateSchema>;
