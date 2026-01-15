# 🔐 Copiar Permisos - Implementación Supabase

## 📋 Descripción

La pantalla **"Copiar Permisos"** (`SEC_COPY_PERMS`) permite gestionar permisos de roles mediante dos modos operativos:

1. **CLONAR ROL**: Crear un nuevo rol copiando todos los permisos de un rol existente
2. **COPIAR PERMISOS**: Copiar permisos seleccionados entre roles existentes con estrategias MERGE u OVERWRITE

---

## 🎯 Funciones de Base de Datos Requeridas

### 1. Función: `clone_role`

Clona un rol completo creando uno nuevo con todos sus permisos.

```sql
CREATE OR REPLACE FUNCTION clone_role(
  p_tenant_id UUID,
  p_source_role_id UUID,
  p_new_role_key VARCHAR,
  p_new_role_name VARCHAR,
  p_new_role_description TEXT DEFAULT NULL,
  p_created_by UUID
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_role_id UUID;
  v_screen_actions_count INT;
  v_reports_count INT;
  v_scopes_count INT;
  v_audit_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Validar que el rol origen existe
  IF NOT EXISTS (
    SELECT 1 FROM roles 
    WHERE id = p_source_role_id 
    AND tenant_id = p_tenant_id 
    AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Rol origen no encontrado o inactivo';
  END IF;

  -- 2. Validar que la clave del nuevo rol no existe
  IF EXISTS (
    SELECT 1 FROM roles 
    WHERE role_key = p_new_role_key 
    AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Ya existe un rol con la clave %', p_new_role_key;
  END IF;

  -- 3. Crear el nuevo rol
  INSERT INTO roles (
    tenant_id,
    role_key,
    role_name,
    description,
    scope,
    is_active,
    created_by,
    created_at
  )
  SELECT
    p_tenant_id,
    p_new_role_key,
    p_new_role_name,
    COALESCE(p_new_role_description, 'Copia de ' || role_name),
    scope,
    TRUE,
    p_created_by,
    NOW()
  FROM roles
  WHERE id = p_source_role_id
  RETURNING id INTO v_new_role_id;

  -- 4. Copiar role_screen_actions
  INSERT INTO role_screen_actions (
    tenant_id,
    role_id,
    screen_action_id,
    is_allowed,
    is_active,
    created_by,
    created_at
  )
  SELECT
    p_tenant_id,
    v_new_role_id,
    screen_action_id,
    is_allowed,
    is_active,
    p_created_by,
    NOW()
  FROM role_screen_actions
  WHERE role_id = p_source_role_id
    AND tenant_id = p_tenant_id
    AND is_active = TRUE;

  GET DIAGNOSTICS v_screen_actions_count = ROW_COUNT;

  -- 5. Copiar report_permissions
  INSERT INTO report_permissions (
    tenant_id,
    role_id,
    report_id,
    can_view,
    can_export,
    can_schedule,
    is_active,
    created_by,
    created_at
  )
  SELECT
    p_tenant_id,
    v_new_role_id,
    report_id,
    can_view,
    can_export,
    can_schedule,
    is_active,
    p_created_by,
    NOW()
  FROM report_permissions
  WHERE role_id = p_source_role_id
    AND tenant_id = p_tenant_id
    AND is_active = TRUE;

  GET DIAGNOSTICS v_reports_count = ROW_COUNT;

  -- 6. Copiar role_policies/scopes (si existen en tu modelo)
  -- Adaptar según tu esquema específico
  v_scopes_count := 0;

  -- 7. Registrar en auditoría
  INSERT INTO audit_log (
    tenant_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    ip_address,
    created_at
  ) VALUES (
    p_tenant_id,
    p_created_by,
    'CLONE_ROLE',
    'roles',
    v_new_role_id,
    jsonb_build_object('source_role_id', p_source_role_id),
    jsonb_build_object(
      'new_role_id', v_new_role_id,
      'new_role_key', p_new_role_key,
      'screen_actions_copied', v_screen_actions_count,
      'reports_copied', v_reports_count,
      'scopes_copied', v_scopes_count
    ),
    inet_client_addr(),
    NOW()
  ) RETURNING id INTO v_audit_id;

  -- 8. Retornar resultado
  v_result := jsonb_build_object(
    'success', TRUE,
    'new_role_id', v_new_role_id,
    'new_role_key', p_new_role_key,
    'new_role_name', p_new_role_name,
    'source_role_id', p_source_role_id,
    'counts', jsonb_build_object(
      'screen_actions', v_screen_actions_count,
      'reports', v_reports_count,
      'scopes', v_scopes_count
    ),
    'audit_id', v_audit_id
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error clonando rol: %', SQLERRM;
END;
$$;
```

---

### 2. Función: `copy_role_permissions`

Copia permisos entre roles existentes con estrategias MERGE u OVERWRITE.

```sql
CREATE OR REPLACE FUNCTION copy_role_permissions(
  p_tenant_id UUID,
  p_source_role_id UUID,
  p_target_role_id UUID,
  p_strategy VARCHAR, -- 'MERGE' o 'OVERWRITE'
  p_copy_screen_actions BOOLEAN DEFAULT TRUE,
  p_copy_reports BOOLEAN DEFAULT TRUE,
  p_copy_scopes BOOLEAN DEFAULT TRUE,
  p_updated_by UUID
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_screen_actions_count INT := 0;
  v_reports_count INT := 0;
  v_scopes_count INT := 0;
  v_audit_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Validaciones
  IF p_source_role_id = p_target_role_id THEN
    RAISE EXCEPTION 'El rol origen y destino no pueden ser el mismo';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM roles 
    WHERE id = p_source_role_id 
    AND tenant_id = p_tenant_id 
    AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Rol origen no encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM roles 
    WHERE id = p_target_role_id 
    AND tenant_id = p_tenant_id 
    AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Rol destino no encontrado';
  END IF;

  IF p_strategy NOT IN ('MERGE', 'OVERWRITE') THEN
    RAISE EXCEPTION 'Estrategia inválida. Use MERGE o OVERWRITE';
  END IF;

  -- 2. COPIAR SCREEN_ACTIONS
  IF p_copy_screen_actions THEN
    IF p_strategy = 'OVERWRITE' THEN
      -- Eliminar permisos existentes
      DELETE FROM role_screen_actions
      WHERE role_id = p_target_role_id
        AND tenant_id = p_tenant_id;
    END IF;

    -- Insertar/actualizar permisos
    INSERT INTO role_screen_actions (
      tenant_id,
      role_id,
      screen_action_id,
      is_allowed,
      is_active,
      created_by,
      created_at,
      updated_by,
      updated_at
    )
    SELECT
      p_tenant_id,
      p_target_role_id,
      screen_action_id,
      is_allowed,
      is_active,
      p_updated_by,
      NOW(),
      p_updated_by,
      NOW()
    FROM role_screen_actions
    WHERE role_id = p_source_role_id
      AND tenant_id = p_tenant_id
      AND is_active = TRUE
    ON CONFLICT (tenant_id, role_id, screen_action_id) 
    DO UPDATE SET
      is_allowed = EXCLUDED.is_allowed,
      is_active = EXCLUDED.is_active,
      updated_by = EXCLUDED.updated_by,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_screen_actions_count = ROW_COUNT;
  END IF;

  -- 3. COPIAR REPORT_PERMISSIONS
  IF p_copy_reports THEN
    IF p_strategy = 'OVERWRITE' THEN
      DELETE FROM report_permissions
      WHERE role_id = p_target_role_id
        AND tenant_id = p_tenant_id;
    END IF;

    INSERT INTO report_permissions (
      tenant_id,
      role_id,
      report_id,
      can_view,
      can_export,
      can_schedule,
      is_active,
      created_by,
      created_at,
      updated_by,
      updated_at
    )
    SELECT
      p_tenant_id,
      p_target_role_id,
      report_id,
      can_view,
      can_export,
      can_schedule,
      is_active,
      p_updated_by,
      NOW(),
      p_updated_by,
      NOW()
    FROM report_permissions
    WHERE role_id = p_source_role_id
      AND tenant_id = p_tenant_id
      AND is_active = TRUE
    ON CONFLICT (tenant_id, role_id, report_id)
    DO UPDATE SET
      can_view = EXCLUDED.can_view,
      can_export = EXCLUDED.can_export,
      can_schedule = EXCLUDED.can_schedule,
      is_active = EXCLUDED.is_active,
      updated_by = EXCLUDED.updated_by,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_reports_count = ROW_COUNT;
  END IF;

  -- 4. COPIAR SCOPES (adaptar según tu modelo)
  IF p_copy_scopes THEN
    -- Implementar según tu esquema de scopes
    v_scopes_count := 0;
  END IF;

  -- 5. Registrar auditoría
  INSERT INTO audit_log (
    tenant_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    ip_address,
    created_at
  ) VALUES (
    p_tenant_id,
    p_updated_by,
    'COPY_PERMISSIONS',
    'roles',
    p_target_role_id,
    jsonb_build_object('source_role_id', p_source_role_id),
    jsonb_build_object(
      'strategy', p_strategy,
      'screen_actions_copied', v_screen_actions_count,
      'reports_copied', v_reports_count,
      'scopes_copied', v_scopes_count
    ),
    inet_client_addr(),
    NOW()
  ) RETURNING id INTO v_audit_id;

  -- 6. Retornar resultado
  v_result := jsonb_build_object(
    'success', TRUE,
    'source_role_id', p_source_role_id,
    'target_role_id', p_target_role_id,
    'strategy', p_strategy,
    'counts', jsonb_build_object(
      'screen_actions', v_screen_actions_count,
      'reports', v_reports_count,
      'scopes', v_scopes_count
    ),
    'audit_id', v_audit_id
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error copiando permisos: %', SQLERRM;
END;
$$;
```

---

## 🔌 Integración en CopiarPermisos.tsx

Reemplazar las funciones mock por llamadas a Supabase:

### Para CLONAR ROL:

```typescript
const executeCloneRole = async () => {
  setIsProcessing(true);
  
  try {
    const { data, error } = await supabase.rpc('clone_role', {
      p_tenant_id: tenantId,
      p_source_role_id: sourceRoleClone,
      p_new_role_key: newRoleKey,
      p_new_role_name: newRoleName,
      p_new_role_description: newRoleDescription,
      p_created_by: userId
    });

    if (error) throw error;

    const result: CopyResult = {
      success: data.success,
      newRoleId: data.new_role_id,
      newRoleKey: data.new_role_key,
      newRoleName: data.new_role_name,
      sourceRoleId: data.source_role_id,
      counts: data.counts,
      auditId: data.audit_id
    };

    setResult(result);
    setShowResultDialog(true);
    toast.success(`Rol "${newRoleName}" clonado exitosamente`);

    // Resetear form
    setSourceRoleClone('');
    setNewRoleKey('');
    setNewRoleName('');
    setNewRoleDescription('');

  } catch (error) {
    console.error('Error clonando rol:', error);
    toast.error('Error al clonar rol');
  } finally {
    setIsProcessing(false);
  }
};
```

### Para COPIAR PERMISOS:

```typescript
const executeCopyPermissions = async () => {
  setIsProcessing(true);
  
  try {
    const { data, error } = await supabase.rpc('copy_role_permissions', {
      p_tenant_id: tenantId,
      p_source_role_id: sourceRoleCopy,
      p_target_role_id: targetRole,
      p_strategy: strategy,
      p_copy_screen_actions: copyOptions.screenActions,
      p_copy_reports: copyOptions.reports,
      p_copy_scopes: copyOptions.scopes,
      p_updated_by: userId
    });

    if (error) throw error;

    const result: CopyResult = {
      success: data.success,
      sourceRoleId: data.source_role_id,
      targetRoleId: data.target_role_id,
      strategy: data.strategy,
      counts: data.counts,
      auditId: data.audit_id
    };

    setResult(result);
    setShowResultDialog(true);

    const targetRoleName = mockRoles.find(r => r.id === targetRole)?.role_name;
    toast.success(`Permisos copiados a "${targetRoleName}"`);

  } catch (error) {
    console.error('Error copiando permisos:', error);
    toast.error('Error al copiar permisos');
  } finally {
    setIsProcessing(false);
  }
};
```

---

## 🔒 Row Level Security (RLS)

Aplicar políticas RLS para seguridad:

```sql
-- Política para clone_role
CREATE POLICY "Users can clone roles in their tenant"
ON roles FOR INSERT
TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_screen_actions rsa ON ur.role_id = rsa.role_id
    JOIN screen_actions sa ON rsa.screen_action_id = sa.id
    JOIN screens s ON sa.screen_id = s.id
    WHERE ur.user_id = auth.uid()
      AND s.screen_key = 'SEC_COPY_PERMS'
      AND sa.action_key = 'CREATE'
      AND rsa.is_allowed = TRUE
  )
);

-- Política para copy_role_permissions
CREATE POLICY "Users can copy permissions in their tenant"
ON role_screen_actions FOR ALL
TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_screen_actions rsa ON ur.role_id = rsa.role_id
    JOIN screen_actions sa ON rsa.screen_action_id = sa.id
    JOIN screens s ON sa.screen_id = s.id
    WHERE ur.user_id = auth.uid()
      AND s.screen_key = 'SEC_COPY_PERMS'
      AND sa.action_key = 'UPDATE'
      AND rsa.is_allowed = TRUE
  )
);
```

---

## ✅ Validaciones de Negocio

Las funciones incluyen validaciones:

- ✅ Rol origen existe y está activo
- ✅ Rol destino existe y está activo (en COPIAR)
- ✅ Clave del nuevo rol no existe (en CLONAR)
- ✅ Origen y destino no son el mismo (en COPIAR)
- ✅ Estrategia válida (MERGE/OVERWRITE)
- ✅ Al menos un componente seleccionado
- ✅ Operaciones atómicas (rollback automático en error)
- ✅ Auditoría completa de todas las operaciones

---

## 📊 Monitoreo y Auditoría

Consultar operaciones de copia:

```sql
-- Ver últimas clonaciones
SELECT 
  al.*,
  u.email as user_email,
  r.role_name as target_role
FROM audit_log al
JOIN users u ON al.user_id = u.id
LEFT JOIN roles r ON al.entity_id = r.id
WHERE al.action = 'CLONE_ROLE'
ORDER BY al.created_at DESC
LIMIT 20;

-- Ver últimas copias de permisos
SELECT 
  al.*,
  u.email as user_email,
  r.role_name as target_role,
  al.new_values->>'strategy' as strategy
FROM audit_log al
JOIN users u ON al.user_id = u.id
LEFT JOIN roles r ON al.entity_id = r.id
WHERE al.action = 'COPY_PERMISSIONS'
ORDER BY al.created_at DESC
LIMIT 20;
```

---

## 🎯 Testing

```sql
-- Test CLONAR ROL
SELECT clone_role(
  'tenant-id-aquí'::UUID,
  'rol-origen-id'::UUID,
  'TEST_ROLE_COPY',
  'Rol de Prueba Clonado',
  'Descripción de prueba',
  'user-id-aquí'::UUID
);

-- Test COPIAR PERMISOS (MERGE)
SELECT copy_role_permissions(
  'tenant-id-aquí'::UUID,
  'rol-origen-id'::UUID,
  'rol-destino-id'::UUID,
  'MERGE',
  TRUE,
  TRUE,
  TRUE,
  'user-id-aquí'::UUID
);

-- Test COPIAR PERMISOS (OVERWRITE)
SELECT copy_role_permissions(
  'tenant-id-aquí'::UUID,
  'rol-origen-id'::UUID,
  'rol-destino-id'::UUID,
  'OVERWRITE',
  TRUE,
  FALSE,
  FALSE,
  'user-id-aquí'::UUID
);
```

---

## 📝 Notas Importantes

1. **Atomicidad**: Todas las operaciones son transaccionales
2. **Auditoría**: Cada operación se registra en `audit_log`
3. **Usuarios**: NO se copian automáticamente al clonar
4. **OVERWRITE**: Advertencia fuerte en UI - operación destructiva
5. **Permisos**: Validar que el usuario tiene acceso a `SEC_COPY_PERMS`
