# 🚀 Flujo de Onboarding - Turnos Titanium

## Descripción General

Sistema completo de registro, selección de plan, simulación de pago, y configuración inicial de tenant para nuevos clientes.

---

## 📋 Arquitectura del Flujo

```
┌─────────────────────┐
│  Landing Page       │  → Presentación del producto
│  /landing           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Pricing Page       │  → Selección de plan (Free/Starter/Pro/Enterprise)
│  /landing/pricing   │     Billing cycle (Mensual/Anual)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Sign Up Page       │  → Multi-step form:
│  /signup            │     1. Account info (email, password)
│                     │     2. Company info (nombre, tamaño)
└──────────┬──────────┘     3. Payment (simulado)
           │
           ▼
┌─────────────────────┐
│  create_tenant_     │  → Función de BD que crea:
│  with_subscription  │     • Tenant
│  (Supabase)         │     • Usuario admin
└──────────┬──────────┘     • Suscripción
           │                • Rol admin con permisos
           │                • Onboarding record
           ▼
┌─────────────────────┐
│  Onboarding Wizard  │  → Configuración inicial guiada:
│  /onboarding        │     • Detalles de empresa
│                     │     • Departamentos
└──────────┬──────────┘     • Turnos de ejemplo
           │
           ▼
┌─────────────────────┐
│  Dashboard          │  → Aplicación principal
│  /dashboard         │
└─────────────────────┘
```

---

## 🗄️ Base de Datos

### Tablas Nuevas

#### 1. `subscription_plans`
Catálogo de planes disponibles (seed data incluido).

```sql
- id (uuid, PK)
- plan_key (varchar, unique) -- 'FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'
- plan_name (varchar)
- plan_description (text)
- price_monthly (decimal)
- price_yearly (decimal)
- max_users, max_employees, max_companies (integer, nullable)
- features (jsonb) -- array de strings
- trial_days (integer)
- is_active, is_featured, sort_order
```

#### 2. `tenant_subscriptions`
Suscripción activa de cada tenant.

```sql
- id (uuid, PK)
- tenant_id (uuid, FK → tenants)
- plan_id (uuid, FK → subscription_plans)
- subscription_status (varchar) -- 'TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'
- billing_cycle (varchar) -- 'MONTHLY', 'YEARLY'
- trial_start_date, trial_end_date (date)
- subscription_start_date, subscription_end_date (date)
- next_billing_date (date)
- current_price (decimal) -- snapshot del precio al suscribirse
- auto_renew (boolean)
```

#### 3. `payment_transactions`
Historial de pagos (simulados inicialmente, preparados para Stripe).

```sql
- id (uuid, PK)
- tenant_id (uuid, FK → tenants)
- subscription_id (uuid, FK → tenant_subscriptions)
- transaction_type (varchar) -- 'SUBSCRIPTION', 'UPGRADE', 'DOWNGRADE', 'REFUND'
- transaction_status (varchar) -- 'PENDING', 'COMPLETED', 'FAILED', 'SIMULATED'
- amount (decimal)
- payment_method (varchar) -- 'CREDIT_CARD', 'SIMULATED'
- card_last_four, card_brand (varchar)
- external_payment_id (varchar) -- para Stripe
- billing_period_start, billing_period_end (date)
```

#### 4. `tenant_onboarding`
Progreso del wizard de onboarding.

```sql
- id (uuid, PK)
- tenant_id (uuid, unique, FK → tenants)
- user_id (uuid, FK → users)
- onboarding_status (varchar) -- 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'
- completed_steps (jsonb) -- ["account_created", "company_created", ...]
- current_step (varchar)
- completion_percentage (integer)
- started_at, completed_at (timestamptz)
```

### Función Principal

```sql
create_tenant_with_subscription(
  p_tenant_name varchar,
  p_auth_user_id uuid,
  p_user_email varchar,
  p_user_display_name varchar,
  p_plan_key varchar default 'FREE',
  p_billing_cycle varchar default 'MONTHLY'
) returns jsonb
```

**Hace:**
1. Crea el tenant
2. Vincula auth_user_id al tenant (tenant_members)
3. Crea usuario de aplicación (users)
4. Obtiene el plan seleccionado
5. Crea suscripción (con trial si aplica)
6. Registra transacción inicial
7. Crea registro de onboarding
8. Crea rol ADMIN_FULL con todos los permisos
9. Asigna el rol al usuario
10. Retorna JSON con IDs creados

---

## 🎨 Páginas Frontend

### 1. Landing Page (`/landing`)
- Hero section con propuesta de valor
- Features section (6 características principales)
- CTA para pricing
- Footer

**Características:**
- Diseño responsive
- Iconos de lucide-react
- Paleta de colores del brand (#0074D9, #2ECC71)

### 2. Pricing Page (`/landing/pricing`)
- Toggle Mensual/Anual (con badge de ahorro)
- 4 planes en grid
- Pricing dinámico según billing cycle
- Badges para plan popular
- Features con checkmarks
- Links a /signup con query params

**Query params:**
- `?plan=FREE|STARTER|PROFESSIONAL|ENTERPRISE`
- `&cycle=MONTHLY|YEARLY`

### 3. Sign Up Page (`/signup`)
Multi-step form con 3-4 pasos:

**Step 1: Account**
- Nombre completo
- Email
- Password + confirmación
- Validaciones en tiempo real

**Step 2: Company**
- Nombre de empresa
- Tamaño (dropdown)
- Industria (opcional)

**Step 3: Payment (solo si price > 0 y trial === 0)**
- Número de tarjeta (simulado)
- Nombre en tarjeta
- Expiración + CVV
- Banner de "Modo Demo"
- Formateo automático de campos

**Step 4: Processing**
- Loading spinner
- Llamada a función de BD
- Redirección a /onboarding

**Sidebar:**
- Resumen del plan
- Precio total
- Badge de trial si aplica

### 4. Onboarding Wizard (`/onboarding`)
Wizard interactivo con 5 steps:

1. **Welcome:** Presentación del wizard
2. **Company:** Detalles adicionales (dirección, teléfono, web)
3. **Departments:** Agregar departamentos con sugerencias
4. **Shifts:** Crear turno de ejemplo
5. **Complete:** Confirmación y CTA al dashboard

**Features:**
- Progress bar visual
- Íconos por step
- Opción de "Skip" en cada paso
- Guardado de progreso en BD
- Animaciones suaves

---

## 🔄 Integración con Supabase (TODO)

### En Sign Up Page

```typescript
import { supabase } from '@/lib/supabase';

// 1. Crear usuario en Auth
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: formData.email,
  password: formData.password,
});

// 2. Llamar función para crear tenant
const { data, error } = await supabase.rpc('create_tenant_with_subscription', {
  p_tenant_name: formData.companyName,
  p_auth_user_id: authData.user.id,
  p_user_email: formData.email,
  p_user_display_name: formData.fullName,
  p_plan_key: planKey,
  p_billing_cycle: billingCycle,
});

// 3. Redirigir a onboarding
router.push('/onboarding');
```

### En Onboarding Page

```typescript
// Actualizar progreso
const { error } = await supabase
  .from('tenant_onboarding')
  .update({
    completed_steps: ['account_created', 'company_created', 'departments_created'],
    current_step: 'shifts',
    completion_percentage: 75,
  })
  .eq('tenant_id', tenantId);

// Al completar:
const { error } = await supabase
  .from('tenant_onboarding')
  .update({
    onboarding_status: 'COMPLETED',
    completion_percentage: 100,
    completed_at: new Date().toISOString(),
  })
  .eq('tenant_id', tenantId);
```

### En Pricing Page

```typescript
// Cargar planes desde BD
const { data: plans, error } = await supabase
  .from('subscription_plans')
  .select('*')
  .eq('is_active', true)
  .order('sort_order');
```

---

## 🔐 RLS Policies

Todas las tablas nuevas tienen RLS habilitado:

- `subscription_plans`: SELECT público (para mostrar en landing)
- `tenant_subscriptions`: Solo el tenant dueño puede ver/actualizar
- `payment_transactions`: Solo el tenant dueño puede ver, sistema puede crear
- `tenant_onboarding`: Solo el tenant dueño puede ver/actualizar

---

## 🎯 Próximos Pasos de Implementación

### Fase 1: Frontend Mock (ACTUAL)
✅ Landing page
✅ Pricing page
✅ Sign up con simulación
✅ Onboarding wizard
✅ Navegación completa

### Fase 2: Integración Supabase
- [ ] Conectar Pricing page con BD
- [ ] Implementar registro real en Sign Up
- [ ] Llamar a create_tenant_with_subscription
- [ ] Persistir progreso de onboarding
- [ ] Autenticación con Supabase Auth

### Fase 3: Pasarela de Pago Real
- [ ] Integrar Stripe Checkout
- [ ] Webhooks para eventos de pago
- [ ] Actualizar transaction_status real
- [ ] Manejo de suscripciones recurring
- [ ] Portal de cliente para upgrade/downgrade

### Fase 4: Features Avanzados
- [ ] Emails transaccionales (welcome, trial ending, etc.)
- [ ] Dashboard de facturación
- [ ] Métricas de conversión
- [ ] Referral program
- [ ] Multi-currency support

---

## 💡 Notas de Diseño

### Paleta de Colores
- **Primario:** `#0074D9` (azul profesional)
- **Secundario:** `#2ECC71` (verde éxito)
- **Acento:** `#0056A3` (azul oscuro)
- **Success:** `#27AE60`
- **Error:** Rojo estándar de Tailwind

### Tipografía
- Font family: Inter (default de Tailwind)
- Headings: bold
- Body: normal weight

### Componentes Reutilizables
- Input fields con íconos
- Progress bar/stepper
- Pricing cards
- Feature lists con checkmarks

---

## 🐛 Testing

### Casos de Prueba

1. **Plan Free:**
   - Sin pago
   - Sin trial
   - Crear tenant directo

2. **Plan con Trial:**
   - Saltar pago
   - trial_start_date = hoy
   - trial_end_date = hoy + trial_days

3. **Plan Pagado sin Trial:**
   - Mostrar form de pago
   - Validar tarjeta (simulado)
   - Crear transaction con status SIMULATED

4. **Billing Cycle:**
   - Mensual: next_billing_date = +1 mes
   - Anual: next_billing_date = +1 año
   - Precio correcto según cycle

5. **Onboarding:**
   - Permitir skip en todos los steps
   - Guardar progreso
   - Completar al final

---

## 📞 Soporte

Para preguntas sobre este flujo:
- Revisar `/database/06_subscription_and_onboarding.sql`
- Consultar tablas de BD en Supabase
- Ver logs de función `create_tenant_with_subscription`
