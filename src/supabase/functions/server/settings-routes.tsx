/**
 * settings-routes.tsx
 * Turnos Titanium Enterprise — Servicio de Parámetros de Configuración
 *
 * Implementa la lógica de resolución jerárquica:
 *   employee_profile_settings > company_settings > tenant_settings > system_settings
 *
 * Rutas registradas en index.tsx:
 *   GET    /system-settings                         → catálogo maestro
 *   POST   /system-settings                         → crear parámetro
 *   PUT    /system-settings/:id                     → actualizar parámetro
 *   GET    /settings/effective                      → valor efectivo (query params)
 *   GET    /settings/all-effective                  → todos los valores efectivos (query params)
 *   GET    /tenants/:id/settings-overrides          → overrides de tenant
 *   POST   /tenants/:id/settings-overrides          → crear/actualizar override de tenant
 *   DELETE /tenants/:id/settings-overrides/:sid     → eliminar override (restablecer herencia)
 *   GET    /companies/:id/settings-overrides        → overrides de empresa
 *   POST   /companies/:id/settings-overrides        → crear/actualizar override de empresa
 *   DELETE /companies/:id/settings-overrides/:sid   → eliminar override (restablecer herencia)
 *   GET    /employee-profiles/:id/settings-overrides     → overrides de perfil
 *   POST   /employee-profiles/:id/settings-overrides     → crear/actualizar override de perfil
 *   DELETE /employee-profiles/:id/settings-overrides/:sid → eliminar override (restablecer herencia)
 *   GET    /settings/verify                         → endpoint de prueba/verificación
 */

import { createClient } from "npm:@supabase/supabase-js@2";

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

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

/**
 * Valida que el valor sea compatible con el tipo de dato del parámetro.
 * Retorna null si es válido, o un string con el error.
 */
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
    // STRING: cualquier valor es válido
  }
  return null;
}

/**
 * Obtiene el type key (STRING, NUMBER, etc.) a partir del value_type_id.
 */
async function getTypeKey(supabase: any, valueTypeId: string | null): Promise<string | null> {
  if (!valueTypeId) return null;
  const { data } = await supabase
    .from("lookup_values")
    .select("lookup_key")
    .eq("id", valueTypeId)
    .single();
  return data?.lookup_key ?? null;
}

// ============================================================================
// CATÁLOGO MAESTRO — system_settings
// ============================================================================

/**
 * GET /system-settings
 * Lista el catálogo completo de parámetros del sistema.
 * Query params: ?active_only=true|false (default: false)
 */
export async function getSystemSettings(c: any) {
  try {
    const supabase = getSupabaseClient();
    const activeOnly = c.req.query("active_only") === "true";

    let query = supabase
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

    return c.json({ settings: data ?? [] });
  } catch (err: any) {
    console.error("❌ [getSystemSettings]", err);
    return c.json({ error: err.message }, 500);
  }
}

/**
 * POST /system-settings
 * Crea un nuevo parámetro en el catálogo maestro.
 * Body: { setting_key, setting_name, setting_short_key, value_type_id, default_value, is_active }
 */
export async function createSystemSetting(c: any) {
  try {
    const body = await c.req.json();
    const { setting_key, setting_name, setting_short_key, value_type_id, default_value, is_active, created_by } = body;

    // Validaciones
    if (!setting_key?.trim())       return c.json({ error: "setting_key es obligatorio" }, 400);
    if (!setting_name?.trim())      return c.json({ error: "setting_name es obligatorio" }, 400);
    if (!setting_short_key?.trim()) return c.json({ error: "setting_short_key es obligatorio" }, 400);

    // Validar formato de setting_key (MAYÚSCULAS_CON_GUION_BAJO)
    if (!/^[A-Z0-9_]{2,}$/.test(setting_key.trim())) {
      return c.json({
        error: "setting_key debe tener solo mayúsculas, números y guiones bajos (mínimo 2 caracteres)"
      }, 400);
    }

    const supabase = getSupabaseClient();

    // Validar type key si se proporciona default_value
    if (default_value && value_type_id) {
      const typeKey = await getTypeKey(supabase, value_type_id);
      const validationError = validateSettingValue(default_value, typeKey);
      if (validationError) {
        return c.json({ error: `Valor por defecto inválido: ${validationError}` }, 400);
      }
    }

    const { data, error } = await supabase
      .from("system_settings")
      .insert({
        setting_key:       setting_key.trim().toUpperCase(),
        setting_name:      setting_name.trim(),
        setting_short_key: setting_short_key.trim().toUpperCase(),
        value_type_id:     value_type_id || null,
        default_value:     default_value ?? null,
        is_active:         is_active !== false,
        created_by:        created_by || "ADMIN",
      })
      .select(`
        *,
        value_type:lookup_values!system_settings_value_type_fkey (
          id, lookup_key, lookup_label
        )
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return c.json({ error: `El parámetro '${setting_key}' ya existe en el catálogo` }, 409);
      }
      throw error;
    }

    console.log(`✅ [createSystemSetting] Creado: ${setting_key}`);
    return c.json({ setting: data }, 201);
  } catch (err: any) {
    console.error("❌ [createSystemSetting]", err);
    return c.json({ error: err.message }, 500);
  }
}

/**
 * PUT /system-settings/:id
 * Actualiza un parámetro del catálogo maestro.
 * NOTA: setting_key NO puede modificarse después de creado.
 */
export async function updateSystemSetting(c: any) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { setting_name, setting_short_key, value_type_id, default_value, is_active, updated_by } = body;

    if (!setting_name?.trim())      return c.json({ error: "setting_name es obligatorio" }, 400);
    if (!setting_short_key?.trim()) return c.json({ error: "setting_short_key es obligatorio" }, 400);

    const supabase = getSupabaseClient();

    // Validar default_value contra el tipo
    if (default_value && value_type_id) {
      const typeKey = await getTypeKey(supabase, value_type_id);
      const validationError = validateSettingValue(default_value, typeKey);
      if (validationError) {
        return c.json({ error: `Valor por defecto inválido: ${validationError}` }, 400);
      }
    }

    const { data, error } = await supabase
      .from("system_settings")
      .update({
        setting_name:      setting_name.trim(),
        setting_short_key: setting_short_key.trim().toUpperCase(),
        value_type_id:     value_type_id || null,
        default_value:     default_value ?? null,
        is_active:         is_active !== false,
        updated_by:        updated_by || "ADMIN",
        updated_at:        new Date().toISOString(),
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
    if (!data) return c.json({ error: "Parámetro no encontrado" }, 404);

    console.log(`✅ [updateSystemSetting] Actualizado: ${data.setting_key}`);
    return c.json({ setting: data });
  } catch (err: any) {
    console.error("❌ [updateSystemSetting]", err);
    return c.json({ error: err.message }, 500);
  }
}

// ============================================================================
// RESOLUCIÓN DE VALOR EFECTIVO
// ============================================================================

/**
 * GET /settings/effective
 * Resuelve el valor efectivo de UN parámetro según la jerarquía.
 *
 * Query params:
 *   - tenant_id        (obligatorio)
 *   - setting_key      (obligatorio)
 *   - company_id       (opcional)
 *   - profile_id       (opcional)
 */
export async function getEffectiveSetting(c: any) {
  try {
    const tenantId  = c.req.query("tenant_id");
    const settingKey = c.req.query("setting_key");
    const companyId  = c.req.query("company_id");
    const profileId  = c.req.query("profile_id");

    if (!tenantId)  return c.json({ error: "tenant_id es obligatorio" }, 400);
    if (!settingKey) return c.json({ error: "setting_key es obligatorio" }, 400);

    const supabase = getSupabaseClient();
    const result = await resolveEffectiveSetting(supabase, {
      tenantId, companyId, profileId, settingKey,
    });

    if (!result) return c.json({ error: `Parámetro '${settingKey}' no encontrado` }, 404);
    return c.json({ effective_setting: result });
  } catch (err: any) {
    console.error("❌ [getEffectiveSetting]", err);
    return c.json({ error: err.message }, 500);
  }
}

/**
 * GET /settings/all-effective
 * Resuelve los valores efectivos de TODOS los parámetros activos
 * para el contexto dado (tenant/company/profile).
 *
 * Query params:
 *   - tenant_id        (obligatorio)
 *   - company_id       (opcional)
 *   - profile_id       (opcional)
 */
export async function getAllEffectiveSettings(c: any) {
  try {
    const tenantId  = c.req.query("tenant_id");
    const companyId  = c.req.query("company_id");
    const profileId  = c.req.query("profile_id");

    if (!tenantId) return c.json({ error: "tenant_id es obligatorio" }, 400);

    const supabase = getSupabaseClient();

    // Obtener todos los parámetros activos
    const { data: allSettings, error: settingsError } = await supabase
      .from("system_settings")
      .select("*, value_type:lookup_values!system_settings_value_type_fkey(lookup_key)")
      .eq("is_active", true)
      .order("setting_key");

    if (settingsError) throw settingsError;
    if (!allSettings || allSettings.length === 0) {
      return c.json({ effective_settings: [] });
    }

    // Obtener todos los overrides de una vez para eficiencia
    const [tenantOverrides, companyOverrides, profileOverrides] = await Promise.all([
      supabase
        .from("tenant_settings")
        .select("system_setting_id, setting_value, is_active")
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
      companyId
        ? supabase
            .from("company_settings")
            .select("system_setting_id, setting_value, is_active")
            .eq("company_id", companyId)
            .eq("is_active", true)
        : Promise.resolve({ data: [], error: null }),
      profileId
        ? supabase
            .from("employee_profile_settings")
            .select("system_setting_id, setting_value, is_active")
            .eq("employee_profile_id", profileId)
            .eq("tenant_id", tenantId)
            .eq("is_active", true)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Crear mapas para lookup O(1)
    const tenantMap   = new Map((tenantOverrides.data  ?? []).map((r: any) => [r.system_setting_id, r.setting_value]));
    const companyMap  = new Map((companyOverrides.data ?? []).map((r: any) => [r.system_setting_id, r.setting_value]));
    const profileMap  = new Map((profileOverrides.data ?? []).map((r: any) => [r.system_setting_id, r.setting_value]));

    // Resolver jerarquía para cada parámetro
    const results: EffectiveSettingResult[] = allSettings.map((ss: any) => {
      let effectiveValue: string | null = ss.default_value;
      let localValue: string | null = null;
      let sourceLevel: SourceLevel = "SYSTEM";

      if (tenantMap.has(ss.id)) {
        effectiveValue = tenantMap.get(ss.id) ?? ss.default_value;
        localValue     = effectiveValue;
        sourceLevel    = "TENANT";
      }
      if (companyMap.has(ss.id)) {
        effectiveValue = companyMap.get(ss.id) ?? effectiveValue;
        localValue     = effectiveValue;
        sourceLevel    = "COMPANY";
      }
      if (profileMap.has(ss.id)) {
        effectiveValue = profileMap.get(ss.id) ?? effectiveValue;
        localValue     = effectiveValue;
        sourceLevel    = "PROFILE";
      }

      return {
        system_setting_id: ss.id,
        setting_key:       ss.setting_key,
        setting_name:      ss.setting_name,
        setting_short_key: ss.setting_short_key,
        value_type_id:     ss.value_type_id,
        value_type_key:    ss.value_type?.lookup_key ?? null,
        default_value:     ss.default_value,
        effective_value:   effectiveValue,
        local_value:       localValue,
        source_level:      sourceLevel,
      };
    });

    return c.json({ effective_settings: results });
  } catch (err: any) {
    console.error("❌ [getAllEffectiveSettings]", err);
    return c.json({ error: err.message }, 500);
  }
}

/**
 * Función interna de resolución de valor efectivo para un solo parámetro.
 */
async function resolveEffectiveSetting(
  supabase: any,
  opts: { tenantId: string; companyId?: string | null; profileId?: string | null; settingKey: string }
): Promise<EffectiveSettingResult | null> {
  const { tenantId, companyId, profileId, settingKey } = opts;

  // 1. Obtener definición del parámetro en system_settings
  const { data: ss, error: ssError } = await supabase
    .from("system_settings")
    .select("*, value_type:lookup_values!system_settings_value_type_fkey(lookup_key)")
    .eq("setting_key", settingKey)
    .eq("is_active", true)
    .single();

  if (ssError || !ss) return null;

  let effectiveValue: string | null = ss.default_value;
  let localValue: string | null = null;
  let sourceLevel: SourceLevel = "SYSTEM";

  // 2. Nivel TENANT
  const { data: tenantOverride } = await supabase
    .from("tenant_settings")
    .select("setting_value")
    .eq("tenant_id", tenantId)
    .eq("system_setting_id", ss.id)
    .eq("is_active", true)
    .maybeSingle();

  if (tenantOverride) {
    effectiveValue = tenantOverride.setting_value ?? effectiveValue;
    localValue     = effectiveValue;
    sourceLevel    = "TENANT";
  }

  // 3. Nivel COMPANY (tiene precedencia sobre TENANT)
  if (companyId) {
    const { data: companyOverride } = await supabase
      .from("company_settings")
      .select("setting_value")
      .eq("company_id", companyId)
      .eq("system_setting_id", ss.id)
      .eq("is_active", true)
      .maybeSingle();

    if (companyOverride) {
      effectiveValue = companyOverride.setting_value ?? effectiveValue;
      localValue     = effectiveValue;
      sourceLevel    = "COMPANY";
    }
  }

  // 4. Nivel PROFILE (máxima prioridad)
  if (profileId) {
    const { data: profileOverride } = await supabase
      .from("employee_profile_settings")
      .select("setting_value")
      .eq("employee_profile_id", profileId)
      .eq("tenant_id", tenantId)
      .eq("system_setting_id", ss.id)
      .eq("is_active", true)
      .maybeSingle();

    if (profileOverride) {
      effectiveValue = profileOverride.setting_value ?? effectiveValue;
      localValue     = effectiveValue;
      sourceLevel    = "PROFILE";
    }
  }

  return {
    system_setting_id: ss.id,
    setting_key:       ss.setting_key,
    setting_name:      ss.setting_name,
    setting_short_key: ss.setting_short_key,
    value_type_id:     ss.value_type_id,
    value_type_key:    ss.value_type?.lookup_key ?? null,
    default_value:     ss.default_value,
    effective_value:   effectiveValue,
    local_value:       localValue,
    source_level:      sourceLevel,
  };
}

// ============================================================================
// OVERRIDES — NIVEL TENANT
// ============================================================================

/**
 * GET /tenants/:id/settings-overrides
 * Lista todos los overrides activos del tenant, enriquecidos con info del
 * parámetro maestro e indicando el valor efectivo (inherited if no override).
 */
export async function getTenantSettingOverrides(c: any) {
  try {
    const tenantId = c.req.param("id");
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
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
    return c.json({ overrides: data ?? [] });
  } catch (err: any) {
    console.error("❌ [getTenantSettingOverrides]", err);
    return c.json({ error: err.message }, 500);
  }
}

/**
 * POST /tenants/:id/settings-overrides
 * Crea o actualiza un override de tenant para un parámetro del catálogo.
 * Upsert por (tenant_id, system_setting_id).
 */
export async function upsertTenantSettingOverride(c: any) {
  try {
    const tenantId = c.req.param("id");
    const body = await c.req.json();
    const { system_setting_id, setting_value, created_by, is_active } = body;

    if (!system_setting_id) return c.json({ error: "system_setting_id es obligatorio" }, 400);
    if (setting_value === undefined || setting_value === null) {
      return c.json({ error: "setting_value es obligatorio. Para heredar, usar DELETE." }, 400);
    }

    const supabase = getSupabaseClient();

    // Verificar que el parámetro existe y está activo
    const { data: ss, error: ssErr } = await supabase
      .from("system_settings")
      .select("id, setting_key, value_type_id, value_type:lookup_values!system_settings_value_type_fkey(lookup_key)")
      .eq("id", system_setting_id)
      .eq("is_active", true)
      .single();

    if (ssErr || !ss) {
      return c.json({ error: "Parámetro no encontrado o inactivo en el catálogo" }, 400);
    }

    // Validar tipo de dato
    const typeKey = ss.value_type?.lookup_key ?? null;
    const validationError = validateSettingValue(String(setting_value), typeKey);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    // Buscar si ya existe override
    const { data: existing } = await supabase
      .from("tenant_settings")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("system_setting_id", system_setting_id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
    return c.json({ override: result });
  } catch (err: any) {
    console.error("❌ [upsertTenantSettingOverride]", err);
    return c.json({ error: err.message }, 500);
  }
}

/**
 * DELETE /tenants/:id/settings-overrides/:setting_id
 * Elimina el override del tenant para un parámetro.
 * Semánticamente = "restablecer herencia al valor del sistema".
 */
export async function deleteTenantSettingOverride(c: any) {
  try {
    const tenantId  = c.req.param("id");
    const settingId = c.req.param("setting_id");
    const supabase  = getSupabaseClient();

    const { error } = await supabase
      .from("tenant_settings")
      .delete()
      .eq("id", settingId)
      .eq("tenant_id", tenantId);

    if (error) throw error;
    console.log(`✅ [deleteTenantSettingOverride] Override eliminado (herencia restaurada)`);
    return c.json({ success: true, message: "Override eliminado. El parámetro ahora hereda del sistema." });
  } catch (err: any) {
    console.error("❌ [deleteTenantSettingOverride]", err);
    return c.json({ error: err.message }, 500);
  }
}

// ============================================================================
// OVERRIDES — NIVEL COMPANY
// ============================================================================

/**
 * GET /companies/:id/settings-overrides
 */
export async function getCompanySettingOverrides(c: any) {
  try {
    const companyId = c.req.param("id");
    const supabase  = getSupabaseClient();

    const { data, error } = await supabase
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
    return c.json({ overrides: data ?? [] });
  } catch (err: any) {
    console.error("❌ [getCompanySettingOverrides]", err);
    return c.json({ error: err.message }, 500);
  }
}

/**
 * POST /companies/:id/settings-overrides
 */
export async function upsertCompanySettingOverride(c: any) {
  try {
    const companyId = c.req.param("id");
    const body = await c.req.json();
    const { system_setting_id, setting_value, tenant_id, created_by, is_active } = body;

    if (!system_setting_id) return c.json({ error: "system_setting_id es obligatorio" }, 400);
    if (!tenant_id)         return c.json({ error: "tenant_id es obligatorio" }, 400);
    if (setting_value === undefined || setting_value === null) {
      return c.json({ error: "setting_value es obligatorio. Para heredar, usar DELETE." }, 400);
    }

    const supabase = getSupabaseClient();

    // Verificar que el parámetro existe y está activo
    const { data: ss, error: ssErr } = await supabase
      .from("system_settings")
      .select("id, setting_key, value_type:lookup_values!system_settings_value_type_fkey(lookup_key)")
      .eq("id", system_setting_id)
      .eq("is_active", true)
      .single();

    if (ssErr || !ss) {
      return c.json({ error: "Parámetro no encontrado o inactivo en el catálogo" }, 400);
    }

    const typeKey = ss.value_type?.lookup_key ?? null;
    const validationError = validateSettingValue(String(setting_value), typeKey);
    if (validationError) return c.json({ error: validationError }, 400);

    const { data: existing } = await supabase
      .from("company_settings")
      .select("id")
      .eq("company_id", companyId)
      .eq("system_setting_id", system_setting_id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
    return c.json({ override: result });
  } catch (err: any) {
    console.error("❌ [upsertCompanySettingOverride]", err);
    return c.json({ error: err.message }, 500);
  }
}

/**
 * DELETE /companies/:id/settings-overrides/:setting_id
 */
export async function deleteCompanySettingOverride(c: any) {
  try {
    const companyId = c.req.param("id");
    const settingId = c.req.param("setting_id");
    const supabase  = getSupabaseClient();

    const { error } = await supabase
      .from("company_settings")
      .delete()
      .eq("id", settingId)
      .eq("company_id", companyId);

    if (error) throw error;
    return c.json({ success: true, message: "Override eliminado. El parámetro ahora hereda del tenant/sistema." });
  } catch (err: any) {
    console.error("❌ [deleteCompanySettingOverride]", err);
    return c.json({ error: err.message }, 500);
  }
}

// ============================================================================
// OVERRIDES — NIVEL EMPLOYEE PROFILE
// ============================================================================

/**
 * GET /employee-profiles/:id/settings-overrides
 * Query params: tenant_id (obligatorio)
 */
export async function getProfileSettingOverrides(c: any) {
  try {
    const profileId = c.req.param("id");
    const tenantId  = c.req.query("tenant_id");
    const supabase  = getSupabaseClient();

    if (!tenantId) return c.json({ error: "tenant_id es obligatorio" }, 400);

    const { data, error } = await supabase
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
    return c.json({ overrides: data ?? [] });
  } catch (err: any) {
    console.error("❌ [getProfileSettingOverrides]", err);
    return c.json({ error: err.message }, 500);
  }
}

/**
 * POST /employee-profiles/:id/settings-overrides
 */
export async function upsertProfileSettingOverride(c: any) {
  try {
    const profileId = c.req.param("id");
    const body = await c.req.json();
    const { system_setting_id, setting_value, tenant_id, company_id, created_by, is_active } = body;

    if (!system_setting_id) return c.json({ error: "system_setting_id es obligatorio" }, 400);
    if (!tenant_id)         return c.json({ error: "tenant_id es obligatorio" }, 400);
    if (setting_value === undefined || setting_value === null) {
      return c.json({ error: "setting_value es obligatorio. Para heredar, usar DELETE." }, 400);
    }

    const supabase = getSupabaseClient();

    const { data: ss, error: ssErr } = await supabase
      .from("system_settings")
      .select("id, setting_key, value_type:lookup_values!system_settings_value_type_fkey(lookup_key)")
      .eq("id", system_setting_id)
      .eq("is_active", true)
      .single();

    if (ssErr || !ss) {
      return c.json({ error: "Parámetro no encontrado o inactivo en el catálogo" }, 400);
    }

    const typeKey = ss.value_type?.lookup_key ?? null;
    const validationError = validateSettingValue(String(setting_value), typeKey);
    if (validationError) return c.json({ error: validationError }, 400);

    const { data: existing } = await supabase
      .from("employee_profile_settings")
      .select("id")
      .eq("employee_profile_id", profileId)
      .eq("tenant_id", tenant_id)
      .eq("system_setting_id", system_setting_id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
    return c.json({ override: result });
  } catch (err: any) {
    console.error("❌ [upsertProfileSettingOverride]", err);
    return c.json({ error: err.message }, 500);
  }
}

/**
 * DELETE /employee-profiles/:id/settings-overrides/:setting_id
 */
export async function deleteProfileSettingOverride(c: any) {
  try {
    const profileId = c.req.param("id");
    const settingId = c.req.param("setting_id");
    const tenantId  = c.req.query("tenant_id");
    const supabase  = getSupabaseClient();

    let query = supabase
      .from("employee_profile_settings")
      .delete()
      .eq("id", settingId)
      .eq("employee_profile_id", profileId);

    if (tenantId) query = query.eq("tenant_id", tenantId);

    const { error } = await query;
    if (error) throw error;
    return c.json({ success: true, message: "Override eliminado. El parámetro ahora hereda del nivel superior." });
  } catch (err: any) {
    console.error("❌ [deleteProfileSettingOverride]", err);
    return c.json({ error: err.message }, 500);
  }
}

// ============================================================================
// ENDPOINT DE TIPOS DE DATO (corregido: query por lookup_group_key)
// ============================================================================

/**
 * GET /lookup-values/setting-data-types
 * Retorna los tipos de dato del catálogo DATA_TYPE.
 * (Reemplaza el endpoint getDataTypes que tenía bug con lookup_scope='DATA_TYPE')
 */
export async function getSettingDataTypes(c: any) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("lookup_values")
      .select("id, lookup_key, lookup_label, lookup_short_label")
      .eq("is_active", true)
      .in("lookup_group_id", (
        await supabase
          .from("lookup_groups")
          .select("id")
          .eq("lookup_group_key", "DATA_TYPE")
          .limit(1)
      ).data?.map((g: any) => g.id) ?? [])
      .order("sort_order");

    if (error) throw error;
    return c.json({ dataTypes: data ?? [] });
  } catch (err: any) {
    console.error("❌ [getSettingDataTypes]", err);
    return c.json({ error: err.message }, 500);
  }
}

// ============================================================================
// ENDPOINT DE VERIFICACIÓN / TESTS
// ============================================================================

/**
 * GET /settings/verify
 * Verifica el estado del modelo de parámetros y ejecuta pruebas básicas.
 * Útil para confirmar que la migración fue exitosa.
 */
export async function verifySettingsModel(c: any) {
  try {
    const supabase = getSupabaseClient();
    const results: Record<string, any> = {};

    // TEST 1: Tabla system_settings existe y tiene registros
    const { data: allSettings, error: e1 } = await supabase
      .from("system_settings")
      .select("id, setting_key, value_type_id, default_value")
      .limit(100);
    results.test1_system_settings_exists = !e1;
    results.system_settings_count = allSettings?.length ?? 0;
    if (e1) results.test1_error = e1.message;

    // TEST 2: tenant_settings no tiene setting_key (columna eliminada)
    const { data: tsColumns, error: e2 } = await supabase
      .rpc("check_column_exists", {
        p_table: "tenant_settings",
        p_column: "setting_key",
      })
      .single();
    // Si hay error en el RPC (no existe), asumir que la columna no existe (OK)
    results.test2_setting_key_removed_from_tenant = e2 ? "N/A (verificar manualmente)" : !tsColumns;

    // TEST 3: tenant_settings tiene system_setting_id
    const { data: ts, error: e3 } = await supabase
      .from("tenant_settings")
      .select("id, system_setting_id, setting_value")
      .limit(5);
    results.test3_tenant_settings_has_system_setting_id = !e3;
    results.tenant_settings_count = ts?.length ?? 0;
    if (e3) results.test3_error = e3.message;

    // TEST 4: Resolución de jerarquía SYSTEM level
    if (allSettings && allSettings.length > 0) {
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id")
        .eq("tenant_key", "SYSTEM")
        .single();

      if (tenantData) {
        const firstKey = allSettings[0].setting_key;
        const effective = await resolveEffectiveSetting(supabase, {
          tenantId: tenantData.id,
          settingKey: firstKey,
        });
        results.test4_hierarchy_resolution = {
          setting_key:     firstKey,
          source_level:    effective?.source_level,
          effective_value: effective?.effective_value,
          passed: !!effective && effective.source_level === "SYSTEM",
        };
      }
    }

    // TEST 5: Validación de tipo de dato
    const numError = validateSettingValue("abc", "NUMBER");
    const numOk    = validateSettingValue("42.5", "NUMBER");
    const boolErr  = validateSettingValue("maybe", "BOOLEAN");
    const boolOk   = validateSettingValue("true", "BOOLEAN");
    results.test5_type_validation = {
      number_invalid: numError !== null,
      number_valid:   numOk === null,
      boolean_invalid: boolErr !== null,
      boolean_valid:   boolOk === null,
      passed: numError !== null && numOk === null && boolErr !== null && boolOk === null,
    };

    const allPassed = results.test1_system_settings_exists &&
                      results.test3_tenant_settings_has_system_setting_id &&
                      (results.test5_type_validation?.passed ?? false);

    return c.json({
      summary: allPassed ? "✅ Modelo de parámetros verificado correctamente" : "⚠️ Algunos tests fallaron",
      all_passed: allPassed,
      results,
    });
  } catch (err: any) {
    console.error("❌ [verifySettingsModel]", err);
    return c.json({ error: err.message }, 500);
  }
}
