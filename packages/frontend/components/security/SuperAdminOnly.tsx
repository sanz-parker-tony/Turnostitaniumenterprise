import React from 'react';
import { Card, CardContent } from '../ui/card';
import { ShieldAlert, Lock } from 'lucide-react';

interface SuperAdminOnlyProps {
  userEmail?: string;
  tenantName?: string;
  feature: string;
  description: string;
}

/**
 * Componente reutilizable para mostrar mensaje de acceso denegado
 * Solo usuarios Super Admin pueden acceder
 */
export default function SuperAdminOnly({ 
  userEmail = 'Desconocido', 
  tenantName = 'N/A',
  feature,
  description
}: SuperAdminOnlyProps) {
  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardContent className="pt-6">
        <div className="text-center space-y-4 max-w-md mx-auto">
          <div className="flex justify-center">
            <div className="bg-red-100 p-4 rounded-full">
              <ShieldAlert className="w-12 h-12 text-red-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-red-900">
              Acceso Restringido
            </h2>
            <p className="text-red-800">
              Esta funcionalidad está reservada exclusivamente para el <strong>Super Admin</strong> del sistema.
            </p>
            <div className="bg-red-100 border border-red-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-red-900">
                <Lock className="w-4 h-4 inline mr-1" />
                <strong>{feature}</strong>
              </p>
              <p className="text-xs text-red-800 mt-1">
                {description}
              </p>
            </div>
          </div>
          <div className="pt-2">
            <p className="text-sm text-muted-foreground">
              Usuario actual: <strong>{userEmail}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Tenant: <strong>{tenantName}</strong>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
