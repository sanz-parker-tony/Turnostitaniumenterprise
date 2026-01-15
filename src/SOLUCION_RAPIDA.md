# ✅ SOLUCIÓN RÁPIDA - ERROR RESUELTO

## 🎉 **EL ERROR `process is not defined` ESTÁ RESUELTO**

He simplificado la configuración. Ahora solo necesitas editar **UN ARCHIVO** con tus credenciales.

---

## 🔧 **CONFIGURACIÓN EN 3 PASOS**

### **PASO 1: Obtener credenciales de Supabase** 🔑

1. Ve a **https://app.supabase.com**
2. Selecciona tu proyecto (donde ejecutaste los scripts SQL)
3. Click en **⚙️ Settings** → **API**
4. Copia dos valores:

**A) Project URL** (arriba)
```
https://xyzabc123.supabase.co
```

**B) Project API keys → anon public** (abajo)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...
```

⚠️ **NO copies el `service_role` key**, solo el **`anon`** key.

---

### **PASO 2: Editar archivo en Figma Make** 📝

En Figma Make:

1. Abre el archivo **`/lib/supabase.ts`**

2. Busca estas dos líneas (están cerca del inicio):

```typescript
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key-aqui';
```

3. **Reemplázalas** con tus credenciales:

```typescript
const SUPABASE_URL = 'https://xyzabc123.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...';
```

4. **Guarda el archivo** (Ctrl+S o Cmd+S)

---

### **PASO 3: Probar el login** 🚀

1. Mira el **preview** de la aplicación (lado derecho de Figma Make)
2. Deberías ver la pantalla de login
3. Ingresa:
   - **Email:** `victorsan@hotmail.com`
   - **Password:** Tu contraseña de Supabase
4. Click en **"Iniciar Sesión"**

---

## ✅ **VERIFICACIÓN**

### **En la consola del navegador (F12 → Console):**

**SI VES:**
```
⚠️ SUPABASE NO ESTÁ CONFIGURADO
📝 Edita /lib/supabase.ts y reemplaza...
```
→ Aún no editaste el archivo correctamente. Vuelve al Paso 2.

**SI NO VES** ese warning:
→ ✅ **¡Está configurado correctamente!** Prueba el login.

---

## 🐛 **SOLUCIÓN DE PROBLEMAS**

### **Error: "Email o contraseña incorrectos"**

**Solución A: Restablecer contraseña**

En **Supabase Dashboard → Authentication → Users**:
1. Busca `victorsan@hotmail.com`
2. Click en **⋮** (tres puntos) → **Reset Password**
3. O edita el usuario y cambia la contraseña

**Solución B: Confirmar email**

En **Supabase SQL Editor**, ejecuta:

```sql
-- Verificar si está confirmado
SELECT email, email_confirmed_at 
FROM auth.users 
WHERE email = 'victorsan@hotmail.com';

-- Si email_confirmed_at es NULL, confirmarlo:
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'victorsan@hotmail.com';
```

---

### **Error: "Usuario no encontrado o inactivo"**

El usuario existe en `auth.users` pero falta en `public.users`.

**En Supabase SQL Editor:**

```sql
-- Verificar si existe
SELECT * FROM users WHERE email = 'victorsan@hotmail.com';

-- Si no existe, crearlo:
INSERT INTO users (
  auth_user_id,
  tenant_id,
  username,
  email,
  display_name,
  is_active,
  created_by
)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'victorsan@hotmail.com'),
  (SELECT id FROM tenants LIMIT 1),
  'victorsan',
  'victorsan@hotmail.com',
  'Victor San',
  true,
  'SYSTEM'
);
```

---

### **Error: CORS o "Failed to fetch"**

En **Supabase Dashboard → Authentication → URL Configuration**:

Agrega estas URLs:
- **Site URL:** `http://localhost:5173`
- **Redirect URLs:** 
  - `http://localhost:5173/**`
  - `http://localhost:*/**`

---

## 📋 **CHECKLIST COMPLETO**

Antes de probar, verifica:

- [ ] ✅ Copié el **Project URL** de Supabase
- [ ] ✅ Copié el **anon key** (NO el service_role)
- [ ] ✅ Edité `/lib/supabase.ts` con mis credenciales
- [ ] ✅ Guardé el archivo (Ctrl+S)
- [ ] ✅ No veo warnings en la consola del navegador
- [ ] ✅ El usuario `victorsan@hotmail.com` existe en Supabase
- [ ] ✅ El email está confirmado
- [ ] ✅ El usuario existe en `public.users` con `is_active = true`

---

## 🎯 **EJEMPLO COMPLETO**

Así debería quedar tu archivo `/lib/supabase.ts` después de editar:

```typescript
// ============================================
// 👇 CONFIGURA TUS CREDENCIALES AQUÍ
// ============================================

const SUPABASE_URL = 'https://abcdefgh123456.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoMTIzNDU2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAxNTU3NjAwMH0.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

// ============================================
// NO EDITES DEBAJO DE ESTA LÍNEA
// ============================================
```

---

## 🆘 **¿NECESITAS AYUDA?**

Dime:
1. ✅ ¿Ya editaste `/lib/supabase.ts`?
2. 📸 ¿Qué ves en la consola del navegador (F12)?
3. ❌ ¿Qué error aparece cuando intentas hacer login?

**¡Copia el mensaje exacto y te ayudo!** 🚀
