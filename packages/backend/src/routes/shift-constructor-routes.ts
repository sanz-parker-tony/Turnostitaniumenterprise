import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

type ShiftBlockType = 'ORDINARIA' | 'NOCTURNA' | 'EXTRA_50' | 'EXTRA_100' | 'LUNCH' | 'BREAK';

interface InputBlock {
  id?: string;
  block_type: ShiftBlockType | string;
  block_label?: string | null;
  start_minutes: number;
  end_minutes: number;
  surcharge_pct?: number | string | null;
  is_break?: boolean;
  sort_order?: number | null;
  is_active?: boolean;
}

const WORK_BLOCK_TYPES = new Set<ShiftBlockType>(['ORDINARIA', 'NOCTURNA', 'EXTRA_50', 'EXTRA_100']);
const BREAK_BLOCK_TYPES = new Set<ShiftBlockType>(['LUNCH', 'BREAK']);
const ALL_BLOCK_TYPES = new Set<ShiftBlockType>([
  ...Array.from(WORK_BLOCK_TYPES),
  ...Array.from(BREAK_BLOCK_TYPES),
]);


const DEFAULT_SURCHARGE: Record<ShiftBlockType, number> = {
  ORDINARIA: 0,
  NOCTURNA: 25,
  EXTRA_50: 50,
  EXTRA_100: 100,
  LUNCH: 0,
  BREAK: 0,
};

const SHIFT_ICON_KEYS = new Set([
  'Sun',
  'Sunset',
  'Moon',
  'Briefcase',
  'Coffee',
  'BellRing',
  'Siren',
  'Ambulance',
  'Shield',
  'Wrench',
  'Truck',
  'Flame',
]);

const DEFAULT_SHIFT_BG_COLOR = '#F1F5F9';
const DEFAULT_SHIFT_TEXT_COLOR = '#0F172A';
const SHIFT_BG_BY_ICON: Record<string, string> = {
  Sun: '#E3F2FD',
  Sunset: '#FFF3E0',
  Moon: '#EDE7F6',
  Briefcase: '#EEF2F7',
  Coffee: '#F3F4F6',
  BellRing: '#FEE2E2',
  Siren: '#FEE2E2',
  Ambulance: '#EFF6FF',
  Shield: '#ECFEFF',
  Wrench: '#ECFDF5',
  Truck: '#FFFBEB',
  Flame: '#FFF7ED',
};
const SHIFT_TEXT_BY_ICON: Record<string, string> = {
  Sun: '#1E3A8A',
  Sunset: '#9A3412',
  Moon: '#4C1D95',
  Briefcase: '#1F2937',
  Coffee: '#374151',
  BellRing: '#991B1B',
  Siren: '#991B1B',
  Ambulance: '#1E3A8A',
  Shield: '#0E7490',
  Wrench: '#0F766E',
  Truck: '#92400E',
  Flame: '#9A3412',
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
  const row = result.rows[0];
  return row?.tenant_id || null;
}

function getActor(req: Request): string {
  const user = (req as any).user;
  return user?.email || user?.id || 'system';
}

function asInt(value: any, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function asNumber(value: any, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function toStartTimeFromMinutes(startMinutes: number): string {
  const normalized = ((Math.trunc(startMinutes) % 1440) + 1440) % 1440;
  const hh = Math.floor(normalized / 60);
  const mm = normalized % 60;
  return `${pad2(hh)}:${pad2(mm)}:00`;
}

function deriveShiftFields(blocks: ReturnType<typeof normalizeBlock>[]) {
  const workBlocks = blocks
    .filter((block) => !block.is_break)
    .sort((a, b) => a.start_minutes - b.start_minutes);

  const totalWorkMinutes = workBlocks.reduce((sum, block) => sum + (block.end_minutes - block.start_minutes), 0);
  const totalBreakMinutes = blocks
    .filter((block) => block.is_break)
    .reduce((sum, block) => sum + (block.end_minutes - block.start_minutes), 0);
  const totalLunchMinutes = blocks
    .filter((block) => block.block_type === 'LUNCH')
    .reduce((sum, block) => sum + (block.end_minutes - block.start_minutes), 0);

  const startMinutes = workBlocks.length > 0
    ? workBlocks[0].start_minutes
    : blocks[0].start_minutes;

  return {
    totalWorkMinutes,
    totalBreakMinutes,
    totalLunchMinutes,
    startTime: toStartTimeFromMinutes(startMinutes),
  };
}

function generateShiftShortName(shiftName: string): string {
  const cleaned = String(shiftName || '').trim().toUpperCase();
  if (!cleaned) return 'TRN';

  const chunks = cleaned
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (chunks.length === 0) return 'TRN';
  if (chunks.length === 1) return chunks[0].slice(0, 3).padEnd(3, 'X');

  const initials = chunks.map((chunk) => chunk[0]).join('');
  return initials.slice(0, 6);
}

function normalizeShiftIconKey(value: any): string {
  const raw = String(value || '').trim();
  if (!raw) return 'Sun';
  return SHIFT_ICON_KEYS.has(raw) ? raw : 'Sun';
}

function normalizeHexColor(value: any, fallback: string): string {
  const raw = String(value || '').trim();
  const match = raw.match(/^#([0-9a-fA-F]{6})$/);
  return match ? `#${match[1].toUpperCase()}` : fallback;
}

async function resolveDefaultCompanyId(client: any, tenantId: string): Promise<string | null> {
  const companyResult = await client.query(
    `
      SELECT id
      FROM public.companies
      WHERE tenant_id = $1
        AND is_active = true
      ORDER BY company_name ASC
      LIMIT 1
    `,
    [tenantId]
  );
  return companyResult.rows[0]?.id || null;
}

function normalizeBlock(input: InputBlock, index: number) {
  const blockType = String(input.block_type || '')
    .trim()
    .toUpperCase() as ShiftBlockType;

  const isBreak =
    input.is_break === true ||
    BREAK_BLOCK_TYPES.has(blockType);

  const surchargeDefault = DEFAULT_SURCHARGE[blockType] ?? 0;

  return {
    block_type: blockType,
    block_label: input.block_label ? String(input.block_label).trim() : null,
    start_minutes: asInt(input.start_minutes, 0),
    end_minutes: asInt(input.end_minutes, 0),
    surcharge_pct: asNumber(input.surcharge_pct, surchargeDefault),
    is_break: isBreak,
    sort_order: asInt(input.sort_order, (index + 1) * 10),
    is_active: input.is_active !== false,
  };
}

function validateBlocks(blocks: ReturnType<typeof normalizeBlock>[]): string | null {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return 'Debe existir al menos un bloque para el constructor';
  }

  const seenWorkType = new Set<string>();
  const workBlocks: ReturnType<typeof normalizeBlock>[] = [];
  const breakBlocks: ReturnType<typeof normalizeBlock>[] = [];

  for (const block of blocks) {
    if (!ALL_BLOCK_TYPES.has(block.block_type as ShiftBlockType)) {
      return `Tipo de bloque no soportado: ${block.block_type}`;
    }

    if (!Number.isFinite(block.start_minutes) || !Number.isFinite(block.end_minutes)) {
      return 'start_minutes y end_minutes deben ser numéricos';
    }

    if (block.start_minutes < 0 || block.end_minutes > 2880 || block.end_minutes <= block.start_minutes) {
      return 'Rango de bloque inválido. Debe cumplir 0 <= inicio < fin <= 2880';
    }

    if (block.start_minutes % 15 !== 0 || block.end_minutes % 15 !== 0) {
      return 'Los bloques deben estar en múltiplos de 15 minutos';
    }

    const isWorkType = WORK_BLOCK_TYPES.has(block.block_type as ShiftBlockType);
    const isBreakType = BREAK_BLOCK_TYPES.has(block.block_type as ShiftBlockType);

    if (isWorkType && block.is_break) {
      return `El bloque ${block.block_type} no puede marcarse como descanso`;
    }
    if (isBreakType && !block.is_break) {
      return `El bloque ${block.block_type} debe marcarse como descanso`;
    }

    if (isWorkType) {
      if (seenWorkType.has(block.block_type)) {
        return `El tipo de bloque ${block.block_type} solo puede agregarse una vez`;
      }
      seenWorkType.add(block.block_type);
      workBlocks.push(block);
    } else {
      breakBlocks.push(block);
    }
  }

  // No solapamiento en bloques de trabajo
  const sortedWork = [...workBlocks].sort((a, b) => a.start_minutes - b.start_minutes);
  for (let i = 1; i < sortedWork.length; i += 1) {
    if (sortedWork[i].start_minutes < sortedWork[i - 1].end_minutes) {
      return 'Los bloques de jornada laboral no pueden solaparse';
    }
  }

  // No solapamiento entre descansos
  const sortedBreak = [...breakBlocks].sort((a, b) => a.start_minutes - b.start_minutes);
  for (let i = 1; i < sortedBreak.length; i += 1) {
    if (sortedBreak[i].start_minutes < sortedBreak[i - 1].end_minutes) {
      return 'Los bloques de descanso no pueden solaparse entre sí';
    }
  }

  return null;
}

router.get('/catalogs', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const [shiftsResult, constructorsResult] = await Promise.all([
      pool.query(
        `
          SELECT id, shift_name, shift_short_name, shift_icon_key, shift_bg_color, shift_text_color, company_id, payroll_group_id, start_time, work_minutes, lunch_minutes, is_active
          FROM public.shifts
          WHERE tenant_id = $1
          ORDER BY shift_name ASC
        `,
        [tenantId]
      ),
      pool.query(
        `
          SELECT id, shift_id, constructor_name, total_work_minutes, total_break_minutes, updated_at
          FROM public.shift_constructors
          WHERE tenant_id = $1
            AND is_active = true
        `,
        [tenantId]
      ),
    ]);

    const constructorByShift = new Map<string, any>();
    constructorsResult.rows.forEach((row) => {
      constructorByShift.set(row.shift_id, row);
    });

    const shifts = shiftsResult.rows.map((shift) => ({
      ...shift,
      constructor: constructorByShift.get(shift.id) || null,
    }));

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      shifts,
      count: shifts.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/shift/:shiftId', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const shiftId = String(req.params.shiftId || '').trim();
    if (!shiftId) {
      return res.status(400).json({ error: 'shiftId es obligatorio' });
    }

    const shiftResult = await pool.query(
      `
        SELECT id, shift_name, shift_short_name, shift_icon_key, shift_bg_color, shift_text_color, company_id, payroll_group_id, start_time, work_minutes, lunch_minutes, is_active
        FROM public.shifts
        WHERE tenant_id = $1
          AND id = $2
        LIMIT 1
      `,
      [tenantId, shiftId]
    );

    const shift = shiftResult.rows[0];
    if (!shift) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    const constructorResult = await pool.query(
      `
        SELECT id, shift_id, constructor_name, total_work_minutes, total_break_minutes, is_active, created_at, updated_at
        FROM public.shift_constructors
        WHERE tenant_id = $1
          AND shift_id = $2
        LIMIT 1
      `,
      [tenantId, shiftId]
    );
    const constructor = constructorResult.rows[0] || null;

    let blocks: any[] = [];
    if (constructor?.id) {
      const blocksResult = await pool.query(
        `
          SELECT id, block_type, block_label, start_minutes, end_minutes, surcharge_pct, is_break, sort_order, is_active
          FROM public.shift_constructor_blocks
          WHERE tenant_id = $1
            AND constructor_id = $2
            AND is_active = true
          ORDER BY sort_order ASC, start_minutes ASC
        `,
        [tenantId, constructor.id]
      );
      blocks = blocksResult.rows;
    }

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      shift,
      constructor,
      blocks,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.post('/shift', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const shiftName = String(req.body?.shift_name || '').trim();
    if (!shiftName) {
      return res.status(400).json({ error: 'shift_name es obligatorio' });
    }

    const inputBlocks = Array.isArray(req.body?.blocks) ? req.body.blocks : [];
    const normalizedBlocks = inputBlocks.map((block: InputBlock, index: number) => normalizeBlock(block, index));
    const validationError = validateBlocks(normalizedBlocks);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const actor = getActor(req);
    const shiftShortName = String(req.body?.shift_short_name || '').trim().toUpperCase() || generateShiftShortName(shiftName);
    const shiftIconKey = normalizeShiftIconKey(req.body?.shift_icon_key);
    const shiftBgColor = normalizeHexColor(req.body?.shift_bg_color, SHIFT_BG_BY_ICON[shiftIconKey] || DEFAULT_SHIFT_BG_COLOR);
    const shiftTextColor = normalizeHexColor(
      req.body?.shift_text_color,
      SHIFT_TEXT_BY_ICON[shiftIconKey] || DEFAULT_SHIFT_TEXT_COLOR
    );
    const constructorName = String(req.body?.constructor_name || '').trim() || `Constructor ${shiftName}`;

    const companyId = String(req.body?.company_id || '').trim() || await resolveDefaultCompanyId(client, tenantId);
    if (!companyId) {
      return res.status(400).json({ error: 'No existe una compañía activa para crear el turno' });
    }

    const payrollGroupIdRaw = req.body?.payroll_group_id;
    const payrollGroupId =
      payrollGroupIdRaw === null || payrollGroupIdRaw === undefined || String(payrollGroupIdRaw).trim() === ''
        ? null
        : String(payrollGroupIdRaw).trim();

    const derived = deriveShiftFields(normalizedBlocks);
    const entryGrace = asInt(req.body?.entry_grace_minutes, 0);
    const exitGrace = asInt(req.body?.exit_grace_minutes, 0);

    await client.query('BEGIN');

    const shiftInsertResult = await client.query(
      `
        INSERT INTO public.shifts (
          id, tenant_id, company_id, payroll_group_id, shift_name, shift_short_name,
          shift_icon_key, shift_bg_color, shift_text_color, start_time, work_minutes, lunch_minutes, entry_grace_minutes, exit_grace_minutes,
          is_active, created_by
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11, $12, $13, true, $14
        )
        RETURNING id, shift_name, shift_short_name, shift_icon_key, shift_bg_color, shift_text_color, work_minutes, lunch_minutes, start_time
      `,
      [
        tenantId,
        companyId,
        payrollGroupId,
        shiftName,
        shiftShortName,
        shiftIconKey,
        shiftBgColor,
        shiftTextColor,
        derived.startTime,
        derived.totalWorkMinutes,
        derived.totalLunchMinutes,
        entryGrace,
        exitGrace,
        actor,
      ]
    );
    const createdShift = shiftInsertResult.rows[0];

    const constructorInsertResult = await client.query(
      `
        INSERT INTO public.shift_constructors (
          id, tenant_id, shift_id, constructor_name, total_work_minutes, total_break_minutes, is_active, created_by
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, $6)
        RETURNING id
      `,
      [tenantId, createdShift.id, constructorName, derived.totalWorkMinutes, derived.totalBreakMinutes, actor]
    );
    const constructorId = constructorInsertResult.rows[0].id;

    for (const block of normalizedBlocks) {
      await client.query(
        `
          INSERT INTO public.shift_constructor_blocks (
            id, tenant_id, constructor_id, block_type, block_label, start_minutes, end_minutes,
            surcharge_pct, is_break, sort_order, is_active, created_by
          )
          VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11
          )
        `,
        [
          tenantId,
          constructorId,
          block.block_type,
          block.block_label,
          block.start_minutes,
          block.end_minutes,
          block.surcharge_pct,
          block.is_break,
          block.sort_order,
          block.is_active,
          actor,
        ]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Turno y constructor creados correctamente',
      shift: createdShift,
      summary: {
        constructor_name: constructorName,
        total_work_minutes: derived.totalWorkMinutes,
        total_break_minutes: derived.totalBreakMinutes,
        block_count: normalizedBlocks.length,
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

router.put('/shift/:shiftId', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const shiftId = String(req.params.shiftId || '').trim();
    if (!shiftId) {
      return res.status(400).json({ error: 'shiftId es obligatorio' });
    }

    const inputBlocks = Array.isArray(req.body?.blocks) ? req.body.blocks : [];
    const normalizedBlocks = inputBlocks.map((block: InputBlock, index: number) => normalizeBlock(block, index));
    const validationError = validateBlocks(normalizedBlocks);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const shiftResult = await client.query(
      `
        SELECT id, shift_name, shift_short_name, shift_icon_key, shift_bg_color, shift_text_color
        FROM public.shifts
        WHERE tenant_id = $1
          AND id = $2
        LIMIT 1
      `,
      [tenantId, shiftId]
    );
    const shift = shiftResult.rows[0];
    if (!shift) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    const actor = getActor(req);
    const nextShiftName = String(req.body?.shift_name || shift.shift_name || '').trim();
    if (!nextShiftName) {
      return res.status(400).json({ error: 'shift_name es obligatorio' });
    }
    const nextShiftShortName =
      String(req.body?.shift_short_name || '').trim().toUpperCase() ||
      String(shift.shift_short_name || '').trim().toUpperCase() ||
      generateShiftShortName(nextShiftName);
    const nextShiftIconKey = normalizeShiftIconKey(req.body?.shift_icon_key || shift.shift_icon_key);
    const nextShiftBgColor = normalizeHexColor(
      req.body?.shift_bg_color,
      normalizeHexColor(shift.shift_bg_color, SHIFT_BG_BY_ICON[nextShiftIconKey] || DEFAULT_SHIFT_BG_COLOR)
    );
    const nextShiftTextColor = normalizeHexColor(
      req.body?.shift_text_color,
      normalizeHexColor(shift.shift_text_color, SHIFT_TEXT_BY_ICON[nextShiftIconKey] || DEFAULT_SHIFT_TEXT_COLOR)
    );
    const constructorName = String(req.body?.constructor_name || '').trim() || `Constructor ${nextShiftName}`;
    const derived = deriveShiftFields(normalizedBlocks);

    await client.query('BEGIN');

    await client.query(
      `
        UPDATE public.shifts
        SET shift_name = $3,
            shift_short_name = $4,
            shift_icon_key = $5,
            shift_bg_color = $6,
            shift_text_color = $7,
            start_time = $8,
            work_minutes = $9,
            lunch_minutes = $10,
            is_active = true,
            updated_by = $11,
            updated_at = now()
        WHERE id = $1
          AND tenant_id = $2
      `,
      [
        shiftId,
        tenantId,
        nextShiftName,
        nextShiftShortName,
        nextShiftIconKey,
        nextShiftBgColor,
        nextShiftTextColor,
        derived.startTime,
        derived.totalWorkMinutes,
        derived.totalLunchMinutes,
        actor,
      ]
    );

    const constructorResult = await client.query(
      `
        SELECT id
        FROM public.shift_constructors
        WHERE tenant_id = $1
          AND shift_id = $2
        LIMIT 1
      `,
      [tenantId, shiftId]
    );

    let constructorId: string;
    if (constructorResult.rows[0]?.id) {
      constructorId = constructorResult.rows[0].id;
      await client.query(
        `
          UPDATE public.shift_constructors
          SET constructor_name = $3,
              total_work_minutes = $4,
              total_break_minutes = $5,
              is_active = true,
              updated_by = $6,
              updated_at = now()
          WHERE id = $1
            AND tenant_id = $2
        `,
        [constructorId, tenantId, constructorName, derived.totalWorkMinutes, derived.totalBreakMinutes, actor]
      );
    } else {
      const insertConstructorResult = await client.query(
        `
          INSERT INTO public.shift_constructors (
            id, tenant_id, shift_id, constructor_name, total_work_minutes, total_break_minutes, is_active, created_by
          )
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, $6)
          RETURNING id
        `,
        [tenantId, shiftId, constructorName, derived.totalWorkMinutes, derived.totalBreakMinutes, actor]
      );
      constructorId = insertConstructorResult.rows[0].id;
    }

    await client.query(
      `
        DELETE FROM public.shift_constructor_blocks
        WHERE tenant_id = $1
          AND constructor_id = $2
      `,
      [tenantId, constructorId]
    );

    for (const block of normalizedBlocks) {
      await client.query(
        `
          INSERT INTO public.shift_constructor_blocks (
            id, tenant_id, constructor_id, block_type, block_label, start_minutes, end_minutes,
            surcharge_pct, is_break, sort_order, is_active, created_by
          )
          VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11
          )
        `,
        [
          tenantId,
          constructorId,
          block.block_type,
          block.block_label,
          block.start_minutes,
          block.end_minutes,
          block.surcharge_pct,
          block.is_break,
          block.sort_order,
          block.is_active,
          actor,
        ]
      );
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Constructor de turno guardado correctamente',
      summary: {
        shift_name: nextShiftName,
        shift_short_name: nextShiftShortName,
        shift_icon_key: nextShiftIconKey,
        shift_bg_color: nextShiftBgColor,
        shift_text_color: nextShiftTextColor,
        constructor_name: constructorName,
        total_work_minutes: derived.totalWorkMinutes,
        total_break_minutes: derived.totalBreakMinutes,
        block_count: normalizedBlocks.length,
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
