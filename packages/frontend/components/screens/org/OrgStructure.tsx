/**
 * OrgStructure - Estructura Organizacional
 * Pantalla ORG para TENANT_ADMIN
 */

'use client';

import { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import OrganizationWizard from '../../wizards/OrganizationWizard';
import SystemAdminPageHeader from '../../shared/SystemAdminPageHeader';

export function OrgStructure() {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div className="p-6 max-w-full space-y-6">
      <SystemAdminPageHeader
        icon={Building2}
        title="Estructura Organizacional"
        subtitle="Administra empresa, localizaciones y jerarquía organizacional"
        rightSlot={(
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0074D9] text-white text-sm font-medium hover:bg-[#0066C0]"
          >
            <Plus className="size-4" />
            Nueva Empresa
          </button>
        )}
      />

      <div className="rounded-lg border bg-white shadow-sm p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center">
            <Building2 className="size-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Asistente Organizacional</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Use el boton "Nueva Empresa" para registrar empresa, localizacion y estructura completa.
            </p>
          </div>
        </div>
      </div>

      {showWizard && (
        <OrganizationWizard
          onClose={() => setShowWizard(false)}
          onComplete={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}
