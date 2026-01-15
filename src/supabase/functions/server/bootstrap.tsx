import { Context } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

/**
 * Middleware: Validar que estamos en modo bootstrap
 * Verifica que el sistema no esté ya activado
 */
export const validateBootstrapMode = async (c: Context, next: () => Promise<void>) => {
  try {
    console.log('🔐 Middleware: Validando modo bootstrap...');
    
    // ========================================
    // VALIDACIÓN PRINCIPAL: Verificar que el onboarding NO esté completado
    // ========================================
    // ✅ NO validamos token porque se pierde al reiniciar backend
    // ✅ La validación importante es que el onboarding esté en progreso
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: tenants } = await supabase
      .from('tenants')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (tenants) {
      const { data: onboarding } = await supabase
        .from('tenant_onboarding')
        .select('onboarding_status')
        .eq('tenant_id', tenants.id)
        .maybeSingle();

      if (onboarding?.onboarding_status === 'COMPLETED') {
        console.log('⚠️ Sistema ya activado');
        return c.json({ 
          error: 'El sistema ya ha sido activado',
          message: 'Use el login normal' 
        }, 410);
      }
      
      console.log('✅ Onboarding en progreso, permitiendo acceso bootstrap');
    } else {
      console.log('✅ No hay tenants, permitiendo creación inicial');
    }

    console.log('✅ Modo bootstrap validado (sin requerir token)');
    
    await next();
  } catch (error: any) {
    console.error('❌ Error en validateBootstrapMode:', error);
    return c.json({ error: 'Error validando modo bootstrap' }, 500);
  }
};

/**
 * GET /bootstrap/token
 * Obtiene el bootstrap token para el wizard de activación
 */
export const getBootstrapToken = async (c: Context) => {
  try {
    console.log('🔐 GET /bootstrap/token - Solicitando bootstrap token...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar si el onboarding ya está completado
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (tenantsError) {
      console.error('❌ Error verificando tenant:', tenantsError);
      return c.json({ error: 'Error verificando estado del sistema' }, 500);
    }

    // ✅ SI NO HAY TENANT: Es primer inicio, generar token
    if (!tenants) {
      console.log('✅ Primer inicio del sistema (sin tenant), generando bootstrap token...');
      const bootstrapToken = `BOOTSTRAP_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      await kv.set('bootstrap:token', bootstrapToken);
      await kv.set('bootstrap:token_created', new Date().toISOString());
      
      console.log('✅ Bootstrap token generado para primer inicio');
      
      return c.json({ 
        bootstrapToken,
        source: 'first-time-setup',
        message: 'Token de activación generado para configuración inicial'
      });
    }

    const tenantId = tenants.id;

    // Verificar estado del onboarding
    const { data: onboarding } = await supabase
      .from('tenant_onboarding')
      .select('onboarding_status')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (onboarding?.onboarding_status === 'COMPLETED') {
      console.log('⚠️ Sistema ya activado');
      return c.json({ 
        error: 'El sistema ya ha sido activado',
        message: 'Use el login normal' 
      }, 410);
    }

    // Generar token simple (en producción debería ser JWT o similar)
    const bootstrapToken = `BOOTSTRAP_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Guardar token temporalmente en KV
    await kv.set('bootstrap:token', bootstrapToken);
    await kv.set('bootstrap:token_created', new Date().toISOString());

    console.log('✅ Bootstrap token generado');

    return c.json({ 
      bootstrapToken,
      source: 'bootstrap-module'
    });
  } catch (error: any) {
    console.error('❌ Error en getBootstrapToken:', error);
    return c.json({ error: error.message }, 500);
  }
};

/**
 * GET /bootstrap/wizard-state
 * Obtiene el estado actual del wizard desde tenant_onboarding
 */
export const getWizardState = async (c: Context) => {
  try {
    console.log('📊 GET /bootstrap/wizard-state - Obteniendo estado del wizard...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener el tenant (solo debe haber uno en on-premise)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (tenantError || !tenant) {
      console.error('❌ Error obteniendo tenant:', tenantError);
      return c.json({ 
        error: 'No se encontró tenant',
        currentStep: 'TENANT', // Iniciar desde el principio si no hay tenant
        completedSteps: []
      }, 200);
    }

    // Obtener estado del onboarding
    const { data: onboarding, error: onboardingError } = await supabase
      .from('tenant_onboarding')
      .select('current_step, completed_steps, onboarding_status, completion_percentage')
      .eq('tenant_id', tenant.id)
      .maybeSingle();

    if (onboardingError) {
      console.error('❌ Error obteniendo onboarding:', onboardingError);
      return c.json({ error: onboardingError.message }, 500);
    }

    if (!onboarding) {
      console.log('ℹ️ No hay registro de onboarding, iniciando desde TENANT');
      return c.json({
        currentStep: 'TENANT',
        completedSteps: [],
        onboardingStatus: 'NOT_STARTED',
        completionPercentage: 0
      });
    }

    // ✅ Si el onboarding está COMPLETED, devolver 410 Gone
    if (onboarding.onboarding_status === 'COMPLETED') {
      console.log('⚠️ Sistema ya activado, devolviendo 410 Gone');
      return c.json({ 
        error: 'El sistema ya ha sido activado',
        message: 'Use el login normal' 
      }, 410);
    }

    console.log('✅ Estado del wizard obtenido:', onboarding);

    return c.json({
      currentStep: onboarding.current_step || 'TENANT',
      completedSteps: onboarding.completed_steps || [],
      onboardingStatus: onboarding.onboarding_status,
      completionPercentage: onboarding.completion_percentage || 0
    });

  } catch (error: any) {
    console.error('❌ Error en getWizardState:', error);
    return c.json({ error: error.message }, 500);
  }
};

/**
 * GET /bootstrap/system-languages
 * Obtiene los idiomas disponibles en el sistema
 */
export const getSystemLanguages = async (c: Context) => {
  try {
    console.log('🌐 GET /bootstrap/system-languages - Obteniendo idiomas...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: languages, error } = await supabase
      .from('system_languages')
      .select('code, language_name, is_active, is_default')
      .eq('is_active', true)
      .order('language_name', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo idiomas:', error);
      return c.json({ error: 'Error obteniendo idiomas del sistema' }, 500);
    }

    console.log(`✅ ${languages?.length || 0} idiomas obtenidos`);

    return c.json({ 
      languages: languages || [],
      count: languages?.length || 0
    });
  } catch (error: any) {
    console.error('❌ Error en getSystemLanguages:', error);
    return c.json({ error: error.message }, 500);
  }
};

/**
 * POST /bootstrap/step1-tenant
 * Paso 1: Configuración del Tenant (ON-PREMISE SINGLE-TENANT)
 * 
 * IMPORTANTE:
 * - NO crea un nuevo tenant
 * - Localiza el tenant existente (el único en on-premise)
 * - ACTUALIZA tenant_name en tabla tenants
 * - Guarda idiomas en tenant_language_settings
 * - Guarda timezone en tenant_settings
 * - Actualiza tenant_onboarding
 * - NO requiere sesión/login (modo bootstrap)
 */
export const bootstrapStep1Tenant = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { tenantName, defaultLanguage, enabledLanguages, timezone } = body;

    // Validaciones
    if (!tenantName || tenantName.trim().length < 3) {
      return c.json({ error: 'Nombre del tenant inválido (mínimo 3 caracteres)' }, 400);
    }

    if (!defaultLanguage) {
      return c.json({ error: 'Idioma por defecto requerido' }, 400);
    }

    if (!timezone) {
      return c.json({ error: 'Zona horaria requerida' }, 400);
    }

    // Validación: Idioma por defecto debe estar en idiomas habilitados
    let finalEnabledLanguages = enabledLanguages && enabledLanguages.length > 0 
      ? enabledLanguages 
      : [defaultLanguage];

    if (!finalEnabledLanguages.includes(defaultLanguage)) {
      finalEnabledLanguages.push(defaultLanguage);
    }

    console.log('📝 Bootstrap Step 1 (ON-PREMISE): Configurando tenant...', {
      tenantName: tenantName.trim(),
      defaultLanguage,
      enabledLanguages: finalEnabledLanguages,
      timezone
    });

    // Crear cliente Supabase con SERVICE_ROLE_KEY
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. LOCALIZAR el tenant existente (en on-premise solo hay uno)
    console.log('🔍 Localizando tenant del sistema...');
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, tenant_name, tenant_key')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (tenantError || !tenant) {
      console.error('❌ Error localizando tenant:', tenantError);
      return c.json({ 
        error: 'No se encontró el tenant del sistema. Verifique la instalación inicial.',
        details: tenantError?.message 
      }, 500);
    }

    console.log('✅ Tenant localizado:', { 
      tenant_id: tenant.id, 
      tenant_name: tenant.tenant_name,
      tenant_key: tenant.tenant_key
    });

    const tenantId = tenant.id;

    // 2. ACTUALIZAR tenant_name en tabla tenants (UPDATE, no INSERT)
    console.log('📝 Actualizando tenant_name...');
    const { error: updateTenantError } = await supabase
      .from('tenants')
      .update({ 
        tenant_name: tenantName.trim()
        // NOTA: La tabla tenants NO tiene columna updated_at según DDL
      })
      .eq('id', tenantId);

    if (updateTenantError) {
      console.error('❌ Error actualizando tenant_name:', updateTenantError);
      throw new Error(`Error actualizando tenant_name: ${updateTenantError.message}`);
    }

    console.log('✅ tenant_name actualizado');

    // 3. OBTENER value_type_id para tipo STRING (REQUERIDO por tenant_settings)
    console.log('🔍 Obteniendo value_type_id para STRING...');
    
    // Query correcto: JOIN explícito entre lookup_groups y lookup_values
    const { data: stringValueType, error: valueTypeError } = await supabase
      .from('lookup_values')
      .select(`
        id,
        lookup_groups!inner(
          lookup_group_key
        )
      `)
      .eq('lookup_groups.lookup_group_key', 'VALUE_TYPE')
      .eq('lookup_key', 'STRING')
      .eq('lookup_scope', 'SYSTEM')
      .limit(1)
      .maybeSingle();

    if (valueTypeError) {
      console.error('❌ Error obteniendo value_type_id:', valueTypeError);
      throw new Error(`Error obteniendo value_type_id: ${valueTypeError.message}`);
    }

    if (!stringValueType) {
      console.error('❌ No se encontró el tipo de valor STRING en lookup_values');
      throw new Error('No se encontró el tipo de valor STRING en lookup_values. Verifique que existan los datos de referencia: lookup_groups.VALUE_TYPE y lookup_values.STRING con scope SYSTEM');
    }

    const valueTypeId = stringValueType.id;
    console.log('✅ value_type_id obtenido:', valueTypeId);

    // 4. UPSERT en tenant_language_settings
    console.log('📝 Guardando configuración de idiomas...');
    
    // IMPORTANTE: enabled_languages es JSONB, NO CSV
    const { error: languageError } = await supabase
      .from('tenant_language_settings')
      .upsert({
        tenant_id: tenantId,
        default_language_code: defaultLanguage,
        enabled_languages: finalEnabledLanguages, // Array directo, se guarda como JSONB
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tenant_id',
        ignoreDuplicates: false
      });

    if (languageError) {
      console.error('❌ Error guardando idiomas:', languageError);
      throw new Error(`Error guardando idiomas: ${languageError.message}`);
    }

    console.log('✅ Configuración de idiomas guardada');

    // 5. UPSERT TIMEZONE en tenant_settings
    console.log('📝 Guardando timezone en tenant_settings...');
    const { error: timezoneError } = await supabase
      .from('tenant_settings')
      .upsert({
        tenant_id: tenantId,
        setting_key: 'TIMEZONE',
        setting_short_key: 'TZ',
        value_type_id: valueTypeId,
        setting_value: timezone,
        is_active: true,
        created_by: 'BOOTSTRAP'
      }, {
        onConflict: 'tenant_id,setting_key',
        ignoreDuplicates: false
      });

    if (timezoneError) {
      console.error('❌ Error guardando timezone:', timezoneError);
      throw new Error(`Error guardando timezone: ${timezoneError.message}`);
    }

    console.log('✅ Timezone guardado');

    // 6. ACTUALIZAR tenant_onboarding
    console.log('📝 Actualizando tenant_onboarding...');
    
    // Primero verificar si existe un registro de onboarding
    const { data: existingOnboarding } = await supabase
      .from('tenant_onboarding')
      .select('id, completed_steps')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    // completed_steps es JSONB, debe ser un array JSON
    let completedSteps: string[] = ['TENANT'];
    
    if (existingOnboarding && existingOnboarding.completed_steps) {
      // completed_steps ya es JSONB parseado
      const existing = existingOnboarding.completed_steps as string[];
      
      // Agregar 'TENANT' si no está
      if (Array.isArray(existing) && !existing.includes('TENANT')) {
        completedSteps = [...existing, 'TENANT'];
      } else if (Array.isArray(existing)) {
        completedSteps = existing;
      }
    }

    const { error: onboardingError } = await supabase
      .from('tenant_onboarding')
      .upsert({
        tenant_id: tenantId,
        onboarding_status: 'IN_PROGRESS',
        current_step: 'COMPANY',
        completion_percentage: 20,
        completed_steps: completedSteps, // Se guarda como JSONB automáticamente
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tenant_id',
        ignoreDuplicates: false
      });

    if (onboardingError) {
      console.error('❌ Error actualizando tenant_onboarding:', onboardingError);
      throw new Error(`Error actualizando onboarding: ${onboardingError.message}`);
    }

    console.log('✅ tenant_onboarding actualizado');

    // 7. Actualizar estado en KV (para validaciones rápidas)
    await kv.set('system:onboarding_step', 'tenant_completed');
    await kv.set('system:tenant_id', tenantId);

    console.log('🎉 PASO 1 completado exitosamente');

    // Respuesta según contract: ok (no success), next_step, completed_steps
    return c.json({
      ok: true,
      message: 'Tenant configurado correctamente',
      tenant_id: tenantId,
      tenant_name: tenantName.trim(),
      default_language: defaultLanguage,
      enabled_languages: finalEnabledLanguages,
      timezone: timezone,
      next_step: 'COMPANY',
      completed_steps: completedSteps,
      completion_percentage: 20
    });
  } catch (error: any) {
    console.error('❌ Error en bootstrapStep1Tenant:', error);
    return c.json({ 
      ok: false,
      error: 'Error guardando información del tenant',
      details: error.message 
    }, 500);
  }
};

/**
 * POST /bootstrap/step2-company
 * Paso 2: Configuración de la Empresa (ON-PREMISE SINGLE-TENANT)
 * 
 * IMPORTANTE:
 * - NO crea una nueva empresa
 * - Localiza la empresa existente (la única en on-premise por tenant)
 * - ACTUALIZA la información de la empresa
 * - NO requiere sesión/login (modo bootstrap)
 */
export const bootstrapStep2Company = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { legalName, taxId, companyCode, address, city, country } = body;

    // Validaciones
    if (!legalName || legalName.trim().length < 3) {
      return c.json({ error: 'Razón social inválida (mínimo 3 caracteres)' }, 400);
    }

    if (!taxId || taxId.trim().length < 5) {
      return c.json({ error: 'RUT/Tax ID inválido (mínimo 5 caracteres)' }, 400);
    }

    if (!companyCode || companyCode.trim().length < 2) {
      return c.json({ error: 'Código interno inválido (mínimo 2 caracteres)' }, 400);
    }

    console.log('📝 Bootstrap Step 2 (ON-PREMISE): Configurando empresa...', {
      legalName: legalName.trim(),
      taxId: taxId.trim(),
      companyCode: companyCode.trim()
    });

    // Crear cliente Supabase con SERVICE_ROLE_KEY
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. LOCALIZAR el tenant existente (en on-premise solo hay uno)
    console.log('🔍 Localizando tenant del sistema...');
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (tenantError || !tenant) {
      console.error('❌ Error localizando tenant:', tenantError);
      return c.json({ 
        error: 'No se encontró el tenant del sistema. Verifique la instalación inicial.',
        details: tenantError?.message 
      }, 500);
    }

    const tenantId = tenant.id;
    console.log('✅ Tenant localizado:', tenantId);

    // 2. LOCALIZAR la empresa existente del tenant (en on-premise solo hay una por tenant)
    console.log('🔍 Localizando empresa del tenant...');
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, company_name, company_code')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (companyError) {
      console.error('❌ Error localizando empresa:', companyError);
      return c.json({ 
        error: 'Error localizando la empresa',
        details: companyError.message 
      }, 500);
    }

    let companyId: string;

    if (company) {
      // ACTUALIZAR empresa existente
      console.log('✅ Empresa encontrada, actualizando...', { 
        company_id: company.id,
        current_name: company.company_name,
        current_code: company.company_code
      });

      // IMPORTANTE: Verificar si el código ya está en uso por otra empresa
      const { data: existingCode } = await supabase
        .from('companies')
        .select('id, company_code')
        .eq('tenant_id', tenantId)
        .eq('company_code', companyCode.trim())
        .neq('id', company.id)
        .maybeSingle();

      if (existingCode) {
        console.error('❌ Código de empresa duplicado:', companyCode.trim());
        return c.json({ 
          error: `El código "${companyCode.trim()}" ya está en uso por otra empresa`,
        }, 400);
      }

      console.log('📝 Actualizando empresa con:', {
        company_name: legalName.trim(),
        company_short_name: legalName.trim().substring(0, 20),
        company_code: companyCode.trim(),
        company_address: address?.trim() || null
      });

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          company_name: legalName.trim(),
          company_short_name: legalName.trim().substring(0, 20),
          company_code: companyCode.trim(),
          company_address: address?.trim() || null,
          updated_by: 'BOOTSTRAP',
          updated_at: new Date().toISOString()
        })
        .eq('id', company.id);

      if (updateError) {
        console.error('❌ Error actualizando empresa:', updateError);
        return c.json({ 
          error: 'Error actualizando información de la empresa',
          details: updateError.message,
          code: updateError.code
        }, 500);
      }

      companyId = company.id;
      console.log('✅ Empresa actualizada exitosamente');
      
      // Verificar la actualización
      const { data: updated } = await supabase
        .from('companies')
        .select('company_name, company_code, company_short_name')
        .eq('id', companyId)
        .single();
      
      console.log('✅ Verificación post-update:', updated);
    } else {
      // CREAR nueva empresa
      console.log('📝 No existe empresa, creando nueva...');

      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          tenant_id: tenantId,
          company_name: legalName.trim(),
          company_short_name: legalName.trim().substring(0, 20),
          company_code: companyCode.trim(),
          company_address: address?.trim() || null,
          is_active: true,
          created_by: 'BOOTSTRAP'
        })
        .select('id')
        .single();

      if (createError || !newCompany) {
        console.error('❌ Error creando empresa:', createError);
        return c.json({ 
          error: 'Error creando la empresa',
          details: createError?.message 
        }, 500);
      }

      companyId = newCompany.id;
      console.log('✅ Empresa creada:', companyId);
    }

    // 3. GARANTIZAR que existan los datos de referencia necesarios
    console.log('🔍 Verificando/creando datos de referencia en lookup_groups y lookup_values...');
    
    let valueTypeId: string | null = null;

    // 3.1. Verificar/crear lookup_group: VALUE_TYPE
    const { data: valueTypeGroup, error: groupError } = await supabase
      .from('lookup_groups')
      .select('id')
      .eq('lookup_group_key', 'VALUE_TYPE')
      .maybeSingle();

    let groupId: string;

    if (!valueTypeGroup) {
      console.log('📝 Creando lookup_group: VALUE_TYPE...');
      const { data: newGroup, error: createGroupError } = await supabase
        .from('lookup_groups')
        .insert({
          lookup_group_key: 'VALUE_TYPE',
          lookup_group_name: 'Value Types',
          lookup_description: 'Types of values for settings',
          lookup_scope: 'SYSTEM',
          is_active: true,
          created_by: 'BOOTSTRAP'
        })
        .select('id')
        .single();

      if (createGroupError || !newGroup) {
        console.error('❌ Error creando lookup_group VALUE_TYPE:', createGroupError);
        console.warn('⚠️ Continuando sin guardar settings adicionales...');
      } else {
        groupId = newGroup.id;
        console.log('✅ lookup_group VALUE_TYPE creado:', groupId);
      }
    } else {
      groupId = valueTypeGroup.id;
      console.log('✅ lookup_group VALUE_TYPE ya existe:', groupId);
    }

    // 3.2. Verificar/crear lookup_value: STRING
    if (groupId!) {
      const { data: stringValue, error: valueError } = await supabase
        .from('lookup_values')
        .select('id')
        .eq('lookup_group_id', groupId)
        .eq('lookup_key', 'STRING')
        .maybeSingle();

      if (!stringValue) {
        console.log('📝 Creando lookup_value: STRING...');
        const { data: newValue, error: createValueError } = await supabase
          .from('lookup_values')
          .insert({
            lookup_group_id: groupId,
            lookup_key: 'STRING',
            lookup_value: 'String',
            lookup_description: 'String value type',
            lookup_scope: 'SYSTEM',
            is_active: true,
            created_by: 'BOOTSTRAP'
          })
          .select('id')
          .single();

        if (createValueError || !newValue) {
          console.error('❌ Error creando lookup_value STRING:', createValueError);
          console.warn('⚠️ Continuando sin guardar settings adicionales...');
        } else {
          valueTypeId = newValue.id;
          console.log('✅ lookup_value STRING creado:', valueTypeId);
        }
      } else {
        valueTypeId = stringValue.id;
        console.log('✅ lookup_value STRING ya existe:', valueTypeId);
      }
    }

    // 4. Guardar Tax ID y ubicación en tenant_settings
    if (valueTypeId) {
      console.log('💾 Guardando configuraciones adicionales en tenant_settings...');
      
      const settingsToSave = [];

      // Guardar Tax ID (RUT/RUC)
      if (taxId && taxId.trim()) {
        settingsToSave.push({
          tenant_id: tenantId,
          setting_key: 'COMPANY_TAX_ID',
          setting_short_key: 'TAX_ID',
          value_type_id: valueTypeId,
          setting_value: taxId.trim(),
          is_active: true,
          created_by: 'BOOTSTRAP'
        });
        console.log('  📋 Tax ID a guardar:', taxId.trim());
      }

      // Guardar Ciudad (como texto libre)
      if (city && city.trim()) {
        settingsToSave.push({
          tenant_id: tenantId,
          setting_key: 'COMPANY_CITY',
          setting_short_key: 'CITY',
          value_type_id: valueTypeId,
          setting_value: city.trim(),
          is_active: true,
          created_by: 'BOOTSTRAP'
        });
        console.log('  📋 Ciudad a guardar:', city.trim());
      }

      // Guardar País (como texto libre)
      if (country && country.trim()) {
        settingsToSave.push({
          tenant_id: tenantId,
          setting_key: 'COMPANY_COUNTRY',
          setting_short_key: 'COUNTRY',
          value_type_id: valueTypeId,
          setting_value: country.trim(),
          is_active: true,
          created_by: 'BOOTSTRAP'
        });
        console.log('  📋 País a guardar:', country.trim());
      }

      // Guardar todos los settings
      if (settingsToSave.length > 0) {
        console.log(`💾 Insertando ${settingsToSave.length} settings en tenant_settings...`);
        
        const { data: insertedSettings, error: settingsError } = await supabase
          .from('tenant_settings')
          .upsert(settingsToSave, {
            onConflict: 'tenant_id,setting_key'
          })
          .select('setting_key, setting_value');

        if (settingsError) {
          console.error('❌ Error guardando tenant_settings:', settingsError);
          console.error('   Detalles:', settingsError.message);
          console.error('   Code:', settingsError.code);
        } else {
          console.log(`✅ ${settingsToSave.length} configuraciones guardadas exitosamente`);
          console.log('   Settings guardados:', insertedSettings);
        }
      } else {
        console.log('⚠️ No hay settings opcionales para guardar');
      }
    } else {
      console.warn('⚠️ No se pudo obtener value_type_id, saltando settings adicionales');
    }

    // 5. Actualizar tenant_onboarding
    const { data: onboarding } = await supabase
      .from('tenant_onboarding')
      .select('completed_steps')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const completedSteps = onboarding?.completed_steps || [];
    if (!completedSteps.includes('COMPANY')) {
      completedSteps.push('COMPANY');
    }

    await supabase
      .from('tenant_onboarding')
      .update({
        current_step: 'STRUCTURE',
        completed_steps: completedSteps,
        completion_percentage: 40 // 2 de 5 pasos = 40%
      })
      .eq('tenant_id', tenantId);

    console.log('✅ Onboarding actualizado');
    console.log('🎉 Bootstrap Step 2 completado exitosamente');

    return c.json({ 
      ok: true,
      message: 'Empresa configurada exitosamente',
      company_id: companyId,
      tenant_id: tenantId,
      next_step: 'STRUCTURE',
      completed_steps: completedSteps
    });
  } catch (error: any) {
    console.error('❌ Error en bootstrapStep2Company:', error);
    return c.json({ 
      ok: false,
      error: 'Error guardando información de la empresa',
      details: error.message 
    }, 500);
  }
};

/**
 * GET /bootstrap/tenant-info
 * Obtiene información básica del tenant y company para pre-llenar plantillas
 */
export const getTenantInfo = async (c: Context) => {
  try {
    console.log('📋 Obteniendo información del tenant...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener tenant (en on-premise solo hay uno)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (tenantError || !tenant) {
      console.error('❌ Error localizando tenant:', tenantError);
      return c.json({ error: 'Tenant no encontrado' }, 404);
    }

    // Obtener company (en on-premise solo hay una por tenant)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (companyError) {
      console.error('❌ Error localizando company:', companyError);
      return c.json({ error: 'Error obteniendo información' }, 500);
    }

    console.log('✅ Información del tenant obtenida:', {
      tenant_id: tenant.id,
      company_id: company?.id || null
    });

    return c.json({
      tenant_id: tenant.id,
      company_id: company?.id || null
    });
  } catch (error: any) {
    console.error('❌ Error en getTenantInfo:', error);
    return c.json({ error: 'Error obteniendo información del tenant' }, 500);
  }
};

/**
 * POST /bootstrap/step3-structure/work-locations
 * Paso 3: Carga de Ubicaciones de Trabajo (Bootstrap Mode)
 * 
 * IMPORTANTE:
 * - Insertar/Actualizar ubicaciones REGISTRO POR REGISTRO (UPSERT)
 * - Usa tenant_id y company_id del sistema
 * - NO requiere sesión/login (modo bootstrap)
 */
export const bootstrapStep3WorkLocations = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { workLocations } = body;

    if (!Array.isArray(workLocations) || workLocations.length === 0) {
      return c.json({ error: 'Debe enviar al menos una ubicación de trabajo' }, 400);
    }

    console.log(`📋 Bootstrap Step 3 (Work Locations): Procesando ${workLocations.length} ubicaciones...`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Obtener tenant_id
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (tenantError || !tenant) {
      console.error('❌ Error localizando tenant:', tenantError);
      return c.json({ error: 'Tenant no encontrado' }, 500);
    }

    const tenantId = tenant.id;
    console.log('✅ Tenant localizado:', tenantId);

    // 2. Obtener company_id
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (companyError || !company) {
      console.error('❌ Error localizando company:', companyError);
      return c.json({ error: 'Company no encontrada' }, 500);
    }

    const companyId = company.id;
    console.log('✅ Company localizada:', companyId);

    // 3. Insertar/Actualizar ubicaciones REGISTRO POR REGISTRO (UPSERT)
    const insertedLocations = [];
    const updatedLocations = [];
    const errors = [];

    for (let i = 0; i < workLocations.length; i++) {
      const location = workLocations[i];
      const rowNumber = i + 1;

      console.log(`📍 Procesando ${rowNumber} de ${workLocations.length}: ${location.work_location_name}`);

      try {
        // Verificar si ya existe una ubicación con ese código (work_location_code)
        const { data: existing, error: checkError } = await supabase
          .from('work_locations')
          .select('id, work_location_name')
          .eq('tenant_id', tenantId)
          .eq('work_location_code', location.work_location_code)
          .maybeSingle();

        if (checkError) {
          console.error(`❌ Error verificando existencia en registro ${rowNumber}:`, checkError);
          errors.push({
            row: rowNumber,
            location: location.work_location_name,
            error: checkError.message
          });
          continue;
        }

        if (existing) {
          // YA EXISTE → ACTUALIZAR (todos los campos excepto work_location_code)
          console.log(`   🔄 Código "${location.work_location_code}" ya existe, actualizando...`);
          
          const { data: updated, error: updateError } = await supabase
            .from('work_locations')
            .update({
              work_location_name: location.work_location_name,
              work_location_short_name: location.work_location_short_name,
              address_line1: location.address_line1 || null,
              latitude: location.latitude || null,
              longitude: location.longitude || null,
              is_active: true,
              updated_by: 'BOOTSTRAP',
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select('id, work_location_name')
            .single();

          if (updateError) {
            console.error(`❌ Error actualizando registro ${rowNumber}:`, updateError);
            errors.push({
              row: rowNumber,
              location: location.work_location_name,
              error: updateError.message
            });
          } else {
            updatedLocations.push(updated);
            console.log(`   ✅ Actualizado: ${updated.work_location_name}`);
          }
        } else {
          // NO EXISTE → INSERTAR NUEVO
          console.log(`   ➕ Código "${location.work_location_code}" nuevo, insertando...`);
          
          const { data: inserted, error: insertError } = await supabase
            .from('work_locations')
            .insert({
              tenant_id: tenantId,
              company_id: companyId,
              work_location_name: location.work_location_name,
              work_location_short_name: location.work_location_short_name,
              work_location_code: location.work_location_code,
              address_line1: location.address_line1 || null,
              latitude: location.latitude || null,
              longitude: location.longitude || null,
              is_active: true,
              created_by: 'BOOTSTRAP'
            })
            .select('id, work_location_name')
            .single();

          if (insertError) {
            console.error(`❌ Error insertando registro ${rowNumber}:`, insertError);
            errors.push({
              row: rowNumber,
              location: location.work_location_name,
              error: insertError.message
            });
          } else {
            insertedLocations.push(inserted);
            console.log(`   ✅ Insertado: ${inserted.work_location_name}`);
          }
        }
      } catch (error: any) {
        console.error(`❌ Excepción en registro ${rowNumber}:`, error);
        errors.push({
          row: rowNumber,
          location: location.work_location_name,
          error: error.message
        });
      }
    }

    // 4. Si hubo errores, retornarlos
    if (errors.length > 0) {
      const totalProcessed = insertedLocations.length + updatedLocations.length;
      console.warn(`⚠️ Se procesaron ${totalProcessed} de ${workLocations.length} ubicaciones (${insertedLocations.length} nuevas, ${updatedLocations.length} actualizadas)`);
      return c.json({
        ok: false,
        error: 'Algunos registros no pudieron ser procesados',
        inserted_count: insertedLocations.length,
        updated_count: updatedLocations.length,
        error_count: errors.length,
        errors: errors
      }, 207); // 207 Multi-Status
    }

    // 5. Actualizar tenant_onboarding
    const { data: onboarding } = await supabase
      .from('tenant_onboarding')
      .select('completed_steps')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const completedSteps = onboarding?.completed_steps || [];
    if (!completedSteps.includes('STRUCTURE')) {
      completedSteps.push('STRUCTURE');
    }

    await supabase
      .from('tenant_onboarding')
      .update({
        current_step: 'EMPLOYEES',
        completed_steps: completedSteps,
        completion_percentage: 60 // 3 de 5 pasos = 60%
      })
      .eq('tenant_id', tenantId);

    const totalProcessed = insertedLocations.length + updatedLocations.length;
    console.log(`🎉 ${totalProcessed} ubicaciones procesadas: ${insertedLocations.length} nuevas, ${updatedLocations.length} actualizadas`);

    return c.json({
      ok: true,
      message: `${totalProcessed} ubicaciones procesadas correctamente`,
      inserted_count: insertedLocations.length,
      updated_count: updatedLocations.length,
      total_count: totalProcessed,
      tenant_id: tenantId,
      company_id: companyId,
      next_step: 'EMPLOYEES',
      completed_steps: completedSteps
    });
  } catch (error: any) {
    console.error('❌ Error en bootstrapStep3WorkLocations:', error);
    return c.json({
      ok: false,
      error: 'Error procesando ubicaciones de trabajo',
      details: error.message
    }, 500);
  }
};

/**
 * POST /bootstrap/step3-structure/departments
 * Paso 3: Carga de Departamentos (Bootstrap Mode)
 */
export const bootstrapStep3Departments = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { departments } = body;

    if (!Array.isArray(departments) || departments.length === 0) {
      return c.json({ error: 'Debe enviar al menos un departamento' }, 400);
    }

    console.log(`📋 Bootstrap Step 3 (Departments): Procesando ${departments.length} departamentos...`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener tenant_id
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (tenantError || !tenant) {
      console.error('❌ Error localizando tenant:', tenantError);
      return c.json({ error: 'Tenant no encontrado' }, 500);
    }

    const tenantId = tenant.id;
    const insertedDepartments = [];
    const updatedDepartments = [];
    const errors = [];

    for (let i = 0; i < departments.length; i++) {
      const dept = departments[i];
      const rowNumber = i + 1;

      console.log(`📍 Procesando ${rowNumber} de ${departments.length}: ${dept.department_name}`);

      try {
        const { data: existing, error: checkError } = await supabase
          .from('departments')
          .select('id, department_name')
          .eq('tenant_id', tenantId)
          .eq('department_code', dept.department_code)
          .maybeSingle();

        if (checkError) {
          console.error(`❌ Error verificando existencia en registro ${rowNumber}:`, checkError);
          errors.push({ row: rowNumber, department: dept.department_name, error: checkError.message });
          continue;
        }

        if (existing) {
          // ACTUALIZAR
          console.log(`   🔄 Código "${dept.department_code}" ya existe, actualizando...`);
          
          const { data: updated, error: updateError } = await supabase
            .from('departments')
            .update({
              department_name: dept.department_name,
              department_short_name: dept.department_short_name,
              is_active: true,
              updated_by: 'BOOTSTRAP',
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select('id, department_name')
            .single();

          if (updateError) {
            console.error(`❌ Error actualizando registro ${rowNumber}:`, updateError);
            errors.push({ row: rowNumber, department: dept.department_name, error: updateError.message });
          } else {
            updatedDepartments.push(updated);
            console.log(`   ✅ Actualizado: ${updated.department_name}`);
          }
        } else {
          // INSERTAR
          console.log(`   ➕ Código "${dept.department_code}" nuevo, insertando...`);
          
          const { data: inserted, error: insertError } = await supabase
            .from('departments')
            .insert({
              tenant_id: tenantId,
              department_name: dept.department_name,
              department_short_name: dept.department_short_name,
              department_code: dept.department_code,
              is_active: true,
              created_by: 'BOOTSTRAP'
            })
            .select('id, department_name')
            .single();

          if (insertError) {
            console.error(`❌ Error insertando registro ${rowNumber}:`, insertError);
            errors.push({ row: rowNumber, department: dept.department_name, error: insertError.message });
          } else {
            insertedDepartments.push(inserted);
            console.log(`   ✅ Insertado: ${inserted.department_name}`);
          }
        }
      } catch (error: any) {
        console.error(`❌ Excepción en registro ${rowNumber}:`, error);
        errors.push({ row: rowNumber, department: dept.department_name, error: error.message });
      }
    }

    if (errors.length > 0) {
      return c.json({
        ok: false,
        error: 'Algunos registros no pudieron ser procesados',
        inserted_count: insertedDepartments.length,
        updated_count: updatedDepartments.length,
        error_count: errors.length,
        errors: errors
      }, 207);
    }

    const totalProcessed = insertedDepartments.length + updatedDepartments.length;
    console.log(`🎉 ${totalProcessed} departamentos procesados: ${insertedDepartments.length} nuevos, ${updatedDepartments.length} actualizados`);

    return c.json({
      ok: true,
      message: `${totalProcessed} departamentos procesados correctamente`,
      inserted_count: insertedDepartments.length,
      updated_count: updatedDepartments.length,
      total_count: totalProcessed,
      tenant_id: tenantId
    });
  } catch (error: any) {
    console.error('❌ Error en bootstrapStep3Departments:', error);
    return c.json({ ok: false, error: 'Error procesando departamentos', details: error.message }, 500);
  }
};

/**
 * POST /bootstrap/step3-structure/payroll-groups
 * Paso 3: Carga de Roles de Pago (Bootstrap Mode)
 * IMPORTANTE: Debe ejecutarse ANTES de Areas y Work Groups
 */
export const bootstrapStep3PayrollGroups = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { payrollGroups } = body;

    if (!Array.isArray(payrollGroups) || payrollGroups.length === 0) {
      return c.json({ error: 'Debe enviar al menos un rol de pago' }, 400);
    }

    console.log(`📋 Bootstrap Step 3 (Payroll Groups): Procesando ${payrollGroups.length} roles de pago...`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (tenantError || !tenant) {
      console.error('❌ Error localizando tenant:', tenantError);
      return c.json({ error: 'Tenant no encontrado' }, 500);
    }

    const tenantId = tenant.id;
    const insertedGroups = [];
    const updatedGroups = [];
    const errors = [];

    for (let i = 0; i < payrollGroups.length; i++) {
      const group = payrollGroups[i];
      const rowNumber = i + 1;

      console.log(`📍 Procesando ${rowNumber} de ${payrollGroups.length}: ${group.payroll_group_name}`);

      try {
        const { data: existing, error: checkError } = await supabase
          .from('payroll_groups')
          .select('id, payroll_group_name')
          .eq('tenant_id', tenantId)
          .eq('payroll_group_code', group.payroll_group_code)
          .maybeSingle();

        if (checkError) {
          console.error(`❌ Error verificando existencia en registro ${rowNumber}:`, checkError);
          errors.push({ row: rowNumber, payroll_group: group.payroll_group_name, error: checkError.message });
          continue;
        }

        if (existing) {
          console.log(`   🔄 Código "${group.payroll_group_code}" ya existe, actualizando...`);
          
          const { data: updated, error: updateError } = await supabase
            .from('payroll_groups')
            .update({
              payroll_group_name: group.payroll_group_name,
              payroll_group_short_name: group.payroll_group_short_name,
              is_active: true,
              updated_by: 'BOOTSTRAP',
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select('id, payroll_group_name')
            .single();

          if (updateError) {
            console.error(`❌ Error actualizando registro ${rowNumber}:`, updateError);
            errors.push({ row: rowNumber, payroll_group: group.payroll_group_name, error: updateError.message });
          } else {
            updatedGroups.push(updated);
            console.log(`   ✅ Actualizado: ${updated.payroll_group_name}`);
          }
        } else {
          console.log(`   ➕ Código "${group.payroll_group_code}" nuevo, insertando...`);
          
          const { data: inserted, error: insertError } = await supabase
            .from('payroll_groups')
            .insert({
              tenant_id: tenantId,
              payroll_group_name: group.payroll_group_name,
              payroll_group_short_name: group.payroll_group_short_name,
              payroll_group_code: group.payroll_group_code,
              is_active: true,
              created_by: 'BOOTSTRAP'
            })
            .select('id, payroll_group_name')
            .single();

          if (insertError) {
            console.error(`❌ Error insertando registro ${rowNumber}:`, insertError);
            errors.push({ row: rowNumber, payroll_group: group.payroll_group_name, error: insertError.message });
          } else {
            insertedGroups.push(inserted);
            console.log(`   ✅ Insertado: ${inserted.payroll_group_name}`);
          }
        }
      } catch (error: any) {
        console.error(`❌ Excepción en registro ${rowNumber}:`, error);
        errors.push({ row: rowNumber, payroll_group: group.payroll_group_name, error: error.message });
      }
    }

    if (errors.length > 0) {
      return c.json({
        ok: false,
        error: 'Algunos registros no pudieron ser procesados',
        inserted_count: insertedGroups.length,
        updated_count: updatedGroups.length,
        error_count: errors.length,
        errors: errors
      }, 207);
    }

    const totalProcessed = insertedGroups.length + updatedGroups.length;
    console.log(`🎉 ${totalProcessed} roles de pago procesados: ${insertedGroups.length} nuevos, ${updatedGroups.length} actualizados`);

    return c.json({
      ok: true,
      message: `${totalProcessed} roles de pago procesados correctamente`,
      inserted_count: insertedGroups.length,
      updated_count: updatedGroups.length,
      total_count: totalProcessed,
      tenant_id: tenantId
    });
  } catch (error: any) {
    console.error('❌ Error en bootstrapStep3PayrollGroups:', error);
    return c.json({ ok: false, error: 'Error procesando roles de pago', details: error.message }, 500);
  }
};

/**
 * POST /bootstrap/step3-structure/areas
 * Paso 3: Carga de Áreas (Bootstrap Mode)
 */
export const bootstrapStep3Areas = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { areas } = body;

    if (!Array.isArray(areas) || areas.length === 0) {
      return c.json({ error: 'Debe enviar al menos un área' }, 400);
    }

    console.log(`📋 Bootstrap Step 3 (Areas): Procesando ${areas.length} áreas...`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (tenantError || !tenant) {
      console.error('❌ Error localizando tenant:', tenantError);
      return c.json({ error: 'Tenant no encontrado' }, 500);
    }

    const tenantId = tenant.id;
    const insertedAreas = [];
    const updatedAreas = [];
    const errors = [];

    for (let i = 0; i < areas.length; i++) {
      const area = areas[i];
      const rowNumber = i + 1;

      console.log(`📍 Procesando ${rowNumber} de ${areas.length}: ${area.area_name}`);

      try {
        // Resolver payroll_group_id si se proporcionó código
        let payrollGroupId = null;
        if (area.payroll_group_code) {
          const { data: payrollGroup } = await supabase
            .from('payroll_groups')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('payroll_group_code', area.payroll_group_code)
            .maybeSingle();

          if (payrollGroup) {
            payrollGroupId = payrollGroup.id;
          } else {
            console.warn(`⚠️ Rol de pago "${area.payroll_group_code}" no encontrado, continuando sin FK`);
          }
        }

        const { data: existing, error: checkError } = await supabase
          .from('areas')
          .select('id, area_name')
          .eq('tenant_id', tenantId)
          .eq('area_code', area.area_code)
          .maybeSingle();

        if (checkError) {
          console.error(`❌ Error verificando existencia en registro ${rowNumber}:`, checkError);
          errors.push({ row: rowNumber, area: area.area_name, error: checkError.message });
          continue;
        }

        if (existing) {
          console.log(`   🔄 Código "${area.area_code}" ya existe, actualizando...`);
          
          const { data: updated, error: updateError } = await supabase
            .from('areas')
            .update({
              area_name: area.area_name,
              area_short_name: area.area_short_name,
              payroll_group_id: payrollGroupId,
              is_active: true,
              updated_by: 'BOOTSTRAP',
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select('id, area_name')
            .single();

          if (updateError) {
            console.error(`❌ Error actualizando registro ${rowNumber}:`, updateError);
            errors.push({ row: rowNumber, area: area.area_name, error: updateError.message });
          } else {
            updatedAreas.push(updated);
            console.log(`   ✅ Actualizado: ${updated.area_name}`);
          }
        } else {
          console.log(`   ➕ Código "${area.area_code}" nuevo, insertando...`);
          
          const { data: inserted, error: insertError } = await supabase
            .from('areas')
            .insert({
              tenant_id: tenantId,
              area_name: area.area_name,
              area_short_name: area.area_short_name,
              area_code: area.area_code,
              payroll_group_id: payrollGroupId,
              is_active: true,
              created_by: 'BOOTSTRAP'
            })
            .select('id, area_name')
            .single();

          if (insertError) {
            console.error(`❌ Error insertando registro ${rowNumber}:`, insertError);
            errors.push({ row: rowNumber, area: area.area_name, error: insertError.message });
          } else {
            insertedAreas.push(inserted);
            console.log(`   ✅ Insertado: ${inserted.area_name}`);
          }
        }
      } catch (error: any) {
        console.error(`❌ Excepción en registro ${rowNumber}:`, error);
        errors.push({ row: rowNumber, area: area.area_name, error: error.message });
      }
    }

    if (errors.length > 0) {
      return c.json({
        ok: false,
        error: 'Algunos registros no pudieron ser procesados',
        inserted_count: insertedAreas.length,
        updated_count: updatedAreas.length,
        error_count: errors.length,
        errors: errors
      }, 207);
    }

    const totalProcessed = insertedAreas.length + updatedAreas.length;
    console.log(`🎉 ${totalProcessed} áreas procesadas: ${insertedAreas.length} nuevas, ${updatedAreas.length} actualizadas`);

    return c.json({
      ok: true,
      message: `${totalProcessed} áreas procesadas correctamente`,
      inserted_count: insertedAreas.length,
      updated_count: updatedAreas.length,
      total_count: totalProcessed,
      tenant_id: tenantId
    });
  } catch (error: any) {
    console.error('❌ Error en bootstrapStep3Areas:', error);
    return c.json({ ok: false, error: 'Error procesando áreas', details: error.message }, 500);
  }
};

/**
 * POST /bootstrap/step3-structure/cost-centers
 * Paso 3: Carga de Centros de Costo (Bootstrap Mode)
 */
export const bootstrapStep3CostCenters = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { costCenters } = body;

    if (!Array.isArray(costCenters) || costCenters.length === 0) {
      return c.json({ error: 'Debe enviar al menos un centro de costo' }, 400);
    }

    console.log(`📋 Bootstrap Step 3 (Cost Centers): Procesando ${costCenters.length} centros de costo...`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (tenantError || !tenant) {
      console.error('❌ Error localizando tenant:', tenantError);
      return c.json({ error: 'Tenant no encontrado' }, 500);
    }

    const tenantId = tenant.id;
    const insertedCostCenters = [];
    const updatedCostCenters = [];
    const errors = [];

    for (let i = 0; i < costCenters.length; i++) {
      const cc = costCenters[i];
      const rowNumber = i + 1;

      console.log(`📍 Procesando ${rowNumber} de ${costCenters.length}: ${cc.cost_center_name}`);

      try {
        const { data: existing, error: checkError } = await supabase
          .from('cost_centers')
          .select('id, cost_center_name')
          .eq('tenant_id', tenantId)
          .eq('cost_center_code', cc.cost_center_code)
          .maybeSingle();

        if (checkError) {
          console.error(`❌ Error verificando existencia en registro ${rowNumber}:`, checkError);
          errors.push({ row: rowNumber, cost_center: cc.cost_center_name, error: checkError.message });
          continue;
        }

        if (existing) {
          console.log(`   🔄 Código "${cc.cost_center_code}" ya existe, actualizando...`);
          
          const { data: updated, error: updateError } = await supabase
            .from('cost_centers')
            .update({
              cost_center_name: cc.cost_center_name,
              cost_center_short_name: cc.cost_center_short_name,
              homologation_code: cc.homologation_code || null,
              gl_account_code: cc.gl_account_code || null,
              is_active: true,
              updated_by: 'BOOTSTRAP',
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select('id, cost_center_name')
            .single();

          if (updateError) {
            console.error(`❌ Error actualizando registro ${rowNumber}:`, updateError);
            errors.push({ row: rowNumber, cost_center: cc.cost_center_name, error: updateError.message });
          } else {
            updatedCostCenters.push(updated);
            console.log(`   ✅ Actualizado: ${updated.cost_center_name}`);
          }
        } else {
          console.log(`   ➕ Código "${cc.cost_center_code}" nuevo, insertando...`);
          
          const { data: inserted, error: insertError } = await supabase
            .from('cost_centers')
            .insert({
              tenant_id: tenantId,
              cost_center_name: cc.cost_center_name,
              cost_center_short_name: cc.cost_center_short_name,
              cost_center_code: cc.cost_center_code,
              homologation_code: cc.homologation_code || null,
              gl_account_code: cc.gl_account_code || null,
              is_active: true,
              created_by: 'BOOTSTRAP'
            })
            .select('id, cost_center_name')
            .single();

          if (insertError) {
            console.error(`❌ Error insertando registro ${rowNumber}:`, insertError);
            errors.push({ row: rowNumber, cost_center: cc.cost_center_name, error: insertError.message });
          } else {
            insertedCostCenters.push(inserted);
            console.log(`   ✅ Insertado: ${inserted.cost_center_name}`);
          }
        }
      } catch (error: any) {
        console.error(`❌ Excepción en registro ${rowNumber}:`, error);
        errors.push({ row: rowNumber, cost_center: cc.cost_center_name, error: error.message });
      }
    }

    if (errors.length > 0) {
      return c.json({
        ok: false,
        error: 'Algunos registros no pudieron ser procesados',
        inserted_count: insertedCostCenters.length,
        updated_count: updatedCostCenters.length,
        error_count: errors.length,
        errors: errors
      }, 207);
    }

    const totalProcessed = insertedCostCenters.length + updatedCostCenters.length;
    console.log(`🎉 ${totalProcessed} centros de costo procesados: ${insertedCostCenters.length} nuevos, ${updatedCostCenters.length} actualizados`);

    return c.json({
      ok: true,
      message: `${totalProcessed} centros de costo procesados correctamente`,
      inserted_count: insertedCostCenters.length,
      updated_count: updatedCostCenters.length,
      total_count: totalProcessed,
      tenant_id: tenantId
    });
  } catch (error: any) {
    console.error('❌ Error en bootstrapStep3CostCenters:', error);
    return c.json({ ok: false, error: 'Error procesando centros de costo', details: error.message }, 500);
  }
};

/**
 * POST /bootstrap/step3-structure/job-titles
 * Paso 3: Carga de Cargos (Bootstrap Mode)
 */
export const bootstrapStep3JobTitles = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { jobTitles } = body;

    if (!Array.isArray(jobTitles) || jobTitles.length === 0) {
      return c.json({ error: 'Debe enviar al menos un cargo' }, 400);
    }

    console.log(`📋 Bootstrap Step 3 (Job Titles): Procesando ${jobTitles.length} cargos...`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (tenantError || !tenant) {
      console.error('❌ Error localizando tenant:', tenantError);
      return c.json({ error: 'Tenant no encontrado' }, 500);
    }

    const tenantId = tenant.id;
    const insertedJobTitles = [];
    const updatedJobTitles = [];
    const errors = [];

    for (let i = 0; i < jobTitles.length; i++) {
      const job = jobTitles[i];
      const rowNumber = i + 1;

      console.log(`📍 Procesando ${rowNumber} de ${jobTitles.length}: ${job.job_title_name}`);

      try {
        const { data: existing, error: checkError } = await supabase
          .from('job_titles')
          .select('id, job_title_name')
          .eq('tenant_id', tenantId)
          .eq('job_title_code', job.job_title_code)
          .maybeSingle();

        if (checkError) {
          console.error(`❌ Error verificando existencia en registro ${rowNumber}:`, checkError);
          errors.push({ row: rowNumber, job_title: job.job_title_name, error: checkError.message });
          continue;
        }

        if (existing) {
          console.log(`   🔄 Código "${job.job_title_code}" ya existe, actualizando...`);
          
          const { data: updated, error: updateError } = await supabase
            .from('job_titles')
            .update({
              job_title_name: job.job_title_name,
              job_title_short_name: job.job_title_short_name,
              is_active: true,
              updated_by: 'BOOTSTRAP',
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select('id, job_title_name')
            .single();

          if (updateError) {
            console.error(`❌ Error actualizando registro ${rowNumber}:`, updateError);
            errors.push({ row: rowNumber, job_title: job.job_title_name, error: updateError.message });
          } else {
            updatedJobTitles.push(updated);
            console.log(`   ✅ Actualizado: ${updated.job_title_name}`);
          }
        } else {
          console.log(`   ➕ Código "${job.job_title_code}" nuevo, insertando...`);
          
          const { data: inserted, error: insertError } = await supabase
            .from('job_titles')
            .insert({
              tenant_id: tenantId,
              job_title_name: job.job_title_name,
              job_title_short_name: job.job_title_short_name,
              job_title_code: job.job_title_code,
              is_active: true,
              created_by: 'BOOTSTRAP'
            })
            .select('id, job_title_name')
            .single();

          if (insertError) {
            console.error(`❌ Error insertando registro ${rowNumber}:`, insertError);
            errors.push({ row: rowNumber, job_title: job.job_title_name, error: insertError.message });
          } else {
            insertedJobTitles.push(inserted);
            console.log(`   ✅ Insertado: ${inserted.job_title_name}`);
          }
        }
      } catch (error: any) {
        console.error(`❌ Excepción en registro ${rowNumber}:`, error);
        errors.push({ row: rowNumber, job_title: job.job_title_name, error: error.message });
      }
    }

    if (errors.length > 0) {
      return c.json({
        ok: false,
        error: 'Algunos registros no pudieron ser procesados',
        inserted_count: insertedJobTitles.length,
        updated_count: updatedJobTitles.length,
        error_count: errors.length,
        errors: errors
      }, 207);
    }

    const totalProcessed = insertedJobTitles.length + updatedJobTitles.length;
    console.log(`🎉 ${totalProcessed} cargos procesados: ${insertedJobTitles.length} nuevos, ${updatedJobTitles.length} actualizados`);

    return c.json({
      ok: true,
      message: `${totalProcessed} cargos procesados correctamente`,
      inserted_count: insertedJobTitles.length,
      updated_count: updatedJobTitles.length,
      total_count: totalProcessed,
      tenant_id: tenantId
    });
  } catch (error: any) {
    console.error('❌ Error en bootstrapStep3JobTitles:', error);
    return c.json({ ok: false, error: 'Error procesando cargos', details: error.message }, 500);
  }
};

/**
 * POST /bootstrap/step3-structure/work-groups
 * Paso 3: Carga de Grupos (Bootstrap Mode)
 */
export const bootstrapStep3WorkGroups = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { workGroups } = body;

    if (!Array.isArray(workGroups) || workGroups.length === 0) {
      return c.json({ error: 'Debe enviar al menos un grupo' }, 400);
    }

    console.log(`📋 Bootstrap Step 3 (Work Groups): Procesando ${workGroups.length} grupos...`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (tenantError || !tenant) {
      console.error('❌ Error localizando tenant:', tenantError);
      return c.json({ error: 'Tenant no encontrado' }, 500);
    }

    const tenantId = tenant.id;
    const insertedGroups = [];
    const updatedGroups = [];
    const errors = [];

    for (let i = 0; i < workGroups.length; i++) {
      const group = workGroups[i];
      const rowNumber = i + 1;

      console.log(`📍 Procesando ${rowNumber} de ${workGroups.length}: ${group.work_group_name}`);

      try {
        // Resolver payroll_group_id si se proporcionó código
        let payrollGroupId = null;
        if (group.payroll_group_code) {
          const { data: payrollGroup } = await supabase
            .from('payroll_groups')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('payroll_group_code', group.payroll_group_code)
            .maybeSingle();

          if (payrollGroup) {
            payrollGroupId = payrollGroup.id;
          } else {
            console.warn(`⚠️ Rol de pago "${group.payroll_group_code}" no encontrado, continuando sin FK`);
          }
        }

        const { data: existing, error: checkError } = await supabase
          .from('work_groups')
          .select('id, work_group_name')
          .eq('tenant_id', tenantId)
          .eq('work_group_code', group.work_group_code)
          .maybeSingle();

        if (checkError) {
          console.error(`❌ Error verificando existencia en registro ${rowNumber}:`, checkError);
          errors.push({ row: rowNumber, work_group: group.work_group_name, error: checkError.message });
          continue;
        }

        if (existing) {
          console.log(`   🔄 Código "${group.work_group_code}" ya existe, actualizando...`);
          
          const { data: updated, error: updateError } = await supabase
            .from('work_groups')
            .update({
              work_group_name: group.work_group_name,
              work_group_short_name: group.work_group_short_name,
              payroll_group_id: payrollGroupId,
              is_active: true,
              updated_by: 'BOOTSTRAP',
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select('id, work_group_name')
            .single();

          if (updateError) {
            console.error(`❌ Error actualizando registro ${rowNumber}:`, updateError);
            errors.push({ row: rowNumber, work_group: group.work_group_name, error: updateError.message });
          } else {
            updatedGroups.push(updated);
            console.log(`   ✅ Actualizado: ${updated.work_group_name}`);
          }
        } else {
          console.log(`   ➕ Código "${group.work_group_code}" nuevo, insertando...`);
          
          const { data: inserted, error: insertError } = await supabase
            .from('work_groups')
            .insert({
              tenant_id: tenantId,
              work_group_name: group.work_group_name,
              work_group_short_name: group.work_group_short_name,
              work_group_code: group.work_group_code,
              payroll_group_id: payrollGroupId,
              is_active: true,
              created_by: 'BOOTSTRAP'
            })
            .select('id, work_group_name')
            .single();

          if (insertError) {
            console.error(`❌ Error insertando registro ${rowNumber}:`, insertError);
            errors.push({ row: rowNumber, work_group: group.work_group_name, error: insertError.message });
          } else {
            insertedGroups.push(inserted);
            console.log(`   ✅ Insertado: ${inserted.work_group_name}`);
          }
        }
      } catch (error: any) {
        console.error(`❌ Excepción en registro ${rowNumber}:`, error);
        errors.push({ row: rowNumber, work_group: group.work_group_name, error: error.message });
      }
    }

    if (errors.length > 0) {
      return c.json({
        ok: false,
        error: 'Algunos registros no pudieron ser procesados',
        inserted_count: insertedGroups.length,
        updated_count: updatedGroups.length,
        error_count: errors.length,
        errors: errors
      }, 207);
    }

    const totalProcessed = insertedGroups.length + updatedGroups.length;
    console.log(`🎉 ${totalProcessed} grupos procesados: ${insertedGroups.length} nuevos, ${updatedGroups.length} actualizados`);

    return c.json({
      ok: true,
      message: `${totalProcessed} grupos procesados correctamente`,
      inserted_count: insertedGroups.length,
      updated_count: updatedGroups.length,
      total_count: totalProcessed,
      tenant_id: tenantId
    });
  } catch (error: any) {
    console.error('❌ Error en bootstrapStep3WorkGroups:', error);
    return c.json({ ok: false, error: 'Error procesando grupos', details: error.message }, 500);
  }
};

/**
 * POST /bootstrap/step3-structure/employee-profiles
 * Paso 3: Carga de Perfiles de Empleado (Bootstrap Mode)
 */
export const bootstrapStep3EmployeeProfiles = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { employeeProfiles } = body;

    if (!Array.isArray(employeeProfiles) || employeeProfiles.length === 0) {
      return c.json({ error: 'Debe enviar al menos un perfil de empleado' }, 400);
    }

    console.log(`📋 Bootstrap Step 3 (Employee Profiles): Procesando ${employeeProfiles.length} perfiles...`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (tenantError || !tenant) {
      console.error('❌ Error localizando tenant:', tenantError);
      return c.json({ error: 'Tenant no encontrado' }, 500);
    }

    const tenantId = tenant.id;
    const insertedProfiles = [];
    const updatedProfiles = [];
    const errors = [];

    for (let i = 0; i < employeeProfiles.length; i++) {
      const profile = employeeProfiles[i];
      const rowNumber = i + 1;

      console.log(`📍 Procesando ${rowNumber} de ${employeeProfiles.length}: ${profile.profile_name}`);

      try {
        const { data: existing, error: checkError } = await supabase
          .from('employee_profiles')
          .select('id, profile_name')
          .eq('tenant_id', tenantId)
          .eq('employee_profile_code', profile.employee_profile_code)
          .maybeSingle();

        if (checkError) {
          console.error(`❌ Error verificando existencia en registro ${rowNumber}:`, checkError);
          errors.push({ row: rowNumber, profile: profile.profile_name, error: checkError.message });
          continue;
        }

        if (existing) {
          // ACTUALIZAR
          console.log(`   🔄 Código "${profile.employee_profile_code}" ya existe, actualizando...`);
          
          const { data: updated, error: updateError } = await supabase
            .from('employee_profiles')
            .update({
              profile_name: profile.profile_name,
              profile_short_name: profile.profile_short_name,
              is_active: true,
              updated_by: 'BOOTSTRAP',
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select('id, profile_name')
            .single();

          if (updateError) {
            console.error(`❌ Error actualizando registro ${rowNumber}:`, updateError);
            errors.push({ row: rowNumber, profile: profile.profile_name, error: updateError.message });
          } else {
            updatedProfiles.push(updated);
            console.log(`   ✅ Actualizado: ${updated.profile_name}`);
          }
        } else {
          // INSERTAR
          console.log(`   ➕ Código "${profile.employee_profile_code}" nuevo, insertando...`);
          
          const { data: inserted, error: insertError } = await supabase
            .from('employee_profiles')
            .insert({
              tenant_id: tenantId,
              employee_profile_code: profile.employee_profile_code,
              profile_name: profile.profile_name,
              profile_short_name: profile.profile_short_name,
              is_active: true,
              created_by: 'BOOTSTRAP'
            })
            .select('id, profile_name')
            .single();

          if (insertError) {
            console.error(`❌ Error insertando registro ${rowNumber}:`, insertError);
            errors.push({ row: rowNumber, profile: profile.profile_name, error: insertError.message });
          } else {
            insertedProfiles.push(inserted);
            console.log(`   ✅ Insertado: ${inserted.profile_name}`);
          }
        }
      } catch (error: any) {
        console.error(`❌ Excepción en registro ${rowNumber}:`, error);
        errors.push({ row: rowNumber, profile: profile.profile_name, error: error.message });
      }
    }

    if (errors.length > 0) {
      return c.json({
        ok: false,
        error: 'Algunos registros no pudieron ser procesados',
        inserted_count: insertedProfiles.length,
        updated_count: updatedProfiles.length,
        error_count: errors.length,
        errors: errors
      }, 207);
    }

    const totalProcessed = insertedProfiles.length + updatedProfiles.length;
    console.log(`🎉 ${totalProcessed} perfiles procesados: ${insertedProfiles.length} nuevos, ${updatedProfiles.length} actualizados`);

    return c.json({
      ok: true,
      message: `${totalProcessed} perfiles de empleado procesados correctamente`,
      inserted_count: insertedProfiles.length,
      updated_count: updatedProfiles.length,
      total_count: totalProcessed,
      tenant_id: tenantId
    });
  } catch (error: any) {
    console.error('❌ Error en bootstrapStep3EmployeeProfiles:', error);
    return c.json({ ok: false, error: 'Error procesando perfiles de empleado', details: error.message }, 500);
  }
};

/**
 * POST /bootstrap/complete
 * Completa el wizard creando el usuario administrador del tenant
 * y cambiando el estado de tenant_boarding → active
 */
export const bootstrapComplete = async (c: Context) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const bootstrapToken = c.get('bootstrapToken');
    const body = await c.req.json();
    const { admin_username, admin_name, admin_lastname, admin_email, admin_phone, admin_password } = body;

    // ========================================
    // 1. VALIDAR CAMPOS OBLIGATORIOS
    // ========================================
    if (!admin_name?.trim() || !admin_lastname?.trim() || !admin_email?.trim() || !admin_password) {
      return c.json({
        ok: false,
        error: 'Todos los campos son obligatorios'
      }, 400);
    }

    if (admin_password.length < 8) {
      return c.json({
        ok: false,
        error: 'La contraseña debe tener al menos 8 caracteres'
      }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(admin_email)) {
      return c.json({
        ok: false,
        error: 'El correo electrónico no tiene un formato válido'
      }, 400);
    }

    // ========================================
    // 2. OBTENER TENANT_ID DEL KV STORE
    // ========================================
    const tenantId = await kv.get('system:tenant_id');

    if (!tenantId) {
      console.error('❌ No se encontró tenant_id en KV Store');
      return c.json({
        ok: false,
        error: 'Tenant no encontrado en sistema'
      }, 500);
    }

    console.log(`✅ Tenant ID obtenido: ${tenantId}`);

    // ========================================
    // 2.1 OBTENER PREFERRED_LANGUAGE_CODE DEL TENANT
    // ========================================
    const { data: tenantLanguageSettings, error: languageError } = await supabase
      .from('tenant_language_settings')
      .select('default_language_code')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const preferredLanguageCode = tenantLanguageSettings?.default_language_code || 'es';
    console.log(`✅ Idioma preferido resuelto: ${preferredLanguageCode}`);

    // ========================================
    // 3. OBTENER COMPANY_ID (primera empresa del tenant)
    // ========================================
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (companyError || !company) {
      console.error('❌ Error obteniendo company_id:', companyError);
      return c.json({
        ok: false,
        error: 'Empresa no encontrada'
      }, 500);
    }

    const companyId = company.id;

    console.log(`✅ Creando usuario administrador para tenant: ${tenantId}, company: ${companyId}`);

    // ========================================
    // 4. VERIFICAR Y LIMPIAR USUARIOS EXISTENTES
    // ========================================
    const emailToCheck = admin_email.toLowerCase();
    
    // 4.1 Verificar si existe en tabla users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, auth_user_id')
      .eq('email', emailToCheck) // ✅ Columna correcta: email (no user_email)
      .maybeSingle();

    if (existingUser) {
      console.warn(`⚠️ Usuario encontrado en tabla users: ${existingUser.id}`);
      return c.json({
        ok: false,
        error: 'Ya existe un usuario con este correo electrónico'
      }, 400);
    }

    // 4.2 Verificar si existe usuario huérfano en auth.users (sin registro en tabla users)
    console.log('🔍 Verificando usuarios huérfanos en auth.users...');
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (!listError && authUsers?.users) {
      const orphanedAuthUser = authUsers.users.find(u => u.email === emailToCheck);
      
      if (orphanedAuthUser) {
        console.warn(`⚠️ Usuario huérfano encontrado en auth.users: ${orphanedAuthUser.id}`);
        console.log('🧹 Eliminando usuario huérfano de auth.users...');
        
        const { error: deleteError } = await supabase.auth.admin.deleteUser(orphanedAuthUser.id);
        
        if (deleteError) {
          console.error('❌ Error eliminando usuario huérfano:', deleteError);
        } else {
          console.log('✅ Usuario huérfano eliminado correctamente');
        }
      }
    }

    // ========================================
    // 5. CREAR USUARIO EN SUPABASE AUTH (trigger handle_new_user creará registro en public.users)
    // ========================================
    const finalUsername = admin_username?.trim() || emailToCheck;
    const displayName = `${admin_name.trim()} ${admin_lastname.trim()}`;
    
    console.log(`📧 Creando usuario en auth.users: ${emailToCheck}`);
    console.log(`   - Username: ${finalUsername}`);
    console.log(`   - Display Name: ${displayName}`);
    console.log(`   - Language: ${preferredLanguageCode}`);
    console.log(`   - Tenant ID: ${tenantId}`);

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: emailToCheck,
      password: admin_password,
      email_confirm: true, // Auto-confirmar email (no hay servidor de correo configurado)
      user_metadata: {
        tenant_id: tenantId,
        username: finalUsername,
        name: admin_name.trim(),
        lastname: admin_lastname.trim(),
        display_name: displayName,
        preferred_language_code: preferredLanguageCode,
        role: 'tenant_admin',
        bootstrap_mode: true
      }
    });

    if (authError || !authUser.user) {
      console.error('❌ [CREATE USER] Error creando usuario en Supabase Auth:', authError);
      console.error('❌ [CREATE USER] Datos enviados:', {
        email: emailToCheck,
        tenant_id: tenantId,
        username: finalUsername,
        display_name: displayName,
        preferred_language_code: preferredLanguageCode
      });
      return c.json({
        ok: false,
        error: `Error al crear usuario: ${authError?.message || 'Error desconocido'}`,
        details: {
          tenant_id: tenantId,
          username: finalUsername,
          preferred_language_code: preferredLanguageCode
        }
      }, 500);
    }

    const newAuthUserId = authUser.user.id;
    console.log(`✅ Usuario creado en Auth: ${newAuthUserId}`);

    // ========================================
    // 5.1 VERIFICAR QUE EL TRIGGER CREÓ EL REGISTRO EN public.users
    // ========================================
    console.log('🔍 Esperando 2 segundos para que el trigger handle_new_user() complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: verifyAuthUser, error: verifyAuthError } = await supabase.auth.admin.getUserById(newAuthUserId);
    if (verifyAuthUser?.user) {
      console.log('✅ [VERIFICACIÓN AUTH] Usuario en auth.users:', {
        id: verifyAuthUser.user.id,
        email: verifyAuthUser.user.email,
        user_metadata: verifyAuthUser.user.user_metadata
      });
    }

    const { data: createdUser, error: verifyError } = await supabase
      .from('users')
      .select('id, tenant_id, auth_user_id, username, display_name, email, phone, preferred_language_code')
      .eq('auth_user_id', newAuthUserId)
      .maybeSingle();

    if (verifyError || !createdUser) {
      console.error('❌ [TRIGGER FAILED] El trigger handle_new_user() NO creó el registro en public.users');
      console.error('❌ [TRIGGER FAILED] Error:', verifyError);
      
      // ROLLBACK: Eliminar usuario de Auth
      await supabase.auth.admin.deleteUser(newAuthUserId);
      
      return c.json({
        ok: false,
        error: 'El trigger de base de datos falló al crear el usuario. Contacte al administrador del sistema.',
        trigger_error: verifyError?.message
      }, 500);
    }

    console.log('✅ [VERIFICACIÓN DB] Usuario creado en public.users por trigger:', {
      id: createdUser.id,
      tenant_id: createdUser.tenant_id,
      auth_user_id: createdUser.auth_user_id,
      username: createdUser.username,
      display_name: createdUser.display_name,
      email: createdUser.email,
      phone: createdUser.phone,
      preferred_language_code: createdUser.preferred_language_code
    });

    // ========================================
    // 5.2 ACTUALIZAR PHONE Y REFORZAR OTROS CAMPOS (porque el trigger NO inserta phone)
    // ========================================
    if (admin_phone?.trim()) {
      console.log(`📞 Actualizando teléfono del usuario: ${admin_phone.trim()}`);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          phone: admin_phone.trim(),
          display_name: displayName, // Reforzar
          username: finalUsername,   // Reforzar
          preferred_language_code: preferredLanguageCode, // Reforzar
          updated_at: new Date().toISOString(),
          updated_by: 'WIZARD_BOOTSTRAP'
        })
        .eq('auth_user_id', newAuthUserId);

      if (updateError) {
        console.error('❌ Error actualizando phone del usuario:', updateError);
        // No es crítico, continuar...
      } else {
        console.log('✅ Teléfono y campos reforzados correctamente');
      }
    }

    const publicUserId = createdUser.id;
    console.log(`✅ Usuario registrado en public.users: ${publicUserId}`);

    // ========================================
    // 6. OBTENER O CREAR ROL "Tenant Admin"
    // ========================================
    const { data: superAdminRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role_key', 'SUPER_ADMIN') // ✅ Rol creado en seed
      .eq('is_active', true)
      .maybeSingle();

    let roleId: string;

    if (!superAdminRole) {
      // El rol no existe, crearlo como fallback
      console.log('⚠️ Rol SUPER_ADMIN no existe en seed, creándolo...');
      
      const { data: newRole, error: createRoleError } = await supabase
        .from('roles')
        .insert({
          tenant_id: tenantId,
          role_key: 'SUPER_ADMIN',
          role_name: 'Super Administrador',
          role_scope: 'TENANT',
          is_active: true,
          created_by: 'BOOTSTRAP'
        })
        .select()
        .single();

      if (createRoleError || !newRole) {
        console.error('❌ Error creando rol SUPER_ADMIN:', createRoleError);
        
        // ROLLBACK: Eliminar usuario de Auth
        await supabase.auth.admin.deleteUser(authUser.user.id);
        
        return c.json({
          ok: false,
          error: 'Error creando rol de administrador'
        }, 500);
      }

      roleId = newRole.id;
      console.log(`✅ Rol TENANT_ADMIN creado: ${roleId}`);

      // ========================================
      // 5.1 ASIGNAR TODOS LOS PERMISOS AL ROL SUPER_ADMIN
      // ========================================
      console.log('🔐 Asignando permisos completos al rol SUPER_ADMIN...');
      
      // Obtener TODAS las screen_actions del sistema
      const { data: allScreenActions, error: actionsError } = await supabase
        .from('screen_actions')
        .select('id')
        .eq('is_active', true);

      if (actionsError) {
        console.error('❌ Error obteniendo screen_actions:', actionsError);
        // ROLLBACK: Eliminar rol creado
        await supabase.from('roles').delete().eq('id', roleId);
        await supabase.auth.admin.deleteUser(authUser.user.id);
        
        return c.json({
          ok: false,
          error: 'Error obteniendo permisos del sistema'
        }, 500);
      }

      if (!allScreenActions || allScreenActions.length === 0) {
        console.warn('⚠️ No se encontraron screen_actions en el sistema');
      } else {
        // Crear permisos en role_screen_actions para TODAS las acciones
        const permissionsToInsert = allScreenActions.map(action => ({
          tenant_id: tenantId,
          role_id: roleId,
          screen_action_id: action.id,
          is_allowed: true, // ✅ ACCESO COMPLETO
          is_active: true,
          created_by: 'BOOTSTRAP'
        }));

        const { error: permissionsError } = await supabase
          .from('role_screen_actions')
          .insert(permissionsToInsert);

        if (permissionsError) {
          console.error('❌ Error asignando permisos:', permissionsError);
          // ROLLBACK: Eliminar rol creado
          await supabase.from('roles').delete().eq('id', roleId);
          await supabase.auth.admin.deleteUser(authUser.user.id);
          
          return c.json({
            ok: false,
            error: 'Error asignando permisos al rol'
          }, 500);
        }

        console.log(`✅ ${permissionsToInsert.length} permisos asignados al rol SUPER_ADMIN`);
      }

    } else {
      roleId = superAdminRole.id;
      console.log(`✅ Rol SUPER_ADMIN encontrado: ${roleId}`);
    }

    // ========================================
    // 7. ASIGNAR ROL EN user_roles (ya NO creamos en users, el trigger lo hizo)
    // ========================================
    const { error: userRoleError } = await supabase
      .from('user_roles')
      .insert({
        tenant_id: tenantId,
        user_id: publicUserId, // ✅ Usar el ID creado por el trigger
        role_id: roleId,
        company_id: companyId, // Asignar a la empresa principal
        is_active: true,
        created_by: 'BOOTSTRAP'
      });

    if (userRoleError) {
      console.error('❌ Error asignando rol al usuario:', userRoleError);
      
      // ROLLBACK: Eliminar usuario de public.users y auth.users
      await supabase.from('users').delete().eq('id', publicUserId);
      await supabase.auth.admin.deleteUser(newAuthUserId);
      
      return c.json({
        ok: false,
        error: `Error asignando rol: ${userRoleError.message}`
      }, 500);
    }

    console.log(`✅ Rol asignado al usuario en user_roles`);

    // ========================================
    // 9. CAMBIAR ESTADO DEL TENANT: boarding → active
    // ========================================
    const { error: tenantUpdateError } = await supabase
      .from('tenants')
      .update({
        tenant_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId);

    if (tenantUpdateError) {
      console.error('❌ Error actualizando estado del tenant:', tenantUpdateError);
      // NO hacer rollback aquí, el usuario ya está creado
      // Solo registrar el error
    } else {
      console.log(`✅ Tenant activado: ${tenantId}`);
    }

    // ========================================
    // 10. INVALIDAR TOKEN DE BOOTSTRAP EN KV
    // ========================================
    await kv.del('bootstrap:token');
    await kv.set('bootstrap:completed_at', new Date().toISOString());

    console.log('✅ Bootstrap token invalidado en KV Store');

    // ========================================
    // 11. ACTUALIZAR tenant_onboarding: COMPLETAR WIZARD
    // ========================================
    const { error: onboardingUpdateError } = await supabase
      .from('tenant_onboarding')
      .update({
        current_step: '--', // ✅ Wizard completado, sin paso activo
        completed_steps: ['TENANT', 'COMPANY', 'STRUCTURE', 'EMPLOYEES', 'ADMINISTRATOR'], // ✅ Todos los pasos completados (CORREGIDO: Era 'ADMIN')
        completion_percentage: 100, // ✅ 100% completado
        user_id: publicUserId, // Usuario administrador creado (por el trigger)
        completed_at: new Date().toISOString(),
        onboarding_status: 'COMPLETED'
        // updated_at se establece automáticamente por el trigger
      })
      .eq('tenant_id', tenantId)
      .eq('onboarding_status', 'IN_PROGRESS');

    if (onboardingUpdateError) {
      console.error('⚠️ Error actualizando tenant_onboarding:', onboardingUpdateError);
      // NO hacer rollback, el usuario ya está creado
    } else {
      console.log('✅ tenant_onboarding completado: 100%, current_step → "--"');
    }

    // ========================================
    // 12. VERIFICACIÓN FINAL (para logs de debug)
    // ========================================
    const { data: finalVerification } = await supabase
      .from('users')
      .select('id, tenant_id, auth_user_id, username, display_name, email, phone, preferred_language_code')
      .eq('auth_user_id', newAuthUserId)
      .maybeSingle();

    console.log('🎉 [VERIFICACIÓN FINAL] Usuario completamente configurado:', finalVerification);

    // ========================================
    // 13. RETORNAR ÉXITO
    // ========================================
    return c.json({
      ok: true,
      message: 'Usuario administrador creado exitosamente',
      user_id: publicUserId,
      user_email: emailToCheck,
      username: finalUsername,
      display_name: displayName,
      tenant_status: 'active',
      wizard_completed: true
    });

  } catch (error: any) {
    console.error('❌ Error en bootstrapComplete:', error);
    return c.json({
      ok: false,
      error: error.message || 'Error interno del servidor'
    }, 500);
  }
};

/**
 * POST /bootstrap/update-step
 * Actualiza el progreso del wizard en tenant_onboarding
 * Se llama desde el frontend cuando el usuario avanza entre pasos
 */
export const updateBootstrapStep = async (c: Context) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const bootstrapToken = c.get('bootstrapToken');
    const body = await c.req.json();
    const { current_step, completed_steps, completion_percentage } = body;

    console.log(`📝 Actualizando wizard: current_step → ${current_step}, ${completion_percentage}%`);

    // ========================================
    // 1. OBTENER TENANT_ID DEL KV STORE
    // ========================================
    const tenantId = await kv.get('system:tenant_id');

    if (!tenantId) {
      console.error('❌ No se encontró tenant_id en KV Store');
      return c.json({
        ok: false,
        error: 'Tenant no encontrado en sistema'
      }, 500);
    }

    console.log(`✅ Tenant ID obtenido del KV: ${tenantId}`);

    // ========================================
    // 2. ACTUALIZAR tenant_onboarding
    // ========================================
    const { error: updateError } = await supabase
      .from('tenant_onboarding')
      .update({
        current_step,
        completed_steps,
        completion_percentage
      })
      .eq('tenant_id', tenantId)
      .eq('onboarding_status', 'IN_PROGRESS'); // Solo actualizar si está en progreso

    if (updateError) {
      console.error('❌ Error actualizando tenant_onboarding:', updateError);
      return c.json({
        ok: false,
        error: 'Error actualizando progreso del wizard',
        details: updateError.message
      }, 500);
    }

    console.log(`✅ Wizard actualizado: ${current_step}, ${completion_percentage}%`);

    return c.json({
      ok: true,
      message: 'Progreso actualizado correctamente'
    });

  } catch (error: any) {
    console.error('❌ Error en updateBootstrapStep:', error);
    return c.json({
      ok: false,
      error: error.message || 'Error interno del servidor'
    }, 500);
  }
};