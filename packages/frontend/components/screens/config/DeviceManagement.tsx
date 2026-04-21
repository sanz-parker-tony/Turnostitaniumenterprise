/**
 * DeviceManagement - Gestión de Dispositivos
 * Pantalla CONFIG para TENANT_ADMIN
 */

'use client';

import { Tablet, Plus } from 'lucide-react';

export function DeviceManagement() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Dispositivos</h1>
          <p className="text-muted-foreground mt-1">
            Administra los dispositivos de marcación (tablets, kioscos)
          </p>
        </div>
        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#0074D9] text-white hover:bg-[#0074D9]/90 h-10 px-4 py-2 gap-2">
          <Plus className="size-4" />
          Registrar Dispositivo
        </button>
      </div>

      {/* Content Placeholder */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center">
            <Tablet className="size-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Gestión de Dispositivos</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Esta pantalla permitirá registrar y configurar dispositivos de marcación
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
