import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

export interface OrganizationValidationError {
  row: number;
  column: string;
  message: string;
}

export interface OrganizationParseResult<T extends Record<string, any>> {
  success: boolean;
  data: T[];
  errors: OrganizationValidationError[];
  rowCount: number;
}

export type OrganizationEntityKey =
  | 'companies'
  | 'work_locations'
  | 'payroll_groups'
  | 'departments'
  | 'areas'
  | 'cost_centers'
  | 'job_titles'
  | 'work_groups'
  | 'employee_profiles';

export interface OrganizationTemplateColumn {
  key: string;
  required?: boolean;
  example?: string;
}

export const ORGANIZATION_TEMPLATE_COLUMNS: Record<OrganizationEntityKey, OrganizationTemplateColumn[]> = {
  companies: [
    { key: 'company_name', required: true, example: 'Turnos Titanium S.A.' },
    { key: 'company_short_name', required: true, example: 'Titanium' },
    { key: 'company_code', required: true, example: 'EMP-001' },
    { key: 'company_address', example: 'Av. Principal 123' },
    { key: 'company_address_line1', example: 'Av. Principal 123' },
    { key: 'company_address_line2', example: 'Piso 2, Oficina 202' },
    { key: 'company_country_id', example: 'uuid-opcional' },
    { key: 'company_state_id', example: 'uuid-opcional' },
    { key: 'company_city_id', example: 'uuid-opcional' },
    { key: 'company_postal_code', example: '092301' },
    { key: 'company_phone', example: '+593 98 000 0000' },
    { key: 'is_active', example: 'true' },
  ],
  work_locations: [
    { key: 'company_id', required: true, example: 'uuid-company' },
    { key: 'work_location_name', required: true, example: 'Sede Principal Quito' },
    { key: 'work_location_short_name', required: true, example: 'Matriz' },
    { key: 'work_location_code', required: true, example: 'LOC-UIO' },
    { key: 'address_line1', example: 'Av. Amazonas y Colon' },
    { key: 'latitude', example: '-0.180653' },
    { key: 'longitude', example: '-78.467834' },
    { key: 'is_active', example: 'true' },
  ],
  payroll_groups: [
    { key: 'payroll_group_name', required: true, example: 'Administrativo' },
    { key: 'payroll_group_short_name', required: true, example: 'Admin' },
    { key: 'payroll_group_code', required: true, example: 'PAY-ADM' },
    { key: 'is_active', example: 'true' },
  ],
  departments: [
    { key: 'department_name', required: true, example: 'Recursos Humanos' },
    { key: 'department_short_name', required: true, example: 'RRHH' },
    { key: 'department_code', required: true, example: 'DEP-RRHH' },
    { key: 'is_active', example: 'true' },
  ],
  areas: [
    { key: 'area_name', required: true, example: 'Contabilidad' },
    { key: 'area_short_name', required: true, example: 'Contab' },
    { key: 'area_code', required: true, example: 'AREA-CONT' },
    { key: 'payroll_group_id', example: 'uuid-payroll-group' },
    { key: 'is_active', example: 'true' },
  ],
  cost_centers: [
    { key: 'cost_center_name', required: true, example: 'Centro Operativo 1' },
    { key: 'cost_center_short_name', required: true, example: 'CO-1' },
    { key: 'cost_center_code', required: true, example: 'CC-001' },
    { key: 'homologation_code', example: 'HOMO-001' },
    { key: 'gl_account_code', example: '5101-001' },
    { key: 'is_active', example: 'true' },
  ],
  job_titles: [
    { key: 'job_title_name', required: true, example: 'Analista de Talento Humano' },
    { key: 'job_title_short_name', required: true, example: 'Analista TH' },
    { key: 'job_title_code', required: true, example: 'JOB-ATH' },
    { key: 'is_active', example: 'true' },
  ],
  work_groups: [
    { key: 'work_group_name', required: true, example: 'Turno A - Matriz' },
    { key: 'work_group_short_name', required: true, example: 'A-MTZ' },
    { key: 'work_group_code', required: true, example: 'WG-A-MTZ' },
    { key: 'payroll_group_id', example: 'uuid-payroll-group' },
    { key: 'is_active', example: 'true' },
  ],
  employee_profiles: [
    { key: 'profile_name', required: true, example: 'Administrativo' },
    { key: 'profile_short_name', required: true, example: 'Admin' },
    { key: 'employee_profile_code', required: true, example: 'PERF-ADM' },
    { key: 'is_active', example: 'true' },
  ],
};

function toBoolean(value: any, defaultValue = true): boolean {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'si', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  return defaultValue;
}

export function generateOrganizationEntityTemplate(entity: OrganizationEntityKey): Blob {
  const columns = ORGANIZATION_TEMPLATE_COLUMNS[entity];
  const headers = columns.map((col) => col.key);
  const examples = columns.map((col) => col.example || '');

  const workbook = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.aoa_to_sheet([headers, examples]);
  dataSheet['!cols'] = headers.map(() => ({ wch: 26 }));

  XLSX.utils.book_append_sheet(workbook, dataSheet, entity);

  const instructionRows = [
    ['INSTRUCCIONES'],
    ['- No cambie los nombres de las columnas.'],
    ['- Puede agregar multiples filas debajo de la fila de ejemplo.'],
    ['- Los campos id deben ser UUID validos cuando se requieran.'],
    ['- is_active acepta: true/false.'],
    ['- Campos requeridos:'],
    [columns.filter((col) => col.required).map((col) => col.key).join(', ') || '(ninguno)'],
  ];

  const instructionSheet = XLSX.utils.aoa_to_sheet(instructionRows);
  instructionSheet['!cols'] = [{ wch: 120 }];
  XLSX.utils.book_append_sheet(workbook, instructionSheet, 'instrucciones');

  const output = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export async function parseOrganizationEntityFile(
  file: File,
  entity: OrganizationEntityKey
): Promise<OrganizationParseResult<Record<string, any>>> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
    const columns = ORGANIZATION_TEMPLATE_COLUMNS[entity];

    if (!rawRows.length) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, column: 'general', message: 'El archivo esta vacio' }],
        rowCount: 0,
      };
    }

    const errors: OrganizationValidationError[] = [];
    const data: Record<string, any>[] = [];

    rawRows.forEach((rawRow, index) => {
      const rowNumber = index + 2;
      const normalized: Record<string, any> = {};

      columns.forEach((column) => {
        const value = rawRow[column.key];
        if (column.required && (value === null || value === undefined || String(value).trim() === '')) {
          errors.push({ row: rowNumber, column: column.key, message: 'Campo obligatorio' });
        }
        normalized[column.key] = value;
      });

      if (normalized.is_active !== undefined) {
        normalized.is_active = toBoolean(normalized.is_active, true);
      }

      if (normalized.latitude !== undefined && normalized.latitude !== null && normalized.latitude !== '') {
        const lat = Number(String(normalized.latitude).replace(',', '.'));
        if (Number.isNaN(lat)) {
          errors.push({ row: rowNumber, column: 'latitude', message: 'Debe ser numerico' });
        } else {
          normalized.latitude = lat;
        }
      }

      if (normalized.longitude !== undefined && normalized.longitude !== null && normalized.longitude !== '') {
        const lon = Number(String(normalized.longitude).replace(',', '.'));
        if (Number.isNaN(lon)) {
          errors.push({ row: rowNumber, column: 'longitude', message: 'Debe ser numerico' });
        } else {
          normalized.longitude = lon;
        }
      }

      data.push(normalized);
    });

    return {
      success: errors.length === 0,
      data,
      errors,
      rowCount: rawRows.length,
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

export interface EmployeeCompanyCatalogOption {
  id: string;
  code: string;
  label: string;
}

export interface EmployeeCompanyCatalogs {
  companies: EmployeeCompanyCatalogOption[];
  employeeProfiles: EmployeeCompanyCatalogOption[];
  workGroups: EmployeeCompanyCatalogOption[];
  workLocations: EmployeeCompanyCatalogOption[];
  departments: EmployeeCompanyCatalogOption[];
  areas: EmployeeCompanyCatalogOption[];
  jobTitles: EmployeeCompanyCatalogOption[];
  costCenters: EmployeeCompanyCatalogOption[];
  payrollGroups: EmployeeCompanyCatalogOption[];
  contractTypes: EmployeeCompanyCatalogOption[];
  genders: EmployeeCompanyCatalogOption[];
}

export async function generateEmployeeCompaniesTemplateWithDropdowns(catalogs: EmployeeCompanyCatalogs): Promise<Blob> {
  const wb = new ExcelJS.Workbook();

  const ws = wb.addWorksheet('employee_companies');
  ws.columns = [
    { header: 'employee_code', key: 'employee_code', width: 16 },
    { header: 'employee_lastname', key: 'employee_lastname', width: 20 },
    { header: 'employee_name', key: 'employee_name', width: 20 },
    { header: 'employee_birthday', key: 'employee_birthday', width: 16 },
    { header: 'employee_gender_id', key: 'employee_gender_id', width: 22 },
    { header: 'company_id', key: 'company_id', width: 20 },
    { header: 'device_user_code', key: 'device_user_code', width: 20 },
    { header: 'payroll_employee_code', key: 'payroll_employee_code', width: 22 },
    { header: 'employee_profile_id', key: 'employee_profile_id', width: 22 },
    { header: 'work_group_id', key: 'work_group_id', width: 20 },
    { header: 'work_location_id', key: 'work_location_id', width: 22 },
    { header: 'department_id', key: 'department_id', width: 20 },
    { header: 'area_id', key: 'area_id', width: 20 },
    { header: 'job_title_id', key: 'job_title_id', width: 20 },
    { header: 'cost_center_id', key: 'cost_center_id', width: 22 },
    { header: 'payroll_group_id', key: 'payroll_group_id', width: 22 },
    { header: 'accounting_account_code', key: 'accounting_account_code', width: 24 },
    { header: 'salary_amount', key: 'salary_amount', width: 14 },
    { header: 'hire_date', key: 'hire_date', width: 14 },
    { header: 'termination_date', key: 'termination_date', width: 16 },
    { header: 'contract_type_id', key: 'contract_type_id', width: 20 },
    { header: 'work_on_holidays', key: 'work_on_holidays', width: 16 },
    { header: 'is_active', key: 'is_active', width: 10 },
  ];

  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4C81' } };

  ws.addRow({
    employee_code: 'EMP-001',
    employee_lastname: 'Perez',
    employee_name: 'Juan',
    employee_birthday: '1990-01-15',
    employee_gender_id: catalogs.genders[0]?.id || '',
    company_id: catalogs.companies[0]?.id || '',
    employee_profile_id: catalogs.employeeProfiles[0]?.id || '',
    work_group_id: catalogs.workGroups[0]?.id || '',
    work_location_id: catalogs.workLocations[0]?.id || '',
    department_id: catalogs.departments[0]?.id || '',
    area_id: catalogs.areas[0]?.id || '',
    job_title_id: catalogs.jobTitles[0]?.id || '',
    cost_center_id: catalogs.costCenters[0]?.id || '',
    payroll_group_id: catalogs.payrollGroups[0]?.id || '',
    contract_type_id: catalogs.contractTypes[0]?.id || '',
    work_on_holidays: false,
    is_active: true,
  });

  const catalogSheet = wb.addWorksheet('catalogs');
  catalogSheet.columns = [
    { header: 'companies_id', key: 'companies_id', width: 40 },
    { header: 'employee_profiles_id', key: 'employee_profiles_id', width: 40 },
    { header: 'work_groups_id', key: 'work_groups_id', width: 40 },
    { header: 'work_locations_id', key: 'work_locations_id', width: 40 },
    { header: 'departments_id', key: 'departments_id', width: 40 },
    { header: 'areas_id', key: 'areas_id', width: 40 },
    { header: 'job_titles_id', key: 'job_titles_id', width: 40 },
    { header: 'cost_centers_id', key: 'cost_centers_id', width: 40 },
    { header: 'payroll_groups_id', key: 'payroll_groups_id', width: 40 },
    { header: 'contract_types_id', key: 'contract_types_id', width: 40 },
    { header: 'genders_id', key: 'genders_id', width: 40 },
  ];

  const maxRows = Math.max(
    catalogs.companies.length,
    catalogs.employeeProfiles.length,
    catalogs.workGroups.length,
    catalogs.workLocations.length,
    catalogs.departments.length,
    catalogs.areas.length,
    catalogs.jobTitles.length,
    catalogs.costCenters.length,
    catalogs.payrollGroups.length,
    catalogs.contractTypes.length,
    catalogs.genders.length
  );

  for (let i = 0; i < maxRows; i += 1) {
    catalogSheet.addRow({
      companies_id: catalogs.companies[i]?.id || '',
      employee_profiles_id: catalogs.employeeProfiles[i]?.id || '',
      work_groups_id: catalogs.workGroups[i]?.id || '',
      work_locations_id: catalogs.workLocations[i]?.id || '',
      departments_id: catalogs.departments[i]?.id || '',
      areas_id: catalogs.areas[i]?.id || '',
      job_titles_id: catalogs.jobTitles[i]?.id || '',
      cost_centers_id: catalogs.costCenters[i]?.id || '',
      payroll_groups_id: catalogs.payrollGroups[i]?.id || '',
      contract_types_id: catalogs.contractTypes[i]?.id || '',
      genders_id: catalogs.genders[i]?.id || '',
    });
  }

  const MAX_TEMPLATE_ROWS = 1000;

  const addValidation = (range: string, formula: string, allowBlank = true) => {
    ws.dataValidations.add(range, {
      type: 'list',
      allowBlank,
      formulae: [formula],
      showErrorMessage: true,
      errorTitle: 'Valor invalido',
      error: 'Seleccione un valor de la lista desplegable.',
    });
  };

  addValidation(`E2:E${MAX_TEMPLATE_ROWS}`, `catalogs!$K$2:$K$${catalogs.genders.length + 1}`);
  addValidation(`F2:F${MAX_TEMPLATE_ROWS}`, `catalogs!$A$2:$A$${catalogs.companies.length + 1}`, false);
  addValidation(`I2:I${MAX_TEMPLATE_ROWS}`, `catalogs!$B$2:$B$${catalogs.employeeProfiles.length + 1}`);
  addValidation(`J2:J${MAX_TEMPLATE_ROWS}`, `catalogs!$C$2:$C$${catalogs.workGroups.length + 1}`);
  addValidation(`K2:K${MAX_TEMPLATE_ROWS}`, `catalogs!$D$2:$D$${catalogs.workLocations.length + 1}`);
  addValidation(`L2:L${MAX_TEMPLATE_ROWS}`, `catalogs!$E$2:$E$${catalogs.departments.length + 1}`);
  addValidation(`M2:M${MAX_TEMPLATE_ROWS}`, `catalogs!$F$2:$F$${catalogs.areas.length + 1}`);
  addValidation(`N2:N${MAX_TEMPLATE_ROWS}`, `catalogs!$G$2:$G$${catalogs.jobTitles.length + 1}`);
  addValidation(`O2:O${MAX_TEMPLATE_ROWS}`, `catalogs!$H$2:$H$${catalogs.costCenters.length + 1}`);
  addValidation(`P2:P${MAX_TEMPLATE_ROWS}`, `catalogs!$I$2:$I$${catalogs.payrollGroups.length + 1}`);
  addValidation(`U2:U${MAX_TEMPLATE_ROWS}`, `catalogs!$J$2:$J$${catalogs.contractTypes.length + 1}`);

  ws.dataValidations.add(`V2:V${MAX_TEMPLATE_ROWS}`, {
    type: 'list',
    allowBlank: true,
    formulae: ['"true,false"'],
  });

  ws.dataValidations.add(`W2:W${MAX_TEMPLATE_ROWS}`, {
    type: 'list',
    allowBlank: true,
    formulae: ['"true,false"'],
  });

  const instructions = wb.addWorksheet('instructions');
  instructions.columns = [{ header: 'notes', key: 'notes', width: 140 }];
  [
    'Plantilla employee_companies',
    'Debe completar employee_code, employee_lastname, employee_name y company_id.',
    'Las columnas *_id tienen listas desplegables con IDs previamente cargados.',
    'Formato fechas: YYYY-MM-DD.',
    'Campos booleanos: true/false.',
  ].forEach((line) => instructions.addRow({ notes: line }));

  const output = await wb.xlsx.writeBuffer();
  return new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export async function parseEmployeeCompaniesFile(file: File): Promise<OrganizationParseResult<Record<string, any>>> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (!rows.length) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, column: 'general', message: 'El archivo esta vacio' }],
        rowCount: 0,
      };
    }

    const errors: OrganizationValidationError[] = [];
    const data: Record<string, any>[] = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const employeeCode = String(row.employee_code || '').trim();
      const employeeLastname = String(row.employee_lastname || '').trim();
      const employeeName = String(row.employee_name || '').trim();
      const companyId = String(row.company_id || '').trim();

      if (!employeeCode) errors.push({ row: rowNumber, column: 'employee_code', message: 'Campo obligatorio' });
      if (!employeeLastname) errors.push({ row: rowNumber, column: 'employee_lastname', message: 'Campo obligatorio' });
      if (!employeeName) errors.push({ row: rowNumber, column: 'employee_name', message: 'Campo obligatorio' });
      if (!companyId) errors.push({ row: rowNumber, column: 'company_id', message: 'Campo obligatorio' });

      data.push({
        employee_code: employeeCode,
        employee_lastname: employeeLastname,
        employee_name: employeeName,
        employee_birthday: row.employee_birthday ? String(row.employee_birthday).trim() : null,
        employee_gender_id: row.employee_gender_id ? String(row.employee_gender_id).trim() : null,
        company_id: companyId || null,
        device_user_code: row.device_user_code ? String(row.device_user_code).trim() : null,
        payroll_employee_code: row.payroll_employee_code ? String(row.payroll_employee_code).trim() : null,
        employee_profile_id: row.employee_profile_id ? String(row.employee_profile_id).trim() : null,
        work_group_id: row.work_group_id ? String(row.work_group_id).trim() : null,
        work_location_id: row.work_location_id ? String(row.work_location_id).trim() : null,
        department_id: row.department_id ? String(row.department_id).trim() : null,
        area_id: row.area_id ? String(row.area_id).trim() : null,
        job_title_id: row.job_title_id ? String(row.job_title_id).trim() : null,
        cost_center_id: row.cost_center_id ? String(row.cost_center_id).trim() : null,
        payroll_group_id: row.payroll_group_id ? String(row.payroll_group_id).trim() : null,
        accounting_account_code: row.accounting_account_code ? String(row.accounting_account_code).trim() : null,
        salary_amount: row.salary_amount !== null && row.salary_amount !== undefined && row.salary_amount !== '' ? Number(row.salary_amount) : null,
        hire_date: row.hire_date ? String(row.hire_date).trim() : null,
        termination_date: row.termination_date ? String(row.termination_date).trim() : null,
        contract_type_id: row.contract_type_id ? String(row.contract_type_id).trim() : null,
        work_on_holidays: toBoolean(row.work_on_holidays, false),
        is_active: toBoolean(row.is_active, true),
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
