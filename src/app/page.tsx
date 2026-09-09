import { isDatabaseConfigured } from '@/supabase/clients';

export const dynamic = 'force-dynamic';

function Status({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-medium ${good ? 'text-emerald-400' : 'text-amber-400'}`}>{value}</span>
    </div>
  );
}

export default function HomePage() {
  const dbConfigured = isDatabaseConfigured();
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">LifeBridge MedTech — GST/ERP</h1>
      <p className="mt-2 text-sm text-slate-400">
        Separate system from the AI Business OS. Shares the same Supabase data platform
        (<code className="text-slate-300">ghvjdybgllufjtdurbvh</code>) — one database, two focused applications.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">System status</h2>
        <Status label="Service" value="LBMTGST (Stage 1 — GST engine + foundation)" good />
        <Status label="Database" value={dbConfigured ? 'Configured' : 'Not configured'} good={dbConfigured} />
        <Status label="GST engine" value="Deterministic tax engine active" good />
        <Status
          label="E-Invoice / E-Way Bill"
          value="Not configured (provider architecture planned)"
          good={false}
        />
      </section>

      <section className="mt-8 space-y-2 text-sm text-slate-400">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">APIs</h2>
        <p><code className="text-slate-300">GET /api/health</code> — service + database status.</p>
        <p>
          <code className="text-slate-300">POST /api/gst/calculate</code> — deterministic CGST/SGST/IGST
          computation (authenticated). All money math in integer paise; AI never calculates tax.
        </p>
      </section>

      <p className="mt-10 text-xs text-slate-600">
        No official GST filing, e-invoice, or e-way bill generation is claimed until a real authorized
        provider integration confirms it.
      </p>
    </main>
  );
}
