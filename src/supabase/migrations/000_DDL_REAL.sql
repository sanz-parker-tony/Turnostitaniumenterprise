-- ============================================================================
-- 000_DDL_REAL.sql
-- Turnos Titanium Enterprise - ESTRUCTURA REAL DE SUPABASE
-- ============================================================================
-- Descripción:
--   Este archivo contiene la estructura EXACTA del schema public de Supabase
--   Incluye ~70 tablas con todos sus constraints, foreign keys e índices
--   
-- Nota Importante:
--   Este DDL fue extraído directamente de Supabase en producción
--   NO ejecutar este archivo - solo para documentación y referencia
--   La estructura YA EXISTE en Supabase
--
-- Uso:
--   1. Para documentación de la arquitectura
--   2. Como referencia para 001_FACTORY_RESET.sql
--   3. Como referencia para 002_SEED_COMPLETE.sql
--
-- Última actualización: 2026-01-25
-- ============================================================================

-- WARNING: This schema is for context only and is NOT meant to be run.
-- The structure already exists in Supabase.
-- This file serves as the SINGLE SOURCE OF TRUTH for database structure.

-- ============================================================================
-- TABLAS DEL SISTEMA (70+ tablas)
-- ============================================================================

CREATE TABLE public.action_translations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL,
  language_code character varying NOT NULL,
  action_name character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT action_translations_pkey PRIMARY KEY (id),
  CONSTRAINT action_translations_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.actions(id),
  CONSTRAINT action_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.system_languages(code)
);

CREATE TABLE public.actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action_key character varying NOT NULL UNIQUE CHECK (action_key::text ~ '^[A-Z0-9_]+$'::text AND length(action_key::text) >= 2),
  action_name character varying NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT actions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.areas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  area_name character varying NOT NULL,
  area_short_name character varying NOT NULL,
  payroll_group_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  area_code character varying NOT NULL,
  CONSTRAINT areas_pkey PRIMARY KEY (id),
  CONSTRAINT areas_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT areas_payroll_group_id_fkey FOREIGN KEY (payroll_group_id) REFERENCES public.payroll_groups(id)
);

CREATE TABLE public.attendance_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  event_name character varying NOT NULL,
  event_short_name character varying NOT NULL,
  tolerance_minutes integer NOT NULL DEFAULT 0,
  weight_value integer NOT NULL DEFAULT 0,
  transaction_direction_id uuid NOT NULL,
  event_type_id uuid,
  movement_id uuid,
  calculation_method_id uuid,
  external_mapping character varying,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT attendance_events_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT attendance_events_transaction_direction_id_fkey FOREIGN KEY (transaction_direction_id) REFERENCES public.lookup_values(id),
  CONSTRAINT attendance_events_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES public.lookup_values(id),
  CONSTRAINT attendance_events_movement_id_fkey FOREIGN KEY (movement_id) REFERENCES public.attendance_movements(id),
  CONSTRAINT attendance_events_calculation_method_id_fkey FOREIGN KEY (calculation_method_id) REFERENCES public.lookup_values(id)
);

CREATE TABLE public.attendance_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  movement_name character varying NOT NULL,
  movement_short_name character varying NOT NULL,
  start_key integer NOT NULL,
  end_key integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT attendance_movements_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_movements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

CREATE TABLE public.attendance_processing_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  company_id uuid,
  payroll_group_id uuid,
  work_location_id uuid,
  department_id uuid,
  area_id uuid,
  cost_center_id uuid,
  process_type_id uuid NOT NULL,
  process_status_id uuid NOT NULL,
  date_from date NOT NULL,
  date_to date NOT NULL,
  executed_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT attendance_processing_runs_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_processing_runs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT attendance_processing_runs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT attendance_processing_runs_payroll_group_id_fkey FOREIGN KEY (payroll_group_id) REFERENCES public.payroll_groups(id),
  CONSTRAINT attendance_processing_runs_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES public.work_locations(id),
  CONSTRAINT attendance_processing_runs_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id),
  CONSTRAINT attendance_processing_runs_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id),
  CONSTRAINT attendance_processing_runs_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id),
  CONSTRAINT attendance_processing_runs_process_type_id_fkey FOREIGN KEY (process_type_id) REFERENCES public.lookup_values(id),
  CONSTRAINT attendance_processing_runs_process_status_id_fkey FOREIGN KEY (process_status_id) REFERENCES public.lookup_values(id),
  CONSTRAINT attendance_processing_runs_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES public.users(id)
);

CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  company_id uuid,
  action_key character varying NOT NULL,
  entity_type character varying,
  entity_id uuid,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT audit_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT audit_log_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  company_name character varying NOT NULL,
  company_short_name character varying NOT NULL,
  company_code character varying NOT NULL,
  company_address character varying,
  company_address_line1 character varying,
  company_address_line2 character varying,
  company_country_id uuid,
  company_state_id uuid,
  company_city_id uuid,
  company_postal_code character varying,
  company_phone character varying,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT companies_pkey PRIMARY KEY (id),
  CONSTRAINT companies_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT companies_company_country_id_fkey FOREIGN KEY (company_country_id) REFERENCES public.lookup_values(id),
  CONSTRAINT companies_company_state_id_fkey FOREIGN KEY (company_state_id) REFERENCES public.lookup_values(id),
  CONSTRAINT companies_company_city_id_fkey FOREIGN KEY (company_city_id) REFERENCES public.lookup_values(id)
);

CREATE TABLE public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  company_id uuid NOT NULL,
  setting_key character varying NOT NULL,
  value_type_id uuid NOT NULL,
  setting_value text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT company_settings_pkey PRIMARY KEY (id),
  CONSTRAINT company_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT company_settings_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT company_settings_value_type_id_fkey FOREIGN KEY (value_type_id) REFERENCES public.lookup_values(id)
);

CREATE TABLE public.cost_centers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  homologation_code character varying,
  gl_account_code character varying,
  cost_center_name character varying NOT NULL,
  cost_center_short_name character varying NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  cost_center_code character varying NOT NULL,
  CONSTRAINT cost_centers_pkey PRIMARY KEY (id),
  CONSTRAINT cost_centers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  department_name character varying NOT NULL,
  department_short_name character varying NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  department_code character varying NOT NULL,
  CONSTRAINT departments_pkey PRIMARY KEY (id),
  CONSTRAINT departments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

CREATE TABLE public.employee_absence_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  justification_type_id uuid NOT NULL,
  attendance_event_id uuid NOT NULL,
  start_datetime timestamp with time zone NOT NULL,
  end_datetime timestamp with time zone NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  notes character varying,
  request_status_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT employee_absence_requests_pkey PRIMARY KEY (id),
  CONSTRAINT employee_absence_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT employee_absence_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT employee_absence_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id),
  CONSTRAINT employee_absence_requests_justification_type_id_fkey FOREIGN KEY (justification_type_id) REFERENCES public.justification_types(id),
  CONSTRAINT employee_absence_requests_attendance_event_id_fkey FOREIGN KEY (attendance_event_id) REFERENCES public.attendance_events(id),
  CONSTRAINT employee_absence_requests_request_status_id_fkey FOREIGN KEY (request_status_id) REFERENCES public.lookup_values(id)
);

CREATE TABLE public.employee_attendance_calculations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  process_run_id uuid NOT NULL,
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  attendance_event_id uuid NOT NULL,
  shift_id uuid,
  cost_center_id uuid,
  justification_type_id uuid,
  covered_attendance_event_id uuid,
  year integer NOT NULL,
  month integer NOT NULL,
  day integer NOT NULL,
  event_datetime timestamp with time zone NOT NULL,
  generated_value numeric NOT NULL DEFAULT 0,
  approved_value numeric NOT NULL DEFAULT 0,
  is_approved boolean NOT NULL DEFAULT false,
  generated_weight integer NOT NULL DEFAULT 0,
  approved_weight integer,
  notes character varying,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT employee_attendance_calculations_pkey PRIMARY KEY (id),
  CONSTRAINT employee_attendance_calculations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT employee_attendance_calculations_process_run_id_fkey FOREIGN KEY (process_run_id) REFERENCES public.attendance_processing_runs(id),
  CONSTRAINT employee_attendance_calculations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT employee_attendance_calculations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id),
  CONSTRAINT employee_attendance_calculations_attendance_event_id_fkey FOREIGN KEY (attendance_event_id) REFERENCES public.attendance_events(id),
  CONSTRAINT employee_attendance_calculations_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id),
  CONSTRAINT employee_attendance_calculations_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id),
  CONSTRAINT employee_attendance_calculations_justification_type_id_fkey FOREIGN KEY (justification_type_id) REFERENCES public.justification_types(id),
  CONSTRAINT employee_attendance_calculatio_covered_attendance_event_id_fkey FOREIGN KEY (covered_attendance_event_id) REFERENCES public.attendance_events(id)
);

CREATE TABLE public.employee_companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  device_user_code character varying,
  payroll_employee_code character varying,
  employee_profile_id uuid,
  work_group_id uuid,
  work_location_id uuid,
  department_id uuid,
  area_id uuid,
  job_title_id uuid,
  cost_center_id uuid,
  payroll_group_id uuid,
  accounting_account_code character varying,
  salary_amount numeric,
  hire_date date,
  termination_date date,
  contract_type_id uuid,
  work_on_holidays boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT employee_companies_pkey PRIMARY KEY (id),
  CONSTRAINT employee_companies_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT employee_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT employee_companies_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id),
  CONSTRAINT employee_companies_employee_profile_id_fkey FOREIGN KEY (employee_profile_id) REFERENCES public.employee_profiles(id),
  CONSTRAINT employee_companies_work_group_id_fkey FOREIGN KEY (work_group_id) REFERENCES public.work_groups(id),
  CONSTRAINT employee_companies_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES public.work_locations(id),
  CONSTRAINT employee_companies_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id),
  CONSTRAINT employee_companies_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id),
  CONSTRAINT employee_companies_job_title_id_fkey FOREIGN KEY (job_title_id) REFERENCES public.job_titles(id),
  CONSTRAINT employee_companies_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id),
  CONSTRAINT employee_companies_payroll_group_id_fkey FOREIGN KEY (payroll_group_id) REFERENCES public.payroll_groups(id),
  CONSTRAINT employee_companies_contract_type_id_fkey FOREIGN KEY (contract_type_id) REFERENCES public.lookup_values(id)
);

CREATE TABLE public.employee_profile_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  employee_profile_id uuid NOT NULL,
  setting_key character varying NOT NULL,
  value_type_id uuid NOT NULL,
  setting_value text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT employee_profile_settings_pkey PRIMARY KEY (id),
  CONSTRAINT employee_profile_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT employee_profile_settings_employee_profile_id_fkey FOREIGN KEY (employee_profile_id) REFERENCES public.employee_profiles(id),
  CONSTRAINT employee_profile_settings_value_type_id_fkey FOREIGN KEY (value_type_id) REFERENCES public.lookup_values(id)
);

CREATE TABLE public.employee_profile_work_patterns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  employee_profile_id uuid NOT NULL,
  work_pattern_id uuid NOT NULL,
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT employee_profile_work_patterns_pkey PRIMARY KEY (id),
  CONSTRAINT employee_profile_work_patterns_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT employee_profile_work_patterns_employee_profile_id_fkey FOREIGN KEY (employee_profile_id) REFERENCES public.employee_profiles(id),
  CONSTRAINT employee_profile_work_patterns_work_pattern_id_fkey FOREIGN KEY (work_pattern_id) REFERENCES public.work_patterns(id)
);

CREATE TABLE public.employee_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  profile_name character varying NOT NULL,
  profile_short_name character varying NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  employee_profile_code character varying NOT NULL,
  CONSTRAINT employee_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT employee_profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

CREATE TABLE public.employee_shift_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  shift_id uuid NOT NULL,
  shift_date date NOT NULL,
  shift_type_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT employee_shift_plans_pkey PRIMARY KEY (id),
  CONSTRAINT employee_shift_plans_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT employee_shift_plans_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT employee_shift_plans_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id),
  CONSTRAINT employee_shift_plans_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id),
  CONSTRAINT employee_shift_plans_shift_type_id_fkey FOREIGN KEY (shift_type_id) REFERENCES public.lookup_values(id)
);

CREATE TABLE public.employee_time_punches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  time_clock_device_id uuid,
  punch_datetime timestamp with time zone NOT NULL,
  punch_key integer NOT NULL,
  punch_source_id uuid,
  time_punch_status_id uuid,
  service_ticket_number integer,
  notes character varying,
  process_run_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT employee_time_punches_pkey PRIMARY KEY (id),
  CONSTRAINT employee_time_punches_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT employee_time_punches_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT employee_time_punches_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id),
  CONSTRAINT employee_time_punches_time_clock_device_id_fkey FOREIGN KEY (time_clock_device_id) REFERENCES public.time_clock_devices(id),
  CONSTRAINT employee_time_punches_punch_source_id_fkey FOREIGN KEY (punch_source_id) REFERENCES public.lookup_values(id),
  CONSTRAINT employee_time_punches_time_punch_status_id_fkey FOREIGN KEY (time_punch_status_id) REFERENCES public.lookup_values(id),
  CONSTRAINT fk_employee_time_punches_run FOREIGN KEY (process_run_id) REFERENCES public.attendance_processing_runs(id)
);

CREATE TABLE public.employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  employee_lastname character varying NOT NULL,
  employee_name character varying NOT NULL,
  employee_code character varying NOT NULL,
  employee_birthday date,
  employee_gender_id uuid,
  employee_is_model boolean NOT NULL DEFAULT false,
  employee_observations character varying,
  employee_photo_path character varying,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT employees_pkey PRIMARY KEY (id),
  CONSTRAINT employees_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT employees_employee_gender_id_fkey FOREIGN KEY (employee_gender_id) REFERENCES public.lookup_values(id)
);

CREATE TABLE public.holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  company_id uuid NOT NULL,
  country_id uuid,
  state_id uuid,
  city_id uuid,
  work_location_id uuid,
  holiday_date date NOT NULL,
  holiday_name character varying NOT NULL,
  is_recurring boolean NOT NULL DEFAULT false,
  is_paid boolean NOT NULL DEFAULT true,
  is_working_day boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT holidays_pkey PRIMARY KEY (id),
  CONSTRAINT holidays_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT holidays_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT holidays_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.lookup_values(id),
  CONSTRAINT holidays_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.lookup_values(id),
  CONSTRAINT holidays_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.lookup_values(id),
  CONSTRAINT holidays_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES public.work_locations(id)
);

CREATE TABLE public.job_titles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  job_title_name character varying NOT NULL,
  job_title_short_name character varying NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  job_title_code character varying NOT NULL,
  CONSTRAINT job_titles_pkey PRIMARY KEY (id),
  CONSTRAINT job_titles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

CREATE TABLE public.justification_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  justification_name character varying NOT NULL,
  justification_short_name character varying NOT NULL,
  attendance_event_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT justification_types_pkey PRIMARY KEY (id),
  CONSTRAINT justification_types_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT justification_types_attendance_event_id_fkey FOREIGN KEY (attendance_event_id) REFERENCES public.attendance_events(id)
);

CREATE TABLE public.kv_store_e19f2094 (
  key text NOT NULL,
  value jsonb NOT NULL,
  CONSTRAINT kv_store_e19f2094_pkey PRIMARY KEY (key)
);

CREATE TABLE public.lookup_group_translations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lookup_group_id uuid NOT NULL,
  language_code character varying NOT NULL,
  label character varying NOT NULL,
  short_label character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lookup_group_translations_pkey PRIMARY KEY (id),
  CONSTRAINT lookup_group_translations_lookup_group_id_fkey FOREIGN KEY (lookup_group_id) REFERENCES public.lookup_groups(id),
  CONSTRAINT lookup_group_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.system_languages(code)
);

CREATE TABLE public.lookup_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lookup_group_key character varying NOT NULL UNIQUE,
  lookup_group_label character varying NOT NULL,
  lookup_group_short_label character varying NOT NULL,
  allows_tenant_items boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT lookup_groups_pkey PRIMARY KEY (id)
);

CREATE TABLE public.lookup_value_translations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lookup_value_id uuid NOT NULL,
  language_code character varying NOT NULL,
  label character varying NOT NULL,
  short_label character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lookup_value_translations_pkey PRIMARY KEY (id),
  CONSTRAINT lookup_value_translations_lookup_value_id_fkey FOREIGN KEY (lookup_value_id) REFERENCES public.lookup_values(id),
  CONSTRAINT lookup_value_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.system_languages(code)
);

CREATE TABLE public.lookup_values (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  lookup_group_id uuid NOT NULL,
  lookup_key character varying NOT NULL CHECK (lookup_key::text ~ '^[A-Z0-9_]+$'::text AND length(lookup_key::text) >= 2),
  lookup_label character varying NOT NULL,
  lookup_short_label character varying NOT NULL,
  lookup_scope character varying NOT NULL CHECK (lookup_scope::text = ANY (ARRAY['SYSTEM'::character varying, 'TENANT'::character varying]::text[])),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT lookup_values_pkey PRIMARY KEY (id),
  CONSTRAINT lookup_values_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT lookup_values_lookup_group_id_fkey FOREIGN KEY (lookup_group_id) REFERENCES public.lookup_groups(id)
);

CREATE TABLE public.payment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  subscription_id uuid,
  transaction_type character varying NOT NULL DEFAULT 'SUBSCRIPTION'::character varying,
  transaction_status character varying NOT NULL DEFAULT 'PENDING'::character varying,
  amount numeric NOT NULL CHECK (amount >= 0::numeric),
  currency_code character NOT NULL DEFAULT 'USD'::bpchar,
  payment_method character varying,
  card_last_four character varying,
  card_brand character varying,
  external_payment_id character varying,
  external_customer_id character varying,
  billing_period_start date,
  billing_period_end date,
  payment_metadata jsonb DEFAULT '{}'::jsonb,
  error_message text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payment_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT payment_transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT payment_transactions_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.tenant_subscriptions(id)
);

CREATE TABLE public.payroll_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  payroll_group_name character varying NOT NULL,
  payroll_group_short_name character varying NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  payroll_group_code character varying NOT NULL,
  CONSTRAINT payroll_groups_pkey PRIMARY KEY (id),
  CONSTRAINT payroll_groups_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

CREATE TABLE public.report_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  system_report_id uuid NOT NULL,
  executed_by uuid NOT NULL,
  executed_at timestamp with time zone NOT NULL DEFAULT now(),
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_format_id uuid,
  execution_status_id uuid,
  generated_file_path text,
  CONSTRAINT report_executions_pkey PRIMARY KEY (id),
  CONSTRAINT report_executions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT report_executions_system_report_id_fkey FOREIGN KEY (system_report_id) REFERENCES public.system_reports(id),
  CONSTRAINT report_executions_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES public.users(id),
  CONSTRAINT report_executions_output_format_id_fkey FOREIGN KEY (output_format_id) REFERENCES public.lookup_values(id),
  CONSTRAINT report_executions_execution_status_id_fkey FOREIGN KEY (execution_status_id) REFERENCES public.lookup_values(id)
);

CREATE TABLE public.report_parameter_translations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_parameter_id uuid NOT NULL,
  language_code character varying NOT NULL,
  parameter_label character varying NOT NULL,
  parameter_description character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT report_parameter_translations_pkey PRIMARY KEY (id),
  CONSTRAINT report_parameter_translations_report_parameter_id_fkey FOREIGN KEY (report_parameter_id) REFERENCES public.report_parameters(id),
  CONSTRAINT report_parameter_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.system_languages(code)
);

CREATE TABLE public.report_parameters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  system_report_id uuid NOT NULL,
  parameter_key character varying NOT NULL,
  parameter_label character varying NOT NULL,
  parameter_description character varying,
  data_type_id uuid NOT NULL,
  ui_control_id uuid NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  default_value text,
  lookup_group_id uuid,
  is_multi_value boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT report_parameters_pkey PRIMARY KEY (id),
  CONSTRAINT report_parameters_system_report_id_fkey FOREIGN KEY (system_report_id) REFERENCES public.system_reports(id),
  CONSTRAINT report_parameters_data_type_id_fkey FOREIGN KEY (data_type_id) REFERENCES public.lookup_values(id),
  CONSTRAINT report_parameters_ui_control_id_fkey FOREIGN KEY (ui_control_id) REFERENCES public.lookup_values(id),
  CONSTRAINT report_parameters_lookup_group_id_fkey FOREIGN KEY (lookup_group_id) REFERENCES public.lookup_groups(id)
);

CREATE TABLE public.report_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  role_id uuid NOT NULL,
  system_report_id uuid NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_export boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT report_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT report_permissions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT report_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT report_permissions_system_report_id_fkey FOREIGN KEY (system_report_id) REFERENCES public.system_reports(id)
);

CREATE TABLE public.report_scope_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  system_report_id uuid NOT NULL,
  required_scope_type_id uuid NOT NULL,
  enforcement_level_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT report_scope_policies_pkey PRIMARY KEY (id),
  CONSTRAINT report_scope_policies_system_report_id_fkey FOREIGN KEY (system_report_id) REFERENCES public.system_reports(id),
  CONSTRAINT report_scope_policies_required_scope_type_id_fkey FOREIGN KEY (required_scope_type_id) REFERENCES public.scope_types(id),
  CONSTRAINT report_scope_policies_enforcement_level_id_fkey FOREIGN KEY (enforcement_level_id) REFERENCES public.lookup_values(id)
);

CREATE TABLE public.role_permission_copy_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  operation_type character varying NOT NULL CHECK (operation_type::text = ANY (ARRAY['CLONE'::character varying, 'COPY'::character varying]::text[])),
  merge_strategy character varying NOT NULL DEFAULT 'MERGE'::character varying CHECK (merge_strategy::text = ANY (ARRAY['MERGE'::character varying, 'OVERWRITE'::character varying]::text[])),
  source_role_id uuid NOT NULL,
  target_role_id uuid,
  created_role_id uuid,
  copy_screen_actions boolean NOT NULL DEFAULT true,
  copy_report_permissions boolean NOT NULL DEFAULT true,
  copy_scopes boolean NOT NULL DEFAULT true,
  executed_by uuid NOT NULL,
  executed_at timestamp with time zone NOT NULL DEFAULT now(),
  status character varying NOT NULL DEFAULT 'DONE'::character varying,
  error_message text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT role_permission_copy_runs_pkey PRIMARY KEY (id),
  CONSTRAINT role_permission_copy_runs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT role_permission_copy_runs_source_role_id_fkey FOREIGN KEY (source_role_id) REFERENCES public.roles(id),
  CONSTRAINT role_permission_copy_runs_target_role_id_fkey FOREIGN KEY (target_role_id) REFERENCES public.roles(id),
  CONSTRAINT role_permission_copy_runs_created_role_id_fkey FOREIGN KEY (created_role_id) REFERENCES public.roles(id),
  CONSTRAINT role_permission_copy_runs_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES public.users(id)
);

CREATE TABLE public.role_permission_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  copy_run_id uuid NOT NULL,
  role_id uuid NOT NULL,
  snapshot_type character varying NOT NULL DEFAULT 'BEFORE'::character varying CHECK (snapshot_type::text = ANY (ARRAY['BEFORE'::character varying, 'AFTER'::character varying]::text[])),
  snapshot jsonb NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT role_permission_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT role_permission_snapshots_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT role_permission_snapshots_copy_run_id_fkey FOREIGN KEY (copy_run_id) REFERENCES public.role_permission_copy_runs(id),
  CONSTRAINT role_permission_snapshots_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT role_permission_snapshots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE public.role_screen_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  role_id uuid NOT NULL,
  screen_action_id uuid NOT NULL,
  is_allowed boolean NOT NULL DEFAULT false,
  valid_from timestamp with time zone,
  valid_to timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT role_screen_actions_pkey PRIMARY KEY (id),
  CONSTRAINT role_screen_actions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT role_screen_actions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT role_screen_actions_screen_action_id_fkey FOREIGN KEY (screen_action_id) REFERENCES public.screen_actions(id)
);

CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  role_key character varying NOT NULL CHECK (role_key::text ~ '^[A-Z0-9_]+$'::text AND length(role_key::text) >= 2),
  role_name character varying NOT NULL,
  role_scope character varying NOT NULL DEFAULT 'TENANT'::character varying CHECK (role_scope::text = ANY (ARRAY['SYSTEM'::character varying, 'TENANT'::character varying, 'SCOPE'::character varying, 'SELF'::character varying]::text[])),
  base_role_id uuid,
  role_version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  is_system_role boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  data_scope character varying DEFAULT 'ALL'::character varying CHECK (data_scope::text = ANY (ARRAY['ALL'::character varying, 'DIRECT_REPORTS'::character varying, 'SELF'::character varying]::text[])),
  locked_by uuid,
  locked_at timestamp with time zone,
  CONSTRAINT roles_pkey PRIMARY KEY (id),
  CONSTRAINT roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT roles_base_role_id_fkey FOREIGN KEY (base_role_id) REFERENCES public.roles(id)
);

CREATE TABLE public.scope_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scope_type_key character varying NOT NULL UNIQUE,
  scope_type_name character varying NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT scope_types_pkey PRIMARY KEY (id)
);

CREATE TABLE public.screen_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  screen_id uuid NOT NULL,
  action_id uuid NOT NULL,
  ui_element_key character varying,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT screen_actions_pkey PRIMARY KEY (id),
  CONSTRAINT screen_actions_screen_id_fkey FOREIGN KEY (screen_id) REFERENCES public.screens(id),
  CONSTRAINT screen_actions_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.actions(id)
);

CREATE TABLE public.screen_translations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  screen_id uuid NOT NULL,
  language_code character varying NOT NULL,
  screen_name character varying NOT NULL,
  menu_label character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT screen_translations_pkey PRIMARY KEY (id),
  CONSTRAINT screen_translations_screen_id_fkey FOREIGN KEY (screen_id) REFERENCES public.screens(id),
  CONSTRAINT screen_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.system_languages(code)
);

CREATE TABLE public.screens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  screen_key character varying NOT NULL UNIQUE CHECK (screen_key::text ~ '^[A-Z0-9_]+$'::text AND length(screen_key::text) >= 2),
  screen_name character varying NOT NULL,
  menu_label character varying,
  menu_group_id uuid NOT NULL,
  module_id uuid,
  route_path character varying CHECK (route_path::text ~ '^/[a-z0-9/_-]+$'::text),
  icon_key character varying,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT screens_pkey PRIMARY KEY (id),
  CONSTRAINT screens_menu_group_id_fkey FOREIGN KEY (menu_group_id) REFERENCES public.system_menu_groups(id),
  CONSTRAINT screens_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.lookup_values(id)
);

CREATE TABLE public.shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  company_id uuid NOT NULL,
  payroll_group_id uuid,
  shift_name character varying NOT NULL,
  shift_short_name character varying NOT NULL,
  start_time time without time zone NOT NULL,
  work_minutes integer NOT NULL,
  lunch_minutes integer NOT NULL DEFAULT 0,
  entry_grace_minutes integer NOT NULL DEFAULT 0,
  exit_grace_minutes integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT shifts_pkey PRIMARY KEY (id),
  CONSTRAINT shifts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT shifts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT shifts_payroll_group_id_fkey FOREIGN KEY (payroll_group_id) REFERENCES public.payroll_groups(id)
);

CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_key character varying NOT NULL UNIQUE,
  plan_name character varying NOT NULL,
  plan_description text,
  price_monthly numeric NOT NULL DEFAULT 0.00,
  price_yearly numeric NOT NULL DEFAULT 0.00,
  currency_code character NOT NULL DEFAULT 'USD'::bpchar,
  max_users integer,
  max_employees integer,
  max_companies integer,
  max_locations integer,
  features jsonb DEFAULT '[]'::jsonb,
  trial_days integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by character varying DEFAULT 'SYSTEM'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT subscription_plans_pkey PRIMARY KEY (id)
);

CREATE TABLE public.system_languages (
  code character varying NOT NULL,
  language_name character varying NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT system_languages_pkey PRIMARY KEY (code)
);

CREATE TABLE public.system_menu_group_translations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  menu_group_id uuid NOT NULL,
  language_code character varying NOT NULL,
  menu_group_name character varying NOT NULL,
  menu_group_short_name character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT system_menu_group_translations_pkey PRIMARY KEY (id),
  CONSTRAINT system_menu_group_translations_menu_group_id_fkey FOREIGN KEY (menu_group_id) REFERENCES public.system_menu_groups(id),
  CONSTRAINT system_menu_group_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.system_languages(code)
);

CREATE TABLE public.system_menu_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  menu_group_key character varying NOT NULL UNIQUE,
  menu_group_name character varying NOT NULL,
  menu_group_short_name character varying,
  icon_key character varying,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  permission_level character varying,
  CONSTRAINT system_menu_groups_pkey PRIMARY KEY (id)
);

CREATE TABLE public.system_message_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_key character varying NOT NULL UNIQUE,
  default_text character varying NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT system_message_keys_pkey PRIMARY KEY (id)
);

CREATE TABLE public.system_message_translations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  language_code character varying NOT NULL,
  translated_text character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT system_message_translations_pkey PRIMARY KEY (id),
  CONSTRAINT system_message_translations_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.system_message_keys(id),
  CONSTRAINT system_message_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.system_languages(code)
);

CREATE TABLE public.system_report_translations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  system_report_id uuid NOT NULL,
  language_code character varying NOT NULL,
  report_name character varying NOT NULL,
  report_description character varying NOT NULL,
  report_notes character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT system_report_translations_pkey PRIMARY KEY (id),
  CONSTRAINT system_report_translations_system_report_id_fkey FOREIGN KEY (system_report_id) REFERENCES public.system_reports(id),
  CONSTRAINT system_report_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.system_languages(code)
);

CREATE TABLE public.system_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_code character varying NOT NULL UNIQUE CHECK (report_code::text ~ '^RPT_[A-Z0-9_]+$'::text AND length(report_code::text) >= 5),
  report_name character varying NOT NULL,
  report_description character varying NOT NULL,
  report_notes character varying,
  handler_type_id uuid NOT NULL,
  report_handler character varying NOT NULL,
  application_module_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT system_reports_pkey PRIMARY KEY (id),
  CONSTRAINT system_reports_handler_type_id_fkey FOREIGN KEY (handler_type_id) REFERENCES public.lookup_values(id),
  CONSTRAINT system_reports_application_module_id_fkey FOREIGN KEY (application_module_id) REFERENCES public.lookup_values(id)
);

CREATE TABLE public.tenant_language_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE,
  default_language_code character varying NOT NULL,
  enabled_languages character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT tenant_language_settings_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_language_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT tenant_language_settings_default_language_code_fkey FOREIGN KEY (default_language_code) REFERENCES public.system_languages(code)
);

CREATE TABLE public.tenant_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  auth_user_id uuid NOT NULL,
  member_role character varying NOT NULL DEFAULT 'admin'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tenant_members_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_members_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT tenant_members_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.tenant_onboarding (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE,
  user_id uuid,
  onboarding_status character varying NOT NULL DEFAULT 'IN_PROGRESS'::character varying,
  completed_steps jsonb DEFAULT '[]'::jsonb,
  current_step character varying,
  completion_percentage integer NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT tenant_onboarding_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_onboarding_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT tenant_onboarding_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- ✅ CRÍTICO: Forzar que onboarding_status y current_step sean VARCHAR sin límite
-- (Supabase Studio puede haber modificado las columnas manualmente a VARCHAR(3))
ALTER TABLE public.tenant_onboarding 
  ALTER COLUMN onboarding_status TYPE character varying,
  ALTER COLUMN current_step TYPE character varying;

CREATE TABLE public.tenant_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  setting_key character varying NOT NULL,
  setting_short_key character varying NOT NULL,
  value_type_id uuid NOT NULL,
  setting_value text,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT tenant_settings_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT tenant_settings_value_type_id_fkey FOREIGN KEY (value_type_id) REFERENCES public.lookup_values(id)
);

CREATE TABLE public.tenant_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  subscription_status character varying NOT NULL DEFAULT 'TRIAL'::character varying,
  billing_cycle character varying NOT NULL DEFAULT 'MONTHLY'::character varying,
  trial_start_date date,
  trial_end_date date,
  subscription_start_date date NOT NULL,
  subscription_end_date date,
  next_billing_date date,
  cancelled_at timestamp with time zone,
  current_price numeric NOT NULL,
  currency_code character NOT NULL DEFAULT 'USD'::bpchar,
  auto_renew boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  cancellation_reason text,
  notes text,
  created_by character varying DEFAULT 'SYSTEM'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT tenant_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT tenant_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id)
);

CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_name character varying NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  tenant_key character varying UNIQUE CHECK (tenant_key::text ~ '^[A-Z0-9_]+$'::text AND length(tenant_key::text) >= 2),
  CONSTRAINT tenants_pkey PRIMARY KEY (id)
);

CREATE TABLE public.time_clock_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  company_id uuid NOT NULL,
  device_serial_number character varying,
  device_name character varying,
  device_ip character varying,
  device_location character varying,
  device_model character varying,
  device_type_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT time_clock_devices_pkey PRIMARY KEY (id),
  CONSTRAINT time_clock_devices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT time_clock_devices_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT time_clock_devices_device_type_id_fkey FOREIGN KEY (device_type_id) REFERENCES public.lookup_values(id)
);

CREATE TABLE public.time_surcharge_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  company_id uuid NOT NULL,
  rate_category_id uuid NOT NULL,
  day_type_id uuid NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  surcharge_rate numeric NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT time_surcharge_rules_pkey PRIMARY KEY (id),
  CONSTRAINT time_surcharge_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT time_surcharge_rules_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT time_surcharge_rules_rate_category_id_fkey FOREIGN KEY (rate_category_id) REFERENCES public.lookup_values(id),
  CONSTRAINT time_surcharge_rules_day_type_id_fkey FOREIGN KEY (day_type_id) REFERENCES public.lookup_values(id)
);

CREATE TABLE public.user_role_scopes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_role_id uuid NOT NULL,
  scope_type_id uuid NOT NULL,
  scope_entity_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT user_role_scopes_pkey PRIMARY KEY (id),
  CONSTRAINT user_role_scopes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT user_role_scopes_user_role_id_fkey FOREIGN KEY (user_role_id) REFERENCES public.user_roles(id),
  CONSTRAINT user_role_scopes_scope_type_id_fkey FOREIGN KEY (scope_type_id) REFERENCES public.scope_types(id)
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  company_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  valid_from timestamp with time zone,
  valid_to timestamp with time zone,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT user_roles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  auth_user_id uuid UNIQUE,  -- ✅ NULLABLE: Se vincula en el primer login
  username character varying NOT NULL,
  display_name character varying,
  email character varying CHECK (email::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text),
  phone character varying,
  preferred_language_code character varying,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamp with time zone,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT users_preferred_language_code_fkey FOREIGN KEY (preferred_language_code) REFERENCES public.system_languages(code)
);

CREATE TABLE public.v_gender_group_id (
  id uuid
);

CREATE TABLE public.v_super_admin_role_id (
  id uuid NOT NULL,
  CONSTRAINT v_super_admin_role_id_pkey PRIMARY KEY (id)
);

CREATE TABLE public.work_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  work_group_name character varying NOT NULL,
  work_group_short_name character varying NOT NULL,
  payroll_group_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  work_group_code character varying NOT NULL,
  CONSTRAINT work_groups_pkey PRIMARY KEY (id),
  CONSTRAINT work_groups_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT work_groups_payroll_group_id_fkey FOREIGN KEY (payroll_group_id) REFERENCES public.payroll_groups(id)
);

CREATE TABLE public.work_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  work_location_name character varying NOT NULL,
  work_location_short_name character varying NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  company_id uuid,
  address_line1 character varying,
  latitude numeric,
  longitude numeric,
  work_location_code character varying NOT NULL,
  CONSTRAINT work_locations_pkey PRIMARY KEY (id),
  CONSTRAINT work_locations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

CREATE TABLE public.work_patterns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  pattern_name character varying NOT NULL,
  pattern_short_name character varying NOT NULL,
  cycle_length_days integer NOT NULL,
  work_days_per_cycle integer NOT NULL,
  rest_days_per_cycle integer NOT NULL,
  daily_work_minutes integer NOT NULL,
  weekly_work_minutes_target integer NOT NULL,
  is_flexible boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_by character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by character varying,
  updated_at timestamp with time zone,
  CONSTRAINT work_patterns_pkey PRIMARY KEY (id),
  CONSTRAINT work_patterns_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

-- ============================================================================
-- FIN DEL DDL - TOTAL: 70+ TABLAS
-- ============================================================================
-- Tablas principales:
-- - Core: tenants, users, roles, companies, employees
-- - Seguridad: actions, screens, screen_actions, role_screen_actions
-- - Catálogos: lookup_groups, lookup_values
-- - Estructura org: departments, areas, cost_centers, job_titles
-- - Asistencia: attendance_events, employee_time_punches, shifts
-- - Configuración: tenant_settings, company_settings, employee_profile_settings
-- - Reportes: system_reports, report_parameters, report_permissions
-- - I18n: system_languages, *_translations
-- - Suscripciones: subscription_plans, tenant_subscriptions, payment_transactions
-- ============================================================================
