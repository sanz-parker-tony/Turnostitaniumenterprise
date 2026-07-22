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

export async function resolveRequiredEffectiveNumberSetting(
  pool: Pool,
  opts: {
    tenantId: string;
    settingKey: string;
    companyId?: string | null;
    employeeProfileId?: string | null;
    employeeId?: string | null;
    min?: number;
    max?: number;
  }
): Promise<number> {
  const setting = await resolveEffectiveSettingByKey(pool, opts);
  const parsed = Number(setting?.effective_value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${opts.settingKey} no está configurado con un valor numérico válido`);
  }
  let value = parsed;
  if (Number.isFinite(opts.min)) value = Math.max(opts.min as number, value);
  if (Number.isFinite(opts.max)) value = Math.min(opts.max as number, value);
  return value;
}

export async function resolveEffectiveAttendanceTimeZone(
  pool: Pool,
  opts: {
    tenantId: string;
    companyId?: string | null;
    employeeProfileId?: string | null;
    employeeId?: string | null;
  }
): Promise<string> {
  const setting = await resolveEffectiveSettingByKey(pool, {
    ...opts,
    settingKey: 'ATTENDANCE_TIMEZONE',
  });
  const configuredValue = String(setting?.effective_value || '').trim();
  if (!configuredValue) {
    throw new Error('ATTENDANCE_TIMEZONE no está configurado para el contexto de asistencia');
  }

  const lookupResult = await pool.query(
    `
      SELECT value.lookup_short_label AS time_zone
      FROM public.lookup_values value
      JOIN public.lookup_groups group_row
        ON group_row.id = value.lookup_group_id
       AND group_row.lookup_group_key = 'ATTENDANCE_TIMEZONE'
       AND group_row.is_active = true
      WHERE value.is_active = true
        AND (value.tenant_id IS NULL OR value.tenant_id = $1::uuid)
        AND (value.lookup_key = $2 OR value.lookup_short_label = $2)
      ORDER BY CASE WHEN value.tenant_id = $1::uuid THEN 0 ELSE 1 END
      LIMIT 1
    `,
    [opts.tenantId, configuredValue]
  );
  const timeZone = String(lookupResult.rows[0]?.time_zone || '').trim();
  if (!timeZone) {
    throw new Error(`ATTENDANCE_TIMEZONE referencia un valor inexistente o inactivo: ${configuredValue}`);
  }

  try {
    new Intl.DateTimeFormat('en', { timeZone }).format(new Date());
  } catch {
    throw new Error(`Zona horaria IANA inválida en ATTENDANCE_TIMEZONE: ${timeZone}`);
  }
  return timeZone;
}
