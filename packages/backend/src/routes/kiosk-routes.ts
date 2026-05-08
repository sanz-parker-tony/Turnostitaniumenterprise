import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

const PUNCH_KEY_GROUP_ID = 'a349d449-b3c1-475a-91bd-c687b49e97cc';
const PUNCH_SOURCE_GROUP_ID = 'd0c3806b-de4b-a91d-13d6-bc565264c183';
const TIME_PUNCH_STATUS_GROUP_ID = '0949d7d5-c2b1-56e9-6010-5909cc7af8b7';
const REQUEST_STATUS_GROUP_ID = '9f904369-9998-83ab-6996-635363513a9f';
const ABSENCE_TRANSACTION_TYPE_GROUP_KEY = 'ABSENCE_TRANSACTION_TYPE';
const FIXED_DEVICE_ID = '432233b7-7eb8-4c3d-93fd-1593e72feda2';
const FIXED_PUNCH_SOURCE_ID = 'a54a5eb6-ad1f-8573-98d7-d62ff0c0861d';
const FIXED_NOTES = 'marcación manual vía web';

type EmployeeContext = {
  user_id: string;
  tenant_id: string;
  employee_id: string;
  employee_code: string | null;
  employee_name: string | null;
  employee_lastname: string | null;
  employee_photo_path: string | null;
  company_id: string | null;
  company_name: string | null;
};

function getActor(req: Request): string {
  const user = (req as any).user;
  return user?.email || user?.id || 'system';
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeNullableText(value: any): string | null {
  if (value === undefined || value === null) return null;
  const next = String(value).trim();
  return next || null;
}

function isValidDateTime(value: string): boolean {
  const date = new Date(value);
  return Number.isFinite(date.getTime());
}

async function isLookupValueInGroupByKey(
  lookupValueId: string,
  lookupGroupKey: string,
  tenantId: string
): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT lv.id
      FROM public.lookup_values lv
      INNER JOIN public.lookup_groups lg
        ON lg.id = lv.lookup_group_id
      WHERE lv.id = $1::uuid
        AND lg.lookup_group_key = $2
        AND lv.is_active = true
        AND (lv.tenant_id IS NULL OR lv.tenant_id = $3::uuid)
      LIMIT 1
    `,
    [lookupValueId, lookupGroupKey, tenantId]
  );
  return Boolean(result.rows[0]);
}

async function resolveRequestStatusIdByKeys(
  tenantId: string,
  keys: string[]
): Promise<string | null> {
  if (keys.length === 0) return null;
  const normalized = keys.map((key) => key.trim().toUpperCase()).filter(Boolean);
  if (normalized.length === 0) return null;

  const result = await pool.query(
    `
      SELECT id
      FROM public.lookup_values
      WHERE lookup_group_id = $1::uuid
        AND is_active = true
        AND (tenant_id IS NULL OR tenant_id = $2::uuid)
        AND UPPER(lookup_key) = ANY ($3::text[])
      ORDER BY
        CASE
          WHEN UPPER(lookup_key) = $4 THEN 0
          ELSE 1
        END,
        sort_order ASC
      LIMIT 1
    `,
    [REQUEST_STATUS_GROUP_ID, tenantId, normalized, normalized[0]]
  );
  return result.rows[0]?.id || null;
}

async function resolveDefaultRequestStatusId(tenantId: string): Promise<string | null> {
  const byPending = await resolveRequestStatusIdByKeys(tenantId, [
    'PENDING',
    'PENDIENTE',
    'REQUESTED',
    'SOLICITADO',
  ]);
  if (byPending) return byPending;

  const fallback = await pool.query(
    `
      SELECT id
      FROM public.lookup_values
      WHERE lookup_group_id = $1::uuid
        AND is_active = true
        AND (tenant_id IS NULL OR tenant_id = $2::uuid)
      ORDER BY sort_order ASC, lookup_label ASC
      LIMIT 1
    `,
    [REQUEST_STATUS_GROUP_ID, tenantId]
  );
  return fallback.rows[0]?.id || null;
}

async function resolveEmployeeContext(req: Request): Promise<EmployeeContext | null> {
  const user = (req as any).user;
  if (!user?.id) return null;

  const result = await pool.query(
    `
      SELECT
        u.id AS user_id,
        u.tenant_id,
        e.id AS employee_id,
        e.employee_code,
        e.employee_name,
        e.employee_lastname,
        e.employee_photo_path,
        ec.company_id,
        c.company_name
      FROM public.users u
      INNER JOIN public.employees e
        ON e.user_id = u.id
       AND e.tenant_id = u.tenant_id
       AND e.is_active = true
      LEFT JOIN LATERAL (
        SELECT company_id
        FROM public.employee_companies ec
        WHERE ec.tenant_id = u.tenant_id
          AND ec.employee_id = e.id
          AND ec.is_active = true
        ORDER BY ec.created_at DESC NULLS LAST
        LIMIT 1
      ) ec ON true
      LEFT JOIN public.companies c
        ON c.id = ec.company_id
      WHERE u.auth_user_id = $1
        AND u.is_active = true
      LIMIT 1
    `,
    [user.id]
  );

  return (result.rows[0] as EmployeeContext | undefined) || null;
}

async function getEmployeeCompanies(tenantId: string, employeeId: string) {
  const result = await pool.query(
    `
      SELECT DISTINCT
        ec.company_id,
        c.company_name
      FROM public.employee_companies ec
      INNER JOIN public.companies c
        ON c.id = ec.company_id
      WHERE ec.tenant_id = $1
        AND ec.employee_id = $2
        AND ec.is_active = true
      ORDER BY c.company_name ASC
    `,
    [tenantId, employeeId]
  );
  return result.rows;
}

router.get('/mark/context', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({
        error: 'No existe empleado asociado al usuario autenticado',
      });
    }

    const [companiesResult, devicesResult, lookupResult] = await Promise.all([
      getEmployeeCompanies(context.tenant_id, context.employee_id),
      pool.query(
        `
          SELECT
            id,
            company_id,
            device_name,
            device_serial_number,
            device_location,
            device_ip
          FROM public.time_clock_devices
          WHERE tenant_id = $1
            AND is_active = true
            AND ($2::uuid IS NULL OR company_id = $2::uuid)
          ORDER BY device_name ASC, device_serial_number ASC
        `,
        [context.tenant_id, context.company_id]
      ),
      pool.query(
        `
          SELECT
            lv.id,
            lv.lookup_key,
            lv.lookup_label,
            lv.lookup_short_label,
            lv.sort_order,
            lv.lookup_group_id,
            lv.sort_order AS punch_key_value
          FROM public.lookup_values lv
          WHERE lv.lookup_group_id IN ($1::uuid, $2::uuid, $3::uuid)
            AND lv.is_active = true
            AND (lv.tenant_id IS NULL OR lv.tenant_id = $4::uuid)
          ORDER BY lv.lookup_group_id ASC, lv.sort_order ASC, lv.lookup_label ASC
        `,
        [
          PUNCH_KEY_GROUP_ID,
          PUNCH_SOURCE_GROUP_ID,
          TIME_PUNCH_STATUS_GROUP_ID,
          context.tenant_id,
        ]
      ),
    ]);

    const rows = lookupResult.rows;

    return res.status(200).json({
      success: true,
      employee: {
        id: context.employee_id,
        employee_code: context.employee_code,
        employee_name: context.employee_name,
        employee_lastname: context.employee_lastname,
        employee_photo_path: context.employee_photo_path,
        company_id: context.company_id,
        company_name: context.company_name,
      },
      companies: companiesResult,
      devices: devicesResult.rows,
      punch_keys: rows.filter((r) => r.lookup_group_id === PUNCH_KEY_GROUP_ID),
      punch_sources: rows.filter((r) => r.lookup_group_id === PUNCH_SOURCE_GROUP_ID),
      punch_statuses: rows.filter((r) => r.lookup_group_id === TIME_PUNCH_STATUS_GROUP_ID),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/mark/history', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({
        error: 'No existe empleado asociado al usuario autenticado',
      });
    }

    const from = normalizeNullableText(req.query.from);
    const to = normalizeNullableText(req.query.to);
    const limitRaw = Number(req.query.limit ?? 200);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, Math.trunc(limitRaw))) : 200;

    const params: any[] = [context.tenant_id, context.employee_id, PUNCH_KEY_GROUP_ID];
    let whereExtra = '';

    if (from) {
      if (!isIsoDate(from)) return res.status(400).json({ error: 'from debe tener formato YYYY-MM-DD' });
      params.push(`${from}T00:00:00`);
      whereExtra += ` AND p.punch_datetime >= $${params.length}::timestamptz`;
    }
    if (to) {
      if (!isIsoDate(to)) return res.status(400).json({ error: 'to debe tener formato YYYY-MM-DD' });
      params.push(`${to}T23:59:59`);
      whereExtra += ` AND p.punch_datetime <= $${params.length}::timestamptz`;
    }

    params.push(limit);

    const result = await pool.query(
      `
        SELECT
          p.id,
          p.company_id,
          c.company_name,
          p.time_clock_device_id,
          d.device_name,
          d.device_serial_number,
          p.punch_datetime,
          p.punch_key,
          mv.id AS punch_key_lookup_id,
          mv.lookup_label AS movement_label,
          p.punch_source_id,
          src.lookup_label AS punch_source_label,
          p.time_punch_status_id,
          st.lookup_label AS time_punch_status_label,
          p.service_ticket_number,
          p.notes,
          p.is_active
        FROM public.employee_time_punches p
        LEFT JOIN public.companies c
          ON c.id = p.company_id
        LEFT JOIN public.time_clock_devices d
          ON d.id = p.time_clock_device_id
        LEFT JOIN public.lookup_values src
          ON src.id = p.punch_source_id
        LEFT JOIN public.lookup_values st
          ON st.id = p.time_punch_status_id
        LEFT JOIN LATERAL (
          SELECT lv.id, lv.lookup_label
          FROM public.lookup_values lv
          WHERE lv.lookup_group_id = $3::uuid
            AND lv.sort_order = p.punch_key
            AND lv.is_active = true
            AND (lv.tenant_id IS NULL OR lv.tenant_id = p.tenant_id)
          ORDER BY CASE WHEN lv.tenant_id = p.tenant_id THEN 0 ELSE 1 END, lv.sort_order ASC
          LIMIT 1
        ) mv ON true
        WHERE p.tenant_id = $1
          AND p.employee_id = $2
          ${whereExtra}
        ORDER BY p.punch_datetime DESC, p.created_at DESC
        LIMIT $${params.length}
      `,
      params
    );

    return res.status(200).json({
      success: true,
      punches: result.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.post('/mark/punch', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({
        error: 'No existe empleado asociado al usuario autenticado',
      });
    }

    const actor = getActor(req);
    const companyIdRequested = normalizeNullableText(req.body?.company_id);
    const deviceId = FIXED_DEVICE_ID;
    const punchKeyLookupId = normalizeNullableText(req.body?.punch_key_lookup_id);
    const timePunchStatusId = normalizeNullableText(req.body?.time_punch_status_id);
    const notes = FIXED_NOTES;

    const employeeCompanies = await getEmployeeCompanies(context.tenant_id, context.employee_id);
    const defaultCompanyId = context.company_id || employeeCompanies[0]?.company_id || null;
    const companyId = companyIdRequested || defaultCompanyId;
    if (!companyId) {
      return res.status(400).json({
        error: 'No se pudo determinar la empresa del empleado',
      });
    }

    const hasCompany = employeeCompanies.some((row) => row.company_id === companyId);
    if (!hasCompany) {
      return res.status(400).json({
        error: 'La empresa seleccionada no esta asignada al empleado',
      });
    }

    if (!punchKeyLookupId) {
      return res.status(400).json({ error: 'punch_key_lookup_id es obligatorio' });
    }

    const punchKeyLookupResult = await pool.query(
      `
        SELECT
          id,
          lookup_label,
          sort_order AS punch_key_value
        FROM public.lookup_values
        WHERE id = $1
          AND lookup_group_id = $2::uuid
          AND is_active = true
          AND (tenant_id IS NULL OR tenant_id = $3::uuid)
        LIMIT 1
      `,
      [punchKeyLookupId, PUNCH_KEY_GROUP_ID, context.tenant_id]
    );
    const punchKeyRow = punchKeyLookupResult.rows[0];
    if (!punchKeyRow || !Number.isFinite(Number(punchKeyRow.punch_key_value))) {
      return res.status(400).json({
        error: 'El tipo de marcacion seleccionado no es valido',
      });
    }
    const punchKey = Math.trunc(Number(punchKeyRow.punch_key_value));

    const sourceResult = await pool.query(
      `
        SELECT id
        FROM public.lookup_values
        WHERE id = $1
          AND lookup_group_id = $2::uuid
          AND is_active = true
          AND (tenant_id IS NULL OR tenant_id = $3::uuid)
        LIMIT 1
      `,
      [FIXED_PUNCH_SOURCE_ID, PUNCH_SOURCE_GROUP_ID, context.tenant_id]
    );
    if (!sourceResult.rows[0]) {
      return res.status(400).json({ error: 'No existe la fuente fija Aplicacion Web configurada' });
    }
    const normalizedSourceId = sourceResult.rows[0].id as string;

    let normalizedStatusId: string | null = null;
    if (timePunchStatusId) {
      const statusResult = await pool.query(
        `
          SELECT id
          FROM public.lookup_values
          WHERE id = $1
            AND lookup_group_id = $2::uuid
            AND is_active = true
            AND (tenant_id IS NULL OR tenant_id = $3::uuid)
          LIMIT 1
        `,
        [timePunchStatusId, TIME_PUNCH_STATUS_GROUP_ID, context.tenant_id]
      );
      if (!statusResult.rows[0]) return res.status(400).json({ error: 'time_punch_status_id no valido' });
      normalizedStatusId = statusResult.rows[0].id;
    }

    if (deviceId) {
      const deviceResult = await pool.query(
        `
          SELECT id
          FROM public.time_clock_devices
          WHERE id = $1
            AND tenant_id = $2
            AND company_id = $3
            AND is_active = true
          LIMIT 1
        `,
        [deviceId, context.tenant_id, companyId]
      );
      if (!deviceResult.rows[0]) return res.status(400).json({ error: 'time_clock_device_id no valido' });
    }

    const insertResult = await pool.query(
      `
        INSERT INTO public.employee_time_punches (
          id,
          tenant_id,
          company_id,
          employee_id,
          time_clock_device_id,
          punch_datetime,
          punch_key,
          punch_source_id,
          time_punch_status_id,
          notes,
          is_active,
          created_by
        )
        VALUES (
          gen_random_uuid(),
          $1,$2,$3,$4,now(),$5,$6,$7,$8,true,$9
        )
        RETURNING *
      `,
      [
        context.tenant_id,
        companyId,
        context.employee_id,
        deviceId,
        punchKey,
        normalizedSourceId,
        normalizedStatusId,
        notes,
        actor,
      ]
    );

    return res.status(201).json({
      success: true,
      punch: insertResult.rows[0],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.patch('/mark/history/:id', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({
        error: 'No existe empleado asociado al usuario autenticado',
      });
    }

    const punchId = normalizeNullableText(req.params.id);
    if (!punchId) return res.status(400).json({ error: 'id es obligatorio' });

    const actor = getActor(req);
    const notes = req.body?.notes === undefined ? undefined : normalizeNullableText(req.body?.notes);
    const isActive = req.body?.is_active;
    const deviceId = req.body?.time_clock_device_id === undefined ? undefined : normalizeNullableText(req.body?.time_clock_device_id);
    const punchSourceId = req.body?.punch_source_id === undefined ? undefined : normalizeNullableText(req.body?.punch_source_id);
    const statusId = req.body?.time_punch_status_id === undefined ? undefined : normalizeNullableText(req.body?.time_punch_status_id);
    const punchKeyLookupId = req.body?.punch_key_lookup_id === undefined ? undefined : normalizeNullableText(req.body?.punch_key_lookup_id);

    const currentResult = await pool.query(
      `
        SELECT id, company_id
        FROM public.employee_time_punches
        WHERE id = $1
          AND tenant_id = $2
          AND employee_id = $3
        LIMIT 1
      `,
      [punchId, context.tenant_id, context.employee_id]
    );
    const current = currentResult.rows[0];
    if (!current) return res.status(404).json({ error: 'Marcacion no encontrada' });

    if (deviceId !== undefined && deviceId !== null) {
      const deviceResult = await pool.query(
        `
          SELECT id
          FROM public.time_clock_devices
          WHERE id = $1
            AND tenant_id = $2
            AND company_id = $3
            AND is_active = true
          LIMIT 1
        `,
        [deviceId, context.tenant_id, current.company_id]
      );
      if (!deviceResult.rows[0]) return res.status(400).json({ error: 'time_clock_device_id no valido' });
    }

    if (punchSourceId !== undefined && punchSourceId !== null) {
      const sourceResult = await pool.query(
        `
          SELECT id
          FROM public.lookup_values
          WHERE id = $1
            AND lookup_group_id = $2::uuid
            AND is_active = true
            AND (tenant_id IS NULL OR tenant_id = $3::uuid)
          LIMIT 1
        `,
        [punchSourceId, PUNCH_SOURCE_GROUP_ID, context.tenant_id]
      );
      if (!sourceResult.rows[0]) return res.status(400).json({ error: 'punch_source_id no valido' });
    }

    if (statusId !== undefined && statusId !== null) {
      const statusResult = await pool.query(
        `
          SELECT id
          FROM public.lookup_values
          WHERE id = $1
            AND lookup_group_id = $2::uuid
            AND is_active = true
            AND (tenant_id IS NULL OR tenant_id = $3::uuid)
          LIMIT 1
        `,
        [statusId, TIME_PUNCH_STATUS_GROUP_ID, context.tenant_id]
      );
      if (!statusResult.rows[0]) return res.status(400).json({ error: 'time_punch_status_id no valido' });
    }

    let resolvedPunchKeyValue: number | null = null;
    if (punchKeyLookupId !== undefined && punchKeyLookupId !== null) {
      const movementResult = await pool.query(
        `
          SELECT sort_order
          FROM public.lookup_values
          WHERE id = $1
            AND lookup_group_id = $2::uuid
            AND is_active = true
            AND (tenant_id IS NULL OR tenant_id = $3::uuid)
          LIMIT 1
        `,
        [punchKeyLookupId, PUNCH_KEY_GROUP_ID, context.tenant_id]
      );
      const movement = movementResult.rows[0];
      if (!movement || !Number.isFinite(Number(movement.sort_order))) {
        return res.status(400).json({ error: 'punch_key_lookup_id no valido' });
      }
      resolvedPunchKeyValue = Math.trunc(Number(movement.sort_order));
    }

    const updates: string[] = [];
    const params: any[] = [punchId, context.tenant_id, context.employee_id];
    let paramIndex = params.length + 1;

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(notes);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(Boolean(isActive));
    }
    if (deviceId !== undefined) {
      updates.push(`time_clock_device_id = $${paramIndex++}`);
      params.push(deviceId);
    }
    if (punchSourceId !== undefined) {
      updates.push(`punch_source_id = $${paramIndex++}`);
      params.push(punchSourceId);
    }
    if (statusId !== undefined) {
      updates.push(`time_punch_status_id = $${paramIndex++}`);
      params.push(statusId);
    }
    if (resolvedPunchKeyValue !== null) {
      updates.push(`punch_key = $${paramIndex++}`);
      params.push(resolvedPunchKeyValue);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    }

    updates.push(`updated_by = $${paramIndex++}`);
    params.push(actor);
    updates.push('updated_at = now()');

    const result = await pool.query(
      `
        UPDATE public.employee_time_punches
        SET ${updates.join(', ')}
        WHERE id = $1
          AND tenant_id = $2
          AND employee_id = $3
        RETURNING *
      `,
      params
    );

    return res.status(200).json({ success: true, punch: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.delete('/mark/history/:id', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({
        error: 'No existe empleado asociado al usuario autenticado',
      });
    }

    const punchId = normalizeNullableText(req.params.id);
    if (!punchId) return res.status(400).json({ error: 'id es obligatorio' });

    const result = await pool.query(
      `
        DELETE FROM public.employee_time_punches
        WHERE id = $1
          AND tenant_id = $2
          AND employee_id = $3
        RETURNING id
      `,
      [punchId, context.tenant_id, context.employee_id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Marcacion no encontrada' });
    return res.status(200).json({ success: true, deleted_id: result.rows[0].id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/my-punches', async (req: Request, res: Response) => {
  const nextReq = req as Request & { query: any };
  nextReq.query.from = normalizeNullableText(req.query.from) || normalizeNullableText(req.query.date_from) || undefined;
  nextReq.query.to = normalizeNullableText(req.query.to) || normalizeNullableText(req.query.date_to) || undefined;

  try {
    const context = await resolveEmployeeContext(nextReq);
    if (!context) return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });

    const from = normalizeNullableText(nextReq.query.from);
    const to = normalizeNullableText(nextReq.query.to);
    const limitRaw = Number(nextReq.query.limit ?? 5);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, Math.trunc(limitRaw))) : 5;

    const params: any[] = [context.tenant_id, context.employee_id];
    let whereExtra = '';
    if (from && isIsoDate(from)) {
      params.push(`${from}T00:00:00`);
      whereExtra += ` AND p.punch_datetime >= $${params.length}::timestamptz`;
    }
    if (to && isIsoDate(to)) {
      params.push(`${to}T23:59:59`);
      whereExtra += ` AND p.punch_datetime <= $${params.length}::timestamptz`;
    }
    params.push(limit);

    const result = await pool.query(
      `
        SELECT
          p.id,
          p.punch_datetime,
          p.punch_key,
          p.notes,
          src.lookup_key AS source_code,
          src.lookup_label AS source_name,
          st.lookup_label AS status_name
        FROM public.employee_time_punches p
        LEFT JOIN public.lookup_values src ON src.id = p.punch_source_id
        LEFT JOIN public.lookup_values st ON st.id = p.time_punch_status_id
        WHERE p.tenant_id = $1
          AND p.employee_id = $2
          ${whereExtra}
        ORDER BY p.punch_datetime DESC
        LIMIT $${params.length}
      `,
      params
    );
    return res.status(200).json({ ok: true, data: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/requests/catalogs', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const [justificationsResult, attendanceEventsResult, statusesResult, transactionTypesResult] = await Promise.all([
      pool.query(
        `
          SELECT
            jt.id,
            jt.justification_name,
            jt.justification_short_name,
            jt.attendance_event_id,
            ae.event_name,
            ae.event_short_name
          FROM public.justification_types jt
          LEFT JOIN public.attendance_events ae
            ON ae.id = jt.attendance_event_id
          WHERE jt.tenant_id = $1
            AND jt.is_active = true
          ORDER BY jt.justification_name ASC
        `,
        [context.tenant_id]
      ),
      pool.query(
        `
          SELECT
            id,
            event_name,
            event_short_name
          FROM public.attendance_events
          WHERE tenant_id = $1
            AND is_active = true
          ORDER BY event_name ASC
        `,
        [context.tenant_id]
      ),
      pool.query(
        `
          SELECT
            id,
            lookup_key,
            lookup_label,
            sort_order
          FROM public.lookup_values
          WHERE lookup_group_id = $1::uuid
            AND is_active = true
            AND (tenant_id IS NULL OR tenant_id = $2::uuid)
          ORDER BY sort_order ASC, lookup_label ASC
        `,
        [REQUEST_STATUS_GROUP_ID, context.tenant_id]
      ),
      pool.query(
        `
          SELECT
            lv.id,
            lv.lookup_key,
            lv.lookup_label,
            lv.lookup_short_label,
            lv.sort_order
          FROM public.lookup_values lv
          INNER JOIN public.lookup_groups lg
            ON lg.id = lv.lookup_group_id
          WHERE lg.lookup_group_key = $1
            AND lv.is_active = true
            AND (lv.tenant_id IS NULL OR lv.tenant_id = $2::uuid)
          ORDER BY lv.sort_order ASC, lv.lookup_label ASC
        `,
        [ABSENCE_TRANSACTION_TYPE_GROUP_KEY, context.tenant_id]
      ),
    ]);

    return res.status(200).json({
      success: true,
      employee: {
        id: context.employee_id,
        company_id: context.company_id,
        company_name: context.company_name,
      },
      justification_types: justificationsResult.rows,
      attendance_events: attendanceEventsResult.rows,
      request_statuses: statusesResult.rows,
      transaction_types: transactionTypesResult.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/requests', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const from = normalizeNullableText(req.query.from);
    const to = normalizeNullableText(req.query.to);
    const statusId = normalizeNullableText(req.query.request_status_id);
    const includeInactive = String(req.query.include_inactive || '').toLowerCase() === 'true';

    const params: any[] = [context.tenant_id, context.employee_id, includeInactive];
    let whereExtra = '';

    if (from) {
      if (!isIsoDate(from)) return res.status(400).json({ error: 'from debe tener formato YYYY-MM-DD' });
      params.push(`${from}T00:00:00`);
      whereExtra += ` AND r.start_datetime >= $${params.length}::timestamptz`;
    }
    if (to) {
      if (!isIsoDate(to)) return res.status(400).json({ error: 'to debe tener formato YYYY-MM-DD' });
      params.push(`${to}T23:59:59`);
      whereExtra += ` AND r.end_datetime <= $${params.length}::timestamptz`;
    }
    if (statusId) {
      params.push(statusId);
      whereExtra += ` AND r.request_status_id = $${params.length}::uuid`;
    }

    const result = await pool.query(
      `
        SELECT
          r.id,
          r.company_id,
          c.company_name,
          r.employee_id,
          r.justification_type_id,
          jt.justification_name,
          jt.justification_short_name,
          r.attendance_event_id,
          ae.event_name,
          ae.event_short_name,
          r.transaction_type_id,
          trx.lookup_key AS transaction_type_key,
          trx.lookup_label AS transaction_type_label,
          r.start_datetime,
          r.end_datetime,
          r.start_time,
          r.end_time,
          r.notes,
          r.request_status_id,
          rs.lookup_key AS request_status_key,
          rs.lookup_label AS request_status_label,
          r.is_active,
          r.created_at,
          r.updated_at
        FROM public.employee_absence_requests r
        LEFT JOIN public.companies c
          ON c.id = r.company_id
        LEFT JOIN public.justification_types jt
          ON jt.id = r.justification_type_id
        LEFT JOIN public.attendance_events ae
          ON ae.id = r.attendance_event_id
        LEFT JOIN public.lookup_values trx
          ON trx.id = r.transaction_type_id
        LEFT JOIN public.lookup_values rs
          ON rs.id = r.request_status_id
        WHERE r.tenant_id = $1
          AND r.employee_id = $2
          AND ($3::boolean = true OR r.is_active = true)
          ${whereExtra}
        ORDER BY r.created_at DESC, r.start_datetime DESC
      `,
      params
    );

    return res.status(200).json({
      success: true,
      requests: result.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.post('/requests', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const justificationTypeId = normalizeNullableText(req.body?.justification_type_id);
    const attendanceEventId = normalizeNullableText(req.body?.attendance_event_id);
    const transactionTypeId = normalizeNullableText(req.body?.transaction_type_id);
    const startDateTime = normalizeNullableText(req.body?.start_datetime);
    const endDateTime = normalizeNullableText(req.body?.end_datetime);
    const startTime = normalizeNullableText(req.body?.start_time);
    const endTime = normalizeNullableText(req.body?.end_time);
    const notes = normalizeNullableText(req.body?.notes);
    const actor = getActor(req);

    if (!context.company_id) {
      return res.status(400).json({ error: 'El empleado no tiene empresa activa asignada' });
    }
    if (!justificationTypeId) return res.status(400).json({ error: 'justification_type_id es obligatorio' });
    if (!attendanceEventId) return res.status(400).json({ error: 'attendance_event_id es obligatorio' });
    if (!transactionTypeId) return res.status(400).json({ error: 'transaction_type_id es obligatorio' });
    if (!startDateTime || !isValidDateTime(startDateTime)) return res.status(400).json({ error: 'start_datetime invalido' });
    if (!endDateTime || !isValidDateTime(endDateTime)) return res.status(400).json({ error: 'end_datetime invalido' });
    if (new Date(startDateTime).getTime() > new Date(endDateTime).getTime()) {
      return res.status(400).json({ error: 'El rango de fechas es invalido' });
    }

    const [justificationResult, eventResult] = await Promise.all([
      pool.query(
        `
          SELECT id, attendance_event_id
          FROM public.justification_types
          WHERE id = $1
            AND tenant_id = $2
            AND is_active = true
          LIMIT 1
        `,
        [justificationTypeId, context.tenant_id]
      ),
      pool.query(
        `
          SELECT id
          FROM public.attendance_events
          WHERE id = $1
            AND tenant_id = $2
            AND is_active = true
          LIMIT 1
        `,
        [attendanceEventId, context.tenant_id]
      ),
    ]);

    const justification = justificationResult.rows[0];
    if (!justification) return res.status(400).json({ error: 'justification_type_id no valido' });
    if (!eventResult.rows[0]) return res.status(400).json({ error: 'attendance_event_id no valido' });

    if (justification.attendance_event_id && justification.attendance_event_id !== attendanceEventId) {
      return res.status(400).json({
        error: 'El tipo de justificacion seleccionado no corresponde al evento indicado',
      });
    }

    const isValidTransactionType = await isLookupValueInGroupByKey(
      transactionTypeId,
      ABSENCE_TRANSACTION_TYPE_GROUP_KEY,
      context.tenant_id
    );
    if (!isValidTransactionType) {
      return res.status(400).json({ error: 'transaction_type_id no valido' });
    }

    const pendingStatusId = await resolveDefaultRequestStatusId(context.tenant_id);
    if (!pendingStatusId) {
      return res.status(400).json({ error: 'No existe estado de solicitud configurado' });
    }

    const insertResult = await pool.query(
      `
        INSERT INTO public.employee_absence_requests (
          id,
          tenant_id,
          company_id,
          employee_id,
          justification_type_id,
          attendance_event_id,
          transaction_type_id,
          start_datetime,
          end_datetime,
          start_time,
          end_time,
          notes,
          request_status_id,
          is_active,
          created_by
        )
        VALUES (
          gen_random_uuid(),
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,$13
        )
        RETURNING *
      `,
      [
        context.tenant_id,
        context.company_id,
        context.employee_id,
        justificationTypeId,
        attendanceEventId,
        transactionTypeId,
        startDateTime,
        endDateTime,
        startTime,
        endTime,
        notes,
        pendingStatusId,
        actor,
      ]
    );

    return res.status(201).json({ success: true, request: insertResult.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.patch('/requests/:id', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const requestId = normalizeNullableText(req.params.id);
    if (!requestId) return res.status(400).json({ error: 'id es obligatorio' });

    const currentResult = await pool.query(
      `
        SELECT
          r.id,
          r.justification_type_id,
          r.attendance_event_id,
          r.transaction_type_id,
          rs.lookup_key AS request_status_key
        FROM public.employee_absence_requests r
        LEFT JOIN public.lookup_values rs
          ON rs.id = r.request_status_id
        WHERE r.id = $1
          AND r.tenant_id = $2
          AND r.employee_id = $3
        LIMIT 1
      `,
      [requestId, context.tenant_id, context.employee_id]
    );
    const current = currentResult.rows[0];
    if (!current) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const statusKey = String(current.request_status_key || '').toUpperCase();
    if (['APPROVED', 'REJECTED', 'CANCELLED', 'CANCELED'].includes(statusKey)) {
      return res.status(400).json({ error: 'La solicitud no puede modificarse en su estado actual' });
    }

    const justificationTypeId = req.body?.justification_type_id === undefined ? undefined : normalizeNullableText(req.body?.justification_type_id);
    const attendanceEventId = req.body?.attendance_event_id === undefined ? undefined : normalizeNullableText(req.body?.attendance_event_id);
    const transactionTypeId = req.body?.transaction_type_id === undefined ? undefined : normalizeNullableText(req.body?.transaction_type_id);
    const startDateTime = req.body?.start_datetime === undefined ? undefined : normalizeNullableText(req.body?.start_datetime);
    const endDateTime = req.body?.end_datetime === undefined ? undefined : normalizeNullableText(req.body?.end_datetime);
    const startTime = req.body?.start_time === undefined ? undefined : normalizeNullableText(req.body?.start_time);
    const endTime = req.body?.end_time === undefined ? undefined : normalizeNullableText(req.body?.end_time);
    const notes = req.body?.notes === undefined ? undefined : normalizeNullableText(req.body?.notes);
    const isActive = req.body?.is_active;

    if (startDateTime && !isValidDateTime(startDateTime)) return res.status(400).json({ error: 'start_datetime invalido' });
    if (endDateTime && !isValidDateTime(endDateTime)) return res.status(400).json({ error: 'end_datetime invalido' });
    if (startDateTime && endDateTime && new Date(startDateTime).getTime() > new Date(endDateTime).getTime()) {
      return res.status(400).json({ error: 'El rango de fechas es invalido' });
    }

    const effectiveAttendanceEventId = attendanceEventId ?? current.attendance_event_id;
    if (effectiveAttendanceEventId) {
      const validation = await pool.query(
        `
          SELECT id
          FROM public.attendance_events
          WHERE id = $1
            AND tenant_id = $2
            AND is_active = true
          LIMIT 1
        `,
        [effectiveAttendanceEventId, context.tenant_id]
      );
      if (!validation.rows[0]) return res.status(400).json({ error: 'attendance_event_id no valido' });
    }

    const effectiveJustificationTypeId = justificationTypeId ?? current.justification_type_id;
    if (effectiveJustificationTypeId) {
      const validation = await pool.query(
        `
          SELECT id, attendance_event_id
          FROM public.justification_types
          WHERE id = $1
            AND tenant_id = $2
            AND is_active = true
          LIMIT 1
        `,
        [effectiveJustificationTypeId, context.tenant_id]
      );
      const justification = validation.rows[0];
      if (!justification) return res.status(400).json({ error: 'justification_type_id no valido' });
      if (justification.attendance_event_id && justification.attendance_event_id !== effectiveAttendanceEventId) {
        return res.status(400).json({
          error: 'El tipo de justificacion seleccionado no corresponde al evento indicado',
        });
      }
    }

    const effectiveTransactionTypeId = transactionTypeId ?? current.transaction_type_id;
    if (effectiveTransactionTypeId) {
      const isValidTransactionType = await isLookupValueInGroupByKey(
        effectiveTransactionTypeId,
        ABSENCE_TRANSACTION_TYPE_GROUP_KEY,
        context.tenant_id
      );
      if (!isValidTransactionType) {
        return res.status(400).json({ error: 'transaction_type_id no valido' });
      }
    }

    const updates: string[] = [];
    const params: any[] = [requestId, context.tenant_id, context.employee_id];
    let paramIndex = params.length + 1;

    if (justificationTypeId !== undefined) {
      updates.push(`justification_type_id = $${paramIndex++}`);
      params.push(justificationTypeId);
    }
    if (attendanceEventId !== undefined) {
      updates.push(`attendance_event_id = $${paramIndex++}`);
      params.push(attendanceEventId);
    }
    if (transactionTypeId !== undefined) {
      updates.push(`transaction_type_id = $${paramIndex++}`);
      params.push(transactionTypeId);
    }
    if (startDateTime !== undefined) {
      updates.push(`start_datetime = $${paramIndex++}`);
      params.push(startDateTime);
    }
    if (endDateTime !== undefined) {
      updates.push(`end_datetime = $${paramIndex++}`);
      params.push(endDateTime);
    }
    if (startTime !== undefined) {
      updates.push(`start_time = $${paramIndex++}`);
      params.push(startTime);
    }
    if (endTime !== undefined) {
      updates.push(`end_time = $${paramIndex++}`);
      params.push(endTime);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(notes);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(Boolean(isActive));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    }

    updates.push(`updated_by = $${paramIndex++}`);
    params.push(getActor(req));
    updates.push('updated_at = now()');

    const result = await pool.query(
      `
        UPDATE public.employee_absence_requests
        SET ${updates.join(', ')}
        WHERE id = $1
          AND tenant_id = $2
          AND employee_id = $3
        RETURNING *
      `,
      params
    );

    return res.status(200).json({ success: true, request: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.patch('/requests/:id/cancel', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const requestId = normalizeNullableText(req.params.id);
    if (!requestId) return res.status(400).json({ error: 'id es obligatorio' });

    const cancelStatusId =
      (await resolveRequestStatusIdByKeys(context.tenant_id, ['CANCELLED', 'CANCELED', 'ANULADO', 'CANCELADO'])) ||
      null;
    if (!cancelStatusId) return res.status(400).json({ error: 'No existe estado de cancelacion configurado' });

    const result = await pool.query(
      `
        UPDATE public.employee_absence_requests
        SET
          request_status_id = $4,
          updated_by = $5,
          updated_at = now()
        WHERE id = $1
          AND tenant_id = $2
          AND employee_id = $3
        RETURNING *
      `,
      [requestId, context.tenant_id, context.employee_id, cancelStatusId, getActor(req)]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Solicitud no encontrada' });
    return res.status(200).json({ success: true, request: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.delete('/requests/:id', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }
    const requestId = normalizeNullableText(req.params.id);
    if (!requestId) return res.status(400).json({ error: 'id es obligatorio' });

    const result = await pool.query(
      `
        DELETE FROM public.employee_absence_requests
        WHERE id = $1
          AND tenant_id = $2
          AND employee_id = $3
        RETURNING id
      `,
      [requestId, context.tenant_id, context.employee_id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Solicitud no encontrada' });
    return res.status(200).json({ success: true, deleted_id: result.rows[0].id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/my-requests', async (req: Request, res: Response) => {
  try {
    const nextReq = req as Request & { query: any };
    nextReq.query.from = normalizeNullableText(req.query.from) || normalizeNullableText(req.query.date_from) || undefined;
    nextReq.query.to = normalizeNullableText(req.query.to) || normalizeNullableText(req.query.date_to) || undefined;

    const context = await resolveEmployeeContext(nextReq);
    if (!context) return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });

    const from = normalizeNullableText(nextReq.query.from);
    const to = normalizeNullableText(nextReq.query.to);
    const params: any[] = [context.tenant_id, context.employee_id];
    let whereExtra = '';
    if (from && isIsoDate(from)) {
      params.push(`${from}T00:00:00`);
      whereExtra += ` AND r.start_datetime >= $${params.length}::timestamptz`;
    }
    if (to && isIsoDate(to)) {
      params.push(`${to}T23:59:59`);
      whereExtra += ` AND r.end_datetime <= $${params.length}::timestamptz`;
    }

    const result = await pool.query(
      `
        SELECT
          r.id,
          r.start_datetime,
          r.end_datetime,
          r.notes,
          trx.lookup_label AS transaction_type_label,
          jt.justification_name,
          ae.event_name,
          rs.lookup_label AS request_status_label
        FROM public.employee_absence_requests r
        LEFT JOIN public.lookup_values trx ON trx.id = r.transaction_type_id
        LEFT JOIN public.justification_types jt ON jt.id = r.justification_type_id
        LEFT JOIN public.attendance_events ae ON ae.id = r.attendance_event_id
        LEFT JOIN public.lookup_values rs ON rs.id = r.request_status_id
        WHERE r.tenant_id = $1
          AND r.employee_id = $2
          ${whereExtra}
        ORDER BY r.created_at DESC
      `,
      params
    );
    return res.status(200).json({ ok: true, data: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

export default router;

