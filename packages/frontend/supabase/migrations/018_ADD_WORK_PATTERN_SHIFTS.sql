-- ============================================================================
-- 018_ADD_WORK_PATTERN_SHIFTS
-- Detalle de secuencia de turnos por patron de trabajo (padre-hijo)
-- ============================================================================

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.work_pattern_shifts
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    work_pattern_id uuid NOT NULL,
    shift_id uuid NOT NULL,
    sequence_number integer NOT NULL,
    cycle_day_number integer NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_by character varying NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT work_pattern_shifts_pkey PRIMARY KEY (id),
    CONSTRAINT work_pattern_shifts_tenant_id_fkey FOREIGN KEY (tenant_id)
      REFERENCES public.tenants (id)
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT work_pattern_shifts_work_pattern_id_fkey FOREIGN KEY (work_pattern_id)
      REFERENCES public.work_patterns (id)
      ON UPDATE NO ACTION
      ON DELETE CASCADE,
    CONSTRAINT work_pattern_shifts_shift_id_fkey FOREIGN KEY (shift_id)
      REFERENCES public.shifts (id)
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT uq_work_pattern_shifts_pattern_sequence UNIQUE (work_pattern_id, sequence_number),
    CONSTRAINT uq_work_pattern_shifts_pattern_cycle_day UNIQUE (work_pattern_id, cycle_day_number),
    CONSTRAINT ck_work_pattern_shifts_sequence_positive CHECK (sequence_number > 0),
    CONSTRAINT ck_work_pattern_shifts_cycle_day_positive CHECK (cycle_day_number > 0)
);

CREATE INDEX IF NOT EXISTS idx_work_pattern_shifts_pattern
  ON public.work_pattern_shifts (work_pattern_id, sequence_number);
