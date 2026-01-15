/* ================================================================================================
 Turnos Titanium — ROW LEVEL SECURITY (RLS) - CORREGIDO
 Fecha: 2025-01-03
 Fix: Firmas de funciones corregidas en GRANT EXECUTE
================================================================================================ */

----------------------------------------------------------------------------------------------------
-- 1) HABILITAR RLS EN TABLAS PRINCIPALES
----------------------------------------------------------------------------------------------------

alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.companies enable row level security;
alter table public.employees enable row level security;
alter table public.users enable row level security;
alter table public.screens enable row level security;
alter table public.actions enable row level security;
alter table public.screen_actions enable row level security;
alter table public.roles enable row level security;
alter table public.role_screen_actions enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_role_scopes enable row level security;
alter table public.report_permissions enable row level security;
alter table public.audit_log enable row level security;
alter table public.role_permission_copy_runs enable row level security;
alter table public.role_permission_snapshots enable row level security;

----------------------------------------------------------------------------------------------------
-- 2) FUNCIÓN HELPER: Obtener tenant_id del usuario autenticado
----------------------------------------------------------------------------------------------------

create or replace function public.get_user_tenant_id()
returns uuid
language sql
security definer
stable
as $$
  select tenant_id
  from public.users
  where auth_user_id = auth.uid()
  limit 1;
$$;

comment on function public.get_user_tenant_id is 'Obtiene el tenant_id del usuario autenticado';

----------------------------------------------------------------------------------------------------
-- 3) FUNCIÓN HELPER: Verificar si usuario tiene permiso en screen_action
----------------------------------------------------------------------------------------------------

create or replace function public.user_has_screen_action(
  p_screen_key varchar,
  p_action_key varchar
)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_screen_actions rsa on ur.role_id = rsa.role_id
    join public.screen_actions sa on rsa.screen_action_id = sa.id
    join public.screens s on sa.screen_id = s.id
    join public.actions a on sa.action_id = a.id
    join public.users u on ur.user_id = u.id
    where u.auth_user_id = auth.uid()
      and s.screen_key = p_screen_key
      and a.action_key = p_action_key
      and rsa.is_allowed = true
      and rsa.is_active = true
      and ur.is_active = true
  );
$$;

comment on function public.user_has_screen_action is 'Verifica si el usuario tiene permiso específico';

----------------------------------------------------------------------------------------------------
-- 4) POLÍTICAS PARA TABLAS SYSTEM (solo lectura para autenticados)
----------------------------------------------------------------------------------------------------

-- screens (SYSTEM): todos pueden leer
create policy "Authenticated users can read screens"
  on public.screens for select
  to authenticated
  using (true);

-- actions (SYSTEM): todos pueden leer
create policy "Authenticated users can read actions"
  on public.actions for select
  to authenticated
  using (true);

-- screen_actions (SYSTEM): todos pueden leer
create policy "Authenticated users can read screen_actions"
  on public.screen_actions for select
  to authenticated
  using (true);

----------------------------------------------------------------------------------------------------
-- 5) POLÍTICAS PARA TENANT (filtradas por tenant_id del usuario)
----------------------------------------------------------------------------------------------------

-- tenants: solo ver el propio
create policy "Users can view their tenant"
  on public.tenants for select
  to authenticated
  using (id = public.get_user_tenant_id());

-- companies: solo del tenant
create policy "Users can view companies in their tenant"
  on public.companies for select
  to authenticated
  using (tenant_id = public.get_user_tenant_id());

create policy "Users can manage companies in their tenant"
  on public.companies for all
  to authenticated
  using (tenant_id = public.get_user_tenant_id())
  with check (tenant_id = public.get_user_tenant_id());

-- employees: solo del tenant
create policy "Users can view employees in their tenant"
  on public.employees for select
  to authenticated
  using (tenant_id = public.get_user_tenant_id());

create policy "Users can manage employees in their tenant"
  on public.employees for all
  to authenticated
  using (tenant_id = public.get_user_tenant_id())
  with check (tenant_id = public.get_user_tenant_id());

-- users: solo del tenant
create policy "Users can view users in their tenant"
  on public.users for select
  to authenticated
  using (tenant_id = public.get_user_tenant_id());

-- roles: solo del tenant
create policy "Users can view roles in their tenant"
  on public.roles for select
  to authenticated
  using (tenant_id = public.get_user_tenant_id());

create policy "Users can manage roles in their tenant"
  on public.roles for all
  to authenticated
  using (tenant_id = public.get_user_tenant_id())
  with check (tenant_id = public.get_user_tenant_id());

-- role_screen_actions: solo del tenant
create policy "Users can view role permissions in their tenant"
  on public.role_screen_actions for select
  to authenticated
  using (tenant_id = public.get_user_tenant_id());

create policy "Users can manage role permissions in their tenant"
  on public.role_screen_actions for all
  to authenticated
  using (tenant_id = public.get_user_tenant_id())
  with check (tenant_id = public.get_user_tenant_id());

-- user_roles: solo del tenant
create policy "Users can view user roles in their tenant"
  on public.user_roles for select
  to authenticated
  using (tenant_id = public.get_user_tenant_id());

create policy "Users can manage user roles in their tenant"
  on public.user_roles for all
  to authenticated
  using (tenant_id = public.get_user_tenant_id())
  with check (tenant_id = public.get_user_tenant_id());

-- user_role_scopes: solo del tenant
create policy "Users can view scopes in their tenant"
  on public.user_role_scopes for select
  to authenticated
  using (tenant_id = public.get_user_tenant_id());

create policy "Users can manage scopes in their tenant"
  on public.user_role_scopes for all
  to authenticated
  using (tenant_id = public.get_user_tenant_id())
  with check (tenant_id = public.get_user_tenant_id());

-- report_permissions: solo del tenant
create policy "Users can view report permissions in their tenant"
  on public.report_permissions for select
  to authenticated
  using (tenant_id = public.get_user_tenant_id());

create policy "Users can manage report permissions in their tenant"
  on public.report_permissions for all
  to authenticated
  using (tenant_id = public.get_user_tenant_id())
  with check (tenant_id = public.get_user_tenant_id());

-- audit_log: solo del tenant (solo lectura)
create policy "Users can view audit log in their tenant"
  on public.audit_log for select
  to authenticated
  using (tenant_id = public.get_user_tenant_id());

-- role_permission_copy_runs: solo del tenant
create policy "Users can view copy runs in their tenant"
  on public.role_permission_copy_runs for select
  to authenticated
  using (tenant_id = public.get_user_tenant_id());

-- role_permission_snapshots: solo del tenant
create policy "Users can view snapshots in their tenant"
  on public.role_permission_snapshots for select
  to authenticated
  using (tenant_id = public.get_user_tenant_id());

----------------------------------------------------------------------------------------------------
-- 6) POLÍTICAS ESPECÍFICAS PARA COPIAR PERMISOS
----------------------------------------------------------------------------------------------------

-- Solo usuarios con permiso SEC_COPY_PERMS + CLONE pueden clonar roles
create policy "Users with permission can clone roles"
  on public.roles for insert
  to authenticated
  with check (
    tenant_id = public.get_user_tenant_id()
    and public.user_has_screen_action('SEC_COPY_PERMS', 'CLONE')
  );

-- Solo usuarios con permiso SEC_COPY_PERMS + COPY pueden copiar permisos
create policy "Users with permission can copy permissions"
  on public.role_screen_actions for insert
  to authenticated
  with check (
    tenant_id = public.get_user_tenant_id()
    and public.user_has_screen_action('SEC_COPY_PERMS', 'COPY')
  );

----------------------------------------------------------------------------------------------------
-- 7) GRANT EXECUTE EN FUNCIONES (CON FIRMAS CORREGIDAS)
----------------------------------------------------------------------------------------------------

-- Funciones helper
grant execute on function public.get_user_tenant_id() to authenticated;
grant execute on function public.user_has_screen_action(varchar, varchar) to authenticated;

-- Funciones de copiar permisos (FIRMAS CORREGIDAS)
-- ✅ FIX: clone_role tiene el orden corregido: (uuid, uuid, varchar, varchar, uuid, text)
grant execute on function public.clone_role(
  uuid,     -- p_tenant_id
  uuid,     -- p_source_role_id
  varchar,  -- p_new_role_key
  varchar,  -- p_new_role_name
  uuid,     -- p_created_by (MOVIDO AQUÍ)
  text      -- p_new_role_description (AHORA AL FINAL)
) to authenticated;

-- ✅ FIX: copy_role_permissions tiene el orden corregido: (uuid, uuid, uuid, varchar, uuid, boolean, boolean, boolean)
grant execute on function public.copy_role_permissions(
  uuid,     -- p_tenant_id
  uuid,     -- p_source_role_id
  uuid,     -- p_target_role_id
  varchar,  -- p_strategy
  uuid,     -- p_updated_by (MOVIDO AQUÍ)
  boolean,  -- p_copy_screen_actions (con default)
  boolean,  -- p_copy_reports (con default)
  boolean   -- p_copy_scopes (con default)
) to authenticated;

----------------------------------------------------------------------------------------------------
-- FIN RLS
----------------------------------------------------------------------------------------------------

select 'RLS POLICIES APLICADAS CORRECTAMENTE' as status,
  (select count(*) from pg_policies where schemaname = 'public') as total_policies;
