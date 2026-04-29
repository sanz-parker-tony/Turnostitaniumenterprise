/**
 * OrgStructure - Estructura Organizacional
 * Pantalla ORG para TENANT_ADMIN
 */

'use client';

import { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import OrganizationWizard from '../../wizards/OrganizationWizard';

export function OrgStructure() {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estructura Organizacional</h1>
          <p className="text-muted-foreground mt-1">
            Administra empresa, localizaciones y jerarquia organizacional
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#0074D9] text-white hover:bg-[#0074D9]/90 h-10 px-4 py-2 gap-2"
        >
          <Plus className="size-4" />
          Nueva Empresa
        </button>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-8">
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
