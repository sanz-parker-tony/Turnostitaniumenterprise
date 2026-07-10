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

function parseBool(value: any): boolean {
  return ['1', 'true', 'yes', 'si', 'sÃƒÂ­'].includes(String(value ?? '').trim().toLowerCase());
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

function isUnrestricted(context: { role_keys: string[] }) {
  return context.role_keys.includes('TENANT_ADMIN') && !context.role_keys.some((roleKey) => ['SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN'].includes(roleKey));
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
      LEFT JOIN public.work_locations wl
        ON wl.id = ec.work_location_id
       AND wl.tenant_id = ec.tenant_id
       AND wl.company_id = ec.company_id
      LEFT JOIN public.departments d ON d.id = ec.department_id
      LEFT JOIN public.areas ar ON ar.id = ec.area_id
      LEFT JOIN public.cost_centers cc ON cc.id = ec.cost_center_id
      LEFT JOIN public.payroll_groups pg ON pg.id = ec.payroll_group_id
      LEFT JOIN public.work_groups wg ON wg.id = ec.work_group_id
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
      scope.company_id,
      c.company_name,
      c.logo AS company_logo,
      c.banner AS company_banner,
      scope.work_location_id,
      wl.work_location_name,
      COALESCE(wl.country_id, c.company_country_id) AS employee_country_id,
      COALESCE(wl.state_id, c.company_state_id) AS employee_state_id,
      COALESCE(wl.city_id, c.company_city_id) AS employee_city_id,
      scope.department_id,
      d.department_name,
      scope.area_id,
      ar.area_name,
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
    INNER JOIN public.v_user_role_authorized_employees scope
      ON scope.tenant_id = ur.tenant_id
     AND scope.user_role_id = ur.id
    INNER JOIN public.employees e
      ON e.id = scope.employee_id
     AND e.tenant_id = scope.tenant_id
     AND e.is_active = true
    LEFT JOIN public.employee_companies ec
      ON ec.employee_id = e.id
     AND ec.tenant_id = e.tenant_id
     AND ec.company_id = scope.company_id
     AND ec.is_active = true
    LEFT JOIN public.companies c ON c.id = scope.company_id
    LEFT JOIN public.work_locations wl
      ON wl.id = scope.work_location_id
     AND wl.tenant_id = scope.tenant_id
     AND wl.company_id = scope.company_id
    LEFT JOIN public.departments d ON d.id = scope.department_id
    LEFT JOIN public.areas ar ON ar.id = scope.area_id
    LEFT JOIN public.cost_centers cc ON cc.id = ec.cost_center_id
    LEFT JOIN public.payroll_groups pg ON pg.id = ec.payroll_group_id
    LEFT JOIN public.work_groups wg ON wg.id = ec.work_group_id
    WHERE ur.tenant_id = $1::uuid
      AND ur.user_id = $2::uuid
      AND ur.is_active = true
      AND (ur.valid_from IS NULL OR ur.valid_from <= now())
      AND (ur.valid_to IS NULL OR ur.valid_to >= now())
      AND UPPER(COALESCE(r.role_key, '')) IN ('SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN')
    ORDER BY e.id, c.company_name NULLS LAST, e.employee_lastname, e.employee_name
  `;
}

function buildOvertimeCtes(
  assignedEmployeesSql: string,
  dateFromSql: string,
  dateToSql: string,
  employeeFilterSql: string,
  payrollGroupFilterSql: string,
  costCenterFilterSql: string,
  departmentFilterSql: string,
  areaFilterSql: string,
  workGroupFilterSql: string
) {
  return `
    WITH assigned_employees AS (${assignedEmployeesSql}),
    filters AS (
      SELECT
        ${dateFromSql}::date AS date_from,
        ${dateToSql}::date AS date_to
    ),
    plans AS (
      SELECT
        ae.employee_id,
        ae.employee_code,
        ae.employee_lastname,
        ae.employee_name,
        CONCAT(ae.employee_lastname, ' ', ae.employee_name) AS employee_full_name,
        ae.company_id,
        ae.company_name,
        ae.company_logo,
        ae.company_banner,
        ae.work_location_id,
        ae.work_location_name,
        ae.employee_country_id,
        ae.employee_state_id,
        ae.employee_city_id,
        ae.cost_center_id,
        ae.cost_center_name,
        ae.payroll_group_id,
        ae.payroll_group_name,
        ae.work_group_id,
        ae.work_group_name,
        ae.department_name,
        ae.area_name,
        p.shift_date,
        s.shift_name,
        s.shift_short_name,
        s.start_time,
        COALESCE(s.entry_grace_minutes, 0)::int AS entry_grace_minutes,
        COALESCE(s.exit_grace_minutes, 0)::int AS exit_grace_minutes,
        sc.id AS constructor_id,
        sc.tenant_id AS constructor_tenant_id,
        sw.work_start_minutes,
        sw.work_end_minutes,
        sw.work_minutes,
        holiday.id AS holiday_id,
        holiday.holiday_name,
        (holiday.id IS NOT NULL AND COALESCE(holiday.is_working_day, false) = false) AS is_non_working_day
      FROM assigned_employees ae
      INNER JOIN public.employee_shift_plans p
        ON p.employee_id = ae.employee_id
       AND p.tenant_id = $1::uuid
       AND p.company_id = ae.company_id
       AND p.is_active = true
      CROSS JOIN filters
      INNER JOIN public.shifts s
        ON s.id = p.shift_id
       AND s.tenant_id = p.tenant_id
      LEFT JOIN public.shift_constructors sc
        ON sc.shift_id = s.id
       AND sc.tenant_id = s.tenant_id
       AND sc.is_active = true
      LEFT JOIN LATERAL (
        SELECT h.id, h.holiday_name, h.is_working_day
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
        SELECT
          COUNT(*)::int AS active_block_count,
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
          CASE
            WHEN sc.id IS NOT NULL AND COALESCE(blocks.active_block_count, 0) > 0 THEN COALESCE(blocks.work_start_minutes, 0)
            ELSE (EXTRACT(HOUR FROM s.start_time)::int * 60 + EXTRACT(MINUTE FROM s.start_time)::int)
          END::int AS work_start_minutes,
          CASE
            WHEN sc.id IS NOT NULL AND COALESCE(blocks.active_block_count, 0) > 0 THEN COALESCE(blocks.work_end_minutes, 0)
            ELSE (EXTRACT(HOUR FROM s.start_time)::int * 60 + EXTRACT(MINUTE FROM s.start_time)::int + COALESCE(s.work_minutes, 0))
          END::int AS work_end_minutes,
          CASE
            WHEN sc.id IS NOT NULL AND COALESCE(blocks.active_block_count, 0) > 0 THEN COALESCE(blocks.work_minutes, 0)
            ELSE COALESCE(s.work_minutes, 0)
          END::int AS work_minutes
      ) sw ON true
      WHERE p.shift_date BETWEEN filters.date_from AND filters.date_to
        AND (${employeeFilterSql} IS NULL OR ae.employee_id = ${employeeFilterSql})
        AND (${payrollGroupFilterSql} IS NULL OR ae.payroll_group_id = ${payrollGroupFilterSql})
        AND (${costCenterFilterSql} IS NULL OR ae.cost_center_id = ${costCenterFilterSql})
        AND (${departmentFilterSql} IS NULL OR ae.department_id = ${departmentFilterSql})
        AND (${areaFilterSql} IS NULL OR ae.area_id = ${areaFilterSql})
        AND (${workGroupFilterSql} IS NULL OR ae.work_group_id = ${workGroupFilterSql})
        AND (ae.hire_date IS NULL OR p.shift_date >= ae.hire_date::date)
        AND (ae.termination_date IS NULL OR p.shift_date <= ae.termination_date::date)
    ),
    punch_summary AS (
      SELECT
        pl.employee_id,
        pl.shift_date,
        MIN(p.punch_datetime) AS first_punch,
        MAX(p.punch_datetime) AS last_punch,
        MIN(p.punch_datetime) FILTER (WHERE p.punch_key IN (1, 5)) AS first_entry,
        MAX(p.punch_datetime) FILTER (WHERE p.punch_key IN (4, 6)) AS last_exit
      FROM plans pl
      LEFT JOIN public.employee_time_punches p
        ON p.employee_id = pl.employee_id
       AND p.tenant_id = $1::uuid
       AND p.is_active = true
       AND (
          (
            pl.work_minutes <= 0
            AND p.punch_datetime >= pl.shift_date::timestamp
            AND p.punch_datetime < pl.shift_date::timestamp + INTERVAL '1 day'
          )
          OR (
            pl.work_minutes > 0
            AND p.punch_datetime >= pl.shift_date::timestamp + (pl.work_start_minutes || ' minutes')::interval - INTERVAL '6 hours'
            AND p.punch_datetime <= pl.shift_date::timestamp + (pl.work_end_minutes || ' minutes')::interval + INTERVAL '6 hours'
          )
       )
      GROUP BY pl.employee_id, pl.shift_date
    ),
    attendance AS (
      SELECT
        pl.*,
        COALESCE(ps.first_entry, ps.first_punch) AS first_entry,
        COALESCE(ps.last_exit, ps.last_punch) AS last_exit,
        GREATEST(0, COALESCE(EXTRACT(EPOCH FROM (COALESCE(ps.last_exit, ps.last_punch) - COALESCE(ps.first_entry, ps.first_punch))) / 60, 0)::int)::int AS worked_minutes,
        CASE
          WHEN COALESCE(ps.first_entry, ps.first_punch) IS NULL
           AND pl.work_minutes > 0
           AND pl.is_non_working_day = false
            THEN COALESCE(pl.work_minutes, 0)
          ELSE 0
        END::int AS absence_minutes,
        CASE
          WHEN pl.work_minutes > 0
           AND COALESCE(ps.first_entry, ps.first_punch) > pl.shift_date::timestamp + (pl.work_start_minutes || ' minutes')::interval + (pl.entry_grace_minutes || ' minutes')::interval
            THEN GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(ps.first_entry, ps.first_punch) - (pl.shift_date::timestamp + (pl.work_start_minutes || ' minutes')::interval + (pl.entry_grace_minutes || ' minutes')::interval))) / 60)::int
          ELSE 0
        END::int AS late_minutes,
        CASE
          WHEN pl.work_minutes > 0
           AND COALESCE(ps.last_exit, ps.last_punch) IS NOT NULL
           AND COALESCE(ps.last_exit, ps.last_punch) < pl.shift_date::timestamp + (pl.work_end_minutes || ' minutes')::interval - (pl.exit_grace_minutes || ' minutes')::interval
            THEN GREATEST(0, EXTRACT(EPOCH FROM ((pl.shift_date::timestamp + (pl.work_end_minutes || ' minutes')::interval - (pl.exit_grace_minutes || ' minutes')::interval) - COALESCE(ps.last_exit, ps.last_punch))) / 60)::int
          ELSE 0
        END::int AS early_departure_minutes
      FROM plans pl
      LEFT JOIN punch_summary ps
        ON ps.employee_id = pl.employee_id
       AND ps.shift_date = pl.shift_date
    ),
    approved_leave_by_day AS (
      SELECT
        attendance.employee_id,
        attendance.shift_date,
        SUM(leave_minutes.minutes) FILTER (
          WHERE UPPER(COALESCE(ae.event_short_name, '')) IN ('ATR', 'ATRASO')
             OR UPPER(COALESCE(ae.event_name, '')) = 'ATRASO'
        )::int AS approved_late_minutes,
        SUM(leave_minutes.minutes) FILTER (
          WHERE UPPER(COALESCE(ae.event_short_name, '')) IN ('SAN', 'SALIDA ANTICIPADA')
             OR UPPER(COALESCE(ae.event_name, '')) = 'SALIDA ANTICIPADA'
        )::int AS approved_early_departure_minutes,
        SUM(leave_minutes.minutes) FILTER (
          WHERE UPPER(COALESCE(ae.event_short_name, '')) IN ('FAL', 'FALTA')
             OR UPPER(COALESCE(ae.event_name, '')) IN ('FALTA', 'INASISTENCIA')
        )::int AS approved_absence_minutes,
        SUM(leave_minutes.minutes) FILTER (
          WHERE UPPER(COALESCE(jm.lookup_key, '')) = 'UNPAID_LEAVE'
        )::int AS unpaid_leave_minutes,
        SUM(leave_minutes.minutes)::int AS approved_leave_minutes
      FROM attendance
      INNER JOIN public.employee_absence_requests r
        ON r.tenant_id = $1::uuid
       AND r.employee_id = attendance.employee_id
       AND r.is_active = true
       AND r.start_datetime::date <= attendance.shift_date
       AND COALESCE(r.end_datetime, r.start_datetime)::date >= attendance.shift_date
      INNER JOIN public.lookup_values rs
        ON rs.id = r.request_status_id
       AND UPPER(COALESCE(rs.lookup_key, '')) IN ('APPROVED', 'APROBADO')
      INNER JOIN public.attendance_events ae
        ON ae.id = r.attendance_event_id
      LEFT JOIN public.lookup_values jm
        ON jm.id = r.justify_method_id
      LEFT JOIN LATERAL (
        SELECT CASE
          WHEN attendance.work_minutes > 0 THEN GREATEST(
            0,
            EXTRACT(EPOCH FROM (
              LEAST(COALESCE(r.end_datetime, r.start_datetime), attendance.shift_date::timestamp + (attendance.work_end_minutes || ' minutes')::interval)
              - GREATEST(r.start_datetime, attendance.shift_date::timestamp + (attendance.work_start_minutes || ' minutes')::interval)
            )) / 60
          )::int
          ELSE GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(r.end_datetime, r.start_datetime) - r.start_datetime)) / 60)::int
        END AS minutes
      ) leave_minutes ON true
      WHERE leave_minutes.minutes > 0
      GROUP BY attendance.employee_id, attendance.shift_date
    ),
    constructor_surcharges AS (
      SELECT
        attendance.employee_id,
        attendance.shift_date,
        SUM(GREATEST(0, EXTRACT(EPOCH FROM (LEAST(attendance.last_exit, attendance.shift_date::timestamp + (blocks.end_minutes || ' minutes')::interval) - GREATEST(attendance.first_entry, attendance.shift_date::timestamp + (blocks.start_minutes || ' minutes')::interval))) / 60)) FILTER (WHERE blocks.block_type = 'ORDINARIA')::int AS ordinary_minutes,
        SUM(GREATEST(0, EXTRACT(EPOCH FROM (LEAST(attendance.last_exit, attendance.shift_date::timestamp + (blocks.end_minutes || ' minutes')::interval) - GREATEST(attendance.first_entry, attendance.shift_date::timestamp + (blocks.start_minutes || ' minutes')::interval))) / 60)) FILTER (WHERE blocks.block_type = 'NOCTURNA')::int AS night_minutes,
        SUM(GREATEST(0, EXTRACT(EPOCH FROM (LEAST(attendance.last_exit, attendance.shift_date::timestamp + (blocks.end_minutes || ' minutes')::interval) - GREATEST(attendance.first_entry, attendance.shift_date::timestamp + (blocks.start_minutes || ' minutes')::interval))) / 60)) FILTER (WHERE blocks.block_type = 'EXTRA_50')::int AS extra_50_minutes,
        SUM(GREATEST(0, EXTRACT(EPOCH FROM (LEAST(attendance.last_exit, attendance.shift_date::timestamp + (blocks.end_minutes || ' minutes')::interval) - GREATEST(attendance.first_entry, attendance.shift_date::timestamp + (blocks.start_minutes || ' minutes')::interval))) / 60)) FILTER (WHERE blocks.block_type = 'EXTRA_100')::int AS extra_100_minutes
      FROM attendance
      INNER JOIN public.shift_constructor_blocks blocks
        ON blocks.constructor_id = attendance.constructor_id
       AND blocks.tenant_id = attendance.constructor_tenant_id
       AND blocks.is_active = true
       AND blocks.is_break = false
       AND blocks.block_type IN ('ORDINARIA', 'NOCTURNA', 'EXTRA_50', 'EXTRA_100')
      WHERE attendance.first_entry IS NOT NULL
        AND attendance.last_exit IS NOT NULL
        AND attendance.last_exit > attendance.first_entry
        AND attendance.last_exit > attendance.shift_date::timestamp + (blocks.start_minutes || ' minutes')::interval
        AND attendance.first_entry < attendance.shift_date::timestamp + (blocks.end_minutes || ' minutes')::interval
      GROUP BY attendance.employee_id, attendance.shift_date
    ),
    fallback_surcharges AS (
      SELECT
        attendance.employee_id,
        attendance.shift_date,
        CASE
          WHEN attendance.constructor_id IS NULL AND attendance.work_minutes > 0 THEN LEAST(attendance.work_minutes, attendance.worked_minutes)
          ELSE 0
        END::int AS ordinary_minutes,
        0::int AS night_minutes,
        CASE
          WHEN attendance.constructor_id IS NULL AND attendance.work_minutes > 0 THEN GREATEST(0, attendance.worked_minutes - attendance.work_minutes)
          ELSE 0
        END::int AS extra_50_minutes,
        CASE
          WHEN attendance.constructor_id IS NULL AND attendance.work_minutes <= 0 THEN attendance.worked_minutes
          ELSE 0
        END::int AS extra_100_minutes
      FROM attendance
      WHERE attendance.first_entry IS NOT NULL
        AND attendance.last_exit IS NOT NULL
        AND attendance.last_exit > attendance.first_entry
        AND attendance.constructor_id IS NULL
    ),
    surcharge_by_day AS (
      SELECT
        employee_id,
        shift_date,
        SUM(ordinary_minutes)::int AS ordinary_minutes,
        SUM(night_minutes)::int AS night_minutes,
        SUM(extra_50_minutes)::int AS extra_50_minutes,
        SUM(extra_100_minutes)::int AS extra_100_minutes
      FROM (
        SELECT employee_id, shift_date, ordinary_minutes, night_minutes, extra_50_minutes, extra_100_minutes FROM constructor_surcharges
        UNION ALL
        SELECT employee_id, shift_date, ordinary_minutes, night_minutes, extra_50_minutes, extra_100_minutes FROM fallback_surcharges
      ) surcharges
      GROUP BY employee_id, shift_date
    ),
    metrics_by_day AS (
      SELECT
        attendance.employee_id,
        attendance.employee_code,
        attendance.employee_lastname,
        attendance.employee_name,
        attendance.employee_full_name,
        attendance.company_name,
        attendance.company_id,
        attendance.company_logo,
        attendance.company_banner,
        attendance.work_location_name,
        attendance.cost_center_id,
        attendance.cost_center_name,
        attendance.payroll_group_id,
        attendance.payroll_group_name,
        attendance.work_group_id,
        attendance.work_group_name,
        attendance.department_name,
        attendance.area_name,
        attendance.shift_date,
        attendance.shift_name,
        attendance.shift_short_name,
        attendance.shift_date::timestamp + (attendance.work_start_minutes || ' minutes')::interval AS shift_work_start,
        attendance.shift_date::timestamp + (attendance.work_end_minutes || ' minutes')::interval AS shift_work_end,
        attendance.first_entry,
        attendance.last_exit,
        attendance.worked_minutes,
        CASE WHEN attendance.is_non_working_day OR attendance.work_minutes <= 0 THEN 0 ELSE COALESCE(surcharge_by_day.ordinary_minutes, 0) END::int AS ordinary_minutes,
        CASE WHEN attendance.is_non_working_day OR attendance.work_minutes <= 0 THEN 0 ELSE COALESCE(surcharge_by_day.night_minutes, 0) END::int AS night_25_minutes,
        CASE WHEN attendance.is_non_working_day OR attendance.work_minutes <= 0 THEN 0 ELSE COALESCE(surcharge_by_day.extra_50_minutes, 0) END::int AS extra_50_minutes,
        CASE WHEN attendance.is_non_working_day OR attendance.work_minutes <= 0 THEN 0 ELSE COALESCE(surcharge_by_day.extra_100_minutes, 0) END::int AS extra_100_minutes,
        CASE WHEN attendance.is_non_working_day OR attendance.work_minutes <= 0 THEN attendance.worked_minutes ELSE 0 END::int AS non_working_100_minutes,
        GREATEST(attendance.absence_minutes, COALESCE(approved_leave_by_day.approved_absence_minutes, 0))::int AS absence_minutes,
        GREATEST(attendance.late_minutes, COALESCE(approved_leave_by_day.approved_late_minutes, 0))::int AS late_minutes,
        GREATEST(attendance.early_departure_minutes, COALESCE(approved_leave_by_day.approved_early_departure_minutes, 0))::int AS early_departure_minutes,
        0::int AS lunch_excess_minutes,
        0::int AS unjustified_incident_minutes,
        COALESCE(approved_leave_by_day.unpaid_leave_minutes, 0)::int AS unpaid_leave_minutes
      FROM attendance
      LEFT JOIN surcharge_by_day
        ON surcharge_by_day.employee_id = attendance.employee_id
       AND surcharge_by_day.shift_date = attendance.shift_date
      LEFT JOIN approved_leave_by_day
        ON approved_leave_by_day.employee_id = attendance.employee_id
       AND approved_leave_by_day.shift_date = attendance.shift_date
    )
  `;
}

function addUuidSql(params: any[], value: string | null): string {
  if (!value) return 'NULL::uuid';
  params.push(value);
  return `$${params.length}::uuid`;
}

function buildReportQueryParts(
  context: { tenant_id: string; user_id: string; role_keys: string[] },
  req: Request
) {
  const unrestricted = isUnrestricted(context);
  const assignedEmployeesSql = buildAssignedEmployeesSql(unrestricted);
  const params: any[] = unrestricted ? [context.tenant_id] : [context.tenant_id, context.user_id];
  const dateFrom = normalizeNullableText(req.query.date_from);
  const dateTo = normalizeNullableText(req.query.date_to);
  if (!dateFrom || !isIsoDate(dateFrom)) throw new Error('date_from debe tener formato YYYY-MM-DD');
  if (!dateTo || !isIsoDate(dateTo)) throw new Error('date_to debe tener formato YYYY-MM-DD');

  params.push(dateFrom);
  const dateFromSql = `$${params.length}`;
  params.push(dateTo);
  const dateToSql = `$${params.length}`;

  const employeeId = normalizeNullableText(req.query.employee_id);
  const payrollGroupId = normalizeNullableText(req.query.payroll_group_id);
  const costCenterId = normalizeNullableText(req.query.cost_center_id);
  const departmentId = normalizeNullableText(req.query.department_id);
  const areaId = normalizeNullableText(req.query.area_id);
  const workGroupId = normalizeNullableText(req.query.work_group_id);

  const ctes = buildOvertimeCtes(
    assignedEmployeesSql,
    dateFromSql,
    dateToSql,
    addUuidSql(params, employeeId),
    addUuidSql(params, payrollGroupId),
    addUuidSql(params, costCenterId),
    addUuidSql(params, departmentId),
    addUuidSql(params, areaId),
    addUuidSql(params, workGroupId)
  );

  return {
    assignedEmployeesSql,
    ctes,
    params,
    filters: {
      date_from: dateFrom,
      date_to: dateTo,
      employee_id: employeeId,
      payroll_group_id: payrollGroupId,
      cost_center_id: costCenterId,
      department_id: departmentId,
      area_id: areaId,
      work_group_id: workGroupId,
    },
  };
}

router.get('/employees', async (req: Request, res: Response) => {
  try {
    const context = await resolveViewerContext(req);
    if (!context) return res.status(403).json({ error: 'Reporte disponible para Supervisor/RRHH' });

    const unrestricted = isUnrestricted(context);
    const assignedEmployeesSql = buildAssignedEmployeesSql(unrestricted);
    const params = unrestricted ? [context.tenant_id] : [context.tenant_id, context.user_id];
    const search = normalizeNullableText(req.query.search);
    if (search) params.push(`%${search.toLowerCase()}%`);
    const searchParamIndex = params.length + (search ? 0 : 1);

    const result = await pool.query(
      `
        WITH assigned_employees AS (${assignedEmployeesSql})
        SELECT *
        FROM assigned_employees
        WHERE (
          $${searchParamIndex}::text IS NULL
          OR LOWER(CONCAT(employee_lastname, ' ', employee_name, ' ', employee_code)) LIKE $${searchParamIndex}
        )
        ORDER BY employee_lastname, employee_name, employee_code
        LIMIT 300
      `,
      search ? params : [...params, null]
    );

    return res.status(200).json({ success: true, employees: result.rows });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

router.get('/filters', async (req: Request, res: Response) => {
  try {
    const context = await resolveViewerContext(req);
    if (!context) return res.status(403).json({ error: 'Reporte disponible para Supervisor/RRHH' });

    const unrestricted = isUnrestricted(context);
    const assignedEmployeesSql = buildAssignedEmployeesSql(unrestricted);
    const params = unrestricted ? [context.tenant_id] : [context.tenant_id, context.user_id];
    const result = await pool.query(
      `
        WITH assigned_employees AS (${assignedEmployeesSql})
        SELECT json_build_object(
          'payroll_groups', COALESCE((
            SELECT json_agg(row_to_json(x) ORDER BY label)
            FROM (
              SELECT DISTINCT payroll_group_id AS id, payroll_group_name AS label
              FROM assigned_employees
              WHERE payroll_group_id IS NOT NULL
            ) x
          ), '[]'::json),
          'cost_centers', COALESCE((
            SELECT json_agg(row_to_json(x) ORDER BY label)
            FROM (
              SELECT DISTINCT cost_center_id AS id, cost_center_name AS label
              FROM assigned_employees
              WHERE cost_center_id IS NOT NULL
            ) x
          ), '[]'::json),
          'departments', COALESCE((
            SELECT json_agg(row_to_json(x) ORDER BY label)
            FROM (
              SELECT DISTINCT department_id AS id, department_name AS label
              FROM assigned_employees
              WHERE department_id IS NOT NULL
            ) x
          ), '[]'::json),
          'areas', COALESCE((
            SELECT json_agg(row_to_json(x) ORDER BY label)
            FROM (
              SELECT DISTINCT area_id AS id, area_name AS label
              FROM assigned_employees
              WHERE area_id IS NOT NULL
            ) x
          ), '[]'::json),
          'work_groups', COALESCE((
            SELECT json_agg(row_to_json(x) ORDER BY label)
            FROM (
              SELECT DISTINCT work_group_id AS id, work_group_name AS label
              FROM assigned_employees
              WHERE work_group_id IS NOT NULL
            ) x
          ), '[]'::json)
        ) AS filters
      `,
      params
    );

    return res.status(200).json({ success: true, filters: result.rows[0]?.filters || {} });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

router.get('/detail', async (req: Request, res: Response) => {
  try {
    const context = await resolveViewerContext(req);
    if (!context) return res.status(403).json({ error: 'Reporte disponible para Supervisor/RRHH' });

    const includeZeroRows = parseBool(req.query.include_zero);
    const { ctes, params, filters } = buildReportQueryParts(context, req);

    const result = await pool.query(
      `
        ${ctes}
        SELECT *
        FROM metrics_by_day
        WHERE $${params.length + 1}::boolean = true
           OR worked_minutes > 0
           OR ordinary_minutes + night_25_minutes + extra_50_minutes + extra_100_minutes + non_working_100_minutes + late_minutes + early_departure_minutes + absence_minutes > 0
        ORDER BY employee_full_name ASC, shift_date ASC
      `,
      [...params, includeZeroRows]
    );

    return res.status(200).json({
      success: true,
      rows: result.rows,
      filters: { ...filters, include_zero: includeZeroRows },
    });
  } catch (error: any) {
    if (String(error?.message || '').includes('formato YYYY-MM-DD')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const context = await resolveViewerContext(req);
    if (!context) return res.status(403).json({ error: 'Reporte disponible para Supervisor/RRHH' });

    const { ctes, params, filters } = buildReportQueryParts(context, req);

    const result = await pool.query(
      `
        ${ctes}
        SELECT
          employee_id,
          employee_code,
          employee_full_name,
          MAX(company_name) AS company_name,
          MAX(company_id::text)::uuid AS company_id,
          MAX(company_logo) AS company_logo,
          MAX(company_banner) AS company_banner,
          MAX(work_location_name) AS work_location_name,
          MAX(cost_center_id::text)::uuid AS cost_center_id,
          MAX(cost_center_name) AS cost_center_name,
          MAX(payroll_group_id::text)::uuid AS payroll_group_id,
          MAX(payroll_group_name) AS payroll_group_name,
          MAX(work_group_id::text)::uuid AS work_group_id,
          MAX(work_group_name) AS work_group_name,
          MAX(department_name) AS department_name,
          MAX(area_name) AS area_name,
          COUNT(*)::int AS planned_days,
          COUNT(*) FILTER (WHERE worked_minutes > 0)::int AS worked_days,
          SUM(worked_minutes)::int AS worked_minutes,
          SUM(ordinary_minutes)::int AS ordinary_minutes,
          SUM(night_25_minutes)::int AS night_25_minutes,
          SUM(extra_50_minutes)::int AS extra_50_minutes,
          SUM(extra_100_minutes)::int AS extra_100_minutes,
          SUM(non_working_100_minutes)::int AS non_working_100_minutes,
          SUM(late_minutes)::int AS late_minutes,
          SUM(early_departure_minutes)::int AS early_departure_minutes,
          SUM(absence_minutes)::int AS absence_minutes,
          SUM(lunch_excess_minutes)::int AS lunch_excess_minutes,
          SUM(unjustified_incident_minutes)::int AS unjustified_incident_minutes,
          SUM(unpaid_leave_minutes)::int AS unpaid_leave_minutes,
          (SUM(late_minutes) + SUM(early_departure_minutes) + SUM(absence_minutes) + SUM(lunch_excess_minutes) + SUM(unjustified_incident_minutes) + SUM(unpaid_leave_minutes))::int AS discount_minutes,
          GREATEST(0, SUM(extra_100_minutes) - SUM(unpaid_leave_minutes))::int AS net_extra_100_minutes
        FROM metrics_by_day
        GROUP BY employee_id, employee_code, employee_full_name
        HAVING SUM(worked_minutes) > 0
            OR SUM(ordinary_minutes + night_25_minutes + extra_50_minutes + extra_100_minutes + non_working_100_minutes + late_minutes + early_departure_minutes + absence_minutes) > 0
        ORDER BY employee_full_name ASC
      `,
      params
    );

    return res.status(200).json({
      success: true,
      rows: result.rows,
      filters,
    });
  } catch (error: any) {
    if (String(error?.message || '').includes('formato YYYY-MM-DD')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

router.get('/anomalies', async (req: Request, res: Response) => {
  try {
    const context = await resolveViewerContext(req);
    if (!context) return res.status(403).json({ error: 'Reporte disponible para Supervisor/RRHH' });

    const { ctes, params, filters } = buildReportQueryParts(context, req);

    const result = await pool.query(
      `
        ${ctes},
        punch_by_calendar_day AS (
          SELECT
            ae.employee_id,
            ae.employee_code,
            CONCAT(ae.employee_lastname, ' ', ae.employee_name) AS employee_full_name,
            ae.company_name,
            ae.company_id,
            ae.company_logo,
            ae.company_banner,
            ae.department_name,
            ae.area_name,
            ae.payroll_group_name,
            ae.cost_center_name,
            ae.work_group_name,
            p.punch_datetime::date AS issue_date,
            COUNT(*)::int AS punch_count,
            MIN(p.punch_datetime) AS first_punch,
            MAX(p.punch_datetime) AS last_punch
          FROM assigned_employees ae
          CROSS JOIN filters
          INNER JOIN public.employee_time_punches p
            ON p.employee_id = ae.employee_id
           AND p.tenant_id = $1::uuid
           AND p.is_active = true
           AND p.punch_datetime >= filters.date_from::timestamp
           AND p.punch_datetime < filters.date_to::timestamp + INTERVAL '1 day'
          WHERE ($${params.length + 1}::uuid IS NULL OR ae.employee_id = $${params.length + 1}::uuid)
            AND ($${params.length + 2}::uuid IS NULL OR ae.payroll_group_id = $${params.length + 2}::uuid)
            AND ($${params.length + 3}::uuid IS NULL OR ae.cost_center_id = $${params.length + 3}::uuid)
            AND ($${params.length + 4}::uuid IS NULL OR ae.department_id = $${params.length + 4}::uuid)
            AND ($${params.length + 5}::uuid IS NULL OR ae.area_id = $${params.length + 5}::uuid)
            AND ($${params.length + 6}::uuid IS NULL OR ae.work_group_id = $${params.length + 6}::uuid)
          GROUP BY ae.employee_id, ae.employee_code, ae.employee_lastname, ae.employee_name, ae.company_name, ae.company_id, ae.company_logo, ae.company_banner, ae.department_name, ae.area_name, ae.payroll_group_name, ae.cost_center_name, ae.work_group_name, p.punch_datetime::date
        ),
        anomaly_rows AS (
          SELECT
            employee_id,
            employee_code,
            employee_full_name,
            company_name,
            company_id,
            company_logo,
            company_banner,
            department_name,
            area_name,
            payroll_group_name,
            cost_center_name,
            work_group_name,
            issue_date,
            'ODD_PUNCHES' AS anomaly_key,
            'Marcaciones impares' AS anomaly_label,
            ('Cantidad de marcaciones: ' || punch_count)::text AS anomaly_detail,
            punch_count,
            first_punch,
            last_punch
          FROM punch_by_calendar_day
          WHERE MOD(punch_count, 2) = 1

          UNION ALL

          SELECT
            pbd.employee_id,
            pbd.employee_code,
            pbd.employee_full_name,
            pbd.company_name,
            pbd.company_id,
            pbd.company_logo,
            pbd.company_banner,
            pbd.department_name,
            pbd.area_name,
            pbd.payroll_group_name,
            pbd.cost_center_name,
            pbd.work_group_name,
            pbd.issue_date,
            'UNASSIGNED_SHIFT' AS anomaly_key,
            'Turno no asignado' AS anomaly_label,
            'Existen marcaciones en una fecha sin turno activo asignado' AS anomaly_detail,
            pbd.punch_count,
            pbd.first_punch,
            pbd.last_punch
          FROM punch_by_calendar_day pbd
          LEFT JOIN public.employee_shift_plans plan
            ON plan.employee_id = pbd.employee_id
           AND plan.tenant_id = $1::uuid
           AND plan.shift_date = pbd.issue_date
           AND plan.is_active = true
          WHERE plan.id IS NULL

          UNION ALL

          SELECT
            pbd.employee_id,
            pbd.employee_code,
            pbd.employee_full_name,
            pbd.company_name,
            pbd.company_id,
            pbd.company_logo,
            pbd.company_banner,
            pbd.department_name,
            pbd.area_name,
            pbd.payroll_group_name,
            pbd.cost_center_name,
            pbd.work_group_name,
            pbd.issue_date,
            'OUT_OF_SHIFT_PUNCHES' AS anomaly_key,
            'Marcaciones fuera del turno asignado' AS anomaly_label,
            'Existen marcaciones en la fecha, pero no corresponden al turno asignado ni a un cambio aprobado' AS anomaly_detail,
            pbd.punch_count,
            pbd.first_punch,
            pbd.last_punch
          FROM punch_by_calendar_day pbd
          INNER JOIN plans pl
            ON pl.employee_id = pbd.employee_id
           AND pl.shift_date = pbd.issue_date
           AND pl.work_minutes > 0
          WHERE NOT EXISTS (
              SELECT 1
              FROM public.employee_time_punches p
              WHERE p.employee_id = pbd.employee_id
                AND p.tenant_id = $1::uuid
                AND p.is_active = true
                AND p.punch_datetime >= pl.shift_date::timestamp + (pl.work_start_minutes || ' minutes')::interval - INTERVAL '6 hours'
                AND p.punch_datetime <= pl.shift_date::timestamp + (pl.work_end_minutes || ' minutes')::interval + INTERVAL '6 hours'
            )
            AND NOT EXISTS (
              SELECT 1
              FROM public.employee_shift_change_requests scr
              INNER JOIN public.lookup_values status
                ON status.id = scr.request_status_id
              WHERE scr.tenant_id = $1::uuid
                AND scr.employee_id = pbd.employee_id
                AND scr.shift_date = pbd.issue_date
                AND scr.is_active = true
                AND UPPER(COALESCE(status.lookup_key, '')) IN ('APPROVED', 'APROBADO')
            )

          UNION ALL

          SELECT
            attendance.employee_id,
            attendance.employee_code,
            attendance.employee_full_name,
            attendance.company_name,
            attendance.company_id,
            attendance.company_logo,
            attendance.company_banner,
            attendance.department_name,
            attendance.area_name,
            attendance.payroll_group_name,
            attendance.cost_center_name,
            attendance.work_group_name,
            attendance.shift_date AS issue_date,
            'UNAPPROVED_LATE' AS anomaly_key,
            'Tiempo no laborado por atraso no justificado o no aprobado' AS anomaly_label,
            ('Tiempo no laborado por atraso: ' || attendance.late_minutes || ' min; aprobado: ' || COALESCE(approved_leave_by_day.approved_late_minutes, 0) || ' min') AS anomaly_detail,
            0::int AS punch_count,
            attendance.first_entry AS first_punch,
            attendance.last_exit AS last_punch
          FROM attendance
          LEFT JOIN approved_leave_by_day
            ON approved_leave_by_day.employee_id = attendance.employee_id
           AND approved_leave_by_day.shift_date = attendance.shift_date
          WHERE attendance.work_minutes > 0
            AND attendance.is_non_working_day = false
            AND attendance.late_minutes > 0
            AND COALESCE(approved_leave_by_day.approved_late_minutes, 0) < attendance.late_minutes

          UNION ALL

          SELECT
            attendance.employee_id,
            attendance.employee_code,
            attendance.employee_full_name,
            attendance.company_name,
            attendance.company_id,
            attendance.company_logo,
            attendance.company_banner,
            attendance.department_name,
            attendance.area_name,
            attendance.payroll_group_name,
            attendance.cost_center_name,
            attendance.work_group_name,
            attendance.shift_date AS issue_date,
            'UNAPPROVED_ABSENCE' AS anomaly_key,
            'Tiempo no laborado por falta no justificada o no aprobada' AS anomaly_label,
            ('Tiempo no laborado por falta: ' || attendance.absence_minutes || ' min; aprobado: ' || COALESCE(approved_leave_by_day.approved_absence_minutes, 0) || ' min') AS anomaly_detail,
            0::int AS punch_count,
            NULL::timestamptz AS first_punch,
            NULL::timestamptz AS last_punch
          FROM attendance
          LEFT JOIN approved_leave_by_day
            ON approved_leave_by_day.employee_id = attendance.employee_id
           AND approved_leave_by_day.shift_date = attendance.shift_date
          WHERE attendance.work_minutes > 0
            AND attendance.is_non_working_day = false
            AND attendance.first_entry IS NULL
            AND attendance.absence_minutes > 0
            AND COALESCE(approved_leave_by_day.approved_absence_minutes, 0) < attendance.absence_minutes

          UNION ALL

          SELECT
            attendance.employee_id,
            attendance.employee_code,
            attendance.employee_full_name,
            attendance.company_name,
            attendance.company_id,
            attendance.company_logo,
            attendance.company_banner,
            attendance.department_name,
            attendance.area_name,
            attendance.payroll_group_name,
            attendance.cost_center_name,
            attendance.work_group_name,
            attendance.shift_date AS issue_date,
            'UNAPPROVED_EARLY_DEPARTURE' AS anomaly_key,
            'Tiempo no laborado por salida anticipada no justificada o no aprobada' AS anomaly_label,
            ('Tiempo no laborado por salida anticipada: ' || attendance.early_departure_minutes || ' min; aprobado: ' || COALESCE(approved_leave_by_day.approved_early_departure_minutes, 0) || ' min') AS anomaly_detail,
            0::int AS punch_count,
            attendance.first_entry AS first_punch,
            attendance.last_exit AS last_punch
          FROM attendance
          LEFT JOIN approved_leave_by_day
            ON approved_leave_by_day.employee_id = attendance.employee_id
           AND approved_leave_by_day.shift_date = attendance.shift_date
          WHERE attendance.work_minutes > 0
            AND attendance.is_non_working_day = false
            AND attendance.early_departure_minutes > 0
            AND COALESCE(approved_leave_by_day.approved_early_departure_minutes, 0) < attendance.early_departure_minutes

          UNION ALL

          SELECT
            ae.employee_id,
            ae.employee_code,
            CONCAT(ae.employee_lastname, ' ', ae.employee_name) AS employee_full_name,
            ae.company_name,
            ae.company_id,
            ae.company_logo,
            ae.company_banner,
            ae.department_name,
            ae.area_name,
            ae.payroll_group_name,
            ae.cost_center_name,
            ae.work_group_name,
            scr.shift_date AS issue_date,
            'UNAPPROVED_SHIFT_CHANGE_REQUEST' AS anomaly_key,
            'Solicitud de cambio de turno no aprobada' AS anomaly_label,
            ('Estado: ' || COALESCE(status.lookup_label, status.lookup_key, '-') || '; de ' || COALESCE(current_shift.shift_short_name, current_shift.shift_name, '-') || ' a ' || COALESCE(requested_shift.shift_short_name, requested_shift.shift_name, '-')) AS anomaly_detail,
            0::int AS punch_count,
            NULL::timestamptz AS first_punch,
            NULL::timestamptz AS last_punch
          FROM assigned_employees ae
          CROSS JOIN filters
          INNER JOIN public.employee_shift_change_requests scr
            ON scr.employee_id = ae.employee_id
           AND scr.tenant_id = $1::uuid
           AND scr.is_active = true
          INNER JOIN public.lookup_values status
            ON status.id = scr.request_status_id
          LEFT JOIN public.shifts current_shift
            ON current_shift.id = scr.current_shift_id
          LEFT JOIN public.shifts requested_shift
            ON requested_shift.id = scr.requested_shift_id
          WHERE scr.shift_date BETWEEN filters.date_from AND filters.date_to
            AND UPPER(COALESCE(status.lookup_key, '')) NOT IN ('APPROVED', 'APROBADO')
            AND ($${params.length + 1}::uuid IS NULL OR ae.employee_id = $${params.length + 1}::uuid)
            AND ($${params.length + 2}::uuid IS NULL OR ae.payroll_group_id = $${params.length + 2}::uuid)
            AND ($${params.length + 3}::uuid IS NULL OR ae.cost_center_id = $${params.length + 3}::uuid)
            AND ($${params.length + 4}::uuid IS NULL OR ae.department_id = $${params.length + 4}::uuid)
            AND ($${params.length + 5}::uuid IS NULL OR ae.area_id = $${params.length + 5}::uuid)
            AND ($${params.length + 6}::uuid IS NULL OR ae.work_group_id = $${params.length + 6}::uuid)

          UNION ALL

          SELECT
            ae.employee_id,
            ae.employee_code,
            CONCAT(ae.employee_lastname, ' ', ae.employee_name) AS employee_full_name,
            ae.company_name,
            ae.company_id,
            ae.company_logo,
            ae.company_banner,
            ae.department_name,
            ae.area_name,
            ae.payroll_group_name,
            ae.cost_center_name,
            ae.work_group_name,
            request_time.issue_date,
            CASE WHEN UPPER(COALESCE(request_type.lookup_key, '')) = 'CREATE_PUNCH' THEN 'UNAPPROVED_CREATE_PUNCH_REQUEST' ELSE 'UNAPPROVED_UPDATE_PUNCH_REQUEST' END AS anomaly_key,
            CASE WHEN UPPER(COALESCE(request_type.lookup_key, '')) = 'CREATE_PUNCH' THEN 'Solicitud de aÃ±adir marcaciÃ³n no aprobada' ELSE 'Solicitud de cambio de marcaciÃ³n no aprobada' END AS anomaly_label,
            ('Estado: ' || COALESCE(status.lookup_label, status.lookup_key, '-') || '; tipo: ' || COALESCE(request_type.lookup_label, request_type.lookup_key, '-')) AS anomaly_detail,
            0::int AS punch_count,
            request_ts.issue_timestamp AS first_punch,
            request_ts.issue_timestamp AS last_punch
          FROM assigned_employees ae
          CROSS JOIN filters
          INNER JOIN public.employee_time_punch_change_requests tpr
            ON tpr.employee_id = ae.employee_id
           AND tpr.tenant_id = $1::uuid
           AND tpr.is_active = true
          INNER JOIN public.lookup_values status
            ON status.id = tpr.request_status_id
          INNER JOIN public.lookup_values request_type
            ON request_type.id = tpr.request_type_id
          LEFT JOIN public.employee_time_punches target_punch
            ON target_punch.id = tpr.target_punch_id
          LEFT JOIN LATERAL (
            SELECT COALESCE(
              CASE
                WHEN NULLIF(tpr.requested_values->>'punch_datetime', '') IS NOT NULL THEN (tpr.requested_values->>'punch_datetime')::timestamptz
                ELSE NULL::timestamptz
              END,
              target_punch.punch_datetime,
              tpr.created_at
            ) AS issue_timestamp
          ) request_ts ON true
          LEFT JOIN LATERAL (
            SELECT request_ts.issue_timestamp::date AS issue_date
          ) request_time ON true
          WHERE request_time.issue_date BETWEEN filters.date_from AND filters.date_to
            AND UPPER(COALESCE(status.lookup_key, '')) NOT IN ('APPROVED', 'APROBADO')
            AND UPPER(COALESCE(request_type.lookup_key, '')) IN ('CREATE_PUNCH', 'UPDATE_PUNCH')
            AND ($${params.length + 1}::uuid IS NULL OR ae.employee_id = $${params.length + 1}::uuid)
            AND ($${params.length + 2}::uuid IS NULL OR ae.payroll_group_id = $${params.length + 2}::uuid)
            AND ($${params.length + 3}::uuid IS NULL OR ae.cost_center_id = $${params.length + 3}::uuid)
            AND ($${params.length + 4}::uuid IS NULL OR ae.department_id = $${params.length + 4}::uuid)
            AND ($${params.length + 5}::uuid IS NULL OR ae.area_id = $${params.length + 5}::uuid)
            AND ($${params.length + 6}::uuid IS NULL OR ae.work_group_id = $${params.length + 6}::uuid)
        )
        SELECT *
        FROM anomaly_rows
        ORDER BY employee_full_name ASC, issue_date ASC, anomaly_key ASC
      `,
      [
        ...params,
        filters.employee_id,
        filters.payroll_group_id,
        filters.cost_center_id,
        filters.department_id,
        filters.area_id,
        filters.work_group_id,
      ]
    );

    return res.status(200).json({
      success: true,
      rows: result.rows,
      filters,
    });
  } catch (error: any) {
    if (String(error?.message || '').includes('formato YYYY-MM-DD')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});
export default router;
