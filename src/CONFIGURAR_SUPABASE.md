# 🔧 CÓMO CONFIGURAR SUPABASE EN FIGMA MAKE

## ✅ ERROR RESUELTO

El error `process is not defined` ha sido arreglado. Ahora necesitas configurar tus credenciales de Supabase.

---

## 📝 PASO 1: OBTENER CREDENCIALES DE SUPABASE

### **1.1 Ir a Supabase Dashboard**

Ve a: **https://app.supabase.com**

### **1.2 Seleccionar tu proyecto**

Click en el proyecto donde ejecutaste los scripts SQL.

### **1.3 Ir a Settings → API**

En el menú lateral:
1. Click en **⚙️ Settings** (abajo a la izquierda)
2. Click en **API**

### **1.4 Copiar las credenciales**

Verás dos valores importantes:

**A) Project URL**
```
https://qvjyqjypuyjaremqjtra.supabase.co
```
📋 Copia este valor completo

**B) Project API keys → anon / public**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2anlxanlwdXlqYXJlbXFqdHJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NTA5NjYsImV4cCI6MjA4MzAyNjk2Nn0.ZiG_GG4bPQ0l1wJyJvGxSgt4aXyVpFH1HBsY2EMVgRM
```
📋 Copia esta clave completa (es larga, ~200 caracteres)

⚠️ **IMPORTANTE:** NO copies el `service_role` key, solo el `anon` key.

---

## 🔑 PASO 2: CONFIGURAR EN FIGMA MAKE

### **Opción A: Editar archivo de configuración (RECOMENDADO)**

1. En Figma Make, abre el archivo **`/config/supabase-config.ts`**

2. Reemplaza los valores:

```typescript
export const supabaseConfig = {
  // 👇 PEGA AQUÍ TU PROJECT URL
  SUPABASE_URL: 'https://xyzabc123.supabase.co',
  
  // 👇 PEGA AQUÍ TU ANON KEY
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
};
```

3. Guarda el archivo

---

### **Opción B: Variables de entorno**

Si Figma Make soporta variables de entorno, configura:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-completa
```

---

## ✅ PASO 3: VERIFICAR QUE FUNCIONA

### **3.1 Abrir la consola del navegador**

En el preview de Figma Make:
1. Click derecho → **Inspeccionar** (o presiona F12)
2. Ve a la pestaña **Console**

### **3.2 Buscar mensajes**

Si ves:
```
⚠️ SUPABASE no está configurado.
📝 Edita el archivo /config/supabase-config.ts...
```
→ **Aún no está configurado**, sigue el Paso 2.

Si NO ves ningún warning de Supabase:
→ ✅ **¡Está configurado correctamente!**

---

## 🧪 PASO 4: PROBAR EL LOGIN

Ahora que Supabase está configurado:

1. Ve a la pantalla de login en el preview
2. Ingresa:
   - **Email:** `victorsan@hotmail.com`
   - **Password:** Tu contraseña de Supabase
3. Click en **"Iniciar Sesión"**

**Resultado esperado:**
- ✅ Se conecta a Supabase
- ✅ Valida las credenciales
- ✅ Redirige al dashboard

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### **Problema 1: "Invalid login credentials"**

**Causa:** La contraseña es incorrecta o el usuario no está confirmado.

**Solución:**

Ve a **Supabase Dashboard → Authentication → Users**:
- Busca `victorsan@hotmail.com`
- Verifica que tenga un ✅ en "Confirmed"
- Si no está confirmado, click en los 3 puntos → **Confirm Email**
- O restablece la contraseña

---

### **Problema 2: "Usuario no encontrado o inactivo"**

**Causa:** El usuario existe en `auth.users` pero no en `public.users`.

**Solución:**

Ejecuta en **Supabase SQL Editor**:

```sql
-- Verificar si existe
SELECT * FROM users WHERE email = 'victorsan@hotmail.com';

-- Si no existe, crearlo
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

### **Problema 3: Error de CORS**

**Causa:** La URL del sitio no está en la lista de URLs permitidas.

**Solución:**

Ve a **Supabase Dashboard → Authentication → URL Configuration**:
- Agrega `http://localhost:*` en **Site URL**
- Agrega `http://localhost:*` en **Redirect URLs**

---

## 📋 CHECKLIST COMPLETO

Antes de probar el login, verifica:

- [ ] ✅ He copiado el **Project URL** de Supabase
- [ ] ✅ He copiado el **anon key** (NO el service_role)
- [ ] ✅ He editado `/config/supabase-config.ts` con mis credenciales
- [ ] ✅ He guardado el archivo
- [ ] ✅ No hay warnings en la consola del navegador
- [ ] ✅ El usuario `victorsan@hotmail.com` existe en Supabase
- [ ] ✅ El email está confirmado (✅ en Supabase Dashboard)
- [ ] ✅ El usuario existe en la tabla `public.users`
- [ ] ✅ El usuario tiene `is_active = true`

---

## 🎯 RESUMEN RÁPIDO

1. **Obtén credenciales:** Supabase → Settings → API
2. **Configura:** Edita `/config/supabase-config.ts`
3. **Verifica:** Revisa la consola (F12)
4. **Prueba:** Login con `victorsan@hotmail.com`

---

## 🆘 SI NECESITAS AYUDA

Dime:
1. ¿Ya editaste el archivo `/config/supabase-config.ts`?
2. ¿Qué ves en la consola del navegador (F12)?
3. ¿Qué pasa cuando intentas hacer login?

¡Y te ayudo a resolver! 🚀
