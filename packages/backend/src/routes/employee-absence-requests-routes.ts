import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

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

router.get('/catalogs', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const [companiesResult, employeesResult, justTypesResult, eventsResult, justifyMethodsResult, statusResult] =
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
              e.id,
              e.employee_code,
              e.employee_name,
              e.employee_lastname
            FROM public.employees e
            WHERE e.tenant_id = $1::uuid
              AND e.is_active = true
            ORDER BY e.employee_lastname ASC, e.employee_name ASC
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
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

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
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

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
        LIMIT 1
      `,
      [id, tenantId]
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
});

export default router;
