/**
 * lookup-groups-routes.tsx
 * Turnos Titanium Enterprise
 * 
 * Rutas para gestión de Grupos de Catálogo (lookup_groups)
 */

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

// ============================================================================
// GET /lookup-groups - Listar todos los grupos
// ============================================================================

app.get('/', async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: groups, error } = await supabase
      .from('lookup_groups')
      .select(`
        *,
        lookup_group_translations (
          id,
          language_code,
          label,
          short_label
        )
      `)
      .order('lookup_group_key', { ascending: true });

    if (error) {
      console.error('[LOOKUP-GROUPS] Error cargando grupos:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({
      success: true,
      groups: groups || [],
      count: (groups || []).length,
    });

  } catch (err) {
    console.error('[LOOKUP-GROUPS] Error en GET /:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// GET /lookup-groups/:id - Obtener un grupo específico
// ============================================================================

app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: group, error } = await supabase
      .from('lookup_groups')
      .select(`
        *,
        lookup_group_translations (
          id,
          language_code,
          label,
          short_label
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[LOOKUP-GROUPS] Error cargando grupo:', error);
      return c.json({ error: error.message }, 500);
    }

    if (!group) {
      return c.json({ error: 'Grupo no encontrado' }, 404);
    }

    return c.json({
      success: true,
      group,
    });

  } catch (err) {
    console.error('[LOOKUP-GROUPS] Error en GET /:id:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// POST /lookup-groups - Crear nuevo grupo
// ============================================================================

app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const {
      lookup_group_key,
      lookup_group_label,
      lookup_group_short_label,
      allows_tenant_items,
      is_active,
      translations
    } = body;

    // Validaciones
    if (!lookup_group_key?.trim()) {
      return c.json({ error: 'La clave del grupo es obligatoria' }, 400);
    }

    if (!lookup_group_label?.trim()) {
      return c.json({ error: 'La etiqueta del grupo es obligatoria' }, 400);
    }

    if (!lookup_group_short_label?.trim()) {
      return c.json({ error: 'La etiqueta corta del grupo es obligatoria' }, 400);
    }

    // Validar formato de clave
    if (!/^[A-Z0-9_]+$/.test(lookup_group_key)) {
      return c.json({ 
        error: 'La clave debe contener solo letras mayúsculas, números y guiones bajos' 
      }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('lookup_groups')
      .select('id')
      .eq('lookup_group_key', lookup_group_key.toUpperCase())
      .maybeSingle();

    if (existing) {
      return c.json({ 
        error: `Ya existe un grupo con la clave ${lookup_group_key}` 
      }, 409);
    }

    // Crear grupo
    const { data: newGroup, error: insertError } = await supabase
      .from('lookup_groups')
      .insert({
        lookup_group_key: lookup_group_key.toUpperCase(),
        lookup_group_label: lookup_group_label.trim(),
        lookup_group_short_label: lookup_group_short_label.trim(),
        allows_tenant_items: allows_tenant_items ?? false,
        is_active: is_active ?? true,
        created_by: 'SYSTEM_ADMIN'
      })
      .select()
      .single();

    if (insertError) {
      console.error('[LOOKUP-GROUPS] Error creando grupo:', insertError);
      return c.json({ error: insertError.message }, 500);
    }

    // Crear traducciones si existen
    if (translations && Array.isArray(translations) && translations.length > 0) {
      const translationsToInsert = translations
        .filter(t => t.label?.trim() && t.short_label?.trim())
        .map(t => ({
          lookup_group_id: newGroup.id,
          language_code: t.language_code,
          label: t.label.trim(),
          short_label: t.short_label.trim()
        }));

      if (translationsToInsert.length > 0) {
        const { error: transError } = await supabase
          .from('lookup_group_translations')
          .insert(translationsToInsert);

        if (transError) {
          console.error('[LOOKUP-GROUPS] Error creando traducciones:', transError);
          // No falla la operación, solo logea el error
        }
      }
    }

    return c.json({
      success: true,
      group: newGroup,
      message: 'Grupo creado exitosamente',
    }, 201);

  } catch (err) {
    console.error('[LOOKUP-GROUPS] Error en POST /:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// PUT /lookup-groups/:id - Actualizar grupo
// ============================================================================

app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const {
      lookup_group_label,
      lookup_group_short_label,
      allows_tenant_items,
      is_active,
      translations
    } = body;

    // Validaciones
    if (!lookup_group_label?.trim()) {
      return c.json({ error: 'La etiqueta del grupo es obligatoria' }, 400);
    }

    if (!lookup_group_short_label?.trim()) {
      return c.json({ error: 'La etiqueta corta del grupo es obligatoria' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Actualizar grupo
    const { data: updatedGroup, error: updateError } = await supabase
      .from('lookup_groups')
      .update({
        lookup_group_label: lookup_group_label.trim(),
        lookup_group_short_label: lookup_group_short_label.trim(),
        allows_tenant_items: allows_tenant_items ?? false,
        is_active: is_active ?? true,
        updated_by: 'SYSTEM_ADMIN',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[LOOKUP-GROUPS] Error actualizando grupo:', updateError);
      return c.json({ error: updateError.message }, 500);
    }

    // Actualizar traducciones si existen
    if (translations && Array.isArray(translations)) {
      // Eliminar traducciones existentes
      await supabase
        .from('lookup_group_translations')
        .delete()
        .eq('lookup_group_id', id);

      // Insertar nuevas traducciones
      const translationsToInsert = translations
        .filter(t => t.label?.trim() && t.short_label?.trim())
        .map(t => ({
          lookup_group_id: id,
          language_code: t.language_code,
          label: t.label.trim(),
          short_label: t.short_label.trim()
        }));

      if (translationsToInsert.length > 0) {
        const { error: transError } = await supabase
          .from('lookup_group_translations')
          .insert(translationsToInsert);

        if (transError) {
          console.error('[LOOKUP-GROUPS] Error actualizando traducciones:', transError);
        }
      }
    }

    return c.json({
      success: true,
      group: updatedGroup,
      message: 'Grupo actualizado exitosamente',
    });

  } catch (err) {
    console.error('[LOOKUP-GROUPS] Error en PUT /:id:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// DELETE /lookup-groups/:id - Eliminar grupo (soft delete)
// ============================================================================

app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verificar si tiene valores asociados
    const { data: values, error: valuesError } = await supabase
      .from('lookup_values')
      .select('id')
      .eq('lookup_group_id', id)
      .limit(1);

    if (valuesError) {
      console.error('[LOOKUP-GROUPS] Error verificando valores:', valuesError);
      return c.json({ error: valuesError.message }, 500);
    }

    if (values && values.length > 0) {
      return c.json({ 
        error: 'No se puede eliminar el grupo porque tiene valores asociados' 
      }, 409);
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('lookup_groups')
      .update({
        is_active: false,
        updated_by: 'SYSTEM_ADMIN',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (deleteError) {
      console.error('[LOOKUP-GROUPS] Error eliminando grupo:', deleteError);
      return c.json({ error: deleteError.message }, 500);
    }

    return c.json({
      success: true,
      message: 'Grupo desactivado exitosamente',
    });

  } catch (err) {
    console.error('[LOOKUP-GROUPS] Error en DELETE /:id:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

export default app;
