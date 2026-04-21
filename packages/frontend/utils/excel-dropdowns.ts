/**
 * Excel Generator con Data Validation (Dropdowns)
 * Genera archivos Excel con listas desplegables dinámicas desde la BD
 */

import ExcelJS from 'exceljs';
import type { EmployeeRow } from './excel-templates';

// ============================================================================
// TIPOS PARA CATÁLOGOS
// ============================================================================

export interface CatalogItem {
  code: string;
  name: string;
}

export interface BootstrapCatalogs {
  departments: CatalogItem[];
  job_titles: CatalogItem[];
  areas: CatalogItem[];
  cost_centers: CatalogItem[];
  work_locations: CatalogItem[];
  work_groups: CatalogItem[];
  payroll_groups: CatalogItem[];
  employee_profiles: CatalogItem[];
  genders: CatalogItem[];
  contract_types: CatalogItem[];
}

// ============================================================================
// GENERAR EXCEL CON DROPDOWNS DINÁMICOS
// ============================================================================

/**
 * Genera archivo Excel para empleados con dropdowns dinámicos usando ExcelJS
 * @param catalogs - Catálogos desde el backend
 * @param existingEmployees - Empleados existentes (para modo edición)
 * @param tenantInfo - Información del tenant para header
 */
export async function generateEmployeesExcelWithDropdowns(
  catalogs: BootstrapCatalogs,
  existingEmployees?: EmployeeRow[],
  tenantInfo?: { tenantName: string; companyName: string }
): Promise<Blob> {
  // 🔍 DEBUG: Verificar catálogos recibidos
  console.log('📊 Excel Generator - Catálogos recibidos:');
  console.log('   - Departamentos:', catalogs.departments.length);
  console.log('   - Cargos:', catalogs.job_titles.length);
  console.log('   - Áreas:', catalogs.areas.length);
  console.log('   - Centros de Costo:', catalogs.cost_centers.length);
  console.log('   - Ubicaciones:', catalogs.work_locations.length);
  console.log('   - Grupos:', catalogs.work_groups.length);
  console.log('   - Roles de Pago:', catalogs.payroll_groups.length);
  console.log('   - ⭐ PERFILES:', catalogs.employee_profiles.length);
  console.log('   - Géneros:', catalogs.genders.length);
  console.log('   - Tipos de Contrato:', catalogs.contract_types.length);
  
  if (catalogs.employee_profiles.length > 0) {
    console.log('   - 🔍 Perfiles recibidos:', catalogs.employee_profiles);
  }

  const workbook = new ExcelJS.Workbook();
  
  // ========================================
  // HOJA 1: EMPLEADOS (Datos + Dropdowns)
  // ========================================

  const wsEmployees = workbook.addWorksheet('Empleados');

  // Definir columnas
  wsEmployees.columns = [
    { header: 'Código de Empleado', key: 'employee_code', width: 18 },
    { header: 'Apellido', key: 'employee_lastname', width: 20 },
    { header: 'Nombre', key: 'employee_name', width: 20 },
    { header: 'Género', key: 'employee_gender', width: 12 },
    { header: 'Fecha de Nacimiento', key: 'employee_birthday', width: 18 },
    { header: 'Código de Perfil', key: 'employee_profile_code', width: 18 },
    { header: 'Código de Departamento', key: 'department_code', width: 22 },
    { header: 'Código de Cargo', key: 'job_title_code', width: 18 },
    { header: 'Código de Área', key: 'area_code', width: 18 },
    { header: 'Código de Centro de Costo', key: 'cost_center_code', width: 25 },
    { header: 'Código de Ubicación', key: 'work_location_code', width: 20 },
    { header: 'Código de Grupo', key: 'work_group_code', width: 18 },
    { header: 'Código de Rol de Pago', key: 'payroll_group_code', width: 22 },
    { header: 'Tipo de Contrato', key: 'contract_type', width: 18 },
    { header: 'Fecha de Contratación', key: 'hire_date', width: 20 },
    { header: 'Monto de Salario', key: 'salary_amount', width: 16 },
    { header: 'Código de Usuario de Dispositivo', key: 'device_user_code', width: 28 },
    { header: 'Código de Empleado de Nómina', key: 'payroll_employee_code', width: 28 }
  ];

  // Estilo del encabezado
  wsEmployees.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsEmployees.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0074D9' }
  };
  wsEmployees.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Agregar datos (existentes o fila de ejemplo)
  if (existingEmployees && existingEmployees.length > 0) {
    existingEmployees.forEach(emp => {
      wsEmployees.addRow({
        employee_code: emp.employee_code,
        employee_lastname: emp.employee_lastname,
        employee_name: emp.employee_name,
        employee_gender: emp.employee_gender || '',
        employee_birthday: emp.employee_birthday || '',
        employee_profile_code: emp.employee_profile_code || '',
        department_code: emp.department_code,
        job_title_code: emp.job_title_code,
        area_code: emp.area_code || '',
        cost_center_code: emp.cost_center_code || '',
        work_location_code: emp.work_location_code || '',
        work_group_code: emp.work_group_code || '',
        payroll_group_code: emp.payroll_group_code || '',
        contract_type: emp.contract_type || '',
        hire_date: emp.hire_date || '',
        salary_amount: emp.salary_amount || '',
        device_user_code: emp.device_user_code || '',
        payroll_employee_code: emp.payroll_employee_code || ''
      });
    });
  } else {
    // Fila de ejemplo
    wsEmployees.addRow({
      employee_code: 'EMP-001',
      employee_lastname: 'Pérez',
      employee_name: 'Juan',
      employee_gender: catalogs.genders[0]?.code || '',
      employee_birthday: '1990-01-15',
      employee_profile_code: catalogs.employee_profiles[0]?.code || '',
      department_code: catalogs.departments[0]?.code || '',
      job_title_code: catalogs.job_titles[0]?.code || '',
      area_code: catalogs.areas[0]?.code || '',
      cost_center_code: catalogs.cost_centers[0]?.code || '',
      work_location_code: catalogs.work_locations[0]?.code || '',
      work_group_code: catalogs.work_groups[0]?.code || '',
      payroll_group_code: catalogs.payroll_groups[0]?.code || '',
      contract_type: catalogs.contract_types[0]?.code || '',
      hire_date: '2020-01-01',
      salary_amount: 1500.00,
      device_user_code: 'DISP-001',
      payroll_employee_code: 'NOM-001'
    });
  }

  // ========================================
  // HOJA 2: CATÁLOGOS (para referencias de dropdowns)
  // ========================================

  const wsCatalogs = workbook.addWorksheet('Catálogos');
  
  const maxCatalogLength = Math.max(
    catalogs.departments.length,
    catalogs.job_titles.length,
    catalogs.areas.length,
    catalogs.cost_centers.length,
    catalogs.work_locations.length,
    catalogs.work_groups.length,
    catalogs.payroll_groups.length,
    catalogs.employee_profiles.length,
    catalogs.genders.length,
    catalogs.contract_types.length
  );

  // Configurar columnas de catálogos
  wsCatalogs.columns = [
    { header: 'Departamentos', key: 'departments', width: 20 },
    { header: 'Cargos', key: 'job_titles', width: 20 },
    { header: 'Áreas', key: 'areas', width: 20 },
    { header: 'Centros de Costo', key: 'cost_centers', width: 22 },
    { header: 'Ubicaciones', key: 'work_locations', width: 20 },
    { header: 'Grupos', key: 'work_groups', width: 18 },
    { header: 'Roles de Pago', key: 'payroll_groups', width: 20 },
    { header: 'Perfiles', key: 'employee_profiles', width: 18 },
    { header: 'Géneros', key: 'genders', width: 15 },
    { header: 'Tipos de Contrato', key: 'contract_types', width: 20 }
  ];

  // Estilo del encabezado de catálogos
  wsCatalogs.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsCatalogs.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2ECC71' }
  };

  // Llenar datos de catálogos
  for (let i = 0; i < maxCatalogLength; i++) {
    wsCatalogs.addRow({
      departments: catalogs.departments[i]?.code || '',
      job_titles: catalogs.job_titles[i]?.code || '',
      areas: catalogs.areas[i]?.code || '',
      cost_centers: catalogs.cost_centers[i]?.code || '',
      work_locations: catalogs.work_locations[i]?.code || '',
      work_groups: catalogs.work_groups[i]?.code || '',
      payroll_groups: catalogs.payroll_groups[i]?.code || '',
      employee_profiles: catalogs.employee_profiles[i]?.code || '',
      genders: catalogs.genders[i]?.code || '',
      contract_types: catalogs.contract_types[i]?.code || ''
    });
  }

  // ========================================
  // APLICAR DATA VALIDATION (Dropdowns)
  // ========================================

  const MAX_ROWS = 1000;

  // Género (Columna D)
  if (catalogs.genders.length > 0) {
    const genderList = catalogs.genders.map(g => g.code).join(',');
    wsEmployees.dataValidations.add(`D2:D${MAX_ROWS}`, {
      type: 'list',
      allowBlank: true,
      formulae: [`"${genderList}"`],
      showErrorMessage: true,
      errorTitle: 'Valor inválido',
      error: 'Debe seleccionar un género válido de la lista',
      showInputMessage: true,
      promptTitle: 'Seleccione Género',
      prompt: 'Opciones: ' + catalogs.genders.map(g => g.name).join(', ')
    });
  }

  // Código de Perfil (Columna F)
  if (catalogs.employee_profiles.length > 0) {
    const profileList = catalogs.employee_profiles.map(p => p.code).join(',');
    wsEmployees.dataValidations.add(`F2:F${MAX_ROWS}`, {
      type: 'list',
      allowBlank: true,
      formulae: [`"${profileList}"`],
      showInputMessage: true,
      promptTitle: 'Seleccione Perfil',
      prompt: 'Ver pestaña Catálogos para más detalles'
    });
  }

  // Código de Departamento (Columna G) - OBLIGATORIO
  if (catalogs.departments.length > 0) {
    if (catalogs.departments.length <= 20) {
      const deptList = catalogs.departments.map(d => d.code).join(',');
      wsEmployees.dataValidations.add(`G2:G${MAX_ROWS}`, {
        type: 'list',
        allowBlank: false,
        formulae: [`"${deptList}"`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Campo Obligatorio',
        error: 'Debe seleccionar un departamento válido de la lista',
        showInputMessage: true,
        promptTitle: 'Seleccione Departamento',
        prompt: 'Ver pestaña Catálogos para más detalles'
      });
    } else {
      wsEmployees.dataValidations.add(`G2:G${MAX_ROWS}`, {
        type: 'list',
        allowBlank: false,
        formulae: [`Catálogos!$A$2:$A$${catalogs.departments.length + 1}`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Campo Obligatorio',
        error: 'Debe seleccionar un departamento válido de la lista'
      });
    }
  }

  // Código de Cargo (Columna H) - OBLIGATORIO
  if (catalogs.job_titles.length > 0) {
    if (catalogs.job_titles.length <= 20) {
      const jobList = catalogs.job_titles.map(j => j.code).join(',');
      wsEmployees.dataValidations.add(`H2:H${MAX_ROWS}`, {
        type: 'list',
        allowBlank: false,
        formulae: [`"${jobList}"`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Campo Obligatorio',
        error: 'Debe seleccionar un cargo válido de la lista',
        showInputMessage: true,
        promptTitle: 'Seleccione Cargo',
        prompt: 'Ver pestaña Catálogos para más detalles'
      });
    } else {
      wsEmployees.dataValidations.add(`H2:H${MAX_ROWS}`, {
        type: 'list',
        allowBlank: false,
        formulae: [`Catálogos!$B$2:$B$${catalogs.job_titles.length + 1}`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Campo Obligatorio',
        error: 'Debe seleccionar un cargo válido de la lista'
      });
    }
  }

  // Código de Área (Columna I)
  if (catalogs.areas.length > 0) {
    if (catalogs.areas.length <= 15) {
      const areaList = catalogs.areas.map(a => a.code).join(',');
      wsEmployees.dataValidations.add(`I2:I${MAX_ROWS}`, {
        type: 'list',
        allowBlank: true,
        formulae: [`"${areaList}"`],
        showInputMessage: true,
        promptTitle: 'Seleccione Área',
        prompt: 'Ver pestaña Catálogos para más detalles'
      });
    } else {
      wsEmployees.dataValidations.add(`I2:I${MAX_ROWS}`, {
        type: 'list',
        allowBlank: true,
        formulae: [`Catálogos!$C$2:$C$${catalogs.areas.length + 1}`]
      });
    }
  }

  // Código de Centro de Costo (Columna J)
  if (catalogs.cost_centers.length > 0) {
    if (catalogs.cost_centers.length <= 15) {
      const ccList = catalogs.cost_centers.map(cc => cc.code).join(',');
      wsEmployees.dataValidations.add(`J2:J${MAX_ROWS}`, {
        type: 'list',
        allowBlank: true,
        formulae: [`"${ccList}"`],
        showInputMessage: true,
        promptTitle: 'Seleccione Centro de Costo',
        prompt: 'Ver pestaña Catálogos para más detalles'
      });
    } else {
      wsEmployees.dataValidations.add(`J2:J${MAX_ROWS}`, {
        type: 'list',
        allowBlank: true,
        formulae: [`Catálogos!$D$2:$D$${catalogs.cost_centers.length + 1}`]
      });
    }
  }

  // Código de Ubicación (Columna K)
  if (catalogs.work_locations.length > 0) {
    if (catalogs.work_locations.length <= 15) {
      const locList = catalogs.work_locations.map(wl => wl.code).join(',');
      wsEmployees.dataValidations.add(`K2:K${MAX_ROWS}`, {
        type: 'list',
        allowBlank: true,
        formulae: [`"${locList}"`],
        showInputMessage: true,
        promptTitle: 'Seleccione Ubicación',
        prompt: 'Ver pestaña Catálogos para más detalles'
      });
    } else {
      wsEmployees.dataValidations.add(`K2:K${MAX_ROWS}`, {
        type: 'list',
        allowBlank: true,
        formulae: [`Catálogos!$E$2:$E$${catalogs.work_locations.length + 1}`]
      });
    }
  }

  // Código de Grupo (Columna L)
  if (catalogs.work_groups.length > 0) {
    if (catalogs.work_groups.length <= 15) {
      const groupList = catalogs.work_groups.map(wg => wg.code).join(',');
      wsEmployees.dataValidations.add(`L2:L${MAX_ROWS}`, {
        type: 'list',
        allowBlank: true,
        formulae: [`"${groupList}"`],
        showInputMessage: true,
        promptTitle: 'Seleccione Grupo',
        prompt: 'Ver pestaña Catálogos para más detalles'
      });
    } else {
      wsEmployees.dataValidations.add(`L2:L${MAX_ROWS}`, {
        type: 'list',
        allowBlank: true,
        formulae: [`Catálogos!$F$2:$F$${catalogs.work_groups.length + 1}`]
      });
    }
  }

  // Código de Rol de Pago (Columna M)
  if (catalogs.payroll_groups.length > 0) {
    if (catalogs.payroll_groups.length <= 15) {
      const payrollList = catalogs.payroll_groups.map(pg => pg.code).join(',');
      wsEmployees.dataValidations.add(`M2:M${MAX_ROWS}`, {
        type: 'list',
        allowBlank: true,
        formulae: [`"${payrollList}"`],
        showInputMessage: true,
        promptTitle: 'Seleccione Rol de Pago',
        prompt: 'Ver pestaña Catálogos para más detalles'
      });
    } else {
      wsEmployees.dataValidations.add(`M2:M${MAX_ROWS}`, {
        type: 'list',
        allowBlank: true,
        formulae: [`Catálogos!$G$2:$G$${catalogs.payroll_groups.length + 1}`]
      });
    }
  }

  // Tipo de Contrato (Columna N)
  if (catalogs.contract_types.length > 0) {
    const contractList = catalogs.contract_types.map(ct => ct.code).join(',');
    wsEmployees.dataValidations.add(`N2:N${MAX_ROWS}`, {
      type: 'list',
      allowBlank: true,
      formulae: [`"${contractList}"`],
      showInputMessage: true,
      promptTitle: 'Seleccione Tipo de Contrato',
      prompt: 'Opciones: ' + catalogs.contract_types.map(ct => ct.name).join(', ')
    });
  }

  // ========================================
  // HOJA 3: INSTRUCCIONES
  // ========================================

  const wsInstructions = workbook.addWorksheet('Instrucciones');
  wsInstructions.columns = [{ header: '', key: 'text', width: 100 }];

  const instructionLines = [
    'INSTRUCCIONES PARA CARGA DE EMPLEADOS',
    '',
    tenantInfo 
      ? `Organización: ${tenantInfo.tenantName} | Empresa: ${tenantInfo.companyName}`
      : '',
    '',
    '⚠️ IMPORTANTE - LISTAS DESPLEGABLES:',
    'Para ver correctamente las listas desplegables (dropdowns), debe abrir este archivo con:',
    '✓ Microsoft Excel (Desktop) - RECOMENDADO',
    '✓ LibreOffice Calc - Funciona correctamente',
    '✓ WPS Office - Compatible',
    '✓ Google Sheets - Compatible (requiere importar el archivo)',
    '',
    'COLUMNAS OBLIGATORIAS:',
    '• Código de Empleado: Identificador único del empleado',
    '• Apellido: Apellido(s) del empleado',
    '• Nombre: Nombre(s) del empleado',
    '• Código de Departamento: Seleccionar de lista desplegable (columna G)',
    '• Código de Cargo: Seleccionar de lista desplegable (columna H)',
    '',
    'COLUMNAS OPCIONALES CON LISTAS DESPLEGABLES:',
    '• Género (columna D): Seleccionar de lista',
    '• Código de Perfil (columna F): Seleccionar de lista - Define permisos del empleado',
    '• Código de Área (columna I): Opcional',
    '• Código de Centro de Costo (columna J): Para asignación contable',
    '• Código de Ubicación (columna K): Lugar físico de trabajo',
    '• Código de Grupo (columna L): Agrupación para turnos',
    '• Código de Rol de Pago (columna M): Configuración de nómina',
    '• Tipo de Contrato (columna N): Temporal, Indefinido, etc.',
    '',
    'CAMPOS DE TEXTO LIBRE:',
    '• Fecha de Nacimiento (YYYY-MM-DD): Formato: 1990-12-31',
    '• Fecha de Contratación (YYYY-MM-DD): Formato: 2020-01-15',
    '• Monto de Salario: Solo números (sin símbolos)',
    '• Código de Usuario de Dispositivo: Para integración con reloj biométrico',
    '• Código de Empleado de Nómina: Para sincronización con sistema de nómina',
    '',
    'CÓMO USAR LAS LISTAS DESPLEGABLES:',
    '1. Haga clic en la celda que desea editar',
    '2. Aparecerá una flecha ▼ a la derecha de la celda',
    '3. Haga clic en la flecha para ver las opciones disponibles',
    '4. Seleccione el valor deseado de la lista',
    '',
    '💡 TIP: Puede consultar todos los códigos válidos en la pestaña "Catálogos"',
    '',
    'VALIDACIÓN:',
    '• Si ingresa un valor inválido en campos obligatorios, Excel mostrará un error',
    '• Use SIEMPRE las listas desplegables para evitar errores de tipeo',
    '• Los códigos deben coincidir EXACTAMENTE con los valores de la pestaña Catálogos',
    '',
    'AGREGAR NUEVAS FILAS:',
    '• Puede agregar hasta 1000 empleados',
    '• Los dropdowns funcionan automáticamente en TODAS las filas (2-1000)',
    '• Simplemente agregue una nueva fila y las validaciones se aplicarán automáticamente',
    '',
    '¿NECESITA AYUDA?',
    '• Revise la pestaña "Catálogos" para ver todos los valores disponibles',
    '• Los mensajes de error le indicarán qué corregir',
    '• Asegúrese de guardar el archivo antes de cargarlo al sistema'
  ];

  instructionLines.forEach(line => {
    wsInstructions.addRow({ text: line });
  });

  // Estilo para título de instrucciones
  wsInstructions.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF0074D9' } };

  // ========================================
  // GENERAR BLOB
  // ========================================

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}