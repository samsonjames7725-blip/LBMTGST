# DATABASE.md — LBMTGST (LifeBridge MedTech GST/ERP)

**Separate codebase and separate Supabase project from the AI Business OS.**

```text
Supabase project (this system): tnobrqfxmrwpuxkdsycd
URL: https://tnobrqfxmrwpuxkdsycd.supabase.co
```

The AI Business OS runs against its own project (`ghvjdybgllufjtdurbvh`).
The two systems share nothing at the database level.

## File layout

```text
supabase/
└── migrations/
    └── 20260910030000_lbmtgst_stage1_erp_foundation.sql   # source of truth
```

## Naming note

ERP tables carry an `erp_` prefix. On a dedicated project this is not
required for collision safety, but it keeps every GST/ERP object instantly
identifiable and preserves the option of co-locating with other systems
later. Keep the prefix.

## Stage 1 migration contents

- `erp_companies` — legal entities (multi-company), PAN-unique
- `erp_company_users` — auth.users ↔ company membership with ERP roles
- `erp_gst_registrations` — multiple GSTINs per company, GSTIN format-checked,
  status manually entered (never fabricated; verification via an authorized API later)
- `erp_vendors` — vendor master with GSTIN/PAN/bank details
- `erp_products` — goods/services catalog, HSN/SAC 4–8 digits, GST rate locked
  to the statutory schedule `(0, 0.25, 3, 5, 12, 18, 28)%`, prices in paise
- `erp_doc_sequences` — per-company, per-doc-type, per-financial-year numbering
  contract (atomic number generation lands with billing)

Every table: RLS enabled (deny-by-default), `authenticated` gets member-scoped
SELECT only, all writes via the service role through the server-side
authorization layer, `updated_at` triggers via a `private` helper function,
unique constraints for GSTIN / company+SKU / company+doc_type+FY.

## Applying the migration

The project starts empty, so the Stage-1 migration applies cleanly:

```bash
npx supabase link --project-ref tnobrqfxmrwpuxkdsycd
npx supabase db push
```

(or paste the migration file into the Supabase SQL editor).

## Money conventions

- All amounts are integer **paise** (`bigint` columns `*_paise`)
- GST rates are integer **basis points** (`1800` = 18%)
- Tax math lives only in `src/gst/tax.ts` — deterministic, unit-tested, and
  the single source of truth. AI never calculates tax.
