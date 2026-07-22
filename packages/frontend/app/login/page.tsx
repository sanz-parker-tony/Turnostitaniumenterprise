/**
 * Login Page - Server Component
 * Redirect automático por rol si ya hay sesión
 */

import { redirect } from "next/navigation";
import { createApiClientServerClient } from "@/utils/backend/server";
import LoginForm from "@/components/LoginForm";
import { getConfiguredHomeRoute } from "@/lib/auth/role-router";

async function getUserHomeConfiguration(ApiClient: any, userId: string) {
  const { data, error } = await ApiClient
    .from("user_roles")
    .select("role_id, roles:role_id(ui_home_route)")
    .eq("user_id", userId); // ✅ RLS filtra tenant automáticamente

  if (error) {
    console.error("[LOGIN] Error obteniendo roles:", error);
    return { hasRoles: false, homeRoute: null };
  }

  const roleRows = data ?? [];
  const configuredRoute = roleRows
    .map((row: any) => String(row?.roles?.ui_home_route || '').trim())
    .find((route: string) => route.startsWith('/')) || null;

  if (roleRows.length === 0) {
    console.warn("[LOGIN] Usuario autenticado pero sin roles asignados:", { userId });
  }

  return { hasRoles: roleRows.length > 0, homeRoute: configuredRoute };
}

export default async function LoginPage() {
  const ApiClient = createApiClientServerClient();

  const { data: auth, error: authError } = await ApiClient.auth.getUser();
  if (authError) {
    console.error("[LOGIN] Error ApiClient.auth.getUser():", authError);
  }

  const user = auth?.user;

  // Si ya hay sesión => decidir destino por rol
  if (user) {
    const homeConfiguration = await getUserHomeConfiguration(ApiClient, user.id);

    const homeRoute = getConfiguredHomeRoute(
      homeConfiguration.homeRoute,
      homeConfiguration.hasRoles
    );
    
    console.log(`[LOGIN] Usuario autenticado, redirigiendo a: ${homeRoute}`, { 
      userId: user.id, 
      configuredHomeRoute: homeConfiguration.homeRoute,
    });
    
    redirect(homeRoute);
  }

  // Si NO hay sesión, renderiza el formulario de login
  return <LoginForm />;
}
