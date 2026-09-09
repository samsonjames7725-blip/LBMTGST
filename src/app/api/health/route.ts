import { isDatabaseConfigured } from '@/supabase/clients';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health — honest configuration status; secrets are never shown.
 * The two booleans distinguish build-time (URL is inlined at build) from
 * runtime (secret key is injected per-request) availability issues.
 */
export async function GET() {
  return Response.json({
    success: true,
    data: {
      service: 'lbmtgst',
      status: 'ok',
      database: isDatabaseConfigured() ? 'configured' : 'not_configured',
      supabase_url_present: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabase_secret_present: Boolean(process.env.SUPABASE_SECRET_KEY),
      time: new Date().toISOString(),
    },
  });
}
