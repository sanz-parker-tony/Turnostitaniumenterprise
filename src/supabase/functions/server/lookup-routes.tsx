/**
 * lookup-routes.tsx
 * Turnos Titanium Enterprise
 * 
 * Rutas para obtener lookup_values por grupo
 */

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

// ============================================================================
// GET /lookup-values?group=XXX - Obtener valores de lookup por grupo
// ============================================================================

app.get('/', async (c) => {
  try {
    const group = c.req.query('group');

    if (!group) {
      return c.json({ error: 'El parámetro group es obligatorio' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Obtener el lookup_group
    const { data: lookupGroup, error: groupError } = await supabase
      .from('lookup_groups')
      .select('id')
      .eq('lookup_group_key', group)
      .maybeSingle();

    if (groupError) {
      console.error('[LOOKUP] Error buscando grupo:', groupError);
      return c.json({ error: groupError.message }, 500);
    }

    if (!lookupGroup) {
      return c.json({ 
        success: true,
        values: [],
        message: `Grupo ${group} no encontrado` 
      });
    }

    // Obtener los valores
    const { data: values, error: valuesError } = await supabase
      .from('lookup_values')
      .select('id, lookup_key, lookup_label, lookup_short_label, is_active, sort_order')
      .eq('lookup_group_id', lookupGroup.id)
      .order('sort_order', { ascending: true });

    if (valuesError) {
      console.error('[LOOKUP] Error obteniendo valores:', valuesError);
      return c.json({ error: valuesError.message }, 500);
    }

    return c.json({
      success: true,
      group,
      values: values || [],
      count: (values || []).length,
    });

  } catch (err) {
    console.error('[LOOKUP] Error en GET /:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

export default app;