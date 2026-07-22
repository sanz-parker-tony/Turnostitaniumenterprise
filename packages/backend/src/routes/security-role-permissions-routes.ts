import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';

type AuthContext = {
  userId: string;
  tenantId: string;
  authUserId: string;
};

const router = Router();

async function resolveAuthContext(req: Request): Promise<AuthContext | null> {
  const authUserId = String((req as any)?.user?.id || '').trim();
  if (!authUserId) return null;

  const userResult = await pool.query(
    `
      SELECT u.id AS user_id, u.tenant_id
      FROM users u
      WHERE u.auth_user_id = $1
        AND u.is_active = true
      LIMIT 1
    `,
    [authUserId]
  );

  const row = userResult.rows[0];
  if (!row?.user_id || !row?.tenant_id) return null;

  return {
    userId: String(row.user_id),
    tenantId: String(row.tenant_id),
    authUserId,
  };
}

async function ensureSystemAdmin(ctx: AuthContext): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1
        AND ur.tenant_id = $2
        AND ur.is_active = true
        AND r.is_active = true
        AND r.role_scope = 'SYSTEM'
        AND r.is_system_role = true
      LIMIT 1
    `,
    [ctx.userId, ctx.tenantId]
  );

  return result.rows.length > 0;
}

async function resolveTargetRole(tenantId: string, roleId: string) {
  const result = await pool.query(
    `
      SELECT r.id, r.role_key, r.role_name
      FROM roles r
      WHERE r.id = $1
        AND r.tenant_id = $2
        AND r.is_active = true
      LIMIT 1
    `,
    [roleId, tenantId]
  );

  return result.rows[0] || null;
}

router.get('/catalogs/roles', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isSystemAdmin = await ensureSystemAdmin(ctx);
    if (!isSystemAdmin) return res.status(403).json({ error: 'Solo SYSTEM_ADMIN puede gestionar permisos por rol' });

    const rolesResult = await pool.query(
      `
        SELECT
          r.id,
          r.role_key,
          r.role_name,
          r.role_scope
        FROM roles r
        WHERE r.tenant_id = $1
          AND r.is_active = true
        ORDER BY r.role_name, r.role_key
      `,
      [ctx.tenantId]
    );

    return res.status(200).json({ success: true, roles: rolesResult.rows });
  } catch (error: any) {
    console.error('[SECURITY-ROLE-PERMS] GET /catalogs/roles error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

router.get('/catalogs/screen-actions', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isSystemAdmin = await ensureSystemAdmin(ctx);
    if (!isSystemAdmin) return res.status(403).json({ error: 'Solo SYSTEM_ADMIN puede gestionar permisos por rol' });

    const result = await pool.query(
      `
        SELECT
          sa.id AS screen_action_id,
          sa.ui_element_key,
          s.id AS screen_id,
          s.screen_key,
          s.screen_name,
          s.sort_order AS screen_sort_order,
          COALESCE(s.menu_label, s.screen_name) AS menu_label,
          smg.menu_group_key,
          smg.menu_group_name,
          smg.sort_order AS menu_group_sort_order,
          a.id AS action_id,
          a.action_key,
          a.action_name
        FROM screen_actions sa
        JOIN screens s
          ON s.id = sa.screen_id
         AND s.is_active = true
        JOIN actions a
          ON a.id = sa.action_id
         AND a.is_active = true
        JOIN system_menu_groups smg
          ON smg.id = s.menu_group_id
         AND smg.is_active = true
        WHERE sa.is_active = true
        ORDER BY smg.sort_order, s.sort_order, a.action_key
      `
    );

    return res.status(200).json({ success: true, screen_actions: result.rows });
  } catch (error: any) {
    console.error('[SECURITY-ROLE-PERMS] GET /catalogs/screen-actions error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

router.get('/:role_id/permissions', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isSystemAdmin = await ensureSystemAdmin(ctx);
    if (!isSystemAdmin) return res.status(403).json({ error: 'Solo SYSTEM_ADMIN puede gestionar permisos por rol' });

    const roleId = String(req.params.role_id || '').trim();
    if (!roleId) return res.status(400).json({ error: 'role_id es requerido' });

    const role = await resolveTargetRole(ctx.tenantId, roleId);
    if (!role) return res.status(404).json({ error: 'Rol no encontrado en el tenant actual' });

    const permissionsResult = await pool.query(
      `
        SELECT
          rsa.id,
          rsa.screen_action_id,
          rsa.is_allowed,
          rsa.is_active
        FROM role_screen_actions rsa
        WHERE rsa.tenant_id = $1
          AND rsa.role_id = $2
      `,
      [ctx.tenantId, roleId]
    );

    return res.status(200).json({
      success: true,
      role,
      permissions: permissionsResult.rows,
    });
  } catch (error: any) {
    console.error('[SECURITY-ROLE-PERMS] GET /:role_id/permissions error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

router.post('/:role_id/permissions/bulk-upsert', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isSystemAdmin = await ensureSystemAdmin(ctx);
    if (!isSystemAdmin) return res.status(403).json({ error: 'Solo SYSTEM_ADMIN puede gestionar permisos por rol' });

    const roleId = String(req.params.role_id || '').trim();
    const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : [];

    if (!roleId) return res.status(400).json({ error: 'role_id es requerido' });
    if (!permissions.length) return res.status(400).json({ error: 'permissions[] es requerido' });

    const role = await resolveTargetRole(ctx.tenantId, roleId);
    if (!role) return res.status(404).json({ error: 'Rol no encontrado en el tenant actual' });

    await client.query('BEGIN');

    let created = 0;
    let updated = 0;
    for (const permission of permissions) {
      const screenActionId = String(permission?.screen_action_id || '').trim();
      if (!screenActionId) continue;

      const isAllowed = Boolean(permission?.is_allowed);

      const existingResult = await client.query(
        `
          SELECT id
          FROM role_screen_actions
          WHERE tenant_id = $1
            AND role_id = $2
            AND screen_action_id = $3
          LIMIT 1
        `,
        [ctx.tenantId, roleId, screenActionId]
      );

      const existingId = existingResult.rows?.[0]?.id as string | undefined;
      if (existingId) {
        await client.query(
          `
            UPDATE role_screen_actions
            SET
              is_allowed = $2,
              is_active = true,
              updated_by = 'SYSTEM',
              updated_at = now()
            WHERE id = $1
          `,
          [existingId, isAllowed]
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
              $4,
              true,
              'SYSTEM'
            )
          `,
          [ctx.tenantId, roleId, screenActionId, isAllowed]
        );
        created++;
      }
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      created,
      updated,
      message: `Permisos guardados (${created} creados, ${updated} actualizados)`,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('[SECURITY-ROLE-PERMS] POST /:role_id/permissions/bulk-upsert error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  } finally {
    client.release();
  }
});

export default router;
