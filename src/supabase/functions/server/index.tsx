import { Hono } from "npm:hono@4.6.14";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as bootstrap from './bootstrap.tsx';
import * as bootstrapEmployees from './bootstrap-employees.tsx';
import * as bootstrapCatalogs from './bootstrap-catalogs.tsx';
import * as bootstrapEmployeesExport from './bootstrap-employees-export.tsx';
import { bootstrapComplete } from './bootstrap_complete_v1.tsx'; // ✅ v1.0 con contrato completo
import * as kv from './kv_store.tsx';
import * as kiosk from './kiosk.tsx'; // ✅ KIOSK endpoints v1.0

// ========================================
// VERSIÓN DEL BACKEND: v4.0 - CONTRATO ROBUSTO /bootstrap/complete
// ========================================
// ✅ CAMBIO (v4.0): Endpoint /bootstrap/complete reescrito con contrato exacto
//    - Idempotencia: respuesta ALREADY_EXISTS si usuario ya existe
//    - Atomicidad lógica: solo OK si auth + public + phone + onboarding
//    - No medias: stage exacto + rollback info en errores
//    - Request/Response estructurados según especificaciones profesionales
// ✅ CAMBIO (v3.0): Middleware de bootstrap ya NO requiere token (v2.0)
// ✅ FIX: Corregido nombres de columnas email y phone en users table según DDL (v2.3)
// ✅ FIX: Agregada limpieza de usuarios huérfanos en auth.users (v2.2)
// ✅ FIX: Cambiado rol de TENANT_ADMIN a SUPER_ADMIN según seed (v2.3)
// ✅ FIX CRÍTICO (v3.0):
//    - user_metadata correcto según especificaciones del trigger handle_new_user()
//    - Obtener preferred_language_code desde tenant_language_settings
//    - Verificación de que el trigger creó el registro en public.users
//    - UPDATE phone y campos reforzados post-creación (porque trigger NO inserta phone)
//    - Eliminada lógica manual de INSERT en public.users (trigger lo hace)
//    - Logs detallados de verificación y debug
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// ============================================================================
// CORS - DEBE IR PRIMERO PARA MANEJAR PREFLIGHT REQUESTS
// ============================================================================

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Bootstrap-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ============================================================================
// HEALTH CHECK (PÚBLICO)
// ============================================================================

app.get("/make-server-e19f2094/health", (c) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    version: "2.2-cors-fixed",
    environment: {
      hasSupabaseUrl: !!supabaseUrl,
      supabaseUrl: supabaseUrl || 'NOT SET',
      hasAnonKey: !!anonKey,
      anonKeyPreview: anonKey ? `${anonKey.substring(0, 50)}...` : 'NOT SET',
      anonKeyLength: anonKey?.length || 0,
      hasServiceKey: !!serviceKey,
      serviceKeyPreview: serviceKey ? `${serviceKey.substring(0, 50)}...` : 'NOT SET',
      serviceKeyLength: serviceKey?.length || 0
    }
  });
});

// ============================================================================
// ECHO TEST - ENDPOINT SÚPER SIMPLE PARA TESTING
// ============================================================================

app.all("/make-server-e19f2094/echo", (c) => {
  console.log('🔔 ECHO endpoint called');
  return c.json({ 
    success: true,
    message: "Echo endpoint is working!",
    timestamp: new Date().toISOString(),
    method: c.req.method,
    headers: Object.fromEntries([...c.req.raw.headers.entries()])
  });
});

// ============================================================================
// TEST TOKEN - ENDPOINT PARA VALIDAR TOKENS JWT
// ============================================================================

app.post("/make-server-e19f2094/test-token", async (c) => {
  console.log('🔔 TEST TOKEN endpoint called');
  
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('❌ No Authorization header');
    return c.json({ code: 401, message: 'Missing authorization header' }, 401);
  }

  const token = authHeader.split(' ')[1];
  console.log('🔑 Token received, length:', token.length);
  
  const supabaseAnon = getSupabaseAnonClient();
  
  console.log('🔍 Validating token with Supabase Auth...');
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  
  if (error) {
    console.error('❌ Token validation failed:', error);
    return c.json({ 
      code: 401, 
      message: 'Invalid JWT',
      error: error.message,
      details: error
    }, 401);
  }
  
  if (!user) {
    console.error('❌ No user returned');
    return c.json({ code: 401, message: 'Invalid JWT - no user' }, 401);
  }
  
  console.log('✅ Token valid for user:', user.email);
  return c.json({ 
    success: true,
    message: 'Token is valid',
    user: {
      id: user.id,
      email: user.email
    }
  });
});

// ============================================================================
// DIAGNOSTIC - ENDPOINT PARA DIAGNÓSTICO COMPLETO
// ============================================================================

app.get("/make-server-e19f2094/diagnostic", async (c) => {
  console.log('🔔 DIAGNOSTIC endpoint called');
  
  const authHeader = c.req.header('Authorization');
  
  const diagnostic = {
    timestamp: new Date().toISOString(),
    hasAuthHeader: !!authHeader,
    authHeaderFormat: authHeader ? authHeader.substring(0, 20) + '...' : 'NONE',
    environment: {
      supabaseUrl: Deno.env.get('SUPABASE_URL') || 'NOT SET',
      hasAnonKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
      anonKeyLength: Deno.env.get('SUPABASE_ANON_KEY')?.length || 0
    }
  };
  
  // Si hay token, intentar validarlo
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const supabaseAnon = getSupabaseAnonClient();
    
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
    
    diagnostic['tokenValidation'] = {
      isValid: !error && !!user,
      error: error?.message || null,
      userEmail: user?.email || null
    };
  }
  
  return c.json(diagnostic);
});

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
};

// Cliente para validar tokens de usuario (usa ANON_KEY)
const getSupabaseAnonClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );
};

// ============================================================================
// MIDDLEWARE: Verificar usuario autenticado
// ============================================================================

const requireAuth = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Authorization header missing or invalid' }, 401);
  }

  const token = authHeader.split(' ')[1];
  // ✅ Usar cliente ANON para validar tokens de usuario
  const supabaseAnon = getSupabaseAnonClient();
  
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  
  if (error || !user) {
    console.error('Error de autenticación:', error);
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Almacenar el usuario en el contexto
  c.set('user', user);
  await next();
};

// ============================================================================
// MIDDLEWARE: Validar que el header de autorización existe (sin validar usuario)
// Se usa para endpoints públicos que solo necesitan el header presente
// ============================================================================

const requireAuthHeader = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ code: 401, message: 'Missing authorization header' }, 401);
  }
  // No validamos el token, solo verificamos que exista el header
  await next();
};

// ============================================================================
// MIDDLEWARE: Verificar SYSTEM ADMIN (para tablas de sistema)
// ============================================================================

const requireSystemAdmin = async (c: any, next: any) => {
  console.log('🚀 === INICIO requireSystemAdmin ===');
  
  const authHeader = c.req.header('Authorization');
  console.log('📋 Authorization header:', authHeader ? `Bearer ${authHeader.substring(7, 57)}...` : 'MISSING');
  
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('❌ Authorization header missing or invalid');
    return c.json({ code: 401, message: 'Authorization header missing or invalid' }, 401);
  }

  const token = authHeader.split(' ')[1];
  console.log('🔑 Token length:', token.length);
  console.log('🔑 Token completo:', token); // ✅ Log del token completo para debugging
  
  // ✅ Usar cliente ANON para validar tokens de usuario
  const supabaseAnon = getSupabaseAnonClient();
  const supabase = getSupabaseClient(); // Para queries a la BD
  
  console.log('🔍 Intentando validar token con cliente ANON...');
  console.log('🔑 Token preview:', token.substring(0, 100) + '...');
  console.log('🔗 Supabase URL:', Deno.env.get('SUPABASE_URL'));
  console.log('🔑 ANON Key preview:', Deno.env.get('SUPABASE_ANON_KEY')?.substring(0, 50) + '...');
  console.log('🔑 ANON Key completo:', Deno.env.get('SUPABASE_ANON_KEY')); // ✅ Log de la key completa
  
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  
  if (error) {
    console.error('❌ Error de autenticación JWT:', {
      message: error.message,
      status: error.status,
      name: error.name,
      stack: error.stack
    });
    return c.json({ code: 401, message: 'Invalid JWT', details: error.message }, 401);
  }
  
  if (!user) {
    console.error('❌ No user returned from getUser');
    return c.json({ code: 401, message: 'Invalid JWT - no user' }, 401);
  }

  console.log('✅ Token JWT válido para usuario:', user.email);

  // ✅ Verificar roles en base de datos
  console.log('🔍 Verificando permisos de System Admin en BD para:', user.email);
  
  // Buscar usuario en la tabla users
  const { data: userRecord, error: userError } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('auth_user_id', user.id)
    .single();

  if (userError || !userRecord) {
    console.error('❌ Usuario no encontrado en tabla users:', userError);
    return c.json({ 
      error: 'Usuario no encontrado en el sistema. Por favor contacta al administrador.',
      hint: 'El usuario existe en Auth pero no en la tabla users. Usa el botón "Inicializar Super Admin en BD" en la pantalla de login.'
    }, 403);
  }

  console.log('✅ Usuario encontrado en BD:', userRecord.id);

  // Buscar roles del usuario
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select(`
      role_id,
      roles (
        role_key,
        role_name,
        role_scope
      )
    `)
    .eq('user_id', userRecord.id);

  if (rolesError || !userRoles || userRoles.length === 0) {
    console.error('❌ Usuario sin roles:', rolesError);
    return c.json({ 
      error: 'Acceso denegado. No tienes roles asignados.',
      required_role: 'SUPER_ADMIN'
    }, 403);
  }

  console.log('✅ Roles encontrados:', userRoles.map((ur: any) => ur.roles?.role_name));

  // Verificar si tiene rol de Super Admin (role_key = 'SUPER_ADMIN' y role_scope = 'SYSTEM')
  const hasSuperAdminRole = userRoles.some((ur: any) => 
    ur.roles?.role_key === 'SUPER_ADMIN' && ur.roles?.role_scope === 'SYSTEM'
  );

  if (!hasSuperAdminRole) {
    console.error('❌ Usuario no es Super Admin:', user.email);
    return c.json({ 
      error: 'Acceso denegado. Solo usuarios Super Admin pueden administrar tablas de sistema.',
      required_role: 'SUPER_ADMIN',
      user_roles: userRoles.map((ur: any) => `${ur.roles?.role_key} (${ur.roles?.role_scope})`)
    }, 403);
  }

  console.log('✅ Usuario es Super Admin');

  // Verificar que NO tenga scopes (Super Admin sin scopes = acceso total)
  const { data: userScopes, error: scopesError } = await supabase
    .from('user_role_scopes')
    .select('id')
    .in('user_role_id', userRoles.map((ur: any) => ur.role_id));

  if (scopesError) {
    console.error('❌ Error verificando scopes:', scopesError);
    return c.json({ error: 'Error verificando permisos' }, 500);
  }

  if (userScopes && userScopes.length > 0) {
    console.error('❌ Super Admin con scopes no puede administrar sistema:', user.email);
    return c.json({ 
      error: 'Acceso denegado. Super Admin con scopes limitados no puede administrar tablas de sistema.',
      hint: 'Solo Super Admin sin scopes (acceso total) puede administrar información del sistema.'
    }, 403);
  }

  console.log('✅ Usuario verificado como Super Admin sin scopes:', user.email);
  console.log('🎉 === FIN requireSystemAdmin - SUCCESS ===');

  // Almacenar el usuario en el contexto
  c.set('user', user);
  c.set('userRecord', userRecord);
  await next();
};

// ============================================================================
// ENDPOINTS DE PERMISOS
// ============================================================================

/**
 * POST /make-server-e19f2094/onboarding/create-system-admin
 * Crea el usuario Super Admin del sistema (solo se ejecuta una vez durante onboarding)
 * Endpoint público (no requiere autenticación de usuario, solo el header de autorización)
 */
app.post("/make-server-e19f2094/onboarding/create-system-admin", requireAuthHeader, async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, full_name } = body;

    if (!email || !password || !full_name) {
      return c.json({ error: 'email, password y full_name son requeridos' }, 400);
    }

    const supabase = getSupabaseClient();

    console.log('🚀 === INICIO CREACIÓN DE SUPER ADMIN ===');
    console.log('📧 Email:', email);

    // 1. Crear o buscar el "tenant del sistema" (UUID fijo para el sistema)
    const SYSTEM_TENANT_ID = '00000000-0000-0000-0000-000000000000';
    console.log('🏢 Verificando tenant del sistema:', SYSTEM_TENANT_ID);
    
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', SYSTEM_TENANT_ID)
      .single();

    if (!existingTenant) {
      console.log('📝 Creando tenant del sistema...');
      const { error: tenantError } = await supabase
        .from('tenants')
        .insert({
          id: SYSTEM_TENANT_ID,
          tenant_key: 'SYSTEM',
          tenant_name: 'Sistema Turnos Titanium',
          is_active: true
        });

      if (tenantError) {
        console.error('❌ Error creando tenant del sistema:', tenantError);
        return c.json({ error: 'Error creando tenant del sistema', details: tenantError.message }, 500);
      }
      console.log('✅ Tenant del sistema creado');
    } else {
      console.log('✅ Tenant del sistema ya existe');
    }

    // 2. Verificar si el usuario ya existe en Auth
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users?.find(u => u.email === email);

    let authUserId: string;

    if (existingAuthUser) {
      console.log('✅ Usuario ya existe en Auth:', existingAuthUser.id);
      authUserId = existingAuthUser.id;
    } else {
      // Crear usuario en Supabase Auth
      console.log('📝 Creando usuario en Supabase Auth...');
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirmar email
        user_metadata: { full_name }
      });

      if (authError) {
        console.error('❌ Error creando usuario en Auth:', authError);
        return c.json({ error: 'Error creando usuario en Auth', details: authError.message }, 500);
      }

      authUserId = authData.user.id;
      console.log('✅ Usuario creado en Auth:', authUserId);
    }

    // 3. Verificar si el usuario ya existe en la tabla users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    let userId: string;

    if (existingUser) {
      console.log('✅ Usuario ya existe en tabla users:', existingUser.id);
      userId = existingUser.id;
    } else {
      // Crear usuario en tabla users (sin tenant_id = usuario del sistema)
      console.log('📝 Creando usuario en tabla users...');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authUserId,
          email,
          full_name,
          tenant_id: SYSTEM_TENANT_ID, // NULL = usuario del sistema, no pertenece a ningún tenant
          is_active: true
        })
        .select('id')
        .single();

      if (userError) {
        console.error('❌ Error creando usuario en tabla users:', userError);
        return c.json({ error: 'Error creando usuario en tabla users', details: userError.message }, 500);
      }

      userId = userData.id;
      console.log('✅ Usuario creado en tabla users:', userId);
    }

    // 4. Buscar el rol "Super Admin" del sistema (debe existir previamente en la BD)
    console.log('🔍 Buscando rol Super Admin del sistema...');
    let { data: superAdminRole, error: roleSearchError } = await supabase
      .from('roles')
      .select('id, role_key, role_name, role_scope')
      .eq('role_key', 'SUPER_ADMIN')
      .eq('role_scope', 'SYSTEM')
      .maybeSingle();

    if (roleSearchError) {
      console.error('❌ Error buscando rol Super Admin:', roleSearchError);
      return c.json({ error: 'Error buscando rol Super Admin', details: roleSearchError.message }, 500);
    }

    if (!superAdminRole) {
      console.error('❌ Rol Super Admin no encontrado en la base de datos');
      return c.json({ 
        error: 'Rol Super Admin no encontrado',
        hint: 'El rol SUPER_ADMIN con role_scope=SYSTEM debe existir previamente en la tabla roles. Por favor créalo manualmente en Supabase.'
      }, 500);
    }

    const roleId = superAdminRole.id;
    console.log('✅ Rol Super Admin encontrado:', roleId, '-', superAdminRole.role_name);

    // 5. Verificar si ya tiene el rol asignado
    const { data: existingUserRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .single();

    if (existingUserRole) {
      console.log('✅ Usuario ya tiene el rol Super Admin asignado');
    } else {
      // Asignar el rol Super Admin al usuario
      console.log('📝 Asignando rol Super Admin al usuario...');
      const { error: userRoleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId
        });

      if (userRoleError) {
        console.error('❌ Error asignando rol Super Admin:', userRoleError);
        return c.json({ error: 'Error asignando rol Super Admin', details: userRoleError.message }, 500);
      }

      console.log('✅ Rol Super Admin asignado al usuario');
    }

    // 6. Verificar que NO tenga scopes (Super Admin sin scopes = acceso total)
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId);

    const userRoleIds = userRoles?.map(ur => ur.id) || [];

    const { data: existingScopes } = await supabase
      .from('user_role_scopes')
      .select('id')
      .in('user_role_id', userRoleIds);

    if (existingScopes && existingScopes.length > 0) {
      console.log('⚠️ Eliminando scopes existentes para garantizar acceso total...');
      await supabase
        .from('user_role_scopes')
        .delete()
        .in('user_role_id', userRoleIds);
    }

    console.log('🎉 === FIN CREACIÓN DE SUPER ADMIN - SUCCESS ===');

    return c.json({ 
      success: true,
      message: 'Super Admin creado y configurado exitosamente',
      user_id: userId,
      auth_user_id: authUserId,
      role_id: roleId
    });
  } catch (error) {
    console.error('❌ Error en endpoint /onboarding/create-system-admin:', error);
    return c.json({ error: 'Error interno del servidor', details: error.message }, 500);
  }
});

/**
 * GET /make-server-e19f2094/permissions/screens
 * Obtiene las pantallas a las que el usuario tiene acceso
 */
app.get("/make-server-e19f2094/permissions/screens", requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc('get_user_screens', {
      p_user_email: user.email
    });

    if (error) {
      console.error('Error obteniendo pantallas del usuario:', error);
      return c.json({ error: 'Error obteniendo pantallas del usuario', details: error.message }, 500);
    }

    return c.json({ screens: data || [] });
  } catch (error) {
    console.error('Error en endpoint /permissions/screens:', error);
    return c.json({ error: 'Error interno del servidor', details: error.message }, 500);
  }
});

// ============================================================================
// ENDPOINTS DE SYSTEM MENU GROUPS
// ============================================================================

/**
 * GET /make-server-e19f2094/system/menu-groups
 * Obtiene todos los grupos de menú con sus traducciones
 */
app.get("/make-server-e19f2094/system/menu-groups", requireSystemAdmin, async (c) => {
  try {
    const languageCode = c.req.query('language') || 'ES'; // Default español
    const supabase = getSupabaseClient();

    console.log('📋 Obteniendo grupos de menú del sistema, idioma:', languageCode);

    // Obtener grupos de menú con sus traducciones (LEFT JOIN para incluir grupos sin traducciones)
    const { data, error } = await supabase
      .from('system_menu_groups')
      .select(`
        id,
        menu_group_key,
        menu_group_name,
        sort_order,
        icon_key,
        is_active,
        created_at,
        updated_at,
        system_menu_group_translations (
          id,
          language_code,
          menu_group_name
        )
      `)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo grupos de menú:', error);
      return c.json({ error: 'Error obteniendo grupos de menú', details: error.message }, 500);
    }

    console.log(`✅ Grupos obtenidos de BD: ${data?.length || 0}`);
    
    // Aplanar la estructura y filtrar por idioma en el código
    const menuGroups = data?.map(group => {
      // Buscar traducción en el idioma solicitado
      const translation = group.system_menu_group_translations?.find(
        (t: any) => t.language_code === languageCode
      );
      
      return {
        id: group.id,
        name: group.menu_group_key,
        display_order: group.sort_order,
        icon_name: group.icon_key,
        is_active: group.is_active,
        created_at: group.created_at,
        updated_at: group.updated_at,
        display_name: translation?.menu_group_name || group.menu_group_name,
        translation_id: translation?.id
      };
    }) || [];

    console.log(`📤 Devolviendo ${menuGroups.length} grupos de menú`);

    return c.json({ menu_groups: menuGroups });
  } catch (error) {
    console.error('❌ Error en endpoint /system/menu-groups:', error);
    return c.json({ error: 'Error interno del servidor', details: error.message }, 500);
  }
});

/**
 * GET /make-server-e19f2094/system/menu-groups/:id
 * Obtiene un grupo de menú específico con todas sus traducciones
 */
app.get("/make-server-e19f2094/system/menu-groups/:id", requireSystemAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('system_menu_groups')
      .select(`
        *,
        system_menu_group_translations (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error obteniendo grupo de menú:', error);
      return c.json({ error: 'Error obteniendo grupo de menú', details: error.message }, 500);
    }

    if (!data) {
      return c.json({ error: 'Grupo de menú no encontrado' }, 404);
    }

    return c.json({ menu_group: data });
  } catch (error) {
    console.error('Error en endpoint /system/menu-groups/:id:', error);
    return c.json({ error: 'Error interno del servidor', details: error.message }, 500);
  }
});

/**
 * POST /make-server-e19f2094/system/menu-groups
 * Crea un nuevo grupo de menú con su traducción en español
 */
app.post("/make-server-e19f2094/system/menu-groups", requireSystemAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const { name, display_name, display_order, icon_name, is_active } = body;

    if (!name || !display_name) {
      return c.json({ error: 'name y display_name son requeridos' }, 400);
    }

    const supabase = getSupabaseClient();

    // 1. Crear el grupo de menú
    const { data: menuGroup, error: groupError } = await supabase
      .from('system_menu_groups')
      .insert({
        menu_group_key: name,
        menu_group_name: display_name,
        sort_order: display_order || 999,
        icon_key: icon_name || 'CircleDot',
        is_active: is_active !== undefined ? is_active : true
      })
      .select()
      .single();

    if (groupError) {
      console.error('Error creando grupo de menú:', groupError);
      return c.json({ error: 'Error creando grupo de menú', details: groupError.message }, 500);
    }

    // 2. Crear la traducción en español
    const { error: translationError } = await supabase
      .from('system_menu_group_translations')
      .insert({
        menu_group_id: menuGroup.id,
        language_code: 'ES',
        menu_group_name: display_name
      });

    if (translationError) {
      console.error('Error creando traducción:', translationError);
      // Intentar eliminar el grupo creado
      await supabase.from('system_menu_groups').delete().eq('id', menuGroup.id);
      return c.json({ error: 'Error creando traducción', details: translationError.message }, 500);
    }

    return c.json({ 
      message: 'Grupo de menú creado exitosamente',
      menu_group: menuGroup 
    });
  } catch (error) {
    console.error('Error en endpoint POST /system/menu-groups:', error);
    return c.json({ error: 'Error interno del servidor', details: error.message }, 500);
  }
});

/**
 * PUT /make-server-e19f2094/system/menu-groups/:id
 * Actualiza un grupo de menú y su traducción
 */
app.put("/make-server-e19f2094/system/menu-groups/:id", requireSystemAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, display_name, display_order, icon_name, is_active, translation_id } = body;

    const supabase = getSupabaseClient();

    // 1. Actualizar el grupo de menú
    const { error: groupError } = await supabase
      .from('system_menu_groups')
      .update({
        menu_group_key: name,
        menu_group_name: display_name,
        sort_order: display_order,
        icon_key: icon_name,
        is_active: is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (groupError) {
      console.error('Error actualizando grupo de menú:', groupError);
      return c.json({ error: 'Error actualizando grupo de menú', details: groupError.message }, 500);
    }

    // 2. Actualizar la traducción si existe translation_id
    if (translation_id) {
      const { error: translationError } = await supabase
        .from('system_menu_group_translations')
        .update({
          menu_group_name: display_name
        })
        .eq('id', translation_id);

      if (translationError) {
        console.error('Error actualizando traducción:', translationError);
      }
    }

    return c.json({ message: 'Grupo de menú actualizado exitosamente' });
  } catch (error) {
    console.error('Error en endpoint PUT /system/menu-groups/:id:', error);
    return c.json({ error: 'Error interno del servidor', details: error.message }, 500);
  }
});

/**
 * DELETE /make-server-e19f2094/system/menu-groups/:id
 * Elimina un grupo de menú y sus traducciones (si no tiene pantallas asociadas)
 */
app.delete("/make-server-e19f2094/system/menu-groups/:id", requireSystemAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getSupabaseClient();

    // Verificar si hay pantallas asociadas
    const { data: screens, error: screensError } = await supabase
      .from('screens')
      .select('id')
      .eq('menu_group_id', id)
      .limit(1);

    if (screensError) {
      console.error('Error verificando pantallas asociadas:', screensError);
      return c.json({ error: 'Error verificando pantallas asociadas', details: screensError.message }, 500);
    }

    if (screens && screens.length > 0) {
      return c.json({ 
        error: 'No se puede eliminar el grupo porque tiene pantallas asociadas',
        hint: 'Reasigna las pantallas a otro grupo antes de eliminar'
      }, 400);
    }

    // Eliminar traducciones
    const { error: translationsError } = await supabase
      .from('system_menu_group_translations')
      .delete()
      .eq('menu_group_id', id);

    if (translationsError) {
      console.error('Error eliminando traducciones:', translationsError);
    }

    // Eliminar grupo
    const { error: groupError } = await supabase
      .from('system_menu_groups')
      .delete()
      .eq('id', id);

    if (groupError) {
      console.error('Error eliminando grupo de menú:', groupError);
      return c.json({ error: 'Error eliminando grupo de menú', details: groupError.message }, 500);
    }

    return c.json({ message: 'Grupo de menú eliminado exitosamente' });
  } catch (error) {
    console.error('Error en endpoint DELETE /system/menu-groups/:id:', error);
    return c.json({ error: 'Error interno del servidor', details: error.message }, 500);
  }
});

// ============================================================================
// START SERVER
// ============================================================================

// ============================================================================
// ENDPOINTS DEL WIZARD DE SETUP - Bootstrap inicial
// ============================================================================

/**
 * GET /make-server-e19f2094/bootstrap/wizard-state
 * Obtiene el estado actual del wizard
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.get("/make-server-e19f2094/bootstrap/wizard-state", bootstrap.getWizardState);

/**
 * GET /make-server-e19f2094/bootstrap/token
 * Obtiene el token de bootstrap
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.get("/make-server-e19f2094/bootstrap/token", bootstrap.getBootstrapToken);

/**
 * GET /make-server-e19f2094/bootstrap/token-direct
 * Alias de /bootstrap/token para compatibilidad
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.get("/make-server-e19f2094/bootstrap/token-direct", bootstrap.getBootstrapToken);

/**
 * GET /make-server-e19f2094/bootstrap/languages
 * Obtiene los idiomas disponibles del sistema
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.get("/make-server-e19f2094/bootstrap/languages", bootstrap.getSystemLanguages);

/**
 * POST /make-server-e19f2094/bootstrap/step1-tenant
 * Guarda la configuración del tenant (paso 1 del wizard)
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.post("/make-server-e19f2094/bootstrap/step1-tenant", bootstrap.validateBootstrapMode, bootstrap.bootstrapStep1Tenant);

/**
 * POST /make-server-e19f2094/bootstrap/step2-company
 * Guarda la configuración de la empresa (paso 2 del wizard)
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.post("/make-server-e19f2094/bootstrap/step2-company", bootstrap.validateBootstrapMode, bootstrap.bootstrapStep2Company);

/**
 * GET /make-server-e19f2094/bootstrap/tenant-info
 * Obtiene información básica del tenant y company para plantillas
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.get("/make-server-e19f2094/bootstrap/tenant-info", bootstrap.getTenantInfo);

/**
 * POST /make-server-e19f2094/bootstrap/step3-structure/work-locations
 * Paso 3: Carga de Ubicaciones de Trabajo
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.post("/make-server-e19f2094/bootstrap/step3-structure/work-locations", bootstrap.validateBootstrapMode, bootstrap.bootstrapStep3WorkLocations);

/**
 * POST /make-server-e19f2094/bootstrap/step3-structure/departments
 * Paso 3: Carga de Departamentos
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.post("/make-server-e19f2094/bootstrap/step3-structure/departments", bootstrap.validateBootstrapMode, bootstrap.bootstrapStep3Departments);

/**
 * POST /make-server-e19f2094/bootstrap/step3-structure/payroll-groups
 * Paso 3: Carga de Roles de Pago
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.post("/make-server-e19f2094/bootstrap/step3-structure/payroll-groups", bootstrap.validateBootstrapMode, bootstrap.bootstrapStep3PayrollGroups);

/**
 * POST /make-server-e19f2094/bootstrap/step3-structure/areas
 * Paso 3: Carga de Áreas
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.post("/make-server-e19f2094/bootstrap/step3-structure/areas", bootstrap.validateBootstrapMode, bootstrap.bootstrapStep3Areas);

/**
 * POST /make-server-e19f2094/bootstrap/step3-structure/cost-centers
 * Paso 3: Carga de Centros de Costo
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.post("/make-server-e19f2094/bootstrap/step3-structure/cost-centers", bootstrap.validateBootstrapMode, bootstrap.bootstrapStep3CostCenters);

/**
 * POST /make-server-e19f2094/bootstrap/step3-structure/job-titles
 * Paso 3: Carga de Cargos
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.post("/make-server-e19f2094/bootstrap/step3-structure/job-titles", bootstrap.validateBootstrapMode, bootstrap.bootstrapStep3JobTitles);

/**
 * POST /make-server-e19f2094/bootstrap/step3-structure/work-groups
 * Paso 3: Carga de Grupos
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.post("/make-server-e19f2094/bootstrap/step3-structure/work-groups", bootstrap.validateBootstrapMode, bootstrap.bootstrapStep3WorkGroups);

/**
 * POST /make-server-e19f2094/bootstrap/step3-structure/employee-profiles
 * Paso 3: Carga de Perfiles de Empleado
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.post("/make-server-e19f2094/bootstrap/step3-structure/employee-profiles", bootstrap.validateBootstrapMode, bootstrap.bootstrapStep3EmployeeProfiles);

/**
 * GET /make-server-e19f2094/bootstrap/catalogs
 * Obtiene todos los catálogos organizacionales (para paso 4 - empleados)
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.get("/make-server-e19f2094/bootstrap/catalogs", bootstrapCatalogs.getBootstrapCatalogs);

/**
 * POST /make-server-e19f2094/bootstrap/employees
 * Paso 4: Carga masiva de empleados
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.post("/make-server-e19f2094/bootstrap/employees", bootstrap.validateBootstrapMode, bootstrapEmployees.createBootstrapEmployees);

/**
 * GET /make-server-e19f2094/bootstrap/employees-export
 * Paso 4: Exporta empleados existentes con todos sus datos
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.get("/make-server-e19f2094/bootstrap/employees-export", bootstrapEmployeesExport.exportBootstrapEmployees);

/**
 * POST /make-server-e19f2094/bootstrap/update-step
 * Actualiza el progreso del wizard en tenant_onboarding
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.post("/make-server-e19f2094/bootstrap/update-step", bootstrap.validateBootstrapMode, bootstrap.updateBootstrapStep);

/**
 * POST /make-server-e19f2094/bootstrap/complete
 * Paso 5: Crear usuario administrador y completar el wizard
 * PÚBLICO - No requiere autenticación (wizard inicial)
 */
app.post("/make-server-e19f2094/bootstrap/complete", bootstrap.validateBootstrapMode, bootstrapComplete);

// ============================================================================
// ENDPOINTS DE KIOSK v1.0 - Portal de Autoservicio para Empleados
// ============================================================================

// FASE 2A: CORE (4 endpoints)
app.get("/make-server-e19f2094/kiosk/config", kiosk.requireAuth, kiosk.requireEmployee, kiosk.getConfig);
app.post("/make-server-e19f2094/kiosk/identify", kiosk.identify);
app.post("/make-server-e19f2094/kiosk/punch", kiosk.requireAuth, kiosk.requireEmployee, kiosk.punch);
app.get("/make-server-e19f2094/kiosk/my-punches", kiosk.requireAuth, kiosk.requireEmployee, kiosk.getMyPunches);

// FASE 2B: CONSULTAS (6 endpoints)
app.get("/make-server-e19f2094/kiosk/my-shifts", kiosk.requireAuth, kiosk.requireEmployee, kiosk.getMyShifts);
app.get("/make-server-e19f2094/kiosk/my-anomalies", kiosk.requireAuth, kiosk.requireEmployee, kiosk.getMyAnomalies);
app.get("/make-server-e19f2094/kiosk/my-permissions", kiosk.requireAuth, kiosk.requireEmployee, kiosk.getMyPermissions);
app.get("/make-server-e19f2094/kiosk/my-regularizations", kiosk.requireAuth, kiosk.requireEmployee, kiosk.getMyRegularizations);
app.get("/make-server-e19f2094/kiosk/my-justifications", kiosk.requireAuth, kiosk.requireEmployee, kiosk.getMyJustifications);
app.get("/make-server-e19f2094/kiosk/my-shift-changes", kiosk.requireAuth, kiosk.requireEmployee, kiosk.getMyShiftChanges);

// FASE 2C: SOLICITUDES (4 endpoints)
app.post("/make-server-e19f2094/kiosk/request-regularization", kiosk.requireAuth, kiosk.requireEmployee, kiosk.requestRegularization);
app.post("/make-server-e19f2094/kiosk/request-permission", kiosk.requireAuth, kiosk.requireEmployee, kiosk.requestPermission);
app.post("/make-server-e19f2094/kiosk/request-justification", kiosk.requireAuth, kiosk.requireEmployee, kiosk.requestJustification);
app.post("/make-server-e19f2094/kiosk/request-shift-change", kiosk.requireAuth, kiosk.requireEmployee, kiosk.requestShiftChange);

// FASE 2D: CONTINGENCIA (2 endpoints - SOLO SYSTEM_ADMIN)
app.post("/make-server-e19f2094/kiosk/contingency/activate", kiosk.requireAuth, kiosk.requireSystemAdmin, kiosk.activateContingency);
app.post("/make-server-e19f2094/kiosk/contingency/deactivate", kiosk.requireAuth, kiosk.requireSystemAdmin, kiosk.deactivateContingency);

Deno.serve(app.fetch);