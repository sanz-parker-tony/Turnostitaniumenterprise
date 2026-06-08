/**
 * bootstrap-screens.ts
 * Turnos Titanium Enterprise - Bootstrap de Pantallas
 * 
 * Descripción:
 *   Auto-crea pantallas del sistema que deben existir (ej: Parámetros)
 *   Idempotente: puede ejecutarse N veces sin duplicar datos
 */

import { createDbClient } from '../lib/postgres-client.js';
import { Request, Response } from 'express';

/**
 * POST /bootstrap/ensure-system-settings-screen
 */
export async function ensureSystemSettingsScreen(req: Request, res: Response) {
  try {
    console.log('🔧 [BOOTSTRAP] Iniciando ensure-system-settings-screen...');

    const Postgres = createDbClient(
      process.env.Postgres_URL ?? '',
      process.env.Postgres_SERVICE_ROLE_KEY ?? '',
      {
      auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // PASO 1: Obtener menu_group MAINT
    const { data: menuGroup, error: menuGroupError } = await Postgres
      .from('system_menu_groups')
      .select('id')
      .eq('menu_group_key', 'MAINT')
      .single();

    if (menuGroupError || !menuGroup) {
      console.error('❌ [BOOTSTRAP] Menu group MAINT not found:', menuGroupError);
      return res.status(500).json({
        success: false,
        error: 'Menu group MAINT not found',
        details: menuGroupError?.message,
      });
    }

    const menuGroupId = menuGroup.id;
    console.log('✅ [BOOTSTRAP] Menu group MAINT found:', menuGroupId);

    // PASO 2: Verificar si existe pantalla SYSTEM_SETTINGS_MANAGEMENT
    const { data: existingScreen, error: existingScreenError } = await Postgres
      .from('screens')
      .select('id, screen_key')
      .eq('screen_key', 'SYSTEM_SETTINGS_MANAGEMENT')
      .maybeSingle();

    if (existingScreenError) {
      console.error('❌ [BOOTSTRAP] Error checking screen:', existingScreenError);
      return res.status(500).json({
        success: false,
        error: 'Error checking existing screen',
        details: existingScreenError.message,
      });
    }

    if (existingScreen) {
      console.log('⚠️ [BOOTSTRAP] Screen SYSTEM_SETTINGS_MANAGEMENT already exists');
      return res.status(200).json({
        success: true,
        message: 'Screen SYSTEM_SETTINGS_MANAGEMENT already exists',
        screen_id: existingScreen.id,
        created: false,
      });
    }

    // PASO 3: Crear pantalla SYSTEM_SETTINGS_MANAGEMENT
    const { data: newScreen, error: newScreenError } = await Postgres
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
      return res.status(500).json({
        success: false,
        error: 'Error creating screen',
        details: newScreenError?.message,
      });
    }

    const screenId = newScreen.id;
    console.log('✅ [BOOTSTRAP] Screen SYSTEM_SETTINGS_MANAGEMENT created:', screenId);

    // PASO 4: Actualizar orden de otras pantallas
    await Postgres
      .from('screens')
      .update({ sort_order: 20 })
      .eq('screen_key', 'MAINT_CATALOGS');

    await Postgres
      .from('screens')
      .update({ sort_order: 30 })
      .eq('screen_key', 'ATTENDANCE_EVENTS_MANAGEMENT');

    console.log('✅ [BOOTSTRAP] Screen order updated');

    // PASO 5: Asignar permisos a roles base
    const permissionsToCreate = [
      {
        role_key: 'SYSTEM_ADMIN',
        can_view: true, can_create: true, can_edit: true,
        can_delete: false, can_export: true, can_approve: false,
      },
      {
        role_key: 'TENANT_ADMIN',
        can_view: true, can_create: false, can_edit: false,
        can_delete: false, can_export: true, can_approve: false,
      },
      {
        role_key: 'RRHH_ADMIN',
        can_view: true, can_create: false, can_edit: false,
        can_delete: false, can_export: true, can_approve: false,
      },
    ];

    let permissionsCreated = 0;
    let permissionsUpdated = 0;

    for (const permConfig of permissionsToCreate) {
      const { data: role, error: roleError } = await Postgres
        .from('roles')
        .select('id')
        .eq('role_key', permConfig.role_key)
        .single();

      if (roleError || !role) {
        console.warn(`⚠️ [BOOTSTRAP] Role ${permConfig.role_key} not found`);
        continue;
      }

      const { data: existingPerm, error: existingPermError } = await Postgres
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
        const { error: updatePermError } = await Postgres
          .from('role_screen_permissions')
          .update({
            can_view: permConfig.can_view,
            can_create: permConfig.can_create,
            can_edit: permConfig.can_edit,
            can_delete: permConfig.can_delete,
            can_export: permConfig.can_export,
            can_approve: permConfig.can_approve,
            updated_by: 'SYSTEM',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPerm.id);

        if (updatePermError) {
          console.warn(`[BOOTSTRAP] Error updating permission for ${permConfig.role_key}:`, updatePermError);
          continue;
        }

        console.log(`[BOOTSTRAP] Permission updated for ${permConfig.role_key}`);
        permissionsUpdated++;
        continue;
      }

      const { error: permError } = await Postgres
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
    return res.status(200).json({
      success: true,
      message: 'System Settings Screen created successfully',
      screen_id: screenId,
      permissions_created: permissionsCreated,
      permissions_updated: permissionsUpdated,
      created: true,
    });

  } catch (error: any) {
    console.error('❌ [BOOTSTRAP] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Unexpected error during bootstrap',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * POST /bootstrap/ensure-maintenance-screens
 * Crea pantallas de Roles, Alcances y Usuarios en el menú MAINT
 */
export async function ensureMaintenanceManagementScreens(req: Request, res: Response) {
  try {
    console.log('🔧 [BOOTSTRAP] Iniciando ensure-maintenance-management-screens...');

    const Postgres = createDbClient(
      process.env.Postgres_URL ?? '',
      process.env.Postgres_SERVICE_ROLE_KEY ?? '',
      {
      auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // Obtener menu_group MAINT
    const { data: menuGroup, error: menuGroupError } = await Postgres
      .from('system_menu_groups')
      .select('id')
      .eq('menu_group_key', 'MAINT')
      .single();

    if (menuGroupError || !menuGroup) {
      return res.status(500).json({
        success: false,
        error: 'Menu group MAINT not found',
        details: menuGroupError?.message,
      });
    }

    const menuGroupId = menuGroup.id;

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
      const { data: existingScreen } = await Postgres
        .from('screens')
        .select('id, screen_key')
        .eq('screen_key', screenDef.screen_key)
        .maybeSingle();

      if (existingScreen) {
        console.log(`⚠️ [BOOTSTRAP] Screen ${screenDef.screen_key} already exists`);
        results.push({ screen_key: screenDef.screen_key, created: false, screen_id: existingScreen.id });
        continue;
      }

      const { data: newScreen, error: newScreenError } = await Postgres
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

      const permissionsConfig = [
        { role_key: 'SYSTEM_ADMIN',  can_view: true, can_create: true,  can_edit: true,  can_delete: false, can_export: true, can_approve: false },
        { role_key: 'TENANT_ADMIN',  can_view: true, can_create: true,  can_edit: true,  can_delete: false, can_export: true, can_approve: false },
        { role_key: 'RRHH_ADMIN',    can_view: true, can_create: false, can_edit: false, can_delete: false, can_export: true, can_approve: false },
      ];

      let permissionsCreated = 0;
      for (const permConfig of permissionsConfig) {
        const { data: role } = await Postgres
          .from('roles')
          .select('id')
          .eq('role_key', permConfig.role_key)
          .single();

        if (!role) continue;

        const { data: existingPerm } = await Postgres
          .from('role_screen_permissions')
          .select('id')
          .eq('role_id', role.id)
          .eq('screen_id', screenId)
          .maybeSingle();

        if (existingPerm) continue;

        const { error: permError } = await Postgres
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

    const anyCreated = results.some((r: any) => r.created);

    return res.status(200).json({
      success: true,
      message: 'Maintenance management screens bootstrap completed',
      results,
      any_created: anyCreated,
    });

  } catch (error: any) {
    console.error('❌ [BOOTSTRAP] Unexpected error in ensureMaintenanceManagementScreens:', error);
    return res.status(500).json({
      success: false,
      error: 'Unexpected error during bootstrap',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * POST /bootstrap/ensure-security-screens
 * Crea las pantallas de Seguridad: Menús, Pantallas, Acciones, etc.
 */
export async function ensureSecurityManagementScreens(req: Request, res: Response) {
  try {
    console.log('🔧 [BOOTSTRAP] Iniciando ensure-security-management-screens...');

    const Postgres = createDbClient(
      process.env.Postgres_URL ?? '',
      process.env.Postgres_SERVICE_ROLE_KEY ?? '',
      {
      auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // Obtener menu_group SECURITY
    const { data: menuGroup, error: menuGroupError } = await Postgres
      .from('system_menu_groups')
      .select('id')
      .eq('menu_group_key', 'SECURITY')
      .single();

    if (menuGroupError || !menuGroup) {
      return res.status(500).json({ success: false, error: 'Menu group SECURITY not found', details: menuGroupError?.message });
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
      const { data: existingScreen } = await Postgres
        .from('screens')
        .select('id, screen_key')
        .eq('screen_key', screenDef.screen_key)
        .maybeSingle();

      if (existingScreen) {
        console.log(`⚠️ [BOOTSTRAP] Screen ${screenDef.screen_key} already exists`);
        results.push({ screen_key: screenDef.screen_key, created: false, screen_id: existingScreen.id });
        continue;
      }

      const { data: newScreen, error: newScreenError } = await Postgres
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

      const permissionsConfig = [
        { role_key: 'SYSTEM_ADMIN', can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: true, can_approve: false },
        { role_key: 'TENANT_ADMIN', can_view: true, can_create: false, can_edit: false, can_delete: false, can_export: false, can_approve: false },
      ];

      let permissionsCreated = 0;
      for (const permConfig of permissionsConfig) {
        const { data: role } = await Postgres
          .from('roles')
          .select('id')
          .eq('role_key', permConfig.role_key)
          .single();

        if (!role) continue;

        const { data: existingPerm } = await Postgres
          .from('role_screen_permissions')
          .select('id')
          .eq('role_id', role.id)
          .eq('screen_id', screenId)
          .maybeSingle();

        if (existingPerm) continue;

        const { error: permError } = await Postgres
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

    return res.status(200).json({
      success: true,
      message: 'Security management screens bootstrap completed',
      results,
      any_created: results.some((r: any) => r.created),
    });

  } catch (error: any) {
    console.error('❌ [BOOTSTRAP] Unexpected error in ensureSecurityManagementScreens:', error);
    return res.status(500).json({
      success: false,
      error: 'Unexpected error during bootstrap',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}


/**
 * POST /bootstrap/ensure-org-maintenance-screen
 * Asegura pantallas ORG individuales para CRUD por entidad
 */
export async function ensureOrgMaintenanceScreen(req: Request, res: Response) {
  try {
    console.log('🔧 [BOOTSTRAP] Iniciando ensure-org-maintenance-screen...');

    const Postgres = createDbClient(
      process.env.Postgres_URL ?? '',
      process.env.Postgres_SERVICE_ROLE_KEY ?? '',
      {
      auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { data: orgMenuGroup, error: orgMenuGroupError } = await Postgres
      .from('system_menu_groups')
      .select('id')
      .eq('menu_group_key', 'ORG')
      .single();

    if (orgMenuGroupError || !orgMenuGroup) {
      return res.status(500).json({
        success: false,
        error: 'Menu group ORG not found',
        details: orgMenuGroupError?.message,
      });
    }

    const screensToEnsure = [
      {
        screen_key: 'ORG_STRUCTURE',
        screen_name: 'Estructura Organizacional',
        menu_label: 'Estructura',
        route_path: '/dashboard/org/structure',
        icon_key: 'Building2',
        sort_order: 40,
      },
      {
        screen_key: 'ORG_COMPANIES',
        screen_name: 'Empresas',
        menu_label: 'Empresa',
        route_path: '/dashboard/org/companies',
        icon_key: 'Building2',
        sort_order: 45,
      },
      {
        screen_key: 'ORG_WORK_LOCATIONS',
        screen_name: 'Localizaciones de Trabajo',
        menu_label: 'Localizaciones',
        route_path: '/dashboard/org/work-locations',
        icon_key: 'MapPin',
        sort_order: 50,
      },
      {
        screen_key: 'ORG_DEPARTMENTS',
        screen_name: 'Departamentos',
        menu_label: 'Departamentos',
        route_path: '/dashboard/org/departments',
        icon_key: 'Building',
        sort_order: 55,
      },
      {
        screen_key: 'ORG_AREAS',
        screen_name: 'Áreas',
        menu_label: 'Áreas',
        route_path: '/dashboard/org/areas',
        icon_key: 'Grid3X3',
        sort_order: 60,
      },
      {
        screen_key: 'ORG_WORK_GROUPS',
        screen_name: 'Grupos de Trabajo',
        menu_label: 'Grupos Trabajo',
        route_path: '/dashboard/org/work-groups',
        icon_key: 'Users',
        sort_order: 65,
      },
      {
        screen_key: 'ORG_PAYROLL_GROUPS',
        screen_name: 'Grupos de Nómina',
        menu_label: 'Grupos Nómina',
        route_path: '/dashboard/org/payroll-groups',
        icon_key: 'Wallet',
        sort_order: 70,
      },
      {
        screen_key: 'ORG_JOB_TITLES',
        screen_name: 'Cargos',
        menu_label: 'Cargos',
        route_path: '/dashboard/org/job-titles',
        icon_key: 'Briefcase',
        sort_order: 75,
      },
      {
        screen_key: 'ORG_COST_CENTERS',
        screen_name: 'Centros de Costo',
        menu_label: 'Centros Costo',
        route_path: '/dashboard/org/cost-centers',
        icon_key: 'Landmark',
        sort_order: 80,
      },
      {
        screen_key: 'ORG_EMPLOYEE_PROFILES',
        screen_name: 'Perfiles de Empleado',
        menu_label: 'Perfiles',
        route_path: '/dashboard/org/employee-profiles',
        icon_key: 'IdCard',
        sort_order: 85,
      },
      {
        screen_key: 'ORG_EMPLOYEE_COMPANIES',
        screen_name: 'Empleado por Empresas',
        menu_label: 'Empleado por Empresas',
        route_path: '/dashboard/org/employee-companies',
        icon_key: 'UsersRound',
        sort_order: 90,
      },
    ];

    const ensuredScreens: Array<{ screen_key: string; screen_id: string; created: boolean }> = [];

    for (const screenDef of screensToEnsure) {
      const { data: existingScreen, error: existingScreenError } = await Postgres
        .from('screens')
        .select('id')
        .eq('screen_key', screenDef.screen_key)
        .maybeSingle();

      if (existingScreenError) {
        return res.status(500).json({
          success: false,
          error: `Error loading screen ${screenDef.screen_key}`,
          details: existingScreenError.message,
        });
      }

      if (existingScreen?.id) {
        const { error: updateScreenError } = await Postgres
          .from('screens')
          .update({
            screen_name: screenDef.screen_name,
            menu_label: screenDef.menu_label,
            menu_group_id: orgMenuGroup.id,
            route_path: screenDef.route_path,
            icon_key: screenDef.icon_key,
            sort_order: screenDef.sort_order,
            is_active: true,
          })
          .eq('id', existingScreen.id);

        if (updateScreenError) {
          return res.status(500).json({
            success: false,
            error: `Error updating screen ${screenDef.screen_key}`,
            details: updateScreenError.message,
          });
        }

        ensuredScreens.push({
          screen_key: screenDef.screen_key,
          screen_id: existingScreen.id,
          created: false,
        });
        continue;
      }

      const { data: newScreen, error: newScreenError } = await Postgres
        .from('screens')
        .insert({
          screen_key: screenDef.screen_key,
          screen_name: screenDef.screen_name,
          menu_label: screenDef.menu_label,
          menu_group_id: orgMenuGroup.id,
          route_path: screenDef.route_path,
          icon_key: screenDef.icon_key,
          sort_order: screenDef.sort_order,
          is_active: true,
          created_by: 'SYSTEM',
        })
        .select('id')
        .single();

      if (newScreenError || !newScreen?.id) {
        return res.status(500).json({
          success: false,
          error: `Error creating screen ${screenDef.screen_key}`,
          details: newScreenError?.message,
        });
      }

      ensuredScreens.push({
        screen_key: screenDef.screen_key,
        screen_id: newScreen.id,
        created: true,
      });
    }

    // Retirar pantallas deprecadas/duplicadas del menu
    let deprecatedOrgMaintenanceDisabled = false;
    let deprecatedEmployeeProfilesDisabled = false;
    const { data: deprecatedOrgMaintenance } = await Postgres
      .from('screens')
      .select('id, is_active')
      .eq('screen_key', 'ORG_MAINTENANCE')
      .maybeSingle();

    if (deprecatedOrgMaintenance?.id) {
      await Postgres
        .from('screens')
        .update({
          is_active: false,
          updated_by: 'SYSTEM',
          updated_at: new Date().toISOString(),
        })
        .eq('id', deprecatedOrgMaintenance.id);

      const { data: deprecatedScreenActions } = await Postgres
        .from('screen_actions')
        .select('id')
        .eq('screen_id', deprecatedOrgMaintenance.id);

      const deprecatedScreenActionIds = (deprecatedScreenActions || []).map((row: any) => row.id);

      if (deprecatedScreenActionIds.length > 0) {
        await Postgres
          .from('screen_actions')
          .update({
            is_active: false,
            updated_by: 'SYSTEM',
            updated_at: new Date().toISOString(),
          })
          .in('id', deprecatedScreenActionIds);

        await Postgres
          .from('role_screen_actions')
          .update({
            is_allowed: false,
            is_active: false,
            updated_by: 'SYSTEM',
            updated_at: new Date().toISOString(),
          })
          .in('screen_action_id', deprecatedScreenActionIds);
      }

      deprecatedOrgMaintenanceDisabled = true;
    }

    // Legacy duplicado de "Perfiles": mantener solo ORG_EMPLOYEE_PROFILES
    const { data: deprecatedEmployeeProfiles } = await Postgres
      .from('screens')
      .select('id, is_active')
      .eq('screen_key', 'EMPLOYEE_PROFILES')
      .maybeSingle();

    if (deprecatedEmployeeProfiles?.id) {
      await Postgres
        .from('screens')
        .update({
          is_active: false,
          updated_by: 'SYSTEM',
          updated_at: new Date().toISOString(),
        })
        .eq('id', deprecatedEmployeeProfiles.id);

      const { data: deprecatedProfileScreenActions } = await Postgres
        .from('screen_actions')
        .select('id')
        .eq('screen_id', deprecatedEmployeeProfiles.id);

      const deprecatedProfileScreenActionIds = (deprecatedProfileScreenActions || []).map((row: any) => row.id);

      if (deprecatedProfileScreenActionIds.length > 0) {
        await Postgres
          .from('screen_actions')
          .update({
            is_active: false,
            updated_by: 'SYSTEM',
            updated_at: new Date().toISOString(),
          })
          .in('id', deprecatedProfileScreenActionIds);

        await Postgres
          .from('role_screen_actions')
          .update({
            is_allowed: false,
            is_active: false,
            updated_by: 'SYSTEM',
            updated_at: new Date().toISOString(),
          })
          .in('screen_action_id', deprecatedProfileScreenActionIds);
      }

      deprecatedEmployeeProfilesDisabled = true;
    }

    const requiredActionKeys = ['VIEW', 'CREATE', 'EDIT', 'DELETE'];
    const actionMap = new Map<string, string>();

    for (const actionKey of requiredActionKeys) {
      const { data: action, error: actionError } = await Postgres
        .from('actions')
        .select('id, action_key')
        .eq('action_key', actionKey)
        .maybeSingle();

      if (actionError || !action?.id) {
        return res.status(500).json({
          success: false,
          error: `Action ${actionKey} not found`,
          details: actionError?.message,
        });
      }

      actionMap.set(actionKey, action.id);
    }

    const screenActionIds: string[] = [];
    let screenActionsCreated = 0;

    for (const screen of ensuredScreens) {
      for (const actionKey of requiredActionKeys) {
        const actionId = actionMap.get(actionKey)!;

        const { data: existingScreenAction, error: existingScreenActionError } = await Postgres
          .from('screen_actions')
          .select('id')
          .eq('screen_id', screen.screen_id)
          .eq('action_id', actionId)
          .maybeSingle();

        if (existingScreenActionError) {
          return res.status(500).json({
            success: false,
            error: `Error checking screen_action for ${screen.screen_key}:${actionKey}`,
            details: existingScreenActionError.message,
          });
        }

        if (existingScreenAction?.id) {
          screenActionIds.push(existingScreenAction.id);
          continue;
        }

        const { data: newScreenAction, error: newScreenActionError } = await Postgres
          .from('screen_actions')
          .insert({
            screen_id: screen.screen_id,
            action_id: actionId,
            is_active: true,
            created_by: 'SYSTEM',
          })
          .select('id')
          .single();

        if (newScreenActionError || !newScreenAction?.id) {
          return res.status(500).json({
            success: false,
            error: `Error creating screen_action for ${screen.screen_key}:${actionKey}`,
            details: newScreenActionError?.message,
          });
        }

        screenActionIds.push(newScreenAction.id);
        screenActionsCreated += 1;
      }
    }

    const { data: tenantAdminRoles, error: tenantAdminRolesError } = await Postgres
      .from('roles')
      .select('id, tenant_id, role_key, is_active')
      .eq('role_key', 'TENANT_ADMIN')
      .eq('is_active', true);

    if (tenantAdminRolesError) {
      return res.status(500).json({
        success: false,
        error: 'Error loading TENANT_ADMIN roles',
        details: tenantAdminRolesError.message,
      });
    }

    const { data: supervisorRoles, error: supervisorRolesError } = await Postgres
      .from('roles')
      .select('id, tenant_id, role_key, is_active')
      .eq('role_key', 'SUPERVISOR')
      .eq('is_active', true);

    if (supervisorRolesError) {
      return res.status(500).json({
        success: false,
        error: 'Error loading SUPERVISOR roles',
        details: supervisorRolesError.message,
      });
    }

    let roleScreenActionsCreated = 0;
    let supervisorPermissionsDisabled = 0;

    for (const role of tenantAdminRoles || []) {
      for (const screenActionId of screenActionIds) {
        const { data: existingRoleScreenAction } = await Postgres
          .from('role_screen_actions')
          .select('id')
          .eq('tenant_id', role.tenant_id)
          .eq('role_id', role.id)
          .eq('screen_action_id', screenActionId)
          .maybeSingle();

        if (existingRoleScreenAction?.id) {
          await Postgres
            .from('role_screen_actions')
            .update({ is_allowed: true, is_active: true })
            .eq('id', existingRoleScreenAction.id);
          continue;
        }

        const { error: roleScreenActionError } = await Postgres
          .from('role_screen_actions')
          .insert({
            tenant_id: role.tenant_id,
            role_id: role.id,
            screen_action_id: screenActionId,
            is_allowed: true,
            is_active: true,
            created_by: 'SYSTEM',
          });

        if (roleScreenActionError) {
          return res.status(500).json({
            success: false,
            error: 'Error assigning role_screen_action to TENANT_ADMIN',
            details: roleScreenActionError.message,
          });
        }

        roleScreenActionsCreated += 1;
      }
    }

    for (const role of supervisorRoles || []) {
      for (const screenActionId of screenActionIds) {
        const { data: supervisorPermission, error: supervisorPermissionError } = await Postgres
          .from('role_screen_actions')
          .select('id, is_allowed, is_active')
          .eq('tenant_id', role.tenant_id)
          .eq('role_id', role.id)
          .eq('screen_action_id', screenActionId)
          .maybeSingle();

        if (supervisorPermissionError) {
          return res.status(500).json({
            success: false,
            error: 'Error checking SUPERVISOR role_screen_action',
            details: supervisorPermissionError.message,
          });
        }

        if (!supervisorPermission?.id) continue;

        const { error: disableSupervisorPermissionError } = await Postgres
          .from('role_screen_actions')
          .update({
            is_allowed: false,
            is_active: false,
          })
          .eq('id', supervisorPermission.id);

        if (disableSupervisorPermissionError) {
          return res.status(500).json({
            success: false,
            error: 'Error disabling SUPERVISOR role_screen_action',
            details: disableSupervisorPermissionError.message,
          });
        }

        supervisorPermissionsDisabled += 1;
      }
    }

    const screensCreated = ensuredScreens.filter((item) => item.created).length;

    return res.status(200).json({
      success: true,
      message: 'ORG screens, screen_actions and TENANT_ADMIN role_screen_actions ensured',
      screens_ensured: ensuredScreens,
      screens_created: screensCreated,
      screen_actions_created: screenActionsCreated,
      role_screen_actions_created: roleScreenActionsCreated,
      supervisor_permissions_disabled: supervisorPermissionsDisabled,
      deprecated_org_maintenance_disabled: deprecatedOrgMaintenanceDisabled,
      deprecated_employee_profiles_disabled: deprecatedEmployeeProfilesDisabled,
      any_created:
        screensCreated > 0 ||
        screenActionsCreated > 0 ||
        roleScreenActionsCreated > 0 ||
        deprecatedOrgMaintenanceDisabled ||
        deprecatedEmployeeProfilesDisabled,
    });
  } catch (error: any) {
    console.error('❌ [BOOTSTRAP] Error ensure-org-maintenance-screen:', error);
    return res.status(500).json({
      success: false,
      error: 'Unexpected error during bootstrap',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
