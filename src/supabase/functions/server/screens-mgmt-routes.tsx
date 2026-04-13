/**
 * screens-mgmt-routes.tsx
 * Turnos Titanium Enterprise
 * CRUD para screens + screen_translations
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

app.get('/catalogs/menu-groups', async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('system_menu_groups')
      .select('id, menu_group_key, menu_group_name')
      .eq('is_active', true)
      .order('sort_order');
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, menuGroups: data || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

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

// ── GET / ────────────────────────────────────────────────────────────────────

app.get('/', async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('screens')
      .select(`
        *,
        menu_group:system_menu_groups(menu_group_key, menu_group_name, icon_key),
        translations:screen_translations(*)
      `)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[SCREENS-MGMT] GET /:', error);
      return c.json({ error: error.message }, 500);
    }

    const screens = (data || []).map(s => ({
      ...s,
      menu_group_key: s.menu_group?.menu_group_key || null,
      menu_group_name: s.menu_group?.menu_group_name || null,
    }));

    return c.json({ success: true, screens, count: screens.length });
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
      .from('screens')
      .select(`
        *,
        menu_group:system_menu_groups(menu_group_key, menu_group_name),
        translations:screen_translations(*)
      `)
      .eq('id', id)
      .single();
    if (error || !data) return c.json({ error: 'Pantalla no encontrada' }, 404);
    return c.json({ success: true, screen: data });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── POST / ───────────────────────────────────────────────────────────────────

app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { screen_key, screen_name, menu_label, menu_group_id, module_id, route_path, icon_key, sort_order = 0, is_active = true } = body;

    if (!screen_key || !screen_name || !menu_group_id) {
      return c.json({ error: 'Campos obligatorios: screen_key, screen_name, menu_group_id' }, 400);
    }
    if (!/^[A-Z0-9_]+$/.test(screen_key) || screen_key.length < 2) {
      return c.json({ error: 'screen_key: solo mayúsculas, números y guión bajo (mín. 2 chars)' }, 400);
    }
    if (route_path && !/^\/[a-z0-9/_-]+$/.test(route_path)) {
      return c.json({ error: 'route_path debe comenzar con / y usar solo minúsculas, números, /, _ o -' }, 400);
    }

    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('screens')
      .select('id')
      .eq('screen_key', screen_key.toUpperCase())
      .maybeSingle();
    if (existing) return c.json({ error: 'Ya existe una pantalla con esa clave' }, 409);

    const { data, error } = await supabase
      .from('screens')
      .insert({
        screen_key: screen_key.toUpperCase(),
        screen_name,
        menu_label: menu_label || null,
        menu_group_id,
        module_id: module_id || null,
        route_path: route_path || null,
        icon_key: icon_key || null,
        sort_order,
        is_active,
        created_by: 'system',
      })
      .select()
      .single();

    if (error) {
      console.error('[SCREENS-MGMT] POST /:', error);
      return c.json({ error: error.message }, 500);
    }
    return c.json({ success: true, screen: data, message: 'Pantalla creada' }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── PUT /:id ─────────────────────────────────────────────────────────────────

app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { screen_key, screen_name, menu_label, menu_group_id, module_id, route_path, icon_key, sort_order, is_active } = body;

    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('screens')
      .select('screen_key')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return c.json({ error: 'Pantalla no encontrada' }, 404);

    if (screen_key) {
      if (!/^[A-Z0-9_]+$/.test(screen_key) || screen_key.length < 2) {
        return c.json({ error: 'screen_key: solo mayúsculas, números y guión bajo (mín. 2 chars)' }, 400);
      }
      if (screen_key.toUpperCase() !== existing.screen_key) {
        const { data: dup } = await supabase
          .from('screens')
          .select('id')
          .eq('screen_key', screen_key.toUpperCase())
          .neq('id', id)
          .maybeSingle();
        if (dup) return c.json({ error: 'Ya existe una pantalla con esa clave' }, 409);
      }
    }
    if (route_path && !/^\/[a-z0-9/_-]+$/.test(route_path)) {
      return c.json({ error: 'route_path debe comenzar con / y usar solo minúsculas, números, /, _ o -' }, 400);
    }

    const updateData: any = { updated_by: 'system', updated_at: new Date().toISOString() };
    if (screen_key !== undefined) updateData.screen_key = screen_key.toUpperCase();
    if (screen_name !== undefined) updateData.screen_name = screen_name;
    if (menu_label !== undefined) updateData.menu_label = menu_label || null;
    if (menu_group_id !== undefined) updateData.menu_group_id = menu_group_id;
    if (module_id !== undefined) updateData.module_id = module_id || null;
    if (route_path !== undefined) updateData.route_path = route_path || null;
    if (icon_key !== undefined) updateData.icon_key = icon_key || null;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('screens')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SCREENS-MGMT] PUT /:id:', error);
      return c.json({ error: error.message }, 500);
    }
    return c.json({ success: true, screen: data, message: 'Pantalla actualizada' });
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
      .from('screens')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 500);
    if (!data) return c.json({ error: 'No encontrada' }, 404);
    return c.json({ success: true, screen: data, message: `Pantalla ${is_active ? 'activada' : 'desactivada'}` });
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
      .from('screen_translations')
      .select('*')
      .eq('screen_id', id)
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
    const { language_code, screen_name, menu_label } = body;

    if (!language_code || !screen_name) {
      return c.json({ error: 'Campos obligatorios: language_code, screen_name' }, 400);
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('screen_translations')
      .upsert({
        screen_id: id,
        language_code,
        screen_name,
        menu_label: menu_label || null,
      }, { onConflict: 'screen_id,language_code' })
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, translation: data, message: 'Traducción guardada' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default app;
