-- Vinculo empleado -> usuario del sistema
ALTER TABLE IF EXISTS public.employees
  ADD COLUMN IF NOT EXISTS user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employees_user_id_fkey'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users (id)
      ON UPDATE NO ACTION
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_user_id
  ON public.employees (user_id)
  WHERE user_id IS NOT NULL;

