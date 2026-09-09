import { getAuthClient } from '@/supabase/clients';
import { AppError } from '@/security/http';

export interface SessionUser {
  id: string;
  email: string | null;
}

/**
 * Route-handler guard: resolves the signed-in Supabase user or throws 401.
 * Company-level RBAC (erp_company_users) is enforced per-resource once the
 * master-data stage lands; every ERP write also passes through RLS.
 */
export async function requireApiUser(): Promise<SessionUser> {
  const supabase = await getAuthClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new AppError('UNAUTHENTICATED', 'Sign in to continue', 401);
  }
  return { id: data.user.id, email: data.user.email ?? null };
}
