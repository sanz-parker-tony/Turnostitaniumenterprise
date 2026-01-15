-- ============================================
-- 🎯 SCRIPT COMPLETO PARA ALIMENTAR SISTEMA DE PERMISOS
-- ============================================
-- Sistema: Turnos Titanium
-- Descripción: Alimenta Menu_Groups, Screens, Screen_Actions y asigna permisos al rol Admin
-- Autor: Sistema
-- Fecha: 2025-01-03

-- ============================================
-- 1️⃣ LIMPIAR DATOS EXISTENTES (OPCIONAL)
-- ============================================
-- Descomenta si quieres empezar desde cero

/*
DELETE FROM role_screen_actions;
DELETE FROM screen_actions;
DELETE FROM screens;
DELETE FROM menu_groups;
*/

-- ============================================
-- 2️⃣ INSERTAR MENU_GROUPS (Módulos Principales)
-- ============================================

INSERT INTO menu_groups (menu_group_id, menu_group_name, icon_name, display_order, is_active, created_by)
VALUES
  -- Dashboard
  ('mod-1', 'Dashboard', 'LayoutDashboard', 1, true, 'system'),
  
  -- Mantenimiento
  ('mod-2', 'Mantenimiento', 'Settings', 2, true, 'system'),
  
  -- Configuración
  ('mod-3', 'Configuración', 'Wrench', 3, true, 'system'),
  
  -- Perfiles
  ('mod-4', 'Perfiles', 'UserCircle', 4, true, 'system'),
  
  -- Empresas
  ('mod-5', 'Empresas', 'Building2', 5, true, 'system'),
  
  -- Empleados
  ('mod-6', 'Empleados', 'Users', 6, true, 'system'),
  
  -- Requerimientos/Solicitudes
  ('mod-7', 'Solicitudes', 'FileText', 7, true, 'system'),
  
  -- Procesos
  ('mod-8', 'Procesos', 'Cog', 8, true, 'system'),
  
  -- Sincronización
  ('mod-9', 'Sincronización', 'RefreshCw', 9, true, 'system'),
  
  -- Reportería
  ('mod-10', 'Reportería', 'BarChart3', 10, true, 'system'),
  
  -- Seguridad
  ('mod-11', 'Seguridad', 'Shield', 11, true, 'system'),
  
  -- Usuarios
  ('mod-12', 'Usuarios', 'UserCog', 12, true, 'system')
ON CONFLICT (menu_group_id) DO UPDATE SET
  menu_group_name = EXCLUDED.menu_group_name,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- ============================================
-- 3️⃣ INSERTAR SCREENS (Pantallas por Módulo)
-- ============================================

INSERT INTO screens (screen_key, screen_name, menu_group_id, icon_name, display_order, is_active, created_by)
VALUES
  -- ========== MOD-1: DASHBOARD ==========
  ('DASH_MAIN', 'Dashboard Principal', 'mod-1', 'LayoutDashboard', 1, true, 'system'),
  
  -- ========== MOD-2: MANTENIMIENTO ==========
  ('MANT_HOLIDAYS', 'Feriados', 'mod-2', 'Calendar', 1, true, 'system'),
  ('MANT_CATALOGS', 'Catálogos', 'mod-2', 'BookOpen', 2, true, 'system'),
  ('MANT_JUSTIFICATIONS', 'Justificaciones', 'mod-2', 'FileCheck', 3, true, 'system'),
  
  -- ========== MOD-3: CONFIGURACIÓN ==========
  ('CONF_SHIFTS', 'Turnos de Trabajo', 'mod-3', 'Clock', 1, true, 'system'),
  ('CONF_PARAMS', 'Parámetros del Sistema', 'mod-3', 'Sliders', 2, true, 'system'),
  ('CONF_DEVICES', 'Dispositivos Biométricos', 'mod-3', 'Fingerprint', 3, true, 'system'),
  ('CONF_MOVEMENTS', 'Movimientos', 'mod-3', 'ArrowRightLeft', 4, true, 'system'),
  ('CONF_NOVELTIES', 'Novedades', 'mod-3', 'AlertCircle', 5, true, 'system'),
  
  -- ========== MOD-4: PERFILES ==========
  ('PERF_LIST', 'Listado de Perfiles', 'mod-4', 'List', 1, true, 'system'),
  ('PERF_PARAMS', 'Parámetros de Perfil', 'mod-4', 'Settings', 2, true, 'system'),
  ('PERF_SHIFTS', 'Turnos del Perfil', 'mod-4', 'Clock', 3, true, 'system'),
  ('PERF_NOVELTIES', 'Novedades del Perfil', 'mod-4', 'Bell', 4, true, 'system'),
  
  -- ========== MOD-5: EMPRESAS ==========
  ('EMP_COMPANY', 'Empresas', 'mod-5', 'Building', 1, true, 'system'),
  ('EMP_LOCATION', 'Localidades', 'mod-5', 'MapPin', 2, true, 'system'),
  ('EMP_DEPARTMENT', 'Departamentos', 'mod-5', 'Briefcase', 3, true, 'system'),
  ('EMP_AREA', 'Áreas', 'mod-5', 'Grid', 4, true, 'system'),
  ('EMP_POSITION', 'Cargos', 'mod-5', 'Award', 5, true, 'system'),
  ('EMP_PAYROLL_ROLE', 'Roles de Nómina', 'mod-5', 'DollarSign', 6, true, 'system'),
  ('EMP_COST_CENTER', 'Centros de Costo', 'mod-5', 'PieChart', 7, true, 'system'),
  ('EMP_GROUP', 'Grupos de Empleados', 'mod-5', 'Users', 8, true, 'system'),
  
  -- ========== MOD-6: EMPLEADOS ==========
  ('EMPL_LIST', 'Listado de Empleados', 'mod-6', 'Users', 1, true, 'system'),
  ('EMPL_SHIFTS', 'Horarios Asignados', 'mod-6', 'Calendar', 2, true, 'system'),
  ('EMPL_PUNCHES', 'Marcaciones', 'mod-6', 'Clock', 3, true, 'system'),
  ('EMPL_JUSTIFICATIONS', 'Justificaciones de Empleados', 'mod-6', 'FileText', 4, true, 'system'),
  ('EMPL_PLAN_AI', 'Planificación con IA', 'mod-6', 'Brain', 5, true, 'system'),
  
  -- ========== MOD-7: SOLICITUDES/REQUERIMIENTOS ==========
  ('REQ_PERMITS', 'Solicitudes de Permisos', 'mod-7', 'FileSignature', 1, true, 'system'),
  ('REQ_JUSTIFICATIONS', 'Solicitudes de Justificaciones', 'mod-7', 'FileCheck', 2, true, 'system'),
  ('REQ_SHIFT_CHANGES', 'Cambios de Turno', 'mod-7', 'RefreshCw', 3, true, 'system'),
  ('REQ_REGULARIZATION', 'Regularización', 'mod-7', 'CheckCircle', 4, true, 'system'),
  
  -- ========== MOD-8: PROCESOS ==========
  ('PROC_PURGE', 'Depuración de Datos', 'mod-8', 'Trash2', 1, true, 'system'),
  ('PROC_SETTLEMENT', 'Liquidación', 'mod-8', 'Calculator', 2, true, 'system'),
  ('PROC_GENERATION', 'Generación de Reportes', 'mod-8', 'FileOutput', 3, true, 'system'),
  ('PROC_APPROVAL', 'Aprobación de Procesos', 'mod-8', 'CheckSquare', 4, true, 'system'),
  ('PROC_ADMIN', 'Administración de Procesos', 'mod-8', 'Settings', 5, true, 'system'),
  
  -- ========== MOD-9: SINCRONIZACIÓN ==========
  ('SYNC_IMPORT_EMP', 'Importación de Empleados', 'mod-9', 'Upload', 1, true, 'system'),
  ('SYNC_IMPORT_PUNCHES', 'Importación de Marcaciones', 'mod-9', 'Download', 2, true, 'system'),
  ('SYNC_EXPORT_PAYROLL', 'Exportación a Nómina', 'mod-9', 'FileSpreadsheet', 3, true, 'system'),
  
  -- ========== MOD-10: REPORTERÍA ==========
  ('RPT_AVAILABLE', 'Reportes Disponibles', 'mod-10', 'FolderOpen', 1, true, 'system'),
  ('RPT_ATTENDANCE', 'Reporte de Asistencia', 'mod-10', 'ClipboardList', 2, true, 'system'),
  ('RPT_NOVELTIES', 'Reporte de Novedades', 'mod-10', 'FileText', 3, true, 'system'),
  ('RPT_ANALYTICS', 'Reportes Analíticos', 'mod-10', 'TrendingUp', 4, true, 'system'),
  
  -- ========== MOD-11: SEGURIDAD ==========
  ('SEC_DASHBOARD', 'Dashboard de Seguridad', 'mod-11', 'Shield', 1, true, 'system'),
  ('SEC_SCREENS', 'Pantallas', 'mod-11', 'Monitor', 2, true, 'system'),
  ('SEC_ACTIONS', 'Acciones', 'mod-11', 'Zap', 3, true, 'system'),
  ('SEC_SCREEN_ACTIONS', 'Acciones de Pantalla', 'mod-11', 'Link', 4, true, 'system'),
  ('SEC_ROLES', 'Roles', 'mod-11', 'UserCheck', 5, true, 'system'),
  ('SEC_ROLE_PERMS', 'Permisos de Rol', 'mod-11', 'Key', 6, true, 'system'),
  ('SEC_USER_ROLES', 'Asignación de Roles', 'mod-11', 'UserPlus', 7, true, 'system'),
  ('SEC_SCOPES', 'Scopes de Acceso', 'mod-11', 'Eye', 8, true, 'system'),
  ('SEC_COPY_PERMS', 'Copiar Permisos', 'mod-11', 'Copy', 9, true, 'system'),
  ('SEC_AUDIT', 'Auditoría', 'mod-11', 'FileSearch', 10, true, 'system'),
  
  -- ========== MOD-12: USUARIOS ==========
  ('USR_COPY_PERMS', 'Copiar Permisos de Usuario', 'mod-12', 'Copy', 1, true, 'system'),
  ('USR_ACTION_PERMS', 'Permisos de Acciones', 'mod-12', 'MousePointerClick', 2, true, 'system'),
  ('USR_INFO_PERMS', 'Permisos de Información', 'mod-12', 'Info', 3, true, 'system'),
  ('USR_PRINT_PERMS', 'Permisos de Impresión', 'mod-12', 'Printer', 4, true, 'system')
ON CONFLICT (screen_key) DO UPDATE SET
  screen_name = EXCLUDED.screen_name,
  menu_group_id = EXCLUDED.menu_group_id,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- ============================================
-- 4️⃣ INSERTAR SCREEN_ACTIONS (Acciones/Botones por Pantalla)
-- ============================================

INSERT INTO screen_actions (screen_action_id, screen_key, action_code, action_name, is_active, created_by)
VALUES
  -- ========== DASHBOARD ==========
  ('SA-DASH-001', 'DASH_MAIN', 'VIEW', 'Ver Dashboard', true, 'system'),
  ('SA-DASH-002', 'DASH_MAIN', 'REFRESH', 'Refrescar Datos', true, 'system'),
  ('SA-DASH-003', 'DASH_MAIN', 'EXPORT', 'Exportar Métricas', true, 'system'),
  
  -- ========== MANTENIMIENTO - FERIADOS ==========
  ('SA-MFERI-001', 'MANT_HOLIDAYS', 'VIEW', 'Ver Feriados', true, 'system'),
  ('SA-MFERI-002', 'MANT_HOLIDAYS', 'CREATE', 'Crear Feriado', true, 'system'),
  ('SA-MFERI-003', 'MANT_HOLIDAYS', 'EDIT', 'Editar Feriado', true, 'system'),
  ('SA-MFERI-004', 'MANT_HOLIDAYS', 'DELETE', 'Eliminar Feriado', true, 'system'),
  ('SA-MFERI-005', 'MANT_HOLIDAYS', 'IMPORT', 'Importar Feriados', true, 'system'),
  
  -- ========== MANTENIMIENTO - CATÁLOGOS ==========
  ('SA-MCATA-001', 'MANT_CATALOGS', 'VIEW', 'Ver Catálogos', true, 'system'),
  ('SA-MCATA-002', 'MANT_CATALOGS', 'CREATE', 'Crear Catálogo', true, 'system'),
  ('SA-MCATA-003', 'MANT_CATALOGS', 'EDIT', 'Editar Catálogo', true, 'system'),
  ('SA-MCATA-004', 'MANT_CATALOGS', 'DELETE', 'Eliminar Catálogo', true, 'system'),
  
  -- ========== MANTENIMIENTO - JUSTIFICACIONES ==========
  ('SA-MJUST-001', 'MANT_JUSTIFICATIONS', 'VIEW', 'Ver Justificaciones', true, 'system'),
  ('SA-MJUST-002', 'MANT_JUSTIFICATIONS', 'CREATE', 'Crear Justificación', true, 'system'),
  ('SA-MJUST-003', 'MANT_JUSTIFICATIONS', 'EDIT', 'Editar Justificación', true, 'system'),
  ('SA-MJUST-004', 'MANT_JUSTIFICATIONS', 'DELETE', 'Eliminar Justificación', true, 'system'),
  
  -- ========== CONFIGURACIÓN - TURNOS ==========
  ('SA-CTURN-001', 'CONF_SHIFTS', 'VIEW', 'Ver Turnos', true, 'system'),
  ('SA-CTURN-002', 'CONF_SHIFTS', 'CREATE', 'Crear Turno', true, 'system'),
  ('SA-CTURN-003', 'CONF_SHIFTS', 'EDIT', 'Editar Turno', true, 'system'),
  ('SA-CTURN-004', 'CONF_SHIFTS', 'DELETE', 'Eliminar Turno', true, 'system'),
  ('SA-CTURN-005', 'CONF_SHIFTS', 'DUPLICATE', 'Duplicar Turno', true, 'system'),
  
  -- ========== CONFIGURACIÓN - PARÁMETROS ==========
  ('SA-CPARA-001', 'CONF_PARAMS', 'VIEW', 'Ver Parámetros', true, 'system'),
  ('SA-CPARA-002', 'CONF_PARAMS', 'EDIT', 'Editar Parámetros', true, 'system'),
  ('SA-CPARA-003', 'CONF_PARAMS', 'RESET', 'Restablecer Defaults', true, 'system'),
  
  -- ========== CONFIGURACIÓN - DISPOSITIVOS ==========
  ('SA-CDISP-001', 'CONF_DEVICES', 'VIEW', 'Ver Dispositivos', true, 'system'),
  ('SA-CDISP-002', 'CONF_DEVICES', 'CREATE', 'Crear Dispositivo', true, 'system'),
  ('SA-CDISP-003', 'CONF_DEVICES', 'EDIT', 'Editar Dispositivo', true, 'system'),
  ('SA-CDISP-004', 'CONF_DEVICES', 'DELETE', 'Eliminar Dispositivo', true, 'system'),
  ('SA-CDISP-005', 'CONF_DEVICES', 'SYNC', 'Sincronizar Dispositivo', true, 'system'),
  
  -- ========== CONFIGURACIÓN - MOVIMIENTOS ==========
  ('SA-CMOVI-001', 'CONF_MOVEMENTS', 'VIEW', 'Ver Movimientos', true, 'system'),
  ('SA-CMOVI-002', 'CONF_MOVEMENTS', 'CREATE', 'Crear Movimiento', true, 'system'),
  ('SA-CMOVI-003', 'CONF_MOVEMENTS', 'EDIT', 'Editar Movimiento', true, 'system'),
  ('SA-CMOVI-004', 'CONF_MOVEMENTS', 'DELETE', 'Eliminar Movimiento', true, 'system'),
  
  -- ========== CONFIGURACIÓN - NOVEDADES ==========
  ('SA-CNOVE-001', 'CONF_NOVELTIES', 'VIEW', 'Ver Novedades', true, 'system'),
  ('SA-CNOVE-002', 'CONF_NOVELTIES', 'CREATE', 'Crear Novedad', true, 'system'),
  ('SA-CNOVE-003', 'CONF_NOVELTIES', 'EDIT', 'Editar Novedad', true, 'system'),
  ('SA-CNOVE-004', 'CONF_NOVELTIES', 'DELETE', 'Eliminar Novedad', true, 'system'),
  
  -- ========== PERFILES - LISTADO ==========
  ('SA-PLIST-001', 'PERF_LIST', 'VIEW', 'Ver Perfiles', true, 'system'),
  ('SA-PLIST-002', 'PERF_LIST', 'CREATE', 'Crear Perfil', true, 'system'),
  ('SA-PLIST-003', 'PERF_LIST', 'EDIT', 'Editar Perfil', true, 'system'),
  ('SA-PLIST-004', 'PERF_LIST', 'DELETE', 'Eliminar Perfil', true, 'system'),
  ('SA-PLIST-005', 'PERF_LIST', 'DUPLICATE', 'Duplicar Perfil', true, 'system'),
  
  -- ========== PERFILES - PARÁMETROS ==========
  ('SA-PPARA-001', 'PERF_PARAMS', 'VIEW', 'Ver Parámetros', true, 'system'),
  ('SA-PPARA-002', 'PERF_PARAMS', 'EDIT', 'Editar Parámetros', true, 'system'),
  
  -- ========== PERFILES - TURNOS ==========
  ('SA-PTURN-001', 'PERF_SHIFTS', 'VIEW', 'Ver Turnos del Perfil', true, 'system'),
  ('SA-PTURN-002', 'PERF_SHIFTS', 'ASSIGN', 'Asignar Turnos', true, 'system'),
  ('SA-PTURN-003', 'PERF_SHIFTS', 'REMOVE', 'Remover Turnos', true, 'system'),
  
  -- ========== PERFILES - NOVEDADES ==========
  ('SA-PNOVE-001', 'PERF_NOVELTIES', 'VIEW', 'Ver Novedades', true, 'system'),
  ('SA-PNOVE-002', 'PERF_NOVELTIES', 'ASSIGN', 'Asignar Novedades', true, 'system'),
  ('SA-PNOVE-003', 'PERF_NOVELTIES', 'REMOVE', 'Remover Novedades', true, 'system'),
  
  -- ========== EMPRESAS - EMPRESAS ==========
  ('SA-EEMP-001', 'EMP_COMPANY', 'VIEW', 'Ver Empresas', true, 'system'),
  ('SA-EEMP-002', 'EMP_COMPANY', 'CREATE', 'Crear Empresa', true, 'system'),
  ('SA-EEMP-003', 'EMP_COMPANY', 'EDIT', 'Editar Empresa', true, 'system'),
  ('SA-EEMP-004', 'EMP_COMPANY', 'DELETE', 'Eliminar Empresa', true, 'system'),
  
  -- ========== EMPRESAS - LOCALIDADES ==========
  ('SA-ELOC-001', 'EMP_LOCATION', 'VIEW', 'Ver Localidades', true, 'system'),
  ('SA-ELOC-002', 'EMP_LOCATION', 'CREATE', 'Crear Localidad', true, 'system'),
  ('SA-ELOC-003', 'EMP_LOCATION', 'EDIT', 'Editar Localidad', true, 'system'),
  ('SA-ELOC-004', 'EMP_LOCATION', 'DELETE', 'Eliminar Localidad', true, 'system'),
  
  -- ========== EMPRESAS - DEPARTAMENTOS ==========
  ('SA-EDEP-001', 'EMP_DEPARTMENT', 'VIEW', 'Ver Departamentos', true, 'system'),
  ('SA-EDEP-002', 'EMP_DEPARTMENT', 'CREATE', 'Crear Departamento', true, 'system'),
  ('SA-EDEP-003', 'EMP_DEPARTMENT', 'EDIT', 'Editar Departamento', true, 'system'),
  ('SA-EDEP-004', 'EMP_DEPARTMENT', 'DELETE', 'Eliminar Departamento', true, 'system'),
  
  -- ========== EMPRESAS - ÁREAS ==========
  ('SA-EARE-001', 'EMP_AREA', 'VIEW', 'Ver Áreas', true, 'system'),
  ('SA-EARE-002', 'EMP_AREA', 'CREATE', 'Crear Área', true, 'system'),
  ('SA-EARE-003', 'EMP_AREA', 'EDIT', 'Editar Área', true, 'system'),
  ('SA-EARE-004', 'EMP_AREA', 'DELETE', 'Eliminar Área', true, 'system'),
  
  -- ========== EMPRESAS - CARGOS ==========
  ('SA-ECAR-001', 'EMP_POSITION', 'VIEW', 'Ver Cargos', true, 'system'),
  ('SA-ECAR-002', 'EMP_POSITION', 'CREATE', 'Crear Cargo', true, 'system'),
  ('SA-ECAR-003', 'EMP_POSITION', 'EDIT', 'Editar Cargo', true, 'system'),
  ('SA-ECAR-004', 'EMP_POSITION', 'DELETE', 'Eliminar Cargo', true, 'system'),
  
  -- ========== EMPRESAS - ROLES DE NÓMINA ==========
  ('SA-EROL-001', 'EMP_PAYROLL_ROLE', 'VIEW', 'Ver Roles', true, 'system'),
  ('SA-EROL-002', 'EMP_PAYROLL_ROLE', 'CREATE', 'Crear Rol', true, 'system'),
  ('SA-EROL-003', 'EMP_PAYROLL_ROLE', 'EDIT', 'Editar Rol', true, 'system'),
  ('SA-EROL-004', 'EMP_PAYROLL_ROLE', 'DELETE', 'Eliminar Rol', true, 'system'),
  
  -- ========== EMPRESAS - CENTROS DE COSTO ==========
  ('SA-ECEN-001', 'EMP_COST_CENTER', 'VIEW', 'Ver Centros de Costo', true, 'system'),
  ('SA-ECEN-002', 'EMP_COST_CENTER', 'CREATE', 'Crear Centro de Costo', true, 'system'),
  ('SA-ECEN-003', 'EMP_COST_CENTER', 'EDIT', 'Editar Centro de Costo', true, 'system'),
  ('SA-ECEN-004', 'EMP_COST_CENTER', 'DELETE', 'Eliminar Centro de Costo', true, 'system'),
  
  -- ========== EMPRESAS - GRUPOS ==========
  ('SA-EGRU-001', 'EMP_GROUP', 'VIEW', 'Ver Grupos', true, 'system'),
  ('SA-EGRU-002', 'EMP_GROUP', 'CREATE', 'Crear Grupo', true, 'system'),
  ('SA-EGRU-003', 'EMP_GROUP', 'EDIT', 'Editar Grupo', true, 'system'),
  ('SA-EGRU-004', 'EMP_GROUP', 'DELETE', 'Eliminar Grupo', true, 'system'),
  
  -- ========== EMPLEADOS - LISTADO ==========
  ('SA-EMLIST-001', 'EMPL_LIST', 'VIEW', 'Ver Empleados', true, 'system'),
  ('SA-EMLIST-002', 'EMPL_LIST', 'CREATE', 'Crear Empleado', true, 'system'),
  ('SA-EMLIST-003', 'EMPL_LIST', 'EDIT', 'Editar Empleado', true, 'system'),
  ('SA-EMLIST-004', 'EMPL_LIST', 'DELETE', 'Eliminar Empleado', true, 'system'),
  ('SA-EMLIST-005', 'EMPL_LIST', 'EXPORT', 'Exportar Empleados', true, 'system'),
  ('SA-EMLIST-006', 'EMPL_LIST', 'IMPORT', 'Importar Empleados', true, 'system'),
  
  -- ========== EMPLEADOS - HORARIOS ==========
  ('SA-EMHOR-001', 'EMPL_SHIFTS', 'VIEW', 'Ver Horarios', true, 'system'),
  ('SA-EMHOR-002', 'EMPL_SHIFTS', 'ASSIGN', 'Asignar Horario', true, 'system'),
  ('SA-EMHOR-003', 'EMPL_SHIFTS', 'EDIT', 'Editar Horario', true, 'system'),
  ('SA-EMHOR-004', 'EMPL_SHIFTS', 'DELETE', 'Eliminar Horario', true, 'system'),
  
  -- ========== EMPLEADOS - MARCACIONES ==========
  ('SA-EMMAR-001', 'EMPL_PUNCHES', 'VIEW', 'Ver Marcaciones', true, 'system'),
  ('SA-EMMAR-002', 'EMPL_PUNCHES', 'CREATE', 'Registrar Marcación Manual', true, 'system'),
  ('SA-EMMAR-003', 'EMPL_PUNCHES', 'EDIT', 'Editar Marcación', true, 'system'),
  ('SA-EMMAR-004', 'EMPL_PUNCHES', 'DELETE', 'Eliminar Marcación', true, 'system'),
  ('SA-EMMAR-005', 'EMPL_PUNCHES', 'EXPORT', 'Exportar Marcaciones', true, 'system'),
  
  -- ========== EMPLEADOS - JUSTIFICACIONES ==========
  ('SA-EMJUS-001', 'EMPL_JUSTIFICATIONS', 'VIEW', 'Ver Justificaciones', true, 'system'),
  ('SA-EMJUS-002', 'EMPL_JUSTIFICATIONS', 'CREATE', 'Crear Justificación', true, 'system'),
  ('SA-EMJUS-003', 'EMPL_JUSTIFICATIONS', 'EDIT', 'Editar Justificación', true, 'system'),
  ('SA-EMJUS-004', 'EMPL_JUSTIFICATIONS', 'DELETE', 'Eliminar Justificación', true, 'system'),
  ('SA-EMJUS-005', 'EMPL_JUSTIFICATIONS', 'APPROVE', 'Aprobar Justificación', true, 'system'),
  ('SA-EMJUS-006', 'EMPL_JUSTIFICATIONS', 'REJECT', 'Rechazar Justificación', true, 'system'),
  
  -- ========== EMPLEADOS - PLANIFICACIÓN IA ==========
  ('SA-EMPIA-001', 'EMPL_PLAN_AI', 'VIEW', 'Ver Planificación', true, 'system'),
  ('SA-EMPIA-002', 'EMPL_PLAN_AI', 'GENERATE', 'Generar con IA', true, 'system'),
  ('SA-EMPIA-003', 'EMPL_PLAN_AI', 'EDIT', 'Editar Planificación', true, 'system'),
  ('SA-EMPIA-004', 'EMPL_PLAN_AI', 'APPROVE', 'Aprobar Planificación', true, 'system'),
  
  -- ========== SOLICITUDES - PERMISOS ==========
  ('SA-RQPER-001', 'REQ_PERMITS', 'VIEW', 'Ver Solicitudes', true, 'system'),
  ('SA-RQPER-002', 'REQ_PERMITS', 'CREATE', 'Crear Solicitud', true, 'system'),
  ('SA-RQPER-003', 'REQ_PERMITS', 'EDIT', 'Editar Solicitud', true, 'system'),
  ('SA-RQPER-004', 'REQ_PERMITS', 'DELETE', 'Eliminar Solicitud', true, 'system'),
  ('SA-RQPER-005', 'REQ_PERMITS', 'APPROVE', 'Aprobar Solicitud', true, 'system'),
  ('SA-RQPER-006', 'REQ_PERMITS', 'REJECT', 'Rechazar Solicitud', true, 'system'),
  
  -- ========== SOLICITUDES - JUSTIFICACIONES ==========
  ('SA-RQJUS-001', 'REQ_JUSTIFICATIONS', 'VIEW', 'Ver Solicitudes', true, 'system'),
  ('SA-RQJUS-002', 'REQ_JUSTIFICATIONS', 'CREATE', 'Crear Solicitud', true, 'system'),
  ('SA-RQJUS-003', 'REQ_JUSTIFICATIONS', 'APPROVE', 'Aprobar Solicitud', true, 'system'),
  ('SA-RQJUS-004', 'REQ_JUSTIFICATIONS', 'REJECT', 'Rechazar Solicitud', true, 'system'),
  
  -- ========== SOLICITUDES - CAMBIOS DE TURNO ==========
  ('SA-RQCAM-001', 'REQ_SHIFT_CHANGES', 'VIEW', 'Ver Cambios', true, 'system'),
  ('SA-RQCAM-002', 'REQ_SHIFT_CHANGES', 'CREATE', 'Solicitar Cambio', true, 'system'),
  ('SA-RQCAM-003', 'REQ_SHIFT_CHANGES', 'APPROVE', 'Aprobar Cambio', true, 'system'),
  ('SA-RQCAM-004', 'REQ_SHIFT_CHANGES', 'REJECT', 'Rechazar Cambio', true, 'system'),
  
  -- ========== SOLICITUDES - REGULARIZACIÓN ==========
  ('SA-RQREG-001', 'REQ_REGULARIZATION', 'VIEW', 'Ver Regularizaciones', true, 'system'),
  ('SA-RQREG-002', 'REQ_REGULARIZATION', 'CREATE', 'Crear Regularización', true, 'system'),
  ('SA-RQREG-003', 'REQ_REGULARIZATION', 'APPROVE', 'Aprobar Regularización', true, 'system'),
  ('SA-RQREG-004', 'REQ_REGULARIZATION', 'REJECT', 'Rechazar Regularización', true, 'system'),
  
  -- ========== PROCESOS - DEPURACIÓN ==========
  ('SA-PRDEP-001', 'PROC_PURGE', 'VIEW', 'Ver Proceso', true, 'system'),
  ('SA-PRDEP-002', 'PROC_PURGE', 'EXECUTE', 'Ejecutar Depuración', true, 'system'),
  ('SA-PRDEP-003', 'PROC_PURGE', 'SCHEDULE', 'Programar Depuración', true, 'system'),
  
  -- ========== PROCESOS - LIQUIDACIÓN ==========
  ('SA-PRLIQ-001', 'PROC_SETTLEMENT', 'VIEW', 'Ver Liquidaciones', true, 'system'),
  ('SA-PRLIQ-002', 'PROC_SETTLEMENT', 'EXECUTE', 'Ejecutar Liquidación', true, 'system'),
  ('SA-PRLIQ-003', 'PROC_SETTLEMENT', 'APPROVE', 'Aprobar Liquidación', true, 'system'),
  
  -- ========== PROCESOS - GENERACIÓN ==========
  ('SA-PRGEN-001', 'PROC_GENERATION', 'VIEW', 'Ver Generación', true, 'system'),
  ('SA-PRGEN-002', 'PROC_GENERATION', 'EXECUTE', 'Ejecutar Generación', true, 'system'),
  
  -- ========== PROCESOS - APROBACIÓN ==========
  ('SA-PRAPR-001', 'PROC_APPROVAL', 'VIEW', 'Ver Aprobaciones', true, 'system'),
  ('SA-PRAPR-002', 'PROC_APPROVAL', 'APPROVE', 'Aprobar Proceso', true, 'system'),
  ('SA-PRAPR-003', 'PROC_APPROVAL', 'REJECT', 'Rechazar Proceso', true, 'system'),
  
  -- ========== PROCESOS - ADMINISTRACIÓN ==========
  ('SA-PRAD-001', 'PROC_ADMIN', 'VIEW', 'Ver Procesos', true, 'system'),
  ('SA-PRAD-002', 'PROC_ADMIN', 'EDIT', 'Editar Proceso', true, 'system'),
  ('SA-PRAD-003', 'PROC_ADMIN', 'DELETE', 'Eliminar Proceso', true, 'system'),
  
  -- ========== SINCRONIZACIÓN - IMPORTACIÓN EMPLEADOS ==========
  ('SA-SYIEM-001', 'SYNC_IMPORT_EMP', 'VIEW', 'Ver Importaciones', true, 'system'),
  ('SA-SYIEM-002', 'SYNC_IMPORT_EMP', 'IMPORT', 'Importar Empleados', true, 'system'),
  ('SA-SYIEM-003', 'SYNC_IMPORT_EMP', 'VALIDATE', 'Validar Importación', true, 'system'),
  
  -- ========== SINCRONIZACIÓN - IMPORTACIÓN MARCACIONES ==========
  ('SA-SYIMA-001', 'SYNC_IMPORT_PUNCHES', 'VIEW', 'Ver Importaciones', true, 'system'),
  ('SA-SYIMA-002', 'SYNC_IMPORT_PUNCHES', 'IMPORT', 'Importar Marcaciones', true, 'system'),
  ('SA-SYIMA-003', 'SYNC_IMPORT_PUNCHES', 'VALIDATE', 'Validar Importación', true, 'system'),
  
  -- ========== SINCRONIZACIÓN - EXPORTACIÓN NÓMINA ==========
  ('SA-SYENO-001', 'SYNC_EXPORT_PAYROLL', 'VIEW', 'Ver Exportaciones', true, 'system'),
  ('SA-SYENO-002', 'SYNC_EXPORT_PAYROLL', 'EXPORT', 'Exportar a Nómina', true, 'system'),
  ('SA-SYENO-003', 'SYNC_EXPORT_PAYROLL', 'DOWNLOAD', 'Descargar Archivo', true, 'system'),
  
  -- ========== REPORTERÍA - REPORTES DISPONIBLES ==========
  ('SA-RPAVA-001', 'RPT_AVAILABLE', 'VIEW', 'Ver Reportes', true, 'system'),
  ('SA-RPAVA-002', 'RPT_AVAILABLE', 'EXECUTE', 'Ejecutar Reporte', true, 'system'),
  ('SA-RPAVA-003', 'RPT_AVAILABLE', 'DOWNLOAD', 'Descargar Reporte', true, 'system'),
  
  -- ========== REPORTERÍA - ASISTENCIA ==========
  ('SA-RPASI-001', 'RPT_ATTENDANCE', 'VIEW', 'Ver Reporte', true, 'system'),
  ('SA-RPASI-002', 'RPT_ATTENDANCE', 'EXPORT', 'Exportar Reporte', true, 'system'),
  ('SA-RPASI-003', 'RPT_ATTENDANCE', 'PRINT', 'Imprimir Reporte', true, 'system'),
  
  -- ========== REPORTERÍA - NOVEDADES ==========
  ('SA-RPNOV-001', 'RPT_NOVELTIES', 'VIEW', 'Ver Reporte', true, 'system'),
  ('SA-RPNOV-002', 'RPT_NOVELTIES', 'EXPORT', 'Exportar Reporte', true, 'system'),
  ('SA-RPNOV-003', 'RPT_NOVELTIES', 'PRINT', 'Imprimir Reporte', true, 'system'),
  
  -- ========== REPORTERÍA - ANALÍTICOS ==========
  ('SA-RPANA-001', 'RPT_ANALYTICS', 'VIEW', 'Ver Analíticos', true, 'system'),
  ('SA-RPANA-002', 'RPT_ANALYTICS', 'EXPORT', 'Exportar Datos', true, 'system'),
  ('SA-RPANA-003', 'RPT_ANALYTICS', 'DASHBOARD', 'Ver Dashboard', true, 'system'),
  
  -- ========== SEGURIDAD - DASHBOARD ==========
  ('SA-SEDAS-001', 'SEC_DASHBOARD', 'VIEW', 'Ver Dashboard', true, 'system'),
  ('SA-SEDAS-002', 'SEC_DASHBOARD', 'REFRESH', 'Refrescar Datos', true, 'system'),
  
  -- ========== SEGURIDAD - PANTALLAS ==========
  ('SA-SEPAN-001', 'SEC_SCREENS', 'VIEW', 'Ver Pantallas', true, 'system'),
  ('SA-SEPAN-002', 'SEC_SCREENS', 'CREATE', 'Crear Pantalla', true, 'system'),
  ('SA-SEPAN-003', 'SEC_SCREENS', 'EDIT', 'Editar Pantalla', true, 'system'),
  ('SA-SEPAN-004', 'SEC_SCREENS', 'DELETE', 'Eliminar Pantalla', true, 'system'),
  
  -- ========== SEGURIDAD - ACCIONES ==========
  ('SA-SEACC-001', 'SEC_ACTIONS', 'VIEW', 'Ver Acciones', true, 'system'),
  ('SA-SEACC-002', 'SEC_ACTIONS', 'CREATE', 'Crear Acción', true, 'system'),
  ('SA-SEACC-003', 'SEC_ACTIONS', 'EDIT', 'Editar Acción', true, 'system'),
  ('SA-SEACC-004', 'SEC_ACTIONS', 'DELETE', 'Eliminar Acción', true, 'system'),
  
  -- ========== SEGURIDAD - ACCIONES DE PANTALLA ==========
  ('SA-SESPA-001', 'SEC_SCREEN_ACTIONS', 'VIEW', 'Ver Relaciones', true, 'system'),
  ('SA-SESPA-002', 'SEC_SCREEN_ACTIONS', 'ASSIGN', 'Asignar Acción', true, 'system'),
  ('SA-SESPA-003', 'SEC_SCREEN_ACTIONS', 'REMOVE', 'Remover Acción', true, 'system'),
  
  -- ========== SEGURIDAD - ROLES ==========
  ('SA-SEROL-001', 'SEC_ROLES', 'VIEW', 'Ver Roles', true, 'system'),
  ('SA-SEROL-002', 'SEC_ROLES', 'CREATE', 'Crear Rol', true, 'system'),
  ('SA-SEROL-003', 'SEC_ROLES', 'EDIT', 'Editar Rol', true, 'system'),
  ('SA-SEROL-004', 'SEC_ROLES', 'DELETE', 'Eliminar Rol', true, 'system'),
  
  -- ========== SEGURIDAD - PERMISOS DE ROL ==========
  ('SA-SEPER-001', 'SEC_ROLE_PERMS', 'VIEW', 'Ver Permisos', true, 'system'),
  ('SA-SEPER-002', 'SEC_ROLE_PERMS', 'ASSIGN', 'Asignar Permiso', true, 'system'),
  ('SA-SEPER-003', 'SEC_ROLE_PERMS', 'REMOVE', 'Remover Permiso', true, 'system'),
  ('SA-SEPER-004', 'SEC_ROLE_PERMS', 'COPY', 'Copiar Permisos', true, 'system'),
  
  -- ========== SEGURIDAD - ASIGNACIÓN DE ROLES ==========
  ('SA-SEURO-001', 'SEC_USER_ROLES', 'VIEW', 'Ver Asignaciones', true, 'system'),
  ('SA-SEURO-002', 'SEC_USER_ROLES', 'ASSIGN', 'Asignar Rol', true, 'system'),
  ('SA-SEURO-003', 'SEC_USER_ROLES', 'REMOVE', 'Remover Rol', true, 'system'),
  
  -- ========== SEGURIDAD - SCOPES ==========
  ('SA-SESCO-001', 'SEC_SCOPES', 'VIEW', 'Ver Scopes', true, 'system'),
  ('SA-SESCO-002', 'SEC_SCOPES', 'ASSIGN', 'Asignar Scope', true, 'system'),
  ('SA-SESCO-003', 'SEC_SCOPES', 'REMOVE', 'Remover Scope', true, 'system'),
  
  -- ========== SEGURIDAD - COPIAR PERMISOS ==========
  ('SA-SECOP-001', 'SEC_COPY_PERMS', 'VIEW', 'Ver Pantalla', true, 'system'),
  ('SA-SECOP-002', 'SEC_COPY_PERMS', 'COPY', 'Copiar Permisos', true, 'system'),
  
  -- ========== SEGURIDAD - AUDITORÍA ==========
  ('SA-SEAUD-001', 'SEC_AUDIT', 'VIEW', 'Ver Auditoría', true, 'system'),
  ('SA-SEAUD-002', 'SEC_AUDIT', 'EXPORT', 'Exportar Log', true, 'system'),
  ('SA-SEAUD-003', 'SEC_AUDIT', 'FILTER', 'Filtrar Eventos', true, 'system'),
  
  -- ========== USUARIOS - COPIAR PERMISOS ==========
  ('SA-USCOP-001', 'USR_COPY_PERMS', 'VIEW', 'Ver Pantalla', true, 'system'),
  ('SA-USCOP-002', 'USR_COPY_PERMS', 'COPY', 'Copiar Permisos', true, 'system'),
  
  -- ========== USUARIOS - PERMISOS DE ACCIONES ==========
  ('SA-USACC-001', 'USR_ACTION_PERMS', 'VIEW', 'Ver Permisos', true, 'system'),
  ('SA-USACC-002', 'USR_ACTION_PERMS', 'ASSIGN', 'Asignar Permiso', true, 'system'),
  ('SA-USACC-003', 'USR_ACTION_PERMS', 'REMOVE', 'Remover Permiso', true, 'system'),
  
  -- ========== USUARIOS - PERMISOS DE INFORMACIÓN ==========
  ('SA-USINF-001', 'USR_INFO_PERMS', 'VIEW', 'Ver Permisos', true, 'system'),
  ('SA-USINF-002', 'USR_INFO_PERMS', 'ASSIGN', 'Asignar Permiso', true, 'system'),
  ('SA-USINF-003', 'USR_INFO_PERMS', 'REMOVE', 'Remover Permiso', true, 'system'),
  
  -- ========== USUARIOS - PERMISOS DE IMPRESIÓN ==========
  ('SA-USPRI-001', 'USR_PRINT_PERMS', 'VIEW', 'Ver Permisos', true, 'system'),
  ('SA-USPRI-002', 'USR_PRINT_PERMS', 'ASSIGN', 'Asignar Permiso', true, 'system'),
  ('SA-USPRI-003', 'USR_PRINT_PERMS', 'REMOVE', 'Remover Permiso', true, 'system')
ON CONFLICT (screen_action_id) DO UPDATE SET
  action_code = EXCLUDED.action_code,
  action_name = EXCLUDED.action_name,
  is_active = EXCLUDED.is_active;

-- ============================================
-- 5️⃣ ASIGNAR TODOS LOS PERMISOS AL ROL ADMIN
-- ============================================

-- Obtener el role_id del administrador
DO $$
DECLARE
  v_admin_role_id TEXT;
BEGIN
  -- Buscar el rol de administrador
  SELECT role_id INTO v_admin_role_id
  FROM roles
  WHERE role_name = 'Administrador' OR role_code = 'ADMIN'
  LIMIT 1;

  -- Si no existe, crearlo
  IF v_admin_role_id IS NULL THEN
    INSERT INTO roles (role_id, role_code, role_name, is_active, created_by)
    VALUES ('ROLE-ADMIN', 'ADMIN', 'Administrador', true, 'system')
    RETURNING role_id INTO v_admin_role_id;
  END IF;

  -- Asignar TODAS las acciones al rol admin
  INSERT INTO role_screen_actions (role_id, screen_action_id, created_by)
  SELECT v_admin_role_id, screen_action_id, 'system'
  FROM screen_actions
  WHERE is_active = true
  ON CONFLICT (role_id, screen_action_id) DO NOTHING;

  RAISE NOTICE 'Se asignaron % permisos al rol de Administrador', (
    SELECT COUNT(*) FROM role_screen_actions WHERE role_id = v_admin_role_id
  );
END $$;

-- ============================================
-- 6️⃣ ASIGNAR ROL ADMIN AL USUARIO victorsan@hotmail.com
-- ============================================

DO $$
DECLARE
  v_admin_role_id TEXT;
  v_user_id TEXT;
BEGIN
  -- Obtener role_id de admin
  SELECT role_id INTO v_admin_role_id
  FROM roles
  WHERE role_code = 'ADMIN'
  LIMIT 1;

  -- Obtener user_id de victorsan@hotmail.com
  SELECT id::text INTO v_user_id
  FROM public.users
  WHERE email = 'victorsan@hotmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL AND v_admin_role_id IS NOT NULL THEN
    -- Asignar rol al usuario
    INSERT INTO user_roles (user_id, role_id, created_by)
    VALUES (v_user_id, v_admin_role_id, 'system')
    ON CONFLICT (user_id, role_id) DO NOTHING;

    RAISE NOTICE 'Rol de Administrador asignado al usuario victorsan@hotmail.com';
  ELSE
    RAISE NOTICE 'Usuario o rol no encontrado';
  END IF;
END $$;

-- ============================================
-- 7️⃣ VERIFICACIÓN FINAL
-- ============================================

-- Ver resumen de datos insertados
SELECT 
  'Menu Groups' as tabla,
  COUNT(*) as registros
FROM menu_groups
UNION ALL
SELECT 
  'Screens',
  COUNT(*)
FROM screens
UNION ALL
SELECT 
  'Screen Actions',
  COUNT(*)
FROM screen_actions
UNION ALL
SELECT 
  'Role Screen Actions (Admin)',
  COUNT(*)
FROM role_screen_actions
WHERE role_id = (SELECT role_id FROM roles WHERE role_code = 'ADMIN' LIMIT 1);

-- Ver permisos efectivos del usuario
SELECT 
  u.email,
  r.role_name,
  COUNT(DISTINCT mg.menu_group_id) as modulos,
  COUNT(DISTINCT s.screen_key) as pantallas,
  COUNT(sa.screen_action_id) as acciones
FROM public.users u
JOIN user_roles ur ON u.id::text = ur.user_id
JOIN roles r ON ur.role_id = r.role_id
JOIN role_screen_actions rsa ON r.role_id = rsa.role_id
JOIN screen_actions sa ON rsa.screen_action_id = sa.screen_action_id
JOIN screens s ON sa.screen_key = s.screen_key
JOIN menu_groups mg ON s.menu_group_id = mg.menu_group_id
WHERE u.email = 'victorsan@hotmail.com'
GROUP BY u.email, r.role_name;

-- ============================================
-- ✅ SCRIPT COMPLETADO
-- ============================================

/*
📊 RESUMEN:
- 12 Menu Groups (módulos)
- 60+ Screens (pantallas)
- 200+ Screen Actions (acciones/botones)
- Todos los permisos asignados al rol Admin
- Rol Admin asignado a victorsan@hotmail.com

🎯 SIGUIENTE PASO:
1. Ejecuta este script completo en Supabase SQL Editor
2. Verifica los resultados de las consultas al final
3. Recarga la aplicación (Ctrl + Shift + R)
4. Los menús deberían aparecer dinámicamente
*/
