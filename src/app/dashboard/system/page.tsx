/**
 * /dashboard/system - Configuración del Sistema
 * 
 * Panel principal para SYSTEM_ADMIN
 * Acceso a todas las configuraciones post-wizard
 */

'use client';

import Link from 'next/link';
import { 
  Building2, 
  Users, 
  Network, 
  Settings, 
  Database,
  Shield,
  FileText,
  Clock
} from 'lucide-react';

interface ConfigCard {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
}

const configCards: ConfigCard[] = [
  {
    title: 'Cliente (Tenant)',
    description: 'Configuración del cliente y datos de licencia',
    icon: Database,
    href: '/dashboard/system/tenant',
    color: 'blue'
  },
  {
    title: 'Empresa',
    description: 'Datos de la empresa, logo y configuración general',
    icon: Building2,
    href: '/dashboard/system/company',
    color: 'green'
  },
  {
    title: 'Estructura Organizacional',
    description: 'Departamentos, áreas, cargos y jerarquías',
    icon: Network,
    href: '/dashboard/system/structure',
    color: 'purple'
  },
  {
    title: 'Empleados',
    description: 'Gestión completa de empleados del sistema',
    icon: Users,
    href: '/dashboard/system/employees',
    color: 'orange'
  },
  {
    title: 'Turnos y Horarios',
    description: 'Configuración de turnos de trabajo',
    icon: Clock,
    href: '/dashboard/system/schedules',
    color: 'indigo'
  },
  {
    title: 'Seguridad',
    description: 'Roles, usuarios y permisos del sistema',
    icon: Shield,
    href: '/dashboard/security/roles',
    color: 'red'
  },
  {
    title: 'Reportes',
    description: 'Configuración de reportes y exportación',
    icon: FileText,
    href: '/dashboard/system/reports',
    color: 'teal'
  },
  {
    title: 'Configuración General',
    description: 'Parámetros del sistema y preferencias',
    icon: Settings,
    href: '/dashboard/system/settings',
    color: 'gray'
  }
];

const colorClasses: Record<string, { bg: string; icon: string; hover: string }> = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', hover: 'hover:bg-blue-100' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', hover: 'hover:bg-green-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', hover: 'hover:bg-purple-100' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', hover: 'hover:bg-orange-100' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', hover: 'hover:bg-indigo-100' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', hover: 'hover:bg-red-100' },
  teal: { bg: 'bg-teal-50', icon: 'text-teal-600', hover: 'hover:bg-teal-100' },
  gray: { bg: 'bg-gray-50', icon: 'text-gray-600', hover: 'hover:bg-gray-100' }
};

export default function SystemPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Configuración del Sistema
        </h1>
        <p className="text-gray-600">
          Panel de administración completo del sistema Turnos Titanium Enterprise
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <div className="flex items-start gap-3">
          <Shield className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              Acceso Administrativo
            </h3>
            <p className="text-sm text-blue-800">
              Este módulo está disponible únicamente para usuarios con rol SYSTEM_ADMIN. 
              Aquí puedes modificar todas las configuraciones establecidas durante el wizard inicial.
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {configCards.map((card) => {
          const Icon = card.icon;
          const colors = colorClasses[card.color];
          
          return (
            <Link
              key={card.href}
              href={card.href}
              className={`
                ${colors.bg} ${colors.hover}
                border border-gray-200 rounded-lg p-6
                transition-all duration-200
                hover:shadow-md hover:scale-105
                cursor-pointer
              `}
            >
              <div className="flex flex-col h-full">
                <div className={`${colors.bg} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className={`size-6 ${colors.icon}`} />
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {card.title}
                </h3>
                
                <p className="text-sm text-gray-600 flex-1">
                  {card.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <div className="text-sm text-gray-500 space-y-1">
          <p>
            <strong>Nota:</strong> Los cambios realizados en este módulo afectan a todo el sistema.
          </p>
          <p>
            Todos los cambios son auditados y registrados en los logs del sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
