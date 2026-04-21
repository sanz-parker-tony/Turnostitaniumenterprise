/**
 * screen-actions-mgmt-routes.ts
 * Turnos Titanium Enterprise
 * CRUD para screen_actions (relación pantalla ↔ acción)
 * NOTA: Rutas estáticas ANTES de rutas dinámicas (/:id)
 */
import { Router } from 'express';
import { createDbClient } from '../lib/postgres-client.js';
const router = Router();
function getPostgres() {
    return createDbClient(process.env.Postgres_URL || '', process.env.Postgres_SERVICE_ROLE_KEY || '');
}
// ── Catálogos ────────────────────────────────────────────────────────────────
router.get('/catalogs/screens', async (req, res) => {
    try {
        const Postgres = getPostgres();
        const { data, error } = await Postgres
            .from('screens')
            .select('id, screen_key, screen_name, menu_label')
            .eq('is_active', true)
            .order('screen_name');
        if (error)
            return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, screens: data || [] });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
router.get('/catalogs/actions', async (req, res) => {
    try {
        const Postgres = getPostgres();
        const { data, error } = await Postgres
            .from('actions')
            .select('id, action_key, action_name')
            .eq('is_active', true)
            .order('action_name');
        if (error)
            return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, actions: data || [] });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// ── GET / ────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const Postgres = getPostgres();
        const { data, error } = await Postgres
            .from('screen_actions')
            .select(`
        *,
        screen:screens!screen_actions_screen_id_fkey(screen_key, screen_name, menu_label),
        action:actions!screen_actions_action_id_fkey(action_key, action_name)
      `)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('[SCREEN-ACTIONS] GET /:', error);
            return res.status(500).json({ error: error.message });
        }
        const result = (data || []).map((sa) => ({
            ...sa,
            screen_key: sa.screen?.screen_key || null,
            screen_name: sa.screen?.screen_name || null,
            screen_menu_label: sa.screen?.menu_label || null,
            action_key: sa.action?.action_key || null,
            action_name: sa.action?.action_name || null,
        }));
        return res.status(200).json({ success: true, screenActions: result, count: result.length });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// ── GET /:id ─────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
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
        if (error || !data)
            return res.status(404).json({ error: 'Acción de pantalla no encontrada' });
        return res.status(200).json({ success: true, screenAction: data });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// ── POST / ───────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const body = req.body;
        const { screen_id, action_id, ui_element_key, is_active = true } = body;
        if (!screen_id || !action_id) {
            return res.status(400).json({ error: 'Campos obligatorios: screen_id, action_id' });
        }
        const Postgres = getPostgres();
        const { data: existing } = await Postgres
            .from('screen_actions')
            .select('id')
            .eq('screen_id', screen_id)
            .eq('action_id', action_id)
            .maybeSingle();
        if (existing)
            return res.status(409).json({ error: 'Ya existe esa combinación pantalla-acción' });
        const { data, error } = await Postgres
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
            return res.status(500).json({ error: error.message });
        }
        return res.status(201).json({ success: true, screenAction: data, message: 'Acción de pantalla creada' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// ── PUT /:id ─────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
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
        if (!existing)
            return res.status(404).json({ error: 'Acción de pantalla no encontrada' });
        const updateData = { updated_by: 'system', updated_at: new Date().toISOString() };
        if (ui_element_key !== undefined)
            updateData.ui_element_key = ui_element_key || null;
        if (is_active !== undefined)
            updateData.is_active = is_active;
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// ── PATCH /:id/status ────────────────────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
    try {
        const id = req.params.id;
        const { is_active } = req.body;
        if (typeof is_active !== 'boolean')
            return res.status(400).json({ error: 'is_active debe ser booleano' });
        const Postgres = getPostgres();
        const { data, error } = await Postgres
            .from('screen_actions')
            .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error)
            return res.status(500).json({ error: error.message });
        if (!data)
            return res.status(404).json({ error: 'No encontrado' });
        return res.status(200).json({ success: true, screenAction: data, message: `${is_active ? 'Activado' : 'Desactivado'}` });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
export default router;
//# sourceMappingURL=screen-actions-mgmt-routes.js.map