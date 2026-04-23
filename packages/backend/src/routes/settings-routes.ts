/**
 * settings-routes.ts
 * Turnos Titanium Enterprise — Servicio de Parámetros de Configuración
 *
 * Implementa la lógica de resolución jerárquica:
 *   employee_profile_settings > company_settings > tenant_settings > system_settings
 */

import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';

const router = Router();

// ============================================================================
// TIPOS
// ============================================================================

type SourceLevel = "PROFILE" | "COMPANY" | "TENANT" | "SYSTEM";
type ValueType = "STRING" | "NUMBER" | "BOOLEAN" | "DATE" | "DATETIME" | "JSON";

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_name: string;
  setting_short_key: string;
  value_type_id: string | null;
  value_type_key?: string;
  value_type_label?: string;
  default_value: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
}

interface EffectiveSettingResult {
  system_setting_id: string;
  setting_key: string;
  setting_name: string;
  setting_short_key: string;
  value_type_id: string | null;
  value_type_key: string | null;
  default_value: string | null;
  effective_value: string | null;
  local_value: string | null;
  source_level: SourceLevel;
}

// ============================================================================
// HELPERS
// ============================================================================

function getPostgresClient() {
  return createDbClient(
    process.env.Postgres_URL || '',
    process.env.Postgres_SERVICE_ROLE_KEY || ''
  );
}

function toNullableString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function validateSettingValue(value: string, typeKey: string | null): string | null {
  if (!typeKey || !value) return null;

  switch (typeKey.toUpperCase()) {
    case "NUMBER": {
      if (isNaN(Number(value))) {
        return `El valor '${value}' no es un número válido`;
      }
      break;
    }
    case "BOOLEAN": {
      const lower = value.toLowerCase();
      if (!["true", "false", "1", "0", "yes", "no"].includes(lower)) {
        return `El valor '${value}' no es un booleano válido (true/false)`;
      }
      break;
    }
    case "DATE": {
      if (isNaN(Date.parse(value))) {
        return `El valor '${value}' no es una fecha válida`;
      }
      break;
    }
    case "DATETIME": {
      if (isNaN(Date.parse(value))) {
        return `El valor '${value}' no es una fecha/hora válida`;
      }
      break;
    }
    case "JSON": {
      try {
        JSON.parse(value);
      } catch {
        return `El valor no es un JSON válido`;
      }
      break;
    }
  }
  return null;
}

async function getTypeKey(Postgres: any, valueTypeId: string | null): Promise<string | null> {
  if (!valueTypeId) return null;
  const { data } = await Postgres
    .from("lookup_values")
    .select("lookup_key")
    .eq("id", valueTypeId)
    .single();
  return data?.lookup_key ?? null;
}

// ============================================================================
// CATÁLOGO MAESTRO — system_settings
// ============================================================================

router.get('/system-settings', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgresClient();
    const activeOnly = req.query.active_only === 'true';

    let query = Postgres
      .from("system_settings")
      .select(`
        *,
        value_type:lookup_values!system_settings_value_type_fkey (
          id,
          lookup_key,
          lookup_label,
          lookup_short_label
        )
      `)
      .order("setting_key", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.status(200).json({ settings: data ?? [] });
  } catch (err: any) {
    console.error("❌ [getSystemSettings]", err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/system-settings', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { setting_key, setting_name, setting_short_key, value_type_id, default_value, is_active, created_by } = body;

    if (!setting_key?.trim()) return res.status(400).json({ error: "setting_key es obligatorio" });
    if (!setting_name?.trim()) return res.status(400).json({ error: "setting_name es obligatorio" });
    if (!setting_short_key?.trim()) return res.status(400).json({ error: "setting_short_key es obligatorio" });

    if (!/^[A-Z0-9_]{2,}$/.test(setting_key.trim())) {
      return res.status(400).json({
        error: "setting_key debe tener solo mayúsculas, números y guiones bajos (mínimo 2 caracteres)"
      });
    }

    const Postgres = getPostgresClient();

    if (default_value && value_type_id) {
      const typeKey = await getTypeKey(Postgres, value_type_id);
      const validationError = validateSettingValue(default_value, typeKey);
      if (validationError) {
        return res.status(400).json({ error: `Valor por defecto inválido: ${validationError}` });
      }
    }

    const { data, error } = await Postgres
      .from("system_settings")
      .insert({
        setting_key: setting_key.trim().toUpperCase(),
        setting_name: setting_name.trim(),
        setting_short_key: setting_short_key.trim().toUpperCase(),
        value_type_id: value_type_id || null,
        default_value: default_value ?? null,
        is_active: is_active !== false,
        created_by: created_by || "ADMIN",
      })
      .select(`
        *,
        value_type:lookup_values!system_settings_value_type_fkey (
          id, lookup_key, lookup_label
        )
      `)
      .single();

    if (error) {
      if ((error as any).code === "23505") {
        return res.status(409).json({ error: `El parámetro '${setting_key}' ya existe en el catálogo` });
      }
      throw error;
    }

    console.log(`✅ [createSystemSetting] Creado: ${setting_key}`);
    return res.status(201).json({ setting: data });
  } catch (err: any) {
    console.error("❌ [createSystemSetting]", err);
    return res.status(500).json({ error: err.message });
  }
});

router.put('/system-settings/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const { setting_name, setting_short_key, value_type_id, default_value, is_active, updated_by } = body;

    if (!setting_name?.trim()) return res.status(400).json({ error: "setting_name es obligatorio" });
    if (!setting_short_key?.trim()) return res.status(400).json({ error: "setting_short_key es obligatorio" });

    const Postgres = getPostgresClient();

    if (default_value && value_type_id) {
      const typeKey = await getTypeKey(Postgres, value_type_id);
      const validationError = validateSettingValue(default_value, typeKey);
      if (validationError) {
        return res.status(400).json({ error: `Valor por defecto inválido: ${validationError}` });
      }
    }

    const { data, error } = await Postgres
      .from("system_settings")
      .update({
        setting_name: setting_name.trim(),
        setting_short_key: setting_short_key.trim().toUpperCase(),
        value_type_id: value_type_id || null,
        default_value: default_value ?? null,
        is_active: is_active !== false,
        updated_by: updated_by || "ADMIN",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        *,
        value_type:lookup_values!system_settings_value_type_fkey (
          id, lookup_key, lookup_label
        )
      `)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Parámetro no encontrado" });

    console.log(`✅ [updateSystemSetting] Actualizado: ${data.setting_key}`);
    return res.status(200).json({ setting: data });
  } catch (err: any) {
    console.error("❌ [updateSystemSetting]", err);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// RESOLUCIÓN DE VALOR EFECTIVO
// ============================================================================

router.get('/effective', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenant_id as string;
    const settingKey = req.query.setting_key as string;
    const companyId = req.query.company_id as string;
    const profileId = req.query.profile_id as string;

    if (!tenantId) return res.status(400).json({ error: "tenant_id es obligatorio" });
    if (!settingKey) return res.status(400).json({ error: "setting_key es obligatorio" });

    const Postgres = getPostgresClient();
    const result = await resolveEffectiveSetting(Postgres, {
      tenantId, companyId, profileId, settingKey,
    });

    if (!result) return res.status(404).json({ error: `Parámetro '${settingKey}' no encontrado` });
    return res.status(200).json({ effective_setting: result });
  } catch (err: any) {
    console.error("❌ [getEffectiveSetting]", err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/all-effective', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenant_id as string;
    const companyId = req.query.company_id as string;
    const profileId = req.query.profile_id as string;

    if (!tenantId) return res.status(400).json({ error: "tenant_id es obligatorio" });

    const Postgres = getPostgresClient();

    const { data: allSettings, error: settingsError } = await Postgres
      .from("system_settings")
      .select("*, value_type:lookup_values!system_settings_value_type_fkey(lookup_key)")
      .eq("is_active", true)
      .order("setting_key");

    if (settingsError) throw settingsError;
    if (!allSettings || allSettings.length === 0) {
      return res.status(200).json({ effective_settings: [] });
    }

    const [tenantOverrides, companyOverrides, profileOverrides] = await Promise.all([
      Postgres
        .from("tenant_settings")
        .select("system_setting_id, setting_value, is_active")
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
      companyId
        ? Postgres
            .from("company_settings")
            .select("system_setting_id, setting_value, is_active")
            .eq("company_id", companyId)
            .eq("is_active", true)
        : Promise.resolve({ data: [], error: null }),
      profileId
        ? Postgres
            .from("employee_profile_settings")
            .select("system_setting_id, setting_value, is_active")
            .eq("employee_profile_id", profileId)
            .eq("tenant_id", tenantId)
            .eq("is_active", true)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const tenantMap = new Map<string, string | null>(
      (tenantOverrides.data ?? []).map((r: any) => [r.system_setting_id, toNullableString(r.setting_value)])
    );
    const companyMap = new Map<string, string | null>(
      (companyOverrides.data ?? []).map((r: any) => [r.system_setting_id, toNullableString(r.setting_value)])
    );
    const profileMap = new Map<string, string | null>(
      (profileOverrides.data ?? []).map((r: any) => [r.system_setting_id, toNullableString(r.setting_value)])
    );

    const results: EffectiveSettingResult[] = allSettings.map((ss: any) => {
      let effectiveValue: string | null = ss.default_value;
      let localValue: string | null = null;
      let sourceLevel: SourceLevel = "SYSTEM";

      if (tenantMap.has(ss.id)) {
        effectiveValue = tenantMap.get(ss.id) ?? ss.default_value;
        localValue = effectiveValue;
        sourceLevel = "TENANT";
      }
      if (companyMap.has(ss.id)) {
        effectiveValue = companyMap.get(ss.id) ?? effectiveValue;
        localValue = effectiveValue;
        sourceLevel = "COMPANY";
      }
      if (profileMap.has(ss.id)) {
        effectiveValue = profileMap.get(ss.id) ?? effectiveValue;
        localValue = effectiveValue;
        sourceLevel = "PROFILE";
      }

      return {
        system_setting_id: ss.id,
        setting_key: ss.setting_key,
        setting_name: ss.setting_name,
        setting_short_key: ss.setting_short_key,
        value_type_id: ss.value_type_id,
        value_type_key: ss.value_type?.lookup_key ?? null,
        default_value: ss.default_value,
        effective_value: effectiveValue,
        local_value: localValue,
        source_level: sourceLevel,
      };
    });

    return res.status(200).json({ effective_settings: results });
  } catch (err: any) {
    console.error("❌ [getAllEffectiveSettings]", err);
    return res.status(500).json({ error: err.message });
  }
});

async function resolveEffectiveSetting(
  Postgres: any,
  opts: { tenantId: string; companyId?: string | null; profileId?: string | null; settingKey: string }
): Promise<EffectiveSettingResult | null> {
  const { tenantId, companyId, profileId, settingKey } = opts;

  const { data: ss, error: ssError } = await Postgres
    .from("system_settings")
    .select("*, value_type:lookup_values!system_settings_value_type_fkey(lookup_key)")
    .eq("setting_key", settingKey)
    .eq("is_active", true)
    .single();

  if (ssError || !ss) return null;

  let effectiveValue: string | null = ss.default_value;
  let localValue: string | null = null;
  let sourceLevel: SourceLevel = "SYSTEM";

  const { data: tenantOverride } = await Postgres
    .from("tenant_settings")
    .select("setting_value")
    .eq("tenant_id", tenantId)
    .eq("system_setting_id", ss.id)
    .eq("is_active", true)
    .maybeSingle();

  if (tenantOverride) {
    effectiveValue = toNullableString(tenantOverride.setting_value) ?? effectiveValue;
    localValue = effectiveValue;
    sourceLevel = "TENANT";
  }

  if (companyId) {
    const { data: companyOverride } = await Postgres
      .from("company_settings")
      .select("setting_value")
      .eq("company_id", companyId)
      .eq("system_setting_id", ss.id)
      .eq("is_active", true)
      .maybeSingle();

    if (companyOverride) {
      effectiveValue = toNullableString(companyOverride.setting_value) ?? effectiveValue;
      localValue = effectiveValue;
      sourceLevel = "COMPANY";
    }
  }

  if (profileId) {
    const { data: profileOverride } = await Postgres
      .from("employee_profile_settings")
      .select("setting_value")
      .eq("employee_profile_id", profileId)
      .eq("tenant_id", tenantId)
      .eq("system_setting_id", ss.id)
      .eq("is_active", true)
      .maybeSingle();

    if (profileOverride) {
      effectiveValue = toNullableString(profileOverride.setting_value) ?? effectiveValue;
      localValue = effectiveValue;
      sourceLevel = "PROFILE";
    }
  }

  return {
    system_setting_id: ss.id,
    setting_key: ss.setting_key,
    setting_name: ss.setting_name,
    setting_short_key: ss.setting_short_key,
    value_type_id: ss.value_type_id,
    value_type_key: ss.value_type?.lookup_key ?? null,
    default_value: ss.default_value,
    effective_value: effectiveValue,
    local_value: localValue,
    source_level: sourceLevel,
  };
}

// ============================================================================
// OVERRIDES — NIVEL TENANT
// ============================================================================

router.get('/tenants/:id/settings-overrides', async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.id;
    const Postgres = getPostgresClient();

    const { data, error } = await Postgres
      .from("tenant_settings")
      .select(`
        id,
        tenant_id,
        system_setting_id,
        setting_value,
        is_active,
        created_by,
        created_at,
        updated_by,
        updated_at,
        system_setting:system_settings (
          id,
          setting_key,
          setting_name,
          setting_short_key,
          default_value,
          is_active,
          value_type:lookup_values!system_settings_value_type_fkey (
            lookup_key, lookup_label
          )
        )
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.status(200).json({ overrides: data ?? [] });
  } catch (err: any) {
    console.error("❌ [getTenantSettingOverrides]", err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/tenants/:id/settings-overrides', async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.id;
    const body = req.body;
    const { system_setting_id, setting_value, created_by, is_active } = body;

    if (!system_setting_id) return res.status(400).json({ error: "system_setting_id es obligatorio" });
    if (setting_value === undefined || setting_value === null) {
      return res.status(400).json({ error: "setting_value es obligatorio. Para heredar, usar DELETE." });
    }

    const Postgres = getPostgresClient();

    const { data: ss, error: ssErr } = await Postgres
      .from("system_settings")
      .select("id, setting_key, value_type_id, value_type:lookup_values!system_settings_value_type_fkey(lookup_key)")
      .eq("id", system_setting_id)
      .eq("is_active", true)
      .single();

    if (ssErr || !ss) {
      return res.status(400).json({ error: "Parámetro no encontrado o inactivo en el catálogo" });
    }

    const valueType = (ss as any).value_type;
    const typeKey = Array.isArray(valueType) ? valueType[0]?.lookup_key ?? null : valueType?.lookup_key ?? null;
    const validationError = validateSettingValue(String(setting_value), typeKey);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { data: existing } = await Postgres
      .from("tenant_settings")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("system_setting_id", system_setting_id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await Postgres
        .from("tenant_settings")
        .update({
          setting_value: String(setting_value),
          is_active: is_active !== false,
          updated_by: created_by || "ADMIN",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await Postgres
        .from("tenant_settings")
        .insert({
          tenant_id: tenantId,
          system_setting_id,
          setting_value: String(setting_value),
          is_active: is_active !== false,
          created_by: created_by || "ADMIN",
        })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    console.log(`✅ [upsertTenantSettingOverride] Upsert override ${ss.setting_key} para tenant ${tenantId}`);
    return res.status(200).json({ override: result });
  } catch (err: any) {
    console.error("❌ [upsertTenantSettingOverride]", err);
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/tenants/:id/settings-overrides/:setting_id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.id;
    const settingId = req.params.setting_id;
    const Postgres = getPostgresClient();

    const { error } = await Postgres
      .from("tenant_settings")
      .delete()
      .eq("id", settingId)
      .eq("tenant_id", tenantId);

    if (error) throw error;
    console.log(`✅ [deleteTenantSettingOverride] Override eliminado (herencia restaurada)`);
    return res.status(200).json({ success: true, message: "Override eliminado. El parámetro ahora hereda del sistema." });
  } catch (err: any) {
    console.error("❌ [deleteTenantSettingOverride]", err);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// OVERRIDES — NIVEL COMPANY
// ============================================================================

router.get('/companies/:id/settings-overrides', async (req: Request, res: Response) => {
  try {
    const companyId = req.params.id;
    const Postgres = getPostgresClient();

    const { data, error } = await Postgres
      .from("company_settings")
      .select(`
        id,
        tenant_id,
        company_id,
        system_setting_id,
        setting_value,
        is_active,
        created_by,
        created_at,
        updated_by,
        updated_at,
        system_setting:system_settings (
          id,
          setting_key,
          setting_name,
          setting_short_key,
          default_value,
          is_active,
          value_type:lookup_values!system_settings_value_type_fkey (
            lookup_key, lookup_label
          )
        )
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.status(200).json({ overrides: data ?? [] });
  } catch (err: any) {
    console.error("❌ [getCompanySettingOverrides]", err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/companies/:id/settings-overrides', async (req: Request, res: Response) => {
  try {
    const companyId = req.params.id;
    const body = req.body;
    const { system_setting_id, setting_value, tenant_id, created_by, is_active } = body;

    if (!system_setting_id) return res.status(400).json({ error: "system_setting_id es obligatorio" });
    if (!tenant_id) return res.status(400).json({ error: "tenant_id es obligatorio" });
    if (setting_value === undefined || setting_value === null) {
      return res.status(400).json({ error: "setting_value es obligatorio. Para heredar, usar DELETE." });
    }

    const Postgres = getPostgresClient();

    const { data: ss, error: ssErr } = await Postgres
      .from("system_settings")
      .select("id, setting_key, value_type:lookup_values!system_settings_value_type_fkey(lookup_key)")
      .eq("id", system_setting_id)
      .eq("is_active", true)
      .single();

    if (ssErr || !ss) {
      return res.status(400).json({ error: "Parámetro no encontrado o inactivo en el catálogo" });
    }

    const valueType = (ss as any).value_type;
    const typeKey = Array.isArray(valueType) ? valueType[0]?.lookup_key ?? null : valueType?.lookup_key ?? null;
    const validationError = validateSettingValue(String(setting_value), typeKey);
    if (validationError) return res.status(400).json({ error: validationError });

    const { data: existing } = await Postgres
      .from("company_settings")
      .select("id")
      .eq("company_id", companyId)
      .eq("system_setting_id", system_setting_id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await Postgres
        .from("company_settings")
        .update({
          setting_value: String(setting_value),
          is_active: is_active !== false,
          updated_by: created_by || "ADMIN",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await Postgres
        .from("company_settings")
        .insert({
          tenant_id,
          company_id: companyId,
          system_setting_id,
          setting_value: String(setting_value),
          is_active: is_active !== false,
          created_by: created_by || "ADMIN",
        })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    console.log(`✅ [upsertCompanySettingOverride] Upsert override ${ss.setting_key} para empresa ${companyId}`);
    return res.status(200).json({ override: result });
  } catch (err: any) {
    console.error("❌ [upsertCompanySettingOverride]", err);
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/companies/:id/settings-overrides/:setting_id', async (req: Request, res: Response) => {
  try {
    const companyId = req.params.id;
    const settingId = req.params.setting_id;
    const Postgres = getPostgresClient();

    const { error } = await Postgres
      .from("company_settings")
      .delete()
      .eq("id", settingId)
      .eq("company_id", companyId);

    if (error) throw error;
    return res.status(200).json({ success: true, message: "Override eliminado. El parámetro ahora hereda del tenant/sistema." });
  } catch (err: any) {
    console.error("❌ [deleteCompanySettingOverride]", err);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// OVERRIDES — NIVEL EMPLOYEE PROFILE
// ============================================================================

router.get('/employee-profiles/:id/settings-overrides', async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const tenantId = req.query.tenant_id as string;
    const Postgres = getPostgresClient();

    if (!tenantId) return res.status(400).json({ error: "tenant_id es obligatorio" });

    const { data, error } = await Postgres
      .from("employee_profile_settings")
      .select(`
        id,
        tenant_id,
        company_id,
        employee_profile_id,
        system_setting_id,
        setting_value,
        is_active,
        created_by,
        created_at,
        updated_by,
        updated_at,
        system_setting:system_settings (
          id,
          setting_key,
          setting_name,
          setting_short_key,
          default_value,
          is_active,
          value_type:lookup_values!system_settings_value_type_fkey (
            lookup_key, lookup_label
          )
        )
      `)
      .eq("employee_profile_id", profileId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.status(200).json({ overrides: data ?? [] });
  } catch (err: any) {
    console.error("❌ [getProfileSettingOverrides]", err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/employee-profiles/:id/settings-overrides', async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const body = req.body;
    const { system_setting_id, setting_value, tenant_id, company_id, created_by, is_active } = body;

    if (!system_setting_id) return res.status(400).json({ error: "system_setting_id es obligatorio" });
    if (!tenant_id) return res.status(400).json({ error: "tenant_id es obligatorio" });
    if (setting_value === undefined || setting_value === null) {
      return res.status(400).json({ error: "setting_value es obligatorio. Para heredar, usar DELETE." });
    }

    const Postgres = getPostgresClient();

    const { data: ss, error: ssErr } = await Postgres
      .from("system_settings")
      .select("id, setting_key, value_type:lookup_values!system_settings_value_type_fkey(lookup_key)")
      .eq("id", system_setting_id)
      .eq("is_active", true)
      .single();

    if (ssErr || !ss) {
      return res.status(400).json({ error: "Parámetro no encontrado o inactivo en el catálogo" });
    }

    const valueType = (ss as any).value_type;
    const typeKey = Array.isArray(valueType) ? valueType[0]?.lookup_key ?? null : valueType?.lookup_key ?? null;
    const validationError = validateSettingValue(String(setting_value), typeKey);
    if (validationError) return res.status(400).json({ error: validationError });

    const { data: existing } = await Postgres
      .from("employee_profile_settings")
      .select("id")
      .eq("employee_profile_id", profileId)
      .eq("tenant_id", tenant_id)
      .eq("system_setting_id", system_setting_id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await Postgres
        .from("employee_profile_settings")
        .update({
          setting_value: String(setting_value),
          company_id: company_id || null,
          is_active: is_active !== false,
          updated_by: created_by || "ADMIN",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await Postgres
        .from("employee_profile_settings")
        .insert({
          tenant_id,
          company_id: company_id || null,
          employee_profile_id: profileId,
          system_setting_id,
          setting_value: String(setting_value),
          is_active: is_active !== false,
          created_by: created_by || "ADMIN",
        })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    console.log(`✅ [upsertProfileSettingOverride] Upsert override ${ss.setting_key} para perfil ${profileId}`);
    return res.status(200).json({ override: result });
  } catch (err: any) {
    console.error("❌ [upsertProfileSettingOverride]", err);
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/employee-profiles/:id/settings-overrides/:setting_id', async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const settingId = req.params.setting_id;
    const tenantId = req.query.tenant_id as string;
    const Postgres = getPostgresClient();

    let query = Postgres
      .from("employee_profile_settings")
      .delete()
      .eq("id", settingId)
      .eq("employee_profile_id", profileId);

    if (tenantId) query = query.eq("tenant_id", tenantId);

    const { error } = await query;
    if (error) throw error;
    return res.status(200).json({ success: true, message: "Override eliminado. El parámetro ahora hereda del nivel superior." });
  } catch (err: any) {
    console.error("❌ [deleteProfileSettingOverride]", err);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// ENDPOINT DE TIPOS DE DATO
// ============================================================================

router.get('/lookup-values/setting-data-types', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgresClient();

    const { data: dataTypeGroup } = await Postgres
      .from("lookup_groups")
      .select("id")
      .eq("lookup_group_key", "DATA_TYPE")
      .limit(1)
      .single();

    if (!dataTypeGroup) {
      return res.status(200).json({ dataTypes: [] });
    }

    const { data, error } = await Postgres
      .from("lookup_values")
      .select("id, lookup_key, lookup_label, lookup_short_label")
      .eq("is_active", true)
      .eq("lookup_group_id", dataTypeGroup.id)
      .order("sort_order");

    if (error) throw error;
    return res.status(200).json({ dataTypes: data ?? [] });
  } catch (err: any) {
    console.error("❌ [getSettingDataTypes]", err);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// ENDPOINT DE VERIFICACIÓN / TESTS
// ============================================================================

router.get('/verify', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgresClient();
    const results: Record<string, any> = {};

    const { data: allSettings, error: e1 } = await Postgres
      .from("system_settings")
      .select("id, setting_key, value_type_id, default_value")
      .limit(100);
    results.test1_system_settings_exists = !e1;
    results.system_settings_count = allSettings?.length ?? 0;
    if (e1) results.test1_error = e1.message;

    const { data: ts, error: e3 } = await Postgres
      .from("tenant_settings")
      .select("id, system_setting_id, setting_value")
      .limit(5);
    results.test3_tenant_settings_has_system_setting_id = !e3;
    results.tenant_settings_count = ts?.length ?? 0;
    if (e3) results.test3_error = e3.message;

    if (allSettings && allSettings.length > 0) {
      const { data: tenantData } = await Postgres
        .from("tenants")
        .select("id")
        .eq("tenant_key", "SYSTEM")
        .single();

      if (tenantData) {
        const firstKey = allSettings[0].setting_key;
        const effective = await resolveEffectiveSetting(Postgres, {
          tenantId: tenantData.id,
          settingKey: firstKey,
        });
        results.test4_hierarchy_resolution = {
          setting_key: firstKey,
          source_level: effective?.source_level,
          effective_value: effective?.effective_value,
          passed: !!effective && effective.source_level === "SYSTEM",
        };
      }
    }

    const numError = validateSettingValue("abc", "NUMBER");
    const numOk = validateSettingValue("42.5", "NUMBER");
    const boolErr = validateSettingValue("maybe", "BOOLEAN");
    const boolOk = validateSettingValue("true", "BOOLEAN");
    results.test5_type_validation = {
      number_invalid: numError !== null,
      number_valid: numOk === null,
      boolean_invalid: boolErr !== null,
      boolean_valid: boolOk === null,
      passed: numError !== null && numOk === null && boolErr !== null && boolOk === null,
    };

    const allPassed = results.test1_system_settings_exists &&
                      results.test3_tenant_settings_has_system_setting_id &&
                      (results.test5_type_validation?.passed ?? false);

    return res.status(200).json({
      summary: allPassed ? "✅ Modelo de parámetros verificado correctamente" : "⚠️ Algunos tests fallaron",
      all_passed: allPassed,
      results,
    });
  } catch (err: any) {
    console.error("❌ [verifySettingsModel]", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;

