import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';
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

async function resolveInternalUserId(req: Request, tenantId: string): Promise<string | null> {
  const authUserId = String((req as any)?.user?.id || '').trim();
  if (!authUserId) return null;

  const result = await pool.query(
    `
      SELECT id
      FROM public.users
      WHERE auth_user_id = $1
        AND tenant_id = $2
        AND is_active = true
      LIMIT 1
    `,
    [authUserId, tenantId]
  );

  return result.rows[0]?.id || null;
}

async function resolveUserRoleKeys(tenantId: string, userId: string | null): Promise<string[]> {
  if (!userId) return [];

  const result = await pool.query(
    `
      SELECT DISTINCT UPPER(r.role_key) AS role_key
      FROM public.user_roles ur
      JOIN public.roles r
        ON r.id = ur.role_id
       AND r.tenant_id = ur.tenant_id
       AND r.is_active = true
      WHERE ur.tenant_id = $1
        AND ur.user_id = $2
        AND ur.is_active = true
        AND (ur.valid_from IS NULL OR ur.valid_from <= now())
        AND (ur.valid_to IS NULL OR ur.valid_to >= now())
    `,
    [tenantId, userId]
  );

  return result.rows.map((row) => String(row.role_key || '').trim()).filter(Boolean);
}

function shouldRestrictByEmployeeScope(roleKeys: string[]): boolean {
  const restrictedRoles = new Set(['SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN']);
  return roleKeys.some((roleKey) => restrictedRoles.has(roleKey)) && !roleKeys.includes('TENANT_ADMIN');
}

async function resolveAuthorizedEmployeeIds(tenantId: string, userId: string | null): Promise<string[]> {
  if (!userId) return [];

  const result = await pool.query(
    `
      SELECT DISTINCT scope.employee_id::text AS employee_id
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
      WHERE ur.tenant_id = $1
        AND ur.user_id = $2
        AND ur.is_active = true
        AND (ur.valid_from IS NULL OR ur.valid_from <= now())
        AND (ur.valid_to IS NULL OR ur.valid_to >= now())
        AND UPPER(COALESCE(r.role_key, '')) IN ('SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN')
    `,
    [tenantId, userId]
  );

  return result.rows.map((row) => String(row.employee_id || '').trim()).filter(Boolean);
}

function isDateIso(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getGuayaquilNow(): { dateIso: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const valueByType = new Map(parts.map((part) => [part.type, part.value]));
  const hour = Number(valueByType.get('hour'));
  const minute = Number(valueByType.get('minute'));

  return {
    dateIso: `${valueByType.get('year')}-${valueByType.get('month')}-${valueByType.get('day')}`,
    minutes: hour * 60 + minute,
  };
}

function parseTimeToMinutes(value?: string | null): number | null {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatMinutesAsClock(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function isFreeShiftLabel(name?: string | null, shortName?: string | null): boolean {
  const text = `${name || ''} ${shortName || ''}`.toUpperCase();
  return (
    text.includes('LIBRE') ||
    text.includes('DESCANSO') ||
    text.includes('OFF') ||
    text.includes('REST')
  );
}

router.get('/catalogs', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const userId = await resolveInternalUserId(req, tenantId);
    const roleKeys = await resolveUserRoleKeys(tenantId, userId);
    const restrictByEmployeeScope = shouldRestrictByEmployeeScope(roleKeys);
    const assignmentParams = restrictByEmployeeScope ? [tenantId, userId] : [tenantId];
    const accessibleAssignmentsSql = restrictByEmployeeScope
      ? `
          SELECT
            scope.tenant_id,
            scope.employee_id,
            scope.company_id,
            scope.work_location_id,
            scope.department_id,
            scope.area_id,
            scope.work_group_id,
            scope.employee_profile_id,
            COALESCE(ec.work_on_holidays, false) AS work_on_holidays,
            ec.created_at AS assignment_created_at
          FROM public.user_roles ur
          INNER JOIN public.roles r
            ON r.id = ur.role_id
           AND r.tenant_id = ur.tenant_id
           AND r.is_active = true
          INNER JOIN public.v_user_role_authorized_employees scope
            ON scope.tenant_id = ur.tenant_id
           AND scope.user_role_id = ur.id
          LEFT JOIN public.employee_companies ec
            ON ec.tenant_id = scope.tenant_id
           AND ec.employee_id = scope.employee_id
           AND ec.company_id = scope.company_id
           AND ec.is_active = true
          INNER JOIN public.employees e
            ON e.id = scope.employee_id
           AND e.tenant_id = scope.tenant_id
           AND e.is_active = true
          WHERE ur.tenant_id = $1
            AND ur.user_id = $2
            AND ur.is_active = true
            AND (ur.valid_from IS NULL OR ur.valid_from <= now())
            AND (ur.valid_to IS NULL OR ur.valid_to >= now())
            AND UPPER(COALESCE(r.role_key, '')) IN ('SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN')
        `
      : `
          SELECT
            ec.tenant_id,
            ec.employee_id,
            ec.company_id,
            ec.work_location_id,
            ec.department_id,
            ec.area_id,
            ec.work_group_id,
            ec.employee_profile_id,
            ec.work_on_holidays,
            ec.created_at AS assignment_created_at
          FROM public.employee_companies ec
          INNER JOIN public.employees e
            ON e.id = ec.employee_id
           AND e.tenant_id = ec.tenant_id
           AND e.is_active = true
          WHERE ec.tenant_id = $1
            AND ec.is_active = true
        `;

    const [employeesResult, shiftsResult, shiftTypesResult, combinationsResult] = await Promise.all([
      pool.query(
        `
          WITH accessible_assignments AS (
            ${accessibleAssignmentsSql}
          )
          SELECT
            DISTINCT ON (e.id)
            e.id,
            e.employee_code,
            e.employee_name,
            e.employee_lastname,
            aa.company_id,
            aa.work_location_id,
            aa.department_id,
            aa.area_id,
            aa.employee_profile_id,
            aa.work_group_id,
            aa.work_on_holidays,
            c.company_name,
            wl.work_location_name,
            d.department_name,
            ar.area_name,
            ep.profile_name AS employee_profile_name,
            wg.work_group_name
          FROM public.employees e
          INNER JOIN accessible_assignments aa
            ON aa.tenant_id = e.tenant_id
           AND aa.employee_id = e.id
          LEFT JOIN public.companies c
            ON c.id = aa.company_id
          LEFT JOIN public.work_locations wl
            ON wl.id = aa.work_location_id
          LEFT JOIN public.departments d
            ON d.id = aa.department_id
          LEFT JOIN public.areas ar
            ON ar.id = aa.area_id
          LEFT JOIN public.employee_profiles ep
            ON ep.id = aa.employee_profile_id
          LEFT JOIN public.work_groups wg
            ON wg.id = aa.work_group_id
          WHERE e.tenant_id = $1
            AND e.is_active = true
          ORDER BY e.id, aa.assignment_created_at DESC NULLS LAST, e.employee_lastname ASC, e.employee_name ASC
        `,
        assignmentParams
      ),
      pool.query(
        `
          SELECT id, company_id, shift_name, shift_short_name, start_time, work_minutes, shift_icon_key, is_active
          FROM public.shifts
          WHERE tenant_id = $1
            AND is_active = true
          ORDER BY shift_name ASC
        `,
        [tenantId]
      ),
      pool.query(
        `
          SELECT lv.id, lv.lookup_key, lv.lookup_label
          FROM public.lookup_values lv
          JOIN public.lookup_groups lg
            ON lg.id = lv.lookup_group_id
          WHERE lg.lookup_group_key = 'SHIFT_TYPE'
            AND lv.is_active = true
          ORDER BY lv.sort_order ASC, lv.lookup_label ASC
        `
      ),
      pool.query(
        `
          WITH accessible_assignments AS (
            ${accessibleAssignmentsSql}
          )
          SELECT DISTINCT
            aa.employee_id,
            aa.company_id,
            c.company_name,
            aa.work_location_id,
            wl.work_location_name,
            aa.department_id,
            d.department_name,
            aa.area_id,
            ar.area_name,
            aa.employee_profile_id,
            ep.profile_name AS employee_profile_name,
            aa.work_group_id,
            wg.work_group_name
          FROM accessible_assignments aa
          INNER JOIN public.companies c
            ON c.id = aa.company_id
          LEFT JOIN public.work_locations wl
            ON wl.id = aa.work_location_id
          LEFT JOIN public.departments d
            ON d.id = aa.department_id
          LEFT JOIN public.areas ar
            ON ar.id = aa.area_id
          LEFT JOIN public.employee_profiles ep
            ON ep.id = aa.employee_profile_id
          LEFT JOIN public.work_groups wg
            ON wg.id = aa.work_group_id
          WHERE aa.company_id IS NOT NULL
          ORDER BY c.company_name ASC, wl.work_location_name ASC NULLS LAST, d.department_name ASC NULLS LAST, ar.area_name ASC NULLS LAST, ep.profile_name ASC NULLS LAST, wg.work_group_name ASC NULLS LAST
        `,
        assignmentParams
      ),
    ]);

    const companiesMap = new Map<string, { id: string; company_name: string }>();
    const workLocationsMap = new Map<string, { id: string; name: string; company_id: string | null }>();
    const departmentsMap = new Map<string, { id: string; name: string; company_id: string | null; work_location_id: string | null }>();
    const areasMap = new Map<string, { id: string; name: string; company_id: string | null; work_location_id: string | null; department_id: string | null }>();
    const employeeProfilesMap = new Map<string, { id: string; name: string; company_id: string | null; work_location_id: string | null; department_id: string | null; area_id: string | null }>();
    const workGroupsMap = new Map<string, { id: string; work_group_name: string; company_id: string | null; work_location_id: string | null; department_id: string | null; area_id: string | null; employee_profile_id: string | null }>();

    combinationsResult.rows.forEach((row) => {
      if (row.company_id && !companiesMap.has(row.company_id)) {
        companiesMap.set(row.company_id, {
          id: row.company_id,
          company_name: row.company_name || 'Empresa',
        });
      }

      if (row.work_location_id && !workLocationsMap.has(row.work_location_id)) {
        workLocationsMap.set(row.work_location_id, {
          id: row.work_location_id,
          name: row.work_location_name || 'Localización',
          company_id: row.company_id || null,
        });
      }

      if (row.department_id && !departmentsMap.has(row.department_id)) {
        departmentsMap.set(row.department_id, {
          id: row.department_id,
          name: row.department_name || 'Departamento',
          company_id: row.company_id || null,
          work_location_id: row.work_location_id || null,
        });
      }

      if (row.area_id && !areasMap.has(row.area_id)) {
        areasMap.set(row.area_id, {
          id: row.area_id,
          name: row.area_name || 'Área',
          company_id: row.company_id || null,
          work_location_id: row.work_location_id || null,
          department_id: row.department_id || null,
        });
      }

      if (row.employee_profile_id && !employeeProfilesMap.has(row.employee_profile_id)) {
        employeeProfilesMap.set(row.employee_profile_id, {
          id: row.employee_profile_id,
          name: row.employee_profile_name || 'Perfil',
          company_id: row.company_id || null,
          work_location_id: row.work_location_id || null,
          department_id: row.department_id || null,
          area_id: row.area_id || null,
        });
      }

      if (row.work_group_id && !workGroupsMap.has(row.work_group_id)) {
        workGroupsMap.set(row.work_group_id, {
          id: row.work_group_id,
          work_group_name: row.work_group_name || 'Grupo de Trabajo',
          company_id: row.company_id || null,
          work_location_id: row.work_location_id || null,
          department_id: row.department_id || null,
          area_id: row.area_id || null,
          employee_profile_id: row.employee_profile_id || null,
        });
      }
    });

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      employees: employeesResult.rows,
      shifts: shiftsResult.rows,
      shift_types: shiftTypesResult.rows,
      employee_combinations: combinationsResult.rows,
      companies: Array.from(companiesMap.values()),
      work_locations: Array.from(workLocationsMap.values()),
      departments: Array.from(departmentsMap.values()),
      areas: Array.from(areasMap.values()),
      employee_profiles: Array.from(employeeProfilesMap.values()),
      work_groups: Array.from(workGroupsMap.values()),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/plans', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const dateFrom = String(req.query.date_from || '').trim();
    const dateTo = String(req.query.date_to || '').trim();

    if (!isDateIso(dateFrom) || !isDateIso(dateTo)) {
      return res.status(400).json({ error: 'date_from y date_to son obligatorios en formato YYYY-MM-DD' });
    }

    const userId = await resolveInternalUserId(req, tenantId);
    const roleKeys = await resolveUserRoleKeys(tenantId, userId);
    const restrictByEmployeeScope = shouldRestrictByEmployeeScope(roleKeys);
    const authorizedEmployeeIds = restrictByEmployeeScope ? await resolveAuthorizedEmployeeIds(tenantId, userId) : [];

    if (restrictByEmployeeScope && authorizedEmployeeIds.length === 0) {
      return res.status(200).json({
        success: true,
        tenant_id: tenantId,
        plans: [],
        date_from: dateFrom,
        date_to: dateTo,
      });
    }

    const params: any[] = [tenantId, dateFrom, dateTo];
    const employeeScopeSql = restrictByEmployeeScope ? `AND p.employee_id = ANY($4::uuid[])` : '';
    if (restrictByEmployeeScope) params.push(authorizedEmployeeIds);

    const plansResult = await pool.query(
      `
        SELECT
          p.id,
          p.employee_id,
          p.shift_id,
          p.shift_date,
          p.shift_type_id,
          p.company_id,
          p.is_active,
          s.shift_name,
          s.shift_short_name
        FROM public.employee_shift_plans p
        JOIN public.shifts s
          ON s.id = p.shift_id
        WHERE p.tenant_id = $1
          AND p.is_active = true
          AND p.shift_date >= $2::date
          AND p.shift_date <= $3::date
          ${employeeScopeSql}
        ORDER BY p.shift_date ASC, p.created_at ASC
      `,
      params
    );

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      plans: plansResult.rows,
      date_from: dateFrom,
      date_to: dateTo,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.post('/plans/bulk', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const changes = Array.isArray(req.body?.changes) ? req.body.changes : [];
    if (changes.length === 0) {
      return res.status(400).json({ error: 'Debe enviar al menos un cambio' });
    }

    const actor = getActor(req);
    const userId = await resolveInternalUserId(req, tenantId);
    const roleKeys = await resolveUserRoleKeys(tenantId, userId);
    const restrictByEmployeeScope = shouldRestrictByEmployeeScope(roleKeys);
    const authorizedEmployeeIds = restrictByEmployeeScope ? await resolveAuthorizedEmployeeIds(tenantId, userId) : [];
    const authorizedEmployeeIdSet = new Set(authorizedEmployeeIds);

    const shiftsResult = await client.query(
      `
        SELECT id, company_id, shift_name, shift_short_name, start_time
        FROM public.shifts
        WHERE tenant_id = $1
          AND is_active = true
      `,
      [tenantId]
    );
    const shiftCompanyById = new Map<string, string>();
    const shiftStartTimeById = new Map<string, string | null>();
    const freeShiftByCompany = new Map<string, string>();
    shiftsResult.rows.forEach((row) => {
      shiftCompanyById.set(row.id, row.company_id);
      shiftStartTimeById.set(row.id, row.start_time || null);
    });
    shiftsResult.rows.forEach((row) => {
      if (isFreeShiftLabel(row.shift_name, row.shift_short_name) && row.company_id && !freeShiftByCompany.has(row.company_id)) {
        freeShiftByCompany.set(row.company_id, row.id);
      }
    });

    const employeeCompanyResult = await client.query(
      `
        SELECT employee_id, company_id
        FROM public.employee_companies
        WHERE tenant_id = $1
          AND is_active = true
      `,
      [tenantId]
    );
    const employeeCompanyById = new Map<string, string>();
    employeeCompanyResult.rows.forEach((row) => {
      if (!employeeCompanyById.has(row.employee_id) && row.company_id) {
        employeeCompanyById.set(row.employee_id, row.company_id);
      }
    });

    await client.query('BEGIN');

    let inserted = 0;
    let updated = 0;
    let deactivated = 0;
    let freeAssigned = 0;

    const ensureFreeShift = async (companyId: string): Promise<string> => {
      const cached = freeShiftByCompany.get(companyId);
      if (cached) return cached;

      const existing = await client.query(
        `
          SELECT id, shift_name, shift_short_name, start_time
          FROM public.shifts
          WHERE tenant_id = $1
            AND company_id = $2
            AND is_active = true
          ORDER BY created_at ASC NULLS LAST
        `,
        [tenantId, companyId]
      );

      const found = existing.rows.find((row) => isFreeShiftLabel(row.shift_name, row.shift_short_name));
      if (found?.id) {
        freeShiftByCompany.set(companyId, found.id);
        shiftCompanyById.set(found.id, companyId);
        shiftStartTimeById.set(found.id, found.start_time || null);
        return found.id;
      }

      const created = await client.query(
        `
          INSERT INTO public.shifts (
            id, tenant_id, company_id, shift_name, shift_short_name, start_time,
            shift_duration_minutes, work_minutes, lunch_minutes, lunch_window_minutes,
            lunch_is_paid, lunch_deduction_mode,
            entry_grace_minutes, exit_grace_minutes,
            is_active, created_by
          ) VALUES (
            gen_random_uuid(), $1, $2, 'Turno Libre', 'LIB', '00:00',
            1440, 0, 0, 0, false, NULL, 0, 0, true, $3
          )
          RETURNING id
        `,
        [tenantId, companyId, actor]
      );

      const freeShiftId = created.rows[0]?.id as string;
      freeShiftByCompany.set(companyId, freeShiftId);
      shiftCompanyById.set(freeShiftId, companyId);
      shiftStartTimeById.set(freeShiftId, '00:00');
      return freeShiftId;
    };

    const nowInGuayaquil = getGuayaquilNow();

    for (const change of changes) {
      const employeeId = String(change?.employee_id || '').trim();
      const shiftDate = String(change?.shift_date || '').trim();
      const shiftIdRaw = change?.shift_id;
      let shiftId = shiftIdRaw === null || shiftIdRaw === undefined || String(shiftIdRaw).trim() === ''
        ? null
        : String(shiftIdRaw).trim();
      const shiftTypeId = change?.shift_type_id ? String(change.shift_type_id).trim() : null;

      if (!employeeId || !isDateIso(shiftDate)) {
        throw new Error('Cada cambio requiere employee_id y shift_date (YYYY-MM-DD)');
      }

      if (shiftDate < nowInGuayaquil.dateIso) {
        throw new Error(`No se pueden modificar turnos con fecha anterior a la fecha actual (${shiftDate})`);
      }

      if (restrictByEmployeeScope && !authorizedEmployeeIdSet.has(employeeId)) {
        throw new Error(`El empleado ${employeeId} no está autorizado para el usuario autenticado`);
      }

      let companyId =
        (shiftId ? shiftCompanyById.get(shiftId) : null) ||
        (change?.company_id && String(change.company_id).trim()) ||
        employeeCompanyById.get(employeeId);

      if (!companyId) {
        throw new Error(`No se pudo resolver company_id para empleado ${employeeId} en fecha ${shiftDate}`);
      }

      if (!shiftId) {
        shiftId = await ensureFreeShift(companyId);
        freeAssigned += 1;
      }

      const shiftCompanyId = shiftCompanyById.get(shiftId);
      if (!shiftCompanyId) {
        throw new Error(`El turno ${shiftId} no está activo o no pertenece al tenant actual`);
      }
      companyId = shiftCompanyId;

      if (shiftDate === nowInGuayaquil.dateIso) {
        const shiftStart = parseTimeToMinutes(shiftStartTimeById.get(shiftId));
        const earliestAllowedStart = nowInGuayaquil.minutes + 120;
        if (earliestAllowedStart > 1439 || shiftStart === null || shiftStart < earliestAllowedStart) {
          throw new Error(
            earliestAllowedStart > 1439
              ? 'No quedan turnos elegibles para el día actual: deben iniciar al menos dos horas después de la hora actual de Ecuador'
              : `El turno del día actual debe iniciar al menos dos horas después de la hora actual de Ecuador (${formatMinutesAsClock(earliestAllowedStart)})`
          );
        }
      }

      const existingResult = await client.query(
        `
          SELECT id
          FROM public.employee_shift_plans
          WHERE tenant_id = $1
            AND employee_id = $2
            AND shift_date = $3::date
            AND is_active = true
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [tenantId, employeeId, shiftDate]
      );

      if (existingResult.rows[0]?.id) {
        const existingId = existingResult.rows[0].id;

        await client.query(
          `
            UPDATE public.employee_shift_plans
            SET shift_id = $4,
                shift_type_id = $5,
                company_id = $6,
                updated_by = $7,
                updated_at = now(),
                is_active = true
            WHERE id = $1
              AND tenant_id = $2
              AND employee_id = $3
          `,
          [existingId, tenantId, employeeId, shiftId, shiftTypeId, companyId, actor]
        );
        updated += 1;

        await client.query(
          `
            UPDATE public.employee_shift_plans
            SET is_active = false,
                updated_by = $4,
                updated_at = now()
            WHERE tenant_id = $1
              AND employee_id = $2
              AND shift_date = $3::date
              AND id <> $5
              AND is_active = true
          `,
          [tenantId, employeeId, shiftDate, actor, existingId]
        );
      } else {
        await client.query(
          `
            INSERT INTO public.employee_shift_plans (
              id, tenant_id, company_id, employee_id, shift_id, shift_date,
              shift_type_id, is_active, created_by
            )
            VALUES (
              gen_random_uuid(), $1, $2, $3, $4, $5::date,
              $6, true, $7
            )
          `,
          [tenantId, companyId, employeeId, shiftId, shiftDate, shiftTypeId, actor]
        );
        inserted += 1;
      }
    }

    await client.query('COMMIT');
    publishTenantDashboardEvent(tenantId, 'shift_plans_changed', null);

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      summary: {
        inserted,
        updated,
        deactivated,
        free_assigned: freeAssigned,
        total_changes: changes.length,
      },
    });
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    return res.status(500).json({ error: err.message || 'Error interno' });
  } finally {
    client.release();
  }
});

export default router;
