import { createClient } from "npm:@supabase/supabase-js@2";

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

/**
 * POST /bootstrap/ensure-main-tenant
 * Asegurar que existe el tenant SYSTEM y su onboarding
 */
export async function ensureMainTenant(c: any) {
  try {
    const supabase = getSupabaseClient();

    // Buscar tenant SYSTEM
    const { data: systemTenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, tenant_key, tenant_name')
      .eq('tenant_key', 'SYSTEM')
      .single();

    if (tenantError || !systemTenant) {
      console.error('❌ Tenant SYSTEM no encontrado');
      return c.json({ error: 'Tenant SYSTEM no encontrado' }, 404);
    }

    console.log('✅ Tenant SYSTEM encontrado:', systemTenant.id);

    // Verificar/crear registro de onboarding
    const { data: onboarding, error: onboardingError } = await supabase
      .from('tenant_onboarding')
      .select('*')
      .eq('tenant_id', systemTenant.id)
      .maybeSingle();

    if (onboardingError) {
      console.error('Error verificando onboarding:', onboardingError);
      return c.json({ error: onboardingError.message }, 500);
    }

    if (!onboarding) {
      // Crear registro de onboarding
      const { error: createError } = await supabase
        .from('tenant_onboarding')
        .insert({
          tenant_id: systemTenant.id,
          onboarding_status: 'IN_PROGRESS',
          current_step: 'tenant_setup',
          completion_percentage: 0
        });

      if (createError) {
        console.error('Error creando onboarding:', createError);
        return c.json({ error: createError.message }, 500);
      }

      console.log('✅ Registro de onboarding creado');
    }

    return c.json({
      success: true,
      tenant: systemTenant,
      onboarding: onboarding || { status: 'created' }
    });
  } catch (error: any) {
    console.error('Error en ensureMainTenant:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * GET /tenant/settings
 * Obtener datos del tenant único (SYSTEM)
 */
export async function getSystemTenantSettings(c: any) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('tenants')
      .select('id, tenant_key, tenant_name, is_active')
      .eq('tenant_key', 'SYSTEM')
      .single();

    if (error) {
      console.error('❌ Error obteniendo tenant SYSTEM:', error);
      return c.json({ error: error.message }, 500);
    }

    if (!data) {
      return c.json({ error: 'Tenant SYSTEM no encontrado' }, 404);
    }

    return c.json(data);
  } catch (error: any) {
    console.error('❌ Error en getSystemTenantSettings:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * PUT /tenant/settings
 * Actualizar nombre del tenant único (SYSTEM)
 * SOLO permite cambiar tenant_name, NO tenant_key
 */
export async function updateSystemTenantSettings(c: any) {
  try {
    const body = await c.req.json();
    const { tenant_name } = body;

    if (!tenant_name || !tenant_name.trim()) {
      return c.json({ error: 'El nombre del tenant es obligatorio' }, 400);
    }

    const supabase = getSupabaseClient();

    // Actualizar SOLO el tenant_name del tenant con tenant_key = 'SYSTEM'
    const { data, error } = await supabase
      .from('tenants')
      .update({
        tenant_name: tenant_name.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('tenant_key', 'SYSTEM')
      .select('id, tenant_key, tenant_name, is_active')
      .single();

    if (error) {
      console.error('❌ Error actualizando tenant SYSTEM:', error);
      return c.json({ error: error.message }, 500);
    }

    console.log('✅ Tenant SYSTEM actualizado:', data);
    return c.json(data);
  } catch (error: any) {
    console.error('❌ Error en updateSystemTenantSettings:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * GET /tenants/:id
 */
export async function getTenant(c: any) {
  try {
    const tenantId = c.req.param('id');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error) throw error;

    return c.json({ tenant: data });
  } catch (error: any) {
    console.error('Error obteniendo tenant:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * PUT /tenants/:id
 */
export async function updateTenant(c: any) {
  try {
    const tenantId = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('tenants')
      .update({
        tenant_name: body.tenant_name,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId)
      .select()
      .single();

    if (error) throw error;

    return c.json({ tenant: data });
  } catch (error: any) {
    console.error('Error actualizando tenant:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * GET /tenants/:id/settings
 * Obtiene los overrides de settings del tenant, enriquecidos con info del parámetro maestro.
 * Compatible con el nuevo modelo (post-migración 003).
 */
export async function getTenantSettings(c: any) {
  try {
    const tenantId = c.req.param('id');
    const supabase = getSupabaseClient();

    // Intentar query con nuevo modelo (system_setting_id)
    const { data, error } = await supabase
      .from('tenant_settings')
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
          value_type:lookup_values!system_settings_value_type_fkey (
            id, lookup_key, lookup_label
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return c.json({ settings: data });
  } catch (error: any) {
    console.error('Error obteniendo settings:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * POST /tenants/:id/settings
 * Crea un override de tenant para un parámetro del catálogo maestro.
 * Nuevo modelo: requiere system_setting_id, NO acepta setting_key libre.
 */
export async function createTenantSetting(c: any) {
  try {
    const tenantId = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    const { system_setting_id, setting_value, created_by, is_active } = body;

    if (!system_setting_id) {
      return c.json({ error: 'system_setting_id es obligatorio. Los overrides deben referenciar un parámetro del catálogo maestro.' }, 400);
    }
    if (setting_value === undefined || setting_value === null) {
      return c.json({ error: 'setting_value es obligatorio' }, 400);
    }

    // Verificar que el parámetro existe y está activo
    const { data: ss } = await supabase
      .from('system_settings')
      .select('id, setting_key')
      .eq('id', system_setting_id)
      .eq('is_active', true)
      .single();

    if (!ss) {
      return c.json({ error: 'Parámetro no encontrado o inactivo en el catálogo maestro' }, 400);
    }

    const { data, error } = await supabase
      .from('tenant_settings')
      .insert({
        tenant_id: tenantId,
        system_setting_id,
        setting_value: String(setting_value),
        is_active: is_active !== false,
        created_by: created_by || 'ADMIN',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return c.json({ error: `Ya existe un override para este parámetro en este tenant` }, 409);
      }
      throw error;
    }

    return c.json({ setting: data });
  } catch (error: any) {
    console.error('Error creando setting:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * PUT /tenants/:id/settings/:setting_id
 * Actualiza el valor de un override de tenant.
 * Solo permite modificar setting_value e is_active.
 */
export async function updateTenantSetting(c: any) {
  try {
    const settingId = c.req.param('setting_id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    const { setting_value, is_active, updated_by } = body;

    const { data, error } = await supabase
      .from('tenant_settings')
      .update({
        setting_value: setting_value !== undefined ? String(setting_value) : undefined,
        is_active,
        updated_by: updated_by || 'ADMIN',
        updated_at: new Date().toISOString(),
      })
      .eq('id', settingId)
      .select()
      .single();

    if (error) throw error;

    return c.json({ setting: data });
  } catch (error: any) {
    console.error('Error actualizando setting:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * DELETE /tenants/:id/settings/:setting_id
 * Elimina el override de tenant = "restablecer herencia al valor del sistema".
 */
export async function deleteTenantSetting(c: any) {
  try {
    const settingId = c.req.param('setting_id');
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('tenant_settings')
      .delete()
      .eq('id', settingId);

    if (error) throw error;

    return c.json({ success: true, message: 'Override eliminado. El parámetro ahora hereda del sistema.' });
  } catch (error: any) {
    console.error('Error eliminando setting:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * GET /tenants/:id/members
 */
export async function getTenantMembers(c: any) {
  try {
    const tenantId = c.req.param('id');
    const supabase = getSupabaseClient();

    // ✅ Simplificar query sin usar foreign key hint específico
    const { data, error } = await supabase
      .from('tenant_members')
      .select(`
        *,
        user:users (
          id,
          email,
          display_name
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return c.json({ members: data });
  } catch (error: any) {
    console.error('Error obteniendo members:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * GET /lookup-values/data-types
 * CORREGIDO: query por lookup_group_key = 'DATA_TYPE' en lugar de lookup_scope = 'DATA_TYPE'
 */
export async function getDataTypes(c: any) {
  try {
    const supabase = getSupabaseClient();

    // Buscar el grupo DATA_TYPE primero
    const { data: groupData } = await supabase
      .from('lookup_groups')
      .select('id')
      .eq('lookup_group_key', 'DATA_TYPE')
      .limit(1)
      .maybeSingle();

    if (!groupData) {
      return c.json({ dataTypes: [] });
    }

    const { data, error } = await supabase
      .from('lookup_values')
      .select('id, lookup_key, lookup_label, lookup_short_label')
      .eq('lookup_group_id', groupData.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return c.json({ dataTypes: data });
  } catch (error: any) {
    console.error('Error obteniendo data types:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * GET /tenants/:id/languages
 */
export async function getTenantLanguages(c: any) {
  try {
    const tenantId = c.req.param('id');
    const supabase = getSupabaseClient();

    // Obtener configuración actual del tenant
    const { data: tenantLanguageSettings, error: settingsError } = await supabase
      .from('tenant_language_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (settingsError) {
      console.error('Error obteniendo configuración de lenguajes:', settingsError);
      return c.json({ error: settingsError.message }, 500);
    }

    // Obtener todos los lenguajes del sistema
    const { data: systemLanguages, error: languagesError } = await supabase
      .from('system_languages')
      .select('*')
      .order('is_default', { ascending: false });

    if (languagesError) {
      console.error('Error obteniendo lenguajes del sistema:', languagesError);
      return c.json({ error: languagesError.message }, 500);
    }

    return c.json({
      tenantLanguageSettings,
      systemLanguages
    });
  } catch (error: any) {
    console.error('Error en getTenantLanguages:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * PUT /tenants/:id/languages
 */
export async function updateTenantLanguages(c: any) {
  try {
    const tenantId = c.req.param('id');
    const body = await c.req.json();
    const { default_language_code, enabled_languages } = body;

    if (!default_language_code || !enabled_languages || enabled_languages.length === 0) {
      return c.json({ error: 'Faltan parámetros requeridos' }, 400);
    }

    const supabase = getSupabaseClient();

    // Convertir array a string CSV
    const enabledLanguagesStr = enabled_languages.join(',');

    // UPSERT: Crear o actualizar
    const { data, error } = await supabase
      .from('tenant_language_settings')
      .upsert({
        tenant_id: tenantId,
        default_language_code,
        enabled_languages: enabledLanguagesStr,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tenant_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error actualizando configuración de lenguajes:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ tenantLanguageSettings: data });
  } catch (error: any) {
    console.error('Error en updateTenantLanguages:', error);
    return c.json({ error: error.message }, 500);
  }
}