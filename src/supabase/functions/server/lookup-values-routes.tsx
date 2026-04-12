/**
 * lookup-values-routes.tsx
 * Turnos Titanium Enterprise
 * 
 * Rutas para gestión de Valores de Catálogo (lookup_values)
 */

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

// ============================================================================
// GET /lookup-values?group_id=xxx - Listar valores por grupo
// ============================================================================

app.get('/', async (c) => {
  try {
    const groupId = c.req.query('group_id');

    if (!groupId) {
      return c.json({ error: 'El parámetro group_id es obligatorio' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: values, error } = await supabase
      .from('lookup_values')
      .select(`
        *,
        lookup_value_translations (
          id,
          language_code,
          label,
          short_label
        )
      `)
      .eq('lookup_group_id', groupId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[LOOKUP-VALUES] Error cargando valores:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({
      success: true,
      values: values || [],
      count: (values || []).length,
    });

  } catch (err) {
    console.error('[LOOKUP-VALUES] Error en GET /:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// GET /lookup-values/:id - Obtener un valor específico
// ============================================================================

app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: value, error } = await supabase
      .from('lookup_values')
      .select(`
        *,
        lookup_value_translations (
          id,
          language_code,
          label,
          short_label
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[LOOKUP-VALUES] Error cargando valor:', error);
      return c.json({ error: error.message }, 500);
    }

    if (!value) {
      return c.json({ error: 'Valor no encontrado' }, 404);
    }

    return c.json({
      success: true,
      value,
    });

  } catch (err) {
    console.error('[LOOKUP-VALUES] Error en GET /:id:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// POST /lookup-values - Crear nuevo valor
// ============================================================================

app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const {
      lookup_group_id,
      lookup_key,
      lookup_label,
      lookup_short_label,
      lookup_scope,
      sort_order,
      is_active,
      translations
    } = body;

    // Validaciones
    if (!lookup_group_id) {
      return c.json({ error: 'El grupo es obligatorio' }, 400);
    }

    if (!lookup_key?.trim()) {
      return c.json({ error: 'La clave es obligatoria' }, 400);
    }

    if (!lookup_label?.trim()) {
      return c.json({ error: 'La etiqueta es obligatoria' }, 400);
    }

    if (!lookup_short_label?.trim()) {
      return c.json({ error: 'La etiqueta corta es obligatoria' }, 400);
    }

    if (!lookup_scope || !['SYSTEM', 'TENANT'].includes(lookup_scope)) {
      return c.json({ error: 'El alcance debe ser SYSTEM o TENANT' }, 400);
    }

    // Validar formato de clave
    if (!/^[A-Z0-9_]+$/.test(lookup_key) || lookup_key.length < 2) {
      return c.json({ 
        error: 'La clave debe contener solo letras mayúsculas, números y guiones bajos (mínimo 2 caracteres)' 
      }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verificar si ya existe (mismo grupo + tenant + key)
    const { data: existing } = await supabase
      .from('lookup_values')
      .select('id')
      .eq('lookup_group_id', lookup_group_id)
      .eq('lookup_key', lookup_key.toUpperCase())
      .is('tenant_id', null) // Solo verificar valores SYSTEM por ahora
      .maybeSingle();

    if (existing) {
      return c.json({ 
        error: `Ya existe un valor con la clave ${lookup_key} en este grupo` 
      }, 409);
    }

    // Crear valor
    const { data: newValue, error: insertError } = await supabase
      .from('lookup_values')
      .insert({
        lookup_group_id,
        tenant_id: null, // Por ahora solo valores SYSTEM
        lookup_key: lookup_key.toUpperCase(),
        lookup_label: lookup_label.trim(),
        lookup_short_label: lookup_short_label.trim(),
        lookup_scope: lookup_scope,
        sort_order: sort_order ?? 0,
        is_active: is_active ?? true,
        created_by: 'SYSTEM_ADMIN'
      })
      .select()
      .single();

    if (insertError) {
      console.error('[LOOKUP-VALUES] Error creando valor:', insertError);
      return c.json({ error: insertError.message }, 500);
    }

    // Crear traducciones si existen
    if (translations && Array.isArray(translations) && translations.length > 0) {
      const translationsToInsert = translations
        .filter(t => t.label?.trim() && t.short_label?.trim())
        .map(t => ({
          lookup_value_id: newValue.id,
          language_code: t.language_code,
          label: t.label.trim(),
          short_label: t.short_label.trim()
        }));

      if (translationsToInsert.length > 0) {
        const { error: transError } = await supabase
          .from('lookup_value_translations')
          .insert(translationsToInsert);

        if (transError) {
          console.error('[LOOKUP-VALUES] Error creando traducciones:', transError);
        }
      }
    }

    return c.json({
      success: true,
      value: newValue,
      message: 'Valor creado exitosamente',
    }, 201);

  } catch (err) {
    console.error('[LOOKUP-VALUES] Error en POST /:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// PUT /lookup-values/:id - Actualizar valor
// ============================================================================

app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const {
      lookup_label,
      lookup_short_label,
      lookup_scope,
      sort_order,
      is_active,
      translations
    } = body;

    // Validaciones
    if (!lookup_label?.trim()) {
      return c.json({ error: 'La etiqueta es obligatoria' }, 400);
    }

    if (!lookup_short_label?.trim()) {
      return c.json({ error: 'La etiqueta corta es obligatoria' }, 400);
    }

    if (lookup_scope && !['SYSTEM', 'TENANT'].includes(lookup_scope)) {
      return c.json({ error: 'El alcance debe ser SYSTEM o TENANT' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Actualizar valor
    const updateData: any = {
      lookup_label: lookup_label.trim(),
      lookup_short_label: lookup_short_label.trim(),
      is_active: is_active ?? true,
      updated_by: 'SYSTEM_ADMIN',
      updated_at: new Date().toISOString()
    };

    if (lookup_scope) {
      updateData.lookup_scope = lookup_scope;
    }

    if (sort_order !== undefined) {
      updateData.sort_order = sort_order;
    }

    const { data: updatedValue, error: updateError } = await supabase
      .from('lookup_values')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[LOOKUP-VALUES] Error actualizando valor:', updateError);
      return c.json({ error: updateError.message }, 500);
    }

    // Actualizar traducciones si existen
    if (translations && Array.isArray(translations)) {
      // Eliminar traducciones existentes
      await supabase
        .from('lookup_value_translations')
        .delete()
        .eq('lookup_value_id', id);

      // Insertar nuevas traducciones
      const translationsToInsert = translations
        .filter(t => t.label?.trim() && t.short_label?.trim())
        .map(t => ({
          lookup_value_id: id,
          language_code: t.language_code,
          label: t.label.trim(),
          short_label: t.short_label.trim()
        }));

      if (translationsToInsert.length > 0) {
        const { error: transError } = await supabase
          .from('lookup_value_translations')
          .insert(translationsToInsert);

        if (transError) {
          console.error('[LOOKUP-VALUES] Error actualizando traducciones:', transError);
        }
      }
    }

    return c.json({
      success: true,
      value: updatedValue,
      message: 'Valor actualizado exitosamente',
    });

  } catch (err) {
    console.error('[LOOKUP-VALUES] Error en PUT /:id:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// PATCH /lookup-values/:id/toggle - Cambiar estado activo/inactivo
// ============================================================================

app.patch('/:id/toggle', async (c) => {
  try {
    const id = c.req.param('id');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Obtener estado actual
    const { data: current, error: fetchError } = await supabase
      .from('lookup_values')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return c.json({ error: 'Valor no encontrado' }, 404);
    }

    // Invertir estado
    const { data: updated, error: updateError } = await supabase
      .from('lookup_values')
      .update({
        is_active: !current.is_active,
        updated_by: 'SYSTEM_ADMIN',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[LOOKUP-VALUES] Error cambiando estado:', updateError);
      return c.json({ error: updateError.message }, 500);
    }

    return c.json({
      success: true,
      value: updated,
      message: `Valor ${updated.is_active ? 'activado' : 'desactivado'} exitosamente`,
    });

  } catch (err) {
    console.error('[LOOKUP-VALUES] Error en PATCH /:id/toggle:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// DELETE /lookup-values/:id - Eliminar valor (soft delete)
// ============================================================================

app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Soft delete
    const { error: deleteError } = await supabase
      .from('lookup_values')
      .update({
        is_active: false,
        updated_by: 'SYSTEM_ADMIN',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (deleteError) {
      console.error('[LOOKUP-VALUES] Error eliminando valor:', deleteError);
      return c.json({ error: deleteError.message }, 500);
    }

    return c.json({
      success: true,
      message: 'Valor desactivado exitosamente',
    });

  } catch (err) {
    console.error('[LOOKUP-VALUES] Error en DELETE /:id:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

export default app;
