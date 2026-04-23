// ============================================================================
// tenant-routes.ts
// Turnos Titanium Enterprise - Rutas de Tenant
// Convertido de Deno/Hono a Node.js/Express
// ============================================================================

import { Router, Request, Response } from 'express';
import { createDbClient } from './lib/postgres-client.js';

const router = Router();

function getPostgresClient() {
  return createDbClient(
    process.env.Postgres_URL ?? '',
    process.env.Postgres_SERVICE_ROLE_KEY ?? ''
  );
}

// ============================================================================
// SYSTEM TENANT ONLY
// ============================================================================

/**
 * GET /tenant/settings
 * Obtener datos del tenant único (SYSTEM)
 */
export async function getSystemTenantSettings(req: Request, res: Response) {
  try {
    const Postgres = getPostgresClient();

    const { data, error } = await Postgres
      .from('tenants')
      .select('id, tenant_key, tenant_name, is_active')
      .eq('tenant_key', 'SYSTEM')
      .single();

    if (error) {
      console.error('❌ Error obteniendo tenant SYSTEM:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Tenant SYSTEM no encontrado' });
    }

    return res.json(data);
  } catch (error: any) {
    console.error('❌ Error en getSystemTenantSettings:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /tenant/settings
 * Actualizar nombre del tenant único (SYSTEM)
 */
export async function updateSystemTenantSettings(req: Request, res: Response) {
  try {
    const body = req.body;
    const { tenant_name } = body;

    if (!tenant_name || !tenant_name.trim()) {
      return res.status(400).json({ error: 'El nombre del tenant es obligatorio' });
    }

    const Postgres = getPostgresClient();

    const { data, error } = await Postgres
      .from('tenants')
      .update({
        tenant_name: tenant_name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_key', 'SYSTEM')
      .select('id, tenant_key, tenant_name, is_active')
      .single();

    if (error) {
      console.error('❌ Error actualizando tenant SYSTEM:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Tenant SYSTEM actualizado:', data);
    return res.json(data);
  } catch (error: any) {
    console.error('❌ Error en updateSystemTenantSettings:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ============================================================================
// MULTI-TENANT OPERATIONS
// ============================================================================

/**
 * GET /tenants/:id
 */
export async function getTenant(req: Request, res: Response) {
  try {
    const tenantId = req.params.id;
    const Postgres = getPostgresClient();

    const { data, error } = await Postgres
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error) throw error;

    return res.json({ tenant: data });
  } catch (error: any) {
    console.error('Error obteniendo tenant:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /tenants/:id
 */
export async function updateTenant(req: Request, res: Response) {
  try {
    const tenantId = req.params.id;
    const body = req.body;
    const Postgres = getPostgresClient();

    const { data, error } = await Postgres
      .from('tenants')
      .update({
        tenant_name: body.tenant_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId)
      .select()
      .single();

    if (error) throw error;

    return res.json({ tenant: data });
  } catch (error: any) {
    console.error('Error actualizando tenant:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /tenants/:id/settings
 * Obtiene los overrides de settings del tenant
 */
export async function getTenantSettings(req: Request, res: Response) {
  try {
    const tenantId = req.params.id;
    const Postgres = getPostgresClient();

    const { data, error } = await Postgres
      .from('tenant_settings')
      .select(
        `
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
      `
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ settings: data });
  } catch (error: any) {
    console.error('Error obteniendo settings:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /tenants/:id/settings
 * Crea un override de tenant
 */
export async function createTenantSetting(req: Request, res: Response) {
  try {
    const tenantId = req.params.id;
    const body = req.body;
    const Postgres = getPostgresClient();

    const { system_setting_id, setting_value, created_by, is_active } = body;

    if (!system_setting_id) {
      return res
        .status(400)
        .json({ error: 'system_setting_id es obligatorio. Los overrides deben referenciar un parámetro del catálogo maestro.' });
    }
    if (setting_value === undefined || setting_value === null) {
      return res.status(400).json({ error: 'setting_value es obligatorio' });
    }

    // Verificar que el parámetro existe y está activo
    const { data: ss } = await Postgres
      .from('system_settings')
      .select('id, setting_key')
      .eq('id', system_setting_id)
      .eq('is_active', true)
      .single();

    if (!ss) {
      return res.status(400).json({
        error: 'Parámetro no encontrado o inactivo en el catálogo maestro',
      });
    }

    const { data, error } = await Postgres
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
        return res
          .status(409)
          .json({ error: `Ya existe un override para este parámetro en este tenant` });
      }
      throw error;
    }

    return res.json({ setting: data });
  } catch (error: any) {
    console.error('Error creando setting:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /tenants/:id/settings/:setting_id
 * Actualiza el valor de un override de tenant
 */
export async function updateTenantSetting(req: Request, res: Response) {
  try {
    const settingId = req.params.setting_id;
    const body = req.body;
    const Postgres = getPostgresClient();

    const { setting_value, is_active, updated_by } = body;

    const { data, error } = await Postgres
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

    return res.json({ setting: data });
  } catch (error: any) {
    console.error('Error actualizando setting:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /tenants/:id/settings/:setting_id
 * Elimina el override de tenant
 */
export async function deleteTenantSetting(req: Request, res: Response) {
  try {
    const settingId = req.params.setting_id;
    const Postgres = getPostgresClient();

    const { error } = await Postgres
      .from('tenant_settings')
      .delete()
      .eq('id', settingId);

    if (error) throw error;

    return res.json({
      success: true,
      message: 'Override eliminado. El parámetro ahora hereda del sistema.',
    });
  } catch (error: any) {
    console.error('Error eliminando setting:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /tenants/:id/members
 */
export async function getTenantMembers(req: Request, res: Response) {
  try {
    const tenantId = req.params.id;
    const Postgres = getPostgresClient();

    const { data, error } = await Postgres
      .from('tenant_members')
      .select(
        `
        id,
        tenant_id,
        auth_user_id,
        member_role,
        created_at
      `
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ members: data });
  } catch (error: any) {
    console.error('Error obteniendo members:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /lookup-values/data-types
 */
export async function getDataTypes(req: Request, res: Response) {
  try {
    const Postgres = getPostgresClient();

    const { data: groupData } = await Postgres
      .from('lookup_groups')
      .select('id')
      .eq('lookup_group_key', 'DATA_TYPE')
      .limit(1)
      .maybeSingle();

    if (!groupData) {
      return res.status(404).json({ error: 'Grupo DATA_TYPE no encontrado' });
    }

    const { data, error } = await Postgres
      .from('lookup_values')
      .select('id, lookup_key, lookup_label')
      .eq('group_id', groupData.id)
      .eq('is_active', true)
      .order('lookup_label');

    if (error) throw error;

    return res.json({ dataTypes: data || [] });
  } catch (error: any) {
    console.error('Error obteniendo data types:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /tenants/:id/languages
 */
export async function getTenantLanguages(req: Request, res: Response) {
  try {
    const tenantId = req.params.id;
    const Postgres = getPostgresClient();

    const { data, error } = await Postgres
      .from('tenant_languages')
      .select('id, language_code, is_default')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    return res.json({ languages: data || [] });
  } catch (error: any) {
    console.error('Error obteniendo tenant languages:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /tenants/:id/languages
 */
export async function updateTenantLanguages(req: Request, res: Response) {
  try {
    const tenantId = req.params.id;
    const body = req.body;
    const { languages } = body;

    if (!Array.isArray(languages)) {
      return res.status(400).json({ error: 'languages debe ser un array' });
    }

    const Postgres = getPostgresClient();

    // Eliminar idiomas antigos
    await Postgres
      .from('tenant_languages')
      .delete()
      .eq('tenant_id', tenantId);

    // Insertar nuevos
    const { data, error } = await Postgres
      .from('tenant_languages')
      .insert(languages.map(lang => ({
        tenant_id: tenantId,
        language_code: lang.language_code,
        is_default: lang.is_default || false,
      })))
      .select();

    if (error) throw error;

    return res.json({ languages: data });
  } catch (error: any) {
    console.error('Error actualizando tenant languages:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /bootstrap/ensure-main-tenant
 * Asegurar que existe el tenant SYSTEM y su onboarding
 */
export async function ensureMainTenant(req: Request, res: Response) {
  try {
    const Postgres = getPostgresClient();

    const { data: systemTenant, error: tenantError } = await Postgres
      .from('tenants')
      .select('id, tenant_key, tenant_name')
      .eq('tenant_key', 'SYSTEM')
      .single();

    if (tenantError || !systemTenant) {
      console.error('❌ Tenant SYSTEM no encontrado');
      return res.status(404).json({ error: 'Tenant SYSTEM no encontrado' });
    }

    console.log('✅ Tenant SYSTEM encontrado:', systemTenant.id);

    const { data: onboarding, error: onboardingError } = await Postgres
      .from('tenant_onboarding')
      .select('*')
      .eq('tenant_id', systemTenant.id)
      .maybeSingle();

    if (onboardingError) {
      console.error('Error verificando onboarding:', onboardingError);
      return res.status(500).json({ error: onboardingError.message });
    }

    if (!onboarding) {
      const { error: createError } = await Postgres
        .from('tenant_onboarding')
        .insert({
          tenant_id: systemTenant.id,
          onboarding_status: 'IN_PROGRESS',
          current_step: 'tenant_setup',
          completion_percentage: 0,
        });

      if (createError) {
        console.error('Error creando onboarding:', createError);
        return res.status(500).json({ error: createError.message });
      }

      console.log('✅ Registro de onboarding creado');
    }

    return res.json({
      success: true,
      tenant: systemTenant,
      onboarding: onboarding || { status: 'created' },
    });
  } catch (error: any) {
    console.error('Error en ensureMainTenant:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default router;

