/**
 * PayrollIntegration - Integración con Nómina
 * Pantalla CONFIG para TENANT_ADMIN
 */

'use client';

import { DollarSign, Download, Upload } from 'lucide-react';

export function PayrollIntegration() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integración con Nómina</h1>
          <p className="text-muted-foreground mt-1">
            Configura la integración con el sistema de nómina
          </p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 gap-2">
            <Upload className="size-4" />
            Importar
          </button>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#0074D9] text-white hover:bg-[#0074D9]/90 h-10 px-4 py-2 gap-2">
            <Download className="size-4" />
            Exportar a Nómina
          </button>
        </div>
      </div>

      {/* Content Placeholder */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center">
            <DollarSign className="size-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Integración con Nómina</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Esta pantalla permitirá importar/exportar datos hacia el sistema de nómina
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
