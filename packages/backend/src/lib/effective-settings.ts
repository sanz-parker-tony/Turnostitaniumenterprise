import { Pool } from 'pg';

type SourceLevel = 'EMPLOYEE' | 'PROFILE' | 'COMPANY' | 'TENANT' | 'SYSTEM';

export type EffectiveSetting = {
  system_setting_id: string;
  setting_key: string;
  default_value: string | null;
  effective_value: string | null;
  source_level: SourceLevel;
};

function toNullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  return String(value);
}

export async function resolveEffectiveSettingByKey(
  pool: Pool,
  opts: {
    tenantId: string;
    settingKey: string;
    companyId?: string | null;
    employeeProfileId?: string | null;
    employeeId?: string | null;
  }
): Promise<EffectiveSetting | null> {
  const settingResult = await pool.query(
    `
      SELECT id, setting_key, default_value
      FROM public.system_settings
      WHERE setting_key = $1
        AND is_active = true
      LIMIT 1
    `,
    [opts.settingKey]
  );

  const setting = settingResult.rows[0];
  if (!setting) return null;

  let effectiveValue = toNullableString(setting.default_value);
  let sourceLevel: SourceLevel = 'SYSTEM';

  const tenantResult = await pool.query(
    `
      SELECT setting_value
      FROM public.tenant_settings
      WHERE tenant_id = $1::uuid
        AND system_setting_id = $2::uuid
        AND is_active = true
      LIMIT 1
    `,
    [opts.tenantId, setting.id]
  );
  if (tenantResult.rows[0]) {
    effectiveValue = toNullableString(tenantResult.rows[0].setting_value) ?? effectiveValue;
    sourceLevel = 'TENANT';
  }

  if (opts.companyId) {
    const companyResult = await pool.query(
      `
        SELECT setting_value
        FROM public.company_settings
        WHERE company_id = $1::uuid
          AND system_setting_id = $2::uuid
          AND is_active = true
        LIMIT 1
      `,
      [opts.companyId, setting.id]
    );
    if (companyResult.rows[0]) {
      effectiveValue = toNullableString(companyResult.rows[0].setting_value) ?? effectiveValue;
      sourceLevel = 'COMPANY';
    }
  }

  if (opts.employeeProfileId) {
    const profileResult = await pool.query(
      `
        SELECT setting_value
        FROM public.employee_profile_settings
        WHERE tenant_id = $1::uuid
          AND employee_profile_id = $2::uuid
          AND system_setting_id = $3::uuid
          AND is_active = true
        LIMIT 1
      `,
      [opts.tenantId, opts.employeeProfileId, setting.id]
    );
    if (profileResult.rows[0]) {
      effectiveValue = toNullableString(profileResult.rows[0].setting_value) ?? effectiveValue;
      sourceLevel = 'PROFILE';
    }
  }

  if (opts.employeeId) {
    const employeeResult = await pool.query(
      `
        SELECT setting_value
        FROM public.employee_settings
        WHERE tenant_id = $1::uuid
          AND employee_id = $2::uuid
          AND system_setting_id = $3::uuid
          AND is_active = true
        LIMIT 1
      `,
      [opts.tenantId, opts.employeeId, setting.id]
    );
    if (employeeResult.rows[0]) {
      effectiveValue = toNullableString(employeeResult.rows[0].setting_value) ?? effectiveValue;
      sourceLevel = 'EMPLOYEE';
    }
  }

  return {
    system_setting_id: setting.id,
    setting_key: setting.setting_key,
    default_value: toNullableString(setting.default_value),
    effective_value: effectiveValue,
    source_level: sourceLevel,
  };
}

export async function resolveEffectiveNumberSetting(
  pool: Pool,
  opts: {
    tenantId: string;
    settingKey: string;
    fallback: number;
    companyId?: string | null;
    employeeProfileId?: string | null;
    employeeId?: string | null;
    min?: number;
    max?: number;
  }
): Promise<number> {
  const setting = await resolveEffectiveSettingByKey(pool, opts);
  const parsed = Number(setting?.effective_value);
  let value = Number.isFinite(parsed) ? parsed : opts.fallback;

  if (Number.isFinite(opts.min)) value = Math.max(opts.min as number, value);
  if (Number.isFinite(opts.max)) value = Math.min(opts.max as number, value);

  return value;
}
