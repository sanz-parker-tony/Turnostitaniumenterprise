/**
 * Login Page - Server Component
 * Redirect automático por rol si ya hay sesión
 */

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import LoginForm from "@/components/LoginForm";
import { getHomeRouteByRoles } from "@/lib/auth/role-router";

async function getUserRoles(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role_id, roles:role_id(role_key)")
    .eq("user_id", userId); // ✅ RLS filtra tenant automáticamente

  if (error) {
    console.error("[LOGIN] Error obteniendo roles:", error);
    return [];
  }

  const roles =
    (data ?? [])
      .map((r: any) => r?.roles?.role_key)
      .filter(Boolean);

  if (roles.length === 0) {
    console.warn("[LOGIN] Usuario autenticado pero sin roles asignados:", { userId });
  }

  return roles;
}

export default async function LoginPage() {
  const supabase = createSupabaseServerClient();

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("[LOGIN] Error supabase.auth.getUser():", authError);
  }

  const user = auth?.user;

  // Si ya hay sesión => decidir destino por rol
  if (user) {
    const roles = await getUserRoles(supabase, user.id);

    // ✅ USO DEL ROLE ROUTER: fuente de verdad única
    const homeRoute = getHomeRouteByRoles(roles);
    
    console.log(`[LOGIN] Usuario autenticado, redirigiendo a: ${homeRoute}`, { 
      userId: user.id, 
      roles 
    });
    
    redirect(homeRoute);
  }

  // Si NO hay sesión, renderiza el formulario de login
  return <LoginForm />;
}