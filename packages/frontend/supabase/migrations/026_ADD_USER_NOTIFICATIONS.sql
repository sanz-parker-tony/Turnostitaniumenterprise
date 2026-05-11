-- ============================================================================
-- 026_ADD_USER_NOTIFICATIONS
-- Crea tabla de notificaciones por usuario + catalogo de tipos.
-- Idempotente.
-- ============================================================================

SET search_path TO public;

-- 1) Catalogo de tipos de notificacion
DO $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT id
    INTO v_group_id
  FROM public.lookup_groups
  WHERE lookup_group_key = 'USER_NOTIFICATION_TYPE'
  LIMIT 1;

  IF v_group_id IS NULL THEN
    INSERT INTO public.lookup_groups (
      id,
      lookup_group_key,
      lookup_group_label,
      lookup_group_short_label,
      allows_tenant_items,
      is_active,
      created_by
    )
    VALUES (
      gen_random_uuid(),
      'USER_NOTIFICATION_TYPE',
      'Tipos de Notificacion Usuario',
      'Tipo Notificacion',
      false,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_group_id;
  END IF;

  INSERT INTO public.lookup_values (
    id,
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
  SELECT gen_random_uuid(), NULL, v_group_id, x.lookup_key, x.lookup_label, x.lookup_short_label, 'SYSTEM', x.sort_order, true, 'SYSTEM'
  FROM (
    VALUES
      ('SHIFT_CHANGE_REQUEST_CREATED', 'Solicitud Cambio Turno Creada', 'Cambio Turno Nueva', 10),
      ('SHIFT_CHANGE_REQUEST_DECIDED', 'Solicitud Cambio Turno Resuelta', 'Cambio Turno Resuelta', 20),
      ('ABSENCE_REQUEST_CREATED', 'Solicitud Permiso Creada', 'Permiso Nuevo', 30),
      ('ABSENCE_REQUEST_DECIDED', 'Solicitud Permiso Resuelta', 'Permiso Resuelto', 40)
  ) AS x(lookup_key, lookup_label, lookup_short_label, sort_order)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.lookup_values lv
    WHERE lv.lookup_group_id = v_group_id
      AND UPPER(lv.lookup_key) = x.lookup_key
  );
END $$;

-- 2) Tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.user_notifications
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    notification_type_id uuid NOT NULL,
    title character varying COLLATE pg_catalog."default" NOT NULL,
    message text COLLATE pg_catalog."default" NOT NULL,
    icon_key character varying COLLATE pg_catalog."default",
    ref_table character varying COLLATE pg_catalog."default",
    ref_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_read boolean NOT NULL DEFAULT false,
    read_at timestamp with time zone,
    is_active boolean NOT NULL DEFAULT true,
    created_by character varying COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by character varying COLLATE pg_catalog."default",
    updated_at timestamp with time zone,
    CONSTRAINT user_notifications_pkey PRIMARY KEY (id),
    CONSTRAINT user_notifications_tenant_id_fkey FOREIGN KEY (tenant_id)
      REFERENCES public.tenants (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id)
      REFERENCES public.users (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT user_notifications_type_id_fkey FOREIGN KEY (notification_type_id)
      REFERENCES public.lookup_values (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT ck_user_notifications_read_at
      CHECK (is_read = false OR read_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON public.user_notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_tenant_type
  ON public.user_notifications (tenant_id, notification_type_id, created_at DESC);

