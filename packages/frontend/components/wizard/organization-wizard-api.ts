import { ApiClient } from '../../lib/api-client';

export interface OrganizationTenantContext {
  tenantId: string;
  createdBy: string;
}

interface UserProfileCache {
  tenant_id?: string;
  username?: string;
  email?: string;
}

interface CatalogItem {
  id: string;
  code: string;
  label: string;
}

export interface OrganizationCatalogs {
  companies: CatalogItem[];
  payrollGroups: CatalogItem[];
  departments: CatalogItem[];
  areas: CatalogItem[];
  costCenters: CatalogItem[];
  jobTitles: CatalogItem[];
  workGroups: CatalogItem[];
  workLocations: CatalogItem[];
  employeeProfiles: CatalogItem[];
  contractTypes: CatalogItem[];
  genders: CatalogItem[];
}

function getCachedProfile(): UserProfileCache {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = localStorage.getItem('user_profile');
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as UserProfileCache;
    return parsed || {};
  } catch {
    return {};
  }
}

export async function resolveOrganizationTenantContext(): Promise<OrganizationTenantContext> {
  const cached = getCachedProfile();

  const { data: authData } = await ApiClient.auth.getUser();
  const authUserId = authData?.user?.id;

  if (authUserId) {
    const { data: userProfile, error } = await ApiClient
      .from('users')
      .select('tenant_id, username, email')
      .eq('auth_user_id', authUserId)
      .limit(1)
      .single();

    if (!error && userProfile?.tenant_id) {
      return {
        tenantId: userProfile.tenant_id,
        createdBy: userProfile.username || userProfile.email || cached.username || cached.email || 'system',
      };
    }
  }

  if (!cached.tenant_id) {
    throw new Error('No se pudo resolver el tenant actual. Vuelva a iniciar sesion.');
  }

  return {
    tenantId: cached.tenant_id,
    createdBy: cached.username || cached.email || 'system',
  };
}

function mapCatalog(
  rows: any[] | null,
  codeKey: string,
  labelKey: string
): CatalogItem[] {
  return (rows || []).map((row) => ({
    id: row.id,
    code: String(row[codeKey] || row.id),
    label: String(row[labelKey] || row[codeKey] || row.id),
  }));
}

export async function fetchOrganizationCatalogs(tenantId: string): Promise<OrganizationCatalogs> {
  const [
    companiesRes,
    payrollRes,
    deptRes,
    areaRes,
    ccRes,
    jobRes,
    workGroupRes,
    workLocationRes,
    profileRes,
    contractTypeRes,
    genderRes,
  ] = await Promise.all([
    ApiClient.from('companies').select('id, company_code, company_name').eq('tenant_id', tenantId).eq('is_active', true),
    ApiClient.from('payroll_groups').select('id, payroll_group_code, payroll_group_name').eq('tenant_id', tenantId).eq('is_active', true),
    ApiClient.from('departments').select('id, department_code, department_name').eq('tenant_id', tenantId).eq('is_active', true),
    ApiClient.from('areas').select('id, area_code, area_name').eq('tenant_id', tenantId).eq('is_active', true),
    ApiClient.from('cost_centers').select('id, cost_center_code, cost_center_name').eq('tenant_id', tenantId).eq('is_active', true),
    ApiClient.from('job_titles').select('id, job_title_code, job_title_name').eq('tenant_id', tenantId).eq('is_active', true),
    ApiClient.from('work_groups').select('id, work_group_code, work_group_name').eq('tenant_id', tenantId).eq('is_active', true),
    ApiClient.from('work_locations').select('id, work_location_code, work_location_name').eq('tenant_id', tenantId).eq('is_active', true),
    ApiClient.from('employee_profiles').select('id, employee_profile_code, profile_name').eq('tenant_id', tenantId).eq('is_active', true),
    ApiClient
      .from('lookup_values')
      .select('id, lookup_key, lookup_label, lookup_groups!inner(lookup_group_key)')
      .eq('lookup_groups.lookup_group_key', 'CONTRACT_TYPE')
      .eq('is_active', true),
    ApiClient
      .from('lookup_values')
      .select('id, lookup_key, lookup_label, lookup_groups!inner(lookup_group_key)')
      .eq('lookup_groups.lookup_group_key', 'GENDER')
      .eq('is_active', true),
  ]);

  return {
    companies: mapCatalog(companiesRes.data as any[] | null, 'company_code', 'company_name'),
    payrollGroups: mapCatalog(payrollRes.data as any[] | null, 'payroll_group_code', 'payroll_group_name'),
    departments: mapCatalog(deptRes.data as any[] | null, 'department_code', 'department_name'),
    areas: mapCatalog(areaRes.data as any[] | null, 'area_code', 'area_name'),
    costCenters: mapCatalog(ccRes.data as any[] | null, 'cost_center_code', 'cost_center_name'),
    jobTitles: mapCatalog(jobRes.data as any[] | null, 'job_title_code', 'job_title_name'),
    workGroups: mapCatalog(workGroupRes.data as any[] | null, 'work_group_code', 'work_group_name'),
    workLocations: mapCatalog(workLocationRes.data as any[] | null, 'work_location_code', 'work_location_name'),
    employeeProfiles: mapCatalog(profileRes.data as any[] | null, 'employee_profile_code', 'profile_name'),
    contractTypes: mapCatalog(contractTypeRes.data as any[] | null, 'lookup_key', 'lookup_label'),
    genders: mapCatalog(genderRes.data as any[] | null, 'lookup_key', 'lookup_label'),
  };
}

export async function upsertByTenantAndCode(
  table: string,
  tenantId: string,
  codeColumn: string,
  row: Record<string, any>,
  createdBy: string
): Promise<{ id: string }> {
  const code = String(row[codeColumn] || '').trim();
  if (!code) {
    throw new Error(`El campo ${codeColumn} es obligatorio para ${table}`);
  }

  const { data: existing, error: existingError } = await ApiClient
    .from(table)
    .select('id')
    .eq('tenant_id', tenantId)
    .eq(codeColumn, code)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || `Error buscando ${table}`);
  }

  const payload = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value === '' ? null : value])
  );

  if (existing?.id) {
    const { error: updateError } = await ApiClient
      .from(table)
      .update({ ...payload, updated_by: createdBy, updated_at: new Date().toISOString() })
      .eq('id', existing.id);

    if (updateError) {
      throw new Error(updateError.message || `Error actualizando ${table}`);
    }

    return { id: existing.id };
  }

  const { data: inserted, error: insertError } = await ApiClient
    .from(table)
    .insert({ ...payload, tenant_id: tenantId, created_by: createdBy })
    .select('id')
    .single();

  if (insertError || !inserted?.id) {
    throw new Error(insertError?.message || `Error creando ${table}`);
  }

  return { id: inserted.id };
}

export async function upsertEmployeesAndCompanies(
  tenantId: string,
  createdBy: string,
  rows: Record<string, any>[]
): Promise<{ insertedOrUpdated: number }> {
  for (const row of rows) {
    const employeeCode = String(row.employee_code || '').trim();

    const { data: existingEmployee, error: findEmployeeError } = await ApiClient
      .from('employees')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('employee_code', employeeCode)
      .limit(1)
      .maybeSingle();

    if (findEmployeeError) {
      throw new Error(findEmployeeError.message || 'Error consultando empleado');
    }

    let employeeId = existingEmployee?.id;

    const employeePayload = {
      employee_lastname: row.employee_lastname,
      employee_name: row.employee_name,
      employee_code: employeeCode,
      employee_birthday: row.employee_birthday || null,
      employee_gender_id: row.employee_gender_id || null,
      is_active: row.is_active !== false,
    };

    if (employeeId) {
      const { error: updateEmployeeError } = await ApiClient
        .from('employees')
        .update({ ...employeePayload, updated_by: createdBy, updated_at: new Date().toISOString() })
        .eq('id', employeeId);

      if (updateEmployeeError) {
        throw new Error(updateEmployeeError.message || `Error actualizando empleado ${employeeCode}`);
      }
    } else {
      const { data: insertedEmployee, error: insertEmployeeError } = await ApiClient
        .from('employees')
        .insert({ ...employeePayload, tenant_id: tenantId, created_by: createdBy })
        .select('id')
        .single();

      if (insertEmployeeError || !insertedEmployee?.id) {
        throw new Error(insertEmployeeError?.message || `Error creando empleado ${employeeCode}`);
      }

      employeeId = insertedEmployee.id;
    }

    const { data: existingAssignment, error: existingAssignmentError } = await ApiClient
      .from('employee_companies')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('employee_id', employeeId)
      .eq('company_id', row.company_id)
      .limit(1)
      .maybeSingle();

    if (existingAssignmentError) {
      throw new Error(existingAssignmentError.message || `Error consultando asignacion ${employeeCode}`);
    }

    const assignmentPayload = {
      device_user_code: row.device_user_code || null,
      payroll_employee_code: row.payroll_employee_code || null,
      employee_profile_id: row.employee_profile_id || null,
      work_group_id: row.work_group_id || null,
      work_location_id: row.work_location_id || null,
      department_id: row.department_id || null,
      area_id: row.area_id || null,
      job_title_id: row.job_title_id || null,
      cost_center_id: row.cost_center_id || null,
      payroll_group_id: row.payroll_group_id || null,
      accounting_account_code: row.accounting_account_code || null,
      salary_amount: row.salary_amount ?? null,
      hire_date: row.hire_date || null,
      termination_date: row.termination_date || null,
      contract_type_id: row.contract_type_id || null,
      work_on_holidays: row.work_on_holidays === true,
      is_active: row.is_active !== false,
    };

    if (existingAssignment?.id) {
      const { error: updateAssignmentError } = await ApiClient
        .from('employee_companies')
        .update({ ...assignmentPayload, updated_by: createdBy, updated_at: new Date().toISOString() })
        .eq('id', existingAssignment.id);

      if (updateAssignmentError) {
        throw new Error(updateAssignmentError.message || `Error actualizando asignacion ${employeeCode}`);
      }
    } else {
      const { error: insertAssignmentError } = await ApiClient
        .from('employee_companies')
        .insert({
          ...assignmentPayload,
          tenant_id: tenantId,
          company_id: row.company_id,
          employee_id: employeeId,
          created_by: createdBy,
        });

      if (insertAssignmentError) {
        throw new Error(insertAssignmentError.message || `Error creando asignacion ${employeeCode}`);
      }
    }
  }

  return { insertedOrUpdated: rows.length };
}

export function normalizeRows<T>(rows: T[], isValid: (row: T) => boolean): T[] {
  return rows.filter(isValid);
}

export function hasDuplicateCodes<T extends { code: string }>(rows: T[]): boolean {
  const codes = rows
    .map((row) => row.code.trim().toUpperCase())
    .filter(Boolean);

  return new Set(codes).size !== codes.length;
}
