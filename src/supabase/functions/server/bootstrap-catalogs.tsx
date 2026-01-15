import { Context } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * GET /bootstrap/catalogs
 * Obtiene TODOS los catálogos organizacionales y lookups disponibles
 * para generar dropdowns dinámicos en plantilla Excel
 * 
 * PROPÓSITO:
 * - Proveer listas de valores válidos para todas las columnas del Excel
 * - Sincronizar automáticamente con la BD
 * - Evitar errores de tipeo del usuario
 */
export const getBootstrapCatalogs = async (c: Context) => {
  try {
    console.log('📊 Bootstrap Catalogs: Obteniendo todos los catálogos...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ========================================
    // 1. OBTENER TENANT_ID
    // ========================================
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
    console.log(`✅ Tenant localizado: ${tenantId}`);

    // ========================================
    // 2. OBTENER LOOKUP GROUP IDs (OPCIONAL - puede no existir aún)
    // ========================================
    let genderGroupId: string | null = null;
    let contractTypeGroupId: string | null = null;

    try {
      const { data: genderGroup } = await supabase
        .from('lookup_groups')
        .select('id')
        .eq('lookup_group_key', 'GENDER')
        .maybeSingle();

      const { data: contractTypeGroup } = await supabase
        .from('lookup_groups')
        .select('id')
        .eq('lookup_group_key', 'CONTRACT_TYPE')
        .maybeSingle();

      genderGroupId = genderGroup?.id || null;
      contractTypeGroupId = contractTypeGroup?.id || null;

      if (!genderGroupId) {
        console.warn('⚠️ Lookup group GENDER no encontrado - se retornará lista vacía');
      }
      if (!contractTypeGroupId) {
        console.warn('⚠️ Lookup group CONTRACT_TYPE no encontrado - se retornará lista vacía');
      }
    } catch (lookupError: any) {
      console.warn('⚠️ Error obteniendo lookup groups (continuando sin lookups):', lookupError.message);
    }

    // ========================================
    // 3. QUERIES PARALELAS (máxima performance)
    // ========================================
    const [
      departmentsResult,
      jobTitlesResult,
      areasResult,
      costCentersResult,
      workLocationsResult,
      workGroupsResult,
      payrollGroupsResult,
      employeeProfilesResult,
      gendersResult,
      contractTypesResult
    ] = await Promise.all([
      // Estructura Organizacional
      supabase
        .from('departments')
        .select('department_code, department_name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('department_code'),
      
      supabase
        .from('job_titles')
        .select('job_title_code, job_title_name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('job_title_code'),
      
      supabase
        .from('areas')
        .select('area_code, area_name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('area_code'),
      
      supabase
        .from('cost_centers')
        .select('cost_center_code, cost_center_name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('cost_center_code'),
      
      supabase
        .from('work_locations')
        .select('work_location_code, work_location_name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('work_location_code'),
      
      supabase
        .from('work_groups')
        .select('work_group_code, work_group_name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('work_group_code'),
      
      supabase
        .from('payroll_groups')
        .select('payroll_group_code, payroll_group_name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('payroll_group_code'),
      
      supabase
        .from('employee_profiles')
        .select('employee_profile_code, profile_name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('employee_profile_code'),
      
      // Lookups GENDER (solo si existe el grupo)
      genderGroupId ? supabase
        .from('lookup_values')
        .select('lookup_key, lookup_label')
        .eq('lookup_group_id', genderGroupId)
        .eq('is_active', true)
        .order('sort_order')
        : Promise.resolve({ data: null, error: null }),
      
      // Lookups CONTRACT_TYPE (solo si existe el grupo)
      contractTypeGroupId ? supabase
        .from('lookup_values')
        .select('lookup_key, lookup_label')
        .eq('lookup_group_id', contractTypeGroupId)
        .eq('is_active', true)
        .order('sort_order')
        : Promise.resolve({ data: null, error: null })
    ]);

    // ========================================
    // 🔍 DEBUG: Verificar resultados crudos
    // ========================================
    console.log('🔍 DEBUG - Resultados crudos de employee_profiles:');
    console.log('   - Data:', employeeProfilesResult.data);
    console.log('   - Error:', employeeProfilesResult.error);
    console.log('   - Count:', employeeProfilesResult.data?.length || 0);

    // ========================================
    // 4. FORMATEAR RESPUESTA
    // ========================================
    const catalogs = {
      departments: (departmentsResult.data || []).map(d => ({
        code: d.department_code,
        name: d.department_name
      })),
      job_titles: (jobTitlesResult.data || []).map(j => ({
        code: j.job_title_code,
        name: j.job_title_name
      })),
      areas: (areasResult.data || []).map(a => ({
        code: a.area_code,
        name: a.area_name
      })),
      cost_centers: (costCentersResult.data || []).map(cc => ({
        code: cc.cost_center_code,
        name: cc.cost_center_name
      })),
      work_locations: (workLocationsResult.data || []).map(wl => ({
        code: wl.work_location_code,
        name: wl.work_location_name
      })),
      work_groups: (workGroupsResult.data || []).map(wg => ({
        code: wg.work_group_code,
        name: wg.work_group_name
      })),
      payroll_groups: (payrollGroupsResult.data || []).map(pg => ({
        code: pg.payroll_group_code,
        name: pg.payroll_group_name
      })),
      employee_profiles: (employeeProfilesResult.data || []).map(ep => ({
        code: ep.employee_profile_code,
        name: ep.profile_name
      })),
      genders: (gendersResult.data || []).map(g => ({
        code: g.lookup_key,
        name: g.lookup_label
      })),
      contract_types: (contractTypesResult.data || []).map(ct => ({
        code: ct.lookup_key,
        name: ct.lookup_label
      }))
    };

    console.log('📊 Resumen de catálogos obtenidos:');
    console.log(`   - Departamentos: ${catalogs.departments.length}`);
    console.log(`   - Cargos: ${catalogs.job_titles.length}`);
    console.log(`   - Áreas: ${catalogs.areas.length}`);
    console.log(`   - Centros de Costo: ${catalogs.cost_centers.length}`);
    console.log(`   - Ubicaciones: ${catalogs.work_locations.length}`);
    console.log(`   - Grupos: ${catalogs.work_groups.length}`);
    console.log(`   - Roles de Pago: ${catalogs.payroll_groups.length}`);
    console.log(`   - Perfiles: ${catalogs.employee_profiles.length}`);
    console.log(`   - Géneros: ${catalogs.genders.length}`);
    console.log(`   - Tipos de Contrato: ${catalogs.contract_types.length}`);

    return c.json({
      ok: true,
      catalogs: catalogs,
      tenant_id: tenantId
    });

  } catch (error: any) {
    console.error('❌ Error en getBootstrapCatalogs:', error);
    return c.json({
      ok: false,
      error: 'Error obteniendo catálogos',
      details: error.message
    }, 500);
  }
};