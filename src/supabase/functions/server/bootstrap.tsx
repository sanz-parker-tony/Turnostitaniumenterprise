// ============================================================================
// bootstrap.tsx
// Turnos Titanium Enterprise - Bootstrap del Sistema
// ============================================================================
// Descripción:
//   Auto-crea usuario system.admin + tenant SYSTEM + rol SYSTEM_ADMIN
//   Idempotente: puede ejecutarse N veces sin duplicar datos
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { Context } from 'npm:hono@4';

const SYSTEM_ADMIN_EMAIL = 'system.admin@titanium-labs.com';
const SYSTEM_ADMIN_PASSWORD = 'Titanium2026!'; // Contraseña por defecto (seed SQL y bootstrap)
const TENANT_KEY = 'SYSTEM';
const ROLE_KEY = 'SYSTEM_ADMIN';

// ============================================================================
// POST /make-server-e19f2094/bootstrap/ensure-system-admin
// ============================================================================

export async function ensureSystemAdmin(c: Context) {
  try {
    console.log('🔧 [BOOTSTRAP] Iniciando ensure-system-admin...');

    // Validar variables de entorno (sin fallback)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [BOOTSTRAP] Variables de entorno faltantes');
      return c.json(
        {
          success: false,
          error: 'Missing required environment variables',
          details: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set',
        },
        500
      );
    }

    // Crear cliente Supabase con SERVICE_ROLE_KEY
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // ========================================================================
    // 1. VERIFICAR/CREAR USUARIO EN AUTH
    // ========================================================================

    let authUserId: string | null = null;
    let isNewUser = false;

    console.log(`🔍 [BOOTSTRAP] Verificando usuario Auth: ${SYSTEM_ADMIN_EMAIL}`);

    // Intentar obtener usuario existente usando listUsers
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    
    const existingUser = listData?.users?.find(u => u.email === SYSTEM_ADMIN_EMAIL);

    if (existingUser) {
      console.log('✅ [BOOTSTRAP] Usuario Auth ya existe:', existingUser.id);
      authUserId = existingUser.id;
    } else {
      // Usuario no existe, crearlo
      console.log('🆕 [BOOTSTRAP] Creando usuario Auth...');

      const { data: newAuthUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: SYSTEM_ADMIN_EMAIL,
        password: SYSTEM_ADMIN_PASSWORD,
        email_confirm: true, // Auto-confirmar email (no hay servidor de email configurado)
        user_metadata: {
          display_name: 'System Administrator',
          is_system_admin: true,
        },
      });

      if (createUserError || !newAuthUser?.user) {
        console.error('❌ [BOOTSTRAP] Error creando usuario Auth:', createUserError);
        return c.json(
          { success: false, error: 'Error creando usuario Auth', details: createUserError },
          500
        );
      }

      authUserId = newAuthUser.user.id;
      isNewUser = true;
      console.log('✅ [BOOTSTRAP] Usuario Auth creado:', authUserId);
    }

    // ========================================================================
    // 2. UPSERT TENANT SYSTEM
    // ========================================================================

    console.log(`🔍 [BOOTSTRAP] Verificando tenant: ${TENANT_KEY}`);

    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .upsert(
        {
          tenant_key: TENANT_KEY,
          tenant_name: 'Sistema Titanium',
          is_active: true,
        },
        { onConflict: 'tenant_key' }
      )
      .select('id')
      .single();

    if (tenantError || !tenantData) {
      console.error('❌ [BOOTSTRAP] Error creando/obteniendo tenant:', tenantError);
      return c.json(
        { success: false, error: 'Error creando tenant SYSTEM', details: tenantError },
        500
      );
    }

    const tenantId = tenantData.id;
    console.log('✅ [BOOTSTRAP] Tenant SYSTEM OK:', tenantId);

    // ========================================================================
    // 3. UPSERT ROL SYSTEM_ADMIN
    // ========================================================================

    console.log(`🔍 [BOOTSTRAP] Verificando rol: ${ROLE_KEY}`);

    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .upsert(
        {
          tenant_id: tenantId,
          role_key: ROLE_KEY,
          role_name: 'System Administrator',
          role_scope: 'SYSTEM', // CRÍTICO: role_scope='SYSTEM' (NOT NULL, default TENANT no aplica)
          is_active: true,
          created_by: 'SYSTEM',
        },
        { onConflict: 'tenant_id,role_key' }
      )
      .select('id')
      .single();

    if (roleError || !roleData) {
      console.error('❌ [BOOTSTRAP] Error creando/obteniendo rol:', roleError);
      return c.json(
        { success: false, error: 'Error creando rol SYSTEM_ADMIN', details: roleError },
        500
      );
    }

    const roleId = roleData.id;
    console.log('✅ [BOOTSTRAP] Rol SYSTEM_ADMIN OK:', roleId);

    // ========================================================================
    // 4. CREAR USUARIO EN PUBLIC.USERS
    // ========================================================================

    console.log(`🔍 [BOOTSTRAP] Verificando usuario en public.users`);

    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert(
        {
          auth_user_id: authUserId,
          tenant_id: tenantId,
          username: 'system.admin',
          email: SYSTEM_ADMIN_EMAIL,
          display_name: 'System Administrator',
          is_active: true,
          created_by: 'SYSTEM'
        },
        { onConflict: 'auth_user_id' }
      )
      .select('id')
      .single();

    if (userError || !userData) {
      console.error('❌ [BOOTSTRAP] Error creando/actualizando public.users:', userError);
      return c.json(
        { success: false, error: 'Error creando usuario en public.users', details: userError },
        500
      );
    }

    const userId = userData.id;
    console.log('✅ [BOOTSTRAP] Usuario en public.users OK:', userId);

    // ========================================================================
    // 5. UPSERT USER_ROLES (ASIGNAR SYSTEM_ADMIN AL USUARIO)
    // ========================================================================

    console.log(`🔍 [BOOTSTRAP] Asignando rol SYSTEM_ADMIN al usuario`);

    // Primero verificar si ya existe
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .maybeSingle();

    if (!existingRole) {
      // Solo insertar si no existe
      const { error: userRoleError } = await supabase
        .from('user_roles')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          role_id: roleId,
          is_active: true,
          created_by: 'SYSTEM'
        });

      if (userRoleError) {
        console.error('❌ [BOOTSTRAP] Error asignando rol:', userRoleError);
        return c.json(
          { success: false, error: 'Error asignando rol al usuario', details: userRoleError },
          500
        );
      }

      console.log('✅ [BOOTSTRAP] Rol SYSTEM_ADMIN asignado correctamente');
    } else {
      console.log('✅ [BOOTSTRAP] Rol SYSTEM_ADMIN ya estaba asignado');
    }

    // ========================================================================
    // 6. UPSERT TENANT_ONBOARDING
    // ========================================================================

    console.log(`🔍 [BOOTSTRAP] Verificando tenant_onboarding`);

    const { error: onboardingError } = await supabase.from('tenant_onboarding').upsert(
      {
        tenant_id: tenantId,
        user_id: userId, // Incluir user_id
        onboarding_status: 'NOT_STARTED',
        current_step: 'tenant_setup',
        completion_percentage: 0, // Incluir completion_percentage
        // NO incluir created_by/updated_by (no existen en esta tabla)
      },
      { onConflict: 'tenant_id' }
    );

    if (onboardingError) {
      console.error('❌ [BOOTSTRAP] Error creando tenant_onboarding:', onboardingError);
      return c.json(
        { success: false, error: 'Error creando tenant_onboarding', details: onboardingError },
        500
      );
    }

    console.log('✅ [BOOTSTRAP] Tenant onboarding OK');

    // ========================================================================
    // 7. RESPUESTA EXITOSA
    // ========================================================================

    console.log('🎉 [BOOTSTRAP] Bootstrap completado exitosamente');

    // IMPORTANTE: Si es system.admin@titanium-labs.com, SIEMPRE debe cambiar contraseña
    // Esto aplica tanto si fue creado por el SQL seed como por este endpoint
    const mustChangePassword = SYSTEM_ADMIN_EMAIL === 'system.admin@titanium-labs.com';

    return c.json({
      success: true,
      message: 'System admin ready',
      data: {
        authUserId,
        tenantId,
        roleId,
        userId,
        mustChangePassword, // Siempre true para system.admin
        isNewUser,
      },
    });
  } catch (error) {
    console.error('💥 [BOOTSTRAP] Error inesperado:', error);
    return c.json(
      {
        success: false,
        error: 'Error inesperado en bootstrap',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

// ============================================================================
// ENDPOINTS DEL WIZARD DE CONFIGURACIÓN INICIAL
// ============================================================================

/**
 * GET /make-server-e19f2094/bootstrap/wizard-state
 * Obtiene el estado actual del wizard de configuración
 */
export async function getWizardState(c: Context) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar CUALQUIER tenant con onboarding COMPLETED (no solo SYSTEM)
    const { data: completedOnboarding } = await supabase
      .from('tenant_onboarding')
      .select('onboarding_status, tenant_id')
      .eq('onboarding_status', 'COMPLETED')
      .limit(1)
      .maybeSingle();

    if (completedOnboarding) {
      console.log('✅ [WIZARD_STATE] Onboarding completado encontrado:', completedOnboarding);
      return c.json({ onboardingStatus: 'COMPLETED' });
    }

    // Si no hay ninguno completado, buscar si hay alguno en progreso
    const { data: inProgressOnboarding } = await supabase
      .from('tenant_onboarding')
      .select('onboarding_status')
      .eq('onboarding_status', 'IN_PROGRESS')
      .limit(1)
      .maybeSingle();

    if (inProgressOnboarding) {
      console.log('⚠️ [WIZARD_STATE] Onboarding en progreso');
      return c.json({ onboardingStatus: 'IN_PROGRESS' });
    }

    console.log('📋 [WIZARD_STATE] No hay onboarding completado ni en progreso');
    return c.json({ onboardingStatus: 'NOT_STARTED' });
  } catch (error) {
    console.error('Error en getWizardState:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * GET /make-server-e19f2094/bootstrap/token
 * Retorna el token de bootstrap (anon key)
 */
export async function getBootstrapToken(c: Context) {
  return c.json({
    token: Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  });
}

/**
 * GET /make-server-e19f2094/bootstrap/languages
 * Retorna los idiomas disponibles
 */
export async function getSystemLanguages(c: Context) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('system_languages')
      .select('*')
      .eq('is_active', true)
      .order('language_name');

    if (error) {
      console.error('Error obteniendo idiomas:', error);
      return c.json({ error: 'Error obteniendo idiomas' }, 500);
    }

    return c.json({ languages: data || [] });
  } catch (error) {
    console.error('Error en getSystemLanguages:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Middleware: Validar que estamos en modo bootstrap
 */
export async function validateBootstrapMode(c: Context, next: () => Promise<void>) {
  // Por ahora, permitir siempre (se puede agregar validación adicional después)
  await next();
}

/**
 * POST /make-server-e19f2094/bootstrap/step1-tenant
 * Guarda la configuración del tenant (Paso 1)
 */
export async function bootstrapStep1Tenant(c: Context) {
  try {
    const body = await c.req.json();
    const { tenant_key, tenant_name, default_language } = body;

    console.log('📝 [STEP1] Recibido body:', { tenant_key, tenant_name, default_language });

    // Validar campos requeridos
    if (!tenant_key || !tenant_name) {
      console.error('❌ [STEP1] Campos requeridos faltantes');
      return c.json({ 
        success: false,
        error: 'Campos requeridos faltantes',
        details: {
          tenant_key: tenant_key || 'faltante',
          tenant_name: tenant_name || 'faltante'
        }
      }, 400);
    }

    // Validar variables de entorno
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [STEP1] Variables de entorno faltantes');
      return c.json({ 
        success: false,
        error: 'Error de configuración del servidor',
        details: 'Variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configuradas'
      }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('📝 [STEP1] Guardando tenant:', tenant_key);

    // 🛡️ VALIDACIÓN CRÍTICA: Verificar que solo exista UN tenant
    console.log('🛡️ [STEP1] VALIDACIÓN: Verificando cantidad de tenants...');
    const { data: allTenants, error: countError } = await supabase
      .from('tenants')
      .select('id, tenant_key, tenant_name');

    if (countError) {
      console.error('❌ [STEP1] Error al contar tenants:', countError);
      return c.json({ 
        error: 'Error validando integridad del sistema',
        details: countError.message
      }, 500);
    }

    const tenantCount = allTenants?.length || 0;
    console.log(`📊 [STEP1] Tenants encontrados: ${tenantCount}`);

    if (tenantCount === 0) {
      console.error('❌ [STEP1] CRÍTICO: No existe ningún tenant. Ejecutar 002_SEED_COMPLETE.sql primero.');
      return c.json({ 
        error: 'Sistema no inicializado',
        details: 'No existe ningún tenant. Ejecuta 002_SEED_COMPLETE.sql primero.'
      }, 500);
    }

    if (tenantCount > 1) {
      console.error(`❌ [STEP1] CRÍTICO: Existen ${tenantCount} tenants pero solo debe haber UNO.`);
      console.error('📋 [STEP1] Tenants encontrados:', allTenants);
      return c.json({ 
        error: 'Integridad comprometida: múltiples tenants detectados',
        details: `Se encontraron ${tenantCount} tenants cuando solo debe existir UNO. Ejecuta 001_FACTORY_RESET.sql y vuelve a empezar.`,
        tenants: allTenants
      }, 500);
    }

    console.log('✅ [STEP1] Validación exitosa: Existe exactamente 1 tenant');

    // ✅ CORRECCIÓN: El wizard NO crea un nuevo tenant
    // Debe ACTUALIZAR el tenant SYSTEM que ya existe del seed
    // FLUJO CORRECTO:
    //   1. SEED crea tenant SYSTEM
    //   2. Wizard ACTUALIZA tenant SYSTEM (nombre, idiomas, timezone)
    //   3. Se crea usuario TENANT_ADMIN para tenant SYSTEM

    console.log('🔍 [STEP1] Buscando tenant SYSTEM...');
    const { data: systemTenant, error: systemTenantError } = await supabase
      .from('tenants')
      .select('id, tenant_key, tenant_name')
      .eq('tenant_key', 'SYSTEM')
      .single();

    if (systemTenantError || !systemTenant) {
      console.error('❌ [STEP1] Tenant SYSTEM no encontrado. Ejecutar 002_SEED_COMPLETE.sql primero.', systemTenantError);
      return c.json({ 
        error: 'Tenant SYSTEM no encontrado',
        details: 'Ejecutar las migraciones SQL primero (002_SEED_COMPLETE.sql)'
      }, 500);
    }

    console.log('✅ [STEP1] Tenant SYSTEM encontrado:', systemTenant.id);

    // ✅ ACTUALIZAR el tenant SYSTEM con la configuración del wizard
    console.log('📝 [STEP1] Actualizando configuración del tenant SYSTEM...');
    const { data: updatedTenant, error: updateError } = await supabase
      .from('tenants')
      .update({
        tenant_name, // Actualizar nombre si el usuario lo cambió
        is_active: true
      })
      .eq('id', systemTenant.id)
      .select('id')
      .single();

    if (updateError) {
      console.error('❌ [STEP1] Error actualizando tenant SYSTEM:', updateError);
      return c.json({ error: 'Error actualizando tenant', details: updateError }, 500);
    }

    const tenantData = updatedTenant;
    console.log('✅ [STEP1] Tenant SYSTEM actualizado:', tenantData.id);

    // Actualizar/crear onboarding (SIEMPRE con upsert para idempotencia)
    const { error: onboardingError } = await supabase
      .from('tenant_onboarding')
      .upsert({
        tenant_id: tenantData.id,
        onboarding_status: 'IN_PROGRESS',
        current_step: 'admin_setup',
        completion_percentage: 50
        // user_id se agregará en step2 cuando se cree el admin
      }, { onConflict: 'tenant_id' });

    if (onboardingError) {
      console.error('❌ [STEP1] Error actualizando onboarding:', onboardingError);
      // Si el error es por user_id NOT NULL, intentar con NULL explícito
      const { error: retryError } = await supabase
        .from('tenant_onboarding')
        .upsert({
          tenant_id: tenantData.id,
          user_id: null, // Explícitamente NULL
          onboarding_status: 'IN_PROGRESS',
          current_step: 'admin_setup',
          completion_percentage: 50
        }, { onConflict: 'tenant_id' });
      
      if (retryError) {
        console.error('❌ [STEP1] Error en retry onboarding:', retryError);
        return c.json({ 
          error: 'Error actualizando onboarding', 
          details: retryError,
          hint: 'La tabla tenant_onboarding puede requerir user_id NOT NULL. Considera hacer este campo nullable.'
        }, 500);
      }
    }

    console.log('✅ [STEP1] Tenant guardado exitosamente:', tenantData.id);

    return c.json({
      success: true,
      tenant_id: tenantData.id
    });
  } catch (error) {
    console.error('💥 [STEP1] Error inesperado en bootstrapStep1Tenant:', error);
    return c.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 500);
  }
}

/**
 * POST /make-server-e19f2094/bootstrap/step2-admin
 * Crea el usuario tenant.admin (Paso 2)
 */
export async function bootstrapStep2Admin(c: Context) {
  try {
    const body = await c.req.json();
    const { username, email, display_name, password } = body;

    console.log('📝 [STEP2] Iniciando creación de usuario tenant.admin');
    console.log('📝 [STEP2] Datos recibidos:', { username, email, display_name, passwordLength: password?.length });

    if (!username || !email || !display_name || !password) {
      console.error('❌ [STEP2] Campos faltantes:', { username: !!username, email: !!email, display_name: !!display_name, password: !!password });
      return c.json({ error: 'Todos los campos son requeridos' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('📝 [STEP2] Creando usuario tenant.admin:', email);

    // ✅ CORRECCIÓN: Buscar el tenant SYSTEM (único tenant del sistema)
    // En el protocolo SELLADO, solo existe el tenant SYSTEM
    console.log('🔍 [STEP2] Buscando tenant SYSTEM...');
    const { data: mainTenant, error: tenantFetchError } = await supabase
      .from('tenants')
      .select('id, tenant_key, tenant_name')
      .eq('tenant_key', 'SYSTEM') // El único tenant es SYSTEM
      .single();

    if (tenantFetchError || !mainTenant) {
      console.error('❌ [STEP2] Tenant SYSTEM no encontrado. Ejecutar 002_SEED_COMPLETE.sql primero.', tenantFetchError);
      return c.json({ 
        error: 'Tenant principal no encontrado',
        details: 'Ejecutar las migraciones SQL primero (002_SEED_COMPLETE.sql)'
      }, 500);
    }

    const tenantId = mainTenant.id;
    console.log('✅ [STEP2] Tenant SYSTEM encontrado:', tenantId, mainTenant.tenant_name);
    console.log('📊 [STEP2] Tenant completo:', JSON.stringify(mainTenant, null, 2));

    // 2. Buscar rol TENANT_ADMIN en el tenant SYSTEM
    console.log('📝 [STEP2] Buscando rol TENANT_ADMIN en tenant SYSTEM...');

    let role;
    
    // Intentar buscar con scope TENANT primero
    const { data: roleWithScope, error: roleError } = await supabase
      .from('roles')
      .select('id, role_key, role_scope')
      .eq('role_key', 'TENANT_ADMIN')
      .eq('role_scope', 'TENANT')
      .maybeSingle();

    if (roleWithScope) {
      role = roleWithScope;
      console.log('✅ [STEP2] Rol TENANT_ADMIN encontrado con scope TENANT:', role.id);
    } else {
      // Fallback: buscar sin filtro de scope
      console.log('🔄 [STEP2] No encontrado con scope TENANT, buscando sin scope...');
      const { data: roleNoScope, error: roleNoScopeError } = await supabase
        .from('roles')
        .select('id, role_key, role_scope')
        .eq('role_key', 'TENANT_ADMIN')
        .maybeSingle();
      
      if (roleNoScope) {
        role = roleNoScope;
        console.log('✅ [STEP2] Rol TENANT_ADMIN encontrado con scope:', roleNoScope.role_scope);
      } else {
        // No se encontró el rol en absoluto
        console.error('❌ [STEP2] Rol TENANT_ADMIN no encontrado');
        
        // Listar todos los roles disponibles para debugging
        const { data: allRoles } = await supabase
          .from('roles')
          .select('id, role_key, role_name, role_scope')
          .order('role_key', { ascending: true });
        
        console.error('❌ [STEP2] Roles disponibles en el sistema:', allRoles);
        
        return c.json({ 
          error: 'Rol TENANT_ADMIN no encontrado en el sistema. El seed de la base de datos podría estar incompleto.',
          hint: 'Verifica que el rol TENANT_ADMIN exista en la tabla roles',
          availableRoles: allRoles?.map(r => ({ key: r.role_key, scope: r.role_scope, name: r.role_name }))
        }, 500);
      }
    }

    console.log('✅ [STEP2] Rol TENANT_ADMIN encontrado:', role.id);

    // 3. Verificar si el email ya existe en Auth
    console.log('📝 [STEP2] Verificando si el email ya existe en Auth...');
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existingAuthUser = listData?.users?.find(u => u.email === email);

    let authUserId: string;
    let shouldCreateUserInPublicUsers = true;
    let existingPublicUserId: string | null = null;

    if (existingAuthUser) {
      console.log('⚠️ [STEP2] Usuario ya existe en Auth:', existingAuthUser.id);
      
      // Verificar si el usuario ya está en public.users (buscar solo por auth_user_id)
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, tenant_id, username, email, display_name, is_active')
        .eq('auth_user_id', existingAuthUser.id)
        .maybeSingle();

      if (existingUser) {
        // El usuario ya existe en public.users
        if (existingUser.tenant_id === tenantId) {
          // Mismo tenant: Este es el caso idempotente, el wizard ya fue completado
          console.log('✅ [STEP2] Usuario ya existe para este tenant (idempotencia)');
          shouldCreateUserInPublicUsers = false;
          existingPublicUserId = existingUser.id;
          authUserId = existingAuthUser.id;
          
          // ⚠️ IMPORTANTE: NO hacer return aquí, continuar para verificar/asignar el rol
        } else {
          // Diferente tenant: Este email está en uso en otro tenant
          console.error('❌ [STEP2] Email ya está en uso en otro tenant');
          return c.json({ 
            error: 'Este email ya está en uso. Por favor use un email diferente.' 
          }, 400);
        }
      } else {
        // El usuario existe en Auth pero NO en public.users, usar el existente
        console.log('🔄 [STEP2] Usuario existe en Auth pero no en public.users, completando registro...');
        authUserId = existingAuthUser.id;

        // Actualizar la contraseña por si acaso
        console.log('🔄 [STEP2] Actualizando contraseña...');
        await supabase.auth.admin.updateUserById(authUserId, { password });
      }
    } else {
      // Usuario no existe, crear
      console.log('📝 [STEP2] Creando usuario en Auth...');
      
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: display_name }
        });

        if (authError) {
          // Si el error es porque el email ya existe, intentar recuperarlo
          if (authError.message.includes('already') || authError.code === 'email_exists') {
            console.log('⚠️ [STEP2] Email ya existe según error, intentando recuperar usuario...');
            const { data: retryListData } = await supabase.auth.admin.listUsers();
            const retryUser = retryListData?.users?.find(u => u.email === email);
            
            if (retryUser) {
              console.log('✅ [STEP2] Usuario recuperado, continuando...');
              authUserId = retryUser.id;
              await supabase.auth.admin.updateUserById(authUserId, { password });
            } else {
              throw new Error('No se pudo crear ni recuperar el usuario. Por favor use un email diferente.');
            }
          } else {
            console.error('❌ [STEP2] Error creando usuario en Auth:', authError);
            throw new Error(`Error creando usuario: ${authError.message}. Por favor use un email diferente.`);
          }
        } else {
          authUserId = authData!.user.id;
          console.log('✅ [STEP2] Usuario creado en Auth:', authUserId);
        }
      } catch (createError: any) {
        console.error('❌ [STEP2] Error en proceso de creación:', createError);
        return c.json({ 
          error: createError.message || 'Error creando usuario en Auth. Por favor use un email diferente.',
          hint: 'Si el email ya fue usado antes, use uno diferente o contacte al administrador del sistema.'
        }, 500);
      }
    }

    // 4. Crear usuario en public.users (solo si es necesario)
    let userId: string;
    
    if (shouldCreateUserInPublicUsers) {
      console.log('📝 [STEP2] Creando usuario en public.users...');
      
      // Si el usuario ya existía en Auth, usar upsert; si no, usar insert
      let userData;
      let userError;
      
      if (existingAuthUser) {
        // Usuario existía en Auth: usar upsert (podría estar en public.users o no)
        const result = await supabase
          .from('users')
          .upsert({
            auth_user_id: authUserId,
            tenant_id: tenantId,
            username,
            email,
            display_name,
            is_active: true,
            created_by: 'BOOTSTRAP'
          }, { onConflict: 'auth_user_id' })
          .select('id')
          .single();
        
        userData = result.data;
        userError = result.error;
      } else {
        // Usuario NO existía en Auth: usar insert (definitivamente no está en public.users)
        const result = await supabase
          .from('users')
          .insert({
            auth_user_id: authUserId,
            tenant_id: tenantId,
            username,
            email,
            display_name,
            is_active: true,
            created_by: 'BOOTSTRAP'
          })
          .select('id')
          .single();
        
        userData = result.data;
        userError = result.error;
      }

      if (userError || !userData) {
        console.error('❌ [STEP2] Error creando usuario en users:', userError);
        
        // Solo eliminar de Auth si lo acabamos de crear
        if (!existingAuthUser) {
          console.log('🔄 [STEP2] Eliminando usuario de Auth debido al error...');
          await supabase.auth.admin.deleteUser(authUserId);
        }
        
        return c.json({ error: 'Error creando usuario en tabla users', details: userError?.message }, 500);
      }

      userId = userData.id;
      console.log('✅ [STEP2] Usuario creado en public.users:', userId);
    } else {
      // Usuario ya existía, usar el existente
      userId = existingPublicUserId!;
      console.log('✅ [STEP2] Usando usuario existente:', userId);
    }

    // 5. ⚠️ CRÍTICO: Asignar rol TENANT_ADMIN (ejecutar SIEMPRE, incluso en casos idempotentes)
    console.log('📝 [STEP2] Verificando asignación de rol TENANT_ADMIN...');
    
    // Primero verificar si ya existe el rol asignado
    const { data: existingRoleCheck, error: roleCheckError } = await supabase
      .from('user_roles')
      .select('id, is_active')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('role_id', role.id)
      .maybeSingle();

    if (roleCheckError) {
      console.error('❌ [STEP2] Error verificando rol existente:', roleCheckError);
    }

    if (!existingRoleCheck) {
      // El rol NO existe, crearlo
      console.log('📝 [STEP2] Rol no existe, insertando en user_roles...');
      
      const { data: insertedRole, error: roleAssignError } = await supabase
        .from('user_roles')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          role_id: role.id,
          is_active: true,
          created_by: 'BOOTSTRAP'
        })
        .select('id')
        .single();

      if (roleAssignError) {
        console.error('❌ [STEP2] Error asignando rol:', roleAssignError);
        console.log('🔄 [STEP2] Limpiando datos debido al error...');
        
        // Solo limpiar si acabamos de crear el usuario
        if (shouldCreateUserInPublicUsers) {
          await supabase.from('users').delete().eq('id', userId);
          
          // Solo eliminar de Auth si lo acabamos de crear
          if (!existingAuthUser) {
            await supabase.auth.admin.deleteUser(authUserId);
          }
        }
        
        return c.json({ 
          error: 'Error asignando rol TENANT_ADMIN al usuario', 
          details: roleAssignError.message,
          hint: 'Verifica que la tabla user_roles esté correctamente configurada'
        }, 500);
      }

      console.log('✅ [STEP2] Rol TENANT_ADMIN asignado correctamente, ID:', insertedRole?.id);
    } else {
      console.log('✅ [STEP2] Rol TENANT_ADMIN ya estaba asignado, ID:', existingRoleCheck.id);
      
      // Asegurar que está activo
      if (!existingRoleCheck.is_active) {
        console.log('🔄 [STEP2] Activando rol...');
        await supabase
          .from('user_roles')
          .update({ is_active: true })
          .eq('id', existingRoleCheck.id);
      }
    }

    // 6. Marcar onboarding como completado
    console.log('📝 [STEP2] Marcando onboarding como completado...');
    const { error: onboardingError } = await supabase
      .from('tenant_onboarding')
      .update({
        user_id: userId,
        onboarding_status: 'COMPLETED',
        current_step: 'completed',
        completion_percentage: 100,
        completed_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId);

    if (onboardingError) {
      console.error('⚠️ [STEP2] Error actualizando onboarding (no crítico):', onboardingError);
    } else {
      console.log('✅ [STEP2] Onboarding marcado como completado');
    }

    console.log('🎉 [STEP2] Usuario tenant.admin creado/verificado exitosamente');
    console.log('📊 [STEP2] Resumen:', {
      auth_user_id: authUserId,
      public_user_id: userId,
      tenant_id: tenantId,
      role_id: role.id,
      role_key: 'TENANT_ADMIN'
    });

    return c.json({
      success: true,
      user_id: userId,
      auth_user_id: authUserId
    });
  } catch (error) {
    console.error('💥 [STEP2] Error inesperado en bootstrapStep2Admin:', error);
    return c.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 500);
  }
}

/**
 * GET /make-server-e19f2094/bootstrap/tenant-info
 * Obtiene información del tenant
 */
export async function getTenantInfo(c: Context) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: tenants } = await supabase
      .from('tenants')
      .select('*')
      .neq('tenant_key', 'SYSTEM')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!tenants || tenants.length === 0) {
      return c.json({ tenant: null });
    }

    return c.json({ tenant: tenants[0] });
  } catch (error) {
    console.error('Error en getTenantInfo:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * GET /make-server-e19f2094/bootstrap/diagnostics
 * Diagnóstico completo del estado del wizard
 */
export async function getWizardDiagnostics(c: Context) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener todos los tenants
    const { data: allTenants } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    // Obtener todos los registros de tenant_onboarding
    const { data: allOnboarding } = await supabase
      .from('tenant_onboarding')
      .select('*, tenants(tenant_key, tenant_name)')
      .order('created_at', { ascending: false });

    // Obtener usuarios con rol TENANT_ADMIN
    const { data: tenantAdmins } = await supabase
      .from('user_roles')
      .select('*, users(username, email), roles(role_key, role_name)')
      .eq('roles.role_key', 'TENANT_ADMIN')
      .eq('is_active', true);

    // Obtener usuarios con rol SYSTEM_ADMIN
    const { data: systemAdmins } = await supabase
      .from('user_roles')
      .select('*, users(username, email), roles(role_key, role_name)')
      .eq('roles.role_key', 'SYSTEM_ADMIN')
      .eq('is_active', true);

    return c.json({
      success: true,
      diagnostics: {
        tenants: allTenants || [],
        onboarding_records: allOnboarding || [],
        tenant_admins: tenantAdmins || [],
        system_admins: systemAdmins || [],
        summary: {
          total_tenants: allTenants?.length || 0,
          total_onboarding_records: allOnboarding?.length || 0,
          completed_onboarding: allOnboarding?.filter(o => o.onboarding_status === 'COMPLETED').length || 0,
          in_progress_onboarding: allOnboarding?.filter(o => o.onboarding_status === 'IN_PROGRESS').length || 0,
          not_started_onboarding: allOnboarding?.filter(o => o.onboarding_status === 'NOT_STARTED').length || 0,
        }
      }
    });
  } catch (error) {
    console.error('Error en getWizardDiagnostics:', error);
    return c.json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
}

/**
 * POST /make-server-e19f2094/bootstrap/reset-wizard
 * Resetea el wizard eliminando el tenant no-SYSTEM y su onboarding
 * ⚠️ USAR SOLO PARA DESARROLLO - Elimina el tenant y el usuario tenant.admin
 */
export async function resetWizard(c: Context) {
  try {
    console.log('🔄 [RESET_WIZARD] Iniciando reseteo del wizard...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Buscar tenant no-SYSTEM
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, tenant_key, tenant_name')
      .neq('tenant_key', 'SYSTEM')
      .order('created_at', { ascending: false });

    if (!tenants || tenants.length === 0) {
      console.log('✅ [RESET_WIZARD] No hay tenants para eliminar');
      return c.json({ 
        success: true,
        message: 'No hay tenants para resetear',
        deleted: {
          tenants: 0,
          users: 0,
          onboarding_records: 0
        }
      });
    }

    let deletedTenants = 0;
    let deletedUsers = 0;
    let deletedOnboarding = 0;

    for (const tenant of tenants) {
      console.log(`🗑️ [RESET_WIZARD] Eliminando tenant: ${tenant.tenant_key}`);

      // 2. Obtener usuarios de este tenant
      const { data: users } = await supabase
        .from('users')
        .select('id, auth_user_id, username, email')
        .eq('tenant_id', tenant.id);

      // 3. Eliminar usuarios de Auth
      if (users && users.length > 0) {
        for (const user of users) {
          console.log(`🗑️ [RESET_WIZARD] Eliminando usuario de Auth: ${user.email}`);
          try {
            await supabase.auth.admin.deleteUser(user.auth_user_id);
            console.log(`✅ [RESET_WIZARD] Usuario ${user.email} eliminado de Auth`);
          } catch (authError) {
            console.error(`⚠️ [RESET_WIZARD] Error eliminando usuario de Auth:`, authError);
            // Continuar aunque falle
          }
        }
      }

      // 4. Eliminar user_roles del tenant (CASCADE debería hacerlo, pero por seguridad)
      const { error: userRolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('tenant_id', tenant.id);

      if (userRolesError) {
        console.error('⚠️ [RESET_WIZARD] Error eliminando user_roles:', userRolesError);
      }

      // 5. Eliminar usuarios del tenant (CASCADE debería eliminar relaciones)
      const { error: usersError, count: usersCount } = await supabase
        .from('users')
        .delete()
        .eq('tenant_id', tenant.id)
        .select('*', { count: 'exact', head: false });

      if (usersError) {
        console.error('⚠️ [RESET_WIZARD] Error eliminando users:', usersError);
      } else {
        deletedUsers += usersCount || 0;
        console.log(`✅ [RESET_WIZARD] ${usersCount} usuarios eliminados de public.users`);
      }

      // 6. Eliminar onboarding del tenant
      const { error: onboardingError, count: onboardingCount } = await supabase
        .from('tenant_onboarding')
        .delete()
        .eq('tenant_id', tenant.id)
        .select('*', { count: 'exact', head: false });

      if (onboardingError) {
        console.error('⚠️ [RESET_WIZARD] Error eliminando onboarding:', onboardingError);
      } else {
        deletedOnboarding += onboardingCount || 0;
        console.log(`✅ [RESET_WIZARD] Onboarding eliminado`);
      }

      // 7. Finalmente, eliminar el tenant
      const { error: tenantError } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenant.id);

      if (tenantError) {
        console.error('❌ [RESET_WIZARD] Error eliminando tenant:', tenantError);
        return c.json({ 
          success: false,
          error: 'Error eliminando tenant',
          details: tenantError.message
        }, 500);
      } else {
        deletedTenants++;
        console.log(`✅ [RESET_WIZARD] Tenant ${tenant.tenant_key} eliminado`);
      }
    }

    console.log('🎉 [RESET_WIZARD] Reseteo completado exitosamente');

    return c.json({
      success: true,
      message: 'Wizard reseteado exitosamente',
      deleted: {
        tenants: deletedTenants,
        users: deletedUsers,
        onboarding_records: deletedOnboarding
      }
    });
  } catch (error) {
    console.error('💥 [RESET_WIZARD] Error inesperado:', error);
    return c.json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
}