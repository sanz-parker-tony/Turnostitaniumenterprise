import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

function getActor(req: Request): string {
  const user = (req as any).user;
  return user?.email || user?.id || 'system';
}

async function resolveRequestUserContext(req: Request): Promise<{ user_id: string; tenant_id: string } | null> {
  const user = (req as any).user;
  if (!user?.id) return null;

  const result = await pool.query(
    `
      SELECT id AS user_id, tenant_id
      FROM public.users
      WHERE auth_user_id = $1
        AND is_active = true
      LIMIT 1
    `,
    [user.id]
  );

  const row = result.rows[0];
  if (!row?.user_id || !row?.tenant_id) return null;
  return { user_id: row.user_id, tenant_id: row.tenant_id };
}

router.get('/me', async (req: Request, res: Response) => {
  try {
    const userContext = await resolveRequestUserContext(req);
    if (!userContext?.tenant_id || !userContext?.user_id) {
      return res.status(400).json({ error: 'No se pudo resolver contexto de usuario' });
    }

    const includeRead = String(req.query.include_read || '').toLowerCase() === 'true';
    const limitValue = Number(req.query.limit || 20);
    const limit = Number.isFinite(limitValue) ? Math.max(1, Math.min(100, Math.trunc(limitValue))) : 20;

    const itemsResult = await pool.query(
      `
        SELECT
          n.id,
          n.tenant_id,
          n.user_id,
          n.notification_type_id,
          n.title,
          n.message,
          n.icon_key,
          n.ref_table,
          n.ref_id,
          n.metadata,
          n.is_read,
          n.read_at,
          n.created_at,
          lv.lookup_key AS notification_type_key,
          lv.lookup_label AS notification_type_label
        FROM public.user_notifications n
        LEFT JOIN public.lookup_values lv
          ON lv.id = n.notification_type_id
        WHERE n.tenant_id = $1::uuid
          AND n.user_id = $2::uuid
          AND n.is_active = true
          AND ($3::boolean = true OR n.is_read = false)
        ORDER BY n.created_at DESC
        LIMIT $4::int
      `,
      [userContext.tenant_id, userContext.user_id, includeRead, limit]
    );

    const unreadResult = await pool.query(
      `
        SELECT COUNT(*)::int AS unread_count
        FROM public.user_notifications
        WHERE tenant_id = $1::uuid
          AND user_id = $2::uuid
          AND is_active = true
          AND is_read = false
      `,
      [userContext.tenant_id, userContext.user_id]
    );

    return res.status(200).json({
      success: true,
      unread_count: Number(unreadResult.rows[0]?.unread_count || 0),
      notifications: itemsResult.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.patch('/:notification_id/read', async (req: Request, res: Response) => {
  try {
    const userContext = await resolveRequestUserContext(req);
    if (!userContext?.tenant_id || !userContext?.user_id) {
      return res.status(400).json({ error: 'No se pudo resolver contexto de usuario' });
    }

    const notificationId = String(req.params.notification_id || '').trim();
    if (!notificationId) return res.status(400).json({ error: 'notification_id es obligatorio' });

    const result = await pool.query(
      `
        UPDATE public.user_notifications
        SET
          is_read = true,
          read_at = COALESCE(read_at, now()),
          updated_by = $4,
          updated_at = now()
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
          AND user_id = $3::uuid
          AND is_active = true
        RETURNING id, is_read, read_at
      `,
      [notificationId, userContext.tenant_id, userContext.user_id, getActor(req)]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Notificacion no encontrada' });
    return res.status(200).json({ success: true, notification: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.patch('/me/read-all', async (req: Request, res: Response) => {
  try {
    const userContext = await resolveRequestUserContext(req);
    if (!userContext?.tenant_id || !userContext?.user_id) {
      return res.status(400).json({ error: 'No se pudo resolver contexto de usuario' });
    }

    const result = await pool.query(
      `
        UPDATE public.user_notifications
        SET
          is_read = true,
          read_at = COALESCE(read_at, now()),
          updated_by = $3,
          updated_at = now()
        WHERE tenant_id = $1::uuid
          AND user_id = $2::uuid
          AND is_active = true
          AND is_read = false
      `,
      [userContext.tenant_id, userContext.user_id, getActor(req)]
    );

    return res.status(200).json({
      success: true,
      updated_count: result.rowCount || 0,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

export default router;
