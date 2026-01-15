# 🚀 Instrucciones para Inicializar Super Admin

## Opción 1: Usando el Dashboard de Supabase (MÁS FÁCIL) ⭐

### Paso 1: Crear el usuario en Auth
1. Ve a tu proyecto en **Supabase Dashboard**
2. Click en **Authentication > Users**
3. Click en **Add user > Create new user**
4. Llena los campos:
   - **Email**: `admin@turnos-titanium.com`
   - **Password**: `TurnosTitanium2025!`
   - **Auto Confirm User**: ✅ **Activado** (muy importante!)
5. Click en **Create user**

### Paso 2: Ejecutar el script SQL
1. Ve a **SQL Editor** en Supabase Dashboard
2. Click en **New query**
3. Copia y pega TODO el contenido del archivo `/scripts/initialize-super-admin.sql`
4. Click en **Run** (o presiona `Ctrl/Cmd + Enter`)
5. Verifica que veas los mensajes de éxito:
   ```
   ✅ Tenant del sistema verificado/creado
   ✅ Usuario encontrado en Auth
   ✅ Usuario creado/actualizado en tabla users
   ✅ Rol SUPER_ADMIN encontrado
   ✅ Rol SUPER_ADMIN asignado al usuario
   ✅ Scopes eliminados (acceso total garantizado)
   🎉 SUPER ADMIN INICIALIZADO EXITOSAMENTE
   ```

### Paso 3: Iniciar sesión
1. Ve a tu aplicación Turnos Titanium
2. Inicia sesión con:
   - **Email**: `admin@turnos-titanium.com`
   - **Password**: `TurnosTitanium2025!`
3. ✅ Deberías poder acceder al módulo "Grupos de Menú" en Seguridades

---

## Opción 2: Usando la API de Supabase (Avanzado)

Si prefieres crear el usuario programáticamente desde código:

```typescript
// Este código se puede ejecutar desde Deno Deploy, Node.js, o cualquier entorno con acceso a Supabase
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'TU_SUPABASE_URL',
  'TU_SUPABASE_SERVICE_ROLE_KEY' // ⚠️ IMPORTANTE: Usa el SERVICE ROLE KEY, no el ANON KEY
);

const { data, error } = await supabase.auth.admin.createUser({
  email: 'admin@turnos-titanium.com',
  password: 'TurnosTitanium2025!',
  email_confirm: true, // Auto-confirmar el email
  user_metadata: {
    full_name: 'Super Administrador'
  }
});

if (error) {
  console.error('Error creando usuario:', error);
} else {
  console.log('✅ Usuario creado:', data.user.id);
  console.log('Ahora ejecuta el script SQL: /scripts/initialize-super-admin.sql');
}
```

Después de crear el usuario, ejecuta el script SQL del Paso 2 de la Opción 1.

---

## ⚠️ Notas Importantes

1. **El rol SUPER_ADMIN debe existir**: Asegúrate de que existe un rol con:
   - `role_key = 'SUPER_ADMIN'`
   - `role_scope = 'SYSTEM'`

2. **Solo ejecutar UNA vez**: Este script es idempotente (puedes ejecutarlo varias veces sin problemas), pero está diseñado para la inicialización inicial.

3. **Seguridad**: 
   - Cambia la contraseña después del primer login
   - No compartas las credenciales de Super Admin
   - El Super Admin tiene acceso TOTAL al sistema

4. **Verificación**: Después de ejecutar el script, verifica en Supabase que:
   - Existe un tenant con ID `00000000-0000-0000-0000-000000000000`
   - Existe un usuario en la tabla `users` vinculado a ese tenant
   - Existe un registro en `user_roles` que conecta al usuario con el rol SUPER_ADMIN

---

## 🐛 Troubleshooting

### Error: "Usuario no encontrado en auth.users"
- **Solución**: Ejecuta primero el Paso 1 (crear usuario en Auth)

### Error: "Rol SUPER_ADMIN no encontrado"
- **Solución**: Verifica que el rol existe en la tabla `roles` con `role_key='SUPER_ADMIN'` y `role_scope='SYSTEM'`

### No puedo acceder a "Grupos de Menú"
- **Solución**: Verifica que el usuario NO tenga scopes (la tabla `user_role_scopes` no debe tener registros para este usuario)
- Ejecuta: `SELECT * FROM user_role_scopes WHERE user_role_id IN (SELECT id FROM user_roles WHERE user_id = 'TU_USER_ID');`
- Si hay registros, elimínalos: `DELETE FROM user_role_scopes WHERE user_role_id IN (SELECT id FROM user_roles WHERE user_id = 'TU_USER_ID');`
