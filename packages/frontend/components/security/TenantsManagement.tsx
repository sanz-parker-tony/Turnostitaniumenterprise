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

type TenantReferenceTab = 'general' | 'settings' | 'onboarding' | 'languages';

type TenantReferenceData = {
  summary?: {
    active_settings_count?: number;
    onboarding?: any;
    language_settings?: any;
  };
  details?: {
    tenant_settings?: any[];
    tenant_onboarding?: any[];
    tenant_language_settings?: any[];
  };
};

// OnPremise: only operational tenant references are visible here.
// Future SaaS: add tenant_subscriptions, subscription_plans and payment_transactions.
const REFERENCE_TABS: Array<{ key: TenantReferenceTab; label: string }> = [
  { key: 'general', label: 'General' },
  { key: 'settings', label: 'Parámetros' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'languages', label: 'Idiomas' },
];

function getAccessToken(): string | null {
  return localStorage.getItem('tt-access-token');
}

function formatDate(value: any): string {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('es-ES') : String(value);
}

function formatValue(value: any): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatSystemSetting(row: any): string {
  const setting = row.system_setting;
  const label = setting?.setting_name || setting?.setting_short_key || setting?.setting_key;
  if (label) {
    const key = setting?.setting_key && setting.setting_key !== label ? ` (${setting.setting_key})` : '';
    return `${label}${key}`;
  }
  return row.system_setting_id ? `Parámetro sin catálogo (${row.system_setting_id})` : '-';
}

function ReadOnlyTable({
  rows,
  columns,
  emptyText,
}: {
  rows: any[];
  columns: Array<{ key: string; label: string; render?: (row: any) => string }>;
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">{emptyText}</div>;
  }

  return (
    <div className="overflow-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="border-b px-3 py-2 text-left font-medium text-muted-foreground">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index} className="border-b last:border-b-0">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-2 align-top">
                  {column.render ? column.render(row) : formatValue(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TenantsManagement() {
  const { session } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [referenceData, setReferenceData] = useState<TenantReferenceData | null>(null);
  const [activeTab, setActiveTab] = useState<TenantReferenceTab>('general');
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    void loadTenantData();
  }, [session?.access_token]);

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
      await loadTenantReferenceData((data as Tenant).id);
    } catch (error: any) {
      console.error('Error cargando tenant:', error);
      toast.error('Error al cargar información del tenant');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTenantReferenceData = async (tenantId: string) => {
    const token = session?.access_token || getAccessToken();
    if (!token) return;

    const response = await fetch(buildApiUrl(`/tenants/${tenantId}/summary`), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || 'Error cargando referencias del tenant');
    setReferenceData(payload as TenantReferenceData);
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
              <p className="text-sm text-red-700 mt-1">No se encontró el tenant principal del sistema.</p>
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
                <p className="text-sm font-medium text-red-900 mb-2">Sesión expirada</p>
                <p className="text-sm text-red-800 mb-4">Actualiza la página o vuelve a iniciar sesión.</p>
                <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white" size="sm">
                  Actualizar página
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <SystemAdminPageHeader
        icon={Building}
        title="Gestión del Tenant"
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

      <Card>
        <CardHeader>
          <CardTitle>Referencias del Tenant</CardTitle>
          <CardDescription>
            Información de solo lectura tomada de las tablas relacionadas al tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {REFERENCE_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  activeTab === tab.key
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'general' ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">Parámetros activos</div>
                <div className="mt-1 text-2xl font-semibold">{referenceData?.summary?.active_settings_count ?? 0}</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">Avance onboarding</div>
                <div className="mt-1 text-2xl font-semibold">
                  {referenceData?.summary?.onboarding?.completion_percentage ?? 0}%
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">Idioma por defecto</div>
                <div className="mt-1 text-2xl font-semibold">
                  {referenceData?.summary?.language_settings?.default_language_code || '-'}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'settings' ? (
            <ReadOnlyTable
              rows={referenceData?.details?.tenant_settings || []}
              emptyText="No hay overrides de parámetros para este tenant."
              columns={[
                {
                  key: 'system_setting',
                  label: 'Parámetro',
                  render: formatSystemSetting,
                },
                { key: 'setting_value', label: 'Valor' },
                { key: 'default_value', label: 'Valor sistema', render: (row) => formatValue(row.system_setting?.default_value) },
                { key: 'is_active', label: 'Activo' },
                { key: 'updated_at', label: 'Actualizado', render: (row) => formatDate(row.updated_at || row.created_at) },
              ]}
            />
          ) : null}

          {activeTab === 'onboarding' ? (
            <ReadOnlyTable
              rows={referenceData?.details?.tenant_onboarding || []}
              emptyText="No hay registro de onboarding para este tenant."
              columns={[
                { key: 'onboarding_status', label: 'Estado' },
                { key: 'current_step', label: 'Paso actual' },
                { key: 'completion_percentage', label: 'Avance', render: (row) => `${row.completion_percentage ?? 0}%` },
                { key: 'completed_steps', label: 'Pasos completados' },
                { key: 'started_at', label: 'Inicio', render: (row) => formatDate(row.started_at) },
                { key: 'completed_at', label: 'Finalización', render: (row) => formatDate(row.completed_at) },
              ]}
            />
          ) : null}

          {activeTab === 'languages' ? (
            <ReadOnlyTable
              rows={referenceData?.details?.tenant_language_settings || []}
              emptyText="No hay configuración de idioma para este tenant."
              columns={[
                { key: 'default_language_code', label: 'Idioma por defecto' },
                { key: 'enabled_languages', label: 'Idiomas habilitados' },
                { key: 'created_at', label: 'Creado', render: (row) => formatDate(row.created_at) },
                { key: 'updated_at', label: 'Actualizado', render: (row) => formatDate(row.updated_at) },
              ]}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
