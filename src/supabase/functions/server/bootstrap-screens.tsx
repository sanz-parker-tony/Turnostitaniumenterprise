// ============================================================================
// bootstrap-screens.tsx
// Turnos Titanium Enterprise - Bootstrap de Pantallas
// ============================================================================
// Descripción:
//   Auto-crea pantallas del sistema que deben existir (ej: Parámetros)
//   Idempotente: puede ejecutarse N veces sin duplicar datos
// ============================================================================
// Columnas reales de public.screens:
//   id, screen_key, screen_name, menu_label, menu_group_id, module_id,
//   route_path, icon_key, sort_order, is_active,
//   created_by, created_at, updated_by, updated_at
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { Context } from 'npm:hono@4';

// ============================================================================
// POST /make-server-e19f2094/bootstrap/ensure-system-settings-screen
// ============================================================================

export async function ensureSystemSettingsScreen(c: Context) {
  try {
    console.log('🔧 [BOOTSTRAP] Iniciando ensure-system-settings-screen...');

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ========================================================================
    // PASO 1: Obtener menu_group MAINT
    // ========================================================================

    const { data: menuGroup, error: menuGroupError } = await supabase
      .from('system_menu_groups')
      .select('id')
      .eq('menu_group_key', 'MAINT')
      .single();

    if (menuGroupError || !menuGroup) {
      console.error('❌ [BOOTSTRAP] Menu group MAINT not found:', menuGroupError);
      return c.json(
        {
          success: false,
          error: 'Menu group MAINT not found',
          details: menuGroupError?.message,
        },
        500
      );
    }

    const menuGroupId = menuGroup.id;
    console.log('✅ [BOOTSTRAP] Menu group MAINT found:', menuGroupId);

    // ========================================================================
    // PASO 2: Verificar si existe pantalla SYSTEM_SETTINGS_MANAGEMENT
    // ========================================================================

    const { data: existingScreen, error: existingScreenError } = await supabase
      .from('screens')
      .select('id, screen_key')
      .eq('screen_key', 'SYSTEM_SETTINGS_MANAGEMENT')
      .maybeSingle();

    if (existingScreenError) {
      console.error('❌ [BOOTSTRAP] Error checking screen:', existingScreenError);
      return c.json(
        {
          success: false,
          error: 'Error checking existing screen',
          details: existingScreenError.message,
        },
        500
      );
    }

    if (existingScreen) {
      console.log('⚠️ [BOOTSTRAP] Screen SYSTEM_SETTINGS_MANAGEMENT already exists');
      return c.json({
        success: true,
        message: 'Screen SYSTEM_SETTINGS_MANAGEMENT already exists',
        screen_id: existingScreen.id,
        created: false,
      });
    }

    // ========================================================================
    // PASO 3: Crear pantalla SYSTEM_SETTINGS_MANAGEMENT
    // Columnas correctas: screen_key, screen_name, menu_label,
    //   menu_group_id, route_path, icon_key, sort_order, is_active, created_by
    // ========================================================================

    const { data: newScreen, error: newScreenError } = await supabase
      .from('screens')
      .insert({
        screen_key: 'SYSTEM_SETTINGS_MANAGEMENT',
        screen_name: 'Parámetros del Sistema',
        menu_label: 'Parámetros',
        menu_group_id: menuGroupId,
        route_path: '/dashboard/maintenance/parameters',
        icon_key: 'Settings',
        sort_order: 15,
        is_active: true,
        created_by: 'SYSTEM',
      })
      .select('id')
      .single();

    if (newScreenError || !newScreen) {
      console.error('❌ [BOOTSTRAP] Error creating screen:', newScreenError);
      return c.json(
        {
          success: false,
          error: 'Error creating screen',
          details: newScreenError?.message,
        },
        500
      );
    }

    const screenId = newScreen.id;
    console.log('✅ [BOOTSTRAP] Screen SYSTEM_SETTINGS_MANAGEMENT created:', screenId);

    // ========================================================================
    // PASO 4: Actualizar orden de otras pantallas (usando sort_order correcto)
    // ========================================================================

    await supabase
      .from('screens')
      .update({ sort_order: 20 })
      .eq('screen_key', 'MAINT_CATALOGS');

    await supabase
      .from('screens')
      .update({ sort_order: 30 })
      .eq('screen_key', 'ATTENDANCE_EVENTS_MANAGEMENT');

    console.log('✅ [BOOTSTRAP] Screen order updated');

    // ========================================================================
    // PASO 5: Asignar permisos a roles base
    // ========================================================================

    const permissionsToCreate = [
      {
        role_key: 'SYSTEM_ADMIN',
        can_view: true, can_create: true, can_edit: true,
        can_delete: false, can_export: true, can_approve: false,
      },
      {
        role_key: 'TENANT_ADMIN',
        can_view: true, can_create: true, can_edit: true,
        can_delete: false, can_export: true, can_approve: false,
      },
      {
        role_key: 'RRHH_ADMIN',
        can_view: true, can_create: false, can_edit: false,
        can_delete: false, can_export: true, can_approve: false,
      },
    ];

    let permissionsCreated = 0;

    for (const permConfig of permissionsToCreate) {
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('role_key', permConfig.role_key)
        .single();

      if (roleError || !role) {
        console.warn(`⚠️ [BOOTSTRAP] Role ${permConfig.role_key} not found`);
        continue;
      }

      const { data: existingPerm, error: existingPermError } = await supabase
        .from('role_screen_permissions')
        .select('id')
        .eq('role_id', role.id)
        .eq('screen_id', screenId)
        .maybeSingle();

      if (existingPermError) {
        console.warn(`⚠️ [BOOTSTRAP] Error checking permission for ${permConfig.role_key}:`, existingPermError);
        continue;
      }

      if (existingPerm) {
        console.log(`⚠️ [BOOTSTRAP] Permission already exists for ${permConfig.role_key}`);
        continue;
      }

      const { error: permError } = await supabase
        .from('role_screen_permissions')
        .insert({
          role_id: role.id,
          screen_id: screenId,
          can_view: permConfig.can_view,
          can_create: permConfig.can_create,
          can_edit: permConfig.can_edit,
          can_delete: permConfig.can_delete,
          can_export: permConfig.can_export,
          can_approve: permConfig.can_approve,
          created_by: 'SYSTEM',
        });

      if (permError) {
        console.warn(`⚠️ [BOOTSTRAP] Error creating permission for ${permConfig.role_key}:`, permError);
        continue;
      }

      console.log(`✅ [BOOTSTRAP] Permission created for ${permConfig.role_key}`);
      permissionsCreated++;
    }

    console.log('✅ [BOOTSTRAP] System Settings Screen bootstrap completed');
    return c.json({
      success: true,
      message: 'System Settings Screen created successfully',
      screen_id: screenId,
      permissions_created: permissionsCreated,
      created: true,
    });

  } catch (error) {
    console.error('❌ [BOOTSTRAP] Unexpected error:', error);
    return c.json(
      {
        success: false,
        error: 'Unexpected error during bootstrap',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

// ============================================================================
// POST /make-server-e19f2094/bootstrap/ensure-maintenance-screens
// Crea pantallas de Roles, Alcances y Usuarios en el menú MAINT
// ============================================================================

export async function ensureMaintenanceManagementScreens(c: Context) {
  try {
    console.log('🔧 [BOOTSTRAP] Iniciando ensure-maintenance-management-screens...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return c.json({ success: false, error: 'Missing required environment variables' }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Obtener menu_group MAINT
    const { data: menuGroup, error: menuGroupError } = await supabase
      .from('system_menu_groups')
      .select('id')
      .eq('menu_group_key', 'MAINT')
      .single();

    if (menuGroupError || !menuGroup) {
      return c.json(
        { success: false, error: 'Menu group MAINT not found', details: menuGroupError?.message },
        500
      );
    }

    const menuGroupId = menuGroup.id;

    // Definición de las pantallas a asegurar
    // Columnas correctas: screen_key, screen_name, menu_label,
    //   menu_group_id, route_path, icon_key, sort_order, is_active, created_by
    const screensToEnsure = [
      {
        screen_key: 'ROLES_MANAGEMENT',
        screen_name: 'Roles',
        menu_label: 'Roles',
        route_path: '/dashboard/maintenance/roles',
        icon_key: 'Shield',
        sort_order: 35,
      },
      {
        screen_key: 'SCOPE_TYPES_MANAGEMENT',
        screen_name: 'Alcances',
        menu_label: 'Alcances',
        route_path: '/dashboard/maintenance/scopes',
        icon_key: 'Layers',
        sort_order: 40,
      },
      {
        screen_key: 'USERS_MANAGEMENT',
        screen_name: 'Usuarios',
        menu_label: 'Usuarios',
        route_path: '/dashboard/maintenance/users',
        icon_key: 'Users',
        sort_order: 45,
      },
    ];

    const results: any[] = [];

    for (const screenDef of screensToEnsure) {
      // Verificar si ya existe
      const { data: existingScreen } = await supabase
        .from('screens')
        .select('id, screen_key')
        .eq('screen_key', screenDef.screen_key)
        .maybeSingle();

      if (existingScreen) {
        console.log(`⚠️ [BOOTSTRAP] Screen ${screenDef.screen_key} already exists`);
        results.push({ screen_key: screenDef.screen_key, created: false, screen_id: existingScreen.id });
        continue;
      }

      // Crear pantalla
      const { data: newScreen, error: newScreenError } = await supabase
        .from('screens')
        .insert({
          screen_key: screenDef.screen_key,
          screen_name: screenDef.screen_name,
          menu_label: screenDef.menu_label,
          menu_group_id: menuGroupId,
          route_path: screenDef.route_path,
          icon_key: screenDef.icon_key,
          sort_order: screenDef.sort_order,
          is_active: true,
          created_by: 'SYSTEM',
        })
        .select('id')
        .single();

      if (newScreenError || !newScreen) {
        console.error(`❌ [BOOTSTRAP] Error creating screen ${screenDef.screen_key}:`, newScreenError);
        results.push({ screen_key: screenDef.screen_key, created: false, error: newScreenError?.message });
        continue;
      }

      const screenId = newScreen.id;
      console.log(`✅ [BOOTSTRAP] Screen ${screenDef.screen_key} created: ${screenId}`);

      // Asignar permisos a roles base
      const permissionsConfig = [
        { role_key: 'SYSTEM_ADMIN',  can_view: true, can_create: true,  can_edit: true,  can_delete: false, can_export: true, can_approve: false },
        { role_key: 'TENANT_ADMIN',  can_view: true, can_create: true,  can_edit: true,  can_delete: false, can_export: true, can_approve: false },
        { role_key: 'RRHH_ADMIN',    can_view: true, can_create: false, can_edit: false, can_delete: false, can_export: true, can_approve: false },
      ];

      let permissionsCreated = 0;
      for (const permConfig of permissionsConfig) {
        const { data: role } = await supabase
          .from('roles')
          .select('id')
          .eq('role_key', permConfig.role_key)
          .single();

        if (!role) continue;

        const { data: existingPerm } = await supabase
          .from('role_screen_permissions')
          .select('id')
          .eq('role_id', role.id)
          .eq('screen_id', screenId)
          .maybeSingle();

        if (existingPerm) continue;

        const { error: permError } = await supabase
          .from('role_screen_permissions')
          .insert({
            role_id: role.id,
            screen_id: screenId,
            can_view: permConfig.can_view,
            can_create: permConfig.can_create,
            can_edit: permConfig.can_edit,
            can_delete: permConfig.can_delete,
            can_export: permConfig.can_export,
            can_approve: permConfig.can_approve,
            created_by: 'SYSTEM',
          });

        if (!permError) permissionsCreated++;
      }

      results.push({
        screen_key: screenDef.screen_key,
        created: true,
        screen_id: screenId,
        permissions_created: permissionsCreated,
      });
    }

    const anyCreated = results.some(r => r.created);

    return c.json({
      success: true,
      message: 'Maintenance management screens bootstrap completed',
      results,
      any_created: anyCreated,
    });

  } catch (error) {
    console.error('❌ [BOOTSTRAP] Unexpected error in ensureMaintenanceManagementScreens:', error);
    return c.json(
      {
        success: false,
        error: 'Unexpected error during bootstrap',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

// ============================================================================
// POST /make-server-e19f2094/bootstrap/ensure-security-screens
// Crea las pantallas de Seguridad: Menús, Pantallas, Acciones, etc.
// ============================================================================

export async function ensureSecurityManagementScreens(c: Context) {
  try {
    console.log('🔧 [BOOTSTRAP] Iniciando ensure-security-management-screens...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return c.json({ success: false, error: 'Missing required environment variables' }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Obtener menu_group SECURITY
    const { data: menuGroup, error: menuGroupError } = await supabase
      .from('system_menu_groups')
      .select('id')
      .eq('menu_group_key', 'SECURITY')
      .single();

    if (menuGroupError || !menuGroup) {
      return c.json({ success: false, error: 'Menu group SECURITY not found', details: menuGroupError?.message }, 500);
    }

    const menuGroupId = menuGroup.id;

    const screensToEnsure = [
      { screen_key: 'SEC_MENU_GROUPS',         screen_name: 'Grupos de Menú',          menu_label: 'Grupos de Menú',     route_path: '/dashboard/security/menu-groups',         icon_key: 'LayoutList',   sort_order: 10 },
      { screen_key: 'SEC_SCREENS',             screen_name: 'Pantallas',               menu_label: 'Pantallas',          route_path: '/dashboard/security/screens',             icon_key: 'Monitor',      sort_order: 20 },
      { screen_key: 'SEC_ACTIONS',             screen_name: 'Acciones',                menu_label: 'Acciones',           route_path: '/dashboard/security/actions',             icon_key: 'Zap',          sort_order: 30 },
      { screen_key: 'SEC_SCREEN_ACTIONS',      screen_name: 'Acciones de Pantalla',    menu_label: 'Acc. de Pantalla',   route_path: '/dashboard/security/screen-actions',      icon_key: 'Link2',        sort_order: 40 },
      { screen_key: 'SEC_ROLE_SCREEN_ACTIONS', screen_name: 'Permisos por Rol',        menu_label: 'Permisos por Rol',   route_path: '/dashboard/security/role-screen-actions', icon_key: 'ShieldCheck',  sort_order: 50 },
    ];

    const results: any[] = [];

    for (const screenDef of screensToEnsure) {
      const { data: existingScreen } = await supabase
        .from('screens')
        .select('id, screen_key')
        .eq('screen_key', screenDef.screen_key)
        .maybeSingle();

      if (existingScreen) {
        console.log(`⚠️ [BOOTSTRAP] Screen ${screenDef.screen_key} already exists`);
        results.push({ screen_key: screenDef.screen_key, created: false, screen_id: existingScreen.id });
        continue;
      }

      const { data: newScreen, error: newScreenError } = await supabase
        .from('screens')
        .insert({
          screen_key: screenDef.screen_key,
          screen_name: screenDef.screen_name,
          menu_label: screenDef.menu_label,
          menu_group_id: menuGroupId,
          route_path: screenDef.route_path,
          icon_key: screenDef.icon_key,
          sort_order: screenDef.sort_order,
          is_active: true,
          created_by: 'SYSTEM',
        })
        .select('id')
        .single();

      if (newScreenError || !newScreen) {
        console.error(`❌ [BOOTSTRAP] Error creating screen ${screenDef.screen_key}:`, newScreenError);
        results.push({ screen_key: screenDef.screen_key, created: false, error: newScreenError?.message });
        continue;
      }

      const screenId = newScreen.id;
      console.log(`✅ [BOOTSTRAP] Screen ${screenDef.screen_key} created: ${screenId}`);

      // Permisos: solo SYSTEM_ADMIN tiene acceso completo a las pantallas de seguridad
      const permissionsConfig = [
        { role_key: 'SYSTEM_ADMIN', can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: true, can_approve: false },
        { role_key: 'TENANT_ADMIN', can_view: true, can_create: false, can_edit: false, can_delete: false, can_export: false, can_approve: false },
      ];

      let permissionsCreated = 0;
      for (const permConfig of permissionsConfig) {
        const { data: role } = await supabase
          .from('roles')
          .select('id')
          .eq('role_key', permConfig.role_key)
          .single();

        if (!role) continue;

        const { data: existingPerm } = await supabase
          .from('role_screen_permissions')
          .select('id')
          .eq('role_id', role.id)
          .eq('screen_id', screenId)
          .maybeSingle();

        if (existingPerm) continue;

        const { error: permError } = await supabase
          .from('role_screen_permissions')
          .insert({
            role_id: role.id,
            screen_id: screenId,
            can_view: permConfig.can_view,
            can_create: permConfig.can_create,
            can_edit: permConfig.can_edit,
            can_delete: permConfig.can_delete,
            can_export: permConfig.can_export,
            can_approve: permConfig.can_approve,
            created_by: 'SYSTEM',
          });

        if (!permError) permissionsCreated++;
      }

      results.push({ screen_key: screenDef.screen_key, created: true, screen_id: screenId, permissions_created: permissionsCreated });
    }

    return c.json({
      success: true,
      message: 'Security management screens bootstrap completed',
      results,
      any_created: results.some(r => r.created),
    });

  } catch (error) {
    console.error('❌ [BOOTSTRAP] Unexpected error in ensureSecurityManagementScreens:', error);
    return c.json(
      { success: false, error: 'Unexpected error during bootstrap', details: error instanceof Error ? error.message : String(error) },
      500
    );
  }
}