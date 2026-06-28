/**
 * role-screen-actions-mgmt-routes.ts
 * Turnos Titanium Enterprise
 * CRUD para role_screen_actions (permisos por rol -> pantalla -> accion)
 */

import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

function actor(req: Request) {
  const user = (req as any)?.user;
  return String(user?.email || user?.id || 'SYSTEM');
}

// Catalogos
router.get('/catalogs/tenants', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `
        SELECT id, tenant_key, tenant_name
        FROM tenants
        ORDER BY tenant_name
      `
    );
    return res.status(200).json({ success: true, tenants: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.get('/catalogs/roles', async (req: Request, res: Response) => {
  try {
    const tenantId = String(req.query.tenant_id || '').trim();
    const params: any[] = [];
    let where = 'WHERE r.is_active = true';
    if (tenantId) {
      params.push(tenantId);
      where += ` AND r.tenant_id = $${params.length}`;
    }

    const result = await pool.query(
      `
        SELECT
          r.id,
          r.role_key,
          r.role_name,
          r.role_scope,
          r.tenant_id
        FROM roles r
        ${where}
        ORDER BY r.role_name, r.role_key
      `,
      params
    );
    return res.status(200).json({ success: true, roles: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.get('/catalogs/screen-actions', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `
        SELECT
          sa.id,
          sa.ui_element_key,
          s.screen_key,
          s.screen_name,
          s.menu_label,
          s.sort_order AS screen_sort_order,
          smg.menu_group_key,
          smg.menu_group_name,
          smg.sort_order AS menu_group_sort_order,
          a.action_key,
          a.action_name,
          (COALESCE(s.screen_name, s.screen_key) || ' -> ' || COALESCE(a.action_name, a.action_key)) AS label
        FROM screen_actions sa
        JOIN screens s
          ON s.id = sa.screen_id
         AND s.is_active = true
        LEFT JOIN system_menu_groups smg
          ON smg.id = s.menu_group_id
        JOIN actions a
          ON a.id = sa.action_id
         AND a.is_active = true
        WHERE sa.is_active = true
        ORDER BY smg.sort_order NULLS LAST, smg.menu_group_name, s.sort_order NULLS LAST, s.screen_name, a.action_name
      `
    );

    return res.status(200).json({ success: true, screenActions: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

// GET / - Listar permisos role_screen_actions
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = String(req.query.tenant_id || '').trim();
    const roleId = String(req.query.role_id || '').trim();
    const screenKey = String(req.query.screen_key || '').trim();

    const params: any[] = [];
    let where = 'WHERE 1=1';

    if (tenantId) {
      params.push(tenantId);
      where += ` AND rsa.tenant_id = $${params.length}`;
    }
    if (roleId) {
      params.push(roleId);
      where += ` AND rsa.role_id = $${params.length}`;
    }
    if (screenKey) {
      params.push(screenKey);
      where += ` AND s.screen_key = $${params.length}`;
    }

    const result = await pool.query(
      `
        SELECT
          rsa.id,
          rsa.tenant_id,
          rsa.role_id,
          rsa.screen_action_id,
          rsa.is_allowed,
          rsa.valid_from,
          rsa.valid_to,
          rsa.is_active,
          rsa.created_by,
          rsa.created_at,
          rsa.updated_by,
          rsa.updated_at,
          t.tenant_key,
          t.tenant_name,
          r.role_key,
          r.role_name,
          s.screen_key,
          s.screen_name,
          a.action_key,
          a.action_name,
          sa.ui_element_key
        FROM role_screen_actions rsa
        JOIN tenants t ON t.id = rsa.tenant_id
        JOIN roles r ON r.id = rsa.role_id
        JOIN screen_actions sa ON sa.id = rsa.screen_action_id
        JOIN screens s ON s.id = sa.screen_id
        JOIN actions a ON a.id = sa.action_id
        ${where}
        ORDER BY s.sort_order NULLS LAST, s.screen_name, a.action_name
      `,
      params
    );

    return res.status(200).json({
      success: true,
      permissions: result.rows,
      count: result.rows.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'id es obligatorio' });

    const result = await pool.query(
      `
        SELECT
          rsa.*,
          t.tenant_key,
          t.tenant_name,
          r.role_key,
          r.role_name,
          s.screen_key,
          s.screen_name,
          a.action_key,
          a.action_name,
          sa.ui_element_key
        FROM role_screen_actions rsa
        JOIN tenants t ON t.id = rsa.tenant_id
        JOIN roles r ON r.id = rsa.role_id
        JOIN screen_actions sa ON sa.id = rsa.screen_action_id
        JOIN screens s ON s.id = sa.screen_id
        JOIN actions a ON a.id = sa.action_id
        WHERE rsa.id = $1
        LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Permiso no encontrado' });
    return res.status(200).json({ success: true, permission: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.post('/bulk-upsert', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const tenantId = String(req.body?.tenant_id || '').trim();
    const roleId = String(req.body?.role_id || '').trim();
    const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : [];

    if (!tenantId || !roleId || !permissions.length) {
      return res.status(400).json({ error: 'Campos obligatorios: tenant_id, role_id, permissions[]' });
    }

    const roleResult = await client.query(
      `
        SELECT id
        FROM roles
        WHERE id = $1
          AND tenant_id = $2
        LIMIT 1
      `,
      [roleId, tenantId]
    );
    if (roleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rol no encontrado para el tenant indicado' });
    }

    await client.query('BEGIN');

    let updated = 0;
    let created = 0;
    let deleted = 0;
    for (const permission of permissions) {
      const screenActionId = String(permission?.screen_action_id || '').trim();
      if (!screenActionId) continue;
      const isAllowed = Boolean(permission?.is_allowed);

      const saResult = await client.query(
        `
          SELECT id
          FROM screen_actions
          WHERE id = $1
          LIMIT 1
        `,
        [screenActionId]
      );
      if (saResult.rows.length === 0) continue;

      const existingResult = await client.query(
        `
          SELECT id
          FROM role_screen_actions
          WHERE tenant_id = $1
            AND role_id = $2
            AND screen_action_id = $3
          LIMIT 1
        `,
        [tenantId, roleId, screenActionId]
      );

      const existingId = existingResult.rows[0]?.id as string | undefined;
      if (isAllowed) {
        if (existingId) {
          await client.query(
            `
              UPDATE role_screen_actions
              SET
                is_allowed = true,
                is_active = true,
                updated_by = $2,
                updated_at = now()
              WHERE id = $1
            `,
            [existingId, actor(req)]
          );
          updated++;
        } else {
          await client.query(
            `
              INSERT INTO role_screen_actions (
                id,
                tenant_id,
                role_id,
                screen_action_id,
                is_allowed,
                is_active,
                created_by
              )
              VALUES (
                gen_random_uuid(),
                $1,
                $2,
                $3,
                true,
                true,
                $4
              )
            `,
            [tenantId, roleId, screenActionId, actor(req)]
          );
          created++;
        }
      } else if (existingId) {
        await client.query(
          `
            DELETE FROM role_screen_actions
            WHERE id = $1
          `,
          [existingId]
        );
        deleted++;
      }
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      updated,
      created,
      deleted,
      message: `Permisos actualizados: ${updated} modificados, ${created} creados, ${deleted} eliminados`,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      tenant_id,
      role_id,
      screen_action_id,
      is_allowed = false,
      valid_from = null,
      valid_to = null,
      is_active = true,
    } = req.body || {};

    if (!tenant_id || !role_id || !screen_action_id) {
      return res.status(400).json({ error: 'Campos obligatorios: tenant_id, role_id, screen_action_id' });
    }

    const result = await pool.query(
      `
        INSERT INTO role_screen_actions (
          id,
          tenant_id,
          role_id,
          screen_action_id,
          is_allowed,
          valid_from,
          valid_to,
          is_active,
          created_by
        )
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8
        )
        RETURNING *
      `,
      [tenant_id, role_id, screen_action_id, Boolean(is_allowed), valid_from, valid_to, Boolean(is_active), actor(req)]
    );

    return res.status(201).json({
      success: true,
      permission: result.rows[0],
      message: 'Permiso creado',
    });
  } catch (err: any) {
    if (String(err?.code || '') === '23505') {
      return res.status(409).json({ error: 'Ya existe ese permiso para ese rol y pantalla-accion' });
    }
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    const { is_allowed, valid_from, valid_to, is_active } = req.body || {};

    const result = await pool.query(
      `
        UPDATE role_screen_actions
        SET
          is_allowed = COALESCE($2, is_allowed),
          valid_from = $3,
          valid_to = $4,
          is_active = COALESCE($5, is_active),
          updated_by = $6,
          updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [
        id,
        typeof is_allowed === 'boolean' ? is_allowed : null,
        valid_from === undefined ? null : valid_from,
        valid_to === undefined ? null : valid_to,
        typeof is_active === 'boolean' ? is_active : null,
        actor(req),
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Permiso no encontrado' });
    return res.status(200).json({ success: true, permission: result.rows[0], message: 'Permiso actualizado' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.patch('/:id/allowed', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    const isAllowed = req.body?.is_allowed;
    if (typeof isAllowed !== 'boolean') {
      return res.status(400).json({ error: 'is_allowed debe ser booleano' });
    }

    const result = await pool.query(
      `
        UPDATE role_screen_actions
        SET
          is_allowed = $2,
          updated_by = $3,
          updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [id, isAllowed, actor(req)]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Permiso no encontrado' });
    return res.status(200).json({
      success: true,
      permission: result.rows[0],
      message: `Permiso ${isAllowed ? 'concedido' : 'revocado'}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    const isActive = req.body?.is_active;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'is_active debe ser booleano' });
    }

    const result = await pool.query(
      `
        UPDATE role_screen_actions
        SET
          is_active = $2,
          updated_by = $3,
          updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [id, isActive, actor(req)]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Permiso no encontrado' });
    return res.status(200).json({
      success: true,
      permission: result.rows[0],
      message: isActive ? 'Activado' : 'Desactivado',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

export default router;
