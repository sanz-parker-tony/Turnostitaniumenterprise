/**
 * screen-actions-mgmt-routes.tsx
 * Turnos Titanium Enterprise
 * CRUD para screen_actions (relación pantalla ↔ acción)
 * NOTA: Rutas estáticas ANTES de rutas dinámicas (/:id)
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

// ── Catálogos ────────────────────────────────────────────────────────────────

app.get('/catalogs/screens', async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('screens')
      .select('id, screen_key, screen_name, menu_label')
      .eq('is_active', true)
      .order('screen_name');
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, screens: data || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/catalogs/actions', async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('actions')
      .select('id, action_key, action_name')
      .eq('is_active', true)
      .order('action_name');
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, actions: data || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── GET / ────────────────────────────────────────────────────────────────────

app.get('/', async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('screen_actions')
      .select(`
        *,
        screen:screens!screen_actions_screen_id_fkey(screen_key, screen_name, menu_label),
        action:actions!screen_actions_action_id_fkey(action_key, action_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SCREEN-ACTIONS] GET /:', error);
      return c.json({ error: error.message }, 500);
    }

    const result = (data || []).map(sa => ({
      ...sa,
      screen_key: sa.screen?.screen_key || null,
      screen_name: sa.screen?.screen_name || null,
      screen_menu_label: sa.screen?.menu_label || null,
      action_key: sa.action?.action_key || null,
      action_name: sa.action?.action_name || null,
    }));

    return c.json({ success: true, screenActions: result, count: result.length });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────────

app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('screen_actions')
      .select(`
        *,
        screen:screens!screen_actions_screen_id_fkey(screen_key, screen_name),
        action:actions!screen_actions_action_id_fkey(action_key, action_name)
      `)
      .eq('id', id)
      .single();
    if (error || !data) return c.json({ error: 'Acción de pantalla no encontrada' }, 404);
    return c.json({ success: true, screenAction: data });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── POST / ───────────────────────────────────────────────────────────────────

app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { screen_id, action_id, ui_element_key, is_active = true } = body;

    if (!screen_id || !action_id) {
      return c.json({ error: 'Campos obligatorios: screen_id, action_id' }, 400);
    }

    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('screen_actions')
      .select('id')
      .eq('screen_id', screen_id)
      .eq('action_id', action_id)
      .maybeSingle();
    if (existing) return c.json({ error: 'Ya existe esa combinación pantalla-acción' }, 409);

    const { data, error } = await supabase
      .from('screen_actions')
      .insert({
        screen_id,
        action_id,
        ui_element_key: ui_element_key || null,
        is_active,
        created_by: 'system',
      })
      .select()
      .single();

    if (error) {
      console.error('[SCREEN-ACTIONS] POST /:', error);
      return c.json({ error: error.message }, 500);
    }
    return c.json({ success: true, screenAction: data, message: 'Acción de pantalla creada' }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── PUT /:id ─────────────────────────────────────────────────────────────────

app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { ui_element_key, is_active } = body;

    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('screen_actions')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return c.json({ error: 'Acción de pantalla no encontrada' }, 404);

    const updateData: any = { updated_by: 'system', updated_at: new Date().toISOString() };
    if (ui_element_key !== undefined) updateData.ui_element_key = ui_element_key || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('screen_actions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SCREEN-ACTIONS] PUT /:id:', error);
      return c.json({ error: error.message }, 500);
    }
    return c.json({ success: true, screenAction: data, message: 'Actualizado' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── PATCH /:id/status ────────────────────────────────────────────────────────

app.patch('/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const { is_active } = await c.req.json();
    if (typeof is_active !== 'boolean') return c.json({ error: 'is_active debe ser booleano' }, 400);

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('screen_actions')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 500);
    if (!data) return c.json({ error: 'No encontrado' }, 404);
    return c.json({ success: true, screenAction: data, message: `${is_active ? 'Activado' : 'Desactivado'}` });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default app;
