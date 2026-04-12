/**
 * Supabase Client Configuration - Turnos Titanium Enterprise
 * Cliente para interactuar con Supabase desde el frontend con Auth
 * Version: 1.0.0
 * 
 * 🔧 CONFIGURACIÓN:
 * Reemplaza los valores de SUPABASE_URL y SUPABASE_ANON_KEY
 * con tus credenciales de Supabase Dashboard → Settings → API
 */

import { createClient } from '@supabase/supabase-js';

// ============================================
// 👇 CONFIGURA TUS CREDENCIALES AQUÍ
// ============================================

const SUPABASE_URL = 'https://qvjyqjypuyjaremqjtra.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2anlxanlwdXlqYXJlbXFqdHJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NTA5NjYsImV4cCI6MjA4MzAyNjk2Nn0.ZiG_GG4bPQ0l1wJyJvGxSgt4aXyVpFH1HBsY2EMVgRM';

// ============================================
// NO EDITES DEBAJO DE ESTA LÍNEA
// ============================================

// Validar configuración
const isConfigured = SUPABASE_URL !== 'https://tu-proyecto.supabase.co' && 
                     SUPABASE_ANON_KEY !== 'tu-anon-key-aqui';

if (!isConfigured) {
  console.warn('⚠️ SUPABASE NO ESTÁ CONFIGURADO');
  console.warn('📝 Edita /lib/supabase.ts y reemplaza:');
  console.warn('   - SUPABASE_URL con tu Project URL');
  console.warn('   - SUPABASE_ANON_KEY con tu anon/public key');
  console.warn('🔗 Encuéntralas en: https://app.supabase.com → Settings → API');
} else {
  console.log('✅ Supabase configurado correctamente');
  console.log('🔗 URL:', SUPABASE_URL);
}

// Crear cliente de Supabase con configuración de Auth
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);

// Helper para obtener sesión actual
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};

// Helper para obtener sesión y refrescarla si está cerca de expirar
export const getValidSession = async () => {
  try {
    // Intentar obtener sesión existente
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Error obteniendo sesión:', sessionError);
      return { session: null, error: sessionError };
    }
    
    if (!session) {
      console.warn('⚠️ No hay sesión activa');
      return { session: null, error: null };
    }
    
    // Verificar si el token está cerca de expirar (menos de 5 minutos)
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
    
    if (timeUntilExpiry < 300) { // Menos de 5 minutos
      console.log('🔄 Token cerca de expirar, refrescando...');
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('❌ Error refrescando sesión:', refreshError);
        return { session: null, error: refreshError };
      }
      
      console.log('✅ Sesión refrescada exitosamente');
      return { session: refreshedSession, error: null };
    }
    
    return { session, error: null };
  } catch (err: any) {
    console.error('💥 Error inesperado obteniendo sesión:', err);
    return { session: null, error: err };
  }
};

// Helper para obtener usuario actual
export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

// Helper para obtener perfil completo del usuario
export const getCurrentUserProfile = async () => {
  try {
    const { data, error } = await supabase.rpc('get_current_user_profile');
    if (error) throw error;
    return { profile: data, error: null };
  } catch (error) {
    return { profile: null, error };
  }
};