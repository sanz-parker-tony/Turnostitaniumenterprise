// ============================================================================
// index.ts
// Turnos Titanium Enterprise - Servidor Principal
// Convertido de Deno/Hono a Node.js/Express
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { createDbClient, authLogin } from './lib/postgres-client.js';
import { pool } from './lib/db.js';

// Importar funciones de bootstrap
import {
  ensureSystemAdmin,
  getWizardState,
  getBootstrapToken,
  getSystemLanguages,
  bootstrapStep1Tenant,
  bootstrapStep2Admin,
} from './bootstrap';

// Importar funciones de tenant
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
  updateSystemTenantSettings,
} from './tenant-routes';

// Importar routers de mantenimiento
import actionsRouter from './routes/actions-mgmt-routes';
import attendanceRouter from './routes/attendance-events-routes';
import {
  ensureSystemSettingsScreen,
  ensureMaintenanceManagementScreens,
  ensureSecurityManagementScreens,
  ensureOrgMaintenanceScreen,
} from './routes/bootstrap-screens';
import lookupGroupsRouter from './routes/lookup-groups-routes';
import lookupRouter from './routes/lookup-routes';
import lookupValuesRouter from './routes/lookup-values-routes';
import menuGroupsRouter from './routes/menu-groups-routes';
import organizationRouter from './routes/organization-routes';
import roleScreenActionsRouter from './routes/role-screen-actions-mgmt-routes';
import rolesRouter from './routes/roles-routes';
import scopeTypesRouter from './routes/scope-types-routes';
import screenActionsRouter from './routes/screen-actions-mgmt-routes';
import screensRouter from './routes/screens-mgmt-routes';
import settingsRouter from './routes/settings-routes';
import employeeShiftPlanningRouter from './routes/employee-shift-planning-routes';
import shiftConstructorRouter from './routes/shift-constructor-routes';
import systemSettingsRouter from './routes/system-settings-routes';
import usersRouter from './routes/users-management-routes';

const router = Router();

function getPostgresClient() {
  return createDbClient(
    process.env.Postgres_URL ?? '',
    process.env.Postgres_SERVICE_ROLE_KEY ?? ''
  );
}

function getPostgresAnonClient() {
  return createDbClient(
    process.env.Postgres_URL ?? '',
    process.env.Postgres_ANON_KEY ?? ''
  );
}

// ============================================================================
// MIDDLEWARE DE AUTENTICACIÃ“N
// ============================================================================

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  console.log('ðŸ” [requireAuth] Authorization header:', authHeader ? `Bearer ${authHeader.substring(7, 20)}...` : 'MISSING');

  if (!authHeader?.startsWith('Bearer ')) {
    console.error('âŒ [requireAuth] Missing or invalid Authorization header');
    return res.status(401).json({
      code: 401,
      error: 'Authorization header missing or invalid',
      message: 'Missing authorization header',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token.length < 20) {
    console.error('âŒ [requireAuth] Token vacÃ­o o muy corto');
    return res.status(401).json({
      code: 401,
      error: 'Invalid token',
      message: 'Token is empty or malformed',
    });
  }

  console.log('ðŸ” [requireAuth] Token length:', token.length);

  const PostgresAdmin = getPostgresClient();

  try {
    const { data: { user }, error } = await PostgresAdmin.auth.getUser(token);

    if (error) {
      console.error('âŒ [requireAuth] Error de autenticaciÃ³n:', error.message);
      return res.status(401).json({
        code: 401,
        error: 'Unauthorized',
        message: error.message,
      });
    }

    if (!user) {
      console.error('âŒ [requireAuth] Usuario no encontrado en el token');
      return res.status(401).json({
        code: 401,
        error: 'Unauthorized',
        message: 'User not found',
      });
    }

    console.log('âœ… [requireAuth] Usuario autenticado:', user.email);
    (req as any).user = user;
    next();
  } catch (err: any) {
    console.error('ðŸ’¥ [requireAuth] Error inesperado:', err);
    return res.status(500).json({
      code: 500,
      error: 'Internal server error',
      message: err.message,
    });
  }
};

// ============================================================================
// HEALTH CHECK
// ============================================================================

router.get('/health', (req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: 'wizard-complete-2026-01-20-v2',
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
    },
  });
});

router.get('/bootstrap/ping', (req: Request, res: Response) => {
  console.log('ðŸ“ [PING] Endpoint alcanzado correctamente');
  return res.json({
    success: true,
    message: 'Bootstrap endpoint is reachable',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// BOOTSTRAP ENDPOINTS
// ============================================================================

router.post('/bootstrap/ensure-system-admin', ensureSystemAdmin);
router.post('/bootstrap/ensure-main-tenant', ensureMainTenant);

router.get('/bootstrap/wizard-state', requireAuth, getWizardState);
router.get('/bootstrap/token', getBootstrapToken);
router.get('/bootstrap/languages', getSystemLanguages);

router.post('/bootstrap/step1-tenant', requireAuth, bootstrapStep1Tenant);
router.post('/bootstrap/step2-admin', requireAuth, bootstrapStep2Admin);

router.get('/bootstrap/tenant-info', requireAuth, async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgresClient();

    const { data: tenant, error } = await Postgres
      .from('tenants')
      .select('tenant_key, tenant_name')
      .neq('tenant_key', 'SYSTEM')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo tenant:', error);
      return res.status(500).json({ error: 'Error obteniendo tenant' });
    }

    return res.json({ tenant: tenant || null });
  } catch (error) {
    console.error('Error en tenant-info:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// USER ENDPOINTS
// ============================================================================

router.get('/users/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const Postgres = getPostgresClient();

    const { data: profile, error } = await Postgres
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.json({ profile });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const body = req.body;
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const Postgres = getPostgresClient();

    const { error: updateError } = await Postgres.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      return res.status(500).json({ error: 'Error updating password' });
    }

    await Postgres
      .from('users')
      .update({ must_change_password: false })
      .eq('auth_user_id', user.id);

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/menu-screens', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const authUserId = user?.id;
    if (!authUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rows } = await pool.query(
      `
        SELECT DISTINCT
          s.screen_key,
          s.screen_name,
          COALESCE(s.menu_label, s.screen_name) AS menu_label,
          COALESCE(s.icon_key, 'Circle') AS screen_icon_key,
          s.route_path,
          smg.menu_group_key,
          smg.menu_group_name,
          COALESCE(smg.icon_key, 'Folder') AS menu_group_icon,
          smg.sort_order AS menu_group_sort_order,
          s.sort_order AS screen_sort_order
        FROM users u
        JOIN user_roles ur
          ON ur.user_id = u.id
         AND ur.is_active = TRUE
        JOIN roles r
          ON r.id = ur.role_id
         AND r.is_active = TRUE
        JOIN role_screen_actions rsa
          ON rsa.role_id = r.id
         AND rsa.is_active = TRUE
         AND rsa.is_allowed = TRUE
        JOIN screen_actions sa
          ON sa.id = rsa.screen_action_id
         AND sa.is_active = TRUE
        JOIN actions a
          ON a.id = sa.action_id
         AND a.action_key = 'VIEW'
         AND a.is_active = TRUE
        JOIN screens s
          ON s.id = sa.screen_id
         AND s.is_active = TRUE
        JOIN system_menu_groups smg
          ON smg.id = s.menu_group_id
         AND smg.is_active = TRUE
        WHERE u.auth_user_id = $1
          AND u.is_active = TRUE
          AND COALESCE(s.route_path, '') <> '/dashboard/org/employees'
          AND s.screen_key <> 'ORG_EMPLOYEES'
        ORDER BY smg.sort_order, s.sort_order
      `,
      [authUserId]
    );

    return res.json({
      success: true,
      screens: rows,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son obligatorios' });
    }

    const { data, error } = await authLogin(String(email), String(password));
    if (error || !data?.session) {
      return res.status(401).json({
        error: error?.message || 'Credenciales inválidas',
      });
    }

    return res.json({
      success: true,
      session: data.session,
      user: data.user,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.get('/auth/me', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  return res.json({
    success: true,
    user,
  });
});

// ============================================================================
// DIAGNOSTIC ENDPOINTS
// ============================================================================

router.get('/auth/diagnostics', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgresClient();

    const { data: authUsers, error: authError } = await Postgres.auth.admin.listUsers();

    if (authError) {
      console.error('Error listando usuarios de auth:', authError);
      return res.status(500).json({
        error: 'Error al listar usuarios de autenticaciÃ³n',
        details: authError.message,
      });
    }

    const { data: publicUsers, error: publicError } = await Postgres
      .from('users')
      .select('id, username, email, is_active, auth_user_id')
      .limit(100);

    if (publicError) {
      console.error('Error listando usuarios pÃºblicos:', publicError);
      return res.status(500).json({
        error: 'Error al listar usuarios pÃºblicos',
        details: publicError.message,
      });
    }

    const systemAdmin = authUsers?.users?.find((u: any) => u.email === 'system.admin@titanium-labs.com');
    const systemAdminPublic = publicUsers?.find((u: any) => u.email === 'system.admin@titanium-labs.com');

    return res.json({
      success: true,
      summary: {
        authUsersCount: authUsers?.users?.length || 0,
        publicUsersCount: publicUsers?.length || 0,
        systemAdminExists: !!systemAdmin,
        systemAdminInPublic: !!systemAdminPublic,
      },
      authUsers: authUsers?.users?.map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        email_confirmed_at: u.email_confirmed_at,
      })) || [],
      publicUsers: publicUsers || [],
      systemAdmin: systemAdmin
        ? {
            id: systemAdmin.id,
            email: systemAdmin.email,
            created_at: systemAdmin.created_at,
            confirmed: !!systemAdmin.email_confirmed_at,
          }
        : null,
      instructions: !systemAdmin
        ? {
            message: 'Usuario system.admin no encontrado',
            solution: 'Ejecutar endpoint POST /auth/create-system-admin para crearlo',
          }
        : null,
    });
  } catch (error: any) {
    console.error('Error en diagnÃ³stico:', error);
    return res.status(500).json({
      error: 'Error interno en diagnÃ³stico',
      details: error.message,
    });
  }
});

router.post('/auth/create-system-admin', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgresClient();

    const body = req.body || {};
    const email = body.email || 'system.admin@titanium-labs.com';
    const password = body.password || 'Titanium2026!';
    const displayName = body.displayName || 'System Administrator';

    console.log(`ðŸ”§ Intentando crear usuario ${email}...`);

    // Verificar que tenant SYSTEM existe
    console.log('ðŸ” Verificando tenant SYSTEM...');
    const { data: systemTenant, error: tenantCheckError } = await Postgres
      .from('tenants')
      .select('id, tenant_key')
      .eq('tenant_key', 'SYSTEM')
      .single();

    if (tenantCheckError || !systemTenant) {
      console.error('âŒ ERROR CRÃTICO: Tenant SYSTEM no existe');
      return res.status(500).json({
        error: 'SETUP INCOMPLETO: Tenant SYSTEM no encontrado',
        details: 'Debes ejecutar los scripts SQL de migraciÃ³n primero',
        solution: 'Ejecuta los scripts SQL en tu PostgreSQL y ejecuta los archivos en /Postgres/migrations/ en orden',
        requiredFiles: ['001_INITIAL_SCHEMA.sql', '002_SEED_COMPLETE.sql'],
      });
    }

    console.log(`âœ… Tenant SYSTEM encontrado (id: ${systemTenant.id})`);

    // Verificar si ya existe
    const { data: existingUser } = await Postgres.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email === email);

    if (userExists) {
      console.log(`â­ï¸ Usuario ${email} ya existe (id: ${userExists.id})`);

      return res.json({
        success: true,
        message: 'Usuario ya existe',
        user: {
          id: userExists.id,
          email: userExists.email,
          created_at: userExists.created_at,
        },
        note: 'El usuario ya existe en el sistema',
      });
    }

    // Crear usuario
    console.log('ðŸ”§ Creando usuario con admin.createUser...');

    const { data: newUser, error: createError } = await Postgres.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: displayName,
      },
    });

    if (createError) {
      console.error('âŒ Error creando usuario:', createError);
      return res.status(500).json({
        error: 'No se pudo crear el usuario',
        details: createError.message,
        suggestion: 'Verifica que hayas ejecutado las migraciones SQL correctamente',
      });
    }

    const userId = newUser?.user?.id;

    if (!userId) {
      console.error('âŒ No se obtuvo ID de usuario');
      return res.status(500).json({
        error: 'Error al obtener ID de usuario despuÃ©s de creaciÃ³n',
      });
    }

    console.log(`âœ… Usuario creado en auth.users (id: ${userId})`);

    // Crear en public.users
    console.log('ðŸ”§ Creando/actualizando usuario en public.users...');
    const { data: publicUser, error: publicError } = await Postgres
      .from('users')
      .upsert(
        {
          tenant_id: systemTenant.id,
          auth_user_id: userId,
          username: email.split('@')[0],
          display_name: displayName,
          email: email,
          is_active: true,
          preferred_language_code: 'es',
          created_by: 'SYSTEM',
        },
        {
          onConflict: 'auth_user_id',
        }
      )
      .select()
      .single();

    if (publicError) {
      console.error('âŒ Error creando/actualizando usuario en public.users:', publicError);
      return res.status(500).json({
        error: 'Error al crear perfil de usuario',
        details: publicError.message,
      });
    }

    const { error: syncPasswordError } = await Postgres.auth.admin.updateUserById(userId, {
      password,
    });
    if (syncPasswordError) {
      return res.status(500).json({
        error: 'Error al sincronizar contraseÃ±a del usuario',
        details: syncPasswordError.message,
      });
    }

    console.log(`âœ… Usuario creado/actualizado en public.users (id: ${publicUser.id})`);

    // Obtener rol SYSTEM_ADMIN
    console.log('ðŸ” Buscando rol SYSTEM_ADMIN...');
    const { data: systemAdminRole, error: roleError } = await Postgres
      .from('roles')
      .select('id')
      .eq('tenant_id', systemTenant.id)
      .eq('role_key', 'SYSTEM_ADMIN')
      .single();

    if (roleError || !systemAdminRole) {
      console.error('âŒ ERROR CRÃTICO: Rol SYSTEM_ADMIN no existe');
      return res.status(500).json({
        error: 'SETUP INCOMPLETO: Rol SYSTEM_ADMIN no encontrado',
        details: 'Debes ejecutar los scripts SQL de migraciÃ³n primero',
        solution: 'Ejecuta los scripts SQL en tu PostgreSQL y ejecuta los archivos en /Postgres/migrations/ en orden',
        requiredFiles: ['001_INITIAL_SCHEMA.sql', '002_SEED_COMPLETE.sql'],
      });
    }

    console.log(`âœ… Rol SYSTEM_ADMIN encontrado (id: ${systemAdminRole.id})`);

    // Asignar rol
    console.log('ðŸ”§ Asignando rol SYSTEM_ADMIN al usuario...');
    const { error: roleAssignError } = await Postgres
      .from('user_roles')
      .insert({
        tenant_id: systemTenant.id,
        user_id: publicUser.id,
        role_id: systemAdminRole.id,
        is_active: true,
        created_by: 'SYSTEM',
      });

    if (roleAssignError) {
      console.error('âŒ Error asignando rol:', roleAssignError);
      return res.status(500).json({
        error: 'Error al asignar rol',
        details: roleAssignError.message,
      });
    }

    console.log(`âœ… Rol SYSTEM_ADMIN asignado al usuario`);

    return res.json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: {
        id: userId,
        email: email,
        created_at: new Date().toISOString(),
      },
      credentials: {
        email: email,
        password: password,
        note: 'âš ï¸ IMPORTANTE: Cambia esta contraseÃ±a despuÃ©s del primer login',
      },
      nextSteps: [
        '1. Inicia sesiÃ³n con las credenciales proporcionadas',
        '2. Cambia la contraseÃ±a inmediatamente',
        '3. Completa el wizard de configuraciÃ³n inicial',
      ],
    });
  } catch (error: any) {
    console.error('ðŸ’¥ Error creando usuario system.admin:', error);
    return res.status(500).json({
      error: 'Error interno al crear usuario',
      details: error.message,
    });
  }
});

router.post('/auth/reset-system-admin-password', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgresClient();
    const email = 'system.admin@titanium-labs.com';
    const password = 'Titanium2026!';

    const { data: listData, error: listError } = await Postgres.auth.admin.listUsers();
    if (listError) {
      return res.status(500).json({ error: listError.message });
    }

    const existing = listData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!existing?.id) {
      return res.status(404).json({
        error: 'Usuario system.admin no encontrado',
        suggestion: 'Usa /auth/create-system-admin para crearlo',
      });
    }

    const { error: updateError } = await Postgres.auth.admin.updateUserById(existing.id, {
      password,
    });
    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.json({
      success: true,
      credentials: {
        email,
        password,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/db/query', requireAuth, async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgresClient();
    const {
      table,
      action,
      select,
      filters,
      order,
      limit,
      payload,
      upsertOptions,
      single,
      maybeSingle,
    } = req.body || {};

    if (!table || typeof table !== 'string') {
      return res.status(400).json({ error: 'table es requerido' });
    }

    let query: any = Postgres.from(table);

    if (action === 'insert') {
      query = query.insert(payload);
      if (select) query = query.select(select);
    } else if (action === 'update') {
      query = query.update(payload);
      if (select) query = query.select(select);
    } else if (action === 'delete') {
      query = query.delete();
      if (select) query = query.select(select);
    } else if (action === 'upsert') {
      query = query.upsert(payload, upsertOptions || {});
      if (select) query = query.select(select);
    } else {
      query = query.select(select || '*');
    }

    if (Array.isArray(filters)) {
      for (const f of filters) {
        if (!f?.type || !f?.column) continue;
        if (f.type === 'eq') query = query.eq(f.column, f.value);
        if (f.type === 'neq') query = query.neq(f.column, f.value);
        if (f.type === 'is') query = query.is(f.column, f.value);
        if (f.type === 'in') query = query.in(f.column, f.value);
        if (f.type === 'not') query = query.not(f.column, f.operator, f.value);
      }
    }

    if (Array.isArray(order)) {
      for (const o of order) {
        if (!o?.column) continue;
        query = query.order(o.column, { ascending: o.ascending !== false });
      }
    }

    if (typeof limit === 'number') {
      query = query.limit(limit);
    }

    if (single) query = query.single();
    if (maybeSingle) query = query.maybeSingle();

    const { data, error } = await query;
    if (error) {
      const status = error.code === 'PGRST116' ? 404 : 400;
      return res.status(status).json({ data: null, error });
    }

    return res.json({ data, error: null });
  } catch (error: any) {
    return res.status(500).json({ data: null, error: { message: error.message || 'Internal server error' } });
  }
});

// ============================================================================
// TENANT ENDPOINTS
// ============================================================================

router.get('/tenants/:id', requireAuth, getTenant);
router.put('/tenants/:id', requireAuth, updateTenant);
router.get('/tenants/:id/settings', requireAuth, getTenantSettings);
router.post('/tenants/:id/settings', requireAuth, createTenantSetting);
router.put('/tenants/:id/settings/:setting_id', requireAuth, updateTenantSetting);
router.delete('/tenants/:id/settings/:setting_id', requireAuth, deleteTenantSetting);
router.get('/tenants/:id/members', requireAuth, getTenantMembers);
router.get('/tenants/:id/languages', requireAuth, getTenantLanguages);
router.put('/tenants/:id/languages', requireAuth, updateTenantLanguages);
router.get('/lookup-values/data-types', requireAuth, getDataTypes);

// System tenant endpoints
router.get('/tenant/settings', getSystemTenantSettings);
router.put('/tenant/settings', updateSystemTenantSettings);

// ============================================================================
// MAINTENANCE ENDPOINTS - Todos los routers de mantenimiento
// ============================================================================

// Actions Management
router.use('/actions', requireAuth, actionsRouter);
router.use('/actions-management', requireAuth, actionsRouter); // Legacy alias

// Attendance Events
router.use('/attendance-events', attendanceRouter);

// Bootstrap Screens
router.post('/bootstrap-screens/ensure-system-settings', requireAuth, ensureSystemSettingsScreen);
router.post('/bootstrap/ensure-maintenance-screens', requireAuth, ensureMaintenanceManagementScreens);
router.post('/bootstrap/ensure-security-screens', requireAuth, ensureSecurityManagementScreens);
router.post('/bootstrap/ensure-org-maintenance-screen', requireAuth, ensureOrgMaintenanceScreen);

// Lookups
router.use('/lookup-groups', lookupGroupsRouter);
router.use('/lookup-routes', requireAuth, lookupRouter);
router.use('/lookup-values', lookupValuesRouter);

// Menu Groups
router.use('/menu-groups', requireAuth, menuGroupsRouter);
router.use('/menu-groups-management', requireAuth, menuGroupsRouter); // Legacy alias

// Role-Screen Actions
router.use('/role-screen-actions', requireAuth, roleScreenActionsRouter);
router.use('/role-screen-actions-management', requireAuth, roleScreenActionsRouter); // Legacy alias

// Roles
router.use('/roles', requireAuth, rolesRouter);
router.use('/roles-management', requireAuth, rolesRouter); // Legacy alias

// Scope Types
router.use('/scope-types', requireAuth, scopeTypesRouter);
router.use('/scope-types-management', requireAuth, scopeTypesRouter); // Legacy alias

// Screen Actions
router.use('/screen-actions', requireAuth, screenActionsRouter);
router.use('/screen-actions-management', requireAuth, screenActionsRouter); // Legacy alias

// Screens
router.use('/screens', requireAuth, screensRouter);
router.use('/screens-management', requireAuth, screensRouter); // Legacy alias

// Settings (General)
router.use('/settings', requireAuth, settingsRouter);

// System Settings
router.use('/system-settings', requireAuth, systemSettingsRouter);
router.use('/system-settings-management', requireAuth, systemSettingsRouter); // Legacy alias

// Users Management
router.use('/users-management', requireAuth, usersRouter);

// Organization Management
router.use('/organization', requireAuth, organizationRouter);

// Shift Constructor Management
router.use('/shift-constructor', requireAuth, shiftConstructorRouter);

// Employee Shift Planning
router.use('/employee-shift-planning', requireAuth, employeeShiftPlanningRouter);

// ============================================================================
// HEALTH & STATUS
// ============================================================================

router.get('/status', (req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    message: 'Backend API is running',
    endpoints: {
      bootstrap: ['/bootstrap/ensure-system-admin', '/bootstrap/wizard-state', '/bootstrap/token', '/bootstrap/languages', '/bootstrap/step1-tenant', '/bootstrap/step2-admin'],
      auth: ['/auth/diagnostics', '/auth/create-system-admin'],
      users: ['/users/profile', '/users/change-password'],
      tenants: ['/tenants/:id', '/tenant/settings'],
      maintenance: ['/actions', '/attendance-events', '/bootstrap-screens', '/lookup-groups', '/lookup-routes', '/lookup-values', '/menu-groups', '/role-screen-actions', '/roles', '/scope-types', '/screen-actions', '/screens', '/settings', '/system-settings', '/users-management'],
      config: ['/shift-constructor'],
      employees: ['/employee-shift-planning'],
    },
  });
});

// ============================================================================
// 404 HANDLER
// ============================================================================

router.use((req: Request, res: Response) => {
  return res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
    message: 'Endpoint no encontrado',
  });
});

export default router;



