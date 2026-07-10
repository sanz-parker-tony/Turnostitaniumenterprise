import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

function getActor(req: Request): string {
  const user = (req as any).user;
  return user?.email || user?.id || 'system';
}

async function resolveTenantId(req: Request): Promise<string | null> {
  const explicit = req.query.tenant_id || req.body?.tenant_id;
  if (typeof explicit === 'string' && explicit.trim()) {
    return explicit.trim();
  }

  const user = (req as any).user;
  if (!user?.id) return null;

  const result = await pool.query(
    `
      SELECT tenant_id
      FROM public.users
      WHERE auth_user_id = $1
      LIMIT 1
    `,
    [user.id]
  );

  return result.rows[0]?.tenant_id || null;
}

router.get('/catalogs', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const [profilesResult, eventsResult] = await Promise.all([
      pool.query(
        `
          SELECT
            id,
            profile_name,
            profile_short_name,
            legacy_id AS employee_profile_code,
            is_active
          FROM public.employee_profiles
          WHERE tenant_id = $1
            AND is_active = true
          ORDER BY profile_name ASC
        `,
        [tenantId]
      ),
      pool.query(
        `
          SELECT
            id,
            event_name,
            event_short_name,
            is_active
          FROM public.attendance_events
          WHERE tenant_id = $1
            AND is_active = true
          ORDER BY event_name ASC
        `,
        [tenantId]
      ),
    ]);

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      employee_profiles: profilesResult.rows,
      attendance_events: eventsResult.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/profile/:profileId', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const profileId = String(req.params.profileId || '').trim();
    if (!profileId) return res.status(400).json({ error: 'profileId es obligatorio' });

    const result = await pool.query(
      `
        SELECT
          epae.id,
          epae.employee_profile_id,
          epae.attendance_event_id,
          epae.requires_approval,
          epae.export_to_payroll,
          epae.is_active,
          ae.event_name,
          ae.event_short_name
        FROM public.employee_profile_attendance_events epae
        INNER JOIN public.attendance_events ae
          ON ae.id = epae.attendance_event_id
         AND ae.tenant_id = epae.tenant_id
        WHERE epae.tenant_id = $1
          AND epae.employee_profile_id = $2
          AND epae.is_active = true
        ORDER BY ae.event_name ASC
      `,
      [tenantId, profileId]
    );

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      employee_profile_id: profileId,
      items: result.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.put('/profile/:profileId', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const profileId = String(req.params.profileId || '').trim();
    if (!profileId) return res.status(400).json({ error: 'profileId es obligatorio' });

    const actor = getActor(req);

    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const normalized: Array<{
      attendance_event_id: string;
      requires_approval: boolean;
      export_to_payroll: boolean;
      is_active: boolean;
    }> = [];

    const seen = new Set<string>();
    for (let index = 0; index < rawItems.length; index += 1) {
      const row = rawItems[index] || {};
      const eventId = String(row.attendance_event_id || '').trim();
      if (!eventId) {
        return res.status(400).json({ error: `attendance_event_id es obligatorio en la fila ${index + 1}` });
      }
      if (seen.has(eventId)) {
        return res.status(400).json({ error: `attendance_event_id repetido en la lista: ${eventId}` });
      }
      seen.add(eventId);
      normalized.push({
        attendance_event_id: eventId,
        requires_approval: row.requires_approval !== false,
        export_to_payroll: row.export_to_payroll !== false,
        is_active: row.is_active !== false,
      });
    }

    await client.query('BEGIN');

    const profileResult = await client.query(
      `
        SELECT id
        FROM public.employee_profiles
        WHERE id = $1
          AND tenant_id = $2
        LIMIT 1
      `,
      [profileId, tenantId]
    );

    if (!profileResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Perfil no encontrado para el tenant' });
    }

    if (normalized.length > 0) {
      const eventIds = normalized.map((item) => item.attendance_event_id);
      const validEvents = await client.query(
        `
          SELECT id
          FROM public.attendance_events
          WHERE tenant_id = $1
            AND id = ANY($2::uuid[])
            AND is_active = true
        `,
        [tenantId, eventIds]
      );

      if (validEvents.rowCount !== new Set(eventIds).size) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Una o más novedades no existen o están inactivas para este tenant' });
      }
    }

    if (normalized.length === 0) {
      await client.query(
        `
          UPDATE public.employee_profile_attendance_events
             SET is_active = false,
                 updated_by = $3,
                 updated_at = now()
           WHERE tenant_id = $1
             AND employee_profile_id = $2
             AND is_active = true
        `,
        [tenantId, profileId, actor]
      );
    } else {
      const eventIds = normalized.map((item) => item.attendance_event_id);
      const requires = normalized.map((item) => item.requires_approval);
      const payroll = normalized.map((item) => item.export_to_payroll);
      const activeFlags = normalized.map((item) => item.is_active);

      await client.query(
        `
          INSERT INTO public.employee_profile_attendance_events (
            id,
            tenant_id,
            employee_profile_id,
            attendance_event_id,
            requires_approval,
            export_to_payroll,
            is_active,
            created_by
          )
          SELECT
            gen_random_uuid(),
            $1,
            $2,
            data.attendance_event_id,
            data.requires_approval,
            data.export_to_payroll,
            data.is_active,
            $3
          FROM unnest($4::uuid[], $5::boolean[], $6::boolean[], $7::boolean[]) AS data(
            attendance_event_id,
            requires_approval,
            export_to_payroll,
            is_active
          )
          ON CONFLICT (tenant_id, employee_profile_id, attendance_event_id)
          DO UPDATE SET
            requires_approval = EXCLUDED.requires_approval,
            export_to_payroll = EXCLUDED.export_to_payroll,
            is_active = EXCLUDED.is_active,
            updated_by = $3,
            updated_at = now()
        `,
        [tenantId, profileId, actor, eventIds, requires, payroll, activeFlags]
      );

      await client.query(
        `
          UPDATE public.employee_profile_attendance_events
             SET is_active = false,
                 updated_by = $4,
                 updated_at = now()
           WHERE tenant_id = $1
             AND employee_profile_id = $2
             AND attendance_event_id <> ALL($3::uuid[])
             AND is_active = true
        `,
        [tenantId, profileId, eventIds, actor]
      );
    }

    const result = await client.query(
      `
        SELECT
          epae.id,
          epae.employee_profile_id,
          epae.attendance_event_id,
          epae.requires_approval,
          epae.export_to_payroll,
          epae.is_active,
          ae.event_name,
          ae.event_short_name
        FROM public.employee_profile_attendance_events epae
        INNER JOIN public.attendance_events ae
          ON ae.id = epae.attendance_event_id
         AND ae.tenant_id = epae.tenant_id
        WHERE epae.tenant_id = $1
          AND epae.employee_profile_id = $2
          AND epae.is_active = true
        ORDER BY ae.event_name ASC
      `,
      [tenantId, profileId]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      employee_profile_id: profileId,
      items: result.rows,
      message: 'Novedades por perfil guardadas correctamente',
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message || 'Error interno' });
  } finally {
    client.release();
  }
});

export default router;
