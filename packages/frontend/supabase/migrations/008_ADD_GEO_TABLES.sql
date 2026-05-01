-- Geografia normalizada para pais/provincia-ciudad
-- Incluye relacion con holidays mediante country_id/state_id/city_id

CREATE TABLE IF NOT EXISTS public.countries
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    country_code character varying NOT NULL,
    country_name character varying NOT NULL,
    country_short_name character varying,
    is_active boolean NOT NULL DEFAULT true,
    created_by character varying NOT NULL DEFAULT 'system',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT countries_pkey PRIMARY KEY (id),
    CONSTRAINT countries_country_code_key UNIQUE (country_code)
);

CREATE INDEX IF NOT EXISTS idx_countries_active_name
    ON public.countries (is_active, country_name);

CREATE TABLE IF NOT EXISTS public.states
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    country_id uuid NOT NULL,
    state_code character varying NOT NULL,
    state_name character varying NOT NULL,
    state_short_name character varying,
    is_active boolean NOT NULL DEFAULT true,
    created_by character varying NOT NULL DEFAULT 'system',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT states_pkey PRIMARY KEY (id),
    CONSTRAINT states_country_id_fkey FOREIGN KEY (country_id)
        REFERENCES public.countries (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT states_country_state_code_key UNIQUE (country_id, state_code)
);

CREATE INDEX IF NOT EXISTS idx_states_country_active_name
    ON public.states (country_id, is_active, state_name);

CREATE TABLE IF NOT EXISTS public.cities
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    country_id uuid NOT NULL,
    state_id uuid NOT NULL,
    city_code character varying NOT NULL,
    city_name character varying NOT NULL,
    city_short_name character varying,
    is_active boolean NOT NULL DEFAULT true,
    created_by character varying NOT NULL DEFAULT 'system',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT cities_pkey PRIMARY KEY (id),
    CONSTRAINT cities_country_id_fkey FOREIGN KEY (country_id)
        REFERENCES public.countries (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT cities_state_id_fkey FOREIGN KEY (state_id)
        REFERENCES public.states (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT cities_state_city_code_key UNIQUE (state_id, city_code)
);

CREATE INDEX IF NOT EXISTS idx_cities_state_active_name
    ON public.cities (state_id, is_active, city_name);

DO $$
BEGIN
  -- Reemplaza llaves foraneas de holidays hacia tablas normalizadas.
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'holidays'
      AND constraint_name = 'holidays_country_id_fkey'
  ) THEN
    ALTER TABLE public.holidays DROP CONSTRAINT holidays_country_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'holidays'
      AND constraint_name = 'holidays_state_id_fkey'
  ) THEN
    ALTER TABLE public.holidays DROP CONSTRAINT holidays_state_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'holidays'
      AND constraint_name = 'holidays_city_id_fkey'
  ) THEN
    ALTER TABLE public.holidays DROP CONSTRAINT holidays_city_id_fkey;
  END IF;
END $$;

ALTER TABLE public.holidays
  ADD CONSTRAINT holidays_country_id_fkey
    FOREIGN KEY (country_id) REFERENCES public.countries (id)
    ON UPDATE NO ACTION ON DELETE NO ACTION NOT VALID;

ALTER TABLE public.holidays
  ADD CONSTRAINT holidays_state_id_fkey
    FOREIGN KEY (state_id) REFERENCES public.states (id)
    ON UPDATE NO ACTION ON DELETE NO ACTION NOT VALID;

ALTER TABLE public.holidays
  ADD CONSTRAINT holidays_city_id_fkey
    FOREIGN KEY (city_id) REFERENCES public.cities (id)
    ON UPDATE NO ACTION ON DELETE NO ACTION NOT VALID;

