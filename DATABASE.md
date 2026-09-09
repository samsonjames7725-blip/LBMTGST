# DATABASE.md — LBMTGST (LifeBridge MedTech GST/ERP)

**Separate codebase from the AI Business OS. Same Supabase platform — never a second database.**

```text
Supabase project (shared): ghvjdybgllufjtdurbvh
URL: https://ghvjdybgllufjtdurbvh.supabase.co
```

## File layout

```text
supabase/
└── migrations/
    └── 20260910030000_lbmtgst_stage1_erp_foundation.sql   # source of truth
```

## Separation model

Two applications, one database:

| | AI Business OS (`LBMT` repo / D:\LBMT) | GST/ERP (this repo / D:\LBMTGST) |
|---|---|---|
| Domain | CRM, leads, AI agents, knowledge | GST, billing, vendors, products, inventory |
| Tables | unprefixed CRM/AI tables (`leads`, `customers`, …) | strictly `erp_`-prefixed tables |
| Migrations | additive, owned by the OS project | additive, owned by this project |

This project's migrations create **only** `erp_`-prefixed objects, so they can
never collide with, alter, or drop OS-owned tables. Applying this migration is
independent of whether the OS migration has run — there are no cross-dependencies.
Shared-master-data consolidation (single customer/product records used by both
apps) is a later, explicitly planned stage; until then the systems are separate
by design.

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

## Money conventions

- All amounts are integer **paise** (`bigint` columns `*_paise`)
- GST rates are integer **basis points** (`1800` = 18%)
- Tax math lives only in `src/gst/tax.ts` — deterministic, unit-tested, and
  the single source of truth. AI never calculates tax.
