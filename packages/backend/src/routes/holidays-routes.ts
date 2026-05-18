import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { withDocs } from '../lib/swagger-docs.js';

const router = Router();

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
  return next || null;
}

function normalizeBoolean(value: any): boolean {
  return String(value || '').toLowerCase() === 'true';
}

function normalizePositiveInt(value: any, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
}

function normalizeNonNegativeInt(value: any, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.trunc(parsed);
}

function buildScopeCondition(column: string, value: string | null, params: any[]): string {
  if (!value) return '';
  params.push(value);
  return ` AND (${column} IS NULL OR ${column} = $${params.length}::uuid)`;
}

const getHolidayCatalogs = withDocs(
  async (req: Request, res: Response) => {
    try {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

      const companyId = normalizeNullableText(req.query.company_id);
      const countryId = normalizeNullableText(req.query.country_id);
      const stateId = normalizeNullableText(req.query.state_id);

      const companiesPromise = pool.query(
        `
          SELECT id, company_code, company_name
          FROM public.companies
          WHERE tenant_id = $1::uuid
            AND is_active = true
          ORDER BY company_name ASC
        `,
        [tenantId]
      );

      const countriesPromise = pool.query(
        `
          SELECT id, country_label, country_key
          FROM public.countries
          WHERE is_active = true
          ORDER BY country_label ASC
        `
      );

      const statesParams: any[] = [];
      let statesWhere = 'WHERE s.is_active = true';
      if (countryId) {
        statesParams.push(countryId);
        statesWhere += ` AND s.country_id = $${statesParams.length}::uuid`;
      }
      const statesPromise = pool.query(
        `
          SELECT s.id, s.state_label, s.state_key, s.country_id, c.country_label
          FROM public.states s
          LEFT JOIN public.countries c ON c.id = s.country_id
          ${statesWhere}
          ORDER BY s.state_label ASC
        `,
        statesParams
      );

      const citiesParams: any[] = [];
      let citiesWhere = 'WHERE ci.is_active = true';
      if (stateId) {
        citiesParams.push(stateId);
        citiesWhere += ` AND ci.state_id = $${citiesParams.length}::uuid`;
      } else if (countryId) {
        citiesParams.push(countryId);
        citiesWhere += ` AND ci.country_id = $${citiesParams.length}::uuid`;
      }
      const citiesPromise = pool.query(
        `
          SELECT ci.id, ci.city_label, ci.state_id, ci.country_id
          FROM public.cities ci
          ${citiesWhere}
          ORDER BY ci.city_label ASC
        `,
        citiesParams
      );

      const workLocationsParams: any[] = [tenantId];
      let workLocationsWhere = `
        WHERE wl.tenant_id = $1::uuid
          AND wl.is_active = true
      `;
      if (companyId) {
        workLocationsParams.push(companyId);
        workLocationsWhere += ` AND wl.company_id = $${workLocationsParams.length}::uuid`;
      }
      const workLocationsPromise = pool.query(
        `
          SELECT
            wl.id,
            wl.work_location_name,
            wl.work_location_code,
            wl.company_id,
            c.company_name
          FROM public.work_locations wl
          LEFT JOIN public.companies c
            ON c.id = wl.company_id
          ${workLocationsWhere}
          ORDER BY wl.work_location_name ASC
        `,
        workLocationsParams
      );

      const holidayTypesPromise = pool.query(
        `
          SELECT
            lv.id,
            lv.lookup_key,
            lv.lookup_label,
            lv.lookup_short_label,
            lv.sort_order,
            to_jsonb(lv) -> 'metadata' ->> 'icon_key' AS icon_key,
            to_jsonb(lv) -> 'metadata' ->> 'icon_glyph' AS icon_glyph,
            to_jsonb(lv) -> 'metadata' ->> 'icon_color' AS icon_color
          FROM public.lookup_values lv
          JOIN public.lookup_groups lg
            ON lg.id = lv.lookup_group_id
          WHERE lg.lookup_group_key = 'HOLIDAY_TYPE'
            AND lv.is_active = true
          ORDER BY lv.sort_order ASC, lv.lookup_label ASC
        `
      );

      const [companiesResult, countriesResult, statesResult, citiesResult, workLocationsResult, holidayTypesResult] =
        await Promise.all([
          companiesPromise,
          countriesPromise,
          statesPromise,
          citiesPromise,
          workLocationsPromise,
          holidayTypesPromise,
        ]);

      return res.status(200).json({
        success: true,
        tenant_id: tenantId,
        catalogs: {
          companies: companiesResult.rows,
          countries: countriesResult.rows,
          states: statesResult.rows,
          cities: citiesResult.rows,
          work_locations: workLocationsResult.rows,
          holiday_types: holidayTypesResult.rows,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error interno' });
    }
  },
  {
    tags: ['Holidays'],
    summary: 'Obtiene catálogos de filtros para feriados',
    responses: {
      200: { description: 'OK' },
      400: { description: 'Bad Request' },
      401: { description: 'No autorizado' },
      500: { description: 'Error interno' },
    },
  }
);

const getHolidays = withDocs(
  async (req: Request, res: Response) => {
    try {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

      const includeInactive = normalizeBoolean(req.query.include_inactive);
      const limit = Math.min(normalizePositiveInt(req.query.limit, 100), 500);
      const offset = normalizeNonNegativeInt(req.query.offset, 0);

      const companyId = normalizeNullableText(req.query.company_id);
      const countryId = normalizeNullableText(req.query.country_id);
      const stateId = normalizeNullableText(req.query.state_id);
      const cityId = normalizeNullableText(req.query.city_id);
      const workLocationId = normalizeNullableText(req.query.work_location_id);
      const holidayTypeId = normalizeNullableText(req.query.holiday_type_id);
      const holidayDateFrom = normalizeNullableText(req.query.holiday_date_from || req.query.date_from);
      const holidayDateTo = normalizeNullableText(req.query.holiday_date_to || req.query.date_to);
      const search = normalizeNullableText(req.query.search);

      const params: any[] = [tenantId, includeInactive];
      let whereExtra = '';

      if (companyId) {
        params.push(companyId);
        whereExtra += ` AND h.company_id = $${params.length}::uuid`;
      }

      whereExtra += buildScopeCondition('h.country_id', countryId, params);
      whereExtra += buildScopeCondition('h.state_id', stateId, params);
      whereExtra += buildScopeCondition('h.city_id', cityId, params);
      whereExtra += buildScopeCondition('h.work_location_id', workLocationId, params);
      if (holidayTypeId) {
        params.push(holidayTypeId);
        whereExtra += ` AND h.holiday_type_id = $${params.length}::uuid`;
      }

      if (holidayDateFrom) {
        params.push(holidayDateFrom);
        whereExtra += ` AND h.holiday_date >= $${params.length}::date`;
      }
      if (holidayDateTo) {
        params.push(holidayDateTo);
        whereExtra += ` AND h.holiday_date <= $${params.length}::date`;
      }
      if (search) {
        params.push(`%${search}%`);
        whereExtra += ` AND COALESCE(h.holiday_name, '') ILIKE $${params.length}`;
      }

      const countResult = await pool.query(
        `
          SELECT COUNT(*)::int AS total
          FROM public.holidays h
          WHERE h.tenant_id = $1::uuid
            AND ($2::boolean = true OR h.is_active = true)
            ${whereExtra}
        `,
        params
      );

      params.push(limit, offset);
      const limitIndex = params.length - 1;
      const offsetIndex = params.length;

      const result = await pool.query(
        `
          SELECT
            h.id,
            h.tenant_id,
            h.company_id,
            c.company_code,
            c.company_name,
            h.country_id,
            co.country_key,
            co.country_label,
            h.state_id,
            st.state_key,
            st.state_label,
            h.city_id,
            ci.city_label,
            h.work_location_id,
            wl.work_location_code,
            wl.work_location_name,
            h.holiday_type_id,
            ht.lookup_key AS holiday_type_key,
            ht.lookup_label AS holiday_type_label,
            to_jsonb(ht) -> 'metadata' ->> 'icon_key' AS holiday_type_icon_key,
            to_jsonb(ht) -> 'metadata' ->> 'icon_glyph' AS holiday_type_icon_glyph,
            to_jsonb(ht) -> 'metadata' ->> 'icon_color' AS holiday_type_icon_color,
            h.holiday_date,
            h.holiday_name,
            h.is_recurring,
            h.is_paid,
            h.is_working_day,
            h.is_active,
            h.created_by,
            h.created_at,
            h.updated_by,
            h.updated_at
          FROM public.holidays h
          JOIN public.companies c
            ON c.id = h.company_id
          LEFT JOIN public.countries co
            ON co.id = h.country_id
          LEFT JOIN public.states st
            ON st.id = h.state_id
          LEFT JOIN public.cities ci
            ON ci.id = h.city_id
          LEFT JOIN public.work_locations wl
            ON wl.id = h.work_location_id
          LEFT JOIN public.lookup_values ht
            ON ht.id = h.holiday_type_id
          WHERE h.tenant_id = $1::uuid
            AND ($2::boolean = true OR h.is_active = true)
            ${whereExtra}
          ORDER BY h.holiday_date ASC, h.holiday_name ASC
          LIMIT $${limitIndex} OFFSET $${offsetIndex}
        `,
        params
      );

      return res.status(200).json({
        success: true,
        tenant_id: tenantId,
        total: countResult.rows[0]?.total || 0,
        limit,
        offset,
        holidays: result.rows,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error interno' });
    }
  },
  {
    tags: ['Holidays'],
    summary: 'Lista feriados por alcance geográfico y organizacional',
    parameters: [
      { name: 'tenant_id', in: 'query', required: false, schema: { type: 'string' } },
      { name: 'company_id', in: 'query', required: false, schema: { type: 'string' } },
      { name: 'country_id', in: 'query', required: false, schema: { type: 'string' } },
      { name: 'state_id', in: 'query', required: false, schema: { type: 'string' } },
      { name: 'city_id', in: 'query', required: false, schema: { type: 'string' } },
      { name: 'work_location_id', in: 'query', required: false, schema: { type: 'string' } },
      { name: 'holiday_type_id', in: 'query', required: false, schema: { type: 'string' } },
    ],
    responses: {
      200: { description: 'OK' },
      400: { description: 'Bad Request' },
      401: { description: 'No autorizado' },
      500: { description: 'Error interno' },
    },
  }
);

const getHolidayById = withDocs(
  async (req: Request, res: Response) => {
    try {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

      const id = normalizeNullableText(req.params.id);
      if (!id) return res.status(400).json({ error: 'id es obligatorio' });

      const result = await pool.query(
        `
          SELECT
            h.id,
            h.tenant_id,
            h.company_id,
            c.company_code,
            c.company_name,
            h.country_id,
            co.country_key,
            co.country_label,
            h.state_id,
            st.state_key,
            st.state_label,
            h.city_id,
            ci.city_label,
            h.work_location_id,
            wl.work_location_code,
            wl.work_location_name,
            h.holiday_type_id,
            ht.lookup_key AS holiday_type_key,
            ht.lookup_label AS holiday_type_label,
            to_jsonb(ht) -> 'metadata' ->> 'icon_key' AS holiday_type_icon_key,
            to_jsonb(ht) -> 'metadata' ->> 'icon_glyph' AS holiday_type_icon_glyph,
            to_jsonb(ht) -> 'metadata' ->> 'icon_color' AS holiday_type_icon_color,
            h.holiday_date,
            h.holiday_name,
            h.is_recurring,
            h.is_paid,
            h.is_working_day,
            h.is_active,
            h.created_by,
            h.created_at,
            h.updated_by,
            h.updated_at
          FROM public.holidays h
          JOIN public.companies c
            ON c.id = h.company_id
          LEFT JOIN public.countries co
            ON co.id = h.country_id
          LEFT JOIN public.states st
            ON st.id = h.state_id
          LEFT JOIN public.cities ci
            ON ci.id = h.city_id
          LEFT JOIN public.work_locations wl
            ON wl.id = h.work_location_id
          LEFT JOIN public.lookup_values ht
            ON ht.id = h.holiday_type_id
          WHERE h.id = $1::uuid
            AND h.tenant_id = $2::uuid
          LIMIT 1
        `,
        [id, tenantId]
      );

      const holiday = result.rows[0];
      if (!holiday) return res.status(404).json({ error: 'Feriado no encontrado' });

      return res.status(200).json({
        success: true,
        tenant_id: tenantId,
        holiday,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error interno' });
    }
  },
  {
    tags: ['Holidays'],
    summary: 'Obtiene un feriado por id',
    responses: {
      200: { description: 'OK' },
      400: { description: 'Bad Request' },
      401: { description: 'No autorizado' },
      404: { description: 'No encontrado' },
      500: { description: 'Error interno' },
    },
  }
);

router.get('/catalogs', getHolidayCatalogs);
router.get('/', getHolidays);
router.get('/:id', getHolidayById);

export default router;
