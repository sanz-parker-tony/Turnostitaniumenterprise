/**
 * menu-groups-routes.tsx
 * Turnos Titanium Enterprise
 * CRUD para system_menu_groups + system_menu_group_translations
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

app.get('/catalogs/languages', async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('system_languages')
      .select('code, language_name')
      .eq('is_active', true)
      .order('language_name');
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, languages: data || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/catalogs/permission-levels', (c) => {
  return c.json({
    success: true,
    permissionLevels: ['SYSTEM', 'TENANT', 'PUBLIC'],
  });
});

// ── GET / ────────────────────────────────────────────────────────────────────

app.get('/', async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('system_menu_groups')
      .select(`*, translations:system_menu_group_translations(*)`)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[MENU-GROUPS] GET /:', error);
      return c.json({ error: error.message }, 500);
    }
    return c.json({ success: true, menuGroups: data || [], count: (data || []).length });
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
      .from('system_menu_groups')
      .select(`*, translations:system_menu_group_translations(*)`)
      .eq('id', id)
      .single();
    if (error || !data) return c.json({ error: 'Grupo de menú no encontrado' }, 404);
    return c.json({ success: true, menuGroup: data });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── POST / ───────────────────────────────────────────────────────────────────

app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { menu_group_key, menu_group_name, menu_group_short_name, icon_key, sort_order = 0, permission_level, is_active = true } = body;

    if (!menu_group_key || !menu_group_name) {
      return c.json({ error: 'Campos obligatorios: menu_group_key, menu_group_name' }, 400);
    }
    if (!/^[A-Z0-9_]+$/.test(menu_group_key) || menu_group_key.length < 2) {
      return c.json({ error: 'menu_group_key: solo mayúsculas, números y guión bajo (mín. 2 chars)' }, 400);
    }

    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('system_menu_groups')
      .select('id')
      .eq('menu_group_key', menu_group_key.toUpperCase())
      .maybeSingle();
    if (existing) return c.json({ error: 'Ya existe un grupo con esa clave' }, 409);

    const { data, error } = await supabase
      .from('system_menu_groups')
      .insert({
        menu_group_key: menu_group_key.toUpperCase(),
        menu_group_name,
        menu_group_short_name: menu_group_short_name || null,
        icon_key: icon_key || null,
        sort_order,
        permission_level: permission_level || null,
        is_active,
        created_by: 'system',
      })
      .select()
      .single();

    if (error) {
      console.error('[MENU-GROUPS] POST /:', error);
      return c.json({ error: error.message }, 500);
    }
    return c.json({ success: true, menuGroup: data, message: 'Grupo de menú creado' }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── PUT /:id ─────────────────────────────────────────────────────────────────

app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { menu_group_key, menu_group_name, menu_group_short_name, icon_key, sort_order, permission_level, is_active } = body;

    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('system_menu_groups')
      .select('menu_group_key')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return c.json({ error: 'Grupo de menú no encontrado' }, 404);

    if (menu_group_key) {
      if (!/^[A-Z0-9_]+$/.test(menu_group_key) || menu_group_key.length < 2) {
        return c.json({ error: 'menu_group_key: solo mayúsculas, números y guión bajo (mín. 2 chars)' }, 400);
      }
      if (menu_group_key.toUpperCase() !== existing.menu_group_key) {
        const { data: dup } = await supabase
          .from('system_menu_groups')
          .select('id')
          .eq('menu_group_key', menu_group_key.toUpperCase())
          .neq('id', id)
          .maybeSingle();
        if (dup) return c.json({ error: 'Ya existe un grupo con esa clave' }, 409);
      }
    }

    const updateData: any = { updated_by: 'system', updated_at: new Date().toISOString() };
    if (menu_group_key !== undefined) updateData.menu_group_key = menu_group_key.toUpperCase();
    if (menu_group_name !== undefined) updateData.menu_group_name = menu_group_name;
    if (menu_group_short_name !== undefined) updateData.menu_group_short_name = menu_group_short_name || null;
    if (icon_key !== undefined) updateData.icon_key = icon_key || null;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (permission_level !== undefined) updateData.permission_level = permission_level || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('system_menu_groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[MENU-GROUPS] PUT /:id:', error);
      return c.json({ error: error.message }, 500);
    }
    return c.json({ success: true, menuGroup: data, message: 'Grupo de menú actualizado' });
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
      .from('system_menu_groups')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 500);
    if (!data) return c.json({ error: 'No encontrado' }, 404);
    return c.json({ success: true, menuGroup: data, message: `Grupo ${is_active ? 'activado' : 'desactivado'}` });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── GET /:id/translations ────────────────────────────────────────────────────

app.get('/:id/translations', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('system_menu_group_translations')
      .select('*')
      .eq('menu_group_id', id)
      .order('language_code');
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, translations: data || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── POST /:id/translations (upsert) ─────────────────────────────────────────

app.post('/:id/translations', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { language_code, menu_group_name, menu_group_short_name } = body;

    if (!language_code || !menu_group_name) {
      return c.json({ error: 'Campos obligatorios: language_code, menu_group_name' }, 400);
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('system_menu_group_translations')
      .upsert({
        menu_group_id: id,
        language_code,
        menu_group_name,
        menu_group_short_name: menu_group_short_name || null,
      }, { onConflict: 'menu_group_id,language_code' })
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, translation: data, message: 'Traducción guardada' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default app;
