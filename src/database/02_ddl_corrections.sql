/* ================================================================================================
 Turnos Titanium — CORRECCIONES Y ADICIONES AL DDL BASE
 Fecha: 2025-01-03
 Propósito: Ajustes críticos para compatibilidad con frontend permission-driven
================================================================================================ */

----------------------------------------------------------------------------------------------------
-- 1) AGREGAR CAMPO icon_key A SCREENS
----------------------------------------------------------------------------------------------------

-- Este campo es CRÍTICO para el menú dinámico con iconMapper.tsx
alter table public.screens
  add column if not exists icon_key varchar(50) null;

comment on column public.screens.icon_key is 'Clave del ícono en iconMapper.tsx (ej: Users, Clock, Shield)';

----------------------------------------------------------------------------------------------------
-- 2) CREAR FUNCIONES PARA COPIAR PERMISOS
----------------------------------------------------------------------------------------------------

/* clone_role: Clona un rol completo creando uno nuevo
   Parámetros:
   - p_tenant_id: ID del tenant
   - p_source_role_id: Rol a clonar
   - p_new_role_key: Clave del nuevo rol
   - p_new_role_name: Nombre del nuevo rol
   - p_new_role_description: Descripción (opcional)
   - p_created_by: ID del usuario que ejecuta
   Retorna: JSONB con resultado y contadores */
create or replace function public.clone_role(
  p_tenant_id uuid,
  p_source_role_id uuid,
  p_new_role_key varchar,
  p_new_role_name varchar,
  p_new_role_description text default null,
  p_created_by uuid
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_new_role_id uuid;
  v_screen_actions_count int := 0;
  v_reports_count int := 0;
  v_copy_run_id uuid;
  v_result jsonb;
  v_source_role_name varchar;
begin
  -- 1. Validar que el rol origen existe y está activo
  if not exists (
    select 1 from public.roles 
    where id = p_source_role_id 
    and tenant_id = p_tenant_id 
    and is_active = true
  ) then
    raise exception 'Rol origen no encontrado o inactivo';
  end if;

  -- Obtener nombre del rol origen
  select role_name into v_source_role_name
  from public.roles
  where id = p_source_role_id;

  -- 2. Validar que la clave del nuevo rol no existe
  if exists (
    select 1 from public.roles 
    where role_key = p_new_role_key 
    and tenant_id = p_tenant_id
  ) then
    raise exception 'Ya existe un rol con la clave: %', p_new_role_key;
  end if;

  -- 3. Crear el nuevo rol
  insert into public.roles (
    tenant_id,
    role_key,
    role_name,
    role_scope,
    base_role_id,
    role_version,
    is_active,
    created_by,
    created_at
  )
  select
    p_tenant_id,
    p_new_role_key,
    p_new_role_name,
    role_scope,
    p_source_role_id, -- marcar de dónde viene
    1, -- nueva versión
    true,
    p_created_by,
    now()
  from public.roles
  where id = p_source_role_id
  returning id into v_new_role_id;

  -- 4. Registrar operación de clonación
  insert into public.role_permission_copy_runs (
    tenant_id,
    operation_type,
    merge_strategy,
    source_role_id,
    created_role_id,
    copy_screen_actions,
    copy_report_permissions,
    copy_scopes,
    executed_by,
    executed_at,
    status,
    summary
  ) values (
    p_tenant_id,
    'CLONE',
    'MERGE', -- no aplica en CLONE pero es campo obligatorio
    p_source_role_id,
    v_new_role_id,
    true,
    true,
    true,
    p_created_by,
    now(),
    'RUNNING',
    '{}'::jsonb
  ) returning id into v_copy_run_id;

  -- 5. Snapshot BEFORE del nuevo rol (vacío)
  insert into public.role_permission_snapshots (
    tenant_id,
    copy_run_id,
    role_id,
    snapshot_type,
    snapshot,
    created_by,
    created_at
  ) values (
    p_tenant_id,
    v_copy_run_id,
    v_new_role_id,
    'BEFORE',
    jsonb_build_object(
      'screen_actions', '[]'::jsonb,
      'report_permissions', '[]'::jsonb
    ),
    p_created_by,
    now()
  );

  -- 6. Copiar role_screen_actions
  insert into public.role_screen_actions (
    tenant_id,
    role_id,
    screen_action_id,
    is_allowed,
    valid_from,
    valid_to,
    is_active,
    created_by,
    created_at
  )
  select
    p_tenant_id,
    v_new_role_id,
    screen_action_id,
    is_allowed,
    valid_from,
    valid_to,
    is_active,
    p_created_by,
    now()
  from public.role_screen_actions
  where role_id = p_source_role_id
    and tenant_id = p_tenant_id
    and is_active = true;

  get diagnostics v_screen_actions_count = row_count;

  -- 7. Copiar report_permissions
  insert into public.report_permissions (
    tenant_id,
    role_id,
    system_report_id,
    can_view,
    can_export,
    is_active,
    created_by,
    created_at
  )
  select
    p_tenant_id,
    v_new_role_id,
    system_report_id,
    can_view,
    can_export,
    is_active,
    p_created_by,
    now()
  from public.report_permissions
  where role_id = p_source_role_id
    and tenant_id = p_tenant_id
    and is_active = true;

  get diagnostics v_reports_count = row_count;

  -- 8. Snapshot AFTER del nuevo rol
  insert into public.role_permission_snapshots (
    tenant_id,
    copy_run_id,
    role_id,
    snapshot_type,
    snapshot,
    created_by,
    created_at
  )
  select
    p_tenant_id,
    v_copy_run_id,
    v_new_role_id,
    'AFTER',
    jsonb_build_object(
      'screen_actions', coalesce(
        (select jsonb_agg(rsa) from public.role_screen_actions rsa where rsa.role_id = v_new_role_id),
        '[]'::jsonb
      ),
      'report_permissions', coalesce(
        (select jsonb_agg(rp) from public.report_permissions rp where rp.role_id = v_new_role_id),
        '[]'::jsonb
      )
    ),
    p_created_by,
    now();

  -- 9. Actualizar estado del copy_run
  update public.role_permission_copy_runs
  set 
    status = 'DONE',
    summary = jsonb_build_object(
      'screen_actions_copied', v_screen_actions_count,
      'reports_copied', v_reports_count,
      'scopes_copied', 0
    ),
    updated_at = now()
  where id = v_copy_run_id;

  -- 10. Registrar en audit_log
  insert into public.audit_log (
    tenant_id,
    user_id,
    company_id,
    action_key,
    entity_type,
    entity_id,
    metadata,
    created_at
  ) values (
    p_tenant_id,
    p_created_by,
    null,
    'CLONE_ROLE',
    'roles',
    v_new_role_id,
    jsonb_build_object(
      'source_role_id', p_source_role_id,
      'source_role_name', v_source_role_name,
      'new_role_key', p_new_role_key,
      'new_role_name', p_new_role_name,
      'screen_actions_copied', v_screen_actions_count,
      'reports_copied', v_reports_count,
      'copy_run_id', v_copy_run_id
    ),
    now()
  );

  -- 11. Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'new_role_id', v_new_role_id,
    'new_role_key', p_new_role_key,
    'new_role_name', p_new_role_name,
    'source_role_id', p_source_role_id,
    'counts', jsonb_build_object(
      'screenActions', v_screen_actions_count,
      'reports', v_reports_count,
      'scopes', 0
    ),
    'audit_id', v_copy_run_id
  );

  return v_result;

exception
  when others then
    -- Marcar como error si existe el copy_run
    if v_copy_run_id is not null then
      update public.role_permission_copy_runs
      set status = 'ERROR', error_message = sqlerrm, updated_at = now()
      where id = v_copy_run_id;
    end if;
    
    raise exception 'Error clonando rol: %', sqlerrm;
end;
$$;

comment on function public.clone_role is 'Clona un rol completo con todos sus permisos (NO copia usuarios)';

----------------------------------------------------------------------------------------------------

/* copy_role_permissions: Copia permisos entre roles existentes
   Parámetros:
   - p_tenant_id: ID del tenant
   - p_source_role_id: Rol origen
   - p_target_role_id: Rol destino
   - p_strategy: 'MERGE' o 'OVERWRITE'
   - p_copy_screen_actions: Copiar acciones de pantalla
   - p_copy_reports: Copiar permisos de reportes
   - p_copy_scopes: Copiar scopes (futuro)
   - p_updated_by: ID del usuario que ejecuta
   Retorna: JSONB con resultado */
create or replace function public.copy_role_permissions(
  p_tenant_id uuid,
  p_source_role_id uuid,
  p_target_role_id uuid,
  p_strategy varchar,
  p_copy_screen_actions boolean default true,
  p_copy_reports boolean default true,
  p_copy_scopes boolean default true,
  p_updated_by uuid
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_screen_actions_count int := 0;
  v_reports_count int := 0;
  v_scopes_count int := 0;
  v_copy_run_id uuid;
  v_result jsonb;
  v_source_role_name varchar;
  v_target_role_name varchar;
  v_snapshot_before jsonb;
begin
  -- 1. Validaciones
  if p_source_role_id = p_target_role_id then
    raise exception 'El rol origen y destino no pueden ser el mismo';
  end if;

  if not exists (
    select 1 from public.roles 
    where id = p_source_role_id 
    and tenant_id = p_tenant_id 
    and is_active = true
  ) then
    raise exception 'Rol origen no encontrado';
  end if;

  if not exists (
    select 1 from public.roles 
    where id = p_target_role_id 
    and tenant_id = p_tenant_id 
    and is_active = true
  ) then
    raise exception 'Rol destino no encontrado';
  end if;

  if p_strategy not in ('MERGE', 'OVERWRITE') then
    raise exception 'Estrategia inválida. Use MERGE o OVERWRITE';
  end if;

  -- Obtener nombres de roles
  select role_name into v_source_role_name from public.roles where id = p_source_role_id;
  select role_name into v_target_role_name from public.roles where id = p_target_role_id;

  -- 2. Registrar operación
  insert into public.role_permission_copy_runs (
    tenant_id,
    operation_type,
    merge_strategy,
    source_role_id,
    target_role_id,
    copy_screen_actions,
    copy_report_permissions,
    copy_scopes,
    executed_by,
    executed_at,
    status,
    summary
  ) values (
    p_tenant_id,
    'COPY',
    p_strategy,
    p_source_role_id,
    p_target_role_id,
    p_copy_screen_actions,
    p_copy_reports,
    p_copy_scopes,
    p_updated_by,
    now(),
    'RUNNING',
    '{}'::jsonb
  ) returning id into v_copy_run_id;

  -- 3. Snapshot BEFORE del rol destino
  select jsonb_build_object(
    'screen_actions', coalesce(
      (select jsonb_agg(rsa) from public.role_screen_actions rsa where rsa.role_id = p_target_role_id),
      '[]'::jsonb
    ),
    'report_permissions', coalesce(
      (select jsonb_agg(rp) from public.report_permissions rp where rp.role_id = p_target_role_id),
      '[]'::jsonb
    )
  ) into v_snapshot_before;

  insert into public.role_permission_snapshots (
    tenant_id,
    copy_run_id,
    role_id,
    snapshot_type,
    snapshot,
    created_by,
    created_at
  ) values (
    p_tenant_id,
    v_copy_run_id,
    p_target_role_id,
    'BEFORE',
    v_snapshot_before,
    p_updated_by,
    now()
  );

  -- 4. COPIAR SCREEN_ACTIONS
  if p_copy_screen_actions then
    if p_strategy = 'OVERWRITE' then
      -- Eliminar permisos existentes
      delete from public.role_screen_actions
      where role_id = p_target_role_id
        and tenant_id = p_tenant_id;
    end if;

    -- Insertar/actualizar permisos
    insert into public.role_screen_actions (
      tenant_id,
      role_id,
      screen_action_id,
      is_allowed,
      valid_from,
      valid_to,
      is_active,
      created_by,
      created_at,
      updated_by,
      updated_at
    )
    select
      p_tenant_id,
      p_target_role_id,
      screen_action_id,
      is_allowed,
      valid_from,
      valid_to,
      is_active,
      p_updated_by,
      now(),
      p_updated_by,
      now()
    from public.role_screen_actions
    where role_id = p_source_role_id
      and tenant_id = p_tenant_id
      and is_active = true
    on conflict (tenant_id, role_id, screen_action_id) 
    do update set
      is_allowed = excluded.is_allowed,
      is_active = excluded.is_active,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at;

    get diagnostics v_screen_actions_count = row_count;
  end if;

  -- 5. COPIAR REPORT_PERMISSIONS
  if p_copy_reports then
    if p_strategy = 'OVERWRITE' then
      delete from public.report_permissions
      where role_id = p_target_role_id
        and tenant_id = p_tenant_id;
    end if;

    insert into public.report_permissions (
      tenant_id,
      role_id,
      system_report_id,
      can_view,
      can_export,
      is_active,
      created_by,
      created_at,
      updated_by,
      updated_at
    )
    select
      p_tenant_id,
      p_target_role_id,
      system_report_id,
      can_view,
      can_export,
      is_active,
      p_updated_by,
      now(),
      p_updated_by,
      now()
    from public.report_permissions
    where role_id = p_source_role_id
      and tenant_id = p_tenant_id
      and is_active = true
    on conflict (tenant_id, role_id, system_report_id)
    do update set
      can_view = excluded.can_view,
      can_export = excluded.can_export,
      is_active = excluded.is_active,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at;

    get diagnostics v_reports_count = row_count;
  end if;

  -- 6. Snapshot AFTER
  insert into public.role_permission_snapshots (
    tenant_id,
    copy_run_id,
    role_id,
    snapshot_type,
    snapshot,
    created_by,
    created_at
  )
  select
    p_tenant_id,
    v_copy_run_id,
    p_target_role_id,
    'AFTER',
    jsonb_build_object(
      'screen_actions', coalesce(
        (select jsonb_agg(rsa) from public.role_screen_actions rsa where rsa.role_id = p_target_role_id),
        '[]'::jsonb
      ),
      'report_permissions', coalesce(
        (select jsonb_agg(rp) from public.report_permissions rp where rp.role_id = p_target_role_id),
        '[]'::jsonb
      )
    ),
    p_updated_by,
    now();

  -- 7. Actualizar copy_run
  update public.role_permission_copy_runs
  set 
    status = 'DONE',
    summary = jsonb_build_object(
      'screen_actions_copied', v_screen_actions_count,
      'reports_copied', v_reports_count,
      'scopes_copied', v_scopes_count
    ),
    updated_at = now()
  where id = v_copy_run_id;

  -- 8. Auditoría
  insert into public.audit_log (
    tenant_id,
    user_id,
    company_id,
    action_key,
    entity_type,
    entity_id,
    metadata,
    created_at
  ) values (
    p_tenant_id,
    p_updated_by,
    null,
    'COPY_PERMISSIONS',
    'roles',
    p_target_role_id,
    jsonb_build_object(
      'source_role_id', p_source_role_id,
      'source_role_name', v_source_role_name,
      'target_role_name', v_target_role_name,
      'strategy', p_strategy,
      'screen_actions_copied', v_screen_actions_count,
      'reports_copied', v_reports_count,
      'copy_run_id', v_copy_run_id
    ),
    now()
  );

  -- 9. Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'source_role_id', p_source_role_id,
    'target_role_id', p_target_role_id,
    'strategy', p_strategy,
    'counts', jsonb_build_object(
      'screenActions', v_screen_actions_count,
      'reports', v_reports_count,
      'scopes', v_scopes_count
    ),
    'audit_id', v_copy_run_id
  );

  return v_result;

exception
  when others then
    if v_copy_run_id is not null then
      update public.role_permission_copy_runs
      set status = 'ERROR', error_message = sqlerrm, updated_at = now()
      where id = v_copy_run_id;
    end if;
    
    raise exception 'Error copiando permisos: %', sqlerrm;
end;
$$;

comment on function public.copy_role_permissions is 'Copia permisos entre roles con estrategia MERGE u OVERWRITE';

----------------------------------------------------------------------------------------------------
-- 3) ÍNDICES ADICIONALES PARA PERFORMANCE
----------------------------------------------------------------------------------------------------

-- Para búsquedas de menú por usuario
create index if not exists ix_user_roles_tenant_user
  on public.user_roles (tenant_id, user_id)
  where is_active = true;

-- Para filtrado de screens activas
create index if not exists ix_screens_active
  on public.screens (is_active, sort_order)
  where is_active = true;

-- Para búsquedas de screen_actions
create index if not exists ix_screen_actions_screen
  on public.screen_actions (screen_id)
  where is_active = true;

----------------------------------------------------------------------------------------------------
-- 4) COMENTARIOS ADICIONALES
----------------------------------------------------------------------------------------------------

comment on table public.role_permission_copy_runs is 'Registro de operaciones de clonación/copia de permisos entre roles';
comment on table public.role_permission_snapshots is 'Snapshots BEFORE/AFTER de permisos al copiar roles';
comment on column public.screens.icon_key is 'Mapea a iconos de Lucide React (Users, Shield, Clock, etc.)';

-- FIN CORRECCIONES
