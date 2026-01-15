import { Context } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

/**
 * POST /bootstrap/employees
 * Recibe empleados con códigos, resuelve a UUIDs, valida y inserta en BD
 * 
 * FLUJO:
 * 1. Recibir array de empleados con códigos (DEPT-001, PERF-ADM, etc.)
 * 2. Resolver cada código a UUID
 * 3. Validar que existan todos los códigos
 * 4. Insertar en employees + employee_companies
 * 5. Retornar resultado con warnings/errors
 */
export const createBootstrapEmployees = async (c: Context) => {
  try {
    console.log('👥 Bootstrap Employees: Procesando carga masiva...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ========================================
    // 1. OBTENER TENANT_ID Y COMPANY_ID
    // ========================================
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (tenantError || !tenant) {
      console.error('❌ Error localizando tenant:', tenantError);
      return c.json({ ok: false, error: 'Tenant no encontrado' }, 500);
    }

    const tenantId = tenant.id;

    // Obtener la primera company (bootstrap asume 1 empresa)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (companyError || !company) {
      console.error('❌ Error localizando company:', companyError);
      return c.json({ ok: false, error: 'Empresa no encontrada' }, 500);
    }

    const companyId = company.id;

    console.log(`✅ Tenant: ${tenantId}, Company: ${companyId}`);

    // ========================================
    // 2. PARSEAR REQUEST BODY
    // ========================================
    const body = await c.req.json();
    const employeesData = body.employees;

    if (!employeesData || !Array.isArray(employeesData)) {
      return c.json({ ok: false, error: 'Se esperaba un array de empleados' }, 400);
    }

    if (employeesData.length === 0) {
      return c.json({ ok: false, error: 'No se recibieron empleados para procesar' }, 400);
    }

    console.log(`📋 Recibidos ${employeesData.length} empleados para procesar`);

    // ========================================
    // 3. OBTENER LOOKUP GROUP IDs
    // ========================================
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

    const genderGroupId = genderGroup?.id || null;
    const contractTypeGroupId = contractTypeGroup?.id || null;

    // ========================================
    // 4. OBTENER TODOS LOS CÓDIGOS ÚNICOS
    // ========================================
    const departmentCodes = [...new Set(employeesData.map(e => e.department_code).filter(Boolean))];
    const jobTitleCodes = [...new Set(employeesData.map(e => e.job_title_code).filter(Boolean))];
    const areaCodes = [...new Set(employeesData.map(e => e.area_code).filter(Boolean))];
    const costCenterCodes = [...new Set(employeesData.map(e => e.cost_center_code).filter(Boolean))];
    const workLocationCodes = [...new Set(employeesData.map(e => e.work_location_code).filter(Boolean))];
    const workGroupCodes = [...new Set(employeesData.map(e => e.work_group_code).filter(Boolean))];
    const payrollGroupCodes = [...new Set(employeesData.map(e => e.payroll_group_code).filter(Boolean))];
    const employeeProfileCodes = [...new Set(employeesData.map(e => e.employee_profile_code).filter(Boolean))];
    const genderCodes = [...new Set(employeesData.map(e => e.employee_gender).filter(Boolean))];
    const contractTypeCodes = [...new Set(employeesData.map(e => e.contract_type).filter(Boolean))];

    console.log('🔍 Códigos únicos a resolver:');
    console.log('   - Departamentos:', departmentCodes.length);
    console.log('   - Cargos:', jobTitleCodes.length);
    console.log('   - Perfiles:', employeeProfileCodes.length);

    // ========================================
    // 5. RESOLVER CÓDIGOS → UUIDs EN PARALELO
    // ========================================
    const [
      departmentsRes,
      jobTitlesRes,
      areasRes,
      costCentersRes,
      workLocationsRes,
      workGroupsRes,
      payrollGroupsRes,
      employeeProfilesRes,
      gendersRes,
      contractTypesRes
    ] = await Promise.all([
      departmentCodes.length > 0 
        ? supabase.from('departments').select('id, department_code').eq('tenant_id', tenantId).in('department_code', departmentCodes)
        : { data: [] },
      jobTitleCodes.length > 0 
        ? supabase.from('job_titles').select('id, job_title_code').eq('tenant_id', tenantId).in('job_title_code', jobTitleCodes)
        : { data: [] },
      areaCodes.length > 0 
        ? supabase.from('areas').select('id, area_code').eq('tenant_id', tenantId).in('area_code', areaCodes)
        : { data: [] },
      costCenterCodes.length > 0 
        ? supabase.from('cost_centers').select('id, cost_center_code').eq('tenant_id', tenantId).in('cost_center_code', costCenterCodes)
        : { data: [] },
      workLocationCodes.length > 0 
        ? supabase.from('work_locations').select('id, work_location_code').eq('tenant_id', tenantId).in('work_location_code', workLocationCodes)
        : { data: [] },
      workGroupCodes.length > 0 
        ? supabase.from('work_groups').select('id, work_group_code').eq('tenant_id', tenantId).in('work_group_code', workGroupCodes)
        : { data: [] },
      payrollGroupCodes.length > 0 
        ? supabase.from('payroll_groups').select('id, payroll_group_code').eq('tenant_id', tenantId).in('payroll_group_code', payrollGroupCodes)
        : { data: [] },
      employeeProfileCodes.length > 0 
        ? supabase.from('employee_profiles').select('id, employee_profile_code').eq('tenant_id', tenantId).in('employee_profile_code', employeeProfileCodes)
        : { data: [] },
      genderCodes.length > 0 && genderGroupId
        ? supabase.from('lookup_values').select('id, lookup_key').eq('lookup_group_id', genderGroupId).in('lookup_key', genderCodes)
        : { data: [] },
      contractTypeCodes.length > 0 && contractTypeGroupId
        ? supabase.from('lookup_values').select('id, lookup_key').eq('lookup_group_id', contractTypeGroupId).in('lookup_key', contractTypeCodes)
        : { data: [] }
    ]);

    // Crear mapas Código → UUID
    const deptMap = new Map((departmentsRes.data || []).map(d => [d.department_code, d.id]));
    const jobMap = new Map((jobTitlesRes.data || []).map(j => [j.job_title_code, j.id]));
    const areaMap = new Map((areasRes.data || []).map(a => [a.area_code, a.id]));
    const ccMap = new Map((costCentersRes.data || []).map(cc => [cc.cost_center_code, cc.id]));
    const wlMap = new Map((workLocationsRes.data || []).map(wl => [wl.work_location_code, wl.id]));
    const wgMap = new Map((workGroupsRes.data || []).map(wg => [wg.work_group_code, wg.id]));
    const pgMap = new Map((payrollGroupsRes.data || []).map(pg => [pg.payroll_group_code, pg.id]));
    const epMap = new Map((employeeProfilesRes.data || []).map(ep => [ep.employee_profile_code, ep.id]));
    const genderMap = new Map((gendersRes.data || []).map(g => [g.lookup_key, g.id]));
    const ctMap = new Map((contractTypesRes.data || []).map(ct => [ct.lookup_key, ct.id]));

    console.log('✅ Mapas de resolución creados');

    // ========================================
    // 6. VALIDAR Y TRANSFORMAR EMPLEADOS
    // ========================================
    const errors: string[] = [];
    const warnings: string[] = [];
    const validEmployees: any[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < employeesData.length; i++) {
      const empData = employeesData[i];
      const rowNum = i + 2; // Excel fila (header = 1, data start = 2)

      // Validar códigos obligatorios
      const deptId = deptMap.get(empData.department_code);
      if (!deptId) {
        errors.push(`Fila ${rowNum}: Departamento "${empData.department_code}" no existe`);
        continue;
      }

      const jobId = jobMap.get(empData.job_title_code);
      if (!jobId) {
        errors.push(`Fila ${rowNum}: Cargo "${empData.job_title_code}" no existe`);
        continue;
      }

      // Resolver códigos opcionales
      const areaId = empData.area_code ? areaMap.get(empData.area_code) : null;
      if (empData.area_code && !areaId) {
        warnings.push(`Fila ${rowNum}: Área "${empData.area_code}" no encontrada, se omitirá`);
      }

      const ccId = empData.cost_center_code ? ccMap.get(empData.cost_center_code) : null;
      if (empData.cost_center_code && !ccId) {
        warnings.push(`Fila ${rowNum}: Centro de Costo "${empData.cost_center_code}" no encontrado, se omitirá`);
      }

      const wlId = empData.work_location_code ? wlMap.get(empData.work_location_code) : null;
      if (empData.work_location_code && !wlId) {
        warnings.push(`Fila ${rowNum}: Ubicación "${empData.work_location_code}" no encontrada, se omitirá`);
      }

      const wgId = empData.work_group_code ? wgMap.get(empData.work_group_code) : null;
      if (empData.work_group_code && !wgId) {
        warnings.push(`Fila ${rowNum}: Grupo "${empData.work_group_code}" no encontrado, se omitirá`);
      }

      const pgId = empData.payroll_group_code ? pgMap.get(empData.payroll_group_code) : null;
      if (empData.payroll_group_code && !pgId) {
        warnings.push(`Fila ${rowNum}: Rol de Pago "${empData.payroll_group_code}" no encontrado, se omitirá`);
      }

      const epId = empData.employee_profile_code ? epMap.get(empData.employee_profile_code) : null;
      if (empData.employee_profile_code && !epId) {
        warnings.push(`Fila ${rowNum}: Perfil "${empData.employee_profile_code}" no encontrado, se omitirá`);
      }

      const genderId = empData.employee_gender ? genderMap.get(empData.employee_gender) : null;
      if (empData.employee_gender && !genderId) {
        warnings.push(`Fila ${rowNum}: Género "${empData.employee_gender}" no encontrado, se omitirá`);
      }

      const ctId = empData.contract_type ? ctMap.get(empData.contract_type) : null;
      if (empData.contract_type && !ctId) {
        warnings.push(`Fila ${rowNum}: Tipo de Contrato "${empData.contract_type}" no encontrado, se omitirá`);
      }

      // Validar fecha de contratación (no debe ser futura)
      if (empData.hire_date) {
        const hireDate = new Date(empData.hire_date);
        if (hireDate > today) {
          warnings.push(`Fila ${rowNum}: Fecha de contratación "${empData.hire_date}" es futura`);
        }
      }

      // Validar fecha de nacimiento (debe ser pasado, persona > 18 años)
      if (empData.employee_birthday) {
        const birthDate = new Date(empData.employee_birthday);
        const age = today.getFullYear() - birthDate.getFullYear();
        if (birthDate > today) {
          warnings.push(`Fila ${rowNum}: Fecha de nacimiento "${empData.employee_birthday}" es futura`);
        } else if (age < 18) {
          warnings.push(`Fila ${rowNum}: Empleado tiene menos de 18 años`);
        }
      }

      validEmployees.push({
        employee_code: empData.employee_code,
        employee_lastname: empData.employee_lastname,
        employee_name: empData.employee_name,
        employee_gender_id: genderId,
        employee_birthday: empData.employee_birthday || null,
        tenant_id: tenantId,
        // employee_companies data
        department_id: deptId,
        job_title_id: jobId,
        area_id: areaId,
        cost_center_id: ccId,
        work_location_id: wlId,
        work_group_id: wgId,
        payroll_group_id: pgId,
        employee_profile_id: epId,
        contract_type_id: ctId,
        hire_date: empData.hire_date || null,
        salary_amount: empData.salary_amount || null,
        device_user_code: empData.device_user_code || null,
        payroll_employee_code: empData.payroll_employee_code || null
      });
    }

    // Si hay errores críticos, no insertar nada
    if (errors.length > 0) {
      console.error('❌ Errores de validación:', errors);
      return c.json({
        ok: false,
        error: 'Errores de validación encontrados',
        errors,
        warnings
      }, 400);
    }

    console.log(`✅ ${validEmployees.length} empleados validados correctamente`);

    // ========================================
    // 7. VERIFICAR CÓDIGOS EXISTENTES (UPSERT)
    // ========================================
    const employeeCodes = validEmployees.map(e => e.employee_code);
    
    const { data: existingEmployees } = await supabase
      .from('employees')
      .select('id, employee_code')
      .eq('tenant_id', tenantId)
      .in('employee_code', employeeCodes);

    const existingCodesMap = new Map(
      (existingEmployees || []).map(e => [e.employee_code, e.id])
    );

    console.log(`🔍 Códigos existentes: ${existingCodesMap.size} de ${employeeCodes.length}`);

    // ========================================
    // 8. INSERTAR/ACTUALIZAR EN BASE DE DATOS (UPSERT)
    // ========================================
    let insertedCount = 0;
    let updatedCount = 0;
    const createdBy = 'BOOTSTRAP'; // Usuario que ejecuta la carga inicial

    for (const emp of validEmployees) {
      try {
        const existingId = existingCodesMap.get(emp.employee_code);
        
        let employeeId: string;

        if (existingId) {
          // ========================================
          // EMPLEADO EXISTE → UPDATE
          // ========================================
          const { error: updateError } = await supabase
            .from('employees')
            .update({
              employee_lastname: emp.employee_lastname,
              employee_name: emp.employee_name,
              employee_gender_id: emp.employee_gender_id,
              employee_birthday: emp.employee_birthday,
              is_active: true,
              updated_at: new Date().toISOString(),
              updated_by: createdBy
            })
            .eq('id', existingId);

          if (updateError) {
            console.error(`❌ Error actualizando empleado ${emp.employee_code}:`, updateError);
            errors.push(`Error actualizando empleado ${emp.employee_code}: ${updateError.message}`);
            continue;
          }

          employeeId = existingId;
          updatedCount++;
          console.log(`♻️ Empleado ${emp.employee_code} actualizado`);

        } else {
          // ========================================
          // EMPLEADO NO EXISTE → INSERT
          // ========================================
          const { data: newEmployee, error: empError } = await supabase
            .from('employees')
            .insert({
              employee_code: emp.employee_code,
              employee_lastname: emp.employee_lastname,
              employee_name: emp.employee_name,
              employee_gender_id: emp.employee_gender_id,
              employee_birthday: emp.employee_birthday,
              tenant_id: emp.tenant_id,
              is_active: true,
              created_by: createdBy
            })
            .select()
            .single();

          if (empError) {
            console.error(`❌ Error insertando empleado ${emp.employee_code}:`, empError);
            errors.push(`Error insertando empleado ${emp.employee_code}: ${empError.message}`);
            continue;
          }

          employeeId = newEmployee.id;
          insertedCount++;
          console.log(`✅ Empleado ${emp.employee_code} insertado`);
        }

        // ========================================
        // UPSERT employee_companies
        // ========================================
        // Verificar si ya existe la relación employee_companies
        const { data: existingEC } = await supabase
          .from('employee_companies')
          .select('id')
          .eq('employee_id', employeeId)
          .eq('company_id', companyId)
          .maybeSingle();

        if (existingEC) {
          // UPDATE employee_companies
          const { error: ecUpdateError } = await supabase
            .from('employee_companies')
            .update({
              department_id: emp.department_id,
              job_title_id: emp.job_title_id,
              area_id: emp.area_id,
              cost_center_id: emp.cost_center_id,
              work_location_id: emp.work_location_id,
              work_group_id: emp.work_group_id,
              payroll_group_id: emp.payroll_group_id,
              employee_profile_id: emp.employee_profile_id,
              contract_type_id: emp.contract_type_id,
              hire_date: emp.hire_date,
              salary_amount: emp.salary_amount,
              device_user_code: emp.device_user_code,
              payroll_employee_code: emp.payroll_employee_code,
              is_active: true,
              updated_at: new Date().toISOString(),
              updated_by: createdBy
            })
            .eq('id', existingEC.id);

          if (ecUpdateError) {
            console.error(`❌ Error actualizando employee_companies para ${emp.employee_code}:`, ecUpdateError);
            errors.push(`Error actualizando asignación organizacional de ${emp.employee_code}: ${ecUpdateError.message}`);
            continue;
          }

        } else {
          // INSERT employee_companies
          const { error: ecError } = await supabase
            .from('employee_companies')
            .insert({
              employee_id: employeeId,
              company_id: companyId,
              department_id: emp.department_id,
              job_title_id: emp.job_title_id,
              area_id: emp.area_id,
              cost_center_id: emp.cost_center_id,
              work_location_id: emp.work_location_id,
              work_group_id: emp.work_group_id,
              payroll_group_id: emp.payroll_group_id,
              employee_profile_id: emp.employee_profile_id,
              contract_type_id: emp.contract_type_id,
              hire_date: emp.hire_date,
              salary_amount: emp.salary_amount,
              device_user_code: emp.device_user_code,
              payroll_employee_code: emp.payroll_employee_code,
              tenant_id: emp.tenant_id,
              is_active: true,
              created_by: createdBy
            });

          if (ecError) {
            console.error(`❌ Error insertando employee_companies para ${emp.employee_code}:`, ecError);
            errors.push(`Error en asignación organizacional de ${emp.employee_code}: ${ecError.message}`);
            continue;
          }
        }

      } catch (insertError: any) {
        console.error(`❌ Error procesando empleado ${emp.employee_code}:`, insertError);
        errors.push(`Error procesando ${emp.employee_code}: ${insertError.message}`);
      }
    }

    console.log(`✅ ${insertedCount} empleados insertados exitosamente`);
    console.log(`♻️ ${updatedCount} empleados actualizados exitosamente`);

    // ========================================
    // 9. ACTUALIZAR tenant_onboarding
    // ========================================
    // ✅ MOVIDO AL FRONTEND: Se actualizará cuando el usuario haga clic en "Siguiente >"
    // De esta forma, el backend solo procesa los empleados y no avanza automáticamente el wizard

    // ========================================
    // 10. RETORNAR RESULTADO
    // ========================================
    return c.json({
      ok: true,
      inserted_count: insertedCount,
      updated_count: updatedCount,
      total_received: employeesData.length,
      warnings,
      errors: errors.length > 0 ? errors : undefined,
      message: `${insertedCount} empleados insertados correctamente y ${updatedCount} actualizados`
      // ✅ ELIMINADO: next_step - No avanzar automáticamente
    });

  } catch (error: any) {
    console.error('❌ Error en createBootstrapEmployees:', error);
    return c.json({
      ok: false,
      error: 'Error procesando empleados',
      details: error.message
    }, 500);
  }
};