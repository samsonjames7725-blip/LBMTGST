# LBMTGST — LifeBridge MedTech GST/ERP

GST + ERP system for LifeBridge MedTech. **Separate codebase and repo from the
AI Business OS** — both share the same Supabase data platform
(`ghvjdybgllufjtdurbvh`); no second database exists or will be created.

- **Stack:** Next.js App Router · TypeScript · Tailwind · Supabase (Auth/Postgres/RLS) · Zod · Vercel
- **Repo:** `samsonjames7725-blip/LBMTGST`
- **DB:** shared with the AI Business OS; this project only ever creates `erp_`-prefixed objects (see [DATABASE.md](./DATABASE.md))

## Implementation status

Built incrementally in dependency-safe stages. This section reflects reality only.

### Stage 1 — done

- **GST engine** (`src/gst/`): deterministic CGST/SGST/IGST + compensation cess
  computation with integer-paise arithmetic, invoice-level round-off, reverse
  charge handling, official GST state codes, and full GSTIN structural +
  checksum validation. Statutory rate schedule is enforced everywhere — no
  invented rates, AI never calculates tax.
- **API**: `GET /api/health`, `POST /api/gst/calculate` (authenticated,
  rate-limited, Zod-validated, safe error envelope).
- **Database**: additive `erp_` foundation migration (companies, company users,
  GST registrations, vendors, products, document sequences) with RLS on every
  table and service-role-only writes.
- **Auth**: Supabase Auth session guard for route handlers.

### Next stages

Quotations/proforma/tax invoices on the GST engine → credit/debit notes →
payments/receivables/payables → inventory → e-invoice/e-way-bill provider
abstraction (`EInvoiceProvider`/`EWayBillProvider`, no fake government APIs) →
Gemini AI layer → reporting → automation.

## Setup

```bash
npm install
cp .env.example .env   # fill values; never commit .env
npm run dev
```

Environment variables are documented in `.env.example`.

## Quality gates

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

## Compliance safety

The system never claims official GST filing, e-invoice, or e-way bill
generation unless a real authorized provider integration confirms it. When no
provider is configured the UI/API states exactly that.
