/**
 * TenantSettings - Configuración del Tenant
 * Pantalla CONFIG para TENANT_ADMIN
 * Permite editar tenant_name pero NO tenant_key (siempre = 'SYSTEM')
 */

'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useState, useEffect } from 'react';
import { Building, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicApiToken } from '@/utils/backend/info';

interface TenantData {
  id: string;
  tenant_key: string;
  tenant_name: string;
  is_active: boolean;
}

export function TenantSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [tenantName, setTenantName] = useState('');

  // Cargar datos del tenant
  useEffect(() => {
    fetchTenantData();
  }, []);

  const fetchTenantData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        buildApiUrl(`/tenant/settings`),
        {
          headers: {
            'Authorization': `Bearer ${publicApiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar configuración del tenant');
      }

      const data = await response.json();
      setTenant(data);
      setTenantName(data.tenant_name);
    } catch (error) {
      console.error('Error fetching tenant:', error);
      toast.error('Error al cargar la configuración del tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantName.trim()) {
      toast.error('El nombre del tenant es obligatorio');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        buildApiUrl(`/tenant/settings`),
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenant_name: tenantName.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Error al guardar cambios');
      }

      const data = await response.json();
      setTenant(data);
      toast.success('✅ Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast.error('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="size-8 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración del Tenant</h1>
          <p className="text-muted-foreground mt-1">
            Administra la configuración general de tu organización
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !tenant}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#2ECC71] text-white hover:bg-[#2ECC71]/90 h-10 px-4 py-2 gap-2"
        >
          <Save className="size-4" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {/* Información del Sistema */}
      <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 p-4">
        <div className="flex gap-3">
          <AlertCircle className="size-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Instalación On-Premise Enterprise
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Este sistema opera bajo el protocolo SELLADO con un único tenant.
              El código del tenant (SYSTEM) está bloqueado y no puede modificarse.
            </p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="size-12 rounded-full bg-[#0074D9]/10 flex items-center justify-center">
              <Building className="size-6 text-[#0074D9]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Datos del Tenant</h3>
              <p className="text-sm text-muted-foreground">
                Información básica de tu organización
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Código del Tenant (BLOQUEADO) */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Código del Tenant
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={tenant?.tenant_key || 'SYSTEM'}
                  disabled
                  className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <div className="bg-gray-100 dark:bg-gray-800 text-xs px-2 py-1 rounded text-gray-600 dark:text-gray-400 font-medium">
                    BLOQUEADO
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Código técnico del sistema. No se puede modificar.
              </p>
            </div>

            {/* Nombre del Tenant (EDITABLE) */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Nombre de la Organización
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="Ej: Mi Empresa S.A."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Nombre visible de tu organización en el sistema
              </p>
            </div>

            {/* Estado (solo lectura) */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Estado
              </label>
              <div className="flex h-10 items-center">
                {tenant?.is_active ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm font-medium">
                    <CheckCircle2 className="size-4" />
                    Activo
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm font-medium">
                    <AlertCircle className="size-4" />
                    Inactivo
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Estado actual del tenant en el sistema
              </p>
            </div>

            {/* ID del Tenant (solo lectura) */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                ID del Tenant
              </label>
              <input
                type="text"
                value={tenant?.id || ''}
                disabled
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Identificador único del tenant (UUID)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

