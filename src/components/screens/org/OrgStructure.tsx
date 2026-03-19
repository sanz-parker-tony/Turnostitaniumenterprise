/**
 * OrgStructure - Estructura Organizacional
 * Pantalla ORG para TENANT_ADMIN
 * Gestiona: companies, positions, departments, cost_centers
 */

'use client';

import { Building2, Plus } from 'lucide-react';

export function OrgStructure() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estructura Organizacional</h1>
          <p className="text-muted-foreground mt-1">
            Administra empresas, puestos, departamentos y centros de costo
          </p>
        </div>
        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#0074D9] text-white hover:bg-[#0074D9]/90 h-10 px-4 py-2 gap-2">
          <Plus className="size-4" />
          Nueva Empresa
        </button>
      </div>

      {/* Tabs Placeholder */}
      <div className="flex gap-2 border-b">
        <button className="px-4 py-2 text-sm font-medium border-b-2 border-[#0074D9] text-[#0074D9]">
          Empresas
        </button>
        <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          Puestos
        </button>
        <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          Departamentos
        </button>
        <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          Centros de Costo
        </button>
      </div>

      {/* Content Placeholder */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center">
            <Building2 className="size-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Estructura Organizacional</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Esta pantalla permitirá gestionar la jerarquía organizacional
            </p>
          </div>
          <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
            🚧 En construcción
          </div>
        </div>
      </div>
    </div>
  );
}
