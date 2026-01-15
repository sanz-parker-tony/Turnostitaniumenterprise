/**
 * Landing Page - Turnos Titanium
 * Página pública de presentación del producto
 */

import Link from 'next/link';
import { ArrowRight, Users, Calendar, BarChart3, Shield, Clock, Building2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <header className="bg-gradient-to-br from-[#0074D9] to-[#0056A3] text-white">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-8" />
              <span className="text-2xl font-bold">Turnos Titanium</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="px-4 py-2 hover:underline">
                Iniciar Sesión
              </Link>
              <Link 
                href="/landing/pricing" 
                className="px-6 py-2 bg-white text-[#0074D9] rounded-lg hover:bg-gray-100 transition-colors"
              >
                Comenzar Gratis
              </Link>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Control de Asistencias<br />
            Inteligente y Simple
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
            Gestiona turnos, empleados y reportes en una sola plataforma. 
            Diseñado para empresas que valoran su tiempo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/landing/pricing"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#2ECC71] text-white rounded-lg hover:bg-[#27AE60] transition-colors text-lg"
            >
              Comenzar Prueba Gratuita
              <ArrowRight className="size-5" />
            </Link>
            <Link 
              href="#features"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-colors text-lg"
            >
              Ver Características
            </Link>
          </div>
          <p className="mt-6 text-blue-100">
            ✨ Sin tarjeta de crédito • 14 días de prueba gratis
          </p>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas en un solo lugar
            </h2>
            <p className="text-xl text-gray-600">
              Funcionalidades diseñadas para optimizar la gestión de tu equipo
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="size-6 text-[#0074D9]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Gestión de Turnos
              </h3>
              <p className="text-gray-600">
                Planifica y asigna turnos de forma visual. Evita conflictos y optimiza la cobertura de personal.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="size-6 text-[#2ECC71]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Control de Empleados
              </h3>
              <p className="text-gray-600">
                Administra información completa de empleados, perfiles, departamentos y estructura organizacional.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="size-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Reportes Avanzados
              </h3>
              <p className="text-gray-600">
                Visualiza métricas en tiempo real. Exporta datos para nómina y análisis detallados.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Building2 className="size-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Multi-Empresa
              </h3>
              <p className="text-gray-600">
                Gestiona múltiples empresas, localidades y departamentos desde una sola cuenta.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="size-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Seguridad Avanzada
              </h3>
              <p className="text-gray-600">
                Control de permisos granular por roles, auditoría completa y cumplimiento normativo.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
                <Clock className="size-6 text-cyan-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Asistencias en Tiempo Real
              </h3>
              <p className="text-gray-600">
                Registra entradas y salidas. Consulta el estado de asistencia de tu equipo al instante.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#0074D9] to-[#2ECC71]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            ¿Listo para transformar la gestión de tu equipo?
          </h2>
          <p className="text-xl mb-8 text-blue-50">
            Únete a cientos de empresas que ya confían en Turnos Titanium
          </p>
          <Link 
            href="/landing/pricing"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#0074D9] rounded-lg hover:bg-gray-100 transition-colors text-lg"
          >
            Ver Planes y Precios
            <ArrowRight className="size-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock className="size-6" />
            <span className="text-xl font-bold text-white">Turnos Titanium</span>
          </div>
          <p>© 2026 Turnos Titanium. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
