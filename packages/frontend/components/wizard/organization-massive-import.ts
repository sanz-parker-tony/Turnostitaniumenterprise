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
  already_reversed?: boolean;
  summary: Record<string, number>;
  events: ImportLogEvent[];
  started_at: string;
};

export type MassImportRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'aborted'
  | 'reversing'
  | 'reversed';

export type MassImportRun = {
  id: string;
  fileName: string;
  status: MassImportRunStatus;
  importStartedAt: string;
  completedAt: string | null;
  reversedAt: string | null;
  importSummary: Record<string, any>;
  reversalSummary: Record<string, any>;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type WorkbookTabStat = {
  tab: string;
  rows: number;
};

export type MassiveWorkbookTemplateColumn = {
  key: string;
  required?: boolean;
  type: 'texto' | 'codigo' | 'booleano' | 'fecha' | 'numero' | 'email' | 'uuid';
  description: string;
  example?: string;
};

export type MassiveWorkbookTemplateTab = {
  name: string;
  description: string;
  columns: MassiveWorkbookTemplateColumn[];
};

export const MASSIVE_WORKBOOK_TEMPLATE_TABS: MassiveWorkbookTemplateTab[] = [
  {
    name: '01_payroll_groups',
    description: 'Roles de pago usados por areas, grupos de trabajo y asignaciones de empleados.',
    columns: [
      { key: 'legacy_id', required: true, type: 'codigo', description: 'ID/codigo legacy del rol de pago en el sistema anterior.', example: 'ROL-ADM' },
      { key: 'payroll_group_name', required: true, type: 'texto', description: 'Nombre completo del rol de pago.', example: 'Administrativo' },
      { key: 'payroll_group_short_name', required: true, type: 'texto', description: 'Nombre corto del rol de pago.', example: 'Admin' },
      { key: 'is_active', type: 'booleano', description: 'Estado del registro. Acepta true/false, si/no, 1/0.', example: 'true' },
    ],
  },
  {
    name: '02_employee_profiles',
    description: 'Perfiles de empleado para la posicion organizacional.',
    columns: [
      { key: 'legacy_id', required: true, type: 'codigo', description: 'ID/codigo legacy del perfil de empleado en el sistema anterior.', example: 'PERF-ADM' },
      { key: 'profile_name', required: true, type: 'texto', description: 'Nombre completo del perfil.', example: 'Administrativo' },
      { key: 'profile_short_name', required: true, type: 'texto', description: 'Nombre corto del perfil.', example: 'Admin' },
      { key: 'is_active', type: 'booleano', description: 'Estado del registro. Acepta true/false, si/no, 1/0.', example: 'true' },
    ],
  },
  {
    name: '03_departments',
    description: 'Departamentos organizacionales.',
    columns: [
      { key: 'legacy_id', required: true, type: 'codigo', description: 'ID/codigo legacy del departamento en el sistema anterior.', example: 'DEP-FIN' },
      { key: 'department_name', required: true, type: 'texto', description: 'Nombre completo del departamento.', example: 'Financiero' },
      { key: 'department_short_name', required: true, type: 'texto', description: 'Nombre corto del departamento.', example: 'Finanzas' },
      { key: 'is_active', type: 'booleano', description: 'Estado del registro. Acepta true/false, si/no, 1/0.', example: 'true' },
    ],
  },
  {
    name: '04_job_titles',
    description: 'Cargos o puestos de trabajo.',
    columns: [
      { key: 'legacy_id', required: true, type: 'codigo', description: 'ID/codigo legacy del cargo en el sistema anterior.', example: 'CARGO-ANL' },
      { key: 'job_title_name', required: true, type: 'texto', description: 'Nombre completo del cargo.', example: 'Analista Contable' },
      { key: 'job_title_short_name', required: true, type: 'texto', description: 'Nombre corto del cargo.', example: 'Analista' },
      { key: 'is_active', type: 'booleano', description: 'Estado del registro. Acepta true/false, si/no, 1/0.', example: 'true' },
    ],
  },
  {
    name: '05_cost_centers',
    description: 'Centros de costo contables u operativos.',
    columns: [
      { key: 'legacy_id', required: true, type: 'codigo', description: 'ID/codigo legacy del centro de costo en el sistema anterior.', example: 'CC-001' },
      { key: 'cost_center_name', required: true, type: 'texto', description: 'Nombre completo del centro de costo.', example: 'Administracion Matriz' },
      { key: 'cost_center_short_name', required: true, type: 'texto', description: 'Nombre corto del centro de costo.', example: 'ADM-MTZ' },
      { key: 'homologation_code', type: 'codigo', description: 'Codigo externo de homologacion, si aplica.', example: 'HOMO-001' },
      { key: 'gl_account_code', type: 'codigo', description: 'Cuenta contable asociada, si aplica.', example: '5101-001' },
      { key: 'is_active', type: 'booleano', description: 'Estado del registro. Acepta true/false, si/no, 1/0.', example: 'true' },
    ],
  },
  {
    name: '06_areas',
    description: 'Areas internas y su relacion opcional con rol de pago.',
    columns: [
      { key: 'legacy_id', required: true, type: 'codigo', description: 'ID/codigo legacy del area en el sistema anterior.', example: 'AREA-CONT' },
      { key: 'area_name', required: true, type: 'texto', description: 'Nombre completo del area.', example: 'Contabilidad' },
      { key: 'area_short_name', required: true, type: 'texto', description: 'Nombre corto del area.', example: 'Contab' },
      { key: 'area_payroll_group_legacy_id', type: 'codigo', description: 'legacy_id del rol de pago relacionado, si aplica.', example: 'ROL-ADM' },
      { key: 'is_active', type: 'booleano', description: 'Estado del registro. Acepta true/false, si/no, 1/0.', example: 'true' },
    ],
  },
  {
    name: '07_work_groups',
    description: 'Grupos de trabajo para clasificacion operativa.',
    columns: [
      { key: 'legacy_id', required: true, type: 'codigo', description: 'ID/codigo legacy del grupo de trabajo en el sistema anterior.', example: 'GT-OFIC' },
      { key: 'work_group_name', required: true, type: 'texto', description: 'Nombre completo del grupo de trabajo.', example: 'Oficina' },
      { key: 'work_group_short_name', required: true, type: 'texto', description: 'Nombre corto del grupo de trabajo.', example: 'Ofic' },
      { key: 'work_group_payroll_group_legacy_id', type: 'codigo', description: 'legacy_id del rol de pago relacionado, si aplica.', example: 'ROL-ADM' },
      { key: 'is_active', type: 'booleano', description: 'Estado del registro. Acepta true/false, si/no, 1/0.', example: 'true' },
    ],
  },
  {
    name: '08_companies',
    description: 'Empresas del tenant.',
    columns: [
      { key: 'tenant_id', type: 'uuid', description: 'ID del tenant. Si se deja vacio, el sistema usa el tenant de la sesion.', example: '' },
      { key: 'legacy_id', required: true, type: 'codigo', description: 'ID/codigo legacy de la empresa en el sistema anterior.', example: 'EMP-001' },
      { key: 'company_ruc', type: 'texto', description: 'RUC o identificacion fiscal.', example: '0999999999001' },
      { key: 'company_name', required: true, type: 'texto', description: 'Nombre legal o comercial completo.', example: 'Titanium-Labs Corp.' },
      { key: 'company_short_name', required: true, type: 'texto', description: 'Nombre corto de la empresa.', example: 'Titanium' },
      { key: 'company_address', type: 'texto', description: 'Direccion general.', example: 'Av. Principal 123' },
      { key: 'company_address_line1', type: 'texto', description: 'Primera linea de direccion.', example: 'Av. Principal 123' },
      { key: 'company_address_line2', type: 'texto', description: 'Segunda linea de direccion.', example: 'Piso 2' },
      { key: 'company_country_id', type: 'codigo', description: 'Codigo de pais para crear o resolver catalogo geografico.', example: 'EC' },
      { key: 'company_country_label', type: 'texto', description: 'Nombre del pais.', example: 'Ecuador' },
      { key: 'company_country_short_label', type: 'texto', description: 'Nombre corto del pais.', example: 'ECU' },
      { key: 'company_state_id', type: 'codigo', description: 'Codigo de provincia/estado.', example: 'GUAYAS' },
      { key: 'company_state_label', type: 'texto', description: 'Nombre de provincia/estado.', example: 'Guayas' },
      { key: 'company_state_short_label', type: 'texto', description: 'Nombre corto de provincia/estado.', example: 'GYE' },
      { key: 'company_city_id', type: 'codigo', description: 'Codigo de ciudad.', example: 'GYE' },
      { key: 'company_city_label', type: 'texto', description: 'Nombre de ciudad.', example: 'Guayaquil' },
      { key: 'company_city_short_label', type: 'texto', description: 'Nombre corto de ciudad.', example: 'GYE' },
      { key: 'company_postal_code', type: 'texto', description: 'Codigo postal.', example: '090101' },
      { key: 'company_phone', type: 'texto', description: 'Telefono principal.', example: '+593 98 000 0000' },
      { key: 'is_active', type: 'booleano', description: 'Estado del registro. Acepta true/false, si/no, 1/0.', example: 'true' },
    ],
  },
  {
    name: '09_geo_catalog',
    description: 'Referencia opcional de catalogo geografico. Ayuda a documentar pais, provincia y ciudad.',
    columns: [
      { key: 'country_key', type: 'codigo', description: 'Codigo de pais.', example: 'EC' },
      { key: 'country_label', type: 'texto', description: 'Nombre del pais.', example: 'Ecuador' },
      { key: 'country_short_label', type: 'texto', description: 'Nombre corto del pais.', example: 'ECU' },
      { key: 'state_key', type: 'codigo', description: 'Codigo de provincia/estado.', example: 'GUAYAS' },
      { key: 'state_label', type: 'texto', description: 'Nombre de provincia/estado.', example: 'Guayas' },
      { key: 'state_short_label', type: 'texto', description: 'Nombre corto de provincia/estado.', example: 'GYE' },
      { key: 'city_key', type: 'codigo', description: 'Codigo de ciudad.', example: 'GYE' },
      { key: 'city_label', type: 'texto', description: 'Nombre de ciudad.', example: 'Guayaquil' },
      { key: 'city_short_label', type: 'texto', description: 'Nombre corto de ciudad.', example: 'GYE' },
    ],
  },
  {
    name: '10_work_locations',
    description: 'Localizaciones o sedes de trabajo.',
    columns: [
      { key: 'legacy_id', required: true, type: 'codigo', description: 'ID/codigo legacy de la localizacion en el sistema anterior.', example: 'LOC-GYE' },
      { key: 'work_location_name', required: true, type: 'texto', description: 'Nombre completo de la localizacion.', example: 'Matriz Guayaquil' },
      { key: 'work_location_short_name', required: true, type: 'texto', description: 'Nombre corto de la localizacion.', example: 'Matriz' },
      { key: 'work_location_country_id', type: 'codigo', description: 'Codigo de pais de la localizacion.', example: 'EC' },
      { key: 'work_location_country_label', type: 'texto', description: 'Nombre del pais.', example: 'Ecuador' },
      { key: 'work_location_country_short_label', type: 'texto', description: 'Nombre corto del pais.', example: 'ECU' },
      { key: 'work_location_state_id', type: 'codigo', description: 'Codigo de provincia/estado.', example: 'GUAYAS' },
      { key: 'work_location_state_label', type: 'texto', description: 'Nombre de provincia/estado.', example: 'Guayas' },
      { key: 'work_location_state_short_label', type: 'texto', description: 'Nombre corto de provincia/estado.', example: 'GYE' },
      { key: 'work_location_city_id', type: 'codigo', description: 'Codigo de ciudad.', example: 'GYE' },
      { key: 'work_location_city_label', type: 'texto', description: 'Nombre de ciudad.', example: 'Guayaquil' },
      { key: 'work_location_city_short_label', type: 'texto', description: 'Nombre corto de ciudad.', example: 'GYE' },
      { key: 'work_location_time_zone', type: 'texto', description: 'Zona horaria IANA.', example: 'America/Guayaquil' },
      { key: 'is_active', type: 'booleano', description: 'Estado del registro. Acepta true/false, si/no, 1/0.', example: 'true' },
    ],
  },
  {
    name: '11_employees',
    description: 'Datos base de empleados.',
    columns: [
      { key: 'tenant_id', type: 'uuid', description: 'ID del tenant. Si se deja vacio, el sistema usa el tenant de la sesion.', example: '' },
      { key: 'employee_code', required: true, type: 'codigo', description: 'Codigo unico del empleado.', example: 'EMP-001' },
      { key: 'employee_lastname', required: true, type: 'texto', description: 'Apellidos del empleado.', example: 'Sanchez Parker' },
      { key: 'employee_name', required: true, type: 'texto', description: 'Nombres del empleado.', example: 'Victor Antonio' },
      { key: 'employee_cedula', type: 'texto', description: 'Cedula o identificacion.', example: '0913416723' },
      { key: 'employee_birthday', type: 'fecha', description: 'Fecha de nacimiento en formato YYYY-MM-DD.', example: '1985-01-15' },
      { key: 'employee_gender_id', type: 'codigo', description: 'Lookup key de genero.', example: 'MASCULINO' },
      { key: 'employee_is_model', type: 'booleano', description: 'Indica si es empleado modelo. Acepta true/false.', example: 'false' },
      { key: 'employee_observations', type: 'texto', description: 'Observaciones del empleado.', example: '' },
      { key: 'employee_photo_path', type: 'texto', description: 'Ruta de foto, si aplica.', example: '' },
      { key: 'is_active', type: 'booleano', description: 'Estado del registro. Acepta true/false, si/no, 1/0.', example: 'true' },
    ],
  },
  {
    name: '12_users',
    description: 'Usuarios de acceso asociados a empleados.',
    columns: [
      { key: 'employee_code', required: true, type: 'codigo', description: 'Codigo del empleado de la pestana 11.', example: 'EMP-001' },
      { key: 'username', required: true, type: 'texto', description: 'Usuario de acceso. El sistema sanea espacios y caracteres no validos.', example: 'victor.sanchez' },
      { key: 'password_plain_for_import', type: 'texto', description: 'Clave inicial en claro para importación. Debe cumplir la política de autenticación vigente.', example: 'DefinidaPorElAdministrador' },
      { key: 'password', type: 'texto', description: 'Alternativa de clave inicial si no usa password_plain_for_import.', example: '' },
      { key: 'display_name', type: 'texto', description: 'Nombre visible del usuario.', example: 'Victor Sanchez' },
      { key: 'email', required: true, type: 'email', description: 'Correo electronico unico.', example: 'victor.sanchez@empresa.com' },
      { key: 'phone', type: 'texto', description: 'Telefono del usuario.', example: '+593 98 000 0000' },
      { key: 'preferred_language_code', type: 'codigo', description: 'Idioma preferido.', example: 'es' },
      { key: 'is_active', type: 'booleano', description: 'Estado del registro. Acepta true/false, si/no, 1/0.', example: 'true' },
    ],
  },
  {
    name: '13_user_roles',
    description: 'Roles asignados a usuarios.',
    columns: [
      { key: 'employee_code', required: true, type: 'codigo', description: 'Codigo del empleado de la pestana 11.', example: 'EMP-001' },
      { key: 'role_key', required: true, type: 'codigo', description: 'Clave del rol existente.', example: 'EMPLOYEE' },
      { key: 'valid_from', type: 'fecha', description: 'Fecha/hora inicial de vigencia, si aplica.', example: '2026-01-01' },
      { key: 'valid_to', type: 'fecha', description: 'Fecha/hora final de vigencia, si aplica.', example: '' },
      { key: 'is_active', type: 'booleano', description: 'Estado del registro. Acepta true/false, si/no, 1/0.', example: 'true' },
    ],
  },
  {
    name: '14_user_role_scopes',
    description: 'Tipo de alcance para el rol del usuario. La importacion actual crea el alcance sobre el empleado.',
    columns: [
      { key: 'employee_code', required: true, type: 'codigo', description: 'Codigo del empleado de la pestana 11.', example: 'EMP-001' },
      { key: 'scope_type_key', required: true, type: 'codigo', description: 'Clave del tipo de alcance existente.', example: 'EMPLOYEE' },
      { key: 'is_active', type: 'booleano', description: 'Estado del registro. Acepta true/false, si/no, 1/0.', example: 'true' },
    ],
  },
  {
    name: '15_employee_companies',
    description: 'Asignacion organizacional del empleado a empresa, estructura y catalogos.',
    columns: [
      { key: 'tenant_id', type: 'uuid', description: 'ID del tenant. Si se deja vacio, el sistema usa el tenant de la sesion.', example: '' },
      { key: 'employee_code', required: true, type: 'codigo', description: 'Codigo del empleado de la pestana 11.', example: 'EMP-001' },
      { key: 'company_legacy_id', required: true, type: 'codigo', description: 'legacy_id de empresa de la pestana 08.', example: 'EMP-001' },
      { key: 'device_user_code', type: 'codigo', description: 'Codigo del empleado en dispositivo biometrico.', example: '1001' },
      { key: 'payroll_employee_code', type: 'codigo', description: 'Codigo del empleado en nomina.', example: 'NOM-1001' },
      { key: 'accounting_account_code', type: 'codigo', description: 'Cuenta contable del empleado, si aplica.', example: '5101-001' },
      { key: 'salary_amount', type: 'numero', description: 'Salario numerico.', example: '1500.00' },
      { key: 'work_on_holidays', type: 'booleano', description: 'Indica si trabaja feriados. Acepta true/false.', example: 'false' },
      { key: 'hire_date', type: 'fecha', description: 'Fecha de contratacion en formato YYYY-MM-DD.', example: '2026-01-01' },
      { key: 'termination_date', type: 'fecha', description: 'Fecha de salida, si aplica.', example: '' },
      { key: 'contract_type_key', type: 'codigo', description: 'Lookup key de tipo de contrato.', example: 'INDEFINIDO' },
      { key: 'employee_profile_legacy_id', required: true, type: 'codigo', description: 'legacy_id de perfil de la pestana 02.', example: 'PERF-ADM' },
      { key: 'work_group_legacy_id', required: true, type: 'codigo', description: 'legacy_id de grupo de trabajo de la pestana 07.', example: 'GT-OFIC' },
      { key: 'work_location_legacy_id', required: true, type: 'codigo', description: 'legacy_id de localizacion de la pestana 10.', example: 'LOC-GYE' },
      { key: 'department_legacy_id', required: true, type: 'codigo', description: 'legacy_id de departamento de la pestana 03.', example: 'DEP-FIN' },
      { key: 'area_legacy_id', required: true, type: 'codigo', description: 'legacy_id de area de la pestana 06.', example: 'AREA-CONT' },
      { key: 'job_title_legacy_id', required: true, type: 'codigo', description: 'legacy_id de cargo de la pestana 04.', example: 'CARGO-ANL' },
      { key: 'cost_center_legacy_id', required: true, type: 'codigo', description: 'legacy_id de centro de costo de la pestana 05.', example: 'CC-001' },
      { key: 'payroll_group_legacy_id', required: true, type: 'codigo', description: 'legacy_id de rol de pago de la pestana 01.', example: 'ROL-ADM' },
      { key: 'is_active', type: 'booleano', description: 'Estado del registro. Acepta true/false, si/no, 1/0.', example: 'true' },
    ],
  },
];

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

function setSheetColumns(worksheet: XLSX.WorkSheet, columns: MassiveWorkbookTemplateColumn[]) {
  worksheet['!cols'] = columns.map((column) => ({
    wch: Math.max(14, Math.min(34, column.key.length + 4)),
  }));
}

function buildTemplateSheet(columns: MassiveWorkbookTemplateColumn[]): XLSX.WorkSheet {
  const headers = columns.map((column) => column.key);
  const examples = columns.map((column) => column.example || '');
  const worksheet = XLSX.utils.aoa_to_sheet([headers, examples]);
  setSheetColumns(worksheet, columns);
  return worksheet;
}

function buildDictionarySheet(): XLSX.WorkSheet {
  const rows = [
    ['pestana', 'descripcion_pestana', 'columna', 'obligatorio', 'tipo', 'descripcion', 'ejemplo'],
    ...MASSIVE_WORKBOOK_TEMPLATE_TABS.flatMap((tab) =>
      tab.columns.map((column) => [
        tab.name,
        tab.description,
        column.key,
        column.required ? 'SI' : 'NO',
        column.type,
        column.description,
        column.example || '',
      ])
    ),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 24 },
    { wch: 60 },
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 72 },
    { wch: 28 },
  ];
  return worksheet;
}

export function generateSingleWorkbook15TabsTemplate(): Blob {
  const workbook = XLSX.utils.book_new();

  MASSIVE_WORKBOOK_TEMPLATE_TABS.forEach((tab) => {
    XLSX.utils.book_append_sheet(workbook, buildTemplateSheet(tab.columns), tab.name);
  });
  XLSX.utils.book_append_sheet(workbook, buildDictionarySheet(), '16_diccionario_datos');

  const output = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export async function parseStructureImportFile(file: File): Promise<ParseResult<StructureImportRow>> {
  try {
    const rows = readFirstSheetRows(await file.arrayBuffer());
    if (!rows.length) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, column: 'general', message: 'El archivo estÃ¡ vacÃ­o' }],
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
        errors: [{ row: 0, column: 'general', message: 'El archivo estÃ¡ vacÃ­o' }],
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
          errors.push({ row: rowNo, column: 'employee_code', message: 'CÃ³digo duplicado en archivo' });
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

function mapByFirstAvailableCode<T extends Record<string, any>>(rows: T[], keys: string[]): Map<string, T> {
  const out = new Map<string, T>();
  rows.forEach((row) => {
    const code = keys.map((key) => toText(row[key])).find(Boolean);
    if (!code) return;
    if (!out.has(code)) out.set(code, row);
  });
  return out;
}

function firstText(row: Record<string, any>, keys: string[]): string | null {
  for (const key of keys) {
    const value = toText(row[key]);
    if (value) return value;
  }
  return null;
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

    const payrollByCode = mapByFirstAvailableCode(payrollGroups, ['legacy_id', 'payroll_group_code']);
    const profileByCode = mapByFirstAvailableCode(employeeProfiles, ['legacy_id', 'employee_profile_code']);
    const departmentByCode = mapByFirstAvailableCode(departments, ['legacy_id', 'department_code']);
    const areaByCode = mapByFirstAvailableCode(areas, ['legacy_id', 'area_code']);
    const jobByCode = mapByFirstAvailableCode(jobTitles, ['legacy_id', 'job_title_code']);
    const costByCode = mapByFirstAvailableCode(costCenters, ['legacy_id', 'cost_center_code']);
    const workGroupByCode = mapByFirstAvailableCode(workGroups, ['legacy_id', 'work_group_code']);
    const companyByCode = mapByFirstAvailableCode(companies, ['legacy_id', 'company_code']);
    const workLocationByCode = mapByFirstAvailableCode(workLocations, ['legacy_id', 'work_location_code']);
    const employeeByCode = mapByCode(employees, 'employee_code');
    const userByEmployeeCode = mapByCode(users, 'employee_code');
    const roleByEmployeeCode = mapByCode(userRoles, 'employee_code');
    const scopeByEmployeeCode = mapByCode(userRoleScopes, 'employee_code');

    const structureRows: StructureImportRow[] = [];
    employeeCompanies.forEach((row, idx) => {
      const rowNo = idx + 2;
      const employeeCode = toText(row.employee_code);
      const companyCode = firstText(row, ['company_legacy_id', 'company_code']);
      if (!employeeCode || !companyCode) {
        errors.push({ row: rowNo, column: 'employee_code/company_legacy_id', message: 'Campos obligatorios en pestaÃ±a 15' });
        return;
      }

      const company = companyByCode.get(companyCode) || {};
      const profileCode = firstText(row, ['employee_profile_legacy_id', 'employee_profile_code']);
      const workGroupCode = firstText(row, ['work_group_legacy_id', 'work_group_code']);
      const workLocationCode = firstText(row, ['work_location_legacy_id', 'work_location_code']);
      const departmentCode = firstText(row, ['department_legacy_id', 'department_code']);
      const areaCode = firstText(row, ['area_legacy_id', 'area_code']);
      const jobCode = firstText(row, ['job_title_legacy_id', 'job_title_code']);
      const costCode = firstText(row, ['cost_center_legacy_id', 'cost_center_code']);
      const payrollCode = firstText(row, ['payroll_group_legacy_id', 'payroll_group_code']);
      const profile = profileByCode.get(profileCode || '') || {};
      const workGroup = workGroupByCode.get(workGroupCode || '') || {};
      const workLocation = workLocationByCode.get(workLocationCode || '') || {};
      const department = departmentByCode.get(departmentCode || '') || {};
      const area = areaByCode.get(areaCode || '') || {};
      const job = jobByCode.get(jobCode || '') || {};
      const cost = costByCode.get(costCode || '') || {};
      const payroll = payrollByCode.get(payrollCode || '') || {};

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
        employee_profile_code: profileCode,
        profile_name: toText((profile as any).profile_name),
        profile_short_name: toText((profile as any).profile_short_name),
        work_group_code: workGroupCode,
        work_group_payrol_group_code: firstText(workGroup as any, ['work_group_payroll_group_legacy_id', 'work_group_payrol_group_code', 'work_group_payroll_group_code']),
        work_group_name: toText((workGroup as any).work_group_name),
        work_group_short_name: toText((workGroup as any).work_group_short_name),
        work_location_code: workLocationCode,
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
        department_code: departmentCode,
        department_name: toText((department as any).department_name),
        department_short_name: toText((department as any).department_short_name),
        area_code: areaCode,
        area_name: toText((area as any).area_name),
        area_short_name: toText((area as any).area_short_name),
        area_payroll_group_code: firstText(area as any, ['area_payroll_group_legacy_id', 'area_payroll_group_code']),
        job_title_code: jobCode,
        job_title_name: toText((job as any).job_title_name),
        job_title_short_name: toText((job as any).job_title_short_name),
        cost_center_code: costCode,
        homologation_code: toText((cost as any).homologation_code),
        gl_account_code: toText((cost as any).gl_account_code),
        cost_center_name: toText((cost as any).cost_center_name),
        cost_center_short_name: toText((cost as any).cost_center_short_name),
        payroll_group_code: payrollCode,
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
  if (error || !token) throw new Error('No hay sesiÃ³n activa. Vuelva a iniciar sesiÃ³n.');
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

async function jsonWithAuth<T>(path: string, method: 'GET' | 'PATCH', body?: any): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(buildApiUrl(path), {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${token}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Error HTTP ${response.status}`);
  }
  return payload as T;
}

function mapMassImportRun(row: any): MassImportRun {
  return {
    id: String(row?.id || ''),
    fileName: String(row?.file_name || 'workbook.xlsx'),
    status: (row?.status || 'pending') as MassImportRunStatus,
    importStartedAt: String(row?.import_started_at || row?.created_at || ''),
    completedAt: row?.completed_at || null,
    reversedAt: row?.reversed_at || null,
    importSummary: row?.import_summary || {},
    reversalSummary: row?.reversal_summary || {},
    errorMessage: row?.error_message || null,
    createdAt: String(row?.created_at || row?.import_started_at || ''),
    updatedAt: row?.updated_at || null,
  };
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

export async function listMassImportRuns(limit = 50): Promise<MassImportRun[]> {
  const payload = await jsonWithAuth<{ success: boolean; runs: any[] }>(
    `/organization/mass-import/runs?limit=${encodeURIComponent(String(limit))}`,
    'GET'
  );
  return (payload.runs || []).map(mapMassImportRun);
}

export async function createMassImportRun(payload: {
  fileName: string;
  importStartedAt: string;
  structureRows: StructureImportRow[];
  employeeRows: EmployeeImportRow[];
}): Promise<MassImportRun> {
  const response = await postWithAuth<{ success: boolean; run: any }>('/organization/mass-import/runs', {
    file_name: payload.fileName,
    import_started_at: payload.importStartedAt,
    structure_rows: payload.structureRows,
    employee_rows: payload.employeeRows,
  });
  return mapMassImportRun(response.run);
}

export async function updateMassImportRun(
  runId: string,
  patch: {
    status?: 'running' | 'completed' | 'failed' | 'aborted';
    stagedAssignments?: StagedAssignment[];
    importSummary?: Record<string, any>;
    errorMessage?: string | null;
  }
): Promise<MassImportRun> {
  const response = await jsonWithAuth<{ success: boolean; run: any }>(
    `/organization/mass-import/runs/${encodeURIComponent(runId)}`,
    'PATCH',
    {
      status: patch.status,
      staged_assignments: patch.stagedAssignments,
      import_summary: patch.importSummary,
      error_message: patch.errorMessage,
    }
  );
  return mapMassImportRun(response.run);
}

export async function runReverseMassiveImport(payload: {
  importRunId?: string;
  structureRows?: StructureImportRow[];
  employeeRows?: EmployeeImportRow[];
  importStartedAt?: string | null;
}): Promise<ReverseImportResponse> {
  return postWithAuth<ReverseImportResponse>('/organization/mass-import/reverse', {
    import_run_id: payload.importRunId || null,
    structure_rows: payload.structureRows || [],
    employee_rows: payload.employeeRows || [],
    import_started_at: payload.importStartedAt || null,
  });
}
