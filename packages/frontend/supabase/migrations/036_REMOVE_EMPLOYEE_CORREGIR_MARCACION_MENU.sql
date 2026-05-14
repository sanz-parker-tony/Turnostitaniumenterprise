-- ============================================================================
-- 036_REMOVE_EMPLOYEE_CORREGIR_MARCACION_MENU.sql
-- Quita la opcion de menu "Corregir marcacion" para rol EMPLOYEE.
-- Estrategia:
-- 1) Detectar pantallas objetivo por screen_key/route_path/menu_label/screen_name
-- 2) Revocar permisos (is_allowed=false) en role_screen_actions para EMPLOYEE
-- 3) Insertar denegaciones explicitas faltantes para mantener comportamiento estable
-- Idempotente.
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_rows_updated integer := 0;
  v_rows_inserted integer := 0;
BEGIN
  -- 1) Revocar permisos existentes para EMPLOYEE en pantallas objetivo
  WITH target_screens AS (
    SELECT s.id
    FROM public.screens s
    WHERE s.is_active = true
      AND (
        UPPER(COALESCE(s.screen_key, '')) IN (
          'KIOSK_REGULARIZATION',
          'KIOSK_TIME_PUNCH_REGULARIZATION',
          'KIOSK_TIME_PUNCH_CORRECTION'
        )
        OR LOWER(COALESCE(s.route_path, '')) LIKE '%/kiosk/regularization%'
        OR LOWER(COALESCE(s.route_path, '')) LIKE '%/dashboard/kiosk/regularization%'
        OR (
          LOWER(COALESCE(s.menu_label, '')) LIKE '%corregir%'
          AND LOWER(COALESCE(s.menu_label, '')) LIKE '%marc%'
        )
        OR (
          LOWER(COALESCE(s.screen_name, '')) LIKE '%corregir%'
          AND LOWER(COALESCE(s.screen_name, '')) LIKE '%marc%'
        )
        OR LOWER(COALESCE(s.menu_label, '')) LIKE '%regulariz%'
        OR LOWER(COALESCE(s.screen_name, '')) LIKE '%regulariz%'
      )
  ), target_screen_actions AS (
    SELECT sa.id AS screen_action_id
    FROM public.screen_actions sa
    INNER JOIN target_screens ts
      ON ts.id = sa.screen_id
    WHERE sa.is_active = true
  )
  UPDATE public.role_screen_actions rsa
     SET is_allowed = false,
         is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
    FROM public.roles r
   WHERE rsa.role_id = r.id
     AND rsa.tenant_id = r.tenant_id
     AND r.role_key = 'EMPLOYEE'
     AND r.is_active = true
     AND rsa.screen_action_id IN (SELECT screen_action_id FROM target_screen_actions)
     AND (rsa.is_allowed = true OR rsa.is_active = false);

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  -- 2) Crear denegaciones explicitas faltantes para EMPLOYEE
  WITH target_screens AS (
    SELECT s.id
    FROM public.screens s
    WHERE s.is_active = true
      AND (
        UPPER(COALESCE(s.screen_key, '')) IN (
          'KIOSK_REGULARIZATION',
          'KIOSK_TIME_PUNCH_REGULARIZATION',
          'KIOSK_TIME_PUNCH_CORRECTION'
        )
        OR LOWER(COALESCE(s.route_path, '')) LIKE '%/kiosk/regularization%'
        OR LOWER(COALESCE(s.route_path, '')) LIKE '%/dashboard/kiosk/regularization%'
        OR (
          LOWER(COALESCE(s.menu_label, '')) LIKE '%corregir%'
          AND LOWER(COALESCE(s.menu_label, '')) LIKE '%marc%'
        )
        OR (
          LOWER(COALESCE(s.screen_name, '')) LIKE '%corregir%'
          AND LOWER(COALESCE(s.screen_name, '')) LIKE '%marc%'
        )
        OR LOWER(COALESCE(s.menu_label, '')) LIKE '%regulariz%'
        OR LOWER(COALESCE(s.screen_name, '')) LIKE '%regulariz%'
      )
  ), target_screen_actions AS (
    SELECT sa.id AS screen_action_id
    FROM public.screen_actions sa
    INNER JOIN target_screens ts
      ON ts.id = sa.screen_id
    WHERE sa.is_active = true
  )
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
    tsa.screen_action_id,
    false,
    true,
    'SYSTEM'
  FROM public.roles r
  INNER JOIN target_screen_actions tsa
    ON true
  WHERE r.role_key = 'EMPLOYEE'
    AND r.is_active = true
    AND NOT EXISTS (
      SELECT 1
      FROM public.role_screen_actions rsa
      WHERE rsa.tenant_id = r.tenant_id
        AND rsa.role_id = r.id
        AND rsa.screen_action_id = tsa.screen_action_id
    );

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  RAISE NOTICE '036_REMOVE_EMPLOYEE_CORREGIR_MARCACION_MENU: updated=% inserted=%', v_rows_updated, v_rows_inserted;
END $$;
