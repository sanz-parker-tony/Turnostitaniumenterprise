-- Sanity migration:
-- Normalize employee_absence_requests to use justify_method_id
-- instead of legacy transaction_type_id.
--
-- This migration is idempotent and safe to run multiple times.

DO $$
DECLARE
  has_old_column boolean := false;
  has_new_column boolean := false;
  has_new_fk boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employee_absence_requests'
      AND column_name = 'transaction_type_id'
  ) INTO has_old_column;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employee_absence_requests'
      AND column_name = 'justify_method_id'
  ) INTO has_new_column;

  -- If only legacy column exists, rename it.
  IF has_old_column AND NOT has_new_column THEN
    ALTER TABLE public.employee_absence_requests
      RENAME COLUMN transaction_type_id TO justify_method_id;
    has_old_column := false;
    has_new_column := true;
  END IF;

  -- If both exist, migrate data into the new column.
  IF has_old_column AND has_new_column THEN
    UPDATE public.employee_absence_requests
    SET justify_method_id = COALESCE(justify_method_id, transaction_type_id)
    WHERE transaction_type_id IS NOT NULL;
  END IF;

  -- Drop legacy FK and indexes if they exist.
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employee_absence_requests_transaction_type_id_fkey'
  ) THEN
    ALTER TABLE public.employee_absence_requests
      DROP CONSTRAINT employee_absence_requests_transaction_type_id_fkey;
  END IF;

  DROP INDEX IF EXISTS public.idx_employee_absence_requests_transaction_type;
  DROP INDEX IF EXISTS public.employee_absence_requests_transaction_type_id_idx;

  -- Remove legacy column if still present.
  IF has_old_column AND has_new_column THEN
    ALTER TABLE public.employee_absence_requests
      DROP COLUMN transaction_type_id;
  END IF;

  -- Ensure target column exists.
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employee_absence_requests'
      AND column_name = 'justify_method_id'
  ) THEN
    ALTER TABLE public.employee_absence_requests
      ADD COLUMN justify_method_id uuid;
  END IF;

  -- Ensure FK on justify_method_id exists.
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'employee_absence_requests'
      AND c.conname = 'employee_absence_requests_justify_method_id_fkey'
  ) INTO has_new_fk;

  IF NOT has_new_fk THEN
    ALTER TABLE public.employee_absence_requests
      ADD CONSTRAINT employee_absence_requests_justify_method_id_fkey
      FOREIGN KEY (justify_method_id)
      REFERENCES public.lookup_values (id)
      ON UPDATE NO ACTION
      ON DELETE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employee_absence_requests_justify_method
  ON public.employee_absence_requests (justify_method_id);
