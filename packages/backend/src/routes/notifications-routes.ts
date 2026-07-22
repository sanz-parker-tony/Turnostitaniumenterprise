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

const terminalRequestStatusesSql = `
  'APPROVED', 'APROBADO', 'APROBADA',
  'REJECTED', 'RECHAZADO', 'RECHAZADA',
  'CANCELLED', 'CANCELED', 'CANCELADO', 'CANCELADA',
  'COMPLETED', 'COMPLETE', 'CUMPLIDO', 'CUMPLIDA',
  'FULFILLED', 'RESOLVED', 'RESUELTO', 'RESUELTA',
  'CLOSED', 'CERRADO', 'CERRADA',
  'PROCESSED', 'PROCESADO', 'PROCESADA',
  'EXPIRED', 'EXPIRADO', 'EXPIRADA',
  'VOID', 'ANULADO', 'ANULADA'
`;

/**
 * Las notificaciones de creación solo permanecen visibles mientras el asunto
 * siga pendiente. Las notificaciones de decisión y los avisos genéricos se
 * conservan hasta que el usuario los marque como leídos.
 */
const currentNotificationSql = `
  (
    n.ref_table IS NULL
    OR n.ref_table NOT IN (
      'employee_absence_requests',
      'employee_shift_change_requests',
      'employee_time_punch_change_requests',
      'employee_time_punches'
    )
    OR (
      n.ref_table = 'employee_absence_requests'
      AND (
        UPPER(COALESCE(notification_type.lookup_key, '')) LIKE '%_DECIDED'
        OR EXISTS (
          SELECT 1
          FROM public.employee_absence_requests request
          LEFT JOIN public.lookup_values status ON status.id = request.request_status_id
          WHERE request.id = n.ref_id
            AND request.tenant_id = n.tenant_id
            AND request.is_active = true
            AND UPPER(COALESCE(status.lookup_key, status.lookup_label, '')) NOT IN (${terminalRequestStatusesSql})
        )
      )
    )
    OR (
      n.ref_table = 'employee_shift_change_requests'
      AND (
        UPPER(COALESCE(notification_type.lookup_key, '')) LIKE '%_DECIDED'
        OR EXISTS (
          SELECT 1
          FROM public.employee_shift_change_requests request
          LEFT JOIN public.lookup_values status ON status.id = request.request_status_id
          WHERE request.id = n.ref_id
            AND request.tenant_id = n.tenant_id
            AND request.is_active = true
            AND UPPER(COALESCE(status.lookup_key, status.lookup_label, '')) NOT IN (${terminalRequestStatusesSql})
        )
      )
    )
    OR (
      n.ref_table = 'employee_time_punch_change_requests'
      AND (
        UPPER(COALESCE(notification_type.lookup_key, '')) LIKE '%_DECIDED'
        OR EXISTS (
          SELECT 1
          FROM public.employee_time_punch_change_requests request
          LEFT JOIN public.lookup_values status ON status.id = request.request_status_id
          WHERE request.id = n.ref_id
            AND request.tenant_id = n.tenant_id
            AND request.is_active = true
            AND UPPER(COALESCE(status.lookup_key, status.lookup_label, '')) NOT IN (${terminalRequestStatusesSql})
        )
      )
    )
    OR (
      n.ref_table = 'employee_time_punches'
      AND EXISTS (
        SELECT 1
        FROM public.employee_time_punches referenced_punch
        INNER JOIN public.attendance_movements movement
          ON movement.id = NULLIF(n.metadata->>'movement_id', '')::uuid
         AND movement.tenant_id = referenced_punch.tenant_id
         AND movement.is_active = true
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*) FILTER (
              WHERE candidate.punch_key_lookup_id = movement.start_punch_key_id
                AND (
                  candidate.punch_datetime < referenced_punch.punch_datetime
                  OR (
                    candidate.punch_datetime = referenced_punch.punch_datetime
                    AND candidate.id <= referenced_punch.id
                  )
                )
            )::int AS referenced_start_rank,
            COUNT(*) FILTER (
              WHERE candidate.punch_key_lookup_id = movement.end_punch_key_id
                AND (
                  candidate.punch_datetime < referenced_punch.punch_datetime
                  OR (
                    candidate.punch_datetime = referenced_punch.punch_datetime
                    AND candidate.id <= referenced_punch.id
                  )
                )
            )::int AS referenced_end_rank,
            COUNT(*) FILTER (WHERE candidate.punch_key_lookup_id = movement.start_punch_key_id)::int AS start_count,
            COUNT(*) FILTER (WHERE candidate.punch_key_lookup_id = movement.end_punch_key_id)::int AS end_count
          FROM public.employee_time_punches candidate
          WHERE candidate.tenant_id = referenced_punch.tenant_id
            AND candidate.company_id = referenced_punch.company_id
            AND candidate.employee_id = referenced_punch.employee_id
            AND candidate.is_active = true
            AND candidate.punch_key_lookup_id IN (movement.start_punch_key_id, movement.end_punch_key_id)
            AND date_trunc('day', candidate.punch_datetime) = date_trunc('day', referenced_punch.punch_datetime)
        ) pairing ON true
        WHERE referenced_punch.id = n.ref_id
          AND referenced_punch.tenant_id = n.tenant_id
          AND referenced_punch.is_active = true
          AND (
            (referenced_punch.punch_key_lookup_id = movement.start_punch_key_id AND pairing.end_count < pairing.referenced_start_rank)
            OR (referenced_punch.punch_key_lookup_id = movement.end_punch_key_id AND pairing.start_count < pairing.referenced_end_rank)
          )
      )
    )
  )
`;

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
        WITH current_notifications AS (
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
            notification_type.lookup_key AS notification_type_key,
            notification_type.lookup_label AS notification_type_label
          FROM public.user_notifications n
          LEFT JOIN public.lookup_values notification_type
            ON notification_type.id = n.notification_type_id
          WHERE n.tenant_id = $1::uuid
            AND n.user_id = $2::uuid
            AND n.is_active = true
            AND ${currentNotificationSql}
        )
        SELECT
          current_notifications.*,
          COUNT(*) FILTER (WHERE is_read = false) OVER ()::int AS current_unread_count
        FROM current_notifications
        WHERE $3::boolean = true OR is_read = false
        ORDER BY created_at DESC
        LIMIT $4::int
      `,
      [userContext.tenant_id, userContext.user_id, includeRead, limit]
    );

    const unreadCount = Number(itemsResult.rows[0]?.current_unread_count || 0);
    const notifications = itemsResult.rows.map(({ current_unread_count: _count, ...item }) => item);

    return res.status(200).json({
      success: true,
      unread_count: unreadCount,
      notifications,
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
