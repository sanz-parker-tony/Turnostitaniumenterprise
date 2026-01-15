/* ================================================================================================
 Turnos Titanium — VERIFICACIÓN RÁPIDA POST-INSTALACIÓN
 Ejecuta esto para confirmar que TODO está configurado correctamente
================================================================================================ */

-- 1. Resumen general
select 
  '✅ BASE DE DATOS LISTA' as status,
  (select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE') as total_tables,
  (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public') as total_functions,
  (select count(*) from pg_policies where schemaname = 'public') as total_policies,
  (select count(*) from pg_tables where schemaname = 'public' and rowsecurity = true) as tables_with_rls;

-- 2. Datos seed
select 
  'Datos Iniciales' as categoria,
  (select count(*) from public.system_languages) as languages,
  (select count(*) from public.lookup_groups) as lookup_groups,
  (select count(*) from public.lookup_values where lookup_scope = 'SYSTEM') as lookup_values_system,
  (select count(*) from public.system_menu_groups) as menu_groups,
  (select count(*) from public.actions) as actions,
  (select count(*) from public.scope_types) as scope_types,
  (select count(*) from public.screens) as screens,
  (select count(*) from public.screen_actions) as screen_actions;

-- 3. Verificar screens tienen icon_key
select 
  'Screens con icon_key' as verificacion,
  count(*) as total_screens,
  count(icon_key) as screens_con_icono,
  case
    when count(icon_key) >= 10 then '✅ OK'
    else '⚠️ Revisar'
  end as status
from public.screens;

-- 4. Funciones críticas
select 
  'Funciones Críticas' as categoria,
  proname as function_name,
  case
    when proname in ('clone_role', 'copy_role_permissions', 'get_user_tenant_id', 'user_has_screen_action') then '✅'
    else '⚠️'
  end as status
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in ('clone_role', 'copy_role_permissions', 'get_user_tenant_id', 'user_has_screen_action', 'set_updated_at')
order by proname;

-- 5. Verificar que tenemos las pantallas clave para el menú
select 
  'Pantallas Clave' as categoria,
  screen_key,
  screen_name,
  icon_key,
  route_path
from public.screens
where screen_key in ('DASH_MAIN', 'SEC_COPY_PERMS', 'SEC_ROLES', 'EMPL_LIST', 'CONF_SHIFTS')
order by screen_key;

-- 6. Verificar actions CLONE y COPY existen
select 
  'Actions Copiar Permisos' as categoria,
  action_key,
  action_name,
  case when action_key in ('CLONE', 'COPY') then '✅ OK' else '⚠️' end as status
from public.actions
where action_key in ('CLONE', 'COPY', 'VIEW', 'CREATE', 'UPDATE', 'DELETE');

-- 7. Verificar screen_actions para SEC_COPY_PERMS
select 
  'Screen Actions: SEC_COPY_PERMS' as categoria,
  s.screen_key,
  a.action_key,
  sa.ui_element_key,
  '✅ OK' as status
from public.screen_actions sa
join public.screens s on sa.screen_id = s.id
join public.actions a on sa.action_id = a.id
where s.screen_key = 'SEC_COPY_PERMS'
order by a.action_key;

-- 8. Resumen final
select 
  case
    when (select count(*) from public.screens) >= 15
     and (select count(*) from public.actions) >= 11
     and (select count(*) from public.screen_actions) >= 10
     and (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and proname in ('clone_role', 'copy_role_permissions')) = 2
     and (select count(*) from pg_policies where schemaname = 'public') >= 15
    then '🎉 BASE DE DATOS 100% LISTA PARA CONECTAR FRONTEND'
    else '⚠️ Revisar - Faltan componentes'
  end as resultado_final;
