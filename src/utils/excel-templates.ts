/**
 * Excel Template Generator & Processor
 * Utilidad para generar plantillas Excel y procesar archivos cargados
 */

import * as XLSX from 'xlsx';

// ============================================================================
// TIPOS Y INTERFACES
// ============================================================================

export interface TemplateColumn {
  header: string;
  key: string;
  required: boolean;
  validation?: string;
  example?: string;
  advanced?: boolean; // Columna en sección "Avanzado"
}

export interface WorkLocationRow {
  work_location_name: string;
  work_location_short_name: string;
  work_location_code: string;
  address_line1?: string;
  latitude?: number;
  longitude?: number;
}

export interface DepartmentRow {
  department_name: string;
  department_short_name: string;
  department_code: string;
}

export interface AreaRow {
  area_name: string;
  area_short_name: string;
  area_code: string;
  payroll_group_code?: string;
}

export interface CostCenterRow {
  cost_center_name: string;
  cost_center_short_name: string;
  cost_center_code: string;
  homologation_code?: string;
  gl_account_code?: string;
}

export interface JobTitleRow {
  job_title_name: string;
  job_title_short_name: string;
  job_title_code: string;
}

export interface PayrollGroupRow {
  payroll_group_name: string;
  payroll_group_short_name: string;
  payroll_group_code: string;
}

export interface WorkGroupRow {
  work_group_name: string;
  work_group_short_name: string;
  work_group_code: string;
  payroll_group_code?: string;
}

export interface EmployeeProfileRow {
  employee_profile_code: string;
  profile_name: string;
  profile_short_name: string;
}

export interface EmployeeRow {
  employee_code: string;
  employee_lastname: string;
  employee_name: string;
  employee_gender?: string;
  employee_birthday?: string;
  employee_profile_code?: string;
  department_code: string;
  job_title_code: string;
  area_code?: string;
  cost_center_code?: string;
  work_location_code?: string;
  work_group_code?: string;
  payroll_group_code?: string;
  contract_type?: string;
  hire_date?: string;
  salary_amount?: number;
  device_user_code?: string;
  payroll_employee_code?: string;
}

export interface ValidationError {
  row: number;
  column: string;
  message: string;
}

export interface ParseResult<T> {
  success: boolean;
  data: T[];
  errors: ValidationError[];
  rowCount: number;
}

// ============================================================================
// UTILIDADES PARA CONVERSIÓN DE FECHAS DE EXCEL
// ============================================================================

/**
 * Convierte un número serial de Excel a fecha en formato YYYY-MM-DD
 * Excel almacena fechas como número de días desde 1899-12-30
 * @param serial - Número serial de Excel (ej: 43831 = 2020-01-01)
 * @returns Fecha en formato "YYYY-MM-DD" o null si es inválido
 */
function excelSerialToDate(serial: number): string | null {
  try {
    // Excel fecha base: 1899-12-30 (nota: Excel tiene un bug donde 1900 es bisiesto)
    const excelEpoch = new Date(1899, 11, 30); // 30 de diciembre de 1899
    const days = Math.floor(serial);
    
    // Agregar los días al epoch
    const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    
    // Formatear como YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    return null;
  }
}

/**
 * Normaliza un valor de fecha que puede venir como string o número serial de Excel
 * @param value - Valor que puede ser string "YYYY-MM-DD" o número serial de Excel
 * @returns Fecha en formato "YYYY-MM-DD" o string vacío si no es válido
 */
function normalizeDateValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  // Si es un número, asumimos que es un serial de Excel
  if (typeof value === 'number') {
    const converted = excelSerialToDate(value);
    return converted || '';
  }
  
  // Si es string, limpiar y retornar
  const strValue = value.toString().trim();
  
  // Si ya está en formato YYYY-MM-DD, retornar directamente
  if (/^\d{4}-\d{2}-\d{2}$/.test(strValue)) {
    return strValue;
  }
  
  // Intentar parsear como fecha
  const date = new Date(strValue);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return strValue;
}

// ============================================================================
// DEFINICIONES DE PLANTILLAS
// ============================================================================

const WORK_LOCATIONS_TEMPLATE: TemplateColumn[] = [
  {
    header: 'Nombre de la Ubicación',
    key: 'work_location_name',
    required: true,
    validation: 'Texto, máximo 120 caracteres',
    example: 'Matriz Guayaquil'
  },
  {
    header: 'Nombre abreviado',
    key: 'work_location_short_name',
    required: true,
    validation: 'Texto, máximo 20 caracteres',
    example: 'Matriz'
  },
  {
    header: 'Código/Sigla',
    key: 'work_location_code',
    required: true,
    validation: 'Código único, máximo 20 caracteres',
    example: 'MTZ-GYE'
  },
  {
    header: 'Dirección',
    key: 'address_line1',
    required: false,
    validation: 'Texto, máximo 200 caracteres',
    example: 'Av. Francisco de Orellana 234-1',
    advanced: true
  },
  {
    header: 'Latitud',
    key: 'latitude',
    required: false,
    validation: 'Numérico, rango -90 a 90',
    example: '-2,170911',
    advanced: true
  },
  {
    header: 'Longitud',
    key: 'longitude',
    required: false,
    validation: 'Numérico, rango -180 a 180',
    example: '-79,922356',
    advanced: true
  }
];

const DEPARTMENTS_TEMPLATE: TemplateColumn[] = [
  {
    header: 'Nombre del Departamento',
    key: 'department_name',
    required: true,
    validation: 'Texto, máximo 120 caracteres',
    example: 'Recursos Humanos'
  },
  {
    header: 'Nombre abreviado',
    key: 'department_short_name',
    required: true,
    validation: 'Texto, máximo 20 caracteres',
    example: 'RRHH'
  },
  {
    header: 'Código/Sigla',
    key: 'department_code',
    required: true,
    validation: 'Código único, máximo 20 caracteres',
    example: 'DEPT-RRHH'
  }
];

const AREAS_TEMPLATE: TemplateColumn[] = [
  {
    header: 'Nombre del Área',
    key: 'area_name',
    required: true,
    validation: 'Texto, máximo 120 caracteres',
    example: 'Selección y Reclutamiento'
  },
  {
    header: 'Nombre abreviado',
    key: 'area_short_name',
    required: true,
    validation: 'Texto, máximo 20 caracteres',
    example: 'Selección'
  },
  {
    header: 'Código/Sigla',
    key: 'area_code',
    required: true,
    validation: 'Código único, máximo 20 caracteres',
    example: 'AREA-SEL'
  },
  {
    header: 'Código Rol de Pago',
    key: 'payroll_group_code',
    required: false,
    validation: 'Código de rol de pago existente',
    example: 'ROL-ADMIN',
    advanced: true
  }
];

const COST_CENTERS_TEMPLATE: TemplateColumn[] = [
  {
    header: 'Nombre del Centro de Costo',
    key: 'cost_center_name',
    required: true,
    validation: 'Texto, máximo 150 caracteres',
    example: 'Operaciones - Matriz Guayaquil'
  },
  {
    header: 'Nombre abreviado',
    key: 'cost_center_short_name',
    required: true,
    validation: 'Texto, máximo 30 caracteres',
    example: 'Ops-MTZ'
  },
  {
    header: 'Código/Sigla',
    key: 'cost_center_code',
    required: true,
    validation: 'Código único, máximo 30 caracteres',
    example: 'CC-OPS-GYE'
  },
  {
    header: 'Código Homologación',
    key: 'homologation_code',
    required: false,
    validation: 'Código de homologación externa, máximo 30 caracteres',
    example: 'CC-EXT-001',
    advanced: true
  },
  {
    header: 'Código Cuenta Contable',
    key: 'gl_account_code',
    required: false,
    validation: 'Código de cuenta del plan contable, máximo 30 caracteres',
    example: '5101-001',
    advanced: true
  }
];

const JOB_TITLES_TEMPLATE: TemplateColumn[] = [
  {
    header: 'Nombre del Cargo',
    key: 'job_title_name',
    required: true,
    validation: 'Texto, máximo 120 caracteres',
    example: 'Analista de Recursos Humanos'
  },
  {
    header: 'Nombre abreviado',
    key: 'job_title_short_name',
    required: true,
    validation: 'Texto, máximo 30 caracteres',
    example: 'Analista RRHH'
  },
  {
    header: 'Código/Sigla',
    key: 'job_title_code',
    required: true,
    validation: 'Código único, máximo 30 caracteres',
    example: 'CARGO-ANRRHH'
  }
];

const PAYROLL_GROUPS_TEMPLATE: TemplateColumn[] = [
  {
    header: 'Nombre del Rol de Pago',
    key: 'payroll_group_name',
    required: true,
    validation: 'Texto, máximo 120 caracteres',
    example: 'Personal Administrativo'
  },
  {
    header: 'Nombre abreviado',
    key: 'payroll_group_short_name',
    required: true,
    validation: 'Texto, máximo 20 caracteres',
    example: 'Administrativo'
  },
  {
    header: 'Código/Sigla',
    key: 'payroll_group_code',
    required: true,
    validation: 'Código único, máximo 20 caracteres',
    example: 'ROL-ADMIN'
  }
];

const WORK_GROUPS_TEMPLATE: TemplateColumn[] = [
  {
    header: 'Nombre del Grupo',
    key: 'work_group_name',
    required: true,
    validation: 'Texto, máximo 120 caracteres',
    example: 'Equipo Matriz - Turno Mañana'
  },
  {
    header: 'Nombre abreviado',
    key: 'work_group_short_name',
    required: true,
    validation: 'Texto, máximo 20 caracteres',
    example: 'MTZ-AM'
  },
  {
    header: 'Código/Sigla',
    key: 'work_group_code',
    required: true,
    validation: 'Código único, máximo 20 caracteres',
    example: 'GRP-MTZ-AM'
  },
  {
    header: 'Código Rol de Pago',
    key: 'payroll_group_code',
    required: false,
    validation: 'Código de rol de pago existente',
    example: 'ROL-OPER',
    advanced: true
  }
];

const EMPLOYEE_PROFILES_TEMPLATE: TemplateColumn[] = [
  {
    header: 'Código de Perfil',
    key: 'employee_profile_code',
    required: true,
    validation: 'Código único, máximo 20 caracteres',
    example: 'PERF-ADM'
  },
  {
    header: 'Nombre del Perfil',
    key: 'profile_name',
    required: true,
    validation: 'Texto, máximo 120 caracteres',
    example: 'Administrativo'
  },
  {
    header: 'Nombre abreviado',
    key: 'profile_short_name',
    required: true,
    validation: 'Texto, máximo 20 caracteres',
    example: 'Admin'
  }
];

const EMPLOYEES_TEMPLATE: TemplateColumn[] = [
  {
    header: 'Código de Empleado',
    key: 'employee_code',
    required: true,
    validation: 'Código único, máximo 20 caracteres',
    example: 'EMP-001'
  },
  {
    header: 'Apellido',
    key: 'employee_lastname',
    required: true,
    validation: 'Texto, máximo 50 caracteres',
    example: 'Pérez'
  },
  {
    header: 'Nombre',
    key: 'employee_name',
    required: true,
    validation: 'Texto, máximo 50 caracteres',
    example: 'Juan'
  },
  {
    header: 'Género',
    key: 'employee_gender',
    required: false,
    validation: 'Valores válidos: MASCULINO, FEMENINO, OTRO',
    example: 'MASCULINO',
    advanced: true
  },
  {
    header: 'Fecha de Nacimiento',
    key: 'employee_birthday',
    required: false,
    validation: 'Fecha en formato YYYY-MM-DD',
    example: '1980-05-15',
    advanced: true
  },
  {
    header: 'Código de Perfil',
    key: 'employee_profile_code',
    required: false,
    validation: 'Código de perfil existente',
    example: 'PERF-ADM',
    advanced: true
  },
  {
    header: 'Código de Departamento',
    key: 'department_code',
    required: true,
    validation: 'Código de departamento existente',
    example: 'DEPT-RRHH'
  },
  {
    header: 'Código de Cargo',
    key: 'job_title_code',
    required: true,
    validation: 'Código de cargo existente',
    example: 'CARGO-ANRRHH'
  },
  {
    header: 'Código de Área',
    key: 'area_code',
    required: false,
    validation: 'Código de área existente',
    example: 'AREA-SEL',
    advanced: true
  },
  {
    header: 'Código de Centro de Costo',
    key: 'cost_center_code',
    required: false,
    validation: 'Código de centro de costo existente',
    example: 'CC-OPS-GYE',
    advanced: true
  },
  {
    header: 'Código de Ubicación',
    key: 'work_location_code',
    required: false,
    validation: 'Código de ubicación existente',
    example: 'MTZ-GYE',
    advanced: true
  },
  {
    header: 'Código de Grupo',
    key: 'work_group_code',
    required: false,
    validation: 'Código de grupo existente',
    example: 'GRP-MTZ-AM',
    advanced: true
  },
  {
    header: 'Código de Rol de Pago',
    key: 'payroll_group_code',
    required: false,
    validation: 'Código de rol de pago existente',
    example: 'ROL-ADMIN',
    advanced: true
  },
  {
    header: 'Tipo de Contrato',
    key: 'contract_type',
    required: false,
    validation: 'Valores válidos: INDEFINIDO, PLAZO_FIJO, TEMPORAL, OBRA_SERVICIO, EVENTUAL, PRACTICAS, FORMACION, HONORARIOS',
    example: 'INDEFINIDO',
    advanced: true
  },
  {
    header: 'Fecha de Contratación',
    key: 'hire_date',
    required: false,
    validation: 'Fecha en formato YYYY-MM-DD',
    example: '2020-07-01',
    advanced: true
  },
  {
    header: 'Monto de Salario',
    key: 'salary_amount',
    required: false,
    validation: 'Numérico, máximo 10 dígitos',
    example: '1500.00',
    advanced: true
  },
  {
    header: 'Código de Usuario de Dispositivo',
    key: 'device_user_code',
    required: false,
    validation: 'Código único, máximo 20 caracteres',
    example: 'DEV-001',
    advanced: true
  },
  {
    header: 'Código de Empleado de Nómina',
    key: 'payroll_employee_code',
    required: false,
    validation: 'Código único, máximo 20 caracteres',
    example: 'PAY-001',
    advanced: true
  }
];

// ============================================================================
// GENERACIÓN DE PLANTILLAS
// ============================================================================

export function generateWorkLocationsTemplate(tenantId?: string, companyId?: string): Blob {
  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Hoja 1: Datos
  const dataHeaders = WORK_LOCATIONS_TEMPLATE.map(col => col.header);
  const dataExamples = WORK_LOCATIONS_TEMPLATE.map(col => col.example || '');
  
  const wsData = XLSX.utils.aoa_to_sheet([
    dataHeaders,
    dataExamples
  ]);

  // Ajustar anchos de columna
  wsData['!cols'] = WORK_LOCATIONS_TEMPLATE.map(() => ({ wch: 25 }));

  XLSX.utils.book_append_sheet(wb, wsData, 'Ubicaciones');

  // Hoja 2: Instrucciones
  const instructions = [
    ['INSTRUCCIONES - Plantilla de Ubicaciones de Trabajo'],
    [''],
    ['INFORMACIÓN DEL SISTEMA (No modificar):'],
    ...(tenantId ? [['Tenant ID: ' + tenantId]] : []),
    ...(companyId ? [['Company ID: ' + companyId]] : []),
    [''],
    ['IMPORTANTE - COMPORTAMIENTO DE ACTUALIZACIÓN:'],
    ['- Si el Código/Sigla NO existe → Se crea un nuevo registro'],
    ['- Si el Código/Sigla YA existe → Se ACTUALIZA la ubicación existente'],
    ['- El Código/Sigla es la CLAVE ÚNICA y NO puede modificarse una vez creado'],
    ['- Todos los demás campos (Nombre, Dirección, Coordenadas) SÍ se actualizan'],
    [''],
    ['PROCESO DE CARGA:'],
    ['1. Complete la información en la hoja "Ubicaciones"'],
    ['2. Los campos marcados con (*) son obligatorios'],
    ['3. Use códigos únicos y descriptivos (ej: MTZ-GYE, SUC-NORTE)'],
    ['4. Puede recargar el archivo para actualizar información sin crear duplicados'],
    ['5. Guarde el archivo y cárguelo en el sistema'],
    [''],
    ['VALIDACIONES:'],
    ...WORK_LOCATIONS_TEMPLATE.map(col => [
      `- ${col.header}${col.required ? ' (*)' : ''}: ${col.validation}`
    ]),
    [''],
    ['CAMPOS AVANZADOS (Opcionales):'],
    ['- Dirección: Permite ubicar físicamente la sede'],
    ['- Latitud/Longitud: Habilitan mapas, geocerca y funciones de proximidad'],
    [''],
    ['FORMATO DE COORDENADAS:'],
    ['- Usar formato decimal (NO grados/minutos/segundos)'],
    ['- Puede usar COMA o PUNTO como separador decimal (el sistema acepta ambos)'],
    ['- Ejemplos válidos: -2,1709 o -2.1709'],
    ['- Latitud: rango -90 a 90 (negativo = Sur, positivo = Norte)'],
    ['- Longitud: rango -180 a 180 (negativo = Oeste, positivo = Este)'],
    [''],
    ['CÓMO OBTENER COORDENADAS:'],
    ['1. Abra Google Maps (https://maps.google.com)'],
    ['2. Busque la dirección de la ubicación'],
    ['3. Haga clic derecho en el punto exacto del mapa'],
    ['4. Seleccione el primer elemento (las coordenadas)'],
    ['5. Las coordenadas se copian en formato: latitud, longitud'],
    ['6. Puede pegarlas directamente en Excel (el sistema normaliza el formato)'],
    [''],
    ['EJEMPLOS:'],
    ['Guayaquil, Ecuador:'],
    ['  Latitud: -2,170998 (o -2.170998)'],
    ['  Longitud: -79,922356 (o -79.922356)'],
    [''],
    ['Quito, Ecuador:'],
    ['  Latitud: -0,1807 (o -0.1807)'],
    ['  Longitud: -78,4678 (o -78.4678)']
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

  // Convertir a Blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ============================================================================
// PROCESAMIENTO Y VALIDACIÓN
// ============================================================================

export async function parseWorkLocationsFile(file: File): Promise<ParseResult<WorkLocationRow>> {
  try {
    // Leer archivo
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Obtener primera hoja
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convertir a JSON
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    if (rawData.length === 0) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, column: 'general', message: 'El archivo está vacío' }],
        rowCount: 0
      };
    }

    const errors: ValidationError[] = [];
    const validData: WorkLocationRow[] = [];

    // Validar cada fila
    rawData.forEach((row, index) => {
      const rowNumber = index + 2; // +2 porque Excel empieza en 1 y hay header
      const rowErrors: ValidationError[] = [];

      // Validar nombre (obligatorio)
      const name = row['Nombre de la Ubicación']?.toString().trim();
      if (!name) {
        rowErrors.push({
          row: rowNumber,
          column: 'Nombre de la Ubicación',
          message: 'Campo obligatorio vacío'
        });
      } else if (name.length > 120) {
        rowErrors.push({
          row: rowNumber,
          column: 'Nombre de la Ubicación',
          message: 'Máximo 120 caracteres'
        });
      }

      // Validar nombre abreviado (obligatorio)
      const shortName = row['Nombre abreviado']?.toString().trim();
      if (!shortName) {
        rowErrors.push({
          row: rowNumber,
          column: 'Nombre abreviado',
          message: 'Campo obligatorio vacío'
        });
      } else if (shortName.length > 20) {
        rowErrors.push({
          row: rowNumber,
          column: 'Nombre abreviado',
          message: 'Máximo 20 caracteres'
        });
      }

      // Validar código/sigla (obligatorio y único - clave UPSERT)
      const code = row['Código/Sigla']?.toString().trim();
      if (!code) {
        rowErrors.push({
          row: rowNumber,
          column: 'Código/Sigla',
          message: 'Campo obligatorio vacío'
        });
      } else if (code.length > 20) {
        rowErrors.push({
          row: rowNumber,
          column: 'Código/Sigla',
          message: 'Máximo 20 caracteres'
        });
      }

      // Validar dirección (opcional)
      const address = row['Dirección']?.toString().trim();
      if (address && address.length > 200) {
        rowErrors.push({
          row: rowNumber,
          column: 'Dirección',
          message: 'Máximo 200 caracteres'
        });
      }

      // Validar latitud (opcional)
      let latitude: number | undefined;
      if (row['Latitud'] !== null && row['Latitud'] !== undefined && row['Latitud'] !== '') {
        // Normalizar separador decimal: convertir coma a punto
        const latString = row['Latitud'].toString().trim().replace(',', '.');
        latitude = parseFloat(latString);
        
        if (isNaN(latitude)) {
          rowErrors.push({
            row: rowNumber,
            column: 'Latitud',
            message: `Debe ser un número válido (recibido: "${row['Latitud']}")`
          });
        } else if (latitude < -90 || latitude > 90) {
          rowErrors.push({
            row: rowNumber,
            column: 'Latitud',
            message: `Rango válido: -90 a 90 (recibido: ${latitude})`
          });
        }
      }

      // Validar longitud (opcional)
      let longitude: number | undefined;
      if (row['Longitud'] !== null && row['Longitud'] !== undefined && row['Longitud'] !== '') {
        // Normalizar separador decimal: convertir coma a punto
        const lonString = row['Longitud'].toString().trim().replace(',', '.');
        longitude = parseFloat(lonString);
        
        if (isNaN(longitude)) {
          rowErrors.push({
            row: rowNumber,
            column: 'Longitud',
            message: `Debe ser un número válido (recibido: "${row['Longitud']}")`
          });
        } else if (longitude < -180 || longitude > 180) {
          rowErrors.push({
            row: rowNumber,
            column: 'Longitud',
            message: `Rango válido: -180 a 180 (recibido: ${longitude})`
          });
        }
      }

      // Si hay errores, agregarlos al array general
      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else if (name && shortName && code) {
        // Datos válidos
        validData.push({
          work_location_name: name,
          work_location_short_name: shortName,
          work_location_code: code,
          address_line1: address || undefined,
          latitude,
          longitude
        });
      }
    });

    return {
      success: errors.length === 0,
      data: validData,
      errors,
      rowCount: rawData.length
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      errors: [{ 
        row: 0, 
        column: 'general', 
        message: `Error procesando archivo: ${error.message}` 
      }],
      rowCount: 0
    };
  }
}

// ============================================================================
// GENERADORES DE PLANTILLAS - ESTRUCTURA ORGANIZACIONAL
// ============================================================================

export function generateDepartmentsTemplate(tenantId?: string): Blob {
  const wb = XLSX.utils.book_new();
  const dataHeaders = DEPARTMENTS_TEMPLATE.map(col => col.header);
  const dataExamples = DEPARTMENTS_TEMPLATE.map(col => col.example || '');
  const wsData = XLSX.utils.aoa_to_sheet([dataHeaders, dataExamples]);
  wsData['!cols'] = DEPARTMENTS_TEMPLATE.map(() => ({ wch: 25 }));
  XLSX.utils.book_append_sheet(wb, wsData, 'Departamentos');

  const instructions = [
    ['INSTRUCCIONES - Plantilla de Departamentos'],
    [''],
    ...(tenantId ? [['Tenant ID: ' + tenantId]] : []),
    [''],
    ['IMPORTANTE - COMPORTAMIENTO DE ACTUALIZACIÓN:'],
    ['- Si el Código/Sigla NO existe → Se crea un nuevo registro'],
    ['- Si el Código/Sigla YA existe → Se ACTUALIZA el departamento'],
    ['- El Código/Sigla es ÚNICO e INMUTABLE'],
    [''],
    ['VALIDACIONES:'],
    ...DEPARTMENTS_TEMPLATE.map(col => [`- ${col.header}${col.required ? ' (*)' : ''}: ${col.validation}`])
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function generateAreasTemplate(tenantId?: string): Blob {
  const wb = XLSX.utils.book_new();
  const dataHeaders = AREAS_TEMPLATE.map(col => col.header);
  const dataExamples = AREAS_TEMPLATE.map(col => col.example || '');
  const wsData = XLSX.utils.aoa_to_sheet([dataHeaders, dataExamples]);
  wsData['!cols'] = AREAS_TEMPLATE.map(() => ({ wch: 25 }));
  XLSX.utils.book_append_sheet(wb, wsData, 'Áreas');

  const instructions = [
    ['INSTRUCCIONES - Plantilla de Áreas'],
    [''],
    ...(tenantId ? [['Tenant ID: ' + tenantId]] : []),
    [''],
    ['IMPORTANTE - COMPORTAMIENTO DE ACTUALIZACIÓN:'],
    ['- Si el Código/Sigla NO existe → Se crea un nuevo registro'],
    ['- Si el Código/Sigla YA existe → Se ACTUALIZA el área'],
    ['- El Código/Sigla es ÚNICO e INMUTABLE'],
    [''],
    ['CAMPOS OPCIONALES:'],
    ['- Código Rol de Pago: Debe existir previamente en la tabla de Roles de Pago'],
    [''],
    ['VALIDACIONES:'],
    ...AREAS_TEMPLATE.map(col => [`- ${col.header}${col.required ? ' (*)' : ''}: ${col.validation}`])
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function generateCostCentersTemplate(tenantId?: string): Blob {
  const wb = XLSX.utils.book_new();
  const dataHeaders = COST_CENTERS_TEMPLATE.map(col => col.header);
  const dataExamples = COST_CENTERS_TEMPLATE.map(col => col.example || '');
  const wsData = XLSX.utils.aoa_to_sheet([dataHeaders, dataExamples]);
  wsData['!cols'] = COST_CENTERS_TEMPLATE.map(() => ({ wch: 30 }));
  XLSX.utils.book_append_sheet(wb, wsData, 'Centros de Costo');

  const instructions = [
    ['INSTRUCCIONES - Plantilla de Centros de Costo'],
    [''],
    ...(tenantId ? [['Tenant ID: ' + tenantId]] : []),
    [''],
    ['IMPORTANTE - COMPORTAMIENTO DE ACTUALIZACIÓN:'],
    ['- Si el Código/Sigla NO existe → Se crea un nuevo registro'],
    ['- Si el Código/Sigla YA existe → Se ACTUALIZA el centro de costo'],
    ['- El Código/Sigla es ÚNICO e INMUTABLE'],
    [''],
    ['CAMPOS AVANZADOS (Opcionales):'],
    ['- Código Homologación: Para integración con sistemas externos'],
    ['- Código Cuenta Contable: Para integración con plan contable'],
    [''],
    ['VALIDACIONES:'],
    ...COST_CENTERS_TEMPLATE.map(col => [`- ${col.header}${col.required ? ' (*)' : ''}: ${col.validation}`])
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function generateJobTitlesTemplate(tenantId?: string): Blob {
  const wb = XLSX.utils.book_new();
  const dataHeaders = JOB_TITLES_TEMPLATE.map(col => col.header);
  const dataExamples = JOB_TITLES_TEMPLATE.map(col => col.example || '');
  const wsData = XLSX.utils.aoa_to_sheet([dataHeaders, dataExamples]);
  wsData['!cols'] = JOB_TITLES_TEMPLATE.map(() => ({ wch: 30 }));
  XLSX.utils.book_append_sheet(wb, wsData, 'Cargos');

  const instructions = [
    ['INSTRUCCIONES - Plantilla de Cargos'],
    [''],
    ...(tenantId ? [['Tenant ID: ' + tenantId]] : []),
    [''],
    ['IMPORTANTE - COMPORTAMIENTO DE ACTUALIZACIÓN:'],
    ['- Si el Código/Sigla NO existe → Se crea un nuevo registro'],
    ['- Si el Código/Sigla YA existe → Se ACTUALIZA el cargo'],
    ['- El Código/Sigla es ÚNICO e INMUTABLE'],
    [''],
    ['VALIDACIONES:'],
    ...JOB_TITLES_TEMPLATE.map(col => [`- ${col.header}${col.required ? ' (*)' : ''}: ${col.validation}`])
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function generatePayrollGroupsTemplate(tenantId?: string): Blob {
  const wb = XLSX.utils.book_new();
  const dataHeaders = PAYROLL_GROUPS_TEMPLATE.map(col => col.header);
  const dataExamples = PAYROLL_GROUPS_TEMPLATE.map(col => col.example || '');
  const wsData = XLSX.utils.aoa_to_sheet([dataHeaders, dataExamples]);
  wsData['!cols'] = PAYROLL_GROUPS_TEMPLATE.map(() => ({ wch: 25 }));
  XLSX.utils.book_append_sheet(wb, wsData, 'Roles de Pago');

  const instructions = [
    ['INSTRUCCIONES - Plantilla de Roles de Pago'],
    [''],
    ...(tenantId ? [['Tenant ID: ' + tenantId]] : []),
    [''],
    ['IMPORTANTE - COMPORTAMIENTO DE ACTUALIZACIÓN:'],
    ['- Si el Código/Sigla NO existe → Se crea un nuevo registro'],
    ['- Si el Código/Sigla YA existe → Se ACTUALIZA el rol de pago'],
    ['- El Código/Sigla es ÚNICO e INMUTABLE'],
    [''],
    ['NOTA: Los Roles de Pago deben crearse ANTES que Áreas y Grupos'],
    [''],
    ['VALIDACIONES:'],
    ...PAYROLL_GROUPS_TEMPLATE.map(col => [`- ${col.header}${col.required ? ' (*)' : ''}: ${col.validation}`])
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function generateWorkGroupsTemplate(tenantId?: string): Blob {
  const wb = XLSX.utils.book_new();
  const dataHeaders = WORK_GROUPS_TEMPLATE.map(col => col.header);
  const dataExamples = WORK_GROUPS_TEMPLATE.map(col => col.example || '');
  const wsData = XLSX.utils.aoa_to_sheet([dataHeaders, dataExamples]);
  wsData['!cols'] = WORK_GROUPS_TEMPLATE.map(() => ({ wch: 25 }));
  XLSX.utils.book_append_sheet(wb, wsData, 'Grupos');

  const instructions = [
    ['INSTRUCCIONES - Plantilla de Grupos'],
    [''],
    ...(tenantId ? [['Tenant ID: ' + tenantId]] : []),
    [''],
    ['IMPORTANTE - COMPORTAMIENTO DE ACTUALIZACIÓN:'],
    ['- Si el Código/Sigla NO existe → Se crea un nuevo registro'],
    ['- Si el Código/Sigla YA existe → Se ACTUALIZA el grupo'],
    ['- El Código/Sigla es ÚNICO e INMUTABLE'],
    [''],
    ['CAMPOS OPCIONALES:'],
    ['- Código Rol de Pago: Debe existir previamente en la tabla de Roles de Pago'],
    [''],
    ['VALIDACIONES:'],
    ...WORK_GROUPS_TEMPLATE.map(col => [`- ${col.header}${col.required ? ' (*)' : ''}: ${col.validation}`])
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function generateEmployeeProfilesTemplate(tenantId?: string): Blob {
  const wb = XLSX.utils.book_new();
  const dataHeaders = EMPLOYEE_PROFILES_TEMPLATE.map(col => col.header);
  const dataExamples = EMPLOYEE_PROFILES_TEMPLATE.map(col => col.example || '');
  const wsData = XLSX.utils.aoa_to_sheet([dataHeaders, dataExamples]);
  wsData['!cols'] = EMPLOYEE_PROFILES_TEMPLATE.map(() => ({ wch: 25 }));
  XLSX.utils.book_append_sheet(wb, wsData, 'Perfiles');

  const instructions = [
    ['INSTRUCCIONES - Plantilla de Perfiles'],
    [''],
    ...(tenantId ? [['Tenant ID: ' + tenantId]] : []),
    [''],
    ['IMPORTANTE - COMPORTAMIENTO DE ACTUALIZACIÓN:'],
    ['- Si el Código de Perfil NO existe → Se crea un nuevo registro'],
    ['- Si el Código de Perfil YA existe → Se ACTUALIZA el perfil'],
    ['- El Código de Perfil es ÚNICO e INMUTABLE'],
    [''],
    ['VALIDACIONES:'],
    ...EMPLOYEE_PROFILES_TEMPLATE.map(col => [`- ${col.header}${col.required ? ' (*)' : ''}: ${col.validation}`])
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function generateEmployeesTemplate(tenantId?: string): Blob {
  const wb = XLSX.utils.book_new();
  const dataHeaders = EMPLOYEES_TEMPLATE.map(col => col.header);
  const dataExamples = EMPLOYEES_TEMPLATE.map(col => col.example || '');
  const wsData = XLSX.utils.aoa_to_sheet([dataHeaders, dataExamples]);
  wsData['!cols'] = EMPLOYEES_TEMPLATE.map(() => ({ wch: 25 }));
  XLSX.utils.book_append_sheet(wb, wsData, 'Empleados');

  const instructions = [
    ['INSTRUCCIONES - Plantilla de Empleados'],
    [''],
    ...(tenantId ? [['Tenant ID: ' + tenantId]] : []),
    [''],
    ['IMPORTANTE - COMPORTAMIENTO DE ACTUALIZACIÓN:'],
    ['- Si el Código de Empleado NO existe → Se crea un nuevo registro'],
    ['- Si el Código de Empleado YA existe → Se ACTUALIZA el empleado'],
    ['- El Código de Empleado es ÚNICO e INMUTABLE'],
    [''],
    ['CAMPOS OPCIONALES:'],
    ['- Género: Debe existir en lookup_values (tipo GENDER)'],
    ['- Fecha de Nacimiento: Formato YYYY-MM-DD'],
    ['- Código de Perfil: Debe existir previamente en la tabla de Perfiles'],
    ['- Código de Área: Debe existir previamente en la tabla de Áreas'],
    ['- Código de Centro de Costo: Debe existir previamente en la tabla de Centros de Costo'],
    ['- Código de Ubicación: Debe existir previamente en la tabla de Ubicaciones'],
    ['- Código de Grupo: Debe existir previamente en la tabla de Grupos'],
    ['- Código de Rol de Pago: Debe existir previamente en la tabla de Roles de Pago'],
    ['- Tipo de Contrato: Debe existir en lookup_values (tipo CONTRACT_TYPE)'],
    ['- Fecha de Contratación: Formato YYYY-MM-DD'],
    ['- Monto de Salario: Numérico, máximo 10 dígitos'],
    ['- Código de Usuario de Dispositivo: Único, máximo 20 caracteres'],
    ['- Código de Empleado de Nómina: Único, máximo 20 caracteres'],
    [''],
    ['VALIDACIONES:'],
    ...EMPLOYEES_TEMPLATE.map(col => [`- ${col.header}${col.required ? ' (*)' : ''}: ${col.validation}`])
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ============================================================================
// PARSERS - ESTRUCTURA ORGANIZACIONAL
// ============================================================================

export async function parseDepartmentsFile(file: File): Promise<ParseResult<DepartmentRow>> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    if (rawData.length === 0) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, column: 'general', message: 'El archivo está vacío' }],
        rowCount: 0
      };
    }

    const errors: ValidationError[] = [];
    const validData: DepartmentRow[] = [];

    rawData.forEach((row, index) => {
      const rowNumber = index + 2;
      const rowErrors: ValidationError[] = [];

      const name = row['Nombre del Departamento']?.toString().trim();
      if (!name) {
        rowErrors.push({ row: rowNumber, column: 'Nombre del Departamento', message: 'Campo obligatorio vacío' });
      } else if (name.length > 120) {
        rowErrors.push({ row: rowNumber, column: 'Nombre del Departamento', message: 'Máximo 120 caracteres' });
      }

      const shortName = row['Nombre abreviado']?.toString().trim();
      if (!shortName) {
        rowErrors.push({ row: rowNumber, column: 'Nombre abreviado', message: 'Campo obligatorio vacío' });
      } else if (shortName.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Nombre abreviado', message: 'Máximo 20 caracteres' });
      }

      const code = row['Código/Sigla']?.toString().trim();
      if (!code) {
        rowErrors.push({ row: rowNumber, column: 'Código/Sigla', message: 'Campo obligatorio vacío' });
      } else if (code.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Código/Sigla', message: 'Máximo 20 caracteres' });
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else if (name && shortName && code) {
        validData.push({
          department_name: name,
          department_short_name: shortName,
          department_code: code
        });
      }
    });

    return { success: errors.length === 0, data: validData, errors, rowCount: rawData.length };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, column: 'general', message: `Error procesando archivo: ${error.message}` }],
      rowCount: 0
    };
  }
}

export async function parseAreasFile(file: File): Promise<ParseResult<AreaRow>> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    if (rawData.length === 0) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, column: 'general', message: 'El archivo está vacío' }],
        rowCount: 0
      };
    }

    const errors: ValidationError[] = [];
    const validData: AreaRow[] = [];

    rawData.forEach((row, index) => {
      const rowNumber = index + 2;
      const rowErrors: ValidationError[] = [];

      const name = row['Nombre del Área']?.toString().trim();
      if (!name) {
        rowErrors.push({ row: rowNumber, column: 'Nombre del Área', message: 'Campo obligatorio vacío' });
      } else if (name.length > 120) {
        rowErrors.push({ row: rowNumber, column: 'Nombre del Área', message: 'Máximo 120 caracteres' });
      }

      const shortName = row['Nombre abreviado']?.toString().trim();
      if (!shortName) {
        rowErrors.push({ row: rowNumber, column: 'Nombre abreviado', message: 'Campo obligatorio vacío' });
      } else if (shortName.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Nombre abreviado', message: 'Máximo 20 caracteres' });
      }

      const code = row['Código/Sigla']?.toString().trim();
      if (!code) {
        rowErrors.push({ row: rowNumber, column: 'Código/Sigla', message: 'Campo obligatorio vacío' });
      } else if (code.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Código/Sigla', message: 'Máximo 20 caracteres' });
      }

      const payrollGroupCode = row['Código Rol de Pago']?.toString().trim();
      if (payrollGroupCode && payrollGroupCode.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Código Rol de Pago', message: 'Máximo 20 caracteres' });
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else if (name && shortName && code) {
        validData.push({
          area_name: name,
          area_short_name: shortName,
          area_code: code,
          payroll_group_code: payrollGroupCode || undefined
        });
      }
    });

    return { success: errors.length === 0, data: validData, errors, rowCount: rawData.length };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, column: 'general', message: `Error procesando archivo: ${error.message}` }],
      rowCount: 0
    };
  }
}

export async function parseCostCentersFile(file: File): Promise<ParseResult<CostCenterRow>> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    if (rawData.length === 0) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, column: 'general', message: 'El archivo está vacío' }],
        rowCount: 0
      };
    }

    const errors: ValidationError[] = [];
    const validData: CostCenterRow[] = [];

    rawData.forEach((row, index) => {
      const rowNumber = index + 2;
      const rowErrors: ValidationError[] = [];

      const name = row['Nombre del Centro de Costo']?.toString().trim();
      if (!name) {
        rowErrors.push({ row: rowNumber, column: 'Nombre del Centro de Costo', message: 'Campo obligatorio vacío' });
      } else if (name.length > 150) {
        rowErrors.push({ row: rowNumber, column: 'Nombre del Centro de Costo', message: 'Máximo 150 caracteres' });
      }

      const shortName = row['Nombre abreviado']?.toString().trim();
      if (!shortName) {
        rowErrors.push({ row: rowNumber, column: 'Nombre abreviado', message: 'Campo obligatorio vacío' });
      } else if (shortName.length > 30) {
        rowErrors.push({ row: rowNumber, column: 'Nombre abreviado', message: 'Máximo 30 caracteres' });
      }

      const code = row['Código/Sigla']?.toString().trim();
      if (!code) {
        rowErrors.push({ row: rowNumber, column: 'Código/Sigla', message: 'Campo obligatorio vacío' });
      } else if (code.length > 30) {
        rowErrors.push({ row: rowNumber, column: 'Código/Sigla', message: 'Máximo 30 caracteres' });
      }

      const homologationCode = row['Código Homologación']?.toString().trim();
      if (homologationCode && homologationCode.length > 30) {
        rowErrors.push({ row: rowNumber, column: 'Código Homologación', message: 'Máximo 30 caracteres' });
      }

      const glAccountCode = row['Código Cuenta Contable']?.toString().trim();
      if (glAccountCode && glAccountCode.length > 30) {
        rowErrors.push({ row: rowNumber, column: 'Código Cuenta Contable', message: 'Máximo 30 caracteres' });
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else if (name && shortName && code) {
        validData.push({
          cost_center_name: name,
          cost_center_short_name: shortName,
          cost_center_code: code,
          homologation_code: homologationCode || undefined,
          gl_account_code: glAccountCode || undefined
        });
      }
    });

    return { success: errors.length === 0, data: validData, errors, rowCount: rawData.length };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, column: 'general', message: `Error procesando archivo: ${error.message}` }],
      rowCount: 0
    };
  }
}

export async function parseJobTitlesFile(file: File): Promise<ParseResult<JobTitleRow>> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    if (rawData.length === 0) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, column: 'general', message: 'El archivo está vacío' }],
        rowCount: 0
      };
    }

    const errors: ValidationError[] = [];
    const validData: JobTitleRow[] = [];

    rawData.forEach((row, index) => {
      const rowNumber = index + 2;
      const rowErrors: ValidationError[] = [];

      const name = row['Nombre del Cargo']?.toString().trim();
      if (!name) {
        rowErrors.push({ row: rowNumber, column: 'Nombre del Cargo', message: 'Campo obligatorio vacío' });
      } else if (name.length > 120) {
        rowErrors.push({ row: rowNumber, column: 'Nombre del Cargo', message: 'Máximo 120 caracteres' });
      }

      const shortName = row['Nombre abreviado']?.toString().trim();
      if (!shortName) {
        rowErrors.push({ row: rowNumber, column: 'Nombre abreviado', message: 'Campo obligatorio vacío' });
      } else if (shortName.length > 30) {
        rowErrors.push({ row: rowNumber, column: 'Nombre abreviado', message: 'Máximo 30 caracteres' });
      }

      const code = row['Código/Sigla']?.toString().trim();
      if (!code) {
        rowErrors.push({ row: rowNumber, column: 'Código/Sigla', message: 'Campo obligatorio vacío' });
      } else if (code.length > 30) {
        rowErrors.push({ row: rowNumber, column: 'Código/Sigla', message: 'Máximo 30 caracteres' });
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else if (name && shortName && code) {
        validData.push({
          job_title_name: name,
          job_title_short_name: shortName,
          job_title_code: code
        });
      }
    });

    return { success: errors.length === 0, data: validData, errors, rowCount: rawData.length };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, column: 'general', message: `Error procesando archivo: ${error.message}` }],
      rowCount: 0
    };
  }
}

export async function parsePayrollGroupsFile(file: File): Promise<ParseResult<PayrollGroupRow>> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    if (rawData.length === 0) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, column: 'general', message: 'El archivo está vacío' }],
        rowCount: 0
      };
    }

    const errors: ValidationError[] = [];
    const validData: PayrollGroupRow[] = [];

    rawData.forEach((row, index) => {
      const rowNumber = index + 2;
      const rowErrors: ValidationError[] = [];

      const name = row['Nombre del Rol de Pago']?.toString().trim();
      if (!name) {
        rowErrors.push({ row: rowNumber, column: 'Nombre del Rol de Pago', message: 'Campo obligatorio vacío' });
      } else if (name.length > 120) {
        rowErrors.push({ row: rowNumber, column: 'Nombre del Rol de Pago', message: 'Máximo 120 caracteres' });
      }

      const shortName = row['Nombre abreviado']?.toString().trim();
      if (!shortName) {
        rowErrors.push({ row: rowNumber, column: 'Nombre abreviado', message: 'Campo obligatorio vacío' });
      } else if (shortName.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Nombre abreviado', message: 'Máximo 20 caracteres' });
      }

      const code = row['Código/Sigla']?.toString().trim();
      if (!code) {
        rowErrors.push({ row: rowNumber, column: 'Código/Sigla', message: 'Campo obligatorio vacío' });
      } else if (code.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Código/Sigla', message: 'Máximo 20 caracteres' });
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else if (name && shortName && code) {
        validData.push({
          payroll_group_name: name,
          payroll_group_short_name: shortName,
          payroll_group_code: code
        });
      }
    });

    return { success: errors.length === 0, data: validData, errors, rowCount: rawData.length };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, column: 'general', message: `Error procesando archivo: ${error.message}` }],
      rowCount: 0
    };
  }
}

export async function parseWorkGroupsFile(file: File): Promise<ParseResult<WorkGroupRow>> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    if (rawData.length === 0) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, column: 'general', message: 'El archivo está vacío' }],
        rowCount: 0
      };
    }

    const errors: ValidationError[] = [];
    const validData: WorkGroupRow[] = [];

    rawData.forEach((row, index) => {
      const rowNumber = index + 2;
      const rowErrors: ValidationError[] = [];

      const name = row['Nombre del Grupo']?.toString().trim();
      if (!name) {
        rowErrors.push({ row: rowNumber, column: 'Nombre del Grupo', message: 'Campo obligatorio vacío' });
      } else if (name.length > 120) {
        rowErrors.push({ row: rowNumber, column: 'Nombre del Grupo', message: 'Máximo 120 caracteres' });
      }

      const shortName = row['Nombre abreviado']?.toString().trim();
      if (!shortName) {
        rowErrors.push({ row: rowNumber, column: 'Nombre abreviado', message: 'Campo obligatorio vacío' });
      } else if (shortName.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Nombre abreviado', message: 'Máximo 20 caracteres' });
      }

      const code = row['Código/Sigla']?.toString().trim();
      if (!code) {
        rowErrors.push({ row: rowNumber, column: 'Código/Sigla', message: 'Campo obligatorio vacío' });
      } else if (code.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Código/Sigla', message: 'Máximo 20 caracteres' });
      }

      const payrollGroupCode = row['Código Rol de Pago']?.toString().trim();
      if (payrollGroupCode && payrollGroupCode.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Código Rol de Pago', message: 'Máximo 20 caracteres' });
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else if (name && shortName && code) {
        validData.push({
          work_group_name: name,
          work_group_short_name: shortName,
          work_group_code: code,
          payroll_group_code: payrollGroupCode || undefined
        });
      }
    });

    return { success: errors.length === 0, data: validData, errors, rowCount: rawData.length };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, column: 'general', message: `Error procesando archivo: ${error.message}` }],
      rowCount: 0
    };
  }
}

export async function parseEmployeeProfilesFile(file: File): Promise<ParseResult<EmployeeProfileRow>> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    if (rawData.length === 0) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, column: 'general', message: 'El archivo está vacío' }],
        rowCount: 0
      };
    }

    const errors: ValidationError[] = [];
    const validData: EmployeeProfileRow[] = [];

    rawData.forEach((row, index) => {
      const rowNumber = index + 2;
      const rowErrors: ValidationError[] = [];

      const code = row['Código de Perfil']?.toString().trim();
      if (!code) {
        rowErrors.push({ row: rowNumber, column: 'Código de Perfil', message: 'Campo obligatorio vacío' });
      } else if (code.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Código de Perfil', message: 'Máximo 20 caracteres' });
      }

      const name = row['Nombre del Perfil']?.toString().trim();
      if (!name) {
        rowErrors.push({ row: rowNumber, column: 'Nombre del Perfil', message: 'Campo obligatorio vacío' });
      } else if (name.length > 120) {
        rowErrors.push({ row: rowNumber, column: 'Nombre del Perfil', message: 'Máximo 120 caracteres' });
      }

      const shortName = row['Nombre abreviado']?.toString().trim();
      if (!shortName) {
        rowErrors.push({ row: rowNumber, column: 'Nombre abreviado', message: 'Campo obligatorio vacío' });
      } else if (shortName.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Nombre abreviado', message: 'Máximo 20 caracteres' });
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else if (code && name && shortName) {
        validData.push({
          employee_profile_code: code,
          profile_name: name,
          profile_short_name: shortName
        });
      }
    });

    return { success: errors.length === 0, data: validData, errors, rowCount: rawData.length };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, column: 'general', message: `Error procesando archivo: ${error.message}` }],
      rowCount: 0
    };
  }
}

export async function parseEmployeesFile(file: File): Promise<ParseResult<EmployeeRow>> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    if (rawData.length === 0) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, column: 'general', message: 'El archivo está vacío' }],
        rowCount: 0
      };
    }

    const errors: ValidationError[] = [];
    const validData: EmployeeRow[] = [];

    rawData.forEach((row, index) => {
      const rowNumber = index + 2;
      const rowErrors: ValidationError[] = [];

      const code = row['Código de Empleado']?.toString().trim();
      if (!code) {
        rowErrors.push({ row: rowNumber, column: 'Código de Empleado', message: 'Campo obligatorio vacío' });
      } else if (code.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Código de Empleado', message: 'Máximo 20 caracteres' });
      }

      const lastname = row['Apellido']?.toString().trim();
      if (!lastname) {
        rowErrors.push({ row: rowNumber, column: 'Apellido', message: 'Campo obligatorio vacío' });
      } else if (lastname.length > 50) {
        rowErrors.push({ row: rowNumber, column: 'Apellido', message: 'Máximo 50 caracteres' });
      }

      const name = row['Nombre']?.toString().trim();
      if (!name) {
        rowErrors.push({ row: rowNumber, column: 'Nombre', message: 'Campo obligatorio vacío' });
      } else if (name.length > 50) {
        rowErrors.push({ row: rowNumber, column: 'Nombre', message: 'Máximo 50 caracteres' });
      }

      const gender = row['Género']?.toString().trim();
      if (gender && gender.length > 10) {
        rowErrors.push({ row: rowNumber, column: 'Género', message: 'Máximo 10 caracteres' });
      }

      // ✅ NORMALIZAR FECHA DE NACIMIENTO (puede venir como número serial de Excel)
      const birthdayRaw = row['Fecha de Nacimiento'];
      const birthday = normalizeDateValue(birthdayRaw);
      
      // Debug log para primera fila
      if (index === 0 && birthdayRaw !== null && birthdayRaw !== undefined && birthdayRaw !== '') {
        console.log(`🔍 DEBUG Fecha Nacimiento - Fila ${rowNumber}:`, {
          raw: birthdayRaw,
          type: typeof birthdayRaw,
          normalized: birthday
        });
      }
      
      if (birthday) {
        const date = new Date(birthday);
        if (isNaN(date.getTime())) {
          rowErrors.push({ row: rowNumber, column: 'Fecha de Nacimiento', message: 'Formato inválido (YYYY-MM-DD)' });
        }
      }

      const profileCode = row['Código de Perfil']?.toString().trim();
      if (profileCode && profileCode.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Código de Perfil', message: 'Máximo 20 caracteres' });
      }

      const departmentCode = row['Código de Departamento']?.toString().trim();
      if (!departmentCode) {
        rowErrors.push({ row: rowNumber, column: 'Código de Departamento', message: 'Campo obligatorio vacío' });
      } else if (departmentCode.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Código de Departamento', message: 'Máximo 20 caracteres' });
      }

      const jobTitleCode = row['Código de Cargo']?.toString().trim();
      if (!jobTitleCode) {
        rowErrors.push({ row: rowNumber, column: 'Código de Cargo', message: 'Campo obligatorio vacío' });
      } else if (jobTitleCode.length > 30) {
        rowErrors.push({ row: rowNumber, column: 'Código de Cargo', message: 'Máximo 30 caracteres' });
      }

      const areaCode = row['Código de Área']?.toString().trim();
      if (areaCode && areaCode.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Código de Área', message: 'Máximo 20 caracteres' });
      }

      const costCenterCode = row['Código de Centro de Costo']?.toString().trim();
      if (costCenterCode && costCenterCode.length > 30) {
        rowErrors.push({ row: rowNumber, column: 'Código de Centro de Costo', message: 'Máximo 30 caracteres' });
      }

      const workLocationCode = row['Código de Ubicación']?.toString().trim();
      if (workLocationCode && workLocationCode.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Código de Ubicación', message: 'Máximo 20 caracteres' });
      }

      const workGroupCode = row['Código de Grupo']?.toString().trim();
      if (workGroupCode && workGroupCode.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Código de Grupo', message: 'Máximo 20 caracteres' });
      }

      const payrollGroupCode = row['Código de Rol de Pago']?.toString().trim();
      if (payrollGroupCode && payrollGroupCode.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Código de Rol de Pago', message: 'Máximo 20 caracteres' });
      }

      const contractType = row['Tipo de Contrato']?.toString().trim();
      if (contractType && contractType.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Tipo de Contrato', message: 'Máximo 20 caracteres' });
      }

      // ✅ NORMALIZAR FECHA DE CONTRATACIÓN (puede venir como número serial de Excel)
      const hireDateRaw = row['Fecha de Contratación'];
      const hireDate = normalizeDateValue(hireDateRaw);
      
      // Debug log para primera fila
      if (index === 0 && hireDateRaw !== null && hireDateRaw !== undefined && hireDateRaw !== '') {
        console.log(`🔍 DEBUG Fecha Contratación - Fila ${rowNumber}:`, {
          raw: hireDateRaw,
          type: typeof hireDateRaw,
          normalized: hireDate
        });
      }
      
      if (hireDate) {
        const date = new Date(hireDate);
        if (isNaN(date.getTime())) {
          rowErrors.push({ row: rowNumber, column: 'Fecha de Contratación', message: 'Formato inválido (YYYY-MM-DD)' });
        }
      }

      const salaryAmount = row['Monto de Salario']?.toString().trim();
      if (salaryAmount) {
        const amount = parseFloat(salaryAmount);
        if (isNaN(amount)) {
          rowErrors.push({ row: rowNumber, column: 'Monto de Salario', message: 'Debe ser un número válido' });
        } else if (amount < 0) {
          rowErrors.push({ row: rowNumber, column: 'Monto de Salario', message: 'No puede ser negativo' });
        }
      }

      const deviceUserCode = row['Código de Usuario de Dispositivo']?.toString().trim();
      if (deviceUserCode && deviceUserCode.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Código de Usuario de Dispositivo', message: 'Máximo 20 caracteres' });
      }

      const payrollEmployeeCode = row['Código de Empleado de Nómina']?.toString().trim();
      if (payrollEmployeeCode && payrollEmployeeCode.length > 20) {
        rowErrors.push({ row: rowNumber, column: 'Código de Empleado de Nómina', message: 'Máximo 20 caracteres' });
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else if (code && lastname && name && departmentCode && jobTitleCode) {
        validData.push({
          employee_code: code,
          employee_lastname: lastname,
          employee_name: name,
          employee_gender: gender || undefined,
          employee_birthday: birthday || undefined,
          employee_profile_code: profileCode || undefined,
          department_code: departmentCode,
          job_title_code: jobTitleCode,
          area_code: areaCode || undefined,
          cost_center_code: costCenterCode || undefined,
          work_location_code: workLocationCode || undefined,
          work_group_code: workGroupCode || undefined,
          payroll_group_code: payrollGroupCode || undefined,
          contract_type: contractType || undefined,
          hire_date: hireDate || undefined,
          salary_amount: salaryAmount ? parseFloat(salaryAmount) : undefined,
          device_user_code: deviceUserCode || undefined,
          payroll_employee_code: payrollEmployeeCode || undefined
        });
      }
    });

    return { success: errors.length === 0, data: validData, errors, rowCount: rawData.length };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, column: 'general', message: `Error procesando archivo: ${error.message}` }],
      rowCount: 0
    };
  }
}

// ============================================================================
// UTILIDADES DE DESCARGA
// ============================================================================

export function downloadTemplate(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}