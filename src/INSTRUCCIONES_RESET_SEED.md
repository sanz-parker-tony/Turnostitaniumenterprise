# 🚀 INSTRUCCIONES: Reset + Seed Completo

**Fecha**: 31 de enero de 2026  
**Versión**: Final

---

## ✅ EJECUTAR RESET + SEED

### **Windows PowerShell**

```powershell
cd supabase
./reset-and-seed.ps1
```

Cuando te pregunte:
```
¿Deseas continuar? (yes/no): yes
```

---

## 📊 PROCESO COMPLETO (3 pasos)

El script `reset-and-seed.ps1` ejecuta automáticamente:

### **PASO 1/3: Factory Reset** 🗑️
- Limpia toda la base de datos
- Preserva `system_languages`
- Resetea secuencias

### **PASO 2/3: Seed Complete** 🌱
- Crea tenant SYSTEM
- Crea 5 roles base
- Crea pantallas, menús, permisos
- Crea lookups
- **NO crea usuario en auth.users** (se hace en paso 3)

### **PASO 3/3: Crear Usuario** 👤
- Llama al endpoint `/auth/create-system-admin`
- Crea usuario en `auth.users` vía Admin API
- Vincula con `public.users`
- Asigna rol `SYSTEM_ADMIN`

---

## ✅ RESULTADO ESPERADO

Verás algo como esto:

```
============================================================
🔄 FACTORY RESET + SEED COMPLETO
   Turnos Titanium Enterprise
============================================================

📂 Verificando archivos de migración...
✅ Archivos de migración encontrados

⚠️  ADVERTENCIA: Este proceso es DESTRUCTIVO
   - Se eliminarán TODOS los datos existentes
   - Se ejecutará el FACTORY RESET completo
   - Se insertarán los datos base del sistema

¿Deseas continuar? (yes/no): yes

🔗 Obteniendo URL de la base de datos...
✅ Conexión a base de datos configurada

============================================================
🗑️  PASO 1/2: Ejecutando FACTORY RESET...
============================================================

... mensajes de TRUNCATE ...

✅ FACTORY RESET ejecutado exitosamente

============================================================
🌱 PASO 2/2: Ejecutando SEED COMPLETO...
============================================================

NOTICE: ============================================================
NOTICE: SECCIÓN 0: Idiomas y Planes
NOTICE: ============================================================
... mensajes de inserción ...

NOTICE: ============================================================
NOTICE: SECCIÓN 11: Usuario Bootstrap (placeholder)
NOTICE: ============================================================
NOTICE: ⚠️  El usuario en auth.users se creará vía Admin API
NOTICE:    Email: system.admin@titanium-labs.com
NOTICE:    Password: Titanium2026!
NOTICE: 
NOTICE: ✅ Tenant SYSTEM y rol SYSTEM_ADMIN listos
NOTICE: ➡️  Ejecutar: reset-and-seed.ps1 para completar creación de usuario
NOTICE: 

✅ SEED COMPLETO ejecutado exitosamente

============================================================
👤 PASO 3/3: Creando usuario system.admin...
============================================================

🔧 Creando usuario system.admin vía Admin API...

✅ Usuario system.admin creado exitosamente
   Email:    system.admin@titanium-labs.com
   Password: Titanium2026!

============================================================
🔍 VERIFICACIÓN FINAL
============================================================

Conteo de registros:
 Tenants              | 1
 Roles Base           | 5
 Usuarios Bootstrap   | 1
 Menu Groups          | 9
 Pantallas            | 22
 Acciones             | 28
 Screen Actions       | ~140
 Role Permissions     | ~140

============================================================
✅ PROCESO COMPLETADO EXITOSAMENTE
============================================================

📝 Próximos pasos:
   1. Login con las credenciales iniciales
   2. Cambiar la contraseña (obligatorio)
   3. Completar wizard de configuración inicial

============================================================
```

---

## 🔐 CREDENCIALES

Después de ejecutar el script, usa:

- **Email**: `system.admin@titanium-labs.com`
- **Password**: `Titanium2026!`

---

## ❌ SI ALGO FALLA

### **Error: "Usuario no existe"**

**Solución**:
1. Ir a la pantalla de login
2. Intentar login (fallará)
3. Aparecerá panel de ayuda
4. Click en "🔧 Crear Usuario System Admin"
5. Hacer login

---

### **Error: "Contraseña incorrecta"**

**Solución**:
1. Ir a la pantalla de login
2. Intentar login (fallará)
3. Aparecerá panel de ayuda
4. Click en "🔐 Resetear Contraseña a Default"
5. Hacer login con `Titanium2026!`

---

### **Error: "Tenant SYSTEM no existe"**

**Solución**: El SEED no se ejecutó correctamente. Ejecuta de nuevo:

```powershell
cd supabase
./reset-and-seed.ps1
```

---

## 🔧 DIAGNÓSTICO

Si necesitas verificar el estado del sistema:

```powershell
# Verificar usuarios en auth.users y public.users
curl https://qvjyqjypuyjaremqjtra.supabase.co/functions/v1/make-server-e19f2094/auth/diagnostics
```

Resultado esperado:
```json
{
  "success": true,
  "summary": {
    "authUsersCount": 1,
    "publicUsersCount": 1,
    "systemAdminExists": true,
    "systemAdminInPublic": true
  }
}
```

---

## ✅ CHECKLIST FINAL

Después de ejecutar el script, verifica:

- [ ] El script terminó sin errores
- [ ] Viste el mensaje "✅ Usuario system.admin creado exitosamente"
- [ ] Viste las credenciales (Email y Password)
- [ ] Puedes hacer login con `system.admin@titanium-labs.com` / `Titanium2026!`
- [ ] Después del login te pide cambiar contraseña
- [ ] Después del cambio de contraseña aparece el wizard

---

**¡Listo para ejecutar!** 🚀

```powershell
cd supabase
./reset-and-seed.ps1
```
