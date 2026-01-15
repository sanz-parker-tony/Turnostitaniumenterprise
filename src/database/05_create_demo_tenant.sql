/* ================================================================================================
 Turnos Titanium — CREAR TENANT Y USUARIO DE PRUEBA
 Fecha: 2025-01-03
 Propósito: Configurar un tenant demo con usuario admin y permisos completos
================================================================================================ */

-- IMPORTANTE: Primero debes crear un usuario en Supabase Auth
-- Ve a: Supabase Dashboard > Authentication > Users > Add User
-- Crea un usuario con email: admin@demo.com y password de tu elección
-- Copia el UUID que Supabase genera (auth.users.id)
-- Reemplaza [AUTH_USER_ID] abajo con ese UUID

----------------------------------------------------------------------------------------------------
-- 1) CREAR TENANT DEMO
----------------------------------------------------------------------------------------------------

insert into public.tenants (id, tenant_name, is_active, created_at)
values (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Empresa Demo',
  true,
  now()
)
on conflict (id) do nothing;

-- Vincular el auth.user al tenant (reemplaza [AUTH_USER_ID])
insert into public.tenant_members (tenant_id, auth_user_id, member_role, created_at)
values (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '[AUTH_USER_ID]'::uuid,  -- ⚠️ REEMPLAZAR con el UUID de auth.users
  'admin',
  now()
)
on conflict (tenant_id, auth_user_id) do nothing;

----------------------------------------------------------------------------------------------------
-- 2) CREAR USUARIO DE APLICACIÓN (perfil)
----------------------------------------------------------------------------------------------------

insert into public.users (
  id,
  tenant_id,
  auth_user_id,
  username,
  display_name,
  email,
  preferred_language_code,
  is_active,
  created_by,
  created_at
)
values (
  '99999999-9999-9999-9999-999999999999'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  '[AUTH_USER_ID]'::uuid,  -- ⚠️ REEMPLAZAR con el UUID de auth.users
  'admin',
  'Administrador Demo',
  'admin@demo.com',
  'es',
  true,
  'SYSTEM',
  now()
)
on conflict (auth_user_id) do nothing;

----------------------------------------------------------------------------------------------------
-- 3) CREAR ROL ADMINISTRADOR CON TODOS LOS PERMISOS
----------------------------------------------------------------------------------------------------

insert into public.roles (
  id,
  tenant_id,
  role_key,
  role_name,
  role_scope,
  is_active,
  created_by,
  created_at
)
values (
  '22222222-2222-2222-2222-222222222222'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'ADMIN_FULL',
  'Administrador Total',
  'TENANT',
  true,
  'SYSTEM',
  now()
)
on conflict (tenant_id, role_key) do nothing;

----------------------------------------------------------------------------------------------------
-- 4) ASIGNAR TODOS LOS SCREEN_ACTIONS AL ROL ADMIN
----------------------------------------------------------------------------------------------------

insert into public.role_screen_actions (
  tenant_id,
  role_id,
  screen_action_id,
  is_allowed,
  is_active,
  created_by,
  created_at
)
select
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  sa.id,
  true,
  true,
  'SYSTEM',
  now()
from public.screen_actions sa
on conflict (tenant_id, role_id, screen_action_id) 
do update set is_allowed = true, is_active = true;

----------------------------------------------------------------------------------------------------
-- 5) ASIGNAR EL ROL AL USUARIO
----------------------------------------------------------------------------------------------------

insert into public.user_roles (
  tenant_id,
  user_id,
  role_id,
  company_id,
  is_active,
  created_by,
  created_at
)
values (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '99999999-9999-9999-9999-999999999999'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  null,  -- aplica a todo el tenant
  true,
  'SYSTEM',
  now()
)
on conflict (tenant_id, user_id, role_id, company_id) do nothing;

----------------------------------------------------------------------------------------------------
-- 6) CREAR EMPRESA DEMO (opcional pero recomendado)
----------------------------------------------------------------------------------------------------

insert into public.companies (
  id,
  tenant_id,
  company_name,
  company_short_name,
  company_code,
  company_address,
  is_active,
  created_by,
  created_at
)
values (
  '33333333-3333-3333-3333-333333333333'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Empresa Demo S.A.',
  'DEMO',
  'DEMO001',
  'Av. Principal 123, Ciudad',
  true,
  'SYSTEM',
  now()
)
on conflict (tenant_id, company_code) do nothing;

----------------------------------------------------------------------------------------------------
-- VERIFICACIÓN
----------------------------------------------------------------------------------------------------

select 
  '✅ TENANT Y USUARIO CREADOS' as status,
  (select count(*) from public.tenants where id = '11111111-1111-1111-1111-111111111111') as tenant_exists,
  (select count(*) from public.users where id = '99999999-9999-9999-9999-999999999999') as user_exists,
  (select count(*) from public.roles where id = '22222222-2222-2222-2222-222222222222') as role_exists,
  (select count(*) from public.role_screen_actions where role_id = '22222222-2222-2222-2222-222222222222') as permissions_count,
  (select count(*) from public.user_roles where user_id = '99999999-9999-9999-9999-999999999999') as user_role_assigned;

-- Ver permisos del usuario admin
select 
  'Permisos del Usuario Admin' as info,
  s.screen_key,
  s.screen_name,
  a.action_key,
  rsa.is_allowed
from public.user_roles ur
join public.role_screen_actions rsa on ur.role_id = rsa.role_id
join public.screen_actions sa on rsa.screen_action_id = sa.id
join public.screens s on sa.screen_id = s.id
join public.actions a on sa.action_id = a.id
where ur.user_id = '99999999-9999-9999-9999-999999999999'
  and ur.is_active = true
  and rsa.is_active = true
order by s.screen_key, a.action_key
limit 20;
