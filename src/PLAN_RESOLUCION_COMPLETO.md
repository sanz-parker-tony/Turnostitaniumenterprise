# 🎯 PLAN DE RESOLUCIÓN COMPLETO - Turnos Titanium

## 🚨 PRIORIDAD 1: RESOLVER LOGIN (URGENTE)

### **Solución A: Usar el Helper HTML (MÁS FÁCIL)** ⭐

1. **Abre el archivo** `/reset-password-helper.html` en tu navegador
2. **Haz clic** en el botón "Resetear Contraseña de Admin"
3. **Espera** el mensaje de éxito
4. **Usa las credenciales** mostradas para login:
   - Email: `admin@turnos-titanium.com`
   - Password: `TurnosTitanium2025!`

### **Solución B: Ejecutar SQL + Script**

1. **Ejecuta** `/URGENT_FIX_ADMIN_LOGIN.sql` en Supabase SQL Editor
   - Esto diagnostica y corrige problemas de estructura
   - Crea usuario, tenant, rol si no existen
   - Limpia scopes incorrectos

2. **Ejecuta el reset** desde la consola del navegador:
   ```javascript
   fetch('https://fzegbmklxqjqkkpjctcl.supabase.co/functions/v1/make-server-e19f2094/admin/reset-password', {
     method: 'POST'
   })
   .then(res => res.json())
   .then(data => console.log(data));
   ```

---

## 🔧 PRIORIDAD 2: FIX FUNCIÓN DUPLICADA

**Después de resolver el login**, ejecuta:

**Script:** `/FIX_FUNCTION_OVERLOAD_SIMPLE.sql`

**Qué hace:**
- Elimina TODAS las versiones de `get_user_screens()`
- Crea UNA SOLA versión con tipo TEXT
- Resuelve el error PGRST203

**Verificación:**
```sql
SELECT COUNT(*) FROM pg_proc WHERE proname = 'get_user_screens';
-- Debe retornar: 1
```

---

## 📋 PRIORIDAD 3: MANTENIMIENTO TABLAS SYSTEM

### **Orden de implementación:**

#### **3.1 Mantenimiento de Screens** 
- CRUD completo de pantallas
- Gestión de traducciones
- Asignación de menú group
- Asignación de icono

#### **3.2 Mantenimiento de Actions**
- CRUD de acciones (CREATE, UPDATE, DELETE, RUN, etc.)
- Traducciones de acciones
- Validación de uso en screen_actions

#### **3.3 Gestión de Relaciones**
- **system_menu_groups → screens**: Un grupo contiene N pantallas
- **screens → screen_actions**: Una pantalla tiene N acciones
- **actions → screen_actions**: Una acción se usa en N pantallas
- Visualización en árbol jerárquico

---

## 📁 ARCHIVOS CREADOS

### **Para Login (URGENTE):**
- ✅ `/reset-password-helper.html` - Helper visual (RECOMENDADO)
- ✅ `/URGENT_FIX_ADMIN_LOGIN.sql` - Diagnóstico y fix SQL
- ✅ `/RESET_PASSWORD_COMMAND.md` - Instrucciones detalladas

### **Para Fix Función:**
- ✅ `/FIX_FUNCTION_OVERLOAD_SIMPLE.sql` - Fix duplicado
- ✅ `/CHECK_ALL_RPC_FUNCTIONS.sql` - Verificar otros duplicados
- ✅ `/DIAGNOSE_DUPLICATE_FUNCTIONS.sql` - Diagnóstico

### **Para Mantenimiento (YA IMPLEMENTADO):**
- ✅ `/components/SystemMenuGroups.tsx` - Pantalla de grupos de menú
- ✅ Backend: 5 endpoints en `/supabase/functions/server/index.tsx`

---

## 🎯 PRÓXIMOS PASOS SUGERIDOS

**AHORA:**
1. Abrir `/reset-password-helper.html`
2. Resetear password
3. Intentar login

**SI LOGIN FUNCIONA:**
1. Ejecutar `/FIX_FUNCTION_OVERLOAD_SIMPLE.sql`
2. Recargar app
3. Verificar que el menú carga correctamente

**DESPUÉS:**
1. Crear mantenimiento de `screens`
2. Crear mantenimiento de `actions`
3. Crear visualización de relaciones

---

## ✅ CREDENCIALES FINALES

```
📧 Email: admin@turnos-titanium.com
🔑 Password: TurnosTitanium2025!
🏢 Tenant: Titanium Corp
👤 Rol: SUPER_ADMIN (sin scopes = acceso total)
```

---

## 📞 REPORTE DE ESTADO

Después de ejecutar los pasos, compárteme:

1. ✅ ¿Login exitoso?
2. ✅ ¿Función duplicada resuelta?
3. ✅ ¿Menú carga correctamente?
4. ❓ ¿Algún error nuevo?

**¡Vamos por partes! Primero el login. 🚀**
