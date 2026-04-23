/**
 * role-screen-actions-mgmt-routes.ts
 * Turnos Titanium Enterprise
 * CRUD para role_screen_actions (permisos por rol → pantalla → acción)
 * NOTA: Rutas estáticas ANTES de rutas dinámicas (/:id)
 */

import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';

const router = Router();

function getPostgres() {
  return createDbClient(
    process.env.Postgres_URL || '',
    process.env.Postgres_SERVICE_ROLE_KEY || ''
  );
}

// ── Catálogos ────────────────────────────────────────────────────────────────

router.get('/catalogs/tenants', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('tenants')
      .select('id, tenant_key, tenant_name')
      .order('tenant_name');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, tenants: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/catalogs/roles', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('roles')
      .select('id, role_key, role_name, role_scope, tenant_id')
      .eq('is_active', true)
      .order('role_name');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, roles: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/catalogs/screen-actions', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('screen_actions')
      .select(`
        id, ui_element_key, is_active,
        screen:screens!screen_actions_screen_id_fkey(screen_key, screen_name),
        action:actions!screen_actions_action_id_fkey(action_key, action_name)
      `)
      .eq('is_active', true)
      .order('created_at');

    if (error) return res.status(500).json({ error: error.message });

    const result = (data || []).map((sa: any) => ({
      id: sa.id,
      ui_element_key: sa.ui_element_key,
      screen_key: sa.screen?.screen_key || null,
      screen_name: sa.screen?.screen_name || null,
      action_key: sa.action?.action_key || null,
      action_name: sa.action?.action_name || null,
      label: `${sa.screen?.screen_name || '?'} → ${sa.action?.action_name || '?'}`,
    }));

    return res.status(200).json({ success: true, screenActions: result || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET / - Listar con todos los joins ───────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();

    // Query params opcionales
    const tenantId = req.query.tenant_id as string;
    const roleId = req.query.role_id as string;
    const screenKey = req.query.screen_key as string;

    let query = Postgres
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
      return res.status(500).json({ error: error.message });
    }

    const result = (data || []).map((rsa: any) => ({
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
    })).filter((rsa: any) => {
      if (screenKey) return rsa.screen_key === screenKey;
      return true;
    });

    return res.status(200).json({ success: true, permissions: result, count: result.length });
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
    if (error || !data) return res.status(404).json({ error: 'Permiso no encontrado' });
    return res.status(200).json({ success: true, permission: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST / ───────────────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { tenant_id, role_id, screen_action_id, is_allowed = false, valid_from, valid_to, is_active = true } = body;

    if (!tenant_id || !role_id || !screen_action_id) {
      return res.status(400).json({ error: 'Campos obligatorios: tenant_id, role_id, screen_action_id' });
    }

    const Postgres = getPostgres();
    const { data: existing } = await Postgres
      .from('role_screen_actions')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('role_id', role_id)
      .eq('screen_action_id', screen_action_id)
      .maybeSingle();
    if (existing) return res.status(409).json({ error: 'Ya existe ese permiso para ese rol y pantalla-acción' });

    const { data, error } = await Postgres
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
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ success: true, permission: data, message: 'Permiso creado' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PUT /:id ─────────────────────────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const { is_allowed, valid_from, valid_to, is_active } = body;

    const Postgres = getPostgres();
    const { data: existing } = await Postgres
      .from('role_screen_actions')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Permiso no encontrado' });

    const updateData: any = { updated_by: 'system', updated_at: new Date().toISOString() };
    if (is_allowed !== undefined) updateData.is_allowed = is_allowed;
    if (valid_from !== undefined) updateData.valid_from = valid_from || null;
    if (valid_to !== undefined) updateData.valid_to = valid_to || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await Postgres
      .from('role_screen_actions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ROLE-SCREEN-ACTIONS] PUT /:id:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ success: true, permission: data, message: 'Permiso actualizado' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PATCH /:id/allowed ───────────────────────────────────────────────────────

router.patch('/:id/allowed', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { is_allowed } = req.body;
    if (typeof is_allowed !== 'boolean') return res.status(400).json({ error: 'is_allowed debe ser booleano' });

    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('role_screen_actions')
      .update({ is_allowed, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'No encontrado' });
    return res.status(200).json({ success: true, permission: data, message: `Permiso ${is_allowed ? 'concedido' : 'revocado'}` });
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
      .from('role_screen_actions')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'No encontrado' });
    return res.status(200).json({ success: true, permission: data, message: `${is_active ? 'Activado' : 'Desactivado'}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /bulk-upsert ─────────────────────────────────────────────────────────
// Actualización masiva: dado un rol, actualiza is_allowed para varios screen_actions

router.post('/bulk-upsert', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { tenant_id, role_id, permissions } = body;
    // permissions = [{ screen_action_id, is_allowed }]

    if (!tenant_id || !role_id || !Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Campos obligatorios: tenant_id, role_id, permissions[]' });
    }

    const Postgres = getPostgres();
    let updated = 0;
    let created = 0;

    for (const perm of permissions) {
      const { screen_action_id, is_allowed } = perm;
      if (!screen_action_id) continue;

      const { data: existing } = await Postgres
        .from('role_screen_actions')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('role_id', role_id)
        .eq('screen_action_id', screen_action_id)
        .maybeSingle();

      if (existing) {
        await Postgres
          .from('role_screen_actions')
          .update({ is_allowed, updated_by: 'system', updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        updated++;
      } else {
        await Postgres
          .from('role_screen_actions')
          .insert({ tenant_id, role_id, screen_action_id, is_allowed, is_active: true, created_by: 'system' });
        created++;
      }
    }

    return res.status(200).json({ success: true, message: `Permisos actualizados: ${updated} modificados, ${created} creados`, updated, created });
  } catch (err: any) {
    console.error('[ROLE-SCREEN-ACTIONS] POST /bulk-upsert:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;

