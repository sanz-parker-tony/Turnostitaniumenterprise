// Datos de demostración centralizados y realistas para presentación a clientes

export const demoCompanies = [
  { id: 1, code: 'TITAN01', name: 'Titanium Corp', ruc: '1792345678001', sector: 'Industrial', active: true },
  { id: 2, code: 'ACME01', name: 'ACME Manufacturing', ruc: '1791234567001', sector: 'Manufactura', active: true },
  { id: 3, code: 'GLOBAL01', name: 'Global Services SA', ruc: '1793456789001', sector: 'Servicios', active: true },
];

export const demoLocations = [
  { id: 1, company: 'Titanium Corp', code: 'PLT-GYE', name: 'Planta Guayaquil', address: 'Av. Principal Km 15', city: 'Guayaquil', active: true },
  { id: 2, company: 'Titanium Corp', code: 'PLT-UIO', name: 'Planta Quito', address: 'Parque Industrial Norte', city: 'Quito', active: true },
  { id: 3, company: 'Titanium Corp', code: 'OFC-CEN', name: 'Oficina Central', address: 'Centro Empresarial Torre A', city: 'Guayaquil', active: true },
  { id: 4, company: 'ACME Manufacturing', code: 'PLT-CUE', name: 'Planta Cuenca', address: 'Zona Industrial', city: 'Cuenca', active: true },
];

export const demoDepartments = [
  { id: 1, company: 'Titanium Corp', location: 'Planta Guayaquil', code: 'PROD', name: 'Producción', manager: 'Carlos Mendoza', active: true },
  { id: 2, company: 'Titanium Corp', location: 'Planta Guayaquil', code: 'LOG', name: 'Logística', manager: 'Ana Torres', active: true },
  { id: 3, company: 'Titanium Corp', location: 'Planta Guayaquil', code: 'MANT', name: 'Mantenimiento', manager: 'Roberto Silva', active: true },
  { id: 4, company: 'Titanium Corp', location: 'Oficina Central', code: 'ADM', name: 'Administración', manager: 'Patricia Gómez', active: true },
  { id: 5, company: 'Titanium Corp', location: 'Oficina Central', code: 'RRHH', name: 'Recursos Humanos', manager: 'Laura Pérez', active: true },
  { id: 6, company: 'Titanium Corp', location: 'Planta Quito', code: 'CAL', name: 'Calidad', manager: 'Miguel Ángel Ruiz', active: true },
];

export const demoAreas = [
  { id: 1, department: 'Producción', code: 'ENS', name: 'Ensamblaje', supervisor: 'Juan Pérez', active: true },
  { id: 2, department: 'Producción', code: 'PKG', name: 'Empaque', supervisor: 'María García', active: true },
  { id: 3, department: 'Logística', code: 'ALM', name: 'Almacén', supervisor: 'Pedro Ramírez', active: true },
  { id: 4, department: 'Logística', code: 'DIS', name: 'Distribución', supervisor: 'Sofía Martínez', active: true },
  { id: 5, department: 'Mantenimiento', code: 'PREV', name: 'Mantenimiento Preventivo', supervisor: 'Luis Fernández', active: true },
  { id: 6, department: 'Administración', code: 'FIN', name: 'Finanzas', supervisor: 'Carmen López', active: true },
];

export const demoProfiles = [
  { id: 1, name: 'Operador de Producción', department: 'Producción', level: 'Operativo', description: 'Operador de línea de producción', active: true },
  { id: 2, name: 'Supervisor de Turno', department: 'Producción', level: 'Supervisión', description: 'Supervisión de equipo de trabajo', active: true },
  { id: 3, name: 'Jefe de Departamento', department: 'Todos', level: 'Gerencial', description: 'Gestión de departamento', active: true },
  { id: 4, name: 'Analista Administrativo', department: 'Administración', level: 'Administrativo', description: 'Análisis y gestión administrativa', active: true },
  { id: 5, name: 'Técnico de Mantenimiento', department: 'Mantenimiento', level: 'Técnico', description: 'Mantenimiento de equipos', active: true },
];

export const demoShifts = [
  { id: 1, code: 'DIA', name: 'Turno Diurno', company: 'Titanium Corp', startTime: '08:00', endTime: '17:00', workDays: 'Lun-Vie', color: '#0074D9', active: true },
  { id: 2, code: 'NOCHE', name: 'Turno Nocturno', company: 'Titanium Corp', startTime: '20:00', endTime: '05:00', workDays: 'Lun-Vie', color: '#34495E', active: true },
  { id: 3, code: 'ROT-A', name: 'Rotativo A', company: 'Titanium Corp', startTime: '06:00', endTime: '14:00', workDays: 'Lun-Dom', color: '#2ECC71', active: true },
  { id: 4, code: 'ROT-B', name: 'Rotativo B', company: 'Titanium Corp', startTime: '14:00', endTime: '22:00', workDays: 'Lun-Dom', color: '#E67E22', active: true },
  { id: 5, code: 'ROT-C', name: 'Rotativo C', company: 'Titanium Corp', startTime: '22:00', endTime: '06:00', workDays: 'Lun-Dom', color: '#9B59B6', active: true },
];

export const demoEmployees = [
  { 
    id: 1, 
    code: 'EMP001', 
    nombres: 'Juan Carlos', 
    apellidos: 'Pérez González',
    document: '001-1234567-8', 
    fechaNacimiento: '1985-06-15',
    sexo: 'M',
    telefono: '0998765432',
    email: 'juan.perez@titaniumcorp.com',
    company: 'Titanium Corp', 
    localidad: 'Planta Guayaquil',
    department: 'Producción',
    area: 'Ensamblaje', 
    perfil: 'Operador de Producción',
    cargo: 'Operador Senior',
    rolPago: 'Quincenal',
    centroCosto: 'CC-PROD-01',
    grupo: 'Grupo A',
    trabajaFeriado: true,
    tipoContrato: 'Indefinido',
    fechaIngreso: '2020-01-15',
    fechaSalida: null,
    shift: 'Turno Diurno', 
    salario: 1200,
    active: true 
  },
  { 
    id: 2, 
    code: 'EMP002', 
    nombres: 'María Teresa', 
    apellidos: 'García Mendoza',
    document: '001-9876543-2', 
    fechaNacimiento: '1990-03-22',
    sexo: 'F',
    telefono: '0987654321',
    email: 'maria.garcia@titaniumcorp.com',
    company: 'Titanium Corp', 
    localidad: 'Planta Guayaquil',
    department: 'Logística',
    area: 'Almacén', 
    perfil: 'Supervisor de Turno',
    cargo: 'Supervisor de Almacén',
    rolPago: 'Mensual',
    centroCosto: 'CC-LOG-01',
    grupo: 'Grupo B',
    trabajaFeriado: false,
    tipoContrato: 'Indefinido',
    fechaIngreso: '2019-05-10',
    fechaSalida: null,
    shift: 'Turno Diurno', 
    salario: 1800,
    active: true 
  },
  { 
    id: 3, 
    code: 'EMP003', 
    nombres: 'Carlos Alberto', 
    apellidos: 'Mendoza Ruiz',
    document: '001-5678901-3', 
    fechaNacimiento: '1988-11-08',
    sexo: 'M',
    telefono: '0991234567',
    email: 'carlos.mendoza@titaniumcorp.com',
    company: 'Titanium Corp', 
    localidad: 'Planta Guayaquil',
    department: 'Producción',
    area: 'Ensamblaje', 
    perfil: 'Jefe de Departamento',
    cargo: 'Jefe de Producción',
    rolPago: 'Mensual',
    centroCosto: 'CC-PROD-01',
    grupo: 'Grupo A',
    trabajaFeriado: true,
    tipoContrato: 'Indefinido',
    fechaIngreso: '2018-03-01',
    fechaSalida: null,
    shift: 'Turno Diurno', 
    salario: 2500,
    active: true 
  },
  { 
    id: 4, 
    code: 'EMP004', 
    nombres: 'Ana Lucía', 
    apellidos: 'Torres Vargas',
    document: '001-3456789-0', 
    fechaNacimiento: '1992-07-25',
    sexo: 'F',
    telefono: '0989876543',
    email: 'ana.torres@titaniumcorp.com',
    company: 'Titanium Corp', 
    localidad: 'Planta Quito',
    department: 'Calidad',
    area: 'Control de Calidad', 
    perfil: 'Analista Administrativo',
    cargo: 'Analista de Calidad',
    rolPago: 'Mensual',
    centroCosto: 'CC-CAL-01',
    grupo: 'Grupo C',
    trabajaFeriado: false,
    tipoContrato: 'Plazo Fijo',
    fechaIngreso: '2021-06-15',
    fechaSalida: null,
    shift: 'Turno Diurno', 
    salario: 1400,
    active: true 
  },
  { 
    id: 5, 
    code: 'EMP005', 
    nombres: 'Roberto', 
    apellidos: 'Silva Castro',
    document: '001-2345678-9', 
    fechaNacimiento: '1983-09-12',
    sexo: 'M',
    telefono: '0993456789',
    email: 'roberto.silva@titaniumcorp.com',
    company: 'Titanium Corp', 
    localidad: 'Planta Guayaquil',
    department: 'Mantenimiento',
    area: 'Mantenimiento Preventivo', 
    perfil: 'Técnico de Mantenimiento',
    cargo: 'Técnico Senior',
    rolPago: 'Quincenal',
    centroCosto: 'CC-MANT-01',
    grupo: 'Grupo D',
    trabajaFeriado: true,
    tipoContrato: 'Indefinido',
    fechaIngreso: '2017-08-20',
    fechaSalida: null,
    shift: 'Rotativo A', 
    salario: 1600,
    active: true 
  },
  { 
    id: 6, 
    code: 'EMP006', 
    nombres: 'Patricia', 
    apellidos: 'Gómez Flores',
    document: '001-4567890-1', 
    fechaNacimiento: '1987-04-30',
    sexo: 'F',
    telefono: '0997654321',
    email: 'patricia.gomez@titaniumcorp.com',
    company: 'Titanium Corp', 
    localidad: 'Oficina Central',
    department: 'Administración',
    area: 'Finanzas', 
    perfil: 'Jefe de Departamento',
    cargo: 'Jefe Administrativo',
    rolPago: 'Mensual',
    centroCosto: 'CC-ADM-01',
    grupo: 'Ejecutivo',
    trabajaFeriado: false,
    tipoContrato: 'Indefinido',
    fechaIngreso: '2016-02-01',
    fechaSalida: null,
    shift: 'Turno Diurno', 
    salario: 2800,
    active: true 
  },
];

export const demoHolidays = [
  { id: 1, company: 'Titanium Corp', date: '2025-01-01', description: 'Año Nuevo', location: 'Nacional', active: true },
  { id: 2, company: 'Titanium Corp', date: '2025-02-10', description: 'Carnaval (Lunes)', location: 'Nacional', active: true },
  { id: 3, company: 'Titanium Corp', date: '2025-02-11', description: 'Carnaval (Martes)', location: 'Nacional', active: true },
  { id: 4, company: 'Titanium Corp', date: '2025-04-18', description: 'Viernes Santo', location: 'Nacional', active: true },
  { id: 5, company: 'Titanium Corp', date: '2025-05-01', description: 'Día del Trabajo', location: 'Nacional', active: true },
  { id: 6, company: 'Titanium Corp', date: '2025-05-24', description: 'Batalla de Pichincha', location: 'Nacional', active: true },
  { id: 7, company: 'Titanium Corp', date: '2025-08-10', description: 'Primer Grito de Independencia', location: 'Nacional', active: true },
  { id: 8, company: 'Titanium Corp', date: '2025-10-09', description: 'Independencia de Guayaquil', location: 'Guayaquil', active: true },
  { id: 9, company: 'Titanium Corp', date: '2025-11-02', description: 'Día de los Difuntos', location: 'Nacional', active: true },
  { id: 10, company: 'Titanium Corp', date: '2025-11-03', description: 'Independencia de Cuenca', location: 'Cuenca', active: true },
  { id: 11, company: 'Titanium Corp', date: '2025-12-25', description: 'Navidad', location: 'Nacional', active: true },
];

export const demoCatalogs = [
  { id: 1, table: 'TIPO_CONTRATO', parent: 0, value: 'INDEFINIDO', description: 'Contrato Indefinido', active: true },
  { id: 2, table: 'TIPO_CONTRATO', parent: 0, value: 'PLAZO_FIJO', description: 'Contrato a Plazo Fijo', active: true },
  { id: 3, table: 'TIPO_CONTRATO', parent: 0, value: 'EVENTUAL', description: 'Contrato Eventual', active: true },
  { id: 4, table: 'TIPO_CONTRATO', parent: 0, value: 'PASANTIA', description: 'Contrato de Pasantía', active: true },
  { id: 5, table: 'TIPO_PERMISO', parent: 0, value: 'CON_SUELDO', description: 'Permiso con Sueldo', active: true },
  { id: 6, table: 'TIPO_PERMISO', parent: 0, value: 'SIN_SUELDO', description: 'Permiso sin Sueldo', active: true },
  { id: 7, table: 'TIPO_PERMISO', parent: 0, value: 'VACACIONES', description: 'Vacaciones', active: true },
  { id: 8, table: 'TIPO_PERMISO', parent: 0, value: 'MATERNIDAD', description: 'Licencia de Maternidad', active: true },
  { id: 9, table: 'TIPO_PERMISO', parent: 0, value: 'PATERNIDAD', description: 'Licencia de Paternidad', active: true },
  { id: 10, table: 'ROL_PAGO', parent: 0, value: 'SEMANAL', description: 'Pago Semanal', active: true },
  { id: 11, table: 'ROL_PAGO', parent: 0, value: 'QUINCENAL', description: 'Pago Quincenal', active: true },
  { id: 12, table: 'ROL_PAGO', parent: 0, value: 'MENSUAL', description: 'Pago Mensual', active: true },
];

export const demoJustifications = [
  { id: 1, description: 'Incapacidad Médica', abbreviation: 'INCAP', color: '#E74C3C', active: true },
  { id: 2, description: 'Permiso Personal', abbreviation: 'PERM', color: '#3498DB', active: true },
  { id: 3, description: 'Cita Médica', abbreviation: 'CITA', color: '#9B59B6', active: true },
  { id: 4, description: 'Calamidad Doméstica', abbreviation: 'CALAM', color: '#E67E22', active: true },
  { id: 5, description: 'Licencia Paternidad', abbreviation: 'LPAT', color: '#1ABC9C', active: true },
  { id: 6, description: 'Licencia Maternidad', abbreviation: 'LMAT', color: '#F39C12', active: true },
  { id: 7, description: 'Vacaciones', abbreviation: 'VAC', color: '#2ECC71', active: true },
  { id: 8, description: 'Capacitación', abbreviation: 'CAP', color: '#16A085', active: true },
];

export const demoAttendances = [
  { id: 1, empleado: 'Juan Pérez', cedula: '001-1234567-8', fecha: '2025-11-01', hora: '07:58:00', tecla: 'Entrada Trabajo', dispositivo: 'Terminal 01', location: 'Planta Guayaquil' },
  { id: 2, empleado: 'Juan Pérez', cedula: '001-1234567-8', fecha: '2025-11-01', hora: '12:00:00', tecla: 'Inicio Almuerzo', dispositivo: 'Terminal 01', location: 'Planta Guayaquil' },
  { id: 3, empleado: 'Juan Pérez', cedula: '001-1234567-8', fecha: '2025-11-01', hora: '13:02:00', tecla: 'Fin Almuerzo', dispositivo: 'Terminal 01', location: 'Planta Guayaquil' },
  { id: 4, empleado: 'Juan Pérez', cedula: '001-1234567-8', fecha: '2025-11-01', hora: '17:05:00', tecla: 'Salida Trabajo', dispositivo: 'Terminal 01', location: 'Planta Guayaquil' },
  { id: 5, empleado: 'María García', cedula: '001-9876543-2', fecha: '2025-11-01', hora: '08:15:00', tecla: 'Entrada Trabajo', dispositivo: 'Terminal 01', location: 'Planta Guayaquil' },
  { id: 6, empleado: 'María García', cedula: '001-9876543-2', fecha: '2025-11-01', hora: '17:00:00', tecla: 'Salida Trabajo', dispositivo: 'Terminal 01', location: 'Planta Guayaquil' },
  { id: 7, empleado: 'Carlos Mendoza', cedula: '001-5678901-3', fecha: '2025-11-01', hora: '08:00:00', tecla: 'Entrada Trabajo', dispositivo: 'Terminal 01', location: 'Planta Guayaquil' },
  { id: 8, empleado: 'Carlos Mendoza', cedula: '001-5678901-3', fecha: '2025-11-01', hora: '17:30:00', tecla: 'Salida Trabajo', dispositivo: 'Terminal 01', location: 'Planta Guayaquil' },
  { id: 9, empleado: 'Ana Torres', cedula: '001-3456789-0', fecha: '2025-11-01', hora: '08:05:00', tecla: 'Entrada Trabajo', dispositivo: 'Terminal 02', location: 'Planta Quito' },
  { id: 10, empleado: 'Ana Torres', cedula: '001-3456789-0', fecha: '2025-11-01', hora: '17:10:00', tecla: 'Salida Trabajo', dispositivo: 'Terminal 02', location: 'Planta Quito' },
];

export const demoUsers = [
  { id: 1, name: 'Administrador Sistema', email: 'admin@titanium.com', role: 'administrador', company: 'Titanium Corp', active: true, lastLogin: '2025-11-01 08:30' },
  { id: 2, name: 'Supervisor Producción', email: 'supervisor@titanium.com', role: 'supervisor', company: 'Titanium Corp', department: 'Producción', active: true, lastLogin: '2025-11-01 07:45' },
  { id: 3, name: 'Oficial de Seguridad', email: 'seguridades@titanium.com', role: 'seguridad', company: 'Titanium Corp', active: true, lastLogin: '2025-10-31 16:20' },
  { id: 4, name: 'RRHH Manager', email: 'rrhh@titanium.com', role: 'administrador', company: 'Titanium Corp', active: true, lastLogin: '2025-11-01 09:15' },
];

export const demoReports = [
  { id: 1, name: 'Reporte de Asistencia Diaria', type: 'Asistencia', format: 'Excel', generated: '2025-11-01', user: 'Supervisor Producción' },
  { id: 2, name: 'Reporte Horas Extra Mensual', type: 'Horas Extra', format: 'PDF', generated: '2025-10-31', user: 'RRHH Manager' },
  { id: 3, name: 'Reporte Ausencias por Departamento', type: 'Ausencias', format: 'Excel', generated: '2025-10-30', user: 'Administrador Sistema' },
  { id: 4, name: 'Nómina Quincenal Octubre', type: 'Nómina', format: 'PDF', generated: '2025-10-15', user: 'RRHH Manager' },
];

// Requerimientos de Empleados enviados desde la App Móvil
export const demoPermisosProgra = [
  { id: 1, empleado: 'Juan Pérez', cedula: '001-1234567-8', tipoPermiso: 'Vacaciones', fechaDesde: '2025-11-15', fechaHasta: '2025-11-29', dias: 15, motivo: 'Vacaciones anuales planificadas', documento: 'solicitud-vacaciones-001.pdf', fechaSolicitud: '2025-10-25', estado: 'Pendiente' },
  { id: 2, empleado: 'María García', cedula: '001-9876543-2', tipoPermiso: 'Licencia Maternidad', fechaDesde: '2025-12-01', fechaHasta: '2026-02-28', dias: 90, motivo: 'Licencia de maternidad', documento: 'certificado-medico-mat-002.pdf', fechaSolicitud: '2025-10-30', estado: 'Pendiente' },
  { id: 3, empleado: 'Roberto Silva', cedula: '001-2345678-9', tipoPermiso: 'Permiso Médico', fechaDesde: '2025-11-10', fechaHasta: '2025-11-12', dias: 3, motivo: 'Cirugía programada menor', documento: 'orden-medica-003.pdf', fechaSolicitud: '2025-11-01', estado: 'Aprobado' },
  { id: 4, empleado: 'Ana Torres', cedula: '001-3456789-0', tipoPermiso: 'Licencia Paternidad', fechaDesde: '2025-11-18', fechaHasta: '2025-11-27', dias: 10, motivo: 'Nacimiento de hijo', documento: 'certificado-nacimiento-004.pdf', fechaSolicitud: '2025-11-02', estado: 'Aprobado' },
  { id: 5, empleado: 'Carlos Mendoza', cedula: '001-5678901-3', tipoPermiso: 'Duelo', fechaDesde: '2025-11-05', fechaHasta: '2025-11-07', dias: 3, motivo: 'Fallecimiento de familiar directo', documento: 'acta-defuncion-005.pdf', fechaSolicitud: '2025-11-04', estado: 'Aprobado' },
  { id: 6, empleado: 'Patricia Gómez', cedula: '001-4567890-1', tipoPermiso: 'Permiso Personal', fechaDesde: '2025-11-20', fechaHasta: '2025-11-20', dias: 1, motivo: 'Trámite personal urgente', documento: 'N/A', fechaSolicitud: '2025-11-06', estado: 'Rechazado' },
];

export const demoJustificacionesReq = [
  { id: 1, empleado: 'Juan Pérez', cedula: '001-1234567-8', fecha: '2025-11-07', tipoIncidente: 'Atraso', horaLlegada: '08:25', horaEsperada: '08:00', minutos: 25, motivo: 'Tráfico vehicular por accidente en la vía', documento: 'N/A', fechaSolicitud: '2025-11-07', estado: 'Pendiente' },
  { id: 2, empleado: 'María García', cedula: '001-9876543-2', fecha: '2025-11-08', tipoIncidente: 'Salida Anticipada', horaSalida: '15:30', horaEsperada: '17:00', minutos: 90, motivo: 'Emergencia familiar - hijo enfermo', documento: 'N/A', fechaSolicitud: '2025-11-08', estado: 'Pendiente' },
  { id: 3, empleado: 'Roberto Silva', cedula: '001-2345678-9', fecha: '2025-11-06', tipoIncidente: 'Falta', horaSalida: 'N/A', horaEsperada: 'N/A', minutos: 480, motivo: 'Malestar estomacal imprevisto', documento: 'receta-medica-006.jpg', fechaSolicitud: '2025-11-07', estado: 'Aprobado' },
  { id: 4, empleado: 'Carlos Mendoza', cedula: '001-5678901-3', fecha: '2025-11-09', tipoIncidente: 'Atraso', horaLlegada: '08:15', horaEsperada: '08:00', minutos: 15, motivo: 'Problema con transporte público', documento: 'N/A', fechaSolicitud: '2025-11-09', estado: 'Rechazado' },
  { id: 5, empleado: 'Ana Torres', cedula: '001-3456789-0', fecha: '2025-11-08', tipoIncidente: 'Salida Anticipada', horaSalida: '16:00', horaEsperada: '17:00', minutos: 60, motivo: 'Cita médica de emergencia', documento: 'comprobante-cita-007.pdf', fechaSolicitud: '2025-11-08', estado: 'Aprobado' },
];

export const demoCambiosTurno = [
  { id: 1, empleado: 'Juan Pérez', cedula: '001-1234567-8', fecha: '2025-11-12', turnoActual: 'Turno Diurno (08:00-17:00)', turnoSolicitado: 'Turno Nocturno (20:00-05:00)', motivo: 'Necesidad de atender asunto personal en horario diurno', fechaSolicitud: '2025-11-05', estado: 'Pendiente' },
  { id: 2, empleado: 'Roberto Silva', cedula: '001-2345678-9', fecha: '2025-11-14', turnoActual: 'Rotativo A (06:00-14:00)', turnoSolicitado: 'Día Libre', motivo: 'Cita médica especializada no reprogramable', fechaSolicitud: '2025-11-06', estado: 'Pendiente' },
  { id: 3, empleado: 'María García', cedula: '001-9876543-2', fecha: '2025-11-10', turnoActual: 'Turno Diurno (08:00-17:00)', turnoSolicitado: 'Rotativo B (14:00-22:00)', motivo: 'Curso de capacitación en horario matutino', fechaSolicitud: '2025-11-03', estado: 'Aprobado' },
  { id: 4, empleado: 'Carlos Mendoza', cedula: '001-5678901-3', fecha: '2025-11-13', turnoActual: 'Turno Diurno (08:00-17:00)', turnoSolicitado: 'Día Libre', motivo: 'Emergencia familiar', fechaSolicitud: '2025-11-08', estado: 'Aprobado' },
];

export const demoCorreccionesMarcacion = [
  { id: 1, empleado: 'Juan Pérez', cedula: '001-1234567-8', fecha: '2025-11-07', tipoError: 'Marcación Olvidada', horaReal: '08:00', movimientoReal: 'Entrada Trabajo', movimientoRegistrado: 'N/A', motivo: 'Olvidé marcar en el dispositivo biométrico al entrar', testigo: 'Carlos Mendoza - Supervisor', fechaSolicitud: '2025-11-07', estado: 'Pendiente' },
  { id: 2, empleado: 'María García', cedula: '001-9876543-2', fecha: '2025-11-08', tipoError: 'Movimiento Errado', horaReal: '17:00', movimientoReal: 'Salida Trabajo', movimientoRegistrado: 'Entrada Trabajo', motivo: 'Presioné el botón equivocado en el terminal', testigo: 'Ana Torres - Compañera de área', fechaSolicitud: '2025-11-08', estado: 'Pendiente' },
  { id: 3, empleado: 'Roberto Silva', cedula: '001-2345678-9', fecha: '2025-11-06', tipoError: 'Marcación Olvidada', horaReal: '14:00', movimientoReal: 'Salida Trabajo', movimientoRegistrado: 'N/A', motivo: 'Salí rápido por emergencia y olvidé marcar', testigo: 'Supervisor de Turno', fechaSolicitud: '2025-11-07', estado: 'Aprobado' },
  { id: 4, empleado: 'Ana Torres', cedula: '001-3456789-0', fecha: '2025-11-09', tipoError: 'Movimiento Errado', horaReal: '12:00', movimientoReal: 'Inicio Almuerzo', movimientoRegistrado: 'Fin Almuerzo', motivo: 'Error al seleccionar opción en pantalla táctil', testigo: 'María García', fechaSolicitud: '2025-11-09', estado: 'Aprobado' },
  { id: 5, empleado: 'Carlos Mendoza', cedula: '001-5678901-3', fecha: '2025-11-08', tipoError: 'Marcación Olvidada', horaReal: '13:00', movimientoReal: 'Fin Almuerzo', movimientoRegistrado: 'N/A', motivo: 'Dispositivo no reconoció mi huella, tuve que irme', testigo: 'Juan Pérez', fechaSolicitud: '2025-11-08', estado: 'Rechazado' },
];
