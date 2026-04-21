Nyra, necesito que implementes en Turnos Titanium una refactorización completa del modelo de parámetros de configuración, tanto en base de datos como en backend y, donde aplique, en la capa de administración de la aplicación.

Quiero que tomes como base el esquema actual del proyecto y alteres la estructura de las tablas relacionadas con parámetros, conforme a esta definición funcional y técnica.

CONTEXTO FUNCIONAL

La aplicación es multiempresa y multiusuario.

Actualmente existen tablas de configuración por nivel:
- tenant_settings: parámetros del cliente
- company_settings: parámetros de la empresa
- employee_profile_settings: parámetros por perfil de empleado

El problema del diseño actual es que estas tablas permiten definir parámetros libremente, porque guardan directamente claves y metadatos del parámetro. Eso no debe seguir ocurriendo.

Necesito centralizar la definición de todos los parámetros en una nueva tabla maestra llamada system_settings.

A partir de eso:
- system_settings definirá qué parámetro existe
- tenant_settings solo podrá sobrescribir valores de parámetros existentes
- company_settings solo podrá sobrescribir valores de parámetros existentes
- employee_profile_settings solo podrá sobrescribir valores de parámetros existentes

La jerarquía de resolución del valor efectivo de un parámetro debe ser:

1. employee_profile_settings
2. company_settings
3. tenant_settings
4. system_settings

Es decir, si existe valor en perfil, ese manda; si no, buscar en empresa; si no, en cliente; si no, usar el valor por defecto del sistema.

OBJETIVO PRINCIPAL

Refactorizar la estructura actual para que:
1. no existan parámetros “libres” en tenant/company/profile
2. todos los parámetros estén definidos en system_settings
3. las tablas hijas solo referencien parámetros del catálogo maestro
4. el sistema pueda resolver el valor efectivo según jerarquía
5. se preserve la auditoría y los datos existentes mediante migración

ALCANCE DE IMPLEMENTACIÓN

Quiero que implementes esto de punta a punta:
- migración SQL
- cambios de entidades/modelos
- repositorios
- servicios
- validaciones
- endpoints o casos de uso necesarios
- lógica para resolver el valor efectivo
- pruebas unitarias e integración
- ajuste de pantallas de administración si ya existen módulos para configuración

DISEÑO OBJETIVO DE BASE DE DATOS

1) CREAR TABLA MAESTRA: system_settings

Crear una nueva tabla llamada system_settings con esta intención:

- id (uuid, PK)
- setting_key (varchar, único, obligatorio)
- setting_name (varchar, obligatorio)
- setting_short_key (varchar, obligatorio)
- value_type_id (uuid, FK o referencia equivalente al catálogo de tipos)
- default_value (text o tipo compatible con el diseño actual)
- is_active (boolean)
- created_by
- created_at
- updated_by
- updated_at

Reglas:
- setting_key debe ser único
- system_settings es el único lugar donde se define:
  - la clave del parámetro
  - su nombre
  - su nombre corto
  - su tipo de dato
  - su valor por defecto del sistema

IMPORTANTE:
En system_settings no quiero usar setting_value; quiero usar default_value, porque representa el valor base del sistema.

2) MODIFICAR tenant_settings

Alterar tenant_settings para que deje de definir parámetros libremente.

Debe quedar conceptualmente así:
- id
- tenant_id
- system_setting_id
- setting_value
- is_active
- created_by
- created_at
- updated_by
- updated_at

Acciones:
- eliminar setting_key
- eliminar setting_short_key si existe
- eliminar value_type_id
- agregar system_setting_id como FK a system_settings(id)

Restricción única:
- unique (tenant_id, system_setting_id)

3) MODIFICAR company_settings

Debe quedar así:
- id
- tenant_id
- company_id
- system_setting_id
- setting_value
- is_active
- created_by
- created_at
- updated_by
- updated_at

Acciones:
- eliminar setting_key
- eliminar setting_short_key si existe
- eliminar value_type_id
- agregar system_setting_id como FK a system_settings(id)

Restricción única:
- unique (company_id, system_setting_id)

4) MODIFICAR employee_profile_settings

Debe quedar así:
- id
- tenant_id
- company_id
- employee_profile_id
- system_setting_id
- setting_value
- is_active
- created_by
- created_at
- updated_by
- updated_at

Acciones:
- eliminar setting_key
- eliminar setting_short_key si existe
- eliminar value_type_id
- agregar system_setting_id como FK a system_settings(id)

Restricción única recomendada:
- unique (company_id, employee_profile_id, system_setting_id)

Usar esta combinación porque la aplicación es multiempresa y el mismo perfil puede requerir comportamiento distinto según la empresa dentro del tenant.

Si durante el análisis del código detectas que employee_profile es estrictamente global dentro del tenant y no depende de company, documenta el hallazgo, pero mantén la implementación preparada para soportar company_id en employee_profile_settings salvo que exista una restricción técnica real en el dominio actual.

5) NO DUPLICAR DEFINICIONES DEL PARÁMETRO EN TABLAS HIJAS

En tenant_settings, company_settings y employee_profile_settings NO debe existir ninguna columna que redefina el parámetro, como:
- setting_key
- setting_short_key
- value_type_id

Todo eso vive exclusivamente en system_settings.

MIGRACIÓN DE DATOS

Necesito que construyas una migración real de datos, no solo una migración estructural.

La migración debe hacer lo siguiente:

1. detectar todos los parámetros existentes en las tablas actuales
2. crear registros únicos en system_settings por cada parámetro real identificado
3. mapear los registros existentes de tenant/company/profile hacia system_setting_id
4. conservar setting_value en cada tabla hija
5. conservar is_active y campos de auditoría cuando sea posible
6. eliminar o dejar de usar definitivamente las columnas antiguas de definición libre del parámetro

Reglas de migración:
- si el mismo setting_key existe en más de una tabla, debe consolidarse en un único registro de system_settings
- si se detectan inconsistencias graves para un mismo setting_key, por ejemplo distinto value_type_id, NO quiero una migración silenciosa
- en esos casos:
  - registra el conflicto claramente
  - documenta el caso
  - evita decisiones destructivas sin dejar trazabilidad

Si técnicamente lo ves mejor, puedes hacer la migración en dos fases:
- fase 1: crear nuevas columnas/tablas y poblarlas
- fase 2: actualizar código
- fase 3: eliminar columnas viejas

Pero el resultado final debe dejar el modelo limpio y consistente.

LÓGICA DE NEGOCIO

Implementa un servicio central para obtener el valor efectivo de un parámetro.

Necesito una función o caso de uso equivalente a algo como:

getEffectiveSetting(tenantId, companyId, employeeProfileId, settingKey)

Comportamiento:
1. buscar override activo en employee_profile_settings
2. si no existe, buscar override activo en company_settings
3. si no existe, buscar override activo en tenant_settings
4. si no existe, devolver system_settings.default_value

La respuesta del servicio debe incluir, al menos:
- system_setting_id
- setting_key
- setting_name
- setting_short_key
- value_type_id
- effective_value
- source_level: PROFILE | COMPANY | TENANT | SYSTEM

VALIDACIONES OBLIGATORIAS

Quiero que la aplicación impida:
- crear overrides para parámetros inexistentes
- crear overrides para parámetros inactivos
- guardar valores incompatibles con el tipo de dato definido en system_settings
- duplicar el mismo parámetro para la misma entidad y nivel
- dejar filas ambiguas para herencia cuando en realidad debería eliminarse el override

Regla importante:
Si un nivel hereda, no debe guardarse un override vacío como sustituto.
La herencia debe significar ausencia de fila activa en ese nivel, salvo que exista una razón técnica ya implementada que obligue a otro patrón; en ese caso, documentarlo y mantener un comportamiento explícito y consistente.

API / SERVICIOS

Si el proyecto expone endpoints o servicios de configuración, ajústalos para este nuevo modelo.

Necesito al menos capacidad para:
- consultar catálogo de parámetros
- consultar valor efectivo de un parámetro
- consultar overrides por tenant
- consultar overrides por company
- consultar overrides por employee_profile
- crear o actualizar override por nivel
- eliminar override para volver a heredar

La API o capa de aplicación debe dejar claro:
- el valor efectivo
- el valor local del nivel
- el nivel del que proviene el valor final

UI / ADMINISTRACIÓN

Si ya existe módulo administrativo para parámetros, actualízalo para reflejar este modelo.

Reglas de interfaz:
- system_settings administra el catálogo maestro
- tenant/company/profile solo administran overrides
- en tenant/company/profile no se pueden crear parámetros nuevos, solo asignar valor a parámetros existentes
- la UI debe mostrar el origen del valor efectivo
- debe existir una acción para “restablecer herencia” eliminando el override del nivel actual
- cuando se edite un override, mostrar también el valor heredado actual para referencia

CRITERIOS DE ACEPTACIÓN

La implementación se considera terminada solo si se cumple todo esto:

1. existe la tabla system_settings
2. tenant_settings, company_settings y employee_profile_settings referencian system_settings
3. las tablas hijas ya no tienen definición libre del parámetro
4. el valor efectivo respeta la jerarquía:
   PROFILE > COMPANY > TENANT > SYSTEM
5. no se pueden insertar parámetros inexistentes en tablas hijas
6. se valida el tipo de dato según el parámetro maestro
7. la migración conserva la data existente y la auditoría
8. existe una forma clara de eliminar un override y volver a heredar
9. quedan pruebas cubriendo:
   - resolución por sistema
   - resolución por tenant
   - resolución por company
   - resolución por profile
   - fallback correcto
   - conflicto por duplicados
   - validación de tipo de dato
10. no debe quedar código productivo usando setting_key libre en tenant/company/profile

ENTREGABLES ESPERADOS

Entrégame esto en este orden:

1. migración SQL o migraciones necesarias
2. modelos/entidades actualizadas
3. repositorios ajustados
4. servicio de resolución de configuración efectiva
5. validaciones
6. endpoints o casos de uso
7. ajustes de UI si aplica
8. pruebas
9. resumen técnico de lo implementado
10. lista de riesgos o hallazgos encontrados durante la migración

REGLAS DE EJECUCIÓN

- inspecciona la estructura actual antes de cambiar nada
- reutiliza naming conventions del proyecto
- no inventes columnas fuera de lo necesario
- conserva compatibilidad funcional donde sea razonable
- si hay decisiones de diseño ambiguas, prioriza:
  1. integridad del dato
  2. trazabilidad
  3. herencia jerárquica correcta
  4. simplicidad operativa

IMPORTANTE

Quiero implementación real, no solo propuesta.
Quiero cambios concretos en el código y en la base de datos.
Quiero que cualquier decisión de ajuste respecto al esquema actual quede documentada en un resumen final de implementación.