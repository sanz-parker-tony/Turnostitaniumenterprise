-- ============================================================================
-- 000_DDL_REAL.sql
-- Turnos Titanium Enterprise - Constructor de base de datos
-- Generado desde esquema actual de laboratorio: tt_db_current_schema.sql
-- Fecha base: 2026-07-14
-- ============================================================================
-- Uso:
--   1. Ejecutar en una base de datos vacia.
--   2. Ejecutar luego 002_SEED_COMPLETE.sql para datos de fabrica.
--   3. Usar 001_FACTORY_RESET.sql despues de cada prueba para volver al
--      estado exacto capturado al finalizar 002_SEED_COMPLETE.sql.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- TOC entry 5593 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 347 (class 1255 OID 37517)
-- Name: gen_random_uuid(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.gen_random_uuid(seed_text text) RETURNS uuid
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT (
    substr(md5(seed_text), 1, 8) || '-' ||
    substr(md5(seed_text), 9, 4) || '-' ||
    substr(md5(seed_text), 13, 4) || '-' ||
    substr(md5(seed_text), 17, 4) || '-' ||
    substr(md5(seed_text), 21, 12)
  )::uuid;
$$;


SET default_table_access_method = heap;

--
-- TOC entry 233 (class 1259 OID 35920)
-- Name: action_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.action_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_id uuid NOT NULL,
    language_code character varying NOT NULL,
    action_name character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 222 (class 1259 OID 35798)
-- Name: actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_key character varying NOT NULL,
    action_name character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT actions_action_key_check CHECK ((((action_key)::text ~ '^[A-Z0-9_]+$'::text) AND (length((action_key)::text) >= 2)))
);


--
-- TOC entry 257 (class 1259 OID 36209)
-- Name: areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.areas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    area_name character varying NOT NULL,
    area_short_name character varying NOT NULL,
    payroll_group_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    legacy_id character varying NOT NULL
);


--
-- TOC entry 250 (class 1259 OID 36124)
-- Name: attendance_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    event_name character varying NOT NULL,
    event_short_name character varying NOT NULL,
    tolerance_minutes integer DEFAULT 0 NOT NULL,
    weight_value integer DEFAULT 0 NOT NULL,
    transaction_direction_id uuid NOT NULL,
    event_type_id uuid,
    movement_id uuid,
    calculation_method_id uuid,
    external_mapping character varying,
    allows_employee_request boolean DEFAULT false NOT NULL,
    punch_match_order character varying,
    tracks_late_arrival boolean DEFAULT false NOT NULL,
    tracks_early_departure boolean DEFAULT false NOT NULL,
    tracks_absence boolean DEFAULT false NOT NULL,
    tracks_odd_punch boolean DEFAULT false NOT NULL,
    tracks_lunch_schedule_violation boolean DEFAULT false NOT NULL,
    counts_as_non_working_time boolean DEFAULT false NOT NULL,
    is_employee_incident boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT attendance_events_punch_match_order_chk CHECK (punch_match_order IS NULL OR punch_match_order::text IN ('FIRST', 'LAST'))
);


--
-- TOC entry 237 (class 1259 OID 35957)
-- Name: attendance_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    movement_name character varying NOT NULL,
    movement_short_name character varying NOT NULL,
    start_key integer NOT NULL,
    end_key integer NOT NULL,
    start_punch_key_id uuid NOT NULL,
    end_punch_key_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 281 (class 1259 OID 36488)
-- Name: attendance_processing_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_processing_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 264 (class 1259 OID 36297)
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    company_id uuid,
    action_key character varying NOT NULL,
    entity_type character varying,
    entity_id uuid,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 294 (class 1259 OID 37653)
-- Name: cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    country_id uuid NOT NULL,
    state_id uuid NOT NULL,
    city_key character varying NOT NULL,
    city_label character varying NOT NULL,
    city_short_label character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT cities_key_check CHECK ((((city_key)::text ~ '^[A-Za-z0-9]{1,20}$'::text) AND (length((city_key)::text) >= 2)))
);


--
-- TOC entry 251 (class 1259 OID 36138)
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    company_name character varying NOT NULL,
    company_short_name character varying NOT NULL,
    legacy_id character varying NOT NULL,
    company_address character varying,
    company_address_line1 character varying,
    company_address_line2 character varying,
    company_country_id uuid,
    company_state_id uuid,
    company_city_id uuid,
    company_postal_code character varying,
    company_phone character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    logo text,
    banner text
);


--
-- TOC entry 5594 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN companies.logo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.companies.logo IS 'Ruta relativa o URL del logo de la empresa para reportes.';


--
-- TOC entry 5595 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN companies.banner; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.companies.banner IS 'Ruta relativa o URL del banner de la empresa para reportes.';


--
-- TOC entry 277 (class 1259 OID 36440)
-- Name: company_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    company_id uuid NOT NULL,
    system_setting_id uuid NOT NULL,
    setting_value text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 238 (class 1259 OID 35969)
-- Name: cost_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_centers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    homologation_code character varying,
    gl_account_code character varying,
    cost_center_name character varying NOT NULL,
    cost_center_short_name character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    legacy_id character varying NOT NULL
);


--
-- TOC entry 292 (class 1259 OID 37610)
-- Name: countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.countries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    country_key character varying NOT NULL,
    country_label character varying NOT NULL,
    country_short_label character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT countries_key_check CHECK ((((country_key)::text ~ '^[A-Z0-9_]+$'::text) AND (length((country_key)::text) >= 2)))
);


--
-- TOC entry 239 (class 1259 OID 35979)
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    department_name character varying NOT NULL,
    department_short_name character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    legacy_id character varying NOT NULL
);


--
-- TOC entry 299 (class 1259 OID 37868)
-- Name: employee_absence_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_absence_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    justification_type_id uuid NOT NULL,
    attendance_event_id uuid NOT NULL,
    target_punch_id uuid,
    justify_method_id uuid NOT NULL,
    start_datetime timestamp with time zone NOT NULL,
    end_datetime timestamp with time zone NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    notes character varying,
    request_status_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    approval_notes text,
    approved_by uuid,
    approved_at timestamp with time zone,
    support_document_path character varying,
    support_document_name character varying,
    support_document_mime character varying,
    support_document_size_bytes integer
);


--
-- TOC entry 288 (class 1259 OID 36572)
-- Name: employee_attendance_calculations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_attendance_calculations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    generated_value numeric DEFAULT 0 NOT NULL,
    approved_value numeric DEFAULT 0 NOT NULL,
    is_approved boolean DEFAULT false NOT NULL,
    generated_weight integer DEFAULT 0 NOT NULL,
    approved_weight integer,
    notes character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 282 (class 1259 OID 36498)
-- Name: employee_companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    work_on_holidays boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 302 (class 1259 OID 38042)
-- Name: employee_profile_attendance_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_profile_attendance_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    employee_profile_id uuid NOT NULL,
    attendance_event_id uuid NOT NULL,
    requires_approval boolean DEFAULT true NOT NULL,
    export_to_payroll boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 278 (class 1259 OID 36452)
-- Name: employee_profile_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_profile_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    company_id uuid,
    employee_profile_id uuid NOT NULL,
    system_setting_id uuid NOT NULL,
    setting_value text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 262 (class 1259 OID 36277)
-- Name: employee_profile_work_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_profile_work_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    employee_profile_id uuid NOT NULL,
    work_pattern_id uuid NOT NULL,
    valid_from date NOT NULL,
    valid_to date NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 240 (class 1259 OID 35989)
-- Name: employee_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    profile_name character varying NOT NULL,
    profile_short_name character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    legacy_id character varying NOT NULL
);


--
-- TOC entry 310 (class 1259 OID 45614)
-- Name: employee_route_tracking_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_route_tracking_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    tracking_datetime timestamp with time zone DEFAULT now() NOT NULL,
    tracking_time_zone character varying(80) DEFAULT 'America/Guayaquil'::character varying,
    latitud double precision NOT NULL,
    longitud double precision NOT NULL,
    location_accuracy_meters double precision,
    tracking_status_id uuid,
    nearest_work_location_id uuid,
    distance_to_nearest_location_meters double precision,
    snapshot_path text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT employee_route_tracking_points_accuracy_chk CHECK (((location_accuracy_meters IS NULL) OR (location_accuracy_meters >= (0)::double precision))),
    CONSTRAINT employee_route_tracking_points_distance_chk CHECK (((distance_to_nearest_location_meters IS NULL) OR (distance_to_nearest_location_meters >= (0)::double precision))),
    CONSTRAINT employee_route_tracking_points_latitud_chk CHECK (((latitud >= ('-90'::integer)::double precision) AND (latitud <= (90)::double precision))),
    CONSTRAINT employee_route_tracking_points_longitud_chk CHECK (((longitud >= ('-180'::integer)::double precision) AND (longitud <= (180)::double precision))),
    CONSTRAINT employee_route_tracking_points_time_zone_chk CHECK (((tracking_time_zone IS NULL) OR (btrim((tracking_time_zone)::text) <> ''::text)))
);


--
-- TOC entry 279 (class 1259 OID 36464)
-- Name: employee_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    system_setting_id uuid NOT NULL,
    setting_value text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 300 (class 1259 OID 37929)
-- Name: employee_shift_change_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_shift_change_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    shift_date date NOT NULL,
    current_shift_id uuid NOT NULL,
    requested_shift_id uuid NOT NULL,
    reason text NOT NULL,
    request_status_id uuid NOT NULL,
    supervisor_notes text,
    approved_by uuid,
    approved_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    support_document_path character varying,
    support_document_name character varying,
    support_document_mime character varying,
    support_document_size_bytes integer,
    CONSTRAINT ck_shift_change_requested_not_equal_current CHECK ((requested_shift_id <> current_shift_id))
);


--
-- TOC entry 284 (class 1259 OID 36530)
-- Name: employee_shift_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_shift_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    shift_id uuid NOT NULL,
    shift_date date NOT NULL,
    shift_type_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 304 (class 1259 OID 38313)
-- Name: employee_time_punch_change_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_time_punch_change_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    target_punch_id uuid,
    request_type_id uuid NOT NULL,
    reason text NOT NULL,
    current_values jsonb,
    requested_values jsonb DEFAULT '{}'::jsonb NOT NULL,
    request_status_id uuid NOT NULL,
    supervisor_notes text,
    approved_by uuid,
    approved_at timestamp with time zone,
    support_document_path character varying,
    support_document_name character varying,
    support_document_mime character varying,
    support_document_size_bytes integer,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT ck_tpcr_approval_consistency CHECK ((((approved_at IS NULL) AND (approved_by IS NULL)) OR ((approved_at IS NOT NULL) AND (approved_by IS NOT NULL)))),
    CONSTRAINT ck_tpcr_current_values_obj CHECK (((current_values IS NULL) OR (jsonb_typeof(current_values) = 'object'::text))),
    CONSTRAINT ck_tpcr_requested_values_obj CHECK ((jsonb_typeof(requested_values) = 'object'::text))
);


--
-- TOC entry 289 (class 1259 OID 36586)
-- Name: employee_time_punches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_time_punches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    time_clock_device_id uuid,
    punch_datetime timestamp with time zone NOT NULL,
    punch_key integer NOT NULL,
    punch_key_lookup_id uuid NOT NULL,
    punch_source_id uuid,
    time_punch_status_id uuid,
    service_ticket_number integer DEFAULT 0,
    notes character varying,
    process_run_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    latitud double precision,
    longitud double precision,
    punch_time_zone character varying(80) NOT NULL,
    client_ip character varying(64),
    client_user_agent text,
    client_device_type character varying(40),
    client_platform character varying(120),
    client_app_instance_id character varying(80),
    client_metadata jsonb,
    location_accuracy_meters double precision,
    CONSTRAINT employee_time_punches_latitud_chk CHECK (((latitud IS NULL) OR ((latitud >= ('-90'::integer)::double precision) AND (latitud <= (90)::double precision)))),
    CONSTRAINT employee_time_punches_longitud_chk CHECK (((longitud IS NULL) OR ((longitud >= ('-180'::integer)::double precision) AND (longitud <= (180)::double precision)))),
    CONSTRAINT employee_time_punches_punch_time_zone_not_blank_chk CHECK (((punch_time_zone IS NULL) OR (btrim((punch_time_zone)::text) <> ''::text))),
    CONSTRAINT employee_time_punches_location_accuracy_chk CHECK ((location_accuracy_meters IS NULL) OR (location_accuracy_meters >= (0)::double precision))
);


--
-- Name: notify_employee_time_punch_changed(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_employee_time_punch_changed() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
  v_payload jsonb;
BEGIN
  IF TG_OP = 'UPDATE'
    AND NEW.tenant_id IS NOT DISTINCT FROM OLD.tenant_id
    AND NEW.company_id IS NOT DISTINCT FROM OLD.company_id
    AND NEW.employee_id IS NOT DISTINCT FROM OLD.employee_id
    AND NEW.time_clock_device_id IS NOT DISTINCT FROM OLD.time_clock_device_id
    AND NEW.punch_datetime IS NOT DISTINCT FROM OLD.punch_datetime
    AND NEW.punch_key IS NOT DISTINCT FROM OLD.punch_key
    AND NEW.punch_source_id IS NOT DISTINCT FROM OLD.punch_source_id
    AND NEW.time_punch_status_id IS NOT DISTINCT FROM OLD.time_punch_status_id
    AND NEW.is_active IS NOT DISTINCT FROM OLD.is_active
    AND NEW.latitud IS NOT DISTINCT FROM OLD.latitud
    AND NEW.longitud IS NOT DISTINCT FROM OLD.longitud
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_row := OLD;
  ELSE
    v_row := NEW;
  END IF;

  v_payload := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'tenant_id', v_row.tenant_id,
    'employee_id', v_row.employee_id,
    'punch_id', v_row.id,
    'punch_datetime', v_row.punch_datetime,
    'emitted_at', now()
  );

  PERFORM pg_notify('employee_time_punches_changed', v_payload::text);

  RETURN v_row;
END;
$$;


--
-- Name: trg_employee_time_punches_dashboard_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_employee_time_punches_dashboard_notify AFTER INSERT OR UPDATE OR DELETE ON public.employee_time_punches FOR EACH ROW EXECUTE FUNCTION public.notify_employee_time_punch_changed();


--
-- TOC entry 252 (class 1259 OID 36148)
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    employee_lastname character varying NOT NULL,
    employee_name character varying NOT NULL,
    employee_code character varying NOT NULL,
    employee_birthday date,
    employee_gender_id uuid,
    employee_is_model boolean DEFAULT false NOT NULL,
    employee_observations character varying,
    employee_photo_path character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    user_id uuid
);


--
-- TOC entry 265 (class 1259 OID 36306)
-- Name: holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.holidays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    company_id uuid NOT NULL,
    country_id uuid,
    state_id uuid,
    city_id uuid,
    work_location_id uuid,
    holiday_date date NOT NULL,
    holiday_name character varying NOT NULL,
    is_recurring boolean DEFAULT false NOT NULL,
    is_paid boolean DEFAULT true NOT NULL,
    is_working_day boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    holiday_type_id uuid
);


--
-- TOC entry 241 (class 1259 OID 35999)
-- Name: job_titles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_titles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    job_title_name character varying NOT NULL,
    job_title_short_name character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    legacy_id character varying NOT NULL
);


--
-- TOC entry 263 (class 1259 OID 36287)
-- Name: justification_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.justification_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    justification_name character varying NOT NULL,
    justification_short_name character varying NOT NULL,
    attendance_event_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 223 (class 1259 OID 35811)
-- Name: kv_store_e19f2094; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kv_store_e19f2094 (
    key text NOT NULL,
    value jsonb NOT NULL
);


--
-- TOC entry 234 (class 1259 OID 35929)
-- Name: lookup_group_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_group_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lookup_group_id uuid NOT NULL,
    language_code character varying NOT NULL,
    label character varying NOT NULL,
    short_label character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 224 (class 1259 OID 35818)
-- Name: lookup_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lookup_group_key character varying NOT NULL,
    lookup_group_label character varying NOT NULL,
    lookup_group_short_label character varying NOT NULL,
    allows_tenant_items boolean DEFAULT false NOT NULL,
    management_policy jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 253 (class 1259 OID 36159)
-- Name: lookup_value_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_value_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lookup_value_id uuid NOT NULL,
    language_code character varying NOT NULL,
    label character varying NOT NULL,
    short_label character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 242 (class 1259 OID 36009)
-- Name: lookup_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookup_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    lookup_group_id uuid NOT NULL,
    lookup_key character varying NOT NULL,
    lookup_label character varying NOT NULL,
    lookup_short_label character varying NOT NULL,
    lookup_scope character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT lookup_values_lookup_key_check CHECK ((((lookup_key)::text ~ '^[A-Z0-9_]+$'::text) AND (length((lookup_key)::text) >= 2))),
    CONSTRAINT lookup_values_lookup_scope_check CHECK (((lookup_scope)::text = ANY (ARRAY[('SYSTEM'::character varying)::text, ('TENANT'::character varying)::text])))
);


--
-- TOC entry 259 (class 1259 OID 36229)
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    subscription_id uuid,
    transaction_type character varying DEFAULT 'SUBSCRIPTION'::character varying NOT NULL,
    transaction_status character varying DEFAULT 'PENDING'::character varying NOT NULL,
    amount numeric NOT NULL,
    currency_code character(3) DEFAULT 'USD'::bpchar NOT NULL,
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_transactions_amount_check CHECK ((amount >= (0)::numeric))
);


--
-- TOC entry 243 (class 1259 OID 36024)
-- Name: payroll_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    payroll_group_name character varying NOT NULL,
    payroll_group_short_name character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    legacy_id character varying NOT NULL
);


--
-- TOC entry 272 (class 1259 OID 36384)
-- Name: report_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    system_report_id uuid NOT NULL,
    executed_by uuid NOT NULL,
    executed_at timestamp with time zone DEFAULT now() NOT NULL,
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    output_format_id uuid,
    execution_status_id uuid,
    generated_file_path text
);


--
-- TOC entry 287 (class 1259 OID 36563)
-- Name: report_parameter_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_parameter_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_parameter_id uuid NOT NULL,
    language_code character varying NOT NULL,
    parameter_label character varying NOT NULL,
    parameter_description character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 273 (class 1259 OID 36394)
-- Name: report_parameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_parameters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_report_id uuid NOT NULL,
    parameter_key character varying NOT NULL,
    parameter_label character varying NOT NULL,
    parameter_description character varying,
    data_type_id uuid NOT NULL,
    ui_control_id uuid NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    default_value text,
    lookup_group_id uuid,
    is_multi_value boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 274 (class 1259 OID 36407)
-- Name: report_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    role_id uuid NOT NULL,
    system_report_id uuid NOT NULL,
    can_view boolean DEFAULT true NOT NULL,
    can_export boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 275 (class 1259 OID 36419)
-- Name: report_scope_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_scope_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_report_id uuid NOT NULL,
    required_scope_type_id uuid NOT NULL,
    enforcement_level_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 260 (class 1259 OID 36243)
-- Name: role_permission_copy_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permission_copy_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    operation_type character varying NOT NULL,
    merge_strategy character varying DEFAULT 'MERGE'::character varying NOT NULL,
    source_role_id uuid NOT NULL,
    target_role_id uuid,
    created_role_id uuid,
    copy_screen_actions boolean DEFAULT true NOT NULL,
    copy_report_permissions boolean DEFAULT true NOT NULL,
    copy_scopes boolean DEFAULT true NOT NULL,
    executed_by uuid NOT NULL,
    executed_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying DEFAULT 'DONE'::character varying NOT NULL,
    error_message text,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT role_permission_copy_runs_merge_strategy_check CHECK (((merge_strategy)::text = ANY (ARRAY[('MERGE'::character varying)::text, ('OVERWRITE'::character varying)::text]))),
    CONSTRAINT role_permission_copy_runs_operation_type_check CHECK (((operation_type)::text = ANY (ARRAY[('CLONE'::character varying)::text, ('COPY'::character varying)::text])))
);


--
-- TOC entry 283 (class 1259 OID 36509)
-- Name: role_permission_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permission_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    copy_run_id uuid NOT NULL,
    role_id uuid NOT NULL,
    snapshot_type character varying DEFAULT 'BEFORE'::character varying NOT NULL,
    snapshot jsonb NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT role_permission_snapshots_snapshot_type_check CHECK (((snapshot_type)::text = ANY (ARRAY[('BEFORE'::character varying)::text, ('AFTER'::character varying)::text])))
);


--
-- TOC entry 286 (class 1259 OID 36550)
-- Name: role_screen_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_screen_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    role_id uuid NOT NULL,
    screen_action_id uuid NOT NULL,
    is_allowed boolean DEFAULT false NOT NULL,
    valid_from timestamp with time zone,
    valid_to timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 244 (class 1259 OID 36034)
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    role_key character varying NOT NULL,
    role_name character varying NOT NULL,
    role_scope character varying DEFAULT 'TENANT'::character varying NOT NULL,
    base_role_id uuid,
    role_version integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    is_system_role boolean DEFAULT false,
    is_locked boolean DEFAULT false,
    data_scope character varying DEFAULT 'ALL'::character varying,
    locked_by uuid,
    locked_at timestamp with time zone,
    user_manager_role_id uuid,
    is_org_scope_target boolean DEFAULT false NOT NULL,
    is_employee_access_target boolean DEFAULT false NOT NULL,
    is_tenant_administrator boolean DEFAULT false NOT NULL,
    is_employee_self_service boolean DEFAULT false NOT NULL,
    ui_dashboard_mode character varying DEFAULT 'GENERIC'::character varying NOT NULL,
    ui_home_route character varying DEFAULT '/dashboard'::character varying NOT NULL,
    CONSTRAINT roles_data_scope_check CHECK (((data_scope)::text = ANY (ARRAY[('ALL'::character varying)::text, ('DIRECT_REPORTS'::character varying)::text, ('SELF'::character varying)::text]))),
    CONSTRAINT roles_role_key_check CHECK ((((role_key)::text ~ '^[A-Z0-9_]+$'::text) AND (length((role_key)::text) >= 2))),
    CONSTRAINT roles_role_scope_check CHECK (((role_scope)::text = ANY (ARRAY[('SYSTEM'::character varying)::text, ('TENANT'::character varying)::text, ('SCOPE'::character varying)::text, ('SELF'::character varying)::text]))),
    CONSTRAINT roles_ui_dashboard_mode_check CHECK ((ui_dashboard_mode)::text = ANY (ARRAY['PLATFORM'::text, 'TENANT'::text, 'WORKFORCE'::text, 'SELF'::text, 'GENERIC'::text]))
);


--
-- TOC entry 225 (class 1259 OID 35831)
-- Name: scope_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scope_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope_type_key character varying NOT NULL,
    scope_type_name character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 270 (class 1259 OID 36363)
-- Name: screen_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.screen_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    screen_id uuid NOT NULL,
    action_id uuid NOT NULL,
    ui_element_key character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 271 (class 1259 OID 36375)
-- Name: screen_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.screen_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    screen_id uuid NOT NULL,
    language_code character varying NOT NULL,
    screen_name character varying NOT NULL,
    menu_label character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 254 (class 1259 OID 36168)
-- Name: screens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.screens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    screen_key character varying NOT NULL,
    screen_name character varying NOT NULL,
    menu_label character varying,
    menu_group_id uuid NOT NULL,
    module_id uuid,
    route_path character varying,
    icon_key character varying,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT screens_route_path_check CHECK (((route_path)::text ~ '^/[a-z0-9/_-]+$'::text)),
    CONSTRAINT screens_screen_key_check CHECK ((((screen_key)::text ~ '^[A-Z0-9_]+$'::text) AND (length((screen_key)::text) >= 2)))
);


--
-- TOC entry 296 (class 1259 OID 37728)
-- Name: shift_constructor_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_constructor_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    constructor_id uuid NOT NULL,
    block_type character varying NOT NULL,
    block_label character varying,
    start_minutes integer NOT NULL,
    end_minutes integer NOT NULL,
    surcharge_pct numeric(6,2) DEFAULT 0 NOT NULL,
    is_break boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 10 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT ck_shift_block_minute_range CHECK (((start_minutes >= 0) AND (end_minutes > start_minutes) AND (end_minutes <= 2880))),
    CONSTRAINT ck_shift_block_type CHECK (((block_type)::text = ANY ((ARRAY['ORDINARIA'::character varying, 'NOCTURNA'::character varying, 'EXTRA_50'::character varying, 'EXTRA_100'::character varying, 'LUNCH'::character varying, 'BREAK'::character varying])::text[])))
);


--
-- TOC entry 295 (class 1259 OID 37703)
-- Name: shift_constructors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_constructors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    shift_id uuid NOT NULL,
    constructor_name character varying NOT NULL,
    total_work_minutes integer DEFAULT 0 NOT NULL,
    total_break_minutes integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 266 (class 1259 OID 36319)
-- Name: shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    company_id uuid NOT NULL,
    payroll_group_id uuid,
    shift_name character varying NOT NULL,
    shift_short_name character varying NOT NULL,
    start_time time without time zone NOT NULL,
    shift_duration_minutes integer DEFAULT 0 NOT NULL,
    work_minutes integer NOT NULL,
    lunch_minutes integer DEFAULT 0 NOT NULL,
    lunch_window_minutes integer DEFAULT 0 NOT NULL,
    lunch_is_paid boolean DEFAULT false NOT NULL,
    lunch_deduction_mode character varying,
    entry_grace_minutes integer DEFAULT 0 NOT NULL,
    exit_grace_minutes integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    shift_icon_key character varying DEFAULT 'Sun'::character varying,
    shift_bg_color character varying,
    shift_text_color character varying,
    CONSTRAINT shifts_minutes_policy_chk CHECK (shift_duration_minutes >= 0 AND shift_duration_minutes <= 2880 AND work_minutes >= 0 AND work_minutes <= shift_duration_minutes AND lunch_minutes >= 0 AND lunch_minutes <= shift_duration_minutes AND lunch_window_minutes >= lunch_minutes AND lunch_window_minutes <= shift_duration_minutes),
    CONSTRAINT shifts_lunch_deduction_mode_chk CHECK (lunch_deduction_mode IS NULL OR lunch_deduction_mode::text IN ('ACTUAL_OR_SCHEDULED', 'ACTUAL', 'SCHEDULED', 'NONE')),
    CONSTRAINT shifts_shift_bg_color_hex_chk CHECK (((shift_bg_color IS NULL) OR ((shift_bg_color)::text ~ '^#[0-9A-Fa-f]{6}$'::text))),
    CONSTRAINT shifts_shift_text_color_hex_chk CHECK (((shift_text_color IS NULL) OR ((shift_text_color)::text ~ '^#[0-9A-Fa-f]{6}$'::text)))
);


--
-- TOC entry 293 (class 1259 OID 37629)
-- Name: states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.states (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    country_id uuid NOT NULL,
    state_key character varying NOT NULL,
    state_label character varying NOT NULL,
    state_short_label character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT states_key_check CHECK (((state_key)::text ~ '^[A-Za-z0-9]{1,20}$'::text))
);


--
-- TOC entry 226 (class 1259 OID 35843)
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_key character varying NOT NULL,
    plan_name character varying NOT NULL,
    plan_description text,
    price_monthly numeric DEFAULT 0.00 NOT NULL,
    price_yearly numeric DEFAULT 0.00 NOT NULL,
    currency_code character(3) DEFAULT 'USD'::bpchar NOT NULL,
    max_users integer,
    max_employees integer,
    max_companies integer,
    max_locations integer,
    features jsonb DEFAULT '[]'::jsonb,
    trial_days integer DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_by character varying DEFAULT 'SYSTEM'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 227 (class 1259 OID 35863)
-- Name: system_languages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_languages (
    code character varying NOT NULL,
    language_name character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at time with time zone
);


--
-- TOC entry 235 (class 1259 OID 35938)
-- Name: system_menu_group_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_menu_group_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_group_id uuid NOT NULL,
    language_code character varying NOT NULL,
    menu_group_name character varying NOT NULL,
    menu_group_short_name character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 228 (class 1259 OID 35873)
-- Name: system_menu_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_menu_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_group_key character varying NOT NULL,
    menu_group_name character varying NOT NULL,
    menu_group_short_name character varying,
    icon_key character varying,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    permission_level character varying
);


--
-- TOC entry 229 (class 1259 OID 35886)
-- Name: system_message_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_message_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_key character varying NOT NULL,
    default_text character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone
);


--
-- TOC entry 236 (class 1259 OID 35947)
-- Name: system_message_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_message_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    language_code character varying NOT NULL,
    translated_text character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    message_key character varying NOT NULL,
    message_key_id uuid,
    is_active boolean DEFAULT true NOT NULL
);


--
-- TOC entry 276 (class 1259 OID 36429)
-- Name: system_report_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_report_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_report_id uuid NOT NULL,
    language_code character varying NOT NULL,
    report_name character varying NOT NULL,
    report_description character varying NOT NULL,
    report_notes character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 255 (class 1259 OID 36183)
-- Name: system_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_code character varying NOT NULL,
    report_name character varying NOT NULL,
    report_description character varying NOT NULL,
    report_notes character varying,
    handler_type_id uuid NOT NULL,
    report_handler character varying NOT NULL,
    application_module_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT system_reports_report_code_check CHECK ((((report_code)::text ~ '^RPT_[A-Z0-9_]+$'::text) AND (length((report_code)::text) >= 5)))
);


--
-- TOC entry 256 (class 1259 OID 36196)
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key character varying NOT NULL,
    setting_name character varying NOT NULL,
    setting_short_key character varying NOT NULL,
    value_type_id uuid NOT NULL,
    default_value text,
    description text,
    allowed_lookup_group_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT system_settings_setting_key_check CHECK ((((setting_key)::text ~ '^[A-Z0-9_]+$'::text) AND (length((setting_key)::text) >= 2)))
);


--
-- TOC entry 245 (class 1259 OID 36054)
-- Name: tenant_language_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_language_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    default_language_code character varying NOT NULL,
    enabled_languages character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone
);


--
-- TOC entry 246 (class 1259 OID 36065)
-- Name: tenant_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    auth_user_id uuid NOT NULL,
    member_role character varying DEFAULT 'admin'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 261 (class 1259 OID 36261)
-- Name: tenant_onboarding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_onboarding (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid,
    onboarding_status character varying DEFAULT 'IN_PROGRESS'::character varying NOT NULL,
    completed_steps jsonb DEFAULT '[]'::jsonb,
    current_step character varying,
    completion_percentage integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT tenant_onboarding_completion_percentage_check CHECK (((completion_percentage >= 0) AND (completion_percentage <= 100)))
);


--
-- TOC entry 280 (class 1259 OID 36476)
-- Name: tenant_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    system_setting_id uuid NOT NULL,
    setting_value text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 247 (class 1259 OID 36075)
-- Name: tenant_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    subscription_status character varying DEFAULT 'TRIAL'::character varying NOT NULL,
    billing_cycle character varying DEFAULT 'MONTHLY'::character varying NOT NULL,
    trial_start_date date,
    trial_end_date date,
    subscription_start_date date NOT NULL,
    subscription_end_date date,
    next_billing_date date,
    cancelled_at timestamp with time zone,
    current_price numeric NOT NULL,
    currency_code character(3) DEFAULT 'USD'::bpchar NOT NULL,
    auto_renew boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    cancellation_reason text,
    notes text,
    created_by character varying DEFAULT 'SYSTEM'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 230 (class 1259 OID 35898)
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_name character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_key character varying,
    CONSTRAINT tenants_tenant_key_check CHECK ((((tenant_key)::text ~ '^[A-Z0-9_]+$'::text) AND (length((tenant_key)::text) >= 2)))
);


--
-- TOC entry 267 (class 1259 OID 36332)
-- Name: time_clock_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_clock_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    company_id uuid NOT NULL,
    device_serial_number character varying,
    device_name character varying,
    device_ip character varying,
    device_location character varying,
    device_model character varying,
    device_type_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    work_location_id uuid,
    latitude double precision,
    longitude double precision,
    CONSTRAINT time_clock_devices_latitude_chk CHECK (((latitude IS NULL) OR ((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision)))),
    CONSTRAINT time_clock_devices_longitude_chk CHECK (((longitude IS NULL) OR ((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision))))
);


--
-- TOC entry 268 (class 1259 OID 36342)
-- Name: time_surcharge_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_surcharge_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    company_id uuid NOT NULL,
    rate_category_id uuid NOT NULL,
    day_type_id uuid NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    surcharge_rate numeric NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    valid_from date NOT NULL,
    valid_to date NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 301 (class 1259 OID 37978)
-- Name: user_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    notification_type_id uuid NOT NULL,
    title character varying NOT NULL,
    message text NOT NULL,
    icon_key character varying,
    ref_table character varying,
    ref_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT ck_user_notifications_read_at CHECK (((is_read = false) OR (read_at IS NOT NULL)))
);


--
-- TOC entry 308 (class 1259 OID 38415)
-- Name: user_role_employee_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_role_employee_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_role_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying(100) DEFAULT 'SYSTEM'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying(100),
    updated_at timestamp with time zone
);


--
-- TOC entry 309 (class 1259 OID 45496)
-- Name: user_role_scope_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_role_scope_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_role_id uuid NOT NULL,
    company_id uuid NOT NULL,
    work_location_id uuid,
    department_id uuid,
    area_id uuid,
    cost_center_id uuid,
    work_group_id uuid,
    employee_profile_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying DEFAULT 'SYSTEM'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 285 (class 1259 OID 36540)
-- Name: user_role_scopes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_role_scopes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_role_id uuid NOT NULL,
    scope_type_id uuid NOT NULL,
    scope_entity_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 269 (class 1259 OID 36353)
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    company_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    valid_from timestamp with time zone,
    valid_to timestamp with time zone,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 248 (class 1259 OID 36090)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    auth_user_id uuid NOT NULL,
    username character varying NOT NULL,
    display_name character varying,
    email character varying,
    phone character varying,
    preferred_language_code character varying,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    password character varying,
    auth_version integer DEFAULT 1 NOT NULL,
    must_change_password boolean DEFAULT false NOT NULL,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    CONSTRAINT users_auth_version_chk CHECK (auth_version >= 1),
    CONSTRAINT users_failed_login_attempts_chk CHECK (failed_login_attempts >= 0),
    CONSTRAINT users_email_check CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))
);

COMMENT ON COLUMN public.user_notifications.metadata IS
  'Contexto parametrizado de la notificación; incluye request_status_key y datos de resolución cuando realiza seguimiento de una solicitud.';


--
-- TOC entry 232 (class 1259 OID 35914)
-- Name: v_super_admin_role_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.v_super_admin_role_id (
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- TOC entry 291 (class 1259 OID 37592)
-- Name: users_with_primary_role; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.users_with_primary_role AS
 SELECT u.id,
    u.auth_user_id,
    u.tenant_id,
    t.tenant_name,
    u.username,
    u.email,
    u.display_name,
    u.phone,
    u.preferred_language_code,
    u.is_active,
    u.last_login_at,
    u.created_at,
    u.created_by,
    u.updated_at,
    u.updated_by,
    r.role_key,
    r.role_name,
    r.role_scope,
    ((r.role_scope)::text = 'SYSTEM'::text AND r.is_system_role = true) AS is_super_admin,
    r.data_scope,
    r.is_tenant_administrator,
    r.is_employee_self_service,
    r.ui_dashboard_mode,
    r.ui_home_route
   FROM ((public.tenants t
     JOIN public.users u ON ((t.id = u.tenant_id)))
     JOIN public.user_roles ur ON ((u.id = ur.user_id AND ur.is_active = true)))
     JOIN public.roles r ON ((ur.role_id = r.id AND r.is_active = true));


--
-- TOC entry 297 (class 1259 OID 37781)
-- Name: v_config_group_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.v_config_group_id (
    id uuid
);


--
-- TOC entry 231 (class 1259 OID 35911)
-- Name: v_gender_group_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.v_gender_group_id (
    id uuid
);


--
-- TOC entry 307 (class 1259 OID 38403)
-- Name: v_user_role_authorized_employees; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_user_role_authorized_employees AS
 WITH target_user_roles AS (
         SELECT ur.tenant_id,
            ur.id AS user_role_id,
            ur.user_id,
            ur.role_id,
            r.role_key
           FROM (public.user_roles ur
             JOIN public.roles r ON ((r.id = ur.role_id)))
          WHERE ((ur.is_active = true) AND (r.is_active = true) AND ((r.role_key)::text = ANY ((ARRAY['SUPERVISOR'::character varying, 'RRHH_ADMIN'::character varying, 'RHADMIN'::character varying])::text[])))
        ), active_legacy_scopes AS (
         SELECT urs.tenant_id,
            urs.user_role_id,
            st.scope_type_key,
            urs.scope_entity_id
           FROM (public.user_role_scopes urs
             JOIN public.scope_types st ON ((st.id = urs.scope_type_id)))
          WHERE ((urs.is_active = true) AND (st.is_active = true))
        ), legacy_scope_sets AS (
         SELECT tur.tenant_id,
            tur.user_role_id,
            tur.user_id,
            tur.role_id,
            tur.role_key,
            count(*) FILTER (WHERE ((s.scope_type_key)::text = 'COMPANY'::text)) AS cnt_company,
            count(*) FILTER (WHERE ((s.scope_type_key)::text = 'WORK_LOCATION'::text)) AS cnt_work_location,
            count(*) FILTER (WHERE ((s.scope_type_key)::text = 'DEPARTMENT'::text)) AS cnt_department,
            count(*) FILTER (WHERE ((s.scope_type_key)::text = 'AREA'::text)) AS cnt_area,
            count(*) FILTER (WHERE ((s.scope_type_key)::text = 'COST_CENTER'::text)) AS cnt_cost_center,
            count(*) FILTER (WHERE ((s.scope_type_key)::text = 'WORK_GROUP'::text)) AS cnt_work_group,
            count(*) FILTER (WHERE ((s.scope_type_key)::text = 'EMPLOYEE_PROFILE'::text)) AS cnt_employee_profile,
            count(*) FILTER (WHERE ((s.scope_type_key)::text = 'EMPLOYEE'::text)) AS cnt_employee,
            COALESCE(array_agg(s.scope_entity_id) FILTER (WHERE ((s.scope_type_key)::text = 'COMPANY'::text)), ARRAY[]::uuid[]) AS company_ids,
            COALESCE(array_agg(s.scope_entity_id) FILTER (WHERE ((s.scope_type_key)::text = 'WORK_LOCATION'::text)), ARRAY[]::uuid[]) AS work_location_ids,
            COALESCE(array_agg(s.scope_entity_id) FILTER (WHERE ((s.scope_type_key)::text = 'DEPARTMENT'::text)), ARRAY[]::uuid[]) AS department_ids,
            COALESCE(array_agg(s.scope_entity_id) FILTER (WHERE ((s.scope_type_key)::text = 'AREA'::text)), ARRAY[]::uuid[]) AS area_ids,
            COALESCE(array_agg(s.scope_entity_id) FILTER (WHERE ((s.scope_type_key)::text = 'COST_CENTER'::text)), ARRAY[]::uuid[]) AS cost_center_ids,
            COALESCE(array_agg(s.scope_entity_id) FILTER (WHERE ((s.scope_type_key)::text = 'WORK_GROUP'::text)), ARRAY[]::uuid[]) AS work_group_ids,
            COALESCE(array_agg(s.scope_entity_id) FILTER (WHERE ((s.scope_type_key)::text = 'EMPLOYEE_PROFILE'::text)), ARRAY[]::uuid[]) AS employee_profile_ids,
            COALESCE(array_agg(s.scope_entity_id) FILTER (WHERE ((s.scope_type_key)::text = 'EMPLOYEE'::text)), ARRAY[]::uuid[]) AS employee_ids
           FROM (target_user_roles tur
             LEFT JOIN active_legacy_scopes s ON (((s.tenant_id = tur.tenant_id) AND (s.user_role_id = tur.user_role_id))))
          GROUP BY tur.tenant_id, tur.user_role_id, tur.user_id, tur.role_id, tur.role_key
        ), employee_base AS (
         SELECT ec.tenant_id,
            ec.employee_id,
            ec.company_id,
            ec.work_location_id,
            ec.department_id,
            ec.area_id,
            ec.cost_center_id,
            ec.work_group_id,
            ec.employee_profile_id
           FROM (public.employee_companies ec
             JOIN public.employees e ON (((e.id = ec.employee_id) AND (e.tenant_id = ec.tenant_id))))
          WHERE ((ec.is_active = true) AND (e.is_active = true))
        ), legacy_authorized AS (
         SELECT ss.tenant_id,
            ss.user_role_id,
            ss.user_id,
            ss.role_id,
            ss.role_key,
            eb.employee_id,
            eb.company_id,
            eb.work_location_id,
            eb.department_id,
            eb.area_id,
            eb.cost_center_id,
            eb.work_group_id,
                CASE
                    WHEN ((((((((ss.cnt_company + ss.cnt_work_location) + ss.cnt_department) + ss.cnt_area) + ss.cnt_cost_center) + ss.cnt_work_group) + ss.cnt_employee_profile) > 0) AND ((ss.cnt_company = 0) OR (eb.company_id = ANY (ss.company_ids))) AND ((ss.cnt_work_location = 0) OR (eb.work_location_id = ANY (ss.work_location_ids))) AND ((ss.cnt_department = 0) OR (eb.department_id = ANY (ss.department_ids))) AND ((ss.cnt_area = 0) OR (eb.area_id = ANY (ss.area_ids))) AND ((ss.cnt_cost_center = 0) OR (eb.cost_center_id = ANY (ss.cost_center_ids))) AND ((ss.cnt_work_group = 0) OR (eb.work_group_id = ANY (ss.work_group_ids))) AND ((ss.cnt_employee_profile = 0) OR (eb.employee_profile_id = ANY (ss.employee_profile_ids))) AND ((ss.cnt_employee > 0) AND (eb.employee_id = ANY (ss.employee_ids)))) THEN 'BOTH'::text
                    WHEN ((((((((ss.cnt_company + ss.cnt_work_location) + ss.cnt_department) + ss.cnt_area) + ss.cnt_cost_center) + ss.cnt_work_group) + ss.cnt_employee_profile) > 0) AND ((ss.cnt_company = 0) OR (eb.company_id = ANY (ss.company_ids))) AND ((ss.cnt_work_location = 0) OR (eb.work_location_id = ANY (ss.work_location_ids))) AND ((ss.cnt_department = 0) OR (eb.department_id = ANY (ss.department_ids))) AND ((ss.cnt_area = 0) OR (eb.area_id = ANY (ss.area_ids))) AND ((ss.cnt_cost_center = 0) OR (eb.cost_center_id = ANY (ss.cost_center_ids))) AND ((ss.cnt_work_group = 0) OR (eb.work_group_id = ANY (ss.work_group_ids))) AND ((ss.cnt_employee_profile = 0) OR (eb.employee_profile_id = ANY (ss.employee_profile_ids)))) THEN 'STRUCTURAL'::text
                    WHEN ((ss.cnt_employee > 0) AND (eb.employee_id = ANY (ss.employee_ids))) THEN 'EMPLOYEE'::text
                    ELSE NULL::text
                END AS authorization_source,
            eb.employee_profile_id
           FROM (legacy_scope_sets ss
             JOIN employee_base eb ON ((eb.tenant_id = ss.tenant_id)))
          WHERE (((((((((ss.cnt_company + ss.cnt_work_location) + ss.cnt_department) + ss.cnt_area) + ss.cnt_cost_center) + ss.cnt_work_group) + ss.cnt_employee_profile) > 0) AND ((ss.cnt_company = 0) OR (eb.company_id = ANY (ss.company_ids))) AND ((ss.cnt_work_location = 0) OR (eb.work_location_id = ANY (ss.work_location_ids))) AND ((ss.cnt_department = 0) OR (eb.department_id = ANY (ss.department_ids))) AND ((ss.cnt_area = 0) OR (eb.area_id = ANY (ss.area_ids))) AND ((ss.cnt_cost_center = 0) OR (eb.cost_center_id = ANY (ss.cost_center_ids))) AND ((ss.cnt_work_group = 0) OR (eb.work_group_id = ANY (ss.work_group_ids))) AND ((ss.cnt_employee_profile = 0) OR (eb.employee_profile_id = ANY (ss.employee_profile_ids)))) OR ((ss.cnt_employee > 0) AND (eb.employee_id = ANY (ss.employee_ids))))
        ), rule_authorized AS (
         SELECT tur.tenant_id,
            tur.user_role_id,
            tur.user_id,
            tur.role_id,
            tur.role_key,
            eb.employee_id,
            eb.company_id,
            eb.work_location_id,
            eb.department_id,
            eb.area_id,
            eb.cost_center_id,
            eb.work_group_id,
            'STRUCTURAL'::text AS authorization_source,
            eb.employee_profile_id
           FROM ((target_user_roles tur
             JOIN public.user_role_scope_rules r ON (((r.tenant_id = tur.tenant_id) AND (r.user_role_id = tur.user_role_id) AND (r.is_active = true))))
             JOIN employee_base eb ON (((eb.tenant_id = r.tenant_id) AND (eb.company_id = r.company_id) AND ((r.work_location_id IS NULL) OR (eb.work_location_id = r.work_location_id)) AND ((r.department_id IS NULL) OR (eb.department_id = r.department_id)) AND ((r.area_id IS NULL) OR (eb.area_id = r.area_id)) AND ((r.cost_center_id IS NULL) OR (eb.cost_center_id = r.cost_center_id)) AND ((r.work_group_id IS NULL) OR (eb.work_group_id = r.work_group_id)) AND ((r.employee_profile_id IS NULL) OR (eb.employee_profile_id = r.employee_profile_id)))))
        )
 SELECT DISTINCT tenant_id,
    user_role_id,
    user_id,
    role_id,
    role_key,
    employee_id,
    company_id,
    work_location_id,
    department_id,
    area_id,
    cost_center_id,
    work_group_id,
    authorization_source,
    employee_profile_id
   FROM ( SELECT legacy_authorized.tenant_id,
            legacy_authorized.user_role_id,
            legacy_authorized.user_id,
            legacy_authorized.role_id,
            legacy_authorized.role_key,
            legacy_authorized.employee_id,
            legacy_authorized.company_id,
            legacy_authorized.work_location_id,
            legacy_authorized.department_id,
            legacy_authorized.area_id,
            legacy_authorized.cost_center_id,
            legacy_authorized.work_group_id,
            legacy_authorized.authorization_source,
            legacy_authorized.employee_profile_id
           FROM legacy_authorized
          WHERE (legacy_authorized.authorization_source IS NOT NULL)
        UNION ALL
         SELECT rule_authorized.tenant_id,
            rule_authorized.user_role_id,
            rule_authorized.user_id,
            rule_authorized.role_id,
            rule_authorized.role_key,
            rule_authorized.employee_id,
            rule_authorized.company_id,
            rule_authorized.work_location_id,
            rule_authorized.department_id,
            rule_authorized.area_id,
            rule_authorized.cost_center_id,
            rule_authorized.work_group_id,
            rule_authorized.authorization_source,
            rule_authorized.employee_profile_id
           FROM rule_authorized) authorized;


--
-- TOC entry 258 (class 1259 OID 36219)
-- Name: work_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    work_group_name character varying NOT NULL,
    work_group_short_name character varying NOT NULL,
    payroll_group_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    legacy_id character varying NOT NULL
);


--
-- TOC entry 303 (class 1259 OID 38219)
-- Name: work_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    company_id uuid,
    legacy_id character varying NOT NULL,
    work_location_name character varying NOT NULL,
    work_location_short_name character varying NOT NULL,
    country_id uuid,
    state_id uuid,
    city_id uuid,
    address_line1 character varying,
    geofence_polygon jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    time_zone character varying(80) DEFAULT 'America/Guayaquil'::character varying NOT NULL,
    CONSTRAINT work_locations_time_zone_not_blank_chk CHECK (((time_zone IS NULL) OR (btrim((time_zone)::text) <> ''::text)))
);


--
-- TOC entry 5596 (class 0 OID 0)
-- Dependencies: 303
-- Name: COLUMN work_locations.geofence_polygon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_locations.geofence_polygon IS 'Poligono de geocerca en formato GeoJSON Polygon/MultiPolygon para validar marcaciones por recinto.';


--
-- TOC entry 306 (class 1259 OID 38396)
-- Name: v_user_role_scopes_resolved; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_user_role_scopes_resolved AS
 SELECT urs.id,
    urs.tenant_id,
    urs.user_role_id,
    urs.scope_type_id,
    st.scope_type_key,
    st.scope_type_name,
    urs.scope_entity_id,
        CASE
            WHEN ((st.scope_type_key)::text = 'COMPANY'::text) THEN c.company_name
            WHEN ((st.scope_type_key)::text = 'WORK_LOCATION'::text) THEN wl.work_location_name
            WHEN ((st.scope_type_key)::text = 'DEPARTMENT'::text) THEN d.department_name
            WHEN ((st.scope_type_key)::text = 'AREA'::text) THEN a.area_name
            WHEN ((st.scope_type_key)::text = 'COST_CENTER'::text) THEN cc.cost_center_name
            WHEN ((st.scope_type_key)::text = 'WORK_GROUP'::text) THEN wg.work_group_name
            WHEN ((st.scope_type_key)::text = 'EMPLOYEE'::text) THEN (concat(e.employee_lastname, ' ', e.employee_name))::character varying
            ELSE NULL::character varying
        END AS scope_entity_name,
    urs.is_active,
    urs.created_by,
    urs.created_at,
    urs.updated_by,
    urs.updated_at
   FROM ((((((((public.user_role_scopes urs
     JOIN public.scope_types st ON ((st.id = urs.scope_type_id)))
     LEFT JOIN public.companies c ON ((((st.scope_type_key)::text = 'COMPANY'::text) AND (c.id = urs.scope_entity_id))))
     LEFT JOIN public.work_locations wl ON ((((st.scope_type_key)::text = 'WORK_LOCATION'::text) AND (wl.id = urs.scope_entity_id))))
     LEFT JOIN public.departments d ON ((((st.scope_type_key)::text = 'DEPARTMENT'::text) AND (d.id = urs.scope_entity_id))))
     LEFT JOIN public.areas a ON ((((st.scope_type_key)::text = 'AREA'::text) AND (a.id = urs.scope_entity_id))))
     LEFT JOIN public.cost_centers cc ON ((((st.scope_type_key)::text = 'COST_CENTER'::text) AND (cc.id = urs.scope_entity_id))))
     LEFT JOIN public.work_groups wg ON ((((st.scope_type_key)::text = 'WORK_GROUP'::text) AND (wg.id = urs.scope_entity_id))))
     LEFT JOIN public.employees e ON ((((st.scope_type_key)::text = 'EMPLOYEE'::text) AND (e.id = urs.scope_entity_id))));


--
-- TOC entry 305 (class 1259 OID 38391)
-- Name: v_user_roles_employee_scope_targets; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_user_roles_employee_scope_targets AS
 SELECT ur.id AS user_role_id,
    ur.tenant_id,
    ur.user_id,
    u.username,
    u.display_name,
    r.id AS role_id,
    r.role_key,
    r.role_name,
    ur.is_active AS user_role_is_active,
    r.is_active AS role_is_active,
    r.user_manager_role_id,
    r.is_org_scope_target,
    r.is_employee_access_target
   FROM ((public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
     JOIN public.users u ON ((u.id = ur.user_id)))
  WHERE ((ur.is_active = true) AND (r.is_active = true) AND ((r.is_org_scope_target = true) OR (r.is_employee_access_target = true)));


--
-- TOC entry 290 (class 1259 OID 37587)
-- Name: vw_available_settings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_available_settings AS
 SELECT lv.id AS lookup_value_id,
    ss.setting_key,
    ss.setting_name AS setting_label,
    ss.setting_short_key AS setting_short_label,
    lv.sort_order,
    lg.lookup_group_key,
    lg.lookup_group_label
   FROM ((public.system_settings ss
     JOIN public.lookup_values lv ON ((ss.value_type_id = lv.id)))
     JOIN public.lookup_groups lg ON ((lv.lookup_group_id = lg.id)));


--
-- TOC entry 298 (class 1259 OID 37836)
-- Name: work_pattern_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_pattern_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    work_pattern_id uuid NOT NULL,
    shift_id uuid NOT NULL,
    sequence_number integer NOT NULL,
    cycle_day_number integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT ck_work_pattern_shifts_cycle_day_positive CHECK ((cycle_day_number > 0)),
    CONSTRAINT ck_work_pattern_shifts_sequence_positive CHECK ((sequence_number > 0))
);


--
-- TOC entry 249 (class 1259 OID 36113)
-- Name: work_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    pattern_name character varying NOT NULL,
    pattern_short_name character varying NOT NULL,
    cycle_length_days integer NOT NULL,
    work_days_per_cycle integer NOT NULL,
    rest_days_per_cycle integer NOT NULL,
    daily_work_minutes integer NOT NULL,
    weekly_work_minutes_target integer NOT NULL,
    is_flexible boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone
);


--
-- TOC entry 4966 (class 2606 OID 35928)
-- Name: action_translations action_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_translations
    ADD CONSTRAINT action_translations_pkey PRIMARY KEY (id);


--
-- TOC entry 4932 (class 2606 OID 35810)
-- Name: actions actions_action_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actions
    ADD CONSTRAINT actions_action_key_key UNIQUE (action_key);


--
-- TOC entry 4934 (class 2606 OID 35808)
-- Name: actions actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actions
    ADD CONSTRAINT actions_pkey PRIMARY KEY (id);


--
-- TOC entry 5033 (class 2606 OID 36218)
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (id);


--
-- TOC entry 5011 (class 2606 OID 36135)
-- Name: attendance_events attendance_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_pkey PRIMARY KEY (id);


--
-- TOC entry 4974 (class 2606 OID 35966)
-- Name: attendance_movements attendance_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_movements
    ADD CONSTRAINT attendance_movements_pkey PRIMARY KEY (id);


--
-- TOC entry 5098 (class 2606 OID 36497)
-- Name: attendance_processing_runs attendance_processing_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_processing_runs
    ADD CONSTRAINT attendance_processing_runs_pkey PRIMARY KEY (id);


--
-- TOC entry 5049 (class 2606 OID 36305)
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- TOC entry 5135 (class 2606 OID 37663)
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- TOC entry 5015 (class 2606 OID 36147)
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- TOC entry 5082 (class 2606 OID 36449)
-- Name: company_settings company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4978 (class 2606 OID 35978)
-- Name: cost_centers cost_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_pkey PRIMARY KEY (id);


--
-- TOC entry 5124 (class 2606 OID 37620)
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- TOC entry 4980 (class 2606 OID 35988)
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- TOC entry 5154 (class 2606 OID 37877)
-- Name: employee_absence_requests employee_absence_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_absence_requests
    ADD CONSTRAINT employee_absence_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5119 (class 2606 OID 36585)
-- Name: employee_attendance_calculations employee_attendance_calculations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendance_calculations
    ADD CONSTRAINT employee_attendance_calculations_pkey PRIMARY KEY (id);


--
-- TOC entry 5100 (class 2606 OID 36508)
-- Name: employee_companies employee_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_companies
    ADD CONSTRAINT employee_companies_pkey PRIMARY KEY (id);


--
-- TOC entry 5168 (class 2606 OID 38053)
-- Name: employee_profile_attendance_events employee_profile_attendance_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profile_attendance_events
    ADD CONSTRAINT employee_profile_attendance_events_pkey PRIMARY KEY (id);


--
-- TOC entry 5086 (class 2606 OID 36461)
-- Name: employee_profile_settings employee_profile_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profile_settings
    ADD CONSTRAINT employee_profile_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 5045 (class 2606 OID 36286)
-- Name: employee_profile_work_patterns employee_profile_work_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profile_work_patterns
    ADD CONSTRAINT employee_profile_work_patterns_pkey PRIMARY KEY (id);


--
-- TOC entry 4982 (class 2606 OID 35998)
-- Name: employee_profiles employee_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profiles
    ADD CONSTRAINT employee_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5194 (class 2606 OID 45630)
-- Name: employee_route_tracking_points employee_route_tracking_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_route_tracking_points
    ADD CONSTRAINT employee_route_tracking_points_pkey PRIMARY KEY (id);


--
-- TOC entry 5090 (class 2606 OID 36475)
-- Name: employee_settings employee_settings_employee_setting_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_settings
    ADD CONSTRAINT employee_settings_employee_setting_uq UNIQUE (employee_id, system_setting_id);


--
-- TOC entry 5092 (class 2606 OID 36473)
-- Name: employee_settings employee_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_settings
    ADD CONSTRAINT employee_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 5159 (class 2606 OID 37939)
-- Name: employee_shift_change_requests employee_shift_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shift_change_requests
    ADD CONSTRAINT employee_shift_change_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5105 (class 2606 OID 36539)
-- Name: employee_shift_plans employee_shift_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shift_plans
    ADD CONSTRAINT employee_shift_plans_pkey PRIMARY KEY (id);


--
-- TOC entry 5177 (class 2606 OID 38326)
-- Name: employee_time_punch_change_requests employee_time_punch_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_time_punch_change_requests
    ADD CONSTRAINT employee_time_punch_change_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5121 (class 2606 OID 36595)
-- Name: employee_time_punches employee_time_punches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_time_punches
    ADD CONSTRAINT employee_time_punches_pkey PRIMARY KEY (id);


--
-- TOC entry 5017 (class 2606 OID 36158)
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- TOC entry 5051 (class 2606 OID 36318)
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- TOC entry 4984 (class 2606 OID 36008)
-- Name: job_titles job_titles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_titles
    ADD CONSTRAINT job_titles_pkey PRIMARY KEY (id);


--
-- TOC entry 5047 (class 2606 OID 36296)
-- Name: justification_types justification_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.justification_types
    ADD CONSTRAINT justification_types_pkey PRIMARY KEY (id);


--
-- TOC entry 4936 (class 2606 OID 35817)
-- Name: kv_store_e19f2094 kv_store_e19f2094_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kv_store_e19f2094
    ADD CONSTRAINT kv_store_e19f2094_pkey PRIMARY KEY (key);


--
-- TOC entry 4968 (class 2606 OID 35937)
-- Name: lookup_group_translations lookup_group_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_group_translations
    ADD CONSTRAINT lookup_group_translations_pkey PRIMARY KEY (id);


--
-- TOC entry 4938 (class 2606 OID 35830)
-- Name: lookup_groups lookup_groups_lookup_group_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_groups
    ADD CONSTRAINT lookup_groups_lookup_group_key_key UNIQUE (lookup_group_key);


--
-- TOC entry 4940 (class 2606 OID 35828)
-- Name: lookup_groups lookup_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_groups
    ADD CONSTRAINT lookup_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 5019 (class 2606 OID 36167)
-- Name: lookup_value_translations lookup_value_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_value_translations
    ADD CONSTRAINT lookup_value_translations_pkey PRIMARY KEY (id);


--
-- TOC entry 4986 (class 2606 OID 36021)
-- Name: lookup_values lookup_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_values
    ADD CONSTRAINT lookup_values_pkey PRIMARY KEY (id);


--
-- TOC entry 5037 (class 2606 OID 36242)
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 4990 (class 2606 OID 36033)
-- Name: payroll_groups payroll_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_groups
    ADD CONSTRAINT payroll_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 5070 (class 2606 OID 36393)
-- Name: report_executions report_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_executions
    ADD CONSTRAINT report_executions_pkey PRIMARY KEY (id);


--
-- TOC entry 5117 (class 2606 OID 36571)
-- Name: report_parameter_translations report_parameter_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_parameter_translations
    ADD CONSTRAINT report_parameter_translations_pkey PRIMARY KEY (id);


--
-- TOC entry 5072 (class 2606 OID 36406)
-- Name: report_parameters report_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_parameters
    ADD CONSTRAINT report_parameters_pkey PRIMARY KEY (id);


--
-- TOC entry 5074 (class 2606 OID 36418)
-- Name: report_permissions report_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_permissions
    ADD CONSTRAINT report_permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5076 (class 2606 OID 36428)
-- Name: report_scope_policies report_scope_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_scope_policies
    ADD CONSTRAINT report_scope_policies_pkey PRIMARY KEY (id);


--
-- TOC entry 5039 (class 2606 OID 36260)
-- Name: role_permission_copy_runs role_permission_copy_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permission_copy_runs
    ADD CONSTRAINT role_permission_copy_runs_pkey PRIMARY KEY (id);


--
-- TOC entry 5103 (class 2606 OID 36519)
-- Name: role_permission_snapshots role_permission_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permission_snapshots
    ADD CONSTRAINT role_permission_snapshots_pkey PRIMARY KEY (id);


--
-- TOC entry 5113 (class 2606 OID 36560)
-- Name: role_screen_actions role_screen_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_screen_actions
    ADD CONSTRAINT role_screen_actions_pkey PRIMARY KEY (id);


--
-- TOC entry 4992 (class 2606 OID 36051)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 4942 (class 2606 OID 35840)
-- Name: scope_types scope_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scope_types
    ADD CONSTRAINT scope_types_pkey PRIMARY KEY (id);


--
-- TOC entry 4944 (class 2606 OID 35842)
-- Name: scope_types scope_types_scope_type_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scope_types
    ADD CONSTRAINT scope_types_scope_type_key_key UNIQUE (scope_type_key);


--
-- TOC entry 5064 (class 2606 OID 36372)
-- Name: screen_actions screen_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screen_actions
    ADD CONSTRAINT screen_actions_pkey PRIMARY KEY (id);


--
-- TOC entry 5068 (class 2606 OID 36383)
-- Name: screen_translations screen_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screen_translations
    ADD CONSTRAINT screen_translations_pkey PRIMARY KEY (id);


--
-- TOC entry 5021 (class 2606 OID 36180)
-- Name: screens screens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screens
    ADD CONSTRAINT screens_pkey PRIMARY KEY (id);


--
-- TOC entry 5023 (class 2606 OID 36182)
-- Name: screens screens_screen_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screens
    ADD CONSTRAINT screens_screen_key_key UNIQUE (screen_key);


--
-- TOC entry 5145 (class 2606 OID 37742)
-- Name: shift_constructor_blocks shift_constructor_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_constructor_blocks
    ADD CONSTRAINT shift_constructor_blocks_pkey PRIMARY KEY (id);


--
-- TOC entry 5140 (class 2606 OID 37714)
-- Name: shift_constructors shift_constructors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_constructors
    ADD CONSTRAINT shift_constructors_pkey PRIMARY KEY (id);


--
-- TOC entry 5054 (class 2606 OID 36331)
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- TOC entry 5129 (class 2606 OID 37639)
-- Name: states states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.states
    ADD CONSTRAINT states_pkey PRIMARY KEY (id);


--
-- TOC entry 4946 (class 2606 OID 35860)
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- TOC entry 4948 (class 2606 OID 35862)
-- Name: subscription_plans subscription_plans_plan_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_plan_key_key UNIQUE (plan_key);


--
-- TOC entry 4950 (class 2606 OID 35872)
-- Name: system_languages system_languages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_languages
    ADD CONSTRAINT system_languages_pkey PRIMARY KEY (code);


--
-- TOC entry 4970 (class 2606 OID 35946)
-- Name: system_menu_group_translations system_menu_group_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_menu_group_translations
    ADD CONSTRAINT system_menu_group_translations_pkey PRIMARY KEY (id);


--
-- TOC entry 4952 (class 2606 OID 35885)
-- Name: system_menu_groups system_menu_groups_menu_group_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_menu_groups
    ADD CONSTRAINT system_menu_groups_menu_group_key_key UNIQUE (menu_group_key);


--
-- TOC entry 4954 (class 2606 OID 35883)
-- Name: system_menu_groups system_menu_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_menu_groups
    ADD CONSTRAINT system_menu_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 4956 (class 2606 OID 35897)
-- Name: system_message_keys system_message_keys_message_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_message_keys
    ADD CONSTRAINT system_message_keys_message_key_key UNIQUE (message_key);


--
-- TOC entry 4958 (class 2606 OID 35895)
-- Name: system_message_keys system_message_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_message_keys
    ADD CONSTRAINT system_message_keys_pkey PRIMARY KEY (id);


--
-- TOC entry 4972 (class 2606 OID 35956)
-- Name: system_message_translations system_message_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_message_translations
    ADD CONSTRAINT system_message_translations_pkey PRIMARY KEY (message_key, language_code);


--
-- TOC entry 5078 (class 2606 OID 36437)
-- Name: system_report_translations system_report_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_report_translations
    ADD CONSTRAINT system_report_translations_pkey PRIMARY KEY (id);


--
-- TOC entry 5025 (class 2606 OID 36193)
-- Name: system_reports system_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_reports
    ADD CONSTRAINT system_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 5027 (class 2606 OID 36195)
-- Name: system_reports system_reports_report_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_reports
    ADD CONSTRAINT system_reports_report_code_key UNIQUE (report_code);


--
-- TOC entry 5029 (class 2606 OID 36206)
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 5031 (class 2606 OID 36208)
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- TOC entry 4996 (class 2606 OID 36062)
-- Name: tenant_language_settings tenant_language_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_language_settings
    ADD CONSTRAINT tenant_language_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4998 (class 2606 OID 36064)
-- Name: tenant_language_settings tenant_language_settings_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_language_settings
    ADD CONSTRAINT tenant_language_settings_tenant_id_key UNIQUE (tenant_id);


--
-- TOC entry 5000 (class 2606 OID 36074)
-- Name: tenant_members tenant_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_members
    ADD CONSTRAINT tenant_members_pkey PRIMARY KEY (id);


--
-- TOC entry 5041 (class 2606 OID 36274)
-- Name: tenant_onboarding tenant_onboarding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_onboarding
    ADD CONSTRAINT tenant_onboarding_pkey PRIMARY KEY (id);


--
-- TOC entry 5043 (class 2606 OID 36276)
-- Name: tenant_onboarding tenant_onboarding_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_onboarding
    ADD CONSTRAINT tenant_onboarding_tenant_id_key UNIQUE (tenant_id);


--
-- TOC entry 5094 (class 2606 OID 36485)
-- Name: tenant_settings tenant_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 5002 (class 2606 OID 36089)
-- Name: tenant_subscriptions tenant_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_pkey PRIMARY KEY (id);


--
-- TOC entry 4960 (class 2606 OID 35908)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 4962 (class 2606 OID 35910)
-- Name: tenants tenants_tenant_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_tenant_key_key UNIQUE (tenant_key);


--
-- TOC entry 5058 (class 2606 OID 36341)
-- Name: time_clock_devices time_clock_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_clock_devices
    ADD CONSTRAINT time_clock_devices_pkey PRIMARY KEY (id);


--
-- TOC entry 5060 (class 2606 OID 36352)
-- Name: time_surcharge_rules time_surcharge_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_surcharge_rules
    ADD CONSTRAINT time_surcharge_rules_pkey PRIMARY KEY (id);


--
-- TOC entry 5013 (class 2606 OID 36137)
-- Name: attendance_events uq_attendance_events_tenant_short_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT uq_attendance_events_tenant_short_name UNIQUE (tenant_id, event_short_name);

CREATE UNIQUE INDEX uq_attendance_events_late_behavior
    ON public.attendance_events USING btree (tenant_id) WHERE (tracks_late_arrival AND is_active);
CREATE UNIQUE INDEX uq_attendance_events_early_behavior
    ON public.attendance_events USING btree (tenant_id) WHERE (tracks_early_departure AND is_active);
CREATE UNIQUE INDEX uq_attendance_events_absence_behavior
    ON public.attendance_events USING btree (tenant_id) WHERE (tracks_absence AND is_active);
CREATE UNIQUE INDEX uq_attendance_events_odd_punch_behavior
    ON public.attendance_events USING btree (tenant_id) WHERE (tracks_odd_punch AND is_active);


--
-- TOC entry 4976 (class 2606 OID 35968)
-- Name: attendance_movements uq_attendance_movements_tenant_short_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_movements
    ADD CONSTRAINT uq_attendance_movements_tenant_short_name UNIQUE (tenant_id, movement_short_name);


--
-- TOC entry 5137 (class 2606 OID 37665)
-- Name: cities uq_cities; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT uq_cities UNIQUE NULLS NOT DISTINCT (tenant_id, state_id, city_key);


--
-- TOC entry 5084 (class 2606 OID 36451)
-- Name: company_settings uq_company_settings_company_setting; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT uq_company_settings_company_setting UNIQUE (company_id, system_setting_id);


--
-- TOC entry 5127 (class 2606 OID 37622)
-- Name: countries uq_countries; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT uq_countries UNIQUE NULLS NOT DISTINCT (tenant_id, country_key);


--
-- TOC entry 5172 (class 2606 OID 38055)
-- Name: employee_profile_attendance_events uq_employee_profile_attendance_events_profile_event; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profile_attendance_events
    ADD CONSTRAINT uq_employee_profile_attendance_events_profile_event UNIQUE (tenant_id, employee_profile_id, attendance_event_id);


--
-- TOC entry 5088 (class 2606 OID 36463)
-- Name: employee_profile_settings uq_employee_profile_settings_profile_setting; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profile_settings
    ADD CONSTRAINT uq_employee_profile_settings_profile_setting UNIQUE (tenant_id, employee_profile_id, system_setting_id);


--
-- TOC entry 4988 (class 2606 OID 36023)
-- Name: lookup_values uq_lookup_values; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_values
    ADD CONSTRAINT uq_lookup_values UNIQUE NULLS NOT DISTINCT (tenant_id, lookup_group_id, lookup_key, lookup_scope);


--
-- TOC entry 5115 (class 2606 OID 36562)
-- Name: role_screen_actions uq_role_screen_actions; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_screen_actions
    ADD CONSTRAINT uq_role_screen_actions UNIQUE (tenant_id, role_id, screen_action_id);


--
-- TOC entry 4994 (class 2606 OID 36053)
-- Name: roles uq_roles_tenant_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT uq_roles_tenant_role_key UNIQUE (tenant_id, role_key);


--
-- TOC entry 5066 (class 2606 OID 36374)
-- Name: screen_actions uq_screen_actions_screen_action; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screen_actions
    ADD CONSTRAINT uq_screen_actions_screen_action UNIQUE (screen_id, action_id);


--
-- TOC entry 5142 (class 2606 OID 37716)
-- Name: shift_constructors uq_shift_constructors_tenant_shift; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_constructors
    ADD CONSTRAINT uq_shift_constructors_tenant_shift UNIQUE (tenant_id, shift_id);


--
-- TOC entry 5131 (class 2606 OID 37641)
-- Name: states uq_states; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.states
    ADD CONSTRAINT uq_states UNIQUE NULLS NOT DISTINCT (tenant_id, country_id, state_key);


--
-- TOC entry 5133 (class 2606 OID 37682)
-- Name: states uq_states_country_id_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.states
    ADD CONSTRAINT uq_states_country_id_id UNIQUE (country_id, id);


--
-- TOC entry 5080 (class 2606 OID 36439)
-- Name: system_report_translations uq_system_report_translations; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_report_translations
    ADD CONSTRAINT uq_system_report_translations UNIQUE (system_report_id, language_code);


--
-- TOC entry 5096 (class 2606 OID 36487)
-- Name: tenant_settings uq_tenant_settings_tenant_setting; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT uq_tenant_settings_tenant_setting UNIQUE (tenant_id, system_setting_id);


--
-- TOC entry 5148 (class 2606 OID 37851)
-- Name: work_pattern_shifts uq_work_pattern_shifts_pattern_cycle_day; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_pattern_shifts
    ADD CONSTRAINT uq_work_pattern_shifts_pattern_cycle_day UNIQUE (work_pattern_id, cycle_day_number);


--
-- TOC entry 5150 (class 2606 OID 37849)
-- Name: work_pattern_shifts uq_work_pattern_shifts_pattern_sequence; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_pattern_shifts
    ADD CONSTRAINT uq_work_pattern_shifts_pattern_sequence UNIQUE (work_pattern_id, sequence_number);


--
-- TOC entry 5166 (class 2606 OID 37990)
-- Name: user_notifications user_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5184 (class 2606 OID 38423)
-- Name: user_role_employee_assignments user_role_employee_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_employee_assignments
    ADD CONSTRAINT user_role_employee_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 5192 (class 2606 OID 45506)
-- Name: user_role_scope_rules user_role_scope_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_scope_rules
    ADD CONSTRAINT user_role_scope_rules_pkey PRIMARY KEY (id);


--
-- TOC entry 5111 (class 2606 OID 36549)
-- Name: user_role_scopes user_role_scopes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_scopes
    ADD CONSTRAINT user_role_scopes_pkey PRIMARY KEY (id);


--
-- TOC entry 5062 (class 2606 OID 36362)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5004 (class 2606 OID 36102)
-- Name: users users_auth_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_auth_user_id_key UNIQUE (auth_user_id);

CREATE UNIQUE INDEX uq_users_active_email
    ON public.users USING btree (lower((email)::text))
    WHERE is_active = true AND email IS NOT NULL;


--
-- TOC entry 5006 (class 2606 OID 36100)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4964 (class 2606 OID 35919)
-- Name: v_super_admin_role_id v_super_admin_role_id_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.v_super_admin_role_id
    ADD CONSTRAINT v_super_admin_role_id_pkey PRIMARY KEY (id);


--
-- TOC entry 5035 (class 2606 OID 36228)
-- Name: work_groups work_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_groups
    ADD CONSTRAINT work_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 5175 (class 2606 OID 38228)
-- Name: work_locations work_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_locations
    ADD CONSTRAINT work_locations_pkey PRIMARY KEY (id);


--
-- TOC entry 5152 (class 2606 OID 37847)
-- Name: work_pattern_shifts work_pattern_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_pattern_shifts
    ADD CONSTRAINT work_pattern_shifts_pkey PRIMARY KEY (id);


--
-- TOC entry 5009 (class 2606 OID 36123)
-- Name: work_patterns work_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_patterns
    ADD CONSTRAINT work_patterns_pkey PRIMARY KEY (id);


--
-- TOC entry 5125 (class 1259 OID 37628)
-- Name: idx_countries_active_label; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_areas_tenant_legacy_id ON public.areas USING btree (tenant_id, legacy_id) WHERE (legacy_id IS NOT NULL);


--
-- TOC entry 0 (class 1259 OID 0)
-- Name: ux_companies_tenant_legacy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_companies_tenant_legacy_id ON public.companies USING btree (tenant_id, legacy_id) WHERE (legacy_id IS NOT NULL);


--
-- TOC entry 0 (class 1259 OID 0)
-- Name: ux_cost_centers_tenant_legacy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_cost_centers_tenant_legacy_id ON public.cost_centers USING btree (tenant_id, legacy_id) WHERE (legacy_id IS NOT NULL);


--
-- TOC entry 0 (class 1259 OID 0)
-- Name: ux_departments_tenant_legacy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_departments_tenant_legacy_id ON public.departments USING btree (tenant_id, legacy_id) WHERE (legacy_id IS NOT NULL);


--
-- TOC entry 0 (class 1259 OID 0)
-- Name: ux_employee_profiles_tenant_legacy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_employee_profiles_tenant_legacy_id ON public.employee_profiles USING btree (tenant_id, legacy_id) WHERE (legacy_id IS NOT NULL);


--
-- TOC entry 0 (class 1259 OID 0)
-- Name: ux_job_titles_tenant_legacy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_job_titles_tenant_legacy_id ON public.job_titles USING btree (tenant_id, legacy_id) WHERE (legacy_id IS NOT NULL);


--
-- TOC entry 0 (class 1259 OID 0)
-- Name: ux_payroll_groups_tenant_legacy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_payroll_groups_tenant_legacy_id ON public.payroll_groups USING btree (tenant_id, legacy_id) WHERE (legacy_id IS NOT NULL);


--
-- TOC entry 0 (class 1259 OID 0)
-- Name: ux_work_groups_tenant_legacy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_work_groups_tenant_legacy_id ON public.work_groups USING btree (tenant_id, legacy_id) WHERE (legacy_id IS NOT NULL);


--
-- TOC entry 0 (class 1259 OID 0)
-- Name: ux_work_locations_tenant_legacy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_work_locations_tenant_legacy_id ON public.work_locations USING btree (tenant_id, legacy_id) WHERE (legacy_id IS NOT NULL);


--
-- TOC entry 0 (class 1259 OID 0)
-- Name: idx_countries_active_label; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_countries_active_label ON public.countries USING btree (is_active, country_label);


--
-- TOC entry 5155 (class 1259 OID 37925)
-- Name: idx_employee_absence_requests_approved_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_absence_requests_approved_at ON public.employee_absence_requests USING btree (approved_at);


--
-- TOC entry 5156 (class 1259 OID 37924)
-- Name: idx_employee_absence_requests_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_absence_requests_approved_by ON public.employee_absence_requests USING btree (approved_by);


--
-- TOC entry 5157 (class 1259 OID 37918)
-- Name: idx_employee_absence_requests_justify_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_absence_requests_justify_method ON public.employee_absence_requests USING btree (justify_method_id);

CREATE INDEX idx_employee_absence_requests_target_punch ON public.employee_absence_requests USING btree (tenant_id, target_punch_id) WHERE (target_punch_id IS NOT NULL);


--
-- TOC entry 5101 (class 1259 OID 38390)
-- Name: idx_employee_companies_scope_matrix_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_companies_scope_matrix_active ON public.employee_companies USING btree (tenant_id, company_id, work_location_id, department_id, area_id, cost_center_id, work_group_id, employee_id) WHERE (is_active = true);


--
-- TOC entry 5106 (class 1259 OID 37779)
-- Name: idx_employee_shift_plans_employee_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_shift_plans_employee_date ON public.employee_shift_plans USING btree (employee_id, shift_date);


--
-- TOC entry 5107 (class 1259 OID 37778)
-- Name: idx_employee_shift_plans_tenant_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_shift_plans_tenant_date ON public.employee_shift_plans USING btree (tenant_id, shift_date, is_active);


--
-- TOC entry 5122 (class 1259 OID 40770)
-- Name: idx_employee_time_punches_punch_time_zone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_time_punches_punch_time_zone ON public.employee_time_punches USING btree (punch_time_zone);

--
-- Name: idx_employee_time_punches_client_app_instance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_time_punches_client_app_instance ON public.employee_time_punches USING btree (tenant_id, client_app_instance_id) WHERE (client_app_instance_id IS NOT NULL);


--
-- Name: idx_employee_time_punches_client_device_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_time_punches_client_device_type ON public.employee_time_punches USING btree (tenant_id, client_device_type) WHERE (client_device_type IS NOT NULL);


--
-- Name: idx_employee_time_punches_client_metadata_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_time_punches_client_metadata_gin ON public.employee_time_punches USING gin (client_metadata) WHERE (client_metadata IS NOT NULL);


--
-- TOC entry 5169 (class 1259 OID 38072)
-- Name: idx_epae_tenant_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epae_tenant_event ON public.employee_profile_attendance_events USING btree (tenant_id, attendance_event_id);


--
-- TOC entry 5170 (class 1259 OID 38071)
-- Name: idx_epae_tenant_profile_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epae_tenant_profile_active ON public.employee_profile_attendance_events USING btree (tenant_id, employee_profile_id, is_active);


--
-- TOC entry 5052 (class 1259 OID 38447)
-- Name: idx_holidays_holiday_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holidays_holiday_type_id ON public.holidays USING btree (holiday_type_id);


--
-- TOC entry 5195 (class 1259 OID 45659)
-- Name: idx_route_tracking_lat_long; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_route_tracking_lat_long ON public.employee_route_tracking_points USING btree (latitud, longitud);


--
-- TOC entry 5196 (class 1259 OID 45658)
-- Name: idx_route_tracking_nearest_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_route_tracking_nearest_location ON public.employee_route_tracking_points USING btree (nearest_work_location_id);


--
-- TOC entry 5197 (class 1259 OID 45657)
-- Name: idx_route_tracking_tenant_company_datetime; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_route_tracking_tenant_company_datetime ON public.employee_route_tracking_points USING btree (tenant_id, company_id, tracking_datetime DESC);


--
-- TOC entry 5198 (class 1259 OID 45656)
-- Name: idx_route_tracking_tenant_employee_datetime; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_route_tracking_tenant_employee_datetime ON public.employee_route_tracking_points USING btree (tenant_id, employee_id, tracking_datetime DESC);

CREATE INDEX idx_roles_user_manager_role ON public.roles USING btree (tenant_id, user_manager_role_id, is_active);

CREATE INDEX idx_roles_user_scope_targets ON public.roles USING btree (tenant_id, is_org_scope_target, is_employee_access_target, is_active);

CREATE UNIQUE INDEX uq_roles_tenant_administrator ON public.roles USING btree (tenant_id) WHERE (is_tenant_administrator AND is_active);

CREATE UNIQUE INDEX uq_roles_employee_self_service ON public.roles USING btree (tenant_id) WHERE (is_employee_self_service AND is_active);


--
-- TOC entry 5160 (class 1259 OID 37977)
-- Name: idx_shift_change_req_approver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shift_change_req_approver ON public.employee_shift_change_requests USING btree (approved_by, approved_at DESC);


--
-- TOC entry 5161 (class 1259 OID 37975)
-- Name: idx_shift_change_req_tenant_employee_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shift_change_req_tenant_employee_date ON public.employee_shift_change_requests USING btree (tenant_id, employee_id, shift_date);


--
-- TOC entry 5162 (class 1259 OID 37976)
-- Name: idx_shift_change_req_tenant_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shift_change_req_tenant_status ON public.employee_shift_change_requests USING btree (tenant_id, request_status_id, created_at DESC);


--
-- TOC entry 5143 (class 1259 OID 37753)
-- Name: idx_shift_constructor_blocks_constructor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shift_constructor_blocks_constructor ON public.shift_constructor_blocks USING btree (constructor_id, sort_order, start_minutes);


--
-- TOC entry 5138 (class 1259 OID 37727)
-- Name: idx_shift_constructors_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shift_constructors_tenant ON public.shift_constructors USING btree (tenant_id);


--
-- TOC entry 5055 (class 1259 OID 38081)
-- Name: idx_time_clock_devices_lat_lon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_clock_devices_lat_lon ON public.time_clock_devices USING btree (latitude, longitude);


--
-- TOC entry 5056 (class 1259 OID 38080)
-- Name: idx_time_clock_devices_work_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_clock_devices_work_location ON public.time_clock_devices USING btree (work_location_id);


--
-- TOC entry 5178 (class 1259 OID 38365)
-- Name: idx_tpcr_approved_by_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tpcr_approved_by_date ON public.employee_time_punch_change_requests USING btree (approved_by, approved_at DESC);


--
-- TOC entry 5179 (class 1259 OID 38364)
-- Name: idx_tpcr_target_punch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tpcr_target_punch ON public.employee_time_punch_change_requests USING btree (target_punch_id);


--
-- TOC entry 5180 (class 1259 OID 38362)
-- Name: idx_tpcr_tenant_employee_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tpcr_tenant_employee_created ON public.employee_time_punch_change_requests USING btree (tenant_id, employee_id, created_at DESC);


--
-- TOC entry 5181 (class 1259 OID 38363)
-- Name: idx_tpcr_tenant_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tpcr_tenant_status_created ON public.employee_time_punch_change_requests USING btree (tenant_id, request_status_id, created_at DESC);


--
-- TOC entry 5163 (class 1259 OID 38007)
-- Name: idx_user_notifications_tenant_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_tenant_type ON public.user_notifications USING btree (tenant_id, notification_type_id, created_at DESC);


--
-- TOC entry 5164 (class 1259 OID 38006)
-- Name: idx_user_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_user_unread ON public.user_notifications USING btree (user_id, is_read, created_at DESC);


--
-- TOC entry 5182 (class 1259 OID 38440)
-- Name: idx_user_role_employee_assignments_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_role_employee_assignments_active ON public.user_role_employee_assignments USING btree (tenant_id, user_role_id, is_active, employee_id);


--
-- TOC entry 5186 (class 1259 OID 45553)
-- Name: idx_user_role_scope_rules_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_role_scope_rules_company ON public.user_role_scope_rules USING btree (tenant_id, company_id, is_active);


--
-- TOC entry 5187 (class 1259 OID 45554)
-- Name: idx_user_role_scope_rules_hierarchy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_role_scope_rules_hierarchy ON public.user_role_scope_rules USING btree (tenant_id, company_id, work_location_id, department_id, area_id, cost_center_id, work_group_id, employee_profile_id) WHERE (is_active = true);


--
-- TOC entry 5188 (class 1259 OID 45556)
-- Name: idx_user_role_scope_rules_hierarchy_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_role_scope_rules_hierarchy_active ON public.user_role_scope_rules USING btree (tenant_id, company_id, work_location_id, department_id, area_id, cost_center_id, work_group_id, employee_profile_id) WHERE (is_active = true);


--
-- TOC entry 5189 (class 1259 OID 45552)
-- Name: idx_user_role_scope_rules_tenant_role_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_role_scope_rules_tenant_role_active ON public.user_role_scope_rules USING btree (tenant_id, user_role_id, is_active);


--
-- TOC entry 5108 (class 1259 OID 38389)
-- Name: idx_user_role_scopes_scope_type_entity_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_role_scopes_scope_type_entity_active ON public.user_role_scopes USING btree (scope_type_id, scope_entity_id) WHERE (is_active = true);


--
-- TOC entry 5109 (class 1259 OID 38388)
-- Name: idx_user_role_scopes_tenant_role_type_entity_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_role_scopes_tenant_role_type_entity_active ON public.user_role_scopes USING btree (tenant_id, user_role_id, scope_type_id, scope_entity_id) WHERE (is_active = true);


--
-- TOC entry 5173 (class 1259 OID 40769)
-- Name: idx_work_locations_time_zone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_locations_time_zone ON public.work_locations USING btree (time_zone);


--
-- TOC entry 5146 (class 1259 OID 37867)
-- Name: idx_work_pattern_shifts_pattern; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_pattern_shifts_pattern ON public.work_pattern_shifts USING btree (work_pattern_id, sequence_number);


--
-- TOC entry 5007 (class 1259 OID 37780)
-- Name: idx_work_patterns_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_patterns_tenant ON public.work_patterns USING btree (tenant_id, is_active, pattern_name);


--
-- TOC entry 5190 (class 1259 OID 45555)
-- Name: uq_user_role_scope_rules_active_rule; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_user_role_scope_rules_active_rule ON public.user_role_scope_rules USING btree (tenant_id, user_role_id, company_id, COALESCE(work_location_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(department_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(area_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(cost_center_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(work_group_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(employee_profile_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE (is_active = true);


--
-- TOC entry 5185 (class 1259 OID 38439)
-- Name: ux_user_role_employee_assignments_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_user_role_employee_assignments_key ON public.user_role_employee_assignments USING btree (tenant_id, user_role_id, employee_id);


--
-- TOC entry 5199 (class 2606 OID 36596)
-- Name: action_translations action_translations_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_translations
    ADD CONSTRAINT action_translations_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.actions(id);


--
-- TOC entry 5200 (class 2606 OID 36601)
-- Name: action_translations action_translations_language_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_translations
    ADD CONSTRAINT action_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.system_languages(code);


--
-- TOC entry 5247 (class 2606 OID 36846)
-- Name: areas areas_payroll_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_payroll_group_id_fkey FOREIGN KEY (payroll_group_id) REFERENCES public.payroll_groups(id);


--
-- TOC entry 5248 (class 2606 OID 36841)
-- Name: areas areas_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5228 (class 2606 OID 36766)
-- Name: attendance_events attendance_events_calculation_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_calculation_method_id_fkey FOREIGN KEY (calculation_method_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5229 (class 2606 OID 36756)
-- Name: attendance_events attendance_events_event_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5230 (class 2606 OID 36761)
-- Name: attendance_events attendance_events_movement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_movement_id_fkey FOREIGN KEY (movement_id) REFERENCES public.attendance_movements(id);


--
-- TOC entry 5231 (class 2606 OID 36746)
-- Name: attendance_events attendance_events_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5232 (class 2606 OID 36751)
-- Name: attendance_events attendance_events_transaction_direction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_transaction_direction_id_fkey FOREIGN KEY (transaction_direction_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5209 (class 2606 OID 36646)
-- Name: attendance_movements attendance_movements_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_movements
    ADD CONSTRAINT attendance_movements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5321 (class 2606 OID 37236)
-- Name: attendance_processing_runs attendance_processing_runs_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_processing_runs
    ADD CONSTRAINT attendance_processing_runs_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id);


--
-- TOC entry 5322 (class 2606 OID 37216)
-- Name: attendance_processing_runs attendance_processing_runs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_processing_runs
    ADD CONSTRAINT attendance_processing_runs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5323 (class 2606 OID 37241)
-- Name: attendance_processing_runs attendance_processing_runs_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_processing_runs
    ADD CONSTRAINT attendance_processing_runs_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);


--
-- TOC entry 5324 (class 2606 OID 37231)
-- Name: attendance_processing_runs attendance_processing_runs_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_processing_runs
    ADD CONSTRAINT attendance_processing_runs_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- TOC entry 5325 (class 2606 OID 37256)
-- Name: attendance_processing_runs attendance_processing_runs_executed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_processing_runs
    ADD CONSTRAINT attendance_processing_runs_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES public.users(id);


--
-- TOC entry 5326 (class 2606 OID 37221)
-- Name: attendance_processing_runs attendance_processing_runs_payroll_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_processing_runs
    ADD CONSTRAINT attendance_processing_runs_payroll_group_id_fkey FOREIGN KEY (payroll_group_id) REFERENCES public.payroll_groups(id);


--
-- TOC entry 5327 (class 2606 OID 37251)
-- Name: attendance_processing_runs attendance_processing_runs_process_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_processing_runs
    ADD CONSTRAINT attendance_processing_runs_process_status_id_fkey FOREIGN KEY (process_status_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5328 (class 2606 OID 37246)
-- Name: attendance_processing_runs attendance_processing_runs_process_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_processing_runs
    ADD CONSTRAINT attendance_processing_runs_process_type_id_fkey FOREIGN KEY (process_type_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5329 (class 2606 OID 37211)
-- Name: attendance_processing_runs attendance_processing_runs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_processing_runs
    ADD CONSTRAINT attendance_processing_runs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5265 (class 2606 OID 36941)
-- Name: audit_log audit_log_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5266 (class 2606 OID 36931)
-- Name: audit_log audit_log_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5267 (class 2606 OID 36936)
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5377 (class 2606 OID 37671)
-- Name: cities cities_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- TOC entry 5378 (class 2606 OID 37683)
-- Name: cities cities_country_state_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_country_state_fkey FOREIGN KEY (country_id, state_id) REFERENCES public.states(country_id, id);


--
-- TOC entry 5379 (class 2606 OID 37676)
-- Name: cities cities_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.states(id);


--
-- TOC entry 5380 (class 2606 OID 37666)
-- Name: cities cities_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5233 (class 2606 OID 45469)
-- Name: companies companies_company_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_company_city_id_fkey FOREIGN KEY (company_city_id) REFERENCES public.cities(id);


--
-- TOC entry 5234 (class 2606 OID 45459)
-- Name: companies companies_company_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_company_country_id_fkey FOREIGN KEY (company_country_id) REFERENCES public.countries(id);


--
-- TOC entry 5235 (class 2606 OID 45464)
-- Name: companies companies_company_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_company_state_id_fkey FOREIGN KEY (company_state_id) REFERENCES public.states(id);


--
-- TOC entry 5236 (class 2606 OID 36771)
-- Name: companies companies_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5309 (class 2606 OID 37156)
-- Name: company_settings company_settings_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5310 (class 2606 OID 37161)
-- Name: company_settings company_settings_system_setting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_system_setting_id_fkey FOREIGN KEY (system_setting_id) REFERENCES public.system_settings(id);


--
-- TOC entry 5311 (class 2606 OID 37151)
-- Name: company_settings company_settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5210 (class 2606 OID 36651)
-- Name: cost_centers cost_centers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5374 (class 2606 OID 37623)
-- Name: countries countries_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5211 (class 2606 OID 36656)
-- Name: departments departments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5388 (class 2606 OID 37919)
-- Name: employee_absence_requests employee_absence_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_absence_requests
    ADD CONSTRAINT employee_absence_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- TOC entry 5389 (class 2606 OID 37878)
-- Name: employee_absence_requests employee_absence_requests_attendance_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_absence_requests
    ADD CONSTRAINT employee_absence_requests_attendance_event_id_fkey FOREIGN KEY (attendance_event_id) REFERENCES public.attendance_events(id);


--
-- TOC entry 5390 (class 2606 OID 37883)
-- Name: employee_absence_requests employee_absence_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_absence_requests
    ADD CONSTRAINT employee_absence_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5391 (class 2606 OID 37888)
-- Name: employee_absence_requests employee_absence_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_absence_requests
    ADD CONSTRAINT employee_absence_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- TOC entry 5392 (class 2606 OID 37898)
-- Name: employee_absence_requests employee_absence_requests_justification_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_absence_requests
    ADD CONSTRAINT employee_absence_requests_justification_type_id_fkey FOREIGN KEY (justification_type_id) REFERENCES public.justification_types(id);


--
-- TOC entry 5393 (class 2606 OID 37913)
-- Name: employee_absence_requests employee_absence_requests_justify_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_absence_requests
    ADD CONSTRAINT employee_absence_requests_justify_method_id_fkey FOREIGN KEY (justify_method_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5394 (class 2606 OID 37893)
-- Name: employee_absence_requests employee_absence_requests_request_justify_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_absence_requests
    ADD CONSTRAINT employee_absence_requests_request_justify_method_id_fkey FOREIGN KEY (justify_method_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5395 (class 2606 OID 37903)
-- Name: employee_absence_requests employee_absence_requests_request_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_absence_requests
    ADD CONSTRAINT employee_absence_requests_request_status_id_fkey FOREIGN KEY (request_status_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5396 (class 2606 OID 37908)
-- Name: employee_absence_requests employee_absence_requests_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_absence_requests
    ADD CONSTRAINT employee_absence_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


ALTER TABLE ONLY public.employee_absence_requests
    ADD CONSTRAINT employee_absence_requests_target_punch_id_fkey FOREIGN KEY (target_punch_id) REFERENCES public.employee_time_punches(id) ON DELETE SET NULL;


--
-- TOC entry 5358 (class 2606 OID 37476)
-- Name: employee_attendance_calculations employee_attendance_calculatio_covered_attendance_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendance_calculations
    ADD CONSTRAINT employee_attendance_calculatio_covered_attendance_event_id_fkey FOREIGN KEY (covered_attendance_event_id) REFERENCES public.attendance_events(id);


--
-- TOC entry 5359 (class 2606 OID 37456)
-- Name: employee_attendance_calculations employee_attendance_calculations_attendance_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendance_calculations
    ADD CONSTRAINT employee_attendance_calculations_attendance_event_id_fkey FOREIGN KEY (attendance_event_id) REFERENCES public.attendance_events(id);


--
-- TOC entry 5360 (class 2606 OID 37446)
-- Name: employee_attendance_calculations employee_attendance_calculations_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendance_calculations
    ADD CONSTRAINT employee_attendance_calculations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5361 (class 2606 OID 37466)
-- Name: employee_attendance_calculations employee_attendance_calculations_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendance_calculations
    ADD CONSTRAINT employee_attendance_calculations_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);


--
-- TOC entry 5362 (class 2606 OID 37451)
-- Name: employee_attendance_calculations employee_attendance_calculations_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendance_calculations
    ADD CONSTRAINT employee_attendance_calculations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- TOC entry 5363 (class 2606 OID 37471)
-- Name: employee_attendance_calculations employee_attendance_calculations_justification_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendance_calculations
    ADD CONSTRAINT employee_attendance_calculations_justification_type_id_fkey FOREIGN KEY (justification_type_id) REFERENCES public.justification_types(id);


--
-- TOC entry 5364 (class 2606 OID 37441)
-- Name: employee_attendance_calculations employee_attendance_calculations_process_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendance_calculations
    ADD CONSTRAINT employee_attendance_calculations_process_run_id_fkey FOREIGN KEY (process_run_id) REFERENCES public.attendance_processing_runs(id);


--
-- TOC entry 5365 (class 2606 OID 37461)
-- Name: employee_attendance_calculations employee_attendance_calculations_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendance_calculations
    ADD CONSTRAINT employee_attendance_calculations_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- TOC entry 5366 (class 2606 OID 37436)
-- Name: employee_attendance_calculations employee_attendance_calculations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendance_calculations
    ADD CONSTRAINT employee_attendance_calculations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5330 (class 2606 OID 37296)
-- Name: employee_companies employee_companies_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_companies
    ADD CONSTRAINT employee_companies_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id);


--
-- TOC entry 5331 (class 2606 OID 37266)
-- Name: employee_companies employee_companies_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_companies
    ADD CONSTRAINT employee_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5332 (class 2606 OID 37316)
-- Name: employee_companies employee_companies_contract_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_companies
    ADD CONSTRAINT employee_companies_contract_type_id_fkey FOREIGN KEY (contract_type_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5333 (class 2606 OID 37306)
-- Name: employee_companies employee_companies_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_companies
    ADD CONSTRAINT employee_companies_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);


--
-- TOC entry 5334 (class 2606 OID 37291)
-- Name: employee_companies employee_companies_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_companies
    ADD CONSTRAINT employee_companies_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- TOC entry 5335 (class 2606 OID 37271)
-- Name: employee_companies employee_companies_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_companies
    ADD CONSTRAINT employee_companies_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- TOC entry 5336 (class 2606 OID 37276)
-- Name: employee_companies employee_companies_employee_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_companies
    ADD CONSTRAINT employee_companies_employee_profile_id_fkey FOREIGN KEY (employee_profile_id) REFERENCES public.employee_profiles(id);


--
-- TOC entry 5337 (class 2606 OID 37301)
-- Name: employee_companies employee_companies_job_title_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_companies
    ADD CONSTRAINT employee_companies_job_title_id_fkey FOREIGN KEY (job_title_id) REFERENCES public.job_titles(id);


--
-- TOC entry 5338 (class 2606 OID 37311)
-- Name: employee_companies employee_companies_payroll_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_companies
    ADD CONSTRAINT employee_companies_payroll_group_id_fkey FOREIGN KEY (payroll_group_id) REFERENCES public.payroll_groups(id);


--
-- TOC entry 5339 (class 2606 OID 37261)
-- Name: employee_companies employee_companies_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_companies
    ADD CONSTRAINT employee_companies_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5340 (class 2606 OID 37281)
-- Name: employee_companies employee_companies_work_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_companies
    ADD CONSTRAINT employee_companies_work_group_id_fkey FOREIGN KEY (work_group_id) REFERENCES public.work_groups(id);


--
-- TOC entry 5407 (class 2606 OID 38066)
-- Name: employee_profile_attendance_events employee_profile_attendance_events_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profile_attendance_events
    ADD CONSTRAINT employee_profile_attendance_events_event_id_fkey FOREIGN KEY (attendance_event_id) REFERENCES public.attendance_events(id);


--
-- TOC entry 5408 (class 2606 OID 38061)
-- Name: employee_profile_attendance_events employee_profile_attendance_events_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profile_attendance_events
    ADD CONSTRAINT employee_profile_attendance_events_profile_id_fkey FOREIGN KEY (employee_profile_id) REFERENCES public.employee_profiles(id);


--
-- TOC entry 5409 (class 2606 OID 38056)
-- Name: employee_profile_attendance_events employee_profile_attendance_events_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profile_attendance_events
    ADD CONSTRAINT employee_profile_attendance_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5312 (class 2606 OID 37171)
-- Name: employee_profile_settings employee_profile_settings_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profile_settings
    ADD CONSTRAINT employee_profile_settings_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5313 (class 2606 OID 37176)
-- Name: employee_profile_settings employee_profile_settings_employee_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profile_settings
    ADD CONSTRAINT employee_profile_settings_employee_profile_id_fkey FOREIGN KEY (employee_profile_id) REFERENCES public.employee_profiles(id);


--
-- TOC entry 5314 (class 2606 OID 37181)
-- Name: employee_profile_settings employee_profile_settings_system_setting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profile_settings
    ADD CONSTRAINT employee_profile_settings_system_setting_id_fkey FOREIGN KEY (system_setting_id) REFERENCES public.system_settings(id);


--
-- TOC entry 5315 (class 2606 OID 37166)
-- Name: employee_profile_settings employee_profile_settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profile_settings
    ADD CONSTRAINT employee_profile_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5260 (class 2606 OID 36911)
-- Name: employee_profile_work_patterns employee_profile_work_patterns_employee_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profile_work_patterns
    ADD CONSTRAINT employee_profile_work_patterns_employee_profile_id_fkey FOREIGN KEY (employee_profile_id) REFERENCES public.employee_profiles(id);


--
-- TOC entry 5261 (class 2606 OID 36906)
-- Name: employee_profile_work_patterns employee_profile_work_patterns_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profile_work_patterns
    ADD CONSTRAINT employee_profile_work_patterns_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5262 (class 2606 OID 36916)
-- Name: employee_profile_work_patterns employee_profile_work_patterns_work_pattern_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profile_work_patterns
    ADD CONSTRAINT employee_profile_work_patterns_work_pattern_id_fkey FOREIGN KEY (work_pattern_id) REFERENCES public.work_patterns(id);


--
-- TOC entry 5212 (class 2606 OID 36661)
-- Name: employee_profiles employee_profiles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_profiles
    ADD CONSTRAINT employee_profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5433 (class 2606 OID 45636)
-- Name: employee_route_tracking_points employee_route_tracking_points_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_route_tracking_points
    ADD CONSTRAINT employee_route_tracking_points_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5434 (class 2606 OID 45641)
-- Name: employee_route_tracking_points employee_route_tracking_points_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_route_tracking_points
    ADD CONSTRAINT employee_route_tracking_points_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- TOC entry 5435 (class 2606 OID 45651)
-- Name: employee_route_tracking_points employee_route_tracking_points_nearest_work_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_route_tracking_points
    ADD CONSTRAINT employee_route_tracking_points_nearest_work_location_id_fkey FOREIGN KEY (nearest_work_location_id) REFERENCES public.work_locations(id);


--
-- TOC entry 5436 (class 2606 OID 45646)
-- Name: employee_route_tracking_points employee_route_tracking_points_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_route_tracking_points
    ADD CONSTRAINT employee_route_tracking_points_status_id_fkey FOREIGN KEY (tracking_status_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5437 (class 2606 OID 45631)
-- Name: employee_route_tracking_points employee_route_tracking_points_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_route_tracking_points
    ADD CONSTRAINT employee_route_tracking_points_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5316 (class 2606 OID 37191)
-- Name: employee_settings employee_settings_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_settings
    ADD CONSTRAINT employee_settings_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- TOC entry 5317 (class 2606 OID 37196)
-- Name: employee_settings employee_settings_system_setting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_settings
    ADD CONSTRAINT employee_settings_system_setting_id_fkey FOREIGN KEY (system_setting_id) REFERENCES public.system_settings(id);


--
-- TOC entry 5318 (class 2606 OID 37186)
-- Name: employee_settings employee_settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_settings
    ADD CONSTRAINT employee_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5397 (class 2606 OID 37970)
-- Name: employee_shift_change_requests employee_shift_change_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shift_change_requests
    ADD CONSTRAINT employee_shift_change_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- TOC entry 5398 (class 2606 OID 37945)
-- Name: employee_shift_change_requests employee_shift_change_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shift_change_requests
    ADD CONSTRAINT employee_shift_change_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5399 (class 2606 OID 37955)
-- Name: employee_shift_change_requests employee_shift_change_requests_current_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shift_change_requests
    ADD CONSTRAINT employee_shift_change_requests_current_shift_id_fkey FOREIGN KEY (current_shift_id) REFERENCES public.shifts(id);


--
-- TOC entry 5400 (class 2606 OID 37950)
-- Name: employee_shift_change_requests employee_shift_change_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shift_change_requests
    ADD CONSTRAINT employee_shift_change_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- TOC entry 5401 (class 2606 OID 37965)
-- Name: employee_shift_change_requests employee_shift_change_requests_request_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shift_change_requests
    ADD CONSTRAINT employee_shift_change_requests_request_status_id_fkey FOREIGN KEY (request_status_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5402 (class 2606 OID 37960)
-- Name: employee_shift_change_requests employee_shift_change_requests_requested_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shift_change_requests
    ADD CONSTRAINT employee_shift_change_requests_requested_shift_id_fkey FOREIGN KEY (requested_shift_id) REFERENCES public.shifts(id);


--
-- TOC entry 5403 (class 2606 OID 37940)
-- Name: employee_shift_change_requests employee_shift_change_requests_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shift_change_requests
    ADD CONSTRAINT employee_shift_change_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5345 (class 2606 OID 37376)
-- Name: employee_shift_plans employee_shift_plans_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shift_plans
    ADD CONSTRAINT employee_shift_plans_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5346 (class 2606 OID 37381)
-- Name: employee_shift_plans employee_shift_plans_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shift_plans
    ADD CONSTRAINT employee_shift_plans_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- TOC entry 5347 (class 2606 OID 37386)
-- Name: employee_shift_plans employee_shift_plans_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shift_plans
    ADD CONSTRAINT employee_shift_plans_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- TOC entry 5348 (class 2606 OID 37391)
-- Name: employee_shift_plans employee_shift_plans_shift_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shift_plans
    ADD CONSTRAINT employee_shift_plans_shift_type_id_fkey FOREIGN KEY (shift_type_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5349 (class 2606 OID 37371)
-- Name: employee_shift_plans employee_shift_plans_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shift_plans
    ADD CONSTRAINT employee_shift_plans_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5414 (class 2606 OID 38357)
-- Name: employee_time_punch_change_requests employee_time_punch_change_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_time_punch_change_requests
    ADD CONSTRAINT employee_time_punch_change_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- TOC entry 5415 (class 2606 OID 38332)
-- Name: employee_time_punch_change_requests employee_time_punch_change_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_time_punch_change_requests
    ADD CONSTRAINT employee_time_punch_change_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5416 (class 2606 OID 38337)
-- Name: employee_time_punch_change_requests employee_time_punch_change_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_time_punch_change_requests
    ADD CONSTRAINT employee_time_punch_change_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- TOC entry 5417 (class 2606 OID 38352)
-- Name: employee_time_punch_change_requests employee_time_punch_change_requests_request_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_time_punch_change_requests
    ADD CONSTRAINT employee_time_punch_change_requests_request_status_id_fkey FOREIGN KEY (request_status_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5418 (class 2606 OID 38347)
-- Name: employee_time_punch_change_requests employee_time_punch_change_requests_request_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_time_punch_change_requests
    ADD CONSTRAINT employee_time_punch_change_requests_request_type_id_fkey FOREIGN KEY (request_type_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5419 (class 2606 OID 38342)
-- Name: employee_time_punch_change_requests employee_time_punch_change_requests_target_punch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_time_punch_change_requests
    ADD CONSTRAINT employee_time_punch_change_requests_target_punch_id_fkey FOREIGN KEY (target_punch_id) REFERENCES public.employee_time_punches(id);


--
-- TOC entry 5420 (class 2606 OID 38327)
-- Name: employee_time_punch_change_requests employee_time_punch_change_requests_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_time_punch_change_requests
    ADD CONSTRAINT employee_time_punch_change_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5367 (class 2606 OID 37486)
-- Name: employee_time_punches employee_time_punches_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_time_punches
    ADD CONSTRAINT employee_time_punches_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5368 (class 2606 OID 37491)
-- Name: employee_time_punches employee_time_punches_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_time_punches
    ADD CONSTRAINT employee_time_punches_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- TOC entry 5369 (class 2606 OID 37501)
-- Name: employee_time_punches employee_time_punches_punch_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_time_punches
    ADD CONSTRAINT employee_time_punches_punch_source_id_fkey FOREIGN KEY (punch_source_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5370 (class 2606 OID 37481)
-- Name: employee_time_punches employee_time_punches_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_time_punches
    ADD CONSTRAINT employee_time_punches_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5371 (class 2606 OID 37496)
-- Name: employee_time_punches employee_time_punches_time_clock_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_time_punches
    ADD CONSTRAINT employee_time_punches_time_clock_device_id_fkey FOREIGN KEY (time_clock_device_id) REFERENCES public.time_clock_devices(id);


--
-- TOC entry 5372 (class 2606 OID 37506)
-- Name: employee_time_punches employee_time_punches_time_punch_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_time_punches
    ADD CONSTRAINT employee_time_punches_time_punch_status_id_fkey FOREIGN KEY (time_punch_status_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5237 (class 2606 OID 36796)
-- Name: employees employees_employee_gender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_employee_gender_id_fkey FOREIGN KEY (employee_gender_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5238 (class 2606 OID 36791)
-- Name: employees employees_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5373 (class 2606 OID 37511)
-- Name: employee_time_punches fk_employee_time_punches_run; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_time_punches
    ADD CONSTRAINT fk_employee_time_punches_run FOREIGN KEY (process_run_id) REFERENCES public.attendance_processing_runs(id);


--
-- TOC entry 5205 (class 2606 OID 36636)
-- Name: system_message_translations fk_language_code; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_message_translations
    ADD CONSTRAINT fk_language_code FOREIGN KEY (language_code) REFERENCES public.system_languages(code);


--
-- TOC entry 5206 (class 2606 OID 36631)
-- Name: system_message_translations fk_message_key; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_message_translations
    ADD CONSTRAINT fk_message_key FOREIGN KEY (message_key) REFERENCES public.system_message_keys(message_key);


--
-- TOC entry 5207 (class 2606 OID 36641)
-- Name: system_message_translations fk_system_message_translations_key; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_message_translations
    ADD CONSTRAINT fk_system_message_translations_key FOREIGN KEY (message_key_id) REFERENCES public.system_message_keys(id);


--
-- TOC entry 5268 (class 2606 OID 37698)
-- Name: holidays holidays_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);


--
-- TOC entry 5269 (class 2606 OID 36951)
-- Name: holidays holidays_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5270 (class 2606 OID 37688)
-- Name: holidays holidays_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- TOC entry 5271 (class 2606 OID 38442)
-- Name: holidays holidays_holiday_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_holiday_type_id_fkey FOREIGN KEY (holiday_type_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5272 (class 2606 OID 37693)
-- Name: holidays holidays_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.states(id);


--
-- TOC entry 5273 (class 2606 OID 36946)
-- Name: holidays holidays_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5213 (class 2606 OID 36666)
-- Name: job_titles job_titles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_titles
    ADD CONSTRAINT job_titles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5263 (class 2606 OID 36926)
-- Name: justification_types justification_types_attendance_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.justification_types
    ADD CONSTRAINT justification_types_attendance_event_id_fkey FOREIGN KEY (attendance_event_id) REFERENCES public.attendance_events(id);


--
-- TOC entry 5264 (class 2606 OID 36921)
-- Name: justification_types justification_types_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.justification_types
    ADD CONSTRAINT justification_types_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5201 (class 2606 OID 36611)
-- Name: lookup_group_translations lookup_group_translations_language_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_group_translations
    ADD CONSTRAINT lookup_group_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.system_languages(code);


--
-- TOC entry 5202 (class 2606 OID 36606)
-- Name: lookup_group_translations lookup_group_translations_lookup_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_group_translations
    ADD CONSTRAINT lookup_group_translations_lookup_group_id_fkey FOREIGN KEY (lookup_group_id) REFERENCES public.lookup_groups(id);


--
-- TOC entry 5239 (class 2606 OID 36806)
-- Name: lookup_value_translations lookup_value_translations_language_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_value_translations
    ADD CONSTRAINT lookup_value_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.system_languages(code);


--
-- TOC entry 5240 (class 2606 OID 36801)
-- Name: lookup_value_translations lookup_value_translations_lookup_value_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_value_translations
    ADD CONSTRAINT lookup_value_translations_lookup_value_id_fkey FOREIGN KEY (lookup_value_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5214 (class 2606 OID 36676)
-- Name: lookup_values lookup_values_lookup_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_values
    ADD CONSTRAINT lookup_values_lookup_group_id_fkey FOREIGN KEY (lookup_group_id) REFERENCES public.lookup_groups(id);


--
-- TOC entry 5215 (class 2606 OID 36671)
-- Name: lookup_values lookup_values_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookup_values
    ADD CONSTRAINT lookup_values_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5251 (class 2606 OID 36866)
-- Name: payment_transactions payment_transactions_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.tenant_subscriptions(id);


--
-- TOC entry 5252 (class 2606 OID 36861)
-- Name: payment_transactions payment_transactions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5216 (class 2606 OID 36681)
-- Name: payroll_groups payroll_groups_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_groups
    ADD CONSTRAINT payroll_groups_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5292 (class 2606 OID 37076)
-- Name: report_executions report_executions_executed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_executions
    ADD CONSTRAINT report_executions_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES public.users(id);


--
-- TOC entry 5293 (class 2606 OID 37086)
-- Name: report_executions report_executions_execution_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_executions
    ADD CONSTRAINT report_executions_execution_status_id_fkey FOREIGN KEY (execution_status_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5294 (class 2606 OID 37081)
-- Name: report_executions report_executions_output_format_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_executions
    ADD CONSTRAINT report_executions_output_format_id_fkey FOREIGN KEY (output_format_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5295 (class 2606 OID 37071)
-- Name: report_executions report_executions_system_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_executions
    ADD CONSTRAINT report_executions_system_report_id_fkey FOREIGN KEY (system_report_id) REFERENCES public.system_reports(id);


--
-- TOC entry 5296 (class 2606 OID 37066)
-- Name: report_executions report_executions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_executions
    ADD CONSTRAINT report_executions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5356 (class 2606 OID 37431)
-- Name: report_parameter_translations report_parameter_translations_language_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_parameter_translations
    ADD CONSTRAINT report_parameter_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.system_languages(code);


--
-- TOC entry 5357 (class 2606 OID 37426)
-- Name: report_parameter_translations report_parameter_translations_report_parameter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_parameter_translations
    ADD CONSTRAINT report_parameter_translations_report_parameter_id_fkey FOREIGN KEY (report_parameter_id) REFERENCES public.report_parameters(id);


--
-- TOC entry 5297 (class 2606 OID 37096)
-- Name: report_parameters report_parameters_data_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_parameters
    ADD CONSTRAINT report_parameters_data_type_id_fkey FOREIGN KEY (data_type_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5298 (class 2606 OID 37106)
-- Name: report_parameters report_parameters_lookup_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_parameters
    ADD CONSTRAINT report_parameters_lookup_group_id_fkey FOREIGN KEY (lookup_group_id) REFERENCES public.lookup_groups(id);


--
-- TOC entry 5299 (class 2606 OID 37091)
-- Name: report_parameters report_parameters_system_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_parameters
    ADD CONSTRAINT report_parameters_system_report_id_fkey FOREIGN KEY (system_report_id) REFERENCES public.system_reports(id);


--
-- TOC entry 5300 (class 2606 OID 37101)
-- Name: report_parameters report_parameters_ui_control_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_parameters
    ADD CONSTRAINT report_parameters_ui_control_id_fkey FOREIGN KEY (ui_control_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5301 (class 2606 OID 37116)
-- Name: report_permissions report_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_permissions
    ADD CONSTRAINT report_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- TOC entry 5302 (class 2606 OID 37121)
-- Name: report_permissions report_permissions_system_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_permissions
    ADD CONSTRAINT report_permissions_system_report_id_fkey FOREIGN KEY (system_report_id) REFERENCES public.system_reports(id);


--
-- TOC entry 5303 (class 2606 OID 37111)
-- Name: report_permissions report_permissions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_permissions
    ADD CONSTRAINT report_permissions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5304 (class 2606 OID 37136)
-- Name: report_scope_policies report_scope_policies_enforcement_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_scope_policies
    ADD CONSTRAINT report_scope_policies_enforcement_level_id_fkey FOREIGN KEY (enforcement_level_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5305 (class 2606 OID 37131)
-- Name: report_scope_policies report_scope_policies_required_scope_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_scope_policies
    ADD CONSTRAINT report_scope_policies_required_scope_type_id_fkey FOREIGN KEY (required_scope_type_id) REFERENCES public.scope_types(id);


--
-- TOC entry 5306 (class 2606 OID 37126)
-- Name: report_scope_policies report_scope_policies_system_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_scope_policies
    ADD CONSTRAINT report_scope_policies_system_report_id_fkey FOREIGN KEY (system_report_id) REFERENCES public.system_reports(id);


--
-- TOC entry 5253 (class 2606 OID 36886)
-- Name: role_permission_copy_runs role_permission_copy_runs_created_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permission_copy_runs
    ADD CONSTRAINT role_permission_copy_runs_created_role_id_fkey FOREIGN KEY (created_role_id) REFERENCES public.roles(id);


--
-- TOC entry 5254 (class 2606 OID 36891)
-- Name: role_permission_copy_runs role_permission_copy_runs_executed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permission_copy_runs
    ADD CONSTRAINT role_permission_copy_runs_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES public.users(id);


--
-- TOC entry 5255 (class 2606 OID 36876)
-- Name: role_permission_copy_runs role_permission_copy_runs_source_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permission_copy_runs
    ADD CONSTRAINT role_permission_copy_runs_source_role_id_fkey FOREIGN KEY (source_role_id) REFERENCES public.roles(id);


--
-- TOC entry 5256 (class 2606 OID 36881)
-- Name: role_permission_copy_runs role_permission_copy_runs_target_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permission_copy_runs
    ADD CONSTRAINT role_permission_copy_runs_target_role_id_fkey FOREIGN KEY (target_role_id) REFERENCES public.roles(id);


--
-- TOC entry 5257 (class 2606 OID 36871)
-- Name: role_permission_copy_runs role_permission_copy_runs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permission_copy_runs
    ADD CONSTRAINT role_permission_copy_runs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5341 (class 2606 OID 37326)
-- Name: role_permission_snapshots role_permission_snapshots_copy_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permission_snapshots
    ADD CONSTRAINT role_permission_snapshots_copy_run_id_fkey FOREIGN KEY (copy_run_id) REFERENCES public.role_permission_copy_runs(id);


--
-- TOC entry 5342 (class 2606 OID 37336)
-- Name: role_permission_snapshots role_permission_snapshots_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permission_snapshots
    ADD CONSTRAINT role_permission_snapshots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5343 (class 2606 OID 37331)
-- Name: role_permission_snapshots role_permission_snapshots_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permission_snapshots
    ADD CONSTRAINT role_permission_snapshots_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- TOC entry 5344 (class 2606 OID 37321)
-- Name: role_permission_snapshots role_permission_snapshots_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permission_snapshots
    ADD CONSTRAINT role_permission_snapshots_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5353 (class 2606 OID 37416)
-- Name: role_screen_actions role_screen_actions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_screen_actions
    ADD CONSTRAINT role_screen_actions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- TOC entry 5354 (class 2606 OID 37421)
-- Name: role_screen_actions role_screen_actions_screen_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_screen_actions
    ADD CONSTRAINT role_screen_actions_screen_action_id_fkey FOREIGN KEY (screen_action_id) REFERENCES public.screen_actions(id);


--
-- TOC entry 5355 (class 2606 OID 37411)
-- Name: role_screen_actions role_screen_actions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_screen_actions
    ADD CONSTRAINT role_screen_actions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5217 (class 2606 OID 36691)
-- Name: roles roles_base_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_base_role_id_fkey FOREIGN KEY (base_role_id) REFERENCES public.roles(id);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_user_manager_role_id_fkey FOREIGN KEY (user_manager_role_id) REFERENCES public.roles(id);


--
-- TOC entry 5218 (class 2606 OID 36686)
-- Name: roles roles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5288 (class 2606 OID 37051)
-- Name: screen_actions screen_actions_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screen_actions
    ADD CONSTRAINT screen_actions_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.actions(id);


--
-- TOC entry 5289 (class 2606 OID 37046)
-- Name: screen_actions screen_actions_screen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screen_actions
    ADD CONSTRAINT screen_actions_screen_id_fkey FOREIGN KEY (screen_id) REFERENCES public.screens(id);


--
-- TOC entry 5290 (class 2606 OID 37061)
-- Name: screen_translations screen_translations_language_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screen_translations
    ADD CONSTRAINT screen_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.system_languages(code);


--
-- TOC entry 5291 (class 2606 OID 37056)
-- Name: screen_translations screen_translations_screen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screen_translations
    ADD CONSTRAINT screen_translations_screen_id_fkey FOREIGN KEY (screen_id) REFERENCES public.screens(id);


--
-- TOC entry 5241 (class 2606 OID 36811)
-- Name: screens screens_menu_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screens
    ADD CONSTRAINT screens_menu_group_id_fkey FOREIGN KEY (menu_group_id) REFERENCES public.system_menu_groups(id);


--
-- TOC entry 5242 (class 2606 OID 36816)
-- Name: screens screens_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screens
    ADD CONSTRAINT screens_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5383 (class 2606 OID 37748)
-- Name: shift_constructor_blocks shift_constructor_blocks_constructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_constructor_blocks
    ADD CONSTRAINT shift_constructor_blocks_constructor_id_fkey FOREIGN KEY (constructor_id) REFERENCES public.shift_constructors(id) ON DELETE CASCADE;


--
-- TOC entry 5384 (class 2606 OID 37743)
-- Name: shift_constructor_blocks shift_constructor_blocks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_constructor_blocks
    ADD CONSTRAINT shift_constructor_blocks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5381 (class 2606 OID 37722)
-- Name: shift_constructors shift_constructors_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_constructors
    ADD CONSTRAINT shift_constructors_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE;


--
-- TOC entry 5382 (class 2606 OID 37717)
-- Name: shift_constructors shift_constructors_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_constructors
    ADD CONSTRAINT shift_constructors_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5274 (class 2606 OID 36981)
-- Name: shifts shifts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5275 (class 2606 OID 36986)
-- Name: shifts shifts_payroll_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_payroll_group_id_fkey FOREIGN KEY (payroll_group_id) REFERENCES public.payroll_groups(id);


--
-- TOC entry 5276 (class 2606 OID 36976)
-- Name: shifts shifts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5375 (class 2606 OID 37642)
-- Name: states states_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.states
    ADD CONSTRAINT states_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- TOC entry 5376 (class 2606 OID 37647)
-- Name: states states_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.states
    ADD CONSTRAINT states_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5203 (class 2606 OID 36621)
-- Name: system_menu_group_translations system_menu_group_translations_language_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_menu_group_translations
    ADD CONSTRAINT system_menu_group_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.system_languages(code);


--
-- TOC entry 5204 (class 2606 OID 36616)
-- Name: system_menu_group_translations system_menu_group_translations_menu_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_menu_group_translations
    ADD CONSTRAINT system_menu_group_translations_menu_group_id_fkey FOREIGN KEY (menu_group_id) REFERENCES public.system_menu_groups(id);


--
-- TOC entry 5208 (class 2606 OID 36626)
-- Name: system_message_translations system_message_translations_language_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_message_translations
    ADD CONSTRAINT system_message_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.system_languages(code);


--
-- TOC entry 5307 (class 2606 OID 37146)
-- Name: system_report_translations system_report_translations_language_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_report_translations
    ADD CONSTRAINT system_report_translations_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.system_languages(code);


--
-- TOC entry 5308 (class 2606 OID 37141)
-- Name: system_report_translations system_report_translations_system_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_report_translations
    ADD CONSTRAINT system_report_translations_system_report_id_fkey FOREIGN KEY (system_report_id) REFERENCES public.system_reports(id);


--
-- TOC entry 5243 (class 2606 OID 36826)
-- Name: system_reports system_reports_application_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_reports
    ADD CONSTRAINT system_reports_application_module_id_fkey FOREIGN KEY (application_module_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5244 (class 2606 OID 36821)
-- Name: system_reports system_reports_handler_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_reports
    ADD CONSTRAINT system_reports_handler_type_id_fkey FOREIGN KEY (handler_type_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5245 (class 2606 OID 36836)
-- Name: system_settings system_settings_allowed_lookup_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_allowed_lookup_group_id_fkey FOREIGN KEY (allowed_lookup_group_id) REFERENCES public.lookup_groups(id);


--
-- TOC entry 5246 (class 2606 OID 36831)
-- Name: system_settings system_settings_value_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_value_type_id_fkey FOREIGN KEY (value_type_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5219 (class 2606 OID 36701)
-- Name: tenant_language_settings tenant_language_settings_default_language_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_language_settings
    ADD CONSTRAINT tenant_language_settings_default_language_code_fkey FOREIGN KEY (default_language_code) REFERENCES public.system_languages(code);


--
-- TOC entry 5220 (class 2606 OID 36696)
-- Name: tenant_language_settings tenant_language_settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_language_settings
    ADD CONSTRAINT tenant_language_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5221 (class 2606 OID 36711)
-- Name: tenant_members tenant_members_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_members
    ADD CONSTRAINT tenant_members_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES public.users(id);


--
-- TOC entry 5222 (class 2606 OID 36706)
-- Name: tenant_members tenant_members_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_members
    ADD CONSTRAINT tenant_members_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5258 (class 2606 OID 36896)
-- Name: tenant_onboarding tenant_onboarding_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_onboarding
    ADD CONSTRAINT tenant_onboarding_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5259 (class 2606 OID 36901)
-- Name: tenant_onboarding tenant_onboarding_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_onboarding
    ADD CONSTRAINT tenant_onboarding_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5319 (class 2606 OID 37206)
-- Name: tenant_settings tenant_settings_system_setting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_system_setting_id_fkey FOREIGN KEY (system_setting_id) REFERENCES public.system_settings(id);


--
-- TOC entry 5320 (class 2606 OID 37201)
-- Name: tenant_settings tenant_settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5223 (class 2606 OID 36721)
-- Name: tenant_subscriptions tenant_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- TOC entry 5224 (class 2606 OID 36716)
-- Name: tenant_subscriptions tenant_subscriptions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5277 (class 2606 OID 36996)
-- Name: time_clock_devices time_clock_devices_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_clock_devices
    ADD CONSTRAINT time_clock_devices_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5278 (class 2606 OID 37001)
-- Name: time_clock_devices time_clock_devices_device_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_clock_devices
    ADD CONSTRAINT time_clock_devices_device_type_id_fkey FOREIGN KEY (device_type_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5279 (class 2606 OID 36991)
-- Name: time_clock_devices time_clock_devices_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_clock_devices
    ADD CONSTRAINT time_clock_devices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5280 (class 2606 OID 37011)
-- Name: time_surcharge_rules time_surcharge_rules_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_surcharge_rules
    ADD CONSTRAINT time_surcharge_rules_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5281 (class 2606 OID 37021)
-- Name: time_surcharge_rules time_surcharge_rules_day_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_surcharge_rules
    ADD CONSTRAINT time_surcharge_rules_day_type_id_fkey FOREIGN KEY (day_type_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5282 (class 2606 OID 37016)
-- Name: time_surcharge_rules time_surcharge_rules_rate_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_surcharge_rules
    ADD CONSTRAINT time_surcharge_rules_rate_category_id_fkey FOREIGN KEY (rate_category_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5283 (class 2606 OID 37006)
-- Name: time_surcharge_rules time_surcharge_rules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_surcharge_rules
    ADD CONSTRAINT time_surcharge_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5404 (class 2606 OID 37991)
-- Name: user_notifications user_notifications_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5405 (class 2606 OID 38001)
-- Name: user_notifications user_notifications_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_type_id_fkey FOREIGN KEY (notification_type_id) REFERENCES public.lookup_values(id);


--
-- TOC entry 5406 (class 2606 OID 37996)
-- Name: user_notifications user_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5421 (class 2606 OID 38434)
-- Name: user_role_employee_assignments user_role_employee_assignments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_employee_assignments
    ADD CONSTRAINT user_role_employee_assignments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- TOC entry 5422 (class 2606 OID 38424)
-- Name: user_role_employee_assignments user_role_employee_assignments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_employee_assignments
    ADD CONSTRAINT user_role_employee_assignments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5423 (class 2606 OID 38429)
-- Name: user_role_employee_assignments user_role_employee_assignments_user_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_employee_assignments
    ADD CONSTRAINT user_role_employee_assignments_user_role_id_fkey FOREIGN KEY (user_role_id) REFERENCES public.user_roles(id);


--
-- TOC entry 5424 (class 2606 OID 45532)
-- Name: user_role_scope_rules user_role_scope_rules_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_scope_rules
    ADD CONSTRAINT user_role_scope_rules_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id);


--
-- TOC entry 5425 (class 2606 OID 45517)
-- Name: user_role_scope_rules user_role_scope_rules_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_scope_rules
    ADD CONSTRAINT user_role_scope_rules_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5426 (class 2606 OID 45537)
-- Name: user_role_scope_rules user_role_scope_rules_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_scope_rules
    ADD CONSTRAINT user_role_scope_rules_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);


--
-- TOC entry 5427 (class 2606 OID 45527)
-- Name: user_role_scope_rules user_role_scope_rules_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_scope_rules
    ADD CONSTRAINT user_role_scope_rules_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- TOC entry 5428 (class 2606 OID 45547)
-- Name: user_role_scope_rules user_role_scope_rules_employee_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_scope_rules
    ADD CONSTRAINT user_role_scope_rules_employee_profile_id_fkey FOREIGN KEY (employee_profile_id) REFERENCES public.employee_profiles(id);


--
-- TOC entry 5429 (class 2606 OID 45507)
-- Name: user_role_scope_rules user_role_scope_rules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_scope_rules
    ADD CONSTRAINT user_role_scope_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5430 (class 2606 OID 45512)
-- Name: user_role_scope_rules user_role_scope_rules_user_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_scope_rules
    ADD CONSTRAINT user_role_scope_rules_user_role_id_fkey FOREIGN KEY (user_role_id) REFERENCES public.user_roles(id) ON DELETE CASCADE;


--
-- TOC entry 5431 (class 2606 OID 45542)
-- Name: user_role_scope_rules user_role_scope_rules_work_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_scope_rules
    ADD CONSTRAINT user_role_scope_rules_work_group_id_fkey FOREIGN KEY (work_group_id) REFERENCES public.work_groups(id);


--
-- TOC entry 5432 (class 2606 OID 45522)
-- Name: user_role_scope_rules user_role_scope_rules_work_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_scope_rules
    ADD CONSTRAINT user_role_scope_rules_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES public.work_locations(id);


--
-- TOC entry 5350 (class 2606 OID 37406)
-- Name: user_role_scopes user_role_scopes_scope_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_scopes
    ADD CONSTRAINT user_role_scopes_scope_type_id_fkey FOREIGN KEY (scope_type_id) REFERENCES public.scope_types(id);


--
-- TOC entry 5351 (class 2606 OID 37396)
-- Name: user_role_scopes user_role_scopes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_scopes
    ADD CONSTRAINT user_role_scopes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5352 (class 2606 OID 37401)
-- Name: user_role_scopes user_role_scopes_user_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_scopes
    ADD CONSTRAINT user_role_scopes_user_role_id_fkey FOREIGN KEY (user_role_id) REFERENCES public.user_roles(id);


--
-- TOC entry 5284 (class 2606 OID 37041)
-- Name: user_roles user_roles_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5285 (class 2606 OID 37036)
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- TOC entry 5286 (class 2606 OID 37026)
-- Name: user_roles user_roles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5287 (class 2606 OID 37031)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5225 (class 2606 OID 36731)
-- Name: users users_preferred_language_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_preferred_language_code_fkey FOREIGN KEY (preferred_language_code) REFERENCES public.system_languages(code);


--
-- TOC entry 5226 (class 2606 OID 36726)
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5249 (class 2606 OID 36856)
-- Name: work_groups work_groups_payroll_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_groups
    ADD CONSTRAINT work_groups_payroll_group_id_fkey FOREIGN KEY (payroll_group_id) REFERENCES public.payroll_groups(id);


--
-- TOC entry 5250 (class 2606 OID 36851)
-- Name: work_groups work_groups_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_groups
    ADD CONSTRAINT work_groups_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5410 (class 2606 OID 38239)
-- Name: work_locations work_locations_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_locations
    ADD CONSTRAINT work_locations_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);


--
-- TOC entry 5411 (class 2606 OID 38229)
-- Name: work_locations work_locations_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_locations
    ADD CONSTRAINT work_locations_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- TOC entry 5412 (class 2606 OID 38234)
-- Name: work_locations work_locations_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_locations
    ADD CONSTRAINT work_locations_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.states(id);


--
-- TOC entry 5413 (class 2606 OID 38244)
-- Name: work_locations work_locations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_locations
    ADD CONSTRAINT work_locations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5385 (class 2606 OID 37862)
-- Name: work_pattern_shifts work_pattern_shifts_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_pattern_shifts
    ADD CONSTRAINT work_pattern_shifts_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- TOC entry 5386 (class 2606 OID 37852)
-- Name: work_pattern_shifts work_pattern_shifts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_pattern_shifts
    ADD CONSTRAINT work_pattern_shifts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5387 (class 2606 OID 37857)
-- Name: work_pattern_shifts work_pattern_shifts_work_pattern_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_pattern_shifts
    ADD CONSTRAINT work_pattern_shifts_work_pattern_id_fkey FOREIGN KEY (work_pattern_id) REFERENCES public.work_patterns(id) ON DELETE CASCADE;


--
-- TOC entry 5227 (class 2606 OID 36741)
-- Name: work_patterns work_patterns_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_patterns
    ADD CONSTRAINT work_patterns_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Historial persistente y reversible de cargas masivas organizacionales
--

CREATE TABLE public.organization_import_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    file_name character varying NOT NULL,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    import_started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    reversed_at timestamp with time zone,
    structure_rows jsonb DEFAULT '[]'::jsonb NOT NULL,
    employee_rows jsonb DEFAULT '[]'::jsonb NOT NULL,
    staged_assignments jsonb DEFAULT '[]'::jsonb NOT NULL,
    import_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    reversal_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    error_message text,
    created_by_user_id uuid,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT organization_import_runs_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'running'::character varying, 'completed'::character varying, 'failed'::character varying, 'aborted'::character varying, 'reversing'::character varying, 'reversed'::character varying])::text[]))),
    CONSTRAINT organization_import_runs_structure_rows_check CHECK ((jsonb_typeof(structure_rows) = 'array'::text)),
    CONSTRAINT organization_import_runs_employee_rows_check CHECK ((jsonb_typeof(employee_rows) = 'array'::text)),
    CONSTRAINT organization_import_runs_staged_assignments_check CHECK ((jsonb_typeof(staged_assignments) = 'array'::text)),
    CONSTRAINT organization_import_runs_import_summary_check CHECK ((jsonb_typeof(import_summary) = 'object'::text)),
    CONSTRAINT organization_import_runs_reversal_summary_check CHECK ((jsonb_typeof(reversal_summary) = 'object'::text))
);

ALTER TABLE ONLY public.organization_import_runs
    ADD CONSTRAINT organization_import_runs_pkey PRIMARY KEY (id);

CREATE INDEX idx_organization_import_runs_tenant_created
    ON public.organization_import_runs USING btree (tenant_id, created_at DESC);

CREATE INDEX idx_organization_import_runs_tenant_status
    ON public.organization_import_runs USING btree (tenant_id, status);

ALTER TABLE ONLY public.organization_import_runs
    ADD CONSTRAINT organization_import_runs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);

ALTER TABLE ONLY public.organization_import_runs
    ADD CONSTRAINT organization_import_runs_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);

COMMENT ON TABLE public.organization_import_runs IS 'Historial persistente de cargas masivas organizacionales y sus reversiones.';

COMMENT ON COLUMN public.organization_import_runs.structure_rows IS 'Payload normalizado de estructura utilizado para identificar exactamente los registros de la carga.';

COMMENT ON COLUMN public.organization_import_runs.employee_rows IS 'Payload normalizado de empleados y usuarios utilizado para la carga y su reversa.';

--
-- Plantillas globales de turnos de fabrica.
-- Los turnos operativos pertenecen a una empresa, por eso 002 carga estas
-- definiciones y el trigger las instancia cuando el wizard crea la empresa.
--

CREATE TABLE public.system_shift_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_key character varying NOT NULL,
    shift_name character varying NOT NULL,
    shift_short_name character varying NOT NULL,
    start_time time without time zone NOT NULL,
    shift_duration_minutes integer DEFAULT 0 NOT NULL,
    work_minutes integer NOT NULL,
    lunch_minutes integer DEFAULT 0 NOT NULL,
    lunch_window_minutes integer DEFAULT 0 NOT NULL,
    lunch_is_paid boolean DEFAULT false NOT NULL,
    lunch_deduction_mode character varying,
    entry_grace_minutes integer DEFAULT 0 NOT NULL,
    exit_grace_minutes integer DEFAULT 0 NOT NULL,
    shift_icon_key character varying DEFAULT 'Sun'::character varying,
    shift_bg_color character varying,
    shift_text_color character varying,
    CONSTRAINT system_shift_templates_lunch_mode_check CHECK (lunch_deduction_mode IS NULL OR lunch_deduction_mode::text IN ('ACTUAL_OR_SCHEDULED', 'ACTUAL', 'SCHEDULED', 'NONE')),
    constructor_name character varying NOT NULL,
    total_work_minutes integer DEFAULT 0 NOT NULL,
    total_break_minutes integer DEFAULT 0 NOT NULL,
    constructor_blocks jsonb DEFAULT '[]'::jsonb NOT NULL,
    sort_order integer DEFAULT 10 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT system_shift_templates_blocks_check CHECK (jsonb_typeof(constructor_blocks) = 'array'::text),
    CONSTRAINT system_shift_templates_minutes_check CHECK (
      shift_duration_minutes >= 0 AND shift_duration_minutes <= 2880
      AND work_minutes >= 0 AND work_minutes <= shift_duration_minutes
      AND lunch_minutes >= 0 AND lunch_minutes <= shift_duration_minutes
      AND lunch_window_minutes >= lunch_minutes AND lunch_window_minutes <= shift_duration_minutes
      AND entry_grace_minutes >= 0
      AND exit_grace_minutes >= 0
      AND total_work_minutes >= 0
      AND total_break_minutes >= 0
    ),
    CONSTRAINT system_shift_templates_bg_color_check CHECK (shift_bg_color IS NULL OR shift_bg_color::text ~ '^#[0-9A-Fa-f]{6}$'::text),
    CONSTRAINT system_shift_templates_text_color_check CHECK (shift_text_color IS NULL OR shift_text_color::text ~ '^#[0-9A-Fa-f]{6}$'::text)
);

ALTER TABLE ONLY public.system_shift_templates
    ADD CONSTRAINT system_shift_templates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.system_shift_templates
    ADD CONSTRAINT uq_system_shift_templates_key UNIQUE (template_key);

ALTER TABLE ONLY public.system_shift_templates
    ADD CONSTRAINT uq_system_shift_templates_short_name UNIQUE (shift_short_name);

CREATE INDEX idx_system_shift_templates_active_sort
    ON public.system_shift_templates USING btree (is_active, sort_order, template_key);

COMMENT ON TABLE public.system_shift_templates IS 'Plantillas globales parametrizadas que se instancian como turnos al crear una empresa.';

COMMENT ON COLUMN public.system_shift_templates.constructor_blocks IS 'Bloques del constructor de turno en formato JSON, incluyendo tipo, minutos, recargo, pausa y orden.';

CREATE FUNCTION public.apply_system_shift_templates_to_company(p_company_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  company_tenant_id uuid;
  template_row public.system_shift_templates%ROWTYPE;
  target_shift_id uuid;
  target_constructor_id uuid;
BEGIN
  SELECT company.tenant_id
    INTO company_tenant_id
  FROM public.companies AS company
  WHERE company.id = p_company_id;

  IF company_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No existe la empresa % para instanciar turnos base', p_company_id;
  END IF;

  FOR template_row IN
    SELECT template.*
    FROM public.system_shift_templates AS template
    WHERE template.is_active = true
    ORDER BY template.sort_order, template.template_key
  LOOP
    SELECT shift.id
      INTO target_shift_id
    FROM public.shifts AS shift
    WHERE shift.tenant_id = company_tenant_id
      AND shift.company_id = p_company_id
      AND shift.shift_short_name = template_row.shift_short_name
    ORDER BY shift.created_at
    LIMIT 1;

    IF target_shift_id IS NULL THEN
      INSERT INTO public.shifts (
        tenant_id, company_id, payroll_group_id,
        shift_name, shift_short_name, start_time,
        shift_duration_minutes, work_minutes, lunch_minutes, lunch_window_minutes,
        lunch_is_paid, lunch_deduction_mode,
        entry_grace_minutes, exit_grace_minutes,
        is_active, created_by,
        shift_icon_key, shift_bg_color, shift_text_color
      ) VALUES (
        company_tenant_id, p_company_id, NULL,
        template_row.shift_name, template_row.shift_short_name, template_row.start_time,
        template_row.shift_duration_minutes, template_row.work_minutes, template_row.lunch_minutes, template_row.lunch_window_minutes,
        template_row.lunch_is_paid, template_row.lunch_deduction_mode,
        template_row.entry_grace_minutes, template_row.exit_grace_minutes,
        true, 'SYSTEM_SHIFT_TEMPLATE',
        template_row.shift_icon_key, template_row.shift_bg_color, template_row.shift_text_color
      )
      RETURNING id INTO target_shift_id;
    END IF;

    INSERT INTO public.shift_constructors (
      tenant_id, shift_id, constructor_name,
      total_work_minutes, total_break_minutes,
      is_active, created_by
    ) VALUES (
      company_tenant_id, target_shift_id, template_row.constructor_name,
      template_row.total_work_minutes, template_row.total_break_minutes,
      true, 'SYSTEM_SHIFT_TEMPLATE'
    )
    ON CONFLICT (tenant_id, shift_id) DO NOTHING;

    SELECT constructor.id
      INTO target_constructor_id
    FROM public.shift_constructors AS constructor
    WHERE constructor.tenant_id = company_tenant_id
      AND constructor.shift_id = target_shift_id
    LIMIT 1;

    INSERT INTO public.shift_constructor_blocks (
      tenant_id, constructor_id, block_type, block_label,
      start_minutes, end_minutes, surcharge_pct,
      is_break, sort_order, is_active, created_by
    )
    SELECT
      company_tenant_id,
      target_constructor_id,
      block.block_type,
      block.block_label,
      block.start_minutes,
      block.end_minutes,
      block.surcharge_pct,
      block.is_break,
      block.sort_order,
      true,
      'SYSTEM_SHIFT_TEMPLATE'
    FROM jsonb_to_recordset(template_row.constructor_blocks) AS block(
      block_type character varying,
      block_label character varying,
      start_minutes integer,
      end_minutes integer,
      surcharge_pct numeric,
      is_break boolean,
      sort_order integer
    )
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.shift_constructor_blocks AS existing_block
      WHERE existing_block.constructor_id = target_constructor_id
        AND existing_block.block_type = block.block_type
        AND existing_block.start_minutes = block.start_minutes
        AND existing_block.end_minutes = block.end_minutes
        AND existing_block.sort_order = block.sort_order
    );
  END LOOP;
END;
$$;

CREATE FUNCTION public.instantiate_system_shift_templates_on_company() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM public.apply_system_shift_templates_to_company(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_companies_instantiate_system_shift_templates
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.instantiate_system_shift_templates_on_company();

-- Relaciones estables para el dominio de marcaciones. Los UUID se resuelven
-- por lookup_group_key/lookup_key y el código físico vive en metadata.
CREATE FUNCTION public.resolve_punch_key_lookup_id(
  p_tenant_id uuid,
  p_device_code integer
) RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT value.id
  FROM public.lookup_values AS value
  JOIN public.lookup_groups AS group_row
    ON group_row.id = value.lookup_group_id
   AND group_row.lookup_group_key = 'PUNCH_KEY'
   AND group_row.is_active = true
  WHERE value.is_active = true
    AND (value.tenant_id IS NULL OR value.tenant_id = p_tenant_id)
    AND CASE
          WHEN COALESCE(value.metadata->>'device_code', '') ~ '^[0-9]+$'
            THEN (value.metadata->>'device_code')::integer
          ELSE NULL
        END = p_device_code
  ORDER BY CASE WHEN value.tenant_id = p_tenant_id THEN 0 ELSE 1 END,
           value.lookup_key
  LIMIT 1
$$;

CREATE FUNCTION public.punch_key_lookup_key(
  p_lookup_value_id uuid
) RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT value.lookup_key
  FROM public.lookup_values AS value
  JOIN public.lookup_groups AS group_row
    ON group_row.id = value.lookup_group_id
   AND group_row.lookup_group_key = 'PUNCH_KEY'
  WHERE value.id = p_lookup_value_id
  LIMIT 1
$$;

CREATE FUNCTION public.sync_employee_time_punch_key_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  resolved_id uuid;
  resolved_code integer;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.punch_key_lookup_id IS NOT DISTINCT FROM OLD.punch_key_lookup_id
     AND NEW.punch_key IS DISTINCT FROM OLD.punch_key THEN
    NEW.punch_key_lookup_id := NULL;
  END IF;

  IF NEW.punch_key_lookup_id IS NULL THEN
    resolved_id := public.resolve_punch_key_lookup_id(NEW.tenant_id, NEW.punch_key);
    IF resolved_id IS NULL THEN
      RAISE EXCEPTION 'punch_key % no está configurado en PUNCH_KEY para el tenant %',
        NEW.punch_key, NEW.tenant_id;
    END IF;
    NEW.punch_key_lookup_id := resolved_id;
    RETURN NEW;
  END IF;

  SELECT CASE
           WHEN COALESCE(value.metadata->>'device_code', '') ~ '^[0-9]+$'
             THEN (value.metadata->>'device_code')::integer
           ELSE NULL
         END
    INTO resolved_code
  FROM public.lookup_values AS value
  JOIN public.lookup_groups AS group_row
    ON group_row.id = value.lookup_group_id
   AND group_row.lookup_group_key = 'PUNCH_KEY'
  WHERE value.id = NEW.punch_key_lookup_id
    AND value.is_active = true
    AND (value.tenant_id IS NULL OR value.tenant_id = NEW.tenant_id);

  IF resolved_code IS NULL THEN
    RAISE EXCEPTION 'punch_key_lookup_id % no es una tecla PUNCH_KEY válida',
      NEW.punch_key_lookup_id;
  END IF;
  NEW.punch_key := resolved_code;
  RETURN NEW;
END
$$;

CREATE FUNCTION public.sync_attendance_movement_key_references()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  start_code integer;
  end_code integer;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.start_punch_key_id IS NOT DISTINCT FROM OLD.start_punch_key_id
     AND NEW.start_key IS DISTINCT FROM OLD.start_key THEN
    NEW.start_punch_key_id := NULL;
  END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.end_punch_key_id IS NOT DISTINCT FROM OLD.end_punch_key_id
     AND NEW.end_key IS DISTINCT FROM OLD.end_key THEN
    NEW.end_punch_key_id := NULL;
  END IF;

  IF NEW.start_punch_key_id IS NULL THEN
    NEW.start_punch_key_id := public.resolve_punch_key_lookup_id(NEW.tenant_id, NEW.start_key);
  END IF;
  IF NEW.end_punch_key_id IS NULL THEN
    NEW.end_punch_key_id := public.resolve_punch_key_lookup_id(NEW.tenant_id, NEW.end_key);
  END IF;

  SELECT CASE
           WHEN COALESCE(value.metadata->>'device_code', '') ~ '^[0-9]+$'
             THEN (value.metadata->>'device_code')::integer
           ELSE NULL
         END
    INTO start_code
  FROM public.lookup_values AS value
  JOIN public.lookup_groups AS group_row
    ON group_row.id = value.lookup_group_id
   AND group_row.lookup_group_key = 'PUNCH_KEY'
  WHERE value.id = NEW.start_punch_key_id
    AND value.is_active = true
    AND (value.tenant_id IS NULL OR value.tenant_id = NEW.tenant_id);

  SELECT CASE
           WHEN COALESCE(value.metadata->>'device_code', '') ~ '^[0-9]+$'
             THEN (value.metadata->>'device_code')::integer
           ELSE NULL
         END
    INTO end_code
  FROM public.lookup_values AS value
  JOIN public.lookup_groups AS group_row
    ON group_row.id = value.lookup_group_id
   AND group_row.lookup_group_key = 'PUNCH_KEY'
  WHERE value.id = NEW.end_punch_key_id
    AND value.is_active = true
    AND (value.tenant_id IS NULL OR value.tenant_id = NEW.tenant_id);

  IF start_code IS NULL OR end_code IS NULL THEN
    RAISE EXCEPTION 'Las teclas inicial y final deben pertenecer al catálogo PUNCH_KEY';
  END IF;
  IF NEW.start_punch_key_id = NEW.end_punch_key_id THEN
    RAISE EXCEPTION 'Las teclas inicial y final del movimiento deben ser diferentes';
  END IF;
  NEW.start_key := start_code;
  NEW.end_key := end_code;
  RETURN NEW;
END
$$;

ALTER TABLE public.employee_time_punches
  ADD CONSTRAINT employee_time_punches_punch_key_lookup_id_fkey
  FOREIGN KEY (punch_key_lookup_id) REFERENCES public.lookup_values(id);

ALTER TABLE public.attendance_movements
  ADD CONSTRAINT attendance_movements_start_punch_key_id_fkey
  FOREIGN KEY (start_punch_key_id) REFERENCES public.lookup_values(id),
  ADD CONSTRAINT attendance_movements_end_punch_key_id_fkey
  FOREIGN KEY (end_punch_key_id) REFERENCES public.lookup_values(id),
  ADD CONSTRAINT attendance_movements_distinct_keys_chk
  CHECK (start_punch_key_id <> end_punch_key_id);

CREATE UNIQUE INDEX uq_attendance_movements_tenant_key_pair
  ON public.attendance_movements (
    tenant_id,
    start_punch_key_id,
    end_punch_key_id
  );

CREATE INDEX idx_employee_time_punches_punch_key_lookup
  ON public.employee_time_punches (tenant_id, punch_key_lookup_id, punch_datetime);

CREATE TRIGGER trg_employee_time_punches_sync_key_reference
BEFORE INSERT OR UPDATE OF tenant_id, punch_key, punch_key_lookup_id
ON public.employee_time_punches
FOR EACH ROW
EXECUTE FUNCTION public.sync_employee_time_punch_key_reference();

CREATE TRIGGER trg_attendance_movements_sync_key_references
BEFORE INSERT OR UPDATE OF tenant_id, start_key, end_key,
  start_punch_key_id, end_punch_key_id
ON public.attendance_movements
FOR EACH ROW
EXECUTE FUNCTION public.sync_attendance_movement_key_references();

CREATE FUNCTION public.enforce_lookup_group_management_policy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(NEW.management_policy->>'value_scope', 'INHERIT') = 'SYSTEM'
     AND NEW.allows_tenant_items THEN
    RAISE EXCEPTION 'Un catálogo de lógica SYSTEM no puede permitir items de tenant';
  END IF;
  RETURN NEW;
END
$$;

CREATE FUNCTION public.enforce_lookup_value_management_policy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  policy jsonb;
  required_entry record;
  configured_value text;
  duplicate_exists boolean;
BEGIN
  SELECT COALESCE(group_row.management_policy, '{}'::jsonb)
    INTO policy
  FROM public.lookup_groups AS group_row
  WHERE group_row.id = NEW.lookup_group_id;

  IF COALESCE(policy->>'value_scope', 'INHERIT') = 'SYSTEM' THEN
    IF NEW.tenant_id IS NOT NULL OR NEW.lookup_scope <> 'SYSTEM' THEN
      RAISE EXCEPTION 'La política del catálogo exige valores globales con alcance SYSTEM';
    END IF;
  END IF;

  FOR required_entry IN
    SELECT item.key, item.value
    FROM jsonb_each(COALESCE(policy->'required_metadata', '{}'::jsonb)) AS item
  LOOP
    configured_value := NEW.metadata->>required_entry.key;
    IF configured_value IS NULL OR btrim(configured_value) = '' THEN
      RAISE EXCEPTION 'El metadato % es obligatorio para este catálogo', required_entry.key;
    END IF;
    IF required_entry.value->>'type' = 'positive_integer'
       AND (configured_value !~ '^[1-9][0-9]*$') THEN
      RAISE EXCEPTION 'El metadato % debe ser un entero positivo', required_entry.key;
    END IF;
    IF COALESCE((required_entry.value->>'unique_within_group')::boolean, false) THEN
      PERFORM pg_advisory_xact_lock(
        hashtextextended(NEW.lookup_group_id::text || ':' || required_entry.key || ':' || configured_value, 0)
      );
      SELECT EXISTS (
        SELECT 1 FROM public.lookup_values AS other_value
        WHERE other_value.lookup_group_id = NEW.lookup_group_id
          AND other_value.id <> NEW.id
          AND other_value.metadata->>required_entry.key = configured_value
      ) INTO duplicate_exists;
      IF duplicate_exists THEN
        RAISE EXCEPTION 'El metadato % con valor % ya existe en este catálogo',
          required_entry.key, configured_value;
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END
$$;

CREATE TRIGGER trg_lookup_groups_management_policy
BEFORE INSERT OR UPDATE OF allows_tenant_items, management_policy
ON public.lookup_groups
FOR EACH ROW
EXECUTE FUNCTION public.enforce_lookup_group_management_policy();

CREATE TRIGGER trg_lookup_values_management_policy
BEFORE INSERT OR UPDATE OF lookup_group_id, tenant_id, lookup_scope, metadata
ON public.lookup_values
FOR EACH ROW
EXECUTE FUNCTION public.enforce_lookup_value_management_policy();

CREATE TABLE public.api_authorization_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    route_prefix character varying NOT NULL,
    http_method character varying NOT NULL,
    screen_id uuid NOT NULL,
    action_id uuid NOT NULL,
    authorization_mode character varying DEFAULT 'PERMISSION'::character varying NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT api_authorization_rules_pkey PRIMARY KEY (id),
    CONSTRAINT uq_api_authorization_rules UNIQUE (route_prefix, http_method),
    CONSTRAINT api_authorization_rules_method_chk
      CHECK (http_method IN ('*', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
    CONSTRAINT api_authorization_rules_mode_chk
      CHECK (authorization_mode IN ('PERMISSION', 'AUTHENTICATED')),
    CONSTRAINT api_authorization_rules_route_chk
      CHECK (route_prefix ~ '^/[A-Za-z0-9_./:-]+$'),
    CONSTRAINT api_authorization_rules_screen_id_fkey
      FOREIGN KEY (screen_id) REFERENCES public.screens(id),
    CONSTRAINT api_authorization_rules_action_id_fkey
      FOREIGN KEY (action_id) REFERENCES public.actions(id)
);

CREATE INDEX idx_api_authorization_rules_match
  ON public.api_authorization_rules (http_method, route_prefix)
  WHERE is_active = true;

CREATE TABLE public.data_access_authorization_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name character varying NOT NULL,
    operation character varying NOT NULL,
    screen_id uuid NOT NULL,
    action_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT data_access_authorization_rules_pkey PRIMARY KEY (id),
    CONSTRAINT uq_data_access_authorization_rules UNIQUE (table_name, operation),
    CONSTRAINT data_access_authorization_rules_table_chk
      CHECK (table_name ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT data_access_authorization_rules_operation_chk
      CHECK (operation IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'UPSERT')),
    CONSTRAINT data_access_authorization_rules_screen_id_fkey
      FOREIGN KEY (screen_id) REFERENCES public.screens(id),
    CONSTRAINT data_access_authorization_rules_action_id_fkey
      FOREIGN KEY (action_id) REFERENCES public.actions(id)
);

CREATE TABLE public.attendance_event_punch_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    attendance_event_id uuid NOT NULL,
    punch_key_lookup_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT attendance_event_punch_keys_pkey PRIMARY KEY (id),
    CONSTRAINT uq_attendance_event_punch_keys UNIQUE (tenant_id, attendance_event_id, punch_key_lookup_id),
    CONSTRAINT attendance_event_punch_keys_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
    CONSTRAINT attendance_event_punch_keys_event_id_fkey FOREIGN KEY (attendance_event_id) REFERENCES public.attendance_events(id),
    CONSTRAINT attendance_event_punch_keys_punch_key_id_fkey FOREIGN KEY (punch_key_lookup_id) REFERENCES public.lookup_values(id)
);

CREATE FUNCTION public.punch_key_metadata(p_lookup_value_id uuid) RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(value.metadata, '{}'::jsonb)
  FROM public.lookup_values value
  JOIN public.lookup_groups group_row
    ON group_row.id = value.lookup_group_id
   AND group_row.lookup_group_key = 'PUNCH_KEY'
   AND group_row.is_active = true
  WHERE value.id = p_lookup_value_id AND value.is_active = true
  LIMIT 1
$$;

CREATE FUNCTION public.punch_key_semantic(p_lookup_value_id uuid, p_property text) RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(public.punch_key_metadata(p_lookup_value_id) ->> p_property, '')
$$;

CREATE FUNCTION public.resolve_attendance_timezone(
  p_tenant_id uuid,
  p_company_id uuid DEFAULT NULL,
  p_employee_profile_id uuid DEFAULT NULL,
  p_employee_id uuid DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  configured_value text;
  resolved_time_zone text;
BEGIN
  SELECT COALESCE(employee_setting.setting_value, profile_setting.setting_value,
                  company_setting.setting_value, tenant_setting.setting_value,
                  system_setting.default_value)
    INTO configured_value
  FROM public.system_settings system_setting
  LEFT JOIN public.tenant_settings tenant_setting
    ON tenant_setting.tenant_id = p_tenant_id
   AND tenant_setting.system_setting_id = system_setting.id AND tenant_setting.is_active
  LEFT JOIN public.company_settings company_setting
    ON p_company_id IS NOT NULL AND company_setting.tenant_id = p_tenant_id
   AND company_setting.company_id = p_company_id
   AND company_setting.system_setting_id = system_setting.id AND company_setting.is_active
  LEFT JOIN public.employee_profile_settings profile_setting
    ON p_employee_profile_id IS NOT NULL AND profile_setting.tenant_id = p_tenant_id
   AND profile_setting.employee_profile_id = p_employee_profile_id
   AND profile_setting.system_setting_id = system_setting.id AND profile_setting.is_active
  LEFT JOIN public.employee_settings employee_setting
    ON p_employee_id IS NOT NULL AND employee_setting.tenant_id = p_tenant_id
   AND employee_setting.employee_id = p_employee_id
   AND employee_setting.system_setting_id = system_setting.id AND employee_setting.is_active
  WHERE system_setting.setting_key = 'ATTENDANCE_TIMEZONE' AND system_setting.is_active
  LIMIT 1;

  IF NULLIF(btrim(configured_value), '') IS NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_TIMEZONE no está configurado para el tenant %', p_tenant_id;
  END IF;

  SELECT value.lookup_short_label INTO resolved_time_zone
  FROM public.lookup_values value
  JOIN public.lookup_groups group_row
    ON group_row.id = value.lookup_group_id
   AND group_row.lookup_group_key = 'ATTENDANCE_TIMEZONE' AND group_row.is_active
  WHERE value.is_active AND (value.tenant_id IS NULL OR value.tenant_id = p_tenant_id)
    AND (value.lookup_key = configured_value OR value.lookup_short_label = configured_value)
  ORDER BY CASE WHEN value.tenant_id = p_tenant_id THEN 0 ELSE 1 END
  LIMIT 1;

  IF NULLIF(btrim(resolved_time_zone), '') IS NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_TIMEZONE referencia un valor inexistente o inactivo: %', configured_value;
  END IF;
  RETURN resolved_time_zone;
END
$$;

CREATE FUNCTION public.attendance_timezone_for_punch(
  p_punch_time_zone text,
  p_tenant_id uuid,
  p_employee_id uuid DEFAULT NULL
) RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(NULLIF(btrim(p_punch_time_zone), ''),
                  public.resolve_attendance_timezone(p_tenant_id, NULL, NULL, p_employee_id))
$$;

COMMIT;

-- Completed on 2026-07-10 04:20:25

--
-- PostgreSQL database dump complete
--

-- ============================================================================
-- Entrega en tiempo real y reconciliación del ciclo de vida de notificaciones
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.notify_user_notification_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row jsonb;
  v_old_row jsonb;
BEGIN
  v_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  PERFORM pg_notify(
    'user_notifications_changed',
    jsonb_build_object(
      'operation', TG_OP,
      'tenant_id', v_row->>'tenant_id',
      'user_id', v_row->>'user_id',
      'notification_id', v_row->>'id',
      'emitted_at', clock_timestamp()
    )::text
  );

  IF TG_OP = 'UPDATE'
     AND (OLD.tenant_id, OLD.user_id) IS DISTINCT FROM (NEW.tenant_id, NEW.user_id) THEN
    v_old_row := to_jsonb(OLD);
    PERFORM pg_notify(
      'user_notifications_changed',
      jsonb_build_object(
        'operation', 'RECIPIENT_CHANGED',
        'tenant_id', v_old_row->>'tenant_id',
        'user_id', v_old_row->>'user_id',
        'notification_id', v_old_row->>'id',
        'emitted_at', clock_timestamp()
      )::text
    );
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_related_user_notifications_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row jsonb;
  v_recipient record;
BEGIN
  v_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  FOR v_recipient IN
    SELECT DISTINCT notification.tenant_id, notification.user_id, notification.id
    FROM public.user_notifications notification
    WHERE notification.tenant_id = NULLIF(v_row->>'tenant_id', '')::uuid
      AND notification.is_active
      AND (
        (notification.ref_table = TG_TABLE_NAME AND notification.ref_id = NULLIF(v_row->>'id', '')::uuid)
        OR (
          TG_TABLE_NAME = 'employee_time_punches'
          AND notification.ref_table = 'employee_time_punches'
          AND notification.metadata->>'employee_id' = v_row->>'employee_id'
        )
      )
  LOOP
    PERFORM pg_notify(
      'user_notifications_changed',
      jsonb_build_object(
        'operation', 'REFERENCE_CHANGED',
        'tenant_id', v_recipient.tenant_id,
        'user_id', v_recipient.user_id,
        'notification_id', v_recipient.id,
        'emitted_at', clock_timestamp()
      )::text
    );
  END LOOP;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_requester_status_notification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_request jsonb := to_jsonb(NEW);
  v_requester_user_id uuid;
  v_status_key text;
  v_notification_type_id uuid;
  v_notification_type_metadata jsonb;
  v_status_content jsonb;
  v_actor text;
BEGIN
  SELECT employee.user_id
    INTO v_requester_user_id
  FROM public.employees employee
  WHERE employee.id = NULLIF(v_request->>'employee_id', '')::uuid
    AND employee.tenant_id = NULLIF(v_request->>'tenant_id', '')::uuid
    AND employee.is_active
  LIMIT 1;

  IF v_requester_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT NULLIF(status.metadata->>'notification_status_key', '')
    INTO v_status_key
  FROM public.lookup_values status
  WHERE status.id = NULLIF(v_request->>'request_status_id', '')::uuid
    AND status.is_active
  LIMIT 1;

  IF v_status_key IS NULL THEN
    RAISE EXCEPTION 'El estado de la solicitud no tiene notification_status_key configurado';
  END IF;

  SELECT notification_type.id, notification_type.metadata
    INTO v_notification_type_id, v_notification_type_metadata
  FROM public.lookup_values notification_type
  JOIN public.lookup_groups group_row
    ON group_row.id = notification_type.lookup_group_id
   AND group_row.lookup_group_key = 'USER_NOTIFICATION_TYPE'
   AND group_row.is_active
  WHERE notification_type.is_active
    AND (notification_type.tenant_id IS NULL OR notification_type.tenant_id = NULLIF(v_request->>'tenant_id', '')::uuid)
    AND notification_type.metadata->>'audience' = 'REQUESTER_STATUS'
    AND notification_type.metadata->>'reference_table' = TG_TABLE_NAME
  ORDER BY CASE WHEN notification_type.tenant_id = NULLIF(v_request->>'tenant_id', '')::uuid THEN 0 ELSE 1 END
  LIMIT 1;

  v_status_content := v_notification_type_metadata->'status_content'->v_status_key;
  IF v_notification_type_id IS NULL
     OR NULLIF(v_status_content->>'title', '') IS NULL
     OR NULLIF(v_status_content->>'message', '') IS NULL
     OR NULLIF(COALESCE(v_status_content->>'icon_key', v_notification_type_metadata->>'icon_key'), '') IS NULL THEN
    RAISE EXCEPTION 'Configuración incompleta de notificación para %.%', TG_TABLE_NAME, v_status_key;
  END IF;

  v_actor := COALESCE(NULLIF(v_request->>'updated_by', ''), NULLIF(v_request->>'created_by', ''), 'DATABASE');

  UPDATE public.user_notifications notification
  SET title = v_status_content->>'title',
      message = v_status_content->>'message',
      icon_key = COALESCE(v_status_content->>'icon_key', v_notification_type_metadata->>'icon_key'),
      metadata = COALESCE(notification.metadata, '{}'::jsonb)
        || jsonb_build_object('request_status_key', v_status_key),
      is_read = false,
      read_at = NULL,
      is_active = true,
      updated_by = v_actor,
      updated_at = now()
  WHERE notification.tenant_id = NULLIF(v_request->>'tenant_id', '')::uuid
    AND notification.user_id = v_requester_user_id
    AND notification.notification_type_id = v_notification_type_id
    AND notification.ref_table = TG_TABLE_NAME
    AND notification.ref_id = NULLIF(v_request->>'id', '')::uuid
    AND notification.is_active;

  IF NOT FOUND THEN
    INSERT INTO public.user_notifications (
      id, tenant_id, user_id, notification_type_id, title, message,
      icon_key, ref_table, ref_id, metadata, is_read, is_active, created_by
    ) VALUES (
      gen_random_uuid(), NULLIF(v_request->>'tenant_id', '')::uuid,
      v_requester_user_id, v_notification_type_id,
      v_status_content->>'title', v_status_content->>'message',
      COALESCE(v_status_content->>'icon_key', v_notification_type_metadata->>'icon_key'),
      TG_TABLE_NAME, NULLIF(v_request->>'id', '')::uuid,
      jsonb_build_object('request_status_key', v_status_key), false, true, v_actor
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_notifications_realtime_notify ON public.user_notifications;
CREATE TRIGGER trg_user_notifications_realtime_notify
AFTER INSERT OR UPDATE OR DELETE ON public.user_notifications
FOR EACH ROW EXECUTE FUNCTION public.notify_user_notification_changed();

DROP TRIGGER IF EXISTS trg_absence_requests_notification_refresh ON public.employee_absence_requests;
CREATE TRIGGER trg_absence_requests_notification_refresh
AFTER UPDATE OR DELETE ON public.employee_absence_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_related_user_notifications_changed();

DROP TRIGGER IF EXISTS trg_shift_change_requests_notification_refresh ON public.employee_shift_change_requests;
CREATE TRIGGER trg_shift_change_requests_notification_refresh
AFTER UPDATE OR DELETE ON public.employee_shift_change_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_related_user_notifications_changed();

DROP TRIGGER IF EXISTS trg_time_punch_change_requests_notification_refresh ON public.employee_time_punch_change_requests;
CREATE TRIGGER trg_time_punch_change_requests_notification_refresh
AFTER UPDATE OR DELETE ON public.employee_time_punch_change_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_related_user_notifications_changed();

DROP TRIGGER IF EXISTS trg_time_punches_notification_refresh ON public.employee_time_punches;
CREATE TRIGGER trg_time_punches_notification_refresh
AFTER INSERT OR UPDATE OR DELETE ON public.employee_time_punches
FOR EACH ROW EXECUTE FUNCTION public.notify_related_user_notifications_changed();

DROP TRIGGER IF EXISTS trg_absence_requests_requester_status_notification ON public.employee_absence_requests;
CREATE TRIGGER trg_absence_requests_requester_status_notification
AFTER INSERT OR UPDATE OF request_status_id ON public.employee_absence_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_requester_status_notification();

DROP TRIGGER IF EXISTS trg_shift_change_requests_requester_status_notification ON public.employee_shift_change_requests;
CREATE TRIGGER trg_shift_change_requests_requester_status_notification
AFTER INSERT OR UPDATE OF request_status_id ON public.employee_shift_change_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_requester_status_notification();

DROP TRIGGER IF EXISTS trg_time_punch_change_requests_requester_status_notification ON public.employee_time_punch_change_requests;
CREATE TRIGGER trg_time_punch_change_requests_requester_status_notification
AFTER INSERT OR UPDATE OF request_status_id ON public.employee_time_punch_change_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_requester_status_notification();

COMMIT;


