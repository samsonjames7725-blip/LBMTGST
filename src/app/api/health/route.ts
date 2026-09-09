import { isDatabaseConfigured } from '@/supabase/clients';

export const dynamic = 'force-dynamic';

/** GET /api/health — honest configuration status; secrets are never shown. */
export async function GET() {
  return Response.json({
    success: true,
    data: {
      service: 'lbmtgst',
      status: 'ok',
      database: isDatabaseConfigured() ? 'configured' : 'not_configured',
      time: new Date().toISOString(),
    },
  });
}
