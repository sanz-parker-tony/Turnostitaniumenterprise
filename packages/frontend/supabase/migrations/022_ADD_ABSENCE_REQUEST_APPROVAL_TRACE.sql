-- Adds traceability fields for approval decisions on employee absence requests.
-- Idempotent migration.

ALTER TABLE IF EXISTS public.employee_absence_requests
  ADD COLUMN IF NOT EXISTS approval_notes text;

ALTER TABLE IF EXISTS public.employee_absence_requests
  ADD COLUMN IF NOT EXISTS approved_by uuid;

ALTER TABLE IF EXISTS public.employee_absence_requests
  ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employee_absence_requests_approved_by_fkey'
  ) THEN
    ALTER TABLE public.employee_absence_requests
      ADD CONSTRAINT employee_absence_requests_approved_by_fkey
      FOREIGN KEY (approved_by)
      REFERENCES public.users (id)
      ON UPDATE NO ACTION
      ON DELETE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employee_absence_requests_approved_by
  ON public.employee_absence_requests (approved_by);

CREATE INDEX IF NOT EXISTS idx_employee_absence_requests_approved_at
  ON public.employee_absence_requests (approved_at);
