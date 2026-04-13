/**
 * actions-mgmt-routes.tsx
 * Turnos Titanium Enterprise
 * CRUD para la tabla actions
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

// ── GET / ────────────────────────────────────────────────────────────────────

app.get('/', async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('actions')
      .select('*')
      .order('action_key', { ascending: true });

    if (error) {
      console.error('[ACTIONS] GET /:', error);
      return c.json({ error: error.message }, 500);
    }
    return c.json({ success: true, actions: data || [], count: (data || []).length });
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
      .from('actions')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return c.json({ error: 'Acción no encontrada' }, 404);
    return c.json({ success: true, action: data });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── POST / ───────────────────────────────────────────────────────────────────

app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { action_key, action_name, is_active = true } = body;

    if (!action_key || !action_name) {
      return c.json({ error: 'Campos obligatorios: action_key, action_name' }, 400);
    }
    if (!/^[A-Z0-9_]+$/.test(action_key) || action_key.length < 2) {
      return c.json({ error: 'action_key: solo mayúsculas, números y guión bajo (mín. 2 chars)' }, 400);
    }

    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('actions')
      .select('id')
      .eq('action_key', action_key.toUpperCase())
      .maybeSingle();
    if (existing) return c.json({ error: 'Ya existe una acción con esa clave' }, 409);

    const { data, error } = await supabase
      .from('actions')
      .insert({
        action_key: action_key.toUpperCase(),
        action_name,
        is_active,
        created_by: 'system',
      })
      .select()
      .single();

    if (error) {
      console.error('[ACTIONS] POST /:', error);
      return c.json({ error: error.message }, 500);
    }
    return c.json({ success: true, action: data, message: 'Acción creada' }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── PUT /:id ─────────────────────────────────────────────────────────────────

app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { action_key, action_name, is_active } = body;

    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('actions')
      .select('action_key')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return c.json({ error: 'Acción no encontrada' }, 404);

    if (action_key) {
      if (!/^[A-Z0-9_]+$/.test(action_key) || action_key.length < 2) {
        return c.json({ error: 'action_key: solo mayúsculas, números y guión bajo (mín. 2 chars)' }, 400);
      }
      if (action_key.toUpperCase() !== existing.action_key) {
        const { data: dup } = await supabase
          .from('actions')
          .select('id')
          .eq('action_key', action_key.toUpperCase())
          .neq('id', id)
          .maybeSingle();
        if (dup) return c.json({ error: 'Ya existe una acción con esa clave' }, 409);
      }
    }

    const updateData: any = { updated_by: 'system', updated_at: new Date().toISOString() };
    if (action_key !== undefined) updateData.action_key = action_key.toUpperCase();
    if (action_name !== undefined) updateData.action_name = action_name;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('actions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ACTIONS] PUT /:id:', error);
      return c.json({ error: error.message }, 500);
    }
    return c.json({ success: true, action: data, message: 'Acción actualizada' });
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
      .from('actions')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 500);
    if (!data) return c.json({ error: 'No encontrada' }, 404);
    return c.json({ success: true, action: data, message: `Acción ${is_active ? 'activada' : 'desactivada'}` });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default app;
