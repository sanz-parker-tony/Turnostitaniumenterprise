/**
 * /setup - Wizard de Configuración Inicial (IT ONLY)
 * 
 * Acceso: SOLO con NEXT_PUBLIC_SETUP_TOKEN en query string
 * Validación: Middleware valida token, aquí validamos status COMPLETED
 * 
 * URL: /setup?token=SETUP_TOKEN
 */

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import ConfigurationWizard from "@/components/ConfigurationWizard";

export default async function SetupPage() {
  const supabase = createSupabaseServerClient();

  // 1. Requerir sesión (recomendado para wizard de instalación)
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user) {
    console.warn("[SETUP] Acceso sin sesión, redirigiendo a /login");
    redirect("/login");
  }

  // 2. Verificar estado de onboarding
  const { data: onboarding, error } = await supabase
    .from("tenant_onboarding")
    .select("status, progress_percent")
    .single();

  if (error || !onboarding) {
    console.error("[SETUP] Error leyendo tenant_onboarding:", error);
    redirect("/login");
  }

  // 3. REGLA FINAL: Si está COMPLETED, NUNCA mostrar wizard
  if ((onboarding.status ?? "").toUpperCase() === "COMPLETED") {
    console.warn("[SETUP] Onboarding ya completado, redirigiendo a /login");
    redirect("/login");
  }

  // 4. Si NO está completado, mostrar wizard
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <ConfigurationWizard />
    </div>
  );
}
