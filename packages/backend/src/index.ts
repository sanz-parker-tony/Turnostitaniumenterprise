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
import shiftPlanningRouter from './routes/shift-planning.routes';
import employeeShiftPlanningRouter from './routes/employee-shift-planning-routes';
import employeeTimePunchesRouter from './routes/employee-time-punches-routes';
import kioskRouter from './routes/kiosk-routes';
import shiftConstructorRouter from './routes/shift-constructor-routes';
import subscriptionPlansRouter from './routes/subscription-plans-routes';
import systemSettingsRouter from './routes/system-settings-routes';
import timeClockDevicesRouter from './routes/time-clock-devices-routes';
import usersRouter from './routes/users-management-routes';
import workPatternsRouter from './routes/work-patterns-routes';
import profileAttendanceEventsRouter from './routes/profile-attendance-events-routes';

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
  if (req.method === 'OPTIONS') {
    return next();
  }

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

    const [tenantInfoRes, countersRes, shiftsRes, workPatternsRes, monthCalendarRes, devicesRes] = await Promise.all([
      pool.query(
        `
          SELECT
            t.id,
            t.tenant_key,
            t.tenant_name,
            t.is_active,
            t.created_at,
            COALESCE(tls.language_code, 'es') AS language_code
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
          )
          SELECT
            (SELECT COUNT(*)::int FROM users WHERE tenant_id = $1 AND is_active = true) AS active_users,
            (SELECT COUNT(*)::int FROM employees WHERE tenant_id = $1 AND is_active = true) AS active_employees,
            (SELECT COUNT(*)::int FROM companies WHERE tenant_id = $1 AND is_active = true) AS active_companies,
            (SELECT COUNT(*)::int FROM roles WHERE tenant_id = $1 AND is_active = true) AS active_roles,
            (SELECT COUNT(*)::int FROM tenant_members WHERE tenant_id = $1) AS tenant_members,
            (SELECT COUNT(*)::int FROM tenant_settings WHERE tenant_id = $1 AND is_active = true) AS tenant_setting_overrides,
            (SELECT COUNT(*)::int FROM work_locations WHERE tenant_id = $1 AND is_active = true) AS active_work_locations,
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
            (SELECT total FROM pending_shift_change) AS pending_shift_change_requests
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
          LIMIT 100
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
            wl.work_location_code,
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
 * 6) Novedades que suman (mes en curso)
 * 7) Novedades que restan (mes en curso)
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
          c.company_code,
          c.company_name,
          c.company_short_name,
          c.company_country_id AS country_id,
          c.company_state_id AS state_id,
          c.company_city_id AS city_id,
          country.lookup_label AS country_label,
          state.lookup_label AS state_label,
          city.lookup_label AS city_label,
          ec.work_location_id,
          wl.work_location_code,
          wl.work_location_name,
          wl.country_id AS work_location_country_id,
          wl.state_id AS work_location_state_id,
          wl.city_id AS work_location_city_id,
          ec.employee_profile_id,
          ep.profile_name AS employee_profile_name,
          ec.payroll_group_id,
          pg.payroll_group_name,
          ec.department_id,
          d.department_name,
          ec.area_id,
          a.area_name,
          ec.job_title_id,
          jt.job_title_name,
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

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEndExclusive = new Date(currentYear, currentMonth, 1);
    const monthStartIso = monthStart.toISOString().slice(0, 10);
    const monthEndExclusiveIso = monthEndExclusive.toISOString().slice(0, 10);

    const weekStart = new Date(now);
    const dayOffset = (weekStart.getDay() + 6) % 7; // lunes=0
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - dayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartIso = weekStart.toISOString().slice(0, 10);
    const weekEndIso = weekEnd.toISOString().slice(0, 10);

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

    const [recentPunchesResult, monthPunchesResult, monthShiftsResult, monthAbsenceRequestsResult, monthShiftChangeRequestsResult, holidaysRawResult, attendanceImpactResult] = await Promise.all([
      pool.query(
        `
          SELECT
            p.id,
            p.punch_datetime,
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
          ORDER BY p.shift_date ASC
        `,
        [tenantId, context.user_id, monthStartIso, monthEndExclusiveIso]
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
            h.work_location_id
          FROM public.holidays h
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
          WHERE calc.tenant_id = $1::uuid
            AND calc.employee_id = $2::uuid
            AND calc.year = $3::int
            AND calc.month = $4::int
            AND calc.is_active = true
          GROUP BY
            ae.id,
            ae.event_name,
            ae.event_short_name,
            direction.lookup_key,
            direction.lookup_label
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
        [tenantId, employeeId, currentYear, currentMonth]
      ),
    ]);

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
      date.setDate(weekStart.getDate() + i);
      const dateIso = date.toISOString().slice(0, 10);
      const shift = shiftsByDate.get(dateIso) || null;
      weekDays.push({
        date: dateIso,
        weekday_label: date.toLocaleDateString('es-EC', { weekday: 'short' }).replace('.', ''),
        shift,
      });
    }

    const plusTokens = ['SUM', 'ADD', 'POS', 'ACRE', 'INC', 'CREDIT', 'ABON'];
    const minusTokens = ['RES', 'SUB', 'NEG', 'DEC', 'DEBIT', 'DESCU', 'RESTA'];

    const plusEvents: any[] = [];
    const minusEvents: any[] = [];

    for (const row of attendanceImpactResult.rows || []) {
      const directionKey = String(row.direction_key || '').toUpperCase();
      const totalValue = Number(row.total_value || 0);
      const normalized = {
        attendance_event_id: row.attendance_event_id,
        event_name: row.event_name,
        event_short_name: row.event_short_name,
        direction_key: row.direction_key,
        direction_label: row.direction_label,
        total_value: totalValue,
        total_hours: totalValue / 60,
      };

      const isPlusByKey = plusTokens.some((token) => directionKey.includes(token));
      const isMinusByKey = minusTokens.some((token) => directionKey.includes(token));
      if (isPlusByKey || (!isMinusByKey && totalValue > 0)) {
        plusEvents.push(normalized);
      } else {
        minusEvents.push({
          ...normalized,
          total_value: Math.abs(totalValue),
          total_hours: Math.abs(totalValue) / 60,
        });
      }
    }

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
      const dateKey = normalizeDateOnly(row?.punch_datetime);
      if (!dateKey || dateKey < monthStartIso || dateKey >= monthEndExclusiveIso) return [];
      const isStart = isStartPunch(row?.punch_key, String(row?.movement_label || ''));
      return [{
        date: dateKey,
        icon_key: iconFromPunch(row?.punch_key, String(row?.movement_label || '')),
        title: row?.movement_label || `Marcacion ${row?.punch_key ?? ''}`.trim(),
        subtitle: String(row?.punch_datetime || '').slice(11, 16),
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
    ];

    const calendarHolidays = holidaysCurrentMonth.map((row: any) => ({
      date: normalizeDateOnly(row?.holiday_date),
      icon_key: 'CalendarDays',
      title: row?.holiday_name || 'Feriado',
      subtitle: 'No laborable',
      bg_color: '#DCFCE7',
      text_color: '#166534',
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

    const requestsTimeline = [...(monthAbsenceRequestsResult.rows || []), ...(monthShiftChangeRequestsResult.rows || [])]
      .sort((a: any, b: any) => {
        const left = String(b?.start_datetime || b?.shift_date || '');
        const right = String(a?.start_datetime || a?.shift_date || '');
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
      employee_profile_id: context.employee_profile_id,
      employee_profile_name: context.employee_profile_name,
      payroll_group_id: context.payroll_group_id,
      payroll_group_name: context.payroll_group_name,
      department_id: context.department_id,
      department_name: context.department_name,
      area_id: context.area_id,
      area_name: context.area_name,
      job_title_id: context.job_title_id,
      job_title_name: context.job_title_name,
      work_group_id: context.work_group_id,
      work_group_name: context.work_group_name,
      cost_center_id: context.cost_center_id,
      cost_center_name: context.cost_center_name,
      payroll_employee_code: context.payroll_employee_code,
      device_user_code: context.device_user_code,
      hire_date: context.hire_date,
      termination_date: context.termination_date,
      work_on_holidays: context.work_on_holidays,
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
      requests: requestsTimeline,
      holidays: holidaysCurrentMonth,
      month_punches: monthPunchesResult.rows || [],
      month_shifts: monthShiftsResult.rows || [],
      month_absence_requests: monthAbsenceRequestsResult.rows || [],
      month_shift_change_requests: monthShiftChangeRequestsResult.rows || [],
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

// Kiosk (employee self-service)
router.use('/kiosk', requireAuth, kioskRouter);

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
      maintenance: ['/actions', '/attendance-events', '/bootstrap-screens', '/lookup-groups', '/lookup-routes', '/lookup-values', '/menu-groups', '/role-screen-actions', '/roles', '/scope-types', '/screen-actions', '/screens', '/settings', '/system-settings', '/users-management'],
      config: ['/shift-constructor', '/work-patterns', '/time-clock-devices', '/profile-attendance-events'],
      planning: ['/api/shift-planning/generate'],
      employees: ['/employee-shift-planning'],
      attendance: ['/employee-time-punches', '/kiosk'],
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



