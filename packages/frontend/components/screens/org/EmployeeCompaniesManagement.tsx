/**
 * EmployeeCompaniesManagement
 * Tres pestañas:
 * 1) Datos personales (employees)
 * 2) Usuario del sistema (users + role EMPLOYEE + vínculo employees.user_id)
 * 3) Asignación empleado-empresa (employee_companies)
 */

'use client';

import { useState } from 'react';
import { User, Building2, Shield } from 'lucide-react';
import { OrgMaintenance } from './OrgMaintenance';
import { EmployeeSystemUserManagement } from './EmployeeSystemUserManagement';
import SystemAdminPageHeader from '../../shared/SystemAdminPageHeader';

type EmployeeTab = 'employee-personal' | 'employee-system-user' | 'employee-company';

const TABS: Array<{ key: EmployeeTab; label: string; icon: any }> = [
  { key: 'employee-personal', label: 'Datos Personales', icon: User },
  { key: 'employee-company', label: 'Empleado por Empresa', icon: Building2 },
  { key: 'employee-system-user', label: 'Usuario del Sistema', icon: Shield },
];

export function EmployeeCompaniesManagement() {
  const [activeTab, setActiveTab] = useState<EmployeeTab>('employee-personal');

  return (
    <div className="p-6 max-w-full space-y-2">
      <SystemAdminPageHeader
        icon={Building2}
        title="Empleado por Empresas"
        subtitle="Gestión integral de datos personales, usuario del sistema y asignación laboral"
      />

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border ${
                isActive
                  ? 'bg-[#0074D9] text-white border-[#0074D9]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'employee-personal' ? (
        <OrgMaintenance
          key="employee-personal"
          initialEntity="employees"
          hideEntityTabs
          hideTopHeader
          pageTitle="Datos Personales del Empleado"
          pageDescription="Registro y mantenimiento de información personal de empleados"
        />
      ) : activeTab === 'employee-system-user' ? (
        <EmployeeSystemUserManagement />
      ) : (
        <OrgMaintenance
          key="employee-company"
          initialEntity="employee-companies"
          hideEntityTabs
          hideTopHeader
          pageTitle="Empleado por Empresas"
          pageDescription="Gestión de asignaciones laborales por empresa"
        />
      )}
    </div>
  );
}
