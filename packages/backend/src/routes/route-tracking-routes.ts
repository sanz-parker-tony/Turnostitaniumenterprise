import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

function normalizeNullableText(value: any): string | null {
  const raw = String(value ?? '').trim();
  return raw.length > 0 ? raw : null;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function resolveViewerContext(req: Request) {
  const user = (req as any).user;
  const authUserId = user?.id;
  if (!authUserId) return null;

  const result = await pool.query(
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

  const context = result.rows[0];
  if (!context?.tenant_id || !context?.user_id) return null;
  const roleKeys = (context.role_keys || []).map((roleKey: string) => String(roleKey || '').trim().toUpperCase());
  const canView = roleKeys.some((roleKey: string) => ['SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN', 'TENANT_ADMIN'].includes(roleKey));
  if (!canView) return null;

  return {
    tenant_id: String(context.tenant_id),
    user_id: String(context.user_id),
    role_keys: roleKeys,
  };
}

function buildAssignedEmployeesSql(unrestricted: boolean) {
  if (unrestricted) {
    return `
      SELECT DISTINCT ON (e.id)
        e.id AS employee_id,
        e.employee_code,
        e.employee_name,
        e.employee_lastname,
        ec.company_id,
        c.company_name,
        ec.work_location_id,
        wl.work_location_name,
        ec.department_id,
        d.department_name,
        ec.area_id,
        ar.area_name
      FROM public.employees e
      INNER JOIN public.employee_companies ec
        ON ec.employee_id = e.id
       AND ec.tenant_id = e.tenant_id
       AND ec.is_active = true
      LEFT JOIN public.companies c ON c.id = ec.company_id
      LEFT JOIN public.work_locations wl
        ON wl.id = ec.work_location_id
       AND wl.tenant_id = ec.tenant_id
       AND wl.company_id = ec.company_id
      LEFT JOIN public.departments d ON d.id = ec.department_id
      LEFT JOIN public.areas ar ON ar.id = ec.area_id
      WHERE e.tenant_id = $1::uuid
        AND e.is_active = true
      ORDER BY e.id, ec.created_at DESC NULLS LAST
    `;
  }

  return `
    SELECT DISTINCT ON (e.id)
      e.id AS employee_id,
      e.employee_code,
      e.employee_name,
      e.employee_lastname,
      ec.company_id,
      c.company_name,
      ec.work_location_id,
      wl.work_location_name,
      ec.department_id,
      d.department_name,
      ec.area_id,
      ar.area_name
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
    LEFT JOIN public.work_locations wl
      ON wl.id = ec.work_location_id
     AND wl.tenant_id = ec.tenant_id
     AND wl.company_id = ec.company_id
    LEFT JOIN public.departments d ON d.id = ec.department_id
    LEFT JOIN public.areas ar ON ar.id = ec.area_id
    WHERE ur.tenant_id = $1::uuid
      AND ur.user_id = $2::uuid
      AND ur.is_active = true
      AND (ur.valid_from IS NULL OR ur.valid_from <= now())
      AND (ur.valid_to IS NULL OR ur.valid_to >= now())
      AND UPPER(COALESCE(r.role_key, '')) IN ('SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN')
    ORDER BY e.id, ec.created_at DESC NULLS LAST
  `;
}

router.get('/employees', async (req: Request, res: Response) => {
  try {
    const context = await resolveViewerContext(req);
    if (!context) return res.status(403).json({ error: 'Reporte disponible para Supervisor/RRHH' });

    const unrestricted = context.role_keys.includes('TENANT_ADMIN') && !context.role_keys.some((roleKey: string) => ['SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN'].includes(roleKey));
    const assignedEmployeesSql = buildAssignedEmployeesSql(unrestricted);
    const params = unrestricted ? [context.tenant_id] : [context.tenant_id, context.user_id];
    const search = normalizeNullableText(req.query.search);
    if (search) params.push(`%${search.toLowerCase()}%`);

    const result = await pool.query(
      `
        WITH assigned_employees AS (${assignedEmployeesSql})
        SELECT *
        FROM assigned_employees
        WHERE (
          $${params.length + (search ? 0 : 1)}::text IS NULL
          OR LOWER(CONCAT(employee_lastname, ' ', employee_name, ' ', employee_code)) LIKE $${params.length + (search ? 0 : 1)}
        )
        ORDER BY employee_lastname, employee_name, employee_code
        LIMIT 200
      `,
      search ? params : [...params, null]
    );

    return res.status(200).json({
      success: true,
      employees: result.rows,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

router.get('/employee-route', async (req: Request, res: Response) => {
  try {
    const context = await resolveViewerContext(req);
    if (!context) return res.status(403).json({ error: 'Reporte disponible para Supervisor/RRHH' });

    const employeeId = normalizeNullableText(req.query.employee_id);
    const dateFrom = normalizeNullableText(req.query.date_from);
    const dateTo = normalizeNullableText(req.query.date_to);
    if (!employeeId) return res.status(400).json({ error: 'employee_id es obligatorio' });
    if (!dateFrom || !isIsoDate(dateFrom)) return res.status(400).json({ error: 'date_from debe tener formato YYYY-MM-DD' });
    if (!dateTo || !isIsoDate(dateTo)) return res.status(400).json({ error: 'date_to debe tener formato YYYY-MM-DD' });

    const unrestricted = context.role_keys.includes('TENANT_ADMIN') && !context.role_keys.some((roleKey: string) => ['SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN'].includes(roleKey));
    const assignedEmployeesSql = buildAssignedEmployeesSql(unrestricted);
    const scopedParams = unrestricted ? [context.tenant_id] : [context.tenant_id, context.user_id];
    const params = [...scopedParams, employeeId, `${dateFrom}T00:00:00`, `${dateTo}T23:59:59`];
    const employeeParamIndex = scopedParams.length + 1;
    const fromParamIndex = scopedParams.length + 2;
    const toParamIndex = scopedParams.length + 3;

    const result = await pool.query(
      `
        WITH assigned_employees AS (${assignedEmployeesSql}),
        selected_employee AS (
          SELECT *
          FROM assigned_employees
          WHERE employee_id = $${employeeParamIndex}::uuid
          LIMIT 1
        ),
        attendance_points AS (
          SELECT
            p.id,
            'ATTENDANCE'::text AS point_type,
            p.punch_datetime AS event_datetime,
            p.punch_time_zone AS event_time_zone,
            p.latitud,
            p.longitud,
            NULL::double precision AS location_accuracy_meters,
            mv.lookup_label AS event_label,
            st.lookup_label AS status_label,
            COALESCE(dwl.work_location_name, wl.work_location_name) AS location_label,
            NULL::double precision AS distance_to_nearest_location_meters,
            p.notes,
            NULL::text AS snapshot_path
          FROM public.employee_time_punches p
          INNER JOIN selected_employee se
            ON se.employee_id = p.employee_id
          LEFT JOIN public.time_clock_devices d
            ON d.id = p.time_clock_device_id
           AND d.tenant_id = p.tenant_id
           AND d.company_id = se.company_id
          LEFT JOIN public.work_locations dwl
            ON dwl.id = d.work_location_id
           AND dwl.tenant_id = d.tenant_id
           AND dwl.company_id = se.company_id
          LEFT JOIN public.work_locations wl
            ON wl.id = se.work_location_id
           AND wl.tenant_id = p.tenant_id
           AND wl.company_id = se.company_id
          LEFT JOIN public.lookup_values st
            ON st.id = p.time_punch_status_id
          LEFT JOIN LATERAL (
            SELECT lv.lookup_label
            FROM public.lookup_values lv
            WHERE lv.lookup_group_id = 'a349d449-b3c1-475a-91bd-c687b49e97cc'::uuid
              AND lv.sort_order = p.punch_key
              AND lv.is_active = true
              AND (lv.tenant_id IS NULL OR lv.tenant_id = p.tenant_id)
            ORDER BY CASE WHEN lv.tenant_id = p.tenant_id THEN 0 ELSE 1 END, lv.sort_order ASC
            LIMIT 1
          ) mv ON true
          WHERE p.tenant_id = $1::uuid
            AND p.company_id = se.company_id
            AND p.is_active = true
            AND p.latitud IS NOT NULL
            AND p.longitud IS NOT NULL
            AND p.punch_datetime >= $${fromParamIndex}::timestamptz
            AND p.punch_datetime <= $${toParamIndex}::timestamptz
        ),
        route_points AS (
          SELECT
            rp.id,
            'ROUTE_TRACKING'::text AS point_type,
            rp.tracking_datetime AS event_datetime,
            rp.tracking_time_zone AS event_time_zone,
            rp.latitud,
            rp.longitud,
            rp.location_accuracy_meters,
            'Punto de recorrido'::text AS event_label,
            st.lookup_label AS status_label,
            wl.work_location_name AS location_label,
            rp.distance_to_nearest_location_meters,
            rp.notes,
            rp.snapshot_path
          FROM public.employee_route_tracking_points rp
          INNER JOIN selected_employee se
            ON se.employee_id = rp.employee_id
          LEFT JOIN public.lookup_values st
            ON st.id = rp.tracking_status_id
          LEFT JOIN public.work_locations wl
            ON wl.id = rp.nearest_work_location_id
           AND wl.tenant_id = rp.tenant_id
           AND wl.company_id = se.company_id
          WHERE rp.tenant_id = $1::uuid
            AND rp.company_id = se.company_id
            AND rp.is_active = true
            AND rp.tracking_datetime >= $${fromParamIndex}::timestamptz
            AND rp.tracking_datetime <= $${toParamIndex}::timestamptz
        ),
        combined_points AS (
          SELECT * FROM attendance_points
          UNION ALL
          SELECT * FROM route_points
        )
        SELECT
          (SELECT row_to_json(se) FROM selected_employee se) AS employee,
          COALESCE((SELECT json_agg(row_to_json(cp) ORDER BY cp.event_datetime ASC) FROM combined_points cp), '[]'::json) AS points
      `,
      params
    );

    const row = result.rows[0] || {};
    if (!row.employee) return res.status(404).json({ error: 'Empleado no disponible para este supervisor' });

    return res.status(200).json({
      success: true,
      employee: row.employee,
      points: row.points || [],
      filters: {
        employee_id: employeeId,
        date_from: dateFrom,
        date_to: dateTo,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

export default router;
