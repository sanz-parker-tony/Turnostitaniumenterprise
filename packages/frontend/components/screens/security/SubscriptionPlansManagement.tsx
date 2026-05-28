'use client';
/**
 * SubscriptionPlansManagement - GestiÃ³n de Planes SaaS
 * Seguridad â†’ Planes
 */

import { buildApiUrl } from '../../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CreditCard,
  Edit2,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';
import GridActionIconButton from '@/components/shared/GridActionIconButton';
import HeaderInfoTips from '@/components/shared/HeaderInfoTips';
import HeaderRefreshButton from '@/components/shared/HeaderRefreshButton';
import SystemAdminPageHeader from '@/components/shared/SystemAdminPageHeader';

const API = buildApiUrl('/subscription-plans-management');

function getToken() {
  return localStorage.getItem('tt-access-token') || publicApiToken;
}

type SubscriptionPlan = {
  id: string;
  plan_key: string;
  plan_name: string;
  plan_description: string | null;
  price_monthly: number | string;
  price_yearly: number | string;
  currency_code: string;
  max_users: number | null;
  max_employees: number | null;
  max_companies: number | null;
  max_locations: number | null;
  features: any[] | null;
  trial_days: number | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
};

type FormState = {
  plan_key: string;
  plan_name: string;
  plan_description: string;
  price_monthly: string;
  price_yearly: string;
  currency_code: string;
  max_users: string;
  max_employees: string;
  max_companies: string;
  max_locations: string;
  features_text: string;
  trial_days: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: string;
};

const EMPTY_FORM: FormState = {
  plan_key: '',
  plan_name: '',
  plan_description: '',
  price_monthly: '0',
  price_yearly: '0',
  currency_code: 'USD',
  max_users: '',
  max_employees: '',
  max_companies: '',
  max_locations: '',
  features_text: '',
  trial_days: '0',
  is_active: true,
  is_featured: false,
  sort_order: '0',
};

const BADGE = {
  active: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800',
  inactive: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700',
  featured: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700',
};

function normalizePlanForForm(plan: SubscriptionPlan): FormState {
  const features = Array.isArray(plan.features) ? plan.features : [];
  const featuresText = features
    .map((item) => {
      if (typeof item === 'string') return item;
      try {
        return JSON.stringify(item);
      } catch {
        return String(item);
      }
    })
    .join('\n');

  return {
    plan_key: plan.plan_key || '',
    plan_name: plan.plan_name || '',
    plan_description: plan.plan_description || '',
    price_monthly: String(plan.price_monthly ?? '0'),
    price_yearly: String(plan.price_yearly ?? '0'),
    currency_code: String(plan.currency_code || 'USD'),
    max_users: plan.max_users === null || plan.max_users === undefined ? '' : String(plan.max_users),
    max_employees: plan.max_employees === null || plan.max_employees === undefined ? '' : String(plan.max_employees),
    max_companies: plan.max_companies === null || plan.max_companies === undefined ? '' : String(plan.max_companies),
    max_locations: plan.max_locations === null || plan.max_locations === undefined ? '' : String(plan.max_locations),
    features_text: featuresText,
    trial_days: plan.trial_days === null || plan.trial_days === undefined ? '0' : String(plan.trial_days),
    is_active: plan.is_active,
    is_featured: plan.is_featured,
    sort_order: String(plan.sort_order ?? 0),
  };
}

function splitFeatures(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function SubscriptionPlansManagement() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API, { headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error cargando planes');
      setPlans(Array.isArray(data.plans) ? data.plans : []);
    } catch (err: any) {
      setError(err.message || 'Error cargando planes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    let list = [...plans];
    if (text) {
      list = list.filter((p) =>
        p.plan_key.toLowerCase().includes(text) ||
        p.plan_name.toLowerCase().includes(text) ||
        String(p.plan_description || '').toLowerCase().includes(text)
      );
    }
    if (statusFilter === 'active') list = list.filter((p) => p.is_active);
    if (statusFilter === 'inactive') list = list.filter((p) => !p.is_active);
    return list;
  }, [plans, search, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setPanelError(null);
    setPanelOpen(true);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditing(plan);
    setForm(normalizePlanForForm(plan));
    setPanelError(null);
    setPanelOpen(true);
  };

  const save = async () => {
    setPanelError(null);
    if (!form.plan_key.trim() || !form.plan_name.trim()) {
      setPanelError('plan_key y plan_name son obligatorios');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        plan_key: form.plan_key.trim().toUpperCase(),
        plan_name: form.plan_name.trim(),
        plan_description: form.plan_description.trim() || null,
        price_monthly: Number(form.price_monthly || 0),
        price_yearly: Number(form.price_yearly || 0),
        currency_code: (form.currency_code || 'USD').trim().toUpperCase(),
        max_users: form.max_users.trim() ? Number(form.max_users) : null,
        max_employees: form.max_employees.trim() ? Number(form.max_employees) : null,
        max_companies: form.max_companies.trim() ? Number(form.max_companies) : null,
        max_locations: form.max_locations.trim() ? Number(form.max_locations) : null,
        features: splitFeatures(form.features_text),
        trial_days: Number(form.trial_days || 0),
        is_active: form.is_active,
        is_featured: form.is_featured,
        sort_order: Number(form.sort_order || 0),
      };

      const endpoint = editing ? `${API}/${editing.id}` : API;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: headers(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el plan');

      setPanelOpen(false);
      await load();
    } catch (err: any) {
      setPanelError(err.message || 'No se pudo guardar el plan');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (plan: SubscriptionPlan) => {
    try {
      const res = await fetch(`${API}/${plan.id}/status`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ is_active: !plan.is_active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo cambiar el estado');
      await load();
    } catch (err: any) {
      setError(err.message || 'No se pudo cambiar el estado');
    }
  };

  const removePlan = async (plan: SubscriptionPlan) => {
    const ok = window.confirm(`Â¿Eliminar el plan ${plan.plan_name} (${plan.plan_key})?`);
    if (!ok) return;
    try {
      const res = await fetch(`${API}/${plan.id}`, {
        method: 'DELETE',
        headers: headers(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar el plan');
      await load();
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar el plan');
    }
  };

  return (
    <div className="p-6 max-w-full flex flex-col h-full gap-4">
      <SystemAdminPageHeader
        icon={CreditCard}
        title="Gestión de Planes"
        subtitle="Gestión de planes de suscripción SaaS"
        rightSlot={(
          <>
            <HeaderInfoTips
              items={[
                {
                  title: 'Tip comercial',
                  text: 'Configura límites, precios y beneficios de cada plan para controlar la oferta del sistema.',
                  variant: 'tip',
                },
              ]}
            />
            <HeaderRefreshButton onClick={() => void load()} />
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-[#0074D9] text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Nuevo Plan
            </button>
          </>
        )}
      />
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por clave, nombre o descripciÃ³n..."
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          Mostrando {filtered.length} de {plans.length} planes
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-hidden flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Clave</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Precio</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">LÃ­mites</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      {search ? 'No hay resultados' : 'No hay planes registrados'}
                    </td>
                  </tr>
                ) : filtered.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{plan.plan_key}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{plan.plan_name}</div>
                      {plan.plan_description && <div className="text-xs text-gray-500 mt-0.5">{plan.plan_description}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>M: {plan.currency_code} {plan.price_monthly}</div>
                      <div>A: {plan.currency_code} {plan.price_yearly}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      <div>Usuarios: {plan.max_users ?? 'Ilimitado'}</div>
                      <div>Empleados: {plan.max_employees ?? 'Ilimitado'}</div>
                      <div>Empresas: {plan.max_companies ?? 'Ilimitado'}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={plan.is_active ? BADGE.active : BADGE.inactive}>
                          {plan.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        {plan.is_featured && <span className={BADGE.featured}>Destacado</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <GridActionIconButton
                          onClick={() => openEdit(plan)}
                          icon={<Edit2 className="w-4 h-4" />}
                          label="Editar"
                          tone="blue"
                        />
                        <GridActionIconButton
                          onClick={() => void toggleStatus(plan)}
                          icon={plan.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          label={plan.is_active ? 'Desactivar' : 'Activar'}
                          tone='amber'
                        />
                        <GridActionIconButton
                          onClick={() => void removePlan(plan)}
                          icon={<Trash2 className="w-4 h-4" />}
                          label="Eliminar"
                          tone="red"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-xl border border-gray-200 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">{editing ? 'Editar Plan' : 'Nuevo Plan'}</h2>
              </div>
              <button onClick={() => setPanelOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {panelError && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {panelError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clave <span className="text-red-500">*</span></label>
                  <input
                    value={form.plan_key}
                    onChange={(e) => setForm({ ...form, plan_key: e.target.value.toUpperCase() })}
                    disabled={!!editing}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                    placeholder="BASIC, PRO, ENTERPRISE"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                  <input
                    value={form.plan_name}
                    onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Plan Profesional"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">DescripciÃ³n</label>
                  <textarea
                    value={form.plan_description}
                    onChange={(e) => setForm({ ...form, plan_description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Mensual</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price_monthly}
                    onChange={(e) => setForm({ ...form, price_monthly: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Anual</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price_yearly}
                    onChange={(e) => setForm({ ...form, price_yearly: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                  <input
                    value={form.currency_code}
                    onChange={(e) => setForm({ ...form, currency_code: e.target.value.toUpperCase().slice(0, 3) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="USD"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DÃ­as de prueba</label>
                  <input
                    type="number"
                    min={0}
                    value={form.trial_days}
                    onChange={(e) => setForm({ ...form, trial_days: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MÃ¡x. Usuarios</label>
                  <input
                    type="number"
                    min={0}
                    value={form.max_users}
                    onChange={(e) => setForm({ ...form, max_users: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="vacÃ­o = ilimitado"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MÃ¡x. Empleados</label>
                  <input
                    type="number"
                    min={0}
                    value={form.max_employees}
                    onChange={(e) => setForm({ ...form, max_employees: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="vacÃ­o = ilimitado"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MÃ¡x. Empresas</label>
                  <input
                    type="number"
                    min={0}
                    value={form.max_companies}
                    onChange={(e) => setForm({ ...form, max_companies: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="vacÃ­o = ilimitado"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MÃ¡x. Localizaciones</label>
                  <input
                    type="number"
                    min={0}
                    value={form.max_locations}
                    onChange={(e) => setForm({ ...form, max_locations: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="vacÃ­o = ilimitado"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                  <input
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Features (1 por lÃ­nea)</label>
                  <textarea
                    value={form.features_text}
                    onChange={(e) => setForm({ ...form, features_text: e.target.value })}
                    rows={5}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={'Control de marcaciones\nReportes avanzados\nIntegraciÃ³n nÃ³mina'}
                  />
                </div>

                <div className="md:col-span-2 flex flex-wrap items-center gap-5 pt-1">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    Activo
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.is_featured}
                      onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    Destacado
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={() => setPanelOpen(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-100">
                Cancelar
              </button>
              <button
                onClick={() => void save()}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#0074D9] text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



