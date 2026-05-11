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

function normalizeNullableText(value: any): string | null {
  if (value === undefined || value === null) return null;
  const next = String(value).trim();
  return next ? next : null;
}

function isUpperAlphanumeric(value: string): boolean {
  return /^[A-Z0-9/-]+$/.test(value);
}

function isValidIpv4(value: string): boolean {
  if (!value) return true;
  const match = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  for (let i = 1; i <= 4; i += 1) {
    const n = Number(match[i]);
    if (!Number.isInteger(n) || n < 0 || n > 255) return false;
  }
  return true;
}

function parseNullableCoordinate(value: any, type: 'lat' | 'lng'): number | null | 'INVALID' {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 'INVALID';
  if (type === 'lat' && (parsed < -90 || parsed > 90)) return 'INVALID';
  if (type === 'lng' && (parsed < -180 || parsed > 180)) return 'INVALID';
  return parsed;
}

router.get('/catalogs', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const [companiesResult, deviceTypesResult, workLocationsResult] = await Promise.all([
      pool.query(
        `
          SELECT id, company_name, company_code
          FROM public.companies
          WHERE tenant_id = $1
            AND is_active = true
          ORDER BY company_name ASC
        `,
        [tenantId]
      ),
      pool.query(
        `
          SELECT lv.id, lv.lookup_key, lv.lookup_label
          FROM public.lookup_values lv
          JOIN public.lookup_groups lg
            ON lg.id = lv.lookup_group_id
          WHERE lg.lookup_group_key = 'DEVICE_TYPE'
            AND lv.is_active = true
          ORDER BY lv.sort_order ASC, lv.lookup_label ASC
        `
      ),
      pool.query(
        `
          SELECT
            wl.id,
            wl.work_location_name,
            wl.work_location_code,
            wl.geofence_polygon,
            wl.company_id
          FROM public.work_locations wl
          WHERE wl.tenant_id = $1
            AND wl.is_active = true
          ORDER BY wl.work_location_name ASC
        `,
        [tenantId]
      ),
    ]);

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      companies: companiesResult.rows,
      device_types: deviceTypesResult.rows,
      work_locations: workLocationsResult.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const includeInactive = String(req.query.include_inactive || '').toLowerCase() === 'true';

    const result = await pool.query(
      `
        SELECT
          d.id,
          d.tenant_id,
          d.company_id,
          c.company_name,
          d.device_serial_number,
          d.device_name,
          d.device_ip,
          d.device_location,
          d.device_model,
          d.device_type_id,
          lv.lookup_key AS device_type_key,
          lv.lookup_label AS device_type_label,
          d.work_location_id,
          wl.work_location_name,
          wl.work_location_code,
          wl.geofence_polygon,
          d.latitude,
          d.longitude,
          d.is_active,
          d.created_by,
          d.created_at,
          d.updated_by,
          d.updated_at
        FROM public.time_clock_devices d
        JOIN public.companies c
          ON c.id = d.company_id
        LEFT JOIN public.lookup_values lv
          ON lv.id = d.device_type_id
        LEFT JOIN public.work_locations wl
          ON wl.id = d.work_location_id
        WHERE d.tenant_id = $1
          AND ($2::boolean = true OR d.is_active = true)
        ORDER BY d.created_at DESC, d.device_name ASC
      `,
      [tenantId, includeInactive]
    );

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      devices: result.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'id es obligatorio' });

    const result = await pool.query(
      `
        SELECT *
        FROM public.time_clock_devices
        WHERE tenant_id = $1
          AND id = $2
        LIMIT 1
      `,
      [tenantId, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Dispositivo no encontrado' });
    }

    return res.status(200).json({ success: true, device: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const companyId = normalizeNullableText(req.body?.company_id);
    const deviceName = normalizeNullableText(req.body?.device_name);
    const rawSerial = normalizeNullableText(req.body?.device_serial_number);
    const deviceSerialNumber = rawSerial ? rawSerial.toUpperCase() : null;
    const deviceIp = normalizeNullableText(req.body?.device_ip);
    const deviceLocation = normalizeNullableText(req.body?.device_location);
    const rawModel = normalizeNullableText(req.body?.device_model);
    const deviceModel = rawModel ? rawModel.toUpperCase() : null;
    const deviceTypeId = normalizeNullableText(req.body?.device_type_id);
    const workLocationId = normalizeNullableText(req.body?.work_location_id);
    const latitude = parseNullableCoordinate(req.body?.latitude, 'lat');
    const longitude = parseNullableCoordinate(req.body?.longitude, 'lng');
    const isActive = req.body?.is_active !== false;

    if (!companyId) return res.status(400).json({ error: 'company_id es obligatorio' });
    if (!deviceName) return res.status(400).json({ error: 'device_name es obligatorio' });
    if (deviceIp && !isValidIpv4(deviceIp)) {
      return res.status(400).json({ error: 'device_ip inválido. Use formato IPv4: x.x.x.x (0-255)' });
    }
    if (deviceSerialNumber && !isUpperAlphanumeric(deviceSerialNumber)) {
      return res.status(400).json({ error: 'device_serial_number debe contener solo A-Z, 0-9, "-" y "/"' });
    }
    if (deviceModel && !isUpperAlphanumeric(deviceModel)) {
      return res.status(400).json({ error: 'device_model debe contener solo A-Z, 0-9, "-" y "/"' });
    }
    if (latitude === 'INVALID') {
      return res.status(400).json({ error: 'latitude invalido. Debe estar entre -90 y 90' });
    }
    if (longitude === 'INVALID') {
      return res.status(400).json({ error: 'longitude invalido. Debe estar entre -180 y 180' });
    }

    if (deviceSerialNumber) {
      const duplicate = await pool.query(
        `
          SELECT id
          FROM public.time_clock_devices
          WHERE tenant_id = $1
            AND device_serial_number = $2
          LIMIT 1
        `,
        [tenantId, deviceSerialNumber]
      );
      if (duplicate.rows[0]?.id) {
        return res.status(409).json({ error: 'Ya existe un dispositivo con ese serial' });
      }
    }

    const actor = getActor(req);
    const result = await pool.query(
      `
        INSERT INTO public.time_clock_devices (
          id,
          tenant_id,
          company_id,
          device_serial_number,
          device_name,
          device_ip,
          device_location,
          device_model,
          device_type_id,
          work_location_id,
          latitude,
          longitude,
          is_active,
          created_by
        )
        VALUES (
          gen_random_uuid(),
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
        )
        RETURNING *
      `,
      [
        tenantId,
        companyId,
        deviceSerialNumber,
        deviceName,
        deviceIp,
        deviceLocation,
        deviceModel,
        deviceTypeId,
        workLocationId,
        latitude,
        longitude,
        isActive,
        actor,
      ]
    );

    return res.status(201).json({ success: true, device: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'id es obligatorio' });

    const companyId = normalizeNullableText(req.body?.company_id);
    const deviceName = normalizeNullableText(req.body?.device_name);
    const rawSerial = normalizeNullableText(req.body?.device_serial_number);
    const deviceSerialNumber = rawSerial ? rawSerial.toUpperCase() : null;
    const deviceIp = normalizeNullableText(req.body?.device_ip);
    const deviceLocation = normalizeNullableText(req.body?.device_location);
    const rawModel = normalizeNullableText(req.body?.device_model);
    const deviceModel = rawModel ? rawModel.toUpperCase() : null;
    const deviceTypeId = normalizeNullableText(req.body?.device_type_id);
    const workLocationId = normalizeNullableText(req.body?.work_location_id);
    const latitude = parseNullableCoordinate(req.body?.latitude, 'lat');
    const longitude = parseNullableCoordinate(req.body?.longitude, 'lng');
    const isActive = req.body?.is_active !== false;

    if (!companyId) return res.status(400).json({ error: 'company_id es obligatorio' });
    if (!deviceName) return res.status(400).json({ error: 'device_name es obligatorio' });
    if (deviceIp && !isValidIpv4(deviceIp)) {
      return res.status(400).json({ error: 'device_ip inválido. Use formato IPv4: x.x.x.x (0-255)' });
    }
    if (deviceSerialNumber && !isUpperAlphanumeric(deviceSerialNumber)) {
      return res.status(400).json({ error: 'device_serial_number debe contener solo A-Z, 0-9, "-" y "/"' });
    }
    if (deviceModel && !isUpperAlphanumeric(deviceModel)) {
      return res.status(400).json({ error: 'device_model debe contener solo A-Z, 0-9, "-" y "/"' });
    }
    if (latitude === 'INVALID') {
      return res.status(400).json({ error: 'latitude invalido. Debe estar entre -90 y 90' });
    }
    if (longitude === 'INVALID') {
      return res.status(400).json({ error: 'longitude invalido. Debe estar entre -180 y 180' });
    }

    if (deviceSerialNumber) {
      const duplicate = await pool.query(
        `
          SELECT id
          FROM public.time_clock_devices
          WHERE tenant_id = $1
            AND device_serial_number = $2
            AND id <> $3
          LIMIT 1
        `,
        [tenantId, deviceSerialNumber, id]
      );
      if (duplicate.rows[0]?.id) {
        return res.status(409).json({ error: 'Ya existe un dispositivo con ese serial' });
      }
    }

    const actor = getActor(req);
    const result = await pool.query(
      `
        UPDATE public.time_clock_devices
        SET
          company_id = $3,
          device_serial_number = $4,
          device_name = $5,
          device_ip = $6,
          device_location = $7,
          device_model = $8,
          device_type_id = $9,
          work_location_id = $10,
          latitude = $11,
          longitude = $12,
          is_active = $13,
          updated_by = $14,
          updated_at = now()
        WHERE id = $1
          AND tenant_id = $2
        RETURNING *
      `,
      [
        id,
        tenantId,
        companyId,
        deviceSerialNumber,
        deviceName,
        deviceIp,
        deviceLocation,
        deviceModel,
        deviceTypeId,
        workLocationId,
        latitude,
        longitude,
        isActive,
        actor,
      ]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Dispositivo no encontrado' });
    return res.status(200).json({ success: true, device: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'id es obligatorio' });

    const actor = getActor(req);
    const result = await pool.query(
      `
        UPDATE public.time_clock_devices
        SET
          is_active = false,
          updated_by = $3,
          updated_at = now()
        WHERE id = $1
          AND tenant_id = $2
        RETURNING id
      `,
      [id, tenantId, actor]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Dispositivo no encontrado' });
    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

export default router;

