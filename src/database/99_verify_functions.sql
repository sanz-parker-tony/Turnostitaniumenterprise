/* ================================================================================================
 Turnos Titanium — VERIFICACIÓN DE FUNCIONES
 Fecha: 2025-01-03
 Propósito: Verificar que las funciones están creadas con las firmas correctas
================================================================================================ */

-- Verificar funciones creadas y sus firmas
select 
  p.proname as function_name,
  pg_catalog.pg_get_function_arguments(p.oid) as parameters,
  pg_catalog.pg_get_function_result(p.oid) as return_type,
  case 
    when p.provolatile = 'i' then 'IMMUTABLE'
    when p.provolatile = 's' then 'STABLE'
    when p.provolatile = 'v' then 'VOLATILE'
  end as volatility,
  case
    when p.prosecdef then 'SECURITY DEFINER'
    else 'SECURITY INVOKER'
  end as security
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'clone_role',
    'copy_role_permissions',
    'get_user_tenant_id',
    'user_has_screen_action',
    'set_updated_at'
  )
order by p.proname;

----------------------------------------------------------------------------------------------------

-- Verificar las firmas EXACTAS que necesitamos para GRANT
select 
  'clone_role' as function_name,
  case
    when exists (
      select 1 from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'clone_role'
        and pg_catalog.pg_get_function_arguments(p.oid) = 'p_tenant_id uuid, p_source_role_id uuid, p_new_role_key character varying, p_new_role_name character varying, p_created_by uuid, p_new_role_description text DEFAULT NULL::text'
    ) then '✅ CORRECTO'
    else '❌ INCORRECTO - Revisar firma'
  end as status
union all
select 
  'copy_role_permissions' as function_name,
  case
    when exists (
      select 1 from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'copy_role_permissions'
        and pg_catalog.pg_get_function_arguments(p.oid) = 'p_tenant_id uuid, p_source_role_id uuid, p_target_role_id uuid, p_strategy character varying, p_updated_by uuid, p_copy_screen_actions boolean DEFAULT true, p_copy_reports boolean DEFAULT true, p_copy_scopes boolean DEFAULT false'
    ) then '✅ CORRECTO'
    else '❌ INCORRECTO - Revisar firma'
  end as status
union all
select 
  'get_user_tenant_id' as function_name,
  case
    when exists (
      select 1 from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'get_user_tenant_id'
    ) then '✅ CORRECTO'
    else '❌ INCORRECTO - No existe'
  end as status
union all
select 
  'user_has_screen_action' as function_name,
  case
    when exists (
      select 1 from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'user_has_screen_action'
    ) then '✅ CORRECTO'
    else '❌ INCORRECTO - No existe'
  end as status;

----------------------------------------------------------------------------------------------------

-- Resumen
select 
  '✅ VERIFICACIÓN COMPLETA' as status,
  (select count(*) from pg_catalog.pg_proc p
   join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('clone_role', 'copy_role_permissions', 'get_user_tenant_id', 'user_has_screen_action')
  ) as total_functions,
  case
    when (select count(*) from pg_catalog.pg_proc p
          join pg_catalog.pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            and p.proname in ('clone_role', 'copy_role_permissions', 'get_user_tenant_id', 'user_has_screen_action')
         ) = 4
    then '✅ Todas las funciones creadas'
    else '⚠️ Faltan funciones'
  end as verification;
