/**
 * system-settings-routes.ts
 * Turnos Titanium Enterprise
 * 
 * Rutas para gestión de Parámetros del Sistema (system_settings)
 * Ubicación: Mantenimiento → Parámetros
 */

import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';
import { pool } from '../lib/db.js';

const router = Router();

async function requireSystemAdminRole(req: Request, res: Response): Promise<boolean> {
  try {
    const authUserId = String((req as any)?.user?.id || '').trim();
    if (!authUserId) {
      res.status(401).json({ error: 'No autenticado' });
      return false;
    }

    const result = await pool.query(
      `
        SELECT 1
        FROM users u
        JOIN user_roles ur
          ON ur.user_id = u.id
         AND ur.tenant_id = u.tenant_id
         AND ur.is_active = true
        JOIN roles r
          ON r.id = ur.role_id
         AND r.is_active = true
        WHERE u.auth_user_id = $1
          AND u.is_active = true
          AND r.role_key = 'SYSTEM_ADMIN'
        LIMIT 1
      `,
      [authUserId]
    );

    if (!result.rows.length) {
      res.status(403).json({ error: 'Solo SYSTEM_ADMIN puede gestionar system_settings' });
      return false;
    }

    return true;
  } catch (error) {
    console.error('[SYSTEM-SETTINGS] Error validando rol SYSTEM_ADMIN:', error);
    res.status(500).json({ error: 'Error validando permisos' });
    return false;
  }
}

// ============================================================================
// GET /system-settings - Listar todos los parámetros
// ============================================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    if (!(await requireSystemAdminRole(req, res))) return;

    const result = await pool.query(`
      SELECT
        ss.*,
        value_type.lookup_key AS value_type_key,
        value_type.lookup_label AS value_type_label,
        allowed_group.lookup_group_key AS allowed_lookup_group_key,
        allowed_group.lookup_group_label AS allowed_lookup_group_name
      FROM public.system_settings ss
      JOIN public.lookup_values value_type
        ON value_type.id = ss.value_type_id
      LEFT JOIN public.lookup_groups allowed_group
        ON allowed_group.id = ss.allowed_lookup_group_id
      ORDER BY ss.setting_short_key ASC
    `);

    return res.status(200).json({
      success: true,
      settings: result.rows,
      count: result.rows.length,
    });

  } catch (err) {
    console.error('[SYSTEM-SETTINGS] Error en GET /:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================================
// GET /system-settings/:id - Obtener un parámetro específico
// ============================================================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!(await requireSystemAdminRole(req, res))) return;

    const id = req.params.id;
    const result = await pool.query(
      `
        SELECT
          ss.*,
          value_type.lookup_key AS value_type_key,
          value_type.lookup_label AS value_type_label,
          allowed_group.lookup_group_key AS allowed_lookup_group_key,
          allowed_group.lookup_group_label AS allowed_lookup_group_name
        FROM public.system_settings ss
        JOIN public.lookup_values value_type
          ON value_type.id = ss.value_type_id
        LEFT JOIN public.lookup_groups allowed_group
          ON allowed_group.id = ss.allowed_lookup_group_id
        WHERE ss.id = $1::uuid
        LIMIT 1
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Parámetro no encontrado' });
    }

    return res.status(200).json({
      success: true,
      setting: result.rows[0],
    });

  } catch (err) {
    console.error('[SYSTEM-SETTINGS] Error en GET /:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================================
// POST /system-settings - Crear nuevo parámetro
// ============================================================================

router.post('/', async (req: Request, res: Response) => {
  try {
    if (!(await requireSystemAdminRole(req, res))) return;

    const body = req.body;
    const {
      setting_key,
      setting_name,
      setting_short_key,
      value_type_id,
      default_value,
      description,
      allowed_lookup_group_id,
      is_active = true,
    } = body;

    // Validaciones
    if (!setting_key || !setting_name || !setting_short_key || !value_type_id) {
      return res.status(400).json({ 
        error: 'Campos obligatorios: setting_key, setting_name, setting_short_key, value_type_id' 
      });
    }

    // Validar formato de setting_key (A-Z, 0-9, _ únicamente, mínimo 2 caracteres)
    if (!/^[A-Z0-9_]+$/.test(setting_key) || setting_key.length < 2) {
      return res.status(400).json({ 
        error: 'setting_key debe contener solo A-Z, 0-9 y _ (mínimo 2 caracteres)' 
      });
    }

    const Postgres = createDbClient(
      process.env.Postgres_URL || '',
      process.env.Postgres_SERVICE_ROLE_KEY || ''
    );

    // Verificar unicidad de setting_key
    const { data: existing } = await Postgres
      .from('system_settings')
      .select('id')
      .eq('setting_key', setting_key.toUpperCase())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Ya existe un parámetro con esa clave' });
    }

    // Insertar nuevo parámetro
    const { data: newSetting, error } = await Postgres
      .from('system_settings')
      .insert({
        setting_key: setting_key.toUpperCase(),
        setting_name,
        setting_short_key: setting_short_key.toUpperCase(),
        value_type_id,
        default_value: default_value || null,
        description: description || null,
        allowed_lookup_group_id: allowed_lookup_group_id || null,
        is_active,
        created_by: 'system',
      })
      .select()
      .single();

    if (error) {
      console.error('[SYSTEM-SETTINGS] Error creando parámetro:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({
      success: true,
      setting: newSetting,
      message: 'Parámetro creado exitosamente',
    });

  } catch (err) {
    console.error('[SYSTEM-SETTINGS] Error en POST /:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================================
// PUT /system-settings/:id - Actualizar parámetro
// ============================================================================

router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!(await requireSystemAdminRole(req, res))) return;

    const id = req.params.id;
    const body = req.body;
    const {
      setting_key,
      setting_name,
      setting_short_key,
      value_type_id,
      default_value,
      description,
      allowed_lookup_group_id,
      is_active,
    } = body;

    // Validar formato de setting_key si se está actualizando
    if (setting_key && (!/^[A-Z0-9_]+$/.test(setting_key) || setting_key.length < 2)) {
      return res.status(400).json({ 
        error: 'setting_key debe contener solo A-Z, 0-9 y _ (mínimo 2 caracteres)' 
      });
    }

    const Postgres = createDbClient(
      process.env.Postgres_URL || '',
      process.env.Postgres_SERVICE_ROLE_KEY || ''
    );

    // Verificar que el parámetro existe
    const { data: existing } = await Postgres
      .from('system_settings')
      .select('setting_key')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ error: 'Parámetro no encontrado' });
    }

    // Si se cambia setting_key, verificar unicidad
    if (setting_key && setting_key.toUpperCase() !== existing.setting_key) {
      const { data: duplicate } = await Postgres
        .from('system_settings')
        .select('id')
        .eq('setting_key', setting_key.toUpperCase())
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        return res.status(409).json({ error: 'Ya existe un parámetro con esa clave' });
      }
    }

    // Actualizar parámetro
    const updateData: any = {
      updated_by: 'system',
      updated_at: new Date().toISOString(),
    };

    if (setting_key !== undefined) updateData.setting_key = setting_key.toUpperCase();
    if (setting_name !== undefined) updateData.setting_name = setting_name;
    if (setting_short_key !== undefined) updateData.setting_short_key = setting_short_key.toUpperCase();
    if (value_type_id !== undefined) updateData.value_type_id = value_type_id;
    if (default_value !== undefined) updateData.default_value = default_value || null;
    if (description !== undefined) updateData.description = description || null;
    if (allowed_lookup_group_id !== undefined) updateData.allowed_lookup_group_id = allowed_lookup_group_id || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedSetting, error } = await Postgres
      .from('system_settings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SYSTEM-SETTINGS] Error actualizando parámetro:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      setting: updatedSetting,
      message: 'Parámetro actualizado exitosamente',
    });

  } catch (err) {
    console.error('[SYSTEM-SETTINGS] Error en PUT /:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================================
// PATCH /system-settings/:id/status - Activar/Desactivar parámetro
// ============================================================================

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    if (!(await requireSystemAdminRole(req, res))) return;

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

    const { data: updatedSetting, error } = await Postgres
      .from('system_settings')
      .update({
        is_active,
        updated_by: 'system',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SYSTEM-SETTINGS] Error actualizando estado:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!updatedSetting) {
      return res.status(404).json({ error: 'Parámetro no encontrado' });
    }

    return res.status(200).json({
      success: true,
      setting: updatedSetting,
      message: `Parámetro ${is_active ? 'activado' : 'desactivado'} exitosamente`,
    });

  } catch (err) {
    console.error('[SYSTEM-SETTINGS] Error en PATCH /:id/status:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;

