/**
 * system-settings-routes.tsx
 * Turnos Titanium Enterprise
 * 
 * Rutas para gestión de Parámetros del Sistema (system_settings)
 * Ubicación: Mantenimiento → Parámetros
 */

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

// ============================================================================
// GET /system-settings - Listar todos los parámetros
// ============================================================================

app.get('/', async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Query principal con JOINs para obtener labels
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select(`
        *,
        value_type:lookup_values!system_settings_value_type_id_fkey(lookup_key, lookup_label),
        allowed_lookup_group:lookup_groups!system_settings_allowed_lookup_group_id_fkey(group_key, group_name)
      `)
      .order('setting_short_key', { ascending: true });

    if (error) {
      console.error('[SYSTEM-SETTINGS] Error cargando parámetros:', error);
      return c.json({ error: error.message }, 500);
    }

    // Transformar datos para incluir labels desnormalizados
    const settingsWithLabels = (settings || []).map(setting => ({
      ...setting,
      value_type_key: setting.value_type?.lookup_key || null,
      value_type_label: setting.value_type?.lookup_label || null,
      allowed_lookup_group_key: setting.allowed_lookup_group?.group_key || null,
      allowed_lookup_group_name: setting.allowed_lookup_group?.group_name || null,
    }));

    return c.json({
      success: true,
      settings: settingsWithLabels,
      count: settingsWithLabels.length,
    });

  } catch (err) {
    console.error('[SYSTEM-SETTINGS] Error en GET /:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// GET /system-settings/:id - Obtener un parámetro específico
// ============================================================================

app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: setting, error } = await supabase
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
      return c.json({ error: error.message }, 500);
    }

    if (!setting) {
      return c.json({ error: 'Parámetro no encontrado' }, 404);
    }

    return c.json({
      success: true,
      setting: {
        ...setting,
        value_type_label: setting.value_type?.lookup_label || null,
        allowed_lookup_group_name: setting.allowed_lookup_group?.group_name || null,
      },
    });

  } catch (err) {
    console.error('[SYSTEM-SETTINGS] Error en GET /:id:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// POST /system-settings - Crear nuevo parámetro
// ============================================================================

app.post('/', async (c) => {
  try {
    const body = await c.req.json();
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
      return c.json({ 
        error: 'Campos obligatorios: setting_key, setting_name, setting_short_key, value_type_id' 
      }, 400);
    }

    // Validar formato de setting_key (A-Z, 0-9, _ únicamente, mínimo 2 caracteres)
    if (!/^[A-Z0-9_]+$/.test(setting_key) || setting_key.length < 2) {
      return c.json({ 
        error: 'setting_key debe contener solo A-Z, 0-9 y _ (mínimo 2 caracteres)' 
      }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verificar unicidad de setting_key
    const { data: existing } = await supabase
      .from('system_settings')
      .select('id')
      .eq('setting_key', setting_key.toUpperCase())
      .maybeSingle();

    if (existing) {
      return c.json({ error: 'Ya existe un parámetro con esa clave' }, 409);
    }

    // Insertar nuevo parámetro
    const { data: newSetting, error } = await supabase
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
        created_by: 'system', // TODO: Obtener del token
      })
      .select()
      .single();

    if (error) {
      console.error('[SYSTEM-SETTINGS] Error creando parámetro:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({
      success: true,
      setting: newSetting,
      message: 'Parámetro creado exitosamente',
    }, 201);

  } catch (err) {
    console.error('[SYSTEM-SETTINGS] Error en POST /:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// PUT /system-settings/:id - Actualizar parámetro
// ============================================================================

app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
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
      return c.json({ 
        error: 'setting_key debe contener solo A-Z, 0-9 y _ (mínimo 2 caracteres)' 
      }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verificar que el parámetro existe
    const { data: existing } = await supabase
      .from('system_settings')
      .select('setting_key')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return c.json({ error: 'Parámetro no encontrado' }, 404);
    }

    // Si se cambia setting_key, verificar unicidad
    if (setting_key && setting_key.toUpperCase() !== existing.setting_key) {
      const { data: duplicate } = await supabase
        .from('system_settings')
        .select('id')
        .eq('setting_key', setting_key.toUpperCase())
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        return c.json({ error: 'Ya existe un parámetro con esa clave' }, 409);
      }
    }

    // Actualizar parámetro
    const updateData: any = {
      updated_by: 'system', // TODO: Obtener del token
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

    const { data: updatedSetting, error } = await supabase
      .from('system_settings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SYSTEM-SETTINGS] Error actualizando parámetro:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({
      success: true,
      setting: updatedSetting,
      message: 'Parámetro actualizado exitosamente',
    });

  } catch (err) {
    console.error('[SYSTEM-SETTINGS] Error en PUT /:id:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// PATCH /system-settings/:id/status - Activar/Desactivar parámetro
// ============================================================================

app.patch('/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return c.json({ error: 'El campo is_active debe ser booleano' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: updatedSetting, error } = await supabase
      .from('system_settings')
      .update({
        is_active,
        updated_by: 'system', // TODO: Obtener del token
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SYSTEM-SETTINGS] Error actualizando estado:', error);
      return c.json({ error: error.message }, 500);
    }

    if (!updatedSetting) {
      return c.json({ error: 'Parámetro no encontrado' }, 404);
    }

    return c.json({
      success: true,
      setting: updatedSetting,
      message: `Parámetro ${is_active ? 'activado' : 'desactivado'} exitosamente`,
    });

  } catch (err) {
    console.error('[SYSTEM-SETTINGS] Error en PATCH /:id/status:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// GET /catalogs/value-types - Listar tipos de valor (lookup_values)
// ============================================================================

app.get('/catalogs/value-types', async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Obtener lookup_group_id de 'SETTING_VALUE_TYPE'
    const { data: lookupGroup, error: groupError } = await supabase
      .from('lookup_groups')
      .select('id')
      .eq('group_key', 'SETTING_VALUE_TYPE')
      .single();

    if (groupError || !lookupGroup) {
      console.error('[SYSTEM-SETTINGS] Error obteniendo grupo SETTING_VALUE_TYPE:', groupError);
      return c.json({ error: 'Grupo de tipos de valor no encontrado' }, 500);
    }

    const { data: valueTypes, error } = await supabase
      .from('lookup_values')
      .select('*')
      .eq('lookup_group_id', lookupGroup.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[SYSTEM-SETTINGS] Error cargando tipos de valor:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({
      success: true,
      valueTypes: valueTypes || [],
      count: (valueTypes || []).length,
    });

  } catch (err) {
    console.error('[SYSTEM-SETTINGS] Error en GET /catalogs/value-types:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// GET /catalogs/lookup-groups - Listar grupos de lookup disponibles
// ============================================================================

app.get('/catalogs/lookup-groups', async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: lookupGroups, error } = await supabase
      .from('lookup_groups')
      .select('*')
      .eq('is_active', true)
      .order('group_key', { ascending: true });

    if (error) {
      console.error('[SYSTEM-SETTINGS] Error cargando grupos de lookup:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({
      success: true,
      lookupGroups: lookupGroups || [],
      count: (lookupGroups || []).length,
    });

  } catch (err) {
    console.error('[SYSTEM-SETTINGS] Error en GET /catalogs/lookup-groups:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

export default app;
