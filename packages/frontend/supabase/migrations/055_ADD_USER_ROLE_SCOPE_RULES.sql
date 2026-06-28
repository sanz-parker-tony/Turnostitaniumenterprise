-- 055_ADD_USER_ROLE_SCOPE_RULES
-- Replantea los alcances organizacionales por usuario/rol como reglas explicitas
-- sobre la combinacion laboral de employee_companies.

CREATE TABLE IF NOT EXISTS public.user_role_scope_rules (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    user_role_id uuid NOT NULL,
    company_id uuid NOT NULL,
    work_location_id uuid NULL,
    department_id uuid NULL,
    area_id uuid NULL,
    cost_center_id uuid NULL,
    work_group_id uuid NULL,
    employee_profile_id uuid NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_by character varying COLLATE pg_catalog."default" NOT NULL DEFAULT 'SYSTEM',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by character varying COLLATE pg_catalog."default",
    updated_at timestamp with time zone,
    CONSTRAINT user_role_scope_rules_pkey PRIMARY KEY (id),
    CONSTRAINT user_role_scope_rules_tenant_id_fkey
        FOREIGN KEY (tenant_id)
        REFERENCES public.tenants (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT user_role_scope_rules_user_role_id_fkey
        FOREIGN KEY (user_role_id)
        REFERENCES public.user_roles (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT user_role_scope_rules_company_id_fkey
        FOREIGN KEY (company_id)
        REFERENCES public.companies (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT user_role_scope_rules_work_location_id_fkey
        FOREIGN KEY (work_location_id)
        REFERENCES public.work_locations (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT user_role_scope_rules_department_id_fkey
        FOREIGN KEY (department_id)
        REFERENCES public.departments (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT user_role_scope_rules_area_id_fkey
        FOREIGN KEY (area_id)
        REFERENCES public.areas (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT user_role_scope_rules_cost_center_id_fkey
        FOREIGN KEY (cost_center_id)
        REFERENCES public.cost_centers (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT user_role_scope_rules_work_group_id_fkey
        FOREIGN KEY (work_group_id)
        REFERENCES public.work_groups (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT user_role_scope_rules_employee_profile_id_fkey
        FOREIGN KEY (employee_profile_id)
        REFERENCES public.employee_profiles (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_user_role_scope_rules_tenant_role_active
    ON public.user_role_scope_rules (tenant_id, user_role_id, is_active);

CREATE INDEX IF NOT EXISTS idx_user_role_scope_rules_hierarchy_active
    ON public.user_role_scope_rules (
        tenant_id,
        company_id,
        work_location_id,
        department_id,
        area_id,
        cost_center_id,
        work_group_id,
        employee_profile_id
    )
    WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_role_scope_rules_active_rule
    ON public.user_role_scope_rules (
        tenant_id,
        user_role_id,
        company_id,
        COALESCE(work_location_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(department_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(area_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(cost_center_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(work_group_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(employee_profile_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
    WHERE is_active = true;

CREATE OR REPLACE VIEW public.v_user_role_authorized_employees AS
WITH target_user_roles AS (
  SELECT
    ur.tenant_id,
    ur.id AS user_role_id,
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
active_legacy_scopes AS (
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
legacy_scope_sets AS (
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
    COALESCE(array_agg(s.scope_entity_id) FILTER (WHERE s.scope_type_key = 'COMPANY'), ARRAY[]::uuid[]) AS company_ids,
    COALESCE(array_agg(s.scope_entity_id) FILTER (WHERE s.scope_type_key = 'WORK_LOCATION'), ARRAY[]::uuid[]) AS work_location_ids,
    COALESCE(array_agg(s.scope_entity_id) FILTER (WHERE s.scope_type_key = 'DEPARTMENT'), ARRAY[]::uuid[]) AS department_ids,
    COALESCE(array_agg(s.scope_entity_id) FILTER (WHERE s.scope_type_key = 'AREA'), ARRAY[]::uuid[]) AS area_ids,
    COALESCE(array_agg(s.scope_entity_id) FILTER (WHERE s.scope_type_key = 'COST_CENTER'), ARRAY[]::uuid[]) AS cost_center_ids,
    COALESCE(array_agg(s.scope_entity_id) FILTER (WHERE s.scope_type_key = 'WORK_GROUP'), ARRAY[]::uuid[]) AS work_group_ids,
    COALESCE(array_agg(s.scope_entity_id) FILTER (WHERE s.scope_type_key = 'EMPLOYEE_PROFILE'), ARRAY[]::uuid[]) AS employee_profile_ids,
    COALESCE(array_agg(s.scope_entity_id) FILTER (WHERE s.scope_type_key = 'EMPLOYEE'), ARRAY[]::uuid[]) AS employee_ids
  FROM target_user_roles tur
  LEFT JOIN active_legacy_scopes s
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
),
legacy_authorized AS (
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
    END AS authorization_source,
    eb.employee_profile_id
  FROM legacy_scope_sets ss
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
    OR (ss.cnt_employee > 0 AND eb.employee_id = ANY(ss.employee_ids))
),
rule_authorized AS (
  SELECT
    tur.tenant_id,
    tur.user_role_id,
    tur.user_id,
    tur.role_id,
    tur.role_key,
    eb.employee_id,
    eb.company_id,
    eb.work_location_id,
    eb.department_id,
    eb.area_id,
    eb.cost_center_id,
    eb.work_group_id,
    'STRUCTURAL'::text AS authorization_source,
    eb.employee_profile_id
  FROM target_user_roles tur
  JOIN public.user_role_scope_rules r
    ON r.tenant_id = tur.tenant_id
   AND r.user_role_id = tur.user_role_id
   AND r.is_active = true
  JOIN employee_base eb
    ON eb.tenant_id = r.tenant_id
   AND eb.company_id = r.company_id
   AND (r.work_location_id IS NULL OR eb.work_location_id = r.work_location_id)
   AND (r.department_id IS NULL OR eb.department_id = r.department_id)
   AND (r.area_id IS NULL OR eb.area_id = r.area_id)
   AND (r.cost_center_id IS NULL OR eb.cost_center_id = r.cost_center_id)
   AND (r.work_group_id IS NULL OR eb.work_group_id = r.work_group_id)
   AND (r.employee_profile_id IS NULL OR eb.employee_profile_id = r.employee_profile_id)
)
SELECT DISTINCT *
FROM (
  SELECT * FROM legacy_authorized WHERE authorization_source IS NOT NULL
  UNION ALL
  SELECT * FROM rule_authorized
) authorized;
