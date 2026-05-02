-- ============================================================================
-- 010_DISABLE_SCHEDULE_MENU_AND_ENSURE_SHIFT_CONSTRUCTOR
-- Unifica la gestión en Constructor Turnos para TENANT_ADMIN
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_schedule_screen_id uuid;
  v_constructor_screen_id uuid;
  v_action_id uuid;
  v_screen_action_id uuid;
BEGIN
  SELECT id
    INTO v_constructor_screen_id
  FROM public.screens
  WHERE screen_key = 'SHIFT_CONSTRUCTOR_MANAGEMENT'
  LIMIT 1;

  IF v_constructor_screen_id IS NOT NULL THEN
    UPDATE public.screens
       SET screen_name = 'Constructor de Turnos',
           menu_label = 'Constructor Turnos',
           route_path = '/dashboard/config/shift-constructor',
           icon_key = 'Activity',
           sort_order = 55,
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_constructor_screen_id;

    FOR v_action_id IN
      SELECT id
      FROM public.actions
      WHERE action_key IN ('VIEW', 'CREATE', 'EDIT', 'DELETE')
    LOOP
      SELECT id
        INTO v_screen_action_id
      FROM public.screen_actions
      WHERE screen_id = v_constructor_screen_id
        AND action_id = v_action_id
      LIMIT 1;

      IF v_screen_action_id IS NULL THEN
        INSERT INTO public.screen_actions (
          id, screen_id, action_id, is_active, created_by
        )
        VALUES (
          gen_random_uuid(), v_constructor_screen_id, v_action_id, true, 'SYSTEM'
        );
      ELSE
        UPDATE public.screen_actions
           SET is_active = true,
               updated_by = 'SYSTEM',
               updated_at = now()
         WHERE id = v_screen_action_id;
      END IF;
    END LOOP;
  END IF;

  SELECT id
    INTO v_schedule_screen_id
  FROM public.screens
  WHERE screen_key = 'SCHEDULE_MANAGEMENT'
  LIMIT 1;

  IF v_schedule_screen_id IS NOT NULL THEN
    UPDATE public.screens
       SET is_active = false,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_schedule_screen_id;

    UPDATE public.screen_actions
       SET is_active = false,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE screen_id = v_schedule_screen_id;

    UPDATE public.role_screen_actions rsa
       SET is_allowed = false,
           is_active = false,
           updated_by = 'SYSTEM',
           updated_at = now()
      FROM public.screen_actions sa
     WHERE sa.screen_id = v_schedule_screen_id
       AND rsa.screen_action_id = sa.id;
  END IF;

  IF v_constructor_screen_id IS NOT NULL THEN
    INSERT INTO public.role_screen_actions (
      id, tenant_id, role_id, screen_action_id, is_allowed, is_active, created_by
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
    INNER JOIN public.screen_actions sa
      ON sa.screen_id = v_constructor_screen_id
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
      INNER JOIN public.screen_actions sa
        ON sa.screen_id = v_constructor_screen_id
       AND sa.is_active = true
     WHERE r.role_key = 'TENANT_ADMIN'
       AND r.is_active = true
       AND rsa.tenant_id = r.tenant_id
       AND rsa.role_id = r.id
       AND rsa.screen_action_id = sa.id;
  END IF;
END $$;
