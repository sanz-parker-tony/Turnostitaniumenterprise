/* ================================================================================================
 Turnos Titanium — CONFIGURACIÓN PARA SUPABASE AUTH
 Fecha: 2025-01-03
 Propósito: Integrar Supabase Auth con nuestra tabla de usuarios existente
================================================================================================ */

----------------------------------------------------------------------------------------------------
-- 1) FUNCIÓN: CREAR USUARIO EN PUBLIC.USERS CUANDO SE REGISTRA EN AUTH.USERS
----------------------------------------------------------------------------------------------------

-- Trigger que se ejecuta automáticamente cuando alguien se registra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_username varchar;
  v_display_name varchar;
begin
  -- Obtener tenant_id del metadata (se pasa durante el signup)
  v_tenant_id := (new.raw_user_meta_data->>'tenant_id')::uuid;
  
  -- Obtener username del metadata o usar parte del email
  v_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  
  -- Obtener display_name del metadata o usar username
  v_display_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    v_username
  );
  
  -- Si no hay tenant_id en metadata, crear uno temporal (para testing)
  if v_tenant_id is null then
    -- Buscar si existe un tenant por defecto
    select id into v_tenant_id from tenants where tenant_name = 'Default Tenant' limit 1;
    
    -- Si no existe, crear uno
    if v_tenant_id is null then
      insert into tenants (tenant_name, is_active, created_by)
      values ('Default Tenant', true, 'SYSTEM')
      returning id into v_tenant_id;
    end if;
  end if;

  -- Crear registro en public.users
  insert into public.users (
    auth_user_id,
    tenant_id,
    username,
    email,
    display_name,
    preferred_language_code,
    is_active,
    created_by
  )
  values (
    new.id,
    v_tenant_id,
    v_username,
    new.email,
    v_display_name,
    coalesce(new.raw_user_meta_data->>'preferred_language_code', 'es'),
    true,
    'AUTH_SYSTEM'
  );

  return new;
end;
$$;

-- Eliminar trigger anterior si existe
drop trigger if exists on_auth_user_created on auth.users;

-- Crear trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

comment on function public.handle_new_user is 
  'Crea automáticamente un registro en public.users cuando se registra un nuevo usuario en auth.users';

----------------------------------------------------------------------------------------------------
-- 2) FUNCIÓN: ACTUALIZAR LAST_LOGIN_AT
----------------------------------------------------------------------------------------------------

create or replace function public.handle_user_login()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Actualizar last_login_at en public.users
  update public.users
  set 
    last_login_at = now(),
    updated_at = now()
  where auth_user_id = new.id;

  return new;
end;
$$;

-- Eliminar trigger anterior si existe
drop trigger if exists on_auth_user_login on auth.users;

-- Crear trigger para actualizar en cada login
create trigger on_auth_user_login
  after update of last_sign_in_at on auth.users
  for each row 
  when (old.last_sign_in_at is distinct from new.last_sign_in_at)
  execute function public.handle_user_login();

comment on function public.handle_user_login is 
  'Actualiza last_login_at en public.users cuando el usuario hace login';

----------------------------------------------------------------------------------------------------
-- 3) AGREGAR COLUMNA LAST_LOGIN_AT SI NO EXISTE
----------------------------------------------------------------------------------------------------

alter table public.users 
add column if not exists last_login_at timestamptz;

comment on column public.users.last_login_at is 'Última fecha de login exitoso del usuario';

----------------------------------------------------------------------------------------------------
-- 4) FUNCIÓN MEJORADA: GET_USER_TENANT_ID
----------------------------------------------------------------------------------------------------

create or replace function public.get_user_tenant_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select tenant_id 
  from public.users 
  where auth_user_id = auth.uid() 
  limit 1;
$$;

grant execute on function public.get_user_tenant_id to authenticated, anon;

comment on function public.get_user_tenant_id is 
  'Obtiene el tenant_id del usuario autenticado desde auth.uid()';

----------------------------------------------------------------------------------------------------
-- 5) FUNCIÓN: OBTENER DATOS COMPLETOS DEL USUARIO ACTUAL
----------------------------------------------------------------------------------------------------

create or replace function public.get_current_user_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'id', u.id,
    'auth_user_id', u.auth_user_id,
    'tenant_id', u.tenant_id,
    'tenant_name', t.tenant_name,
    'username', u.username,
    'email', u.email,
    'display_name', u.display_name,
    'preferred_language_code', u.preferred_language_code,
    'last_login_at', u.last_login_at,
    'created_at', u.created_at
  )
  into v_result
  from public.users u
  join public.tenants t on u.tenant_id = t.id
  where u.auth_user_id = auth.uid()
    and u.is_active = true;

  if v_result is null then
    raise exception 'Usuario no encontrado o inactivo';
  end if;

  return v_result;
end;
$$;

grant execute on function public.get_current_user_profile to authenticated;

comment on function public.get_current_user_profile is 
  'Retorna el perfil completo del usuario autenticado';

----------------------------------------------------------------------------------------------------
-- 6) CREAR USUARIO ADMIN DE PRUEBA EN AUTH.USERS
----------------------------------------------------------------------------------------------------

-- NOTA: Este paso debe hacerse MANUALMENTE en Supabase Dashboard > Authentication > Users
-- O puedes invitar al usuario por email desde el dashboard

-- Para crear un usuario admin programáticamente, usa esta función:

create or replace function public.create_test_admin_user(
  p_email varchar,
  p_password varchar,
  p_tenant_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
  v_result jsonb;
begin
  -- Validar que estamos en un ambiente de desarrollo
  if current_setting('app.environment', true) = 'production' then
    raise exception 'Esta función solo puede ejecutarse en desarrollo';
  end if;

  -- Usar tenant_id proporcionado o buscar uno por defecto
  v_tenant_id := p_tenant_id;
  
  if v_tenant_id is null then
    select id into v_tenant_id from tenants where tenant_name = 'Titanium Demo' limit 1;
    
    if v_tenant_id is null then
      insert into tenants (tenant_name, is_active, created_by)
      values ('Titanium Demo', true, 'SYSTEM')
      returning id into v_tenant_id;
    end if;
  end if;

  -- Nota: No podemos crear usuarios en auth.users directamente desde SQL
  -- Esta función retorna las instrucciones para hacerlo manualmente
  
  v_result := jsonb_build_object(
    'success', false,
    'message', 'Debes crear el usuario manualmente en Supabase Dashboard',
    'instructions', jsonb_build_object(
      'step_1', 'Ve a Supabase Dashboard > Authentication > Users',
      'step_2', 'Click en "Invite User" o "Add User"',
      'step_3', format('Email: %s', p_email),
      'step_4', format('Password: %s', p_password),
      'step_5', format('User Metadata (JSON): {"tenant_id": "%s", "username": "admin", "display_name": "Administrador"}', v_tenant_id)
    )
  );

  return v_result;
end;
$$;

grant execute on function public.create_test_admin_user to postgres;

comment on function public.create_test_admin_user is 
  'Genera instrucciones para crear un usuario de prueba (solo desarrollo)';

----------------------------------------------------------------------------------------------------
-- 7) RLS: ACTUALIZAR POLICIES DE USERS
----------------------------------------------------------------------------------------------------

-- Las policies existentes ya usan get_user_tenant_id() que ahora funciona con auth.uid()
-- Solo necesitamos asegurarnos que la policy de SELECT permita ver el propio perfil

-- Eliminar policy anterior si existe
drop policy if exists "Users can view users in their tenant" on public.users;

-- Recrear con condición adicional para ver propio perfil
create policy "Users can view users in their tenant"
  on public.users for select
  using (
    tenant_id = get_user_tenant_id()
    or auth_user_id = auth.uid() -- Permite ver su propio perfil
  );

-- Policy para que usuarios puedan actualizar su propio perfil
drop policy if exists "Users can update their own profile" on public.users;

create policy "Users can update their own profile"
  on public.users for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

----------------------------------------------------------------------------------------------------
-- VERIFICACIÓN FINAL
----------------------------------------------------------------------------------------------------

select 
  '✅ Configuración de Supabase Auth Lista' as status,
  (select count(*) from pg_trigger where tgname = 'on_auth_user_created') as trigger_new_user,
  (select count(*) from pg_trigger where tgname = 'on_auth_user_login') as trigger_login,
  (select count(*) from information_schema.columns where table_name = 'users' and column_name = 'last_login_at') as last_login_column,
  (select count(*) from tenants where tenant_name = 'Titanium Demo') as demo_tenant_exists;

-- Mostrar instrucciones para crear usuario admin
select '📝 SIGUIENTE PASO: Crear usuario admin en Supabase Dashboard' as instrucciones;
select '1️⃣ Ve a: Authentication > Users > Add User' as step_1;
select '2️⃣ Email: admin@titanium.com' as step_2;
select '3️⃣ Password: Admin123!' as step_3;
select '4️⃣ Auto Confirm User: ✅ (habilitado)' as step_4;
select format('5️⃣ User Metadata: {"tenant_id": "%s", "username": "admin", "display_name": "Administrador Titanium"}', 
  (select id from tenants where tenant_name = 'Titanium Demo' limit 1)
) as step_5;
