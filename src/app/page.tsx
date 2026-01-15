/**
 * Home Page - Enterprise On-Premise
 * 
 * REGLAS:
 * 1. Si wizard NO completado → /system/setup
 * 2. Si wizard COMPLETADO → /login
 */

import { redirect } from "next/navigation";
import { createClient } from '@/utils/supabase/server';

export default async function HomePage() {
  const supabase = createClient();

  // Verificar estado del wizard
  const { data: tenantOnboarding, error } = await supabase
    .from('tenant_onboarding')
    .select('onboarding_status')
    .limit(1)
    .single();

  // Si wizard NO completado, ir al setup
  if (error || tenantOnboarding?.onboarding_status !== 'COMPLETED') {
    redirect('/system/setup');
  }

  // Si wizard COMPLETADO, ir al login
  redirect('/login');
}