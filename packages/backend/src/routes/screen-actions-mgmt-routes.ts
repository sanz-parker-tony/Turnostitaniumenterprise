/**
 * screen-actions-mgmt-routes.ts
 * Turnos Titanium Enterprise
 * CRUD para screen_actions (relación pantalla ↔ acción)
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

// ── Catálogos ────────────────────────────────────────────────────────────────

router.get('/catalogs/screens', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('screens')
      .select('id, screen_key, screen_name, menu_label')
      .eq('is_active', true)
      .order('screen_name');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, screens: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/catalogs/actions', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('actions')
      .select('id, action_key, action_name')
      .eq('is_active', true)
      .order('action_name');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, actions: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET / ────────────────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const screenId = String(req.query.screen_id || '').trim();
    const params: any[] = [];
    const screenFilter = screenId ? 'WHERE sa.screen_id = $1::uuid' : '';
    if (screenId) params.push(screenId);

    const { rows: result } = await pool.query(`
      SELECT
        sa.*,
        s.screen_key,
        s.screen_name,
        s.menu_label AS screen_menu_label,
        a.action_key,
        a.action_name
      FROM public.screen_actions sa
      JOIN public.screens s ON s.id = sa.screen_id
      JOIN public.actions a ON a.id = sa.action_id
      ${screenFilter}
      ORDER BY sa.created_at DESC
    `, params);

    return res.status(200).json({ success: true, screenActions: result, count: result.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('screen_actions')
      .select(`
        *,
        screen:screens!screen_actions_screen_id_fkey(screen_key, screen_name),
        action:actions!screen_actions_action_id_fkey(action_key, action_name)
      `)
      .eq('id', id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Acción de pantalla no encontrada' });
    return res.status(200).json({ success: true, screenAction: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST / ───────────────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { screen_id, action_id, ui_element_key, is_active = true } = body;

    if (!screen_id || !action_id) {
      return res.status(400).json({ error: 'Campos obligatorios: screen_id, action_id' });
    }

    const { rows } = await pool.query(
      `
        INSERT INTO public.screen_actions (
          screen_id, action_id, ui_element_key, is_active, created_by
        )
        VALUES ($1::uuid, $2::uuid, $3, $4, 'SYSTEM')
        ON CONFLICT (screen_id, action_id) DO UPDATE SET
          ui_element_key = COALESCE(EXCLUDED.ui_element_key, public.screen_actions.ui_element_key),
          is_active = true,
          updated_by = 'SYSTEM',
          updated_at = now()
        RETURNING *
      `,
      [screen_id, action_id, ui_element_key || null, is_active !== false]
    );

    return res.status(200).json({
      success: true,
      screenAction: rows[0],
      message: 'Acción vinculada o reactivada correctamente',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PUT /:id ─────────────────────────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const { ui_element_key, is_active } = body;

    const Postgres = getPostgres();
    const { data: existing } = await Postgres
      .from('screen_actions')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Acción de pantalla no encontrada' });

    const updateData: any = { updated_by: 'system', updated_at: new Date().toISOString() };
    if (ui_element_key !== undefined) updateData.ui_element_key = ui_element_key || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await Postgres
      .from('screen_actions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SCREEN-ACTIONS] PUT /:id:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ success: true, screenAction: data, message: 'Actualizado' });
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
      .from('screen_actions')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'No encontrado' });
    return res.status(200).json({ success: true, screenAction: data, message: `${is_active ? 'Activado' : 'Desactivado'}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

