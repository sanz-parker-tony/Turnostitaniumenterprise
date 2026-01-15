-- ============================================================================
-- UPDATE: Agregar tenant_id y tenant_name a get_user_screens()
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_user_screens(VARCHAR);

CREATE OR REPLACE FUNCTION public.get_user_screens(p_user_email VARCHAR)
RETURNS TABLE(
  screen_key VARCHAR,
  screen_name VARCHAR,
  screen_icon_key VARCHAR,
  route_path VARCHAR,
  menu_group_key VARCHAR,
  menu_group_name VARCHAR,
  menu_group_icon VARCHAR,
  tenant_id UUID,          -- ✅ NUEVO
  tenant_name VARCHAR      -- ✅ NUEVO
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_tenant_name VARCHAR;
  v_is_super_admin BOOLEAN := false;
  v_has_all_scopes BOOLEAN;
BEGIN
  -- 1. Obtener user_id y tenant_id desde users
  SELECT u.id, u.tenant_id, t.tenant_name
  INTO v_user_id, v_tenant_id, v_tenant_name
  FROM public.users u
  LEFT JOIN public.tenants t ON u.tenant_id = t.id
  WHERE u.email = p_user_email;

  -- Si no existe el usuario, retornar vacío
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuario no encontrado: %', p_user_email;
    RETURN;
  END IF;

  -- 2. Verificar si el usuario tiene el rol SUPER_ADMIN
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    INNER JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_user_id
      AND r.role_key = 'SUPER_ADMIN'
      AND ur.is_active = true
  ) INTO v_is_super_admin;

  RAISE NOTICE 'Usuario encontrado - ID: %, Tenant: %, Super Admin: %', 
    v_user_id, v_tenant_id, v_is_super_admin;

  -- 3. Verificar si tiene scopes (si no tiene, es acceso total)
  SELECT NOT EXISTS (
    SELECT 1 
    FROM public.user_role_scopes urs
    INNER JOIN public.user_roles ur ON ur.id = urs.user_role_id
    WHERE ur.user_id = v_user_id
      AND ur.tenant_id = v_tenant_id
  ) INTO v_has_all_scopes;

  RAISE NOTICE 'Has all scopes (sin restricciones): %', v_has_all_scopes;

  -- 4. Super Admin SIN scopes = TODO
  IF v_is_super_admin AND v_has_all_scopes THEN
    RAISE NOTICE '⭐ Super Admin sin scopes - Retornando TODAS las pantallas';
    
    RETURN QUERY
    SELECT DISTINCT
      s.screen_key::VARCHAR,
      s.screen_name::VARCHAR,
      s.icon_key::VARCHAR AS screen_icon_key,
      s.route_path::VARCHAR,
      mg.menu_group_key::VARCHAR,
      mg.menu_group_name::VARCHAR,
      mg.icon_key::VARCHAR AS menu_group_icon,
      v_tenant_id AS tenant_id,                    -- ✅ Devolver tenant_id del usuario
      v_tenant_name::VARCHAR AS tenant_name        -- ✅ Devolver tenant_name del usuario
    FROM public.screens s
    INNER JOIN public.system_menu_groups mg ON s.menu_group_id = mg.id
    WHERE s.is_active = true
    ORDER BY mg.menu_group_name, s.screen_name;
    
    RETURN;
  END IF;

  -- 5. Usuario normal O Super Admin CON scopes = usar permisos
  RAISE NOTICE '👤 Usuario con permisos específicos';
  
  RETURN QUERY
  SELECT DISTINCT
    s.screen_key::VARCHAR,
    s.screen_name::VARCHAR,
    s.icon_key::VARCHAR AS screen_icon_key,
    s.route_path::VARCHAR,
    mg.menu_group_key::VARCHAR,
    mg.menu_group_name::VARCHAR,
    mg.icon_key::VARCHAR AS menu_group_icon,
    v_tenant_id AS tenant_id,                    -- ✅ Devolver tenant_id del usuario
    v_tenant_name::VARCHAR AS tenant_name        -- ✅ Devolver tenant_name del usuario
  FROM public.user_roles ur
  INNER JOIN public.role_screen_actions rsa ON ur.role_id = rsa.role_id
  INNER JOIN public.screen_actions sa ON rsa.screen_action_id = sa.id
  INNER JOIN public.screens s ON sa.screen_id = s.id
  INNER JOIN public.system_menu_groups mg ON s.menu_group_id = mg.id
  WHERE ur.user_id = v_user_id
    AND ur.is_active = true
    AND s.is_active = true
  ORDER BY mg.menu_group_name, s.screen_name;

END;
$$;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON FUNCTION public.get_user_screens(VARCHAR) IS 
'Retorna las pantallas accesibles por un usuario basándose en sus roles y permisos.
Ahora incluye tenant_id y tenant_name del USUARIO para uso en el frontend.
IMPORTANTE: screens es una tabla SYSTEM (sin tenant_id), pero retornamos el tenant del usuario.
Si es Super Admin (role_key=SUPER_ADMIN) sin scopes = acceso a todas las pantallas.
Si tiene scopes = usa los permisos específicos.';

-- ============================================================================
-- TEST
-- ============================================================================

-- Probar con tu usuario (ajusta el email según corresponda)
SELECT * FROM public.get_user_screens('admin@turnos-titanium.com');