'use client';

import { buildApiUrl } from '../../utils/api-config';
import { useEffect, useState } from 'react';
import { Building, Edit2, Save, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ApiClient } from '../../lib/api-client';
import { useAuth } from '../../contexts/AuthContext';
import GridActionIconButton from '../shared/GridActionIconButton';
import HeaderInfoTips from '../shared/HeaderInfoTips';
import HeaderRefreshButton from '../shared/HeaderRefreshButton';
import SystemAdminPageHeader from '../shared/SystemAdminPageHeader';

type Tenant = {
  id: string;
  tenant_key: string;
  tenant_name: string;
  is_active: boolean;
  created_at: string;
};

function getAccessToken(): string | null {
  return localStorage.getItem('tt-access-token');
}

export default function TenantsManagement() {
  const { session } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    void loadTenantData();
  }, []);

  const loadTenantData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await ApiClient
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error) throw error;

      setTenant(data as Tenant);
      setEditedName((data as Tenant).tenant_name);
    } catch (error: any) {
      console.error('Error cargando tenant:', error);
      toast.error('Error al cargar información del tenant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTenantName = async () => {
    if (!tenant || !editedName.trim()) return;

    try {
      const token = getAccessToken();
      if (!token) {
        setSessionError(true);
        toast.error('Sesión expirada. Inicia sesión nuevamente.');
        return;
      }

      const response = await fetch(buildApiUrl(`/tenants/${tenant.id}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenant_name: editedName.trim() }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || payload?.message || 'Error actualizando nombre del tenant');
      }

      const result = await response.json();
      setTenant(result.tenant);
      setEditedName(result.tenant?.tenant_name || editedName.trim());
      setIsEditingName(false);
      toast.success('Nombre actualizado exitosamente');
    } catch (error: any) {
      console.error('Error actualizando tenant:', error);
      toast.error(error?.message || 'Error al actualizar el nombre');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="size-8 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex gap-3 mb-4">
            <AlertTriangle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Tenant no encontrado</p>
              <p className="text-sm text-red-700 mt-1">No se encontro el tenant principal del sistema.</p>
            </div>
          </div>
          <Button onClick={() => void loadTenantData()} variant="outline" className="w-full">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-6 max-w-full space-y-6">
      {sessionError && !session && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertTriangle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 mb-2">Sesion expirada</p>
                <p className="text-sm text-red-800 mb-4">Actualiza la pagina o vuelve a iniciar sesion.</p>
                <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white" size="sm">
                  Actualizar pagina
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <SystemAdminPageHeader
        icon={Building}
        title="Gestion del Tenant"
        subtitle="Configuración del tenant único del sistema"
        rightSlot={
          <>
            <HeaderInfoTips
              items={[
                {
                  title: 'Restricción de seguridad',
                  text: 'Este entorno maneja un único tenant de sistema. No se permite crear ni eliminar tenants adicionales.',
                  variant: 'security',
                },
                {
                  title: 'Advertencia',
                  text: 'Modificar el nombre del tenant impacta referencias visibles en toda la aplicación.',
                  variant: 'warning',
                },
              ]}
            />
            <HeaderRefreshButton onClick={() => void loadTenantData()} />
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="size-5" />
            Información del Tenant
          </CardTitle>
          <CardDescription>Datos básicos del tenant único del sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tenant-name">Nombre de la Empresa</Label>
            {isEditingName ? (
              <div className="flex gap-2">
                <Input id="tenant-name" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="flex-1" />
                <Button size="sm" onClick={handleUpdateTenantName} className="bg-[#2ECC71] hover:bg-[#27AE60]">
                  <Save className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditingName(false);
                    setEditedName(tenant.tenant_name);
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                <span className="font-medium">{tenant.tenant_name}</span>
                <GridActionIconButton
                  onClick={() => setIsEditingName(true)}
                  icon={<Edit2 className="size-4" />}
                  label="Editar nombre"
                  tone="blue"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <span className="text-sm text-muted-foreground">Código</span>
              <p className="font-mono text-sm mt-1">{tenant.tenant_key}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Estado</span>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    tenant.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className={`size-1.5 rounded-full ${tenant.is_active ? 'bg-green-600' : 'bg-gray-600'}`} />
                  {tenant.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
            <div className="col-span-2">
              <span className="text-sm text-muted-foreground">Fecha de Creación</span>
              <p className="text-sm mt-1">{new Date(tenant.created_at).toLocaleString('es-ES')}</p>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
