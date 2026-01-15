# 🎯 LÓGICA DE ROUTING - TURNOS TITANIUM ENTERPRISE

## **REGLA MAESTRA:**

El estado del wizard (`tenant_onboarding.onboarding_status`) controla TODO el routing del sistema.

---

## **1️⃣ WIZARD NO COMPLETADO**

**Condición:** `onboarding_status != 'COMPLETED'` (o no existe registro)

| Ruta Solicitada | Acción |
|----------------|--------|
| `/` | ➡️ Redirigir a `/system/setup` |
| `/system/setup` | ✅ PERMITIR |
| `/login` | ⛔ Redirigir a `/system/setup` |
| `/dashboard/*` | ⛔ Redirigir a `/system/setup` |
| `/kiosk/*` | ⛔ Redirigir a `/system/setup` |
| Cualquier otra | ⛔ Redirigir a `/system/setup` |

**Mensaje:** _"Sistema en configuración inicial. Complete el wizard."_

---

## **2️⃣ WIZARD COMPLETADO**

**Condición:** `onboarding_status = 'COMPLETED'`

| Ruta Solicitada | Acción |
|----------------|--------|
| `/` | ➡️ Redirigir a `/login` |
| `/system/setup` | ⛔ **BLOQUEADO** → Redirigir a `/login` |
| `/login` | ✅ PERMITIR (sin sesión) |
| `/dashboard/*` | ✅ PERMITIR (con sesión) |
| `/kiosk/*` | ✅ PERMITIR (con sesión) |

**Mensaje:** _"Wizard completado. Inicie sesión."_

---

## **3️⃣ VERIFICACIONES POR CAPA**

### **MIDDLEWARE (middleware.ts)**
- **Prioridad 1:** Verificar `tenant_onboarding.onboarding_status` en BD
- **Prioridad 2:** Aplicar reglas de routing según estado
- **Prioridad 3:** Validar sesión para rutas protegidas

### **PAGE (/) (app/page.tsx)**
- Verificar wizard en BD
- Si NO completado → `/system/setup`
- Si COMPLETADO → `/login`

### **SETUP PAGE (app/system/setup/page.tsx)**
- Verificación adicional de seguridad
- Si completado → `/login`
- Si NO completado → Mostrar wizard

---

## **4️⃣ FLUJO TÍPICO**

### **Primera Instalación:**
1. IT accede a cualquier URL
2. Sistema detecta: `onboarding_status != 'COMPLETED'`
3. Redirige a `/system/setup`
4. IT completa wizard (PASO 1-7)
5. Sistema crea tenant, empresa, admin, estructura
6. Actualiza `onboarding_status = 'COMPLETED'`
7. Redirige a `/login`
8. SYSTEM_ADMIN inicia sesión
9. Accede a `/dashboard/system` para configurar

### **Post-Instalación:**
1. Usuario accede a cualquier URL
2. Sistema detecta: `onboarding_status = 'COMPLETED'`
3. Bloquea `/system/setup`
4. Permite solo `/login` (sin sesión)
5. Usuario inicia sesión
6. Redirige según rol:
   - SYSTEM_ADMIN → `/dashboard/system`
   - RRHH_ADMIN → `/dashboard`
   - EMPLOYEE → `/kiosk`

---

## **5️⃣ PROTECCIONES CRÍTICAS**

### **⛔ NUNCA permitir:**
- `/system/setup` si `onboarding_status = 'COMPLETED'`
- Rutas protegidas sin sesión válida

### **✅ SIEMPRE verificar:**
1. Estado del wizard en BD (no localStorage)
2. Sesión válida para rutas protegidas
3. Rol correcto para acceso a módulos

---

## **6️⃣ CASOS ESPECIALES**

### **Reiniciar Wizard (NO RECOMENDADO):**
Si se necesita reiniciar el wizard:
```sql
UPDATE tenant_onboarding 
SET onboarding_status = 'IN_PROGRESS' 
WHERE id = 'xxx';
```

⚠️ **ADVERTENCIA:** Esto permite acceso a `/system/setup` nuevamente, pero puede causar inconsistencias.

### **Múltiples Tenants:**
Actualmente el sistema soporta **UN SOLO TENANT** (Enterprise On-Premise).
Si hay múltiples registros en `tenant_onboarding`, el middleware usa `.limit(1).single()`.

---

## **7️⃣ DEBUGGING**

Para verificar el estado actual:

```sql
SELECT onboarding_status, current_step 
FROM tenant_onboarding 
LIMIT 1;
```

Logs del middleware:
```
[MIDDLEWARE] Request: /ruta
[MIDDLEWARE] Wizard completado: true/false
[MIDDLEWARE] ✅ Sesión válida, permitir acceso
[MIDDLEWARE] ⛔ Wizard completado, /system/setup bloqueado → /login
```

---

## **8️⃣ ARCHIVOS CLAVE**

| Archivo | Responsabilidad |
|---------|----------------|
| `/middleware.ts` | Routing global + verificación wizard |
| `/app/page.tsx` | Redirección inicial |
| `/app/system/setup/page.tsx` | Wizard IT |
| `/app/login/page.tsx` | Login de usuarios |
| `/app/dashboard/system/*` | Módulo de configuración |

---

**Última actualización:** 2026-01-12
