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

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const includeInactive = String(req.query.include_inactive || '').toLowerCase() === 'true';

    const result = await pool.query(
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
        ORDER BY is_active DESC, pattern_name ASC
      `,
      [tenantId, includeInactive]
    );

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      work_patterns: result.rows,
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

    const duplicate = await pool.query(
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
      return res.status(409).json({ error: `Ya existe un patrón con código ${shortName}` });
    }

    const result = await pool.query(
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
        asInt(req.body.cycle_length_days),
        asInt(req.body.work_days_per_cycle),
        asInt(req.body.rest_days_per_cycle),
        asInt(req.body.daily_work_minutes),
        asInt(req.body.weekly_work_minutes_target),
        req.body.is_flexible !== false,
        req.body.is_active !== false,
        actor,
      ]
    );

    return res.status(201).json({
      success: true,
      work_pattern: result.rows[0],
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

    const duplicate = await pool.query(
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
      return res.status(409).json({ error: `Ya existe un patrón con código ${shortName}` });
    }

    const result = await pool.query(
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
        asInt(req.body.cycle_length_days),
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

    return res.status(200).json({
      success: true,
      work_pattern: result.rows[0],
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

