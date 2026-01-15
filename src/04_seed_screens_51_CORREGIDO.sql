-- ===== 04_seed_screens_51.sql (CORREGIDO) =====
-- helpers
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
),
ins as (
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
        is_active = excluded.is_active
  returning id, screen_key, screen_name, menu_label
),
-- 🔥 SOLUCIÓN: Agregar DISTINCT para evitar duplicados
translations_to_insert as (
  select DISTINCT ON (i.id, 'en')
    i.id,
    i.screen_key,
    i.screen_name,
    'en' as language_code,
    case
      when i.screen_key='DASH_MAIN' then 'Main Dashboard'
      when i.screen_key='DASH_ALERTS' then 'Alerts'
      when i.screen_key='DASH_TRENDS' then 'Trends'

      when i.screen_key='SEC_MENU_GROUPS' then 'Menu Groups'
      when i.screen_key='SEC_SCREENS' then 'Screens'
      when i.screen_key='SEC_ACTIONS' then 'Actions'
      when i.screen_key='SEC_SCREEN_ACTIONS' then 'Screen–Actions'
      when i.screen_key='SEC_ROLES' then 'Roles'
      when i.screen_key='SEC_ROLE_PERMS' then 'Role Permissions'
      when i.screen_key='SEC_USER_ROLES' then 'User–Roles'
      when i.screen_key='SEC_SCOPES' then 'Scopes'
      when i.screen_key='SEC_COPY_PERMS' then 'Copy Permissions'
      when i.screen_key='SEC_AUDIT' then 'Audit'
      when i.screen_key='SEC_TENANT_MEMBERS' then 'Tenant Members'
      when i.screen_key='SEC_LOGIN_SESSIONS' then 'Sessions'

      when i.screen_key='MANT_CATALOGS' then 'Catalogs'
      when i.screen_key='MANT_HOLIDAYS' then 'Holidays'
      when i.screen_key='MANT_ATT_MOVEMENTS' then 'Movements'
      when i.screen_key='MANT_ATT_EVENTS' then 'Attendance Events'
      when i.screen_key='MANT_JUSTIFICATIONS' then 'Justification Reasons'
      when i.screen_key='MANT_MESSAGES' then 'System Messages'

      when i.screen_key='CONF_PARAMS' then 'General Parameters'
      when i.screen_key='CONF_SHIFTS' then 'Shifts'
      when i.screen_key='CONF_WORK_PATTERNS' then 'Work Patterns'
      when i.screen_key='CONF_SURCHARGES' then 'Surcharge Rules'
      when i.screen_key='CONF_DEVICES' then 'Devices'
      when i.screen_key='CONF_ATT_PROCESS' then 'Attendance Processes'
      when i.screen_key='CONF_TENANT_SETTINGS' then 'Tenant Settings'

      when i.screen_key='ORG_COMPANIES' then 'Companies'
      when i.screen_key='ORG_WORK_LOCATIONS' then 'Locations'
      when i.screen_key='ORG_DEPARTMENTS' then 'Departments'
      when i.screen_key='ORG_AREAS' then 'Areas'
      when i.screen_key='ORG_WORK_GROUPS' then 'Work Groups'
      when i.screen_key='ORG_PAYROLL_GROUPS' then 'Payroll Groups'
      when i.screen_key='ORG_JOB_TITLES' then 'Job Titles'
      when i.screen_key='ORG_COST_CENTERS' then 'Cost Centers'

      when i.screen_key='EMPL_LIST' then 'Employees'
      when i.screen_key='EMPL_ASSIGN_COMPANY' then 'Company Assignment'
      when i.screen_key='EMPL_PROFILES' then 'Employee Profiles'
      when i.screen_key='EMPL_PROFILE_SETTINGS' then 'Profile Settings'
      when i.screen_key='EMPL_ABSENCE_REQUESTS' then 'Absence Requests'
      when i.screen_key='EMPL_DOCUMENTS' then 'Documents'

      when i.screen_key='ATT_TIME_PUNCHES' then 'Time Punches'
      when i.screen_key='ATT_SHIFT_PLANS' then 'Shift Planning'
      when i.screen_key='ATT_PROCESS_RUNS' then 'Process Runs'
      when i.screen_key='ATT_CALC_RESULTS' then 'Calculation Results'
      when i.screen_key='ATT_APPROVALS' then 'Approvals'
      when i.screen_key='ATT_ANOMALIES' then 'Anomalies'

      when i.screen_key='RPT_CATALOG' then 'Report Catalog'
      when i.screen_key='RPT_PARAMETERS' then 'Report Parameters'
      when i.screen_key='RPT_PERMISSIONS' then 'Report Permissions'
      when i.screen_key='RPT_EXECUTIONS' then 'Executions'

      when i.screen_key='SUB_PLANS' then 'Plans'
      when i.screen_key='SUB_TENANT_SUBS' then 'Tenant Subscription'
      when i.screen_key='SUB_TRANSACTIONS' then 'Transactions'
      else i.screen_name
    end as screen_name_en
  from ins i
)
-- EN translations
insert into public.screen_translations (screen_id, language_code, screen_name, menu_label)
select 
  id,
  language_code,
  screen_name_en,
  null
from translations_to_insert
on conflict (screen_id, language_code) do update
set screen_name = excluded.screen_name,
    menu_label = excluded.menu_label;

-- 🎯 Mostrar resultado
SELECT 
  'Screens insertadas' as tipo,
  COUNT(*) as cantidad
FROM public.screens
UNION ALL
SELECT 
  'Traducciones insertadas' as tipo,
  COUNT(*) as cantidad
FROM public.screen_translations
WHERE language_code = 'en';
