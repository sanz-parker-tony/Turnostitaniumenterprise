/**
 * Middleware - Turnos Titanium Enterprise
 * Guard mínimo para protección de rutas
 * 
 * REGLAS CRÍTICAS (en orden de prioridad):
 * 0. Verificar si wizard completado → TODOS a /login
 * 1. /system/setup → SOLO si wizard NO completado
 * 2. /dashboard/* → requiere sesión
 * 3. /kiosk/* → requiere sesión (validación de rol EMPLOYEE en layout)
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('[MIDDLEWARE] Request:', pathname);

  // ============================================================================
  // 0. VERIFICACIÓN CRÍTICA: ¿Wizard completado?
  // ============================================================================
  
  // Crear cliente Supabase para verificar tenant
  let response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Verificar estado del wizard
  const { data: tenantOnboarding, error: onboardingError } = await supabase
    .from('tenant_onboarding')
    .select('onboarding_status')
    .limit(1)
    .single();

  const isWizardCompleted = tenantOnboarding?.onboarding_status === 'COMPLETED';

  console.log('[MIDDLEWARE] Wizard completado:', isWizardCompleted);

  // ============================================================================
  // REGLA #1: Si wizard COMPLETADO → Solo permitir /login y rutas autenticadas
  // ============================================================================
  
  if (isWizardCompleted) {
    // Si intenta acceder a /system/setup → REDIRIGIR a /login
    if (pathname.startsWith('/system/setup')) {
      console.warn('[MIDDLEWARE] ⛔ Wizard completado, /system/setup bloqueado → /login');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Permitir /login y rutas públicas
    if (pathname === '/login' || pathname.startsWith('/auth/') || pathname.startsWith('/api/')) {
      return NextResponse.next();
    }

    // Rutas protegidas requieren sesión
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/kiosk')) {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        console.warn('[MIDDLEWARE] Sin sesión, redirect /login');
        return NextResponse.redirect(new URL('/login', request.url));
      }

      console.log('[MIDDLEWARE] ✅ Sesión válida, permitir acceso');
      return response;
    }

    // Si es / → redirigir a /login
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  }

  // ============================================================================
  // REGLA #2: Si wizard NO completado → SOLO permitir /system/setup
  // ============================================================================
  
  if (!isWizardCompleted) {
    // Permitir acceso a /system/setup
    if (pathname.startsWith('/system/setup')) {
      console.log('[MIDDLEWARE] ✅ Wizard NO completado, permitir /system/setup');
      return NextResponse.next();
    }

    // BLOQUEAR todo lo demás y redirigir a /system/setup
    console.warn('[MIDDLEWARE] ⛔ Wizard NO completado, forzar /system/setup');
    return NextResponse.redirect(new URL('/system/setup', request.url));
  }

  // ============================================================================
  // LEGACY: Protección /setup (antiguo wizard)
  // ============================================================================

  if (pathname.startsWith('/setup')) {
    const token = request.nextUrl.searchParams.get('token');
    const SETUP_TOKEN = process.env.SETUP_TOKEN;

    if (!token || token !== SETUP_TOKEN) {
      console.warn('[MIDDLEWARE] /setup sin token válido, redirect /login');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  }

  // ============================================================================
  // RUTAS PÚBLICAS - Permitir sin validación
  // ============================================================================

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};