import { Context } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * GET /bootstrap/employees-export
 * Exporta empleados existentes con TODOS sus datos organizacionales
 * para edición masiva en Excel
 * 
 * PROPÓSITO:
 * - Permitir exportar empleados actuales
 * - Editar masivamente en Excel con dropdowns
 * - Re-importar con validación completa
 */
export const exportBootstrapEmployees = async (c: Context) => {
  try {
    console.log('📤 Bootstrap Export: Exportando empleados existentes...');

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
        console.warn('⚠️ Lookup group GENDER no encontrado');
      }
      if (!contractTypeGroupId) {
        console.warn('⚠️ Lookup group CONTRACT_TYPE no encontrado');
      }
    } catch (lookupError: any) {
      console.warn('⚠️ Error obteniendo lookup groups (continuando sin lookups):', lookupError.message);
    }

    // ========================================
    // 3. QUERY EMPLEADOS CON JOINS
    // ========================================
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select(`
        id,
        employee_code,
        employee_lastname,
        employee_name,
        employee_birthday,
        employee_gender_id,
        is_active,
        employee_companies!inner (
          department_id,
          job_title_id,
          area_id,
          cost_center_id,
          work_location_id,
          work_group_id,
          payroll_group_id,
          employee_profile_id,
          contract_type_id,
          hire_date,
          salary_amount,
          device_user_code,
          payroll_employee_code
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (employeesError) {
      console.error('❌ Error obteniendo empleados:', employeesError);
      return c.json({ error: 'Error obteniendo empleados', details: employeesError.message }, 500);
    }

    if (!employees || employees.length === 0) {
      console.log('⚠️ No hay empleados para exportar');
      return c.json({
        ok: true,
        employees: [],
        message: 'No hay empleados para exportar'
      });
    }

    console.log(`📋 Empleados encontrados: ${employees.length}`);

    // ========================================
    // 4. OBTENER CÓDIGOS DE RELACIONES FK
    // ========================================
    
    // Obtener todos los IDs únicos
    const departmentIds = [...new Set(employees.flatMap(e => e.employee_companies.map(ec => ec.department_id)))];
    const jobTitleIds = [...new Set(employees.flatMap(e => e.employee_companies.map(ec => ec.job_title_id)))];
    const areaIds = [...new Set(employees.flatMap(e => e.employee_companies.map(ec => ec.area_id)).filter(Boolean))];
    const costCenterIds = [...new Set(employees.flatMap(e => e.employee_companies.map(ec => ec.cost_center_id)).filter(Boolean))];
    const workLocationIds = [...new Set(employees.flatMap(e => e.employee_companies.map(ec => ec.work_location_id)).filter(Boolean))];
    const workGroupIds = [...new Set(employees.flatMap(e => e.employee_companies.map(ec => ec.work_group_id)).filter(Boolean))];
    const payrollGroupIds = [...new Set(employees.flatMap(e => e.employee_companies.map(ec => ec.payroll_group_id)).filter(Boolean))];
    const employeeProfileIds = [...new Set(employees.flatMap(e => e.employee_companies.map(ec => ec.employee_profile_id)).filter(Boolean))];
    const genderIds = [...new Set(employees.map(e => e.employee_gender_id).filter(Boolean))];
    const contractTypeIds = [...new Set(employees.flatMap(e => e.employee_companies.map(ec => ec.contract_type_id)).filter(Boolean))];

    // Queries paralelas para obtener códigos
    const [
      departmentsMap,
      jobTitlesMap,
      areasMap,
      costCentersMap,
      workLocationsMap,
      workGroupsMap,
      payrollGroupsMap,
      employeeProfilesMap,
      gendersMap,
      contractTypesMap
    ] = await Promise.all([
      supabase.from('departments').select('id, department_code').in('id', departmentIds),
      supabase.from('job_titles').select('id, job_title_code').in('id', jobTitleIds),
      areaIds.length > 0 ? supabase.from('areas').select('id, area_code').in('id', areaIds) : { data: [] },
      costCenterIds.length > 0 ? supabase.from('cost_centers').select('id, cost_center_code').in('id', costCenterIds) : { data: [] },
      workLocationIds.length > 0 ? supabase.from('work_locations').select('id, work_location_code').in('id', workLocationIds) : { data: [] },
      workGroupIds.length > 0 ? supabase.from('work_groups').select('id, work_group_code').in('id', workGroupIds) : { data: [] },
      payrollGroupIds.length > 0 ? supabase.from('payroll_groups').select('id, payroll_group_code').in('id', payrollGroupIds) : { data: [] },
      employeeProfileIds.length > 0 ? supabase.from('employee_profiles').select('id, employee_profile_code').in('id', employeeProfileIds) : { data: [] },
      genderIds.length > 0 ? supabase.from('lookup_values').select('id, lookup_key').in('id', genderIds) : { data: [] },
      contractTypeIds.length > 0 ? supabase.from('lookup_values').select('id, lookup_key').in('id', contractTypeIds) : { data: [] }
    ]);

    // Crear mapas UUID -> Código
    const deptMap = new Map((departmentsMap.data || []).map(d => [d.id, d.department_code]));
    const jobMap = new Map((jobTitlesMap.data || []).map(j => [j.id, j.job_title_code]));
    const areaMap = new Map((areasMap.data || []).map(a => [a.id, a.area_code]));
    const ccMap = new Map((costCentersMap.data || []).map(cc => [cc.id, cc.cost_center_code]));
    const wlMap = new Map((workLocationsMap.data || []).map(wl => [wl.id, wl.work_location_code]));
    const wgMap = new Map((workGroupsMap.data || []).map(wg => [wg.id, wg.work_group_code]));
    const pgMap = new Map((payrollGroupsMap.data || []).map(pg => [pg.id, pg.payroll_group_code]));
    const epMap = new Map((employeeProfilesMap.data || []).map(ep => [ep.id, ep.employee_profile_code]));
    const genderMap = new Map((gendersMap.data || []).map(g => [g.id, g.lookup_key]));
    const ctMap = new Map((contractTypesMap.data || []).map(ct => [ct.id, ct.lookup_key]));

    // ========================================
    // 5. FORMATEAR EMPLEADOS CON CÓDIGOS
    // ========================================
    const formattedEmployees = employees.map(emp => {
      const ec = emp.employee_companies[0]; // Primera relación (deberían ser unique por employee)

      return {
        employee_code: emp.employee_code,
        employee_lastname: emp.employee_lastname,
        employee_name: emp.employee_name,
        employee_gender: emp.employee_gender_id ? genderMap.get(emp.employee_gender_id) : '',
        employee_birthday: emp.employee_birthday || '',
        employee_profile_code: ec.employee_profile_id ? epMap.get(ec.employee_profile_id) : '',
        department_code: deptMap.get(ec.department_id) || '',
        job_title_code: jobMap.get(ec.job_title_id) || '',
        area_code: ec.area_id ? areaMap.get(ec.area_id) : '',
        cost_center_code: ec.cost_center_id ? ccMap.get(ec.cost_center_id) : '',
        work_location_code: ec.work_location_id ? wlMap.get(ec.work_location_id) : '',
        work_group_code: ec.work_group_id ? wgMap.get(ec.work_group_id) : '',
        payroll_group_code: ec.payroll_group_id ? pgMap.get(ec.payroll_group_id) : '',
        contract_type: ec.contract_type_id ? ctMap.get(ec.contract_type_id) : '',
        hire_date: ec.hire_date || '',
        salary_amount: ec.salary_amount || '',
        device_user_code: ec.device_user_code || '',
        payroll_employee_code: ec.payroll_employee_code || ''
      };
    });

    console.log(`✅ ${formattedEmployees.length} empleados exportados correctamente`);

    return c.json({
      ok: true,
      employees: formattedEmployees,
      count: formattedEmployees.length,
      tenant_id: tenantId
    });

  } catch (error: any) {
    console.error('❌ Error en exportBootstrapEmployees:', error);
    return c.json({
      ok: false,
      error: 'Error exportando empleados',
      details: error.message
    }, 500);
  }
};