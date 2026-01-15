-- ============================================
-- 🔧 PASO 1: LIMPIAR DUPLICADOS EN LOOKUP_VALUES (MÓDULOS)
-- ============================================

-- Identificar duplicados
SELECT 
  lv.lookup_key,
  lv.id,
  lv.created_at,
  ROW_NUMBER() OVER (PARTITION BY lv.lookup_key ORDER BY lv.created_at ASC) as row_num
FROM public.lookup_values lv
JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
WHERE lg.lookup_group_key='MODULE' 
  AND lv.lookup_scope='SYSTEM' 
  AND lv.tenant_id IS NULL;

-- Eliminar duplicados (mantener el más antiguo)
WITH duplicates AS (
  SELECT 
    lv.id,
    ROW_NUMBER() OVER (PARTITION BY lv.lookup_key ORDER BY lv.created_at ASC) as row_num
  FROM public.lookup_values lv
  JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
  WHERE lg.lookup_group_key='MODULE' 
    AND lv.lookup_scope='SYSTEM' 
    AND lv.tenant_id IS NULL
)
DELETE FROM public.lookup_values
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Verificar que ya no hay duplicados
SELECT 
  'Verificación - Módulos únicos' as check_type,
  lv.lookup_key, 
  COUNT(*) as count
FROM public.lookup_values lv
JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
WHERE lg.lookup_group_key='MODULE' 
  AND lv.lookup_scope='SYSTEM' 
  AND lv.tenant_id IS NULL
GROUP BY lv.lookup_key
ORDER BY lv.lookup_key;

-- ============================================
-- 🔧 PASO 2: INSERTAR SCREENS (AHORA SIN DUPLICADOS)
-- ============================================

with module_lv as (
  select lv.id, lv.lookup_key
  from public.lookup_values lv
  join public.lookup_groups lg on lg.id = lv.lookup_group_id
  where lg.lookup_group_key='MODULE' and lv.lookup_scope='SYSTEM' and lv.tenant_id is null
),
menu as (
  select id, menu_group_key from public.system_menu_groups
),
scr as (
  select * from (values
    -- DASHBOARD (3)
    ('DASH_MAIN','Dashboard Principal','Dashboard', 'DASHBOARD','DASH','/dashboard','LayoutDashboard',10),
    ('DASH_ALERTS','Alertas','Alertas', 'DASHBOARD','DASH','/dashboard/alerts','BellRing',20),
    ('DASH_TRENDS','Tendencias','Tendencias', 'DASHBOARD','DASH','/dashboard/trends','TrendingUp',30),

    -- SECURITY (12)
    ('SEC_MENU_GROUPS','Grupos de Menú','Grupos de Menú','SECURITY','SECURITY','/security/menu-groups','Menu',10),
    ('SEC_SCREENS','Pantallas','Pantallas','SECURITY','SECURITY','/security/screens','Monitor',20),
    ('SEC_ACTIONS','Acciones','Acciones','SECURITY','SECURITY','/security/actions','MousePointerClick',30),
    ('SEC_SCREEN_ACTIONS','Pantalla-Acciones','Pantalla-Acciones','SECURITY','SECURITY','/security/screen-actions','Link',40),
    ('SEC_ROLES','Roles','Roles','SECURITY','SECURITY','/security/roles','Shield',50),
    ('SEC_ROLE_PERMS','Permisos por Rol','Permisos por Rol','SECURITY','SECURITY','/security/role-permissions','Lock',60),
    ('SEC_USER_ROLES','Asignación de Roles','Asignación de Roles','SECURITY','SECURITY','/security/user-roles','UserCircle',70),
    ('SEC_SCOPES','Scopes','Scopes','SECURITY','SECURITY','/security/scopes','Eye',80),
    ('SEC_COPY_PERMS','Copiar Permisos','Copiar Permisos','SECURITY','SECURITY','/security/copy-permissions','Copy',90),
    ('SEC_AUDIT','Auditoría','Auditoría','SECURITY','SECURITY','/security/audit','Activity',100),
    ('SEC_TENANT_MEMBERS','Miembros del Tenant','Miembros','SECURITY','SECURITY','/security/tenant-members','UsersRound',110),
    ('SEC_LOGIN_SESSIONS','Sesiones','Sesiones','SECURITY','SECURITY','/security/sessions','KeyRound',120),

    -- MAINT (6)
    ('MANT_CATALOGS','Catálogos','Catálogos','MAINT','MAINT','/maintenance/catalogs','Tag',10),
    ('MANT_HOLIDAYS','Feriados','Feriados','MAINT','MAINT','/maintenance/holidays','CalendarX',20),
    ('MANT_ATT_MOVEMENTS','Movimientos','Movimientos','MAINT','MAINT','/maintenance/movements','ArrowLeftRight',30),
    ('MANT_ATT_EVENTS','Eventos de Asistencia','Eventos','MAINT','MAINT','/maintenance/events','ListChecks',40),
    ('MANT_JUSTIFICATIONS','Motivos de Justificación','Justificaciones','MAINT','MAINT','/maintenance/justifications','MessageSquareQuote',50),
    ('MANT_MESSAGES','Mensajes del Sistema','Mensajes','MAINT','MAINT','/maintenance/messages','MessageSquare',60),

    -- CONFIG (7)
    ('CONF_PARAMS','Parámetros Generales','Parámetros','CONFIG','CONFIG','/config/params','Settings',10),
    ('CONF_SHIFTS','Turnos','Turnos','CONFIG','CONFIG','/config/shifts','Clock',20),
    ('CONF_WORK_PATTERNS','Patrones de Trabajo','Patrones','CONFIG','CONFIG','/config/work-patterns','Repeat',30),
    ('CONF_SURCHARGES','Reglas de Recargo','Recargos','CONFIG','CONFIG','/config/surcharges','Percent',40),
    ('CONF_DEVICES','Dispositivos','Dispositivos','CONFIG','CONFIG','/config/devices','Fingerprint',50),
    ('CONF_ATT_PROCESS','Procesos de Asistencia','Procesos','CONFIG','CONFIG','/config/attendance-process','Cpu',60),
    ('CONF_TENANT_SETTINGS','Ajustes del Tenant','Ajustes','CONFIG','CONFIG','/config/tenant-settings','SlidersHorizontal',70),

    -- ORG (8)
    ('ORG_COMPANIES','Empresas','Empresas','ORG','ORG','/org/companies','Building2',10),
    ('ORG_WORK_LOCATIONS','Localidades','Localidades','ORG','ORG','/org/locations','MapPin',20),
    ('ORG_DEPARTMENTS','Departamentos','Departamentos','ORG','ORG','/org/departments','Network',30),
    ('ORG_AREAS','Áreas','Áreas','ORG','ORG','/org/areas','Layers',40),
    ('ORG_WORK_GROUPS','Grupos de Trabajo','Grupos','ORG','ORG','/org/work-groups','Users',50),
    ('ORG_PAYROLL_GROUPS','Grupos de Rol de Pago','Rol de Pago','ORG','ORG','/org/payroll-groups','WalletCards',60),
    ('ORG_JOB_TITLES','Cargos','Cargos','ORG','ORG','/org/job-titles','BadgeCheck',70),
    ('ORG_COST_CENTERS','Centros de Costo','Centros de Costo','ORG','ORG','/org/cost-centers','Landmark',80),

    -- EMPLOYEE (6)
    ('EMPL_LIST','Empleados','Empleados','EMPLOYEE','EMPLOYEE','/employees','Users',10),
    ('EMPL_ASSIGN_COMPANY','Asignación a Empresa','Asignación','EMPLOYEE','EMPLOYEE','/employees/assign-company','UserPlus',20),
    ('EMPL_PROFILES','Perfiles de Empleado','Perfiles','EMPLOYEE','EMPLOYEE','/employees/profiles','IdCard',30),
    ('EMPL_PROFILE_SETTINGS','Ajustes por Perfil','Ajustes','EMPLOYEE','EMPLOYEE','/employees/profile-settings','Sliders',40),
    ('EMPL_ABSENCE_REQUESTS','Solicitudes de Ausencia','Solicitudes','EMPLOYEE','EMPLOYEE','/employees/absence-requests','ClipboardList',50),
    ('EMPL_DOCUMENTS','Documentos','Documentos','EMPLOYEE','EMPLOYEE','/employees/documents','Folder',60),

    -- ATTENDANCE (6)
    ('ATT_TIME_PUNCHES','Marcaciones','Marcaciones','ATTENDANCE','ATTENDANCE','/attendance/punches','Timer',10),
    ('ATT_SHIFT_PLANS','Planificación de Turnos','Planificación','ATTENDANCE','ATTENDANCE','/attendance/shift-plans','CalendarClock',20),
    ('ATT_PROCESS_RUNS','Ejecuciones de Proceso','Procesos','ATTENDANCE','ATTENDANCE','/attendance/process-runs','Play',30),
    ('ATT_CALC_RESULTS','Resultados de Cálculo','Resultados','ATTENDANCE','ATTENDANCE','/attendance/results','Table2',40),
    ('ATT_APPROVALS','Aprobaciones','Aprobaciones','ATTENDANCE','ATTENDANCE','/attendance/approvals','CheckCircle2',50),
    ('ATT_ANOMALIES','Anomalías','Anomalías','ATTENDANCE','ATTENDANCE','/attendance/anomalies','AlertTriangle',60),

    -- REPORTS (4)
    ('RPT_CATALOG','Catálogo de Reportes','Catálogo','REPORTS','REPORTS','/reports/catalog','FileText',10),
    ('RPT_PARAMETERS','Parámetros de Reportes','Parámetros','REPORTS','REPORTS','/reports/parameters','SlidersHorizontal',20),
    ('RPT_PERMISSIONS','Permisos de Reportes','Permisos','REPORTS','REPORTS','/reports/permissions','LockKeyhole',30),
    ('RPT_EXECUTIONS','Ejecuciones','Ejecuciones','REPORTS','REPORTS','/reports/executions','FileSearch',40),

    -- SUBSCRIPTION (3)
    ('SUB_PLANS','Planes','Planes','SUBSCRIPTION','SUBSCRIPTION','/subscription/plans','Package',10),
    ('SUB_TENANT_SUBS','Suscripción del Tenant','Suscripción','SUBSCRIPTION','SUBSCRIPTION','/subscription/tenant','CreditCard',20),
    ('SUB_TRANSACTIONS','Transacciones','Transacciones','SUBSCRIPTION','SUBSCRIPTION','/subscription/transactions','Receipt',30)
  ) as t(
    screen_key, screen_name_es, menu_label_es,
    menu_group_key, module_key, route_path, icon_key, sort_order
  )
)
insert into public.screens
  (screen_key, screen_name, menu_label, menu_group_id, module_id, route_path, icon_key, sort_order, is_active, created_by)
select
  s.screen_key,
  s.screen_name_es,
  s.menu_label_es,
  m.id as menu_group_id,
  mlv.id as module_id,
  s.route_path,
  s.icon_key,
  s.sort_order,
  true,
  'SYSTEM'
from scr s
join menu m on m.menu_group_key = s.menu_group_key
join module_lv mlv on mlv.lookup_key = s.module_key
on conflict (screen_key) do update
  set screen_name = excluded.screen_name,
      menu_label = excluded.menu_label,
      menu_group_id = excluded.menu_group_id,
      module_id = excluded.module_id,
      route_path = excluded.route_path,
      icon_key = excluded.icon_key,
      sort_order = excluded.sort_order,
      is_active = excluded.is_active;

-- ============================================
-- 🔧 PASO 3: INSERTAR TRADUCCIONES
-- ============================================

insert into public.screen_translations (screen_id, language_code, screen_name, menu_label)
select 
  s.id,
  'en' as language_code,
  case
    when s.screen_key='DASH_MAIN' then 'Main Dashboard'
    when s.screen_key='DASH_ALERTS' then 'Alerts'
    when s.screen_key='DASH_TRENDS' then 'Trends'
    when s.screen_key='SEC_MENU_GROUPS' then 'Menu Groups'
    when s.screen_key='SEC_SCREENS' then 'Screens'
    when s.screen_key='SEC_ACTIONS' then 'Actions'
    when s.screen_key='SEC_SCREEN_ACTIONS' then 'Screen–Actions'
    when s.screen_key='SEC_ROLES' then 'Roles'
    when s.screen_key='SEC_ROLE_PERMS' then 'Role Permissions'
    when s.screen_key='SEC_USER_ROLES' then 'User–Roles'
    when s.screen_key='SEC_SCOPES' then 'Scopes'
    when s.screen_key='SEC_COPY_PERMS' then 'Copy Permissions'
    when s.screen_key='SEC_AUDIT' then 'Audit'
    when s.screen_key='SEC_TENANT_MEMBERS' then 'Tenant Members'
    when s.screen_key='SEC_LOGIN_SESSIONS' then 'Sessions'
    when s.screen_key='MANT_CATALOGS' then 'Catalogs'
    when s.screen_key='MANT_HOLIDAYS' then 'Holidays'
    when s.screen_key='MANT_ATT_MOVEMENTS' then 'Movements'
    when s.screen_key='MANT_ATT_EVENTS' then 'Attendance Events'
    when s.screen_key='MANT_JUSTIFICATIONS' then 'Justification Reasons'
    when s.screen_key='MANT_MESSAGES' then 'System Messages'
    when s.screen_key='CONF_PARAMS' then 'General Parameters'
    when s.screen_key='CONF_SHIFTS' then 'Shifts'
    when s.screen_key='CONF_WORK_PATTERNS' then 'Work Patterns'
    when s.screen_key='CONF_SURCHARGES' then 'Surcharge Rules'
    when s.screen_key='CONF_DEVICES' then 'Devices'
    when s.screen_key='CONF_ATT_PROCESS' then 'Attendance Processes'
    when s.screen_key='CONF_TENANT_SETTINGS' then 'Tenant Settings'
    when s.screen_key='ORG_COMPANIES' then 'Companies'
    when s.screen_key='ORG_WORK_LOCATIONS' then 'Locations'
    when s.screen_key='ORG_DEPARTMENTS' then 'Departments'
    when s.screen_key='ORG_AREAS' then 'Areas'
    when s.screen_key='ORG_WORK_GROUPS' then 'Work Groups'
    when s.screen_key='ORG_PAYROLL_GROUPS' then 'Payroll Groups'
    when s.screen_key='ORG_JOB_TITLES' then 'Job Titles'
    when s.screen_key='ORG_COST_CENTERS' then 'Cost Centers'
    when s.screen_key='EMPL_LIST' then 'Employees'
    when s.screen_key='EMPL_ASSIGN_COMPANY' then 'Company Assignment'
    when s.screen_key='EMPL_PROFILES' then 'Employee Profiles'
    when s.screen_key='EMPL_PROFILE_SETTINGS' then 'Profile Settings'
    when s.screen_key='EMPL_ABSENCE_REQUESTS' then 'Absence Requests'
    when s.screen_key='EMPL_DOCUMENTS' then 'Documents'
    when s.screen_key='ATT_TIME_PUNCHES' then 'Time Punches'
    when s.screen_key='ATT_SHIFT_PLANS' then 'Shift Planning'
    when s.screen_key='ATT_PROCESS_RUNS' then 'Process Runs'
    when s.screen_key='ATT_CALC_RESULTS' then 'Calculation Results'
    when s.screen_key='ATT_APPROVALS' then 'Approvals'
    when s.screen_key='ATT_ANOMALIES' then 'Anomalies'
    when s.screen_key='RPT_CATALOG' then 'Report Catalog'
    when s.screen_key='RPT_PARAMETERS' then 'Report Parameters'
    when s.screen_key='RPT_PERMISSIONS' then 'Report Permissions'
    when s.screen_key='RPT_EXECUTIONS' then 'Executions'
    when s.screen_key='SUB_PLANS' then 'Plans'
    when s.screen_key='SUB_TENANT_SUBS' then 'Tenant Subscription'
    when s.screen_key='SUB_TRANSACTIONS' then 'Transactions'
    else s.screen_name
  end as screen_name_en,
  null
from public.screens s
where s.screen_key IN (
  'DASH_MAIN','DASH_ALERTS','DASH_TRENDS',
  'SEC_MENU_GROUPS','SEC_SCREENS','SEC_ACTIONS','SEC_SCREEN_ACTIONS',
  'SEC_ROLES','SEC_ROLE_PERMS','SEC_USER_ROLES','SEC_SCOPES',
  'SEC_COPY_PERMS','SEC_AUDIT','SEC_TENANT_MEMBERS','SEC_LOGIN_SESSIONS',
  'MANT_CATALOGS','MANT_HOLIDAYS','MANT_ATT_MOVEMENTS','MANT_ATT_EVENTS',
  'MANT_JUSTIFICATIONS','MANT_MESSAGES',
  'CONF_PARAMS','CONF_SHIFTS','CONF_WORK_PATTERNS','CONF_SURCHARGES',
  'CONF_DEVICES','CONF_ATT_PROCESS','CONF_TENANT_SETTINGS',
  'ORG_COMPANIES','ORG_WORK_LOCATIONS','ORG_DEPARTMENTS','ORG_AREAS',
  'ORG_WORK_GROUPS','ORG_PAYROLL_GROUPS','ORG_JOB_TITLES','ORG_COST_CENTERS',
  'EMPL_LIST','EMPL_ASSIGN_COMPANY','EMPL_PROFILES','EMPL_PROFILE_SETTINGS',
  'EMPL_ABSENCE_REQUESTS','EMPL_DOCUMENTS',
  'ATT_TIME_PUNCHES','ATT_SHIFT_PLANS','ATT_PROCESS_RUNS','ATT_CALC_RESULTS',
  'ATT_APPROVALS','ATT_ANOMALIES',
  'RPT_CATALOG','RPT_PARAMETERS','RPT_PERMISSIONS','RPT_EXECUTIONS',
  'SUB_PLANS','SUB_TENANT_SUBS','SUB_TRANSACTIONS'
)
on conflict (screen_id, language_code) do update
set screen_name = excluded.screen_name,
    menu_label = excluded.menu_label;

-- ============================================
-- ✅ PASO 4: VERIFICACIÓN FINAL
-- ============================================

SELECT 
  'Screens insertadas' as tipo,
  COUNT(*) as cantidad
FROM public.screens
UNION ALL
SELECT 
  'Traducciones insertadas' as tipo,
  COUNT(*) as cantidad
FROM public.screen_translations
WHERE language_code = 'en'
UNION ALL
SELECT 
  'Módulos únicos' as tipo,
  COUNT(*) as cantidad
FROM public.lookup_values lv
JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
WHERE lg.lookup_group_key='MODULE' 
  AND lv.lookup_scope='SYSTEM' 
  AND lv.tenant_id IS NULL;
