import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

type WorkPatternShiftInput = {
  shift_id: string;
  sequence_number: number;
  cycle_day_number: number;
};

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

function asInt(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function validatePayload(payload: any): string | null {
  const patternName = String(payload?.pattern_name || '').trim();
  const shortName = String(payload?.pattern_short_name || '').trim();

  if (!patternName) return 'pattern_name es obligatorio';
  if (!shortName) return 'pattern_short_name es obligatorio';

  const cycleLength = asInt(payload?.cycle_length_days);
  const workDays = asInt(payload?.work_days_per_cycle);
  const restDays = asInt(payload?.rest_days_per_cycle);
  const dailyWork = asInt(payload?.daily_work_minutes);
  const weeklyTarget = asInt(payload?.weekly_work_minutes_target);

  if (cycleLength <= 0) return 'cycle_length_days debe ser mayor a 0';
  if (workDays < 0) return 'work_days_per_cycle no puede ser negativo';
  if (restDays < 0) return 'rest_days_per_cycle no puede ser negativo';
  if (workDays + restDays !== cycleLength) {
    return 'cycle_length_days debe ser igual a work_days_per_cycle + rest_days_per_cycle';
  }
  if (dailyWork < 0) return 'daily_work_minutes no puede ser negativo';
  if (weeklyTarget < 0) return 'weekly_work_minutes_target no puede ser negativo';

  return null;
}

function normalizePatternShifts(payload: any, cycleLengthDays: number): { items: WorkPatternShiftInput[]; error: string | null } {
  const raw = Array.isArray(payload?.pattern_shifts) ? payload.pattern_shifts : [];
  const items: WorkPatternShiftInput[] = [];
  const sequenceNumbers = new Set<number>();
  const cycleDayNumbers = new Set<number>();

  for (let index = 0; index < raw.length; index += 1) {
    const row = raw[index] || {};
    const shiftId = String(row.shift_id || '').trim();
    const sequenceNumber = asInt(row.sequence_number || index + 1);
    const cycleDayNumber = asInt(row.cycle_day_number);

    if (!shiftId) {
      return { items: [], error: `El turno en la fila ${index + 1} es obligatorio` };
    }
    if (sequenceNumber <= 0) {
      return { items: [], error: `sequence_number debe ser mayor a 0 (fila ${index + 1})` };
    }
    if (cycleDayNumber <= 0) {
      return { items: [], error: `cycle_day_number debe ser mayor a 0 (fila ${index + 1})` };
    }
    if (cycleLengthDays > 0 && cycleDayNumber > cycleLengthDays) {
      return { items: [], error: `cycle_day_number ${cycleDayNumber} excede cycle_length_days ${cycleLengthDays}` };
    }
    if (sequenceNumbers.has(sequenceNumber)) {
      return { items: [], error: `sequence_number repetido: ${sequenceNumber}` };
    }
    if (cycleDayNumbers.has(cycleDayNumber)) {
      return { items: [], error: `cycle_day_number repetido: ${cycleDayNumber}` };
    }

    sequenceNumbers.add(sequenceNumber);
    cycleDayNumbers.add(cycleDayNumber);
    items.push({
      shift_id: shiftId,
      sequence_number: sequenceNumber,
      cycle_day_number: cycleDayNumber,
    });
  }

  return { items, error: null };
}

async function replacePatternShifts(
  client: any,
  tenantId: string,
  workPatternId: string,
  actor: string,
  items: WorkPatternShiftInput[]
): Promise<void> {
  await client.query(
    `
      DELETE FROM public.work_pattern_shifts
      WHERE tenant_id = $1
        AND work_pattern_id = $2
    `,
    [tenantId, workPatternId]
  );

  if (items.length === 0) return;

  const shiftIds = items.map((item) => item.shift_id);
  const sequenceNumbers = items.map((item) => item.sequence_number);
  const cycleDayNumbers = items.map((item) => item.cycle_day_number);

  const validShifts = await client.query(
    `
      SELECT id
      FROM public.shifts
      WHERE tenant_id = $1
        AND id = ANY($2::uuid[])
        AND is_active = true
    `,
    [tenantId, shiftIds]
  );

  if (validShifts.rowCount !== new Set(shiftIds).size) {
    throw new Error('Uno o más turnos no existen o están inactivos para este tenant');
  }

  await client.query(
    `
      INSERT INTO public.work_pattern_shifts (
        id,
        tenant_id,
        work_pattern_id,
        shift_id,
        sequence_number,
        cycle_day_number,
        is_active,
        created_by
      )
      SELECT
        gen_random_uuid(),
        $1,
        $2,
        data.shift_id,
        data.sequence_number,
        data.cycle_day_number,
        true,
        $3
      FROM unnest($4::uuid[], $5::int[], $6::int[]) AS data(shift_id, sequence_number, cycle_day_number)
    `,
    [tenantId, workPatternId, actor, shiftIds, sequenceNumbers, cycleDayNumbers]
  );
}

async function fetchPatternShifts(tenantId: string, workPatternId: string) {
  const result = await pool.query(
    `
      SELECT
        wps.id,
        wps.shift_id,
        wps.sequence_number,
        wps.cycle_day_number,
        wps.is_active,
        s.shift_name,
        s.shift_short_name
      FROM public.work_pattern_shifts wps
      INNER JOIN public.shifts s
        ON s.id = wps.shift_id
       AND s.tenant_id = wps.tenant_id
      WHERE wps.tenant_id = $1
        AND wps.work_pattern_id = $2
        AND wps.is_active = true
      ORDER BY wps.sequence_number ASC
    `,
    [tenantId, workPatternId]
  );
  return result.rows;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const includeInactive = String(req.query.include_inactive || '').toLowerCase() === 'true';

    const [patternsResult, shiftsResult, shiftCatalogResult] = await Promise.all([
      pool.query(
        `
          SELECT
            id,
            tenant_id,
            pattern_name,
            pattern_short_name,
            cycle_length_days,
            work_days_per_cycle,
            rest_days_per_cycle,
            daily_work_minutes,
            weekly_work_minutes_target,
            is_flexible,
            is_active,
            created_by,
            created_at,
            updated_by,
            updated_at
          FROM public.work_patterns
          WHERE tenant_id = $1
            AND ($2::boolean = true OR is_active = true)
          ORDER BY pattern_name ASC, id ASC
        `,
        [tenantId, includeInactive]
      ),
      pool.query(
        `
          SELECT
            wps.id,
            wps.work_pattern_id,
            wps.shift_id,
            wps.sequence_number,
            wps.cycle_day_number,
            wps.is_active,
            s.shift_name,
            s.shift_short_name
          FROM public.work_pattern_shifts wps
          INNER JOIN public.shifts s
            ON s.id = wps.shift_id
           AND s.tenant_id = wps.tenant_id
          WHERE wps.tenant_id = $1
            AND wps.is_active = true
          ORDER BY wps.work_pattern_id ASC, wps.sequence_number ASC
        `,
        [tenantId]
      ),
      pool.query(
        `
          SELECT
            id,
            shift_name,
            shift_short_name,
            shift_icon_key,
            shift_bg_color,
            shift_text_color,
            is_active
          FROM public.shifts
          WHERE tenant_id = $1
            AND is_active = true
          ORDER BY shift_name ASC
        `,
        [tenantId]
      ),
    ]);

    const shiftsByPattern = new Map<string, any[]>();
    for (const row of shiftsResult.rows) {
      const list = shiftsByPattern.get(row.work_pattern_id) || [];
      list.push({
        id: row.id,
        shift_id: row.shift_id,
        sequence_number: asInt(row.sequence_number),
        cycle_day_number: asInt(row.cycle_day_number),
        is_active: row.is_active !== false,
        shift_name: row.shift_name,
        shift_short_name: row.shift_short_name,
      });
      shiftsByPattern.set(row.work_pattern_id, list);
    }

    const workPatterns = patternsResult.rows.map((row) => ({
      ...row,
      pattern_shifts: shiftsByPattern.get(row.id) || [],
    }));

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      work_patterns: workPatterns,
      shift_catalog: shiftCatalogResult.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const validation = validatePayload(req.body);
    if (validation) return res.status(400).json({ error: validation });

    const actor = getActor(req);
    const patternName = String(req.body.pattern_name).trim();
    const shortName = String(req.body.pattern_short_name).trim().toUpperCase();
    const cycleLengthDays = asInt(req.body.cycle_length_days);

    const normalizedShifts = normalizePatternShifts(req.body, cycleLengthDays);
    if (normalizedShifts.error) {
      return res.status(400).json({ error: normalizedShifts.error });
    }

    const client = await pool.connect();
    let createdPattern: any = null;

    try {
      await client.query('BEGIN');

      const duplicate = await client.query(
        `
          SELECT id
          FROM public.work_patterns
          WHERE tenant_id = $1
            AND upper(pattern_short_name) = $2
          LIMIT 1
        `,
        [tenantId, shortName]
      );
      if (duplicate.rows[0]?.id) {
        throw new Error(`Ya existe un patrón con código ${shortName}`);
      }

      const result = await client.query(
        `
          INSERT INTO public.work_patterns (
            id,
            tenant_id,
            pattern_name,
            pattern_short_name,
            cycle_length_days,
            work_days_per_cycle,
            rest_days_per_cycle,
            daily_work_minutes,
            weekly_work_minutes_target,
            is_flexible,
            is_active,
            created_by
          )
          VALUES (
            gen_random_uuid(),
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
          )
          RETURNING *
        `,
        [
          tenantId,
          patternName,
          shortName,
          cycleLengthDays,
          asInt(req.body.work_days_per_cycle),
          asInt(req.body.rest_days_per_cycle),
          asInt(req.body.daily_work_minutes),
          asInt(req.body.weekly_work_minutes_target),
          req.body.is_flexible !== false,
          req.body.is_active !== false,
          actor,
        ]
      );

      createdPattern = result.rows[0];
      await replacePatternShifts(client, tenantId, createdPattern.id, actor, normalizedShifts.items);
      await client.query('COMMIT');
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error?.message?.includes('Ya existe un patrón con código')) {
        return res.status(409).json({ error: error.message });
      }
      if (error?.message) {
        return res.status(400).json({ error: error.message });
      }
      throw error;
    } finally {
      client.release();
    }

    const patternShifts = await fetchPatternShifts(tenantId, createdPattern.id);

    return res.status(201).json({
      success: true,
      work_pattern: {
        ...createdPattern,
        pattern_shifts: patternShifts,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'id es obligatorio' });

    const validation = validatePayload(req.body);
    if (validation) return res.status(400).json({ error: validation });

    const actor = getActor(req);
    const shortName = String(req.body.pattern_short_name).trim().toUpperCase();
    const cycleLengthDays = asInt(req.body.cycle_length_days);

    const normalizedShifts = normalizePatternShifts(req.body, cycleLengthDays);
    if (normalizedShifts.error) {
      return res.status(400).json({ error: normalizedShifts.error });
    }

    const client = await pool.connect();
    let updatedPattern: any = null;

    try {
      await client.query('BEGIN');

      const duplicate = await client.query(
        `
          SELECT id
          FROM public.work_patterns
          WHERE tenant_id = $1
            AND upper(pattern_short_name) = $2
            AND id <> $3
          LIMIT 1
        `,
        [tenantId, shortName, id]
      );
      if (duplicate.rows[0]?.id) {
        throw new Error(`Ya existe un patrón con código ${shortName}`);
      }

      const result = await client.query(
        `
          UPDATE public.work_patterns
          SET
            pattern_name = $3,
            pattern_short_name = $4,
            cycle_length_days = $5,
            work_days_per_cycle = $6,
            rest_days_per_cycle = $7,
            daily_work_minutes = $8,
            weekly_work_minutes_target = $9,
            is_flexible = $10,
            is_active = $11,
            updated_by = $12,
            updated_at = now()
          WHERE id = $1
            AND tenant_id = $2
          RETURNING *
        `,
        [
          id,
          tenantId,
          String(req.body.pattern_name).trim(),
          shortName,
          cycleLengthDays,
          asInt(req.body.work_days_per_cycle),
          asInt(req.body.rest_days_per_cycle),
          asInt(req.body.daily_work_minutes),
          asInt(req.body.weekly_work_minutes_target),
          req.body.is_flexible !== false,
          req.body.is_active !== false,
          actor,
        ]
      );

      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Patrón no encontrado' });
      }

      updatedPattern = result.rows[0];
      await replacePatternShifts(client, tenantId, id, actor, normalizedShifts.items);
      await client.query('COMMIT');
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error?.message?.includes('Ya existe un patrón con código')) {
        return res.status(409).json({ error: error.message });
      }
      if (error?.message) {
        return res.status(400).json({ error: error.message });
      }
      throw error;
    } finally {
      client.release();
    }

    if (!updatedPattern) return;

    const patternShifts = await fetchPatternShifts(tenantId, id);

    return res.status(200).json({
      success: true,
      work_pattern: {
        ...updatedPattern,
        pattern_shifts: patternShifts,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'id es obligatorio' });

    const actor = getActor(req);

    const result = await pool.query(
      `
        UPDATE public.work_patterns
        SET
          is_active = false,
          updated_by = $3,
          updated_at = now()
        WHERE id = $1
          AND tenant_id = $2
        RETURNING id
      `,
      [id, tenantId, actor]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Patrón no encontrado' });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

export default router;
