'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from 'lucide-react';
import { MigrationDiagnostic } from '@/components/admin/MigrationDiagnostic';

export function MigrationDiagnosticManagement() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-5" />
            Diagnóstico
          </CardTitle>
          <CardDescription>
            Verifica el estado de migraciones y tablas críticas del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Esta pantalla centraliza el diagnóstico técnico para no mezclarlo con la gestión funcional del Tenant.
          </p>
        </CardContent>
      </Card>

      <MigrationDiagnostic />
    </div>
  );
}

