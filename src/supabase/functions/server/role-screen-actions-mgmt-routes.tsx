/**
 * role-screen-actions-mgmt-routes.tsx
 * Turnos Titanium Enterprise
 * CRUD para role_screen_actions (permisos por rol → pantalla → acción)
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

app.get('/catalogs/tenants', async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('tenants')
      .select('id, tenant_key, tenant_name')
      .order('tenant_name');
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, tenants: data || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/catalogs/roles', async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('roles')
      .select('id, role_key, role_name, role_scope, tenant_id')
      .eq('is_active', true)
      .order('role_name');
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, roles: data || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/catalogs/screen-actions', async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('screen_actions')
      .select(`
        id, ui_element_key, is_active,
        screen:screens!screen_actions_screen_id_fkey(screen_key, screen_name),
        action:actions!screen_actions_action_id_fkey(action_key, action_name)
      `)
      .eq('is_active', true)
      .order('created_at');

    if (error) return c.json({ error: error.message }, 500);

    const result = (data || []).map(sa => ({
      id: sa.id,
      ui_element_key: sa.ui_element_key,
      screen_key: sa.screen?.screen_key || null,
      screen_name: sa.screen?.screen_name || null,
      action_key: sa.action?.action_key || null,
      action_name: sa.action?.action_name || null,
      label: `${sa.screen?.screen_name || '?'} → ${sa.action?.action_name || '?'}`,
    }));

    return c.json({ success: true, screenActions: result || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── GET / - Listar con todos los joins ───────────────────────────────────────

app.get('/', async (c) => {
  try {
    const supabase = getSupabase();

    // Query params opcionales
    const url = new URL(c.req.url);
    const tenantId = url.searchParams.get('tenant_id');
    const roleId = url.searchParams.get('role_id');
    const screenKey = url.searchParams.get('screen_key');

    let query = supabase
      .from('role_screen_actions')
      .select(`
        *,
        tenant:tenants!role_screen_actions_tenant_id_fkey(tenant_key, tenant_name),
        role:roles!role_screen_actions_role_id_fkey(role_key, role_name),
        screen_action:screen_actions!role_screen_actions_screen_action_id_fkey(
          id, ui_element_key,
          screen:screens!screen_actions_screen_id_fkey(screen_key, screen_name),
          action:actions!screen_actions_action_id_fkey(action_key, action_name)
        )
      `)
      .order('created_at', { ascending: false });

    if (tenantId) query = query.eq('tenant_id', tenantId);
    if (roleId) query = query.eq('role_id', roleId);

    const { data, error } = await query;

    if (error) {
      console.error('[ROLE-SCREEN-ACTIONS] GET /:', error);
      return c.json({ error: error.message }, 500);
    }

    const result = (data || []).map(rsa => ({
      ...rsa,
      tenant_key: rsa.tenant?.tenant_key || null,
      tenant_name: rsa.tenant?.tenant_name || null,
      role_key: rsa.role?.role_key || null,
      role_name: rsa.role?.role_name || null,
      screen_key: rsa.screen_action?.screen?.screen_key || null,
      screen_name: rsa.screen_action?.screen?.screen_name || null,
      action_key: rsa.screen_action?.action?.action_key || null,
      action_name: rsa.screen_action?.action?.action_name || null,
      ui_element_key: rsa.screen_action?.ui_element_key || null,
    })).filter(rsa => {
      if (screenKey) return rsa.screen_key === screenKey;
      return true;
    });

    return c.json({ success: true, permissions: result, count: result.length });
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
      .from('role_screen_actions')
      .select(`
        *,
        tenant:tenants!role_screen_actions_tenant_id_fkey(tenant_key, tenant_name),
        role:roles!role_screen_actions_role_id_fkey(role_key, role_name),
        screen_action:screen_actions!role_screen_actions_screen_action_id_fkey(
          id, ui_element_key,
          screen:screens!screen_actions_screen_id_fkey(screen_key, screen_name),
          action:actions!screen_actions_action_id_fkey(action_key, action_name)
        )
      `)
      .eq('id', id)
      .single();
    if (error || !data) return c.json({ error: 'Permiso no encontrado' }, 404);
    return c.json({ success: true, permission: data });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── POST / ───────────────────────────────────────────────────────────────────

app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { tenant_id, role_id, screen_action_id, is_allowed = false, valid_from, valid_to, is_active = true } = body;

    if (!tenant_id || !role_id || !screen_action_id) {
      return c.json({ error: 'Campos obligatorios: tenant_id, role_id, screen_action_id' }, 400);
    }

    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('role_screen_actions')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('role_id', role_id)
      .eq('screen_action_id', screen_action_id)
      .maybeSingle();
    if (existing) return c.json({ error: 'Ya existe ese permiso para ese rol y pantalla-acción' }, 409);

    const { data, error } = await supabase
      .from('role_screen_actions')
      .insert({
        tenant_id,
        role_id,
        screen_action_id,
        is_allowed,
        valid_from: valid_from || null,
        valid_to: valid_to || null,
        is_active,
        created_by: 'system',
      })
      .select()
      .single();

    if (error) {
      console.error('[ROLE-SCREEN-ACTIONS] POST /:', error);
      return c.json({ error: error.message }, 500);
    }
    return c.json({ success: true, permission: data, message: 'Permiso creado' }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── PUT /:id ─────────────────────────────────────────────────────────────────

app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { is_allowed, valid_from, valid_to, is_active } = body;

    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('role_screen_actions')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return c.json({ error: 'Permiso no encontrado' }, 404);

    const updateData: any = { updated_by: 'system', updated_at: new Date().toISOString() };
    if (is_allowed !== undefined) updateData.is_allowed = is_allowed;
    if (valid_from !== undefined) updateData.valid_from = valid_from || null;
    if (valid_to !== undefined) updateData.valid_to = valid_to || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('role_screen_actions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ROLE-SCREEN-ACTIONS] PUT /:id:', error);
      return c.json({ error: error.message }, 500);
    }
    return c.json({ success: true, permission: data, message: 'Permiso actualizado' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── PATCH /:id/allowed ───────────────────────────────────────────────────────

app.patch('/:id/allowed', async (c) => {
  try {
    const id = c.req.param('id');
    const { is_allowed } = await c.req.json();
    if (typeof is_allowed !== 'boolean') return c.json({ error: 'is_allowed debe ser booleano' }, 400);

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('role_screen_actions')
      .update({ is_allowed, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 500);
    if (!data) return c.json({ error: 'No encontrado' }, 404);
    return c.json({ success: true, permission: data, message: `Permiso ${is_allowed ? 'concedido' : 'revocado'}` });
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
      .from('role_screen_actions')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 500);
    if (!data) return c.json({ error: 'No encontrado' }, 404);
    return c.json({ success: true, permission: data, message: `${is_active ? 'Activado' : 'Desactivado'}` });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── POST /bulk-upsert ─────────────────────────────────────────────────────────
// Actualización masiva: dado un rol, actualiza is_allowed para varios screen_actions

app.post('/bulk-upsert', async (c) => {
  try {
    const body = await c.req.json();
    const { tenant_id, role_id, permissions } = body;
    // permissions = [{ screen_action_id, is_allowed }]

    if (!tenant_id || !role_id || !Array.isArray(permissions)) {
      return c.json({ error: 'Campos obligatorios: tenant_id, role_id, permissions[]' }, 400);
    }

    const supabase = getSupabase();
    let updated = 0;
    let created = 0;

    for (const perm of permissions) {
      const { screen_action_id, is_allowed } = perm;
      if (!screen_action_id) continue;

      const { data: existing } = await supabase
        .from('role_screen_actions')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('role_id', role_id)
        .eq('screen_action_id', screen_action_id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('role_screen_actions')
          .update({ is_allowed, updated_by: 'system', updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        updated++;
      } else {
        await supabase
          .from('role_screen_actions')
          .insert({ tenant_id, role_id, screen_action_id, is_allowed, is_active: true, created_by: 'system' });
        created++;
      }
    }

    return c.json({ success: true, message: `Permisos actualizados: ${updated} modificados, ${created} creados`, updated, created });
  } catch (err: any) {
    console.error('[ROLE-SCREEN-ACTIONS] POST /bulk-upsert:', err);
    return c.json({ error: err.message }, 500);
  }
});

export default app;
