# 🧠 DISEÑO DEFINITIVO: REESTRUCTURACIÓN COMPLETA DE MENÚS, ROLES Y SCREENS
## Turnos Titanium Enterprise - Sistema de Permisos v2.0

**Fecha:** 2026-01-11  
**Versión:** 2.0  
**Estado:** DISEÑO COMPLETO - PENDIENTE APROBACIÓN

---

## 📋 **TABLA DE CONTENIDOS**

1. [Principios Arquitectónicos](#1-principios-arquitectónicos)
2. [Roles del Sistema](#2-roles-del-sistema)
3. [Estructura de Menús por Rol](#3-estructura-de-menús-por-rol)
4. [Prefijos Semánticos de Screens](#4-prefijos-semánticos-de-screens)
5. [Screens: Renombrado y Nuevos](#5-screens-renombrado-y-nuevos)
6. [Mapeo SCREENS → MENÚ → ROL](#6-mapeo-screens--menú--rol)
7. [Scopes Obligatorios](#7-scopes-obligatorios)
8. [Modo KIOSK](#8-modo-kiosk)
9. [Plan de Implementación](#9-plan-de-implementación)

---

## 1. **PRINCIPIOS ARQUITECTÓNICOS**

### ✅ **NO NEGOCIABLES**

1. **KIOSK NO es una nueva aplicación** - Es parte de Turnos Titanium
2. **Wizard (/setup) vs Login (/login)** - URLs distintas
3. **Wizard NO automático** - Solo visible para SUPER_ADMIN (acceso manual)
4. **Si `tenant_onboarding.status = COMPLETED`** → siempre mostrar LOGIN
5. **Todo lo que el wizard configuró** → debe poder verse y editarse desde pantallas normales
6. **RRHH_ADMIN y SUPERVISOR** → MISMAS pantallas, diferencia SOLO en SCOPE
7. **EMPLOYEE** → ingresa automáticamente en modo KIOSK
8. **SCOPES incluyen ROL DE PAGO** → obligatorio para exportación a nómina

---

## 2. **ROLES DEL SISTEMA**

### 🔑 **SUPER_ADMIN**
**Rol técnico y estratégico**

- ✅ **Acceso TOTAL al tenant**
- ✅ **Sin scopes** = acceso completo
- ✅ **Ve MENÚS EXCLUSIVOS** de configuración técnica
- ✅ Puede acceder manualmente a /setup
- ✅ Puede ejecutar Factory Reset (con validaciones críticas)

**Responsabilidades:**
- Configuración técnica del sistema
- Gestión de screens, actions, menús
- Seguridad y auditoría total
- Configuración de tenant

---

### 🛡️ **SYSTEM_ADMIN**
**Administrador funcional del sistema (no técnico)**

- ✅ **Sin acceso a configuración técnica** (screens, actions, menús)
- ✅ **Gestiona catálogos funcionales**
- ✅ **Configura turnos, feriados, dispositivos**
- ✅ **Gestiona estructura organizacional completa**
- ✅ **Sin scopes** = acceso completo funcional
- ✅ **Puede activar/desactivar contingencia KIOSK**

**Responsabilidades:**
- Mantenimiento de catálogos funcionales
- Configuración de turnos y parámetros
- Gestión de empresas, localidades, departamentos
- Gestión de empleados
- Configuración KIOSK (incluyendo contingencia)

---

### 👥 **RRHH_ADMIN**
**Administrador de Recursos Humanos**

- ✅ **SCOPE TOTAL** dentro del tenant
- ✅ **MISMAS PANTALLAS que SUPERVISOR**
- ✅ **Diferencia EXCLUSIVA: SCOPE**
- ✅ Aprueba solicitudes
- ✅ Ejecuta procesos de asistencia
- ✅ Exporta novedades a nómina

**Responsabilidades:**
- Gestión de solicitudes de empleados
- Aprobación de permisos, justificaciones, regularizaciones
- Ejecución de procesos de depuración y generación de novedades
- Reportes operativos
- Exportación a nómina (por rol de pago)

---

### 👥 **SUPERVISOR**
**Supervisor de área/departamento/localidad**

- ✅ **SCOPE LIMITADO** por:
  - Empresa
  - Localidad
  - Departamento
  - Área
  - Empleado
  - **Rol de Pago (OBLIGATORIO)**
- ✅ **MISMAS PANTALLAS que RRHH_ADMIN**
- ✅ **Diferencia EXCLUSIVA: SCOPE**

**Responsabilidades:**
- Gestión de solicitudes dentro de su scope
- Aprobación limitada por estructura
- Reportes de su área
- Monitoreo de asistencia de su equipo

---

### 👤 **EMPLOYEE**
**Empleado (Modo KIOSK automático)**

- ✅ **Al hacer login → entra automáticamente en MODO KIOSK**
- ✅ **NO ve dashboards administrativos**
- ✅ **NO ve configuración**
- ✅ **MENÚ ÚNICO: KIOSK**
- ✅ **NO edita datos reales** → SOLO solicita
- ✅ **TODO queda PENDIENTE de aprobación**

**Responsabilidades:**
- Marcación de asistencia (Entrada/Salida/Lunch)
- Solicitud de permisos
- Regularización de marcaciones
- Justificación de inasistencias
- Solicitud de cambio de turno
- Consulta del estado de mis solicitudes

---

## 3. **ESTRUCTURA DE MENÚS POR ROL**

### 🔑 **MENÚS SUPER_ADMIN**

#### **A. CONFIGURACIÓN DEL TENANT**
| Screen Key | Screen Name | Icon |
|---|---|---|
| `TEN_SETTINGS` | Ajustes del Tenant | SlidersHorizontal |
| `TEN_LANGUAGES` | Idiomas y Localización | Languages |
| `TEN_TIMEZONE` | Zona Horaria | Globe |
| `TEN_LABELS` | Etiquetas Personalizadas | Tag |

#### **B. CONFIGURACIÓN DEL SYSTEM**
| Screen Key | Screen Name | Icon |
|---|---|---|
| `SYS_SCREENS` | Pantallas | Monitor |
| `SYS_ACTIONS` | Acciones | MousePointerClick |
| `SYS_SCREEN_ACTIONS` | Pantalla-Acciones | Link |
| `SYS_MENU_GROUPS` | Grupos de Menú | Menu |
| `SYS_CATALOGS` | Catálogos SYSTEM | Database |
| `SYS_TRANSLATIONS` | Traducciones | Languages |
| `SYS_PARAMS` | Parámetros Globales | Settings |

#### **C. CONFIGURACIÓN DE SEGURIDAD**
| Screen Key | Screen Name | Icon |
|---|---|---|
| `SEC_USERS` | Usuarios | Users |
| `SEC_ROLES` | Roles | Shield |
| `SEC_USER_ROLES` | Asignación de Roles | UserCircle |
| `SEC_ROLE_PERMS` | Permisos por Rol | Lock |
| `SEC_SCOPES` | Scopes | Eye |
| `SEC_COPY_PERMS` | Copiar Permisos | Copy |
| `SEC_AUDIT` | Auditoría | Activity |
| `SEC_SESSIONS` | Sesiones Activas | KeyRound |

#### **D. OPCIONES ESPECIALES**
| Screen Key | Screen Name | Icon |
|---|---|---|
| `SYS_WIZARD` | Wizard de Configuración | Wand2 |
| `SYS_FACTORY_RESET` | Factory Reset | RotateCcw |

---

### 🛡️ **MENÚS SYSTEM_ADMIN**

#### **MANTENIMIENTO**
| Screen Key | Screen Name | Icon |
|---|---|---|
| `MANT_HOLIDAYS` | Feriados | CalendarX |
| `MANT_CATALOGS` | Catálogos Funcionales | Tag |
| `MANT_JUSTIFICATIONS` | Motivos de Justificación | MessageSquareQuote |
| `MANT_DEVICES` | Dispositivos | Fingerprint |

#### **CONFIGURACIÓN**
| Screen Key | Screen Name | Icon |
|---|---|---|
| `CFG_PARAMS` | Parámetros Generales | Settings |
| `CFG_SHIFTS` | Turnos | Clock |
| `CFG_WORK_PATTERNS` | Patrones de Trabajo | Repeat |
| `CFG_SURCHARGES` | Reglas de Recargo | Percent |
| `CFG_ATT_PROCESS` | Procesos de Asistencia | Cpu |
| `CFG_ATT_EVENTS` | Eventos de Asistencia | ListChecks |
| `CFG_MOVEMENTS` | Movimientos | ArrowLeftRight |
| `CFG_KIOSK` | Configuración KIOSK | Monitor |

#### **PERFILES**
| Screen Key | Screen Name | Icon |
|---|---|---|
| `EMPL_PROFILES` | Perfiles de Empleado | IdCard |
| `EMPL_PROFILE_SETTINGS` | Ajustes por Perfil | Sliders |
| `EMPL_PROFILE_SHIFTS` | Turnos por Perfil | Clock |
| `EMPL_PROFILE_NOVELTIES` | Novedades por Perfil | FileText |

#### **ORGANIZACIÓN**
| Screen Key | Screen Name | Icon |
|---|---|---|
| `ORG_COMPANIES` | Empresas | Building2 |
| `ORG_WORK_LOCATIONS` | Localidades | MapPin |
| `ORG_DEPARTMENTS` | Departamentos | Network |
| `ORG_AREAS` | Áreas | Layers |
| `ORG_JOB_TITLES` | Cargos | BadgeCheck |
| `ORG_COST_CENTERS` | Centros de Costo | Landmark |
| `ORG_WORK_GROUPS` | Grupos de Trabajo | Users |
| `ORG_PAYROLL_GROUPS` | Roles de Pago | WalletCards |

#### **EMPLEADOS**
| Screen Key | Screen Name | Icon |
|---|---|---|
| `EMPL_LIST` | Empleados | Users |
| `EMPL_ASSIGN_COMPANY` | Asignación a Empresa | UserPlus |
| `EMPL_DOCUMENTS` | Documentos | Folder |

---

### 👥 **MENÚS RRHH_ADMIN / SUPERVISOR**
**(MISMAS PANTALLAS - Diferencia SOLO en SCOPE)**

#### **EMPLEADOS**
| Screen Key | Screen Name | Icon |
|---|---|---|
| `ATT_SHIFT_PLANS` | Asignación de Turnos | CalendarClock |
| `ATT_TIME_PUNCHES` | Marcaciones | Timer |

#### **SOLICITUDES**
| Screen Key | Screen Name | Icon |
|---|---|---|
| `REQ_PERMISSIONS` | Solicitudes de Permisos | ClipboardList |
| `REQ_JUSTIFICATIONS` | Justificaciones | MessageSquareQuote |
| `REQ_REGULARIZATIONS` | Regularizaciones | FileEdit |
| `REQ_SHIFT_CHANGES` | Cambios de Turno | ArrowLeftRight |

#### **OPERACIONES**
| Screen Key | Screen Name | Icon |
|---|---|---|
| `OPS_PURGE` | Depuración de Marcaciones | Filter |
| `OPS_GENERATION` | Generación de Novedades | Play |
| `OPS_APPROVALS` | Aprobación de Novedades | CheckCircle2 |
| `OPS_EXPORT_PAYROLL` | Exportación a Nómina | FileOutput |
| `OPS_PROCESS_ADMIN` | Administración de Procesos | Settings |

#### **SINCRONIZACIÓN**
| Screen Key | Screen Name | Icon |
|---|---|---|
| `SYNC_IMPORT_PAYROLL` | Importar Nómina | FileInput |
| `SYNC_IMPORT_PUNCHES` | Importar Marcaciones | Download |
| `SYNC_EXPORT_NOVELTIES` | Exportar Novedades | Upload |

#### **REPORTES**
| Screen Key | Screen Name | Icon |
|---|---|---|
| `RPT_CATALOG` | Catálogo de Reportes | FileText |
| `RPT_ATTENDANCE` | Reportes de Asistencia | ClipboardCheck |
| `RPT_NOVELTIES` | Reportes de Novedades | FileBarChart |
| `RPT_ANALYTICS` | Reportes Analíticos | BarChart3 |

---

### 👤 **MENÚ EMPLOYEE (MODO KIOSK)**

#### **KIOSK**
| Screen Key | Screen Name | Icon |
|---|---|---|
| `KIOSK_PUNCH` | Marcación (Entrada/Salida/Lunch) | Timer |
| `KIOSK_REGULARIZATION` | Regularizar Marcaciones | FileEdit |
| `KIOSK_PERMISSION` | Solicitar Permisos | ClipboardList |
| `KIOSK_JUSTIFICATION` | Justificar Inasistencias | MessageSquare |
| `KIOSK_SHIFT_CHANGE` | Solicitar Cambio de Turno | ArrowLeftRight |
| `KIOSK_MY_REQUESTS` | Mis Solicitudes (estado) | Eye |

---

## 4. **PREFIJOS SEMÁNTICOS DE SCREENS**

| Prefijo | Significado | Uso | Ejemplo |
|---|---|---|---|
| `SYS_` | Configuración SYSTEM | Pantallas técnicas (screens, actions, menús) | `SYS_SCREENS` |
| `TEN_` | Configuración TENANT | Ajustes del tenant (idioma, zona horaria) | `TEN_SETTINGS` |
| `SEC_` | Seguridad | Usuarios, roles, permisos, auditoría | `SEC_USERS` |
| `CFG_` | Configuración Operativa | Turnos, parámetros, dispositivos | `CFG_SHIFTS` |
| `MANT_` | Mantenimiento | Catálogos, feriados, motivos | `MANT_HOLIDAYS` |
| `ORG_` | Organización | Empresas, departamentos, localidades | `ORG_COMPANIES` |
| `EMPL_` | Empleados | Listado, perfiles, documentos | `EMPL_LIST` |
| `ATT_` | Asistencia | Marcaciones, turnos, anomalías | `ATT_TIME_PUNCHES` |
| `OPS_` | Operaciones | Procesos de depuración, generación | `OPS_PURGE` |
| `REQ_` | Solicitudes | Permisos, justificaciones, cambios | `REQ_PERMISSIONS` |
| `SYNC_` | Sincronización | Importación/exportación | `SYNC_IMPORT_PAYROLL` |
| `RPT_` | Reportes | Catálogo, ejecuciones, permisos | `RPT_CATALOG` |
| `KIOSK_` | Kiosko | Pantallas de autoservicio empleado | `KIOSK_PUNCH` |
| `DASH_` | Dashboard | Dashboards | `DASH_MAIN` |

---

## 5. **SCREENS: RENOMBRADO Y NUEVOS**

### 📝 **RENOMBRADO DE SCREENS EXISTENTES**

| Screen Key ANTERIOR | Screen Key NUEVO | Razón |
|---|---|---|
| `CONF_TENANT_SETTINGS` | `TEN_SETTINGS` | Prefijo TEN_ para configuración tenant |
| `SEC_MENU_GROUPS` | `SYS_MENU_GROUPS` | Prefijo SYS_ para configuración técnica |
| `SEC_SCREENS` | `SYS_SCREENS` | Prefijo SYS_ para configuración técnica |
| `SEC_ACTIONS` | `SYS_ACTIONS` | Prefijo SYS_ para configuración técnica |
| `SEC_SCREEN_ACTIONS` | `SYS_SCREEN_ACTIONS` | Prefijo SYS_ para configuración técnica |
| `MANT_CATALOGS` | `SYS_CATALOGS` vs `MANT_CATALOGS` | Separar SYSTEM vs FUNCIONALES |
| `CONF_PARAMS` | `CFG_PARAMS` | Unificar prefijo CFG_ |
| `CONF_SHIFTS` | `CFG_SHIFTS` | Unificar prefijo CFG_ |
| `CONF_DEVICES` | `MANT_DEVICES` | Dispositivos son mantenimiento |
| `CONF_ATT_PROCESS` | `CFG_ATT_PROCESS` | Unificar prefijo CFG_ |
| `MANT_ATT_MOVEMENTS` | `CFG_MOVEMENTS` | Movimientos son configuración |
| `MANT_ATT_EVENTS` | `CFG_ATT_EVENTS` | Eventos son configuración |
| `EMPL_ABSENCE_REQUESTS` | `REQ_PERMISSIONS` | Unificar como solicitudes |
| `ATT_PROCESS_RUNS` | `OPS_PROCESS_RUNS` | Operaciones |
| `ATT_APPROVALS` | `OPS_APPROVALS` | Operaciones |
| `ATT_ANOMALIES` | `ATT_ANOMALIES` | ✅ Mantener (es asistencia) |
| `ATT_CALC_RESULTS` | `ATT_CALC_RESULTS` | ✅ Mantener (es asistencia) |
| `SEC_TENANT_MEMBERS` | `SEC_USERS` | Simplificar |
| `SEC_LOGIN_SESSIONS` | `SEC_SESSIONS` | Simplificar |

### ➕ **SCREENS NUEVOS**

| Screen Key | Screen Name | Menú | Rol(es) | Icon |
|---|---|---|---|---|
| `TEN_LANGUAGES` | Idiomas y Localización | Config Tenant | SUPER_ADMIN | Languages |
| `TEN_TIMEZONE` | Zona Horaria | Config Tenant | SUPER_ADMIN | Globe |
| `TEN_LABELS` | Etiquetas Personalizadas | Config Tenant | SUPER_ADMIN | Tag |
| `SYS_TRANSLATIONS` | Traducciones | Config System | SUPER_ADMIN | Languages |
| `SYS_PARAMS` | Parámetros Globales | Config System | SUPER_ADMIN | Settings |
| `SYS_WIZARD` | Wizard de Configuración | Opciones Especiales | SUPER_ADMIN | Wand2 |
| `SYS_FACTORY_RESET` | Factory Reset | Opciones Especiales | SUPER_ADMIN | RotateCcw |
| `CFG_KIOSK` | Configuración KIOSK | Configuración | SYSTEM_ADMIN | Monitor |
| `EMPL_PROFILE_SHIFTS` | Turnos por Perfil | Perfiles | SYSTEM_ADMIN | Clock |
| `EMPL_PROFILE_NOVELTIES` | Novedades por Perfil | Perfiles | SYSTEM_ADMIN | FileText |
| `OPS_PURGE` | Depuración de Marcaciones | Operaciones | RRHH_ADMIN, SUPERVISOR | Filter |
| `OPS_GENERATION` | Generación de Novedades | Operaciones | RRHH_ADMIN, SUPERVISOR | Play |
| `OPS_EXPORT_PAYROLL` | Exportación a Nómina | Operaciones | RRHH_ADMIN, SUPERVISOR | FileOutput |
| `OPS_PROCESS_ADMIN` | Administración de Procesos | Operaciones | RRHH_ADMIN, SUPERVISOR | Settings |
| `REQ_PERMISSIONS` | Solicitudes de Permisos | Solicitudes | RRHH_ADMIN, SUPERVISOR | ClipboardList |
| `REQ_JUSTIFICATIONS` | Justificaciones | Solicitudes | RRHH_ADMIN, SUPERVISOR | MessageSquareQuote |
| `REQ_REGULARIZATIONS` | Regularizaciones | Solicitudes | RRHH_ADMIN, SUPERVISOR | FileEdit |
| `REQ_SHIFT_CHANGES` | Cambios de Turno | Solicitudes | RRHH_ADMIN, SUPERVISOR | ArrowLeftRight |
| `SYNC_IMPORT_PAYROLL` | Importar Nómina | Sincronización | RRHH_ADMIN, SUPERVISOR | FileInput |
| `RPT_ATTENDANCE` | Reportes de Asistencia | Reportes | RRHH_ADMIN, SUPERVISOR | ClipboardCheck |
| `RPT_NOVELTIES` | Reportes de Novedades | Reportes | RRHH_ADMIN, SUPERVISOR | FileBarChart |
| `RPT_ANALYTICS` | Reportes Analíticos | Reportes | RRHH_ADMIN, SUPERVISOR | BarChart3 |
| `KIOSK_PUNCH` | Marcación | Kiosk | EMPLOYEE | Timer |
| `KIOSK_REGULARIZATION` | Regularizar Marcaciones | Kiosk | EMPLOYEE | FileEdit |
| `KIOSK_PERMISSION` | Solicitar Permisos | Kiosk | EMPLOYEE | ClipboardList |
| `KIOSK_JUSTIFICATION` | Justificar Inasistencias | Kiosk | EMPLOYEE | MessageSquare |
| `KIOSK_SHIFT_CHANGE` | Solicitar Cambio de Turno | Kiosk | EMPLOYEE | ArrowLeftRight |
| `KIOSK_MY_REQUESTS` | Mis Solicitudes | Kiosk | EMPLOYEE | Eye |

---

## 6. **MAPEO SCREENS → MENÚ → ROL**

### 🔑 **SUPER_ADMIN: ACCESO TOTAL**

**Menu Group: TENANT_CONFIG**
- `TEN_SETTINGS`
- `TEN_LANGUAGES`
- `TEN_TIMEZONE`
- `TEN_LABELS`

**Menu Group: SYSTEM_CONFIG**
- `SYS_SCREENS`
- `SYS_ACTIONS`
- `SYS_SCREEN_ACTIONS`
- `SYS_MENU_GROUPS`
- `SYS_CATALOGS`
- `SYS_TRANSLATIONS`
- `SYS_PARAMS`

**Menu Group: SECURITY**
- `SEC_USERS`
- `SEC_ROLES`
- `SEC_USER_ROLES`
- `SEC_ROLE_PERMS`
- `SEC_SCOPES`
- `SEC_COPY_PERMS`
- `SEC_AUDIT`
- `SEC_SESSIONS`

**Menu Group: SYSTEM_TOOLS**
- `SYS_WIZARD`
- `SYS_FACTORY_RESET`

---

### 🛡️ **SYSTEM_ADMIN: CONFIGURACIÓN FUNCIONAL**

**Menu Group: MAINTENANCE**
- `MANT_HOLIDAYS`
- `MANT_CATALOGS`
- `MANT_JUSTIFICATIONS`
- `MANT_DEVICES`

**Menu Group: CONFIGURATION**
- `CFG_PARAMS`
- `CFG_SHIFTS`
- `CFG_WORK_PATTERNS`
- `CFG_SURCHARGES`
- `CFG_ATT_PROCESS`
- `CFG_ATT_EVENTS`
- `CFG_MOVEMENTS`
- `CFG_KIOSK`

**Menu Group: PROFILES**
- `EMPL_PROFILES`
- `EMPL_PROFILE_SETTINGS`
- `EMPL_PROFILE_SHIFTS`
- `EMPL_PROFILE_NOVELTIES`

**Menu Group: ORGANIZATION**
- `ORG_COMPANIES`
- `ORG_WORK_LOCATIONS`
- `ORG_DEPARTMENTS`
- `ORG_AREAS`
- `ORG_JOB_TITLES`
- `ORG_COST_CENTERS`
- `ORG_WORK_GROUPS`
- `ORG_PAYROLL_GROUPS`

**Menu Group: EMPLOYEES**
- `EMPL_LIST`
- `EMPL_ASSIGN_COMPANY`
- `EMPL_DOCUMENTS`

---

### 👥 **RRHH_ADMIN / SUPERVISOR: OPERACIONES**
**(MISMAS PANTALLAS - Diferencia en SCOPE)**

**Menu Group: EMPLOYEES**
- `ATT_SHIFT_PLANS`
- `ATT_TIME_PUNCHES`

**Menu Group: REQUESTS**
- `REQ_PERMISSIONS`
- `REQ_JUSTIFICATIONS`
- `REQ_REGULARIZATIONS`
- `REQ_SHIFT_CHANGES`

**Menu Group: OPERATIONS**
- `OPS_PURGE`
- `OPS_GENERATION`
- `OPS_APPROVALS`
- `OPS_EXPORT_PAYROLL`
- `OPS_PROCESS_ADMIN`

**Menu Group: SYNC**
- `SYNC_IMPORT_PAYROLL`
- `SYNC_IMPORT_PUNCHES`
- `SYNC_EXPORT_NOVELTIES`

**Menu Group: REPORTS**
- `RPT_CATALOG`
- `RPT_ATTENDANCE`
- `RPT_NOVELTIES`
- `RPT_ANALYTICS`

---

### 👤 **EMPLOYEE: MODO KIOSK**

**Menu Group: KIOSK**
- `KIOSK_PUNCH`
- `KIOSK_REGULARIZATION`
- `KIOSK_PERMISSION`
- `KIOSK_JUSTIFICATION`
- `KIOSK_SHIFT_CHANGE`
- `KIOSK_MY_REQUESTS`

---

## 7. **SCOPES OBLIGATORIOS**

Los scopes deben incluir OBLIGATORIAMENTE:

| Scope Type | Tabla | Campo | Obligatorio para |
|---|---|---|---|
| **Empresa** | `companies` | `company_id` | SUPERVISOR |
| **Localidad** | `work_locations` | `work_location_id` | SUPERVISOR |
| **Departamento** | `departments` | `department_id` | SUPERVISOR |
| **Área** | `areas` | `area_id` | SUPERVISOR |
| **Empleado** | `employees` | `employee_id` | SUPERVISOR |
| **Rol de Pago** | `payroll_groups` | `payroll_group_id` | ⚠️ **CRÍTICO** - SUPERVISOR |

### ⚠️ **ROL DE PAGO (CRÍTICO)**

El scope por **Rol de Pago** es **OBLIGATORIO** para:
- Exportación a nómina
- Generación de novedades por grupo
- Reportes financieros
- Liquidación de nómina

**Regla:**
- Usuario **SIN scopes** → acceso total
- Usuario **CON scopes** → acceso restringido según lista

---

## 8. **MODO KIOSK**

### 🎯 **Características del KIOSK**

1. ✅ **Autenticación:** PIN + FOTO
2. ✅ **Sesión:** Con expiración obligatoria
3. ✅ **Hora:** SIEMPRE del servidor
4. ✅ **Registro de:**
   - Dispositivo
   - Origen (BIOMETRIC, KIOSK, KIOSK_CONTINGENCY)
   - Tipo de botón (ENTRY, EXIT, LUNCH_OUT, LUNCH_IN, PERMISSION_OUT, PERMISSION_IN)
5. ✅ **Feedback inmediato:**
   - Sonoro fuerte
   - Check verde / rojo
   - Timeout configurable (default 5s)
6. ✅ **Visualización previa de:**
   - Marcaciones
   - Turnos
   - Anomalías

### 📍 **Controles Generales (TODAS las pantallas KIOSK)**

1. **Contexto visible (siempre arriba):**
   - Nombre del empleado
   - Fecha actual
   - Rol / Perfil
   - Empresa / Localidad
   - Origen de marcación: KIOSK

2. **Selector de rango de fechas (inteligente):**
   - Default: últimos 7 días
   - Máximo configurable (30/60 días)
   - No permitir fechas futuras (salvo cambio de turno)

3. **Línea de tiempo / tabla resumida:**
   - Ver ANTES de corregir
   - Columnas: Fecha, Tipo, Hora, Estado, Origen, Ícono

4. **Acción "Solicitar":**
   - ❌ Nunca editar inline
   - ❌ Nunca sobrescribir datos
   - ✅ Siempre botón "Solicitar corrección"
   - ✅ Siempre formulario guiado

### 🔐 **Modo Contingencia KIOSK**

**Activación:**
- Solo puede activar/desactivar: **SYSTEM_ADMIN**
- Activación manual desde `CFG_KIOSK`

**Reglas obligatorias:**
- ⏱ Expira obligatoriamente
- ❌ NO permite hora manual (siempre hora del servidor)
- 📝 Requiere motivo obligatorio
- 🔍 Auditoría completa:
  - Usuario que activó contingencia
  - Fecha/hora de activación
  - Fecha/hora de expiración
  - Motivo

**Registro de marcaciones en contingencia:**
- `source = KIOSK_CONTINGENCY`
- `kiosk_device_id`
- `contingency_reason_id`
- `activated_by_user_id`
- `contingency_activated_at`
- `contingency_expires_at`

---

## 9. **PLAN DE IMPLEMENTACIÓN**

### **FASE 1: BASE DE DATOS**

1. ✅ **Crear nueva tabla `system_menu_groups` con nuevos grupos:**
   - `TENANT_CONFIG`
   - `SYSTEM_CONFIG`
   - `SECURITY`
   - `SYSTEM_TOOLS`
   - `MAINTENANCE` (renombrar de MAINT)
   - `CONFIGURATION` (renombrar de CONFIG)
   - `PROFILES`
   - `ORGANIZATION` (renombrar de ORG)
   - `EMPLOYEES` (renombrar de EMPLOYEE)
   - `REQUESTS` (nuevo)
   - `OPERATIONS` (nuevo)
   - `SYNC` (nuevo)
   - `REPORTS`
   - `KIOSK` (nuevo)

2. ✅ **Renombrar screens existentes** según tabla de renombrado

3. ✅ **Crear screens nuevos** según tabla de nuevos

4. ✅ **Crear roles:**
   - `SUPER_ADMIN` ✅ (ya existe)
   - `SYSTEM_ADMIN` (nuevo)
   - `RRHH_ADMIN` (nuevo)
   - `SUPERVISOR` (nuevo)
   - `EMPLOYEE` (nuevo)

5. ✅ **Crear tablas KIOSK:**
   - `kiosk_devices`
   - `kiosk_configuration`
   - `time_punches`
   - `kiosk_contingency_reasons`
   - `kiosk_audit_log`

6. ✅ **Seed inicial:**
   - Menu groups
   - Screens (renombrados + nuevos)
   - Actions (MARK_ENTRY, MARK_EXIT, MARK_LUNCH_OUT, MARK_LUNCH_IN, MARK_PERMISSION_OUT, MARK_PERMISSION_IN, ACTIVATE_CONTINGENCY, DEACTIVATE_CONTINGENCY)
   - Screen-Actions
   - Roles
   - Role-Screen-Actions
   - Motivos de contingencia

### **FASE 2: BACKEND**

1. ✅ **Endpoints KIOSK:**
   - `POST /make-server-e19f2094/kiosk/identify` (PIN + validación)
   - `POST /make-server-e19f2094/kiosk/punch` (marcación)
   - `POST /make-server-e19f2094/kiosk/request-permission` (solicitud de permiso)
   - `POST /make-server-e19f2094/kiosk/request-regularization` (solicitud de regularización)
   - `POST /make-server-e19f2094/kiosk/request-justification` (solicitud de justificación)
   - `POST /make-server-e19f2094/kiosk/request-shift-change` (solicitud de cambio de turno)
   - `GET /make-server-e19f2094/kiosk/my-requests` (mis solicitudes)
   - `GET /make-server-e19f2094/kiosk/config` (configuración del kiosk)
   - `POST /make-server-e19f2094/kiosk/contingency/activate` (activar contingencia - SYSTEM_ADMIN)
   - `POST /make-server-e19f2094/kiosk/contingency/deactivate` (desactivar contingencia - SYSTEM_ADMIN)

2. ✅ **Validaciones:**
   - Throttling anti-doble click (30-60s)
   - Secuencias inconsistentes → marcar como anomalía
   - Empleado activo
   - Hora del servidor obligatoria

3. ✅ **Job automático:**
   - Auto-expirar contingencias (cron cada 5 minutos)

### **FASE 3: FRONTEND**

1. ✅ **Rutas:**
   - `/login` → Login normal
   - `/setup` → Wizard (solo SUPER_ADMIN)
   - `/kiosk` → Modo KIOSK (EMPLOYEE)
   - `/dashboard` → Dashboard (SUPER_ADMIN, SYSTEM_ADMIN, RRHH_ADMIN, SUPERVISOR)

2. ✅ **Componentes KIOSK:**
   - `KioskLayout.tsx` (layout sin menú administrativo)
   - `KioskIdentification.tsx` (PIN + foto)
   - `KioskPunch.tsx` (botones de marcación)
   - `KioskRegularization.tsx` (regularización)
   - `KioskPermission.tsx` (solicitud de permisos)
   - `KioskJustification.tsx` (justificación)
   - `KioskShiftChange.tsx` (cambio de turno)
   - `KioskMyRequests.tsx` (mis solicitudes)
   - `KioskFeedback.tsx` (feedback visual/sonoro)
   - `KioskContingencyBanner.tsx` (banner de contingencia)

3. ✅ **Menús dinámicos:**
   - Actualizar `Layout.tsx` para mostrar menús según rol
   - SUPER_ADMIN → ve menús técnicos
   - SYSTEM_ADMIN → ve menús funcionales
   - RRHH_ADMIN/SUPERVISOR → ve menús operativos (diferencia en scope)
   - EMPLOYEE → redirige automáticamente a `/kiosk`

4. ✅ **Pantallas de configuración:**
   - `CFG_KIOSK.tsx` (configuración kiosk + contingencia - SYSTEM_ADMIN)
   - `SYS_WIZARD.tsx` (acceso manual al wizard - SUPER_ADMIN)
   - `SYS_FACTORY_RESET.tsx` (factory reset - SUPER_ADMIN)

### **FASE 4: SEGURIDAD Y PERMISOS**

1. ✅ **Asignar permisos por rol:**
   - SUPER_ADMIN → todos los screens
   - SYSTEM_ADMIN → screens funcionales
   - RRHH_ADMIN → screens operativos (scope total)
   - SUPERVISOR → screens operativos (scope limitado)
   - EMPLOYEE → screens KIOSK

2. ✅ **Configurar scopes:**
   - SUPERVISOR → agregar scopes por empresa, localidad, departamento, área, empleado, **rol de pago**
   - RRHH_ADMIN → sin scopes (acceso total dentro del tenant)

3. ✅ **Validar en backend:**
   - Middleware de autenticación
   - Middleware de autorización (permisos)
   - Middleware de scopes

### **FASE 5: TESTING Y AJUSTES**

1. ✅ **Testing de permisos:**
   - Verificar que cada rol ve solo sus pantallas
   - Verificar que scopes funcionan correctamente
   - Verificar que RRHH_ADMIN y SUPERVISOR ven mismas pantallas

2. ✅ **Testing KIOSK:**
   - PIN + foto
   - Marcaciones (Entrada/Salida/Lunch)
   - Solicitudes (Permisos/Regularización/Justificación/Cambio de turno)
   - Mis solicitudes
   - Contingencia (activación/desactivación/expiración)
   - Feedback visual/sonoro
   - Auto-reset

3. ✅ **Testing wizard:**
   - Solo accesible por SUPER_ADMIN
   - No aparece automáticamente si `tenant_onboarding.status = COMPLETED`
   - Acceso manual desde `/setup`

---

## 10. **CONFIRMACIONES FINALES**

### ✅ **CONFIRMACIÓN 1: Wizard vs Login**
- ✅ Wizard solo es manual (acceso desde `/setup`)
- ✅ Login es el punto de entrada normal (`/login`)
- ✅ Si `tenant_onboarding.status = COMPLETED` → nunca mostrar wizard automáticamente

### ✅ **CONFIRMACIÓN 2: KIOSK**
- ✅ KIOSK es un modo interno de Turnos Titanium (no app separada)
- ✅ Ruta `/kiosk` dentro del mismo sistema
- ✅ EMPLOYEE entra automáticamente en modo KIOSK al hacer login

### ✅ **CONFIRMACIÓN 3: RRHH_ADMIN vs SUPERVISOR**
- ✅ MISMAS pantallas
- ✅ MISMAS acciones
- ✅ DIFERENCIA EXCLUSIVA: SCOPE

### ✅ **CONFIRMACIÓN 4: SCOPES**
- ✅ Incluyen ROL DE PAGO (obligatorio)
- ✅ Usuario SIN scopes → acceso total
- ✅ Usuario CON scopes → acceso restringido

### ✅ **CONFIRMACIÓN 5: Prefijos**
- ✅ `SYS_` → configuración técnica (SUPER_ADMIN)
- ✅ `TEN_` → configuración tenant (SUPER_ADMIN)
- ✅ `SEC_` → seguridad (SUPER_ADMIN)
- ✅ `CFG_` → configuración operativa (SYSTEM_ADMIN)
- ✅ `MANT_` → mantenimiento (SYSTEM_ADMIN)
- ✅ `ORG_` → organización (SYSTEM_ADMIN)
- ✅ `EMPL_` → empleados (SYSTEM_ADMIN)
- ✅ `ATT_` → asistencia (RRHH_ADMIN, SUPERVISOR)
- ✅ `OPS_` → operaciones (RRHH_ADMIN, SUPERVISOR)
- ✅ `REQ_` → solicitudes (RRHH_ADMIN, SUPERVISOR)
- ✅ `SYNC_` → sincronización (RRHH_ADMIN, SUPERVISOR)
- ✅ `RPT_` → reportes (RRHH_ADMIN, SUPERVISOR)
- ✅ `KIOSK_` → kiosko (EMPLOYEE)

---

## 📊 **RESUMEN ESTADÍSTICO**

| Elemento | Cantidad |
|---|---|
| **Roles** | 5 (SUPER_ADMIN, SYSTEM_ADMIN, RRHH_ADMIN, SUPERVISOR, EMPLOYEE) |
| **Menu Groups** | 14 (TENANT_CONFIG, SYSTEM_CONFIG, SECURITY, SYSTEM_TOOLS, MAINTENANCE, CONFIGURATION, PROFILES, ORGANIZATION, EMPLOYEES, REQUESTS, OPERATIONS, SYNC, REPORTS, KIOSK) |
| **Screens existentes (a renombrar)** | 51 |
| **Screens nuevos** | 29 |
| **Total Screens** | 80 |
| **Actions nuevas KIOSK** | 8 (MARK_ENTRY, MARK_EXIT, MARK_LUNCH_OUT, MARK_LUNCH_IN, MARK_PERMISSION_OUT, MARK_PERMISSION_IN, ACTIVATE_CONTINGENCY, DEACTIVATE_CONTINGENCY) |
| **Tablas nuevas KIOSK** | 5 (kiosk_devices, kiosk_configuration, time_punches, kiosk_contingency_reasons, kiosk_audit_log) |
| **Endpoints Backend KIOSK** | 10 |
| **Componentes Frontend KIOSK** | 9 |
| **Scope Types** | 6 (Empresa, Localidad, Departamento, Área, Empleado, Rol de Pago) |

---

## 🚀 **PRÓXIMOS PASOS**

1. ✅ **Aprobación de este diseño**
2. ✅ **Implementación FASE 1: Base de Datos** (scripts SQL)
3. ✅ **Implementación FASE 2: Backend** (endpoints)
4. ✅ **Implementación FASE 3: Frontend** (componentes y rutas)
5. ✅ **Implementación FASE 4: Seguridad y Permisos**
6. ✅ **Implementación FASE 5: Testing**

---

**FIN DEL DOCUMENTO DE DISEÑO**

**Fecha de creación:** 2026-01-11  
**Versión:** 2.0  
**Estado:** ⏸️ PENDIENTE APROBACIÓN  
**Elaborado por:** Nyra (AI Assistant)  
**Proyecto:** Turnos Titanium Enterprise On-Premise
