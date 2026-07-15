/**
 * menu-groups-routes.ts
 * Turnos Titanium Enterprise
 * CRUD para system_menu_groups + system_menu_group_translations
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

function parseOrderedIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const ids = value.map((id) => String(id || '').trim());
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (ids.some((id) => !uuidPattern.test(id)) || new Set(ids).size !== ids.length) return null;
  return ids;
}

// ── Catálogos ────────────────────────────────────────────────────────────────

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

router.get('/catalogs/permission-levels', (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    permissionLevels: ['SYSTEM', 'TENANT', 'PUBLIC'],
  });
});

// ── GET / ────────────────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('system_menu_groups')
      .select(`*, translations:system_menu_group_translations(*)`)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[MENU-GROUPS] GET /:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ success: true, menuGroups: data || [], count: (data || []).length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Reordena todos los grupos, incluidos los inactivos, en una sola transaccion.
router.patch('/reorder', async (req: Request, res: Response) => {
  const orderedIds = parseOrderedIds(req.body?.ordered_ids);
  if (!orderedIds) {
    return res.status(400).json({ error: 'ordered_ids debe contener UUID unicos' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: menuGroupRows } = await client.query(
      `SELECT id
         FROM public.system_menu_groups
        ORDER BY sort_order, menu_group_name
        FOR UPDATE`
    );
    const menuGroupIds = menuGroupRows.map((row: { id: string }) => row.id);
    if (menuGroupIds.length !== orderedIds.length || menuGroupIds.some((id: string) => !orderedIds.includes(id))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ordered_ids debe incluir todos los grupos de menu activos e inactivos' });
    }

    const { rows } = await client.query(
      `WITH desired AS (
         SELECT id, (ordinality * 10)::integer AS sort_order
           FROM unnest($1::uuid[]) WITH ORDINALITY AS item(id, ordinality)
       )
       UPDATE public.system_menu_groups AS menu_group
          SET sort_order = desired.sort_order,
              updated_by = 'SYSTEM_ADMIN',
              updated_at = now()
         FROM desired
        WHERE menu_group.id = desired.id
       RETURNING menu_group.*`,
      [orderedIds]
    );

    await client.query('COMMIT');
    rows.sort((a: any, b: any) => a.sort_order - b.sort_order);
    return res.status(200).json({ success: true, menuGroups: rows, message: 'Orden de grupos actualizado' });
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
      .from('system_menu_groups')
      .select(`*, translations:system_menu_group_translations(*)`)
      .eq('id', id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Grupo de menú no encontrado' });
    return res.status(200).json({ success: true, menuGroup: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST / ───────────────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { menu_group_key, menu_group_name, menu_group_short_name, icon_key, sort_order = 0, permission_level, is_active = true } = body;

    if (!menu_group_key || !menu_group_name) {
      return res.status(400).json({ error: 'Campos obligatorios: menu_group_key, menu_group_name' });
    }
    if (!/^[A-Z0-9_]+$/.test(menu_group_key) || menu_group_key.length < 2) {
      return res.status(400).json({ error: 'menu_group_key: solo mayúsculas, números y guión bajo (mín. 2 chars)' });
    }

    const Postgres = getPostgres();
    const { data: existing } = await Postgres
      .from('system_menu_groups')
      .select('id')
      .eq('menu_group_key', menu_group_key.toUpperCase())
      .maybeSingle();
    if (existing) return res.status(409).json({ error: 'Ya existe un grupo con esa clave' });

    const { data, error } = await Postgres
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
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ success: true, menuGroup: data, message: 'Grupo de menú creado' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PUT /:id ─────────────────────────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const { menu_group_key, menu_group_name, menu_group_short_name, icon_key, sort_order, permission_level, is_active } = body;

    const Postgres = getPostgres();
    const { data: existing } = await Postgres
      .from('system_menu_groups')
      .select('menu_group_key')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Grupo de menú no encontrado' });

    if (menu_group_key) {
      if (!/^[A-Z0-9_]+$/.test(menu_group_key) || menu_group_key.length < 2) {
        return res.status(400).json({ error: 'menu_group_key: solo mayúsculas, números y guión bajo (mín. 2 chars)' });
      }
      if (menu_group_key.toUpperCase() !== existing.menu_group_key) {
        const { data: dup } = await Postgres
          .from('system_menu_groups')
          .select('id')
          .eq('menu_group_key', menu_group_key.toUpperCase())
          .neq('id', id)
          .maybeSingle();
        if (dup) return res.status(409).json({ error: 'Ya existe un grupo con esa clave' });
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

    const { data, error } = await Postgres
      .from('system_menu_groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[MENU-GROUPS] PUT /:id:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ success: true, menuGroup: data, message: 'Grupo de menú actualizado' });
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
      .from('system_menu_groups')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'No encontrado' });
    return res.status(200).json({ success: true, menuGroup: data, message: `Grupo ${is_active ? 'activado' : 'desactivado'}` });
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
      .from('system_menu_group_translations')
      .select('*')
      .eq('menu_group_id', id)
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
    const { language_code, menu_group_name, menu_group_short_name } = body;

    if (!language_code || !menu_group_name) {
      return res.status(400).json({ error: 'Campos obligatorios: language_code, menu_group_name' });
    }

    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('system_menu_group_translations')
      .upsert({
        menu_group_id: id,
        language_code,
        menu_group_name,
        menu_group_short_name: menu_group_short_name || null,
      }, { onConflict: 'menu_group_id,language_code' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, translation: data, message: 'Traducción guardada' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

