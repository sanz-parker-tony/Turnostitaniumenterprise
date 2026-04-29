import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';

type EntityKey =
  | 'companies'
  | 'work-locations'
  | 'departments'
  | 'areas'
  | 'cost-centers'
  | 'payroll-groups'
  | 'employee-profiles'
  | 'job-titles'
  | 'work-groups'
  | 'employee-companies';

interface EntityConfig {
  table: string;
  requiredOnCreate: string[];
  defaultSort: string;
  hasIsActive: boolean;
  codeField?: string;
  nameField?: string;
}

const ENTITY_CONFIG: Record<EntityKey, EntityConfig> = {
  'companies': {
    table: 'companies',
    requiredOnCreate: ['company_name', 'company_short_name', 'company_code'],
    defaultSort: 'company_name',
    hasIsActive: true,
    codeField: 'company_code',
    nameField: 'company_name',
  },
  'work-locations': {
    table: 'work_locations',
    requiredOnCreate: ['work_location_name', 'work_location_short_name', 'work_location_code'],
    defaultSort: 'work_location_name',
    hasIsActive: true,
    codeField: 'work_location_code',
    nameField: 'work_location_name',
  },
  'departments': {
    table: 'departments',
    requiredOnCreate: ['department_name', 'department_short_name', 'department_code'],
    defaultSort: 'department_name',
    hasIsActive: true,
    codeField: 'department_code',
    nameField: 'department_name',
  },
  'areas': {
    table: 'areas',
    requiredOnCreate: ['area_name', 'area_short_name', 'area_code'],
    defaultSort: 'area_name',
    hasIsActive: true,
    codeField: 'area_code',
    nameField: 'area_name',
  },
  'cost-centers': {
    table: 'cost_centers',
    requiredOnCreate: ['cost_center_name', 'cost_center_short_name', 'cost_center_code'],
    defaultSort: 'cost_center_name',
    hasIsActive: true,
    codeField: 'cost_center_code',
    nameField: 'cost_center_name',
  },
  'payroll-groups': {
    table: 'payroll_groups',
    requiredOnCreate: ['payroll_group_name', 'payroll_group_short_name', 'payroll_group_code'],
    defaultSort: 'payroll_group_name',
    hasIsActive: true,
    codeField: 'payroll_group_code',
    nameField: 'payroll_group_name',
  },
  'employee-profiles': {
    table: 'employee_profiles',
    requiredOnCreate: ['profile_name', 'profile_short_name', 'employee_profile_code'],
    defaultSort: 'profile_name',
    hasIsActive: true,
    codeField: 'employee_profile_code',
    nameField: 'profile_name',
  },
  'job-titles': {
    table: 'job_titles',
    requiredOnCreate: ['job_title_name', 'job_title_short_name', 'job_title_code'],
    defaultSort: 'job_title_name',
    hasIsActive: true,
    codeField: 'job_title_code',
    nameField: 'job_title_name',
  },
  'work-groups': {
    table: 'work_groups',
    requiredOnCreate: ['work_group_name', 'work_group_short_name', 'work_group_code'],
    defaultSort: 'work_group_name',
    hasIsActive: true,
    codeField: 'work_group_code',
    nameField: 'work_group_name',
  },
  'employee-companies': {
    table: 'employee_companies',
    requiredOnCreate: ['company_id', 'employee_id'],
    defaultSort: 'created_at',
    hasIsActive: true,
  },
};

const router = Router();

function getPostgres() {
  return createDbClient(
    process.env.Postgres_URL || '',
    process.env.Postgres_SERVICE_ROLE_KEY || ''
  );
}

function getActor(req: Request) {
  const user = (req as any).user;
  return user?.email || user?.id || 'system';
}

function normalizePayload(payload: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (value === undefined) return [key, value];
      if (value === '') return [key, null];
      return [key, value];
    })
  );
}

async function resolveTenantId(req: Request, Postgres: any): Promise<string | null> {
  const explicit = req.query.tenant_id || req.body?.tenant_id;
  if (typeof explicit === 'string' && explicit.trim()) {
    return explicit.trim();
  }

  const user = (req as any).user;
  if (!user?.id) return null;

  const { data, error } = await Postgres
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (error || !data?.tenant_id) {
    return null;
  }

  return data.tenant_id;
}

function getEntityConfig(entity: string): EntityConfig | null {
  if (entity in ENTITY_CONFIG) {
    return ENTITY_CONFIG[entity as EntityKey];
  }
  return null;
}

router.get('/catalogs', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);

    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const [
      companies,
      departments,
      areas,
      costCenters,
      payrollGroups,
      employeeProfiles,
      employees,
      workGroups,
      workLocations,
      jobTitles,
      contractTypes,
      genders,
      countries,
      states,
      cities,
    ] = await Promise.all([
      Postgres.from('companies').select('id, company_code, company_name').eq('tenant_id', tenantId).eq('is_active', true).order('company_name'),
      Postgres.from('departments').select('id, department_code, department_name').eq('tenant_id', tenantId).eq('is_active', true).order('department_name'),
      Postgres.from('areas').select('id, area_code, area_name').eq('tenant_id', tenantId).eq('is_active', true).order('area_name'),
      Postgres.from('cost_centers').select('id, cost_center_code, cost_center_name').eq('tenant_id', tenantId).eq('is_active', true).order('cost_center_name'),
      Postgres.from('payroll_groups').select('id, payroll_group_code, payroll_group_name').eq('tenant_id', tenantId).eq('is_active', true).order('payroll_group_name'),
      Postgres.from('employee_profiles').select('id, employee_profile_code, profile_name').eq('tenant_id', tenantId).eq('is_active', true).order('profile_name'),
      Postgres.from('employees').select('id, employee_code, employee_lastname, employee_name').eq('tenant_id', tenantId).eq('is_active', true).order('employee_code'),
      Postgres.from('work_groups').select('id, work_group_code, work_group_name').eq('tenant_id', tenantId).eq('is_active', true).order('work_group_name'),
      Postgres.from('work_locations').select('id, work_location_code, work_location_name').eq('tenant_id', tenantId).eq('is_active', true).order('work_location_name'),
      Postgres.from('job_titles').select('id, job_title_code, job_title_name').eq('tenant_id', tenantId).eq('is_active', true).order('job_title_name'),
      Postgres.from('lookup_values').select('id, lookup_key, lookup_label, lookup_groups!inner(lookup_group_key)').eq('lookup_groups.lookup_group_key', 'CONTRACT_TYPE').eq('is_active', true).order('lookup_label'),
      Postgres.from('lookup_values').select('id, lookup_key, lookup_label, lookup_groups!inner(lookup_group_key)').eq('lookup_groups.lookup_group_key', 'GENDER').eq('is_active', true).order('lookup_label'),
      Postgres.from('lookup_values').select('id, lookup_key, lookup_label, lookup_groups!inner(lookup_group_key)').eq('lookup_groups.lookup_group_key', 'COUNTRY').eq('is_active', true).order('lookup_label'),
      Postgres.from('lookup_values').select('id, lookup_key, lookup_label, lookup_groups!inner(lookup_group_key)').eq('lookup_groups.lookup_group_key', 'STATE').eq('is_active', true).order('lookup_label'),
      Postgres.from('lookup_values').select('id, lookup_key, lookup_label, lookup_groups!inner(lookup_group_key)').eq('lookup_groups.lookup_group_key', 'CITY').eq('is_active', true).order('lookup_label'),
    ]);

    const errors = [
      companies.error,
      departments.error,
      areas.error,
      costCenters.error,
      payrollGroups.error,
      employeeProfiles.error,
      employees.error,
      workGroups.error,
      workLocations.error,
      jobTitles.error,
      contractTypes.error,
      genders.error,
      countries.error,
      states.error,
      cities.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      const firstError = errors.find((entry: any) => entry && typeof entry.message === 'string');
      return res.status(500).json({ error: firstError?.message || 'Error cargando catálogos' });
    }

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      catalogs: {
        companies: companies.data || [],
        departments: departments.data || [],
        areas: areas.data || [],
        cost_centers: costCenters.data || [],
        payroll_groups: payrollGroups.data || [],
        employee_profiles: employeeProfiles.data || [],
        employees: employees.data || [],
        work_groups: workGroups.data || [],
        work_locations: workLocations.data || [],
        job_titles: jobTitles.data || [],
        contract_types: contractTypes.data || [],
        genders: genders.data || [],
        countries: countries.data || [],
        states: states.data || [],
        cities: cities.data || [],
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/:entity', async (req: Request, res: Response) => {
  try {
    const config = getEntityConfig(req.params.entity);
    if (!config) {
      return res.status(404).json({ error: 'Entidad no soportada' });
    }

    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    let query = Postgres.from(config.table).select('*').eq('tenant_id', tenantId);

    if (req.query.active_only === 'true' && config.hasIsActive) {
      query = query.eq('is_active', true);
    }

    query = query.order(config.defaultSort, { ascending: true });

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, entity: req.params.entity, items: data || [], count: (data || []).length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/:entity/:id', async (req: Request, res: Response) => {
  try {
    const config = getEntityConfig(req.params.entity);
    if (!config) {
      return res.status(404).json({ error: 'Entidad no soportada' });
    }

    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const { data, error } = await Postgres
      .from(config.table)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    if (!data) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    return res.status(200).json({ success: true, item: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.post('/:entity', async (req: Request, res: Response) => {
  try {
    const config = getEntityConfig(req.params.entity);
    if (!config) {
      return res.status(404).json({ error: 'Entidad no soportada' });
    }

    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const missingFields = config.requiredOnCreate.filter((field) => {
      const value = req.body?.[field];
      return value === undefined || value === null || String(value).trim() === '';
    });

    if (missingFields.length > 0) {
      return res.status(400).json({ error: `Campos obligatorios: ${missingFields.join(', ')}` });
    }

    const payload = normalizePayload(req.body || {});
    delete payload.id;
    delete payload.tenant_id;
    delete payload.created_by;
    delete payload.created_at;
    delete payload.updated_by;
    delete payload.updated_at;

    if (config.codeField && payload[config.codeField]) {
      payload[config.codeField] = String(payload[config.codeField]).trim().toUpperCase();
    }

    const { data, error } = await Postgres
      .from(config.table)
      .insert({
        ...payload,
        tenant_id: tenantId,
        created_by: getActor(req),
      })
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ success: true, item: data, message: 'Registro creado correctamente' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.put('/:entity/:id', async (req: Request, res: Response) => {
  try {
    const config = getEntityConfig(req.params.entity);
    if (!config) {
      return res.status(404).json({ error: 'Entidad no soportada' });
    }

    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const payload = normalizePayload(req.body || {});
    delete payload.id;
    delete payload.tenant_id;
    delete payload.created_by;
    delete payload.created_at;

    if (config.codeField && payload[config.codeField]) {
      payload[config.codeField] = String(payload[config.codeField]).trim().toUpperCase();
    }

    const { data, error } = await Postgres
      .from(config.table)
      .update({
        ...payload,
        updated_by: getActor(req),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', req.params.id)
      .select('*')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    return res.status(200).json({ success: true, item: data, message: 'Registro actualizado correctamente' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.patch('/:entity/:id/status', async (req: Request, res: Response) => {
  try {
    const config = getEntityConfig(req.params.entity);
    if (!config) {
      return res.status(404).json({ error: 'Entidad no soportada' });
    }

    if (!config.hasIsActive) {
      return res.status(400).json({ error: 'La entidad no soporta activación/desactivación' });
    }

    const { is_active } = req.body || {};
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active debe ser booleano' });
    }

    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const { data, error } = await Postgres
      .from(config.table)
      .update({
        is_active,
        updated_by: getActor(req),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', req.params.id)
      .select('*')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    return res.status(200).json({
      success: true,
      item: data,
      message: `Registro ${is_active ? 'activado' : 'desactivado'} correctamente`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

export default router;
