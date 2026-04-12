1) Crear ventana de mantenimiento de Novedades en SYSTEM
Objetivo

Crear la pantalla de mantenimiento de Novedades de Asistencia dentro del módulo SYSTEM, para administrar los registros de la tabla public.attendance_events.

Esta pantalla debe permitir:

listar novedades
buscar y filtrar
crear
editar
activar/inactivar
validar dependencias con catálogos
impedir inconsistencias funcionales

El concepto de “novedad” debe mantenerse alineado con el glosario funcional del sistema.

2) Ubicación funcional
Módulo: SYSTEM
Menú sugerido: SYSTEM → Attendance → Novedades
Ruta sugerida: /system/attendance/events
3) Fuente de datos

Tabla principal:

public.attendance_events

Campos:

id
tenant_id
event_name
event_short_name
tolerance_minutes
weight_value
transaction_direction_id
event_type_id
movement_id
calculation_method_id
external_mapping
is_active
created_by
created_at
updated_by
updated_at
4) Lookups y catálogos requeridos

La ventana debe cargar combos desde:

lookup_values
grupo: ATTENDANCE_TRANSACTION_DIRECTION
NIN
INC
DEC
grupo: ATTENDANCE_EVENT_TYPE
TOD
TJO
ATR
FAL
SAN
LIC
TNL
TNC
TEX
LEX
LUN
FHO
LFH
INC
EHE
grupo: ATTENDANCE_CALCULATION_METHOD
TMP
CNT
attendance_movements
JOR
LUN
5) Comportamiento de la pantalla
5.1 Listado principal

Mostrar una grilla con estas columnas:

código corto = event_short_name
nombre = event_name
tolerancia = tolerance_minutes
peso = weight_value
dirección transacción = descripción lookup de transaction_direction_id
tipo de novedad = descripción lookup de event_type_id
movimiento = descripción de movement_id
método cálculo = descripción lookup de calculation_method_id
homologación externa = external_mapping
estado = is_active
actualizado por
fecha actualización
filtros
búsqueda libre por:
event_short_name
event_name
external_mapping
filtro por estado:
todos
activos
inactivos
filtro por tipo de novedad
filtro por movimiento
filtro por dirección transacción
acciones por fila
Editar
Activar / Inactivar

No permitir eliminación física.

5.2 Formulario Crear / Editar

Campos del formulario:

obligatorios
event_name
event_short_name
tolerance_minutes
weight_value
transaction_direction_id
event_type_id
movement_id
calculation_method_id
opcionales
external_mapping
control de estado
is_active
reglas UI
event_short_name en mayúsculas
longitud máxima:
event_name: 60
event_short_name: 20
external_mapping: 60
tolerance_minutes entero >= 0
weight_value entero >= 0
validar unicidad por:
(tenant_id, event_short_name)
comportamiento adicional
en modo edición, mostrar datos de auditoría
si el registro está inactivo, permitir reactivación
si cambia un lookup a uno inválido o inactivo, bloquear guardado
5.3 Regla de mapeo funcional desde Silver

Usar esta equivalencia:

vNove_desc → event_name
vNove_desc_abrv → event_short_name
iNove_toler → tolerance_minutes
iNove_peso → weight_value
vNove_tipo_trx → transaction_direction_id
vNove_tipo → event_type_id
cAcce_codi → movement_id
vNove_tipo_calc → calculation_method_id
vNove_homo → external_mapping
vNove_esta='ACT' → is_active=true
6) Endpoints sugeridos
GET    /api/system/attendance-events
POST   /api/system/attendance-events
PUT    /api/system/attendance-events/:id
PATCH  /api/system/attendance-events/:id/status

GET    /api/system/lookup-values?group=ATTENDANCE_TRANSACTION_DIRECTION
GET    /api/system/lookup-values?group=ATTENDANCE_EVENT_TYPE
GET    /api/system/lookup-values?group=ATTENDANCE_CALCULATION_METHOD
GET    /api/system/attendance-movements
7) Criterios de aceptación de la pantalla
la pantalla lista novedades existentes por tenant
puede crear una novedad nueva
puede editar una novedad existente
puede activar/inactivar
los combos cargan desde lookup_values y attendance_movements
se respeta la unicidad de event_short_name por tenant
no permite guardar con lookups inexistentes
no permite valores negativos en tolerancia o peso
la auditoría se actualiza al guardar
8) Información que debe incluirse en 002_SEED_COMPLETE para attendance_events
Orden correcto dentro del seed

Nyra debe incluir esto en este orden:

seed de lookup_values para:
ATTENDANCE_TRANSACTION_DIRECTION
ATTENDANCE_EVENT_TYPE
ATTENDANCE_CALCULATION_METHOD
seed de attendance_movements
JOR
LUN
seed de attendance_events
9) Datos a sembrar en attendance_events
Decisión de diseño

No incluir la fila:

TODOS / TOD

salvo que el motor nuevo la requiera realmente como novedad operativa.
Por ahora tratarla como comodín legado, no como novedad real.

10) Registros a insertar

Usar estos valores:

event_name	event_short_name	tolerance_minutes	weight_value	trx	event_type	movement	calc_method	external_mapping	is_active
JORNADA LABORAL	JOR	10	100	INC	TJO	JOR	TMP	ONC	true
ATRASO	ATR	5	100	DEC	ATR	JOR	TMP	ATR	true
FALTA	FAL	0	100	DEC	FAL	JOR	TMP	FAL	true
SALIDA ANTICIPADA	SAN	5	100	DEC	SAN	JOR	TMP	SAN	true
LICENCIA CON SUELDO	LCS	0	100	INC	LIC	JOR	TMP	PER	true
LICENCIA SIN SUELDO	LSS	0	0	DEC	LIC	JOR	TMP	DOS	true
LICENCIA CARGO VACAC	LCV	0	0	NIN	LIC	JOR	TMP	TRE	true
TIEMPO NO LABORADO	TNL	0	100	INC	TNL	JOR	TMP	TNL	true
TIEMPO NO CONTROLADO	TNC	0	100	DEC	TNC	JOR	TMP	TNC	true
HORA EXTRA 150%	HEX15	55	150	INC	TEX	JOR	TMP	1M02	true
HORA EXTRA 200%	HEX20	55	200	INC	TEX	JOR	TMP	1M03	true
LUNCH EXCEDIDO	LEX	5	0	DEC	LEX	LUN	TMP	LEXCE	true
LUNCH	LUC	0	0	INC	LUN	LUN	TMP	ALM	true
FUERA DE HORARIO	FHO	29	100	INC	FHO	JOR	TMP	FHO	true
JORNADA NOC 125%	JN1	10	125	INC	TJO	JOR	TMP	1M01	true
LUNCH FUERA DE HORARIO	LFH	0	0	NIN	LFH	LUN	TMP	LFH	true
INCONSISTENCIAS	INC	0	100	NIN	INC	JOR	TMP	INC	true
HORA EXTRA 100%	HEX10	29	100	INC	TEX	JOR	TMP	HORAS_EXTRAS_100	true
DESCANSO MEDICO	DMD	0	100	INC	LIC	JOR	TMP	DMD	true
PERMISO SINDICAL	PSN	0	100	INC	LIC	JOR	TMP	PSN	true
EXCESO HORAS EXTRAS 150%	EHE15	55	150	INC	EHE	JOR	TMP	EHE50	true
EXCESO HORAS EXTRAS 200%	EHE20	55	200	INC	EHE	JOR	TMP	EHE100	true
11) Instrucción técnica de inserción

Nyra debe resolver IDs por código:

transaction_direction_id desde lookup_values
lookup_group = 'ATTENDANCE_TRANSACTION_DIRECTION'
event_type_id desde lookup_values
lookup_group = 'ATTENDANCE_EVENT_TYPE'
calculation_method_id desde lookup_values
lookup_group = 'ATTENDANCE_CALCULATION_METHOD'
movement_id desde attendance_movements.code

El insert debe ser idempotente usando:

ON CONFLICT (tenant_id, event_short_name) DO UPDATE
12) SQL base para Nyra
-- =========================================================
-- ATTENDANCE EVENTS
-- Requiere:
--   lookup_values sembrado para:
--     ATTENDANCE_TRANSACTION_DIRECTION
--     ATTENDANCE_EVENT_TYPE
--     ATTENDANCE_CALCULATION_METHOD
--   attendance_movements sembrado con:
--     JOR, LUN
-- =========================================================

WITH target_tenant AS (
    SELECT id
    FROM tenants
    WHERE code = 'DEFAULT' -- ajustar tenant real
),
src AS (
    SELECT *
    FROM (
        VALUES
        ('JORNADA LABORAL',         'JOR',   10, 100, 'INC', 'TJO', 'JOR', 'TMP', 'ONC',               TRUE),
        ('ATRASO',                  'ATR',    5, 100, 'DEC', 'ATR', 'JOR', 'TMP', 'ATR',               TRUE),
        ('FALTA',                   'FAL',    0, 100, 'DEC', 'FAL', 'JOR', 'TMP', 'FAL',               TRUE),
        ('SALIDA ANTICIPADA',       'SAN',    5, 100, 'DEC', 'SAN', 'JOR', 'TMP', 'SAN',               TRUE),
        ('LICENCIA CON SUELDO',     'LCS',    0, 100, 'INC', 'LIC', 'JOR', 'TMP', 'PER',               TRUE),
        ('LICENCIA SIN SUELDO',     'LSS',    0,   0, 'DEC', 'LIC', 'JOR', 'TMP', 'DOS',               TRUE),
        ('LICENCIA CARGO VACAC',    'LCV',    0,   0, 'NIN', 'LIC', 'JOR', 'TMP', 'TRE',               TRUE),
        ('TIEMPO NO LABORADO',      'TNL',    0, 100, 'INC', 'TNL', 'JOR', 'TMP', 'TNL',               TRUE),
        ('TIEMPO NO CONTROLADO',    'TNC',    0, 100, 'DEC', 'TNC', 'JOR', 'TMP', 'TNC',               TRUE),
        ('HORA EXTRA 150%',         'HEX15', 55, 150, 'INC', 'TEX', 'JOR', 'TMP', '1M02',              TRUE),
        ('HORA EXTRA 200%',         'HEX20', 55, 200, 'INC', 'TEX', 'JOR', 'TMP', '1M03',              TRUE),
        ('LUNCH EXCEDIDO',          'LEX',    5,   0, 'DEC', 'LEX', 'LUN', 'TMP', 'LEXCE',             TRUE),
        ('LUNCH',                   'LUC',    0,   0, 'INC', 'LUN', 'LUN', 'TMP', 'ALM',               TRUE),
        ('FUERA DE HORARIO',        'FHO',   29, 100, 'INC', 'FHO', 'JOR', 'TMP', 'FHO',               TRUE),
        ('JORNADA NOC 125%',        'JN1',   10, 125, 'INC', 'TJO', 'JOR', 'TMP', '1M01',              TRUE),
        ('LUNCH FUERA DE HORARIO',  'LFH',    0,   0, 'NIN', 'LFH', 'LUN', 'TMP', 'LFH',               TRUE),
        ('INCONSISTENCIAS',         'INC',    0, 100, 'NIN', 'INC', 'JOR', 'TMP', 'INC',               TRUE),
        ('HORA EXTRA 100%',         'HEX10', 29, 100, 'INC', 'TEX', 'JOR', 'TMP', 'HORAS_EXTRAS_100',  TRUE),
        ('DESCANSO MEDICO',         'DMD',    0, 100, 'INC', 'LIC', 'JOR', 'TMP', 'DMD',               TRUE),
        ('PERMISO SINDICAL',        'PSN',    0, 100, 'INC', 'LIC', 'JOR', 'TMP', 'PSN',               TRUE),
        ('EXCESO HORAS EXTRAS 150%','EHE15', 55, 150, 'INC', 'EHE', 'JOR', 'TMP', 'EHE50',             TRUE),
        ('EXCESO HORAS EXTRAS 200%','EHE20', 55, 200, 'INC', 'EHE', 'JOR', 'TMP', 'EHE100',            TRUE)
    ) AS x(
        event_name,
        event_short_name,
        tolerance_minutes,
        weight_value,
        trx_code,
        event_type_code,
        movement_code,
        calc_method_code,
        external_mapping,
        is_active
    )
),
trx AS (
    SELECT id, code
    FROM lookup_values
    WHERE lookup_group = 'ATTENDANCE_TRANSACTION_DIRECTION'
),
evt AS (
    SELECT id, code
    FROM lookup_values
    WHERE lookup_group = 'ATTENDANCE_EVENT_TYPE'
),
calc AS (
    SELECT id, code
    FROM lookup_values
    WHERE lookup_group = 'ATTENDANCE_CALCULATION_METHOD'
),
mov AS (
    SELECT id, code
    FROM attendance_movements
),
resolved AS (
    SELECT
        tt.id AS tenant_id,
        s.event_name,
        s.event_short_name,
        s.tolerance_minutes,
        s.weight_value,
        trx.id  AS transaction_direction_id,
        evt.id  AS event_type_id,
        mov.id  AS movement_id,
        calc.id AS calculation_method_id,
        s.external_mapping,
        s.is_active
    FROM src s
    CROSS JOIN target_tenant tt
    JOIN trx  ON trx.code  = s.trx_code
    JOIN evt  ON evt.code  = s.event_type_code
    JOIN mov  ON mov.code  = s.movement_code
    JOIN calc ON calc.code = s.calc_method_code
)
INSERT INTO public.attendance_events (
    id,
    tenant_id,
    event_name,
    event_short_name,
    tolerance_minutes,
    weight_value,
    transaction_direction_id,
    event_type_id,
    movement_id,
    calculation_method_id,
    external_mapping,
    is_active,
    created_by,
    created_at
)
SELECT
    gen_random_uuid(),
    tenant_id,
    event_name,
    event_short_name,
    tolerance_minutes,
    weight_value,
    transaction_direction_id,
    event_type_id,
    movement_id,
    calculation_method_id,
    external_mapping,
    is_active,
    'seed',
    now()
FROM resolved
ON CONFLICT (tenant_id, event_short_name)
DO UPDATE SET
    event_name               = EXCLUDED.event_name,
    tolerance_minutes        = EXCLUDED.tolerance_minutes,
    weight_value             = EXCLUDED.weight_value,
    transaction_direction_id = EXCLUDED.transaction_direction_id,
    event_type_id            = EXCLUDED.event_type_id,
    movement_id              = EXCLUDED.movement_id,
    calculation_method_id    = EXCLUDED.calculation_method_id,
    external_mapping         = EXCLUDED.external_mapping,
    is_active                = EXCLUDED.is_active,
    updated_by               = 'seed',
    updated_at               = now();
13) Resumen corto para Nyra
crear pantalla SYSTEM → Attendance → Novedades
hacer CRUD clásico sobre attendance_events
combos cargados desde lookup_values y attendance_movements
sembrar en 002_SEED_COMPLETE:
lookup groups necesarios
movimientos JOR y LUN
22 novedades operativas
excluir TOD/TODOS salvo necesidad expresa del motor
usar insert idempotente por (tenant_id, event_short_name)