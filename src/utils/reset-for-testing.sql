-- ⚠️ SCRIPT DE RESET PARA TESTING
-- Ejecuta esto en Supabase SQL Editor para limpiar y empezar de cero

-- ==================================================
-- PASO 1: Eliminar TODOS los usuarios de auth.users
-- ==================================================
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN (SELECT id FROM auth.users)
  LOOP
    -- Eliminar el usuario usando la función admin
    PERFORM auth.admin_delete_user(user_record.id);
    RAISE NOTICE '🗑️ Usuario eliminado: %', user_record.id;
  END LOOP;
  
  RAISE NOTICE '✅ Todos los usuarios de auth.users eliminados';
END $$;

-- ==================================================
-- PASO 2: Limpiar tabla public.users (por si quedó algo)
-- ==================================================
DELETE FROM public.user_roles;
DELETE FROM public.users WHERE auth_user_id IS NOT NULL;

RAISE NOTICE '✅ Tabla public.users limpiada';

-- ==================================================
-- PASO 3: Resetear onboarding del tenant SYSTEM
-- ==================================================
UPDATE public.tenant_onboarding
SET onboarding_status = 'IN_PROGRESS',
    current_step = 'tenant_setup',
    completion_percentage = 0,
    user_id = NULL
WHERE tenant_id = (SELECT id FROM public.tenants WHERE tenant_key = 'SYSTEM');

RAISE NOTICE '✅ Onboarding del tenant SYSTEM reseteado';

-- ==================================================
-- VERIFICACIÓN FINAL
-- ==================================================
SELECT 
  (SELECT COUNT(*) FROM auth.users) as "Total auth.users",
  (SELECT COUNT(*) FROM public.users WHERE auth_user_id IS NOT NULL) as "Total public.users",
  'Sistema listo para InitialSetup' as "Estado";
