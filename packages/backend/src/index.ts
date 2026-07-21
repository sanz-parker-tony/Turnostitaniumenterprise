// ============================================================================
// index.ts
// Turnos Titanium Enterprise - Servidor Principal
// Convertido de Deno/Hono a Node.js/Express
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { createDbClient, authLogin } from './lib/postgres-client.js';
import { pool } from './lib/db.js';
import { getTenantDashboardEventVersion, waitForTenantDashboardEvent } from './lib/dashboard-events.js';

// Importar funciones de bootstrap
import {
  ensureSystemAdmin,
  getWizardState,
  getBootstrapToken,
  getSystemLanguages,
  bootstrapStep1Tenant,
  bootstrapStep2Admin,
} from './bootstrap.js';

// Importar funciones de tenant
import {
  getTenant,
  updateTenant,
  getTenantSummary,
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
import holidaysRouter from './routes/holidays-routes';
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
import securityRolePermissionsRouter from './routes/security-role-permissions-routes';
import rolesRouter from './routes/roles-routes';
import scopeTypesRouter from './routes/scope-types-routes';
import screenActionsRouter from './routes/screen-actions-mgmt-routes';
import screensRouter from './routes/screens-mgmt-routes';
import securityUserScopesRouter from './routes/security-user-scopes-routes';
import settingsRouter from './routes/settings-routes';
import shiftPlanningRouter from './routes/shift-planning.routes';
import employeeShiftPlanningRouter from './routes/employee-shift-planning-routes';
import employeeTimePunchesRouter from './routes/employee-time-punches-routes';
import employeeAbsenceRequestsRouter from './routes/employee-absence-requests-routes';
import kioskRouter from './routes/kiosk-routes';
import shiftConstructorRouter from './routes/shift-constructor-routes';
import subscriptionPlansRouter from './routes/subscription-plans-routes';
import systemSettingsRouter from './routes/system-settings-routes';
import timeClockDevicesRouter from './routes/time-clock-devices-routes';
import usersRouter from './routes/users-management-routes';
import workPatternsRouter from './routes/work-patterns-routes';
import profileAttendanceEventsRouter from './routes/profile-attendance-events-routes';
import notificationsRouter from './routes/notifications-routes';
import systemMessageKeysRouter from './routes/system-message-keys-routes';
import translationsManagementRouter from './routes/translations-management-routes';
import systemReportsRouter from './routes/system-reports-routes';
import routeTrackingRouter from './routes/route-tracking-routes';
import overtimeReportsRouter, { buildOvertimeCtes } from './routes/overtime-reports-routes';

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
// MIDDLEWARE DE AUTENTICACIÃƒâ€œN
// ============================================================================

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization;

  console.log('Ã°Å¸â€Â [requireAuth] Authorization header:', authHeader ? `Bearer ${authHeader.substring(7, 20)}...` : 'MISSING');

  if (!authHeader?.startsWith('Bearer ')) {
    console.error('Ã¢ÂÅ’ [requireAuth] Missing or invalid Authorization header');
    return res.status(401).json({
      code: 401,
      error: 'Authorization header missing or invalid',
      message: 'Missing authorization header',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token.length < 20) {
    console.error('Ã¢ÂÅ’ [requireAuth] Token vacÃƒÂ­o o muy corto');
    return res.status(401).json({
      code: 401,
      error: 'Invalid token',
      message: 'Token is empty or malformed',
    });
  }

  console.log('Ã°Å¸â€Â [requireAuth] Token length:', token.length);

  const PostgresAdmin = getPostgresClient();

  try {
    const { data: { user }, error } = await PostgresAdmin.auth.getUser(token);

    if (error) {
      console.error('Ã¢ÂÅ’ [requireAuth] Error de autenticaciÃƒÂ³n:', error.message);
      return res.status(401).json({
        code: 401,
        error: 'Unauthorized',
        message: error.message,
      });
    }

    if (!user) {
      console.error('Ã¢ÂÅ’ [requireAuth] Usuario no encontrado en el token');
      return res.status(401).json({
        code: 401,
        error: 'Unauthorized',
        message: 'User not found',
      });
    }

    console.log('Ã¢Å“â€¦ [requireAuth] Usuario autenticado:', user.email);
    (req as any).user = user;
    next();
  } catch (err: any) {
    console.error('Ã°Å¸â€™Â¥ [requireAuth] Error inesperado:', err);
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

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - System
 *     summary: Health check del backend
 *     responses:
 *       200:
 *         description: Servicio activo
 */
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
  console.log('Ã°Å¸Ââ€œ [PING] Endpoint alcanzado correctamente');
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

/**
 * @openapi
 * /users/profile:
 *   get:
 *     tags:
 *       - Users
 *     summary: Obtiene el perfil del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *       401:
 *         description: No autorizado
 */
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
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: 'La contraseña actual, la nueva contraseña y su confirmación son obligatorias.',
      });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    }
    if (String(newPassword) !== String(confirmPassword)) {
      return res.status(400).json({ error: 'La nueva contraseña y su confirmación no coinciden.' });
    }
    if (String(currentPassword) === String(newPassword)) {
      return res.status(400).json({ error: 'La nueva contraseña debe ser diferente de la actual.' });
    }

    const { data: currentCredentials, error: credentialsError } = await authLogin(
      String(user.email),
      String(currentPassword)
    );
    if (credentialsError || !currentCredentials?.user || currentCredentials.user.id !== user.id) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
    }

    const Postgres = getPostgresClient();

    const { error: updateError } = await Postgres.auth.admin.updateUserById(user.id, {
      password: String(newPassword),
    });

    if (updateError) {
      return res.status(500).json({ error: 'No se pudo actualizar la contraseña.' });
    }

    await Postgres
      .from('users')
      .update({ must_change_password: false })
      .eq('auth_user_id', user.id);

    return res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Error interno al cambiar la contraseña.' });
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

router.get('/dashboard/tenant-admin-summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const authUserId = user?.id;
    if (!authUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tenantResult = await pool.query(
      `
        SELECT u.tenant_id
        FROM users u
        WHERE u.auth_user_id = $1
        LIMIT 1
      `,
      [authUserId]
    );

    const tenantId = tenantResult.rows[0]?.tenant_id;
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id para el usuario autenticado' });
    }

    const now = new Date();
    const monthParamRaw = String(req.query.month || '').trim();
    const monthParamMatch = monthParamRaw.match(/^(\d{4})-(\d{2})$/);
    const targetYear = monthParamMatch ? Number(monthParamMatch[1]) : now.getFullYear();
    const targetMonth = monthParamMatch ? Number(monthParamMatch[2]) : now.getMonth() + 1;
    const safeMonth = Math.min(12, Math.max(1, targetMonth));
    const safeYear = Number.isFinite(targetYear) ? targetYear : now.getFullYear();
    const monthStart = new Date(Date.UTC(safeYear, safeMonth - 1, 1));
    const monthEnd = new Date(Date.UTC(safeYear, safeMonth, 1));
    const monthStartIso = monthStart.toISOString().slice(0, 10);
    const monthEndIso = monthEnd.toISOString().slice(0, 10);
    const monthKey = `${safeYear}-${String(safeMonth).padStart(2, '0')}`;

    const [
      tenantInfoRes,
      countersRes,
      shiftsRes,
      workPatternsRes,
      monthCalendarRes,
      devicesRes,
      companyActivityRes,
      locationActivityRes,
      punchSourceRes,
      deviceHealthRes,
      weeklyPunchesRes,
    ] = await Promise.all([
      pool.query(
        `
          SELECT
            t.id,
            t.tenant_key,
            t.tenant_name,
            t.is_active,
            t.created_at,
            COALESCE(tls.default_language_code, 'es') AS language_code
          FROM tenants t
          LEFT JOIN tenant_language_settings tls
            ON tls.tenant_id = t.id
          WHERE t.id = $1
          LIMIT 1
        `,
        [tenantId]
      ),
      pool.query(
        `
          WITH pending_absence AS (
            SELECT COUNT(*)::int AS total
            FROM employee_absence_requests ear
            LEFT JOIN lookup_values lv
              ON lv.id = ear.request_status_id
            WHERE ear.tenant_id = $1
              AND ear.is_active = true
              AND UPPER(COALESCE(lv.lookup_key, '')) = 'PENDING'
          ),
          pending_shift_change AS (
            SELECT COUNT(*)::int AS total
            FROM employee_shift_change_requests escr
            LEFT JOIN lookup_values lv
              ON lv.id = escr.request_status_id
            WHERE escr.tenant_id = $1
              AND escr.is_active = true
              AND UPPER(COALESCE(lv.lookup_key, '')) = 'PENDING'
          ),
          next_holiday AS (
            SELECT
              h.holiday_date,
              h.holiday_name
            FROM holidays h
            WHERE h.tenant_id = $1
              AND h.is_active = true
              AND h.holiday_date >= CURRENT_DATE
            ORDER BY h.holiday_date ASC
            LIMIT 1
          ),
          effective_punches_30 AS (
            SELECT
              p.id,
              p.employee_id,
              p.company_id,
              COALESCE(d.work_location_id, ec.work_location_id) AS work_location_id,
              p.time_clock_device_id
            FROM employee_time_punches p
            LEFT JOIN time_clock_devices d
              ON d.id = p.time_clock_device_id
            LEFT JOIN LATERAL (
              SELECT ec.work_location_id
              FROM employee_companies ec
              WHERE ec.tenant_id = p.tenant_id
                AND ec.employee_id = p.employee_id
                AND ec.company_id = p.company_id
                AND ec.is_active = true
              ORDER BY ec.updated_at DESC NULLS LAST, ec.created_at DESC NULLS LAST
              LIMIT 1
            ) ec ON d.work_location_id IS NULL
            WHERE p.tenant_id = $1
              AND p.is_active = true
              AND p.punch_datetime >= (now() - interval '30 days')
          ),
          device_status AS (
            SELECT
              d.id,
              MAX(p.punch_datetime) AS last_punch_datetime
            FROM time_clock_devices d
            LEFT JOIN employee_time_punches p
              ON p.time_clock_device_id = d.id
             AND p.tenant_id = d.tenant_id
             AND p.is_active = true
            WHERE d.tenant_id = $1
              AND d.is_active = true
            GROUP BY d.id
          ),
          assigned_employees AS (
            SELECT DISTINCT ura.employee_id
            FROM user_role_employee_assignments ura
            JOIN user_roles ur
              ON ur.id = ura.user_role_id
             AND ur.tenant_id = ura.tenant_id
             AND ur.is_active = true
            JOIN roles r
              ON r.id = ur.role_id
             AND r.is_active = true
            WHERE ura.tenant_id = $1
              AND ura.is_active = true
              AND UPPER(COALESCE(r.role_key, '')) IN ('SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN')
          )
          SELECT
            (SELECT COUNT(*)::int FROM users WHERE tenant_id = $1 AND is_active = true) AS active_users,
            (SELECT COUNT(*)::int FROM employees WHERE tenant_id = $1 AND is_active = true) AS active_employees,
            (SELECT COUNT(*)::int FROM employees WHERE tenant_id = $1 AND is_active = true AND user_id IS NOT NULL) AS employees_with_user,
            (SELECT COUNT(*)::int FROM companies WHERE tenant_id = $1 AND is_active = true) AS active_companies,
            (SELECT COUNT(*)::int FROM roles WHERE tenant_id = $1 AND is_active = true) AS active_roles,
            (SELECT COUNT(*)::int FROM tenant_members WHERE tenant_id = $1) AS tenant_members,
            (SELECT COUNT(*)::int FROM tenant_settings WHERE tenant_id = $1 AND is_active = true) AS tenant_setting_overrides,
            (SELECT COUNT(*)::int FROM work_locations WHERE tenant_id = $1 AND is_active = true) AS active_work_locations,
            (SELECT COUNT(*)::int FROM work_locations WHERE tenant_id = $1 AND is_active = true AND geofence_polygon IS NOT NULL) AS geofenced_work_locations,
            (SELECT COUNT(*)::int FROM work_locations WHERE tenant_id = $1 AND is_active = true AND geofence_polygon IS NULL) AS virtual_work_locations,
            (SELECT COUNT(*)::int FROM departments WHERE tenant_id = $1 AND is_active = true) AS active_departments,
            (SELECT COUNT(*)::int FROM areas WHERE tenant_id = $1 AND is_active = true) AS active_areas,
            (SELECT COUNT(*)::int FROM cost_centers WHERE tenant_id = $1 AND is_active = true) AS active_cost_centers,
            (SELECT COUNT(*)::int FROM payroll_groups WHERE tenant_id = $1 AND is_active = true) AS active_payroll_groups,
            (SELECT COUNT(*)::int FROM work_groups WHERE tenant_id = $1 AND is_active = true) AS active_work_groups,
            (SELECT COUNT(*)::int FROM job_titles WHERE tenant_id = $1 AND is_active = true) AS active_job_titles,
            (SELECT COUNT(*)::int FROM employee_profiles WHERE tenant_id = $1 AND is_active = true) AS active_employee_profiles,
            (SELECT COUNT(*)::int FROM shifts WHERE tenant_id = $1 AND is_active = true) AS active_shifts,
            (SELECT COUNT(*)::int FROM work_patterns WHERE tenant_id = $1 AND is_active = true) AS active_work_patterns,
            (SELECT COUNT(*)::int FROM holidays WHERE tenant_id = $1 AND is_active = true) AS active_holidays,
            (
              SELECT COUNT(*)::int
              FROM holidays h
              WHERE h.tenant_id = $1
                AND h.is_active = true
                AND date_trunc('year', h.holiday_date::timestamp) = date_trunc('year', CURRENT_DATE::timestamp)
            ) AS holidays_current_year,
            (
              SELECT COUNT(*)::int
              FROM holidays h
              WHERE h.tenant_id = $1
                AND h.is_active = true
                AND h.holiday_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '90 days')
            ) AS holidays_next_90_days,
            (SELECT holiday_date FROM next_holiday) AS next_holiday_date,
            (SELECT holiday_name FROM next_holiday) AS next_holiday_name,
            (SELECT total FROM pending_absence) AS pending_absence_requests,
            (SELECT total FROM pending_shift_change) AS pending_shift_change_requests,
            (SELECT COUNT(*)::int FROM effective_punches_30) AS total_punches_30d,
            (
              SELECT COUNT(*)::int
              FROM employee_time_punches p
              WHERE p.tenant_id = $1
                AND p.is_active = true
                AND p.punch_datetime >= (now() - interval '7 days')
            ) AS total_punches_7d,
            (
              SELECT COUNT(*)::int
              FROM employee_time_punches p
              WHERE p.tenant_id = $1
                AND p.is_active = true
                AND p.punch_datetime >= CURRENT_DATE
                AND p.punch_datetime < (CURRENT_DATE + INTERVAL '1 day')
            ) AS total_punches_today,
            (SELECT COUNT(DISTINCT employee_id)::int FROM effective_punches_30) AS employees_punched_30d,
            (
              SELECT COUNT(DISTINCT ep.work_location_id)::int
              FROM effective_punches_30 ep
              WHERE ep.work_location_id IS NOT NULL
            ) AS work_locations_with_activity_30d,
            (
              SELECT COUNT(*)::int
              FROM effective_punches_30 ep
              JOIN work_locations wl
                ON wl.id = ep.work_location_id
               AND wl.tenant_id = $1
              WHERE wl.geofence_polygon IS NULL
            ) AS virtual_location_punches_30d,
            (
              SELECT COUNT(DISTINCT ep.employee_id)::int
              FROM effective_punches_30 ep
              JOIN work_locations wl
                ON wl.id = ep.work_location_id
               AND wl.tenant_id = $1
              WHERE wl.geofence_polygon IS NULL
            ) AS virtual_location_employees_30d,
            (
              SELECT COUNT(*)::int
              FROM time_clock_devices d
              WHERE d.tenant_id = $1
                AND d.is_active = true
            ) AS active_devices,
            (
              SELECT COUNT(*)::int
              FROM device_status
              WHERE last_punch_datetime >= (now() - interval '24 hours')
            ) AS devices_reporting_24h,
            (
              SELECT COUNT(*)::int
              FROM device_status
              WHERE last_punch_datetime IS NULL
            ) AS devices_never_reported,
            (
              SELECT COUNT(*)::int
              FROM device_status
              WHERE last_punch_datetime IS NULL
                 OR last_punch_datetime < (now() - interval '72 hours')
            ) AS devices_without_punch_72h,
            (
              SELECT COUNT(*)::int
              FROM employees e
              WHERE e.tenant_id = $1
                AND e.is_active = true
                AND NOT EXISTS (
                  SELECT 1
                  FROM assigned_employees ae
                  WHERE ae.employee_id = e.id
                )
            ) AS employees_without_supervisor
        `,
        [tenantId]
      ),
      pool.query(
        `
          SELECT
            s.id,
            s.shift_name,
            s.shift_short_name,
            s.start_time,
            s.work_minutes,
            s.lunch_minutes,
            s.shift_icon_key,
            s.shift_bg_color,
            s.shift_text_color
          FROM shifts s
          WHERE s.tenant_id = $1
            AND s.is_active = true
          ORDER BY s.shift_name ASC
          LIMIT 10
        `,
        [tenantId]
      ),
      pool.query(
        `
          SELECT
            wp.id,
            wp.pattern_name,
            wp.pattern_short_name,
            wp.cycle_length_days,
            wp.work_days_per_cycle,
            wp.rest_days_per_cycle,
            wp.daily_work_minutes,
            wp.weekly_work_minutes_target,
            wp.is_flexible
          FROM work_patterns wp
          WHERE wp.tenant_id = $1
            AND wp.is_active = true
          ORDER BY wp.pattern_name ASC
          LIMIT 100
        `,
        [tenantId]
      ),
      pool.query(
        `
          SELECT
            h.id,
            h.company_id,
            c.company_name,
            h.holiday_date,
            h.holiday_name,
            h.is_paid
          FROM holidays h
          LEFT JOIN companies c
            ON c.id = h.company_id
          WHERE h.tenant_id = $1
            AND h.is_active = true
            AND h.holiday_date >= $2::date
            AND h.holiday_date < $3::date
          ORDER BY h.holiday_date ASC, h.holiday_name ASC
        `,
        [tenantId, monthStartIso, monthEndIso]
      ),
      pool.query(
        `
          SELECT
            d.id,
            d.company_id,
            c.company_name,
            d.device_name,
            d.device_serial_number,
            d.device_model,
            d.device_location,
            d.work_location_id,
            wl.work_location_name,
            wl.legacy_id AS work_location_code,
            wl.geofence_polygon,
            d.latitude,
            d.longitude
          FROM time_clock_devices d
          LEFT JOIN companies c
            ON c.id = d.company_id
          LEFT JOIN work_locations wl
            ON wl.id = d.work_location_id
          WHERE d.tenant_id = $1
            AND d.is_active = true
          ORDER BY c.company_name ASC, d.device_name ASC
        `,
        [tenantId]
      ),
      pool.query(
        `
          WITH employee_counts AS (
            SELECT ec.company_id, COUNT(DISTINCT ec.employee_id)::int AS employees
            FROM employee_companies ec
            JOIN employees e
              ON e.id = ec.employee_id
             AND e.tenant_id = ec.tenant_id
             AND e.is_active = true
            WHERE ec.tenant_id = $1
              AND ec.is_active = true
            GROUP BY ec.company_id
          ),
          location_counts AS (
            SELECT wl.company_id, COUNT(*)::int AS locations
            FROM work_locations wl
            WHERE wl.tenant_id = $1
              AND wl.is_active = true
            GROUP BY wl.company_id
          ),
          device_counts AS (
            SELECT d.company_id, COUNT(*)::int AS devices
            FROM time_clock_devices d
            WHERE d.tenant_id = $1
              AND d.is_active = true
            GROUP BY d.company_id
          ),
          punch_counts AS (
            SELECT
              p.company_id,
              COUNT(*)::int AS punches_30d,
              COUNT(DISTINCT p.employee_id)::int AS employees_punched_30d
            FROM employee_time_punches p
            WHERE p.tenant_id = $1
              AND p.is_active = true
              AND p.punch_datetime >= (now() - interval '30 days')
            GROUP BY p.company_id
          )
          SELECT
            c.id AS company_id,
            c.company_name,
            COALESCE(ec.employees, 0) AS employees,
            COALESCE(lc.locations, 0) AS locations,
            COALESCE(dc.devices, 0) AS devices,
            COALESCE(pc.punches_30d, 0) AS punches_30d,
            COALESCE(pc.employees_punched_30d, 0) AS employees_punched_30d
          FROM companies c
          LEFT JOIN employee_counts ec ON ec.company_id = c.id
          LEFT JOIN location_counts lc ON lc.company_id = c.id
          LEFT JOIN device_counts dc ON dc.company_id = c.id
          LEFT JOIN punch_counts pc ON pc.company_id = c.id
          WHERE c.tenant_id = $1
            AND c.is_active = true
          ORDER BY COALESCE(pc.punches_30d, 0) DESC, c.company_name ASC
          LIMIT 12
        `,
        [tenantId]
      ),
      pool.query(
        `
          WITH effective_punches AS (
            SELECT
              p.employee_id,
              p.company_id,
              COALESCE(d.work_location_id, ec.work_location_id) AS work_location_id
            FROM employee_time_punches p
            LEFT JOIN time_clock_devices d
              ON d.id = p.time_clock_device_id
            LEFT JOIN LATERAL (
              SELECT ec.work_location_id
              FROM employee_companies ec
              WHERE ec.tenant_id = p.tenant_id
                AND ec.employee_id = p.employee_id
                AND ec.company_id = p.company_id
                AND ec.is_active = true
              ORDER BY ec.updated_at DESC NULLS LAST, ec.created_at DESC NULLS LAST
              LIMIT 1
            ) ec ON d.work_location_id IS NULL
            WHERE p.tenant_id = $1
              AND p.is_active = true
              AND p.punch_datetime >= (now() - interval '30 days')
          ),
          device_counts AS (
            SELECT d.work_location_id, COUNT(*)::int AS devices
            FROM time_clock_devices d
            WHERE d.tenant_id = $1
              AND d.is_active = true
              AND d.work_location_id IS NOT NULL
            GROUP BY d.work_location_id
          ),
          punch_counts AS (
            SELECT
              ep.work_location_id,
              COUNT(*)::int AS punches_30d,
              COUNT(DISTINCT ep.employee_id)::int AS employees_punched_30d
            FROM effective_punches ep
            WHERE ep.work_location_id IS NOT NULL
            GROUP BY ep.work_location_id
          )
          SELECT
            wl.id AS work_location_id,
            wl.work_location_name,
            wl.legacy_id AS work_location_code,
            c.company_name,
            CASE WHEN wl.geofence_polygon IS NULL THEN true ELSE false END AS is_virtual_location,
            CASE WHEN wl.geofence_polygon IS NULL THEN 'Sin geocerca / virtual' ELSE 'Con geocerca' END AS location_kind,
            COALESCE(dc.devices, 0) AS devices,
            COALESCE(pc.punches_30d, 0) AS punches_30d,
            COALESCE(pc.employees_punched_30d, 0) AS employees_punched_30d
          FROM work_locations wl
          LEFT JOIN companies c ON c.id = wl.company_id
          LEFT JOIN device_counts dc ON dc.work_location_id = wl.id
          LEFT JOIN punch_counts pc ON pc.work_location_id = wl.id
          WHERE wl.tenant_id = $1
            AND wl.is_active = true
          ORDER BY COALESCE(pc.punches_30d, 0) DESC, wl.work_location_name ASC
          LIMIT 15
        `,
        [tenantId]
      ),
      pool.query(
        `
          WITH source_counts AS (
            SELECT
              COALESCE(NULLIF(TRIM(src.lookup_label), ''), NULLIF(TRIM(src.lookup_key), ''), CASE WHEN p.time_clock_device_id IS NULL THEN 'Sin dispositivo' ELSE 'Dispositivo' END) AS source_name,
              COUNT(*)::int AS punches_30d,
              COUNT(DISTINCT p.employee_id)::int AS employees_punched_30d
            FROM employee_time_punches p
            LEFT JOIN lookup_values src
              ON src.id = p.punch_source_id
            WHERE p.tenant_id = $1
              AND p.is_active = true
              AND p.punch_datetime >= (now() - interval '30 days')
            GROUP BY 1
          )
          SELECT
            source_name,
            punches_30d,
            employees_punched_30d,
            SUM(punches_30d) OVER ()::int AS total_punches_30d
          FROM source_counts
          ORDER BY punches_30d DESC, source_name ASC
          LIMIT 10
        `,
        [tenantId]
      ),
      pool.query(
        `
          WITH last_punch AS (
            SELECT
              p.time_clock_device_id,
              MAX(p.punch_datetime) AS last_punch_datetime
            FROM employee_time_punches p
            WHERE p.tenant_id = $1
              AND p.is_active = true
              AND p.time_clock_device_id IS NOT NULL
            GROUP BY p.time_clock_device_id
          )
          SELECT
            d.id AS device_id,
            COALESCE(NULLIF(TRIM(d.device_name), ''), 'Sin nombre') AS device_name,
            COALESCE(NULLIF(TRIM(d.device_serial_number), ''), '-') AS device_serial_number,
            COALESCE(c.company_name, '-') AS company_name,
            COALESCE(wl.work_location_name, d.device_location, '-') AS location_name,
            COALESCE(dt.lookup_label, dt.lookup_key, '-') AS device_type,
            lp.last_punch_datetime,
            CASE
              WHEN lp.last_punch_datetime IS NULL THEN NULL
              ELSE ROUND((EXTRACT(EPOCH FROM (now() - lp.last_punch_datetime)) / 3600.0)::numeric, 2)
            END AS hours_without_punch,
            CASE WHEN lp.last_punch_datetime IS NULL THEN 1 ELSE 0 END AS never_punched
          FROM time_clock_devices d
          LEFT JOIN companies c ON c.id = d.company_id
          LEFT JOIN work_locations wl ON wl.id = d.work_location_id
          LEFT JOIN lookup_values dt ON dt.id = d.device_type_id
          LEFT JOIN last_punch lp ON lp.time_clock_device_id = d.id
          WHERE d.tenant_id = $1
            AND d.is_active = true
          ORDER BY
            CASE WHEN lp.last_punch_datetime IS NULL THEN 1 ELSE 0 END DESC,
            hours_without_punch DESC NULLS LAST,
            d.device_name ASC
          LIMIT 12
        `,
        [tenantId]
      ),
      pool.query(
        `
          WITH days AS (
            SELECT gs::date AS day
            FROM generate_series((CURRENT_DATE - interval '29 days')::date, CURRENT_DATE::date, interval '1 day') gs
          ),
          daily AS (
            SELECT p.punch_datetime::date AS day, COUNT(*)::int AS punches
            FROM employee_time_punches p
            WHERE p.tenant_id = $1
              AND p.is_active = true
              AND p.punch_datetime >= (CURRENT_DATE - interval '29 days')
            GROUP BY 1
          )
          SELECT
            d.day,
            TO_CHAR(d.day, 'YYYY/MM/DD') AS day_label,
            COALESCE(daily.punches, 0)::int AS punches
          FROM days d
          LEFT JOIN daily ON daily.day = d.day
          ORDER BY d.day
        `,
        [tenantId]
      ),
    ]);

    return res.status(200).json({
      success: true,
      tenant: tenantInfoRes.rows[0] || null,
      metrics: countersRes.rows[0] || {},
      shifts: shiftsRes.rows || [],
      work_patterns: workPatternsRes.rows || [],
      calendar: {
        month: monthKey,
        month_start: monthStartIso,
        month_end_exclusive: monthEndIso,
        holidays: monthCalendarRes.rows || [],
      },
      devices: devicesRes.rows || [],
      company_activity: companyActivityRes.rows || [],
      location_activity: locationActivityRes.rows || [],
      punch_sources: punchSourceRes.rows || [],
      device_health: deviceHealthRes.rows || [],
      weekly_punches: weeklyPunchesRes.rows || [],
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Internal server error',
    });
  }
});

router.get('/dashboard/system-admin-summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const authUserId = user?.id;
    if (!authUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const roleCheck = await pool.query(
      `
        SELECT 1
        FROM users u
        JOIN user_roles ur
          ON ur.user_id = u.id
         AND ur.is_active = true
        JOIN roles r
          ON r.id = ur.role_id
         AND r.is_active = true
        WHERE u.auth_user_id = $1
          AND u.is_active = true
          AND r.role_key = 'SYSTEM_ADMIN'
        LIMIT 1
      `,
      [authUserId]
    );

    if (!roleCheck.rows[0]) {
      return res.status(403).json({ error: 'Acceso solo permitido para SYSTEM_ADMIN' });
    }

    const now = new Date();
    const parsedYear = Number(req.query.year);
    const safeYear = Number.isFinite(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
      ? Math.trunc(parsedYear)
      : now.getFullYear();

    const parsedWeekStep = Number(req.query.week_step);
    const safeWeekStep = [1, 2, 4, 8].includes(parsedWeekStep) ? parsedWeekStep : 1;

    const yearStart = `${safeYear}-01-01`;
    const yearEnd = `${safeYear + 1}-01-01`;

    const [
      metricsResult,
      weeklyEmployeesResult,
      weeklyPunchesResult,
      devicesResult,
      topCompaniesResult,
      staleDevicesResult,
      diagnosticsResult,
      unsupervisedEmployeesResult,
    ] = await Promise.all([
      pool.query(
        `
          WITH pending_absence AS (
            SELECT COUNT(*)::int AS total
            FROM employee_absence_requests ear
            LEFT JOIN lookup_values lv
              ON lv.id = ear.request_status_id
            WHERE ear.is_active = true
              AND UPPER(COALESCE(lv.lookup_key, '')) = 'PENDING'
          ),
          pending_shift_change AS (
            SELECT COUNT(*)::int AS total
            FROM employee_shift_change_requests escr
            LEFT JOIN lookup_values lv
              ON lv.id = escr.request_status_id
            WHERE escr.is_active = true
              AND UPPER(COALESCE(lv.lookup_key, '')) = 'PENDING'
          ),
          punches_30 AS (
            SELECT COUNT(*)::int AS total
            FROM employee_time_punches p
            WHERE p.is_active = true
              AND p.punch_datetime >= (now() - interval '30 days')
          ),
          active_companies AS (
            SELECT COUNT(*)::int AS total
            FROM companies c
            WHERE c.is_active = true
          ),
          companies_with_activity AS (
            SELECT COUNT(DISTINCT COALESCE(p.company_id, ec.company_id))::int AS total
            FROM employee_time_punches p
            LEFT JOIN LATERAL (
              SELECT ec.company_id
              FROM employee_companies ec
              WHERE ec.tenant_id = p.tenant_id
                AND ec.employee_id = p.employee_id
                AND ec.is_active = true
              ORDER BY ec.updated_at DESC NULLS LAST, ec.created_at DESC NULLS LAST
              LIMIT 1
            ) ec ON p.company_id IS NULL
            JOIN companies c
              ON c.id = COALESCE(p.company_id, ec.company_id)
             AND c.is_active = true
            WHERE p.is_active = true
              AND p.punch_datetime >= (now() - interval '30 days')
          )
          SELECT
            (SELECT total FROM active_companies) AS active_companies,
            (SELECT total FROM companies_with_activity) AS active_companies_with_activity_30d,
            CASE
              WHEN (SELECT total FROM active_companies) = 0 THEN 0
              ELSE ROUND(
                ((SELECT total FROM companies_with_activity)::numeric / (SELECT total FROM active_companies)::numeric) * 100.0,
                2
              )
            END AS company_activity_rate_30d,
            (SELECT COUNT(*)::int FROM users WHERE is_active = true) AS active_users,
            (SELECT COUNT(*)::int FROM employees WHERE is_active = true) AS active_employees,
            (SELECT COUNT(*)::int FROM time_clock_devices WHERE is_active = true) AS active_devices,
            (SELECT COUNT(*)::int FROM employee_time_punches WHERE is_active = true) AS total_punches,
            (SELECT total FROM punches_30) AS total_punches_30d,
            (
              SELECT COUNT(*)::int
              FROM employee_time_punches p
              WHERE p.is_active = true
                AND p.punch_datetime >= CURRENT_DATE
                AND p.punch_datetime < (CURRENT_DATE + INTERVAL '1 day')
            ) AS total_punches_today,
            (
              SELECT COUNT(*)::int
              FROM employee_time_punches p
              WHERE p.is_active = true
                AND p.punch_datetime >= $1::date
                AND p.punch_datetime < $2::date
            ) AS total_punches_year,
            CASE
              WHEN (SELECT COUNT(*)::int FROM employees WHERE is_active = true) = 0 THEN 0
              ELSE ROUND(
                (SELECT total FROM punches_30)::numeric / (SELECT COUNT(*)::numeric FROM employees WHERE is_active = true),
                2
              )
            END AS avg_punches_per_employee_30d,
            (SELECT total FROM pending_absence) AS pending_absence_requests,
            (SELECT total FROM pending_shift_change) AS pending_shift_change_requests
        `,
        [yearStart, yearEnd]
      ),
      pool.query(
        `
          WITH weeks AS (
            SELECT
              gs::date AS week_start,
              ROW_NUMBER() OVER (ORDER BY gs)::int AS week_index,
              TO_CHAR(gs::date, 'IW')::int AS iso_week
            FROM generate_series(
              date_trunc('week', $1::date)::timestamp,
              date_trunc('week', ($2::date - interval '1 day'))::timestamp,
              interval '1 week'
            ) gs
            WHERE gs < $2::date
          ),
          base AS (
            SELECT COUNT(*)::int AS base_count
            FROM employees e
            WHERE e.is_active = true
              AND e.created_at < $1::date
          ),
          weekly_new AS (
            SELECT
              date_trunc('week', e.created_at)::date AS week_start,
              COUNT(*)::int AS new_employees
            FROM employees e
            WHERE e.is_active = true
              AND e.created_at >= $1::date
              AND e.created_at < $2::date
            GROUP BY 1
          ),
          combined AS (
            SELECT
              w.week_start,
              w.week_index,
              w.iso_week,
              COALESCE(wn.new_employees, 0)::int AS new_employees
            FROM weeks w
            LEFT JOIN weekly_new wn
              ON wn.week_start = w.week_start
          )
          SELECT
            c.week_start,
            c.week_index,
            c.iso_week,
            c.new_employees,
            (
              (SELECT base_count FROM base)
              + SUM(c.new_employees) OVER (ORDER BY c.week_start ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
            )::int AS cumulative_employees
          FROM combined c
          WHERE ((c.week_index - 1) % $3::int) = 0
             OR c.week_index = (SELECT MAX(week_index) FROM combined)
          ORDER BY c.week_start
        `,
        [yearStart, yearEnd, safeWeekStep]
      ),
      pool.query(
        `
          WITH weeks AS (
            SELECT
              gs::date AS week_start,
              ROW_NUMBER() OVER (ORDER BY gs)::int AS week_index,
              TO_CHAR(gs::date, 'IW')::int AS iso_week
            FROM generate_series(
              date_trunc('week', $1::date)::timestamp,
              date_trunc('week', ($2::date - interval '1 day'))::timestamp,
              interval '1 week'
            ) gs
            WHERE gs < $2::date
          ),
          weekly_punches AS (
            SELECT
              date_trunc('week', p.punch_datetime)::date AS week_start,
              COUNT(*)::int AS punches
            FROM employee_time_punches p
            WHERE p.is_active = true
              AND p.punch_datetime >= $1::date
              AND p.punch_datetime < $2::date
            GROUP BY 1
          ),
          combined AS (
            SELECT
              w.week_start,
              w.week_index,
              w.iso_week,
              COALESCE(wp.punches, 0)::int AS punches
            FROM weeks w
            LEFT JOIN weekly_punches wp
              ON wp.week_start = w.week_start
          )
          SELECT
            c.week_start,
            c.week_index,
            c.iso_week,
            c.punches,
            SUM(c.punches) OVER (ORDER BY c.week_start ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)::int AS cumulative_punches
          FROM combined c
          WHERE ((c.week_index - 1) % $3::int) = 0
             OR c.week_index = (SELECT MAX(week_index) FROM combined)
          ORDER BY c.week_start
        `,
        [yearStart, yearEnd, safeWeekStep]
      ),
      pool.query(
        `
          WITH base AS (
            SELECT
              COALESCE(NULLIF(TRIM(d.device_name), ''), 'Sin dispositivo') AS device_name,
              COUNT(*)::int AS punches
            FROM employee_time_punches p
            LEFT JOIN time_clock_devices d
              ON d.id = p.time_clock_device_id
            WHERE p.is_active = true
              AND p.punch_datetime >= (now() - interval '90 days')
            GROUP BY 1
          )
          SELECT
            b.device_name,
            b.punches,
            SUM(b.punches) OVER ()::int AS total_punches_90d
          FROM base b
          ORDER BY b.punches DESC, b.device_name ASC
          LIMIT 12
        `
      ),
      pool.query(
        `
          SELECT
            c.company_name,
            COUNT(*)::int AS punches_30d
          FROM employee_time_punches p
          LEFT JOIN LATERAL (
            SELECT ec.company_id
            FROM employee_companies ec
            WHERE ec.tenant_id = p.tenant_id
              AND ec.employee_id = p.employee_id
              AND ec.is_active = true
            ORDER BY ec.updated_at DESC NULLS LAST, ec.created_at DESC NULLS LAST
            LIMIT 1
          ) ec ON p.company_id IS NULL
          JOIN companies c
            ON c.id = COALESCE(p.company_id, ec.company_id)
           AND c.is_active = true
          WHERE p.is_active = true
            AND p.punch_datetime >= (now() - interval '30 days')
          GROUP BY c.company_name
          ORDER BY punches_30d DESC, c.company_name ASC
          LIMIT 10
        `
      ),
      pool.query(
        `
          WITH last_punch AS (
            SELECT
              p.time_clock_device_id,
              MAX(p.punch_datetime) AS last_punch_datetime
            FROM employee_time_punches p
            WHERE p.is_active = true
              AND p.time_clock_device_id IS NOT NULL
            GROUP BY p.time_clock_device_id
          )
          SELECT
            d.id AS device_id,
            COALESCE(NULLIF(TRIM(d.device_name), ''), 'Sin nombre') AS device_name,
            COALESCE(NULLIF(TRIM(d.device_serial_number), ''), '-') AS device_serial_number,
            COALESCE(c.company_name, '-') AS company_name,
            COALESCE(wl.work_location_name, d.device_location, '-') AS location_name,
            lp.last_punch_datetime,
            CASE
              WHEN lp.last_punch_datetime IS NULL THEN NULL
              ELSE ROUND((EXTRACT(EPOCH FROM (now() - lp.last_punch_datetime)) / 3600.0)::numeric, 2)
            END AS hours_without_punch,
            CASE
              WHEN lp.last_punch_datetime IS NULL THEN 1
              ELSE 0
            END AS never_punched
          FROM time_clock_devices d
          LEFT JOIN companies c
            ON c.id = d.company_id
          LEFT JOIN work_locations wl
            ON wl.id = d.work_location_id
          LEFT JOIN last_punch lp
            ON lp.time_clock_device_id = d.id
          WHERE d.is_active = true
          ORDER BY
            CASE WHEN lp.last_punch_datetime IS NULL THEN 1 ELSE 0 END DESC,
            hours_without_punch DESC NULLS LAST,
            d.device_name ASC
          LIMIT 10
        `
      ),
      pool.query(
        `
          WITH assigned_employees AS (
            SELECT DISTINCT ura.tenant_id, ura.employee_id
            FROM user_role_employee_assignments ura
            JOIN user_roles ur
              ON ur.id = ura.user_role_id
             AND ur.tenant_id = ura.tenant_id
             AND ur.is_active = true
            JOIN roles r
              ON r.id = ur.role_id
             AND r.is_active = true
            WHERE ura.is_active = true
              AND UPPER(COALESCE(r.role_key, '')) IN ('SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN')
          ),
          device_status AS (
            SELECT
              d.id,
              MAX(p.punch_datetime) AS last_punch_datetime
            FROM time_clock_devices d
            LEFT JOIN employee_time_punches p
              ON p.time_clock_device_id = d.id
             AND p.is_active = true
            WHERE d.is_active = true
            GROUP BY d.id
          ),
          active_companies AS (
            SELECT id
            FROM companies
            WHERE is_active = true
          )
          SELECT
            (SELECT COUNT(*)::int FROM active_companies) AS active_companies,
            (
              SELECT COUNT(DISTINCT COALESCE(p.company_id, ec.company_id))::int
              FROM employee_time_punches p
              LEFT JOIN LATERAL (
                SELECT ec.company_id
                FROM employee_companies ec
                WHERE ec.tenant_id = p.tenant_id
                  AND ec.employee_id = p.employee_id
                  AND ec.is_active = true
                ORDER BY ec.updated_at DESC NULLS LAST, ec.created_at DESC NULLS LAST
                LIMIT 1
              ) ec ON p.company_id IS NULL
              JOIN active_companies c ON c.id = COALESCE(p.company_id, ec.company_id)
              WHERE p.is_active = true
                AND p.punch_datetime >= (now() - interval '7 days')
            ) AS companies_with_activity_7d,
            (
              SELECT COUNT(*)::int
              FROM employee_time_punches p
              WHERE p.is_active = true
                AND p.punch_datetime >= (now() - interval '24 hours')
            ) AS punches_24h,
            (
              SELECT COUNT(*)::int
              FROM employee_time_punches p
              WHERE p.is_active = true
                AND p.punch_datetime >= (now() - interval '7 days')
            ) AS punches_7d,
            (
              SELECT COUNT(*)::int
              FROM time_clock_devices
              WHERE is_active = true
            ) AS active_devices,
            (
              SELECT COUNT(*)::int
              FROM device_status
              WHERE last_punch_datetime >= (now() - interval '24 hours')
            ) AS devices_reporting_24h,
            (
              SELECT COUNT(*)::int
              FROM device_status
              WHERE last_punch_datetime IS NULL
            ) AS devices_never_reported,
            (
              SELECT COUNT(*)::int
              FROM device_status
              WHERE last_punch_datetime IS NULL
                 OR last_punch_datetime < (now() - interval '72 hours')
            ) AS devices_without_punch_72h,
            (
              SELECT COUNT(*)::int
              FROM employees e
              WHERE e.is_active = true
            ) AS active_employees,
            (
              SELECT COUNT(*)::int
              FROM employees e
              WHERE e.is_active = true
                AND NOT EXISTS (
                  SELECT 1
                  FROM assigned_employees ae
                  WHERE ae.tenant_id = e.tenant_id
                    AND ae.employee_id = e.id
                )
            ) AS employees_without_supervisor,
            (
              SELECT COUNT(*)::int
              FROM employees e
              WHERE e.is_active = true
                AND e.user_id IS NULL
            ) AS employees_without_user,
            (
              SELECT COUNT(*)::int
              FROM employees e
              WHERE e.is_active = true
                AND NOT EXISTS (
                  SELECT 1
                  FROM employee_companies ec
                  WHERE ec.tenant_id = e.tenant_id
                    AND ec.employee_id = e.id
                    AND ec.is_active = true
                )
            ) AS employees_without_company,
            (
              SELECT COUNT(DISTINCT ec.employee_id)::int
              FROM employee_companies ec
              JOIN employees e
                ON e.id = ec.employee_id
               AND e.tenant_id = ec.tenant_id
               AND e.is_active = true
              WHERE ec.is_active = true
                AND (
                  ec.company_id IS NULL
                  OR ec.work_location_id IS NULL
                  OR ec.department_id IS NULL
                  OR ec.area_id IS NULL
                )
            ) AS employees_with_incomplete_org,
            (
              SELECT COUNT(*)::int
              FROM users u
              WHERE u.is_active = true
                AND NOT EXISTS (
                  SELECT 1
                  FROM user_roles ur
                  WHERE ur.user_id = u.id
                    AND ur.tenant_id = u.tenant_id
                    AND ur.is_active = true
                )
            ) AS users_without_role
        `
      ),
      pool.query(
        `
          WITH assigned_employees AS (
            SELECT DISTINCT ura.tenant_id, ura.employee_id
            FROM user_role_employee_assignments ura
            JOIN user_roles ur
              ON ur.id = ura.user_role_id
             AND ur.tenant_id = ura.tenant_id
             AND ur.is_active = true
            JOIN roles r
              ON r.id = ur.role_id
             AND r.is_active = true
            WHERE ura.is_active = true
              AND UPPER(COALESCE(r.role_key, '')) IN ('SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN')
          )
          SELECT
            e.employee_code,
            e.employee_lastname,
            e.employee_name,
            COALESCE(c.company_name, '-') AS company_name,
            COALESCE(wl.work_location_name, '-') AS work_location_name
          FROM employees e
          LEFT JOIN LATERAL (
            SELECT ec.company_id, ec.work_location_id
            FROM employee_companies ec
            WHERE ec.tenant_id = e.tenant_id
              AND ec.employee_id = e.id
              AND ec.is_active = true
            ORDER BY ec.updated_at DESC NULLS LAST, ec.created_at DESC NULLS LAST
            LIMIT 1
          ) ec ON true
          LEFT JOIN companies c
            ON c.id = ec.company_id
          LEFT JOIN work_locations wl
            ON wl.id = ec.work_location_id
          WHERE e.is_active = true
            AND NOT EXISTS (
              SELECT 1
              FROM assigned_employees ae
              WHERE ae.tenant_id = e.tenant_id
                AND ae.employee_id = e.id
            )
          ORDER BY c.company_name, e.employee_lastname, e.employee_name
          LIMIT 12
        `
      ),
    ]);

    const weeklyEmployees = (weeklyEmployeesResult.rows || []).map((row: any) => ({
      week_start: row.week_start,
      week_index: Number(row.week_index) || 0,
      iso_week: Number(row.iso_week) || 0,
      week_label: `S${String(row.iso_week || '').padStart(2, '0')}`,
      new_employees: Number(row.new_employees) || 0,
      cumulative_employees: Number(row.cumulative_employees) || 0,
    }));

    const weeklyPunches = (weeklyPunchesResult.rows || []).map((row: any) => ({
      week_start: row.week_start,
      week_index: Number(row.week_index) || 0,
      iso_week: Number(row.iso_week) || 0,
      week_label: `S${String(row.iso_week || '').padStart(2, '0')}`,
      punches: Number(row.punches) || 0,
      cumulative_punches: Number(row.cumulative_punches) || 0,
    }));

    const devices = (devicesResult.rows || []).map((row: any) => {
      const punches = Number(row.punches) || 0;
      const total = Number(row.total_punches_90d) || 0;
      return {
        device_name: row.device_name,
        punches,
        percentage: total > 0 ? Number(((punches / total) * 100).toFixed(2)) : 0,
      };
    });

    return res.status(200).json({
      success: true,
      filters: {
        year: safeYear,
        week_step: safeWeekStep,
      },
      metrics: metricsResult.rows?.[0] || {},
      weekly_employees: weeklyEmployees,
      weekly_punches: weeklyPunches,
      device_distribution_90d: devices,
      top_companies_30d: topCompaniesResult.rows || [],
      stale_devices: staleDevicesResult.rows || [],
      diagnostics: diagnosticsResult.rows?.[0] || {},
      unsupervised_employees: unsupervisedEmployeesResult.rows || [],
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Internal server error',
    });
  }
});

router.get('/dashboard/supervisor-summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const authUserId = user?.id;
    if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });

    const contextResult = await pool.query(
      `
        SELECT
          u.id AS user_id,
          u.email,
          u.display_name,
          u.tenant_id,
          t.tenant_name,
          ARRAY_AGG(DISTINCT UPPER(COALESCE(r.role_key, ''))) FILTER (WHERE r.role_key IS NOT NULL) AS role_keys
        FROM public.users u
        LEFT JOIN public.tenants t
          ON t.id = u.tenant_id
        LEFT JOIN public.user_roles ur
          ON ur.user_id = u.id
         AND ur.is_active = true
         AND (ur.valid_from IS NULL OR ur.valid_from <= now())
         AND (ur.valid_to IS NULL OR ur.valid_to >= now())
        LEFT JOIN public.roles r
          ON r.id = ur.role_id
         AND r.is_active = true
        WHERE u.auth_user_id = $1
          AND u.is_active = true
        GROUP BY u.id, u.email, u.display_name, u.tenant_id, t.tenant_name
        LIMIT 1
      `,
      [authUserId]
    );

    const context = contextResult.rows[0];
    if (!context?.tenant_id || !context?.user_id) {
      return res.status(403).json({ error: 'No se pudo resolver contexto de supervisor' });
    }

    const roleKeys = (context.role_keys || []).map((key: string) => String(key || '').trim().toUpperCase());
    const canViewSupervisorDashboard = roleKeys.some((key: string) => ['SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN', 'TENANT_ADMIN'].includes(key));
    if (!canViewSupervisorDashboard) {
      return res.status(403).json({ error: 'Dashboard disponible para Supervisor/RRHH' });
    }

    const tenantId = String(context.tenant_id);
    const userId = String(context.user_id);
    const unrestrictedTenantAdmin = roleKeys.includes('TENANT_ADMIN') && !roleKeys.some((key: string) => ['SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN'].includes(key));

    const assignedEmployeesSql = unrestrictedTenantAdmin
      ? `
          SELECT DISTINCT ON (e.id)
            e.id AS employee_id,
            e.employee_code,
            e.employee_name,
            e.employee_lastname,
            ec.company_id,
            c.company_name,
            c.logo AS company_logo,
            c.banner AS company_banner,
            ec.work_location_id,
            wl.work_location_name,
            COALESCE(wl.country_id, c.company_country_id) AS employee_country_id,
            COALESCE(wl.state_id, c.company_state_id) AS employee_state_id,
            COALESCE(wl.city_id, c.company_city_id) AS employee_city_id,
            ec.department_id,
            d.department_name,
            ec.area_id,
            ar.area_name,
            ec.employee_profile_id,
            ep.profile_name AS employee_profile_name,
            ec.cost_center_id,
            cc.cost_center_name,
            ec.payroll_group_id,
            pg.payroll_group_name,
            ec.work_group_id,
            wg.work_group_name,
            ec.hire_date,
            ec.termination_date,
            COALESCE(ec.work_on_holidays, false) AS work_on_holidays
          FROM public.employees e
          INNER JOIN public.employee_companies ec
            ON ec.employee_id = e.id
           AND ec.tenant_id = e.tenant_id
           AND ec.is_active = true
          LEFT JOIN public.companies c ON c.id = ec.company_id
          LEFT JOIN public.work_locations wl ON wl.id = ec.work_location_id
          LEFT JOIN public.departments d ON d.id = ec.department_id
          LEFT JOIN public.areas ar ON ar.id = ec.area_id
          LEFT JOIN public.employee_profiles ep ON ep.id = ec.employee_profile_id
          LEFT JOIN public.cost_centers cc ON cc.id = ec.cost_center_id
          LEFT JOIN public.payroll_groups pg ON pg.id = ec.payroll_group_id
          LEFT JOIN public.work_groups wg ON wg.id = ec.work_group_id
          WHERE e.tenant_id = $1::uuid
            AND e.is_active = true
          ORDER BY e.id, ec.created_at DESC NULLS LAST
        `
      : `
          SELECT DISTINCT ON (e.id)
            e.id AS employee_id,
            e.employee_code,
            e.employee_name,
            e.employee_lastname,
            ec.company_id,
            c.company_name,
            c.logo AS company_logo,
            c.banner AS company_banner,
            ec.work_location_id,
            wl.work_location_name,
            COALESCE(wl.country_id, c.company_country_id) AS employee_country_id,
            COALESCE(wl.state_id, c.company_state_id) AS employee_state_id,
            COALESCE(wl.city_id, c.company_city_id) AS employee_city_id,
            ec.department_id,
            d.department_name,
            ec.area_id,
            ar.area_name,
            ec.employee_profile_id,
            ep.profile_name AS employee_profile_name,
            ec.cost_center_id,
            cc.cost_center_name,
            ec.payroll_group_id,
            pg.payroll_group_name,
            ec.work_group_id,
            wg.work_group_name,
            ec.hire_date,
            ec.termination_date,
            COALESCE(ec.work_on_holidays, false) AS work_on_holidays
          FROM public.user_roles ur
          INNER JOIN public.roles r
            ON r.id = ur.role_id
           AND r.tenant_id = ur.tenant_id
           AND r.is_active = true
          INNER JOIN public.user_role_employee_assignments ura
            ON ura.tenant_id = ur.tenant_id
           AND ura.user_role_id = ur.id
           AND ura.is_active = true
          INNER JOIN public.employees e
            ON e.id = ura.employee_id
           AND e.tenant_id = ura.tenant_id
           AND e.is_active = true
          INNER JOIN public.employee_companies ec
            ON ec.employee_id = e.id
           AND ec.tenant_id = e.tenant_id
           AND ec.is_active = true
          LEFT JOIN public.companies c ON c.id = ec.company_id
          LEFT JOIN public.work_locations wl ON wl.id = ec.work_location_id
          LEFT JOIN public.departments d ON d.id = ec.department_id
          LEFT JOIN public.areas ar ON ar.id = ec.area_id
          LEFT JOIN public.employee_profiles ep ON ep.id = ec.employee_profile_id
          LEFT JOIN public.cost_centers cc ON cc.id = ec.cost_center_id
          LEFT JOIN public.payroll_groups pg ON pg.id = ec.payroll_group_id
          LEFT JOIN public.work_groups wg ON wg.id = ec.work_group_id
          WHERE ur.tenant_id = $1::uuid
            AND ur.user_id = $2::uuid
            AND ur.is_active = true
            AND (ur.valid_from IS NULL OR ur.valid_from <= now())
            AND (ur.valid_to IS NULL OR ur.valid_to >= now())
            AND UPPER(COALESCE(r.role_key, '')) IN ('SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN')
          ORDER BY e.id, ec.created_at DESC NULLS LAST
        `;
    const scopedParams = unrestrictedTenantAdmin ? [tenantId] : [tenantId, userId];

    const assignedCountQuery = pool.query(
      `
        WITH assigned_employees AS (${assignedEmployeesSql})
        SELECT
          COUNT(*)::int AS assigned_employees,
          COUNT(DISTINCT area_id)::int AS assigned_areas,
          COUNT(DISTINCT department_id)::int AS assigned_departments
        FROM assigned_employees
      `,
      scopedParams
    );

    const todayScheduledEmployeesQuery = pool.query(
      `
        WITH assigned_employees AS (${assignedEmployeesSql}),
        today_plans AS (
          SELECT
            ae.employee_id,
            ae.area_id,
            sw.work_minutes::int AS work_minutes
          FROM assigned_employees ae
          INNER JOIN public.employee_shift_plans p
            ON p.employee_id = ae.employee_id
           AND p.tenant_id = $1::uuid
           AND p.is_active = true
           AND p.shift_date = CURRENT_DATE
           AND (ae.hire_date IS NULL OR p.shift_date >= ae.hire_date::date)
           AND (ae.termination_date IS NULL OR p.shift_date <= ae.termination_date::date)
          INNER JOIN public.shifts s
            ON s.id = p.shift_id
           AND s.tenant_id = p.tenant_id
          LEFT JOIN public.shift_constructors sc
            ON sc.shift_id = s.id
           AND sc.tenant_id = s.tenant_id
           AND sc.is_active = true
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*)::int AS active_block_count,
              COALESCE(SUM(b.end_minutes - b.start_minutes) FILTER (
                WHERE b.is_break = false
                  AND b.block_type IN ('ORDINARIA', 'NOCTURNA')
              ), 0)::int AS required_work_minutes
            FROM public.shift_constructor_blocks b
            WHERE b.constructor_id = sc.id
              AND b.tenant_id = sc.tenant_id
              AND b.is_active = true
          ) cb ON true
          LEFT JOIN LATERAL (
            SELECT CASE
              WHEN sc.id IS NOT NULL THEN COALESCE(cb.required_work_minutes, 0)
              ELSE COALESCE(s.work_minutes, 0)
            END::int AS work_minutes
          ) sw ON true
          LEFT JOIN LATERAL (
            SELECT h.id
            FROM public.holidays h
            WHERE h.tenant_id = p.tenant_id
              AND h.is_active = true
              AND (
                (COALESCE(h.is_recurring, false) = true AND EXTRACT(MONTH FROM h.holiday_date) = EXTRACT(MONTH FROM p.shift_date) AND EXTRACT(DAY FROM h.holiday_date) = EXTRACT(DAY FROM p.shift_date))
                OR (COALESCE(h.is_recurring, false) = false AND h.holiday_date = p.shift_date)
              )
              AND (h.company_id IS NULL OR h.company_id = ae.company_id)
              AND (h.country_id IS NULL OR h.country_id = ae.employee_country_id)
              AND (h.state_id IS NULL OR h.state_id = ae.employee_state_id)
              AND (h.city_id IS NULL OR h.city_id = ae.employee_city_id)
              AND (h.work_location_id IS NULL OR h.work_location_id = ae.work_location_id)
            ORDER BY
              CASE WHEN h.work_location_id IS NOT NULL THEN 16 ELSE 0 END +
              CASE WHEN h.city_id IS NOT NULL THEN 8 ELSE 0 END +
              CASE WHEN h.state_id IS NOT NULL THEN 4 ELSE 0 END +
              CASE WHEN h.country_id IS NOT NULL THEN 2 ELSE 0 END +
              CASE WHEN h.company_id IS NOT NULL THEN 1 ELSE 0 END DESC,
              h.holiday_name ASC
            LIMIT 1
          ) holiday ON true
          LEFT JOIN LATERAL (
            SELECT r.id
            FROM public.employee_absence_requests r
            INNER JOIN public.lookup_values rs
              ON rs.id = r.request_status_id
            WHERE r.tenant_id = p.tenant_id
              AND r.employee_id = ae.employee_id
              AND r.is_active = true
              AND UPPER(COALESCE(rs.lookup_key, '')) IN ('APPROVED', 'APROBADO')
              AND r.start_datetime::date <= p.shift_date
              AND COALESCE(r.end_datetime, r.start_datetime)::date >= p.shift_date
            ORDER BY r.start_datetime ASC, r.created_at ASC
            LIMIT 1
          ) approved_leave ON true
        )
        SELECT
          COUNT(DISTINCT employee_id)::int AS today_scheduled_employees,
          COUNT(DISTINCT area_id)::int AS today_scheduled_areas
        FROM today_plans
        WHERE work_minutes > 0
      `,
      scopedParams
    );

    const todayIssuesQuery = pool.query(
      `
        WITH assigned_employees AS (${assignedEmployeesSql}),
        today_plans AS (
          SELECT
            ae.*,
            p.shift_date,
            s.shift_name,
            s.shift_short_name,
            s.start_time,
            (EXTRACT(HOUR FROM s.start_time)::int * 60 + EXTRACT(MINUTE FROM s.start_time)::int) AS shift_start_minutes,
            holiday.id AS holiday_id,
            holiday.holiday_name,
            (holiday.id IS NOT NULL) AS is_holiday,
            approved_leave.id AS approved_leave_id,
            approved_leave.justification_name AS approved_leave_name,
            (approved_leave.id IS NOT NULL) AS has_approved_leave,
            sw.work_minutes::int AS work_minutes,
            sw.work_start_minutes,
            sw.work_end_minutes,
            COALESCE(s.entry_grace_minutes, 0)::int AS entry_grace_minutes,
            COALESCE(s.exit_grace_minutes, 0)::int AS exit_grace_minutes
          FROM assigned_employees ae
          INNER JOIN public.employee_shift_plans p
            ON p.employee_id = ae.employee_id
           AND p.tenant_id = $1::uuid
           AND p.is_active = true
           AND p.shift_date = CURRENT_DATE
           AND (ae.hire_date IS NULL OR p.shift_date >= ae.hire_date::date)
           AND (ae.termination_date IS NULL OR p.shift_date <= ae.termination_date::date)
          INNER JOIN public.shifts s
            ON s.id = p.shift_id
           AND s.tenant_id = p.tenant_id
          LEFT JOIN public.shift_constructors sc
            ON sc.shift_id = s.id
           AND sc.tenant_id = s.tenant_id
           AND sc.is_active = true
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*)::int AS active_block_count,
              COALESCE(MIN(b.start_minutes) FILTER (
                WHERE b.is_break = false
                  AND b.block_type IN ('ORDINARIA', 'NOCTURNA')
              ), 0)::int AS work_start_minutes,
              COALESCE(MAX(b.end_minutes) FILTER (
                WHERE b.is_break = false
                  AND b.block_type IN ('ORDINARIA', 'NOCTURNA')
              ), 0)::int AS work_end_minutes,
              COALESCE(SUM(b.end_minutes - b.start_minutes) FILTER (
                WHERE b.is_break = false
                  AND b.block_type IN ('ORDINARIA', 'NOCTURNA')
              ), 0)::int AS required_work_minutes
            FROM public.shift_constructor_blocks b
            WHERE b.constructor_id = sc.id
              AND b.tenant_id = sc.tenant_id
              AND b.is_active = true
          ) cb ON true
          LEFT JOIN LATERAL (
            SELECT
              CASE
                WHEN sc.id IS NOT NULL THEN COALESCE(cb.required_work_minutes, 0)
                ELSE COALESCE(s.work_minutes, 0)
              END::int AS work_minutes,
              CASE
                WHEN sc.id IS NOT NULL THEN COALESCE(cb.work_start_minutes, (EXTRACT(HOUR FROM s.start_time)::int * 60 + EXTRACT(MINUTE FROM s.start_time)::int))
                ELSE (EXTRACT(HOUR FROM s.start_time)::int * 60 + EXTRACT(MINUTE FROM s.start_time)::int)
              END::int AS work_start_minutes,
              CASE
                WHEN sc.id IS NOT NULL THEN COALESCE(cb.work_end_minutes, (EXTRACT(HOUR FROM s.start_time)::int * 60 + EXTRACT(MINUTE FROM s.start_time)::int) + COALESCE(s.work_minutes, 0))
                ELSE (EXTRACT(HOUR FROM s.start_time)::int * 60 + EXTRACT(MINUTE FROM s.start_time)::int) + COALESCE(s.work_minutes, 0)
              END::int AS work_end_minutes
          ) sw ON true
          LEFT JOIN LATERAL (
            SELECT h.id, h.holiday_name
            FROM public.holidays h
            WHERE h.tenant_id = p.tenant_id
              AND h.is_active = true
              AND (
                (COALESCE(h.is_recurring, false) = true AND EXTRACT(MONTH FROM h.holiday_date) = EXTRACT(MONTH FROM p.shift_date) AND EXTRACT(DAY FROM h.holiday_date) = EXTRACT(DAY FROM p.shift_date))
                OR (COALESCE(h.is_recurring, false) = false AND h.holiday_date = p.shift_date)
              )
              AND (h.company_id IS NULL OR h.company_id = ae.company_id)
              AND (h.country_id IS NULL OR h.country_id = ae.employee_country_id)
              AND (h.state_id IS NULL OR h.state_id = ae.employee_state_id)
              AND (h.city_id IS NULL OR h.city_id = ae.employee_city_id)
              AND (h.work_location_id IS NULL OR h.work_location_id = ae.work_location_id)
            ORDER BY
              CASE WHEN h.work_location_id IS NOT NULL THEN 16 ELSE 0 END +
              CASE WHEN h.city_id IS NOT NULL THEN 8 ELSE 0 END +
              CASE WHEN h.state_id IS NOT NULL THEN 4 ELSE 0 END +
              CASE WHEN h.country_id IS NOT NULL THEN 2 ELSE 0 END +
              CASE WHEN h.company_id IS NOT NULL THEN 1 ELSE 0 END DESC,
              h.holiday_name ASC
            LIMIT 1
          ) holiday ON true
          LEFT JOIN LATERAL (
            SELECT r.id, jt.justification_name
            FROM public.employee_absence_requests r
            INNER JOIN public.lookup_values rs
              ON rs.id = r.request_status_id
            LEFT JOIN public.justification_types jt
              ON jt.id = r.justification_type_id
            WHERE r.tenant_id = p.tenant_id
              AND r.employee_id = ae.employee_id
              AND r.is_active = true
              AND UPPER(COALESCE(rs.lookup_key, '')) IN ('APPROVED', 'APROBADO')
              AND r.start_datetime::date <= p.shift_date
              AND COALESCE(r.end_datetime, r.start_datetime)::date >= p.shift_date
            ORDER BY r.start_datetime ASC, r.created_at ASC
            LIMIT 1
          ) approved_leave ON true
        ),
        punch_summary AS (
          SELECT
            p.employee_id,
            MIN(p.punch_datetime) AS first_punch,
            MAX(p.punch_datetime) AS last_punch,
            (ARRAY_AGG(p.id ORDER BY p.punch_datetime ASC) FILTER (WHERE p.punch_key = 1))[1] AS work_entry_punch_id,
            (ARRAY_AGG(p.id ORDER BY p.punch_datetime DESC) FILTER (WHERE p.punch_key = 4))[1] AS work_exit_punch_id,
            MIN(p.punch_datetime) FILTER (WHERE p.punch_key = 1) AS work_entry,
            MAX(p.punch_datetime) FILTER (WHERE p.punch_key = 4) AS work_exit
          FROM public.employee_time_punches p
          WHERE p.tenant_id = $1::uuid
            AND p.is_active = true
            AND p.punch_datetime >= CURRENT_DATE
            AND p.punch_datetime < CURRENT_DATE + INTERVAL '1 day'
          GROUP BY p.employee_id
        )
        SELECT
          tp.employee_id,
          tp.employee_code,
          CONCAT(tp.employee_lastname, ' ', tp.employee_name) AS employee_name,
          tp.area_name,
          tp.department_name,
          tp.shift_name,
          tp.shift_short_name,
          tp.holiday_id,
          tp.holiday_name,
          tp.is_holiday,
          tp.approved_leave_id,
          tp.approved_leave_name,
          tp.has_approved_leave,
          tp.work_on_holidays,
          tp.start_time,
          tp.work_minutes,
          ps.work_entry AS first_entry,
          ps.work_exit AS last_exit,
          CASE
            WHEN tp.has_approved_leave THEN 'JUSTIFICADO'
            WHEN tp.is_holiday AND tp.work_on_holidays = false THEN 'NORMAL'
            WHEN ps.work_entry IS NULL THEN 'FALTA'
            WHEN ps.work_entry > (tp.shift_date + (tp.work_start_minutes || ' minutes')::interval + (tp.entry_grace_minutes || ' minutes')::interval)
             AND approved_late.id IS NOT NULL
              THEN 'JUSTIFICADO'
            WHEN ps.work_entry > (tp.shift_date + (tp.work_start_minutes || ' minutes')::interval + (tp.entry_grace_minutes || ' minutes')::interval)
              THEN 'ATRASO'
            WHEN ps.work_exit IS NOT NULL
             AND ps.work_exit < (tp.shift_date + (tp.work_end_minutes || ' minutes')::interval - (tp.exit_grace_minutes || ' minutes')::interval)
             AND approved_early.id IS NOT NULL
              THEN 'JUSTIFICADO'
            WHEN ps.work_exit IS NOT NULL
             AND ps.work_exit < (tp.shift_date + (tp.work_end_minutes || ' minutes')::interval - (tp.exit_grace_minutes || ' minutes')::interval)
              THEN 'SALIDA_ANTICIPADA'
            ELSE 'NORMAL'
          END AS event_key
        FROM today_plans tp
        LEFT JOIN punch_summary ps
          ON ps.employee_id = tp.employee_id
        LEFT JOIN LATERAL (
          SELECT r.id
          FROM public.employee_absence_requests r
          INNER JOIN public.lookup_values rs
            ON rs.id = r.request_status_id
          INNER JOIN public.attendance_events ae
            ON ae.id = r.attendance_event_id
          WHERE r.tenant_id = $1::uuid
            AND r.employee_id = tp.employee_id
            AND r.is_active = true
            AND UPPER(COALESCE(rs.lookup_key, '')) IN ('APPROVED', 'APROBADO')
            AND (
              UPPER(COALESCE(ae.event_name, '')) = 'ATRASO'
              OR UPPER(COALESCE(ae.event_short_name, '')) IN ('ATR', 'ATRASO')
            )
            AND r.target_punch_id = ps.work_entry_punch_id
          LIMIT 1
        ) approved_late ON true
        LEFT JOIN LATERAL (
          SELECT r.id
          FROM public.employee_absence_requests r
          INNER JOIN public.lookup_values rs
            ON rs.id = r.request_status_id
          INNER JOIN public.attendance_events ae
            ON ae.id = r.attendance_event_id
          WHERE r.tenant_id = $1::uuid
            AND r.employee_id = tp.employee_id
            AND r.is_active = true
            AND UPPER(COALESCE(rs.lookup_key, '')) IN ('APPROVED', 'APROBADO')
            AND (
              UPPER(COALESCE(ae.event_name, '')) = 'SALIDA ANTICIPADA'
              OR UPPER(COALESCE(ae.event_short_name, '')) IN ('SAN', 'SALIDA ANTICIPADA')
            )
            AND r.target_punch_id = ps.work_exit_punch_id
          LIMIT 1
        ) approved_early ON true
        WHERE
          tp.work_minutes > 0
          AND NOT (tp.is_holiday AND tp.work_on_holidays = false)
          AND (
            tp.has_approved_leave
            OR ps.work_entry IS NULL
            OR (
              ps.work_entry > (tp.shift_date + (tp.work_start_minutes || ' minutes')::interval + (tp.entry_grace_minutes || ' minutes')::interval)
            )
            OR (
              ps.work_exit IS NOT NULL
              AND ps.work_exit < (tp.shift_date + (tp.work_end_minutes || ' minutes')::interval - (tp.exit_grace_minutes || ' minutes')::interval)
            )
          )
        ORDER BY
          CASE
            WHEN tp.has_approved_leave THEN 4
            WHEN ps.work_entry IS NULL THEN 1
            WHEN ps.work_entry > (tp.shift_date + (tp.work_start_minutes || ' minutes')::interval + (tp.entry_grace_minutes || ' minutes')::interval)
              THEN CASE WHEN approved_late.id IS NOT NULL THEN 4 ELSE 2 END
            WHEN ps.work_exit IS NOT NULL
             AND ps.work_exit < (tp.shift_date + (tp.work_end_minutes || ' minutes')::interval - (tp.exit_grace_minutes || ' minutes')::interval)
              THEN CASE WHEN approved_early.id IS NOT NULL THEN 4 ELSE 3 END
            ELSE 4
          END,
          tp.employee_lastname,
          tp.employee_name
      `,
      scopedParams
    );

    const latestPunchesQuery = pool.query(
      `
        WITH assigned_employees AS (${assignedEmployeesSql}),
        latest AS (
          SELECT
            p.id,
            p.employee_id,
            p.punch_datetime,
            p.punch_key,
            p.notes,
            p.time_clock_device_id,
            d.device_name,
            d.device_serial_number,
            d.device_location,
            d.work_location_id AS device_work_location_id,
            dwl.work_location_short_name AS device_work_location_short_name,
            dwl.work_location_name AS device_work_location_name,
            ae.employee_code,
            CONCAT(ae.employee_lastname, ' ', ae.employee_name) AS employee_name,
            ae.area_name,
            ae.company_id,
            ae.work_location_id,
            ae.work_location_name AS employee_work_location_name,
            ae.employee_country_id,
            ae.employee_state_id,
            ae.employee_city_id,
            ae.work_on_holidays,
            mv.lookup_key AS movement_key,
            mv.lookup_label AS movement_label,
            am.id AS attendance_movement_id,
            am.movement_short_name AS attendance_movement_short_name,
            am.movement_name AS attendance_movement_name,
            am.movement_direction
          FROM public.employee_time_punches p
          INNER JOIN assigned_employees ae
            ON ae.employee_id = p.employee_id
          LEFT JOIN public.time_clock_devices d
            ON d.id = p.time_clock_device_id
           AND d.tenant_id = p.tenant_id
          LEFT JOIN public.work_locations dwl
            ON dwl.id = d.work_location_id
           AND dwl.tenant_id = d.tenant_id
          LEFT JOIN LATERAL (
            SELECT lv.lookup_key, lv.lookup_label
            FROM public.lookup_values lv
            INNER JOIN public.lookup_groups lg
              ON lg.id = lv.lookup_group_id
             AND lg.lookup_group_key = 'PUNCH_KEY'
             AND lg.is_active = true
            WHERE lv.sort_order = p.punch_key
              AND lv.is_active = true
              AND (lv.tenant_id IS NULL OR lv.tenant_id = p.tenant_id)
            ORDER BY CASE WHEN lv.tenant_id = p.tenant_id THEN 0 ELSE 1 END
            LIMIT 1
          ) mv ON true
          LEFT JOIN LATERAL (
            SELECT
              movement.id,
              movement.movement_short_name,
              movement.movement_name,
              CASE
                WHEN p.punch_key = movement.start_key THEN 'START'
                WHEN p.punch_key = movement.end_key THEN 'END'
              END AS movement_direction
            FROM public.attendance_movements movement
            WHERE movement.tenant_id = p.tenant_id
              AND movement.is_active = true
              AND p.punch_key IN (movement.start_key, movement.end_key)
            ORDER BY movement.movement_short_name ASC
            LIMIT 1
          ) am ON true
          WHERE p.tenant_id = $1::uuid
            AND p.is_active = true
            AND p.punch_datetime >= CURRENT_DATE
            AND p.punch_datetime < CURRENT_DATE + INTERVAL '1 day'
          ORDER BY p.punch_datetime DESC, p.created_at DESC
        )
        SELECT
          l.*,
          s.shift_name,
          s.shift_short_name,
          s.start_time AS shift_start_time,
          COALESCE(sw.lunch_window_minutes, 0) > 0 AS shift_supports_lunch,
          CASE
            WHEN p.id IS NOT NULL AND sw.lunch_start_minutes IS NOT NULL
              THEN (p.shift_date + (sw.lunch_start_minutes || ' minutes')::interval)::time
            ELSE NULL
          END AS lunch_window_start_time,
          CASE
            WHEN p.id IS NOT NULL AND sw.lunch_end_minutes IS NOT NULL
              THEN (p.shift_date + (sw.lunch_end_minutes || ' minutes')::interval)::time
            ELSE NULL
          END AS lunch_window_end_time,
          CASE
            WHEN p.id IS NOT NULL
             AND s.start_time IS NOT NULL
             AND COALESCE(sw.work_minutes, 0) > 0
              THEN (p.shift_date + s.start_time + (COALESCE(sw.work_minutes, 0) || ' minutes')::interval)::time
            ELSE NULL
          END AS shift_work_end_time,
          holiday.id AS holiday_id,
          holiday.holiday_name,
          (holiday.id IS NOT NULL) AS is_holiday,
          approved_leave.id AS approved_leave_id,
          approved_leave.justification_name AS approved_leave_name,
          (approved_leave.id IS NOT NULL) AS has_approved_leave,
          late_justification.id AS late_justification_id,
          late_justification.justification_name AS late_justification_name,
          late_justification.request_status_key AS late_justification_status_key,
          late_justification.request_status_label AS late_justification_status_label,
          early_departure_justification.id AS early_departure_justification_id,
          early_departure_justification.justification_name AS early_departure_justification_name,
          early_departure_justification.request_status_key AS early_departure_justification_status_key,
          early_departure_justification.request_status_label AS early_departure_justification_status_label,
          anomaly_justification.id AS anomaly_justification_id,
          anomaly_justification.justification_name AS anomaly_justification_name,
          anomaly_justification.request_status_key AS anomaly_justification_status_key,
          anomaly_justification.request_status_label AS anomaly_justification_status_label,
          approved_punch_change.id AS approved_punch_change_request_id,
          (approved_punch_change.id IS NOT NULL) AS has_approved_punch_change,
          CASE
            WHEN l.punch_key IN (2, 3)
             AND COALESCE(sw.lunch_window_minutes, 0) <= 0
              THEN 'NO_APLICA'
            WHEN l.punch_key IN (2, 3)
             AND sw.lunch_start_minutes IS NOT NULL
             AND sw.lunch_end_minutes IS NOT NULL
             AND (
               l.punch_datetime < (p.shift_date + (sw.lunch_start_minutes || ' minutes')::interval)
               OR l.punch_datetime > (p.shift_date + (sw.lunch_end_minutes || ' minutes')::interval)
             )
              THEN 'LUNCH_FUERA_HORARIO'
            WHEN l.punch_key = 2
              THEN 'LUNCH_INICIO'
            WHEN l.punch_key = 3
              THEN 'LUNCH_FIN'
            WHEN l.punch_key = 5
              THEN 'PERMISO_SALIDA'
            WHEN l.punch_key = 6
              THEN 'PERMISO_RETORNO'
            WHEN l.punch_key = 1
             AND s.start_time IS NOT NULL
             AND COALESCE(sw.work_minutes, 0) > 0
             AND l.punch_datetime::time > (s.start_time + (COALESCE(s.entry_grace_minutes, 0) || ' minutes')::interval)
             AND late_justification.id IS NOT NULL
             AND UPPER(COALESCE(late_justification.request_status_key, '')) IN ('APPROVED', 'APROBADO')
              THEN 'ATRASO_JUSTIFICADO'
            WHEN l.punch_key = 1
             AND s.start_time IS NOT NULL
             AND COALESCE(sw.work_minutes, 0) > 0
             AND l.punch_datetime::time > (s.start_time + (COALESCE(s.entry_grace_minutes, 0) || ' minutes')::interval)
             AND late_justification.id IS NOT NULL
              THEN 'ATRASO_JUSTIFICACION_PENDIENTE'
            WHEN l.punch_key = 4
             AND s.start_time IS NOT NULL
             AND COALESCE(sw.work_minutes, 0) > 0
             AND l.punch_datetime < (p.shift_date + s.start_time + (COALESCE(sw.work_minutes, 0) || ' minutes')::interval - (COALESCE(s.exit_grace_minutes, 0) || ' minutes')::interval)
              THEN 'SALIDA_ANTICIPADA'
            WHEN approved_leave.id IS NOT NULL
              THEN 'PERMISO_APROBADO'
            WHEN holiday.id IS NOT NULL AND COALESCE(l.work_on_holidays, false) = false
              THEN 'FERIADO'
            WHEN p.id IS NULL OR s.id IS NULL OR COALESCE(sw.work_minutes, 0) <= 0
              THEN 'NO_LABORAL'
            WHEN l.punch_key = 1
             AND s.start_time IS NOT NULL
             AND COALESCE(sw.work_minutes, 0) > 0
             AND l.punch_datetime::time > (s.start_time + (COALESCE(s.entry_grace_minutes, 0) || ' minutes')::interval)
              THEN 'ATRASO'
            WHEN l.punch_key = 4
             AND s.start_time IS NOT NULL
             AND COALESCE(sw.work_minutes, 0) > 0
             AND l.punch_datetime < (p.shift_date + s.start_time + (COALESCE(sw.work_minutes, 0) || ' minutes')::interval - (COALESCE(s.exit_grace_minutes, 0) || ' minutes')::interval)
              THEN 'SALIDA_ANTICIPADA'
            ELSE 'NORMAL'
          END AS event_key
        FROM latest l
        LEFT JOIN public.employee_shift_plans p
          ON p.tenant_id = $1::uuid
         AND p.employee_id = l.employee_id
         AND p.shift_date = CURRENT_DATE
         AND p.is_active = true
        LEFT JOIN public.shifts s
          ON s.id = p.shift_id
         AND s.tenant_id = p.tenant_id
        LEFT JOIN public.shift_constructors sc
          ON sc.shift_id = s.id
         AND sc.tenant_id = s.tenant_id
         AND sc.is_active = true
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::int AS active_block_count,
            COALESCE(SUM(b.end_minutes - b.start_minutes) FILTER (
              WHERE b.is_break = false
                AND b.block_type IN ('ORDINARIA', 'NOCTURNA')
            ), 0)::int AS required_work_minutes,
            COALESCE(SUM(b.end_minutes - b.start_minutes) FILTER (
              WHERE b.is_break = true
            ), 0)::int AS constructor_break_minutes,
            COALESCE(SUM(b.end_minutes - b.start_minutes) FILTER (
              WHERE b.block_type = 'LUNCH'
            ), 0)::int AS constructor_lunch_window_minutes,
            (MIN(b.start_minutes) FILTER (
              WHERE b.block_type = 'LUNCH'
            ))::int AS lunch_start_minutes,
            (MAX(b.end_minutes) FILTER (
              WHERE b.block_type = 'LUNCH'
            ))::int AS lunch_end_minutes
          FROM public.shift_constructor_blocks b
          WHERE b.constructor_id = sc.id
            AND b.tenant_id = sc.tenant_id
            AND b.is_active = true
        ) cb ON true
        LEFT JOIN LATERAL (
          SELECT CASE
            WHEN sc.id IS NOT NULL THEN COALESCE(cb.required_work_minutes, 0)
            ELSE COALESCE(s.work_minutes, 0)
          END::int AS work_minutes,
          CASE
            WHEN sc.id IS NOT NULL THEN COALESCE(cb.constructor_break_minutes, 0)
            ELSE COALESCE(s.lunch_minutes, 0)
          END::int AS break_minutes,
          CASE
            WHEN sc.id IS NOT NULL THEN COALESCE(cb.constructor_lunch_window_minutes, 0)
            ELSE COALESCE(s.lunch_window_minutes, s.lunch_minutes, 0)
          END::int AS lunch_window_minutes,
          CASE WHEN sc.id IS NOT NULL THEN cb.lunch_start_minutes ELSE NULL END::int AS lunch_start_minutes,
          CASE WHEN sc.id IS NOT NULL THEN cb.lunch_end_minutes ELSE NULL END::int AS lunch_end_minutes
        ) sw ON true
        LEFT JOIN LATERAL (
          SELECT h.id, h.holiday_name
          FROM public.holidays h
          WHERE h.tenant_id = $1::uuid
            AND h.is_active = true
            AND (
              (COALESCE(h.is_recurring, false) = true AND EXTRACT(MONTH FROM h.holiday_date) = EXTRACT(MONTH FROM l.punch_datetime::date) AND EXTRACT(DAY FROM h.holiday_date) = EXTRACT(DAY FROM l.punch_datetime::date))
              OR (COALESCE(h.is_recurring, false) = false AND h.holiday_date = l.punch_datetime::date)
            )
            AND (h.company_id IS NULL OR h.company_id = l.company_id)
            AND (h.country_id IS NULL OR h.country_id = l.employee_country_id)
            AND (h.state_id IS NULL OR h.state_id = l.employee_state_id)
            AND (h.city_id IS NULL OR h.city_id = l.employee_city_id)
            AND (h.work_location_id IS NULL OR h.work_location_id = l.work_location_id)
          ORDER BY
            CASE WHEN h.work_location_id IS NOT NULL THEN 16 ELSE 0 END +
            CASE WHEN h.city_id IS NOT NULL THEN 8 ELSE 0 END +
            CASE WHEN h.state_id IS NOT NULL THEN 4 ELSE 0 END +
            CASE WHEN h.country_id IS NOT NULL THEN 2 ELSE 0 END +
            CASE WHEN h.company_id IS NOT NULL THEN 1 ELSE 0 END DESC,
            h.holiday_name ASC
          LIMIT 1
        ) holiday ON true
        LEFT JOIN LATERAL (
          SELECT r.id, jt.justification_name
          FROM public.employee_absence_requests r
          INNER JOIN public.lookup_values rs
            ON rs.id = r.request_status_id
          LEFT JOIN public.justification_types jt
            ON jt.id = r.justification_type_id
          WHERE r.tenant_id = $1::uuid
            AND r.employee_id = l.employee_id
            AND r.is_active = true
            AND UPPER(COALESCE(rs.lookup_key, '')) IN ('APPROVED', 'APROBADO')
            AND l.punch_datetime >= date_trunc('minute', r.start_datetime)
            AND l.punch_datetime < date_trunc('minute', COALESCE(r.end_datetime, r.start_datetime)) + INTERVAL '1 minute'
            ORDER BY r.start_datetime ASC, r.created_at ASC
          LIMIT 1
        ) approved_leave ON true
        LEFT JOIN LATERAL (
          SELECT
            r.id,
            jt.justification_name,
            rs.lookup_key AS request_status_key,
            rs.lookup_label AS request_status_label
          FROM public.employee_absence_requests r
          INNER JOIN public.lookup_values rs
            ON rs.id = r.request_status_id
          INNER JOIN public.attendance_events ae
            ON ae.id = r.attendance_event_id
          LEFT JOIN public.justification_types jt
            ON jt.id = r.justification_type_id
          WHERE r.tenant_id = $1::uuid
            AND r.employee_id = l.employee_id
            AND r.is_active = true
            AND UPPER(COALESCE(rs.lookup_key, '')) IN ('PENDING', 'PENDIENTE', 'IN_REVIEW', 'EN_REVISION', 'EN_REVISIÓN', 'APPROVED', 'APROBADO')
            AND (
              UPPER(COALESCE(ae.event_name, '')) = 'ATRASO'
              OR UPPER(COALESCE(ae.event_short_name, '')) IN ('ATR', 'ATRASO')
            )
            AND r.target_punch_id = l.id
          ORDER BY
            CASE WHEN UPPER(COALESCE(rs.lookup_key, '')) IN ('APPROVED', 'APROBADO') THEN 0 ELSE 1 END,
            r.created_at DESC
          LIMIT 1
        ) late_justification ON true
        LEFT JOIN LATERAL (
          SELECT
            r.id,
            jt.justification_name,
            rs.lookup_key AS request_status_key,
            rs.lookup_label AS request_status_label
          FROM public.employee_absence_requests r
          INNER JOIN public.lookup_values rs
            ON rs.id = r.request_status_id
          INNER JOIN public.attendance_events ae
            ON ae.id = r.attendance_event_id
          LEFT JOIN public.justification_types jt
            ON jt.id = r.justification_type_id
          WHERE r.tenant_id = $1::uuid
            AND r.employee_id = l.employee_id
            AND r.is_active = true
            AND UPPER(COALESCE(rs.lookup_key, '')) IN ('PENDING', 'PENDIENTE', 'IN_REVIEW', 'EN_REVISION', 'EN_REVISIÓN', 'APPROVED', 'APROBADO')
            AND (
              UPPER(COALESCE(ae.event_name, '')) = 'SALIDA ANTICIPADA'
              OR UPPER(COALESCE(ae.event_short_name, '')) IN ('SAN', 'SALIDA ANTICIPADA')
            )
            AND r.target_punch_id = l.id
          ORDER BY
            CASE WHEN UPPER(COALESCE(rs.lookup_key, '')) IN ('APPROVED', 'APROBADO') THEN 0 ELSE 1 END,
            r.created_at DESC
          LIMIT 1
        ) early_departure_justification ON true
        LEFT JOIN LATERAL (
          SELECT
            r.id,
            jt.justification_name,
            rs.lookup_key AS request_status_key,
            rs.lookup_label AS request_status_label
          FROM public.employee_absence_requests r
          INNER JOIN public.lookup_values rs
            ON rs.id = r.request_status_id
          INNER JOIN public.attendance_events ae
            ON ae.id = r.attendance_event_id
          LEFT JOIN public.justification_types jt
            ON jt.id = r.justification_type_id
          WHERE r.tenant_id = $1::uuid
            AND r.employee_id = l.employee_id
            AND r.is_active = true
            AND r.target_punch_id = l.id
            AND UPPER(COALESCE(ae.event_short_name, '')) IN ('LFH', 'LUNCH_FUERA_HORARIO')
            AND UPPER(COALESCE(rs.lookup_key, '')) IN ('PENDING', 'PENDIENTE', 'IN_REVIEW', 'EN_REVISION', 'EN_REVISIÓN', 'APPROVED', 'APROBADO')
          ORDER BY
            CASE WHEN UPPER(COALESCE(rs.lookup_key, '')) IN ('APPROVED', 'APROBADO') THEN 0 ELSE 1 END,
            r.created_at DESC
          LIMIT 1
        ) anomaly_justification ON true
        LEFT JOIN LATERAL (
          SELECT r.id
          FROM public.employee_time_punch_change_requests r
          INNER JOIN public.lookup_values rs
            ON rs.id = r.request_status_id
          LEFT JOIN public.lookup_values rt
            ON rt.id = r.request_type_id
          WHERE r.tenant_id = $1::uuid
            AND r.employee_id = l.employee_id
            AND r.is_active = true
            AND UPPER(COALESCE(rs.lookup_key, '')) IN ('APPROVED', 'APROBADO')
            AND (
              r.target_punch_id = l.id
              OR (
                r.target_punch_id IS NULL
                AND UPPER(COALESCE(rt.lookup_key, '')) = 'CREATE_PUNCH'
                AND (r.requested_values->>'punch_key')::integer = l.punch_key
                AND (r.requested_values->>'punch_datetime')::timestamptz = l.punch_datetime
              )
            )
          ORDER BY r.approved_at DESC NULLS LAST, r.updated_at DESC NULLS LAST
          LIMIT 1
        ) approved_punch_change ON true
        ORDER BY l.punch_datetime DESC
      `,
      scopedParams
    );

    const todaySurchargeCtes = buildOvertimeCtes(
      assignedEmployeesSql,
      'CURRENT_DATE',
      'CURRENT_DATE',
      'NULL::uuid',
      'NULL::uuid',
      'NULL::uuid',
      'NULL::uuid',
      'NULL::uuid',
      'NULL::uuid'
    );
    const surchargeSummaryQuery = pool.query(
      `
        ${todaySurchargeCtes}
        SELECT
          COALESCE(SUM(ordinary_minutes), 0)::int AS ordinary_minutes,
          COALESCE(SUM(night_25_minutes), 0)::int AS night_minutes,
          COALESCE(SUM(extra_50_minutes), 0)::int AS extra_50_minutes,
          COALESCE(SUM(extra_100_minutes + non_working_100_minutes), 0)::int AS extra_100_minutes
        FROM metrics_by_day
      `,
      scopedParams
    );
    const trendQuery = pool.query(
      `
        WITH assigned_employees AS (${assignedEmployeesSql}),
        days AS (
          SELECT gs::date AS day
          FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day') gs
        ),
        plans AS (
          SELECT
            ae.employee_id,
            ae.area_id,
            ae.area_name,
            p.shift_date,
            s.start_time,
            CASE
              WHEN approved_leave.id IS NOT NULL THEN 0
              WHEN holiday.id IS NOT NULL AND ae.work_on_holidays = false THEN 0
              ELSE sw.work_minutes
            END::int AS work_minutes,
            COALESCE(s.entry_grace_minutes, 0)::int AS entry_grace_minutes
          FROM assigned_employees ae
          INNER JOIN public.employee_shift_plans p
            ON p.employee_id = ae.employee_id
           AND p.tenant_id = $1::uuid
           AND p.is_active = true
           AND p.shift_date >= CURRENT_DATE - INTERVAL '29 days'
           AND p.shift_date <= CURRENT_DATE
           AND (ae.hire_date IS NULL OR p.shift_date >= ae.hire_date::date)
           AND (ae.termination_date IS NULL OR p.shift_date <= ae.termination_date::date)
          INNER JOIN public.shifts s
            ON s.id = p.shift_id
           AND s.tenant_id = p.tenant_id
          LEFT JOIN public.shift_constructors sc
            ON sc.shift_id = s.id
           AND sc.tenant_id = s.tenant_id
           AND sc.is_active = true
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*)::int AS active_block_count,
              COALESCE(SUM(b.end_minutes - b.start_minutes) FILTER (
                WHERE b.is_break = false
                  AND b.block_type IN ('ORDINARIA', 'NOCTURNA')
              ), 0)::int AS required_work_minutes
            FROM public.shift_constructor_blocks b
            WHERE b.constructor_id = sc.id
              AND b.tenant_id = sc.tenant_id
              AND b.is_active = true
          ) cb ON true
          LEFT JOIN LATERAL (
            SELECT CASE
              WHEN sc.id IS NOT NULL THEN COALESCE(cb.required_work_minutes, 0)
              ELSE COALESCE(s.work_minutes, 0)
            END::int AS work_minutes
          ) sw ON true
          LEFT JOIN LATERAL (
            SELECT h.id, h.holiday_name
            FROM public.holidays h
            WHERE h.tenant_id = p.tenant_id
              AND h.is_active = true
              AND (
                (COALESCE(h.is_recurring, false) = true AND EXTRACT(MONTH FROM h.holiday_date) = EXTRACT(MONTH FROM p.shift_date) AND EXTRACT(DAY FROM h.holiday_date) = EXTRACT(DAY FROM p.shift_date))
                OR (COALESCE(h.is_recurring, false) = false AND h.holiday_date = p.shift_date)
              )
              AND (h.company_id IS NULL OR h.company_id = ae.company_id)
              AND (h.country_id IS NULL OR h.country_id = ae.employee_country_id)
              AND (h.state_id IS NULL OR h.state_id = ae.employee_state_id)
              AND (h.city_id IS NULL OR h.city_id = ae.employee_city_id)
              AND (h.work_location_id IS NULL OR h.work_location_id = ae.work_location_id)
            ORDER BY
              CASE WHEN h.work_location_id IS NOT NULL THEN 16 ELSE 0 END +
              CASE WHEN h.city_id IS NOT NULL THEN 8 ELSE 0 END +
              CASE WHEN h.state_id IS NOT NULL THEN 4 ELSE 0 END +
              CASE WHEN h.country_id IS NOT NULL THEN 2 ELSE 0 END +
              CASE WHEN h.company_id IS NOT NULL THEN 1 ELSE 0 END DESC,
              h.holiday_name ASC
            LIMIT 1
          ) holiday ON true
          LEFT JOIN LATERAL (
            SELECT r.id, jt.justification_name
            FROM public.employee_absence_requests r
            INNER JOIN public.lookup_values rs
              ON rs.id = r.request_status_id
            LEFT JOIN public.justification_types jt
              ON jt.id = r.justification_type_id
            WHERE r.tenant_id = p.tenant_id
              AND r.employee_id = ae.employee_id
              AND r.is_active = true
              AND UPPER(COALESCE(rs.lookup_key, '')) IN ('APPROVED', 'APROBADO')
              AND r.start_datetime::date <= p.shift_date
              AND COALESCE(r.end_datetime, r.start_datetime)::date >= p.shift_date
            ORDER BY r.start_datetime ASC, r.created_at ASC
            LIMIT 1
          ) approved_leave ON true
          WHERE approved_leave.id IS NULL
            AND (holiday.id IS NULL OR ae.work_on_holidays = true)
            AND sw.work_minutes > 0
        ),
        punch_summary AS (
          SELECT
            p.employee_id,
            p.punch_datetime::date AS punch_date,
            MIN(p.punch_datetime) AS first_punch,
            MAX(p.punch_datetime) AS last_punch,
            MIN(p.punch_datetime) FILTER (WHERE p.punch_key = 1) AS first_entry,
            MAX(p.punch_datetime) FILTER (WHERE p.punch_key = 4) AS last_exit
          FROM public.employee_time_punches p
          INNER JOIN assigned_employees ae
            ON ae.employee_id = p.employee_id
          WHERE p.tenant_id = $1::uuid
            AND p.is_active = true
            AND p.punch_datetime >= CURRENT_DATE - INTERVAL '29 days'
            AND p.punch_datetime < CURRENT_DATE + INTERVAL '1 day'
          GROUP BY p.employee_id, p.punch_datetime::date
        ),
        daily_employee AS (
          SELECT
            pl.employee_id,
            pl.area_id,
            COALESCE(NULLIF(TRIM(pl.area_name), ''), 'Sin area') AS area_name,
            pl.shift_date,
            CASE
              WHEN COALESCE(ps.first_entry, ps.first_punch) IS NULL THEN 1 ELSE 0
            END AS absent,
            GREATEST(
              0,
              COALESCE(EXTRACT(EPOCH FROM (COALESCE(ps.last_exit, ps.last_punch) - COALESCE(ps.first_entry, ps.first_punch))) / 60, 0)::int - pl.work_minutes
            ) AS overtime_minutes
          FROM plans pl
          LEFT JOIN punch_summary ps
            ON ps.employee_id = pl.employee_id
           AND ps.punch_date = pl.shift_date
        ),
        daily AS (
          SELECT
            d.day,
            COUNT(de.employee_id)::int AS planned,
            COALESCE(SUM(de.absent), 0)::int AS absences,
            COALESCE(SUM(de.overtime_minutes), 0)::int AS overtime_minutes
          FROM days d
          LEFT JOIN daily_employee de
            ON de.shift_date = d.day
          GROUP BY d.day
        ),
        weekly AS (
          SELECT
            date_trunc('week', day)::date AS week_start,
            COUNT(*)::int AS days,
            SUM(planned)::int AS planned,
            SUM(absences)::int AS absences,
            SUM(overtime_minutes)::int AS overtime_minutes
          FROM daily
          GROUP BY 1
          ORDER BY 1 DESC
          LIMIT 4
        )
        SELECT
          'daily' AS series_type,
          day AS bucket_start,
          TO_CHAR(day, 'YYYY/MM/DD') AS label,
          planned,
          absences,
          CASE WHEN planned = 0 THEN 0 ELSE ROUND((absences::numeric / planned::numeric) * 100, 2) END AS absence_rate,
          ROUND(overtime_minutes::numeric / 60.0, 2) AS overtime_hours
        FROM daily
        WHERE day >= CURRENT_DATE - INTERVAL '6 days'
        UNION ALL
        SELECT
          'weekly' AS series_type,
          week_start AS bucket_start,
          'S' || TO_CHAR(week_start, 'IW') AS label,
          planned,
          absences,
          CASE WHEN planned = 0 THEN 0 ELSE ROUND((absences::numeric / planned::numeric) * 100, 2) END AS absence_rate,
          ROUND(overtime_minutes::numeric / 60.0, 2) AS overtime_hours
        FROM weekly
        ORDER BY series_type, bucket_start
      `,
      scopedParams
    );

    const rankingQuery = pool.query(
      `
        WITH assigned_employees AS (${assignedEmployeesSql}),
        plans AS (
          SELECT
            ae.employee_id,
            ae.employee_code,
            CONCAT(ae.employee_lastname, ' ', ae.employee_name) AS employee_name,
            COALESCE(NULLIF(TRIM(ae.area_name), ''), 'Sin area') AS area_name,
            p.shift_date,
            s.start_time,
            CASE
              WHEN approved_leave.id IS NOT NULL THEN 0
              WHEN holiday.id IS NOT NULL AND ae.work_on_holidays = false THEN 0
              ELSE sw.work_minutes
            END::int AS work_minutes,
            COALESCE(s.entry_grace_minutes, 0)::int AS entry_grace_minutes
          FROM assigned_employees ae
          INNER JOIN public.employee_shift_plans p
            ON p.employee_id = ae.employee_id
           AND p.tenant_id = $1::uuid
           AND p.is_active = true
           AND p.shift_date >= CURRENT_DATE - INTERVAL '29 days'
           AND p.shift_date <= CURRENT_DATE
           AND (ae.hire_date IS NULL OR p.shift_date >= ae.hire_date::date)
           AND (ae.termination_date IS NULL OR p.shift_date <= ae.termination_date::date)
          INNER JOIN public.shifts s
            ON s.id = p.shift_id
           AND s.tenant_id = p.tenant_id
          LEFT JOIN public.shift_constructors sc
            ON sc.shift_id = s.id
           AND sc.tenant_id = s.tenant_id
           AND sc.is_active = true
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*)::int AS active_block_count,
              COALESCE(SUM(b.end_minutes - b.start_minutes) FILTER (
                WHERE b.is_break = false
                  AND b.block_type IN ('ORDINARIA', 'NOCTURNA')
              ), 0)::int AS required_work_minutes
            FROM public.shift_constructor_blocks b
            WHERE b.constructor_id = sc.id
              AND b.tenant_id = sc.tenant_id
              AND b.is_active = true
          ) cb ON true
          LEFT JOIN LATERAL (
            SELECT CASE
              WHEN sc.id IS NOT NULL THEN COALESCE(cb.required_work_minutes, 0)
              ELSE COALESCE(s.work_minutes, 0)
            END::int AS work_minutes
          ) sw ON true
          LEFT JOIN LATERAL (
            SELECT h.id, h.holiday_name
            FROM public.holidays h
            WHERE h.tenant_id = p.tenant_id
              AND h.is_active = true
              AND (
                (COALESCE(h.is_recurring, false) = true AND EXTRACT(MONTH FROM h.holiday_date) = EXTRACT(MONTH FROM p.shift_date) AND EXTRACT(DAY FROM h.holiday_date) = EXTRACT(DAY FROM p.shift_date))
                OR (COALESCE(h.is_recurring, false) = false AND h.holiday_date = p.shift_date)
              )
              AND (h.company_id IS NULL OR h.company_id = ae.company_id)
              AND (h.country_id IS NULL OR h.country_id = ae.employee_country_id)
              AND (h.state_id IS NULL OR h.state_id = ae.employee_state_id)
              AND (h.city_id IS NULL OR h.city_id = ae.employee_city_id)
              AND (h.work_location_id IS NULL OR h.work_location_id = ae.work_location_id)
            ORDER BY
              CASE WHEN h.work_location_id IS NOT NULL THEN 16 ELSE 0 END +
              CASE WHEN h.city_id IS NOT NULL THEN 8 ELSE 0 END +
              CASE WHEN h.state_id IS NOT NULL THEN 4 ELSE 0 END +
              CASE WHEN h.country_id IS NOT NULL THEN 2 ELSE 0 END +
              CASE WHEN h.company_id IS NOT NULL THEN 1 ELSE 0 END DESC,
              h.holiday_name ASC
            LIMIT 1
          ) holiday ON true
          LEFT JOIN LATERAL (
            SELECT r.id, jt.justification_name
            FROM public.employee_absence_requests r
            INNER JOIN public.lookup_values rs
              ON rs.id = r.request_status_id
            LEFT JOIN public.justification_types jt
              ON jt.id = r.justification_type_id
            WHERE r.tenant_id = p.tenant_id
              AND r.employee_id = ae.employee_id
              AND r.is_active = true
              AND UPPER(COALESCE(rs.lookup_key, '')) IN ('APPROVED', 'APROBADO')
              AND r.start_datetime::date <= p.shift_date
              AND COALESCE(r.end_datetime, r.start_datetime)::date >= p.shift_date
            ORDER BY r.start_datetime ASC, r.created_at ASC
            LIMIT 1
          ) approved_leave ON true
          WHERE approved_leave.id IS NULL
            AND (holiday.id IS NULL OR ae.work_on_holidays = true)
            AND sw.work_minutes > 0
        ),
        punch_summary AS (
          SELECT
            p.employee_id,
            p.punch_datetime::date AS punch_date,
            MIN(p.punch_datetime) AS first_punch,
            MAX(p.punch_datetime) AS last_punch,
            MIN(p.punch_datetime) FILTER (WHERE p.punch_key = 1) AS first_entry,
            MAX(p.punch_datetime) FILTER (WHERE p.punch_key = 4) AS last_exit
          FROM public.employee_time_punches p
          INNER JOIN assigned_employees ae
            ON ae.employee_id = p.employee_id
          WHERE p.tenant_id = $1::uuid
            AND p.is_active = true
            AND p.punch_datetime >= CURRENT_DATE - INTERVAL '29 days'
            AND p.punch_datetime < CURRENT_DATE + INTERVAL '1 day'
          GROUP BY p.employee_id, p.punch_datetime::date
        ),
        daily_employee AS (
          SELECT
            pl.employee_id,
            pl.employee_code,
            pl.employee_name,
            pl.area_name,
            CASE
              WHEN COALESCE(ps.first_entry, ps.first_punch) IS NULL THEN 1 ELSE 0
            END AS absent,
            GREATEST(
              0,
              COALESCE(EXTRACT(EPOCH FROM (COALESCE(ps.last_exit, ps.last_punch) - COALESCE(ps.first_entry, ps.first_punch))) / 60, 0)::int - pl.work_minutes
            ) AS overtime_minutes
          FROM plans pl
          LEFT JOIN punch_summary ps
            ON ps.employee_id = pl.employee_id
           AND ps.punch_date = pl.shift_date
        ),
        area_rank AS (
          SELECT
            area_name AS name,
            COUNT(*)::int AS planned,
            SUM(absent)::int AS absences,
            ROUND((SUM(absent)::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100, 2) AS absence_rate,
            ROUND(SUM(overtime_minutes)::numeric / 60.0, 2) AS overtime_hours
          FROM daily_employee
          GROUP BY area_name
        ),
        employee_rank AS (
          SELECT
            employee_id,
            employee_code,
            employee_name AS name,
            COUNT(*)::int AS planned,
            SUM(absent)::int AS absences,
            ROUND((SUM(absent)::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100, 2) AS absence_rate,
            ROUND(SUM(overtime_minutes)::numeric / 60.0, 2) AS overtime_hours
          FROM daily_employee
          GROUP BY employee_id, employee_code, employee_name
        )
        SELECT 'area_absence' AS ranking_type, name, NULL::text AS employee_code, planned, absences, absence_rate, overtime_hours
        FROM area_rank
        ORDER BY absence_rate DESC NULLS LAST, absences DESC, name ASC
        LIMIT 5
      `,
      scopedParams
    );

    const rankingMoreQuery = pool.query(
      `
        WITH assigned_employees AS (${assignedEmployeesSql}),
        plans AS (
          SELECT
            ae.employee_id,
            ae.employee_code,
            CONCAT(ae.employee_lastname, ' ', ae.employee_name) AS employee_name,
            COALESCE(NULLIF(TRIM(ae.area_name), ''), 'Sin area') AS area_name,
            p.shift_date,
            s.start_time,
            CASE
              WHEN approved_leave.id IS NOT NULL THEN 0
              WHEN holiday.id IS NOT NULL AND ae.work_on_holidays = false THEN 0
              ELSE sw.work_minutes
            END::int AS work_minutes,
            COALESCE(s.entry_grace_minutes, 0)::int AS entry_grace_minutes
          FROM assigned_employees ae
          INNER JOIN public.employee_shift_plans p
            ON p.employee_id = ae.employee_id
           AND p.tenant_id = $1::uuid
           AND p.is_active = true
           AND p.shift_date >= CURRENT_DATE - INTERVAL '29 days'
           AND p.shift_date <= CURRENT_DATE
           AND (ae.hire_date IS NULL OR p.shift_date >= ae.hire_date::date)
           AND (ae.termination_date IS NULL OR p.shift_date <= ae.termination_date::date)
          INNER JOIN public.shifts s
            ON s.id = p.shift_id
           AND s.tenant_id = p.tenant_id
          LEFT JOIN public.shift_constructors sc
            ON sc.shift_id = s.id
           AND sc.tenant_id = s.tenant_id
           AND sc.is_active = true
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*)::int AS active_block_count,
              COALESCE(SUM(b.end_minutes - b.start_minutes) FILTER (
                WHERE b.is_break = false
                  AND b.block_type IN ('ORDINARIA', 'NOCTURNA')
              ), 0)::int AS required_work_minutes
            FROM public.shift_constructor_blocks b
            WHERE b.constructor_id = sc.id
              AND b.tenant_id = sc.tenant_id
              AND b.is_active = true
          ) cb ON true
          LEFT JOIN LATERAL (
            SELECT CASE
              WHEN sc.id IS NOT NULL THEN COALESCE(cb.required_work_minutes, 0)
              ELSE COALESCE(s.work_minutes, 0)
            END::int AS work_minutes
          ) sw ON true
          LEFT JOIN LATERAL (
            SELECT h.id, h.holiday_name
            FROM public.holidays h
            WHERE h.tenant_id = p.tenant_id
              AND h.is_active = true
              AND (
                (COALESCE(h.is_recurring, false) = true AND EXTRACT(MONTH FROM h.holiday_date) = EXTRACT(MONTH FROM p.shift_date) AND EXTRACT(DAY FROM h.holiday_date) = EXTRACT(DAY FROM p.shift_date))
                OR (COALESCE(h.is_recurring, false) = false AND h.holiday_date = p.shift_date)
              )
              AND (h.company_id IS NULL OR h.company_id = ae.company_id)
              AND (h.country_id IS NULL OR h.country_id = ae.employee_country_id)
              AND (h.state_id IS NULL OR h.state_id = ae.employee_state_id)
              AND (h.city_id IS NULL OR h.city_id = ae.employee_city_id)
              AND (h.work_location_id IS NULL OR h.work_location_id = ae.work_location_id)
            ORDER BY
              CASE WHEN h.work_location_id IS NOT NULL THEN 16 ELSE 0 END +
              CASE WHEN h.city_id IS NOT NULL THEN 8 ELSE 0 END +
              CASE WHEN h.state_id IS NOT NULL THEN 4 ELSE 0 END +
              CASE WHEN h.country_id IS NOT NULL THEN 2 ELSE 0 END +
              CASE WHEN h.company_id IS NOT NULL THEN 1 ELSE 0 END DESC,
              h.holiday_name ASC
            LIMIT 1
          ) holiday ON true
          LEFT JOIN LATERAL (
            SELECT r.id, jt.justification_name
            FROM public.employee_absence_requests r
            INNER JOIN public.lookup_values rs
              ON rs.id = r.request_status_id
            LEFT JOIN public.justification_types jt
              ON jt.id = r.justification_type_id
            WHERE r.tenant_id = p.tenant_id
              AND r.employee_id = ae.employee_id
              AND r.is_active = true
              AND UPPER(COALESCE(rs.lookup_key, '')) IN ('APPROVED', 'APROBADO')
              AND r.start_datetime::date <= p.shift_date
              AND COALESCE(r.end_datetime, r.start_datetime)::date >= p.shift_date
            ORDER BY r.start_datetime ASC, r.created_at ASC
            LIMIT 1
          ) approved_leave ON true
          WHERE approved_leave.id IS NULL
            AND (holiday.id IS NULL OR ae.work_on_holidays = true)
            AND sw.work_minutes > 0
        ),
        punch_summary AS (
          SELECT
            p.employee_id,
            p.punch_datetime::date AS punch_date,
            MIN(p.punch_datetime) AS first_punch,
            MAX(p.punch_datetime) AS last_punch,
            MIN(p.punch_datetime) FILTER (WHERE p.punch_key = 1) AS first_entry,
            MAX(p.punch_datetime) FILTER (WHERE p.punch_key = 4) AS last_exit
          FROM public.employee_time_punches p
          INNER JOIN assigned_employees ae
            ON ae.employee_id = p.employee_id
          WHERE p.tenant_id = $1::uuid
            AND p.is_active = true
            AND p.punch_datetime >= CURRENT_DATE - INTERVAL '29 days'
            AND p.punch_datetime < CURRENT_DATE + INTERVAL '1 day'
          GROUP BY p.employee_id, p.punch_datetime::date
        ),
        daily_employee AS (
          SELECT
            pl.employee_id,
            pl.employee_code,
            pl.employee_name,
            pl.area_name,
            CASE
              WHEN COALESCE(ps.first_entry, ps.first_punch) IS NULL THEN 1 ELSE 0
            END AS absent,
            GREATEST(
              0,
              COALESCE(EXTRACT(EPOCH FROM (COALESCE(ps.last_exit, ps.last_punch) - COALESCE(ps.first_entry, ps.first_punch))) / 60, 0)::int - pl.work_minutes
            ) AS overtime_minutes
          FROM plans pl
          LEFT JOIN punch_summary ps
            ON ps.employee_id = pl.employee_id
           AND ps.punch_date = pl.shift_date
        ),
        area_rank AS (
          SELECT
            area_name AS name,
            COUNT(*)::int AS planned,
            SUM(absent)::int AS absences,
            ROUND((SUM(absent)::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100, 2) AS absence_rate,
            ROUND(SUM(overtime_minutes)::numeric / 60.0, 2) AS overtime_hours
          FROM daily_employee
          GROUP BY area_name
        ),
        employee_rank AS (
          SELECT
            employee_id,
            employee_code,
            employee_name AS name,
            COUNT(*)::int AS planned,
            SUM(absent)::int AS absences,
            ROUND((SUM(absent)::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100, 2) AS absence_rate,
            ROUND(SUM(overtime_minutes)::numeric / 60.0, 2) AS overtime_hours
          FROM daily_employee
          GROUP BY employee_id, employee_code, employee_name
        ),
        unioned AS (
          SELECT 'area_overtime' AS ranking_type, name, NULL::text AS employee_code, planned, absences, absence_rate, overtime_hours
          FROM area_rank
          ORDER BY overtime_hours DESC, name ASC
          LIMIT 5
        )
        SELECT * FROM unioned
        UNION ALL
        SELECT 'employee_absence' AS ranking_type, name, employee_code, planned, absences, absence_rate, overtime_hours
        FROM employee_rank
        ORDER BY ranking_type, absence_rate DESC NULLS LAST, absences DESC, name ASC
        LIMIT 10
      `,
      scopedParams
    );

    const employeeOvertimeQuery = pool.query(
      `
        WITH assigned_employees AS (${assignedEmployeesSql}),
        plans AS (
          SELECT
            ae.employee_id,
            ae.employee_code,
            CONCAT(ae.employee_lastname, ' ', ae.employee_name) AS employee_name,
            p.shift_date,
            s.start_time,
            CASE
              WHEN approved_leave.id IS NOT NULL THEN 0
              WHEN holiday.id IS NOT NULL AND ae.work_on_holidays = false THEN 0
              ELSE sw.work_minutes
            END::int AS work_minutes
          FROM assigned_employees ae
          INNER JOIN public.employee_shift_plans p
            ON p.employee_id = ae.employee_id
           AND p.tenant_id = $1::uuid
           AND p.is_active = true
           AND p.shift_date >= CURRENT_DATE - INTERVAL '29 days'
           AND p.shift_date <= CURRENT_DATE
           AND (ae.hire_date IS NULL OR p.shift_date >= ae.hire_date::date)
           AND (ae.termination_date IS NULL OR p.shift_date <= ae.termination_date::date)
          INNER JOIN public.shifts s
            ON s.id = p.shift_id
           AND s.tenant_id = p.tenant_id
          LEFT JOIN public.shift_constructors sc
            ON sc.shift_id = s.id
           AND sc.tenant_id = s.tenant_id
           AND sc.is_active = true
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*)::int AS active_block_count,
              COALESCE(SUM(b.end_minutes - b.start_minutes) FILTER (
                WHERE b.is_break = false
                  AND b.block_type IN ('ORDINARIA', 'NOCTURNA')
              ), 0)::int AS required_work_minutes
            FROM public.shift_constructor_blocks b
            WHERE b.constructor_id = sc.id
              AND b.tenant_id = sc.tenant_id
              AND b.is_active = true
          ) cb ON true
          LEFT JOIN LATERAL (
            SELECT CASE
              WHEN sc.id IS NOT NULL THEN COALESCE(cb.required_work_minutes, 0)
              ELSE COALESCE(s.work_minutes, 0)
            END::int AS work_minutes
          ) sw ON true
          LEFT JOIN LATERAL (
            SELECT h.id, h.holiday_name
            FROM public.holidays h
            WHERE h.tenant_id = p.tenant_id
              AND h.is_active = true
              AND (
                (COALESCE(h.is_recurring, false) = true AND EXTRACT(MONTH FROM h.holiday_date) = EXTRACT(MONTH FROM p.shift_date) AND EXTRACT(DAY FROM h.holiday_date) = EXTRACT(DAY FROM p.shift_date))
                OR (COALESCE(h.is_recurring, false) = false AND h.holiday_date = p.shift_date)
              )
              AND (h.company_id IS NULL OR h.company_id = ae.company_id)
              AND (h.country_id IS NULL OR h.country_id = ae.employee_country_id)
              AND (h.state_id IS NULL OR h.state_id = ae.employee_state_id)
              AND (h.city_id IS NULL OR h.city_id = ae.employee_city_id)
              AND (h.work_location_id IS NULL OR h.work_location_id = ae.work_location_id)
            ORDER BY
              CASE WHEN h.work_location_id IS NOT NULL THEN 16 ELSE 0 END +
              CASE WHEN h.city_id IS NOT NULL THEN 8 ELSE 0 END +
              CASE WHEN h.state_id IS NOT NULL THEN 4 ELSE 0 END +
              CASE WHEN h.country_id IS NOT NULL THEN 2 ELSE 0 END +
              CASE WHEN h.company_id IS NOT NULL THEN 1 ELSE 0 END DESC,
              h.holiday_name ASC
            LIMIT 1
          ) holiday ON true
          LEFT JOIN LATERAL (
            SELECT r.id, jt.justification_name
            FROM public.employee_absence_requests r
            INNER JOIN public.lookup_values rs
              ON rs.id = r.request_status_id
            LEFT JOIN public.justification_types jt
              ON jt.id = r.justification_type_id
            WHERE r.tenant_id = p.tenant_id
              AND r.employee_id = ae.employee_id
              AND r.is_active = true
              AND UPPER(COALESCE(rs.lookup_key, '')) IN ('APPROVED', 'APROBADO')
              AND r.start_datetime::date <= p.shift_date
              AND COALESCE(r.end_datetime, r.start_datetime)::date >= p.shift_date
            ORDER BY r.start_datetime ASC, r.created_at ASC
            LIMIT 1
          ) approved_leave ON true
          WHERE approved_leave.id IS NULL
            AND (holiday.id IS NULL OR ae.work_on_holidays = true)
            AND sw.work_minutes > 0
        ),
        punch_summary AS (
          SELECT
            p.employee_id,
            p.punch_datetime::date AS punch_date,
            MIN(p.punch_datetime) AS first_punch,
            MAX(p.punch_datetime) AS last_punch,
            MIN(p.punch_datetime) FILTER (WHERE p.punch_key = 1) AS first_entry,
            MAX(p.punch_datetime) FILTER (WHERE p.punch_key = 4) AS last_exit
          FROM public.employee_time_punches p
          INNER JOIN assigned_employees ae
            ON ae.employee_id = p.employee_id
          WHERE p.tenant_id = $1::uuid
            AND p.is_active = true
            AND p.punch_datetime >= CURRENT_DATE - INTERVAL '29 days'
            AND p.punch_datetime < CURRENT_DATE + INTERVAL '1 day'
          GROUP BY p.employee_id, p.punch_datetime::date
        )
        SELECT
          pl.employee_name AS name,
          pl.employee_code,
          ROUND(SUM(GREATEST(
            0,
            COALESCE(EXTRACT(EPOCH FROM (COALESCE(ps.last_exit, ps.last_punch) - COALESCE(ps.first_entry, ps.first_punch))) / 60, 0)::int - pl.work_minutes
          ))::numeric / 60.0, 2) AS overtime_hours
        FROM plans pl
        LEFT JOIN punch_summary ps
          ON ps.employee_id = pl.employee_id
         AND ps.punch_date = pl.shift_date
        GROUP BY pl.employee_id, pl.employee_code, pl.employee_name
        ORDER BY overtime_hours DESC, pl.employee_name ASC
        LIMIT 5
      `,
      scopedParams
    );

    const periodInterval = String(req.query.interval || '').trim() === 'last_4_weeks'
      ? 'last_4_weeks'
      : 'last_7_days';
    const periodIntervalParameter = `$${scopedParams.length + 1}`;
    const periodSurchargeCtes = buildOvertimeCtes(
      assignedEmployeesSql,
      `(CASE
        WHEN ${periodIntervalParameter}::text = 'last_4_weeks'
          THEN (date_trunc('week', CURRENT_DATE)::date - INTERVAL '3 weeks')::date
        ELSE (CURRENT_DATE - INTERVAL '7 days')::date
      END)`,
      `(CURRENT_DATE - INTERVAL '1 day')::date`,
      'NULL::uuid',
      'NULL::uuid',
      'NULL::uuid',
      'NULL::uuid',
      'NULL::uuid',
      'NULL::uuid'
    );
    const periodSurchargeAnalyticsQuery = pool.query(
      `
        ${periodSurchargeCtes},
        surcharge_bounds AS (
          SELECT
            ${periodIntervalParameter}::text AS interval_key,
            CASE
              WHEN ${periodIntervalParameter}::text = 'last_4_weeks'
                THEN (date_trunc('week', CURRENT_DATE)::date - INTERVAL '3 weeks')::date
              ELSE (CURRENT_DATE - INTERVAL '7 days')::date
            END AS start_date,
            (CURRENT_DATE - INTERVAL '1 day')::date AS end_date
        ),
        surcharge_buckets AS (
          SELECT
            series_day::date AS bucket_start,
            series_day::date AS bucket_end,
            CASE EXTRACT(ISODOW FROM series_day)::int
              WHEN 1 THEN 'L' WHEN 2 THEN 'M' WHEN 3 THEN 'X' WHEN 4 THEN 'J'
              WHEN 5 THEN 'V' WHEN 6 THEN 'S' ELSE 'D'
            END AS label
          FROM surcharge_bounds bounds
          CROSS JOIN LATERAL generate_series(bounds.start_date, bounds.end_date, INTERVAL '1 day') series_day
          WHERE bounds.interval_key = 'last_7_days'

          UNION ALL

          SELECT
            week_start::date AS bucket_start,
            LEAST((week_start + INTERVAL '6 days')::date, bounds.end_date) AS bucket_end,
            'S' || TO_CHAR(week_start, 'IW') AS label
          FROM surcharge_bounds bounds
          CROSS JOIN LATERAL generate_series(
            date_trunc('week', bounds.start_date)::date,
            date_trunc('week', bounds.end_date)::date,
            INTERVAL '1 week'
          ) week_start
          WHERE bounds.interval_key = 'last_4_weeks'
        ),
        surcharge_series AS (
          SELECT
            buckets.bucket_start,
            buckets.bucket_end,
            buckets.label,
            COALESCE(SUM(metrics.ordinary_minutes), 0)::int AS ordinary_minutes,
            COALESCE(SUM(metrics.night_25_minutes), 0)::int AS night_minutes,
            COALESCE(SUM(metrics.extra_50_minutes), 0)::int AS extra_50_minutes,
            COALESCE(SUM(metrics.extra_100_minutes + metrics.non_working_100_minutes), 0)::int AS extra_100_minutes
          FROM surcharge_buckets buckets
          LEFT JOIN metrics_by_day metrics
            ON metrics.shift_date BETWEEN buckets.bucket_start AND buckets.bucket_end
          GROUP BY buckets.bucket_start, buckets.bucket_end, buckets.label
          ORDER BY buckets.bucket_start
        ),
        surcharge_summary AS (
          SELECT
            COALESCE(SUM(ordinary_minutes), 0)::int AS ordinary_minutes,
            COALESCE(SUM(night_minutes), 0)::int AS night_minutes,
            COALESCE(SUM(extra_50_minutes), 0)::int AS extra_50_minutes,
            COALESCE(SUM(extra_100_minutes), 0)::int AS extra_100_minutes
          FROM surcharge_series
        ),
        area_surcharge_rank AS (
          SELECT
            COALESCE(NULLIF(TRIM(area_name), ''), 'Sin área') AS name,
            NULL::text AS employee_code,
            COALESCE(SUM(ordinary_minutes), 0)::int AS ordinary_minutes,
            COALESCE(SUM(night_25_minutes), 0)::int AS night_minutes,
            COALESCE(SUM(extra_50_minutes), 0)::int AS extra_50_minutes,
            COALESCE(SUM(extra_100_minutes + non_working_100_minutes), 0)::int AS extra_100_minutes
          FROM metrics_by_day
          GROUP BY COALESCE(NULLIF(TRIM(area_name), ''), 'Sin área')
        ),
        employee_surcharge_rank AS (
          SELECT
            employee_full_name AS name,
            employee_code,
            COALESCE(SUM(ordinary_minutes), 0)::int AS ordinary_minutes,
            COALESCE(SUM(night_25_minutes), 0)::int AS night_minutes,
            COALESCE(SUM(extra_50_minutes), 0)::int AS extra_50_minutes,
            COALESCE(SUM(extra_100_minutes + non_working_100_minutes), 0)::int AS extra_100_minutes
          FROM metrics_by_day
          GROUP BY employee_id, employee_full_name, employee_code
        )
        SELECT json_build_object(
          'summary', (SELECT row_to_json(surcharge_summary) FROM surcharge_summary),
          'series', COALESCE((SELECT json_agg(row_to_json(surcharge_series) ORDER BY bucket_start) FROM surcharge_series), '[]'::json),
          'area_surcharge', COALESCE((
            SELECT json_agg(row_to_json(ranked))
            FROM (
              SELECT *
              FROM area_surcharge_rank
              ORDER BY ordinary_minutes + night_minutes + extra_50_minutes + extra_100_minutes DESC, name ASC
              LIMIT 5
            ) ranked
          ), '[]'::json),
          'employee_surcharge', COALESCE((
            SELECT json_agg(row_to_json(ranked))
            FROM (
              SELECT *
              FROM employee_surcharge_rank
              ORDER BY ordinary_minutes + night_minutes + extra_50_minutes + extra_100_minutes DESC, name ASC
              LIMIT 5
            ) ranked
          ), '[]'::json)
        ) AS analytics
      `,
      [...scopedParams, periodInterval]
    );
    const periodAnalyticsQuery = pool.query(
      `
        WITH assigned_employees AS (${assignedEmployeesSql}),
        bounds AS (
          SELECT
            ${periodIntervalParameter}::text AS interval_key,
            CASE
              WHEN ${periodIntervalParameter}::text = 'last_4_weeks'
                THEN (date_trunc('week', CURRENT_DATE)::date - INTERVAL '3 weeks')::date
              ELSE (CURRENT_DATE - INTERVAL '7 days')::date
            END AS start_date,
            (CURRENT_DATE - INTERVAL '1 day')::date AS end_date
        ),
        buckets AS (
          SELECT
            'daily'::text AS bucket_type,
            series_day::date AS bucket_start,
            series_day::date AS bucket_end,
            CASE EXTRACT(ISODOW FROM series_day)::int
              WHEN 1 THEN 'L' WHEN 2 THEN 'M' WHEN 3 THEN 'X' WHEN 4 THEN 'J'
              WHEN 5 THEN 'V' WHEN 6 THEN 'S' ELSE 'D'
            END AS label
          FROM bounds b
          CROSS JOIN LATERAL generate_series(b.start_date, b.end_date, INTERVAL '1 day') series_day
          WHERE b.interval_key = 'last_7_days'
          UNION ALL
          SELECT
            'weekly'::text AS bucket_type,
            week_start::date AS bucket_start,
            LEAST((week_start + INTERVAL '6 days')::date, b.end_date) AS bucket_end,
            'S' || TO_CHAR(week_start, 'IW') AS label
          FROM bounds b
          CROSS JOIN LATERAL generate_series(
            date_trunc('week', b.start_date)::date,
            date_trunc('week', b.end_date)::date,
            INTERVAL '1 week'
          ) week_start
          WHERE b.interval_key = 'last_4_weeks'
        ),
        scheduled AS (
          SELECT
            ae.employee_id,
            ae.employee_code,
            CONCAT(ae.employee_lastname, ' ', ae.employee_name) AS employee_name,
            COALESCE(NULLIF(TRIM(ae.area_name), ''), 'Sin área') AS area_name,
            p.shift_date,
            sc.id AS constructor_id,
            sc.tenant_id AS constructor_tenant_id,
            sw.work_minutes,
            sw.work_start_minutes,
            sw.work_end_minutes,
            COALESCE(s.entry_grace_minutes, 0)::int AS entry_grace_minutes,
            COALESCE(s.exit_grace_minutes, 0)::int AS exit_grace_minutes
          FROM assigned_employees ae
          INNER JOIN public.employee_shift_plans p
            ON p.employee_id = ae.employee_id
           AND p.tenant_id = $1::uuid
           AND p.is_active = true
          CROSS JOIN bounds period
          INNER JOIN public.shifts s
            ON s.id = p.shift_id
           AND s.tenant_id = p.tenant_id
          LEFT JOIN public.shift_constructors sc
            ON sc.shift_id = s.id
           AND sc.tenant_id = s.tenant_id
           AND sc.is_active = true
          LEFT JOIN LATERAL (
            SELECT
              COALESCE(MIN(b.start_minutes) FILTER (WHERE b.is_break = false AND b.block_type IN ('ORDINARIA', 'NOCTURNA')), 0)::int AS work_start_minutes,
              COALESCE(MAX(b.end_minutes) FILTER (WHERE b.is_break = false AND b.block_type IN ('ORDINARIA', 'NOCTURNA')), 0)::int AS work_end_minutes,
              COALESCE(SUM(b.end_minutes - b.start_minutes) FILTER (WHERE b.is_break = false AND b.block_type IN ('ORDINARIA', 'NOCTURNA')), 0)::int AS work_minutes
            FROM public.shift_constructor_blocks b
            WHERE b.constructor_id = sc.id
              AND b.tenant_id = sc.tenant_id
              AND b.is_active = true
          ) blocks ON true
          LEFT JOIN LATERAL (
            SELECT
              CASE WHEN sc.id IS NOT NULL THEN blocks.work_minutes ELSE COALESCE(s.work_minutes, 0) END::int AS work_minutes,
              CASE WHEN sc.id IS NOT NULL THEN COALESCE(blocks.work_start_minutes, 0) ELSE (EXTRACT(HOUR FROM s.start_time)::int * 60 + EXTRACT(MINUTE FROM s.start_time)::int) END::int AS work_start_minutes,
              CASE WHEN sc.id IS NOT NULL THEN COALESCE(blocks.work_end_minutes, 0) ELSE (EXTRACT(HOUR FROM s.start_time)::int * 60 + EXTRACT(MINUTE FROM s.start_time)::int + COALESCE(s.work_minutes, 0)) END::int AS work_end_minutes
          ) sw ON true
          LEFT JOIN LATERAL (
            SELECT h.id
            FROM public.holidays h
            WHERE h.tenant_id = p.tenant_id
              AND h.is_active = true
              AND ((COALESCE(h.is_recurring, false) = true AND EXTRACT(MONTH FROM h.holiday_date) = EXTRACT(MONTH FROM p.shift_date) AND EXTRACT(DAY FROM h.holiday_date) = EXTRACT(DAY FROM p.shift_date))
                OR (COALESCE(h.is_recurring, false) = false AND h.holiday_date = p.shift_date))
              AND (h.company_id IS NULL OR h.company_id = ae.company_id)
              AND (h.country_id IS NULL OR h.country_id = ae.employee_country_id)
              AND (h.state_id IS NULL OR h.state_id = ae.employee_state_id)
              AND (h.city_id IS NULL OR h.city_id = ae.employee_city_id)
              AND (h.work_location_id IS NULL OR h.work_location_id = ae.work_location_id)
            LIMIT 1
          ) holiday ON true
          LEFT JOIN LATERAL (
            SELECT r.id
            FROM public.employee_absence_requests r
            INNER JOIN public.lookup_values rs ON rs.id = r.request_status_id
            WHERE r.tenant_id = p.tenant_id
              AND r.employee_id = ae.employee_id
              AND r.is_active = true
              AND UPPER(COALESCE(rs.lookup_key, '')) IN ('APPROVED', 'APROBADO')
              AND r.start_datetime::date <= p.shift_date
              AND COALESCE(r.end_datetime, r.start_datetime)::date >= p.shift_date
            LIMIT 1
          ) approved_leave ON true
          WHERE p.shift_date BETWEEN period.start_date AND period.end_date
            AND (ae.hire_date IS NULL OR p.shift_date >= ae.hire_date::date)
            AND (ae.termination_date IS NULL OR p.shift_date <= ae.termination_date::date)
            AND approved_leave.id IS NULL
            AND (holiday.id IS NULL OR ae.work_on_holidays = true)
            AND sw.work_minutes > 0
        ),
        punches AS (
          SELECT
            p.employee_id,
            p.punch_datetime::date AS shift_date,
            MIN(p.punch_datetime) AS first_punch,
            MAX(p.punch_datetime) AS last_punch,
            MIN(p.punch_datetime) FILTER (WHERE p.punch_key = 1) AS first_entry,
            MAX(p.punch_datetime) FILTER (WHERE p.punch_key = 4) AS last_exit
          FROM public.employee_time_punches p
          INNER JOIN assigned_employees ae ON ae.employee_id = p.employee_id
          CROSS JOIN bounds period
          WHERE p.tenant_id = $1::uuid
            AND p.is_active = true
            AND p.punch_datetime::date BETWEEN period.start_date AND period.end_date
          GROUP BY p.employee_id, p.punch_datetime::date
        ),
        attendance AS (
          SELECT
            scheduled.*,
            CASE
              WHEN COALESCE(punches.first_entry, punches.first_punch) IS NULL THEN 'FALTA'
              WHEN COALESCE(punches.first_entry, punches.first_punch) > (scheduled.shift_date + (scheduled.work_start_minutes || ' minutes')::interval + (scheduled.entry_grace_minutes || ' minutes')::interval) THEN 'ATRASO'
              WHEN COALESCE(punches.last_exit, punches.last_punch) IS NOT NULL
               AND COALESCE(punches.last_exit, punches.last_punch) < (scheduled.shift_date + (scheduled.work_end_minutes || ' minutes')::interval - (scheduled.exit_grace_minutes || ' minutes')::interval) THEN 'SALIDA_ANTICIPADA'
              ELSE 'NORMAL'
            END AS issue_key,
            punches.first_entry,
            punches.last_exit
          FROM scheduled
          LEFT JOIN punches
            ON punches.employee_id = scheduled.employee_id
           AND punches.shift_date = scheduled.shift_date
        ),
        metrics_by_day AS (
          SELECT
            attendance.employee_id,
            attendance.employee_code,
            attendance.employee_name,
            attendance.area_name,
            attendance.shift_date,
            attendance.issue_key,
            0::int AS ordinary_minutes,
            0::int AS night_minutes,
            0::int AS extra_50_minutes,
            0::int AS extra_100_minutes
          FROM attendance
        ),
        series AS (
          SELECT
            buckets.bucket_start,
            buckets.bucket_end,
            buckets.label,
            COUNT(metrics_by_day.employee_id)::int AS planned,
            COUNT(*) FILTER (WHERE metrics_by_day.issue_key = 'ATRASO')::int AS late,
            COUNT(*) FILTER (WHERE metrics_by_day.issue_key = 'FALTA')::int AS absences,
            COUNT(*) FILTER (WHERE metrics_by_day.issue_key = 'SALIDA_ANTICIPADA')::int AS early_departures,
            COALESCE(SUM(metrics_by_day.ordinary_minutes), 0)::int AS ordinary_minutes,
            COALESCE(SUM(metrics_by_day.night_minutes), 0)::int AS night_minutes,
            COALESCE(SUM(metrics_by_day.extra_50_minutes), 0)::int AS extra_50_minutes,
            COALESCE(SUM(metrics_by_day.extra_100_minutes), 0)::int AS extra_100_minutes
          FROM buckets
          LEFT JOIN metrics_by_day ON metrics_by_day.shift_date BETWEEN buckets.bucket_start AND buckets.bucket_end
          GROUP BY buckets.bucket_start, buckets.bucket_end, buckets.label
          ORDER BY buckets.bucket_start
        ),
        summary AS (
          SELECT
            COALESCE(SUM(planned), 0)::int AS planned,
            COALESCE(SUM(late), 0)::int AS late,
            COALESCE(SUM(absences), 0)::int AS absences,
            COALESCE(SUM(early_departures), 0)::int AS early_departures,
            COALESCE(SUM(ordinary_minutes), 0)::int AS ordinary_minutes,
            COALESCE(SUM(night_minutes), 0)::int AS night_minutes,
            COALESCE(SUM(extra_50_minutes), 0)::int AS extra_50_minutes,
            COALESCE(SUM(extra_100_minutes), 0)::int AS extra_100_minutes
          FROM series
        ),
        area_rank AS (
          SELECT
            area_name AS name,
            NULL::text AS employee_code,
            COUNT(*) FILTER (WHERE issue_key = 'ATRASO')::int AS late,
            COUNT(*) FILTER (WHERE issue_key = 'FALTA')::int AS absences,
            COUNT(*) FILTER (WHERE issue_key = 'SALIDA_ANTICIPADA')::int AS early_departures,
            COALESCE(SUM(ordinary_minutes), 0)::int AS ordinary_minutes,
            COALESCE(SUM(night_minutes), 0)::int AS night_minutes,
            COALESCE(SUM(extra_50_minutes), 0)::int AS extra_50_minutes,
            COALESCE(SUM(extra_100_minutes), 0)::int AS extra_100_minutes
          FROM metrics_by_day
          GROUP BY area_name
        ),
        employee_rank AS (
          SELECT
            employee_name AS name,
            employee_code,
            COUNT(*) FILTER (WHERE issue_key = 'ATRASO')::int AS late,
            COUNT(*) FILTER (WHERE issue_key = 'FALTA')::int AS absences,
            COUNT(*) FILTER (WHERE issue_key = 'SALIDA_ANTICIPADA')::int AS early_departures,
            COALESCE(SUM(ordinary_minutes), 0)::int AS ordinary_minutes,
            COALESCE(SUM(night_minutes), 0)::int AS night_minutes,
            COALESCE(SUM(extra_50_minutes), 0)::int AS extra_50_minutes,
            COALESCE(SUM(extra_100_minutes), 0)::int AS extra_100_minutes
          FROM metrics_by_day
          GROUP BY employee_name, employee_code
        )
        SELECT json_build_object(
          'interval', (SELECT interval_key FROM bounds),
          'summary', (SELECT row_to_json(summary) FROM summary),
          'series', COALESCE((SELECT json_agg(row_to_json(series) ORDER BY bucket_start) FROM series), '[]'::json),
          'rankings', json_build_object(
            'area_absence', COALESCE((SELECT json_agg(row_to_json(ranked)) FROM (SELECT * FROM area_rank ORDER BY late + absences + early_departures DESC, name ASC LIMIT 5) ranked), '[]'::json),
            'employee_absence', COALESCE((SELECT json_agg(row_to_json(ranked)) FROM (SELECT * FROM employee_rank ORDER BY late + absences + early_departures DESC, name ASC LIMIT 5) ranked), '[]'::json),
            'area_surcharge', COALESCE((SELECT json_agg(row_to_json(ranked)) FROM (SELECT * FROM area_rank ORDER BY ordinary_minutes + night_minutes + extra_50_minutes + extra_100_minutes DESC, name ASC LIMIT 5) ranked), '[]'::json),
            'employee_surcharge', COALESCE((SELECT json_agg(row_to_json(ranked)) FROM (SELECT * FROM employee_rank ORDER BY ordinary_minutes + night_minutes + extra_50_minutes + extra_100_minutes DESC, name ASC LIMIT 5) ranked), '[]'::json)
          )
        ) AS analytics
      `,
      [...scopedParams, periodInterval]
    );

    const [
      assignedCountResult,
      todayScheduledEmployeesResult,
      todayIssuesResult,
      latestPunchesResult,
      surchargeSummaryResult,
      trendResult,
      rankingResult,
      rankingMoreResult,
      employeeOvertimeResult,
      periodSurchargeAnalyticsResult,
      periodAnalyticsResult,
    ] = await Promise.all([
      assignedCountQuery,
      todayScheduledEmployeesQuery,
      todayIssuesQuery,
      latestPunchesQuery,
      surchargeSummaryQuery,
      trendQuery,
      rankingQuery,
      rankingMoreQuery,
      employeeOvertimeQuery,
      periodSurchargeAnalyticsQuery,
      periodAnalyticsQuery,
    ]);

    const base = assignedCountResult.rows[0] || {};
    const todayScheduled = todayScheduledEmployeesResult.rows[0] || {};
    const todayIssues = todayIssuesResult.rows || [];
    const latestPunches = latestPunchesResult.rows || [];
    const surchargeSummary = surchargeSummaryResult.rows[0] || {};
    const trendRows = trendResult.rows || [];
    const areaAbsenceRanking = rankingResult.rows || [];
    const rankingMoreRows = rankingMoreResult.rows || [];
    const basePeriodAnalytics = periodAnalyticsResult.rows?.[0]?.analytics || {
      interval: periodInterval,
      summary: {},
      series: [],
      rankings: {},
    };
    const periodSurchargeAnalytics = periodSurchargeAnalyticsResult.rows?.[0]?.analytics || {
      summary: {},
      series: [],
      area_surcharge: [],
      employee_surcharge: [],
    };
    const surchargeSeriesByBucket = new Map(
      (periodSurchargeAnalytics.series || []).map((row: any) => [String(row.bucket_start), row])
    );
    const basePeriodSeries = Array.isArray(basePeriodAnalytics.series) ? basePeriodAnalytics.series : [];
    const periodSeriesSource = basePeriodSeries.length > 0
      ? basePeriodSeries
      : (periodSurchargeAnalytics.series || []);
    const periodAnalytics = {
      ...basePeriodAnalytics,
      interval: periodInterval,
      summary: {
        ...(basePeriodAnalytics.summary || {}),
        ...(periodSurchargeAnalytics.summary || {}),
      },
      series: periodSeriesSource.map((row: any) => {
        const surchargeRow: any = surchargeSeriesByBucket.get(String(row.bucket_start)) || row;
        return {
          ...row,
          ordinary_minutes: Number(surchargeRow.ordinary_minutes || 0),
          night_minutes: Number(surchargeRow.night_minutes || 0),
          extra_50_minutes: Number(surchargeRow.extra_50_minutes || 0),
          extra_100_minutes: Number(surchargeRow.extra_100_minutes || 0),
        };
      }),
      rankings: {
        ...(basePeriodAnalytics.rankings || {}),
        area_surcharge: periodSurchargeAnalytics.area_surcharge || [],
        employee_surcharge: periodSurchargeAnalytics.employee_surcharge || [],
      },
    };
    const ordinaryMinutes = Number(surchargeSummary.ordinary_minutes || 0);
    const nightMinutes = Number(surchargeSummary.night_minutes || 0);
    const extra50Minutes = Number(surchargeSummary.extra_50_minutes || 0);
    const extra100Minutes = Number(surchargeSummary.extra_100_minutes || 0);
    const surchargeTotalMinutes = ordinaryMinutes + nightMinutes + extra50Minutes + extra100Minutes;
    const isApprovedStatus = (value: unknown) => ['APPROVED', 'APROBADO'].includes(String(value || '').toUpperCase());
    const todayLate = latestPunches.filter((row: any) => ['ATRASO', 'ATRASO_JUSTIFICACION_PENDIENTE'].includes(String(row.event_key || '').toUpperCase())).length;
    const todayEarlyDepartures = latestPunches.filter((row: any) => (
      String(row.event_key || '').toUpperCase() === 'SALIDA_ANTICIPADA'
      && !isApprovedStatus(row.early_departure_justification_status_key)
    )).length;
    const todayPunchJustified = latestPunches.filter((row: any) => (
      String(row.event_key || '').toUpperCase() === 'ATRASO_JUSTIFICADO'
      || (
        String(row.event_key || '').toUpperCase() === 'SALIDA_ANTICIPADA'
        && isApprovedStatus(row.early_departure_justification_status_key)
      )
    )).length;
    const todayLeaveJustified = todayIssues.filter((row: any) => (
      row.event_key === 'JUSTIFICADO'
      && !row.first_entry
      && !row.last_exit
    )).length;

    return res.status(200).json({
      success: true,
      generated_at: new Date().toISOString(),
      realtime: {
        version: getTenantDashboardEventVersion(tenantId),
      },
      supervisor: {
        display_name: context.display_name || context.email,
        email: context.email,
        tenant_name: context.tenant_name,
        role_keys: roleKeys,
      },
      metrics: {
        assigned_employees: Number(base.assigned_employees || 0),
        assigned_areas: Number(base.assigned_areas || 0),
        assigned_departments: Number(base.assigned_departments || 0),
        today_scheduled_employees: Number(todayScheduled.today_scheduled_employees || 0),
        today_scheduled_areas: Number(todayScheduled.today_scheduled_areas || 0),
        today_absences: todayIssues.filter((row: any) => row.event_key === 'FALTA').length,
        today_late: todayLate,
        today_early_departures: todayEarlyDepartures,
        today_justified: todayPunchJustified + todayLeaveJustified,
        today_punches: latestPunches.length,
      },
      today_issues: todayIssues,
      latest_punches: latestPunches,
      surcharge_hours: {
        ordinary_minutes: ordinaryMinutes,
        night_minutes: nightMinutes,
        extra_50_minutes: extra50Minutes,
        extra_100_minutes: extra100Minutes,
        total_minutes: surchargeTotalMinutes,
        ordinary_hours: Number((ordinaryMinutes / 60).toFixed(2)),
        night_hours: Number((nightMinutes / 60).toFixed(2)),
        extra_50_hours: Number((extra50Minutes / 60).toFixed(2)),
        extra_100_hours: Number((extra100Minutes / 60).toFixed(2)),
        total_hours: Number((surchargeTotalMinutes / 60).toFixed(2)),
      },
      period_analytics: periodAnalytics,
      trends: {
        last_7_days: trendRows.filter((row: any) => row.series_type === 'daily'),
        last_4_weeks: trendRows.filter((row: any) => row.series_type === 'weekly'),
      },
      rankings: {
        area_absence: areaAbsenceRanking,
        area_overtime: rankingMoreRows.filter((row: any) => row.ranking_type === 'area_overtime'),
        employee_absence: rankingMoreRows.filter((row: any) => row.ranking_type === 'employee_absence').slice(0, 5),
        employee_overtime: employeeOvertimeResult.rows || [],
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Internal server error',
    });
  }
});

router.get('/dashboard/supervisor-events', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const authUserId = user?.id;
    if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });

    const contextResult = await pool.query(
      `
        SELECT
          u.id AS user_id,
          u.tenant_id,
          ARRAY_AGG(DISTINCT UPPER(COALESCE(r.role_key, ''))) FILTER (WHERE r.role_key IS NOT NULL) AS role_keys
        FROM public.users u
        LEFT JOIN public.user_roles ur
          ON ur.user_id = u.id
         AND ur.is_active = true
         AND (ur.valid_from IS NULL OR ur.valid_from <= now())
         AND (ur.valid_to IS NULL OR ur.valid_to >= now())
        LEFT JOIN public.roles r
          ON r.id = ur.role_id
         AND r.is_active = true
        WHERE u.auth_user_id = $1
          AND u.is_active = true
        GROUP BY u.id, u.tenant_id
        LIMIT 1
      `,
      [authUserId]
    );

    const context = contextResult.rows[0];
    if (!context?.tenant_id) {
      return res.status(403).json({ error: 'No se pudo resolver contexto de supervisor' });
    }

    const roleKeys = (context.role_keys || []).map((key: string) => String(key || '').trim().toUpperCase());
    const canViewSupervisorDashboard = roleKeys.some((key: string) => ['SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN', 'TENANT_ADMIN'].includes(key));
    if (!canViewSupervisorDashboard) {
      return res.status(403).json({ error: 'Dashboard disponible para Supervisor/RRHH' });
    }

    const sinceVersion = Number.isFinite(Number(req.query.since)) ? Math.max(0, Math.trunc(Number(req.query.since))) : 0;
    const eventResult = await waitForTenantDashboardEvent(String(context.tenant_id), sinceVersion);

    return res.status(200).json({
      success: true,
      ...eventResult,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Internal server error',
    });
  }
});

/**
 * GET /dashboard/employee-summary
 *
 * Resumen del home para el rol EMPLOYEE.
 * Devuelve datos para modulos:
 * 1) Perfil empleado + empleado/empresa
 * 2) 10 marcaciones mas recientes
 * 3) Turnos de la semana en curso (7 dias + numero de semana ISO)
 * 4) Solicitudes de justificacion/permiso con estado
 * 5) Feriados aplicables del mes en curso segun alcance organizacional/geografico
 * 6) Incidencias detalladas y estado de justificación (rango solicitado)
 * 7) Horas trabajadas y tiempos no laborados (rango solicitado; semana actual por defecto)
 */
router.get('/dashboard/employee-summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const authUserId = user?.id;
    if (!authUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const contextResult = await pool.query(
      `
        SELECT
          u.id AS user_id,
          u.email AS user_email,
          u.display_name AS user_display_name,
          u.tenant_id,
          e.id AS employee_id,
          e.employee_code,
          e.employee_name,
          e.employee_lastname,
          u.phone,
          e.employee_birthday,
          e.employee_gender_id,
          g.lookup_label AS gender_label,
          e.user_id AS internal_user_id,
          ec.id AS employee_company_id,
          ec.company_id,
          c.legacy_id AS company_code,
          c.company_name,
          c.company_short_name,
          c.company_country_id AS country_id,
          c.company_state_id AS state_id,
          c.company_city_id AS city_id,
          country.lookup_label AS country_label,
          state.lookup_label AS state_label,
          city.lookup_label AS city_label,
          ec.work_location_id,
          wl.legacy_id AS work_location_code,
          wl.work_location_name,
          wl.work_location_short_name,
          wl.country_id AS work_location_country_id,
          wl.state_id AS work_location_state_id,
          wl.city_id AS work_location_city_id,
          ec.employee_profile_id,
          ep.profile_name AS employee_profile_name,
          ep.profile_short_name AS employee_profile_short_name,
          ec.payroll_group_id,
          pg.payroll_group_name,
          ec.department_id,
          d.department_name,
          d.department_short_name,
          ec.area_id,
          a.area_name,
          a.area_short_name,
          ec.job_title_id,
          jt.job_title_name,
          jt.job_title_short_name,
          ec.work_group_id,
          wg.work_group_name,
          ec.cost_center_id,
          cc.cost_center_name,
          ec.payroll_employee_code,
          ec.device_user_code,
          ec.hire_date,
          ec.termination_date,
          ec.work_on_holidays
        FROM public.users u
        INNER JOIN public.employees e
          ON e.user_id = u.id
         AND e.tenant_id = u.tenant_id
         AND e.is_active = true
        LEFT JOIN public.lookup_values g
          ON g.id = e.employee_gender_id
        LEFT JOIN LATERAL (
          SELECT *
          FROM public.employee_companies ecx
          WHERE ecx.tenant_id = u.tenant_id
            AND ecx.employee_id = e.id
            AND ecx.is_active = true
          ORDER BY ecx.created_at DESC NULLS LAST
          LIMIT 1
        ) ec ON true
        LEFT JOIN public.companies c
          ON c.id = ec.company_id
        LEFT JOIN public.lookup_values country
          ON country.id = c.company_country_id
        LEFT JOIN public.lookup_values state
          ON state.id = c.company_state_id
        LEFT JOIN public.lookup_values city
          ON city.id = c.company_city_id
        LEFT JOIN public.work_locations wl
          ON wl.id = ec.work_location_id
        LEFT JOIN public.employee_profiles ep
          ON ep.id = ec.employee_profile_id
        LEFT JOIN public.payroll_groups pg
          ON pg.id = ec.payroll_group_id
        LEFT JOIN public.departments d
          ON d.id = ec.department_id
        LEFT JOIN public.areas a
          ON a.id = ec.area_id
        LEFT JOIN public.job_titles jt
          ON jt.id = ec.job_title_id
        LEFT JOIN public.work_groups wg
          ON wg.id = ec.work_group_id
        LEFT JOIN public.cost_centers cc
          ON cc.id = ec.cost_center_id
        WHERE u.auth_user_id = $1
          AND u.is_active = true
        LIMIT 1
      `,
      [authUserId]
    );

    const context = contextResult.rows[0];
    if (!context?.tenant_id || !context?.employee_id) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const tenantId = String(context.tenant_id);
    const employeeId = String(context.employee_id);
    const companyId = context.company_id ? String(context.company_id) : '';
    const workLocationId = context.work_location_id ? String(context.work_location_id) : '';
    const companyCountryId = context.country_id ? String(context.country_id) : '';
    const companyStateId = context.state_id ? String(context.state_id) : '';
    const companyCityId = context.city_id ? String(context.city_id) : '';
    const workLocationCountryId = context.work_location_country_id ? String(context.work_location_country_id) : '';
    const workLocationStateId = context.work_location_state_id ? String(context.work_location_state_id) : '';
    const workLocationCityId = context.work_location_city_id ? String(context.work_location_city_id) : '';
    const employeeCountryId = workLocationCountryId || companyCountryId;
    const employeeStateId = workLocationStateId || companyStateId;
    const employeeCityId = workLocationCityId || companyCityId;

    const normalizeDateOnly = (value: any): string => {
      if (!value) return '';
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
      }
      const raw = String(value);
      const isoPrefix = raw.match(/^(\d{4}-\d{2}-\d{2})/);
      if (isoPrefix?.[1]) return isoPrefix[1];
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
      return raw.slice(0, 10);
    };

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEndExclusive = new Date(currentYear, currentMonth, 1);
    const monthStartIso = monthStart.toISOString().slice(0, 10);
    const monthEndExclusiveIso = monthEndExclusive.toISOString().slice(0, 10);
    const todayIso = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    const upcomingEndExclusive = new Date(`${todayIso}T00:00:00.000Z`);
    upcomingEndExclusive.setUTCDate(upcomingEndExclusive.getUTCDate() + 8);
    const upcomingEndExclusiveIso = upcomingEndExclusive.toISOString().slice(0, 10);
    const shiftQueryEndExclusiveIso = upcomingEndExclusiveIso > monthEndExclusiveIso
      ? upcomingEndExclusiveIso
      : monthEndExclusiveIso;
    const employeeHireDateIso = normalizeDateOnly(context.hire_date) || null;
    const employeeTerminationDateIso = normalizeDateOnly(context.termination_date) || null;

    const weekStart = new Date(`${todayIso}T00:00:00.000Z`);
    const dayOffset = (weekStart.getUTCDay() + 6) % 7; // lunes=0
    weekStart.setUTCDate(weekStart.getUTCDate() - dayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    const weekStartIso = weekStart.toISOString().slice(0, 10);
    const weekEndIso = weekEnd.toISOString().slice(0, 10);

    const requestedFrom = String(req.query.from || '').trim();
    const requestedTo = String(req.query.to || '').trim();
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    if ((requestedFrom && !isoDatePattern.test(requestedFrom)) || (requestedTo && !isoDatePattern.test(requestedTo))) {
      return res.status(400).json({ error: 'El rango de fechas debe usar el formato YYYY-MM-DD' });
    }

    const rangeFromIso = requestedFrom || weekStartIso;
    const rangeToIso = requestedTo || todayIso;
    if (rangeFromIso > rangeToIso) {
      return res.status(400).json({ error: 'La fecha desde no puede ser posterior a la fecha hasta' });
    }
    if (rangeToIso > todayIso) {
      return res.status(400).json({ error: 'No se puede consultar información de fechas futuras' });
    }

    const rangeFromDate = new Date(`${rangeFromIso}T00:00:00.000Z`);
    const rangeToDate = new Date(`${rangeToIso}T00:00:00.000Z`);
    if (
      Number.isNaN(rangeFromDate.getTime())
      || Number.isNaN(rangeToDate.getTime())
      || rangeFromDate.toISOString().slice(0, 10) !== rangeFromIso
      || rangeToDate.toISOString().slice(0, 10) !== rangeToIso
    ) {
      return res.status(400).json({ error: 'El rango de fechas no es válido' });
    }
    const rangeDays = Math.floor((rangeToDate.getTime() - rangeFromDate.getTime()) / 86_400_000) + 1;
    if (rangeDays > 366) {
      return res.status(400).json({ error: 'El rango máximo permitido es de 366 días' });
    }
    const rangeEndExclusiveDate = new Date(rangeToDate);
    rangeEndExclusiveDate.setUTCDate(rangeEndExclusiveDate.getUTCDate() + 1);
    const rangeEndExclusiveIso = rangeEndExclusiveDate.toISOString().slice(0, 10);

    const weekInfoResult = await pool.query(
      `
        SELECT
          TO_CHAR($1::date, 'IW')::int AS iso_week,
          TO_CHAR($1::date, 'IYYY')::int AS iso_year
      `,
      [now.toISOString().slice(0, 10)]
    );
    const isoWeek = Number(weekInfoResult.rows[0]?.iso_week || 0);
    const isoYear = Number(weekInfoResult.rows[0]?.iso_year || currentYear);

    const [recentPunchesResult, monthPunchesResult, monthShiftsResult, monthAbsenceRequestsResult, monthTimePunchChangeRequestsResult, monthShiftChangeRequestsResult, holidaysRawResult, attendanceImpactResult, monthlyNoveltyResult, incidentsResult, oddPunchesResult, derivedIncidentsResult] = await Promise.all([
      pool.query(
        `
          SELECT
            p.id,
            p.punch_datetime,
            p.punch_time_zone,
            (p.punch_datetime AT TIME ZONE COALESCE(NULLIF(p.punch_time_zone, ''), 'America/Guayaquil'))::date AS punch_date,
            TO_CHAR(p.punch_datetime AT TIME ZONE COALESCE(NULLIF(p.punch_time_zone, ''), 'America/Guayaquil'), 'HH24:MI') AS punch_time_local,
            p.punch_key,
            mv.lookup_label AS movement_label,
            p.time_punch_status_id,
            st.lookup_key AS time_punch_status_key,
            st.lookup_label AS time_punch_status_label,
            p.notes,
            p.is_active
          FROM public.employee_time_punches p
          LEFT JOIN public.lookup_values st
            ON st.id = p.time_punch_status_id
          LEFT JOIN LATERAL (
            SELECT lv.lookup_label
            FROM public.lookup_values lv
            WHERE lv.lookup_group_id = 'a349d449-b3c1-475a-91bd-c687b49e97cc'::uuid
              AND lv.sort_order = p.punch_key
              AND lv.is_active = true
              AND (lv.tenant_id IS NULL OR lv.tenant_id = p.tenant_id)
            ORDER BY CASE WHEN lv.tenant_id = p.tenant_id THEN 0 ELSE 1 END
            LIMIT 1
          ) mv ON true
          WHERE p.tenant_id = $1::uuid
            AND p.employee_id = $2::uuid
          ORDER BY p.punch_datetime DESC, p.created_at DESC
          LIMIT 10
        `,
        [tenantId, employeeId]
      ),
      pool.query(
        `
          SELECT
            p.id,
            p.punch_datetime,
            p.punch_time_zone,
            (p.punch_datetime AT TIME ZONE COALESCE(NULLIF(p.punch_time_zone, ''), 'America/Guayaquil'))::date AS punch_date,
            TO_CHAR(p.punch_datetime AT TIME ZONE COALESCE(NULLIF(p.punch_time_zone, ''), 'America/Guayaquil'), 'HH24:MI') AS punch_time_local,
            p.punch_key,
            mv.lookup_label AS movement_label,
            p.time_punch_status_id,
            st.lookup_key AS time_punch_status_key,
            st.lookup_label AS time_punch_status_label,
            p.notes,
            p.is_active
          FROM public.employee_time_punches p
          LEFT JOIN public.lookup_values st
            ON st.id = p.time_punch_status_id
          LEFT JOIN LATERAL (
            SELECT lv.lookup_label
            FROM public.lookup_values lv
            WHERE lv.lookup_group_id = 'a349d449-b3c1-475a-91bd-c687b49e97cc'::uuid
              AND lv.sort_order = p.punch_key
              AND lv.is_active = true
              AND (lv.tenant_id IS NULL OR lv.tenant_id = p.tenant_id)
            ORDER BY CASE WHEN lv.tenant_id = p.tenant_id THEN 0 ELSE 1 END
            LIMIT 1
          ) mv ON true
          WHERE p.tenant_id = $1::uuid
            AND p.employee_id = $2::uuid
            AND p.punch_datetime >= $3::date
            AND p.punch_datetime < $4::date
          ORDER BY p.punch_datetime ASC, p.created_at ASC
          LIMIT 500
        `,
        [tenantId, employeeId, monthStartIso, monthEndExclusiveIso]
      ),
      pool.query(
        `
          SELECT
            p.shift_date,
            p.shift_type_id,
            stype.lookup_label AS shift_type_label,
            pending_req.pending_request_id,
            pending_req.pending_request_status_id,
            pending_req.pending_request_status_key,
            pending_req.pending_request_status_label,
            pending_req.pending_requested_shift_id,
            pending_req.pending_requested_shift_name,
            pending_req.pending_requested_shift_short_name,
            p.shift_id AS effective_shift_id,
            s.shift_name AS effective_shift_name,
            s.shift_short_name AS effective_shift_short_name,
            COALESCE(NULLIF(TRIM(s.shift_short_name), ''), s.shift_name) AS effective_shift_display_name,
            s.start_time AS effective_start_time,
            s.work_minutes AS effective_work_minutes,
            s.shift_icon_key AS effective_shift_icon_key,
            s.shift_bg_color AS effective_shift_bg_color,
            s.shift_text_color AS effective_shift_text_color,
            p.shift_id AS planned_shift_id,
            s.shift_name AS planned_shift_name,
            s.shift_short_name AS planned_shift_short_name
          FROM public.employees e
          INNER JOIN public.employee_shift_plans p
            ON e.id = p.employee_id
           AND e.tenant_id = p.tenant_id
          INNER JOIN public.shifts s
            ON s.id = p.shift_id
           AND s.tenant_id = p.tenant_id
          LEFT JOIN public.lookup_values stype
            ON stype.id = p.shift_type_id
          LEFT JOIN LATERAL (
            SELECT
              r.id AS pending_request_id,
              r.request_status_id AS pending_request_status_id,
              st.lookup_key AS pending_request_status_key,
              st.lookup_label AS pending_request_status_label,
              r.requested_shift_id AS pending_requested_shift_id,
              rs.shift_name AS pending_requested_shift_name,
              rs.shift_short_name AS pending_requested_shift_short_name
            FROM public.employee_shift_change_requests r
            LEFT JOIN public.lookup_values st
              ON st.id = r.request_status_id
            LEFT JOIN public.shifts rs
              ON rs.id = r.requested_shift_id
            WHERE r.tenant_id = p.tenant_id
              AND r.employee_id = p.employee_id
              AND r.shift_date = p.shift_date
              AND r.is_active = true
              AND (
                UPPER(COALESCE(st.lookup_key, '')) IN ('PENDING', 'PENDIENTE', 'IN_REVIEW', 'EN_REVISION', 'EN_REVISIÓN')
                OR UPPER(COALESCE(st.lookup_label, '')) LIKE 'PENDIENTE%'
                OR UPPER(COALESCE(st.lookup_label, '')) LIKE 'EN REVISI%'
              )
            ORDER BY r.created_at DESC
            LIMIT 1
          ) pending_req ON true
          WHERE e.tenant_id = $1::uuid
            AND e.user_id = $2::uuid
            AND e.is_active = true
            AND p.is_active = true
            AND p.shift_date >= $3::date
            AND p.shift_date < $4::date
            AND ($5::date IS NULL OR p.shift_date >= $5::date)
            AND ($6::date IS NULL OR p.shift_date <= $6::date)
          ORDER BY p.shift_date ASC
        `,
        [tenantId, context.user_id, monthStartIso, shiftQueryEndExclusiveIso, employeeHireDateIso, employeeTerminationDateIso]
      ),
      pool.query(
        `
          SELECT
            r.id,
            r.start_datetime,
            r.end_datetime,
            r.notes,
            r.is_active,
            r.request_status_id,
            rs.lookup_key AS request_status_key,
            rs.lookup_label AS request_status_label,
            r.justification_type_id,
            jt.justification_name,
            r.attendance_event_id,
            ae.event_name,
            r.justify_method_id,
            jm.lookup_key AS justify_method_key,
            jm.lookup_label AS justify_method_label
          FROM public.employee_absence_requests r
          LEFT JOIN public.lookup_values rs
            ON rs.id = r.request_status_id
          LEFT JOIN public.justification_types jt
            ON jt.id = r.justification_type_id
          LEFT JOIN public.attendance_events ae
            ON ae.id = r.attendance_event_id
          LEFT JOIN public.lookup_values jm
            ON jm.id = r.justify_method_id
          WHERE r.tenant_id = $1::uuid
            AND r.employee_id = $2::uuid
            AND r.is_active = true
            AND r.start_datetime::date < $4::date
            AND COALESCE(r.end_datetime, r.start_datetime)::date >= $3::date
          ORDER BY r.start_datetime ASC, r.created_at ASC
          LIMIT 300
        `,
        [tenantId, employeeId, monthStartIso, monthEndExclusiveIso]
      ),
      pool.query(
        `
          SELECT
            r.id,
            r.target_punch_id,
            r.reason,
            r.created_at,
            COALESCE(p.punch_datetime, r.created_at) AS request_datetime,
            r.request_type_id,
            rt.lookup_key AS request_type_key,
            rt.lookup_label AS request_type_label,
            r.request_status_id,
            st.lookup_key AS request_status_key,
            st.lookup_label AS request_status_label
          FROM public.employee_time_punch_change_requests r
          LEFT JOIN public.employee_time_punches p
            ON p.id = r.target_punch_id
           AND p.tenant_id = r.tenant_id
          LEFT JOIN public.lookup_values rt
            ON rt.id = r.request_type_id
          LEFT JOIN public.lookup_values st
            ON st.id = r.request_status_id
          WHERE r.tenant_id = $1::uuid
            AND r.employee_id = $2::uuid
            AND r.is_active = true
            AND COALESCE(p.punch_datetime, r.created_at) >= $3::date
            AND COALESCE(p.punch_datetime, r.created_at) < $4::date
          ORDER BY request_datetime ASC, r.created_at ASC
          LIMIT 300
        `,
        [tenantId, employeeId, monthStartIso, monthEndExclusiveIso]
      ),
      pool.query(
        `
          SELECT
            r.id,
            r.shift_date,
            r.reason,
            r.request_status_id,
            st.lookup_key AS request_status_key,
            st.lookup_label AS request_status_label,
            r.current_shift_id,
            cs.shift_name AS current_shift_name,
            r.requested_shift_id,
            rsf.shift_name AS requested_shift_name
          FROM public.employee_shift_change_requests r
          LEFT JOIN public.lookup_values st
            ON st.id = r.request_status_id
          LEFT JOIN public.shifts cs
            ON cs.id = r.current_shift_id
          LEFT JOIN public.shifts rsf
            ON rsf.id = r.requested_shift_id
          WHERE r.tenant_id = $1::uuid
            AND r.employee_id = $2::uuid
            AND r.is_active = true
            AND r.shift_date >= $3::date
            AND r.shift_date < $4::date
          ORDER BY r.shift_date ASC, r.created_at ASC
          LIMIT 300
        `,
        [tenantId, employeeId, monthStartIso, monthEndExclusiveIso]
      ),
      pool.query(
        `
          SELECT
            h.id,
            h.holiday_date,
            h.holiday_name,
            h.is_recurring,
            h.company_id,
            h.country_id,
            h.state_id,
            h.city_id,
            h.work_location_id,
            h.holiday_type_id,
            ht.lookup_key AS holiday_type_key,
            ht.lookup_label AS holiday_type_label,
            to_jsonb(ht) -> 'metadata' ->> 'icon_key' AS holiday_type_icon_key,
            to_jsonb(ht) -> 'metadata' ->> 'icon_glyph' AS holiday_type_icon_glyph,
            to_jsonb(ht) -> 'metadata' ->> 'icon_color' AS holiday_type_icon_color
          FROM public.holidays h
          LEFT JOIN public.lookup_values ht
            ON ht.id = h.holiday_type_id
          WHERE h.tenant_id = $1::uuid
            AND h.is_active = true
          ORDER BY h.holiday_date ASC
        `,
        [tenantId]
      ),
      pool.query(
        `
          SELECT
            ae.id AS attendance_event_id,
            ae.event_name,
            ae.event_short_name,
            direction.lookup_key AS direction_key,
            direction.lookup_label AS direction_label,
            event_type.lookup_key AS event_type_key,
            event_type.lookup_label AS event_type_label,
            SUM(
              CASE
                WHEN calc.is_approved = true AND calc.approved_value IS NOT NULL
                  THEN calc.approved_value
                ELSE calc.generated_value
              END
            )::numeric AS total_value
          FROM public.employee_attendance_calculations calc
          INNER JOIN public.attendance_events ae
            ON ae.id = calc.attendance_event_id
          LEFT JOIN public.lookup_values direction
            ON direction.id = ae.transaction_direction_id
          LEFT JOIN public.lookup_values event_type
            ON event_type.id = ae.event_type_id
          WHERE calc.tenant_id = $1::uuid
            AND calc.employee_id = $2::uuid
            AND COALESCE(
              (calc.event_datetime AT TIME ZONE 'America/Guayaquil')::date,
              make_date(calc.year, calc.month, calc.day)
            ) >= $3::date
            AND COALESCE(
              (calc.event_datetime AT TIME ZONE 'America/Guayaquil')::date,
              make_date(calc.year, calc.month, calc.day)
            ) < $4::date
            AND calc.is_active = true
          GROUP BY
            ae.id,
            ae.event_name,
            ae.event_short_name,
            direction.lookup_key,
            direction.lookup_label,
            event_type.lookup_key,
            event_type.lookup_label
          HAVING SUM(
            CASE
              WHEN calc.is_approved = true AND calc.approved_value IS NOT NULL
                THEN calc.approved_value
              ELSE calc.generated_value
            END
          ) <> 0
          ORDER BY total_value DESC
          LIMIT 50
        `,
        [tenantId, employeeId, rangeFromIso, rangeEndExclusiveIso]
      ),
      pool.query(
        `
          WITH plans AS (
            SELECT
              p.employee_id,
              p.shift_date,
              s.id AS shift_id,
              s.start_time,
              COALESCE(s.work_minutes, 0)::int AS shift_work_minutes,
              COALESCE(s.entry_grace_minutes, 0)::int AS entry_grace_minutes,
              COALESCE(s.exit_grace_minutes, 0)::int AS exit_grace_minutes,
              sc.id AS constructor_id,
              sc.tenant_id AS constructor_tenant_id,
              (EXTRACT(HOUR FROM s.start_time)::int * 60 + EXTRACT(MINUTE FROM s.start_time)::int) AS shift_start_minutes
            FROM public.employee_shift_plans p
            INNER JOIN public.shifts s
              ON s.id = p.shift_id
             AND s.tenant_id = p.tenant_id
            LEFT JOIN public.shift_constructors sc
              ON sc.shift_id = s.id
             AND sc.tenant_id = s.tenant_id
             AND sc.is_active = true
            WHERE p.tenant_id = $1::uuid
              AND p.employee_id = $2::uuid
              AND p.is_active = true
              AND p.shift_date >= $3::date
              AND p.shift_date < $4::date
              AND ($5::date IS NULL OR p.shift_date >= $5::date)
              AND ($6::date IS NULL OR p.shift_date <= $6::date)
          ),
          plan_bounds AS (
            SELECT
              pl.*,
              COALESCE(
                MIN(b.start_minutes) FILTER (
                  WHERE b.is_break = false
                    AND b.block_type IN ('ORDINARIA', 'NOCTURNA')
                ),
                pl.shift_start_minutes
              )::int AS work_start_minutes,
              COALESCE(
                MAX(b.end_minutes) FILTER (
                  WHERE b.is_break = false
                    AND b.block_type IN ('ORDINARIA', 'NOCTURNA')
                ),
                pl.shift_start_minutes + pl.shift_work_minutes
              )::int AS work_end_minutes,
              COALESCE(
                SUM(b.end_minutes - b.start_minutes) FILTER (
                  WHERE b.is_break = false
                    AND b.block_type IN ('ORDINARIA', 'NOCTURNA')
                ),
                pl.shift_work_minutes
              )::int AS planned_work_minutes,
              COUNT(b.id) FILTER (
                WHERE b.is_break = false
                  AND b.block_type IN ('ORDINARIA', 'NOCTURNA')
              )::int AS regular_block_count
            FROM plans pl
            LEFT JOIN public.shift_constructor_blocks b
              ON b.constructor_id = pl.constructor_id
             AND b.tenant_id = pl.constructor_tenant_id
             AND b.is_active = true
            GROUP BY
              pl.employee_id,
              pl.shift_date,
              pl.shift_id,
              pl.start_time,
              pl.shift_work_minutes,
              pl.entry_grace_minutes,
              pl.exit_grace_minutes,
              pl.constructor_id,
              pl.constructor_tenant_id,
              pl.shift_start_minutes
          ),
          classified_plan_bounds AS (
            SELECT
              pb.*,
              (
                CASE
                  WHEN pb.constructor_id IS NOT NULL THEN pb.regular_block_count = 0
                  ELSE pb.shift_work_minutes <= 0
                END
                OR EXISTS (
                  SELECT 1
                  FROM public.holidays holiday
                  WHERE holiday.tenant_id = $1::uuid
                    AND holiday.is_active = true
                    AND (
                      (COALESCE(holiday.is_recurring, false) = false AND holiday.holiday_date = pb.shift_date)
                      OR (
                        COALESCE(holiday.is_recurring, false) = true
                        AND EXTRACT(MONTH FROM holiday.holiday_date) = EXTRACT(MONTH FROM pb.shift_date)
                        AND EXTRACT(DAY FROM holiday.holiday_date) = EXTRACT(DAY FROM pb.shift_date)
                      )
                    )
                    AND (holiday.company_id IS NULL OR holiday.company_id = $7::uuid)
                    AND (holiday.country_id IS NULL OR holiday.country_id = $8::uuid)
                    AND (holiday.state_id IS NULL OR holiday.state_id = $9::uuid)
                    AND (holiday.city_id IS NULL OR holiday.city_id = $10::uuid)
                    AND (holiday.work_location_id IS NULL OR holiday.work_location_id = $11::uuid)
                )
                OR EXISTS (
                  SELECT 1
                  FROM public.employee_absence_requests absence_request
                  INNER JOIN public.lookup_values request_status
                    ON request_status.id = absence_request.request_status_id
                  LEFT JOIN public.lookup_values justify_method
                    ON justify_method.id = absence_request.justify_method_id
                  LEFT JOIN public.justification_types justification_type
                    ON justification_type.id = absence_request.justification_type_id
                  WHERE absence_request.tenant_id = $1::uuid
                    AND absence_request.employee_id = $2::uuid
                    AND absence_request.is_active = true
                    AND UPPER(COALESCE(request_status.lookup_key, request_status.lookup_label, '')) IN ('APPROVED', 'APROBADO', 'APROBADA')
                    AND pb.shift_date BETWEEN absence_request.start_datetime::date
                        AND COALESCE(absence_request.end_datetime, absence_request.start_datetime)::date
                    AND (
                      UPPER(COALESCE(justify_method.lookup_key, '')) IN ('VACACIONES', 'VACATION')
                      OR UPPER(COALESCE(justification_type.justification_name, '')) LIKE '%VACAC%'
                    )
                )
              ) AS is_non_working_day
            FROM plan_bounds pb
          ),
          punch_summary AS (
            SELECT
              p.employee_id,
              (p.punch_datetime AT TIME ZONE COALESCE(NULLIF(p.punch_time_zone, ''), 'America/Guayaquil'))::date AS shift_date,
              MIN(p.punch_datetime) FILTER (WHERE p.punch_key = 1) AS work_entry,
              MAX(p.punch_datetime) FILTER (WHERE p.punch_key = 4) AS work_exit
            FROM public.employee_time_punches p
            WHERE p.tenant_id = $1::uuid
              AND p.employee_id = $2::uuid
              AND p.is_active = true
              AND (p.punch_datetime AT TIME ZONE COALESCE(NULLIF(p.punch_time_zone, ''), 'America/Guayaquil'))::date >= $3::date
              AND (p.punch_datetime AT TIME ZONE COALESCE(NULLIF(p.punch_time_zone, ''), 'America/Guayaquil'))::date < $4::date
            GROUP BY
              p.employee_id,
              (p.punch_datetime AT TIME ZONE COALESCE(NULLIF(p.punch_time_zone, ''), 'America/Guayaquil'))::date
          ),
          daily AS (
            SELECT
              pb.*,
              ps.work_entry,
              ps.work_exit,
              (pb.shift_date + (pb.work_start_minutes || ' minutes')::interval) AS expected_entry_at,
              (pb.shift_date + (pb.work_end_minutes || ' minutes')::interval) AS expected_work_exit_at
            FROM classified_plan_bounds pb
            LEFT JOIN punch_summary ps
              ON ps.employee_id = pb.employee_id
             AND ps.shift_date = pb.shift_date
            WHERE pb.planned_work_minutes > 0
               OR pb.is_non_working_day = true
          ),
          block_minutes AS (
            SELECT
              b.block_type,
              SUM(
                GREATEST(
                  0,
                  EXTRACT(EPOCH FROM (
                    LEAST(d.work_exit, d.shift_date + (b.end_minutes || ' minutes')::interval)
                    - GREATEST(d.work_entry, d.shift_date + (b.start_minutes || ' minutes')::interval)
                  )) / 60
                )
              )::int AS minutes
            FROM daily d
            INNER JOIN public.shift_constructor_blocks b
              ON b.constructor_id = d.constructor_id
             AND b.tenant_id = d.constructor_tenant_id
             AND b.is_active = true
             AND b.is_break = false
             AND b.block_type IN ('ORDINARIA', 'NOCTURNA', 'EXTRA_50', 'EXTRA_100')
            WHERE d.work_entry IS NOT NULL
              AND d.work_exit IS NOT NULL
              AND d.work_exit > d.work_entry
              AND d.is_non_working_day = false
              AND d.work_exit > (d.shift_date + (b.start_minutes || ' minutes')::interval)
              AND d.work_entry < (d.shift_date + (b.end_minutes || ' minutes')::interval)
            GROUP BY b.block_type
          ),
          fallback_ordinary AS (
            SELECT
              SUM(
                CASE
                  WHEN d.is_non_working_day = false
                   AND d.constructor_id IS NULL
                   AND d.work_entry IS NOT NULL
                   AND d.work_exit IS NOT NULL
                   AND d.work_exit > d.work_entry
                    THEN LEAST(
                      d.planned_work_minutes,
                      GREATEST(0, EXTRACT(EPOCH FROM (d.work_exit - d.work_entry)) / 60)::int
                    )
                  ELSE 0
                END
              )::int AS minutes
            FROM daily d
          ),
          non_working_minutes AS (
            SELECT
              COALESCE(SUM(recognized.minutes), 0)::int AS minutes
            FROM (
              SELECT
                d.shift_date,
                SUM(
                  GREATEST(
                    0,
                    EXTRACT(EPOCH FROM (
                      LEAST(d.work_exit, d.shift_date + (block.end_minutes || ' minutes')::interval)
                      - GREATEST(d.work_entry, d.shift_date + (block.start_minutes || ' minutes')::interval)
                    )) / 60
                  )
                )::int AS minutes
              FROM daily d
              INNER JOIN public.shift_constructor_blocks block
                ON block.constructor_id = d.constructor_id
               AND block.tenant_id = d.constructor_tenant_id
               AND block.is_active = true
               AND block.is_break = false
              WHERE d.is_non_working_day = true
                AND d.work_entry IS NOT NULL
                AND d.work_exit IS NOT NULL
                AND d.work_exit > d.work_entry
                AND d.work_exit > (d.shift_date + (block.start_minutes || ' minutes')::interval)
                AND d.work_entry < (d.shift_date + (block.end_minutes || ' minutes')::interval)
              GROUP BY d.shift_date

              UNION ALL

              SELECT
                d.shift_date,
                GREATEST(0, EXTRACT(EPOCH FROM (d.work_exit - d.work_entry)) / 60)::int AS minutes
              FROM daily d
              WHERE d.is_non_working_day = true
                AND d.work_entry IS NOT NULL
                AND d.work_exit IS NOT NULL
                AND d.work_exit > d.work_entry
                AND NOT EXISTS (
                  SELECT 1
                  FROM public.shift_constructor_blocks block
                  WHERE block.constructor_id = d.constructor_id
                    AND block.tenant_id = d.constructor_tenant_id
                    AND block.is_active = true
                    AND block.is_break = false
                )
            ) recognized
          ),
          daily_minus AS (
            SELECT
              SUM(
                CASE
                  WHEN d.is_non_working_day = false
                   AND d.work_entry IS NOT NULL
                   AND d.work_entry > d.expected_entry_at + (d.entry_grace_minutes || ' minutes')::interval
                    THEN GREATEST(0, EXTRACT(EPOCH FROM (d.work_entry - d.expected_entry_at)) / 60)::int
                  ELSE 0
                END
              )::int AS late_minutes,
              SUM(
                CASE
                  WHEN d.is_non_working_day = false
                   AND d.work_exit IS NOT NULL
                   AND d.work_exit < d.expected_work_exit_at - (d.exit_grace_minutes || ' minutes')::interval
                    THEN GREATEST(0, EXTRACT(EPOCH FROM (d.expected_work_exit_at - d.work_exit)) / 60)::int
                  ELSE 0
                END
              )::int AS early_departure_minutes,
              SUM(
                CASE
                  WHEN d.is_non_working_day = false
                   AND d.work_entry IS NULL
                   AND (
                     d.shift_date < CURRENT_DATE
                     OR now() > d.expected_work_exit_at
                   )
                    THEN d.planned_work_minutes
                  ELSE 0
                END
              )::int AS absence_minutes
            FROM daily d
          )
          SELECT
            (
              COALESCE((SELECT minutes FROM fallback_ordinary), 0)
              + COALESCE((SELECT SUM(minutes) FROM block_minutes WHERE block_type = 'ORDINARIA'), 0)
            )::int AS ordinary_minutes,
            COALESCE((SELECT SUM(minutes) FROM block_minutes WHERE block_type = 'NOCTURNA'), 0)::int AS night_minutes,
            COALESCE((SELECT SUM(minutes) FROM block_minutes WHERE block_type = 'EXTRA_50'), 0)::int AS extra_50_minutes,
            (
              COALESCE((SELECT SUM(minutes) FROM block_minutes WHERE block_type = 'EXTRA_100'), 0)
              + COALESCE((SELECT minutes FROM non_working_minutes), 0)
            )::int AS extra_100_minutes,
            COALESCE(dm.late_minutes, 0)::int AS late_minutes,
            COALESCE(dm.absence_minutes, 0)::int AS absence_minutes,
            COALESCE(dm.early_departure_minutes, 0)::int AS early_departure_minutes,
            COALESCE(
              (SELECT ARRAY_AGG(d.shift_date ORDER BY d.shift_date) FROM daily d WHERE d.is_non_working_day = true),
              ARRAY[]::date[]
            ) AS non_working_dates
          FROM daily_minus dm
        `,
        [
          tenantId,
          employeeId,
          rangeFromIso,
          rangeEndExclusiveIso,
          employeeHireDateIso,
          employeeTerminationDateIso,
          companyId || null,
          employeeCountryId || null,
          employeeStateId || null,
          employeeCityId || null,
          workLocationId || null,
        ]
      ),
      pool.query(
        `
          SELECT
            calc.id AS calculation_id,
            COALESCE(
              (calc.event_datetime AT TIME ZONE 'America/Guayaquil')::date,
              make_date(calc.year, calc.month, calc.day)
            ) AS incident_date,
            calc.event_datetime,
            ae.id AS attendance_event_id,
            ae.event_name,
            ae.event_short_name,
            event_type.lookup_key AS event_type_key,
            direction.lookup_key AS direction_key,
            CASE
              WHEN calc.is_approved = true AND calc.approved_value IS NOT NULL
                THEN calc.approved_value
              ELSE calc.generated_value
            END::numeric AS effective_value,
            calc.generated_value,
            calc.approved_value,
            calc.is_approved,
            calc.notes,
            suggested.justification_type_id,
            incident_punch.id AS target_punch_id,
            request.id AS request_id,
            request.request_status_key,
            request.request_status_label,
            punch_request.id AS time_punch_request_id,
            punch_request.request_status_key AS time_punch_request_status_key,
            punch_request.request_status_label AS time_punch_request_status_label
          FROM public.employee_attendance_calculations calc
          INNER JOIN public.attendance_events ae
            ON ae.id = calc.attendance_event_id
          LEFT JOIN public.lookup_values event_type
            ON event_type.id = ae.event_type_id
          LEFT JOIN public.lookup_values direction
            ON direction.id = ae.transaction_direction_id
          LEFT JOIN LATERAL (
            SELECT jt.id AS justification_type_id
            FROM public.justification_types jt
            WHERE jt.tenant_id = calc.tenant_id
              AND jt.attendance_event_id = calc.attendance_event_id
              AND jt.is_active = true
            ORDER BY jt.created_at ASC NULLS LAST, jt.id
            LIMIT 1
          ) suggested ON true
          LEFT JOIN LATERAL (
            SELECT punch.id
            FROM public.employee_time_punches punch
            WHERE punch.tenant_id = calc.tenant_id
              AND punch.employee_id = calc.employee_id
              AND punch.is_active = true
              AND (punch.punch_datetime AT TIME ZONE COALESCE(NULLIF(punch.punch_time_zone, ''), 'America/Guayaquil'))::date = COALESCE(
                (calc.event_datetime AT TIME ZONE 'America/Guayaquil')::date,
                make_date(calc.year, calc.month, calc.day)
              )
              AND (
                (UPPER(COALESCE(ae.event_short_name, '')) = 'ATR' AND punch.punch_key = 1)
                OR (UPPER(COALESCE(ae.event_short_name, '')) = 'SAN' AND punch.punch_key = 4)
              )
            ORDER BY
              CASE WHEN UPPER(COALESCE(ae.event_short_name, '')) = 'ATR' THEN punch.punch_datetime END ASC,
              CASE WHEN UPPER(COALESCE(ae.event_short_name, '')) = 'SAN' THEN punch.punch_datetime END DESC,
              punch.id
            LIMIT 1
          ) incident_punch ON true
          LEFT JOIN LATERAL (
            SELECT
              r.id,
              status.lookup_key AS request_status_key,
              status.lookup_label AS request_status_label
            FROM public.employee_absence_requests r
            LEFT JOIN public.lookup_values status
              ON status.id = r.request_status_id
            WHERE r.tenant_id = calc.tenant_id
              AND r.employee_id = calc.employee_id
              AND r.attendance_event_id = calc.attendance_event_id
              AND r.is_active = true
              AND (
                (incident_punch.id IS NOT NULL AND r.target_punch_id = incident_punch.id)
                OR (
                  incident_punch.id IS NULL
                  AND UPPER(COALESCE(ae.event_short_name, '')) NOT IN ('ATR', 'SAN', 'LEX', 'LFH')
                  AND COALESCE(
                    (calc.event_datetime AT TIME ZONE 'America/Guayaquil')::date,
                    make_date(calc.year, calc.month, calc.day)
                  ) BETWEEN r.start_datetime::date AND COALESCE(r.end_datetime, r.start_datetime)::date
                )
              )
            ORDER BY r.created_at DESC
            LIMIT 1
          ) request ON true
          LEFT JOIN LATERAL (
            SELECT
              change_request.id,
              status.lookup_key AS request_status_key,
              status.lookup_label AS request_status_label
            FROM public.employee_time_punch_change_requests change_request
            LEFT JOIN public.employee_time_punches target
              ON target.id = change_request.target_punch_id
             AND target.tenant_id = change_request.tenant_id
            LEFT JOIN public.lookup_values status
              ON status.id = change_request.request_status_id
            WHERE change_request.tenant_id = calc.tenant_id
              AND change_request.employee_id = calc.employee_id
              AND change_request.is_active = true
              AND COALESCE(
                (target.punch_datetime AT TIME ZONE COALESCE(NULLIF(target.punch_time_zone, ''), 'America/Guayaquil'))::date,
                CASE
                  WHEN COALESCE(change_request.requested_values ->> 'punch_datetime', '') <> ''
                    THEN ((change_request.requested_values ->> 'punch_datetime')::timestamptz AT TIME ZONE 'America/Guayaquil')::date
                  ELSE NULL
                END
              ) = COALESCE(
                (calc.event_datetime AT TIME ZONE 'America/Guayaquil')::date,
                make_date(calc.year, calc.month, calc.day)
              )
            ORDER BY change_request.created_at DESC
            LIMIT 1
          ) punch_request ON true
          WHERE calc.tenant_id = $1::uuid
            AND calc.employee_id = $2::uuid
            AND calc.is_active = true
            AND COALESCE(
              (calc.event_datetime AT TIME ZONE 'America/Guayaquil')::date,
              make_date(calc.year, calc.month, calc.day)
            ) >= $3::date
            AND COALESCE(
              (calc.event_datetime AT TIME ZONE 'America/Guayaquil')::date,
              make_date(calc.year, calc.month, calc.day)
            ) < $4::date
            AND (
              UPPER(COALESCE(event_type.lookup_key, '')) IN ('ATR', 'FAL', 'INC', 'LEX', 'LFH', 'SAN', 'TNL')
              OR UPPER(COALESCE(ae.event_short_name, '')) IN ('ATR', 'FAL', 'INC', 'LEX', 'LFH', 'SAN', 'TNL')
            )
          ORDER BY incident_date DESC, calc.event_datetime DESC NULLS LAST, ae.event_name
          LIMIT 200
        `,
        [tenantId, employeeId, rangeFromIso, rangeEndExclusiveIso]
      ),
      pool.query(
        `
          WITH odd_days AS (
            SELECT
              (p.punch_datetime AT TIME ZONE COALESCE(NULLIF(p.punch_time_zone, ''), 'America/Guayaquil'))::date AS incident_date,
              COUNT(*)::int AS punch_count,
              (ARRAY_AGG(p.id ORDER BY p.punch_datetime DESC))[1] AS last_punch_id,
              (ARRAY_AGG(p.punch_datetime ORDER BY p.punch_datetime DESC))[1] AS last_punch_datetime,
              (ARRAY_AGG(p.punch_key ORDER BY p.punch_datetime DESC))[1] AS last_punch_key
            FROM public.employee_time_punches p
            WHERE p.tenant_id = $1::uuid
              AND p.employee_id = $2::uuid
              AND p.is_active = true
              AND (p.punch_datetime AT TIME ZONE COALESCE(NULLIF(p.punch_time_zone, ''), 'America/Guayaquil'))::date >= $3::date
              AND (p.punch_datetime AT TIME ZONE COALESCE(NULLIF(p.punch_time_zone, ''), 'America/Guayaquil'))::date < $4::date
            GROUP BY incident_date
            HAVING MOD(COUNT(*), 2) = 1
          )
          SELECT
            od.incident_date,
            od.punch_count,
            od.last_punch_id,
            od.last_punch_datetime,
            od.last_punch_key,
            ae.id AS attendance_event_id,
            COALESCE(ae.event_name, 'Marcaciones impares') AS catalog_event_name,
            ae.event_short_name,
            suggested.justification_type_id,
            request.id AS request_id,
            request.request_status_key,
            request.request_status_label
          FROM odd_days od
          LEFT JOIN LATERAL (
            SELECT event.*
            FROM public.attendance_events event
            WHERE event.tenant_id = $1::uuid
              AND event.is_active = true
              AND UPPER(COALESCE(event.event_short_name, '')) = 'INC'
            ORDER BY event.created_at ASC NULLS LAST, event.id
            LIMIT 1
          ) ae ON true
          LEFT JOIN LATERAL (
            SELECT jt.id AS justification_type_id
            FROM public.justification_types jt
            WHERE jt.tenant_id = $1::uuid
              AND jt.attendance_event_id = ae.id
              AND jt.is_active = true
            ORDER BY jt.created_at ASC NULLS LAST, jt.id
            LIMIT 1
          ) suggested ON true
          LEFT JOIN LATERAL (
            SELECT
              r.id,
              status.lookup_key AS request_status_key,
              status.lookup_label AS request_status_label
            FROM public.employee_time_punch_change_requests r
            LEFT JOIN public.employee_time_punches target
              ON target.id = r.target_punch_id
             AND target.tenant_id = r.tenant_id
            LEFT JOIN public.lookup_values status
              ON status.id = r.request_status_id
            WHERE r.tenant_id = $1::uuid
              AND r.employee_id = $2::uuid
              AND r.is_active = true
              AND COALESCE(
                (target.punch_datetime AT TIME ZONE COALESCE(NULLIF(target.punch_time_zone, ''), 'America/Guayaquil'))::date,
                CASE
                  WHEN COALESCE(r.requested_values ->> 'punch_datetime', '') <> ''
                    THEN ((r.requested_values ->> 'punch_datetime')::timestamptz AT TIME ZONE 'America/Guayaquil')::date
                  ELSE NULL
                END
              ) = od.incident_date
            ORDER BY r.created_at DESC
            LIMIT 1
          ) request ON true
          WHERE NOT EXISTS (
            SELECT 1
            FROM public.employee_attendance_calculations calc
            WHERE calc.tenant_id = $1::uuid
              AND calc.employee_id = $2::uuid
              AND calc.attendance_event_id = ae.id
              AND calc.is_active = true
              AND COALESCE(
                (calc.event_datetime AT TIME ZONE 'America/Guayaquil')::date,
                make_date(calc.year, calc.month, calc.day)
              ) = od.incident_date
          )
          ORDER BY od.incident_date DESC
          LIMIT 100
        `,
        [tenantId, employeeId, rangeFromIso, rangeEndExclusiveIso]
      ),
      pool.query(
        `
          WITH plans AS (
            SELECT
              p.shift_date,
              s.start_time,
              COALESCE(s.work_minutes, 0)::int AS shift_work_minutes,
              COALESCE(s.entry_grace_minutes, 0)::int AS entry_grace_minutes,
              COALESCE(s.exit_grace_minutes, 0)::int AS exit_grace_minutes,
              sc.id AS constructor_id,
              sc.tenant_id AS constructor_tenant_id,
              (EXTRACT(HOUR FROM s.start_time)::int * 60 + EXTRACT(MINUTE FROM s.start_time)::int) AS shift_start_minutes
            FROM public.employee_shift_plans p
            INNER JOIN public.shifts s
              ON s.id = p.shift_id
             AND s.tenant_id = p.tenant_id
             AND s.is_active = true
            LEFT JOIN public.shift_constructors sc
              ON sc.shift_id = s.id
             AND sc.tenant_id = s.tenant_id
             AND sc.is_active = true
            WHERE p.tenant_id = $1::uuid
              AND p.employee_id = $2::uuid
              AND p.is_active = true
              AND p.shift_date >= $3::date
              AND p.shift_date < $4::date
              AND ($5::date IS NULL OR p.shift_date >= $5::date)
              AND ($6::date IS NULL OR p.shift_date <= $6::date)
          ),
          plan_bounds AS (
            SELECT
              pl.*,
              COALESCE(
                MIN(block.start_minutes) FILTER (
                  WHERE block.is_break = false
                    AND block.block_type IN ('ORDINARIA', 'NOCTURNA')
                ),
                pl.shift_start_minutes
              )::int AS work_start_minutes,
              COALESCE(
                MAX(block.end_minutes) FILTER (
                  WHERE block.is_break = false
                    AND block.block_type IN ('ORDINARIA', 'NOCTURNA')
                ),
                pl.shift_start_minutes + pl.shift_work_minutes
              )::int AS work_end_minutes,
              COALESCE(
                SUM(block.end_minutes - block.start_minutes) FILTER (
                  WHERE block.is_break = false
                    AND block.block_type IN ('ORDINARIA', 'NOCTURNA')
                ),
                pl.shift_work_minutes
              )::int AS planned_work_minutes
            FROM plans pl
            LEFT JOIN public.shift_constructor_blocks block
              ON block.constructor_id = pl.constructor_id
             AND block.tenant_id = pl.constructor_tenant_id
             AND block.is_active = true
            GROUP BY
              pl.shift_date,
              pl.start_time,
              pl.shift_work_minutes,
              pl.entry_grace_minutes,
              pl.exit_grace_minutes,
              pl.constructor_id,
              pl.constructor_tenant_id,
              pl.shift_start_minutes
          ),
          punch_summary AS (
            SELECT
              (p.punch_datetime AT TIME ZONE COALESCE(NULLIF(p.punch_time_zone, ''), 'America/Guayaquil'))::date AS shift_date,
            (ARRAY_AGG(p.id ORDER BY p.punch_datetime ASC) FILTER (WHERE p.punch_key = 1))[1] AS work_entry_punch_id,
            (ARRAY_AGG(p.id ORDER BY p.punch_datetime DESC) FILTER (WHERE p.punch_key = 4))[1] AS work_exit_punch_id,
              MIN(p.punch_datetime AT TIME ZONE COALESCE(NULLIF(p.punch_time_zone, ''), 'America/Guayaquil'))
                FILTER (WHERE p.punch_key = 1) AS work_entry,
              MAX(p.punch_datetime AT TIME ZONE COALESCE(NULLIF(p.punch_time_zone, ''), 'America/Guayaquil'))
                FILTER (WHERE p.punch_key = 4) AS work_exit
            FROM public.employee_time_punches p
            WHERE p.tenant_id = $1::uuid
              AND p.employee_id = $2::uuid
              AND p.is_active = true
              AND (p.punch_datetime AT TIME ZONE COALESCE(NULLIF(p.punch_time_zone, ''), 'America/Guayaquil'))::date >= $3::date
              AND (p.punch_datetime AT TIME ZONE COALESCE(NULLIF(p.punch_time_zone, ''), 'America/Guayaquil'))::date < $4::date
            GROUP BY shift_date
          ),
          daily AS (
            SELECT
              bounds.*,
              punches.work_entry_punch_id,
              punches.work_exit_punch_id,
              punches.work_entry,
              punches.work_exit,
              (bounds.shift_date + (bounds.work_start_minutes || ' minutes')::interval) AS expected_entry_at,
              (bounds.shift_date + (bounds.work_end_minutes || ' minutes')::interval) AS expected_exit_at
            FROM plan_bounds bounds
            LEFT JOIN punch_summary punches
              ON punches.shift_date = bounds.shift_date
            WHERE bounds.planned_work_minutes > 0
          ),
          issues AS (
            SELECT
              daily.shift_date AS incident_date,
              issue.event_short_name,
              issue.minutes::int AS minutes,
              issue.expected_at,
              issue.actual_at,
              issue.start_at,
              issue.end_at,
              issue.target_punch_id
            FROM daily
            CROSS JOIN LATERAL (
              VALUES
                (
                  'ATR'::text,
                  CASE
                    WHEN daily.work_entry IS NOT NULL
                     AND daily.work_entry > daily.expected_entry_at + (daily.entry_grace_minutes || ' minutes')::interval
                      THEN GREATEST(0, EXTRACT(EPOCH FROM (daily.work_entry - daily.expected_entry_at)) / 60)::int
                    ELSE 0
                  END,
                  daily.expected_entry_at,
                  daily.work_entry,
                  daily.expected_entry_at,
                  daily.work_entry,
                  daily.work_entry_punch_id
                ),
                (
                  'SAN'::text,
                  CASE
                    WHEN daily.work_exit IS NOT NULL
                     AND daily.work_exit < daily.expected_exit_at - (daily.exit_grace_minutes || ' minutes')::interval
                      THEN GREATEST(0, EXTRACT(EPOCH FROM (daily.expected_exit_at - daily.work_exit)) / 60)::int
                    ELSE 0
                  END,
                  daily.expected_exit_at,
                  daily.work_exit,
                  daily.work_exit,
                  daily.expected_exit_at,
                  daily.work_exit_punch_id
                ),
                (
                  'FAL'::text,
                  CASE
                    WHEN daily.work_entry IS NULL
                     AND daily.work_exit IS NULL
                     AND (
                       daily.shift_date < $7::date
                       OR (now() AT TIME ZONE 'America/Guayaquil') > daily.expected_exit_at
                     )
                      THEN daily.planned_work_minutes
                    ELSE 0
                  END,
                  daily.expected_entry_at,
                  NULL::timestamp,
                  daily.expected_entry_at,
                  daily.expected_exit_at,
                  NULL::uuid
                )
            ) AS issue(event_short_name, minutes, expected_at, actual_at, start_at, end_at, target_punch_id)
            WHERE issue.minutes > 0
          )
          SELECT
            issues.incident_date,
            issues.event_short_name,
            issues.minutes,
            issues.expected_at,
            issues.actual_at,
            issues.start_at::date AS start_date,
            issues.end_at::date AS end_date,
            TO_CHAR(issues.start_at, 'HH24:MI') AS start_time,
            TO_CHAR(issues.end_at, 'HH24:MI') AS end_time,
            issues.target_punch_id,
            ae.id AS attendance_event_id,
            ae.event_name,
            suggested.justification_type_id,
            request.id AS request_id,
            request.request_status_key,
            request.request_status_label
          FROM issues
          INNER JOIN public.attendance_events ae
            ON ae.tenant_id = $1::uuid
           AND ae.is_active = true
           AND UPPER(COALESCE(ae.event_short_name, '')) = issues.event_short_name
          LEFT JOIN LATERAL (
            SELECT jt.id AS justification_type_id
            FROM public.justification_types jt
            WHERE jt.tenant_id = $1::uuid
              AND jt.attendance_event_id = ae.id
              AND jt.is_active = true
            ORDER BY jt.created_at ASC NULLS LAST, jt.id
            LIMIT 1
          ) suggested ON true
          LEFT JOIN LATERAL (
            SELECT
              request_row.id,
              status.lookup_key AS request_status_key,
              status.lookup_label AS request_status_label
            FROM public.employee_absence_requests request_row
            LEFT JOIN public.lookup_values status
              ON status.id = request_row.request_status_id
            WHERE request_row.tenant_id = $1::uuid
              AND request_row.employee_id = $2::uuid
              AND request_row.attendance_event_id = ae.id
              AND request_row.is_active = true
              AND (
                (issues.target_punch_id IS NOT NULL AND request_row.target_punch_id = issues.target_punch_id)
                OR (issues.target_punch_id IS NULL AND request_row.target_punch_id IS NULL
                  AND issues.incident_date BETWEEN request_row.start_datetime::date
                      AND COALESCE(request_row.end_datetime, request_row.start_datetime)::date)
              )
            ORDER BY request_row.created_at DESC
            LIMIT 1
          ) request ON true
          ORDER BY issues.incident_date DESC, issues.event_short_name
          LIMIT 300
        `,
        [
          tenantId,
          employeeId,
          rangeFromIso,
          rangeEndExclusiveIso,
          employeeHireDateIso,
          employeeTerminationDateIso,
          todayIso,
        ]
      ),
    ]);

    const holidaysCurrentMonth = (holidaysRawResult.rows || []).flatMap((row: any) => {
      const dateRaw = normalizeDateOnly(row?.holiday_date);
      if (!dateRaw) return [];

      const [year, month, day] = dateRaw.split('-').map((part: string) => Number(part));
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return [];

      const isRecurring = row?.is_recurring === true || String(row?.is_recurring) === 'true';
      const projectedDate = isRecurring
        ? `${String(currentYear).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        : dateRaw;

      if (projectedDate < monthStartIso || projectedDate >= monthEndExclusiveIso) return [];
      if (isRecurring && month !== currentMonth) return [];

      const rowCountry = row?.country_id ? String(row.country_id) : '';
      const rowState = row?.state_id ? String(row.state_id) : '';
      const rowCity = row?.city_id ? String(row.city_id) : '';
      const rowWorkLocation = row?.work_location_id ? String(row.work_location_id) : '';
      const rowCompany = row?.company_id ? String(row.company_id) : '';

      // Alcance geografico:
      // - Nacional: country coincide, state/city NULL
      // - Provincial: country+state coincide, city NULL
      // - Cantonal: country+state+city coincide
      // (si un campo viene NULL en holidays, no restringe ese nivel).
      if (rowCompany && rowCompany !== companyId) return [];
      if (rowCountry && rowCountry !== employeeCountryId) return [];
      if (rowState && rowState !== employeeStateId) return [];
      if (rowCity && rowCity !== employeeCityId) return [];

      // Metadata de alcance para depuracion/UX (no bloquea inclusion).
      const geoScopeLevel = rowWorkLocation
        ? 'WORK_LOCATION'
        : rowCity
          ? 'CITY'
          : rowState
            ? 'STATE'
            : rowCountry
              ? 'NATIONAL'
              : 'TENANT';

      return [{
        ...row,
        holiday_date: projectedDate,
        geo_scope_level: geoScopeLevel,
      }];
    }).sort((a: any, b: any) => String(a.holiday_date).localeCompare(String(b.holiday_date)));

    const weekShiftsRows = (monthShiftsResult.rows || []).filter((row: any) => {
      const dateKey = normalizeDateOnly(row?.shift_date);
      return dateKey >= weekStartIso && dateKey <= weekEndIso;
    });

    const shiftsByDate = new Map<string, any>();
    for (const row of weekShiftsRows) {
      const dateKey = normalizeDateOnly(row.shift_date);
      if (dateKey) shiftsByDate.set(dateKey, row);
    }

    const weekDays: any[] = [];
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(weekStart);
      date.setUTCDate(weekStart.getUTCDate() + i);
      const dateIso = date.toISOString().slice(0, 10);
      const shift = shiftsByDate.get(dateIso) || null;
      weekDays.push({
        date: dateIso,
        weekday_label: date.toLocaleDateString('es-EC', { weekday: 'short', timeZone: 'UTC' }).replace('.', ''),
        shift,
      });
    }

    const allShiftsByDate = new Map<string, any>();
    for (const row of monthShiftsResult.rows || []) {
      const dateKey = normalizeDateOnly(row?.shift_date);
      if (dateKey) allShiftsByDate.set(dateKey, row);
    }

    const upcomingShiftDays: any[] = [];
    for (let i = 0; i < 8; i += 1) {
      const date = new Date(`${todayIso}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + i);
      const dateIso = date.toISOString().slice(0, 10);
      upcomingShiftDays.push({
        date: dateIso,
        weekday_label: date.toLocaleDateString('es-EC', { weekday: 'short', timeZone: 'UTC' }).replace('.', ''),
        shift: allShiftsByDate.get(dateIso) || null,
      });
    }

    const monthlyNovelty = monthlyNoveltyResult.rows?.[0] || {};
    const nonWorkingDates = new Set<string>(
      (Array.isArray(monthlyNovelty.non_working_dates) ? monthlyNovelty.non_working_dates : [])
        .map((value: any) => normalizeDateOnly(value))
        .filter(Boolean)
    );
    const isNonWorkingPenaltyIncident = (row: any): boolean => {
      const incidentDate = normalizeDateOnly(row?.incident_date);
      if (!incidentDate || !nonWorkingDates.has(incidentDate)) return false;
      const shortName = String(row?.event_short_name || row?.event_type_key || '').toUpperCase();
      const eventName = String(row?.event_name || '').toUpperCase();
      return ['ATR', 'FAL', 'SAN'].includes(shortName)
        || eventName.includes('ATRAS')
        || eventName.includes('FALTA')
        || eventName.includes('SALIDA ANTICIP');
    };
    const impactRows = attendanceImpactResult.rows || [];
    const eventText = (row: any): string =>
      `${row?.event_short_name || ''} ${row?.event_name || ''}`.toUpperCase();
    const isEventMatch = (row: any, shortNames: string[], nameTokens: string[]): boolean => {
      const text = eventText(row);
      const shortName = String(row?.event_short_name || '').toUpperCase();
      return shortNames.includes(shortName) || nameTokens.some((token) => text.includes(token));
    };

    const plusEvents = [
      {
        key: 'ordinary_minutes',
        label: 'Jornada ordinaria',
        total_value: Number(monthlyNovelty.ordinary_minutes || 0),
      },
      {
        key: 'night_minutes',
        label: 'Jornada nocturna',
        total_value: Number(monthlyNovelty.night_minutes || 0),
      },
      {
        key: 'extra_50_minutes',
        label: 'Horas extras 50%',
        total_value: Number(monthlyNovelty.extra_50_minutes || 0),
      },
      {
        key: 'extra_100_minutes',
        label: 'Horas extras 100%',
        total_value: Number(monthlyNovelty.extra_100_minutes || 0),
      },
    ].map((row) => ({ ...row, total_hours: row.total_value / 60 }));

    const baseMinusEvents = [
      {
        key: 'late_minutes',
        label: 'Atrasos',
        total_value: Number(monthlyNovelty.late_minutes || 0),
      },
      {
        key: 'absence_minutes',
        label: 'Faltas',
        total_value: Number(monthlyNovelty.absence_minutes || 0),
      },
      {
        key: 'early_departure_minutes',
        label: 'Salidas anticipadas',
        total_value: Number(monthlyNovelty.early_departure_minutes || 0),
      },
    ];
    const additionalMinusEvents = impactRows
      .filter((row: any) => isEventMatch(
        row,
        ['LEX', 'LFH', 'TNL', 'INC'],
        ['LUNCH EXCED', 'LUNCH FUERA', 'TIEMPO NO LABORADO', 'INCONSIST'],
      ))
      .map((row: any) => ({
        key: `attendance_event_${row.attendance_event_id}`,
        attendance_event_id: row.attendance_event_id,
        label: row.event_name || row.event_short_name || 'Tiempo no laborado',
        total_value: Math.abs(Number(row.total_value || 0)),
      }));
    const minusEvents = [...baseMinusEvents, ...additionalMinusEvents]
      .map((row) => ({ ...row, total_hours: row.total_value / 60 }));

    const derivedIncidentRows = (derivedIncidentsResult.rows || [])
      .filter((row: any) => !isNonWorkingPenaltyIncident(row))
      .map((row: any) => {
      const shortName = String(row.event_short_name || '').toUpperCase();
      const detail = shortName === 'ATR'
        ? `Entrada esperada ${row.start_time || '--:--'}; marcación de entrada ${row.end_time || '--:--'}.`
        : shortName === 'SAN'
          ? `Marcación de salida ${row.start_time || '--:--'}; salida esperada ${row.end_time || '--:--'}.`
          : `No se registraron marcaciones para el turno ${row.start_time || '--:--'} a ${row.end_time || '--:--'}.`;
      return {
        id: `DERIVED-${normalizeDateOnly(row.incident_date)}-${shortName}`,
        calculation_id: null,
        incident_date: normalizeDateOnly(row.incident_date),
        event_datetime: null,
        attendance_event_id: row.attendance_event_id,
        event_name: row.event_name || shortName || 'Incidencia de asistencia',
        event_short_name: shortName,
        event_type_key: shortName,
        minutes: Math.abs(Number(row.minutes || 0)),
        notes: detail,
        start_date: normalizeDateOnly(row.start_date) || normalizeDateOnly(row.incident_date),
        end_date: normalizeDateOnly(row.end_date) || normalizeDateOnly(row.incident_date),
        start_time: row.start_time || null,
        end_time: row.end_time || null,
        target_punch_id: row.target_punch_id || null,
        is_approved: false,
        justification_type_id: row.justification_type_id,
        request_id: row.request_id,
        request_status_key: row.request_status_key,
        request_status_label: row.request_status_label,
        punch_count: null,
        source: 'SHIFT_COMPARISON',
        request_target: 'JUSTIFICATION',
      };
      });
    const derivedByDateAndEvent = new Map<string, any>(
      derivedIncidentRows.map((row: any) => [`${row.incident_date}|${row.event_short_name}`, row])
    );
    const calculationIncidentRows = (incidentsResult.rows || [])
      .filter((row: any) => !isNonWorkingPenaltyIncident(row))
      .map((row: any) => {
      const incidentDate = normalizeDateOnly(row.incident_date);
      const shortName = String(row.event_short_name || '').toUpperCase();
      const isPunchIssue = shortName === 'INC';
      const derived = derivedByDateAndEvent.get(`${incidentDate}|${shortName}`);
      return {
        id: row.calculation_id,
        calculation_id: row.calculation_id,
        incident_date: incidentDate,
        event_datetime: row.event_datetime,
        attendance_event_id: row.attendance_event_id,
        event_name: row.event_name || row.event_short_name || 'Incidencia de asistencia',
        event_short_name: shortName,
        event_type_key: row.event_type_key,
        minutes: Math.abs(Number(row.effective_value || derived?.minutes || 0)),
        notes: row.notes || derived?.notes || null,
        start_date: derived?.start_date || incidentDate,
        end_date: derived?.end_date || incidentDate,
        start_time: derived?.start_time || null,
        end_time: derived?.end_time || null,
        target_punch_id: row.target_punch_id || derived?.target_punch_id || null,
        is_approved: row.is_approved === true,
        justification_type_id: row.justification_type_id || derived?.justification_type_id || null,
        request_id: isPunchIssue
          ? row.time_punch_request_id || null
          : row.request_id || derived?.request_id || null,
        request_status_key: isPunchIssue
          ? row.time_punch_request_status_key || null
          : row.request_status_key || derived?.request_status_key || null,
        request_status_label: isPunchIssue
          ? row.time_punch_request_status_label || null
          : row.request_status_label || derived?.request_status_label || null,
        punch_count: null,
        source: derived ? 'SHIFT_COMPARISON' : 'ATTENDANCE_CALCULATION',
        request_target: isPunchIssue ? 'TIME_PUNCH_REQUEST' : 'JUSTIFICATION',
      };
      });
    const calculationKeys = new Set(
      calculationIncidentRows.map((row: any) => `${row.incident_date}|${row.event_short_name}`)
    );

    const incidents = [
      ...calculationIncidentRows,
      ...derivedIncidentRows.filter((row: any) => !calculationKeys.has(`${row.incident_date}|${row.event_short_name}`)),
      ...(oddPunchesResult.rows || []).map((row: any) => ({
        id: `ODD_PUNCHES-${normalizeDateOnly(row.incident_date)}`,
        calculation_id: null,
        incident_date: normalizeDateOnly(row.incident_date),
        event_datetime: null,
        attendance_event_id: row.attendance_event_id,
        event_name: 'Marcaciones impares',
        event_short_name: row.event_short_name || 'INC',
        event_type_key: 'INC',
        minutes: 0,
        notes: `${Number(row.punch_count || 0)} marcaciones registradas en el día`,
        is_approved: false,
        justification_type_id: row.justification_type_id,
        request_id: row.request_id,
        request_status_key: row.request_status_key,
        request_status_label: row.request_status_label,
        punch_count: Number(row.punch_count || 0),
        start_date: normalizeDateOnly(row.incident_date),
        end_date: normalizeDateOnly(row.incident_date),
        start_time: null,
        end_time: null,
        source: 'ODD_PUNCHES',
        request_target: 'TIME_PUNCH_REQUEST',
        last_punch_id: row.last_punch_id || null,
        last_punch_datetime: row.last_punch_datetime || null,
        last_punch_key: Number(row.last_punch_key || 0) || null,
        suggested_request_type_key: 'CREATE_PUNCH',
        suggested_punch_key: ({ 1: 4, 2: 3, 3: 4, 5: 6 } as Record<number, number>)[Number(row.last_punch_key)] || null,
      })),
    ].sort((left: any, right: any) => {
      const byDate = String(right.incident_date || '').localeCompare(String(left.incident_date || ''));
      if (byDate !== 0) return byDate;
      return String(left.event_name || '').localeCompare(String(right.event_name || ''));
    });

    const iconFromPunch = (punchKey: any, movementLabel: string): string => {
      const key = Number(punchKey);
      if (key === 1) return 'DoorOpen';
      if (key === 2) return 'Utensils';
      if (key === 3) return 'UtensilsCrossed';
      if (key === 4) return 'DoorClosed';
      if (key === 5) return 'ArrowRightCircle';
      if (key === 6) return 'ArrowLeftCircle';
      const normalized = String(movementLabel || '').toLowerCase();
      if (normalized.includes('permiso') && (normalized.includes('retorno') || normalized.includes('regreso'))) return 'ArrowLeftCircle';
      if (normalized.includes('permiso') && normalized.includes('salida')) return 'ArrowRightCircle';
      if (normalized.includes('almuerzo') || normalized.includes('lunch') || normalized.includes('comida')) {
        if (normalized.includes('retorno') || normalized.includes('regreso')) return 'UtensilsCrossed';
        return 'Utensils';
      }
      if (normalized.includes('entrada') || normalized.includes('inicio')) return 'DoorOpen';
      if (normalized.includes('salida') || normalized.includes('fin')) return 'DoorClosed';
      return 'Fingerprint';
    };
    const isStartPunch = (punchKey: any, movementLabel: string): boolean => {
      const key = Number(punchKey);
      if ([1, 2, 5].includes(key)) return true;
      if ([3, 4, 6].includes(key)) return false;
      const normalized = String(movementLabel || '').toLowerCase();
      if (normalized.includes('entrada') || normalized.includes('inicio')) return true;
      if (normalized.includes('salida') || normalized.includes('retorno') || normalized.includes('fin')) return false;
      return true;
    };

    const iconFromRequest = (row: any): string => {
      const src = `${row?.justification_name || ''} ${row?.event_name || ''} ${row?.justify_method_key || ''} ${row?.justify_method_label || ''}`.toLowerCase();
      if (src.includes('vacac')) return 'Plane';
      if (src.includes('matern')) return 'Baby';
      if (src.includes('enferm') || src.includes('medic')) return 'Stethoscope';
      if (src.includes('ausen')) return 'UserX';
      if (src.includes('planif')) return 'CalendarCheck2';
      return 'FileCheck';
    };

    const calendarPunches = (monthPunchesResult.rows || []).flatMap((row: any) => {
      const dateKey = normalizeDateOnly(row?.punch_date || row?.punch_datetime);
      if (!dateKey || dateKey < monthStartIso || dateKey >= monthEndExclusiveIso) return [];
      const isStart = isStartPunch(row?.punch_key, String(row?.movement_label || ''));
      return [{
        date: dateKey,
        icon_key: iconFromPunch(row?.punch_key, String(row?.movement_label || '')),
        title: row?.movement_label || `Marcacion ${row?.punch_key ?? ''}`.trim(),
        subtitle: row?.punch_time_local || String(row?.punch_datetime || '').slice(11, 16),
        bg_color: isStart ? '#DCFCE7' : '#FEE2E2',
        text_color: isStart ? '#166534' : '#991B1B',
        status_key: row?.time_punch_status_key || null,
        sort_datetime: String(row?.punch_datetime || ''),
      }];
    }).sort((a: any, b: any) => String(a?.sort_datetime || '').localeCompare(String(b?.sort_datetime || '')));

    const calendarShifts = (monthShiftsResult.rows || []).flatMap((row: any) => {
      const dateKey = normalizeDateOnly(row?.shift_date);
      if (!dateKey || dateKey < monthStartIso || dateKey >= monthEndExclusiveIso) return [];
      const startTime = String(row?.effective_start_time || '').slice(0, 5) || '--:--';
      const entries: any[] = [{
        date: dateKey,
        icon_key: row?.effective_shift_icon_key || 'Clock3',
        title: row?.effective_shift_display_name || row?.effective_shift_short_name || row?.effective_shift_name || row?.planned_shift_short_name || row?.planned_shift_name || 'Turno',
        subtitle: startTime,
        bg_color: row?.effective_shift_bg_color || '#DCFCE7',
        text_color: row?.effective_shift_text_color || '#14532D',
        shift_type_id: row?.shift_type_id || null,
        shift_type_label: row?.shift_type_label || null,
      }];
      if (row?.pending_request_id) {
        entries.push({
          date: dateKey,
          icon_key: 'RefreshCw',
          title: (row?.pending_requested_shift_short_name || row?.pending_requested_shift_name)
            ? `Cambio pendiente a ${row.pending_requested_shift_short_name || row.pending_requested_shift_name}`
            : 'Cambio de turno pendiente',
          subtitle: row?.pending_request_status_label || 'Pendiente',
          bg_color: '#FEF3C7',
          text_color: '#92400E',
          pending_shift_change: true,
          pending_request_id: row?.pending_request_id,
          pending_request_status_key: row?.pending_request_status_key || null,
        });
      }
      return entries;
    });

    const calendarRequests = [
      ...(monthAbsenceRequestsResult.rows || []).flatMap((row: any) => {
        const startKey = normalizeDateOnly(row?.start_datetime);
        const endKeyRaw = normalizeDateOnly(row?.end_datetime) || startKey;
        if (!startKey) return [];

        const startDate = new Date(`${startKey}T00:00:00`);
        const endDate = new Date(`${endKeyRaw}T00:00:00`);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return [];

        const from = startDate <= endDate ? startDate : endDate;
        const to = startDate <= endDate ? endDate : startDate;
        const entries: any[] = [];
        const cursor = new Date(from);

        while (cursor <= to) {
          const dateKey = cursor.toISOString().slice(0, 10);
          if (dateKey >= monthStartIso && dateKey < monthEndExclusiveIso) {
            entries.push({
              date: dateKey,
              icon_key: iconFromRequest(row),
              title: row?.justification_name || row?.event_name || 'Solicitud',
              subtitle: row?.request_status_label || '-',
              bg_color: '#FEF3C7',
              text_color: '#92400E',
              status_key: row?.request_status_key || null,
              request_kind: 'ABSENCE_REQUEST',
            });
          }
          cursor.setDate(cursor.getDate() + 1);
        }

        return entries;
      }),
      ...(monthShiftChangeRequestsResult.rows || []).flatMap((row: any) => {
        const dateKey = normalizeDateOnly(row?.shift_date);
        if (!dateKey || dateKey < monthStartIso || dateKey >= monthEndExclusiveIso) return [];
        return [{
          date: dateKey,
          icon_key: 'RefreshCw',
          title: 'Cambio de turno',
          subtitle: row?.request_status_label || '-',
          bg_color: '#E0E7FF',
          text_color: '#3730A3',
          status_key: row?.request_status_key || null,
          request_kind: 'SHIFT_CHANGE_REQUEST',
        }];
      }),
      ...(monthTimePunchChangeRequestsResult.rows || []).flatMap((row: any) => {
        const dateKey = normalizeDateOnly(row?.request_datetime);
        if (!dateKey || dateKey < monthStartIso || dateKey >= monthEndExclusiveIso) return [];
        return [{
          date: dateKey,
          icon_key: 'Clock3',
          title: row?.request_type_label || 'Gestión de marcación',
          subtitle: row?.request_status_label || '-',
          bg_color: '#FEE2E2',
          text_color: '#991B1B',
          status_key: row?.request_status_key || null,
          request_kind: 'TIME_PUNCH_CHANGE_REQUEST',
        }];
      }),
    ];

    const calendarHolidays = holidaysCurrentMonth.map((row: any) => ({
      date: normalizeDateOnly(row?.holiday_date),
      icon_key: row?.holiday_type_icon_key || 'CalendarDays',
      title: row?.holiday_name || 'Feriado',
      subtitle: 'No laborable',
      bg_color: '#DCFCE7',
      text_color: row?.holiday_type_icon_color || '#166534',
      holiday_id: row?.id || null,
    }));

    const birthdayRaw = normalizeDateOnly(context.employee_birthday);
    if (birthdayRaw) {
      const [birthYearRaw, birthMonthRaw, birthDayRaw] = birthdayRaw.split('-').map((part: string) => Number(part));
      if (Number.isFinite(birthMonthRaw) && Number.isFinite(birthDayRaw)) {
        const birthDateCurrentYear = `${String(currentYear).padStart(4, '0')}-${String(birthMonthRaw).padStart(2, '0')}-${String(birthDayRaw).padStart(2, '0')}`;
        if (birthDateCurrentYear >= monthStartIso && birthDateCurrentYear < monthEndExclusiveIso) {
          calendarHolidays.push({
            date: birthDateCurrentYear,
            icon_key: 'Cake',
            title: 'Cumpleaños',
            subtitle: `${context.employee_name || ''} ${context.employee_lastname || ''}`.trim() || 'Empleado',
            bg_color: '#FCE7F3',
            text_color: '#9D174D',
            holiday_id: null,
          });
        }
      }
    }

    calendarHolidays.sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));

    const requestsTimeline = [
      ...(monthAbsenceRequestsResult.rows || []),
      ...(monthShiftChangeRequestsResult.rows || []),
      ...(monthTimePunchChangeRequestsResult.rows || []),
    ]
      .sort((a: any, b: any) => {
        const left = String(b?.start_datetime || b?.shift_date || b?.request_datetime || b?.created_at || '');
        const right = String(a?.start_datetime || a?.shift_date || a?.request_datetime || a?.created_at || '');
        return left.localeCompare(right);
      })
      .slice(0, 20);

    const employee = {
      user_id: context.user_id,
      user_email: context.user_email,
      user_display_name: context.user_display_name,
      employee_id: context.employee_id,
      employee_code: context.employee_code,
      employee_name: context.employee_name,
      employee_lastname: context.employee_lastname,
      phone: context.phone,
      birth_date: context.employee_birthday,
      gender_id: context.employee_gender_id,
      gender_label: context.gender_label,
    };

    const employeeCompany = {
      employee_company_id: context.employee_company_id,
      company_id: context.company_id,
      company_code: context.company_code,
      company_name: context.company_name,
      company_short_name: context.company_short_name,
      country_id: context.country_id,
      country_label: context.country_label,
      state_id: context.state_id,
      state_label: context.state_label,
      city_id: context.city_id,
      city_label: context.city_label,
      work_location_id: context.work_location_id,
      work_location_code: context.work_location_code,
      work_location_name: context.work_location_name,
      work_location_short_name: context.work_location_short_name,
      employee_profile_id: context.employee_profile_id,
      employee_profile_name: context.employee_profile_name,
      employee_profile_short_name: context.employee_profile_short_name,
      payroll_group_id: context.payroll_group_id,
      payroll_group_name: context.payroll_group_name,
      department_id: context.department_id,
      department_name: context.department_name,
      department_short_name: context.department_short_name,
      area_id: context.area_id,
      area_name: context.area_name,
      area_short_name: context.area_short_name,
      job_title_id: context.job_title_id,
      job_title_name: context.job_title_name,
      job_title_short_name: context.job_title_short_name,
      work_group_id: context.work_group_id,
      work_group_name: context.work_group_name,
      cost_center_id: context.cost_center_id,
      cost_center_name: context.cost_center_name,
      payroll_employee_code: context.payroll_employee_code,
      device_user_code: context.device_user_code,
      hire_date: context.hire_date,
      termination_date: context.termination_date,
      work_on_holidays: context.work_on_holidays,
      organization_route: [
        context.work_location_name,
        context.department_name,
        context.area_name,
        context.job_title_name,
      ].filter(Boolean).join(' / '),
    };

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      month: {
        year: currentYear,
        month: currentMonth,
        start: monthStartIso,
        end_exclusive: monthEndExclusiveIso,
      },
      range: {
        from: rangeFromIso,
        to: rangeToIso,
        today: todayIso,
        is_current_week: rangeFromIso === weekStartIso && rangeToIso === todayIso,
        can_navigate_next_week: rangeFromIso < weekStartIso,
      },
      employee,
      employee_company: employeeCompany,
      recent_punches: recentPunchesResult.rows || [],
      week: {
        iso_week: isoWeek,
        iso_year: isoYear,
        start: weekStartIso,
        end: weekEndIso,
        days: weekDays,
      },
      upcoming_shift_days: upcomingShiftDays,
      requests: requestsTimeline,
      holidays: holidaysCurrentMonth,
      month_punches: monthPunchesResult.rows || [],
      month_shifts: monthShiftsResult.rows || [],
      month_absence_requests: monthAbsenceRequestsResult.rows || [],
      month_shift_change_requests: monthShiftChangeRequestsResult.rows || [],
      month_time_punch_change_requests: monthTimePunchChangeRequestsResult.rows || [],
      calendars: {
        month: {
          year: currentYear,
          month: currentMonth,
          start: monthStartIso,
          end_exclusive: monthEndExclusiveIso,
        },
        modules: {
          module2_punches: calendarPunches,
          module3_shifts: calendarShifts,
          module4_requests: calendarRequests,
          module5_holidays: calendarHolidays,
        },
      },
      attendance_impact: {
        plus_events: plusEvents,
        minus_events: minusEvents,
      },
      incidents,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Internal server error',
    });
  }
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login contra Supabase/Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sesion creada
 *       401:
 *         description: Credenciales invalidas
 */
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son obligatorios' });
    }

    const { data, error } = await authLogin(String(email), String(password));
    if (error || !data?.session) {
      return res.status(401).json({
        error: error?.message || 'Credenciales invÃ¡lidas',
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

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Cambia la contraseña desde la interfaz de login
 *     description: Verifica el usuario y la contraseña actual antes de guardar la nueva contraseña.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [loginId, currentPassword, newPassword, confirmPassword]
 *             properties:
 *               loginId:
 *                 type: string
 *                 description: Usuario o correo del usuario.
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Contraseña actualizada correctamente.
 *       400:
 *         description: Solicitud inválida o confirmación incorrecta.
 *       401:
 *         description: Usuario o contraseña actual incorrectos.
 */
router.post('/auth/change-password', async (req: Request, res: Response) => {
  try {
    const { loginId, currentPassword, newPassword, confirmPassword } = req.body || {};
    const normalizedLoginId = String(loginId || '').trim();

    if (!normalizedLoginId || !currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: 'El usuario, la contraseña actual, la nueva contraseña y su confirmación son obligatorios.',
      });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    }
    if (String(newPassword) !== String(confirmPassword)) {
      return res.status(400).json({ error: 'La nueva contraseña y su confirmación no coinciden.' });
    }
    if (String(currentPassword) === String(newPassword)) {
      return res.status(400).json({ error: 'La nueva contraseña debe ser diferente de la actual.' });
    }

    const { data: currentCredentials, error: credentialsError } = await authLogin(
      normalizedLoginId,
      String(currentPassword)
    );
    if (credentialsError || !currentCredentials?.user?.id) {
      return res.status(401).json({ error: 'Usuario o contraseña actual incorrectos.' });
    }

    const Postgres = getPostgresClient();
    const { error: updateError } = await Postgres.auth.admin.updateUserById(
      currentCredentials.user.id,
      { password: String(newPassword) }
    );
    if (updateError) {
      return res.status(500).json({ error: 'No se pudo actualizar la contraseña.' });
    }

    await Postgres
      .from('users')
      .update({ must_change_password: false })
      .eq('auth_user_id', currentCredentials.user.id);

    return res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Error interno al cambiar la contraseña.' });
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
        error: 'Error al listar usuarios de autenticaciÃƒÂ³n',
        details: authError.message,
      });
    }

    const { data: publicUsers, error: publicError } = await Postgres
      .from('users')
      .select('id, username, email, is_active, auth_user_id')
      .limit(100);

    if (publicError) {
      console.error('Error listando usuarios pÃƒÂºblicos:', publicError);
      return res.status(500).json({
        error: 'Error al listar usuarios pÃƒÂºblicos',
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
    console.error('Error en diagnÃƒÂ³stico:', error);
    return res.status(500).json({
      error: 'Error interno en diagnÃƒÂ³stico',
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

    console.log(`Ã°Å¸â€Â§ Intentando crear usuario ${email}...`);

    // Verificar que tenant SYSTEM existe
    console.log('Ã°Å¸â€Â Verificando tenant SYSTEM...');
    const { data: systemTenant, error: tenantCheckError } = await Postgres
      .from('tenants')
      .select('id, tenant_key')
      .eq('tenant_key', 'SYSTEM')
      .single();

    if (tenantCheckError || !systemTenant) {
      console.error('Ã¢ÂÅ’ ERROR CRÃƒÂTICO: Tenant SYSTEM no existe');
      return res.status(500).json({
        error: 'SETUP INCOMPLETO: Tenant SYSTEM no encontrado',
        details: 'Debes ejecutar los scripts SQL de migraciÃƒÂ³n primero',
        solution: 'Ejecuta los scripts SQL en tu PostgreSQL y ejecuta los archivos en /Postgres/migrations/ en orden',
        requiredFiles: ['001_INITIAL_SCHEMA.sql', '002_SEED_COMPLETE.sql'],
      });
    }

    console.log(`Ã¢Å“â€¦ Tenant SYSTEM encontrado (id: ${systemTenant.id})`);

    // Verificar si ya existe
    const { data: existingUser } = await Postgres.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email === email);

    if (userExists) {
      console.log(`Ã¢ÂÂ­Ã¯Â¸Â Usuario ${email} ya existe (id: ${userExists.id})`);

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
    console.log('Ã°Å¸â€Â§ Creando usuario con admin.createUser...');

    const { data: newUser, error: createError } = await Postgres.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: displayName,
      },
    });

    if (createError) {
      console.error('Ã¢ÂÅ’ Error creando usuario:', createError);
      return res.status(500).json({
        error: 'No se pudo crear el usuario',
        details: createError.message,
        suggestion: 'Verifica que hayas ejecutado las migraciones SQL correctamente',
      });
    }

    const userId = newUser?.user?.id;

    if (!userId) {
      console.error('Ã¢ÂÅ’ No se obtuvo ID de usuario');
      return res.status(500).json({
        error: 'Error al obtener ID de usuario despuÃƒÂ©s de creaciÃƒÂ³n',
      });
    }

    console.log(`Ã¢Å“â€¦ Usuario creado en auth.users (id: ${userId})`);

    // Crear en public.users
    console.log('Ã°Å¸â€Â§ Creando/actualizando usuario en public.users...');
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
      console.error('Ã¢ÂÅ’ Error creando/actualizando usuario en public.users:', publicError);
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
        error: 'Error al sincronizar contraseÃƒÂ±a del usuario',
        details: syncPasswordError.message,
      });
    }

    console.log(`Ã¢Å“â€¦ Usuario creado/actualizado en public.users (id: ${publicUser.id})`);

    // Obtener rol SYSTEM_ADMIN
    console.log('Ã°Å¸â€Â Buscando rol SYSTEM_ADMIN...');
    const { data: systemAdminRole, error: roleError } = await Postgres
      .from('roles')
      .select('id')
      .eq('tenant_id', systemTenant.id)
      .eq('role_key', 'SYSTEM_ADMIN')
      .single();

    if (roleError || !systemAdminRole) {
      console.error('Ã¢ÂÅ’ ERROR CRÃƒÂTICO: Rol SYSTEM_ADMIN no existe');
      return res.status(500).json({
        error: 'SETUP INCOMPLETO: Rol SYSTEM_ADMIN no encontrado',
        details: 'Debes ejecutar los scripts SQL de migraciÃƒÂ³n primero',
        solution: 'Ejecuta los scripts SQL en tu PostgreSQL y ejecuta los archivos en /Postgres/migrations/ en orden',
        requiredFiles: ['001_INITIAL_SCHEMA.sql', '002_SEED_COMPLETE.sql'],
      });
    }

    console.log(`Ã¢Å“â€¦ Rol SYSTEM_ADMIN encontrado (id: ${systemAdminRole.id})`);

    // Asignar rol
    console.log('Ã°Å¸â€Â§ Asignando rol SYSTEM_ADMIN al usuario...');
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
      console.error('Ã¢ÂÅ’ Error asignando rol:', roleAssignError);
      return res.status(500).json({
        error: 'Error al asignar rol',
        details: roleAssignError.message,
      });
    }

    console.log(`Ã¢Å“â€¦ Rol SYSTEM_ADMIN asignado al usuario`);

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
        note: 'Ã¢Å¡Â Ã¯Â¸Â IMPORTANTE: Cambia esta contraseÃƒÂ±a despuÃƒÂ©s del primer login',
      },
      nextSteps: [
        '1. Inicia sesiÃƒÂ³n con las credenciales proporcionadas',
        '2. Cambia la contraseÃƒÂ±a inmediatamente',
        '3. Completa el wizard de configuraciÃƒÂ³n inicial',
      ],
    });
  } catch (error: any) {
    console.error('Ã°Å¸â€™Â¥ Error creando usuario system.admin:', error);
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
router.get('/tenants/:id/summary', requireAuth, getTenantSummary);
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
router.use('/attendance-events', requireAuth, attendanceRouter);

// Holidays
router.use('/holidays', requireAuth, holidaysRouter);

// Bootstrap Screens
router.post('/bootstrap/ensure-system-settings-screen', requireAuth, ensureSystemSettingsScreen);
router.post('/bootstrap-screens/ensure-system-settings', requireAuth, ensureSystemSettingsScreen);
router.post('/bootstrap-screens/ensure-system-settings-screens', requireAuth, ensureSystemSettingsScreen);
router.post('/bootstrap/ensure-maintenance-screens', requireAuth, ensureMaintenanceManagementScreens);
router.post('/bootstrap/ensure-security-screens', requireAuth, ensureSecurityManagementScreens);
router.post('/bootstrap/ensure-org-maintenance-screen', requireAuth, ensureOrgMaintenanceScreen);

// Lookups
router.use('/lookup-groups', requireAuth, lookupGroupsRouter);
router.use('/lookup-routes', requireAuth, lookupRouter);
router.use('/lookup-values', requireAuth, lookupValuesRouter);

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

// Security - User Scopes / Employee Access
router.use('/security-user-scopes', requireAuth, securityUserScopesRouter);
router.use('/security-role-permissions', requireAuth, securityRolePermissionsRouter);

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

// Subscription Plans Management
router.use('/subscription-plans', requireAuth, subscriptionPlansRouter);
router.use('/subscription-plans-management', requireAuth, subscriptionPlansRouter); // Legacy alias

// Work Patterns Management
router.use('/work-patterns', requireAuth, workPatternsRouter);

// Profile Attendance Events Management
router.use('/profile-attendance-events', requireAuth, profileAttendanceEventsRouter);

// Time Clock Devices Management
router.use('/time-clock-devices', requireAuth, timeClockDevicesRouter);

// Shift Planning Optimizer Bridge
router.use('/api/shift-planning', requireAuth, shiftPlanningRouter);

// Employee Shift Planning
router.use('/employee-shift-planning', requireAuth, employeeShiftPlanningRouter);

// Employee Time Punches
router.use('/employee-time-punches', requireAuth, employeeTimePunchesRouter);

// Employee Absence Requests (Solicitud de Permisos de Empleados)
router.use('/employee-absence-requests', requireAuth, employeeAbsenceRequestsRouter);

// Kiosk (employee self-service)
router.use('/kiosk', requireAuth, kioskRouter);
router.use('/route-tracking', requireAuth, routeTrackingRouter);
router.use('/overtime-reports', requireAuth, overtimeReportsRouter);
router.use('/notifications', requireAuth, notificationsRouter);
router.use('/system-message-keys', requireAuth, systemMessageKeysRouter);
router.use('/messages-management', requireAuth, systemMessageKeysRouter); // Legacy alias
router.use('/translations-management', requireAuth, translationsManagementRouter);
router.use('/system-reports', requireAuth, systemReportsRouter);
router.use('/system-reports-management', requireAuth, systemReportsRouter); // Legacy alias

// ============================================================================
// HEALTH & STATUS
// ============================================================================

/**
 * @openapi
 * /status:
 *   get:
 *     tags:
 *       - System
 *     summary: Estado general y rutas principales
 *     responses:
 *       200:
 *         description: Estado del backend
 */
router.get('/status', (req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    message: 'Backend API is running',
    endpoints: {
      bootstrap: ['/bootstrap/ensure-system-admin', '/bootstrap/wizard-state', '/bootstrap/token', '/bootstrap/languages', '/bootstrap/step1-tenant', '/bootstrap/step2-admin'],
      auth: ['/auth/diagnostics', '/auth/create-system-admin'],
      users: ['/users/profile', '/users/change-password'],
      tenants: ['/tenants/:id', '/tenant/settings'],
      maintenance: ['/actions', '/attendance-events', '/holidays', '/bootstrap-screens', '/lookup-groups', '/lookup-routes', '/lookup-values', '/menu-groups', '/role-screen-actions', '/roles', '/scope-types', '/screen-actions', '/screens', '/settings', '/system-settings', '/users-management'],
      config: ['/shift-constructor', '/work-patterns', '/time-clock-devices', '/profile-attendance-events'],
      planning: ['/api/shift-planning/generate'],
      employees: ['/employee-shift-planning'],
      attendance: ['/employee-time-punches', '/employee-absence-requests', '/kiosk'],
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
