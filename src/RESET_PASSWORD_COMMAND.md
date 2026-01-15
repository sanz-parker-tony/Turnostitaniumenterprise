# 🚨 SOLUCIÓN URGENTE: Resetear Password del Super Usuario

## 📋 Diagnóstico y Solución en 3 Pasos

### **PASO 1: Ejecutar Diagnóstico SQL** ⚙️

Abre **Supabase SQL Editor** y ejecuta el script:

```
/URGENT_FIX_ADMIN_LOGIN.sql
```

Esto te mostrará:
- ✅ Si el usuario existe en auth.users
- ✅ Si el usuario existe en public.users
- ✅ Si tiene el tenant correcto
- ✅ Si tiene rol SUPER_ADMIN
- ✅ Si tiene scopes (no debería tener)

**El script también CORRIGE automáticamente** problemas de:
- Usuario sin tenant
- Usuario sin rol SUPER_ADMIN
- Scopes incorrectos

---

### **PASO 2: Resetear Password** 🔑

#### **Opción A: Desde el navegador (MÁS FÁCIL)**

1. Abre una nueva pestaña del navegador
2. Abre la **Consola de Desarrollador** (F12)
3. Ve a la pestaña **Console**
4. Pega y ejecuta este código:

```javascript
// Obtener el projectId desde el LocalStorage
const projectId = 'fzegbmklxqjqkkpjctcl'; // Tu project ID

// Llamar al endpoint de reset
fetch(`https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/admin/reset-password`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ RESULTADO:', data);
  if (data.success) {
    console.log('🎉 PASSWORD RESETEADA!');
    console.log('📧 Email:', data.credentials.email);
    console.log('🔑 Password:', data.credentials.password);
  } else {
    console.error('❌ Error:', data.error);
  }
})
.catch(err => console.error('❌ Error de red:', err));
```

#### **Opción B: Desde cURL (línea de comandos)**

```bash
curl -X POST https://fzegbmklxqjqkkpjctcl.supabase.co/functions/v1/make-server-e19f2094/admin/reset-password \
  -H "Content-Type: application/json"
```

---

### **PASO 3: Intentar Login** 🚀

Después de resetear, usa estas credenciales:

```
📧 Email: admin@turnos-titanium.com
🔑 Password: TurnosTitanium2025!
```

---

## 🔍 Si el login sigue fallando...

### **Diagnóstico adicional:**

Ejecuta en SQL Editor:

```sql
-- Ver el estado completo del usuario
SELECT 
  'AUTH.USERS' as tabla,
  email,
  email_confirmed_at,
  last_sign_in_at,
  CASE WHEN encrypted_password IS NOT NULL THEN 'OK' ELSE 'SIN PASSWORD' END as password_status
FROM auth.users 
WHERE email = 'admin@turnos-titanium.com'

UNION ALL

SELECT 
  'PUBLIC.USERS',
  email,
  created_at::text,
  is_active::text,
  tenant_id::text
FROM public.users 
WHERE email = 'admin@turnos-titanium.com';
```

### **Verificar mensajes de error en el login:**

Abre la consola del navegador (F12) durante el login y busca:
- ❌ Errores de red
- ❌ Errores de autenticación
- ❌ Mensajes específicos

---

## 📞 Compárteme el resultado

Si después de estos pasos el login sigue fallando, compárteme:

1. **Resultado del PASO 1** (diagnóstico SQL)
2. **Resultado del PASO 2** (reset password)
3. **Mensaje de error exacto** que ves en el login
4. **Errores en la consola** del navegador (F12)

---

## ✅ Credenciales Finales

```
Email: admin@turnos-titanium.com
Password: TurnosTitanium2025!
```

**IMPORTANTE:** El endpoint de reset-password NO requiere autenticación, así que puedes ejecutarlo en cualquier momento.
