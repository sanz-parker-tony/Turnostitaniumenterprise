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
 */
export async function getTenantSettings(c: any) {
  try {
    const tenantId = c.req.param('id');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('tenant_settings')
      .select(`
        *,
        value_type:lookup_values!tenant_settings_value_type_id_fkey (
          id,
          lookup_key,
          lookup_label
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
 */
export async function createTenantSetting(c: any) {
  try {
    const tenantId = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('tenant_settings')
      .insert({
        tenant_id: tenantId,
        setting_key: body.setting_key,
        setting_short_key: body.setting_short_key,
        value_type_id: body.value_type_id,
        setting_value: body.setting_value,
        is_active: body.is_active,
        created_by: body.created_by
      })
      .select()
      .single();

    if (error) throw error;

    return c.json({ setting: data });
  } catch (error: any) {
    console.error('Error creando setting:', error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * PUT /tenants/:id/settings/:setting_id
 */
export async function updateTenantSetting(c: any) {
  try {
    const settingId = c.req.param('setting_id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('tenant_settings')
      .update({
        setting_key: body.setting_key,
        setting_short_key: body.setting_short_key,
        value_type_id: body.value_type_id,
        setting_value: body.setting_value,
        is_active: body.is_active,
        updated_by: body.updated_by,
        updated_at: new Date().toISOString()
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

    return c.json({ success: true });
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
 */
export async function getDataTypes(c: any) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('lookup_values')
      .select('id, lookup_key, lookup_label, lookup_short_label')
      .eq('lookup_scope', 'DATA_TYPE') // ✅ Cambiar lookup_type a lookup_scope
      .eq('is_active', true)
      .order('lookup_label', { ascending: true });

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