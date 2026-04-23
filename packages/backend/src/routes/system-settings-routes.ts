/**
 * system-settings-routes.ts
 * Turnos Titanium Enterprise
 * 
 * Rutas para gestión de Parámetros del Sistema (system_settings)
 * Ubicación: Mantenimiento → Parámetros
 */

import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';

const router = Router();

// ============================================================================
// GET /system-settings - Listar todos los parámetros
// ============================================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const Postgres = createDbClient(
      process.env.Postgres_URL || '',
      process.env.Postgres_SERVICE_ROLE_KEY || ''
    );

    // Query principal con JOINs para obtener labels
    const { data: settings, error } = await Postgres
      .from('system_settings')
      .select(`
        *,
        value_type:lookup_values!system_settings_value_type_id_fkey(lookup_key, lookup_label),
        allowed_lookup_group:lookup_groups!system_settings_allowed_lookup_group_id_fkey(group_key, group_name)
      `)
      .order('setting_short_key', { ascending: true });

    if (error) {
      console.error('[SYSTEM-SETTINGS] Error cargando parámetros:', error);
      return res.status(500).json({ error: error.message });
    }

    // Transformar datos para incluir labels desnormalizados
    const settingsWithLabels = (settings || []).map((setting: any) => ({
      ...setting,
      value_type_key: setting.value_type?.lookup_key || null,
      value_type_label: setting.value_type?.lookup_label || null,
      allowed_lookup_group_key: setting.allowed_lookup_group?.group_key || null,
      allowed_lookup_group_name: setting.allowed_lookup_group?.group_name || null,
    }));

    return res.status(200).json({
      success: true,
      settings: settingsWithLabels,
      count: settingsWithLabels.length,
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
    const id = req.params.id;
    
    const Postgres = createDbClient(
      process.env.Postgres_URL || '',
      process.env.Postgres_SERVICE_ROLE_KEY || ''
    );

    const { data: setting, error } = await Postgres
      .from('system_settings')
      .select(`
        *,
        value_type:lookup_values!system_settings_value_type_id_fkey(lookup_key, lookup_label),
        allowed_lookup_group:lookup_groups!system_settings_allowed_lookup_group_id_fkey(group_key, group_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[SYSTEM-SETTINGS] Error cargando parámetro:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!setting) {
      return res.status(404).json({ error: 'Parámetro no encontrado' });
    }

    return res.status(200).json({
      success: true,
      setting: {
        ...setting,
        value_type_label: setting.value_type?.lookup_label || null,
        allowed_lookup_group_name: setting.allowed_lookup_group?.group_name || null,
      },
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

