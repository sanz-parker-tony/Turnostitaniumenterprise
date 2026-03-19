import { Hono } from "npm:hono@4.6.14";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import { 
  ensureSystemAdmin,
  getWizardState,
  getBootstrapToken,
  getSystemLanguages,
  bootstrapStep1Tenant,
  bootstrapStep2Admin
} from "./bootstrap.tsx";
import {
  getTenant,
  updateTenant,
  getTenantSettings,
  createTenantSetting,
  updateTenantSetting,
  deleteTenantSetting,
  getTenantMembers,
  getDataTypes,
  getTenantLanguages,
  updateTenantLanguages,
  ensureMainTenant,
  getSystemTenantSettings,
  updateSystemTenantSettings
} from "./tenant-routes.tsx";

const app = new Hono();

app.use("*", logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Bootstrap-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

function getSupabaseAnonClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
}

const requireAuth = async (c: any, next: any) => {
  const authHeader = c.req.header("Authorization");
  
  console.log("🔐 [requireAuth] Authorization header:", authHeader ? `Bearer ${authHeader.substring(7, 20)}...` : "MISSING");
  
  if (!authHeader?.startsWith("Bearer ")) {
    console.error("❌ [requireAuth] Missing or invalid Authorization header");
    return c.json({ 
      code: 401,
      error: "Authorization header missing or invalid",
      message: "Missing authorization header"
    }, 401);
  }

  const token = authHeader.split(" ")[1];
  
  if (!token || token.length < 20) {
    console.error("❌ [requireAuth] Token vacío o muy corto");
    return c.json({ 
      code: 401,
      error: "Invalid token",
      message: "Token is empty or malformed"
    }, 401);
  }
  
  console.log("🔐 [requireAuth] Token length:", token.length);
  
  const supabaseAnon = getSupabaseAnonClient();
  
  try {
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
    
    if (error) {
      console.error("❌ [requireAuth] Error de autenticación:", error.message, error.code);
      return c.json({ 
        code: 401,
        error: "Unauthorized",
        message: error.message
      }, 401);
    }
    
    if (!user) {
      console.error("❌ [requireAuth] Usuario no encontrado en el token");
      return c.json({ 
        code: 401,
        error: "Unauthorized",
        message: "User not found"
      }, 401);
    }
    
    console.log("✅ [requireAuth] Usuario autenticado:", user.email);
    c.set("user", user);
    await next();
  } catch (err: any) {
    console.error("💥 [requireAuth] Error inesperado:", err);
    return c.json({ 
      code: 500,
      error: "Internal server error",
      message: err.message
    }, 500);
  }
};

app.get("/make-server-e19f2094/health", (c) => {
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    version: "wizard-complete-2026-01-20-v2",
    env: {
      hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
      hasServiceRoleKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      hasAnonKey: !!Deno.env.get("SUPABASE_ANON_KEY")
    }
  });
});

// 🔧 DIAGNÓSTICO: Endpoint simplificado para verificar conectividad
app.get("/make-server-e19f2094/bootstrap/ping", (c) => {
  console.log('🏓 [PING] Endpoint alcanzado correctamente');
  return c.json({ 
    success: true,
    message: "Bootstrap endpoint is reachable",
    timestamp: new Date().toISOString()
  });
});

// Bootstrap: Asegurar que usuario system.admin existe
app.post("/make-server-e19f2094/bootstrap/ensure-system-admin", ensureSystemAdmin);

app.get("/make-server-e19f2094/bootstrap/wizard-state", requireAuth, getWizardState);

app.get("/make-server-e19f2094/bootstrap/token", getBootstrapToken);

app.get("/make-server-e19f2094/bootstrap/languages", getSystemLanguages);

app.post("/make-server-e19f2094/bootstrap/step1-tenant", requireAuth, bootstrapStep1Tenant);

app.post("/make-server-e19f2094/bootstrap/step2-admin", requireAuth, bootstrapStep2Admin);

app.post("/make-server-e19f2094/bootstrap/ensure-main-tenant", ensureMainTenant);

app.get("/make-server-e19f2094/bootstrap/tenant-info", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseClient();

    const { data: tenant, error } = await supabase
      .from("tenants")
      .select("tenant_key, tenant_name")
      .neq("tenant_key", "SYSTEM")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error obteniendo tenant:", error);
      return c.json({ error: "Error obteniendo tenant" }, 500);
    }

    return c.json({ tenant: tenant || null });
  } catch (error) {
    console.error("Error en tenant-info:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.get("/make-server-e19f2094/users/profile", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const supabase = getSupabaseClient();

    const { data: profile, error } = await supabase
      .from("users")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    if (error || !profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json({ profile });
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.post("/make-server-e19f2094/users/change-password", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
    }

    const supabase = getSupabaseClient();

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      return c.json({ error: "Error updating password" }, 500);
    }

    await supabase
      .from("users")
      .update({ must_change_password: false })
      .eq("auth_user_id", user.id);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ============================================================================
// ENDPOINT DE DIAGNÓSTICO: Verificar usuarios del sistema
// ============================================================================
app.get("/make-server-e19f2094/auth/diagnostics", async (c) => {
  try {
    const supabase = getSupabaseClient();

    // Verificar usuarios en auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error listando usuarios de auth:", authError);
      return c.json({ 
        error: "Error al listar usuarios de autenticación",
        details: authError.message 
      }, 500);
    }

    // Verificar usuarios en public.users
    const { data: publicUsers, error: publicError } = await supabase
      .from("users")
      .select("id, username, email, is_active, auth_user_id")
      .limit(100);

    if (publicError) {
      console.error("Error listando usuarios públicos:", publicError);
      return c.json({ 
        error: "Error al listar usuarios públicos",
        details: publicError.message 
      }, 500);
    }

    // Buscar específicamente el usuario system.admin
    const systemAdmin = authUsers?.users?.find(u => u.email === 'system.admin@titanium-labs.com');
    const systemAdminPublic = publicUsers?.find(u => u.email === 'system.admin@titanium-labs.com');

    return c.json({
      success: true,
      summary: {
        authUsersCount: authUsers?.users?.length || 0,
        publicUsersCount: publicUsers?.length || 0,
        systemAdminExists: !!systemAdmin,
        systemAdminInPublic: !!systemAdminPublic
      },
      authUsers: authUsers?.users?.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        email_confirmed_at: u.email_confirmed_at
      })) || [],
      publicUsers: publicUsers || [],
      systemAdmin: systemAdmin ? {
        id: systemAdmin.id,
        email: systemAdmin.email,
        created_at: systemAdmin.created_at,
        confirmed: !!systemAdmin.email_confirmed_at
      } : null,
      instructions: !systemAdmin ? {
        message: "Usuario system.admin no encontrado",
        solution: "Ejecutar endpoint POST /auth/create-system-admin para crearlo"
      } : null
    });
  } catch (error: any) {
    console.error("Error en diagnóstico:", error);
    return c.json({ 
      error: "Error interno en diagnóstico",
      details: error.message 
    }, 500);
  }
});

// ============================================================================
// ENDPOINT HELPER: Crear usuario system.admin si no existe
// ============================================================================
app.post("/make-server-e19f2094/auth/create-system-admin", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const supabaseAnon = getSupabaseAnonClient();
    
    // Obtener parámetros del body (o usar defaults)
    const body = await c.req.json().catch(() => ({}));
    const email = body.email || 'system.admin@titanium-labs.com';
    const password = body.password || 'Titanium2026!';
    const displayName = body.displayName || 'System Administrator';
    
    console.log(`🔧 Intentando crear usuario ${email}...`);

    // ✅ PASO 0: VERIFICAR QUE TENANT SYSTEM EXISTE PRIMERO
    console.log('🔍 Verificando tenant SYSTEM...');
    const { data: systemTenant, error: tenantCheckError } = await supabase
      .from("tenants")
      .select("id, tenant_key")
      .eq("tenant_key", "SYSTEM")
      .single();

    if (tenantCheckError || !systemTenant) {
      console.error("❌ ERROR CRÍTICO: Tenant SYSTEM no existe");
      console.error("Detalles:", tenantCheckError);
      return c.json({ 
        error: "SETUP INCOMPLETO: Tenant SYSTEM no encontrado",
        details: "Debes ejecutar los scripts SQL de migración primero",
        solution: "Ve a Supabase SQL Editor y ejecuta los archivos en /supabase/migrations/ en orden",
        requiredFiles: [
          "001_INITIAL_SCHEMA.sql",
          "002_SEED_COMPLETE.sql"
        ]
      }, 500);
    }

    console.log(`✅ Tenant SYSTEM encontrado (id: ${systemTenant.id})`);

    // Verificar si ya existe
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email === email);

    if (userExists) {
      console.log(`⏭️  Usuario ${email} ya existe (id: ${userExists.id})`);
      
      return c.json({
        success: true,
        message: "Usuario ya existe",
        user: {
          id: userExists.id,
          email: userExists.email,
          created_at: userExists.created_at
        },
        note: "El usuario ya existe en el sistema"
      });
    }

    // ✅ CREAR USUARIO USANDO ADMIN API (service role key)
    // Este método siempre funciona, incluso si el signup público está deshabilitado
    console.log('🔧 Creando usuario con admin.createUser...');
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,  // Auto-confirmar email
      user_metadata: {
        full_name: displayName
      }
    });

    if (createError) {
      console.error("❌ Error creando usuario:", createError);
      return c.json({ 
        error: "No se pudo crear el usuario",
        details: createError.message,
        suggestion: "Verifica que hayas ejecutado las migraciones SQL correctamente"
      }, 500);
    }

    const userId = newUser.user?.id;

    if (!userId) {
      console.error("❌ No se obtuvo ID de usuario");
      return c.json({ 
        error: "Error al obtener ID de usuario después de creación",
      }, 500);
    }

    console.log(`✅ Usuario creado en auth.users (id: ${userId})`);

    // Crear o actualizar usuario en public.users
    console.log('🔧 Creando/actualizando usuario en public.users...');
    const { data: publicUser, error: publicError } = await supabase
      .from("users")
      .upsert({
        tenant_id: systemTenant.id,
        auth_user_id: userId,
        username: email.split('@')[0], // Extraer username del email
        display_name: displayName,
        email: email,
        is_active: true,
        preferred_language_code: 'es',
        created_by: 'SYSTEM'
      }, {
        onConflict: 'auth_user_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (publicError) {
      console.error("❌ Error creando/actualizando usuario en public.users:", publicError);
      return c.json({ 
        error: "Error al crear perfil de usuario",
        details: publicError.message 
      }, 500);
    }

    console.log(`✅ Usuario creado/actualizado en public.users (id: ${publicUser.id})`);

    // Obtener rol SYSTEM_ADMIN
    console.log('🔍 Buscando rol SYSTEM_ADMIN...');
    const { data: systemAdminRole, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("tenant_id", systemTenant.id)
      .eq("role_key", "SYSTEM_ADMIN")
      .single();

    if (roleError || !systemAdminRole) {
      console.error("❌ ERROR CRÍTICO: Rol SYSTEM_ADMIN no existe");
      console.error("Detalles:", roleError);
      return c.json({ 
        error: "SETUP INCOMPLETO: Rol SYSTEM_ADMIN no encontrado",
        details: "Debes ejecutar los scripts SQL de migración primero",
        solution: "Ve a Supabase SQL Editor y ejecuta los archivos en /supabase/migrations/ en orden",
        requiredFiles: [
          "001_INITIAL_SCHEMA.sql",
          "002_SEED_COMPLETE.sql"
        ]
      }, 500);
    }

    console.log(`✅ Rol SYSTEM_ADMIN encontrado (id: ${systemAdminRole.id})`);

    // Asignar rol al usuario
    console.log('🔧 Asignando rol SYSTEM_ADMIN al usuario...');
    const { error: roleAssignError } = await supabase
      .from("user_roles")
      .insert({
        tenant_id: systemTenant.id,
        user_id: publicUser.id,
        role_id: systemAdminRole.id,
        is_active: true,
        created_by: 'SYSTEM'
      });

    if (roleAssignError) {
      console.error("❌ Error asignando rol:", roleAssignError);
      return c.json({ 
        error: "Error al asignar rol",
        details: roleAssignError.message 
      }, 500);
    }

    console.log(`✅ Rol SYSTEM_ADMIN asignado al usuario`);

    return c.json({
      success: true,
      message: "Usuario creado exitosamente",
      user: {
        id: userId,
        email: email,
        created_at: new Date().toISOString()
      },
      credentials: {
        email: email,
        password: password,
        note: "⚠️ IMPORTANTE: Cambia esta contraseña después del primer login"
      },
      nextSteps: [
        "1. Inicia sesión con las credenciales proporcionadas",
        "2. Cambia la contraseña inmediatamente",
        "3. Completa el wizard de configuración inicial"
      ]
    });

  } catch (error: any) {
    console.error("💥 Error creando usuario system.admin:", error);
    return c.json({ 
      error: "Error interno al crear usuario",
      details: error.message 
    }, 500);
  }
});

// ============================================================================
// ENDPOINT HELPER: Resetear contraseña del usuario system.admin
// ============================================================================
app.post("/make-server-e19f2094/auth/reset-system-admin-password", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const email = 'system.admin@titanium-labs.com';
    const password = 'Titanium2026!';
    
    console.log(`🔐 Intentando resetear contraseña de ${email}...`);

    // Buscar usuario en auth.users
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const user = authUsers?.users?.find(u => u.email === email);

    if (!user) {
      console.log(`❌ Usuario ${email} no existe en auth.users`);
      return c.json({ 
        error: "Usuario system.admin no encontrado",
        suggestion: "Usa el endpoint POST /auth/create-system-admin para crearlo"
      }, 404);
    }

    console.log(`✅ Usuario encontrado (id: ${user.id}), actualizando contraseña...`);

    // Actualizar contraseña
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: password }
    );

    if (updateError) {
      console.error("❌ Error actualizando contraseña:", updateError);
      return c.json({ 
        error: "Error al actualizar contraseña",
        details: updateError.message 
      }, 500);
    }

    console.log(`✅ Contraseña actualizada exitosamente`);

    return c.json({
      success: true,
      message: "Contraseña reseteada exitosamente",
      credentials: {
        email: email,
        password: password,
        note: "Ahora puedes iniciar sesión con esta contraseña"
      }
    });

  } catch (error: any) {
    console.error("💥 Error reseteando contraseña:", error);
    return c.json({ 
      error: "Error interno",
      details: error.message 
    }, 500);
  }
});

// ============================================================================
// ENDPOINT DE DIAGNÓSTICO DEL WIZARD
// ============================================================================
app.get("/make-server-e19f2094/bootstrap/diagnostics", async (c) => {
  try {
    const supabase = getSupabaseClient();

    // Obtener todos los tenants
    const { data: allTenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, tenant_key, tenant_name, created_at")
      .order("created_at", { ascending: false });

    if (tenantsError) {
      return c.json({ 
        success: false,
        error: "Error obteniendo tenants",
        details: tenantsError.message
      }, 500);
    }

    // Obtener todos los registros de tenant_onboarding
    const { data: allOnboarding, error: onboardingError } = await supabase
      .from("tenant_onboarding")
      .select("tenant_id, onboarding_status, current_step, completion_percentage")
      .order("created_at", { ascending: false });

    if (onboardingError) {
      return c.json({ 
        success: false,
        error: "Error obteniendo onboarding",
        details: onboardingError.message
      }, 500);
    }

    return c.json({
      success: true,
      tenants: allTenants || [],
      onboarding: allOnboarding || [],
      summary: {
        total_tenants: allTenants?.length || 0,
        completed: allOnboarding?.filter(o => o.onboarding_status === "COMPLETED").length || 0,
        in_progress: allOnboarding?.filter(o => o.onboarding_status === "IN_PROGRESS").length || 0,
        not_started: allOnboarding?.filter(o => o.onboarding_status === "NOT_STARTED").length || 0,
      }
    });
  } catch (error: any) {
    console.error("Error en diagnostics:", error);
    return c.json({ 
      success: false,
      error: "Internal server error",
      details: error.message
    }, 500);
  }
});

// ============================================================================
// ENDPOINT DE RESET DEL WIZARD
// ⚠️ USAR SOLO PARA DESARROLLO
// ============================================================================
app.post("/make-server-e19f2094/bootstrap/reset-wizard", async (c) => {
  try {
    console.log("🔄 [RESET] Iniciando reset del wizard...");
    const supabase = getSupabaseClient();

    // 1. Buscar tenant SYSTEM
    const { data: systemTenant, error: systemError } = await supabase
      .from("tenants")
      .select("id, tenant_key")
      .eq("tenant_key", "SYSTEM")
      .single();

    if (systemError || !systemTenant) {
      console.error("❌ [RESET] Tenant SYSTEM no encontrado");
      return c.json({ error: "Tenant SYSTEM no encontrado" }, 404);
    }

    console.log("✅ [RESET] Tenant SYSTEM encontrado:", systemTenant.id);

    // 2. Eliminar todos los tenants que NO sean SYSTEM
    const { data: tenantsToDelete, error: listError } = await supabase
      .from("tenants")
      .select("id, tenant_key, tenant_name")
      .neq("tenant_key", "SYSTEM");

    if (listError) {
      console.error("❌ [RESET] Error listando tenants:", listError);
    } else if (tenantsToDelete && tenantsToDelete.length > 0) {
      console.log(`🗑️ [RESET] Eliminando ${tenantsToDelete.length} tenant(s) incorrecto(s)...`);
      
      for (const tenant of tenantsToDelete) {
        console.log(`🗑️ [RESET] Eliminando tenant: ${tenant.tenant_key} (${tenant.tenant_name})`);
        
        // Eliminar onboarding asociado
        await supabase
          .from("tenant_onboarding")
          .delete()
          .eq("tenant_id", tenant.id);
        
        // Eliminar tenant
        await supabase
          .from("tenants")
          .delete()
          .eq("id", tenant.id);
      }
      
      console.log("✅ [RESET] Tenants incorrectos eliminados");
    }

    // 3. Resetear el onboarding del tenant SYSTEM a IN_PROGRESS
    console.log("🔄 [RESET] Reseteando onboarding del tenant SYSTEM...");
    
    const { error: onboardingError } = await supabase
      .from("tenant_onboarding")
      .upsert({
        tenant_id: systemTenant.id,
        user_id: null,
        onboarding_status: "IN_PROGRESS",
        current_step: "tenant_setup",
        completion_percentage: 0
      }, { onConflict: "tenant_id" });

    if (onboardingError) {
      console.error("❌ [RESET] Error reseteando onboarding:", onboardingError);
      return c.json({ error: "Error reseteando onboarding", details: onboardingError }, 500);
    }

    console.log("✅ [RESET] Wizard reseteado exitosamente");

    return c.json({
      success: true,
      message: "Wizard reseteado correctamente",
      systemTenantId: systemTenant.id,
      tenantsDeleted: tenantsToDelete?.length || 0
    });
  } catch (error) {
    console.error("💥 [RESET] Error inesperado:", error);
    return c.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// ============================================================================
// ENDPOINTS DE TENANT
// ============================================================================
app.get("/make-server-e19f2094/tenants/:id", requireAuth, getTenant);
app.put("/make-server-e19f2094/tenants/:id", requireAuth, updateTenant);
app.get("/make-server-e19f2094/tenants/:id/settings", requireAuth, getTenantSettings);
app.post("/make-server-e19f2094/tenants/:id/settings", requireAuth, createTenantSetting);
app.put("/make-server-e19f2094/tenants/:id/settings/:setting_id", requireAuth, updateTenantSetting);
app.delete("/make-server-e19f2094/tenants/:id/settings/:setting_id", requireAuth, deleteTenantSetting);
app.get("/make-server-e19f2094/tenants/:id/members", requireAuth, getTenantMembers);
app.get("/make-server-e19f2094/tenants/:id/languages", requireAuth, getTenantLanguages);
app.put("/make-server-e19f2094/tenants/:id/languages", requireAuth, updateTenantLanguages);
app.get("/make-server-e19f2094/lookup-values/data-types", requireAuth, getDataTypes);
// Endpoints del tenant único (SYSTEM)
app.get("/make-server-e19f2094/tenant/settings", getSystemTenantSettings);
app.put("/make-server-e19f2094/tenant/settings", updateSystemTenantSettings);

Deno.serve(app.fetch);