// ============================================================================
// users.tsx
// Turnos Titanium Enterprise - Endpoints de Usuarios
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { Context } from 'npm:hono@4';

/**
 * GET /make-server-e19f2094/users/profile
 * Obtiene el perfil del usuario autenticado
 */
export async function getUserProfile(c: Context) {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing authorization header' }, 401);
    }

    const token = authHeader.split(' ')[1];

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Error de autenticación:', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Obtener datos del usuario en public.users
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profileError } = await supabaseService
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ Error obteniendo perfil:', profileError);
      return c.json({ error: 'Profile not found' }, 404);
    }

    return c.json({ profile });
  } catch (error) {
    console.error('💥 Error en getUserProfile:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * POST /make-server-e19f2094/users/change-password
 * Cambia la contraseña del usuario autenticado
 */
export async function changePassword(c: Context) {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing authorization header' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const body = await c.req.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener usuario autenticado
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Error de autenticación:', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('🔐 Cambiando contraseña para:', user.email);

    // Actualizar contraseña en Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('❌ Error actualizando contraseña:', updateError);
      return c.json({ error: 'Error updating password', details: updateError.message }, 500);
    }

    // Actualizar flag must_change_password a false
    const { error: flagError } = await supabase
      .from('users')
      .update({ must_change_password: false })
      .eq('auth_user_id', user.id);

    if (flagError) {
      console.error('❌ Error actualizando flag:', flagError);
    }

    console.log('✅ Contraseña actualizada exitosamente');

    return c.json({ success: true });
  } catch (error) {
    console.error('💥 Error en changePassword:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * POST /make-server-e19f2094/users/update-password-flag
 * Actualiza el flag must_change_password en public.users
 */
export async function updatePasswordFlag(c: Context) {
  try {
    // Obtener token de autorización
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing authorization header' }, 401);
    }

    const token = authHeader.split(' ')[1];

    // Crear cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Obtener body
    const body = await c.req.json();
    const { auth_user_id, must_change_password } = body;

    if (!auth_user_id || must_change_password === undefined) {
      return c.json(
        { error: 'auth_user_id y must_change_password son requeridos' },
        400
      );
    }

    console.log('🔐 Actualizando must_change_password para:', auth_user_id);

    // Verificar que el usuario autenticado es el mismo
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Error de autenticación:', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // SEGURIDAD: Solo permitir al usuario cambiar su propio flag
    if (user.id !== auth_user_id) {
      console.error('❌ Intento de cambiar flag de otro usuario');
      return c.json({ error: 'No puedes modificar el flag de otro usuario' }, 403);
    }

    // Actualizar flag en public.users
    const { error: updateError } = await supabase
      .from('users')
      .update({ must_change_password })
      .eq('auth_user_id', auth_user_id);

    if (updateError) {
      console.error('❌ Error actualizando must_change_password:', updateError);
      return c.json(
        { error: 'Error actualizando flag', details: updateError.message },
        500
      );
    }

    console.log('✅ Flag must_change_password actualizado exitosamente');

    return c.json({ success: true });
  } catch (error) {
    console.error('💥 Error inesperado en updatePasswordFlag:', error);
    return c.json(
      {
        error: 'Error inesperado',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}