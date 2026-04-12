# 🚀 QUICK START: Activar Módulo de Parámetros

## ⚡ Acción Inmediata Requerida

**PASO ÚNICO**: Ejecutar migración SQL en Supabase

---

## 📋 Instrucciones (Copy-Paste)

### 1️⃣ Ir a Supabase Dashboard

```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
```

### 2️⃣ Copiar y Pegar este SQL Completo

```sql
-- ============================================================================
-- Migration: 006_ADD_SYSTEM_SETTINGS_SCREEN
-- Descripción: Agrega pantalla "Parámetros" al menú de Mantenimiento
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_menu_maint UUID;
  v_screen_id UUID;
  v_screen_exists INT;
BEGIN
  SELECT id INTO v_menu_maint FROM public.menu_groups WHERE menu_group_key = 'MAINT' LIMIT 1;
  IF v_menu_maint IS NULL THEN RAISE EXCEPTION 'Menu group MAINT not found'; END IF;

  SELECT id INTO v_screen_id FROM public.screens WHERE screen_key = 'PARAMETERS_MANAGEMENT' LIMIT 1;

  IF v_screen_id IS NOT NULL THEN
    UPDATE public.screens SET screen_key = 'SYSTEM_SETTINGS_MANAGEMENT', screen_name = 'Parámetros del Sistema',
      screen_short_name = 'Parámetros', screen_route = '/dashboard/maintenance/parameters',
      screen_icon_key = 'Settings', screen_display_order = 15, is_active = true WHERE id = v_screen_id;
    RAISE NOTICE '✅ Pantalla PARAMETERS_MANAGEMENT actualizada a SYSTEM_SETTINGS_MANAGEMENT';
  ELSE
    SELECT COUNT(*) INTO v_screen_exists FROM public.screens WHERE screen_key = 'SYSTEM_SETTINGS_MANAGEMENT';
    IF v_screen_exists = 0 THEN
      INSERT INTO public.screens (id, screen_key, screen_name, screen_short_name, menu_group_id, screen_route,
        screen_icon_key, screen_display_order, is_active, lookup_scope) 
      VALUES (gen_random_uuid(), 'SYSTEM_SETTINGS_MANAGEMENT', 'Parámetros del Sistema', 'Parámetros', v_menu_maint,
        '/dashboard/maintenance/parameters', 'Settings', 15, true, 'SYSTEM');
      RAISE NOTICE '✅ Pantalla SYSTEM_SETTINGS_MANAGEMENT creada exitosamente';
    ELSE
      RAISE NOTICE '⚠️ Pantalla SYSTEM_SETTINGS_MANAGEMENT ya existe';
    END IF;
  END IF;
END $$;

DO $$
DECLARE v_screen_id UUID; v_role_id UUID; v_permission_exists INT;
BEGIN
  SELECT id INTO v_screen_id FROM public.screens WHERE screen_key = 'SYSTEM_SETTINGS_MANAGEMENT' LIMIT 1;
  IF v_screen_id IS NULL THEN RAISE EXCEPTION 'Screen SYSTEM_SETTINGS_MANAGEMENT not found'; END IF;

  -- SYSTEM_ADMIN
  SELECT id INTO v_role_id FROM public.roles WHERE role_key = 'SYSTEM_ADMIN' LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_permission_exists FROM public.role_screen_permissions 
    WHERE role_id = v_role_id AND screen_id = v_screen_id;
    IF v_permission_exists = 0 THEN
      INSERT INTO public.role_screen_permissions (id, role_id, screen_id, can_view, can_create, can_edit, 
        can_delete, can_export, can_approve, created_by) 
      VALUES (gen_random_uuid(), v_role_id, v_screen_id, true, true, true, false, true, false, 'SYSTEM');
      RAISE NOTICE '✅ Permisos asignados a SYSTEM_ADMIN';
    END IF;
  END IF;

  -- TENANT_ADMIN
  SELECT id INTO v_role_id FROM public.roles WHERE role_key = 'TENANT_ADMIN' LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_permission_exists FROM public.role_screen_permissions 
    WHERE role_id = v_role_id AND screen_id = v_screen_id;
    IF v_permission_exists = 0 THEN
      INSERT INTO public.role_screen_permissions (id, role_id, screen_id, can_view, can_create, can_edit, 
        can_delete, can_export, can_approve, created_by) 
      VALUES (gen_random_uuid(), v_role_id, v_screen_id, true, true, true, false, true, false, 'SYSTEM');
      RAISE NOTICE '✅ Permisos asignados a TENANT_ADMIN';
    END IF;
  END IF;

  -- RRHH_ADMIN
  SELECT id INTO v_role_id FROM public.roles WHERE role_key = 'RRHH_ADMIN' LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_permission_exists FROM public.role_screen_permissions 
    WHERE role_id = v_role_id AND screen_id = v_screen_id;
    IF v_permission_exists = 0 THEN
      INSERT INTO public.role_screen_permissions (id, role_id, screen_id, can_view, can_create, can_edit, 
        can_delete, can_export, can_approve, created_by) 
      VALUES (gen_random_uuid(), v_role_id, v_screen_id, true, false, false, false, true, false, 'SYSTEM');
      RAISE NOTICE '✅ Permisos asignados a RRHH_ADMIN';
    END IF;
  END IF;
END $$;

UPDATE public.screens SET screen_display_order = 20 WHERE screen_key = 'MAINT_CATALOGS';
UPDATE public.screens SET screen_display_order = 30 WHERE screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT';

DO $$
DECLARE v_screen_count INT; v_settings_perms INT; v_screen_info RECORD;
BEGIN
  SELECT COUNT(*) INTO v_screen_count FROM public.screens s
  INNER JOIN public.menu_groups mg ON s.menu_group_id = mg.id WHERE mg.menu_group_key = 'MAINT';

  SELECT COUNT(*) INTO v_settings_perms FROM public.role_screen_permissions rsp
  INNER JOIN public.screens s ON rsp.screen_id = s.id WHERE s.screen_key = 'SYSTEM_SETTINGS_MANAGEMENT';

  SELECT screen_key, screen_name, screen_route, screen_display_order INTO v_screen_info
  FROM public.screens WHERE screen_key = 'SYSTEM_SETTINGS_MANAGEMENT';

  RAISE NOTICE '📊 RESUMEN DE MIGRACIÓN 006:';
  RAISE NOTICE '   - Pantallas en MAINT: %', v_screen_count;
  RAISE NOTICE '   - Permisos Parámetros: %', v_settings_perms;
  IF v_screen_info IS NOT NULL THEN
    RAISE NOTICE '   - Pantalla: % (%)', v_screen_info.screen_name, v_screen_info.screen_key;
    RAISE NOTICE '   - Ruta: %', v_screen_info.screen_route;
    RAISE NOTICE '   - Orden: %', v_screen_info.screen_display_order;
  END IF;
  RAISE NOTICE '✅ Migración 006 completada exitosamente';
END $$;
```

### 3️⃣ Presionar "Run" (F5)

### 4️⃣ Verificar Mensajes de Éxito

Deberías ver en los mensajes:
```
✅ Pantalla SYSTEM_SETTINGS_MANAGEMENT creada exitosamente
✅ Permisos asignados a SYSTEM_ADMIN
✅ Permisos asignados a TENANT_ADMIN
✅ Permisos asignados a RRHH_ADMIN
✅ Migración 006 completada exitosamente
```

---

## ✅ Verificación Rápida

Ejecuta este SQL para verificar:

```sql
-- Ver la nueva pantalla
SELECT screen_key, screen_name, screen_route, screen_display_order, is_active
FROM public.screens WHERE screen_key = 'SYSTEM_SETTINGS_MANAGEMENT';

-- Ver orden del menú Mantenimiento
SELECT s.screen_display_order, s.screen_short_name, s.screen_route
FROM public.screens s
INNER JOIN public.menu_groups mg ON s.menu_group_id = mg.id
WHERE mg.menu_group_key = 'MAINT' ORDER BY s.screen_display_order;
```

**Resultado esperado:**
```
10 | Eventos    | /dashboard/maintenance/attendance-events
15 | Parámetros | /dashboard/maintenance/parameters      ← NUEVA
20 | Catálogos  | /dashboard/maintenance/catalogs
30 | Novedades  | /dashboard/maintenance/attendance-events
```

---

## 🎯 Probar en la Aplicación

1. **Cerrar sesión** en Turnos Titanium Enterprise
2. **Volver a iniciar sesión**
3. Ir al menú **Mantenimiento**
4. Deberías ver la opción **"Parámetros"**
5. Click en **Parámetros**
6. Deberías ver la pantalla de gestión de parámetros del sistema

---

## 🧪 Prueba Rápida

1. Click en **"Nuevo Parámetro"**
2. Completar:
   - **Clave**: `TEST_PARAM`
   - **Nombre**: `Parámetro de Prueba`
   - **Código Corto**: `TST`
   - **Tipo de Valor**: Seleccionar uno de la lista
3. Click en **"Crear"**
4. Verificar que aparece en la tabla
5. Probar editar y activar/desactivar

---

## 🚨 Si algo sale mal

### La pantalla no aparece en el menú
1. Verificar que ejecutaste el SQL completo
2. Cerrar sesión y volver a iniciar
3. Verificar permisos de tu rol actual

### Error al ejecutar SQL
1. Verificar que estás en el proyecto correcto
2. Verificar que tienes permisos de administrador
3. Revisar los logs de error en Supabase

### La pantalla aparece pero da error
1. Abrir consola del navegador (F12)
2. Ver el error específico
3. Verificar que el backend esté corriendo
4. Revisar logs del Edge Function

---

## 📞 Soporte

Para más detalles, consultar:
- `/INSTRUCCIONES_PARAMETROS.md` - Guía completa
- `/IMPLEMENTACION_COMPLETA_PARAMETROS.md` - Documentación técnica

---

**Tiempo estimado**: 2-3 minutos  
**Dificultad**: ⭐ Fácil (copy-paste)  
**Resultado**: Nueva pantalla "Parámetros" en el menú Mantenimiento
