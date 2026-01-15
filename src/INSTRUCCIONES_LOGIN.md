# 🚀 INSTRUCCIONES PARA PROBAR EL LOGIN

## ✅ CAMBIOS REALIZADOS

He actualizado el componente Login.tsx para que ahora use **Supabase Auth** en lugar del sistema de demostración.

### **Qué hace ahora el login:**

1. ✅ **Conecta con Supabase Auth** usando `supabase.auth.signInWithPassword()`
2. ✅ **Valida credenciales reales** en tu base de datos
3. ✅ **Obtiene el perfil del usuario** desde la tabla `public.users`
4. ✅ **Actualiza el contexto** de la aplicación para mostrar el dashboard

---

## 🔑 CÓMO PROBAR EL LOGIN

### **PASO 1: Mirar el preview de Figma Make**

En la parte derecha de Figma Make, deberías ver la aplicación corriendo.

### **PASO 2: Si ves el Landing Page**

Haz click en **"Comenzar"** o **"Iniciar Sesión"** para ir al login.

### **PASO 3: Ingresar credenciales**

En la pantalla de login:

```
📧 Email: victorsan@hotmail.com
🔑 Contraseña: [La que configuraste en Supabase]
```

### **PASO 4: Click en "Iniciar Sesión"**

El botón mostrará un spinner mientras procesa.

---

## ✅ FLUJO ESPERADO

### **Si el login es exitoso:**

1. ⏳ Verás el botón con spinner "Iniciando sesión..."
2. ✅ Se validará en Supabase
3. 📊 Se obtendrá tu perfil desde la base de datos
4. 🏠 **Redirigirá al dashboard**
5. 👤 Mostrará tu nombre "Victor San" en la esquina superior derecha

### **Si hay error:**

Verás un mensaje de error específico:
- ❌ **"Email o contraseña incorrectos"** - Credenciales inválidas
- ❌ **"Usuario no encontrado o inactivo"** - No existe en `public.users`
- ❌ **"Usuario inactivo"** - `is_active = false` en la BD

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### **Error: "Email o contraseña incorrectos"**

**Opción A: Restablecer contraseña desde Supabase Dashboard**

1. Ve a **Supabase Dashboard → Authentication → Users**
2. Busca `victorsan@hotmail.com`
3. Click en los 3 puntos → **Reset Password**
4. O cambia la contraseña directamente

**Opción B: Verificar que el email esté confirmado**

Ejecuta en Supabase SQL Editor:

```sql
SELECT email, email_confirmed_at 
FROM auth.users 
WHERE email = 'victorsan@hotmail.com';
```

Si `email_confirmed_at` es NULL, ejecuta:

```sql
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'victorsan@hotmail.com';
```

---

### **Error: "Usuario no encontrado o inactivo"**

Verifica que el usuario existe en `public.users`:

```sql
SELECT * FROM users WHERE email = 'victorsan@hotmail.com';
```

Si no existe, crea el registro:

```sql
INSERT INTO users (
  auth_user_id,
  tenant_id,
  username,
  email,
  display_name,
  is_active
)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'victorsan@hotmail.com'),
  (SELECT id FROM tenants LIMIT 1),
  'victorsan',
  'victorsan@hotmail.com',
  'Victor San',
  true
);
```

---

### **Error: "Usuario inactivo"**

Activa el usuario:

```sql
UPDATE users 
SET is_active = true 
WHERE email = 'victorsan@hotmail.com';
```

---

## 🎯 VERIFICACIÓN POST-LOGIN

Después de hacer login exitoso, abre la **Consola del Navegador** (F12) y ejecuta:

```javascript
// Ver perfil guardado
console.log(JSON.parse(localStorage.getItem('user_profile')));

// Ver sesión de Supabase
supabase.auth.getSession().then(({ data }) => console.log(data));
```

Deberías ver:
- ✅ Tu perfil completo con nombre, email, tenant_id
- ✅ La sesión activa con access_token

---

## 📊 QUERIES DE VERIFICACIÓN EN SUPABASE

### **Ver todo el setup del usuario:**

```sql
-- Usuario en auth.users
SELECT 
  'auth.users' as table,
  id, 
  email, 
  email_confirmed_at
FROM auth.users 
WHERE email = 'victorsan@hotmail.com'

UNION ALL

-- Usuario en public.users
SELECT 
  'public.users' as table,
  id::text, 
  email, 
  is_active::text
FROM users 
WHERE email = 'victorsan@hotmail.com';
```

### **Ver roles asignados:**

```sql
SELECT 
  u.email,
  r.role_name,
  COUNT(rsa.screen_action_id) as permissions_count
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_screen_actions rsa ON r.id = rsa.role_id
WHERE u.email = 'victorsan@hotmail.com'
GROUP BY u.email, r.role_name;
```

---

## 🚀 PRÓXIMOS PASOS

Una vez que el login funcione:

1. ✅ Verás el dashboard de Turnos Titanium
2. ✅ El menú lateral mostrará las opciones según tus permisos
3. ✅ Podrás navegar por todos los módulos disponibles

---

## 📞 SI NECESITAS AYUDA

Dime **exactamente qué error ves**:
- Captura de pantalla del error
- Mensaje de error completo
- Resultados de las queries de verificación

¡Y te ayudo a solucionarlo! 🎯
