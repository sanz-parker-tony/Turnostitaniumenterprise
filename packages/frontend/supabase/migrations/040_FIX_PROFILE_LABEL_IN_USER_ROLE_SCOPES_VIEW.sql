-- ============================================================================
-- 040_FIX_PROFILE_LABEL_IN_USER_ROLE_SCOPES_VIEW
-- Objetivo:
-- - Mostrar profile_name (no UUID) cuando scope_type_key = EMPLOYEE_PROFILE
--   en la vista v_user_role_scopes_resolved.
-- ============================================================================

SET search_path TO public;

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
