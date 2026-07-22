-- ============================================================================
-- 001_FACTORY_RESET.sql
-- Turnos Titanium Enterprise - Restauracion exacta del estado de fabrica
-- ============================================================================
-- Prerrequisitos:
--   1. La estructura fue creada con 000_DDL_REAL.sql.
--   2. 002_SEED_COMPLETE.sql termino correctamente y creo la fotografia
--      system:factory-baseline:v1 en public.kv_store_e19f2094.
--
-- Resultado:
--   - Elimina todos los datos generados o modificados durante las pruebas.
--   - Recupera exactamente los IDs, fechas, relaciones, catalogos, permisos,
--     traducciones y usuario bootstrap que existian al terminar 002.
--   - Compara cada tabla restaurada contra la fotografia antes de COMMIT.
--   - Ante cualquier diferencia ejecuta ROLLBACK automaticamente.
-- ============================================================================

BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtext('turnos-titanium:factory-reset')
);

DO $$
DECLARE
  baseline_key constant text := 'system:factory-baseline:v1';
  required_seed_version constant text := '2026-07-22-FACTORY-V14';
  baseline jsonb;
  current_table_count integer;
  snapshot_table_count integer;
  missing_tables text;
  unexpected_tables text;
  current_schema_fingerprint text;
BEGIN
  SELECT value INTO baseline
  FROM public.kv_store_e19f2094
  WHERE key = baseline_key;

  IF baseline IS NULL THEN
    RAISE EXCEPTION
      'FACTORY RESET cancelado: no existe %. Ejecute primero 000_DDL_REAL y 002_SEED_COMPLETE.',
      baseline_key;
  END IF;

  IF baseline->>'format_version' <> '2'
     OR jsonb_typeof(baseline->'tables') <> 'object'
     OR jsonb_typeof(baseline->'row_counts') <> 'object'
     OR NULLIF(baseline->>'schema_fingerprint', '') IS NULL THEN
    RAISE EXCEPTION 'FACTORY RESET cancelado: fotografia de fabrica invalida o incompatible';
  END IF;

  IF baseline->'seed_version'->>'version' IS DISTINCT FROM required_seed_version THEN
    RAISE EXCEPTION
      'FACTORY RESET cancelado: fotografia obsoleta (version %, requerida %). Regenere la fotografia ejecutando 000_DDL_REAL + 002_SEED_COMPLETE en una base limpia.',
      COALESCE(baseline->'seed_version'->>'version', 'sin version'),
      required_seed_version;
  END IF;

  IF NOT (baseline->'tables' ? 'system_shift_templates')
     OR coalesce((baseline->'row_counts'->>'system_shift_templates')::integer, 0) <> 5 THEN
    RAISE EXCEPTION
      'FACTORY RESET cancelado: la fotografia no contiene las 5 plantillas de turnos base';
  END IF;

  SELECT count(*) INTO current_table_count
  FROM pg_catalog.pg_tables
  WHERE schemaname = 'public';

  SELECT count(*) INTO snapshot_table_count
  FROM jsonb_object_keys(baseline->'tables');

  SELECT string_agg(snapshot.table_name, ', ' ORDER BY snapshot.table_name)
    INTO missing_tables
  FROM jsonb_object_keys(baseline->'tables') AS snapshot(table_name)
  WHERE to_regclass(format('public.%I', snapshot.table_name)) IS NULL;

  SELECT string_agg(current_tables.tablename, ', ' ORDER BY current_tables.tablename)
    INTO unexpected_tables
  FROM pg_catalog.pg_tables AS current_tables
  WHERE current_tables.schemaname = 'public'
    AND NOT (baseline->'tables' ? current_tables.tablename);

  IF current_table_count <> snapshot_table_count
     OR snapshot_table_count <> COALESCE((baseline->>'table_count')::integer, -1)
     OR missing_tables IS NOT NULL
     OR unexpected_tables IS NOT NULL THEN
    RAISE EXCEPTION
      'FACTORY RESET cancelado por deriva de esquema. Tablas actuales: %, fotografia: %, faltantes: %, inesperadas: %',
      current_table_count,
      snapshot_table_count,
      coalesce(missing_tables, 'ninguna'),
      coalesce(unexpected_tables, 'ninguna');
  END IF;

  PERFORM pg_catalog.set_config('search_path', 'pg_catalog', true);
  WITH schema_objects AS (
    SELECT format('table|%s', c.relname) AS definition
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    UNION ALL
    SELECT format(
      'column|%s|%s|%s|%s|%s',
      columns.table_name,
      columns.column_name,
      columns.data_type,
      columns.is_nullable,
      COALESCE(columns.column_default, '')
    )
    FROM information_schema.columns
    WHERE table_schema = 'public'
    UNION ALL
    SELECT format('constraint|%s|%s|%s', c.relname, con.conname, pg_get_constraintdef(con.oid, true))
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND con.contype IN ('p', 'u', 'f', 'x')
    UNION ALL
    SELECT format('index|%s|%s', indexname, indexdef)
    FROM pg_catalog.pg_indexes
    WHERE schemaname = 'public'
    UNION ALL
    SELECT format('view|%s|%s', c.relname, pg_get_viewdef(c.oid, true))
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
    UNION ALL
    SELECT format('trigger|%s|%s', c.relname, pg_get_triggerdef(t.oid, true))
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND NOT t.tgisinternal
  )
  SELECT md5(string_agg(definition, E'\n' ORDER BY definition))
    INTO current_schema_fingerprint
  FROM schema_objects;
  PERFORM pg_catalog.set_config('search_path', 'public, pg_catalog', true);

  IF current_schema_fingerprint IS DISTINCT FROM baseline->>'schema_fingerprint' THEN
    RAISE EXCEPTION
      'FACTORY RESET cancelado por deriva de esquema (actual %, fotografia %). Ejecute 000_DDL_REAL + 002_SEED_COMPLETE en una base limpia.',
      current_schema_fingerprint,
      baseline->>'schema_fingerprint';
  END IF;

  RAISE NOTICE 'Fotografia v2 valida: % tablas y esquema % listos para restaurar.', snapshot_table_count, current_schema_fingerprint;
END $$;

-- La fotografia se guarda en kv_store; esa tabla no puede truncarse antes de
-- que el resto haya sido recuperado. Todas sus otras claves se limpian.
DO $$
DECLARE
  tables_to_truncate text;
BEGIN
  SELECT string_agg(format('public.%I', tablename), ', ' ORDER BY tablename)
    INTO tables_to_truncate
  FROM pg_catalog.pg_tables
  WHERE schemaname = 'public'
    AND tablename <> 'kv_store_e19f2094';

  IF tables_to_truncate IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || tables_to_truncate || ' RESTART IDENTITY CASCADE';
  END IF;

  DELETE FROM public.kv_store_e19f2094
  WHERE key <> 'system:factory-baseline:v1';
END $$;

-- La fotografia fue creada con todas las restricciones habilitadas. Durante
-- la recuperacion se desactivan temporalmente triggers/FK para no depender del
-- orden fisico de las tablas; la validacion exacta posterior protege el COMMIT.
SET LOCAL session_replication_role = replica;

DO $$
DECLARE
  baseline constant jsonb := (
    SELECT value
    FROM public.kv_store_e19f2094
    WHERE key = 'system:factory-baseline:v1'
  );
  table_entry record;
BEGIN
  FOR table_entry IN
    SELECT entry.key AS table_name, entry.value AS table_rows
    FROM jsonb_each(baseline->'tables') AS entry
    ORDER BY entry.key
  LOOP
    IF jsonb_typeof(table_entry.table_rows) <> 'array' THEN
      RAISE EXCEPTION 'Payload invalido para public.%', table_entry.table_name;
    END IF;

    IF jsonb_array_length(table_entry.table_rows) > 0 THEN
      EXECUTE format(
        'INSERT INTO public.%I
         SELECT *
         FROM jsonb_populate_recordset(NULL::public.%I, $1)',
        table_entry.table_name,
        table_entry.table_name
      ) USING table_entry.table_rows;
    END IF;
  END LOOP;
END $$;

SET LOCAL session_replication_role = origin;

-- session_replication_role permite recuperar las filas sin depender del orden
-- fisico. Antes de continuar se comprueba cada FK para garantizar que todos
-- los UUID restaurados vuelvan a apuntar exactamente a una fila padre valida.
DO $$
DECLARE
  foreign_key record;
  join_condition text;
  all_values_present text;
  any_value_present text;
  has_violation boolean;
  verified_foreign_keys integer := 0;
BEGIN
  FOR foreign_key IN
    SELECT
      con.oid,
      con.conname,
      con.conkey,
      con.confkey,
      con.confmatchtype,
      child_ns.nspname AS child_schema,
      child.relname AS child_table,
      parent_ns.nspname AS parent_schema,
      parent.relname AS parent_table,
      con.conrelid,
      con.confrelid
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class child ON child.oid = con.conrelid
    JOIN pg_catalog.pg_namespace child_ns ON child_ns.oid = child.relnamespace
    JOIN pg_catalog.pg_class parent ON parent.oid = con.confrelid
    JOIN pg_catalog.pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
    WHERE con.contype = 'f'
      AND child_ns.nspname = 'public'
    ORDER BY child.relname, con.conname
  LOOP
    SELECT
      string_agg(format('child.%I = parent.%I', child_att.attname, parent_att.attname), ' AND ' ORDER BY child_key.ordinality),
      string_agg(format('child.%I IS NOT NULL', child_att.attname), ' AND ' ORDER BY child_key.ordinality),
      string_agg(format('child.%I IS NOT NULL', child_att.attname), ' OR ' ORDER BY child_key.ordinality)
    INTO join_condition, all_values_present, any_value_present
    FROM unnest(foreign_key.conkey) WITH ORDINALITY AS child_key(attnum, ordinality)
    JOIN unnest(foreign_key.confkey) WITH ORDINALITY AS parent_key(attnum, ordinality)
      ON parent_key.ordinality = child_key.ordinality
    JOIN pg_catalog.pg_attribute child_att
      ON child_att.attrelid = foreign_key.conrelid
     AND child_att.attnum = child_key.attnum
    JOIN pg_catalog.pg_attribute parent_att
      ON parent_att.attrelid = foreign_key.confrelid
     AND parent_att.attnum = parent_key.attnum;

    EXECUTE format(
      'SELECT EXISTS (
         SELECT 1
         FROM %I.%I AS child
         WHERE %s
            OR ((%s) AND NOT EXISTS (
              SELECT 1 FROM %I.%I AS parent WHERE %s
            ))
       )',
      foreign_key.child_schema,
      foreign_key.child_table,
      CASE
        WHEN foreign_key.confmatchtype = 'f'
          THEN format('((%s) AND NOT (%s))', any_value_present, all_values_present)
        ELSE 'false'
      END,
      all_values_present,
      foreign_key.parent_schema,
      foreign_key.parent_table,
      join_condition
    ) INTO has_violation;

    IF has_violation THEN
      RAISE EXCEPTION
        'FACTORY RESET invalido: FK % en public.% contiene relaciones UUID rotas',
        foreign_key.conname,
        foreign_key.child_table;
    END IF;

    verified_foreign_keys := verified_foreign_keys + 1;
  END LOOP;

  RAISE NOTICE 'Relaciones verificadas: % claves foraneas sin UUID huerfanos.', verified_foreign_keys;
END $$;

-- Sincroniza secuencias si una version futura del DDL incorpora columnas
-- serial/identity. El esquema actual usa UUID, por lo que hoy es una salvaguarda.
DO $$
DECLARE
  sequence_entry record;
  max_value bigint;
BEGIN
  FOR sequence_entry IN
    SELECT
      columns.table_schema,
      columns.table_name,
      columns.column_name,
      pg_get_serial_sequence(
        format('%I.%I', columns.table_schema, columns.table_name),
        columns.column_name
      ) AS sequence_name
    FROM information_schema.columns AS columns
    WHERE columns.table_schema = 'public'
      AND (
        columns.is_identity = 'YES'
        OR columns.column_default LIKE 'nextval(%'
      )
  LOOP
    IF sequence_entry.sequence_name IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'SELECT max(%I)::bigint FROM %I.%I',
      sequence_entry.column_name,
      sequence_entry.table_schema,
      sequence_entry.table_name
    ) INTO max_value;

    IF max_value IS NULL THEN
      PERFORM setval(sequence_entry.sequence_name::regclass, 1, false);
    ELSE
      PERFORM setval(sequence_entry.sequence_name::regclass, max_value, true);
    END IF;
  END LOOP;
END $$;

-- Comparacion exacta de cada fila y columna serializada. Para kv_store se
-- excluye solamente la propia fotografia, que no existia aun al capturarla.
DO $$
DECLARE
  baseline_key constant text := 'system:factory-baseline:v1';
  baseline constant jsonb := (
    SELECT value
    FROM public.kv_store_e19f2094
    WHERE key = 'system:factory-baseline:v1'
  );
  table_entry record;
  actual_rows jsonb;
  restored_table_count integer := 0;
BEGIN
  FOR table_entry IN
    SELECT entry.key AS table_name, entry.value AS expected_rows
    FROM jsonb_each(baseline->'tables') AS entry
    ORDER BY entry.key
  LOOP
    IF table_entry.table_name = 'kv_store_e19f2094' THEN
      EXECUTE format(
        'SELECT COALESCE(jsonb_agg(row_json ORDER BY row_json::text), ''[]''::jsonb)
         FROM (
           SELECT to_jsonb(source_row) AS row_json
           FROM public.kv_store_e19f2094 AS source_row
           WHERE key <> %L
         ) AS serialized_rows',
        baseline_key
      ) INTO actual_rows;
    ELSE
      EXECUTE format(
        'SELECT COALESCE(jsonb_agg(row_json ORDER BY row_json::text), ''[]''::jsonb)
         FROM (
           SELECT to_jsonb(source_row) AS row_json
           FROM public.%I AS source_row
         ) AS serialized_rows',
        table_entry.table_name
      ) INTO actual_rows;
    END IF;

    IF actual_rows IS DISTINCT FROM table_entry.expected_rows THEN
      RAISE EXCEPTION
        'FACTORY RESET invalido: public.% no coincide con la fotografia de fabrica',
        table_entry.table_name;
    END IF;

    restored_table_count := restored_table_count + 1;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM public.kv_store_e19f2094
    WHERE key = baseline_key
  ) THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: se perdio la fotografia de fabrica';
  END IF;

  IF (SELECT count(*) FROM public.system_shift_templates) <> 5 THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: no se restauraron las 5 plantillas de turnos base';
  END IF;

  IF (
    SELECT count(*)
    FROM public.system_reports
    WHERE report_code = 'RPT_MARCACIONES_REALIZADAS'
      AND is_active = true
  ) <> 1 THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: no se restauro RPT_MARCACIONES_REALIZADAS';
  END IF;

  IF (
    SELECT count(*)
    FROM public.report_parameters parameter
    JOIN public.system_reports report ON report.id = parameter.system_report_id
    WHERE report.report_code = 'RPT_MARCACIONES_REALIZADAS'
      AND parameter.is_active = true
  ) <> 10 THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: el reporte de marcaciones no recupero sus 10 parametros';
  END IF;

  IF (
    SELECT count(DISTINCT action.action_key)
    FROM public.role_screen_actions permission
    JOIN public.roles role ON role.id = permission.role_id
    JOIN public.screen_actions screen_action ON screen_action.id = permission.screen_action_id
    JOIN public.screens screen ON screen.id = screen_action.screen_id
    JOIN public.actions action ON action.id = screen_action.action_id
    WHERE role.role_key = 'SUPERVISOR'
      AND screen.screen_key = 'TIME_PUNCH_REPORTS'
      AND permission.is_active = true
      AND permission.is_allowed = true
  ) <> 4 THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: el supervisor no recupero las 4 acciones del reporte de marcaciones';
  END IF;

  IF (
    SELECT count(*)
    FROM public.lookup_values AS value
    JOIN public.lookup_groups AS group_row ON group_row.id = value.lookup_group_id
    WHERE group_row.lookup_group_key = 'PUNCH_KEY'
      AND value.is_active = true
      AND COALESCE(value.metadata->>'device_code', '') ~ '^[0-9]+$'
  ) <> 6 THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: PUNCH_KEY no recupero sus 6 codigos fisicos';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.lookup_groups AS group_row
    WHERE group_row.lookup_group_key = 'PUNCH_KEY'
      AND group_row.allows_tenant_items = false
      AND group_row.management_policy->>'value_scope' = 'SYSTEM'
      AND group_row.management_policy->'value_permissions'->'create' ? 'SYSTEM_ADMIN'
      AND group_row.management_policy->'value_permissions'->'update' ? 'SYSTEM_ADMIN'
      AND group_row.management_policy->'value_permissions'->'delete' ? 'SYSTEM_ADMIN'
      AND group_row.management_policy->'required_metadata'->'device_code'->>'type' = 'positive_integer'
      AND COALESCE(
        (group_row.management_policy->'required_metadata'->'device_code'->>'unique_within_group')::boolean,
        false
      )
  ) THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: PUNCH_KEY no recupero su politica SYSTEM';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.employee_time_punches AS punch
    WHERE punch.punch_key_lookup_id IS NULL
       OR public.punch_key_lookup_key(punch.punch_key_lookup_id) IS NULL
  ) THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: existen marcaciones sin relacion PUNCH_KEY valida';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.attendance_movements AS movement
    WHERE movement.start_punch_key_id IS NULL
       OR movement.end_punch_key_id IS NULL
       OR public.punch_key_lookup_key(movement.start_punch_key_id) IS NULL
       OR public.punch_key_lookup_key(movement.end_punch_key_id) IS NULL
       OR movement.start_punch_key_id = movement.end_punch_key_id
  ) THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: existen movimientos con relaciones PUNCH_KEY invalidas';
  END IF;

  IF (
    SELECT count(DISTINCT action.action_key)
    FROM public.screens AS screen
    JOIN public.screen_actions AS screen_action ON screen_action.screen_id = screen.id
    JOIN public.actions AS action ON action.id = screen_action.action_id
    WHERE screen.screen_key = 'ATTENDANCE_MOVEMENTS_MANAGEMENT'
      AND screen.is_active = true
      AND screen_action.is_active = true
  ) <> 4 THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: no se restauro el mantenimiento de movimientos';
  END IF;

  IF (SELECT count(*) FROM public.api_authorization_rules WHERE is_active) <> 377 THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: no se restauraron las 377 reglas de autorización API';
  END IF;

  IF (SELECT count(*) FROM public.data_access_authorization_rules WHERE is_active) <> 141 THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: no se restauraron las 141 reglas de acceso tabla-operación';
  END IF;

  IF (SELECT count(*) FROM public.attendance_event_punch_keys WHERE is_active) <> 6 THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: no se restauraron las 6 relaciones evento-tecla';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.lookup_values value
    JOIN public.lookup_groups group_row ON group_row.id = value.lookup_group_id
    WHERE group_row.lookup_group_key = 'PUNCH_KEY'
      AND value.is_active
      AND (
        NULLIF(value.metadata->>'movement_kind', '') IS NULL
        OR NULLIF(value.metadata->>'direction', '') IS NULL
        OR NULLIF(value.metadata->>'icon_key', '') IS NULL
        OR COALESCE(value.metadata->>'kiosk_column', '') NOT IN ('LEFT', 'RIGHT')
      )
  ) THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: existen teclas sin semántica operativa o ubicación de kiosco';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE auth_version < 1) THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: existen usuarios con versión de autenticación inválida';
  END IF;

  IF NULLIF(public.resolve_attendance_timezone(
       (SELECT id FROM public.tenants WHERE tenant_key = 'SYSTEM' LIMIT 1),
       NULL, NULL, NULL
     ), '') IS NULL THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: no se puede resolver la zona horaria de asistencia';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_user_notifications_realtime_notify'
      AND tgrelid = 'public.user_notifications'::regclass
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: falta la entrega en tiempo real de notificaciones';
  END IF;

  IF (
    SELECT count(*)
    FROM pg_trigger
    WHERE tgname IN (
      'trg_absence_requests_notification_refresh',
      'trg_shift_change_requests_notification_refresh',
      'trg_time_punch_change_requests_notification_refresh',
      'trg_time_punches_notification_refresh'
    )
      AND NOT tgisinternal
  ) <> 4 THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: faltan enlaces del ciclo de vida de notificaciones';
  END IF;

  IF (
    SELECT count(*)
    FROM pg_trigger
    WHERE tgname IN (
      'trg_absence_requests_requester_status_notification',
      'trg_shift_change_requests_requester_status_notification',
      'trg_time_punch_change_requests_requester_status_notification'
    )
      AND NOT tgisinternal
  ) <> 3 THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: faltan los tres enlaces transaccionales del solicitante';
  END IF;

  IF (
    SELECT count(*)
    FROM public.lookup_values value
    JOIN public.lookup_groups group_row ON group_row.id = value.lookup_group_id
    WHERE group_row.lookup_group_key = 'USER_NOTIFICATION_TYPE'
      AND value.is_active
      AND value.metadata->'action'->>'enabled' = 'true'
  ) < 10 THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: no se restauraron los diez destinos de notificación';
  END IF;

  IF (
    SELECT count(*)
    FROM public.lookup_values value
    JOIN public.lookup_groups group_row ON group_row.id = value.lookup_group_id
    WHERE group_row.lookup_group_key = 'USER_NOTIFICATION_TYPE'
      AND value.lookup_key IN (
        'ABSENCE_REQUEST_STATUS_CHANGED',
        'SHIFT_CHANGE_REQUEST_STATUS_CHANGED',
        'TIME_PUNCH_CHANGE_REQUEST_STATUS_CHANGED'
      )
      AND value.is_active
      AND value.metadata->>'audience' = 'REQUESTER_STATUS'
      AND NULLIF(value.metadata->>'reference_table', '') IS NOT NULL
      AND value.metadata->'retain_while_status_keys' ? 'PENDING'
      AND value.metadata->'status_content' ?& ARRAY['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']
  ) <> 3 THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: falta contenido parametrizado para estados del solicitante';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.lookup_values value
    JOIN public.lookup_groups group_row ON group_row.id = value.lookup_group_id
    WHERE group_row.lookup_group_key IN ('REQUEST_STATUS', 'SHIFT_CHANGE_REQUEST_STATUS', 'TIME_PUNCH_CHANGE_REQUEST_STATUS')
      AND value.is_active
      AND NULLIF(value.metadata->>'notification_status_key', '') IS NULL
  ) THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: existen estados sin equivalencia canónica de notificación';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.lookup_values value
    JOIN public.lookup_groups group_row ON group_row.id = value.lookup_group_id
    WHERE group_row.lookup_group_key IN ('REQUEST_STATUS', 'SHIFT_CHANGE_REQUEST_STATUS', 'TIME_PUNCH_CHANGE_REQUEST_STATUS')
      AND value.is_active
      AND NULLIF(value.metadata->>'notification_lifecycle_state', '') IS NULL
  ) THEN
    RAISE EXCEPTION 'FACTORY RESET invalido: existen estados de solicitud sin ciclo de vida de notificación';
  END IF;

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'FACTORY RESET COMPLETADO E INTEGRO';
  RAISE NOTICE 'Tablas verificadas exactamente: %', restored_table_count;
  RAISE NOTICE 'Tenants restaurados: %', (SELECT count(*) FROM public.tenants);
  RAISE NOTICE 'Usuarios restaurados: %', (SELECT count(*) FROM public.users);
  RAISE NOTICE 'Roles restaurados: %', (SELECT count(*) FROM public.roles);
  RAISE NOTICE '============================================================';
END $$;

COMMIT;
