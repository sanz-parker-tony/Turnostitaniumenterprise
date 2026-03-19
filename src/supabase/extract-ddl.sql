-- ============================================================================
-- extract-ddl.sql
-- Script para extraer la DDL completa de Supabase
-- ============================================================================
-- Ejecutar en Supabase SQL Editor para obtener el DDL actualizado
-- ============================================================================

-- ============================================================================
-- PARTE 1: Listar todas las tablas del schema public
-- ============================================================================
SELECT 
  table_name,
  (SELECT COUNT(*) 
   FROM information_schema.columns c 
   WHERE c.table_schema = 'public' 
   AND c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================================================
-- PARTE 2: Generar CREATE TABLE statements para cada tabla
-- ============================================================================
-- NOTA: Ejecutar este query y copiar el resultado a 000_DDL_REAL.sql

SELECT 
  'CREATE TABLE public.' || table_name || ' (' || E'\n' ||
  string_agg(
    '  ' || column_name || ' ' || 
    udt_name || 
    CASE 
      WHEN character_maximum_length IS NOT NULL 
      THEN '(' || character_maximum_length || ')'
      ELSE ''
    END ||
    CASE 
      WHEN is_nullable = 'NO' THEN ' NOT NULL'
      ELSE ''
    END ||
    CASE 
      WHEN column_default IS NOT NULL 
      THEN ' DEFAULT ' || column_default
      ELSE ''
    END,
    ',' || E'\n'
    ORDER BY ordinal_position
  ) || E'\n' || 
  ');' || E'\n'
  as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- ============================================================================
-- PARTE 3: Listar todas las foreign keys
-- ============================================================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- PARTE 4: Listar todas las constraints
-- ============================================================================
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- ============================================================================
-- PARTE 5: Listar todas las secuencias
-- ============================================================================
SELECT 
  sequence_name,
  data_type,
  numeric_precision,
  start_value,
  minimum_value,
  maximum_value,
  increment
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- ============================================================================
-- PARTE 6: Conteo de tablas por tipo
-- ============================================================================
SELECT 
  CASE 
    WHEN table_name LIKE 'system_%' THEN 'SYSTEM'
    WHEN table_name LIKE 'tenant_%' THEN 'TENANT'
    WHEN table_name LIKE 'employee_%' THEN 'EMPLOYEE'
    WHEN table_name LIKE 'attendance_%' THEN 'ATTENDANCE'
    WHEN table_name LIKE 'report_%' THEN 'REPORT'
    WHEN table_name LIKE 'lookup_%' THEN 'LOOKUP'
    WHEN table_name LIKE 'user_%' OR table_name = 'users' THEN 'USER'
    WHEN table_name LIKE 'role_%' OR table_name = 'roles' THEN 'ROLE'
    WHEN table_name LIKE 'v_%' THEN 'HELPER/VIEW'
    ELSE 'OTHER'
  END as table_category,
  COUNT(*) as table_count,
  string_agg(table_name, ', ' ORDER BY table_name) as tables
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
GROUP BY table_category
ORDER BY table_count DESC;

-- ============================================================================
-- PARTE 7: Verificación de tablas en DDL vs Supabase
-- ============================================================================
-- Este query muestra si hay tablas en Supabase que NO están documentadas
-- en el archivo 000_DDL_REAL.sql

WITH ddl_tables AS (
  -- Lista manual de las 68 tablas del DDL actual
  SELECT unnest(ARRAY[
    'action_translations',
    'actions',
    'areas',
    'attendance_events',
    'attendance_movements',
    'attendance_processing_runs',
    'audit_log',
    'companies',
    'company_settings',
    'cost_centers',
    'departments',
    'employee_absence_requests',
    'employee_attendance_calculations',
    'employee_companies',
    'employee_profile_settings',
    'employee_profile_work_patterns',
    'employee_profiles',
    'employee_shift_plans',
    'employee_time_punches',
    'employees',
    'holidays',
    'job_titles',
    'justification_types',
    'kv_store_e19f2094',
    'lookup_group_translations',
    'lookup_groups',
    'lookup_value_translations',
    'lookup_values',
    'payment_transactions',
    'payroll_groups',
    'report_executions',
    'report_parameter_translations',
    'report_parameters',
    'report_permissions',
    'report_scope_policies',
    'role_permission_copy_runs',
    'role_permission_snapshots',
    'role_screen_actions',
    'roles',
    'scope_types',
    'screen_actions',
    'screen_translations',
    'screens',
    'shifts',
    'subscription_plans',
    'system_languages',
    'system_menu_group_translations',
    'system_menu_groups',
    'system_message_keys',
    'system_message_translations',
    'system_report_translations',
    'system_reports',
    'tenant_language_settings',
    'tenant_members',
    'tenant_onboarding',
    'tenant_settings',
    'tenant_subscriptions',
    'tenants',
    'time_clock_devices',
    'time_surcharge_rules',
    'user_role_scopes',
    'user_roles',
    'users',
    'v_gender_group_id',
    'v_super_admin_role_id',
    'work_groups',
    'work_locations',
    'work_patterns'
  ]) as table_name
),
supabase_tables AS (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
)
-- Tablas en Supabase pero NO en DDL
SELECT 
  'FALTA EN DDL' as status,
  st.table_name
FROM supabase_tables st
LEFT JOIN ddl_tables dt ON st.table_name = dt.table_name
WHERE dt.table_name IS NULL

UNION ALL

-- Tablas en DDL pero NO en Supabase
SELECT 
  'FALTA EN SUPABASE' as status,
  dt.table_name
FROM ddl_tables dt
LEFT JOIN supabase_tables st ON dt.table_name = st.table_name
WHERE st.table_name IS NULL

ORDER BY status, table_name;

-- ============================================================================
-- FIN
-- ============================================================================
