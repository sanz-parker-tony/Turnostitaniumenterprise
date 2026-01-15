# 🚨 SOLUCIÓN RÁPIDA - LOGIN ADMIN

## ✅ PASOS EN ORDEN:

### **PASO 1: Ejecutar SQL Corregido** (2 minutos)

Abre **Supabase SQL Editor** y ejecuta:

```
/URGENT_FIX_ADMIN_LOGIN_CORRECTED.sql
```

Este script:
- ✅ Usa `tenant_name` (campo correcto)
- ✅ NO usa `subscription_status` (no existe)
- ✅ Diagnostica todo el flujo
- ✅ Crea tenant/usuario/rol si faltan
- ✅ Limpia scopes incorrectos

**Verás mensajes como:**
```
✅ Usuario existe en auth.users: [uuid]
✅ Tenant existe: [uuid] - Titanium Corp
✅ Usuario existe en public.users: [uuid]
✅ Rol SUPER_ADMIN existe: [uuid]
✅ Usuario ya tiene el rol asignado: [uuid]
✅ Scopes limpiados
```

---

### **PASO 2: Resetear Password** (1 minuto)

**Opción A: Con el Helper HTML (MÁS FÁCIL)**

1. Abre `/reset-password-helper.html` en tu navegador
2. Haz clic en el botón
3. Verás el mensaje de éxito con las credenciales

**Opción B: Desde la consola del navegador**

```javascript
fetch('https://fzegbmklxqjqkkpjctcl.supabase.co/functions/v1/make-server-e19f2094/admin/reset-password', {
  method: 'POST'
})
.then(res => res.json())
.then(data => console.log(data));
```

---

### **PASO 3: Intentar Login** (30 segundos)

Usa estas credenciales:

```
📧 Email: admin@turnos-titanium.com
🔑 Password: TurnosTitanium2025!
```

---

## ⚠️ SI EL LOGIN FALLA...

### **Diagnóstico Adicional:**

Ejecuta en SQL Editor:

```sql
-- Ver el estado del usuario
SELECT 
  'AUTH' as tabla,
  id,
  email,
  CASE WHEN encrypted_password IS NOT NULL THEN 'OK' ELSE 'SIN PASSWORD' END as pwd_status,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'admin@turnos-titanium.com';

-- Ver estructura de public.users
SELECT * FROM public.users WHERE email = 'admin@turnos-titanium.com';

-- Ver roles asignados
SELECT 
  r.role_key,
  r.name,
  ur.is_active
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN public.users u ON ur.user_id = u.id
WHERE u.email = 'admin@turnos-titanium.com';
```

### **Copiar los errores que veas:**

- En la pantalla de login
- En la consola del navegador (F12)
- En los logs de Supabase

---

## 📋 CHECKLIST RÁPIDO

- [ ] Ejecuté `/URGENT_FIX_ADMIN_LOGIN_CORRECTED.sql`
- [ ] Vi mensajes de éxito (✅)
- [ ] Ejecuté reset-password (helper o consola)
- [ ] Intenté login con credenciales correctas
- [ ] Si falla: copié mensajes de error

---

## 🎯 RESULTADO ESPERADO

Después del PASO 3, deberías:
- ✅ Ver el dashboard
- ✅ Ver el menú lateral con opciones
- ✅ Sin errores en consola

---

## 📞 SIGUIENTE PASO

Cuando el login funcione, ejecutaremos:
- `/FIX_FUNCTION_OVERLOAD_SIMPLE.sql` (fix función duplicada)

¡Vamos paso a paso! 🚀
