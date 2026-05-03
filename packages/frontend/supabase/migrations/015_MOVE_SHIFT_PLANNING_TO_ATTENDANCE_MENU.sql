-- ============================================================================
-- 015_MOVE_SHIFT_PLANNING_TO_ATTENDANCE_MENU
-- Mueve Planificación de Turnos al menú Asistencia (primera posición)
-- y reemplaza el menú legacy "Turnos" (SHIFT_ASSIGNMENT)
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_attendance_group_id uuid;
  v_shift_planning_id uuid;
  v_legacy_turns_id uuid;
BEGIN
  SELECT id INTO v_attendance_group_id
  FROM public.system_menu_groups
  WHERE menu_group_key = 'ATTENDANCE'
  LIMIT 1;

  IF v_attendance_group_id IS NULL THEN
    RAISE NOTICE 'No existe menu_group ATTENDANCE. Se omite ajuste de menú para Planificación de Turnos.';
    RETURN;
  END IF;

  SELECT id INTO v_shift_planning_id
  FROM public.screens
  WHERE screen_key = 'EMPLOYEE_SHIFT_PLANNING'
  LIMIT 1;

  IF v_shift_planning_id IS NOT NULL THEN
    UPDATE public.screens
       SET screen_name = 'Planificación de Turnos',
           menu_label = 'Planificación de Turnos',
           menu_group_id = v_attendance_group_id,
           route_path = '/dashboard/attendance/shifts',
           icon_key = 'Calendar',
           sort_order = 105,
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_shift_planning_id;
  ELSE
    RAISE NOTICE 'No existe screen_key EMPLOYEE_SHIFT_PLANNING. Se omite movimiento al menú Asistencia.';
  END IF;

  -- Reemplazar menú legacy "Turnos" del grupo Asistencia
  SELECT id INTO v_legacy_turns_id
  FROM public.screens
  WHERE screen_key = 'SHIFT_ASSIGNMENT'
  LIMIT 1;

  IF v_legacy_turns_id IS NOT NULL THEN
    UPDATE public.screens
       SET is_active = false,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_legacy_turns_id;

    UPDATE public.screen_actions
       SET is_active = false,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE screen_id = v_legacy_turns_id;

    UPDATE public.role_screen_actions rsa
       SET is_allowed = false,
           is_active = false,
           updated_by = 'SYSTEM',
           updated_at = now()
      FROM public.screen_actions sa
     WHERE sa.screen_id = v_legacy_turns_id
       AND rsa.screen_action_id = sa.id;
  END IF;
END $$;

