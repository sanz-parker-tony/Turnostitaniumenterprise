/**
 * actions-mgmt-routes.ts
 * Turnos Titanium Enterprise
 * CRUD para la tabla actions
 */
import { Router } from 'express';
import { createDbClient } from '../lib/postgres-client.js';
const router = Router();
function getPostgres() {
    return createDbClient(process.env.Postgres_URL || '', process.env.Postgres_SERVICE_ROLE_KEY || '');
}
// ── GET / ────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const Postgres = getPostgres();
        const { data, error } = await Postgres
            .from('actions')
            .select('*')
            .order('action_key', { ascending: true });
        if (error) {
            console.error('[ACTIONS] GET /:', error);
            return res.status(500).json({ error: error.message });
        }
        return res.status(200).json({ success: true, actions: data || [], count: (data || []).length });
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
            .from('actions')
            .select('*')
            .eq('id', id)
            .single();
        if (error || !data)
            return res.status(404).json({ error: 'Acción no encontrada' });
        return res.status(200).json({ success: true, action: data });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// ── POST / ───────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const body = req.body;
        const { action_key, action_name, is_active = true } = body;
        if (!action_key || !action_name) {
            return res.status(400).json({ error: 'Campos obligatorios: action_key, action_name' });
        }
        if (!/^[A-Z0-9_]+$/.test(action_key) || action_key.length < 2) {
            return res.status(400).json({ error: 'action_key: solo mayúsculas, números y guión bajo (mín. 2 chars)' });
        }
        const Postgres = getPostgres();
        const { data: existing } = await Postgres
            .from('actions')
            .select('id')
            .eq('action_key', action_key.toUpperCase())
            .maybeSingle();
        if (existing)
            return res.status(409).json({ error: 'Ya existe una acción con esa clave' });
        const { data, error } = await Postgres
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
            return res.status(500).json({ error: error.message });
        }
        return res.status(201).json({ success: true, action: data, message: 'Acción creada' });
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
        const { action_key, action_name, is_active } = body;
        const Postgres = getPostgres();
        const { data: existing } = await Postgres
            .from('actions')
            .select('action_key')
            .eq('id', id)
            .maybeSingle();
        if (!existing)
            return res.status(404).json({ error: 'Acción no encontrada' });
        if (action_key) {
            if (!/^[A-Z0-9_]+$/.test(action_key) || action_key.length < 2) {
                return res.status(400).json({ error: 'action_key: solo mayúsculas, números y guión bajo (mín. 2 chars)' });
            }
            if (action_key.toUpperCase() !== existing.action_key) {
                const { data: dup } = await Postgres
                    .from('actions')
                    .select('id')
                    .eq('action_key', action_key.toUpperCase())
                    .neq('id', id)
                    .maybeSingle();
                if (dup)
                    return res.status(409).json({ error: 'Ya existe una acción con esa clave' });
            }
        }
        const updateData = { updated_by: 'system', updated_at: new Date().toISOString() };
        if (action_key !== undefined)
            updateData.action_key = action_key.toUpperCase();
        if (action_name !== undefined)
            updateData.action_name = action_name;
        if (is_active !== undefined)
            updateData.is_active = is_active;
        const { data, error } = await Postgres
            .from('actions')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            console.error('[ACTIONS] PUT /:id:', error);
            return res.status(500).json({ error: error.message });
        }
        return res.status(200).json({ success: true, action: data, message: 'Acción actualizada' });
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
            .from('actions')
            .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error)
            return res.status(500).json({ error: error.message });
        if (!data)
            return res.status(404).json({ error: 'No encontrada' });
        return res.status(200).json({ success: true, action: data, message: `Acción ${is_active ? 'activada' : 'desactivada'}` });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
export default router;
//# sourceMappingURL=actions-mgmt-routes.js.map