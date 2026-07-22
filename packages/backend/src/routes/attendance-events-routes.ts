/**
 * attendance-events-routes.ts
 * Turnos Titanium Enterprise
 * 
 * Rutas para gestión de Novedades de Asistencia (attendance_events)
 */

import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';
import { pool } from '../lib/db.js';

const router = Router();

async function resolveTenantId(req: Request): Promise<string | null> {
  const authUserId = String((req as any)?.user?.id || '').trim();
  if (!authUserId) return null;

  const { rows } = await pool.query(
    `SELECT tenant_id
       FROM public.users
      WHERE auth_user_id = $1::uuid
        AND is_active = true
      LIMIT 1`,
    [authUserId]
  );

  return rows[0]?.tenant_id ? String(rows[0].tenant_id) : null;
}

// ============================================================================
// GET /attendance-events - Listar todas las novedades
// ============================================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Usuario sin tenant activo' });

    const { rows: eventsWithLabels } = await pool.query(
      `SELECT
         ae.*,
         transaction_direction.lookup_key AS transaction_direction_key,
         transaction_direction.lookup_label AS transaction_direction_label,
         event_type.lookup_key AS event_type_key,
         event_type.lookup_label AS event_type_label,
         movement.movement_short_name AS movement_code,
         movement.movement_name AS movement_name,
         calculation_method.lookup_key AS calculation_method_key,
         calculation_method.lookup_label AS calculation_method_label
       FROM public.attendance_events ae
       LEFT JOIN public.lookup_values transaction_direction
         ON transaction_direction.id = ae.transaction_direction_id
       LEFT JOIN public.lookup_values event_type
         ON event_type.id = ae.event_type_id
       LEFT JOIN public.attendance_movements movement
         ON movement.id = ae.movement_id
       LEFT JOIN public.lookup_values calculation_method
         ON calculation_method.id = ae.calculation_method_id
       WHERE ae.tenant_id = $1::uuid
       ORDER BY ae.event_short_name`,
      [tenantId]
    );

    return res.status(200).json({
      success: true,
      events: eventsWithLabels,
      count: eventsWithLabels.length,
    });

  } catch (err) {
    console.error('[ATTENDANCE-EVENTS] Error en GET /:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================================
// GET /attendance-events/:id - Obtener una novedad específica
// ============================================================================

// ============================================================================
// GET /attendance-events/catalogs/movements - Catalogo de movimientos
// ============================================================================

router.get('/catalogs/movements', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Usuario sin tenant activo' });
    const { rows: movements } = await pool.query(
      `SELECT id, tenant_id, movement_short_name, movement_name,
              start_key, end_key, start_punch_key_id, end_punch_key_id, is_active
       FROM public.attendance_movements
       WHERE tenant_id = $1::uuid
       ORDER BY movement_short_name`,
      [tenantId]
    );

    return res.status(200).json({
      success: true,
      movements: movements || [],
      count: (movements || []).length,
    });
  } catch (err) {
    console.error('[ATTENDANCE-EVENTS] Error en GET /catalogs/movements:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/catalogs/punch-keys', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Usuario sin tenant activo' });
    const { rows } = await pool.query(
      `SELECT value.id, value.lookup_key, value.lookup_label,
              (value.metadata->>'device_code')::integer AS device_code,
              value.sort_order, value.is_active
       FROM public.lookup_values AS value
       JOIN public.lookup_groups AS group_row
         ON group_row.id = value.lookup_group_id
        AND group_row.lookup_group_key = 'PUNCH_KEY'
        AND group_row.is_active = true
       WHERE value.is_active = true
         AND (value.tenant_id IS NULL OR value.tenant_id = $1::uuid)
         AND COALESCE(value.metadata->>'device_code', '') ~ '^[0-9]+$'
       ORDER BY CASE WHEN value.tenant_id = $1::uuid THEN 0 ELSE 1 END,
                value.sort_order, value.lookup_label`,
      [tenantId]
    );
    return res.status(200).json({ success: true, punch_keys: rows });
  } catch (err) {
    console.error('[ATTENDANCE-EVENTS] Error en GET /catalogs/punch-keys:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

const movementSelectSql = `
  SELECT movement.id, movement.tenant_id, movement.movement_name,
         movement.movement_short_name, movement.start_key, movement.end_key,
         movement.start_punch_key_id, movement.end_punch_key_id,
         movement.is_active, movement.created_by, movement.created_at,
         movement.updated_by, movement.updated_at,
         start_value.lookup_key AS start_lookup_key,
         start_value.lookup_label AS start_lookup_label,
         end_value.lookup_key AS end_lookup_key,
         end_value.lookup_label AS end_lookup_label
  FROM public.attendance_movements AS movement
  JOIN public.lookup_values AS start_value ON start_value.id = movement.start_punch_key_id
  JOIN public.lookup_values AS end_value ON end_value.id = movement.end_punch_key_id
`;

router.get('/movements', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Usuario sin tenant activo' });
    const { rows } = await pool.query(
      `${movementSelectSql}
       WHERE movement.tenant_id = $1::uuid
       ORDER BY movement.movement_name, movement.movement_short_name`,
      [tenantId]
    );
    return res.status(200).json({ success: true, movements: rows });
  } catch (err) {
    console.error('[ATTENDANCE-EVENTS] Error en GET /movements:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/movements', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Usuario sin tenant activo' });
    const name = String(req.body?.movement_name || '').trim();
    const shortName = String(req.body?.movement_short_name || '').trim().toUpperCase();
    const startId = String(req.body?.start_punch_key_id || '').trim();
    const endId = String(req.body?.end_punch_key_id || '').trim();
    const isActive = req.body?.is_active !== false;
    if (!name || !shortName || !startId || !endId) {
      return res.status(400).json({ error: 'Nombre, código, tecla inicial y tecla final son obligatorios' });
    }
    if (!/^[A-Z0-9_]{2,20}$/.test(shortName)) {
      return res.status(400).json({ error: 'El código debe usar 2 a 20 caracteres A-Z, 0-9 o _' });
    }
    const actor = String((req as any)?.user?.id || 'SYSTEM');
    const { rows } = await pool.query(
      `INSERT INTO public.attendance_movements (
         tenant_id, movement_name, movement_short_name,
         start_key, end_key, start_punch_key_id, end_punch_key_id,
         is_active, created_by
       ) VALUES ($1::uuid, $2, $3, 0, 0, $4::uuid, $5::uuid, $6, $7)
       RETURNING id`,
      [tenantId, name, shortName, startId, endId, isActive, actor]
    );
    const result = await pool.query(
      `${movementSelectSql} WHERE movement.id = $1::uuid AND movement.tenant_id = $2::uuid`,
      [rows[0].id, tenantId]
    );
    return res.status(201).json({ success: true, movement: result.rows[0] });
  } catch (err: any) {
    if (err?.code === '23505') return res.status(409).json({ error: 'Ya existe un movimiento con ese código o par de teclas' });
    if (err?.code === '22P02' || err?.code === '23503') return res.status(400).json({ error: 'Las teclas seleccionadas no son válidas' });
    console.error('[ATTENDANCE-EVENTS] Error en POST /movements:', err);
    return res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

router.put('/movements/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Usuario sin tenant activo' });
    const name = String(req.body?.movement_name || '').trim();
    const shortName = String(req.body?.movement_short_name || '').trim().toUpperCase();
    const startId = String(req.body?.start_punch_key_id || '').trim();
    const endId = String(req.body?.end_punch_key_id || '').trim();
    if (!name || !shortName || !startId || !endId) {
      return res.status(400).json({ error: 'Nombre, código, tecla inicial y tecla final son obligatorios' });
    }
    const actor = String((req as any)?.user?.id || 'SYSTEM');
    const { rows } = await pool.query(
      `UPDATE public.attendance_movements
       SET movement_name = $3, movement_short_name = $4,
           start_punch_key_id = $5::uuid, end_punch_key_id = $6::uuid,
           is_active = $7, updated_by = $8, updated_at = now()
       WHERE id = $1::uuid AND tenant_id = $2::uuid
       RETURNING id`,
      [req.params.id, tenantId, name, shortName, startId, endId, req.body?.is_active !== false, actor]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Movimiento no encontrado' });
    const result = await pool.query(
      `${movementSelectSql} WHERE movement.id = $1::uuid AND movement.tenant_id = $2::uuid`,
      [rows[0].id, tenantId]
    );
    return res.status(200).json({ success: true, movement: result.rows[0] });
  } catch (err: any) {
    if (err?.code === '23505') return res.status(409).json({ error: 'Ya existe un movimiento con ese código o par de teclas' });
    if (err?.code === '22P02' || err?.code === '23503') return res.status(400).json({ error: 'Las teclas seleccionadas no son válidas' });
    console.error('[ATTENDANCE-EVENTS] Error en PUT /movements/:id:', err);
    return res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

router.patch('/movements/:id/status', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Usuario sin tenant activo' });
    const actor = String((req as any)?.user?.id || 'SYSTEM');
    const { rows } = await pool.query(
      `UPDATE public.attendance_movements
       SET is_active = $3, updated_by = $4, updated_at = now()
       WHERE id = $1::uuid AND tenant_id = $2::uuid
       RETURNING id, is_active`,
      [req.params.id, tenantId, Boolean(req.body?.is_active), actor]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Movimiento no encontrado' });
    return res.status(200).json({ success: true, movement: rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Usuario sin tenant activo' });

    const { rows } = await pool.query(
      `SELECT
         ae.*,
         transaction_direction.lookup_key AS transaction_direction_key,
         transaction_direction.lookup_label AS transaction_direction_label,
         event_type.lookup_key AS event_type_key,
         event_type.lookup_label AS event_type_label,
         movement.movement_short_name AS movement_code,
         movement.movement_name AS movement_name,
         calculation_method.lookup_key AS calculation_method_key,
         calculation_method.lookup_label AS calculation_method_label
       FROM public.attendance_events ae
       LEFT JOIN public.lookup_values transaction_direction
         ON transaction_direction.id = ae.transaction_direction_id
       LEFT JOIN public.lookup_values event_type
         ON event_type.id = ae.event_type_id
       LEFT JOIN public.attendance_movements movement
         ON movement.id = ae.movement_id
       LEFT JOIN public.lookup_values calculation_method
         ON calculation_method.id = ae.calculation_method_id
       WHERE ae.id = $1::uuid
         AND ae.tenant_id = $2::uuid
       LIMIT 1`,
      [id, tenantId]
    );
    const event = rows[0];

    if (!event) {
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }

    return res.status(200).json({
      success: true,
      event,
    });

  } catch (err) {
    console.error('[ATTENDANCE-EVENTS] Error en GET /:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================================
// POST /attendance-events - Crear nueva novedad
// ============================================================================

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const {
      tenant_id,
      event_name,
      event_short_name,
      tolerance_minutes,
      weight_value,
      transaction_direction_id,
      event_type_id,
      movement_id,
      calculation_method_id,
      external_mapping,
      is_active = true,
    } = body;

    // Validaciones
    if (!event_name || !event_short_name || !tenant_id) {
      return res.status(400).json({ error: 'Campos obligatorios: event_name, event_short_name, tenant_id' });
    }

    if (tolerance_minutes < 0 || weight_value < 0) {
      return res.status(400).json({ error: 'Tolerancia y peso deben ser >= 0' });
    }

    const Postgres = createDbClient(
      process.env.Postgres_URL || '',
      process.env.Postgres_SERVICE_ROLE_KEY || ''
    );

    // Verificar unicidad de event_short_name por tenant
    const { data: existing } = await Postgres
      .from('attendance_events')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('event_short_name', event_short_name.toUpperCase())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Ya existe una novedad con ese código corto' });
    }

    // Insertar nueva novedad
    const { data: newEvent, error } = await Postgres
      .from('attendance_events')
      .insert({
        tenant_id,
        event_name,
        event_short_name: event_short_name.toUpperCase(),
        tolerance_minutes: parseInt(tolerance_minutes),
        weight_value: parseInt(weight_value),
        transaction_direction_id,
        event_type_id,
        movement_id,
        calculation_method_id,
        external_mapping: external_mapping || null,
        is_active,
        created_by: 'system',
      })
      .select()
      .single();

    if (error) {
      console.error('[ATTENDANCE-EVENTS] Error creando novedad:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({
      success: true,
      event: newEvent,
      message: 'Novedad creada exitosamente',
    });

  } catch (err) {
    console.error('[ATTENDANCE-EVENTS] Error en POST /:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================================
// PUT /attendance-events/:id - Actualizar novedad
// ============================================================================

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const {
      event_name,
      event_short_name,
      tolerance_minutes,
      weight_value,
      transaction_direction_id,
      event_type_id,
      movement_id,
      calculation_method_id,
      external_mapping,
      is_active,
    } = body;

    // Validaciones
    if (tolerance_minutes !== undefined && tolerance_minutes < 0) {
      return res.status(400).json({ error: 'Tolerancia debe ser >= 0' });
    }

    if (weight_value !== undefined && weight_value < 0) {
      return res.status(400).json({ error: 'Peso debe ser >= 0' });
    }

    const Postgres = createDbClient(
      process.env.Postgres_URL || '',
      process.env.Postgres_SERVICE_ROLE_KEY || ''
    );

    // Verificar que la novedad existe
    const { data: existing } = await Postgres
      .from('attendance_events')
      .select('tenant_id, event_short_name')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }

    // Si se cambia event_short_name, verificar unicidad
    if (event_short_name && event_short_name.toUpperCase() !== existing.event_short_name) {
      const { data: duplicate } = await Postgres
        .from('attendance_events')
        .select('id')
        .eq('tenant_id', existing.tenant_id)
        .eq('event_short_name', event_short_name.toUpperCase())
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        return res.status(409).json({ error: 'Ya existe una novedad con ese código corto' });
      }
    }

    // Actualizar novedad
    const updateData: any = {
      updated_by: 'system',
      updated_at: new Date().toISOString(),
    };

    if (event_name !== undefined) updateData.event_name = event_name;
    if (event_short_name !== undefined) updateData.event_short_name = event_short_name.toUpperCase();
    if (tolerance_minutes !== undefined) updateData.tolerance_minutes = parseInt(tolerance_minutes);
    if (weight_value !== undefined) updateData.weight_value = parseInt(weight_value);
    if (transaction_direction_id !== undefined) updateData.transaction_direction_id = transaction_direction_id;
    if (event_type_id !== undefined) updateData.event_type_id = event_type_id;
    if (movement_id !== undefined) updateData.movement_id = movement_id;
    if (calculation_method_id !== undefined) updateData.calculation_method_id = calculation_method_id;
    if (external_mapping !== undefined) updateData.external_mapping = external_mapping || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedEvent, error } = await Postgres
      .from('attendance_events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ATTENDANCE-EVENTS] Error actualizando novedad:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      event: updatedEvent,
      message: 'Novedad actualizada exitosamente',
    });

  } catch (err) {
    console.error('[ATTENDANCE-EVENTS] Error en PUT /:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================================
// PATCH /attendance-events/:id/status - Activar/Desactivar novedad
// ============================================================================

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'El campo is_active debe ser booleano' });
    }

    const Postgres = createDbClient(
      process.env.Postgres_URL || '',
      process.env.Postgres_SERVICE_ROLE_KEY || ''
    );

    const { data: updatedEvent, error } = await Postgres
      .from('attendance_events')
      .update({
        is_active,
        updated_by: 'system',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ATTENDANCE-EVENTS] Error actualizando estado:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!updatedEvent) {
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }

    return res.status(200).json({
      success: true,
      event: updatedEvent,
      message: `Novedad ${is_active ? 'activada' : 'desactivada'} exitosamente`,
    });

  } catch (err) {
    console.error('[ATTENDANCE-EVENTS] Error en PATCH /:id/status:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;


