-- ============================================================================
-- LBMTGST — Stage 1 ERP foundation
-- LifeBridge MedTech GST/ERP system (separate codebase from the AI Business
-- OS, same Supabase platform: ghvjdybgllufjtdurbvh).
--
-- STRICTLY ADDITIVE: creates only new `erp_`-prefixed objects so it can never
-- collide with, alter, or drop anything the AI Business OS owns in the shared
-- database. If any object already exists, this migration fails loudly.
--
-- Security model (mirrors the OS): RLS deny-by-default on every table;
-- `authenticated` gets narrowly-scoped SELECT; ALL writes go through the
-- server-side application layer using the service role, which passes the
-- authorization layer first. Helper functions live in `private` and are not
-- exposed via the Data API.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Legal entities (multi-company, spec §9)
-- ---------------------------------------------------------------------------
create table public.erp_companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (length(legal_name) between 1 and 300),
  trade_name text check (length(trade_name) between 1 and 300),
  pan text check (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  cin text check (length(cin) <= 34),
  address_line1 text check (length(address_line1) <= 300),
  address_line2 text check (length(address_line2) <= 300),
  city text check (length(city) <= 120),
  state_code text check (state_code ~ '^[0-9]{2}$'),
  pincode text check (pincode ~ '^[0-9]{6}$'),
  country text not null default 'India' check (length(country) <= 120),
  email text check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone text check (length(phone) <= 25),
  logo_url text check (length(logo_url) <= 1000),
  invoice_prefix text check (length(invoice_prefix) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_companies_pan_unique unique (pan)
);

-- ---------------------------------------------------------------------------
-- Company ↔ auth user membership with ERP role (spec §8/§9)
-- ---------------------------------------------------------------------------
create table public.erp_company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.erp_companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in (
    'owner','admin','finance','operations','procurement','warehouse','viewer'
  )),
  created_at timestamptz not null default now(),
  constraint erp_company_users_company_user_unique unique (company_id, user_id)
);

-- ---------------------------------------------------------------------------
-- GST registrations — a company may hold several (spec §10). Registration
-- status is entered/verified manually or via an authorized API later; the app
-- never fabricates it.
-- ---------------------------------------------------------------------------
create table public.erp_gst_registrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.erp_companies(id) on delete cascade,
  gstin text not null check (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[0-9][A-Z][0-9A-Z]$'),
  legal_name text not null check (length(legal_name) between 1 and 300),
  trade_name text check (length(trade_name) <= 300),
  pan text check (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  state_code text not null check (state_code ~ '^[0-9]{2}$'),
  registration_type text not null default 'regular' check (registration_type in (
    'regular','composition','unregistered','consumer','umd','uid'
  )),
  registration_status text not null default 'active' check (registration_status in (
    'active','suspended','cancelled','inactive'
  )),
  registered_address_line1 text check (length(registered_address_line1) <= 300),
  registered_address_line2 text check (length(registered_address_line2) <= 300),
  city text check (length(city) <= 120),
  pincode text check (pincode ~ '^[0-9]{6}$'),
  effective_date date,
  cancellation_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_gst_registrations_gstin_unique unique (gstin),
  constraint erp_gst_registrations_cancellation_required check (
    (registration_status = 'cancelled') = (cancellation_date is not null)
  )
);

-- ---------------------------------------------------------------------------
-- Vendors (spec §12)
-- ---------------------------------------------------------------------------
create table public.erp_vendors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.erp_companies(id) on delete cascade,
  legal_name text not null check (length(legal_name) between 1 and 300),
  trade_name text check (length(trade_name) <= 300),
  gstin text check (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[0-9][A-Z][0-9A-Z]$'),
  pan text check (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  address_line1 text check (length(address_line1) <= 300),
  address_line2 text check (length(address_line2) <= 300),
  city text check (length(city) <= 120),
  state_code text check (state_code ~ '^[0-9]{2}$'),
  pincode text check (pincode ~ '^[0-9]{6}$'),
  contact_person text check (length(contact_person) <= 200),
  email text check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone text check (length(phone) <= 25),
  payment_terms_days integer check (payment_terms_days between 0 and 365),
  bank_account_name text check (length(bank_account_name) <= 200),
  bank_account_number text check (length(bank_account_number) <= 40),
  bank_ifsc text check (bank_ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
  status text not null default 'active' check (status in ('active','inactive','blocked')),
  notes text check (length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_vendors_company_name_unique unique (company_id, legal_name)
);

-- ---------------------------------------------------------------------------
-- Products & services catalog with HSN/SAC and statutory GST rate (spec §13)
-- ---------------------------------------------------------------------------
create table public.erp_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.erp_companies(id) on delete cascade,
  sku text not null check (length(sku) between 1 and 100),
  name text not null check (length(name) between 1 and 300),
  description text check (length(description) <= 5000),
  category text check (length(category) <= 120),
  kind text not null default 'goods' check (kind in ('goods','service')),
  manufacturer text check (length(manufacturer) <= 200),
  brand text check (length(brand) <= 120),
  hsn_sac text check (hsn_sac ~ '^[0-9]{4,8}$'),
  unit text not null default 'NOS' check (length(unit) between 1 and 20),
  gst_rate_bps integer not null check (gst_rate_bps in (0, 25, 300, 500, 1200, 1800, 2800)),
  cess_rate_bps integer not null default 0 check (cess_rate_bps >= 0),
  purchase_price_paise bigint check (purchase_price_paise >= 0),
  sales_price_paise bigint check (sales_price_paise >= 0),
  minimum_price_paise bigint check (minimum_price_paise >= 0),
  batch_tracking boolean not null default false,
  serial_tracking boolean not null default false,
  inventory_tracked boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_products_company_sku_unique unique (company_id, sku)
);

-- ---------------------------------------------------------------------------
-- Document numbering configuration (spec §35). Atomic sequence generation
-- (row-locked RPC) arrives with the billing stage; this table + uniqueness
-- contract is the foundation.
-- ---------------------------------------------------------------------------
create table public.erp_doc_sequences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.erp_companies(id) on delete cascade,
  doc_type text not null check (doc_type in (
    'quotation','proposal','proforma','tax_invoice','credit_note','debit_note',
    'sales_order','purchase_order','delivery_challan'
  )),
  financial_year text not null check (financial_year ~ '^[0-9]{4}-[0-9]{2}$'),
  prefix text check (length(prefix) <= 20),
  next_number integer not null default 1 check (next_number >= 1),
  padding integer not null default 4 check (padding between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_doc_sequences_unique unique (company_id, doc_type, financial_year)
);

-- ---------------------------------------------------------------------------
-- Indexes for common filters/searches
-- ---------------------------------------------------------------------------
create index erp_company_users_user_idx on public.erp_company_users(user_id);
create index erp_gst_registrations_company_idx on public.erp_gst_registrations(company_id);
create index erp_vendors_company_idx on public.erp_vendors(company_id);
create index erp_vendors_gstin_idx on public.erp_vendors(gstin) where gstin is not null;
create index erp_products_company_idx on public.erp_products(company_id);
create index erp_products_hsn_idx on public.erp_products(hsn_sac) where hsn_sac is not null;
create index erp_doc_sequences_company_idx on public.erp_doc_sequences(company_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function private.erp_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists erp_companies_updated_at on public.erp_companies;
create trigger erp_companies_updated_at before update on public.erp_companies
  for each row execute function private.erp_set_updated_at();

drop trigger if exists erp_gst_registrations_updated_at on public.erp_gst_registrations;
create trigger erp_gst_registrations_updated_at before update on public.erp_gst_registrations
  for each row execute function private.erp_set_updated_at();

drop trigger if exists erp_vendors_updated_at on public.erp_vendors;
create trigger erp_vendors_updated_at before update on public.erp_vendors
  for each row execute function private.erp_set_updated_at();

drop trigger if exists erp_products_updated_at on public.erp_products;
create trigger erp_products_updated_at before update on public.erp_products
  for each row execute function private.erp_set_updated_at();

drop trigger if exists erp_doc_sequences_updated_at on public.erp_doc_sequences;
create trigger erp_doc_sequences_updated_at before update on public.erp_doc_sequences
  for each row execute function private.erp_set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — deny by default, then narrow read policies.
-- Writes: service role only (server-side app layer after authorization).
-- ---------------------------------------------------------------------------
alter table public.erp_companies enable row level security;
alter table public.erp_company_users enable row level security;
alter table public.erp_gst_registrations enable row level security;
alter table public.erp_vendors enable row level security;
alter table public.erp_products enable row level security;
alter table public.erp_doc_sequences enable row level security;

-- Revoke the default grants so access is explicit.
revoke all on public.erp_companies from anon, authenticated;
revoke all on public.erp_company_users from anon, authenticated;
revoke all on public.erp_gst_registrations from anon, authenticated;
revoke all on public.erp_vendors from anon, authenticated;
revoke all on public.erp_products from anon, authenticated;
revoke all on public.erp_doc_sequences from anon, authenticated;

-- Members may see the companies they belong to.
create policy erp_companies_select_member on public.erp_companies
  for select to authenticated
  using (
    exists (
      select 1 from public.erp_company_users m
      where m.company_id = erp_companies.id and m.user_id = auth.uid()
    )
  );

-- Membership rows: users see their own memberships only.
create policy erp_company_users_select_self on public.erp_company_users
  for select to authenticated
  using (user_id = auth.uid());

-- Company-scoped masters readable by that company's members.
create policy erp_gst_registrations_select_member on public.erp_gst_registrations
  for select to authenticated
  using (
    exists (
      select 1 from public.erp_company_users m
      where m.company_id = erp_gst_registrations.company_id and m.user_id = auth.uid()
    )
  );

create policy erp_vendors_select_member on public.erp_vendors
  for select to authenticated
  using (
    exists (
      select 1 from public.erp_company_users m
      where m.company_id = erp_vendors.company_id and m.user_id = auth.uid()
    )
  );

create policy erp_products_select_member on public.erp_products
  for select to authenticated
  using (
    exists (
      select 1 from public.erp_company_users m
      where m.company_id = erp_products.company_id and m.user_id = auth.uid()
    )
  );

create policy erp_doc_sequences_select_member on public.erp_doc_sequences
  for select to authenticated
  using (
    exists (
      select 1 from public.erp_company_users m
      where m.company_id = erp_doc_sequences.company_id and m.user_id = auth.uid()
    )
  );

-- Service role: full access (RLS bypass) for the server-side app layer.
grant all on public.erp_companies to service_role;
grant all on public.erp_company_users to service_role;
grant all on public.erp_gst_registrations to service_role;
grant all on public.erp_vendors to service_role;
grant all on public.erp_products to service_role;
grant all on public.erp_doc_sequences to service_role;

-- Keep helpers private (not exposed via the Data API).
revoke all on function private.erp_set_updated_at() from anon, authenticated, service_role;
