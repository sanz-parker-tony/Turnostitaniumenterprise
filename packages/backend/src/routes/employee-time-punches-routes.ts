import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';

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

function normalizeNullableText(value: any): string | null {
  if (value === undefined || value === null) return null;
  const next = String(value).trim();
  return next ? next : null;
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

router.get('/catalogs', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const [companiesResult, employeesResult, devicesResult, lookupsResult] = await Promise.all([
      pool.query(
        `
          SELECT id, company_name, company_code
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
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
        )
        RETURNING *
      `,
      [
        tenantId,
        companyId,
        employeeId,
        timeClockDeviceId,
        punchDatetime,
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
          punch_key = $7,
          punch_source_id = $8,
          time_punch_status_id = $9,
          service_ticket_number = $10,
          notes = $11,
          latitud = $12,
          longitud = $13,
          process_run_id = $14,
          is_active = $15,
          updated_by = $16,
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
    return res.status(200).json({ success: true, deleted_id: result.rows[0].id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

export default router;
