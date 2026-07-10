import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';
import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { withDocs } from '../lib/swagger-docs.js';
import { pool } from '../lib/db.js';

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
    requiredOnCreate: ['company_name', 'company_short_name', 'legacy_id'],
    defaultSort: 'company_name',
    hasIsActive: true,
    codeField: 'legacy_id',
    nameField: 'company_name',
  },
  'work-locations': {
    table: 'work_locations',
    requiredOnCreate: ['work_location_name', 'work_location_short_name', 'legacy_id'],
    defaultSort: 'work_location_name',
    hasIsActive: true,
    codeField: 'legacy_id',
    nameField: 'work_location_name',
  },
  'departments': {
    table: 'departments',
    requiredOnCreate: ['department_name', 'department_short_name', 'legacy_id'],
    defaultSort: 'department_name',
    hasIsActive: true,
    codeField: 'legacy_id',
    nameField: 'department_name',
  },
  'areas': {
    table: 'areas',
    requiredOnCreate: ['area_name', 'area_short_name', 'legacy_id'],
    defaultSort: 'area_name',
    hasIsActive: true,
    codeField: 'legacy_id',
    nameField: 'area_name',
  },
  'cost-centers': {
    table: 'cost_centers',
    requiredOnCreate: ['cost_center_name', 'cost_center_short_name', 'legacy_id'],
    defaultSort: 'cost_center_name',
    hasIsActive: true,
    codeField: 'legacy_id',
    nameField: 'cost_center_name',
  },
  'payroll-groups': {
    table: 'payroll_groups',
    requiredOnCreate: ['payroll_group_name', 'payroll_group_short_name', 'legacy_id'],
    defaultSort: 'payroll_group_name',
    hasIsActive: true,
    codeField: 'legacy_id',
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
    requiredOnCreate: ['profile_name', 'profile_short_name', 'legacy_id'],
    defaultSort: 'profile_name',
    hasIsActive: true,
    codeField: 'legacy_id',
    nameField: 'profile_name',
  },
  'job-titles': {
    table: 'job_titles',
    requiredOnCreate: ['job_title_name', 'job_title_short_name', 'legacy_id'],
    defaultSort: 'job_title_name',
    hasIsActive: true,
    codeField: 'legacy_id',
    nameField: 'job_title_name',
  },
  'work-groups': {
    table: 'work_groups',
    requiredOnCreate: ['work_group_name', 'work_group_short_name', 'legacy_id'],
    defaultSort: 'work_group_name',
    hasIsActive: true,
    codeField: 'legacy_id',
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

type ActionAuthContext = {
  userId: string;
  tenantId: string;
};

async function resolveActionAuthContext(req: Request): Promise<ActionAuthContext | null> {
  const authUserId = String((req as any)?.user?.id || '').trim();
  if (!authUserId) return null;

  const result = await pool.query(
    `
      SELECT u.id AS user_id, u.tenant_id
      FROM public.users u
      WHERE u.auth_user_id = $1
        AND u.is_active = true
      LIMIT 1
    `,
    [authUserId]
  );

  const row = result.rows[0];
  if (!row?.user_id || !row?.tenant_id) return null;
  return {
    userId: String(row.user_id),
    tenantId: String(row.tenant_id),
  };
}

async function hasAnyScreenActionPermission(
  tenantId: string,
  userId: string,
  screenKey: string,
  actionKeys: string[]
): Promise<boolean> {
  if (!screenKey || !actionKeys.length) return false;
  const normalizedActionKeys = Array.from(
    new Set(
      actionKeys
        .map((entry) => String(entry || '').trim().toUpperCase())
        .filter(Boolean)
    )
  );
  if (normalizedActionKeys.length === 0) return false;

  const result = await pool.query(
    `
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r
        ON r.id = ur.role_id
       AND r.is_active = true
      JOIN public.role_screen_actions rsa
        ON rsa.role_id = ur.role_id
       AND rsa.tenant_id = ur.tenant_id
       AND rsa.is_active = true
       AND rsa.is_allowed = true
      JOIN public.screen_actions sa
        ON sa.id = rsa.screen_action_id
       AND sa.is_active = true
      JOIN public.screens s
        ON s.id = sa.screen_id
       AND s.is_active = true
      JOIN public.actions a
        ON a.id = sa.action_id
       AND a.is_active = true
      WHERE ur.user_id = $1::uuid
        AND ur.tenant_id = $2::uuid
        AND ur.is_active = true
        AND (ur.valid_from IS NULL OR ur.valid_from <= now())
        AND (ur.valid_to IS NULL OR ur.valid_to >= now())
        AND s.screen_key = $3
        AND a.action_key = ANY($4::text[])
      LIMIT 1
    `,
    [userId, tenantId, screenKey, normalizedActionKeys]
  );

  return result.rows.length > 0;
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

async function ensureEmployeeRoleAssigned(
  Postgres: any,
  tenantId: string,
  userId: string,
  actor: string
): Promise<string> {
  const { data: role, error: roleError } = await Postgres
    .from('roles')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('role_key', 'EMPLOYEE')
    .eq('is_active', true)
    .maybeSingle();

  if (roleError) throw new Error(roleError.message);
  if (!role?.id) {
    throw new Error('No existe un rol activo EMPLOYEE en este tenant');
  }

  const { data: existingUserRole, error: existingUserRoleError } = await Postgres
    .from('user_roles')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('role_id', role.id)
    .maybeSingle();

  if (existingUserRoleError) throw new Error(existingUserRoleError.message);

  if (existingUserRole?.id) {
    const { error: activateError } = await Postgres
      .from('user_roles')
      .update({
        is_active: true,
        updated_by: actor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingUserRole.id);
    if (activateError) throw new Error(activateError.message);
    return existingUserRole.id;
  }

  const { data: insertedUserRole, error: insertRoleError } = await Postgres
    .from('user_roles')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      role_id: role.id,
      company_id: null,
      is_active: true,
      created_by: actor,
    })
    .select('id')
    .single();
  if (insertRoleError) throw new Error(insertRoleError.message);
  if (!insertedUserRole?.id) throw new Error('No se pudo crear la asignaciÃƒÂ³n de rol EMPLOYEE');
  return insertedUserRole.id;
}

async function ensureEmployeeScopeAssigned(
  Postgres: any,
  tenantId: string,
  userRoleId: string,
  employeeId: string,
  actor: string
) {
  const { data: scopeType, error: scopeTypeError } = await Postgres
    .from('scope_types')
    .select('id')
    .eq('scope_type_key', 'EMPLOYEE')
    .eq('is_active', true)
    .maybeSingle();

  if (scopeTypeError) throw new Error(scopeTypeError.message);
  if (!scopeType?.id) throw new Error('No existe un scope_type activo con key EMPLOYEE');

  const { data: existingScope, error: existingScopeError } = await Postgres
    .from('user_role_scopes')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_role_id', userRoleId)
    .eq('scope_type_id', scopeType.id)
    .eq('scope_entity_id', employeeId)
    .maybeSingle();

  if (existingScopeError) throw new Error(existingScopeError.message);

  if (existingScope?.id) {
    const { error: activateScopeError } = await Postgres
      .from('user_role_scopes')
      .update({
        is_active: true,
        updated_by: actor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingScope.id);
    if (activateScopeError) throw new Error(activateScopeError.message);
    return;
  }

  const { error: insertScopeError } = await Postgres
    .from('user_role_scopes')
    .insert({
      tenant_id: tenantId,
      user_role_id: userRoleId,
      scope_type_id: scopeType.id,
      scope_entity_id: employeeId,
      is_active: true,
      created_by: actor,
    });

  if (insertScopeError) throw new Error(insertScopeError.message);
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
    throw new Error('Ruta de foto invÃƒÂ¡lida');
  }
  return normalized;
}

async function resolveCompanyAssetsStoragePath(
  Postgres: any,
  tenantId: string
): Promise<{ absolutePath: string; configuredValue: string; source: 'TENANT' | 'SYSTEM' | 'FALLBACK' }> {
  const { data: systemSetting, error: systemSettingError } = await Postgres
    .from('system_settings')
    .select('id, default_value')
    .eq('setting_key', 'COMPANY_ASSETS_PATH')
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
    configuredValue = path.join('storage', 'company-assets');
    source = 'FALLBACK';
  }

  const absolutePath = path.isAbsolute(configuredValue)
    ? configuredValue
    : path.resolve(process.cwd(), configuredValue);

  return { absolutePath, configuredValue, source };
}

function safeRelativeCompanyAssetPath(assetPath: string): string {
  const normalized = assetPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) {
    throw new Error('Ruta de imagen de empresa invalida');
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

type ImportLogLevel = 'info' | 'success' | 'warn' | 'error';

type ImportLogEvent = {
  timestamp: string;
  level: ImportLogLevel;
  phase: string;
  message: string;
  progress: number;
  activity_key?: string;
  activity_label?: string;
  activity_progress?: number;
};

type StructureImportRow = {
  tenant_id?: string;
  company_code?: string;
  company_name?: string;
  company_short_name?: string;
  company_address?: string;
  company_address_line1?: string;
  company_address_line2?: string;
  company_country_id?: string;
  company_country_label?: string;
  company_country_short_label?: string;
  company_state_id?: string;
  company_state_label?: string;
  company_state_short_label?: string;
  company_city_id?: string;
  company_city_label?: string;
  company_city_short_label?: string;
  company_postal_code?: string;
  company_phone?: string;
  employee_code?: string;
  device_user_code?: string;
  payroll_employee_code?: string;
  accounting_account_code?: string;
  salary_amount?: any;
  work_on_holidays?: any;
  hire_date?: any;
  termination_date?: any;
  employee_profile_code?: string;
  profile_name?: string;
  profile_short_name?: string;
  work_group_code?: string;
  work_group_payrol_group_code?: string;
  work_group_name?: string;
  work_group_short_name?: string;
  work_location_code?: string;
  work_location_name?: string;
  work_location_short_name?: string;
  work_location_country_id?: string;
  work_location_country_label?: string;
  work_location_country_short_label?: string;
  work_location_state_id?: string;
  work_location_state_label?: string;
  work_location_state_short_label?: string;
  work_location_city_id?: string;
  work_location_city_label?: string;
  work_location_city_short_label?: string;
  work_location_time_zone?: string;
  department_code?: string;
  department_name?: string;
  department_short_name?: string;
  area_code?: string;
  area_name?: string;
  area_short_name?: string;
  area_payroll_group_code?: string;
  job_title_code?: string;
  job_title_name?: string;
  job_title_short_name?: string;
  cost_center_code?: string;
  homologation_code?: string;
  gl_account_code?: string;
  cost_center_name?: string;
  cost_center_short_name?: string;
  payroll_group_code?: string;
  payroll_group_name?: string;
  payroll_group_short_name?: string;
  contract_type_key?: string;
  is_active?: any;
};

type EmployeeImportRow = {
  tenant_id?: string;
  employee_code?: string;
  employee_lastname?: string;
  employee_name?: string;
  employee_birthday?: any;
  employee_gender_id?: string;
  employee_is_model?: any;
  employee_observations?: string;
  employee_photo_path?: string;
  username?: string;
  password?: string;
  display_name?: string;
  email?: string;
  phone?: string;
  preferred_language_code?: string;
  user_role_key?: string;
  scope_type_key?: string;
  valid_from?: any;
  valid_to?: any;
  is_active?: any;
};

type StagedEmployeeCompanyAssignment = {
  employee_code: string;
  company_code: string;
  device_user_code: string | null;
  payroll_employee_code: string | null;
  accounting_account_code: string | null;
  salary_amount: number | null;
  work_on_holidays: boolean;
  hire_date: string | null;
  termination_date: string | null;
  contract_type_key: string | null;
  employee_profile_code: string | null;
  work_group_code: string | null;
  work_location_code: string | null;
  department_code: string | null;
  area_code: string | null;
  job_title_code: string | null;
  cost_center_code: string | null;
  payroll_group_code: string | null;
  is_active: boolean;
};

function pushImportEvent(
  events: ImportLogEvent[],
  phase: string,
  level: ImportLogLevel,
  message: string,
  progress: number,
  activity?: { key: string; label?: string; progress?: number }
) {
  events.push({
    timestamp: new Date().toISOString(),
    phase,
    level,
    message,
    progress,
    activity_key: activity?.key,
    activity_label: activity?.label || activity?.key,
    activity_progress: activity?.progress,
  });
}

function normalizeText(value: any): string | null {
  if (value === undefined || value === null) return null;
  const next = String(value).trim();
  if (!next || next.toUpperCase() === 'NULL') return null;
  return next;
}

function normalizeBool(value: any, defaultValue = true): boolean {
  if (value === undefined || value === null || String(value).trim() === '') return defaultValue;
  const next = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'si', 'y', '-1'].includes(next)) return true;
  if (['false', '0', 'no', 'n'].includes(next)) return false;
  return defaultValue;
}

function normalizeNumber(value: any): number | null {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const next = Number(String(value).replace(',', '.'));
  return Number.isFinite(next) ? next : null;
}

function normalizeDate(value: any): string | null {
  const iso = extractDateIso(value);
  return iso || null;
}

function normalizeTimestamp(value: any): string | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function sanitizeUsername(value: any): string | null {
  const base = normalizeText(value);
  if (!base) return null;
  let next = stripDiacritics(base).toLowerCase();
  next = next.replace(/\s+/g, '.');
  next = next.replace(/[^a-z0-9._-]/g, '');
  next = next.replace(/\.{2,}/g, '.');
  next = next.replace(/^[._-]+|[._-]+$/g, '');
  return next || null;
}

function sanitizeEmail(value: any): string | null {
  const base = normalizeText(value);
  if (!base) return null;
  const raw = stripDiacritics(base).toLowerCase();
  const parts = raw.split('@');
  if (parts.length !== 2) return null;

  let local = parts[0].replace(/[^a-z0-9._%+-]/g, '');
  let domain = parts[1].replace(/[^a-z0-9.-]/g, '');

  local = local.replace(/\.{2,}/g, '.').replace(/^[._%+-]+|[._%+-]+$/g, '');
  domain = domain.replace(/\.{2,}/g, '.').replace(/^-+|-+$/g, '').replace(/^\.+|\.+$/g, '');

  const normalized = `${local}@${domain}`;
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(normalized)) return null;
  return normalized;
}

async function findByTenantAndCode(
  Postgres: any,
  table: string,
  tenantId: string,
  codeColumn: string,
  code: string
): Promise<any | null> {
  const { data, error } = await Postgres
    .from(table)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq(codeColumn, code)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || `Error consultando ${table}`);
  return data || null;
}

async function upsertByTenantCode(
  Postgres: any,
  table: string,
  tenantId: string,
  actor: string,
  codeColumn: string,
  row: Record<string, any>
): Promise<{ id: string; created: boolean }> {
  const code = normalizeText(row[codeColumn]);
  if (!code) {
    throw new Error(`Falta ${codeColumn} para tabla ${table}`);
  }

  const existing = await findByTenantAndCode(Postgres, table, tenantId, codeColumn, code);
  const payload = {
    ...row,
    [codeColumn]: code,
  };

  if (existing?.id) {
    const { error } = await Postgres
      .from(table)
      .update({
        ...payload,
        updated_by: actor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) throw new Error(error.message || `Error actualizando ${table}`);
    return { id: existing.id, created: false };
  }

  const { data, error } = await Postgres
    .from(table)
    .insert({
      ...payload,
      tenant_id: tenantId,
      created_by: actor,
    })
    .select('id')
    .single();
  if (error || !data?.id) throw new Error(error?.message || `Error creando ${table}`);
  return { id: data.id, created: true };
}

async function ensureCountry(
  Postgres: any,
  tenantId: string,
  actor: string,
  keyRaw: any,
  labelRaw: any,
  shortRaw: any
): Promise<{ id: string | null; created: boolean }> {
  const key = normalizeText(keyRaw);
  if (!key) return { id: null, created: false };
  const label = normalizeText(labelRaw) || key;
  const shortLabel = normalizeText(shortRaw) || label;

  const { data: existing, error: existingError } = await Postgres
    .from('countries')
    .select('id')
    .eq('country_key', key)
    .limit(1)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message || 'Error consultando countries');
  if (existing?.id) return { id: existing.id, created: false };

  const { data, error } = await Postgres
    .from('countries')
    .insert({
      tenant_id: tenantId,
      country_key: key,
      country_label: label,
      country_short_label: shortLabel,
      is_active: true,
      created_by: actor,
    })
    .select('id')
    .single();
  if (error || !data?.id) throw new Error(error?.message || 'Error creando country');
  return { id: data.id, created: true };
}

async function ensureState(
  Postgres: any,
  tenantId: string,
  actor: string,
  countryId: string | null,
  keyRaw: any,
  labelRaw: any,
  shortRaw: any
): Promise<{ id: string | null; created: boolean }> {
  const key = normalizeText(keyRaw);
  if (!countryId || !key) return { id: null, created: false };
  const label = normalizeText(labelRaw) || key;
  const shortLabel = normalizeText(shortRaw) || label;

  const { data: existing, error: existingError } = await Postgres
    .from('states')
    .select('id')
    .eq('country_id', countryId)
    .eq('state_key', key)
    .limit(1)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message || 'Error consultando states');
  if (existing?.id) return { id: existing.id, created: false };

  const { data, error } = await Postgres
    .from('states')
    .insert({
      tenant_id: tenantId,
      country_id: countryId,
      state_key: key,
      state_label: label,
      state_short_label: shortLabel,
      is_active: true,
      created_by: actor,
    })
    .select('id')
    .single();
  if (error || !data?.id) throw new Error(error?.message || 'Error creando state');
  return { id: data.id, created: true };
}

async function ensureCity(
  Postgres: any,
  tenantId: string,
  actor: string,
  countryId: string | null,
  stateId: string | null,
  keyRaw: any,
  labelRaw: any,
  shortRaw: any
): Promise<{ id: string | null; created: boolean }> {
  const key = normalizeText(keyRaw);
  if (!countryId || !stateId || !key) return { id: null, created: false };
  const label = normalizeText(labelRaw) || key;
  const shortLabel = normalizeText(shortRaw) || label;

  const { data: existing, error: existingError } = await Postgres
    .from('cities')
    .select('id')
    .eq('country_id', countryId)
    .eq('state_id', stateId)
    .eq('city_key', key)
    .limit(1)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message || 'Error consultando cities');
  if (existing?.id) return { id: existing.id, created: false };

  const { data, error } = await Postgres
    .from('cities')
    .insert({
      tenant_id: tenantId,
      country_id: countryId,
      state_id: stateId,
      city_key: key,
      city_label: label,
      city_short_label: shortLabel,
      is_active: true,
      created_by: actor,
    })
    .select('id')
    .single();
  if (error || !data?.id) throw new Error(error?.message || 'Error creando city');
  return { id: data.id, created: true };
}

router.post('/mass-import/structure', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const actor = getActor(req);
    const rows = Array.isArray(req.body?.rows) ? (req.body.rows as StructureImportRow[]) : [];
    if (rows.length === 0) return res.status(400).json({ error: 'Debe enviar rows con contenido' });

    const events: ImportLogEvent[] = [];
    pushImportEvent(events, 'structure', 'info', `Inicio de importacion de estructura (${rows.length} filas)`, 5);

    const counters: Record<string, { created: number; updated: number }> = {
      countries: { created: 0, updated: 0 },
      states: { created: 0, updated: 0 },
      cities: { created: 0, updated: 0 },
      companies: { created: 0, updated: 0 },
      payroll_groups: { created: 0, updated: 0 },
      departments: { created: 0, updated: 0 },
      areas: { created: 0, updated: 0 },
      job_titles: { created: 0, updated: 0 },
      cost_centers: { created: 0, updated: 0 },
      work_groups: { created: 0, updated: 0 },
      work_locations: { created: 0, updated: 0 },
      employee_profiles: { created: 0, updated: 0 },
    };

    const stagedMap = new Map<string, StagedEmployeeCompanyAssignment>();
    const countryCache = new Map<string, string | null>();
    const stateCache = new Map<string, string | null>();
    const cityCache = new Map<string, string | null>();
    const companyCache = new Map<string, { id: string; created: boolean }>();
    const payrollCache = new Map<string, { id: string; created: boolean }>();
    const profileCache = new Map<string, { id: string; created: boolean }>();
    const departmentCache = new Map<string, { id: string; created: boolean }>();
    const areaCache = new Map<string, { id: string; created: boolean }>();
    const jobTitleCache = new Map<string, { id: string; created: boolean }>();
    const costCenterCache = new Map<string, { id: string; created: boolean }>();
    const workGroupCache = new Map<string, { id: string; created: boolean }>();
    const workLocationCache = new Map<string, { id: string; created: boolean }>();
    const payrollRefByCode = new Map<string, string | null>();
    const announcedTables = new Set<string>();
    const announceTable = (tableKey: string, tableLabel: string, index: number) => {
      if (announcedTables.has(tableKey)) return;
      announcedTables.add(tableKey);
      const progress = Math.max(8, Math.min(80, Math.round((index / Math.max(rows.length, 1)) * 100)));
      pushImportEvent(events, 'structure', 'info', `Procesando tabla ${tableLabel}`, progress);
    };

    const ensureCountryCached = async (keyRaw: any, labelRaw: any, shortRaw: any): Promise<string | null> => {
      const key = normalizeText(keyRaw);
      if (!key) return null;
      if (countryCache.has(key)) return countryCache.get(key) || null;
      const result = await ensureCountry(Postgres, tenantId, actor, keyRaw, labelRaw, shortRaw);
      counters.countries[result.created ? 'created' : 'updated'] += 1;
      countryCache.set(key, result.id);
      return result.id;
    };

    const ensureStateCached = async (
      countryId: string | null,
      keyRaw: any,
      labelRaw: any,
      shortRaw: any
    ): Promise<string | null> => {
      const key = normalizeText(keyRaw);
      if (!countryId || !key) return null;
      const cacheKey = `${countryId}::${key}`;
      if (stateCache.has(cacheKey)) return stateCache.get(cacheKey) || null;
      const result = await ensureState(Postgres, tenantId, actor, countryId, keyRaw, labelRaw, shortRaw);
      counters.states[result.created ? 'created' : 'updated'] += 1;
      stateCache.set(cacheKey, result.id);
      return result.id;
    };

    const ensureCityCached = async (
      countryId: string | null,
      stateId: string | null,
      keyRaw: any,
      labelRaw: any,
      shortRaw: any
    ): Promise<string | null> => {
      const key = normalizeText(keyRaw);
      if (!countryId || !stateId || !key) return null;
      const cacheKey = `${countryId}::${stateId}::${key}`;
      if (cityCache.has(cacheKey)) return cityCache.get(cacheKey) || null;
      const result = await ensureCity(Postgres, tenantId, actor, countryId, stateId, keyRaw, labelRaw, shortRaw);
      counters.cities[result.created ? 'created' : 'updated'] += 1;
      cityCache.set(cacheKey, result.id);
      return result.id;
    };

    const upsertCatalogCached = async (
      cache: Map<string, { id: string; created: boolean }>,
      table: string,
      codeColumn: string,
      code: string,
      payload: Record<string, any>,
      counterKey: keyof typeof counters
    ): Promise<{ id: string; created: boolean }> => {
      const cached = cache.get(code);
      if (cached) return cached;
      const upsert = await upsertByTenantCode(Postgres, table, tenantId, actor, codeColumn, payload);
      counters[counterKey][upsert.created ? 'created' : 'updated'] += 1;
      cache.set(code, upsert);
      return upsert;
    };

    const resolvePayrollRefByCode = async (codeRaw: any): Promise<string | null> => {
      const code = normalizeText(codeRaw);
      if (!code) return null;
      const cachedRef = payrollRefByCode.get(code);
      if (cachedRef !== undefined) return cachedRef;
      const fromCache = payrollCache.get(code)?.id;
      if (fromCache) {
        payrollRefByCode.set(code, fromCache);
        return fromCache;
      }
      const existing = await findByTenantAndCode(Postgres, 'payroll_groups', tenantId, 'legacy_id', code);
      const id = (existing?.id as string | undefined) || null;
      payrollRefByCode.set(code, id);
      return id;
    };

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNo = index + 2;

      const employeeCode = normalizeText(row.employee_code);
      const companyCode = normalizeText(row.company_code);
      const payrollGroupCode = normalizeText(row.payroll_group_code);
      const departmentCode = normalizeText(row.department_code);
      const areaCode = normalizeText(row.area_code);
      const jobTitleCode = normalizeText(row.job_title_code);
      const costCenterCode = normalizeText(row.cost_center_code);
      const workGroupCode = normalizeText(row.work_group_code);
      const workLocationCode = normalizeText(row.work_location_code);
      const employeeProfileCode = normalizeText(row.employee_profile_code);

      if (!employeeCode || !companyCode) {
        throw new Error(`Fila ${rowNo}: employee_code y company_legacy_id son obligatorios`);
      }
      if (!payrollGroupCode || !departmentCode || !areaCode || !jobTitleCode || !costCenterCode || !workGroupCode || !workLocationCode || !employeeProfileCode) {
        throw new Error(`Fila ${rowNo}: faltan codigos obligatorios de catalogo`);
      }

      announceTable('countries', 'countries', index);
      const companyCountryId = await ensureCountryCached(
        row.company_country_id,
        row.company_country_label,
        row.company_country_short_label
      );
      announceTable('states', 'states', index);
      const companyStateId = await ensureStateCached(
        companyCountryId,
        row.company_state_id,
        row.company_state_label,
        row.company_state_short_label
      );
      announceTable('cities', 'cities', index);
      const companyCityId = await ensureCityCached(
        companyCountryId,
        companyStateId,
        row.company_city_id,
        row.company_city_label,
        row.company_city_short_label
      );

      announceTable('companies', 'companies', index);
      const companyUpsert = await upsertCatalogCached(companyCache, 'companies', 'legacy_id', companyCode, {
        legacy_id: companyCode,
        company_name: normalizeText(row.company_name) || companyCode,
        company_short_name: normalizeText(row.company_short_name) || companyCode,
        company_address: normalizeText(row.company_address),
        company_address_line1: normalizeText(row.company_address_line1),
        company_address_line2: normalizeText(row.company_address_line2),
        company_country_id: companyCountryId,
        company_state_id: companyStateId,
        company_city_id: companyCityId,
        company_postal_code: normalizeText(row.company_postal_code),
        company_phone: normalizeText(row.company_phone),
        is_active: normalizeBool(row.is_active, true),
      }, 'companies');

      announceTable('payroll_groups', 'payroll_groups', index);
      const payrollUpsert = await upsertCatalogCached(payrollCache, 'payroll_groups', 'legacy_id', payrollGroupCode, {
        legacy_id: payrollGroupCode,
        payroll_group_name: normalizeText(row.payroll_group_name) || payrollGroupCode,
        payroll_group_short_name: normalizeText(row.payroll_group_short_name) || payrollGroupCode,
        is_active: normalizeBool(row.is_active, true),
      }, 'payroll_groups');
      payrollRefByCode.set(payrollGroupCode, payrollUpsert.id);

      announceTable('employee_profiles', 'employee_profiles', index);
      await upsertCatalogCached(profileCache, 'employee_profiles', 'legacy_id', employeeProfileCode, {
        legacy_id: employeeProfileCode,
        profile_name: normalizeText(row.profile_name) || employeeProfileCode,
        profile_short_name: normalizeText(row.profile_short_name) || employeeProfileCode,
        is_active: normalizeBool(row.is_active, true),
      }, 'employee_profiles');

      announceTable('departments', 'departments', index);
      await upsertCatalogCached(departmentCache, 'departments', 'legacy_id', departmentCode, {
        legacy_id: departmentCode,
        department_name: normalizeText(row.department_name) || departmentCode,
        department_short_name: normalizeText(row.department_short_name) || departmentCode,
        is_active: normalizeBool(row.is_active, true),
      }, 'departments');

      const areaPayrollCode = normalizeText(row.area_payroll_group_code) || payrollGroupCode;
      const areaPayrollRefId = await resolvePayrollRefByCode(areaPayrollCode);
      announceTable('areas', 'areas', index);
      await upsertCatalogCached(areaCache, 'areas', 'legacy_id', areaCode, {
        legacy_id: areaCode,
        area_name: normalizeText(row.area_name) || areaCode,
        area_short_name: normalizeText(row.area_short_name) || areaCode,
        payroll_group_id: areaPayrollRefId,
        is_active: normalizeBool(row.is_active, true),
      }, 'areas');

      announceTable('job_titles', 'job_titles', index);
      await upsertCatalogCached(jobTitleCache, 'job_titles', 'legacy_id', jobTitleCode, {
        legacy_id: jobTitleCode,
        job_title_name: normalizeText(row.job_title_name) || jobTitleCode,
        job_title_short_name: normalizeText(row.job_title_short_name) || jobTitleCode,
        is_active: normalizeBool(row.is_active, true),
      }, 'job_titles');

      announceTable('cost_centers', 'cost_centers', index);
      await upsertCatalogCached(costCenterCache, 'cost_centers', 'legacy_id', costCenterCode, {
        legacy_id: costCenterCode,
        cost_center_name: normalizeText(row.cost_center_name) || costCenterCode,
        cost_center_short_name: normalizeText(row.cost_center_short_name) || costCenterCode,
        homologation_code: normalizeText(row.homologation_code),
        gl_account_code: normalizeText(row.gl_account_code),
        is_active: normalizeBool(row.is_active, true),
      }, 'cost_centers');

      const workGroupPayrollCode = normalizeText(row.work_group_payrol_group_code) || payrollGroupCode;
      const workGroupPayrollRefId = await resolvePayrollRefByCode(workGroupPayrollCode);
      announceTable('work_groups', 'work_groups', index);
      await upsertCatalogCached(workGroupCache, 'work_groups', 'legacy_id', workGroupCode, {
        legacy_id: workGroupCode,
        work_group_name: normalizeText(row.work_group_name) || workGroupCode,
        work_group_short_name: normalizeText(row.work_group_short_name) || workGroupCode,
        payroll_group_id: workGroupPayrollRefId,
        is_active: normalizeBool(row.is_active, true),
      }, 'work_groups');

      announceTable('countries', 'countries', index);
      const locationCountryId = await ensureCountryCached(
        row.work_location_country_id,
        row.work_location_country_label,
        row.work_location_country_short_label
      );
      announceTable('states', 'states', index);
      const locationStateId = await ensureStateCached(
        locationCountryId,
        row.work_location_state_id,
        row.work_location_state_label,
        row.work_location_state_short_label
      );
      announceTable('cities', 'cities', index);
      const locationCityId = await ensureCityCached(
        locationCountryId,
        locationStateId,
        row.work_location_city_id,
        row.work_location_city_label,
        row.work_location_city_short_label
      );

      announceTable('work_locations', 'work_locations', index);
      await upsertCatalogCached(workLocationCache, 'work_locations', 'legacy_id', workLocationCode, {
        legacy_id: workLocationCode,
        work_location_name: normalizeText(row.work_location_name) || workLocationCode,
        work_location_short_name: normalizeText(row.work_location_short_name) || workLocationCode,
        company_id: companyUpsert.id,
        country_id: locationCountryId,
        state_id: locationStateId,
        city_id: locationCityId,
        address_line1: normalizeText(row.company_address_line1),
        time_zone: normalizeText(row.work_location_time_zone) || 'America/Guayaquil',
        is_active: normalizeBool(row.is_active, true),
      }, 'work_locations');

      const stagedKey = `${employeeCode}::${companyCode}`;
      stagedMap.set(stagedKey, {
        employee_code: employeeCode,
        company_code: companyCode,
        device_user_code: normalizeText(row.device_user_code),
        payroll_employee_code: normalizeText(row.payroll_employee_code),
        accounting_account_code: normalizeText(row.accounting_account_code),
        salary_amount: normalizeNumber(row.salary_amount),
        work_on_holidays: normalizeBool(row.work_on_holidays, false),
        hire_date: normalizeDate(row.hire_date),
        termination_date: normalizeDate(row.termination_date),
        contract_type_key: normalizeText(row.contract_type_key),
        employee_profile_code: employeeProfileCode,
        work_group_code: workGroupCode,
        work_location_code: workLocationCode,
        department_code: departmentCode,
        area_code: areaCode,
        job_title_code: jobTitleCode,
        cost_center_code: costCenterCode,
        payroll_group_code: payrollGroupCode,
        is_active: normalizeBool(row.is_active, true),
      });

      if (index > 0 && index % 100 === 0) {
        const progress = Math.min(90, Math.round((index / rows.length) * 100));
        pushImportEvent(events, 'structure', 'info', `Procesadas ${index} filas de estructura`, progress);
      }
    }

    Object.entries(counters).forEach(([tableName, total]) => {
      pushImportEvent(
        events,
        'structure',
        'info',
        `Tabla ${tableName}: +${total.created} creados / ~${total.updated} actualizados`,
        96
      );
    });

    pushImportEvent(events, 'structure', 'success', 'Estructura organizacional importada correctamente', 100);

    return res.status(200).json({
      success: true,
      summary: counters,
      staged_assignments: Array.from(stagedMap.values()),
      rows_processed: rows.length,
      events,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error importando estructura' });
  }
});

router.post('/mass-import/employees', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const actor = getActor(req);
    const rows = Array.isArray(req.body?.rows) ? (req.body.rows as EmployeeImportRow[]) : [];
    const stagedAssignments = Array.isArray(req.body?.staged_assignments)
      ? (req.body.staged_assignments as StagedEmployeeCompanyAssignment[])
      : [];
    if (rows.length === 0) return res.status(400).json({ error: 'Debe enviar rows con contenido' });
    if (stagedAssignments.length === 0) return res.status(400).json({ error: 'Debe enviar staged_assignments del paso 1' });

    const events: ImportLogEvent[] = [];
    pushImportEvent(events, 'employees', 'info', `Inicio de importacion de empleados (${rows.length} filas)`, 5);
    const [
      lookupGroupsRes,
      lookupValuesRes,
      companies,
      payrollGroups,
      departments,
      areas,
      jobTitles,
      costCenters,
      workGroups,
      workLocations,
      employeeProfiles,
      roles,
      scopeTypes,
    ] = await Promise.all([
      Postgres.from('lookup_groups').select('id, lookup_group_key').in('lookup_group_key', ['GENDER', 'CONTRACT_TYPE']),
      Postgres.from('lookup_values').select('id, lookup_group_id, lookup_key').eq('is_active', true),
      Postgres.from('companies').select('id, legacy_id').eq('tenant_id', tenantId),
      Postgres.from('payroll_groups').select('id, legacy_id').eq('tenant_id', tenantId),
      Postgres.from('departments').select('id, legacy_id').eq('tenant_id', tenantId),
      Postgres.from('areas').select('id, legacy_id').eq('tenant_id', tenantId),
      Postgres.from('job_titles').select('id, legacy_id').eq('tenant_id', tenantId),
      Postgres.from('cost_centers').select('id, legacy_id').eq('tenant_id', tenantId),
      Postgres.from('work_groups').select('id, legacy_id').eq('tenant_id', tenantId),
      Postgres.from('work_locations').select('id, legacy_id').eq('tenant_id', tenantId),
      Postgres.from('employee_profiles').select('id, legacy_id').eq('tenant_id', tenantId),
      Postgres.from('roles').select('id, role_key').eq('tenant_id', tenantId).eq('is_active', true),
      Postgres.from('scope_types').select('id, scope_type_key').eq('is_active', true),
    ]);

    const errors = [
      lookupGroupsRes.error,
      lookupValuesRes.error,
      companies.error,
      payrollGroups.error,
      departments.error,
      areas.error,
      jobTitles.error,
      costCenters.error,
      workGroups.error,
      workLocations.error,
      employeeProfiles.error,
      roles.error,
      scopeTypes.error,
    ].filter(Boolean);
    if (errors.length > 0) {
      const firstError = errors.find((entry: any) => entry && typeof entry.message === 'string');
      return res.status(500).json({ error: firstError?.message || 'Error cargando catalogos base para importacion' });
    }

    const groupByKey = new Map((lookupGroupsRes.data || []).map((row: any) => [String(row.lookup_group_key || '').toUpperCase(), row.id]));
    const genderGroupId = groupByKey.get('GENDER') || null;
    const contractGroupId = groupByKey.get('CONTRACT_TYPE') || null;
    const lookupValues = lookupValuesRes.data || [];
    const genderByKey = new Map(
      lookupValues
        .filter((row: any) => genderGroupId && row.lookup_group_id === genderGroupId)
        .map((row: any) => [String(row.lookup_key || '').toUpperCase(), row.id])
    );
    const contractByKey = new Map(
      lookupValues
        .filter((row: any) => contractGroupId && row.lookup_group_id === contractGroupId)
        .map((row: any) => [String(row.lookup_key || '').toUpperCase(), row.id])
    );
    const companyByCode = new Map((companies.data || []).map((row: any) => [String(row.legacy_id || ''), row.id]));
    const payrollGroupByCode = new Map((payrollGroups.data || []).map((row: any) => [String(row.legacy_id || ''), row.id]));
    const departmentByCode = new Map((departments.data || []).map((row: any) => [String(row.legacy_id || ''), row.id]));
    const areaByCode = new Map((areas.data || []).map((row: any) => [String(row.legacy_id || ''), row.id]));
    const jobTitleByCode = new Map((jobTitles.data || []).map((row: any) => [String(row.legacy_id || ''), row.id]));
    const costCenterByCode = new Map((costCenters.data || []).map((row: any) => [String(row.legacy_id || ''), row.id]));
    const workGroupByCode = new Map((workGroups.data || []).map((row: any) => [String(row.legacy_id || ''), row.id]));
    const workLocationByCode = new Map((workLocations.data || []).map((row: any) => [String(row.legacy_id || ''), row.id]));
    const employeeProfileByCode = new Map((employeeProfiles.data || []).map((row: any) => [String(row.legacy_id || ''), row.id]));
    const roleByKey = new Map((roles.data || []).map((row: any) => [String(row.role_key || '').toUpperCase(), row.id]));
    const scopeTypeByKey = new Map((scopeTypes.data || []).map((row: any) => [String(row.scope_type_key || '').toUpperCase(), row.id]));

    const assignmentByEmployeeCode = new Map<string, StagedEmployeeCompanyAssignment[]>();
    stagedAssignments.forEach((assignment) => {
      const code = normalizeText(assignment.employee_code);
      if (!code) return;
      const list = assignmentByEmployeeCode.get(code) || [];
      list.push(assignment);
      assignmentByEmployeeCode.set(code, list);
    });

    const counters = {
      employees_created: 0,
      employees_updated: 0,
      users_created: 0,
      users_updated: 0,
      user_roles_created: 0,
      user_roles_updated: 0,
      user_role_scopes_created: 0,
      user_role_scopes_updated: 0,
      employee_companies_created: 0,
      employee_companies_updated: 0,
    };

    const defaultPassword = 'titanium2026';
    const seenSanitizedUsernames = new Set<string>();
    const seenSanitizedEmails = new Set<string>();
    let sanitizedUsernameCount = 0;
    let sanitizedEmailCount = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNo = index + 2;
      const employeeCode = normalizeText(row.employee_code);
      if (!employeeCode) throw new Error(`Fila ${rowNo}: employee_code es obligatorio`);
      const employeeLastname = normalizeText(row.employee_lastname);
      const employeeName = normalizeText(row.employee_name);
      if (!employeeLastname || !employeeName) throw new Error(`Fila ${rowNo}: employee_lastname y employee_name son obligatorios`);

      const employeeAssignments = assignmentByEmployeeCode.get(employeeCode) || [];
      if (employeeAssignments.length === 0) {
        throw new Error(`Fila ${rowNo}: no existen asignaciones staged del paso 1 para employee_code ${employeeCode}`);
      }

      const genderKey = normalizeText(row.employee_gender_id)?.toUpperCase() || '';
      const genderId = genderKey ? (genderByKey.get(genderKey) || null) : null;

      const existingEmployee = await findByTenantAndCode(Postgres, 'employees', tenantId, 'employee_code', employeeCode);
      let employeeId = existingEmployee?.id as string | undefined;

      const employeePayload = {
        employee_code: employeeCode,
        employee_lastname: employeeLastname,
        employee_name: employeeName,
        employee_birthday: normalizeDate(row.employee_birthday),
        employee_gender_id: genderId,
        employee_is_model: normalizeBool(row.employee_is_model, false),
        employee_observations: normalizeText(row.employee_observations),
        employee_photo_path: normalizeText(row.employee_photo_path),
        is_active: normalizeBool(row.is_active, true),
      };

      if (employeeId) {
        const { error } = await Postgres
          .from('employees')
          .update({
            ...employeePayload,
            updated_by: actor,
            updated_at: new Date().toISOString(),
          })
          .eq('id', employeeId);
        if (error) throw new Error(error.message || `Error actualizando empleado ${employeeCode}`);
        counters.employees_updated += 1;
      } else {
        const { data, error } = await Postgres
          .from('employees')
          .insert({
            ...employeePayload,
            tenant_id: tenantId,
            created_by: actor,
          })
          .select('id')
          .single();
        if (error || !data?.id) throw new Error(error?.message || `Error creando empleado ${employeeCode}`);
        employeeId = data.id;
        counters.employees_created += 1;
      }

      const rawUsername = normalizeText(row.username);
      const rawEmail = normalizeText(row.email);
      const username = sanitizeUsername(rawUsername);
      const email = sanitizeEmail(rawEmail);
      if (!username || !email) throw new Error(`Fila ${rowNo}: username y email son obligatorios`);
      if (rawUsername && username !== rawUsername.toLowerCase()) sanitizedUsernameCount += 1;
      if (rawEmail && email !== rawEmail.toLowerCase()) sanitizedEmailCount += 1;
      if (seenSanitizedUsernames.has(username)) {
        throw new Error(`Fila ${rowNo}: username duplicado despues de saneamiento (${username})`);
      }
      if (seenSanitizedEmails.has(email)) {
        throw new Error(`Fila ${rowNo}: email duplicado despues de saneamiento (${email})`);
      }
      seenSanitizedUsernames.add(username);
      seenSanitizedEmails.add(email);

      const { data: existingByUsername, error: userByUsernameError } = await Postgres
        .from('users')
        .select('id, auth_user_id')
        .eq('tenant_id', tenantId)
        .eq('username', username)
        .maybeSingle();
      if (userByUsernameError) throw new Error(userByUsernameError.message || `Error consultando user ${username}`);

      let userRecord = existingByUsername;
      if (!userRecord?.id) {
        const { data: existingByEmail, error: userByEmailError } = await Postgres
          .from('users')
          .select('id, auth_user_id')
          .eq('tenant_id', tenantId)
          .eq('email', email)
          .maybeSingle();
        if (userByEmailError) throw new Error(userByEmailError.message || `Error consultando email ${email}`);
        userRecord = existingByEmail;
      }

      const rawPassword = normalizeText(row.password);
      const selectedPassword = rawPassword && rawPassword.length >= 8 ? rawPassword : defaultPassword;
      const encryptedPassword = sha256Hex(selectedPassword);
      let userId = userRecord?.id as string | undefined;
      let authUserId = userRecord?.auth_user_id as string | undefined;

      if (!userId) {
        const { data: authData, error: authError } = await Postgres.auth.admin.createUser({
          email,
          password: selectedPassword,
          email_confirm: true,
          user_metadata: {
            username,
            display_name: normalizeText(row.display_name) || `${employeeName} ${employeeLastname}`,
            tenant_id: tenantId,
          },
        });
        if (authError || !authData?.user?.id) {
          throw new Error(authError?.message || `No se pudo crear usuario auth para ${username}`);
        }

        authUserId = authData.user.id;
        const { data: insertedUser, error: insertUserError } = await Postgres
          .from('users')
          .insert({
            tenant_id: tenantId,
            auth_user_id: authUserId,
            username,
            display_name: normalizeText(row.display_name) || `${employeeName} ${employeeLastname}`,
            email,
            phone: normalizeText(row.phone),
            preferred_language_code: normalizeText(row.preferred_language_code),
            password: encryptedPassword,
            is_active: normalizeBool(row.is_active, true),
            created_by: actor,
          })
          .select('id')
          .single();
        if (insertUserError || !insertedUser?.id) {
          throw new Error(insertUserError?.message || `No se pudo crear users para ${username}`);
        }
        userId = insertedUser.id;
        counters.users_created += 1;
      } else {
        const { error: updateUserError } = await Postgres
          .from('users')
          .update({
            username,
            display_name: normalizeText(row.display_name) || `${employeeName} ${employeeLastname}`,
            email,
            phone: normalizeText(row.phone),
            preferred_language_code: normalizeText(row.preferred_language_code),
            password: encryptedPassword,
            is_active: normalizeBool(row.is_active, true),
            updated_by: actor,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        if (updateUserError) throw new Error(updateUserError.message || `No se pudo actualizar users para ${username}`);
        counters.users_updated += 1;

        if (authUserId) {
          const authUpdatePayload: any = {
            email,
            password: selectedPassword,
            user_metadata: {
              username,
              display_name: normalizeText(row.display_name) || `${employeeName} ${employeeLastname}`,
              tenant_id: tenantId,
            },
            ban_duration: normalizeBool(row.is_active, true) ? 'none' : '876000h',
          };
          const { error: authUpdateError } = await Postgres.auth.admin.updateUserById(authUserId, authUpdatePayload);
          if (authUpdateError) throw new Error(authUpdateError.message || `No se pudo actualizar auth para ${username}`);
        }
      }

      if (!employeeId || !userId) throw new Error(`Fila ${rowNo}: no se pudo resolver employee_id o user_id`);

      const { error: linkEmployeeError } = await Postgres
        .from('employees')
        .update({
          user_id: userId,
          updated_by: actor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employeeId);
      if (linkEmployeeError) throw new Error(linkEmployeeError.message || `No se pudo vincular user al empleado ${employeeCode}`);

      const roleKey = (normalizeText(row.user_role_key) || 'EMPLOYEE').toUpperCase();
      const roleId = roleByKey.get(roleKey);
      if (!roleId) throw new Error(`Fila ${rowNo}: role_key ${roleKey} no existe en roles`);

      const { data: existingUserRole, error: existingUserRoleError } = await Postgres
        .from('user_roles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .maybeSingle();
      if (existingUserRoleError) throw new Error(existingUserRoleError.message || `Error consultando user_roles ${employeeCode}`);

      let userRoleId = existingUserRole?.id as string | undefined;
      const validFrom = normalizeTimestamp(row.valid_from);
      const validTo = normalizeTimestamp(row.valid_to);
      if (userRoleId) {
        const { error } = await Postgres
          .from('user_roles')
          .update({
            is_active: normalizeBool(row.is_active, true),
            valid_from: validFrom,
            valid_to: validTo,
            updated_by: actor,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userRoleId);
        if (error) throw new Error(error.message || `Error actualizando user_roles ${employeeCode}`);
        counters.user_roles_updated += 1;
      } else {
        const { data, error } = await Postgres
          .from('user_roles')
          .insert({
            tenant_id: tenantId,
            user_id: userId,
            role_id: roleId,
            company_id: null,
            is_active: normalizeBool(row.is_active, true),
            valid_from: validFrom,
            valid_to: validTo,
            created_by: actor,
          })
          .select('id')
          .single();
        if (error || !data?.id) throw new Error(error?.message || `Error creando user_roles ${employeeCode}`);
        userRoleId = data.id;
        counters.user_roles_created += 1;
      }

      const scopeKey = (normalizeText(row.scope_type_key) || 'EMPLOYEE').toUpperCase();
      const scopeTypeId = scopeTypeByKey.get(scopeKey);
      if (!scopeTypeId) throw new Error(`Fila ${rowNo}: scope_type_key ${scopeKey} no existe`);

      const { data: existingScope, error: existingScopeError } = await Postgres
        .from('user_role_scopes')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('user_role_id', userRoleId)
        .eq('scope_type_id', scopeTypeId)
        .eq('scope_entity_id', employeeId)
        .maybeSingle();
      if (existingScopeError) throw new Error(existingScopeError.message || `Error consultando user_role_scopes ${employeeCode}`);

      if (existingScope?.id) {
        const { error } = await Postgres
          .from('user_role_scopes')
          .update({
            is_active: normalizeBool(row.is_active, true),
            updated_by: actor,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingScope.id);
        if (error) throw new Error(error.message || `Error actualizando user_role_scopes ${employeeCode}`);
        counters.user_role_scopes_updated += 1;
      } else {
        const { error } = await Postgres
          .from('user_role_scopes')
          .insert({
            tenant_id: tenantId,
            user_role_id: userRoleId,
            scope_type_id: scopeTypeId,
            scope_entity_id: employeeId,
            is_active: normalizeBool(row.is_active, true),
            created_by: actor,
          });
        if (error) throw new Error(error.message || `Error creando user_role_scopes ${employeeCode}`);
        counters.user_role_scopes_created += 1;
      }

      for (const assignment of employeeAssignments) {
        const companyId = companyByCode.get(String(assignment.company_code || ''));
        if (!companyId) throw new Error(`Fila ${rowNo}: company_legacy_id ${assignment.company_code} no existe`);

        const payload = {
          device_user_code: assignment.device_user_code || null,
          payroll_employee_code: assignment.payroll_employee_code || null,
          employee_profile_id: assignment.employee_profile_code ? employeeProfileByCode.get(assignment.employee_profile_code) || null : null,
          work_group_id: assignment.work_group_code ? workGroupByCode.get(assignment.work_group_code) || null : null,
          work_location_id: assignment.work_location_code ? workLocationByCode.get(assignment.work_location_code) || null : null,
          department_id: assignment.department_code ? departmentByCode.get(assignment.department_code) || null : null,
          area_id: assignment.area_code ? areaByCode.get(assignment.area_code) || null : null,
          job_title_id: assignment.job_title_code ? jobTitleByCode.get(assignment.job_title_code) || null : null,
          cost_center_id: assignment.cost_center_code ? costCenterByCode.get(assignment.cost_center_code) || null : null,
          payroll_group_id: assignment.payroll_group_code ? payrollGroupByCode.get(assignment.payroll_group_code) || null : null,
          accounting_account_code: assignment.accounting_account_code || null,
          salary_amount: assignment.salary_amount ?? null,
          hire_date: assignment.hire_date || null,
          termination_date: assignment.termination_date || null,
          contract_type_id: assignment.contract_type_key ? contractByKey.get(String(assignment.contract_type_key).toUpperCase()) || null : null,
          work_on_holidays: assignment.work_on_holidays === true,
          is_active: assignment.is_active !== false,
        };

        const { data: existingAssignment, error: existingAssignmentError } = await Postgres
          .from('employee_companies')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('employee_id', employeeId)
          .eq('company_id', companyId)
          .maybeSingle();
        if (existingAssignmentError) throw new Error(existingAssignmentError.message || `Error consultando employee_companies ${employeeCode}`);

        if (existingAssignment?.id) {
          const { error } = await Postgres
            .from('employee_companies')
            .update({
              ...payload,
              updated_by: actor,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingAssignment.id);
          if (error) throw new Error(error.message || `Error actualizando employee_companies ${employeeCode}`);
          counters.employee_companies_updated += 1;
        } else {
          const { error } = await Postgres
            .from('employee_companies')
            .insert({
              ...payload,
              tenant_id: tenantId,
              company_id: companyId,
              employee_id: employeeId,
              created_by: actor,
            });
          if (error) throw new Error(error.message || `Error creando employee_companies ${employeeCode}`);
          counters.employee_companies_created += 1;
        }
      }

      if (index > 0 && index % 100 === 0) {
        const progress = Math.min(92, Math.round((index / rows.length) * 100));
        pushImportEvent(events, 'employees', 'info', `Procesados ${index} empleados`, progress);
      }
    }

    if (sanitizedUsernameCount > 0 || sanitizedEmailCount > 0) {
      pushImportEvent(
        events,
        'employees',
        'warn',
        `Saneamiento aplicado: usernames ${sanitizedUsernameCount}, emails ${sanitizedEmailCount}`,
        97
      );
    }
    pushImportEvent(events, 'employees', 'success', 'Importacion de empleados y seguridad completada', 100);

    return res.status(200).json({
      success: true,
      summary: counters,
      rows_processed: rows.length,
      events,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error importando empleados' });
  }
});

router.get('/mass-import/capabilities', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const authCtx = await resolveActionAuthContext(req);
    if (!authCtx || authCtx.tenantId !== tenantId) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const canImport = await hasAnyScreenActionPermission(
      tenantId,
      authCtx.userId,
      'ORG_STRUCTURE',
      ['IMPORT', 'CREATE', 'EDIT']
    );
    const canAbort = await hasAnyScreenActionPermission(
      tenantId,
      authCtx.userId,
      'ORG_STRUCTURE',
      ['ABORT_IMPORT', 'IMPORT']
    );
    const canReverse = await hasAnyScreenActionPermission(
      tenantId,
      authCtx.userId,
      'ORG_STRUCTURE',
      ['REVERSE_IMPORT', 'DELETE', 'IMPORT']
    );

    return res.status(200).json({
      success: true,
      capabilities: {
        can_import: canImport,
        can_abort: canAbort,
        can_reverse: canReverse,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error consultando capacidades de importacion' });
  }
});

router.post('/mass-import/reverse', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const authCtx = await resolveActionAuthContext(req);
    if (!authCtx || authCtx.tenantId !== tenantId) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const canReverse = await hasAnyScreenActionPermission(
      tenantId,
      authCtx.userId,
      'ORG_STRUCTURE',
      ['REVERSE_IMPORT', 'DELETE', 'IMPORT']
    );
    if (!canReverse) {
      return res.status(403).json({
        error: 'No tiene permisos para revertir importaciones. Requiere accion REVERSE_IMPORT/DELETE/IMPORT en ORG_STRUCTURE',
      });
    }

    const actor = getActor(req);
    const structureRows = Array.isArray(req.body?.structure_rows)
      ? (req.body.structure_rows as StructureImportRow[])
      : [];
    const employeeRows = Array.isArray(req.body?.employee_rows)
      ? (req.body.employee_rows as EmployeeImportRow[])
      : [];

    if (structureRows.length === 0 && employeeRows.length === 0) {
      return res.status(400).json({ error: 'Debe enviar structure_rows o employee_rows para revertir' });
    }

    const events: ImportLogEvent[] = [];
    const rawStartAt = normalizeText(req.body?.import_started_at);
    const fallbackStartAt = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
    const startAt = rawStartAt && !Number.isNaN(new Date(rawStartAt).getTime()) ? rawStartAt : fallbackStartAt;

    pushImportEvent(
      events,
      'reverse',
      'info',
      `Inicio de reversa de importacion (desde ${startAt})`,
      3,
      { key: 'reverse_init', label: 'Preparacion', progress: 5 }
    );

    const employeeCodeSet = new Set<string>();
    const companyCodeSet = new Set<string>();
    const usernameSet = new Set<string>();
    const emailSet = new Set<string>();

    const payrollGroupCodeSet = new Set<string>();
    const profileCodeSet = new Set<string>();
    const departmentCodeSet = new Set<string>();
    const areaCodeSet = new Set<string>();
    const jobTitleCodeSet = new Set<string>();
    const costCenterCodeSet = new Set<string>();
    const workGroupCodeSet = new Set<string>();
    const workLocationCodeSet = new Set<string>();

    const countryKeySet = new Set<string>();
    const stateKeySet = new Set<string>();
    const cityKeySet = new Set<string>();

    for (const row of structureRows) {
      const employeeCode = normalizeText(row.employee_code);
      const companyCode = normalizeText(row.company_code);
      const payrollGroupCode = normalizeText(row.payroll_group_code);
      const profileCode = normalizeText(row.employee_profile_code);
      const departmentCode = normalizeText(row.department_code);
      const areaCode = normalizeText(row.area_code);
      const jobTitleCode = normalizeText(row.job_title_code);
      const costCenterCode = normalizeText(row.cost_center_code);
      const workGroupCode = normalizeText(row.work_group_code);
      const workLocationCode = normalizeText(row.work_location_code);

      const companyCountryKey = normalizeText(row.company_country_id);
      const companyStateKey = normalizeText(row.company_state_id);
      const companyCityKey = normalizeText(row.company_city_id);
      const locationCountryKey = normalizeText(row.work_location_country_id);
      const locationStateKey = normalizeText(row.work_location_state_id);
      const locationCityKey = normalizeText(row.work_location_city_id);

      if (employeeCode) employeeCodeSet.add(employeeCode);
      if (companyCode) companyCodeSet.add(companyCode);
      if (payrollGroupCode) payrollGroupCodeSet.add(payrollGroupCode);
      if (profileCode) profileCodeSet.add(profileCode);
      if (departmentCode) departmentCodeSet.add(departmentCode);
      if (areaCode) areaCodeSet.add(areaCode);
      if (jobTitleCode) jobTitleCodeSet.add(jobTitleCode);
      if (costCenterCode) costCenterCodeSet.add(costCenterCode);
      if (workGroupCode) workGroupCodeSet.add(workGroupCode);
      if (workLocationCode) workLocationCodeSet.add(workLocationCode);

      if (companyCountryKey) countryKeySet.add(companyCountryKey);
      if (companyStateKey) stateKeySet.add(companyStateKey);
      if (companyCityKey) cityKeySet.add(companyCityKey);
      if (locationCountryKey) countryKeySet.add(locationCountryKey);
      if (locationStateKey) stateKeySet.add(locationStateKey);
      if (locationCityKey) cityKeySet.add(locationCityKey);
    }

    for (const row of employeeRows) {
      const employeeCode = normalizeText(row.employee_code);
      const username = sanitizeUsername(row.username);
      const email = sanitizeEmail(row.email);
      if (employeeCode) employeeCodeSet.add(employeeCode);
      if (username) usernameSet.add(username);
      if (email) emailSet.add(email);
    }

    const employeeCodes = Array.from(employeeCodeSet);
    const companyCodes = Array.from(companyCodeSet);
    const usernames = Array.from(usernameSet);
    const emails = Array.from(emailSet);

    pushImportEvent(events, 'reverse', 'info', 'Resolviendo IDs a revertir...', 8, {
      key: 'reverse_resolve',
      label: 'Resolver IDs',
      progress: 20,
    });

    const [employeeRes, companyRes] = await Promise.all([
      employeeCodes.length > 0
        ? Postgres.from('employees').select('id, employee_code, user_id, created_at').eq('tenant_id', tenantId).in('employee_code', employeeCodes)
        : Promise.resolve({ data: [], error: null } as any),
      companyCodes.length > 0
        ? Postgres.from('companies').select('id, legacy_id, created_at').eq('tenant_id', tenantId).in('legacy_id', companyCodes)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (employeeRes.error) throw new Error(employeeRes.error.message || 'Error consultando employees para reversa');
    if (companyRes.error) throw new Error(companyRes.error.message || 'Error consultando companies para reversa');

    const employees = (employeeRes.data || []) as Array<{ id: string; employee_code: string; user_id: string | null; created_at: string | null }>;
    const companies = (companyRes.data || []) as Array<{ id: string; legacy_id: string; created_at: string | null }>;

    const employeeIds = employees.map((row) => row.id);
    const companyIds = companies.map((row) => row.id);
    const userIdsFromEmployees = employees.map((row) => row.user_id).filter(Boolean) as string[];

    const usersByCredentials: Array<{
      id: string;
      auth_user_id: string | null;
      username: string | null;
      email: string | null;
      created_at: string | null;
    }> = [];

    if (usernames.length > 0) {
      const usersByUsernameRes = await Postgres
        .from('users')
        .select('id, auth_user_id, username, email, created_at')
        .eq('tenant_id', tenantId)
        .in('username', usernames);
      if (usersByUsernameRes.error) {
        throw new Error(usersByUsernameRes.error.message || 'Error consultando users por username para reversa');
      }
      usersByCredentials.push(...((usersByUsernameRes.data || []) as any[]));
    }

    if (emails.length > 0) {
      const usersByEmailRes = await Postgres
        .from('users')
        .select('id, auth_user_id, username, email, created_at')
        .eq('tenant_id', tenantId)
        .in('email', emails);
      if (usersByEmailRes.error) {
        throw new Error(usersByEmailRes.error.message || 'Error consultando users por email para reversa');
      }
      usersByCredentials.push(...((usersByEmailRes.data || []) as any[]));
    }
    const userIdSet = new Set<string>(userIdsFromEmployees);
    usersByCredentials.forEach((row) => userIdSet.add(row.id));
    const userIds = Array.from(userIdSet);

    const summary: Record<string, number> = {
      employee_companies_deleted: 0,
      user_role_scopes_deleted: 0,
      user_roles_deleted: 0,
      users_deleted: 0,
      auth_users_deleted: 0,
      employees_deleted: 0,
      work_locations_deleted: 0,
      work_groups_deleted: 0,
      cost_centers_deleted: 0,
      job_titles_deleted: 0,
      areas_deleted: 0,
      departments_deleted: 0,
      employee_profiles_deleted: 0,
      payroll_groups_deleted: 0,
      companies_deleted: 0,
      cities_deleted: 0,
      states_deleted: 0,
      countries_deleted: 0,
    };

    const tryDeleteWithCount = async (label: string, run: () => Promise<number>, progress: number, activityKey: string) => {
      pushImportEvent(events, 'reverse', 'info', `Revirtiendo ${label}...`, progress, {
        key: activityKey,
        label,
        progress: 20,
      });
      try {
        const count = await run();
        pushImportEvent(events, 'reverse', 'success', `${label}: ${count} eliminados`, Math.min(progress + 4, 95), {
          key: activityKey,
          label,
          progress: 100,
        });
        return count;
      } catch (error: any) {
        pushImportEvent(events, 'reverse', 'warn', `${label}: no se pudo eliminar (${error?.message || 'sin detalle'})`, Math.min(progress + 4, 95), {
          key: activityKey,
          label,
          progress: 100,
        });
        return 0;
      }
    };

    if (employeeIds.length > 0) {
      summary.employee_companies_deleted = await tryDeleteWithCount(
        'employee_companies',
        async () => {
          let query = Postgres.from('employee_companies').delete().eq('tenant_id', tenantId).in('employee_id', employeeIds).gte('created_at', startAt);
          if (companyIds.length > 0) query = query.in('company_id', companyIds);
          const { data, error } = await query.select('id');
          if (error) throw new Error(error.message);
          return (data || []).length;
        },
        18,
        'reverse_employee_companies'
      );
    }

    if (userIds.length > 0) {
      const userRoleRes = await Postgres
        .from('user_roles')
        .select('id')
        .eq('tenant_id', tenantId)
        .in('user_id', userIds)
        .gte('created_at', startAt);
      if (userRoleRes.error) throw new Error(userRoleRes.error.message || 'Error consultando user_roles para reversa');
      const userRoleIds = (userRoleRes.data || []).map((row: any) => row.id);

      if (userRoleIds.length > 0 && employeeIds.length > 0) {
        summary.user_role_scopes_deleted = await tryDeleteWithCount(
          'user_role_scopes',
          async () => {
            const { data, error } = await Postgres
              .from('user_role_scopes')
              .delete()
              .eq('tenant_id', tenantId)
              .in('user_role_id', userRoleIds)
              .in('scope_entity_id', employeeIds)
              .gte('created_at', startAt)
              .select('id');
            if (error) throw new Error(error.message);
            return (data || []).length;
          },
          25,
          'reverse_user_role_scopes'
        );
      }

      if (userRoleIds.length > 0) {
        summary.user_roles_deleted = await tryDeleteWithCount(
          'user_roles',
          async () => {
            const { data, error } = await Postgres
              .from('user_roles')
              .delete()
              .eq('tenant_id', tenantId)
              .in('id', userRoleIds)
              .select('id');
            if (error) throw new Error(error.message);
            return (data || []).length;
          },
          33,
          'reverse_user_roles'
        );
      }
    }

    if (employeeIds.length > 0) {
      summary.employees_deleted = await tryDeleteWithCount(
        'employees',
        async () => {
          const { data, error } = await Postgres
            .from('employees')
            .delete()
            .eq('tenant_id', tenantId)
            .in('id', employeeIds)
            .gte('created_at', startAt)
            .select('id');
          if (error) throw new Error(error.message);
          return (data || []).length;
        },
        42,
        'reverse_employees'
      );
    }

    if (userIds.length > 0) {
      const usersToDeleteRes = await Postgres
        .from('users')
        .select('id, auth_user_id')
        .eq('tenant_id', tenantId)
        .in('id', userIds)
        .gte('created_at', startAt);
      if (usersToDeleteRes.error) throw new Error(usersToDeleteRes.error.message || 'Error consultando users para borrado');
      const usersToDelete = usersToDeleteRes.data || [];

      summary.users_deleted = await tryDeleteWithCount(
        'users',
        async () => {
          if (usersToDelete.length === 0) return 0;
          const ids = usersToDelete.map((row: any) => row.id);
          const { data, error } = await Postgres.from('users').delete().eq('tenant_id', tenantId).in('id', ids).select('id');
          if (error) throw new Error(error.message);
          return (data || []).length;
        },
        50,
        'reverse_users'
      );

      if (usersToDelete.length > 0) {
        pushImportEvent(events, 'reverse', 'info', 'Revirtiendo usuarios de autenticacion...', 56, {
          key: 'reverse_auth_users',
          label: 'auth.users',
          progress: 30,
        });
        let authDeleted = 0;
        for (const user of usersToDelete) {
          const authUserId = user.auth_user_id;
          if (!authUserId) continue;
          const { error } = await Postgres.auth.admin.deleteUser(authUserId);
          if (!error) authDeleted += 1;
        }
        summary.auth_users_deleted = authDeleted;
        pushImportEvent(events, 'reverse', 'success', `auth.users: ${authDeleted} eliminados`, 60, {
          key: 'reverse_auth_users',
          label: 'auth.users',
          progress: 100,
        });
      }
    }

    const deleteCatalogByCodeRecent = async (
      table: string,
      codeColumn: string,
      codes: string[],
      summaryKey: keyof typeof summary,
      progress: number
    ) => {
      if (codes.length === 0) return;
      summary[summaryKey] = await tryDeleteWithCount(
        table,
        async () => {
          const { data, error } = await Postgres
            .from(table)
            .delete()
            .eq('tenant_id', tenantId)
            .in(codeColumn, codes)
            .gte('created_at', startAt)
            .select('id');
          if (error) throw new Error(error.message);
          return (data || []).length;
        },
        progress,
        `reverse_${table}`
      );
    };

    await deleteCatalogByCodeRecent('work_locations', 'legacy_id', Array.from(workLocationCodeSet), 'work_locations_deleted', 64);
    await deleteCatalogByCodeRecent('work_groups', 'legacy_id', Array.from(workGroupCodeSet), 'work_groups_deleted', 68);
    await deleteCatalogByCodeRecent('cost_centers', 'legacy_id', Array.from(costCenterCodeSet), 'cost_centers_deleted', 72);
    await deleteCatalogByCodeRecent('job_titles', 'legacy_id', Array.from(jobTitleCodeSet), 'job_titles_deleted', 76);
    await deleteCatalogByCodeRecent('areas', 'legacy_id', Array.from(areaCodeSet), 'areas_deleted', 80);
    await deleteCatalogByCodeRecent('departments', 'legacy_id', Array.from(departmentCodeSet), 'departments_deleted', 84);
    await deleteCatalogByCodeRecent('employee_profiles', 'legacy_id', Array.from(profileCodeSet), 'employee_profiles_deleted', 87);
    await deleteCatalogByCodeRecent('payroll_groups', 'legacy_id', Array.from(payrollGroupCodeSet), 'payroll_groups_deleted', 90);
    await deleteCatalogByCodeRecent('companies', 'legacy_id', companyCodes, 'companies_deleted', 93);

    const countryKeys = Array.from(countryKeySet);
    const stateKeys = Array.from(stateKeySet);
    const cityKeys = Array.from(cityKeySet);
    if (cityKeys.length > 0) {
      summary.cities_deleted = await tryDeleteWithCount(
        'cities',
        async () => {
          const { data, error } = await Postgres
            .from('cities')
            .delete()
            .eq('tenant_id', tenantId)
            .in('city_key', cityKeys)
            .gte('created_at', startAt)
            .select('id');
          if (error) throw new Error(error.message);
          return (data || []).length;
        },
        94,
        'reverse_cities'
      );
    }
    if (stateKeys.length > 0) {
      summary.states_deleted = await tryDeleteWithCount(
        'states',
        async () => {
          const { data, error } = await Postgres
            .from('states')
            .delete()
            .eq('tenant_id', tenantId)
            .in('state_key', stateKeys)
            .gte('created_at', startAt)
            .select('id');
          if (error) throw new Error(error.message);
          return (data || []).length;
        },
        95,
        'reverse_states'
      );
    }
    if (countryKeys.length > 0) {
      summary.countries_deleted = await tryDeleteWithCount(
        'countries',
        async () => {
          const { data, error } = await Postgres
            .from('countries')
            .delete()
            .eq('tenant_id', tenantId)
            .in('country_key', countryKeys)
            .gte('created_at', startAt)
            .select('id');
          if (error) throw new Error(error.message);
          return (data || []).length;
        },
        96,
        'reverse_countries'
      );
    }

    pushImportEvent(events, 'reverse', 'warn', 'Nota: la reversa elimina registros creados recientemente; no restaura valores previos en registros actualizados.', 98, {
      key: 'reverse_note',
      label: 'Nota',
      progress: 100,
    });
    pushImportEvent(events, 'reverse', 'success', `Reversa completada por ${actor}`, 100, {
      key: 'reverse_done',
      label: 'Completado',
      progress: 100,
    });

    return res.status(200).json({
      success: true,
      summary,
      events,
      started_at: startAt,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error revirtiendo importacion' });
  }
});

router.get('/migration-export', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const actor = getActor(req);
    const exportedAt = new Date().toISOString();

    const [
      tenantRes,
      companiesRes,
      workLocationsRes,
      departmentsRes,
      areasRes,
      jobTitlesRes,
      costCentersRes,
      payrollGroupsRes,
      workGroupsRes,
      employeeProfilesRes,
      employeesRes,
      employeeCompaniesRes,
      usersRes,
      userRolesRes,
      userRoleScopesRes,
      rolesRes,
      scopeTypesRes,
      countriesRes,
      statesRes,
      citiesRes,
      lookupGroupsRes,
      lookupValuesRes,
    ] = await Promise.all([
      Postgres.from('tenants').select('id, tenant_key, tenant_name').eq('id', tenantId).maybeSingle(),
      Postgres.from('companies').select('*').eq('tenant_id', tenantId).order('company_name', { ascending: true }),
      Postgres.from('work_locations').select('*').eq('tenant_id', tenantId).order('work_location_name', { ascending: true }),
      Postgres.from('departments').select('*').eq('tenant_id', tenantId).order('department_name', { ascending: true }),
      Postgres.from('areas').select('*').eq('tenant_id', tenantId).order('area_name', { ascending: true }),
      Postgres.from('job_titles').select('*').eq('tenant_id', tenantId).order('job_title_name', { ascending: true }),
      Postgres.from('cost_centers').select('*').eq('tenant_id', tenantId).order('cost_center_name', { ascending: true }),
      Postgres.from('payroll_groups').select('*').eq('tenant_id', tenantId).order('payroll_group_name', { ascending: true }),
      Postgres.from('work_groups').select('*').eq('tenant_id', tenantId).order('work_group_name', { ascending: true }),
      Postgres.from('employee_profiles').select('*').eq('tenant_id', tenantId).order('profile_name', { ascending: true }),
      Postgres.from('employees').select('*').eq('tenant_id', tenantId).order('employee_lastname', { ascending: true }),
      Postgres.from('employee_companies').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: true }),
      Postgres.from('users').select('*').eq('tenant_id', tenantId).order('username', { ascending: true }),
      Postgres.from('user_roles').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: true }),
      Postgres.from('user_role_scopes').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: true }),
      Postgres.from('roles').select('*').eq('tenant_id', tenantId).order('role_key', { ascending: true }),
      Postgres.from('scope_types').select('*').order('scope_type_key', { ascending: true }),
      Postgres.from('countries').select('*').eq('is_active', true).order('country_key', { ascending: true }),
      Postgres.from('states').select('*').eq('is_active', true).order('state_key', { ascending: true }),
      Postgres.from('cities').select('*').eq('is_active', true).order('city_key', { ascending: true }),
      Postgres.from('lookup_groups').select('*').order('lookup_group_key', { ascending: true }),
      Postgres.from('lookup_values').select('*').order('lookup_key', { ascending: true }),
    ]);

    const errors = [
      tenantRes.error,
      companiesRes.error,
      workLocationsRes.error,
      departmentsRes.error,
      areasRes.error,
      jobTitlesRes.error,
      costCentersRes.error,
      payrollGroupsRes.error,
      workGroupsRes.error,
      employeeProfilesRes.error,
      employeesRes.error,
      employeeCompaniesRes.error,
      usersRes.error,
      userRolesRes.error,
      userRoleScopesRes.error,
      rolesRes.error,
      scopeTypesRes.error,
      countriesRes.error,
      statesRes.error,
      citiesRes.error,
      lookupGroupsRes.error,
      lookupValuesRes.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      const firstError = errors.find((entry: any) => entry && typeof entry.message === 'string');
      return res.status(500).json({ error: firstError?.message || 'Error consultando datos para exportaciÃƒÂ³n' });
    }

    type ExportRow = Record<string, any>;

    const companies: ExportRow[] = (companiesRes.data || []) as ExportRow[];
    const workLocations: ExportRow[] = (workLocationsRes.data || []) as ExportRow[];
    const departments: ExportRow[] = (departmentsRes.data || []) as ExportRow[];
    const areas: ExportRow[] = (areasRes.data || []) as ExportRow[];
    const jobTitles: ExportRow[] = (jobTitlesRes.data || []) as ExportRow[];
    const costCenters: ExportRow[] = (costCentersRes.data || []) as ExportRow[];
    const payrollGroups: ExportRow[] = (payrollGroupsRes.data || []) as ExportRow[];
    const workGroups: ExportRow[] = (workGroupsRes.data || []) as ExportRow[];
    const employeeProfiles: ExportRow[] = (employeeProfilesRes.data || []) as ExportRow[];
    const employees: ExportRow[] = (employeesRes.data || []) as ExportRow[];
    const employeeCompanies: ExportRow[] = (employeeCompaniesRes.data || []) as ExportRow[];
    const users: ExportRow[] = (usersRes.data || []) as ExportRow[];
    const userRoles: ExportRow[] = (userRolesRes.data || []) as ExportRow[];
    const userRoleScopes: ExportRow[] = (userRoleScopesRes.data || []) as ExportRow[];
    const roles: ExportRow[] = (rolesRes.data || []) as ExportRow[];
    const scopeTypes: ExportRow[] = (scopeTypesRes.data || []) as ExportRow[];
    const countries: ExportRow[] = (countriesRes.data || []) as ExportRow[];
    const states: ExportRow[] = (statesRes.data || []) as ExportRow[];
    const cities: ExportRow[] = (citiesRes.data || []) as ExportRow[];
    const lookupGroups: ExportRow[] = (lookupGroupsRes.data || []) as ExportRow[];
    const lookupValues: ExportRow[] = (lookupValuesRes.data || []) as ExportRow[];

    const companyById = new Map(companies.map((row: any) => [row.id, row]));
    const workLocationById = new Map(workLocations.map((row: any) => [row.id, row]));
    const departmentById = new Map(departments.map((row: any) => [row.id, row]));
    const areaById = new Map(areas.map((row: any) => [row.id, row]));
    const jobTitleById = new Map(jobTitles.map((row: any) => [row.id, row]));
    const costCenterById = new Map(costCenters.map((row: any) => [row.id, row]));
    const payrollGroupById = new Map(payrollGroups.map((row: any) => [row.id, row]));
    const workGroupById = new Map(workGroups.map((row: any) => [row.id, row]));
    const profileById = new Map(employeeProfiles.map((row: any) => [row.id, row]));
    const employeeById = new Map(employees.map((row: any) => [row.id, row]));
    const userById = new Map(users.map((row: any) => [row.id, row]));
    const roleById = new Map(roles.map((row: any) => [row.id, row]));
    const scopeTypeById = new Map(scopeTypes.map((row: any) => [row.id, row]));
    const countryById = new Map(countries.map((row: any) => [row.id, row]));
    const stateById = new Map(states.map((row: any) => [row.id, row]));
    const cityById = new Map(cities.map((row: any) => [row.id, row]));
    const lookupById = new Map(lookupValues.map((row: any) => [row.id, row]));
    const lookupGroupById = new Map(lookupGroups.map((row: any) => [row.id, row]));

    const employeeCompaniesEnriched = employeeCompanies.map((row: any) => {
      const employee = employeeById.get(row.employee_id);
      const company = companyById.get(row.company_id);
      const profile = profileById.get(row.employee_profile_id);
      const workGroup = workGroupById.get(row.work_group_id);
      const location = workLocationById.get(row.work_location_id);
      const department = departmentById.get(row.department_id);
      const area = areaById.get(row.area_id);
      const jobTitle = jobTitleById.get(row.job_title_id);
      const costCenter = costCenterById.get(row.cost_center_id);
      const payrollGroup = payrollGroupById.get(row.payroll_group_id);
      const contractType = lookupById.get(row.contract_type_id);
      const contractGroup = contractType ? lookupGroupById.get(contractType.lookup_group_id) : null;

      return {
        employee_company_id: row.id,
        tenant_id: row.tenant_id,
        employee_id: row.employee_id,
        employee_code: employee?.employee_code || null,
        employee_lastname: employee?.employee_lastname || null,
        employee_name: employee?.employee_name || null,
        company_id: row.company_id,
        company_legacy_id: company?.legacy_id || null,
        company_name: company?.company_name || null,
        device_user_code: row.device_user_code,
        payroll_employee_code: row.payroll_employee_code,
        employee_profile_id: row.employee_profile_id,
        employee_profile_legacy_id: profile?.legacy_id || null,
        employee_profile_name: profile?.profile_name || null,
        work_group_id: row.work_group_id,
        work_group_legacy_id: workGroup?.legacy_id || null,
        work_group_name: workGroup?.work_group_name || null,
        work_location_id: row.work_location_id,
        work_location_legacy_id: location?.legacy_id || null,
        work_location_name: location?.work_location_name || null,
        department_id: row.department_id,
        department_legacy_id: department?.legacy_id || null,
        department_name: department?.department_name || null,
        area_id: row.area_id,
        area_legacy_id: area?.legacy_id || null,
        area_name: area?.area_name || null,
        job_title_id: row.job_title_id,
        job_title_legacy_id: jobTitle?.legacy_id || null,
        job_title_name: jobTitle?.job_title_name || null,
        cost_center_id: row.cost_center_id,
        cost_center_legacy_id: costCenter?.legacy_id || null,
        cost_center_name: costCenter?.cost_center_name || null,
        payroll_group_id: row.payroll_group_id,
        payroll_group_legacy_id: payrollGroup?.legacy_id || null,
        payroll_group_name: payrollGroup?.payroll_group_name || null,
        accounting_account_code: row.accounting_account_code,
        salary_amount: row.salary_amount,
        hire_date: row.hire_date,
        termination_date: row.termination_date,
        contract_type_id: row.contract_type_id,
        contract_type_key: contractType?.lookup_key || null,
        contract_type_label: contractType?.lookup_label || null,
        contract_type_group_key: contractGroup?.lookup_group_key || null,
        work_on_holidays: row.work_on_holidays,
        is_active: row.is_active,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_by: row.updated_by,
        updated_at: row.updated_at,
      };
    });

    const employeesEnriched = employees.map((row: any) => {
      const user = userById.get(row.user_id);
      const gender = lookupById.get(row.employee_gender_id);
      const genderGroup = gender ? lookupGroupById.get(gender.lookup_group_id) : null;
      return {
        ...row,
        gender_lookup_key: gender?.lookup_key || null,
        gender_lookup_label: gender?.lookup_label || null,
        gender_lookup_group_key: genderGroup?.lookup_group_key || null,
        user_username: user?.username || null,
        user_email: user?.email || null,
        user_display_name: user?.display_name || null,
        user_phone: user?.phone || null,
      };
    });

    const usersEnriched = users.map((row: any) => {
      const employee = employees.find((emp: any) => emp.user_id === row.id) || null;
      return {
        ...row,
        linked_employee_id: employee?.id || null,
        linked_employee_code: employee?.employee_code || null,
        linked_employee_lastname: employee?.employee_lastname || null,
        linked_employee_name: employee?.employee_name || null,
      };
    });

    const userRolesEnriched = userRoles.map((row: any) => {
      const user = userById.get(row.user_id);
      const role = roleById.get(row.role_id);
      const company = companyById.get(row.company_id);
      return {
        ...row,
        username: user?.username || null,
        user_email: user?.email || null,
        role_key: role?.role_key || null,
        role_name: role?.role_name || null,
        company_legacy_id: company?.legacy_id || null,
        company_name: company?.company_name || null,
      };
    });

    const userRoleScopesEnriched = userRoleScopes.map((row: any) => {
      const userRole = userRoles.find((ur: any) => ur.id === row.user_role_id) || null;
      const scopeType = scopeTypeById.get(row.scope_type_id);
      const user = userRole ? userById.get(userRole.user_id) : null;
      const role = userRole ? roleById.get(userRole.role_id) : null;
      return {
        ...row,
        username: user?.username || null,
        role_key: role?.role_key || null,
        scope_type_key: scopeType?.scope_type_key || null,
        scope_type_name: scopeType?.scope_type_name || null,
      };
    });

    const locationsEnriched = workLocations.map((row: any) => {
      const company = companyById.get(row.company_id);
      const country = countryById.get(row.country_id);
      const state = stateById.get(row.state_id);
      const city = cityById.get(row.city_id);
      return {
        ...row,
        company_legacy_id: company?.legacy_id || null,
        company_name: company?.company_name || null,
        country_key: country?.country_key || null,
        country_label: country?.country_label || null,
        state_key: state?.state_key || null,
        state_label: state?.state_label || null,
        city_key: city?.city_key || null,
        city_label: city?.city_label || null,
      };
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Turnos Titanium Enterprise';
    workbook.created = new Date();

    const addSheet = (sheetName: string, rows: ExportRow[]) => {
      const ws = workbook.addWorksheet(sheetName.slice(0, 31));
      if (!rows || rows.length === 0) {
        ws.columns = [{ header: 'message', key: 'message', width: 48 }];
        ws.addRow({ message: 'Sin registros' });
        return;
      }

      const keySet = new Set<string>();
      rows.forEach((row) => {
        Object.keys(row || {}).forEach((key) => keySet.add(key));
      });
      const keys = Array.from(keySet);

      ws.columns = keys.map((key) => ({
        header: key,
        key,
        width: Math.max(16, Math.min(48, key.length + 6)),
      }));

      rows.forEach((row) => ws.addRow(row));
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4C81' } };
      ws.views = [{ state: 'frozen', ySplit: 1 }];
    };

    addSheet('manifest', [
      {
        exported_at: exportedAt,
        exported_by: actor,
        tenant_id: tenantId,
        tenant_key: tenantRes.data?.tenant_key || null,
        tenant_name: tenantRes.data?.tenant_name || null,
        format_version: 'migration_export_v1',
        rows_employees: employees.length,
        rows_employee_companies: employeeCompanies.length,
        rows_users: users.length,
      },
    ]);
    addSheet('employees_enriched', employeesEnriched);
    addSheet('employee_companies_enriched', employeeCompaniesEnriched);
    addSheet('users_enriched', usersEnriched);
    addSheet('user_roles_enriched', userRolesEnriched);
    addSheet('user_role_scopes_enriched', userRoleScopesEnriched);
    addSheet('companies', companies);
    addSheet('work_locations_enriched', locationsEnriched);
    addSheet('departments', departments);
    addSheet('areas', areas);
    addSheet('job_titles', jobTitles);
    addSheet('cost_centers', costCenters);
    addSheet('payroll_groups', payrollGroups);
    addSheet('work_groups', workGroups);
    addSheet('employee_profiles', employeeProfiles);
    addSheet('countries', countries);
    addSheet('states', states);
    addSheet('cities', cities);
    addSheet('roles', roles);
    addSheet('scope_types', scopeTypes);
    addSheet('lookup_groups', lookupGroups);
    addSheet('lookup_values', lookupValues);

    const cleanTenant = String(tenantRes.data?.tenant_key || tenantRes.data?.tenant_name || tenantId)
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .slice(0, 64);
    const stamp = exportedAt.replace(/[:.]/g, '-');
    const fileName = `migration_export_${cleanTenant}_${stamp}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=\"${fileName}\"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(Buffer.from(buffer));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error generando exportaciÃƒÂ³n de migraciÃƒÂ³n' });
  }
});

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
      attendanceTimezones,
      countries,
      states,
      cities,
      employeeCompanyCombos,
    ] = await Promise.all([
      Postgres.from('companies').select('id, legacy_id, company_name').eq('tenant_id', tenantId).eq('is_active', true).order('company_name'),
      Postgres.from('departments').select('id, legacy_id, department_name').eq('tenant_id', tenantId).eq('is_active', true).order('department_name'),
      Postgres.from('areas').select('id, legacy_id, area_name').eq('tenant_id', tenantId).eq('is_active', true).order('area_name'),
      Postgres.from('cost_centers').select('id, legacy_id, cost_center_name').eq('tenant_id', tenantId).eq('is_active', true).order('cost_center_name'),
      Postgres.from('payroll_groups').select('id, legacy_id, payroll_group_name').eq('tenant_id', tenantId).eq('is_active', true).order('payroll_group_name'),
      Postgres.from('employee_profiles').select('id, legacy_id, profile_name').eq('tenant_id', tenantId).eq('is_active', true).order('profile_name'),
      Postgres.from('employees').select('id, employee_code, employee_lastname, employee_name').eq('tenant_id', tenantId).eq('is_active', true).order('employee_code'),
      Postgres.from('work_groups').select('id, legacy_id, work_group_name').eq('tenant_id', tenantId).eq('is_active', true).order('work_group_name'),
      Postgres.from('work_locations').select('id, legacy_id, work_location_name').eq('tenant_id', tenantId).eq('is_active', true).order('work_location_name'),
      Postgres.from('job_titles').select('id, legacy_id, job_title_name').eq('tenant_id', tenantId).eq('is_active', true).order('job_title_name'),
      Postgres.from('lookup_values').select('id, lookup_key, lookup_label, lookup_short_label, lookup_groups!inner(lookup_group_key)').eq('lookup_groups.lookup_group_key', 'CONTRACT_TYPE').eq('is_active', true).order('lookup_label'),
      Postgres.from('lookup_values').select('id, lookup_key, lookup_label, lookup_short_label, lookup_groups!inner(lookup_group_key)').eq('lookup_groups.lookup_group_key', 'GENDER').eq('is_active', true).order('lookup_label'),
      Postgres.from('lookup_values').select('id, lookup_key, lookup_label, lookup_short_label, lookup_groups!inner(lookup_group_key)').eq('lookup_groups.lookup_group_key', 'ATTENDANCE_TIMEZONE').eq('is_active', true).order('lookup_label'),
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
      attendanceTimezones.error,
      countries.error,
      states.error,
      cities.error,
      employeeCompanyCombos.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      const firstError = errors.find((entry: any) => entry && typeof entry.message === 'string');
      return res.status(500).json({ error: firstError?.message || 'Error cargando catÃƒÂ¡logos' });
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
          company_legacy_id: company.legacy_id || null,
          company_name: company.company_name || null,
          payroll_group_id: payrollGroup?.id || null,
          payroll_group_legacy_id: payrollGroup?.legacy_id || null,
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
        attendance_timezones: attendanceTimezones.data || [],
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
    const loadDependentGeo = String(req.query.dependent_geo ?? 'true').toLowerCase() !== 'false';

    const holidayTypeGroupPromise = Postgres
      .from('lookup_groups')
      .select('id')
      .eq('lookup_group_key', 'HOLIDAY_TYPE')
      .eq('is_active', true)
      .maybeSingle();

    let statesQuery = Postgres
      .from('states')
      .select('*')
      .eq('is_active', true);
    if (!loadDependentGeo) {
      statesQuery = statesQuery.limit(0);
    } else if (selectedCountryId) {
      statesQuery = statesQuery.eq('country_id', selectedCountryId);
    }

    let citiesQuery = Postgres
      .from('cities')
      .select('*')
      .eq('is_active', true);
    if (!loadDependentGeo) {
      citiesQuery = citiesQuery.limit(0);
    } else if (selectedStateId) {
      citiesQuery = citiesQuery.eq('state_id', selectedStateId);
    } else if (selectedCountryId) {
      citiesQuery = citiesQuery.eq('country_id', selectedCountryId);
    }

    const [companies, workLocations, countries, statesRaw, citiesRaw, holidayTypeGroup] = await Promise.all([
      Postgres
        .from('companies')
        .select('id, legacy_id, company_name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('company_name'),
      Postgres
        .from('work_locations')
        .select('id, legacy_id, work_location_name, company_id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('work_location_name'),
      Postgres
        .from('countries')
        .select('*')
        .eq('is_active', true),
      statesQuery,
      citiesQuery,
      holidayTypeGroupPromise,
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
    if (holidayTypeGroup.error) {
      return res.status(500).json({ error: holidayTypeGroup.error.message });
    }

    const countryOptions = (countries.data || [])
      .map((row: any) => mapCountryOption(row))
      .sort((a: any, b: any) => String(a.lookup_label).localeCompare(String(b.lookup_label), 'es'));

    let stateOptions = (statesRaw.data || [])
      .map((row: any) => mapStateOption(row))
      .sort((a: any, b: any) => String(a.lookup_label).localeCompare(String(b.lookup_label), 'es'));

    let cityOptions = (citiesRaw.data || [])
      .map((row: any) => mapCityOption(row))
      .sort((a: any, b: any) => String(a.lookup_label).localeCompare(String(b.lookup_label), 'es'));

    let holidayTypeRows: any[] = [];
    if (holidayTypeGroup.data?.id) {
      let holidayTypes = await Postgres
        .from('lookup_values')
        .select('id, lookup_key, lookup_label, lookup_short_label, sort_order, metadata')
        .eq('lookup_group_id', holidayTypeGroup.data.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('lookup_label', { ascending: true });

      if (holidayTypes.error && String(holidayTypes.error.message || '').toLowerCase().includes('metadata')) {
        holidayTypes = await Postgres
          .from('lookup_values')
          .select('id, lookup_key, lookup_label, lookup_short_label, sort_order')
          .eq('lookup_group_id', holidayTypeGroup.data.id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('lookup_label', { ascending: true });
      }

      if (holidayTypes.error) {
        return res.status(500).json({ error: holidayTypes.error.message });
      }
      holidayTypeRows = holidayTypes.data || [];
    }

    const holidayTypeOptions = holidayTypeRows.map((row: any) => ({
      id: row?.id,
      lookup_key: row?.lookup_key || null,
      lookup_label: row?.lookup_label || null,
      lookup_short_label: row?.lookup_short_label || null,
      sort_order: row?.sort_order ?? null,
      icon_key: row?.metadata?.icon_key || null,
      icon_glyph: row?.metadata?.icon_glyph || null,
      icon_color: row?.metadata?.icon_color || null,
    }));

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      catalogs: {
        companies: companies.data || [],
        work_locations: workLocations.data || [],
        countries: countryOptions,
        states: stateOptions,
        cities: cityOptions,
        holiday_types: holidayTypeOptions,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/holidays/calendar', withDocs(async (req: Request, res: Response) => {
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

    const holidayTypeIds = Array.from(
      new Set(
        (data || [])
          .map((row: any) => row?.holiday_type_id)
          .filter((id: any) => !!id)
          .map((id: any) => String(id))
      )
    );

    let holidayTypeRows: any[] = [];
    if (holidayTypeIds.length > 0) {
      let holidayTypeQuery = await Postgres
        .from('lookup_values')
        .select('id, lookup_key, lookup_label, metadata')
        .in('id', holidayTypeIds);

      if (holidayTypeQuery.error && String(holidayTypeQuery.error.message || '').toLowerCase().includes('metadata')) {
        holidayTypeQuery = await Postgres
          .from('lookup_values')
          .select('id, lookup_key, lookup_label')
          .in('id', holidayTypeIds);
      }

      if (holidayTypeQuery.error) {
        return res.status(500).json({ error: holidayTypeQuery.error.message });
      }
      holidayTypeRows = holidayTypeQuery.data || [];
    }

    const holidayTypeById = new Map<string, any>();
    holidayTypeRows.forEach((row: any) => {
      if (!row?.id) return;
      holidayTypeById.set(String(row.id), row);
    });

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
      const typeRow = row?.holiday_type_id ? holidayTypeById.get(String(row.holiday_type_id)) : null;
      return [{
        ...row,
        holiday_date: projectedDate,
        holiday_type_key: typeRow?.lookup_key || null,
        holiday_type_label: typeRow?.lookup_label || null,
        holiday_type_icon_key: typeRow?.metadata?.icon_key || null,
        holiday_type_icon_glyph: typeRow?.metadata?.icon_glyph || null,
        holiday_type_icon_color: typeRow?.metadata?.icon_color || null,
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
}, {
  tags: ['Organization'],
  summary: 'Calendario de feriados por mes',
  description: 'Obtiene los feriados del tenant para un mes y anio, con filtros opcionales de alcance.',
  parameters: [
    {
      name: 'year',
      in: 'query',
      required: true,
      schema: { type: 'integer', minimum: 2000, maximum: 2100 },
      description: 'Anio del calendario (ej: 2026)',
    },
    {
      name: 'month',
      in: 'query',
      required: true,
      schema: { type: 'integer', minimum: 1, maximum: 12 },
      description: 'Mes del calendario (1-12)', 
    },
    {
      name: 'company_id',
      in: 'query',
      required: false,
      schema: { type: 'string' },
    },
    {
      name: 'work_location_id',
      in: 'query',
      required: false,
      schema: { type: 'string' },
    },
    {
      name: 'country_id',
      in: 'query',
      required: false,
      schema: { type: 'string' },
    },
    {
      name: 'state_id',
      in: 'query',
      required: false,
      schema: { type: 'string' },
    },
    {
      name: 'city_id',
      in: 'query',
      required: false,
      schema: { type: 'string' },
    },
  ],
  responses: {
    200: { description: 'Calendario de feriados' },
    400: { description: 'Parametros invalidos' },
    401: { description: 'No autorizado' },
    500: { description: 'Error interno' },
  },
}));

router.get('/holidays/range-scopes', withDocs(async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const fromRaw =
      String(req.query.from || req.query.start_date || req.query.date_from || '').trim();
    const toRaw =
      String(req.query.to || req.query.end_date || req.query.date_to || '').trim();

    const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (!isIsoDate(fromRaw)) {
      return res.status(400).json({ error: 'from/start_date invalido (use YYYY-MM-DD)' });
    }
    if (!isIsoDate(toRaw)) {
      return res.status(400).json({ error: 'to/end_date invalido (use YYYY-MM-DD)' });
    }
    if (fromRaw > toRaw) {
      return res.status(400).json({ error: 'La fecha final no puede ser menor a la fecha inicial' });
    }

    const { data, error } = await Postgres
      .from('holidays')
      .select(`
        id,
        holiday_date,
        holiday_name,
        holiday_type_id,
        is_recurring,
        company_id,
        country_id,
        state_id,
        city_id,
        work_location_id
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('holiday_date', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const holidayTypeIds = Array.from(
      new Set(
        (data || [])
          .map((row: any) => row?.holiday_type_id)
          .filter((id: any) => !!id)
          .map((id: any) => String(id))
      )
    );

    let holidayTypeRows: any[] = [];
    if (holidayTypeIds.length > 0) {
      let holidayTypeQuery = await Postgres
        .from('lookup_values')
        .select('id, lookup_key, lookup_label, metadata')
        .in('id', holidayTypeIds);

      if (holidayTypeQuery.error && String(holidayTypeQuery.error.message || '').toLowerCase().includes('metadata')) {
        holidayTypeQuery = await Postgres
          .from('lookup_values')
          .select('id, lookup_key, lookup_label')
          .in('id', holidayTypeIds);
      }

      if (holidayTypeQuery.error) {
        return res.status(500).json({ error: holidayTypeQuery.error.message });
      }
      holidayTypeRows = holidayTypeQuery.data || [];
    }

    const holidayTypeById = new Map<string, any>();
    holidayTypeRows.forEach((row: any) => {
      if (!row?.id) return;
      holidayTypeById.set(String(row.id), row);
    });

    const startDate = new Date(`${fromRaw}T00:00:00`);
    const endDate = new Date(`${toRaw}T00:00:00`);

    const items = (data || []).flatMap((row: any) => {
      const dateIso = extractDateIso(row?.holiday_date);
      if (!dateIso) return [];

      const isRecurring = row?.is_recurring === true || String(row?.is_recurring) === 'true';
      if (!isRecurring) {
        if (dateIso < fromRaw || dateIso > toRaw) return [];
        const typeRow = row?.holiday_type_id ? holidayTypeById.get(String(row.holiday_type_id)) : null;
        return [{
          holiday_date: dateIso,
          company_id: row?.company_id || null,
          country_id: row?.country_id || null,
          state_id: row?.state_id || null,
          city_id: row?.city_id || null,
          work_location_id: row?.work_location_id || null,
          holiday_id: row?.id || null,
          holiday_name: row?.holiday_name || null,
          holiday_type_id: row?.holiday_type_id || null,
          holiday_type_key: typeRow?.lookup_key || null,
          holiday_type_label: typeRow?.lookup_label || null,
          holiday_type_icon_key: typeRow?.metadata?.icon_key || null,
          holiday_type_icon_glyph: typeRow?.metadata?.icon_glyph || null,
          holiday_type_icon_color: typeRow?.metadata?.icon_color || null,
          is_recurring: false,
        }];
      }

      const [_, month, day] = dateIso.split('-');
      const projected: any[] = [];
      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        const year = String(cursor.getFullYear());
        const candidate = `${year}-${month}-${day}`;
        if (candidate >= fromRaw && candidate <= toRaw) {
          const typeRow = row?.holiday_type_id ? holidayTypeById.get(String(row.holiday_type_id)) : null;
          projected.push({
            holiday_date: candidate,
            company_id: row?.company_id || null,
            country_id: row?.country_id || null,
            state_id: row?.state_id || null,
            city_id: row?.city_id || null,
            work_location_id: row?.work_location_id || null,
            holiday_id: row?.id || null,
            holiday_name: row?.holiday_name || null,
            holiday_type_id: row?.holiday_type_id || null,
            holiday_type_key: typeRow?.lookup_key || null,
            holiday_type_label: typeRow?.lookup_label || null,
            holiday_type_icon_key: typeRow?.metadata?.icon_key || null,
            holiday_type_icon_glyph: typeRow?.metadata?.icon_glyph || null,
            holiday_type_icon_color: typeRow?.metadata?.icon_color || null,
            is_recurring: true,
          });
        }
        cursor.setFullYear(cursor.getFullYear() + 1);
      }
      return projected;
    });

    items.sort((a: any, b: any) => String(a.holiday_date).localeCompare(String(b.holiday_date), 'es'));

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      from: fromRaw,
      to: toRaw,
      items,
      count: items.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
}, {
  tags: ['Organization'],
  summary: 'Feriados en un rango de fechas',
  description: 'Obtiene los feriados del tenant que caen dentro de un rango de fechas, con filtros opcionales de alcance.',
  parameters: [
    {
      name: 'from',
      in: 'query',
      description: 'Fecha de inicio del rango',
      required: true,
      schema: {
        type: 'string',
        format: 'date'
      }
    },
    {
      name: 'to',
      in: 'query',
      description: 'Fecha de fin del rango',
      required: true,
      schema: {
        type: 'string',
        format: 'date'
      }
    }
  ]
} ));

// Employee user management (link employees -> users)
router.get('/employee-users/catalogs', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const [languages, employeeRole] = await Promise.all([
      Postgres
        .from('system_languages')
        .select('code, language_name')
        .eq('is_active', true)
        .order('language_name'),
      Postgres
        .from('roles')
        .select('id, role_key, role_name')
        .eq('tenant_id', tenantId)
        .eq('role_key', 'EMPLOYEE')
        .eq('is_active', true)
        .maybeSingle(),
    ]);

    if (languages.error) return res.status(500).json({ error: languages.error.message });
    if (employeeRole.error) return res.status(500).json({ error: employeeRole.error.message });

    return res.status(200).json({
      success: true,
      tenant_id: tenantId,
      catalogs: {
        languages: languages.data || [],
      },
      employee_role: employeeRole.data || null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/employee-users', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const { data: employees, error: employeesError } = await Postgres
      .from('employees')
      .select('id, tenant_id, employee_code, employee_lastname, employee_name, is_active, user_id')
      .eq('tenant_id', tenantId)
      .order('employee_lastname', { ascending: true })
      .order('employee_name', { ascending: true });

    if (employeesError) return res.status(500).json({ error: employeesError.message });

    const userIds = Array.from(
      new Set((employees || []).map((row: any) => row.user_id).filter(Boolean))
    );

    let usersById = new Map<string, any>();
    const employeeUserIds = new Set<string>();
    if (userIds.length > 0) {
      const { data: employeeRole } = await Postgres
        .from('roles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role_key', 'EMPLOYEE')
        .eq('is_active', true)
        .maybeSingle();

      if (employeeRole?.id) {
        const { data: employeeUserRoles, error: employeeUserRolesError } = await Postgres
          .from('user_roles')
          .select('user_id')
          .eq('tenant_id', tenantId)
          .eq('role_id', employeeRole.id)
          .eq('is_active', true)
          .in('user_id', userIds);
        if (employeeUserRolesError) return res.status(500).json({ error: employeeUserRolesError.message });
        for (const row of employeeUserRoles || []) {
          if (row.user_id) employeeUserIds.add(row.user_id);
        }
      }

      const filteredUserIds = userIds.map((userId) => String(userId)).filter((userId) => employeeUserIds.has(userId));
      const { data: users, error: usersError } = filteredUserIds.length > 0 ? await Postgres
        .from('users')
        .select('id, username, display_name, email, phone, preferred_language_code, is_active')
        .in('id', filteredUserIds) : { data: [], error: null };
      if (usersError) return res.status(500).json({ error: usersError.message });
      usersById = new Map((users || []).map((u: any) => [u.id, u]));
    }

    const rows = (employees || []).filter((employee: any) => !employee.user_id || employeeUserIds.has(employee.user_id)).map((employee: any) => {
      const linkedUser = employee.user_id ? usersById.get(employee.user_id) : null;
      return {
        employee_id: employee.id,
        tenant_id: employee.tenant_id,
        employee_code: employee.employee_code,
        employee_lastname: employee.employee_lastname,
        employee_name: employee.employee_name,
        employee_is_active: employee.is_active,
        user_id: employee.user_id || null,
        username: linkedUser?.username || null,
        display_name: linkedUser?.display_name || null,
        email: linkedUser?.email || null,
        phone: linkedUser?.phone || null,
        preferred_language_code: linkedUser?.preferred_language_code || null,
        user_is_active: linkedUser?.is_active ?? null,
      };
    });

    return res.status(200).json({ success: true, rows, count: rows.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.put('/employee-users/:employee_id', async (req: Request, res: Response) => {
  try {
    const employeeId = req.params.employee_id;
    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    const actor = getActor(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'No se pudo resolver tenant_id' });
    }

    const {
      username,
      display_name,
      email,
      phone,
      preferred_language_code,
      password,
      is_active = true,
    } = req.body || {};

    if (!username || !String(username).trim()) {
      return res.status(400).json({ error: 'username es obligatorio' });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'email es obligatorio' });
    }
    if (password && String(password).trim().length > 0 && String(password).trim().length < 8) {
      return res.status(400).json({ error: 'password debe tener al menos 8 caracteres' });
    }

    const { data: employee, error: employeeError } = await Postgres
      .from('employees')
      .select('id, tenant_id, user_id')
      .eq('id', employeeId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (employeeError) return res.status(500).json({ error: employeeError.message });
    if (!employee) return res.status(404).json({ error: 'Empleado no encontrado' });

    let targetUserId = employee.user_id as string | null;
    let created = false;

    if (targetUserId) {
      const { data: existingUser, error: existingUserError } = await Postgres
        .from('users')
        .select('id, auth_user_id, username, email')
        .eq('id', targetUserId)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (existingUserError) return res.status(500).json({ error: existingUserError.message });
      if (!existingUser) return res.status(404).json({ error: 'Usuario asociado no encontrado' });

      const existingEmployeeRoleResult = await pool.query(
        `
          SELECT 1
          FROM public.user_roles ur
          INNER JOIN public.roles r
            ON r.id = ur.role_id
           AND r.tenant_id = ur.tenant_id
           AND r.is_active = true
          WHERE ur.tenant_id = $1
            AND ur.user_id = $2
            AND ur.is_active = true
            AND (ur.valid_from IS NULL OR ur.valid_from <= now())
            AND (ur.valid_to IS NULL OR ur.valid_to >= now())
            AND r.role_key = 'EMPLOYEE'
          LIMIT 1
        `,
        [tenantId, existingUser.id]
      );
      if (existingEmployeeRoleResult.rowCount === 0) {
        return res.status(409).json({
          error: 'El empleado esta vinculado a un usuario que no tiene rol EMPLOYEE. Corrige la vinculacion antes de administrarlo desde esta pantalla.',
        });
      }

      const { data: duplicateUsername } = await Postgres
        .from('users')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('username', String(username).trim())
        .neq('id', existingUser.id)
        .maybeSingle();
      if (duplicateUsername?.id) {
        return res.status(409).json({ error: 'Ya existe un usuario con ese username en este tenant' });
      }

      const updatePayload: Record<string, any> = {
        username: String(username).trim(),
        display_name: display_name || null,
        email: String(email).trim(),
        phone: phone || null,
        preferred_language_code: preferred_language_code || null,
        is_active: !!is_active,
        updated_by: actor,
        updated_at: new Date().toISOString(),
      };

      const { error: updateUserError } = await Postgres
        .from('users')
        .update(updatePayload)
        .eq('id', existingUser.id);
      if (updateUserError) return res.status(500).json({ error: updateUserError.message });

      if (existingUser.auth_user_id) {
        const authUpdatePayload: Record<string, any> = {
          email: String(email).trim(),
          user_metadata: {
            username: String(username).trim(),
            display_name: display_name || null,
            tenant_id: tenantId,
          },
          ban_duration: is_active ? 'none' : '876000h',
        };
        if (password && String(password).trim()) {
          authUpdatePayload.password = String(password).trim();
        }
        const { error: authUpdateError } = await Postgres.auth.admin.updateUserById(existingUser.auth_user_id, authUpdatePayload);
        if (authUpdateError) return res.status(500).json({ error: authUpdateError.message });
      }
    } else {
      if (!password || !String(password).trim()) {
        return res.status(400).json({ error: 'password es obligatorio para crear usuario por primera vez' });
      }

      const { data: duplicateUsername } = await Postgres
        .from('users')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('username', String(username).trim())
        .maybeSingle();
      if (duplicateUsername?.id) {
        return res.status(409).json({ error: 'Ya existe un usuario con ese username en este tenant' });
      }

      const { data: authData, error: authError } = await Postgres.auth.admin.createUser({
        email: String(email).trim(),
        password: String(password).trim(),
        email_confirm: true,
        user_metadata: {
          username: String(username).trim(),
          display_name: display_name || null,
          tenant_id: tenantId,
        },
      });
      if (authError || !authData?.user?.id) {
        return res.status(500).json({ error: authError?.message || 'No se pudo crear el usuario en Auth' });
      }

      const authUserId = authData.user.id;
      const { data: insertedUser, error: insertUserError } = await Postgres
        .from('users')
        .insert({
          tenant_id: tenantId,
          auth_user_id: authUserId,
          username: String(username).trim(),
          display_name: display_name || null,
          email: String(email).trim(),
          phone: phone || null,
          preferred_language_code: preferred_language_code || null,
          is_active: !!is_active,
          created_by: actor,
        })
        .select('id')
        .single();

      if (insertUserError || !insertedUser?.id) {
        return res.status(500).json({ error: insertUserError?.message || 'No se pudo crear el usuario en tabla users' });
      }

      targetUserId = insertedUser.id;
      created = true;

      const { error: updateEmployeeError } = await Postgres
        .from('employees')
        .update({
          user_id: targetUserId,
          updated_by: actor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employeeId);
      if (updateEmployeeError) return res.status(500).json({ error: updateEmployeeError.message });
    }

    if (!targetUserId) return res.status(500).json({ error: 'No se pudo resolver el usuario a asociar' });
    const userRoleId = await ensureEmployeeRoleAssigned(Postgres, tenantId, targetUserId, actor);
    await ensureEmployeeScopeAssigned(Postgres, tenantId, userRoleId, employeeId, actor);

    return res.status(200).json({
      success: true,
      employee_id: employeeId,
      user_id: targetUserId,
      created,
      role_key: 'EMPLOYEE',
      scope_key: 'EMPLOYEE',
      scope_entity_id: employeeId,
      message: created
        ? 'Usuario EMPLOYEE creado, asociado al empleado y con scope EMPLOYEE'
        : 'Usuario EMPLOYEE actualizado con scope EMPLOYEE',
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

router.post('/companies/:id/upload-asset', async (req: Request, res: Response) => {
  try {
    const assetType = String(req.body?.asset_type || '').trim().toLowerCase();
    const fileName = String(req.body?.file_name || '').trim();
    const mimeType = String(req.body?.mime_type || '').trim().toLowerCase();
    const fileBase64 = String(req.body?.file_base64 || '').trim();

    if (!['logo', 'banner'].includes(assetType)) {
      return res.status(400).json({ error: 'asset_type debe ser logo o banner' });
    }
    if (!fileName || !fileBase64) {
      return res.status(400).json({ error: 'file_name y file_base64 son obligatorios' });
    }

    const allowedMimes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
    if (!allowedMimes.has(mimeType)) {
      return res.status(400).json({ error: 'Formato no soportado. Use jpg, png o webp' });
    }

    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const { data: company, error: companyError } = await Postgres
      .from('companies')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', req.params.id)
      .maybeSingle();
    if (companyError) return res.status(500).json({ error: companyError.message });
    if (!company) return res.status(404).json({ error: 'Empresa no encontrada' });

    const buffer = Buffer.from(fileBase64, 'base64');
    if (!buffer.length) return res.status(400).json({ error: 'Contenido de imagen invalido' });
    if (buffer.length > 8 * 1024 * 1024) return res.status(400).json({ error: 'La imagen supera el limite de 8MB' });

    const resolved = await resolveCompanyAssetsStoragePath(Postgres, tenantId);
    await fs.mkdir(resolved.absolutePath, { recursive: true });

    const extByMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = extByMime[mimeType] || path.extname(fileName) || '.png';
    const storedFileName = `${assetType}-${Date.now()}-${randomUUID()}${ext}`;
    const relativePath = safeRelativeCompanyAssetPath(`${tenantId}/${req.params.id}/${storedFileName}`);
    const absoluteFilePath = path.join(resolved.absolutePath, relativePath);
    await fs.mkdir(path.dirname(absoluteFilePath), { recursive: true });
    await fs.writeFile(absoluteFilePath, buffer);

    const actor = getActor(req);
    const updatePayload: Record<string, any> = {
      [assetType]: relativePath,
      updated_by: actor,
      updated_at: new Date().toISOString(),
    };
    const { data: updatedCompany, error: updateError } = await Postgres
      .from('companies')
      .update(updatePayload)
      .eq('tenant_id', tenantId)
      .eq('id', req.params.id)
      .select('*')
      .maybeSingle();
    if (updateError) return res.status(500).json({ error: updateError.message });

    return res.status(201).json({ success: true, asset_type: assetType, asset_path: relativePath, item: updatedCompany });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.delete('/companies/:id/asset/:assetType', async (req: Request, res: Response) => {
  try {
    const assetType = String(req.params.assetType || '').trim().toLowerCase();
    if (!['logo', 'banner'].includes(assetType)) {
      return res.status(400).json({ error: 'assetType debe ser logo o banner' });
    }

    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const actor = getActor(req);
    const { data: updatedCompany, error: updateError } = await Postgres
      .from('companies')
      .update({ [assetType]: null, updated_by: actor, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', req.params.id)
      .select('*')
      .maybeSingle();
    if (updateError) return res.status(500).json({ error: updateError.message });
    if (!updatedCompany) return res.status(404).json({ error: 'Empresa no encontrada' });

    return res.status(200).json({ success: true, item: updatedCompany });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/companies/:id/asset/:assetType', async (req: Request, res: Response) => {
  try {
    const assetType = String(req.params.assetType || '').trim().toLowerCase();
    if (!['logo', 'banner'].includes(assetType)) {
      return res.status(400).json({ error: 'assetType debe ser logo o banner' });
    }

    const Postgres = getPostgres();
    const tenantId = await resolveTenantId(req, Postgres);
    if (!tenantId) return res.status(400).json({ error: 'No se pudo resolver tenant_id' });

    const { data: company, error: companyError } = await Postgres
      .from('companies')
      .select('id, logo, banner')
      .eq('tenant_id', tenantId)
      .eq('id', req.params.id)
      .maybeSingle();
    if (companyError) return res.status(500).json({ error: companyError.message });
    if (!company) return res.status(404).json({ error: 'Empresa no encontrada' });

    const storedPath = String(company[assetType] || '').trim();
    if (!storedPath) return res.status(404).json({ error: 'La empresa no tiene imagen configurada' });
    if (/^https?:\/\//i.test(storedPath)) return res.redirect(storedPath);

    const resolved = await resolveCompanyAssetsStoragePath(Postgres, tenantId);
    const relativePath = safeRelativeCompanyAssetPath(storedPath);
    if (!relativePath.startsWith(`${tenantId}/`)) return res.status(403).json({ error: 'Ruta de imagen no permitida para este tenant' });

    const absoluteFilePath = path.join(resolved.absolutePath, relativePath);
    await fs.access(absoluteFilePath);
    return res.sendFile(absoluteFilePath);
  } catch (err: any) {
    if (err?.code === 'ENOENT') return res.status(404).json({ error: 'Archivo de imagen no encontrado' });
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

    query = query.order(config.defaultSort, { ascending: true }).order('id', { ascending: true });

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
          message: `Se crearon ${(data || []).length} horarios con combinaciones vÃƒÂ¡lidas`,
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
          error: 'En actualizacion no se permite valor 0 (TODOS). Use creaciÃƒÂ³n para generar horarios masivos por combinacion',
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
      return res.status(400).json({ error: 'La entidad no soporta activaciÃƒÂ³n/desactivaciÃƒÂ³n' });
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

