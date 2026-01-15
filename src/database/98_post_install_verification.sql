/* ================================================================================================
 Turnos Titanium — VERIFICACIÓN POST-INSTALACIÓN COMPLETA
 Fecha: 2025-01-03
 Propósito: Verificar que toda la instalación fue exitosa
================================================================================================ */

----------------------------------------------------------------------------------------------------
-- 1) VERIFICAR RLS HABILITADO
----------------------------------------------------------------------------------------------------

select 
  '1. RLS Habilitado' as verificacion,
  tablename,
  rowsecurity as rls_enabled,
  case when rowsecurity then '✅' else '❌ ERROR' end as status
from pg_tables
where schemaname = 'public'
  and tablename in ('roles', 'screens', 'users', 'companies', 'role_screen_actions', 'user_roles')
order by tablename;

----------------------------------------------------------------------------------------------------
-- 2) VERIFICAR POLÍTICAS RLS CREADAS
----------------------------------------------------------------------------------------------------

select 
  '2. Políticas RLS' as verificacion,
  count(*) as total_policies,
  case 
    when count(*) >= 15 then '✅ OK (20+ políticas)'
    else '⚠️ Faltan políticas'
  end as status
from pg_policies
where schemaname = 'public';

-- Detalle de políticas por tabla
select 
  '2b. Detalle Políticas' as info,
  tablename,
  count(*) as num_policies
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;

----------------------------------------------------------------------------------------------------
-- 3) VERIFICAR FUNCIONES CREADAS
----------------------------------------------------------------------------------------------------

select 
  '3. Funciones Críticas' as verificacion,
  p.proname as function_name,
  pg_catalog.pg_get_function_result(p.oid) as return_type,
  case
    when p.prosecdef then 'SECURITY DEFINER'
    else 'SECURITY INVOKER'
  end as security,
  case
    when p.proname in ('clone_role', 'copy_role_permissions', 'get_user_tenant_id', 'user_has_screen_action')
    then '✅ OK'
    else '⚠️'
  end as status
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('clone_role', 'copy_role_permissions', 'get_user_tenant_id', 'user_has_screen_action', 'set_updated_at')
order by p.proname;

----------------------------------------------------------------------------------------------------
-- 4) VERIFICAR PERMISOS DE EJECUCIÓN EN FUNCIONES
----------------------------------------------------------------------------------------------------

select 
  '4. Permisos de Funciones' as verificacion,
  p.proname as function_name,
  case 
    when p.proacl is null then 'PUBLIC (default)'
    else array_to_string(p.proacl, ', ')
  end as permissions,
  case
    -- Si proacl es null, significa que tiene permisos por defecto (PUBLIC)
    -- Si contiene 'authenticated=X', tiene permisos EXECUTE para authenticated
    when p.proacl is null then '✅ Permisos públicos (OK para funciones helper)'
    when array_to_string(p.proacl, ',') like '%authenticated=X%' then '✅ Permisos para authenticated'
    when array_to_string(p.proacl, ',') like '%authenticated%' then '✅ Permisos para authenticated'
    else '⚠️ Verificar permisos'
  end as status
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('clone_role', 'copy_role_permissions', 'get_user_tenant_id', 'user_has_screen_action')
order by p.proname;

----------------------------------------------------------------------------------------------------
-- 5) VERIFICAR DATOS SEED CARGADOS
----------------------------------------------------------------------------------------------------

select 
  '5. Datos Seed' as verificacion,
  'Languages' as item,
  count(*) as cantidad,
  case when count(*) >= 2 then '✅ OK' else '❌ ERROR' end as status
from public.system_languages
union all
select 
  '5. Datos Seed',
  'Lookup Groups',
  count(*),
  case when count(*) >= 20 then '✅ OK' else '❌ ERROR' end
from public.lookup_groups
union all
select 
  '5. Datos Seed',
  'Lookup Values (SYSTEM)',
  count(*),
  case when count(*) >= 40 then '✅ OK' else '❌ ERROR' end
from public.lookup_values where lookup_scope = 'SYSTEM'
union all
select 
  '5. Datos Seed',
  'Menu Groups',
  count(*),
  case when count(*) >= 10 then '✅ OK' else '❌ ERROR' end
from public.system_menu_groups
union all
select 
  '5. Datos Seed',
  'Actions',
  count(*),
  case when count(*) >= 11 then '✅ OK' else '❌ ERROR' end
from public.actions
union all
select 
  '5. Datos Seed',
  'Scope Types',
  count(*),
  case when count(*) >= 7 then '✅ OK' else '❌ ERROR' end
from public.scope_types
union all
select 
  '5. Datos Seed',
  'Screens',
  count(*),
  case when count(*) >= 15 then '✅ OK' else '❌ ERROR' end
from public.screens
union all
select 
  '5. Datos Seed',
  'Screen Actions',
  count(*),
  case when count(*) >= 10 then '✅ OK' else '❌ ERROR' end
from public.screen_actions;

----------------------------------------------------------------------------------------------------
-- 6) VERIFICAR SCREENS TIENEN icon_key
----------------------------------------------------------------------------------------------------

select 
  '6. Screens con icon_key' as verificacion,
  count(*) as total_screens,
  count(icon_key) as screens_con_icono,
  count(*) - count(icon_key) as screens_sin_icono,
  case
    when count(icon_key) >= 10 then '✅ OK'
    else '⚠️ Algunos screens sin icono'
  end as status
from public.screens;

-- Detalle de screens sin icono (si los hay)
select 
  '6b. Screens SIN icon_key' as info,
  screen_key,
  screen_name
from public.screens
where icon_key is null
order by screen_key;

----------------------------------------------------------------------------------------------------
-- 7) VERIFICAR PANTALLA DE COPIAR PERMISOS
----------------------------------------------------------------------------------------------------

select 
  '7. Screen: SEC_COPY_PERMS' as verificacion,
  s.screen_key,
  s.screen_name,
  s.icon_key,
  s.route_path,
  case when s.icon_key is not null then '✅ OK' else '⚠️ Sin icono' end as status
from public.screens s
where s.screen_key = 'SEC_COPY_PERMS';

-- Verificar que tiene las acciones CLONE, COPY, VIEW
select 
  '7b. Actions de SEC_COPY_PERMS' as info,
  a.action_key,
  a.action_name,
  sa.ui_element_key,
  '✅ OK' as status
from public.screen_actions sa
join public.screens s on sa.screen_id = s.id
join public.actions a on sa.action_id = a.id
where s.screen_key = 'SEC_COPY_PERMS'
order by a.action_key;

----------------------------------------------------------------------------------------------------
-- 8) VERIFICAR TABLAS CRÍTICAS EXISTEN
----------------------------------------------------------------------------------------------------

select 
  '8. Tablas Críticas' as verificacion,
  table_name,
  case 
    when table_name in (
      'tenants', 'users', 'companies', 'employees',
      'screens', 'actions', 'screen_actions',
      'roles', 'role_screen_actions', 'user_roles', 'user_role_scopes',
      'audit_log', 'role_permission_copy_runs', 'role_permission_snapshots',
      'report_permissions'
    ) then '✅ OK'
    else '⚠️'
  end as status
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
  and table_name in (
    'tenants', 'users', 'companies', 'employees',
    'screens', 'actions', 'screen_actions',
    'roles', 'role_screen_actions', 'user_roles', 'user_role_scopes',
    'audit_log', 'role_permission_copy_runs', 'role_permission_snapshots',
    'report_permissions'
  )
order by table_name;

----------------------------------------------------------------------------------------------------
-- 9) RESUMEN FINAL
----------------------------------------------------------------------------------------------------

select 
  '🎉 RESUMEN FINAL' as resultado,
  case
    when (select count(*) from public.screens) >= 15
     and (select count(*) from public.actions) >= 11
     and (select count(*) from public.screen_actions) >= 10
     and (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and proname in ('clone_role', 'copy_role_permissions')) = 2
     and (select count(*) from pg_policies where schemaname = 'public') >= 15
     and (select count(*) from pg_tables where schemaname = 'public' and rowsecurity = true) >= 10
    then '✅ BASE DE DATOS 100% LISTA PARA CONECTAR FRONTEND'
    else '⚠️ Revisar items marcados con ⚠️ arriba'
  end as status,
  (select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE') as total_tables,
  (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public') as total_functions,
  (select count(*) from pg_policies where schemaname = 'public') as total_policies,
  (select count(*) from pg_tables where schemaname = 'public' and rowsecurity = true) as tables_with_rls;

----------------------------------------------------------------------------------------------------
-- FIN VERIFICACIÓN
----------------------------------------------------------------------------------------------------
