/* ================================================================================================
 Turnos Titanium — DATOS SEED: GENDER y CONTRACT_TYPE
 Fecha: 2025-01-09
 Propósito: Agregar valores de lookups para Género y Tipos de Contrato
================================================================================================ */

-- ============================================================================
-- LOOKUP VALUES: GENDER (Géneros)
-- ============================================================================

do $$
declare
  v_gender_group_id uuid;
begin
  -- Obtener ID del grupo GENDER
  select id into v_gender_group_id from public.lookup_groups where lookup_group_key = 'GENDER';

  if v_gender_group_id is null then
    raise exception 'Lookup group GENDER no existe. Ejecute primero 03_seed_data.sql';
  end if;

  -- Insertar valores de género
  insert into public.lookup_values (
    tenant_id, 
    lookup_group_id, 
    lookup_key, 
    lookup_label, 
    lookup_short_label, 
    lookup_scope, 
    sort_order, 
    is_active, 
    created_by
  ) values
  (null, v_gender_group_id, 'MASCULINO', 'Masculino', 'M', 'SYSTEM', 1, true, 'SYSTEM'),
  (null, v_gender_group_id, 'FEMENINO', 'Femenino', 'F', 'SYSTEM', 2, true, 'SYSTEM'),
  (null, v_gender_group_id, 'OTRO', 'Otro', 'X', 'SYSTEM', 3, true, 'SYSTEM')
  on conflict (lookup_group_id, tenant_id, lookup_key) do nothing;

  raise notice '✅ Valores de GENDER insertados correctamente';

end $$;

-- ============================================================================
-- LOOKUP VALUES: CONTRACT_TYPE (Tipos de Contrato)
-- ============================================================================

do $$
declare
  v_contract_type_group_id uuid;
begin
  -- Obtener ID del grupo CONTRACT_TYPE
  select id into v_contract_type_group_id from public.lookup_groups where lookup_group_key = 'CONTRACT_TYPE';

  if v_contract_type_group_id is null then
    raise exception 'Lookup group CONTRACT_TYPE no existe. Ejecute primero 03_seed_data.sql';
  end if;

  -- Insertar valores de tipos de contrato
  insert into public.lookup_values (
    tenant_id, 
    lookup_group_id, 
    lookup_key, 
    lookup_label, 
    lookup_short_label, 
    lookup_scope, 
    sort_order, 
    is_active, 
    created_by
  ) values
  (null, v_contract_type_group_id, 'INDEFINIDO', 'Contrato Indefinido', 'Indefinido', 'SYSTEM', 1, true, 'SYSTEM'),
  (null, v_contract_type_group_id, 'PLAZO_FIJO', 'Contrato a Plazo Fijo', 'Plazo Fijo', 'SYSTEM', 2, true, 'SYSTEM'),
  (null, v_contract_type_group_id, 'TEMPORAL', 'Contrato Temporal', 'Temporal', 'SYSTEM', 3, true, 'SYSTEM'),
  (null, v_contract_type_group_id, 'OBRA_SERVICIO', 'Contrato por Obra o Servicio', 'Obra/Servicio', 'SYSTEM', 4, true, 'SYSTEM'),
  (null, v_contract_type_group_id, 'EVENTUAL', 'Contrato Eventual', 'Eventual', 'SYSTEM', 5, true, 'SYSTEM'),
  (null, v_contract_type_group_id, 'PRACTICAS', 'Contrato de Prácticas', 'Prácticas', 'SYSTEM', 6, true, 'SYSTEM'),
  (null, v_contract_type_group_id, 'FORMACION', 'Contrato de Formación', 'Formación', 'SYSTEM', 7, true, 'SYSTEM'),
  (null, v_contract_type_group_id, 'HONORARIOS', 'Servicios Profesionales (Honorarios)', 'Honorarios', 'SYSTEM', 8, true, 'SYSTEM')
  on conflict (lookup_group_id, tenant_id, lookup_key) do nothing;

  raise notice '✅ Valores de CONTRACT_TYPE insertados correctamente';

end $$;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

do $$
declare
  v_gender_count int;
  v_contract_count int;
begin
  select count(*) into v_gender_count 
  from public.lookup_values lv
  inner join public.lookup_groups lg on lg.id = lv.lookup_group_id
  where lg.lookup_group_key = 'GENDER';

  select count(*) into v_contract_count 
  from public.lookup_values lv
  inner join public.lookup_groups lg on lg.id = lv.lookup_group_id
  where lg.lookup_group_key = 'CONTRACT_TYPE';

  raise notice '========================================';
  raise notice '📊 RESUMEN DE LOOKUPS INSERTADOS';
  raise notice '========================================';
  raise notice '   GENDER: % valores', v_gender_count;
  raise notice '   CONTRACT_TYPE: % valores', v_contract_count;
  raise notice '========================================';
end $$;
