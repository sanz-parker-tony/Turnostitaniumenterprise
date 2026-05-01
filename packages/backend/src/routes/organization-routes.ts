import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

type EntityKey =
  | 'companies'
  | 'work-locations'
  | 'departments'
  | 'areas'
  | 'cost-centers'
  | 'payroll-groups'
  | 'holidays'
  | 'employees'
  | 'employee-profiles'
  | 'job-titles'
  | 'work-groups'
  | 'shifts'
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
  'holidays': {
    table: 'holidays',
    requiredOnCreate: ['company_id', 'holiday_date', 'holiday_name'],
    defaultSort: 'holiday_date',
    hasIsActive: true,
    nameField: 'holiday_name',
  },
  'employees': {
    table: 'employees',
    requiredOnCreate: ['employee_lastname', 'employee_name', 'employee_code'],
    defaultSort: 'employee_lastname',
    hasIsActive: true,
    codeField: 'employee_code',
    nameField: 'employee_name',
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
  'shifts': {
    table: 'shifts',
    requiredOnCreate: ['company_id', 'shift_name', 'shift_short_name', 'start_time', 'work_minutes'],
    defaultSort: 'shift_name',
    hasIsActive: true,
    nameField: 'shift_name',
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

function normalizeScopeFilter(value: any): string {
  const raw = String(value || '').trim();
  if (!raw || raw === '0') return '';
  return raw;
}

function mapCountryOption(row: any) {
  const lookup_key = row?.country_key || row?.country_code || row?.lookup_key || null;
  const lookup_label = row?.country_label || row?.country_name || row?.lookup_label || lookup_key || row?.id || '';
  const lookup_short_label = row?.country_short_label || row?.country_short_name || row?.lookup_short_label || lookup_label;
  return {
    id: row?.id,
    lookup_key,
    lookup_label,
    lookup_short_label,
  };
}

function mapStateOption(row: any) {
  const lookup_key = row?.state_key || row?.state_code || row?.lookup_key || null;
  const lookup_label = row?.state_label || row?.state_name || row?.lookup_label || lookup_key || row?.id || '';
  const lookup_short_label = row?.state_short_label || row?.state_short_name || row?.lookup_short_label || lookup_label;
  return {
    id: row?.id,
    country_id: row?.country_id || null,
    lookup_key,
    lookup_label,
    lookup_short_label,
  };
}

function mapCityOption(row: any) {
  const lookup_key = row?.city_key || row?.city_code || row?.lookup_key || null;
  const lookup_label = row?.city_label || row?.city_name || row?.lookup_label || lookup_key || row?.id || '';
  const lookup_short_label = row?.city_short_label || row?.city_short_name || row?.lookup_short_label || lookup_label;
  return {
    id: row?.id,
    country_id: row?.country_id || null,
    state_id: row?.state_id || null,
    lookup_key,
    lookup_label,
    lookup_short_label,
  };
}

function extractDateIso(value: any): string {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  const direct = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return '';
}

async function resolveEmployeePhotoStoragePath(
  Postgres: any,
  tenantId: string
): Promise<{ absolutePath: string; configuredValue: string; source: 'TENANT' | 'SYSTEM' | 'FALLBACK' }> {
  const { data: systemSetting, error: systemSettingError } = await Postgres
    .from('system_settings')
    .select('id, default_value')
    .eq('setting_key', 'EMPLOYEE_PHOTO_PATH')
    .eq('is_active', true)
    .maybeSingle();

  if (systemSettingError) {
    throw new Error(systemSettingError.message);
  }

  let configuredValue = '';
  let source: 'TENANT' | 'SYSTEM' | 'FALLBACK' = 'FALLBACK';

  if (systemSetting?.id) {
    const { data: tenantOverride, error: tenantOverrideError } = await Postgres
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', tenantId)
      .eq('system_setting_id', systemSetting.id)
      .eq('is_active', true)
      .maybeSingle();

    if (tenantOverrideError) {
      throw new Error(tenantOverrideError.message);
    }

    if (tenantOverride?.setting_value && String(tenantOverride.setting_value).trim()) {
      configuredValue = String(tenantOverride.setting_value).trim();
      source = 'TENANT';
    } else if (systemSetting.default_value && String(systemSetting.default_value).trim()) {
      configuredValue = String(systemSetting.default_value).trim();
      source = 'SYSTEM';
    }
  }

  if (!configuredValue) {
    configuredValue = path.join('storage', 'employee-photos');
    source = 'FALLBACK';
  }

  const absolutePath = path.isAbsolute(configuredValue)
    ? configuredValue
    : path.resolve(process.cwd(), configuredValue);

  return { absolutePath, configuredValue, source };
}

const EMPLOYEE_PHOTO_RULE_KEYS = {
  max_file_size_bytes: 'EMPLOYEE_PHOTO_MAX_SIZE_BYTES',
  min_width: 'EMPLOYEE_PHOTO_MIN_WIDTH',
  min_height: 'EMPLOYEE_PHOTO_MIN_HEIGHT',
  max_width: 'EMPLOYEE_PHOTO_MAX_WIDTH',
  max_height: 'EMPLOYEE_PHOTO_MAX_HEIGHT',
  min_aspect_ratio: 'EMPLOYEE_PHOTO_MIN_ASPECT_RATIO',
  max_aspect_ratio: 'EMPLOYEE_PHOTO_MAX_ASPECT_RATIO',
} as const;

const EMPLOYEE_PHOTO_RULE_DEFAULTS = {
  max_file_size_bytes: 5 * 1024 * 1024,
  min_width: 500,
  min_height: 650,
  max_width: 2000,
  max_height: 2600,
  min_aspect_ratio: 0.68,
  max_aspect_ratio: 0.82,
} as const;

type EmployeePhotoRuleKey = keyof typeof EMPLOYEE_PHOTO_RULE_KEYS;

function parseRuleValue(key: EmployeePhotoRuleKey, rawValue: any) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return null;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  if (key === 'min_aspect_ratio' || key === 'max_aspect_ratio') {
    return parsed;
  }
  return Math.trunc(parsed);
}

async function resolveEmployeePhotoValidationRules(Postgres: any, tenantId: string): Promise<{
  rules: typeof EMPLOYEE_PHOTO_RULE_DEFAULTS;
  source_by_rule: Record<EmployeePhotoRuleKey, 'TENANT' | 'SYSTEM' | 'FALLBACK'>;
}> {
  const settingKeys = Object.values(EMPLOYEE_PHOTO_RULE_KEYS);

  const { data: systemSettings, error: systemSettingsError } = await Postgres
    .from('system_settings')
    .select('id, setting_key, default_value')
    .in('setting_key', settingKeys)
    .eq('is_active', true);

  if (systemSettingsError) {
    throw new Error(systemSettingsError.message);
  }

  const systemByKey = new Map<string, { id: string; default_value: any }>();
  const systemSettingIds: string[] = [];
  (systemSettings || []).forEach((row: any) => {
    if (!row?.id || !row?.setting_key) return;
    systemByKey.set(String(row.setting_key), { id: row.id, default_value: row.default_value });
    systemSettingIds.push(row.id);
  });

  let tenantOverrides: any[] = [];
  if (systemSettingIds.length > 0) {
    const { data, error } = await Postgres
      .from('tenant_settings')
      .select('system_setting_id, setting_value')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .in('system_setting_id', systemSettingIds);

    if (error) {
      throw new Error(error.message);
    }
    tenantOverrides = data || [];
  }

  const tenantOverrideBySystemId = new Map<string, any>();
  tenantOverrides.forEach((row: any) => {
    if (!row?.system_setting_id) return;
    tenantOverrideBySystemId.set(String(row.system_setting_id), row.setting_value);
  });

  const sourceByRule = {} as Record<EmployeePhotoRuleKey, 'TENANT' | 'SYSTEM' | 'FALLBACK'>;
  const rules = { ...EMPLOYEE_PHOTO_RULE_DEFAULTS };

  (Object.keys(EMPLOYEE_PHOTO_RULE_KEYS) as EmployeePhotoRuleKey[]).forEach((ruleKey) => {
    const settingKey = EMPLOYEE_PHOTO_RULE_KEYS[ruleKey];
    const systemSetting = systemByKey.get(settingKey);
    const tenantValue = systemSetting?.id ? tenantOverrideBySystemId.get(systemSetting.id) : null;

    const parsedTenantValue = parseRuleValue(ruleKey, tenantValue);
    if (parsedTenantValue !== null) {
      (rules as any)[ruleKey] = parsedTenantValue;
      sourceByRule[ruleKey] = 'TENANT';
      return;
    }

    const parsedSystemValue = parseRuleValue(ruleKey, systemSetting?.default_value);
    if (parsedSystemValue !== null) {
      (rules as any)[ruleKey] = parsedSystemValue;
      sourceByRule[ruleKey] = 'SYSTEM';
      return;
    }

    sourceByRule[ruleKey] = 'FALLBACK';
  });

  return { rules, source_by_rule: sourceByRule };
}

async function upsertTenantSettingValueByKey(
  Postgres: any,
  tenantId: string,
  actor: string,
  settingKey: string,
  settingValue: string,
  required: boolean = true
): Promise<boolean> {
  const { data: systemSetting, error: systemSettingError } = await Postgres
    .from('system_settings')
    .select('id')
    .eq('setting_key', settingKey)
    .eq('is_active', true)
    .maybeSingle();

  if (systemSettingError) {
    throw new Error(systemSettingError.message);
  }
  if (!systemSetting?.id) {
    if (!required) {
      return false;
    }
    throw new Error(`No existe un system_setting activo con setting_key = ${settingKey}`);
  }

  const { data: existingOverride, error: existingOverrideError } = await Postgres
    .from('tenant_settings')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('system_setting_id', systemSetting.id)
    .maybeSingle();

  if (existingOverrideError) {
    throw new Error(existingOverrideError.message);
  }

  if (existingOverride?.id) {
    const { error: updateError } = await Postgres
      .from('tenant_settings')
      .update({
        setting_value: settingValue,
        is_active: true,
        updated_by: actor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingOverride.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
    return true;
  }

  const { error: insertError } = await Postgres
    .from('tenant_settings')
    .insert({
      tenant_id: tenantId,
      system_setting_id: systemSetting.id,
      setting_value: settingValue,
      is_active: true,
      created_by: actor,
    });

  if (insertError) {
    throw new Error(insertError.message);
  }
  return true;
}

function safeRelativePhotoPath(photoPath: string): string {
  const normalized = photoPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) {
    throw new Error('Ruta de foto inválida');
  }
  return normalized;
}

function isAllSelector(value: any): boolean {
  return value === '0' || value === 0;
}

async function getShiftCombinations(
  Postgres: any,
  tenantId: string,
  companyFilter?: string | null,
  payrollGroupFilter?: string | null
): Promise<{ company_id: string; payroll_group_id: string | null }[]> {
  let query = Postgres
    .from('employee_companies')
    .select('company_id, payroll_group_id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .not('company_id', 'is', null);

  if (companyFilter !== undefined) {
    if (companyFilter === null) {
      query = query.is('company_id', null);
    } else {
      query = query.eq('company_id', companyFilter);
    }
  }

  if (payrollGroupFilter !== undefined) {
    if (payrollGroupFilter === null) {
      query = query.is('payroll_group_id', null);
    } else {
      query = query.eq('payroll_group_id', payrollGroupFilter);
    }
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<string, { company_id: string; payroll_group_id: string | null }>();
  (data || []).forEach((row: any) => {
    if (!row?.company_id) return;
    const key = `${row.company_id}::${row.payroll_group_id || 'NULL'}`;
    if (!map.has(key)) {
      map.set(key, {
        company_id: row.company_id,
        payroll_group_id: row.payroll_group_id || null,
      });
    }
  });

  return Array.from(map.values());
}

async function validateShiftCombination(
  Postgres: any,
  tenantId: string,
  companyId: string | null | undefined,
  payrollGroupId: string | null | undefined
): Promise<string | null> {
  if (!companyId) {
    return 'company_id es obligatorio para validar la estructura organizacional';
  }

  try {
    const combos = await getShiftCombinations(Postgres, tenantId, companyId, payrollGroupId ?? null);
    if (combos.length === 0) {
      return 'La combinacion Empresa/Grupo de nomina no existe en employee_companies';
    }
    return null;
  } catch (error: any) {
    return error.message || 'Error validando combinacion organizacional';
  }
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
      employeeCompanyCombos,
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
      Postgres.from('countries').select('*').eq('is_active', true),
      Postgres.from('states').select('*').eq('is_active', true),
      Postgres.from('cities').select('*').eq('is_active', true),
      Postgres
        .from('employee_companies')
        .select('company_id, payroll_group_id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .not('company_id', 'is', null),
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
      employeeCompanyCombos.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      const firstError = errors.find((entry: any) => entry && typeof entry.message === 'string');
      return res.status(500).json({ error: firstError?.message || 'Error cargando catálogos' });
    }

    const companyById = new Map<string, any>();
    (companies.data || []).forEach((company: any) => {
      if (company?.id) companyById.set(company.id, company);
    });

    const payrollGroupById = new Map<string, any>();
    (payrollGroups.data || []).forEach((payrollGroup: any) => {
      if (payrollGroup?.id) payrollGroupById.set(payrollGroup.id, payrollGroup);
    });

    const combinationsMap = new Map<string, any>();
    (employeeCompanyCombos.data || []).forEach((row: any) => {
      const company = companyById.get(row?.company_id);
      if (!company?.id) return;

      const payrollGroup = row?.payroll_group_id ? payrollGroupById.get(row.payroll_group_id) : null;
      const comboKey = `${company.id}::${payrollGroup?.id || 'NULL'}`;
      if (!combinationsMap.has(comboKey)) {
        combinationsMap.set(comboKey, {
          company_id: company.id,
          company_code: company.company_code || null,
          company_name: company.company_name || null,
          payroll_group_id: payrollGroup?.id || null,
          payroll_group_code: payrollGroup?.payroll_group_code || null,
          payroll_group_name: payrollGroup?.payroll_group_name || null,
        });
      }
    });

    const countryOptions = (countries.data || [])
      .map((row: any) => mapCountryOption(row))
      .sort((a: any, b: any) => String(a.lookup_label).localeCompare(String(b.lookup_label), 'es'));
    const stateOptions = (states.data || [])
      .map((row: any) => mapStateOption(row))
      .sort((a: any, b: any) => String(a.lookup_label).localeCompare(String(b.lookup_label), 'es'));
    const cityOptions = (cities.data || [])
      .map((row: any) => mapCityOption(row))
      .sort((a: any, b: any) => String(a.lookup_label).localeCompare(String(b.lookup_label), 'es'));

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
        countries: countryOptions,
        states: stateOptions,
        cities: cityOptions,
        employee_company_combinations: Array.from(combinationsMap.values()),
      },
    });
  } catch (err: any) {
    if (err?.code === 'EACCES' || err?.code === 'EPERM') {
      return res.status(500).json({
        error: 'Sin permisos de escritura en la carpeta de fotos configurada',
        details: err?.message || null,
      });
    }
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/holidays/location-catalogs', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const selectedCountryId = normalizeScopeFilter(req.query.country_id);
    const selectedStateId = normalizeScopeFilter(req.query.state_id);

    const [companies, workLocations, countries, statesRaw, citiesRaw] = await Promise.all([
      Postgres
        .from('companies')
        .select('id, company_code, company_name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('company_name'),
      Postgres
        .from('work_locations')
        .select('id, work_location_code, work_location_name, company_id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('work_location_name'),
      Postgres
        .from('countries')
        .select('*')
        .eq('is_active', true),
      Postgres
        .from('states')
        .select('*')
        .eq('is_active', true),
      Postgres
        .from('cities')
        .select('*')
        .eq('is_active', true),
    ]);

    if (companies.error) {
      return res.status(500).json({ error: companies.error.message });
    }
    if (workLocations.error) {
      return res.status(500).json({ error: workLocations.error.message });
    }
    if (countries.error) {
      return res.status(500).json({ error: countries.error.message });
    }
    if (statesRaw.error) {
      return res.status(500).json({ error: statesRaw.error.message });
    }
    if (citiesRaw.error) {
      return res.status(500).json({ error: citiesRaw.error.message });
    }

    const countryOptions = (countries.data || [])
      .map((row: any) => mapCountryOption(row))
      .sort((a: any, b: any) => String(a.lookup_label).localeCompare(String(b.lookup_label), 'es'));

    let stateOptions = (statesRaw.data || [])
      .map((row: any) => mapStateOption(row))
      .sort((a: any, b: any) => String(a.lookup_label).localeCompare(String(b.lookup_label), 'es'));
    if (selectedCountryId) {
      stateOptions = stateOptions.filter((state: any) => String(state.country_id || '') === selectedCountryId);
    }

    let cityOptions = (citiesRaw.data || [])
      .map((row: any) => mapCityOption(row))
      .sort((a: any, b: any) => String(a.lookup_label).localeCompare(String(b.lookup_label), 'es'));
    if (selectedStateId) {
      cityOptions = cityOptions.filter((city: any) => String(city.state_id || '') === selectedStateId);
    } else if (selectedCountryId) {
      cityOptions = cityOptions.filter((city: any) => String(city.country_id || '') === selectedCountryId);
    }

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      catalogs: {
        companies: companies.data || [],
        work_locations: workLocations.data || [],
        countries: countryOptions,
        states: stateOptions,
        cities: cityOptions,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/holidays/calendar', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ error: 'year invalido' });
    }
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'month invalido (1-12)' });
    }

    const companyId = normalizeScopeFilter(req.query.company_id);
    const workLocationId = normalizeScopeFilter(req.query.work_location_id);
    const countryId = normalizeScopeFilter(req.query.country_id);
    const stateId = normalizeScopeFilter(req.query.state_id);
    const cityId = normalizeScopeFilter(req.query.city_id);

    let query = Postgres
      .from('holidays')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('holiday_date', { ascending: true });

    if (companyId) query = query.eq('company_id', companyId);

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const targetYear = String(year).padStart(4, '0');
    const targetMonth = String(month).padStart(2, '0');
    const monthItems = (data || []).flatMap((row: any) => {
      const dateIso = extractDateIso(row?.holiday_date);
      if (!dateIso) return [];
      const [rowYear, rowMonth, rowDay] = dateIso.split('-');

      const isRecurring = row?.is_recurring === true || String(row?.is_recurring) === 'true';
      const monthMatches = rowMonth === targetMonth;
      const exactYearMonthMatches = rowYear === targetYear && monthMatches;

      if (!exactYearMonthMatches && !(isRecurring && monthMatches)) return [];

      // Criterio de localizacion: incluir coincidencias exactas y alcances superiores (null).
      if (workLocationId) {
        const rowWorkLocationId = row?.work_location_id ? String(row.work_location_id) : '';
        if (rowWorkLocationId && rowWorkLocationId !== workLocationId) return [];
      }

      // Criterio geografico por niveles: city -> state -> country.
      // Si se elige un nivel, se incluyen tambien feriados de nivel superior (campo null).
      if (countryId) {
        const rowCountryId = row?.country_id ? String(row.country_id) : '';
        if (rowCountryId && rowCountryId !== countryId) return [];
      }
      if (stateId) {
        const rowStateId = row?.state_id ? String(row.state_id) : '';
        if (rowStateId && rowStateId !== stateId) return [];
      }
      if (cityId) {
        const rowCityId = row?.city_id ? String(row.city_id) : '';
        if (rowCityId && rowCityId !== cityId) return [];
      }

      // Proyecta recurrentes al anio visualizado para que el frontend pinte en la celda correcta.
      const projectedDate = `${targetYear}-${targetMonth}-${rowDay}`;
      return [{
        ...row,
        holiday_date: projectedDate,
      }];
    });

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      year,
      month,
      items: monthItems,
      count: monthItems.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/employees/photo-storage', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const resolved = await resolveEmployeePhotoStoragePath(Postgres, tenantId);
    const validation = await resolveEmployeePhotoValidationRules(Postgres, tenantId);
    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      setting_key: 'EMPLOYEE_PHOTO_PATH',
      configured_value: resolved.configuredValue,
      source: resolved.source,
      absolute_path: resolved.absolutePath,
      validation_rules: validation.rules,
      validation_sources: validation.source_by_rule,
    });
  } catch (err: any) {
    if (err?.code === 'EACCES' || err?.code === 'EPERM') {
      return res.status(500).json({
        error: 'Sin permisos de escritura en la carpeta destino de fotos',
        error_code: 'PHOTO_PERMISSION_DENIED',
        details: err?.message || null,
      });
    }
    return res.status(500).json({
      error: err.message || 'Error interno',
      error_code: 'PHOTO_STORAGE_ERROR',
      details: err?.message || null,
    });
  }
});

router.put('/employees/photo-storage', async (req: Request, res: Response) => {
  try {
    const storagePath = String(req.body?.storage_path || '').trim();
    if (!storagePath) {
      return res.status(400).json({ error: 'storage_path es obligatorio' });
    }
    if (storagePath.includes('\0') || storagePath.includes('..')) {
      return res.status(400).json({ error: 'storage_path invalido' });
    }

    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const actor = getActor(req);
    await upsertTenantSettingValueByKey(Postgres, tenantId, actor, 'EMPLOYEE_PHOTO_PATH', storagePath);

    const numericRuleInputs = {} as Record<EmployeePhotoRuleKey, number>;
    (Object.keys(EMPLOYEE_PHOTO_RULE_KEYS) as EmployeePhotoRuleKey[]).forEach((ruleKey) => {
      const parsedValue = parseRuleValue(ruleKey, req.body?.validation_rules?.[ruleKey]);
      if (parsedValue !== null) {
        numericRuleInputs[ruleKey] = parsedValue;
      }
    });

    if (
      numericRuleInputs.min_width !== undefined &&
      numericRuleInputs.max_width !== undefined &&
      numericRuleInputs.min_width > numericRuleInputs.max_width
    ) {
      return res.status(400).json({ error: 'min_width no puede ser mayor que max_width' });
    }
    if (
      numericRuleInputs.min_height !== undefined &&
      numericRuleInputs.max_height !== undefined &&
      numericRuleInputs.min_height > numericRuleInputs.max_height
    ) {
      return res.status(400).json({ error: 'min_height no puede ser mayor que max_height' });
    }
    if (
      numericRuleInputs.min_aspect_ratio !== undefined &&
      numericRuleInputs.max_aspect_ratio !== undefined &&
      numericRuleInputs.min_aspect_ratio > numericRuleInputs.max_aspect_ratio
    ) {
      return res.status(400).json({ error: 'min_aspect_ratio no puede ser mayor que max_aspect_ratio' });
    }

    for (const ruleKey of Object.keys(numericRuleInputs) as EmployeePhotoRuleKey[]) {
      await upsertTenantSettingValueByKey(
        Postgres,
        tenantId,
        actor,
        EMPLOYEE_PHOTO_RULE_KEYS[ruleKey],
        String(numericRuleInputs[ruleKey]),
        false
      );
    }

    const resolved = await resolveEmployeePhotoStoragePath(Postgres, tenantId);
    const validation = await resolveEmployeePhotoValidationRules(Postgres, tenantId);
    await fs.mkdir(resolved.absolutePath, { recursive: true });

    return res.status(200).json({
      success: true,
      message: 'Configuracion de fotos de empleados actualizada',
      setting_key: 'EMPLOYEE_PHOTO_PATH',
      configured_value: resolved.configuredValue,
      source: resolved.source,
      absolute_path: resolved.absolutePath,
      validation_rules: validation.rules,
      validation_sources: validation.source_by_rule,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Error interno' });
  }
});

router.post('/employees/upload-photo', async (req: Request, res: Response) => {
  try {
    const fileName = String(req.body?.file_name || '').trim();
    const mimeType = String(req.body?.mime_type || '').trim().toLowerCase();
    const fileBase64 = String(req.body?.file_base64 || '').trim();

    if (!fileName || !fileBase64) {
      return res.status(400).json({
        error: 'file_name y file_base64 son obligatorios',
        error_code: 'PHOTO_UPLOAD_BAD_REQUEST',
      });
    }

    const allowedMimes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
    if (!allowedMimes.has(mimeType)) {
      return res.status(400).json({
        error: 'Formato no soportado. Use jpg, png o webp',
        error_code: 'PHOTO_INVALID_FORMAT',
      });
    }

    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) {
      return res.status(400).json({
        error: 'No se pudo resolver tenant_id',
        error_code: 'PHOTO_UPLOAD_TENANT_REQUIRED',
      });
    }

    const resolved = await resolveEmployeePhotoStoragePath(Postgres, tenantId);
    const validation = await resolveEmployeePhotoValidationRules(Postgres, tenantId);
    await fs.mkdir(resolved.absolutePath, { recursive: true });

    const buffer = Buffer.from(fileBase64, 'base64');
    if (!buffer.length) {
      return res.status(400).json({
        error: 'Contenido de imagen invalido',
        error_code: 'PHOTO_INVALID_CONTENT',
      });
    }
    if (buffer.length > validation.rules.max_file_size_bytes) {
      return res.status(400).json({
        error: `La imagen supera el limite de ${Math.round(validation.rules.max_file_size_bytes / (1024 * 1024))}MB`,
        error_code: 'PHOTO_TOO_LARGE',
      });
    }

    const extByMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = extByMime[mimeType] || path.extname(fileName) || '.jpg';
    const storedFileName = `${Date.now()}-${randomUUID()}${ext}`;
    const relativePath = `${tenantId}/${storedFileName}`;
    const normalizedRelative = safeRelativePhotoPath(relativePath);
    const absoluteFilePath = path.join(resolved.absolutePath, normalizedRelative);

    await fs.mkdir(path.dirname(absoluteFilePath), { recursive: true });
    await fs.writeFile(absoluteFilePath, buffer);

    return res.status(201).json({
      success: true,
      photo_path: normalizedRelative,
      message: 'Foto cargada correctamente',
    });
  } catch (err: any) {
    if (err?.code === 'EACCES' || err?.code === 'EPERM') {
      return res.status(500).json({
        error: 'Sin permisos de escritura en la carpeta destino de fotos',
        error_code: 'PHOTO_PERMISSION_DENIED',
        details: err?.message || null,
      });
    }
    return res.status(500).json({
      error: err.message || 'Error interno',
      error_code: 'PHOTO_STORAGE_ERROR',
      details: err?.message || null,
    });
  }
});

router.get('/employees/:id/photo', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const { data: employee, error: employeeError } = await Postgres
      .from('employees')
      .select('id, employee_photo_path')
      .eq('tenant_id', tenantId)
      .eq('id', req.params.id)
      .maybeSingle();

    if (employeeError) {
      return res.status(500).json({ error: employeeError.message });
    }
    if (!employee) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    if (!employee.employee_photo_path) {
      return res.status(404).json({ error: 'El empleado no tiene foto' });
    }

    const resolved = await resolveEmployeePhotoStoragePath(Postgres, tenantId);
    const relativePath = safeRelativePhotoPath(String(employee.employee_photo_path));
    if (!relativePath.startsWith(`${tenantId}/`)) {
      return res.status(403).json({ error: 'Ruta de foto no permitida para este tenant' });
    }

    const absoluteFilePath = path.join(resolved.absolutePath, relativePath);
    await fs.access(absoluteFilePath);
    return res.sendFile(absoluteFilePath);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return res.status(404).json({ error: 'Archivo de foto no encontrado' });
    }
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
    if (err?.code === 'EACCES' || err?.code === 'EPERM') {
      return res.status(500).json({
        error: 'Sin permisos de escritura en la carpeta destino de fotos',
        error_code: 'PHOTO_PERMISSION_DENIED',
        details: err?.message || null,
      });
    }
    return res.status(500).json({
      error: err.message || 'Error interno',
      error_code: 'PHOTO_STORAGE_ERROR',
      details: err?.message || null,
    });
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
    if (err?.code === 'EACCES' || err?.code === 'EPERM') {
      return res.status(500).json({
        error: 'Sin permisos de escritura en la carpeta destino de fotos',
        error_code: 'PHOTO_PERMISSION_DENIED',
        details: err?.message || null,
      });
    }
    return res.status(500).json({
      error: err.message || 'Error interno',
      error_code: 'PHOTO_STORAGE_ERROR',
      details: err?.message || null,
    });
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

    if (req.params.entity === 'shifts') {
      const allCompany = isAllSelector(payload.company_id);
      const allPayrollGroup = isAllSelector(payload.payroll_group_id);

      if (allCompany || allPayrollGroup) {
        const combinations = await getShiftCombinations(
          Postgres,
          tenantId,
          allCompany ? undefined : payload.company_id,
          allPayrollGroup ? undefined : payload.payroll_group_id ?? null
        );

        if (combinations.length === 0) {
          return res.status(400).json({
            error: 'No existen combinaciones organizacionales activas en employee_companies para la seleccion indicada',
          });
        }

        const rows = combinations.map((combo) => ({
          ...payload,
          company_id: combo.company_id,
          payroll_group_id: combo.payroll_group_id,
          tenant_id: tenantId,
          created_by: getActor(req),
        }));

        const { data, error } = await Postgres
          .from(config.table)
          .insert(rows)
          .select('*');

        if (error) {
          return res.status(500).json({ error: error.message });
        }

        return res.status(201).json({
          success: true,
          items: data || [],
          count: (data || []).length,
          message: `Se crearon ${(data || []).length} horarios con combinaciones válidas`,
        });
      }

      const validationError = await validateShiftCombination(
        Postgres,
        tenantId,
        payload.company_id,
        payload.payroll_group_id
      );
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
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
    if (err?.code === 'EACCES' || err?.code === 'EPERM') {
      return res.status(500).json({
        error: 'Sin permisos de escritura en la carpeta destino de fotos',
        error_code: 'PHOTO_PERMISSION_DENIED',
        details: err?.message || null,
      });
    }
    return res.status(500).json({
      error: err.message || 'Error interno',
      error_code: 'PHOTO_STORAGE_ERROR',
      details: err?.message || null,
    });
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

    if (req.params.entity === 'shifts') {
      if (isAllSelector(payload.company_id) || isAllSelector(payload.payroll_group_id)) {
        return res.status(400).json({
          error: 'En actualizacion no se permite valor 0 (TODOS). Use creación para generar horarios masivos por combinacion',
        });
      }

      const { data: currentShift, error: currentShiftError } = await Postgres
        .from('shifts')
        .select('company_id, payroll_group_id')
        .eq('tenant_id', tenantId)
        .eq('id', req.params.id)
        .maybeSingle();

      if (currentShiftError) {
        return res.status(500).json({ error: currentShiftError.message });
      }
      if (!currentShift) {
        return res.status(404).json({ error: 'Registro no encontrado' });
      }

      const candidateCompanyId = payload.company_id ?? currentShift.company_id;
      const candidatePayrollGroupId = payload.payroll_group_id ?? currentShift.payroll_group_id;

      const validationError = await validateShiftCombination(
        Postgres,
        tenantId,
        candidateCompanyId,
        candidatePayrollGroupId
      );
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
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
    if (err?.code === 'EACCES' || err?.code === 'EPERM') {
      return res.status(500).json({
        error: 'Sin permisos de escritura en la carpeta destino de fotos',
        error_code: 'PHOTO_PERMISSION_DENIED',
        details: err?.message || null,
      });
    }
    return res.status(500).json({
      error: err.message || 'Error interno',
      error_code: 'PHOTO_STORAGE_ERROR',
      details: err?.message || null,
    });
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
    if (err?.code === 'EACCES' || err?.code === 'EPERM') {
      return res.status(500).json({
        error: 'Sin permisos de escritura en la carpeta destino de fotos',
        error_code: 'PHOTO_PERMISSION_DENIED',
        details: err?.message || null,
      });
    }
    return res.status(500).json({
      error: err.message || 'Error interno',
      error_code: 'PHOTO_STORAGE_ERROR',
      details: err?.message || null,
    });
  }
});

router.delete('/:entity/:id', async (req: Request, res: Response) => {
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
      .delete()
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
      message: 'Registro eliminado correctamente',
    });
  } catch (err: any) {
    if (err?.code === 'EACCES' || err?.code === 'EPERM') {
      return res.status(500).json({
        error: 'Sin permisos de escritura en la carpeta destino de fotos',
        error_code: 'PHOTO_PERMISSION_DENIED',
        details: err?.message || null,
      });
    }
    return res.status(500).json({
      error: err.message || 'Error interno',
      error_code: 'PHOTO_STORAGE_ERROR',
      details: err?.message || null,
    });
  }
});

export default router;

