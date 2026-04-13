/**
 * scope-types-routes.tsx
 * Turnos Titanium Enterprise
 *
 * CRUD para la tabla scope_types
 * Ubicación: Mantenimiento → Alcances
 *
 * Política: NO se pueden eliminar registros.
 */

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

// ============================================================================
// GET / - Listar tipos de alcance
// ============================================================================

app.get('/', async (c) => {
  try {
    const supabase = getSupabase();

    const { data: scopeTypes, error } = await supabase
      .from('scope_types')
      .select('*')
      .order('scope_type_key', { ascending: true });

    if (error) {
      console.error('[SCOPE-TYPES] Error cargando scope_types:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, scopeTypes: scopeTypes || [], count: (scopeTypes || []).length });
  } catch (err: any) {
    console.error('[SCOPE-TYPES] Error en GET /:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// ============================================================================
// GET /:id - Obtener un tipo de alcance específico
// ============================================================================

app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getSupabase();

    const { data: scopeType, error } = await supabase
      .from('scope_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !scopeType) {
      return c.json({ error: 'Tipo de alcance no encontrado' }, 404);
    }

    return c.json({ success: true, scopeType });
  } catch (err: any) {
    console.error('[SCOPE-TYPES] Error en GET /:id:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// ============================================================================
// POST / - Crear tipo de alcance
// ============================================================================

app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { scope_type_key, scope_type_name, is_active = true } = body;

    if (!scope_type_key || !scope_type_name) {
      return c.json({ error: 'Campos obligatorios: scope_type_key, scope_type_name' }, 400);
    }

    if (scope_type_key.length > 80) {
      return c.json({ error: 'scope_type_key no puede superar 80 caracteres' }, 400);
    }

    const supabase = getSupabase();

    // Verificar unicidad
    const { data: existing } = await supabase
      .from('scope_types')
      .select('id')
      .eq('scope_type_key', scope_type_key.toUpperCase())
      .maybeSingle();

    if (existing) {
      return c.json({ error: 'Ya existe un tipo de alcance con esa clave' }, 409);
    }

    const { data: newScopeType, error } = await supabase
      .from('scope_types')
      .insert({
        scope_type_key: scope_type_key.toUpperCase(),
        scope_type_name,
        is_active,
        created_by: 'system',
      })
      .select()
      .single();

    if (error) {
      console.error('[SCOPE-TYPES] Error creando scope_type:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, scopeType: newScopeType, message: 'Tipo de alcance creado exitosamente' }, 201);
  } catch (err: any) {
    console.error('[SCOPE-TYPES] Error en POST /:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// ============================================================================
// PUT /:id - Actualizar tipo de alcance
// ============================================================================

app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { scope_type_key, scope_type_name, is_active } = body;

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('scope_types')
      .select('scope_type_key')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return c.json({ error: 'Tipo de alcance no encontrado' }, 404);
    }

    // Si se cambia scope_type_key, verificar unicidad
    if (scope_type_key && scope_type_key.toUpperCase() !== existing.scope_type_key) {
      const { data: dup } = await supabase
        .from('scope_types')
        .select('id')
        .eq('scope_type_key', scope_type_key.toUpperCase())
        .neq('id', id)
        .maybeSingle();

      if (dup) {
        return c.json({ error: 'Ya existe un tipo de alcance con esa clave' }, 409);
      }
    }

    const updateData: any = { updated_by: 'system', updated_at: new Date().toISOString() };
    if (scope_type_key !== undefined) updateData.scope_type_key = scope_type_key.toUpperCase();
    if (scope_type_name !== undefined) updateData.scope_type_name = scope_type_name;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedScopeType, error } = await supabase
      .from('scope_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SCOPE-TYPES] Error actualizando scope_type:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, scopeType: updatedScopeType, message: 'Tipo de alcance actualizado exitosamente' });
  } catch (err: any) {
    console.error('[SCOPE-TYPES] Error en PUT /:id:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// ============================================================================
// PATCH /:id/status - Activar/Desactivar tipo de alcance
// ============================================================================

app.patch('/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return c.json({ error: 'El campo is_active debe ser booleano' }, 400);
    }

    const supabase = getSupabase();

    const { data: updatedScopeType, error } = await supabase
      .from('scope_types')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SCOPE-TYPES] Error actualizando estado:', error);
      return c.json({ error: error.message }, 500);
    }

    if (!updatedScopeType) {
      return c.json({ error: 'Tipo de alcance no encontrado' }, 404);
    }

    return c.json({
      success: true,
      scopeType: updatedScopeType,
      message: `Tipo de alcance ${is_active ? 'activado' : 'desactivado'} exitosamente`,
    });
  } catch (err: any) {
    console.error('[SCOPE-TYPES] Error en PATCH /:id/status:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

export default app;
