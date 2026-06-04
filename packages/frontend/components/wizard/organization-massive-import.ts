import * as XLSX from 'xlsx';
import { ApiClient } from '../../lib/api-client';
import { buildApiUrl } from '../../utils/api-config';

export interface ImportValidationError {
  row: number;
  column: string;
  message: string;
}

export interface ParseResult<T extends Record<string, any>> {
  success: boolean;
  data: T[];
  errors: ImportValidationError[];
  rowCount: number;
}

export type ImportLogEvent = {
  timestamp: string;
  phase: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  progress: number;
  activity_key?: string;
  activity_label?: string;
  activity_progress?: number;
};

export type StructureImportRow = {
  tenant_id: string | null;
  company_ruc: string | null;
  company_code: string | null;
  company_name: string | null;
  company_short_name: string | null;
  company_address: string | null;
  company_address_line1: string | null;
  company_address_line2: string | null;
  company_country_id: string | null;
  company_country_label: string | null;
  company_country_short_label: string | null;
  company_state_id: string | null;
  company_state_label: string | null;
  company_state_short_label: string | null;
  company_city_id: string | null;
  company_city_label: string | null;
  company_city_short_label: string | null;
  company_postal_code: string | null;
  company_phone: string | null;
  is_active: boolean;
  employee_cedula: string | null;
  employee_code: string | null;
  device_user_code: string | null;
  payroll_employee_code: string | null;
  accounting_account_code: string | null;
  salary_amount: number | null;
  work_on_holidays: boolean;
  hire_date: string | null;
  termination_date: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_by: string | null;
  updated_at: string | null;
  employee_profile_code: string | null;
  profile_name: string | null;
  profile_short_name: string | null;
  work_group_code: string | null;
  work_group_payrol_group_code: string | null;
  work_group_name: string | null;
  work_group_short_name: string | null;
  work_location_code: string | null;
  work_location_name: string | null;
  work_location_short_name: string | null;
  work_location_country_id: string | null;
  work_location_country_label: string | null;
  work_location_country_short_label: string | null;
  work_location_state_id: string | null;
  work_location_state_label: string | null;
  work_location_state_short_label: string | null;
  work_location_city_id: string | null;
  work_location_city_label: string | null;
  work_location_city_short_label: string | null;
  work_location_time_zone: string | null;
  department_code: string | null;
  department_name: string | null;
  department_short_name: string | null;
  area_code: string | null;
  area_name: string | null;
  area_short_name: string | null;
  area_payroll_group_code: string | null;
  job_title_code: string | null;
  job_title_name: string | null;
  job_title_short_name: string | null;
  cost_center_code: string | null;
  homologation_code: string | null;
  gl_account_code: string | null;
  cost_center_name: string | null;
  cost_center_short_name: string | null;
  payroll_group_code: string | null;
  payroll_group_name: string | null;
  payroll_group_short_name: string | null;
  contract_type_key: string | null;
};

export type EmployeeImportRow = {
  tenant_id: string | null;
  employee_code: string | null;
  employee_lastname: string | null;
  employee_name: string | null;
  employee_cedula: string | null;
  employee_birthday: string | null;
  employee_gender_id: string | null;
  employee_is_model: boolean;
  employee_observations: string | null;
  employee_photo_path: string | null;
  username: string | null;
  password: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  preferred_language_code: string | null;
  user_role_key: string | null;
  scope_type_key: string | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string | null;
  updated_by: string | null;
  updated_at: string | null;
};

export type StagedAssignment = {
  employee_code: string;
  company_code: string;
  device_user_code: string | null;
  payroll_employee_code: string | null;
  accounting_account_code: string | null;
  salary_amount: number | null;
  work_on_holidays: boolean;
  hire_date: string | null;
  termination_date: string | null;
  contract_type_key: string | null;
  employee_profile_code: string | null;
  work_group_code: string | null;
  work_location_code: string | null;
  department_code: string | null;
  area_code: string | null;
  job_title_code: string | null;
  cost_center_code: string | null;
  payroll_group_code: string | null;
  is_active: boolean;
};

export type StructureImportResponse = {
  success: boolean;
  summary: Record<string, { created: number; updated: number }>;
  staged_assignments: StagedAssignment[];
  rows_processed: number;
  events: ImportLogEvent[];
};

export type EmployeeImportResponse = {
  success: boolean;
  summary: {
    employees_created: number;
    employees_updated: number;
    users_created: number;
    users_updated: number;
    user_roles_created: number;
    user_roles_updated: number;
    user_role_scopes_created: number;
    user_role_scopes_updated: number;
    employee_companies_created: number;
    employee_companies_updated: number;
  };
  rows_processed: number;
  events: ImportLogEvent[];
};

export type MigrationExportPayload = {
  blob: Blob;
  fileName: string;
};

export type ImportCapabilities = {
  can_import: boolean;
  can_abort: boolean;
  can_reverse: boolean;
};

export type ReverseImportResponse = {
  success: boolean;
  summary: Record<string, number>;
  events: ImportLogEvent[];
  started_at: string;
};

export type WorkbookTabStat = {
  tab: string;
  rows: number;
};

export type SingleWorkbookPreparedPayload = {
  tenantId: string | null;
  structureRows: StructureImportRow[];
  employeeRows: EmployeeImportRow[];
  tabStats: WorkbookTabStat[];
};

const STRUCTURE_REQUIRED_COLUMNS = [
  'tenant_id',
  'company_code',
  'company_name',
  'company_short_name',
  'employee_code',
  'employee_profile_code',
  'work_group_code',
  'work_location_code',
  'department_code',
  'area_code',
  'job_title_code',
  'cost_center_code',
  'payroll_group_code',
  'contract_type_key',
] as const;

const EMPLOYEE_REQUIRED_COLUMNS = [
  'tenant_id',
  'employee_code',
  'employee_lastname',
  'employee_name',
  'username',
  'email',
  'password',
  'user_role_key',
  'scope_type_key',
] as const;

function toText(value: any): string | null {
  if (value === null || value === undefined) return null;
  const next = String(value).trim();
  if (!next || next.toUpperCase() === 'NULL') return null;
  return next;
}

function toBoolean(value: any, defaultValue = true): boolean {
  if (value === null || value === undefined || String(value).trim() === '') return defaultValue;
  const next = String(value).trim().toLowerCase();
  if (['true', '1', 'si', 'yes', 'y', '-1'].includes(next)) return true;
  if (['false', '0', 'no', 'n'].includes(next)) return false;
  return defaultValue;
}

function toNumber(value: any): number | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const next = Number(String(value).replace(',', '.'));
  return Number.isFinite(next) ? next : null;
}

function readFirstSheetRows(fileBuffer: ArrayBuffer): Record<string, any>[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { defval: null }) as Record<string, any>[];
}

function normalizeSheetName(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function buildSheetNameIndex(workbook: XLSX.WorkBook): Map<string, string> {
  const index = new Map<string, string>();
  workbook.SheetNames.forEach((name) => {
    index.set(normalizeSheetName(name), name);
  });
  return index;
}

function readNamedSheetRows(
  workbook: XLSX.WorkBook,
  index: Map<string, string>,
  candidates: string[],
  required = true
): Record<string, any>[] {
  for (const key of candidates) {
    const real = index.get(normalizeSheetName(key));
    if (!real) continue;
    const sheet = workbook.Sheets[real];
    if (!sheet) continue;
    return XLSX.utils.sheet_to_json(sheet, { defval: null }) as Record<string, any>[];
  }

  if (!required) return [];
  throw new Error(`No se encontrÃ³ la pestaÃ±a requerida: ${candidates.join(' / ')}`);
}

function validateHeaders(rows: Record<string, any>[], requiredColumns: readonly string[]): string[] {
  if (!rows.length) return requiredColumns.map((col) => `Falta columna obligatoria: ${col}`);
  const sampleRow = rows[0] || {};
  return requiredColumns
    .filter((column) => !(column in sampleRow))
    .map((column) => `Falta columna obligatoria: ${column}`);
}

export async function parseStructureImportFile(file: File): Promise<ParseResult<StructureImportRow>> {
  try {
    const rows = readFirstSheetRows(await file.arrayBuffer());
    if (!rows.length) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, column: 'general', message: 'El archivo está vacío' }],
        rowCount: 0,
      };
    }

    const headerErrors = validateHeaders(rows, STRUCTURE_REQUIRED_COLUMNS);
    if (headerErrors.length > 0) {
      return {
        success: false,
        data: [],
        errors: headerErrors.map((message) => ({ row: 1, column: 'headers', message })),
        rowCount: rows.length,
      };
    }

    const errors: ImportValidationError[] = [];
    const data: StructureImportRow[] = [];

    rows.forEach((row, index) => {
      const rowNo = index + 2;
      STRUCTURE_REQUIRED_COLUMNS.forEach((column) => {
        if (!toText(row[column])) {
          errors.push({ row: rowNo, column, message: 'Campo obligatorio' });
        }
      });

      data.push({
        tenant_id: toText(row.tenant_id),
        company_ruc: toText(row.company_ruc),
        company_code: toText(row.company_code),
        company_name: toText(row.company_name),
        company_short_name: toText(row.company_short_name),
        company_address: toText(row.company_address),
        company_address_line1: toText(row.company_address_line1),
        company_address_line2: toText(row.company_address_line2),
        company_country_id: toText(row.company_country_id),
        company_country_label: toText(row.company_country_label),
        company_country_short_label: toText(row.company_country_short_label),
        company_state_id: toText(row.company_state_id),
        company_state_label: toText(row.company_state_label),
        company_state_short_label: toText(row.company_state_short_label),
        company_city_id: toText(row.company_city_id),
        company_city_label: toText(row.company_city_label),
        company_city_short_label: toText(row.company_city_short_label),
        company_postal_code: toText(row.company_postal_code),
        company_phone: toText(row.company_phone),
        is_active: toBoolean(row.is_active, true),
        employee_cedula: toText(row.employee_cedula),
        employee_code: toText(row.employee_code),
        device_user_code: toText(row.device_user_code),
        payroll_employee_code: toText(row.payroll_employee_code),
        accounting_account_code: toText(row.accounting_account_code),
        salary_amount: toNumber(row.salary_amount),
        work_on_holidays: toBoolean(row.work_on_holidays, false),
        hire_date: toText(row.hire_date),
        termination_date: toText(row.termination_date),
        created_by: toText(row.created_by),
        created_at: toText(row.created_at),
        updated_by: toText(row.updated_by),
        updated_at: toText(row.updated_at),
        employee_profile_code: toText(row.employee_profile_code),
        profile_name: toText(row.profile_name),
        profile_short_name: toText(row.profile_short_name),
        work_group_code: toText(row.work_group_code),
        work_group_payrol_group_code: toText(row.work_group_payrol_group_code),
        work_group_name: toText(row.work_group_name),
        work_group_short_name: toText(row.work_group_short_name),
        work_location_code: toText(row.work_location_code),
        work_location_name: toText(row.work_location_name),
        work_location_short_name: toText(row.work_location_short_name),
        work_location_country_id: toText(row.work_location_country_id),
        work_location_country_label: toText(row.work_location_country_label),
        work_location_country_short_label: toText(row.work_location_country_short_label),
        work_location_state_id: toText(row.work_location_state_id),
        work_location_state_label: toText(row.work_location_state_label),
        work_location_state_short_label: toText(row.work_location_state_short_label),
        work_location_city_id: toText(row.work_location_city_id),
        work_location_city_label: toText(row.work_location_city_label),
        work_location_city_short_label: toText(row.work_location_city_short_label),
        work_location_time_zone: toText(row.work_location_time_zone ?? row.time_zone),
        department_code: toText(row.department_code),
        department_name: toText(row.department_name),
        department_short_name: toText(row.department_short_name),
        area_code: toText(row.area_code),
        area_name: toText(row.area_name),
        area_short_name: toText(row.area_short_name),
        area_payroll_group_code: toText(row.area_payroll_group_code),
        job_title_code: toText(row.job_title_code),
        job_title_name: toText(row.job_title_name),
        job_title_short_name: toText(row.job_title_short_name),
        cost_center_code: toText(row.cost_center_code),
        homologation_code: toText(row.homologation_code),
        gl_account_code: toText(row.gl_account_code),
        cost_center_name: toText(row.cost_center_name),
        cost_center_short_name: toText(row.cost_center_short_name),
        payroll_group_code: toText(row.payroll_group_code),
        payroll_group_name: toText(row.payroll_group_name),
        payroll_group_short_name: toText(row.payroll_group_short_name),
        contract_type_key: toText(row.contract_type_key),
      });
    });

    return {
      success: errors.length === 0,
      data,
      errors,
      rowCount: rows.length,
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, column: 'general', message: error?.message || 'Error procesando archivo' }],
      rowCount: 0,
    };
  }
}

export async function parseEmployeeImportFile(file: File): Promise<ParseResult<EmployeeImportRow>> {
  try {
    const rows = readFirstSheetRows(await file.arrayBuffer());
    if (!rows.length) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, column: 'general', message: 'El archivo está vacío' }],
        rowCount: 0,
      };
    }

    const headerErrors = validateHeaders(rows, EMPLOYEE_REQUIRED_COLUMNS);
    if (headerErrors.length > 0) {
      return {
        success: false,
        data: [],
        errors: headerErrors.map((message) => ({ row: 1, column: 'headers', message })),
        rowCount: rows.length,
      };
    }

    const errors: ImportValidationError[] = [];
    const data: EmployeeImportRow[] = [];

    const seenEmployeeCodes = new Set<string>();
    const seenUsernames = new Set<string>();
    const seenEmails = new Set<string>();

    rows.forEach((row, index) => {
      const rowNo = index + 2;
      EMPLOYEE_REQUIRED_COLUMNS.forEach((column) => {
        if (!toText(row[column])) {
          errors.push({ row: rowNo, column, message: 'Campo obligatorio' });
        }
      });

      const employeeCode = toText(row.employee_code) || '';
      const username = (toText(row.username) || '').toLowerCase();
      const email = (toText(row.email) || '').toLowerCase();

      if (employeeCode) {
        if (seenEmployeeCodes.has(employeeCode)) {
          errors.push({ row: rowNo, column: 'employee_code', message: 'Código duplicado en archivo' });
        }
        seenEmployeeCodes.add(employeeCode);
      }

      if (username) {
        if (seenUsernames.has(username)) {
          errors.push({ row: rowNo, column: 'username', message: 'Username duplicado en archivo' });
        }
        seenUsernames.add(username);
      }

      if (email) {
        if (seenEmails.has(email)) {
          errors.push({ row: rowNo, column: 'email', message: 'Email duplicado en archivo' });
        }
        seenEmails.add(email);
      }

      data.push({
        tenant_id: toText(row.tenant_id),
        employee_code: toText(row.employee_code),
        employee_lastname: toText(row.employee_lastname),
        employee_name: toText(row.employee_name),
        employee_cedula: toText(row.employee_cedula),
        employee_birthday: toText(row.employee_birthday),
        employee_gender_id: toText(row.employee_gender_id),
        employee_is_model: toBoolean(row.employee_is_model, false),
        employee_observations: toText(row.employee_observations),
        employee_photo_path: toText(row.employee_photo_path),
        username: toText(row.username),
        password: toText(row.password),
        display_name: toText(row.display_name),
        email: toText(row.email),
        phone: toText(row.phone),
        preferred_language_code: toText(row.preferred_language_code),
        user_role_key: toText(row.user_role_key),
        scope_type_key: toText(row.scope_type_key),
        valid_from: toText(row.valid_from),
        valid_to: toText(row.valid_to),
        is_active: toBoolean(row.is_active, true),
        created_by: toText(row.created_by),
        created_at: toText(row.created_at),
        updated_by: toText(row.updated_by),
        updated_at: toText(row.updated_at),
      });
    });

    return {
      success: errors.length === 0,
      data,
      errors,
      rowCount: rows.length,
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, column: 'general', message: error?.message || 'Error procesando archivo' }],
      rowCount: 0,
    };
  }
}

function mapByCode<T extends Record<string, any>>(rows: T[], key: string): Map<string, T> {
  const out = new Map<string, T>();
  rows.forEach((row) => {
    const code = toText(row[key]);
    if (!code) return;
    if (!out.has(code)) out.set(code, row);
  });
  return out;
}

export async function parseSingleWorkbook15Tabs(file: File): Promise<ParseResult<SingleWorkbookPreparedPayload>> {
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheetIndex = buildSheetNameIndex(workbook);

    const payrollGroups = readNamedSheetRows(workbook, sheetIndex, ['01_payroll_groups', 'payroll_groups']);
    const employeeProfiles = readNamedSheetRows(workbook, sheetIndex, ['02_employee_profiles', 'employee_profiles']);
    const departments = readNamedSheetRows(workbook, sheetIndex, ['03_departments', 'departments']);
    const jobTitles = readNamedSheetRows(workbook, sheetIndex, ['04_job_titles', 'job_titles']);
    const costCenters = readNamedSheetRows(workbook, sheetIndex, ['05_cost_centers', 'cost_centers']);
    const areas = readNamedSheetRows(workbook, sheetIndex, ['06_areas', 'areas']);
    const workGroups = readNamedSheetRows(workbook, sheetIndex, ['07_work_groups', 'work_groups']);
    const companies = readNamedSheetRows(workbook, sheetIndex, ['08_companies', 'companies']);
    const geoCatalog = readNamedSheetRows(workbook, sheetIndex, ['09_geo_catalog', 'geo_catalog'], false);
    const workLocations = readNamedSheetRows(workbook, sheetIndex, ['10_work_locations', 'work_locations']);
    const employees = readNamedSheetRows(workbook, sheetIndex, ['11_employees', 'employees']);
    const users = readNamedSheetRows(workbook, sheetIndex, ['12_users', 'users']);
    const userRoles = readNamedSheetRows(workbook, sheetIndex, ['13_user_roles', 'user_roles']);
    const userRoleScopes = readNamedSheetRows(workbook, sheetIndex, ['14_user_role_scopes', 'user_role_scopes']);
    const employeeCompanies = readNamedSheetRows(workbook, sheetIndex, ['15_employee_companies', 'employee_companies']);

    const errors: ImportValidationError[] = [];
    const tenantId =
      toText(companies[0]?.tenant_id) ||
      toText(employees[0]?.tenant_id) ||
      toText(employeeCompanies[0]?.tenant_id) ||
      null;

    const payrollByCode = mapByCode(payrollGroups, 'payroll_group_code');
    const profileByCode = mapByCode(employeeProfiles, 'employee_profile_code');
    const departmentByCode = mapByCode(departments, 'department_code');
    const areaByCode = mapByCode(areas, 'area_code');
    const jobByCode = mapByCode(jobTitles, 'job_title_code');
    const costByCode = mapByCode(costCenters, 'cost_center_code');
    const workGroupByCode = mapByCode(workGroups, 'work_group_code');
    const companyByCode = mapByCode(companies, 'company_code');
    const workLocationByCode = mapByCode(workLocations, 'work_location_code');
    const employeeByCode = mapByCode(employees, 'employee_code');
    const userByEmployeeCode = mapByCode(users, 'employee_code');
    const roleByEmployeeCode = mapByCode(userRoles, 'employee_code');
    const scopeByEmployeeCode = mapByCode(userRoleScopes, 'employee_code');

    const structureRows: StructureImportRow[] = [];
    employeeCompanies.forEach((row, idx) => {
      const rowNo = idx + 2;
      const employeeCode = toText(row.employee_code);
      const companyCode = toText(row.company_code);
      if (!employeeCode || !companyCode) {
        errors.push({ row: rowNo, column: 'employee_code/company_code', message: 'Campos obligatorios en pestaÃ±a 15' });
        return;
      }

      const company = companyByCode.get(companyCode) || {};
      const profile = profileByCode.get(toText(row.employee_profile_code) || '') || {};
      const workGroup = workGroupByCode.get(toText(row.work_group_code) || '') || {};
      const workLocation = workLocationByCode.get(toText(row.work_location_code) || '') || {};
      const department = departmentByCode.get(toText(row.department_code) || '') || {};
      const area = areaByCode.get(toText(row.area_code) || '') || {};
      const job = jobByCode.get(toText(row.job_title_code) || '') || {};
      const cost = costByCode.get(toText(row.cost_center_code) || '') || {};
      const payroll = payrollByCode.get(toText(row.payroll_group_code) || '') || {};

      if (!profile || !workGroup || !workLocation || !department || !area || !job || !cost || !payroll) {
        // no-op: backend validarÃ¡ codigos inexistentes, pero dejamos el registro
      }

      structureRows.push({
        tenant_id: toText(row.tenant_id) || tenantId,
        company_ruc: toText((company as any).company_ruc),
        company_code: companyCode,
        company_name: toText((company as any).company_name),
        company_short_name: toText((company as any).company_short_name),
        company_address: toText((company as any).company_address),
        company_address_line1: toText((company as any).company_address_line1),
        company_address_line2: toText((company as any).company_address_line2),
        company_country_id: toText((company as any).company_country_id),
        company_country_label: toText((company as any).company_country_label),
        company_country_short_label: toText((company as any).company_country_short_label),
        company_state_id: toText((company as any).company_state_id),
        company_state_label: toText((company as any).company_state_label),
        company_state_short_label: toText((company as any).company_state_short_label),
        company_city_id: toText((company as any).company_city_id),
        company_city_label: toText((company as any).company_city_label),
        company_city_short_label: toText((company as any).company_city_short_label),
        company_postal_code: toText((company as any).company_postal_code),
        company_phone: toText((company as any).company_phone),
        is_active: toBoolean(row.is_active, true),
        employee_cedula: toText((employeeByCode.get(employeeCode) || {}).employee_cedula),
        employee_code: employeeCode,
        device_user_code: toText(row.device_user_code),
        payroll_employee_code: toText(row.payroll_employee_code),
        accounting_account_code: toText(row.accounting_account_code),
        salary_amount: toNumber(row.salary_amount),
        work_on_holidays: toBoolean(row.work_on_holidays, false),
        hire_date: toText(row.hire_date),
        termination_date: toText(row.termination_date),
        created_by: null,
        created_at: null,
        updated_by: null,
        updated_at: null,
        employee_profile_code: toText(row.employee_profile_code),
        profile_name: toText((profile as any).profile_name),
        profile_short_name: toText((profile as any).profile_short_name),
        work_group_code: toText(row.work_group_code),
        work_group_payrol_group_code: toText((workGroup as any).work_group_payrol_group_code),
        work_group_name: toText((workGroup as any).work_group_name),
        work_group_short_name: toText((workGroup as any).work_group_short_name),
        work_location_code: toText(row.work_location_code),
        work_location_name: toText((workLocation as any).work_location_name),
        work_location_short_name: toText((workLocation as any).work_location_short_name),
        work_location_country_id: toText((workLocation as any).work_location_country_id),
        work_location_country_label: toText((workLocation as any).work_location_country_label),
        work_location_country_short_label: toText((workLocation as any).work_location_country_short_label),
        work_location_state_id: toText((workLocation as any).work_location_state_id),
        work_location_state_label: toText((workLocation as any).work_location_state_label),
        work_location_state_short_label: toText((workLocation as any).work_location_state_short_label),
        work_location_city_id: toText((workLocation as any).work_location_city_id),
        work_location_city_label: toText((workLocation as any).work_location_city_label),
        work_location_city_short_label: toText((workLocation as any).work_location_city_short_label),
        work_location_time_zone: toText((workLocation as any).work_location_time_zone ?? (workLocation as any).time_zone),
        department_code: toText(row.department_code),
        department_name: toText((department as any).department_name),
        department_short_name: toText((department as any).department_short_name),
        area_code: toText(row.area_code),
        area_name: toText((area as any).area_name),
        area_short_name: toText((area as any).area_short_name),
        area_payroll_group_code: toText((area as any).area_payroll_group_code),
        job_title_code: toText(row.job_title_code),
        job_title_name: toText((job as any).job_title_name),
        job_title_short_name: toText((job as any).job_title_short_name),
        cost_center_code: toText(row.cost_center_code),
        homologation_code: toText((cost as any).homologation_code),
        gl_account_code: toText((cost as any).gl_account_code),
        cost_center_name: toText((cost as any).cost_center_name),
        cost_center_short_name: toText((cost as any).cost_center_short_name),
        payroll_group_code: toText(row.payroll_group_code),
        payroll_group_name: toText((payroll as any).payroll_group_name),
        payroll_group_short_name: toText((payroll as any).payroll_group_short_name),
        contract_type_key: toText(row.contract_type_key),
      });
    });

    const employeeRows: EmployeeImportRow[] = [];
    employees.forEach((row, idx) => {
      const rowNo = idx + 2;
      const employeeCode = toText(row.employee_code);
      if (!employeeCode) {
        errors.push({ row: rowNo, column: 'employee_code', message: 'Campo obligatorio en pestaÃ±a 11' });
        return;
      }

      const user = userByEmployeeCode.get(employeeCode) || {};
      const role = roleByEmployeeCode.get(employeeCode) || {};
      const scope = scopeByEmployeeCode.get(employeeCode) || {};

      employeeRows.push({
        tenant_id: toText(row.tenant_id) || tenantId,
        employee_code: employeeCode,
        employee_lastname: toText(row.employee_lastname),
        employee_name: toText(row.employee_name),
        employee_cedula: toText(row.employee_cedula),
        employee_birthday: toText(row.employee_birthday),
        employee_gender_id: toText(row.employee_gender_id),
        employee_is_model: toBoolean(row.employee_is_model, false),
        employee_observations: toText(row.employee_observations),
        employee_photo_path: toText(row.employee_photo_path),
        username: toText((user as any).username),
        password: toText((user as any).password_plain_for_import) || toText((user as any).password),
        display_name: toText((user as any).display_name),
        email: toText((user as any).email),
        phone: toText((user as any).phone),
        preferred_language_code: toText((user as any).preferred_language_code),
        user_role_key: toText((role as any).role_key) || 'EMPLOYEE',
        scope_type_key: toText((scope as any).scope_type_key) || 'EMPLOYEE',
        valid_from: toText((role as any).valid_from),
        valid_to: toText((role as any).valid_to),
        is_active: toBoolean(row.is_active, true),
        created_by: null,
        created_at: null,
        updated_by: null,
        updated_at: null,
      });
    });

    const tabStats: WorkbookTabStat[] = [
      { tab: '01_payroll_groups', rows: payrollGroups.length },
      { tab: '02_employee_profiles', rows: employeeProfiles.length },
      { tab: '03_departments', rows: departments.length },
      { tab: '04_job_titles', rows: jobTitles.length },
      { tab: '05_cost_centers', rows: costCenters.length },
      { tab: '06_areas', rows: areas.length },
      { tab: '07_work_groups', rows: workGroups.length },
      { tab: '08_companies', rows: companies.length },
      { tab: '09_geo_catalog', rows: geoCatalog.length },
      { tab: '10_work_locations', rows: workLocations.length },
      { tab: '11_employees', rows: employees.length },
      { tab: '12_users', rows: users.length },
      { tab: '13_user_roles', rows: userRoles.length },
      { tab: '14_user_role_scopes', rows: userRoleScopes.length },
      { tab: '15_employee_companies', rows: employeeCompanies.length },
    ];

    if (structureRows.length === 0) {
      errors.push({ row: 0, column: '15_employee_companies', message: 'No hay filas para estructura/import paso 1' });
    }
    if (employeeRows.length === 0) {
      errors.push({ row: 0, column: '11_employees', message: 'No hay filas para empleados/import paso 2' });
    }

    return {
      success: errors.length === 0,
      data: [
        {
          tenantId,
          structureRows,
          employeeRows,
          tabStats,
        },
      ],
      errors,
      rowCount: structureRows.length + employeeRows.length,
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, column: 'general', message: error?.message || 'Error procesando workbook v2' }],
      rowCount: 0,
    };
  }
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await ApiClient.auth.getSession();
  const token = data?.session?.access_token || '';
  if (error || !token) throw new Error('No hay sesión activa. Vuelva a iniciar sesión.');
  return token;
}

async function postWithAuth<T>(path: string, body: any, signal?: AbortSignal): Promise<T> {
  const token = await getAccessToken();
  const controller = signal ? null : new AbortController();
  const requestSignal = signal || controller?.signal;
  const timeout = window.setTimeout(() => {
    if (!signal && controller) controller.abort();
  }, 8 * 60 * 1000);
  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: requestSignal,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Operacion cancelada por el usuario o timeout del cliente.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Error HTTP ${response.status}`);
  }
  return payload as T;
}

function getFileNameFromDisposition(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const utfMatch = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return utfMatch[1];
    }
  }

  const plainMatch = headerValue.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) return plainMatch[1];
  return null;
}

async function getBlobWithAuth(path: string): Promise<MigrationExportPayload> {
  const token = await getAccessToken();
  const response = await fetch(buildApiUrl(path), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || payload?.message || `Error HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const fileName =
    getFileNameFromDisposition(response.headers.get('content-disposition')) ||
    `migration_export_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;

  return { blob, fileName };
}

export async function runStructureMassiveImport(
  rows: StructureImportRow[],
  signal?: AbortSignal
): Promise<StructureImportResponse> {
  return postWithAuth<StructureImportResponse>('/organization/mass-import/structure', { rows }, signal);
}

export async function runEmployeesMassiveImport(
  rows: EmployeeImportRow[],
  stagedAssignments: StagedAssignment[],
  signal?: AbortSignal
): Promise<EmployeeImportResponse> {
  return postWithAuth<EmployeeImportResponse>('/organization/mass-import/employees', {
    rows,
    staged_assignments: stagedAssignments,
  }, signal);
}

export async function downloadMigrationExport(): Promise<MigrationExportPayload> {
  return getBlobWithAuth('/organization/migration-export');
}

export async function getMassImportCapabilities(): Promise<ImportCapabilities> {
  const token = await getAccessToken();
  const response = await fetch(buildApiUrl('/organization/mass-import/capabilities'), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Error HTTP ${response.status}`);
  }

  return payload?.capabilities || { can_import: false, can_abort: false, can_reverse: false };
}

export async function runReverseMassiveImport(payload: {
  structureRows: StructureImportRow[];
  employeeRows: EmployeeImportRow[];
  importStartedAt?: string | null;
}): Promise<ReverseImportResponse> {
  return postWithAuth<ReverseImportResponse>('/organization/mass-import/reverse', {
    structure_rows: payload.structureRows,
    employee_rows: payload.employeeRows,
    import_started_at: payload.importStartedAt || null,
  });
}
