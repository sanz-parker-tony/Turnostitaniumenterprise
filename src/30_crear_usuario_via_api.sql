-- =====================================================
-- CREAR USUARIO USANDO SUPABASE ADMIN API
-- ALTERNATIVA: Crear usuario desde SQL
-- =====================================================

-- ⚠️ NOTA IMPORTANTE:
-- Este método requiere que uses la SUPABASE SERVICE ROLE KEY
-- NO funcionará con queries regulares del SQL Editor
-- Debes ejecutarlo desde el servidor backend o usar la función admin

-- =====================================================
-- OPCIÓN 1: Crear desde el Backend (Recomendado)
-- =====================================================

-- Agrega esta ruta temporal al servidor backend en:
-- /supabase/functions/server/index.tsx

/*
app.post("/make-server-e19f2094/admin/create-user", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Obtener tenant_id
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('tenant_key', 'TITANIUM')
      .single();

    if (!tenant) {
      return c.json({ error: 'Tenant no encontrado' }, 404);
    }

    // Crear usuario en auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@turnos-titanium.com',
      password: 'TurnosTitanium2025!',
      email_confirm: true,
      user_metadata: {
        tenant_id: tenant.id,
        username: 'admin',
        display_name: 'Administrador Titanium'
      }
    });

    if (authError) {
      console.error('Error creando usuario en auth:', authError);
      return c.json({ error: 'Error creando usuario en auth', details: authError.message }, 500);
    }

    // Crear usuario en public.users
    const { error: publicError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        tenant_id: tenant.id,
        email: 'admin@turnos-titanium.com',
        username: 'admin',
        display_name: 'Administrador Titanium',
        is_active: true,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM'
      });

    if (publicError) {
      console.error('Error creando usuario en public:', publicError);
      return c.json({ error: 'Error creando usuario en public', details: publicError.message }, 500);
    }

    // Obtener rol SUPER_ADMIN
    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .eq('role_key', 'SUPER_ADMIN')
      .eq('tenant_id', tenant.id)
      .single();

    if (!role) {
      return c.json({ error: 'Rol SUPER_ADMIN no encontrado' }, 404);
    }

    // Asignar rol
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        role_id: role.id,
        assigned_by: 'SYSTEM',
        is_active: true
      });

    if (roleError) {
      console.error('Error asignando rol:', roleError);
      return c.json({ error: 'Error asignando rol', details: roleError.message }, 500);
    }

    return c.json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        tenant_id: tenant.id
      }
    });

  } catch (error) {
    console.error('Error en endpoint /admin/create-user:', error);
    return c.json({ error: 'Error interno del servidor', details: error.message }, 500);
  }
});
*/

-- =====================================================
-- LUEGO USA ESTE CURL PARA CREAR EL USUARIO:
-- =====================================================

/*
curl -X POST \
  https://[PROJECT_ID].supabase.co/functions/v1/make-server-e19f2094/admin/create-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]"
*/

-- =====================================================
-- INSTRUCCIONES DE USO:
-- =====================================================

SELECT '📋 INSTRUCCIONES PARA CREAR USUARIO CON API' as titulo;

SELECT 
    'PASO 1' as paso,
    'Descomenta el código del endpoint en /supabase/functions/server/index.tsx' as instruccion;

SELECT 
    'PASO 2' as paso,
    'Ejecuta el curl command o usa Postman/Thunder Client' as instruccion;

SELECT 
    'PASO 3' as paso,
    'Verifica que el usuario fue creado con /29_sincronizar_usuario_auth.sql' as instruccion;

SELECT 
    'PASO 4' as paso,
    'Comenta/elimina el endpoint del servidor (es solo temporal)' as instruccion;

SELECT 
    '⚠️ IMPORTANTE' as nota,
    'Este endpoint es SOLO para setup inicial. NO lo dejes activo en producción.' as advertencia;
