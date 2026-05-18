-- ============================================================================
-- 038_ADD_SEGURIDADES_MENU_AND_USER_EMPLOYEE_SCOPES
-- Objetivo:
-- 1) Habilitar base de datos para gestion de acceso a empleados por usuario/rol
--    usando estructura por alcances organizacionales.
-- 2) Crear menu group SEGURIDADES para TENANT_ADMIN.
-- 3) Crear pantallas y permisos (actions, screen_actions, role_screen_actions).
--
-- Nota de diseno:
-- - Se reutiliza public.user_role_scopes para almacenar alcances por usuario/rol.
-- - Se asegura scope_type WORK_GROUP para cubrir: company, work_location,
--   department, area, cost_center, work_group y employee.
-- ============================================================================

SET search_path TO public;

-- 0) Scope types requeridos para la gestion de acceso a empleados
INSERT INTO public.scope_types (scope_type_key, scope_type_name, is_active, created_by)
SELECT x.scope_type_key, x.scope_type_name, true, 'SYSTEM'
FROM (
  VALUES
    ('COMPANY',       'Empresa'),
    ('WORK_LOCATION', 'Localizacion'),
    ('DEPARTMENT',    'Departamento'),
    ('AREA',          'Area'),
    ('COST_CENTER',   'Centro de Costo'),
    ('WORK_GROUP',    'Grupo de Trabajo'),
    ('EMPLOYEE_PROFILE', 'Perfil de Empleado'),
    ('EMPLOYEE',      'Empleado')
) AS x(scope_type_key, scope_type_name)
ON CONFLICT (scope_type_key)
DO UPDATE SET
  scope_type_name = EXCLUDED.scope_type_name,
  is_active = true,
  updated_by = 'SYSTEM',
  updated_at = now();

-- 1) Indices para acelerar busquedas por alcances
CREATE INDEX IF NOT EXISTS idx_user_role_scopes_tenant_role_type_entity_active
  ON public.user_role_scopes (tenant_id, user_role_id, scope_type_id, scope_entity_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_role_scopes_scope_type_entity_active
  ON public.user_role_scopes (scope_type_id, scope_entity_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_employee_companies_scope_matrix_active
  ON public.employee_companies (
    tenant_id,
    company_id,
    work_location_id,
    department_id,
    area_id,
    cost_center_id,
    work_group_id,
    employee_id
  )
  WHERE is_active = true;

-- 2) Vistas de apoyo para futura UI/API
CREATE OR REPLACE VIEW public.v_user_roles_employee_scope_targets AS
SELECT
  ur.id            AS user_role_id,
  ur.tenant_id     AS tenant_id,
  ur.user_id       AS user_id,
  u.username       AS username,
  u.display_name   AS display_name,
  r.id             AS role_id,
  r.role_key       AS role_key,
  r.role_name      AS role_name,
  ur.is_active     AS user_role_is_active,
  r.is_active      AS role_is_active
FROM public.user_roles ur
JOIN public.roles r
  ON r.id = ur.role_id
JOIN public.users u
  ON u.id = ur.user_id
WHERE ur.is_active = true
  AND r.is_active = true
  AND r.role_key IN ('SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN');

CREATE OR REPLACE VIEW public.v_user_role_scopes_resolved AS
SELECT
  urs.id,
  urs.tenant_id,
  urs.user_role_id,
  urs.scope_type_id,
  st.scope_type_key,
  st.scope_type_name,
  urs.scope_entity_id,
  CASE
    WHEN st.scope_type_key = 'COMPANY' THEN c.company_name
    WHEN st.scope_type_key = 'WORK_LOCATION' THEN wl.work_location_name
    WHEN st.scope_type_key = 'DEPARTMENT' THEN d.department_name
    WHEN st.scope_type_key = 'AREA' THEN a.area_name
    WHEN st.scope_type_key = 'COST_CENTER' THEN cc.cost_center_name
    WHEN st.scope_type_key = 'WORK_GROUP' THEN wg.work_group_name
    WHEN st.scope_type_key = 'EMPLOYEE_PROFILE' THEN ep.profile_name
    WHEN st.scope_type_key = 'EMPLOYEE' THEN CONCAT(e.employee_lastname, ' ', e.employee_name)
    ELSE NULL
  END AS scope_entity_name,
  urs.is_active,
  urs.created_by,
  urs.created_at,
  urs.updated_by,
  urs.updated_at
FROM public.user_role_scopes urs
JOIN public.scope_types st
  ON st.id = urs.scope_type_id
LEFT JOIN public.companies c
  ON st.scope_type_key = 'COMPANY'
 AND c.id = urs.scope_entity_id
LEFT JOIN public.work_locations wl
  ON st.scope_type_key = 'WORK_LOCATION'
 AND wl.id = urs.scope_entity_id
LEFT JOIN public.departments d
  ON st.scope_type_key = 'DEPARTMENT'
 AND d.id = urs.scope_entity_id
LEFT JOIN public.areas a
  ON st.scope_type_key = 'AREA'
 AND a.id = urs.scope_entity_id
LEFT JOIN public.cost_centers cc
  ON st.scope_type_key = 'COST_CENTER'
 AND cc.id = urs.scope_entity_id
LEFT JOIN public.work_groups wg
  ON st.scope_type_key = 'WORK_GROUP'
 AND wg.id = urs.scope_entity_id
LEFT JOIN public.employee_profiles ep
  ON st.scope_type_key = 'EMPLOYEE_PROFILE'
 AND ep.id = urs.scope_entity_id
LEFT JOIN public.employees e
  ON st.scope_type_key = 'EMPLOYEE'
 AND e.id = urs.scope_entity_id;

-- 2.1) Regla exacta de evaluacion de alcances por user_role -> empleados autorizados
-- Reglas implementadas:
-- - Solo aplica a user_roles activos con roles SUPERVISOR/RRHH_ADMIN/RHADMIN.
-- - Si NO hay scopes activos para el user_role, resultado = 0 empleados (deny by default).
-- - Scopes estructurales:
--   * Dentro de cada dimension: OR.
--   * Entre dimensiones con scopes definidos: AND.
--   * Si una dimension no tiene scopes para el user_role, no restringe.
-- - Scope EMPLOYEE: whitelist adicional (OR con estructural).
CREATE OR REPLACE VIEW public.v_user_role_authorized_employees AS
WITH target_user_roles AS (
  SELECT
    ur.id AS user_role_id,
    ur.tenant_id,
    ur.user_id,
    ur.role_id,
    r.role_key
  FROM public.user_roles ur
  JOIN public.roles r
    ON r.id = ur.role_id
  WHERE ur.is_active = true
    AND r.is_active = true
    AND r.role_key IN ('SUPERVISOR', 'RRHH_ADMIN', 'RHADMIN')
),
active_scopes AS (
  SELECT
    urs.tenant_id,
    urs.user_role_id,
    st.scope_type_key,
    urs.scope_entity_id
  FROM public.user_role_scopes urs
  JOIN public.scope_types st
    ON st.id = urs.scope_type_id
  WHERE urs.is_active = true
    AND st.is_active = true
),
scope_sets AS (
  SELECT
    tur.tenant_id,
    tur.user_role_id,
    tur.user_id,
    tur.role_id,
    tur.role_key,
    COUNT(*) FILTER (WHERE s.scope_type_key = 'COMPANY')       AS cnt_company,
    COUNT(*) FILTER (WHERE s.scope_type_key = 'WORK_LOCATION') AS cnt_work_location,
    COUNT(*) FILTER (WHERE s.scope_type_key = 'DEPARTMENT')    AS cnt_department,
    COUNT(*) FILTER (WHERE s.scope_type_key = 'AREA')          AS cnt_area,
    COUNT(*) FILTER (WHERE s.scope_type_key = 'COST_CENTER')   AS cnt_cost_center,
    COUNT(*) FILTER (WHERE s.scope_type_key = 'WORK_GROUP')    AS cnt_work_group,
    COUNT(*) FILTER (WHERE s.scope_type_key = 'EMPLOYEE_PROFILE') AS cnt_employee_profile,
    COUNT(*) FILTER (WHERE s.scope_type_key = 'EMPLOYEE')      AS cnt_employee,
    COALESCE(
      array_agg(s.scope_entity_id) FILTER (WHERE s.scope_type_key = 'COMPANY'),
      ARRAY[]::uuid[]
    ) AS company_ids,
    COALESCE(
      array_agg(s.scope_entity_id) FILTER (WHERE s.scope_type_key = 'WORK_LOCATION'),
      ARRAY[]::uuid[]
    ) AS work_location_ids,
    COALESCE(
      array_agg(s.scope_entity_id) FILTER (WHERE s.scope_type_key = 'DEPARTMENT'),
      ARRAY[]::uuid[]
    ) AS department_ids,
    COALESCE(
      array_agg(s.scope_entity_id) FILTER (WHERE s.scope_type_key = 'AREA'),
      ARRAY[]::uuid[]
    ) AS area_ids,
    COALESCE(
      array_agg(s.scope_entity_id) FILTER (WHERE s.scope_type_key = 'COST_CENTER'),
      ARRAY[]::uuid[]
    ) AS cost_center_ids,
    COALESCE(
      array_agg(s.scope_entity_id) FILTER (WHERE s.scope_type_key = 'WORK_GROUP'),
      ARRAY[]::uuid[]
    ) AS work_group_ids,
    COALESCE(
      array_agg(s.scope_entity_id) FILTER (WHERE s.scope_type_key = 'EMPLOYEE_PROFILE'),
      ARRAY[]::uuid[]
    ) AS employee_profile_ids,
    COALESCE(
      array_agg(s.scope_entity_id) FILTER (WHERE s.scope_type_key = 'EMPLOYEE'),
      ARRAY[]::uuid[]
    ) AS employee_ids
  FROM target_user_roles tur
  LEFT JOIN active_scopes s
    ON s.tenant_id = tur.tenant_id
   AND s.user_role_id = tur.user_role_id
  GROUP BY tur.tenant_id, tur.user_role_id, tur.user_id, tur.role_id, tur.role_key
),
employee_base AS (
  SELECT
    ec.tenant_id,
    ec.employee_id,
    ec.company_id,
    ec.work_location_id,
    ec.department_id,
    ec.area_id,
    ec.cost_center_id,
    ec.work_group_id,
    ec.employee_profile_id
  FROM public.employee_companies ec
  JOIN public.employees e
    ON e.id = ec.employee_id
   AND e.tenant_id = ec.tenant_id
  WHERE ec.is_active = true
    AND e.is_active = true
)
SELECT
  ss.tenant_id,
  ss.user_role_id,
  ss.user_id,
  ss.role_id,
  ss.role_key,
  eb.employee_id,
  eb.company_id,
  eb.work_location_id,
  eb.department_id,
  eb.area_id,
  eb.cost_center_id,
  eb.work_group_id,
  eb.employee_profile_id,
  CASE
    WHEN (
      ((ss.cnt_company + ss.cnt_work_location + ss.cnt_department + ss.cnt_area + ss.cnt_cost_center + ss.cnt_work_group + ss.cnt_employee_profile) > 0)
      AND (ss.cnt_company = 0 OR eb.company_id = ANY(ss.company_ids))
      AND (ss.cnt_work_location = 0 OR eb.work_location_id = ANY(ss.work_location_ids))
      AND (ss.cnt_department = 0 OR eb.department_id = ANY(ss.department_ids))
      AND (ss.cnt_area = 0 OR eb.area_id = ANY(ss.area_ids))
      AND (ss.cnt_cost_center = 0 OR eb.cost_center_id = ANY(ss.cost_center_ids))
      AND (ss.cnt_work_group = 0 OR eb.work_group_id = ANY(ss.work_group_ids))
      AND (ss.cnt_employee_profile = 0 OR eb.employee_profile_id = ANY(ss.employee_profile_ids))
    )
    AND (ss.cnt_employee > 0 AND eb.employee_id = ANY(ss.employee_ids)) THEN 'BOTH'
    WHEN (
      ((ss.cnt_company + ss.cnt_work_location + ss.cnt_department + ss.cnt_area + ss.cnt_cost_center + ss.cnt_work_group + ss.cnt_employee_profile) > 0)
      AND (ss.cnt_company = 0 OR eb.company_id = ANY(ss.company_ids))
      AND (ss.cnt_work_location = 0 OR eb.work_location_id = ANY(ss.work_location_ids))
      AND (ss.cnt_department = 0 OR eb.department_id = ANY(ss.department_ids))
      AND (ss.cnt_area = 0 OR eb.area_id = ANY(ss.area_ids))
      AND (ss.cnt_cost_center = 0 OR eb.cost_center_id = ANY(ss.cost_center_ids))
      AND (ss.cnt_work_group = 0 OR eb.work_group_id = ANY(ss.work_group_ids))
      AND (ss.cnt_employee_profile = 0 OR eb.employee_profile_id = ANY(ss.employee_profile_ids))
    ) THEN 'STRUCTURAL'
    WHEN (ss.cnt_employee > 0 AND eb.employee_id = ANY(ss.employee_ids)) THEN 'EMPLOYEE'
    ELSE NULL
  END AS authorization_source
FROM scope_sets ss
JOIN employee_base eb
  ON eb.tenant_id = ss.tenant_id
WHERE
  (
    ((ss.cnt_company + ss.cnt_work_location + ss.cnt_department + ss.cnt_area + ss.cnt_cost_center + ss.cnt_work_group + ss.cnt_employee_profile) > 0)
    AND (ss.cnt_company = 0 OR eb.company_id = ANY(ss.company_ids))
    AND (ss.cnt_work_location = 0 OR eb.work_location_id = ANY(ss.work_location_ids))
    AND (ss.cnt_department = 0 OR eb.department_id = ANY(ss.department_ids))
    AND (ss.cnt_area = 0 OR eb.area_id = ANY(ss.area_ids))
    AND (ss.cnt_cost_center = 0 OR eb.cost_center_id = ANY(ss.cost_center_ids))
    AND (ss.cnt_work_group = 0 OR eb.work_group_id = ANY(ss.work_group_ids))
    AND (ss.cnt_employee_profile = 0 OR eb.employee_profile_id = ANY(ss.employee_profile_ids))
  )
  OR (ss.cnt_employee > 0 AND eb.employee_id = ANY(ss.employee_ids));

-- 3) Menu + screens + actions + screen_actions + role_screen_actions
DO $$
DECLARE
  v_menu_seguridades uuid;
  v_screen_user_scopes uuid;
  v_screen_employee_access uuid;
  v_act_view uuid;
  v_act_create uuid;
  v_act_edit uuid;
  v_act_delete uuid;
  v_act_assign uuid;
BEGIN
  -- 3.1 Menu group SEGURIDADES
  SELECT id
    INTO v_menu_seguridades
  FROM public.system_menu_groups
  WHERE menu_group_key = 'SEGURIDADES'
  LIMIT 1;

  IF v_menu_seguridades IS NULL THEN
    INSERT INTO public.system_menu_groups (
      id,
      menu_group_key,
      menu_group_name,
      menu_group_short_name,
      icon_key,
      sort_order,
      is_active,
      created_by
    )
    VALUES (
      gen_random_uuid(),
      'SEGURIDADES',
      'Seguridades',
      'Seguridades',
      'ShieldCheck',
      6,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_menu_seguridades;
  ELSE
    UPDATE public.system_menu_groups
       SET menu_group_name = 'Seguridades',
           menu_group_short_name = 'Seguridades',
           icon_key = COALESCE(NULLIF(icon_key, ''), 'ShieldCheck'),
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_menu_seguridades;
  END IF;

  -- 3.2 Screen: alcances por usuario
  SELECT id
    INTO v_screen_user_scopes
  FROM public.screens
  WHERE screen_key = 'SEC_USER_ROLE_SCOPES'
  LIMIT 1;

  IF v_screen_user_scopes IS NULL THEN
    INSERT INTO public.screens (
      id,
      screen_key,
      screen_name,
      menu_label,
      menu_group_id,
      route_path,
      icon_key,
      sort_order,
      is_active,
      created_by
    )
    VALUES (
      gen_random_uuid(),
      'SEC_USER_ROLE_SCOPES',
      'Alcances Organizacion por Usuario',
      'Alcances por usuario',
      v_menu_seguridades,
      '/dashboard/security/user-role-scopes',
      'SlidersHorizontal',
      10,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_screen_user_scopes;
  ELSE
    UPDATE public.screens
       SET screen_name = 'Alcances Organizacion por Usuario',
           menu_label = 'Alcances por usuario',
           menu_group_id = v_menu_seguridades,
           route_path = '/dashboard/security/user-role-scopes',
           icon_key = COALESCE(NULLIF(icon_key, ''), 'SlidersHorizontal'),
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_screen_user_scopes;
  END IF;

  -- 3.3 Screen: autorizacion de empleados
  SELECT id
    INTO v_screen_employee_access
  FROM public.screens
  WHERE screen_key = 'SEC_USER_EMPLOYEE_ACCESS'
  LIMIT 1;

  IF v_screen_employee_access IS NULL THEN
    INSERT INTO public.screens (
      id,
      screen_key,
      screen_name,
      menu_label,
      menu_group_id,
      route_path,
      icon_key,
      sort_order,
      is_active,
      created_by
    )
    VALUES (
      gen_random_uuid(),
      'SEC_USER_EMPLOYEE_ACCESS',
      'Autorizacion Empleados por Usuario',
      'Acceso empleados',
      v_menu_seguridades,
      '/dashboard/security/user-employee-access',
      'Users',
      20,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_screen_employee_access;
  ELSE
    UPDATE public.screens
       SET screen_name = 'Autorizacion Empleados por Usuario',
           menu_label = 'Acceso empleados',
           menu_group_id = v_menu_seguridades,
           route_path = '/dashboard/security/user-employee-access',
           icon_key = COALESCE(NULLIF(icon_key, ''), 'Users'),
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_screen_employee_access;
  END IF;

  -- 3.4 Actions requeridas
  SELECT id INTO v_act_view   FROM public.actions WHERE action_key = 'VIEW'   LIMIT 1;
  SELECT id INTO v_act_create FROM public.actions WHERE action_key = 'CREATE' LIMIT 1;
  SELECT id INTO v_act_edit   FROM public.actions WHERE action_key = 'EDIT'   LIMIT 1;
  SELECT id INTO v_act_delete FROM public.actions WHERE action_key = 'DELETE' LIMIT 1;
  SELECT id INTO v_act_assign FROM public.actions WHERE action_key = 'ASSIGN' LIMIT 1;

  IF v_act_view IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'VIEW', 'Ver', true, 'SYSTEM')
    RETURNING id INTO v_act_view;
  END IF;

  IF v_act_create IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'CREATE', 'Crear', true, 'SYSTEM')
    RETURNING id INTO v_act_create;
  END IF;

  IF v_act_edit IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'EDIT', 'Editar', true, 'SYSTEM')
    RETURNING id INTO v_act_edit;
  END IF;

  IF v_act_delete IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'DELETE', 'Eliminar', true, 'SYSTEM')
    RETURNING id INTO v_act_delete;
  END IF;

  IF v_act_assign IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'ASSIGN', 'Asignar', true, 'SYSTEM')
    RETURNING id INTO v_act_assign;
  END IF;

  -- 3.5 Screen actions para ambas pantallas
  INSERT INTO public.screen_actions (id, screen_id, action_id, is_active, created_by)
  SELECT gen_random_uuid(), x.screen_id, x.action_id, true, 'SYSTEM'
  FROM (
    VALUES
      (v_screen_user_scopes, v_act_view),
      (v_screen_user_scopes, v_act_create),
      (v_screen_user_scopes, v_act_edit),
      (v_screen_user_scopes, v_act_delete),
      (v_screen_user_scopes, v_act_assign),
      (v_screen_employee_access, v_act_view),
      (v_screen_employee_access, v_act_create),
      (v_screen_employee_access, v_act_edit),
      (v_screen_employee_access, v_act_delete),
      (v_screen_employee_access, v_act_assign)
  ) AS x(screen_id, action_id)
  WHERE x.screen_id IS NOT NULL
    AND x.action_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.screen_actions sa
      WHERE sa.screen_id = x.screen_id
        AND sa.action_id = x.action_id
    );

  UPDATE public.screen_actions
     SET is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
   WHERE screen_id IN (v_screen_user_scopes, v_screen_employee_access)
     AND action_id IN (v_act_view, v_act_create, v_act_edit, v_act_delete, v_act_assign);

  -- 3.6 Permisos: solo TENANT_ADMIN
  INSERT INTO public.role_screen_actions (
    id,
    tenant_id,
    role_id,
    screen_action_id,
    is_allowed,
    is_active,
    created_by
  )
  SELECT
    gen_random_uuid(),
    r.tenant_id,
    r.id,
    sa.id,
    true,
    true,
    'SYSTEM'
  FROM public.roles r
  JOIN public.screen_actions sa
    ON sa.screen_id IN (v_screen_user_scopes, v_screen_employee_access)
   AND sa.is_active = true
  WHERE r.role_key = 'TENANT_ADMIN'
    AND r.is_active = true
    AND NOT EXISTS (
      SELECT 1
      FROM public.role_screen_actions rsa
      WHERE rsa.tenant_id = r.tenant_id
        AND rsa.role_id = r.id
        AND rsa.screen_action_id = sa.id
    );

  UPDATE public.role_screen_actions rsa
     SET is_allowed = true,
         is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
    FROM public.roles r
    JOIN public.screen_actions sa
      ON sa.screen_id IN (v_screen_user_scopes, v_screen_employee_access)
     AND sa.is_active = true
   WHERE r.role_key = 'TENANT_ADMIN'
     AND r.is_active = true
     AND rsa.tenant_id = r.tenant_id
     AND rsa.role_id = r.id
     AND rsa.screen_action_id = sa.id;

  -- 3.7 Seguridad defensiva: denegar a otros roles si ya tenian algun permiso
  UPDATE public.role_screen_actions rsa
     SET is_allowed = false,
         is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
    FROM public.roles r,
         public.screen_actions sa
   WHERE sa.screen_id IN (v_screen_user_scopes, v_screen_employee_access)
     AND rsa.screen_action_id = sa.id
     AND rsa.role_id = r.id
     AND COALESCE(r.role_key, '') <> 'TENANT_ADMIN';

  RAISE NOTICE '038: Seguridades + scopes + permisos configurados correctamente.';
END $$;
