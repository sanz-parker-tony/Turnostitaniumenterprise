/**
 * Supabase Client Configuration
 * Cliente para interactuar con Supabase desde el frontend con Auth
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