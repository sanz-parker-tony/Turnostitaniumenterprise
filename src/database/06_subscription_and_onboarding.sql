/* ================================================================================================
 Turnos Titanium — TABLAS DE SUSCRIPCIONES Y ONBOARDING
 Fecha: 2025-01-03
 Propósito: Manejar planes, suscripciones, pagos simulados, y proceso de onboarding
================================================================================================ */

----------------------------------------------------------------------------------------------------
-- 1) PLANES DE SUSCRIPCIÓN (catálogo de planes disponibles)
----------------------------------------------------------------------------------------------------

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  
  -- Identificación del plan
  plan_key varchar(50) unique not null,  -- 'FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'
  plan_name varchar(100) not null,
  plan_description text,
  
  -- Pricing
  price_monthly decimal(10,2) not null default 0.00,
  price_yearly decimal(10,2) not null default 0.00,
  currency_code char(3) not null default 'USD',
  
  -- Límites del plan
  max_users integer,                    -- null = ilimitado
  max_employees integer,
  max_companies integer,
  max_locations integer,
  
  -- Features (JSON flexible para features específicos)
  features jsonb default '[]'::jsonb,   -- ["Reportes Avanzados", "API Access", "Soporte 24/7"]
  
  -- Configuración
  trial_days integer default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  
  -- Auditoría
  created_by varchar(100) default 'SYSTEM',
  created_at timestamptz not null default now(),
  updated_by varchar(100),
  updated_at timestamptz,
  
  -- Constraints
  constraint subscription_plans_price_check check (price_monthly >= 0 and price_yearly >= 0)
);

create index if not exists idx_subscription_plans_active on public.subscription_plans(is_active, sort_order);

comment on table public.subscription_plans is 'Catálogo de planes de suscripción disponibles';

----------------------------------------------------------------------------------------------------
-- 2) SUSCRIPCIONES DE TENANTS
----------------------------------------------------------------------------------------------------

create table if not exists public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  
  -- Relaciones
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  
  -- Estado de la suscripción
  subscription_status varchar(20) not null default 'TRIAL',
  -- 'TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'
  
  -- Período de facturación
  billing_cycle varchar(20) not null default 'MONTHLY',  -- 'MONTHLY', 'YEARLY'
  
  -- Fechas importantes
  trial_start_date date,
  trial_end_date date,
  subscription_start_date date not null,
  subscription_end_date date,
  next_billing_date date,
  cancelled_at timestamptz,
  
  -- Pricing actual (guardamos snapshot del precio al momento de suscribirse)
  current_price decimal(10,2) not null,
  currency_code char(3) not null default 'USD',
  
  -- Configuración
  auto_renew boolean not null default true,
  is_active boolean not null default true,
  
  -- Notas
  cancellation_reason text,
  notes text,
  
  -- Auditoría
  created_by varchar(100) default 'SYSTEM',
  created_at timestamptz not null default now(),
  updated_by varchar(100),
  updated_at timestamptz,
  
  -- Constraints
  constraint tenant_subscriptions_dates_check 
    check (subscription_start_date <= coalesce(subscription_end_date, subscription_start_date))
);

create index if not exists idx_tenant_subscriptions_tenant on public.tenant_subscriptions(tenant_id);
create index if not exists idx_tenant_subscriptions_status on public.tenant_subscriptions(subscription_status);
create index if not exists idx_tenant_subscriptions_next_billing on public.tenant_subscriptions(next_billing_date) 
  where is_active = true;

comment on table public.tenant_subscriptions is 'Suscripciones activas de cada tenant';

----------------------------------------------------------------------------------------------------
-- 3) HISTORIAL DE PAGOS (simulados inicialmente)
----------------------------------------------------------------------------------------------------

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  
  -- Relaciones
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subscription_id uuid references public.tenant_subscriptions(id),
  
  -- Información del pago
  transaction_type varchar(20) not null default 'SUBSCRIPTION',
  -- 'SUBSCRIPTION', 'UPGRADE', 'DOWNGRADE', 'REFUND'
  
  transaction_status varchar(20) not null default 'PENDING',
  -- 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'SIMULATED'
  
  -- Montos
  amount decimal(10,2) not null,
  currency_code char(3) not null default 'USD',
  
  -- Método de pago (simulado)
  payment_method varchar(20),  -- 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'SIMULATED'
  card_last_four varchar(4),
  card_brand varchar(20),      -- 'VISA', 'MASTERCARD', 'AMEX'
  
  -- Referencias externas (para cuando integremos Stripe/PayPal)
  external_payment_id varchar(255),
  external_customer_id varchar(255),
  
  -- Período cubierto
  billing_period_start date,
  billing_period_end date,
  
  -- Metadata
  payment_metadata jsonb default '{}'::jsonb,
  error_message text,
  
  -- Auditoría
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  
  -- Constraints
  constraint payment_transactions_amount_check check (amount >= 0)
);

create index if not exists idx_payment_transactions_tenant on public.payment_transactions(tenant_id);
create index if not exists idx_payment_transactions_status on public.payment_transactions(transaction_status);
create index if not exists idx_payment_transactions_date on public.payment_transactions(created_at desc);

comment on table public.payment_transactions is 'Historial de transacciones de pago (simuladas y reales)';

----------------------------------------------------------------------------------------------------
-- 4) ONBOARDING PROGRESS (wizard de configuración inicial)
----------------------------------------------------------------------------------------------------

create table if not exists public.tenant_onboarding (
  id uuid primary key default gen_random_uuid(),
  
  -- Relación
  tenant_id uuid unique not null references public.tenants(id) on delete cascade,
  user_id uuid references public.users(id),  -- quien está haciendo el onboarding
  
  -- Estado general
  onboarding_status varchar(20) not null default 'IN_PROGRESS',
  -- 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'
  
  -- Steps completados (JSON con checklist)
  completed_steps jsonb default '[]'::jsonb,
  -- ["account_created", "plan_selected", "company_created", "first_employee", "first_shift"]
  
  current_step varchar(50),
  
  -- Progreso (0-100)
  completion_percentage integer not null default 0,
  
  -- Fechas
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  
  -- Notas
  notes text,
  
  -- Auditoría
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  
  -- Constraints
  constraint tenant_onboarding_percentage_check check (completion_percentage between 0 and 100)
);

create index if not exists idx_tenant_onboarding_status on public.tenant_onboarding(onboarding_status);

comment on table public.tenant_onboarding is 'Progreso del wizard de onboarding de cada tenant';

----------------------------------------------------------------------------------------------------
-- 5) TRIGGERS
----------------------------------------------------------------------------------------------------

create trigger set_tenant_subscriptions_updated_at
  before update on public.tenant_subscriptions
  for each row
  execute function set_updated_at();

create trigger set_tenant_onboarding_updated_at
  before update on public.tenant_onboarding
  for each row
  execute function set_updated_at();

----------------------------------------------------------------------------------------------------
-- 6) RLS POLICIES
----------------------------------------------------------------------------------------------------

alter table public.subscription_plans enable row level security;
alter table public.tenant_subscriptions enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.tenant_onboarding enable row level security;

-- subscription_plans: lectura pública (para mostrar en landing), escritura solo admin
create policy "Planes visibles públicamente"
  on public.subscription_plans for select
  using (is_active = true);

-- tenant_subscriptions: solo el tenant dueño
create policy "Tenant puede ver su suscripción"
  on public.tenant_subscriptions for select
  using (tenant_id = get_user_tenant_id());

create policy "Tenant puede actualizar su suscripción"
  on public.tenant_subscriptions for update
  using (tenant_id = get_user_tenant_id());

-- payment_transactions: solo el tenant dueño
create policy "Tenant puede ver sus pagos"
  on public.payment_transactions for select
  using (tenant_id = get_user_tenant_id());

create policy "Sistema puede crear pagos"
  on public.payment_transactions for insert
  with check (tenant_id = get_user_tenant_id());

-- tenant_onboarding: solo el tenant dueño
create policy "Tenant puede ver su onboarding"
  on public.tenant_onboarding for select
  using (tenant_id = get_user_tenant_id());

create policy "Tenant puede actualizar su onboarding"
  on public.tenant_onboarding for update
  using (tenant_id = get_user_tenant_id());

create policy "Sistema puede crear onboarding"
  on public.tenant_onboarding for insert
  with check (tenant_id = get_user_tenant_id());

----------------------------------------------------------------------------------------------------
-- 7) SEED DATA: PLANES DE SUSCRIPCIÓN
----------------------------------------------------------------------------------------------------

insert into public.subscription_plans (
  id, plan_key, plan_name, plan_description,
  price_monthly, price_yearly,
  max_users, max_employees, max_companies, max_locations,
  features, trial_days, is_active, is_featured, sort_order
) values
  -- Plan Free
  (
    '10000000-0000-0000-0000-000000000001'::uuid,
    'FREE',
    'Plan Gratuito',
    'Perfecto para probar Turnos Titanium',
    0.00, 0.00,
    3, 10, 1, 1,
    '["Dashboard básico", "Gestión de turnos", "1 empresa", "Hasta 10 empleados", "Soporte por email"]'::jsonb,
    0, true, false, 1
  ),
  -- Plan Starter
  (
    '10000000-0000-0000-0000-000000000002'::uuid,
    'STARTER',
    'Plan Starter',
    'Ideal para pequeñas empresas',
    29.99, 299.00,
    10, 50, 3, 5,
    '["Todo en Free", "Reportes básicos", "Hasta 3 empresas", "Hasta 50 empleados", "Soporte prioritario"]'::jsonb,
    14, true, false, 2
  ),
  -- Plan Professional (Featured)
  (
    '10000000-0000-0000-0000-000000000003'::uuid,
    'PROFESSIONAL',
    'Plan Professional',
    'Para empresas en crecimiento',
    79.99, 799.00,
    50, 500, 10, 25,
    '["Todo en Starter", "Reportes avanzados", "API Access", "Integraciones", "Hasta 10 empresas", "Hasta 500 empleados", "Soporte 24/7"]'::jsonb,
    30, true, true, 3
  ),
  -- Plan Enterprise
  (
    '10000000-0000-0000-0000-000000000004'::uuid,
    'ENTERPRISE',
    'Plan Enterprise',
    'Solución completa para grandes organizaciones',
    299.99, 2999.00,
    null, null, null, null,
    '["Todo en Professional", "Usuarios ilimitados", "Empresas ilimitadas", "Personalización completa", "Implementación dedicada", "Gerente de cuenta", "SLA garantizado"]'::jsonb,
    30, true, false, 4
  )
on conflict (id) do nothing;

----------------------------------------------------------------------------------------------------
-- 8) FUNCIÓN: CREAR TENANT CON SUSCRIPCIÓN AUTOMÁTICA
----------------------------------------------------------------------------------------------------

create or replace function public.create_tenant_with_subscription(
  p_tenant_name varchar,
  p_auth_user_id uuid,
  p_user_email varchar,
  p_user_display_name varchar,
  p_plan_key varchar default 'FREE',
  p_billing_cycle varchar default 'MONTHLY'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_user_id uuid;
  v_plan_id uuid;
  v_subscription_id uuid;
  v_onboarding_id uuid;
  v_plan_price decimal(10,2);
  v_trial_days integer;
  v_result jsonb;
begin
  -- 1. Crear tenant
  insert into tenants (tenant_name, is_active, created_by)
  values (p_tenant_name, true, 'SYSTEM')
  returning id into v_tenant_id;
  
  -- 2. Vincular auth user al tenant
  insert into tenant_members (tenant_id, auth_user_id, member_role)
  values (v_tenant_id, p_auth_user_id, 'owner');
  
  -- 3. Crear usuario de aplicación
  insert into users (
    tenant_id, auth_user_id, username, display_name, email,
    preferred_language_code, is_active, created_by
  )
  values (
    v_tenant_id, p_auth_user_id, split_part(p_user_email, '@', 1),
    p_user_display_name, p_user_email, 'es', true, 'SYSTEM'
  )
  returning id into v_user_id;
  
  -- 4. Obtener plan seleccionado
  select id, 
         case when p_billing_cycle = 'YEARLY' then price_yearly else price_monthly end,
         trial_days
  into v_plan_id, v_plan_price, v_trial_days
  from subscription_plans
  where plan_key = p_plan_key and is_active = true;
  
  if v_plan_id is null then
    raise exception 'Plan % no encontrado', p_plan_key;
  end if;
  
  -- 5. Crear suscripción
  insert into tenant_subscriptions (
    tenant_id, plan_id, subscription_status, billing_cycle,
    trial_start_date, trial_end_date,
    subscription_start_date, next_billing_date,
    current_price, currency_code, auto_renew, is_active, created_by
  )
  values (
    v_tenant_id, v_plan_id,
    case when v_trial_days > 0 then 'TRIAL' else 'ACTIVE' end,
    p_billing_cycle,
    case when v_trial_days > 0 then current_date else null end,
    case when v_trial_days > 0 then current_date + (v_trial_days || ' days')::interval else null end,
    current_date,
    case 
      when v_trial_days > 0 then current_date + (v_trial_days || ' days')::interval
      when p_billing_cycle = 'YEARLY' then current_date + interval '1 year'
      else current_date + interval '1 month'
    end,
    v_plan_price, 'USD', true, true, 'SYSTEM'
  )
  returning id into v_subscription_id;
  
  -- 6. Registrar transacción inicial (simulada si es FREE o en trial)
  if v_plan_price > 0 and v_trial_days = 0 then
    insert into payment_transactions (
      tenant_id, subscription_id, transaction_type, transaction_status,
      amount, currency_code, payment_method,
      billing_period_start, billing_period_end, processed_at
    )
    values (
      v_tenant_id, v_subscription_id, 'SUBSCRIPTION', 'SIMULATED',
      v_plan_price, 'USD', 'SIMULATED',
      current_date,
      case when p_billing_cycle = 'YEARLY' then current_date + interval '1 year' else current_date + interval '1 month' end,
      now()
    );
  end if;
  
  -- 7. Crear registro de onboarding
  insert into tenant_onboarding (
    tenant_id, user_id, onboarding_status,
    completed_steps, current_step, completion_percentage
  )
  values (
    v_tenant_id, v_user_id, 'IN_PROGRESS',
    '["account_created", "plan_selected"]'::jsonb,
    'company_setup',
    20
  )
  returning id into v_onboarding_id;
  
  -- 8. Crear rol de administrador y asignarlo
  -- (similar a lo que ya teníamos en el script de demo)
  declare
    v_role_id uuid;
  begin
    insert into roles (
      tenant_id, role_key, role_name, role_scope, is_active, created_by
    )
    values (
      v_tenant_id, 'ADMIN_FULL', 'Administrador Total', 'TENANT', true, 'SYSTEM'
    )
    returning id into v_role_id;
    
    -- Asignar todos los permisos
    insert into role_screen_actions (
      tenant_id, role_id, screen_action_id, is_allowed, is_active, created_by
    )
    select
      v_tenant_id, v_role_id, sa.id, true, true, 'SYSTEM'
    from screen_actions sa;
    
    -- Asignar rol al usuario
    insert into user_roles (
      tenant_id, user_id, role_id, is_active, created_by
    )
    values (
      v_tenant_id, v_user_id, v_role_id, true, 'SYSTEM'
    );
  end;
  
  -- 9. Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'user_id', v_user_id,
    'subscription_id', v_subscription_id,
    'onboarding_id', v_onboarding_id,
    'plan_key', p_plan_key,
    'has_trial', v_trial_days > 0,
    'trial_days', v_trial_days
  );
  
  return v_result;
end;
$$;

grant execute on function public.create_tenant_with_subscription to authenticated;

comment on function public.create_tenant_with_subscription is 
  'Crea un nuevo tenant con su suscripción, usuario admin, y configuración inicial';

----------------------------------------------------------------------------------------------------
-- VERIFICACIÓN
----------------------------------------------------------------------------------------------------

select 
  '✅ Tablas de Suscripciones Creadas' as status,
  (select count(*) from subscription_plans) as planes_disponibles,
  (select count(*) from subscription_plans where is_active = true) as planes_activos;
