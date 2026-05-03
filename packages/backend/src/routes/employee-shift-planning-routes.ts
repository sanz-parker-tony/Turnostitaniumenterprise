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

function isDateIso(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
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

    const [employeesResult, shiftsResult, shiftTypesResult] = await Promise.all([
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
    ]);

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      employees: employeesResult.rows,
      shifts: shiftsResult.rows,
      shift_types: shiftTypesResult.rows,
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
        ORDER BY p.shift_date ASC, p.created_at ASC
      `,
      [tenantId, dateFrom, dateTo]
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

    const shiftsResult = await client.query(
      `
        SELECT id, company_id, shift_name, shift_short_name
        FROM public.shifts
        WHERE tenant_id = $1
          AND is_active = true
      `,
      [tenantId]
    );
    const shiftCompanyById = new Map<string, string>();
    const freeShiftByCompany = new Map<string, string>();
    shiftsResult.rows.forEach((row) => shiftCompanyById.set(row.id, row.company_id));
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
          SELECT id, shift_name, shift_short_name
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
        return found.id;
      }

      const created = await client.query(
        `
          INSERT INTO public.shifts (
            id, tenant_id, company_id, shift_name, shift_short_name, start_time,
            work_minutes, lunch_minutes, entry_grace_minutes, exit_grace_minutes,
            is_active, created_by
          ) VALUES (
            gen_random_uuid(), $1, $2, 'Turno Libre', 'LIB', '00:00',
            0, 0, 0, 0, true, $3
          )
          RETURNING id
        `,
        [tenantId, companyId, actor]
      );

      const freeShiftId = created.rows[0]?.id as string;
      freeShiftByCompany.set(companyId, freeShiftId);
      shiftCompanyById.set(freeShiftId, companyId);
      return freeShiftId;
    };

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

      const companyId =
        (change?.company_id && String(change.company_id).trim()) ||
        (shiftId ? shiftCompanyById.get(shiftId) : null) ||
        employeeCompanyById.get(employeeId);

      if (!companyId) {
        throw new Error(`No se pudo resolver company_id para empleado ${employeeId} en fecha ${shiftDate}`);
      }

      if (!shiftId) {
        shiftId = await ensureFreeShift(companyId);
        freeAssigned += 1;
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
