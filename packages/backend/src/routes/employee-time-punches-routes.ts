import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { withDocs } from '../lib/swagger-docs.js';
import { publishTenantDashboardEvent } from '../lib/dashboard-events.js';

const router = Router();

function getActor(req: Request): string {
  const user = (req as any).user;
  return user?.email || user?.id || 'system';
}

async function resolveTenantId(req: Request): Promise<string | null> {
  const explicit = req.query.tenant_id || req.body?.tenant_id;
  if (typeof explicit === 'string' && explicit.trim()) {
    return explicit.trim();
  }

  const user = (req as any).user;
  if (!user?.id) return null;

  const result = await pool.query(
    `
      SELECT tenant_id
      FROM public.users
      WHERE auth_user_id = $1
      LIMIT 1
    `,
    [user.id]
  );

  return result.rows[0]?.tenant_id || null;
}

async function resolveRequestUserContext(req: Request): Promise<{ user_id: string; tenant_id: string } | null> {
  const user = (req as any).user;
  if (!user?.id) return null;

  const result = await pool.query(
    `
      SELECT id AS user_id, tenant_id
      FROM public.users
      WHERE auth_user_id = $1
        AND is_active = true
      LIMIT 1
    `,
    [user.id]
  );

  const row = result.rows[0];
  if (!row?.user_id || !row?.tenant_id) return null;
  return { user_id: row.user_id, tenant_id: row.tenant_id };
}

async function resolveUserRoleKeys(tenantId: string, userId: string): Promise<string[]> {
  const result = await pool.query(
    `
      SELECT DISTINCT UPPER(COALESCE(r.role_key, '')) AS role_key
      FROM public.user_roles ur
      INNER JOIN public.roles r
        ON r.id = ur.role_id
       AND r.tenant_id = ur.tenant_id
       AND r.is_active = true
      WHERE ur.tenant_id = $1::uuid
        AND ur.user_id = $2::uuid
        AND ur.is_active = true
        AND (ur.valid_from IS NULL OR ur.valid_from <= now())
        AND (ur.valid_to IS NULL OR ur.valid_to >= now())
    `,
    [tenantId, userId]
  );

  return result.rows
    .map((row) => String(row.role_key || '').trim().toUpperCase())
    .filter(Boolean);
}

async function resolveManagedEmployeeIdsForSecurityScope(tenantId: string, userId: string): Promise<string[]> {
  const result = await pool.query(
    `
      SELECT DISTINCT ura.employee_id::text AS employee_id
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
      WHERE ur.tenant_id = $1::uuid
        AND ur.user_id = $2::uuid
        AND ur.is_active = true
        AND (ur.valid_from IS NULL OR ur.valid_from <= now())
        AND (ur.valid_to IS NULL OR ur.valid_to >= now())
        AND UPPER(COALESCE(r.role_key, '')) IN ('SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN')
    `,
    [tenantId, userId]
  );

  return result.rows
    .map((row) => String(row.employee_id || '').trim())
    .filter(Boolean);
}

function normalizeNullableText(value: any): string | null {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  const next = repairCommonMojibake(raw);
  return next ? next : null;
}

function repairCommonMojibake(value: string): string {
  if (!value) return value;
  if (!/[ÃÂâ€]/.test(value)) return value;
  const repaired = Buffer.from(value, 'latin1').toString('utf8');
  return repaired.includes('�') ? value : repaired;
}

function normalizeNullableInt(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const next = Number(value);
  if (!Number.isFinite(next)) return null;
  return Math.trunc(next);
}

function parseRequiredInt(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const next = Number(value);
  if (!Number.isFinite(next)) return null;
  return Math.trunc(next);
}

function parseNullableCoordinate(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const next = Number(value);
  if (!Number.isFinite(next)) return Number.NaN;
  return next;
}

function isValidDateTime(value: string): boolean {
  const date = new Date(value);
  return Number.isFinite(date.getTime());
}

function isIsoDate(value: string | null): boolean {
  if (!value) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function resolveLookupValueIdByGroupKeyAndKeys(
  tenantId: string,
  groupKey: string,
  keys: string[]
): Promise<string | null> {
  const normalized = keys.map((key) => String(key || '').trim().toUpperCase()).filter(Boolean);
  if (normalized.length === 0) return null;

  const result = await pool.query(
    `
      SELECT lv.id
      FROM public.lookup_values lv
      INNER JOIN public.lookup_groups lg
        ON lg.id = lv.lookup_group_id
      WHERE lg.lookup_group_key = $1
        AND lv.is_active = true
        AND UPPER(lv.lookup_key) = ANY($2::text[])
        AND (lv.tenant_id IS NULL OR lv.tenant_id = $3::uuid)
      ORDER BY CASE WHEN lv.tenant_id = $3::uuid THEN 0 ELSE 1 END, lv.sort_order NULLS LAST
      LIMIT 1
    `,
    [groupKey, normalized, tenantId]
  );

  return result.rows[0]?.id || null;
}

async function ensurePunchInconsistencyNotificationTypeId(tenantId: string): Promise<string> {
  const existing = await resolveLookupValueIdByGroupKeyAndKeys(
    tenantId,
    'USER_NOTIFICATION_TYPE',
    ['PUNCH_INCONSISTENCY_DETECTED', 'TIME_PUNCH_INCONSISTENCY_DETECTED']
  );
  if (existing) return existing;

  const groupResult = await pool.query(
    `
      INSERT INTO public.lookup_groups (
        id,
        lookup_group_key,
        lookup_group_label,
        lookup_group_short_label,
        allows_tenant_items,
        is_active,
        created_by
      )
      VALUES (
        gen_random_uuid(),
        'USER_NOTIFICATION_TYPE',
        'Tipos de Notificacion Usuario',
        'Tipo Notificacion',
        false,
        true,
        'SYSTEM'
      )
      ON CONFLICT (lookup_group_key) DO UPDATE
      SET is_active = true,
          updated_by = 'SYSTEM',
          updated_at = now()
      RETURNING id
    `
  );

  const groupId = groupResult.rows[0]?.id as string | undefined;
  if (!groupId) {
    throw new Error('No se pudo resolver lookup_group USER_NOTIFICATION_TYPE');
  }

  const valueResult = await pool.query(
    `
      INSERT INTO public.lookup_values (
        id,
        tenant_id,
        lookup_group_id,
        lookup_key,
        lookup_label,
        lookup_short_label,
        lookup_scope,
        sort_order,
        is_active,
        created_by
      )
      VALUES (
        gen_random_uuid(),
        NULL,
        $1::uuid,
        'PUNCH_INCONSISTENCY_DETECTED',
        'Inconsistencia de Marcacion Detectada',
        'Inconsistencia Marcacion',
        'SYSTEM',
        80,
        true,
        'SYSTEM'
      )
      ON CONFLICT ON CONSTRAINT uq_lookup_values DO UPDATE
      SET
        lookup_label = EXCLUDED.lookup_label,
        lookup_short_label = EXCLUDED.lookup_short_label,
        sort_order = EXCLUDED.sort_order,
        is_active = true,
        updated_by = 'SYSTEM',
        updated_at = now()
      RETURNING id
    `,
    [groupId]
  );

  const valueId = valueResult.rows[0]?.id as string | undefined;
  if (!valueId) {
    const fallback = await resolveLookupValueIdByGroupKeyAndKeys(
      tenantId,
      'USER_NOTIFICATION_TYPE',
      ['PUNCH_INCONSISTENCY_DETECTED']
    );
    if (fallback) return fallback;
    throw new Error('No se pudo crear tipo de notificacion de inconsistencias');
  }

  return valueId;
}

type UnpairedQueryArgs = {
  tenantId: string;
  companyId: string;
  workLocationId: string | null;
  payrollGroupId: string | null;
  dateFromTs: string | null;
  dateToTs: string | null;
  isRestrictedRole: boolean;
  managedEmployeeIds: string[];
};

async function queryUnpairedInconsistencies(args: UnpairedQueryArgs) {
  const result = await pool.query(
    `
      WITH movement_keys AS (
        SELECT
          am.id AS movement_id,
          am.movement_short_name,
          am.movement_name,
          am.start_key,
          am.end_key
        FROM public.attendance_movements am
        WHERE am.tenant_id = $1
          AND am.is_active = true
          AND am.start_key IS NOT NULL
          AND am.end_key IS NOT NULL
      ),
      base_punches AS (
        SELECT
          p.id,
          p.tenant_id,
          p.company_id,
          c.company_name,
          p.employee_id,
          e.employee_code,
          e.employee_name,
          e.employee_lastname,
          p.punch_datetime,
          p.punch_time_zone,
          p.punch_key,
          ec_scope.work_location_id,
          wl.work_location_name,
          ec_scope.payroll_group_id,
          pg.payroll_group_name
        FROM public.employee_time_punches p
        JOIN public.companies c
          ON c.id = p.company_id
        JOIN public.employees e
          ON e.id = p.employee_id
        LEFT JOIN LATERAL (
          SELECT
            ec.work_location_id,
            ec.payroll_group_id
          FROM public.employee_companies ec
          WHERE ec.tenant_id = p.tenant_id
            AND ec.employee_id = p.employee_id
            AND ec.company_id = p.company_id
            AND ec.is_active = true
          ORDER BY ec.created_at DESC NULLS LAST
          LIMIT 1
        ) ec_scope ON true
        LEFT JOIN public.work_locations wl
          ON wl.id = ec_scope.work_location_id
        LEFT JOIN public.payroll_groups pg
          ON pg.id = ec_scope.payroll_group_id
        WHERE p.tenant_id = $1
          AND p.is_active = true
          AND p.company_id = $2::uuid
          AND ($3::uuid IS NULL OR ec_scope.work_location_id = $3::uuid)
          AND ($4::uuid IS NULL OR ec_scope.payroll_group_id = $4::uuid)
          AND ($5::timestamptz IS NULL OR p.punch_datetime >= $5::timestamptz)
          AND ($6::timestamptz IS NULL OR p.punch_datetime <= $6::timestamptz)
          AND ($7::boolean = false OR p.employee_id = ANY($8::uuid[]))
      ),
      tagged AS (
        SELECT
          b.*,
          mk.movement_id,
          mk.movement_short_name,
          mk.movement_name,
          mk.start_key,
          mk.end_key,
          CASE
            WHEN b.punch_key = mk.start_key THEN 'START'
            WHEN b.punch_key = mk.end_key THEN 'END'
            ELSE NULL
          END AS side
        FROM base_punches b
        JOIN movement_keys mk
          ON b.punch_key IN (mk.start_key, mk.end_key)
      ),
      starts AS (
        SELECT
          t.*,
          row_number() OVER (
            PARTITION BY t.tenant_id, t.company_id, t.employee_id, date_trunc('day', t.punch_datetime), t.movement_id
            ORDER BY t.punch_datetime, t.id
          ) AS rn
        FROM tagged t
        WHERE t.side = 'START'
      ),
      ends AS (
        SELECT
          t.*,
          row_number() OVER (
            PARTITION BY t.tenant_id, t.company_id, t.employee_id, date_trunc('day', t.punch_datetime), t.movement_id
            ORDER BY t.punch_datetime, t.id
          ) AS rn
        FROM tagged t
        WHERE t.side = 'END'
      ),
      pairs AS (
        SELECT
          COALESCE(s.tenant_id, e.tenant_id) AS tenant_id,
          COALESCE(s.company_id, e.company_id) AS company_id,
          COALESCE(s.company_name, e.company_name) AS company_name,
          COALESCE(s.employee_id, e.employee_id) AS employee_id,
          COALESCE(s.employee_code, e.employee_code) AS employee_code,
          COALESCE(s.employee_name, e.employee_name) AS employee_name,
          COALESCE(s.employee_lastname, e.employee_lastname) AS employee_lastname,
          COALESCE(s.work_location_id, e.work_location_id) AS work_location_id,
          COALESCE(s.work_location_name, e.work_location_name) AS work_location_name,
          COALESCE(s.payroll_group_id, e.payroll_group_id) AS payroll_group_id,
          COALESCE(s.payroll_group_name, e.payroll_group_name) AS payroll_group_name,
          COALESCE(s.movement_id, e.movement_id) AS movement_id,
          COALESCE(s.movement_short_name, e.movement_short_name) AS movement_short_name,
          COALESCE(s.movement_name, e.movement_name) AS movement_name,
          COALESCE(s.start_key, e.start_key) AS start_key,
          COALESCE(s.end_key, e.end_key) AS end_key,
          s.id AS start_punch_id,
          s.punch_datetime AS start_punch_datetime,
          s.punch_time_zone AS start_punch_time_zone,
          s.punch_key AS start_punch_key,
          e.id AS end_punch_id,
          e.punch_datetime AS end_punch_datetime,
          e.punch_time_zone AS end_punch_time_zone,
          e.punch_key AS end_punch_key
        FROM starts s
        FULL JOIN ends e
          ON e.tenant_id = s.tenant_id
         AND e.company_id = s.company_id
         AND e.employee_id = s.employee_id
         AND date_trunc('day', e.punch_datetime) = date_trunc('day', s.punch_datetime)
         AND e.movement_id = s.movement_id
         AND e.rn = s.rn
      )
      SELECT
        COALESCE(p.start_punch_id, p.end_punch_id) AS id,
        p.company_id,
        p.company_name,
        p.employee_id,
        p.employee_code,
        p.employee_name,
        p.employee_lastname,
        p.work_location_id,
        p.work_location_name,
        p.payroll_group_id,
        p.payroll_group_name,
        p.movement_id,
        p.movement_short_name,
        p.movement_name,
        p.start_key,
        p.end_key,
        CASE WHEN p.start_punch_id IS NULL THEN p.start_key ELSE p.end_key END AS missing_punch_key,
        CASE WHEN p.start_punch_id IS NULL THEN 'MISSING_START' ELSE 'MISSING_END' END AS inconsistency_type,
        COALESCE(p.start_punch_datetime, p.end_punch_datetime) AS punch_datetime,
        COALESCE(p.start_punch_time_zone, p.end_punch_time_zone) AS punch_time_zone,
        COALESCE(p.start_punch_key, p.end_punch_key) AS detected_punch_key
      FROM pairs p
      WHERE p.start_punch_id IS NULL
         OR p.end_punch_id IS NULL
      ORDER BY punch_datetime DESC, employee_lastname ASC, employee_name ASC
    `,
    [
      args.tenantId,
      args.companyId,
      args.workLocationId,
      args.payrollGroupId,
      args.dateFromTs,
      args.dateToTs,
      args.isRestrictedRole,
      args.managedEmployeeIds,
    ]
  );
  return result.rows;
}

const getTimePunchDebugCatalogs = withDocs(
  async (req: Request, res: Response) => {
    try {
      const userContext = await resolveRequestUserContext(req);
      if (!userContext?.tenant_id || !userContext?.user_id) {
        return res.status(400).json({ error: 'No se pudo resolver contexto de usuario' });
      }
      const tenantId = userContext.tenant_id;

      const roleKeys = await resolveUserRoleKeys(tenantId, userContext.user_id);
      const isRestrictedRole = roleKeys.some((key) => ['SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN'].includes(key));
      const managedEmployeeIds = isRestrictedRole
        ? await resolveManagedEmployeeIdsForSecurityScope(tenantId, userContext.user_id)
        : [];

      if (isRestrictedRole && managedEmployeeIds.length === 0) {
        return res.status(200).json({
          success: true,
          tenant_id: tenantId,
          companies: [],
          work_locations: [],
          payroll_groups: [],
        });
      }

      const params: any[] = [tenantId];
      const whereEmployees = isRestrictedRole ? ` AND ec.employee_id = ANY($2::uuid[]) ` : '';
      if (isRestrictedRole) params.push(managedEmployeeIds);

      const scopeResult = await pool.query(
        `
          SELECT DISTINCT
            ec.company_id,
            c.company_name,
            c.legacy_id AS company_code,
            ec.work_location_id,
            wl.work_location_name,
            wl.legacy_id AS work_location_code,
            ec.payroll_group_id,
            pg.payroll_group_name,
            pg.legacy_id AS payroll_group_code
          FROM public.employee_companies ec
          INNER JOIN public.employees e
            ON e.id = ec.employee_id
           AND e.tenant_id = ec.tenant_id
           AND e.is_active = true
          INNER JOIN public.companies c
            ON c.id = ec.company_id
           AND c.tenant_id = ec.tenant_id
           AND c.is_active = true
          LEFT JOIN public.work_locations wl
            ON wl.id = ec.work_location_id
           AND wl.tenant_id = ec.tenant_id
           AND wl.is_active = true
          LEFT JOIN public.payroll_groups pg
            ON pg.id = ec.payroll_group_id
           AND pg.tenant_id = ec.tenant_id
           AND pg.is_active = true
          WHERE ec.tenant_id = $1::uuid
            AND ec.is_active = true
            ${whereEmployees}
          ORDER BY c.company_name ASC, wl.work_location_name ASC, pg.payroll_group_name ASC
        `,
        params
      );

      const companiesMap = new Map<string, { id: string; company_name: string | null; company_code: string | null }>();
      const workLocationsMap = new Map<string, { id: string; company_id: string; work_location_name: string | null; work_location_code: string | null }>();
      const payrollGroupsMap = new Map<string, { id: string; company_id: string; payroll_group_name: string | null; payroll_group_code: string | null }>();

      for (const row of scopeResult.rows) {
        if (row.company_id && !companiesMap.has(row.company_id)) {
          companiesMap.set(row.company_id, {
            id: row.company_id,
            company_name: row.company_name || null,
            company_code: row.company_code || null,
          });
        }
        if (row.work_location_id && !workLocationsMap.has(row.work_location_id)) {
          workLocationsMap.set(row.work_location_id, {
            id: row.work_location_id,
            company_id: row.company_id,
            work_location_name: row.work_location_name || null,
            work_location_code: row.work_location_code || null,
          });
        }
        if (row.payroll_group_id && !payrollGroupsMap.has(row.payroll_group_id)) {
          payrollGroupsMap.set(row.payroll_group_id, {
            id: row.payroll_group_id,
            company_id: row.company_id,
            payroll_group_name: row.payroll_group_name || null,
            payroll_group_code: row.payroll_group_code || null,
          });
        }
      }

      return res.status(200).json({
        success: true,
        tenant_id: tenantId,
        companies: Array.from(companiesMap.values()),
        work_locations: Array.from(workLocationsMap.values()),
        payroll_groups: Array.from(payrollGroupsMap.values()),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error interno' });
    }
  },
  {
    tags: ['Depuracion de Marcaciones'],
    summary: 'Catalogos para filtros de depuracion (empresa, localidad, rol de pago)',
    responses: {
      200: { description: 'OK' },
      400: { description: 'Bad Request' },
      401: { description: 'No autorizado' },
      500: { description: 'Error interno' },
    },
  }
);

const getTimePunchUnpaired = withDocs(
  async (req: Request, res: Response) => {
    try {
      const userContext = await resolveRequestUserContext(req);
      if (!userContext?.tenant_id || !userContext?.user_id) {
        return res.status(400).json({ error: 'No se pudo resolver contexto de usuario' });
      }
      const tenantId = userContext.tenant_id;

      const companyId = normalizeNullableText(req.query.company_id);
      const workLocationId = normalizeNullableText(req.query.work_location_id);
      const payrollGroupId = normalizeNullableText(req.query.payroll_group_id);
      const dateFrom = normalizeNullableText(req.query.date_from);
      const dateTo = normalizeNullableText(req.query.date_to);

      if (!companyId) {
        return res.status(400).json({ error: 'company_id es obligatorio para procesar depuracion' });
      }

      if (dateFrom && !isIsoDate(dateFrom)) {
        return res.status(400).json({ error: 'date_from debe tener formato YYYY-MM-DD' });
      }
      if (dateTo && !isIsoDate(dateTo)) {
        return res.status(400).json({ error: 'date_to debe tener formato YYYY-MM-DD' });
      }

      const dateFromTs = dateFrom ? `${dateFrom}T00:00:00` : null;
      const dateToTs = dateTo ? `${dateTo}T23:59:59` : null;

      const roleKeys = await resolveUserRoleKeys(tenantId, userContext.user_id);
      const isRestrictedRole = roleKeys.some((key) => ['SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN'].includes(key));
      const managedEmployeeIds = isRestrictedRole
        ? await resolveManagedEmployeeIdsForSecurityScope(tenantId, userContext.user_id)
        : [];

      if (isRestrictedRole && managedEmployeeIds.length === 0) {
        return res.status(200).json({
          success: true,
          tenant_id: tenantId,
          filters: {
            company_id: companyId,
            work_location_id: workLocationId,
            payroll_group_id: payrollGroupId,
            date_from: dateFrom,
            date_to: dateTo,
          },
          inconsistencies: [],
        });
      }

      const result = await queryUnpairedInconsistencies({
        tenantId,
        companyId,
        workLocationId,
        payrollGroupId,
        dateFromTs,
        dateToTs,
        isRestrictedRole,
        managedEmployeeIds,
      });

      return res.status(200).json({
        success: true,
        tenant_id: tenantId,
        filters: {
          company_id: companyId,
          work_location_id: workLocationId,
          payroll_group_id: payrollGroupId,
          date_from: dateFrom,
          date_to: dateTo,
        },
        inconsistencies: result,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error interno' });
    }
  },
  {
    tags: ['Depuracion de Marcaciones'],
    summary: 'Procesa y devuelve marcaciones con pareja no formada',
    responses: {
      200: { description: 'OK' },
      400: { description: 'Bad Request' },
      401: { description: 'No autorizado' },
      500: { description: 'Error interno' },
    },
  }
);

const sendTimePunchInconsistencyNotifications = withDocs(
  async (req: Request, res: Response) => {
    try {
      const userContext = await resolveRequestUserContext(req);
      if (!userContext?.tenant_id || !userContext?.user_id) {
        return res.status(400).json({ error: 'No se pudo resolver contexto de usuario' });
      }
      const tenantId = userContext.tenant_id;

      const companyId = normalizeNullableText(req.body?.company_id);
      const workLocationId = normalizeNullableText(req.body?.work_location_id);
      const payrollGroupId = normalizeNullableText(req.body?.payroll_group_id);
      const dateFrom = normalizeNullableText(req.body?.date_from);
      const dateTo = normalizeNullableText(req.body?.date_to);

      if (!companyId) {
        return res.status(400).json({ error: 'company_id es obligatorio para notificar' });
      }
      if (dateFrom && !isIsoDate(dateFrom)) {
        return res.status(400).json({ error: 'date_from debe tener formato YYYY-MM-DD' });
      }
      if (dateTo && !isIsoDate(dateTo)) {
        return res.status(400).json({ error: 'date_to debe tener formato YYYY-MM-DD' });
      }

      const roleKeys = await resolveUserRoleKeys(tenantId, userContext.user_id);
      const isRestrictedRole = roleKeys.some((key) => ['SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN'].includes(key));
      const managedEmployeeIds = isRestrictedRole
        ? await resolveManagedEmployeeIdsForSecurityScope(tenantId, userContext.user_id)
        : [];

      if (isRestrictedRole && managedEmployeeIds.length === 0) {
        return res.status(200).json({
          success: true,
          total_inconsistencies: 0,
          notified_count: 0,
          skipped_without_user: 0,
        });
      }

      const dateFromTs = dateFrom ? `${dateFrom}T00:00:00` : null;
      const dateToTs = dateTo ? `${dateTo}T23:59:59` : null;

      const inconsistencies = await queryUnpairedInconsistencies({
        tenantId,
        companyId,
        workLocationId,
        payrollGroupId,
        dateFromTs,
        dateToTs,
        isRestrictedRole,
        managedEmployeeIds,
      });

      if (inconsistencies.length === 0) {
        return res.status(200).json({
          success: true,
          total_inconsistencies: 0,
          notified_count: 0,
          skipped_without_user: 0,
        });
      }

      const notificationTypeId = await ensurePunchInconsistencyNotificationTypeId(tenantId);

      const employeeIds = Array.from(new Set(inconsistencies.map((row) => String(row.employee_id || '')).filter(Boolean)));
      const employeeUserResult = await pool.query(
        `
          SELECT
            e.id AS employee_id,
            COALESCE(u_by_id.id, u_by_auth.id) AS user_id,
            COALESCE(u_by_id.is_active, u_by_auth.is_active, false) AS user_is_active
          FROM public.employees e
          LEFT JOIN public.users u_by_id
            ON u_by_id.id = e.user_id
           AND u_by_id.tenant_id = e.tenant_id
          LEFT JOIN public.users u_by_auth
            ON u_by_auth.auth_user_id::text = e.user_id::text
           AND u_by_auth.tenant_id = e.tenant_id
          WHERE e.tenant_id = $1::uuid
            AND e.id = ANY($2::uuid[])
            AND e.is_active = true
        `,
        [tenantId, employeeIds]
      );

      const userByEmployee = new Map<string, string>();
      for (const row of employeeUserResult.rows) {
        if (row.employee_id && row.user_id && row.user_is_active) {
          userByEmployee.set(String(row.employee_id), String(row.user_id));
        }
      }

      let notifiedCount = 0;
      let skippedWithoutUser = 0;
      let skippedAlreadyNotified = 0;
      const actor = getActor(req);

      for (const row of inconsistencies) {
        const recipientUserId = userByEmployee.get(String(row.employee_id || ''));
        if (!recipientUserId) {
          skippedWithoutUser += 1;
          continue;
        }

        const movementLabel = row.movement_name || row.movement_short_name || 'MOVIMIENTO';
        const dateLabel = row.punch_datetime ? new Date(row.punch_datetime).toLocaleString('es-EC') : '-';
        const message = `Inconsistencia detectada en marcacion: fecha ${dateLabel}, movimiento ${movementLabel}, falta key ${row.missing_punch_key}. Por favor, registre su justificacion.`;

        const insertResult = await pool.query(
          `
            INSERT INTO public.user_notifications (
              id,
              tenant_id,
              user_id,
              notification_type_id,
              title,
              message,
              icon_key,
              ref_table,
              ref_id,
              metadata,
              is_read,
              is_active,
              created_by
            )
            SELECT
              gen_random_uuid(),
              $1::uuid,
              $2::uuid,
              $3::uuid,
              'Depuracion de marcaciones',
              $4::text,
              'AlertTriangle',
              'employee_time_punches',
              $5::uuid,
              $6::jsonb,
              false,
              true,
              $7
            WHERE NOT EXISTS (
              SELECT 1
              FROM public.user_notifications n
              WHERE n.tenant_id = $1::uuid
                AND n.user_id = $2::uuid
                AND n.notification_type_id = $3::uuid
                AND n.ref_table = 'employee_time_punches'
                AND n.ref_id = $5::uuid
                AND COALESCE(n.metadata->>'inconsistency_type', '') = COALESCE($8::text, '')
                AND COALESCE(n.metadata->>'missing_punch_key', '') = COALESCE($9::text, '')
                AND n.is_active = true
            )
            RETURNING id
          `,
          [
            tenantId,
            recipientUserId,
            notificationTypeId,
            message,
            row.id,
            JSON.stringify({
              employee_id: row.employee_id,
              employee_code: row.employee_code,
              employee_name: row.employee_name,
              employee_lastname: row.employee_lastname,
              employee_full_name: `${String(row.employee_lastname || '').trim()} ${String(row.employee_name || '').trim()}`.trim(),
              movement_id: row.movement_id,
              movement_short_name: row.movement_short_name,
              movement_name: row.movement_name,
              missing_punch_key: row.missing_punch_key,
              detected_punch_key: row.detected_punch_key,
              inconsistency_type: row.inconsistency_type,
              punch_datetime: row.punch_datetime,
            }),
            actor,
            row.inconsistency_type || '',
            String(row.missing_punch_key ?? ''),
          ]
        );

        if ((insertResult.rowCount ?? 0) > 0) {
          notifiedCount += 1;
        } else {
          skippedAlreadyNotified += 1;
        }
      }

      return res.status(200).json({
        success: true,
        total_inconsistencies: inconsistencies.length,
        notified_count: notifiedCount,
        skipped_without_user: skippedWithoutUser,
        skipped_already_notified: skippedAlreadyNotified,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error interno' });
    }
  },
  {
    tags: ['Depuracion de Marcaciones'],
    summary: 'Envia notificaciones a empleados con inconsistencias de marcacion',
    responses: {
      200: { description: 'OK' },
      400: { description: 'Bad Request' },
      401: { description: 'No autorizado' },
      500: { description: 'Error interno' },
    },
  }
);

router.get('/debug/catalogs', getTimePunchDebugCatalogs);
router.get('/debug/unpaired', getTimePunchUnpaired);
router.post('/debug/notify', sendTimePunchInconsistencyNotifications);

router.get('/catalogs', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const [companiesResult, employeesResult, devicesResult, lookupsResult] = await Promise.all([
      pool.query(
        `
          SELECT id, company_name, legacy_id AS company_code
          FROM public.companies
          WHERE tenant_id = $1
            AND is_active = true
          ORDER BY company_name ASC
        `,
        [tenantId]
      ),
      pool.query(
        `
          SELECT
            e.id,
            e.employee_code,
            e.employee_name,
            e.employee_lastname,
            ec.company_id,
            c.company_name
          FROM public.employees e
          LEFT JOIN LATERAL (
            SELECT company_id
            FROM public.employee_companies ec
            WHERE ec.tenant_id = e.tenant_id
              AND ec.employee_id = e.id
              AND ec.is_active = true
            ORDER BY ec.created_at DESC NULLS LAST
            LIMIT 1
          ) ec ON true
          LEFT JOIN public.companies c
            ON c.id = ec.company_id
          WHERE e.tenant_id = $1
            AND e.is_active = true
          ORDER BY e.employee_lastname ASC, e.employee_name ASC
        `,
        [tenantId]
      ),
      pool.query(
        `
          SELECT
            id,
            company_id,
            device_name,
            device_serial_number
          FROM public.time_clock_devices
          WHERE tenant_id = $1
            AND is_active = true
          ORDER BY device_name ASC, device_serial_number ASC
        `,
        [tenantId]
      ),
      pool.query(
        `
          SELECT
            lv.id,
            lv.lookup_key,
            lv.lookup_label,
            lv.sort_order,
            CASE
              WHEN lv.lookup_key ~ '^[0-9]+$' THEN lv.lookup_key::integer
              ELSE lv.sort_order
            END AS punch_key_value,
            lg.lookup_group_key
          FROM public.lookup_values lv
          JOIN public.lookup_groups lg
            ON lg.id = lv.lookup_group_id
          WHERE lg.lookup_group_key IN ('PUNCH_SOURCE', 'TIME_PUNCH_STATUS', 'PUNCH_KEY')
            AND lv.is_active = true
          ORDER BY lg.lookup_group_key ASC, lv.sort_order ASC, lv.lookup_label ASC
        `
      ),
    ]);

    const punchSources = lookupsResult.rows.filter((row) => row.lookup_group_key === 'PUNCH_SOURCE');
    const punchStatuses = lookupsResult.rows.filter((row) => row.lookup_group_key === 'TIME_PUNCH_STATUS');
    const punchKeys = lookupsResult.rows.filter((row) => row.lookup_group_key === 'PUNCH_KEY');

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      companies: companiesResult.rows,
      employees: employeesResult.rows,
      devices: devicesResult.rows,
      punch_keys: punchKeys,
      punch_sources: punchSources,
      punch_statuses: punchStatuses,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const includeInactive = String(req.query.include_inactive || '').toLowerCase() === 'true';
    const dateFrom = normalizeNullableText(req.query.date_from);
    const dateTo = normalizeNullableText(req.query.date_to);

    const params: any[] = [tenantId, includeInactive];
    let whereExtras = '';

    if (dateFrom) {
      params.push(dateFrom);
      whereExtras += ` AND p.punch_datetime >= $${params.length}::timestamptz`;
    }
    if (dateTo) {
      params.push(dateTo);
      whereExtras += ` AND p.punch_datetime <= $${params.length}::timestamptz`;
    }

    const result = await pool.query(
      `
        SELECT
          p.id,
          p.tenant_id,
          p.company_id,
          c.company_name,
          p.employee_id,
          e.employee_code,
          e.employee_name,
          e.employee_lastname,
          p.time_clock_device_id,
          d.device_name,
          d.device_serial_number,
          p.punch_datetime,
          p.punch_time_zone,
          p.punch_key,
          p.punch_source_id,
          src.lookup_label AS punch_source_label,
          p.time_punch_status_id,
          st.lookup_label AS time_punch_status_label,
          p.service_ticket_number,
          p.notes,
          p.latitud,
          p.longitud,
          p.process_run_id,
          p.is_active,
          p.created_by,
          p.created_at,
          p.updated_by,
          p.updated_at
        FROM public.employee_time_punches p
        JOIN public.companies c
          ON c.id = p.company_id
        JOIN public.employees e
          ON e.id = p.employee_id
        LEFT JOIN public.time_clock_devices d
          ON d.id = p.time_clock_device_id
        LEFT JOIN public.lookup_values src
          ON src.id = p.punch_source_id
        LEFT JOIN public.lookup_values st
          ON st.id = p.time_punch_status_id
        WHERE p.tenant_id = $1
          AND ($2::boolean = true OR p.is_active = true)
          ${whereExtras}
        ORDER BY p.punch_datetime DESC, p.created_at DESC
      `,
      params
    );

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      punches: result.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const companyId = normalizeNullableText(req.body?.company_id);
    const employeeId = normalizeNullableText(req.body?.employee_id);
    const timeClockDeviceId = normalizeNullableText(req.body?.time_clock_device_id);
    const punchDatetime = normalizeNullableText(req.body?.punch_datetime);
    const punchTimeZone = normalizeNullableText(req.body?.punch_time_zone) || 'America/Guayaquil';
    const punchKey = parseRequiredInt(req.body?.punch_key);
    const punchSourceId = normalizeNullableText(req.body?.punch_source_id);
    const timePunchStatusId = normalizeNullableText(req.body?.time_punch_status_id);
    const serviceTicketNumber = normalizeNullableInt(req.body?.service_ticket_number);
    const notes = normalizeNullableText(req.body?.notes);
    const latitud = parseNullableCoordinate(req.body?.latitud);
    const longitud = parseNullableCoordinate(req.body?.longitud);
    const processRunId = normalizeNullableText(req.body?.process_run_id);
    const isActive = req.body?.is_active !== false;

    if (!companyId) return res.status(400).json({ error: 'company_id es obligatorio' });
    if (!employeeId) return res.status(400).json({ error: 'employee_id es obligatorio' });
    if (!punchDatetime || !isValidDateTime(punchDatetime)) {
      return res.status(400).json({ error: 'punch_datetime es obligatorio y debe ser una fecha válida' });
    }
    if (punchKey === null) {
      return res.status(400).json({ error: 'punch_key es obligatorio y debe ser entero' });
    }
    if (latitud !== null && !Number.isFinite(latitud)) {
      return res.status(400).json({ error: 'latitud debe ser numerica' });
    }
    if (longitud !== null && !Number.isFinite(longitud)) {
      return res.status(400).json({ error: 'longitud debe ser numerica' });
    }
    if (latitud !== null && (latitud < -90 || latitud > 90)) {
      return res.status(400).json({ error: 'latitud fuera de rango (-90 a 90)' });
    }
    if (longitud !== null && (longitud < -180 || longitud > 180)) {
      return res.status(400).json({ error: 'longitud fuera de rango (-180 a 180)' });
    }

    const actor = getActor(req);
    const result = await pool.query(
      `
        INSERT INTO public.employee_time_punches (
          id,
          tenant_id,
          company_id,
          employee_id,
          time_clock_device_id,
          punch_datetime,
          punch_time_zone,
          punch_key,
          punch_source_id,
          time_punch_status_id,
          service_ticket_number,
          notes,
          latitud,
          longitud,
          process_run_id,
          is_active,
          created_by
        )
        VALUES (
          gen_random_uuid(),
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
        )
        RETURNING *
      `,
      [
        tenantId,
        companyId,
        employeeId,
        timeClockDeviceId,
        punchDatetime,
        punchTimeZone,
        punchKey,
        punchSourceId,
        timePunchStatusId,
        serviceTicketNumber,
        notes,
        latitud,
        longitud,
        processRunId,
        isActive,
        actor,
      ]
    );

    publishTenantDashboardEvent(tenantId, 'time_punch_created', employeeId);
    return res.status(201).json({ success: true, punch: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const id = normalizeNullableText(req.params.id);
    if (!id) return res.status(400).json({ error: 'id es obligatorio' });

    const companyId = normalizeNullableText(req.body?.company_id);
    const employeeId = normalizeNullableText(req.body?.employee_id);
    const timeClockDeviceId = normalizeNullableText(req.body?.time_clock_device_id);
    const punchDatetime = normalizeNullableText(req.body?.punch_datetime);
    const punchTimeZone = normalizeNullableText(req.body?.punch_time_zone) || 'America/Guayaquil';
    const punchKey = parseRequiredInt(req.body?.punch_key);
    const punchSourceId = normalizeNullableText(req.body?.punch_source_id);
    const timePunchStatusId = normalizeNullableText(req.body?.time_punch_status_id);
    const serviceTicketNumber = normalizeNullableInt(req.body?.service_ticket_number);
    const notes = normalizeNullableText(req.body?.notes);
    const latitud = parseNullableCoordinate(req.body?.latitud);
    const longitud = parseNullableCoordinate(req.body?.longitud);
    const processRunId = normalizeNullableText(req.body?.process_run_id);
    const isActive = req.body?.is_active !== false;

    if (!companyId) return res.status(400).json({ error: 'company_id es obligatorio' });
    if (!employeeId) return res.status(400).json({ error: 'employee_id es obligatorio' });
    if (!punchDatetime || !isValidDateTime(punchDatetime)) {
      return res.status(400).json({ error: 'punch_datetime es obligatorio y debe ser una fecha válida' });
    }
    if (punchKey === null) {
      return res.status(400).json({ error: 'punch_key es obligatorio y debe ser entero' });
    }
    if (latitud !== null && !Number.isFinite(latitud)) {
      return res.status(400).json({ error: 'latitud debe ser numerica' });
    }
    if (longitud !== null && !Number.isFinite(longitud)) {
      return res.status(400).json({ error: 'longitud debe ser numerica' });
    }
    if (latitud !== null && (latitud < -90 || latitud > 90)) {
      return res.status(400).json({ error: 'latitud fuera de rango (-90 a 90)' });
    }
    if (longitud !== null && (longitud < -180 || longitud > 180)) {
      return res.status(400).json({ error: 'longitud fuera de rango (-180 a 180)' });
    }

    const actor = getActor(req);
    const result = await pool.query(
      `
        UPDATE public.employee_time_punches
        SET
          company_id = $3,
          employee_id = $4,
          time_clock_device_id = $5,
          punch_datetime = $6,
          punch_time_zone = $7,
          punch_key = $8,
          punch_source_id = $9,
          time_punch_status_id = $10,
          service_ticket_number = $11,
          notes = $12,
          latitud = $13,
          longitud = $14,
          process_run_id = $15,
          is_active = $16,
          updated_by = $17,
          updated_at = now()
        WHERE id = $1
          AND tenant_id = $2
        RETURNING *
      `,
      [
        id,
        tenantId,
        companyId,
        employeeId,
        timeClockDeviceId,
        punchDatetime,
        punchTimeZone,
        punchKey,
        punchSourceId,
        timePunchStatusId,
        serviceTicketNumber,
        notes,
        latitud,
        longitud,
        processRunId,
        isActive,
        actor,
      ]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Marcación no encontrada' });
    publishTenantDashboardEvent(tenantId, 'time_punch_updated', employeeId);
    return res.status(200).json({ success: true, punch: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const id = normalizeNullableText(req.params.id);
    if (!id) return res.status(400).json({ error: 'id es obligatorio' });

    const result = await pool.query(
      `
        DELETE FROM public.employee_time_punches
        WHERE id = $1
          AND tenant_id = $2
        RETURNING id
      `,
      [id, tenantId]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Marcación no encontrada' });
    publishTenantDashboardEvent(tenantId, 'time_punch_deleted', null);
    return res.status(200).json({ success: true, deleted_id: result.rows[0].id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

export default router;
