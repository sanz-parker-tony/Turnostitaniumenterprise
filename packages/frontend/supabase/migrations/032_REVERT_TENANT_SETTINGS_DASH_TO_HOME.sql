-- ============================================================================
-- 032_REVERT_TENANT_SETTINGS_DASH_TO_HOME
-- Revierte la exposición de TENANT_SETTINGS en DASH para TENANT_ADMIN:
--   1) Elimina permisos/screen_actions/screen de TENANT_SETTINGS_DASH
--   2) Restaura permisos de TENANT_ADMIN sobre TENANT_SETTINGS (CONFIG)
-- Idempotente.
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_screen_dash_id uuid;
  v_screen_config_id uuid;
BEGIN
  SELECT id INTO v_screen_dash_id
  FROM public.screens
  WHERE screen_key = 'TENANT_SETTINGS_DASH'
  LIMIT 1;

  -- 1) Eliminar la pantalla DASH y sus relaciones
  IF v_screen_dash_id IS NOT NULL THEN
    DELETE FROM public.role_screen_actions
    WHERE screen_action_id IN (
      SELECT id
      FROM public.screen_actions
      WHERE screen_id = v_screen_dash_id
    );

    DELETE FROM public.screen_actions
    WHERE screen_id = v_screen_dash_id;

    DELETE FROM public.screens
    WHERE id = v_screen_dash_id;
  END IF;

  -- 2) Restaurar permisos de TENANT_ADMIN en TENANT_SETTINGS (CONFIG)
  SELECT id INTO v_screen_config_id
  FROM public.screens
  WHERE screen_key = 'TENANT_SETTINGS'
  LIMIT 1;

  IF v_screen_config_id IS NOT NULL THEN
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
      ON sa.screen_id = v_screen_config_id
    WHERE r.role_key = 'TENANT_ADMIN'
      AND r.is_active = true
      AND sa.is_active = true
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
      FROM public.roles r,
           public.screen_actions sa
     WHERE r.role_key = 'TENANT_ADMIN'
       AND r.is_active = true
       AND sa.screen_id = v_screen_config_id
       AND sa.id = rsa.screen_action_id
       AND rsa.tenant_id = r.tenant_id
       AND rsa.role_id = r.id;
  END IF;

  RAISE NOTICE 'Reversa aplicada: TENANT_SETTINGS_DASH eliminado y TENANT_SETTINGS restaurado para TENANT_ADMIN.';
END $$;

