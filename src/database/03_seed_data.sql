/* ================================================================================================
 Turnos Titanium — DATOS SEED INICIALES
 Fecha: 2025-01-03
 Propósito: Datos mínimos para arrancar el sistema
================================================================================================ */

----------------------------------------------------------------------------------------------------
-- 1) IDIOMAS
----------------------------------------------------------------------------------------------------

insert into public.system_languages (code, language_name, is_active, is_default) values
('es', 'Español', true, true),
('en', 'English', true, false)
on conflict (code) do nothing;

----------------------------------------------------------------------------------------------------
-- 2) LOOKUP GROUPS (CATÁLOGOS)
----------------------------------------------------------------------------------------------------

insert into public.lookup_groups (
  lookup_group_key,
  lookup_group_label,
  lookup_group_short_label,
  allows_tenant_items,
  is_active,
  created_by
) values
('APPLICATION_MODULE', 'Módulos de Aplicación', 'Módulos', false, true, 'SYSTEM'),
('AUTH_PROVIDER', 'Proveedores de Autenticación', 'Auth', false, true, 'SYSTEM'),
('PROCESS_STATUS', 'Estados de Procesos', 'Estado Proc', false, true, 'SYSTEM'),
('PROCESS_TYPE', 'Tipos de Procesos', 'Tipo Proc', false, true, 'SYSTEM'),
('DATA_TYPE', 'Tipos de Datos', 'Tipo Dato', false, true, 'SYSTEM'),
('UI_CONTROL', 'Controles de UI', 'Control UI', false, true, 'SYSTEM'),
('OUTPUT_FORMAT', 'Formatos de Salida', 'Formato', false, true, 'SYSTEM'),
('EXECUTION_STATUS', 'Estados de Ejecución', 'Estado Ejec', false, true, 'SYSTEM'),
('ENFORCEMENT_LEVEL', 'Niveles de Aplicación', 'Nivel', false, true, 'SYSTEM'),
('REPORT_HANDLER', 'Manejadores de Reportes', 'Handler', false, true, 'SYSTEM'),
('GENDER', 'Géneros', 'Género', true, true, 'SYSTEM'),
('CONTRACT_TYPE', 'Tipos de Contrato', 'Contrato', true, true, 'SYSTEM'),
('VALUE_TYPE', 'Tipos de Valor', 'Tipo Valor', false, true, 'SYSTEM'),
('SHIFT_TYPE', 'Tipos de Turno', 'Tipo Turno', true, true, 'SYSTEM'),
('TRANSACTION_DIRECTION', 'Dirección de Transacción', 'Dirección', false, true, 'SYSTEM'),
('EVENT_TYPE', 'Tipos de Evento', 'Tipo Evento', true, true, 'SYSTEM'),
('CALCULATION_METHOD', 'Métodos de Cálculo', 'Método', false, true, 'SYSTEM'),
('PUNCH_SOURCE', 'Fuente de Marcación', 'Fuente', false, true, 'SYSTEM'),
('TIME_PUNCH_STATUS', 'Estado de Marcación', 'Estado', false, true, 'SYSTEM'),
('DEVICE_TYPE', 'Tipos de Dispositivo', 'Dispositivo', false, true, 'SYSTEM'),
('REQUEST_STATUS', 'Estados de Solicitud', 'Estado Sol', false, true, 'SYSTEM'),
('RATE_CATEGORY', 'Categorías de Tarifa', 'Cat Tarifa', true, true, 'SYSTEM'),
('DAY_TYPE', 'Tipos de Día', 'Tipo Día', false, true, 'SYSTEM')
on conflict (lookup_group_key) do nothing;

----------------------------------------------------------------------------------------------------
-- 3) LOOKUP VALUES (VALORES DE CATÁLOGOS SYSTEM)
----------------------------------------------------------------------------------------------------

-- Obtener IDs de lookup_groups
do $$
declare
  v_module_group_id uuid;
  v_auth_group_id uuid;
  v_process_status_id uuid;
  v_process_type_id uuid;
  v_data_type_id uuid;
  v_ui_control_id uuid;
  v_output_format_id uuid;
  v_execution_status_id uuid;
  v_enforcement_id uuid;
  v_handler_id uuid;
begin
  -- Obtener IDs de grupos
  select id into v_module_group_id from public.lookup_groups where lookup_group_key = 'APPLICATION_MODULE';
  select id into v_auth_group_id from public.lookup_groups where lookup_group_key = 'AUTH_PROVIDER';
  select id into v_process_status_id from public.lookup_groups where lookup_group_key = 'PROCESS_STATUS';
  select id into v_process_type_id from public.lookup_groups where lookup_group_key = 'PROCESS_TYPE';
  select id into v_data_type_id from public.lookup_groups where lookup_group_key = 'DATA_TYPE';
  select id into v_ui_control_id from public.lookup_groups where lookup_group_key = 'UI_CONTROL';
  select id into v_output_format_id from public.lookup_groups where lookup_group_key = 'OUTPUT_FORMAT';
  select id into v_execution_status_id from public.lookup_groups where lookup_group_key = 'EXECUTION_STATUS';
  select id into v_enforcement_id from public.lookup_groups where lookup_group_key = 'ENFORCEMENT_LEVEL';
  select id into v_handler_id from public.lookup_groups where lookup_group_key = 'REPORT_HANDLER';

  -- MÓDULOS DE APLICACIÓN
  insert into public.lookup_values (
    tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by
  ) values
  (null, v_module_group_id, 'DASHBOARD', 'Dashboard', 'Dashboard', 'SYSTEM', 1, true, 'SYSTEM'),
  (null, v_module_group_id, 'MAINTENANCE', 'Mantenimiento', 'Mant', 'SYSTEM', 2, true, 'SYSTEM'),
  (null, v_module_group_id, 'CONFIGURATION', 'Configuración', 'Config', 'SYSTEM', 3, true, 'SYSTEM'),
  (null, v_module_group_id, 'PROFILES', 'Perfiles', 'Perfiles', 'SYSTEM', 4, true, 'SYSTEM'),
  (null, v_module_group_id, 'COMPANIES', 'Empresas', 'Empresas', 'SYSTEM', 5, true, 'SYSTEM'),
  (null, v_module_group_id, 'EMPLOYEES', 'Empleados', 'Empleados', 'SYSTEM', 6, true, 'SYSTEM'),
  (null, v_module_group_id, 'PROCESSES', 'Procesos', 'Procesos', 'SYSTEM', 7, true, 'SYSTEM'),
  (null, v_module_group_id, 'SECURITY', 'Seguridad', 'Seguridad', 'SYSTEM', 8, true, 'SYSTEM'),
  (null, v_module_group_id, 'USERS', 'Usuarios', 'Usuarios', 'SYSTEM', 9, true, 'SYSTEM'),
  (null, v_module_group_id, 'REPORTS', 'Reportes', 'Reportes', 'SYSTEM', 10, true, 'SYSTEM')
  on conflict (lookup_group_id, tenant_id, lookup_key) do nothing;

  -- PROVEEDORES DE AUTH
  insert into public.lookup_values (
    tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by
  ) values
  (null, v_auth_group_id, 'EMAIL', 'Email/Password', 'Email', 'SYSTEM', 1, true, 'SYSTEM'),
  (null, v_auth_group_id, 'GOOGLE', 'Google OAuth', 'Google', 'SYSTEM', 2, true, 'SYSTEM'),
  (null, v_auth_group_id, 'MICROSOFT', 'Microsoft Azure AD', 'Microsoft', 'SYSTEM', 3, true, 'SYSTEM')
  on conflict (lookup_group_id, tenant_id, lookup_key) do nothing;

  -- PROCESS_STATUS
  insert into public.lookup_values (
    tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by
  ) values
  (null, v_process_status_id, 'PENDING', 'Pendiente', 'Pend', 'SYSTEM', 1, true, 'SYSTEM'),
  (null, v_process_status_id, 'RUNNING', 'En Ejecución', 'Ejec', 'SYSTEM', 2, true, 'SYSTEM'),
  (null, v_process_status_id, 'COMPLETED', 'Completado', 'Compl', 'SYSTEM', 3, true, 'SYSTEM'),
  (null, v_process_status_id, 'ERROR', 'Error', 'Error', 'SYSTEM', 4, true, 'SYSTEM')
  on conflict (lookup_group_id, tenant_id, lookup_key) do nothing;

  -- DATA_TYPE
  insert into public.lookup_values (
    tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by
  ) values
  (null, v_data_type_id, 'STRING', 'Texto', 'Texto', 'SYSTEM', 1, true, 'SYSTEM'),
  (null, v_data_type_id, 'INTEGER', 'Entero', 'Entero', 'SYSTEM', 2, true, 'SYSTEM'),
  (null, v_data_type_id, 'DECIMAL', 'Decimal', 'Decimal', 'SYSTEM', 3, true, 'SYSTEM'),
  (null, v_data_type_id, 'DATE', 'Fecha', 'Fecha', 'SYSTEM', 4, true, 'SYSTEM'),
  (null, v_data_type_id, 'DATETIME', 'Fecha y Hora', 'DateTime', 'SYSTEM', 5, true, 'SYSTEM'),
  (null, v_data_type_id, 'BOOLEAN', 'Booleano', 'Bool', 'SYSTEM', 6, true, 'SYSTEM')
  on conflict (lookup_group_id, tenant_id, lookup_key) do nothing;

  -- UI_CONTROL
  insert into public.lookup_values (
    tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by
  ) values
  (null, v_ui_control_id, 'TEXTBOX', 'Caja de Texto', 'Text', 'SYSTEM', 1, true, 'SYSTEM'),
  (null, v_ui_control_id, 'DROPDOWN', 'Lista Desplegable', 'Dropdown', 'SYSTEM', 2, true, 'SYSTEM'),
  (null, v_ui_control_id, 'DATEPICKER', 'Selector de Fecha', 'Date', 'SYSTEM', 3, true, 'SYSTEM'),
  (null, v_ui_control_id, 'CHECKBOX', 'Casilla de Verificación', 'Check', 'SYSTEM', 4, true, 'SYSTEM'),
  (null, v_ui_control_id, 'MULTISELECT', 'Selección Múltiple', 'Multi', 'SYSTEM', 5, true, 'SYSTEM')
  on conflict (lookup_group_id, tenant_id, lookup_key) do nothing;

  -- OUTPUT_FORMAT
  insert into public.lookup_values (
    tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by
  ) values
  (null, v_output_format_id, 'PDF', 'PDF', 'PDF', 'SYSTEM', 1, true, 'SYSTEM'),
  (null, v_output_format_id, 'EXCEL', 'Excel', 'Excel', 'SYSTEM', 2, true, 'SYSTEM'),
  (null, v_output_format_id, 'CSV', 'CSV', 'CSV', 'SYSTEM', 3, true, 'SYSTEM')
  on conflict (lookup_group_id, tenant_id, lookup_key) do nothing;

  -- EXECUTION_STATUS
  insert into public.lookup_values (
    tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by
  ) values
  (null, v_execution_status_id, 'QUEUED', 'En Cola', 'Cola', 'SYSTEM', 1, true, 'SYSTEM'),
  (null, v_execution_status_id, 'RUNNING', 'Ejecutando', 'Ejec', 'SYSTEM', 2, true, 'SYSTEM'),
  (null, v_execution_status_id, 'COMPLETED', 'Completado', 'Compl', 'SYSTEM', 3, true, 'SYSTEM'),
  (null, v_execution_status_id, 'FAILED', 'Fallido', 'Fallo', 'SYSTEM', 4, true, 'SYSTEM')
  on conflict (lookup_group_id, tenant_id, lookup_key) do nothing;

  -- ENFORCEMENT_LEVEL
  insert into public.lookup_values (
    tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by
  ) values
  (null, v_enforcement_id, 'REQUIRED', 'Requerido', 'Req', 'SYSTEM', 1, true, 'SYSTEM'),
  (null, v_enforcement_id, 'OPTIONAL', 'Opcional', 'Opc', 'SYSTEM', 2, true, 'SYSTEM')
  on conflict (lookup_group_id, tenant_id, lookup_key) do nothing;

  -- REPORT_HANDLER
  insert into public.lookup_values (
    tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by
  ) values
  (null, v_handler_id, 'SQL_QUERY', 'Consulta SQL', 'SQL', 'SYSTEM', 1, true, 'SYSTEM'),
  (null, v_handler_id, 'STORED_PROC', 'Procedimiento Almacenado', 'SP', 'SYSTEM', 2, true, 'SYSTEM'),
  (null, v_handler_id, 'API_ENDPOINT', 'Endpoint API', 'API', 'SYSTEM', 3, true, 'SYSTEM')
  on conflict (lookup_group_id, tenant_id, lookup_key) do nothing;

end $$;

----------------------------------------------------------------------------------------------------
-- 4) MENU GROUPS
----------------------------------------------------------------------------------------------------

insert into public.system_menu_groups (
  menu_group_key,
  menu_group_name,
  menu_group_short_name,
  icon_key,
  sort_order,
  is_active,
  created_by
) values
('DASHBOARD', 'Dashboard', 'Dashboard', 'LayoutDashboard', 1, true, 'SYSTEM'),
('MAINTENANCE', 'Mantenimiento', 'Mant', 'Settings', 2, true, 'SYSTEM'),
('CONFIGURATION', 'Configuración', 'Config', 'Cog', 3, true, 'SYSTEM'),
('PROFILES', 'Perfiles', 'Perfiles', 'UserCog', 4, true, 'SYSTEM'),
('COMPANIES', 'Empresas', 'Empresas', 'Building2', 5, true, 'SYSTEM'),
('EMPLOYEES', 'Empleados', 'Empleados', 'Users', 6, true, 'SYSTEM'),
('PROCESSES', 'Procesos', 'Procesos', 'RefreshCw', 7, true, 'SYSTEM'),
('SECURITY', 'Seguridad', 'Seguridad', 'Shield', 8, true, 'SYSTEM'),
('USERS', 'Usuarios', 'Usuarios', 'User', 9, true, 'SYSTEM'),
('REPORTS', 'Reportes', 'Reportes', 'BarChart', 10, true, 'SYSTEM')
on conflict (menu_group_key) do nothing;

----------------------------------------------------------------------------------------------------
-- 5) ACTIONS (ACCIONES ESTÁNDAR)
----------------------------------------------------------------------------------------------------

insert into public.actions (
  action_key,
  action_name,
  is_active,
  created_by
) values
('VIEW', 'Ver/Consultar', true, 'SYSTEM'),
('CREATE', 'Crear', true, 'SYSTEM'),
('UPDATE', 'Actualizar', true, 'SYSTEM'),
('DELETE', 'Eliminar', true, 'SYSTEM'),
('EXPORT', 'Exportar', true, 'SYSTEM'),
('IMPORT', 'Importar', true, 'SYSTEM'),
('APPROVE', 'Aprobar', true, 'SYSTEM'),
('REJECT', 'Rechazar', true, 'SYSTEM'),
('RUN', 'Ejecutar', true, 'SYSTEM'),
('CLONE', 'Clonar', true, 'SYSTEM'),
('COPY', 'Copiar', true, 'SYSTEM')
on conflict (action_key) do nothing;

----------------------------------------------------------------------------------------------------
-- 6) SCOPE TYPES
----------------------------------------------------------------------------------------------------

insert into public.scope_types (
  scope_type_key,
  scope_type_name,
  is_active,
  created_by
) values
('COMPANY', 'Empresa', true, 'SYSTEM'),
('DEPARTMENT', 'Departamento', true, 'SYSTEM'),
('AREA', 'Área', true, 'SYSTEM'),
('COST_CENTER', 'Centro de Costos', true, 'SYSTEM'),
('WORK_LOCATION', 'Localidad', true, 'SYSTEM'),
('PAYROLL_GROUP', 'Grupo de Nómina', true, 'SYSTEM'),
('EMPLOYEE', 'Empleado', true, 'SYSTEM')
on conflict (scope_type_key) do nothing;

----------------------------------------------------------------------------------------------------
-- 7) SCREENS BÁSICAS (con icon_key para menú dinámico)
----------------------------------------------------------------------------------------------------

do $$
declare
  v_dashboard_group uuid;
  v_maint_group uuid;
  v_config_group uuid;
  v_security_group uuid;
  v_employees_group uuid;
  v_module_dashboard uuid;
  v_module_maint uuid;
  v_module_config uuid;
  v_module_security uuid;
  v_module_employees uuid;
begin
  -- Obtener IDs de menu groups
  select id into v_dashboard_group from public.system_menu_groups where menu_group_key = 'DASHBOARD';
  select id into v_maint_group from public.system_menu_groups where menu_group_key = 'MAINTENANCE';
  select id into v_config_group from public.system_menu_groups where menu_group_key = 'CONFIGURATION';
  select id into v_security_group from public.system_menu_groups where menu_group_key = 'SECURITY';
  select id into v_employees_group from public.system_menu_groups where menu_group_key = 'EMPLOYEES';

  -- Obtener IDs de módulos
  select id into v_module_dashboard from public.lookup_values where lookup_key = 'DASHBOARD';
  select id into v_module_maint from public.lookup_values where lookup_key = 'MAINTENANCE';
  select id into v_module_config from public.lookup_values where lookup_key = 'CONFIGURATION';
  select id into v_module_security from public.lookup_values where lookup_key = 'SECURITY';
  select id into v_module_employees from public.lookup_values where lookup_key = 'EMPLOYEES';

  -- Screens
  insert into public.screens (
    screen_key,
    screen_name,
    menu_label,
    menu_group_id,
    module_id,
    route_path,
    icon_key,
    sort_order,
    is_active,
    created_by
  ) values
  ('DASH_MAIN', 'Dashboard Principal', 'Dashboard', v_dashboard_group, v_module_dashboard, '/dashboard', 'LayoutDashboard', 1, true, 'SYSTEM'),
  ('MANT_HOLIDAYS', 'Feriados', 'Feriados', v_maint_group, v_module_maint, '/mantenimiento/feriados', 'CalendarX', 2, true, 'SYSTEM'),
  ('MANT_CATALOGS', 'Catálogos', 'Catálogos', v_maint_group, v_module_maint, '/mantenimiento/catalogos', 'Tag', 3, true, 'SYSTEM'),
  ('CONF_SHIFTS', 'Turnos', 'Turnos', v_config_group, v_module_config, '/configuracion/turnos', 'Clock', 4, true, 'SYSTEM'),
  ('CONF_PARAMS', 'Parámetros Generales', 'Parámetros', v_config_group, v_module_config, '/configuracion/parametros', 'Settings', 5, true, 'SYSTEM'),
  ('SEC_SCREENS', 'Pantallas', 'Pantallas', v_security_group, v_module_security, '/seguridad/pantallas', 'Monitor', 6, true, 'SYSTEM'),
  ('SEC_ACTIONS', 'Acciones', 'Acciones', v_security_group, v_module_security, '/seguridad/acciones', 'MousePointerClick', 7, true, 'SYSTEM'),
  ('SEC_SCREEN_ACTIONS', 'Pantalla-Acciones', 'Pantalla-Acciones', v_security_group, v_module_security, '/seguridad/pantalla-acciones', 'Link', 8, true, 'SYSTEM'),
  ('SEC_ROLES', 'Roles', 'Roles', v_security_group, v_module_security, '/seguridad/roles', 'Shield', 9, true, 'SYSTEM'),
  ('SEC_ROLE_PERMS', 'Permisos por Rol', 'Permisos por Rol', v_security_group, v_module_security, '/seguridad/permisos-rol', 'Lock', 10, true, 'SYSTEM'),
  ('SEC_USER_ROLES', 'Asignación de Roles', 'Asignación de Roles', v_security_group, v_module_security, '/seguridad/asignacion-roles', 'UserCircle', 11, true, 'SYSTEM'),
  ('SEC_SCOPES', 'Scopes', 'Scopes', v_security_group, v_module_security, '/seguridad/scopes', 'Eye', 12, true, 'SYSTEM'),
  ('SEC_COPY_PERMS', 'Copiar Permisos', 'Copiar Permisos', v_security_group, v_module_security, '/seguridad/copiar-permisos', 'Copy', 13, true, 'SYSTEM'),
  ('SEC_AUDIT', 'Auditoría', 'Auditoría', v_security_group, v_module_security, '/seguridad/auditoria', 'Activity', 14, true, 'SYSTEM'),
  ('EMPL_LIST', 'Empleados', 'Empleados', v_employees_group, v_module_employees, '/empleados', 'Users', 15, true, 'SYSTEM')
  on conflict (screen_key) do nothing;

end $$;

----------------------------------------------------------------------------------------------------
-- 8) SCREEN_ACTIONS (vincular acciones a pantallas)
----------------------------------------------------------------------------------------------------

do $$
declare
  v_screen_shifts uuid;
  v_screen_employees uuid;
  v_screen_copy_perms uuid;
  v_action_view uuid;
  v_action_create uuid;
  v_action_update uuid;
  v_action_delete uuid;
  v_action_export uuid;
  v_action_clone uuid;
  v_action_copy uuid;
begin
  -- Obtener screens
  select id into v_screen_shifts from public.screens where screen_key = 'CONF_SHIFTS';
  select id into v_screen_employees from public.screens where screen_key = 'EMPL_LIST';
  select id into v_screen_copy_perms from public.screens where screen_key = 'SEC_COPY_PERMS';

  -- Obtener actions
  select id into v_action_view from public.actions where action_key = 'VIEW';
  select id into v_action_create from public.actions where action_key = 'CREATE';
  select id into v_action_update from public.actions where action_key = 'UPDATE';
  select id into v_action_delete from public.actions where action_key = 'DELETE';
  select id into v_action_export from public.actions where action_key = 'EXPORT';
  select id into v_action_clone from public.actions where action_key = 'CLONE';
  select id into v_action_copy from public.actions where action_key = 'COPY';

  -- Screen Actions para TURNOS
  insert into public.screen_actions (screen_id, action_id, ui_element_key, is_active, created_by) values
  (v_screen_shifts, v_action_view, 'btn_view', true, 'SYSTEM'),
  (v_screen_shifts, v_action_create, 'btn_create', true, 'SYSTEM'),
  (v_screen_shifts, v_action_update, 'btn_edit', true, 'SYSTEM'),
  (v_screen_shifts, v_action_delete, 'btn_delete', true, 'SYSTEM'),
  (v_screen_shifts, v_action_export, 'btn_export', true, 'SYSTEM')
  on conflict (screen_id, action_id) do nothing;

  -- Screen Actions para EMPLEADOS
  insert into public.screen_actions (screen_id, action_id, ui_element_key, is_active, created_by) values
  (v_screen_employees, v_action_view, 'btn_view', true, 'SYSTEM'),
  (v_screen_employees, v_action_create, 'btn_create', true, 'SYSTEM'),
  (v_screen_employees, v_action_update, 'btn_edit', true, 'SYSTEM'),
  (v_screen_employees, v_action_delete, 'btn_delete', true, 'SYSTEM')
  on conflict (screen_id, action_id) do nothing;

  -- Screen Actions para COPIAR PERMISOS
  insert into public.screen_actions (screen_id, action_id, ui_element_key, is_active, created_by) values
  (v_screen_copy_perms, v_action_view, 'btn_view', true, 'SYSTEM'),
  (v_screen_copy_perms, v_action_clone, 'btn_clone', true, 'SYSTEM'),
  (v_screen_copy_perms, v_action_copy, 'btn_copy', true, 'SYSTEM')
  on conflict (screen_id, action_id) do nothing;

end $$;

----------------------------------------------------------------------------------------------------
-- FIN SEED DATA
----------------------------------------------------------------------------------------------------

-- Verificación
select 'SEED DATA COMPLETADO' as status,
  (select count(*) from public.system_languages) as languages,
  (select count(*) from public.lookup_groups) as lookup_groups,
  (select count(*) from public.lookup_values where lookup_scope = 'SYSTEM') as lookup_values,
  (select count(*) from public.system_menu_groups) as menu_groups,
  (select count(*) from public.actions) as actions,
  (select count(*) from public.scope_types) as scope_types,
  (select count(*) from public.screens) as screens,
  (select count(*) from public.screen_actions) as screen_actions;
