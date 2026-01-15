/**
 * /dashboard/system - Layout
 * 
 * Módulo de Configuración del Sistema
 * Acceso: SOLO SYSTEM_ADMIN
 */

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export default async function SystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();

  // 1. Verificar sesión
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/login');
  }

  // 2. Verificar rol SYSTEM_ADMIN
  const { data: userRoles, error: roleError } = await supabase
    .from('user_roles')
    .select('role_id, roles(role_name)')
    .eq('user_id', user.id);

  if (roleError || !userRoles || userRoles.length === 0) {
    redirect('/dashboard');
  }

  // @ts-ignore
  const isSystemAdmin = userRoles.some(ur => ur.roles?.role_name === 'SYSTEM_ADMIN');

  if (!isSystemAdmin) {
    redirect('/dashboard');
  }

  // 3. Usuario autorizado
  return <>{children}</>;
}
