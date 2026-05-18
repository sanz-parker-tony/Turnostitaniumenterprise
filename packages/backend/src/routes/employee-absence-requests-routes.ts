import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { withDocs } from '../lib/swagger-docs.js';

const router = Router();

type UserContext = {
  user_id: string;
  tenant_id: string;
};

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

async function resolveUserContext(req: Request): Promise<UserContext | null> {
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

  return {
    user_id: String(row.user_id),
    tenant_id: String(row.tenant_id),
  };
}

async function resolveUserContextByEmail(
  email: string,
  tenantId?: string | null
): Promise<UserContext | null> {
  const params: any[] = [email.trim().toLowerCase()];
  let tenantFilter = '';

  if (tenantId) {
    params.push(tenantId);
    tenantFilter = ` AND u.tenant_id = $2::uuid`;
  }

  const result = await pool.query(
    `
      SELECT u.id AS user_id, u.tenant_id
      FROM public.users u
      WHERE LOWER(COALESCE(u.email, '')) = $1
        AND u.is_active = true
        ${tenantFilter}
      LIMIT 1
    `,
    params
  );

  const row = result.rows[0];
  if (!row?.user_id || !row?.tenant_id) return null;

  return {
    user_id: String(row.user_id),
    tenant_id: String(row.tenant_id),
  };
}

async function resolveEffectiveUserContext(
  req: Request,
  tenantId: string
): Promise<UserContext | null> {
  const userEmailParam = normalizeNullableText(req.query.user_email);
  if (userEmailParam) {
    const byEmail = await resolveUserContextByEmail(userEmailParam, tenantId);
    if (byEmail) return byEmail;
  }
  return resolveUserContext(req);
}

async function getUserRoleKeys(tenantId: string, userId: string): Promise<string[]> {
  const result = await pool.query(
    `
      SELECT DISTINCT UPPER(r.role_key) AS role_key
      FROM public.user_roles ur
      JOIN public.roles r
        ON r.id = ur.role_id
       AND r.is_active = true
      WHERE ur.tenant_id = $1::uuid
        AND ur.user_id = $2::uuid
        AND ur.is_active = true
        AND (ur.valid_from IS NULL OR ur.valid_from <= now())
        AND (ur.valid_to IS NULL OR ur.valid_to >= now())
    `,
    [tenantId, userId]
  );

  return result.rows.map((row) => String(row.role_key || '').trim()).filter(Boolean);
}

function mustRestrictToAssignedEmployees(roleKeys: string[]): boolean {
  return roleKeys.some((key) => ['SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN'].includes(key));
}

async function resolveManagedEmployeeIds(tenantId: string, userId: string): Promise<string[]> {
  const result = await pool.query(
    `
      SELECT DISTINCT ura.employee_id::text AS employee_id
      FROM public.user_roles ur
      JOIN public.roles r
        ON r.id = ur.role_id
       AND r.is_active = true
      JOIN public.user_role_employee_assignments ura
        ON ura.tenant_id = ur.tenant_id
       AND ura.user_role_id = ur.id
       AND ura.is_active = true
      JOIN public.employees e
        ON e.id = ura.employee_id
       AND e.tenant_id = ura.tenant_id
       AND e.is_active = true
      WHERE ur.tenant_id = $1::uuid
        AND ur.user_id = $2::uuid
        AND ur.is_active = true
        AND (ur.valid_from IS NULL OR ur.valid_from <= now())
        AND (ur.valid_to IS NULL OR ur.valid_to >= now())
        AND UPPER(r.role_key) IN ('SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN')
    `,
    [tenantId, userId]
  );

  return result.rows
    .map((row) => String(row.employee_id || '').trim())
    .filter(Boolean);
}

function normalizeNullableText(value: any): string | null {
  if (value === undefined || value === null) return null;
  const next = String(value).trim();
  return next || null;
}

function normalizeBoolean(value: any): boolean {
  return String(value || '').toLowerCase() === 'true';
}

function normalizePositiveInt(value: any, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
}

function normalizeNonNegativeInt(value: any, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.trunc(parsed);
}

const getEmployeeAbsenceRequestsCatalogs = withDocs(
  async (req: Request, res: Response) => {
    try {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
      const userContext = await resolveUserContext(req);
      const roleKeys =
        userContext && userContext.tenant_id === tenantId
          ? await getUserRoleKeys(tenantId, userContext.user_id)
          : [];
      const applyEmployeeRestriction = mustRestrictToAssignedEmployees(roleKeys);
      const managedEmployeeIds =
        applyEmployeeRestriction && userContext
          ? await resolveManagedEmployeeIds(tenantId, userContext.user_id)
          : [];

      const [companiesResult, justTypesResult, eventsResult, justifyMethodsResult, statusResult] =
        await Promise.all([
          pool.query(
            `
            SELECT id, company_code, company_name
            FROM public.companies
            WHERE tenant_id = $1::uuid
              AND is_active = true
            ORDER BY company_name ASC
          `,
            [tenantId]
          ),
          pool.query(
            `
            SELECT
              jt.id,
              jt.justification_name,
              jt.justification_short_name
            FROM public.justification_types jt
            WHERE jt.tenant_id = $1::uuid
              AND jt.is_active = true
            ORDER BY jt.justification_name ASC
          `,
            [tenantId]
          ),
          pool.query(
            `
            SELECT
              ae.id,
              ae.event_name,
              ae.event_short_name
            FROM public.attendance_events ae
            WHERE ae.tenant_id = $1::uuid
              AND ae.is_active = true
            ORDER BY ae.event_name ASC
          `,
            [tenantId]
          ),
          pool.query(
            `
            SELECT
              lv.id,
              lv.lookup_key,
              lv.lookup_label,
              lv.lookup_short_label,
              lg.lookup_group_key
            FROM public.lookup_values lv
            JOIN public.lookup_groups lg
              ON lg.id = lv.lookup_group_id
            WHERE lv.is_active = true
              AND (lv.tenant_id IS NULL OR lv.tenant_id = $1::uuid)
              AND (
                lg.lookup_group_key IN ('ABSENCE_DISCOUNT_METHOD', 'JUSTIFY_METHOD')
                OR lv.id IN (
                  SELECT DISTINCT r.justify_method_id
                  FROM public.employee_absence_requests r
                  WHERE r.tenant_id = $1::uuid
                )
              )
            ORDER BY lv.sort_order ASC, lv.lookup_label ASC
          `,
            [tenantId]
          ),
          pool.query(
            `
            SELECT
              lv.id,
              lv.lookup_key,
              lv.lookup_label,
              lv.lookup_short_label,
              lg.lookup_group_key
            FROM public.lookup_values lv
            JOIN public.lookup_groups lg
              ON lg.id = lv.lookup_group_id
            WHERE lv.is_active = true
              AND (lv.tenant_id IS NULL OR lv.tenant_id = $1::uuid)
              AND (
                lg.lookup_group_key IN ('REQUEST_STATUS')
                OR lv.id IN (
                  SELECT DISTINCT r.request_status_id
                  FROM public.employee_absence_requests r
                  WHERE r.tenant_id = $1::uuid
                )
              )
            ORDER BY lv.sort_order ASC, lv.lookup_label ASC
          `,
            [tenantId]
          ),
        ]);

      const employeesResult =
        applyEmployeeRestriction && managedEmployeeIds.length === 0
          ? { rows: [] as any[] }
          : await pool.query(
              `
                SELECT
                  e.id,
                  e.employee_code,
                  e.employee_name,
                  e.employee_lastname
                FROM public.employees e
                WHERE e.tenant_id = $1::uuid
                  AND e.is_active = true
                  ${
                    applyEmployeeRestriction
                      ? 'AND e.id = ANY($2::uuid[])'
                      : ''
                  }
                ORDER BY e.employee_lastname ASC, e.employee_name ASC
              `,
              applyEmployeeRestriction ? [tenantId, managedEmployeeIds] : [tenantId]
            );

      return res.status(200).json({
        success: true,
        tenant_id: tenantId,
        companies: companiesResult.rows,
        employees: employeesResult.rows,
        justification_types: justTypesResult.rows,
        attendance_events: eventsResult.rows,
        justify_methods: justifyMethodsResult.rows,
        request_statuses: statusResult.rows,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error interno' });
    }
  },
  {
    tags: ['Solicitud de Permisos de Empleados'],
    summary: 'Obtiene catálogos para la gestión de solicitudes de permisos de empleados',
    responses: {
      200: { description: 'OK' },
      400: { description: 'Bad Request' },
      401: { description: 'No autorizado' },
      500: { description: 'Error interno' },
    },
  }
);
router.get('/catalogs', getEmployeeAbsenceRequestsCatalogs);

const getEmployeeAbsenceRequests = withDocs(
  async (req: Request, res: Response) => {
    try {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
      const userContext = await resolveEffectiveUserContext(req, tenantId);
      const roleKeys =
        userContext && userContext.tenant_id === tenantId
          ? await getUserRoleKeys(tenantId, userContext.user_id)
          : [];
      const applyEmployeeRestriction = mustRestrictToAssignedEmployees(roleKeys);
      const managedEmployeeIds =
        applyEmployeeRestriction && userContext
          ? await resolveManagedEmployeeIds(tenantId, userContext.user_id)
          : [];

      const includeInactive = normalizeBoolean(req.query.include_inactive);
      const limit = Math.min(normalizePositiveInt(req.query.limit, 100), 500);
      const offset = normalizeNonNegativeInt(req.query.offset, 0);

      const companyId = normalizeNullableText(req.query.company_id);
      const employeeId = normalizeNullableText(req.query.employee_id);
      const justificationTypeId = normalizeNullableText(req.query.justification_type_id);
      const attendanceEventId = normalizeNullableText(req.query.attendance_event_id);
      const justifyMethodId = normalizeNullableText(req.query.justify_method_id);
      const requestStatusId = normalizeNullableText(req.query.request_status_id);
      const search = normalizeNullableText(req.query.search);
      const dateFrom = normalizeNullableText(req.query.date_from);
      const dateTo = normalizeNullableText(req.query.date_to);

      const params: any[] = [tenantId, includeInactive];
      let whereExtra = '';

      if (applyEmployeeRestriction) {
        if (managedEmployeeIds.length === 0) {
          return res.status(200).json({
            success: true,
            tenant_id: tenantId,
            total: 0,
            limit,
            offset,
            requests: [],
          });
        }
        params.push(managedEmployeeIds);
        whereExtra += ` AND r.employee_id = ANY($${params.length}::uuid[])`;
      }

      if (companyId) {
        params.push(companyId);
        whereExtra += ` AND r.company_id = $${params.length}::uuid`;
      }
      if (employeeId) {
        params.push(employeeId);
        whereExtra += ` AND r.employee_id = $${params.length}::uuid`;
      }
      if (justificationTypeId) {
        params.push(justificationTypeId);
        whereExtra += ` AND r.justification_type_id = $${params.length}::uuid`;
      }
      if (attendanceEventId) {
        params.push(attendanceEventId);
        whereExtra += ` AND r.attendance_event_id = $${params.length}::uuid`;
      }
      if (justifyMethodId) {
        params.push(justifyMethodId);
        whereExtra += ` AND r.justify_method_id = $${params.length}::uuid`;
      }
      if (requestStatusId) {
        params.push(requestStatusId);
        whereExtra += ` AND r.request_status_id = $${params.length}::uuid`;
      }
      if (dateFrom) {
        params.push(`${dateFrom}T00:00:00`);
        whereExtra += ` AND r.start_datetime >= $${params.length}::timestamptz`;
      }
      if (dateTo) {
        params.push(`${dateTo}T23:59:59`);
        whereExtra += ` AND r.end_datetime <= $${params.length}::timestamptz`;
      }
      if (search) {
        params.push(`%${search}%`);
        whereExtra += ` AND (
        COALESCE(e.employee_code, '') ILIKE $${params.length}
        OR COALESCE(e.employee_name, '') ILIKE $${params.length}
        OR COALESCE(e.employee_lastname, '') ILIKE $${params.length}
        OR COALESCE(r.notes, '') ILIKE $${params.length}
      )`;
      }

      const countResult = await pool.query(
        `
        SELECT COUNT(*)::int AS total
        FROM public.employee_absence_requests r
        LEFT JOIN public.employees e
          ON e.id = r.employee_id
        WHERE r.tenant_id = $1::uuid
          AND ($2::boolean = true OR r.is_active = true)
          ${whereExtra}
      `,
        params
      );

      params.push(limit, offset);
      const limitIndex = params.length - 1;
      const offsetIndex = params.length;

      const result = await pool.query(
        `
        SELECT
          r.id,
          r.tenant_id,
          r.company_id,
          c.company_code,
          c.company_name,
          r.employee_id,
          e.employee_code,
          e.employee_name,
          e.employee_lastname,
          r.justification_type_id,
          jt.justification_name,
          jt.justification_short_name,
          r.attendance_event_id,
          ae.event_name,
          ae.event_short_name,
          r.justify_method_id,
          jm.lookup_key AS justify_method_key,
          jm.lookup_label AS justify_method_label,
          r.start_datetime,
          r.end_datetime,
          r.start_time,
          r.end_time,
          r.notes,
          r.request_status_id,
          rs.lookup_key AS request_status_key,
          rs.lookup_label AS request_status_label,
          r.approval_notes,
          r.approved_by,
          au.display_name AS approved_by_display_name,
          au.username AS approved_by_username,
          r.approved_at,
          r.support_document_path,
          r.support_document_name,
          r.support_document_mime,
          r.support_document_size_bytes,
          r.is_active,
          r.created_by,
          r.created_at,
          r.updated_by,
          r.updated_at
        FROM public.employee_absence_requests r
        JOIN public.companies c
          ON c.id = r.company_id
        JOIN public.employees e
          ON e.id = r.employee_id
        JOIN public.justification_types jt
          ON jt.id = r.justification_type_id
        JOIN public.attendance_events ae
          ON ae.id = r.attendance_event_id
        LEFT JOIN public.lookup_values jm
          ON jm.id = r.justify_method_id
        LEFT JOIN public.lookup_values rs
          ON rs.id = r.request_status_id
        LEFT JOIN public.users au
          ON au.id = r.approved_by
        WHERE r.tenant_id = $1::uuid
          AND ($2::boolean = true OR r.is_active = true)
          ${whereExtra}
        ORDER BY r.created_at DESC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
        params
      );

      return res.status(200).json({
        success: true,
        tenant_id: tenantId,
        total: countResult.rows[0]?.total || 0,
        limit,
        offset,
        requests: result.rows,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error interno' });
    }
  },
  {
    tags: ['Solicitud de Permisos de Empleados'],
    summary: 'Lista solicitudes de permisos de empleados con filtros y paginación',
    parameters: [
      {
        name: 'user_email',
        in: 'query',
        required: false,
        description: 'Email del usuario a evaluar para alcance de empleados (ejercicio). Ej: victorsan@hotmail.com',
        schema: { type: 'string' },
      },
    ],
    responses: {
      200: { description: 'OK' },
      400: { description: 'Bad Request' },
      401: { description: 'No autorizado' },
      500: { description: 'Error interno' },
    },
  }
);
router.get('/', getEmployeeAbsenceRequests);

const getEmployeeAbsenceRequestById = withDocs(
  async (req: Request, res: Response) => {
    try {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
      const userContext = await resolveUserContext(req);
      const roleKeys =
        userContext && userContext.tenant_id === tenantId
          ? await getUserRoleKeys(tenantId, userContext.user_id)
          : [];
      const applyEmployeeRestriction = mustRestrictToAssignedEmployees(roleKeys);
      const managedEmployeeIds =
        applyEmployeeRestriction && userContext
          ? await resolveManagedEmployeeIds(tenantId, userContext.user_id)
          : [];

      const id = normalizeNullableText(req.params.id);
      if (!id) return res.status(400).json({ error: 'id es obligatorio' });

      const result = await pool.query(
        `
        SELECT
          r.id,
          r.tenant_id,
          r.company_id,
          c.company_code,
          c.company_name,
          r.employee_id,
          e.employee_code,
          e.employee_name,
          e.employee_lastname,
          r.justification_type_id,
          jt.justification_name,
          jt.justification_short_name,
          r.attendance_event_id,
          ae.event_name,
          ae.event_short_name,
          r.justify_method_id,
          jm.lookup_key AS justify_method_key,
          jm.lookup_label AS justify_method_label,
          r.start_datetime,
          r.end_datetime,
          r.start_time,
          r.end_time,
          r.notes,
          r.request_status_id,
          rs.lookup_key AS request_status_key,
          rs.lookup_label AS request_status_label,
          r.approval_notes,
          r.approved_by,
          au.display_name AS approved_by_display_name,
          au.username AS approved_by_username,
          r.approved_at,
          r.support_document_path,
          r.support_document_name,
          r.support_document_mime,
          r.support_document_size_bytes,
          r.is_active,
          r.created_by,
          r.created_at,
          r.updated_by,
          r.updated_at
        FROM public.employee_absence_requests r
        JOIN public.companies c
          ON c.id = r.company_id
        JOIN public.employees e
          ON e.id = r.employee_id
        JOIN public.justification_types jt
          ON jt.id = r.justification_type_id
        JOIN public.attendance_events ae
          ON ae.id = r.attendance_event_id
        LEFT JOIN public.lookup_values jm
          ON jm.id = r.justify_method_id
        LEFT JOIN public.lookup_values rs
          ON rs.id = r.request_status_id
        LEFT JOIN public.users au
          ON au.id = r.approved_by
        WHERE r.id = $1::uuid
          AND r.tenant_id = $2::uuid
          ${
            applyEmployeeRestriction
              ? 'AND r.employee_id = ANY($3::uuid[])'
              : ''
          }
        LIMIT 1
      `,
        applyEmployeeRestriction
          ? [id, tenantId, managedEmployeeIds]
          : [id, tenantId]
      );

      const request = result.rows[0];
      if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });

      return res.status(200).json({
        success: true,
        tenant_id: tenantId,
        request,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error interno' });
    }
  },
  {
    tags: ['Solicitud de Permisos de Empleados'],
    summary: 'Obtiene una solicitud de permisos de empleado por id',
    responses: {
      200: { description: 'OK' },
      400: { description: 'Bad Request' },
      401: { description: 'No autorizado' },
      404: { description: 'No encontrado' },
      500: { description: 'Error interno' },
    },
  }
);
router.get('/:id', getEmployeeAbsenceRequestById);

export default router;
