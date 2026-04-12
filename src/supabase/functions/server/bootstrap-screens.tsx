// ============================================================================
// bootstrap-screens.tsx
// Turnos Titanium Enterprise - Bootstrap de Pantallas
// ============================================================================
// Descripción:
//   Auto-crea pantallas del sistema que deben existir (ej: Parámetros)
//   Idempotente: puede ejecutarse N veces sin duplicar datos
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { Context } from 'npm:hono@4';

// ============================================================================
// POST /make-server-e19f2094/bootstrap/ensure-system-settings-screen
// ============================================================================

export async function ensureSystemSettingsScreen(c: Context) {
  try {
    console.log('🔧 [BOOTSTRAP] Iniciando ensure-system-settings-screen...');

    // Validar variables de entorno
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
    // PASO 1: Obtener menu_group MAINT
    // ========================================================================

    const { data: menuGroup, error: menuGroupError } = await supabase
      .from('menu_groups')
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
    // ========================================================================

    const { data: newScreen, error: newScreenError } = await supabase
      .from('screens')
      .insert({
        screen_key: 'SYSTEM_SETTINGS_MANAGEMENT',
        screen_name: 'Parámetros del Sistema',
        screen_short_name: 'Parámetros',
        menu_group_id: menuGroupId,
        screen_route: '/dashboard/maintenance/parameters',
        screen_icon_key: 'Settings',
        screen_display_order: 15,
        is_active: true,
        lookup_scope: 'SYSTEM',
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
    // PASO 4: Actualizar orden de otras pantallas
    // ========================================================================

    // Catálogos: orden 20
    await supabase
      .from('screens')
      .update({ screen_display_order: 20 })
      .eq('screen_key', 'MAINT_CATALOGS');

    // Novedades: orden 30
    await supabase
      .from('screens')
      .update({ screen_display_order: 30 })
      .eq('screen_key', 'ATTENDANCE_EVENTS_MANAGEMENT');

    console.log('✅ [BOOTSTRAP] Screen order updated');

    // ========================================================================
    // PASO 5: Asignar permisos a roles base
    // ========================================================================

    const permissionsToCreate = [
      // SYSTEM_ADMIN: Full Access
      {
        role_key: 'SYSTEM_ADMIN',
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: false,
        can_export: true,
        can_approve: false,
      },
      // TENANT_ADMIN: Full Access sin Delete
      {
        role_key: 'TENANT_ADMIN',
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: false,
        can_export: true,
        can_approve: false,
      },
      // RRHH_ADMIN: View + Export
      {
        role_key: 'RRHH_ADMIN',
        can_view: true,
        can_create: false,
        can_edit: false,
        can_delete: false,
        can_export: true,
        can_approve: false,
      },
    ];

    let permissionsCreated = 0;

    for (const permConfig of permissionsToCreate) {
      // Obtener role_id
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('role_key', permConfig.role_key)
        .single();

      if (roleError || !role) {
        console.warn(`⚠️ [BOOTSTRAP] Role ${permConfig.role_key} not found`);
        continue;
      }

      // Verificar si ya existe permiso
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

      // Crear permiso
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

    // ========================================================================
    // RESULTADO FINAL
    // ========================================================================

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
