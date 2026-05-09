-- Add discount method catalog and relation for employee absence requests.
-- Keys:
-- - VACATION_CHARGE
-- - PAID_LEAVE
-- - UNPAID_LEAVE

INSERT INTO public.lookup_groups (
  lookup_group_key,
  lookup_group_label,
  lookup_group_short_label,
  allows_tenant_items,
  is_active,
  created_by
)
VALUES (
  'ABSENCE_TRANSACTION_TYPE',
  'Tipo de Transacción de Solicitud',
  'Tipo Trans.',
  false,
  true,
  'SYSTEM'
)
ON CONFLICT (lookup_group_key) DO UPDATE
SET
  lookup_group_label = EXCLUDED.lookup_group_label,
  lookup_group_short_label = EXCLUDED.lookup_group_short_label,
  is_active = true;

INSERT INTO public.lookup_values (
  tenant_id,
  lookup_group_id,
  lookup_key,
  lookup_label,
  lookup_short_label,
  lookup_scope,
  sort_order,
  is_active,
  created_by
)
SELECT
  NULL,
  lg.id,
  vals.lookup_key,
  vals.lookup_label,
  vals.lookup_short_label,
  'SYSTEM',
  vals.sort_order,
  true,
  'SYSTEM'
FROM public.lookup_groups lg
CROSS JOIN (
  VALUES
    ('VACATION_CHARGE', 'Cargo a Vacaciones', 'Vacaciones', 10),
    ('PAID_LEAVE', 'Permiso con Sueldo', 'Con Sueldo', 20),
    ('UNPAID_LEAVE', 'Permiso sin Sueldo', 'Sin Sueldo', 30)
) AS vals(lookup_key, lookup_label, lookup_short_label, sort_order)
WHERE lg.lookup_group_key = 'ABSENCE_TRANSACTION_TYPE'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO UPDATE
SET
  lookup_label = EXCLUDED.lookup_label,
  lookup_short_label = EXCLUDED.lookup_short_label,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

ALTER TABLE IF EXISTS public.employee_absence_requests
  ADD COLUMN IF NOT EXISTS justify_method_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employee_absence_requests'
      AND column_name = 'transaction_type_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employee_absence_requests'
      AND column_name = 'justify_method_id'
  ) THEN
    ALTER TABLE public.employee_absence_requests
      RENAME COLUMN transaction_type_id TO justify_method_id;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employee_absence_requests_justify_method_id_fkey'
  ) THEN
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
