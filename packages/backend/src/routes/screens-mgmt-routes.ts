/**
 * screens-mgmt-routes.ts
 * Turnos Titanium Enterprise
 * CRUD para screens + screen_translations
 * NOTA: Rutas estáticas ANTES de rutas dinámicas (/:id)
 */

import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';
import { pool } from '../lib/db.js';

const router = Router();

function getPostgres() {
  return createDbClient(
    process.env.Postgres_URL || '',
    process.env.Postgres_SERVICE_ROLE_KEY || ''
  );
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseOrderedIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const ids = value.map((id) => String(id || '').trim());
  if (ids.some((id) => !isUuid(id)) || new Set(ids).size !== ids.length) return null;
  return ids;
}

// ── Catálogos ────────────────────────────────────────────────────────────────

router.get('/catalogs/menu-groups', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('system_menu_groups')
      .select('id, menu_group_key, menu_group_name')
      .eq('is_active', true)
      .order('sort_order');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, menuGroups: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/catalogs/languages', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('system_languages')
      .select('code, language_name')
      .eq('is_active', true)
      .order('language_name');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, languages: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET / ────────────────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('screens')
      .select(`
        *,
        menu_group:system_menu_groups(menu_group_key, menu_group_name, icon_key),
        translations:screen_translations(*)
      `)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[SCREENS-MGMT] GET /:', error);
      return res.status(500).json({ error: error.message });
    }

    const screens = (data || []).map((s: any) => ({
      ...s,
      menu_group_key: s.menu_group?.menu_group_key || null,
      menu_group_name: s.menu_group?.menu_group_name || null,
    }));

    return res.status(200).json({ success: true, screens, count: screens.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Reordena todas las pantallas de un grupo, incluidas las inactivas, en una sola transaccion.
router.patch('/reorder', async (req: Request, res: Response) => {
  const menuGroupId = String(req.body?.menu_group_id || '').trim();
  const orderedIds = parseOrderedIds(req.body?.ordered_ids);
  if (!isUuid(menuGroupId) || !orderedIds) {
    return res.status(400).json({ error: 'menu_group_id y ordered_ids validos son obligatorios' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: screenRows } = await client.query(
      `SELECT id
         FROM public.screens
        WHERE menu_group_id = $1::uuid
        ORDER BY sort_order, screen_name
        FOR UPDATE`,
      [menuGroupId]
    );
    const screenIds = screenRows.map((row: { id: string }) => row.id);
    if (screenIds.length !== orderedIds.length || screenIds.some((id: string) => !orderedIds.includes(id))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ordered_ids debe incluir todas las pantallas activas e inactivas del grupo' });
    }

    const { rows } = await client.query(
      `WITH desired AS (
         SELECT id, (ordinality * 10)::integer AS sort_order
           FROM unnest($1::uuid[]) WITH ORDINALITY AS item(id, ordinality)
       )
       UPDATE public.screens AS screen
          SET sort_order = desired.sort_order,
              updated_by = 'SYSTEM_ADMIN',
              updated_at = now()
         FROM desired
        WHERE screen.id = desired.id
          AND screen.menu_group_id = $2::uuid
       RETURNING screen.*`,
      [orderedIds, menuGroupId]
    );

    await client.query('COMMIT');
    rows.sort((a: any, b: any) => a.sort_order - b.sort_order);
    return res.status(200).json({ success: true, screens: rows, message: 'Orden de pantallas actualizado' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('screens')
      .select(`
        *,
        menu_group:system_menu_groups(menu_group_key, menu_group_name),
        translations:screen_translations(*)
      `)
      .eq('id', id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Pantalla no encontrada' });
    return res.status(200).json({ success: true, screen: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST / ───────────────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { screen_key, screen_name, menu_label, menu_group_id, module_id, route_path, icon_key, sort_order = 0, is_active = true } = body;

    if (!screen_key || !screen_name || !menu_group_id) {
      return res.status(400).json({ error: 'Campos obligatorios: screen_key, screen_name, menu_group_id' });
    }
    if (!/^[A-Z0-9_]+$/.test(screen_key) || screen_key.length < 2) {
      return res.status(400).json({ error: 'screen_key: solo mayúsculas, números y guión bajo (mín. 2 chars)' });
    }
    if (route_path && !/^\/[a-z0-9/_-]+$/.test(route_path)) {
      return res.status(400).json({ error: 'route_path debe comenzar con / y usar solo minúsculas, números, /, _ o -' });
    }

    const Postgres = getPostgres();
    const { data: existing } = await Postgres
      .from('screens')
      .select('id')
      .eq('screen_key', screen_key.toUpperCase())
      .maybeSingle();
    if (existing) return res.status(409).json({ error: 'Ya existe una pantalla con esa clave' });

    const { data, error } = await Postgres
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
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ success: true, screen: data, message: 'Pantalla creada' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PUT /:id ─────────────────────────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const { screen_key, screen_name, menu_label, menu_group_id, module_id, route_path, icon_key, sort_order, is_active } = body;

    const Postgres = getPostgres();
    const { data: existing } = await Postgres
      .from('screens')
      .select('screen_key')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Pantalla no encontrada' });

    if (screen_key) {
      if (!/^[A-Z0-9_]+$/.test(screen_key) || screen_key.length < 2) {
        return res.status(400).json({ error: 'screen_key: solo mayúsculas, números y guión bajo (mín. 2 chars)' });
      }
      if (screen_key.toUpperCase() !== existing.screen_key) {
        const { data: dup } = await Postgres
          .from('screens')
          .select('id')
          .eq('screen_key', screen_key.toUpperCase())
          .neq('id', id)
          .maybeSingle();
        if (dup) return res.status(409).json({ error: 'Ya existe una pantalla con esa clave' });
      }
    }
    if (route_path && !/^\/[a-z0-9/_-]+$/.test(route_path)) {
      return res.status(400).json({ error: 'route_path debe comenzar con / y usar solo minúsculas, números, /, _ o -' });
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

    const { data, error } = await Postgres
      .from('screens')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SCREENS-MGMT] PUT /:id:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ success: true, screen: data, message: 'Pantalla actualizada' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PATCH /:id/status ────────────────────────────────────────────────────────

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') return res.status(400).json({ error: 'is_active debe ser booleano' });

    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('screens')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'No encontrada' });
    return res.status(200).json({ success: true, screen: data, message: `Pantalla ${is_active ? 'activada' : 'desactivada'}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /:id/translations ────────────────────────────────────────────────────

router.get('/:id/translations', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('screen_translations')
      .select('*')
      .eq('screen_id', id)
      .order('language_code');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, translations: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /:id/translations (upsert) ─────────────────────────────────────────

router.post('/:id/translations', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const { language_code, screen_name, menu_label } = body;

    if (!language_code || !screen_name) {
      return res.status(400).json({ error: 'Campos obligatorios: language_code, screen_name' });
    }

    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('screen_translations')
      .upsert({
        screen_id: id,
        language_code,
        screen_name,
        menu_label: menu_label || null,
      }, { onConflict: 'screen_id,language_code' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, translation: data, message: 'Traducción guardada' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

