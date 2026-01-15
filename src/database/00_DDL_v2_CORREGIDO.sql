/* ================================================================================================
 Turnos Titanium — Esquema Unificado (DDL) v2 CORREGIDO + i18n (ES/EN)
 Autor: Falcon (con Tony)
 Fecha Corrección: 2025-01-03
 Correcciones aplicadas:
   - FIX: constraint unique en time_clock_devices (coalesce no permitido)
   - AGREGADO: campo icon_key en screens (necesario para menú dinámico)
================================================================================================ */

-- Extensiones
create extension if not exists pgcrypto;

-- Helper: updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

----------------------------------------------------------------------------------------------------
-- 1) MULTITENANCY CORE
----------------------------------------------------------------------------------------------------

/* tenants
   Cada cliente del SaaS. */
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_name varchar(150) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

/* tenant_members
   Mapeo auth.users -> tenants (quién pertenece a qué tenant). */
create table if not exists public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  member_role varchar(30) not null default 'admin', -- solo "rol de pertenencia", no reemplaza roles RBAC
  created_at timestamptz not null default now(),
  constraint uq_tenant_members unique (tenant_id, auth_user_id)
);

----------------------------------------------------------------------------------------------------
-- 2) i18n (IDIOMAS + TABLAS DE TRADUCCIÓN)
----------------------------------------------------------------------------------------------------

/* system_languages
   Idiomas soportados por la plataforma. (mínimo ES, EN) */
create table if not exists public.system_languages (
  code varchar(10) primary key,           -- 'es', 'en'
  language_name varchar(50) not null,     -- Español, English
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Regla (recomendación): 1 solo default
-- (lo puedes garantizar con un índice parcial único si quieres)
create unique index if not exists uq_system_languages_default
  on public.system_languages (is_default)
  where is_default = true;

/* tenant_language_settings
   Configuración de idioma por tenant (default + idiomas habilitados). */
create table if not exists public.tenant_language_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  default_language_code varchar(10) not null references public.system_languages(code) on delete restrict,
  enabled_languages varchar(200) null, -- opcional: CSV "es,en" o manejar en tabla aparte
  created_at timestamptz not null default now(),
  updated_at timestamptz null,
  constraint uq_tenant_language_settings unique (tenant_id)
);

create trigger trg_tenant_language_settings_updated_at
before update on public.tenant_language_settings
for each row execute function public.set_updated_at();

----------------------------------------------------------------------------------------------------
-- 3) CATÁLOGOS (LOOKUPS) SYSTEM/TENANT
----------------------------------------------------------------------------------------------------

/* lookup_groups
   Define listas del sistema. */
create table if not exists public.lookup_groups (
  id uuid primary key default gen_random_uuid(),
  lookup_group_key varchar(50) not null,            -- PROCESS_STATUS, AUTH_PROVIDER, MODULE, etc.
  lookup_group_label varchar(120) not null,         -- texto base (ES por ahora)
  lookup_group_short_label varchar(30) not null,
  allows_tenant_items boolean not null default false,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_lookup_groups_key unique (lookup_group_key)
);

create trigger trg_lookup_groups_updated_at
before update on public.lookup_groups
for each row execute function public.set_updated_at();

/* lookup_values
   Items de un catálogo.
   tenant_id NULL = SYSTEM, tenant_id NOT NULL = TENANT
   lookup_scope = SYSTEM/TENANT (controlado por carga/reglas) */
create table if not exists public.lookup_values (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references public.tenants(id) on delete cascade,
  lookup_group_id uuid not null references public.lookup_groups(id) on delete cascade,
  lookup_key varchar(50) not null,
  lookup_label varchar(150) not null,       -- texto base (ES por ahora)
  lookup_short_label varchar(30) not null,
  lookup_scope varchar(10) not null,        -- SYSTEM / TENANT
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint ck_lookup_scope check (lookup_scope in ('SYSTEM','TENANT')),
  constraint uq_lookup_values unique (lookup_group_id, tenant_id, lookup_key)
);

create trigger trg_lookup_values_updated_at
before update on public.lookup_values
for each row execute function public.set_updated_at();

-- i18n: traducciones de catálogos
create table if not exists public.lookup_group_translations (
  id uuid primary key default gen_random_uuid(),
  lookup_group_id uuid not null references public.lookup_groups(id) on delete cascade,
  language_code varchar(10) not null references public.system_languages(code) on delete restrict,
  label varchar(120) not null,
  short_label varchar(30) not null,
  created_at timestamptz not null default now(),
  constraint uq_lookup_group_translations unique (lookup_group_id, language_code)
);

create table if not exists public.lookup_value_translations (
  id uuid primary key default gen_random_uuid(),
  lookup_value_id uuid not null references public.lookup_values(id) on delete cascade,
  language_code varchar(10) not null references public.system_languages(code) on delete restrict,
  label varchar(150) not null,
  short_label varchar(30) not null,
  created_at timestamptz not null default now(),
  constraint uq_lookup_value_translations unique (lookup_value_id, language_code)
);

----------------------------------------------------------------------------------------------------
-- 4) CORE DOMINIO: EMPRESAS / EMPLEADOS / RELACIÓN EMPLEADO↔EMPRESA
----------------------------------------------------------------------------------------------------

/* companies
   Multiempresa dentro de un tenant. */
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_name varchar(150) not null,
  company_short_name varchar(20) not null,
  company_code varchar(30) not null,
  company_address varchar(200) null,
  company_address_line1 varchar(150) null,
  company_address_line2 varchar(150) null,
  company_country_id uuid null references public.lookup_values(id) on delete restrict,
  company_state_id uuid null references public.lookup_values(id) on delete restrict,
  company_city_id uuid null references public.lookup_values(id) on delete restrict,
  company_postal_code varchar(20) null,
  company_phone varchar(30) null,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_companies_code unique (tenant_id, company_code),
  constraint uq_companies_short unique (tenant_id, company_short_name)
);

create trigger trg_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

/* employees
   Persona/empleado a nivel tenant (no "dónde trabaja"). */
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_lastname varchar(80) not null,
  employee_name varchar(80) not null,
  employee_code varchar(30) not null,
  employee_birthday date null,
  employee_gender_id uuid null references public.lookup_values(id) on delete restrict,
  employee_is_model boolean not null default false,
  employee_observations varchar(2000) null,
  employee_photo_path varchar(300) null,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_employees_code unique (tenant_id, employee_code)
);

create trigger trg_employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

----------------------------------------------------------------------------------------------------
-- 5) ORG STRUCTURE (por tenant)
----------------------------------------------------------------------------------------------------

create table if not exists public.payroll_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  payroll_group_name varchar(120) not null,
  payroll_group_short_name varchar(20) not null,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_payroll_groups unique (tenant_id, payroll_group_short_name)
);

create table if not exists public.work_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  work_location_name varchar(120) not null,
  work_location_short_name varchar(20) not null,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_work_locations unique (tenant_id, work_location_short_name)
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  department_name varchar(120) not null,
  department_short_name varchar(20) not null,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_departments unique (tenant_id, department_short_name)
);

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  area_name varchar(120) not null,
  area_short_name varchar(20) not null,
  payroll_group_id uuid null references public.payroll_groups(id) on delete restrict,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_areas unique (tenant_id, area_short_name)
);

create table if not exists public.work_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  work_group_name varchar(120) not null,
  work_group_short_name varchar(20) not null,
  payroll_group_id uuid null references public.payroll_groups(id) on delete restrict,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_work_groups unique (tenant_id, work_group_short_name)
);

create table if not exists public.job_titles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  job_title_name varchar(120) not null,
  job_title_short_name varchar(30) not null,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_job_titles unique (tenant_id, job_title_short_name)
);

create table if not exists public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  homologation_code varchar(30) null,
  gl_account_code varchar(30) null,
  cost_center_name varchar(150) not null,
  cost_center_short_name varchar(30) not null,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_cost_centers unique (tenant_id, cost_center_short_name)
);

----------------------------------------------------------------------------------------------------
-- 6) EMPLOYEE PROFILES + SETTINGS
----------------------------------------------------------------------------------------------------

create table if not exists public.employee_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  profile_name varchar(80) not null,
  profile_short_name varchar(20) not null,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_employee_profiles unique (tenant_id, profile_short_name)
);

create table if not exists public.tenant_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  setting_key varchar(60) not null,
  setting_short_key varchar(20) not null,
  value_type_id uuid not null references public.lookup_values(id) on delete restrict,
  setting_value text null,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_tenant_settings unique (tenant_id, setting_key)
);

create table if not exists public.employee_profile_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_profile_id uuid not null references public.employee_profiles(id) on delete cascade,
  setting_key varchar(60) not null,
  value_type_id uuid not null references public.lookup_values(id) on delete restrict,
  setting_value text not null,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_employee_profile_settings unique (tenant_id, employee_profile_id, setting_key)
);

----------------------------------------------------------------------------------------------------
-- 7) EMPLOYEE↔COMPANY (Asignación laboral)
----------------------------------------------------------------------------------------------------

create table if not exists public.employee_companies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,

  device_user_code varchar(20) null,
  payroll_employee_code varchar(30) null,

  employee_profile_id uuid null references public.employee_profiles(id) on delete restrict,

  work_group_id uuid null references public.work_groups(id) on delete restrict,
  work_location_id uuid null references public.work_locations(id) on delete restrict,
  department_id uuid null references public.departments(id) on delete restrict,
  area_id uuid null references public.areas(id) on delete restrict,
  job_title_id uuid null references public.job_titles(id) on delete restrict,
  cost_center_id uuid null references public.cost_centers(id) on delete restrict,
  payroll_group_id uuid null references public.payroll_groups(id) on delete restrict,

  accounting_account_code varchar(30) null,
  salary_amount numeric(12,2) null,
  hire_date date null,
  termination_date date null,
  contract_type_id uuid null references public.lookup_values(id) on delete restrict,
  work_on_holidays boolean not null default false,

  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,

  constraint uq_employee_companies unique (tenant_id, company_id, employee_id)
);

----------------------------------------------------------------------------------------------------
-- 8) ASISTENCIA: MOVIMIENTOS, DISPOSITIVOS, TURNOS, FERIADOS, PLANIFICACIÓN, EVENTOS, JUSTIFICACIONES
----------------------------------------------------------------------------------------------------

create table if not exists public.attendance_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  movement_name varchar(60) not null,
  movement_short_name varchar(20) not null,
  start_key integer not null,
  end_key integer not null,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint ck_attendance_movements_keys check (start_key <> end_key),
  constraint uq_attendance_movements unique (tenant_id, movement_short_name)
);

create table if not exists public.time_clock_devices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  device_serial_number varchar(40) null,
  device_name varchar(60) null,
  device_ip varchar(45) null,
  device_location varchar(80) null,
  device_model varchar(60) null,
  device_type_id uuid null references public.lookup_values(id) on delete restrict,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null
  -- ❌ FIX: NO SE PUEDE usar coalesce en constraint unique
  -- constraint uq_time_clock_devices unique (tenant_id, company_id, coalesce(device_serial_number,''))
);

-- ✅ FIX: Usar índice único con expresión para manejar NULL
create unique index if not exists uq_time_clock_devices_serial
  on public.time_clock_devices (tenant_id, company_id, coalesce(device_serial_number, 'NULL_SERIAL'));

comment on index uq_time_clock_devices_serial is 'Garantiza unicidad de (tenant, company, serial) tratando NULL como EMPTY_SERIAL';

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  payroll_group_id uuid null references public.payroll_groups(id) on delete restrict,
  shift_name varchar(80) not null,
  shift_short_name varchar(20) not null,
  start_time time not null,
  work_minutes integer not null,
  lunch_minutes integer not null default 0,
  entry_grace_minutes integer not null default 0,
  exit_grace_minutes integer not null default 0,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_shifts unique (tenant_id, company_id, shift_short_name)
);

create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  country_id uuid null references public.lookup_values(id) on delete restrict,
  state_id uuid null references public.lookup_values(id) on delete restrict,
  city_id uuid null references public.lookup_values(id) on delete restrict,
  work_location_id uuid null references public.work_locations(id) on delete restrict,
  holiday_date date not null,
  holiday_name varchar(80) not null,
  is_recurring boolean not null default false,
  is_paid boolean not null default true,
  is_working_day boolean not null default false,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null
);

-- Índice único para holidays que maneja NULL en work_location_id
create unique index if not exists uq_holidays_date_location
  on public.holidays (tenant_id, company_id, holiday_date, coalesce(work_location_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.employee_shift_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  shift_id uuid not null references public.shifts(id) on delete restrict,
  shift_date date not null,
  shift_type_id uuid null references public.lookup_values(id) on delete restrict,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_employee_shift_plans unique (tenant_id, company_id, employee_id, shift_date)
);

create table if not exists public.attendance_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_name varchar(60) not null,
  event_short_name varchar(20) not null,
  tolerance_minutes integer not null default 0,
  weight_value integer not null default 0,
  transaction_direction_id uuid not null references public.lookup_values(id) on delete restrict,
  event_type_id uuid null references public.lookup_values(id) on delete restrict,
  movement_id uuid null references public.attendance_movements(id) on delete restrict,
  calculation_method_id uuid null references public.lookup_values(id) on delete restrict,
  external_mapping varchar(60) null,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_attendance_events unique (tenant_id, event_short_name)
);

create table if not exists public.justification_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  justification_name varchar(80) not null,
  justification_short_name varchar(20) not null,
  attendance_event_id uuid null references public.attendance_events(id) on delete restrict,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_justification_types unique (tenant_id, justification_short_name)
);

create table if not exists public.employee_absence_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  justification_type_id uuid not null references public.justification_types(id) on delete restrict,
  attendance_event_id uuid not null references public.attendance_events(id) on delete restrict,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  start_time time null,
  end_time time null,
  notes varchar(500) null,
  request_status_id uuid not null references public.lookup_values(id) on delete restrict,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null
);

create table if not exists public.employee_time_punches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  time_clock_device_id uuid null references public.time_clock_devices(id) on delete restrict,
  punch_datetime timestamptz not null,
  punch_key integer not null,
  punch_source_id uuid null references public.lookup_values(id) on delete restrict,
  time_punch_status_id uuid null references public.lookup_values(id) on delete restrict,
  service_ticket_number integer null,
  notes varchar(300) null,
  process_run_id uuid null, -- FK se define después de attendance_processing_runs
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null
);

----------------------------------------------------------------------------------------------------
-- 9) CÁLCULO: PATRONES + RECARGOS + PROCESOS + RESULTADOS
----------------------------------------------------------------------------------------------------

create table if not exists public.work_patterns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  pattern_name varchar(80) not null,
  pattern_short_name varchar(20) not null,
  cycle_length_days integer not null,
  work_days_per_cycle integer not null,
  rest_days_per_cycle integer not null,
  daily_work_minutes integer not null,
  weekly_work_minutes_target integer not null,
  is_flexible boolean not null default true,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_work_patterns unique (tenant_id, pattern_short_name)
);

create table if not exists public.employee_profile_work_patterns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_profile_id uuid not null references public.employee_profiles(id) on delete cascade,
  work_pattern_id uuid not null references public.work_patterns(id) on delete restrict,
  valid_from date not null,
  valid_to date not null,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_profile_work_patterns unique (tenant_id, employee_profile_id, work_pattern_id, valid_from, valid_to)
);

create table if not exists public.time_surcharge_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  rate_category_id uuid not null references public.lookup_values(id) on delete restrict,
  day_type_id uuid not null references public.lookup_values(id) on delete restrict,
  start_time time not null,
  end_time time not null,
  surcharge_rate numeric(4,2) not null,
  priority integer not null default 0,
  valid_from date not null,
  valid_to date not null,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null
);

-- Usuarios de aplicación (perfil) — necesario para auditoría, ejecuciones, sesiones, etc.
/* users
   Perfil de aplicación (no reemplaza auth.users).
   auth_user_id = identidad real en Supabase. */
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  username varchar(80) not null,
  display_name varchar(150) null,
  email varchar(150) null,
  phone varchar(30) null,
  preferred_language_code varchar(10) null references public.system_languages(code) on delete restrict,
  is_active boolean not null default true,
  last_login_at timestamptz null,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_users_auth unique (auth_user_id),
  constraint uq_users_tenant_username unique (tenant_id, username)
);

create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create table if not exists public.attendance_processing_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_id uuid null references public.companies(id) on delete restrict,
  payroll_group_id uuid null references public.payroll_groups(id) on delete restrict,
  work_location_id uuid null references public.work_locations(id) on delete restrict,
  department_id uuid null references public.departments(id) on delete restrict,
  area_id uuid null references public.areas(id) on delete restrict,
  cost_center_id uuid null references public.cost_centers(id) on delete restrict,
  process_type_id uuid not null references public.lookup_values(id) on delete restrict,
  process_status_id uuid not null references public.lookup_values(id) on delete restrict,
  date_from date not null,
  date_to date not null,
  executed_by uuid null references public.users(id) on delete restrict,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null
);

-- Amarre del run en punches
alter table public.employee_time_punches
  add constraint fk_employee_time_punches_run
  foreign key (process_run_id) references public.attendance_processing_runs(id) on delete set null;

create table if not exists public.employee_attendance_calculations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  process_run_id uuid not null references public.attendance_processing_runs(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  attendance_event_id uuid not null references public.attendance_events(id) on delete restrict,
  shift_id uuid null references public.shifts(id) on delete restrict,
  cost_center_id uuid null references public.cost_centers(id) on delete restrict,
  justification_type_id uuid null references public.justification_types(id) on delete restrict,
  covered_attendance_event_id uuid null references public.attendance_events(id) on delete restrict,
  year integer not null,
  month integer not null,
  day integer not null,
  event_datetime timestamptz not null,
  generated_value numeric(19,4) not null default 0,
  approved_value numeric(19,4) not null default 0,
  is_approved boolean not null default false,
  generated_weight integer not null default 0,
  approved_weight integer null,
  notes varchar(500) null,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null
);

----------------------------------------------------------------------------------------------------
-- 10) SEGURIDAD: MENÚ → SCREENS → ACTIONS → ROLES → SCOPES
----------------------------------------------------------------------------------------------------

/* system_menu_groups (SYSTEM)
   Categorías del menú (Configuración, Mantenimiento, etc.) */
create table if not exists public.system_menu_groups (
  id uuid primary key default gen_random_uuid(),
  menu_group_key varchar(80) not null,
  menu_group_name varchar(80) not null,     -- base (ES)
  menu_group_short_name varchar(30) null,
  icon_key varchar(50) null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_system_menu_groups_key unique (menu_group_key)
);

create trigger trg_system_menu_groups_updated_at
before update on public.system_menu_groups
for each row execute function public.set_updated_at();

/* i18n de menú */
create table if not exists public.system_menu_group_translations (
  id uuid primary key default gen_random_uuid(),
  menu_group_id uuid not null references public.system_menu_groups(id) on delete cascade,
  language_code varchar(10) not null references public.system_languages(code) on delete restrict,
  menu_group_name varchar(80) not null,
  menu_group_short_name varchar(30) null,
  created_at timestamptz not null default now(),
  constraint uq_menu_group_translations unique (menu_group_id, language_code)
);

/* screens (SYSTEM)
   Pantallas/transacciones. NO se ocultan por "perfil fijo", se filtran por permisos. */
create table if not exists public.screens (
  id uuid primary key default gen_random_uuid(),
  screen_key varchar(80) not null,          -- único (ej: EMPLOYEES, SHIFTS, REPORTS_RUN)
  screen_name varchar(120) not null,        -- nombre admin/base (ES)
  menu_label varchar(120) null,             -- si null, usa screen_name
  menu_group_id uuid not null references public.system_menu_groups(id) on delete restrict,
  module_id uuid null references public.lookup_values(id) on delete restrict, -- APPLICATION_MODULE
  route_path varchar(200) null,
  icon_key varchar(50) null,                -- ✅ AGREGADO: para menú dinámico (Users, Clock, Shield, etc.)
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_screens_key unique (screen_key)
);

create trigger trg_screens_updated_at
before update on public.screens
for each row execute function public.set_updated_at();

comment on column public.screens.icon_key is 'Mapea a iconos de Lucide React (Users, Shield, Clock, Copy, etc.)';

/* i18n screens */
create table if not exists public.screen_translations (
  id uuid primary key default gen_random_uuid(),
  screen_id uuid not null references public.screens(id) on delete cascade,
  language_code varchar(10) not null references public.system_languages(code) on delete restrict,
  screen_name varchar(120) not null,
  menu_label varchar(120) null,
  created_at timestamptz not null default now(),
  constraint uq_screen_translations unique (screen_id, language_code)
);

/* actions (SYSTEM)
   Acciones/botones estándar: CRUD + procesos (RUN, APPROVE, EXPORT, CLONE_ROLE, etc.) */
create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  action_key varchar(50) not null,          -- CREATE/UPDATE/DELETE/RUN/EXPORT/APPROVE/CLONE_ROLE
  action_name varchar(120) not null,        -- base (ES)
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_actions_key unique (action_key)
);

create trigger trg_actions_updated_at
before update on public.actions
for each row execute function public.set_updated_at();

/* i18n actions */
create table if not exists public.action_translations (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  language_code varchar(10) not null references public.system_languages(code) on delete restrict,
  action_name varchar(120) not null,
  created_at timestamptz not null default now(),
  constraint uq_action_translations unique (action_id, language_code)
);

/* screen_actions (SYSTEM)
   Qué acciones existen en cada pantalla. */
create table if not exists public.screen_actions (
  id uuid primary key default gen_random_uuid(),
  screen_id uuid not null references public.screens(id) on delete cascade,
  action_id uuid not null references public.actions(id) on delete cascade,
  ui_element_key varchar(80) null,          -- btn_save, btn_run, btn_export
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_screen_actions unique (screen_id, action_id)
);

/* roles (TENANT)
   Roles por tenant. Incluye "clonado" por base_role_id + version. */
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role_key varchar(80) not null,
  role_name varchar(120) not null,
  role_scope varchar(10) not null default 'TENANT',  -- SYSTEM/TENANT (en práctica, casi siempre TENANT)
  base_role_id uuid null references public.roles(id) on delete restrict,
  role_version integer not null default 1,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint ck_roles_scope check (role_scope in ('SYSTEM','TENANT')),
  constraint uq_roles unique (tenant_id, role_key)
);

create trigger trg_roles_updated_at
before update on public.roles
for each row execute function public.set_updated_at();

/* role_screen_actions (TENANT)
   Permisos por rol a nivel (pantalla+acción). */
create table if not exists public.role_screen_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  screen_action_id uuid not null references public.screen_actions(id) on delete cascade,
  is_allowed boolean not null default false,
  valid_from timestamptz null,
  valid_to timestamptz null,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_role_screen_actions unique (tenant_id, role_id, screen_action_id)
);

/* user_roles (TENANT)
   Asignación de roles a usuarios (opcionalmente por empresa). */
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  company_id uuid null references public.companies(id) on delete restrict, -- null = aplica a todo el tenant
  is_active boolean not null default true,
  valid_from timestamptz null,
  valid_to timestamptz null,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_user_roles unique (tenant_id, user_id, role_id, company_id)
);

/* scope_types (SYSTEM)
   Tipos de alcance para filtrar datos. */
create table if not exists public.scope_types (
  id uuid primary key default gen_random_uuid(),
  scope_type_key varchar(80) not null,  -- COMPANY, DEPARTMENT, AREA, COST_CENTER, WORK_LOCATION, EMPLOYEE, etc.
  scope_type_name varchar(120) not null,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_scope_types unique (scope_type_key)
);

/* user_role_scopes (TENANT)
   El "dato permitido" de una asignación user_role. */
create table if not exists public.user_role_scopes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_role_id uuid not null references public.user_roles(id) on delete cascade,
  scope_type_id uuid not null references public.scope_types(id) on delete restrict,
  scope_entity_id uuid not null,        -- UUID real de la entidad
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_user_role_scopes unique (tenant_id, user_role_id, scope_type_id, scope_entity_id)
);

/* audit_log (TENANT)
   Auditoría transversal. */
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  company_id uuid null references public.companies(id) on delete restrict,
  action_key varchar(80) not null,
  entity_type varchar(80) null,
  entity_id uuid null,
  metadata jsonb null,
  created_at timestamptz not null default now()
);

----------------------------------------------------------------------------------------------------
-- 11) "COPIAR / CLONAR ROL" (OPERACIONES Y SNAPSHOTS)
----------------------------------------------------------------------------------------------------

create table if not exists public.role_permission_copy_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  operation_type varchar(10) not null,                -- CLONE | COPY
  merge_strategy varchar(10) not null default 'MERGE', -- MERGE | OVERWRITE (en COPY)
  source_role_id uuid not null references public.roles(id) on delete restrict,
  target_role_id uuid null references public.roles(id) on delete restrict,
  created_role_id uuid null references public.roles(id) on delete restrict,
  copy_screen_actions boolean not null default true,
  copy_report_permissions boolean not null default true,
  copy_scopes boolean not null default true,
  executed_by uuid not null references public.users(id) on delete restrict,
  executed_at timestamptz not null default now(),
  status varchar(15) not null default 'DONE',         -- RUNNING | DONE | ERROR
  error_message text null,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz null,
  constraint ck_copy_runs_operation check (operation_type in ('CLONE','COPY')),
  constraint ck_copy_runs_strategy check (merge_strategy in ('MERGE','OVERWRITE')),
  constraint ck_copy_runs_targets check (
    (operation_type = 'CLONE' and created_role_id is not null and target_role_id is null)
    or
    (operation_type = 'COPY'  and target_role_id is not null and created_role_id is null)
  )
);

create table if not exists public.role_permission_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  copy_run_id uuid not null references public.role_permission_copy_runs(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  snapshot_type varchar(10) not null default 'BEFORE', -- BEFORE | AFTER
  snapshot jsonb not null,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint ck_snapshot_type check (snapshot_type in ('BEFORE','AFTER')),
  constraint uq_role_permission_snapshots unique (tenant_id, copy_run_id, role_id, snapshot_type)
);

----------------------------------------------------------------------------------------------------
-- 12) REPORTES
----------------------------------------------------------------------------------------------------

/* system_reports (SYSTEM)
   Catálogo global de reportes. */
create table if not exists public.system_reports (
  id uuid primary key default gen_random_uuid(),
  report_code varchar(50) not null,
  report_name varchar(120) not null,              -- base (ES)
  report_description varchar(255) not null,
  report_notes varchar(255) null,
  handler_type_id uuid not null references public.lookup_values(id) on delete restrict,
  report_handler varchar(150) not null,
  application_module_id uuid null references public.lookup_values(id) on delete restrict,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_system_reports unique (report_code)
);

create trigger trg_system_reports_updated_at
before update on public.system_reports
for each row execute function public.set_updated_at();

/* i18n reportes */
create table if not exists public.system_report_translations (
  id uuid primary key default gen_random_uuid(),
  system_report_id uuid not null references public.system_reports(id) on delete cascade,
  language_code varchar(10) not null references public.system_languages(code) on delete restrict,
  report_name varchar(120) not null,
  report_description varchar(255) not null,
  report_notes varchar(255) null,
  created_at timestamptz not null default now(),
  constraint uq_system_report_translations unique (system_report_id, language_code)
);

/* report_parameters (SYSTEM) */
create table if not exists public.report_parameters (
  id uuid primary key default gen_random_uuid(),
  system_report_id uuid not null references public.system_reports(id) on delete restrict,
  parameter_key varchar(50) not null,
  parameter_label varchar(100) not null,          -- base (ES)
  parameter_description varchar(255) null,
  data_type_id uuid not null references public.lookup_values(id) on delete restrict,
  ui_control_id uuid not null references public.lookup_values(id) on delete restrict,
  is_required boolean not null default false,
  default_value text null,
  lookup_group_id uuid null references public.lookup_groups(id) on delete restrict,
  is_multi_value boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_report_parameters unique (system_report_id, parameter_key)
);

/* i18n parámetros */
create table if not exists public.report_parameter_translations (
  id uuid primary key default gen_random_uuid(),
  report_parameter_id uuid not null references public.report_parameters(id) on delete cascade,
  language_code varchar(10) not null references public.system_languages(code) on delete restrict,
  parameter_label varchar(100) not null,
  parameter_description varchar(255) null,
  created_at timestamptz not null default now(),
  constraint uq_report_parameter_translations unique (report_parameter_id, language_code)
);

/* report_permissions (TENANT) */
create table if not exists public.report_permissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  system_report_id uuid not null references public.system_reports(id) on delete restrict,
  can_view boolean not null default true,
  can_export boolean not null default false,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_report_permissions unique (tenant_id, role_id, system_report_id)
);

/* report_executions (TENANT) */
create table if not exists public.report_executions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  system_report_id uuid not null references public.system_reports(id) on delete restrict,
  executed_by uuid not null references public.users(id) on delete restrict,
  executed_at timestamptz not null default now(),
  parameters jsonb not null default '{}'::jsonb,
  output_format_id uuid null references public.lookup_values(id) on delete restrict,
  execution_status_id uuid null references public.lookup_values(id) on delete restrict,
  generated_file_path text null,
  constraint uq_report_executions unique (tenant_id, id)
);

/* report_scope_policies (SYSTEM) (opcional)
   Reglas mínimas de scope para ciertos reportes. */
create table if not exists public.report_scope_policies (
  id uuid primary key default gen_random_uuid(),
  system_report_id uuid not null references public.system_reports(id) on delete restrict,
  required_scope_type_id uuid not null references public.scope_types(id) on delete restrict,
  enforcement_level_id uuid not null references public.lookup_values(id) on delete restrict,
  is_active boolean not null default true,
  created_by varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_by varchar(50) null,
  updated_at timestamptz null,
  constraint uq_report_scope_policies unique (system_report_id, required_scope_type_id)
);

----------------------------------------------------------------------------------------------------
-- 13) MENSAJES GENERALES (opcional, para i18n de textos del sistema)
----------------------------------------------------------------------------------------------------

/* system_message_keys
   Claves para mensajes del sistema: validaciones, avisos, labels sueltos, etc. */
create table if not exists public.system_message_keys (
  id uuid primary key default gen_random_uuid(),
  message_key varchar(120) not null, -- ej: ERR_REQUIRED_FIELD, MSG_SAVED_OK
  default_text varchar(500) not null, -- base ES
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint uq_system_message_keys unique (message_key)
);

create table if not exists public.system_message_translations (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.system_message_keys(id) on delete cascade,
  language_code varchar(10) not null references public.system_languages(code) on delete restrict,
  translated_text varchar(500) not null,
  created_at timestamptz not null default now(),
  constraint uq_system_message_translations unique (message_id, language_code)
);

----------------------------------------------------------------------------------------------------
-- 14) ÍNDICES RECOMENDADOS
----------------------------------------------------------------------------------------------------

create index if not exists ix_punches_tenant_employee_dt
  on public.employee_time_punches (tenant_id, employee_id, punch_datetime);

create index if not exists ix_shift_plans_tenant_company_date
  on public.employee_shift_plans (tenant_id, company_id, shift_date);

create index if not exists ix_calcs_tenant_employee_day
  on public.employee_attendance_calculations (tenant_id, employee_id, year, month, day);

create index if not exists ix_role_screen_actions_tenant_role
  on public.role_screen_actions (tenant_id, role_id);

create index if not exists ix_report_permissions_tenant_role
  on public.report_permissions (tenant_id, role_id);

create index if not exists ix_user_role_scopes_tenant_user_role
  on public.user_role_scopes (tenant_id, user_role_id);

----------------------------------------------------------------------------------------------------
-- FIN DDL v2 CORREGIDO
----------------------------------------------------------------------------------------------------

select 'DDL v2 CORREGIDO ejecutado correctamente' as status,
  (select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE') as total_tables;
