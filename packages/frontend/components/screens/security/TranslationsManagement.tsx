'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Edit2,
  Languages,
  RefreshCw,
  Save,
  Search,
  X,
} from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';
import GridActionIconButton from '@/components/shared/GridActionIconButton';
import HeaderInfoTips from '@/components/shared/HeaderInfoTips';
import HeaderRefreshButton from '@/components/shared/HeaderRefreshButton';
import SystemAdminPageHeader from '@/components/shared/SystemAdminPageHeader';

const API = 'http://localhost:3001/translations-management';

type Family = 'menu_actions' | 'catalogs' | 'reports' | 'messages';
type EntityType =
  | 'menu_groups'
  | 'screens'
  | 'actions'
  | 'lookup_groups'
  | 'lookup_values'
  | 'system_reports'
  | 'report_parameters'
  | 'system_messages';

type Language = {
  code: string;
  language_name: string;
  is_active: boolean;
  is_default: boolean;
};

type RowData = {
  entity_id: string;
  key: string;
  base_label: string;
  base_secondary: string;
  context: string;
  is_active: boolean;
  translation: {
    id?: string | null;
    label?: string;
    secondary?: string;
    description?: string;
    notes?: string;
    text?: string;
    is_active?: boolean;
  };
};

const FAMILY_OPTIONS: Record<Family, { label: string; entityTypes: EntityType[] }> = {
  menu_actions: {
    label: 'Menus y Acciones',
    entityTypes: ['menu_groups', 'screens', 'actions'],
  },
  catalogs: {
    label: 'Catalogos',
    entityTypes: ['lookup_groups', 'lookup_values'],
  },
  reports: {
    label: 'Reportes',
    entityTypes: ['system_reports', 'report_parameters'],
  },
  messages: {
    label: 'Mensajes',
    entityTypes: ['system_messages'],
  },
};

const ENTITY_LABELS: Record<EntityType, string> = {
  menu_groups: 'Grupos de Menu',
  screens: 'Pantallas',
  actions: 'Acciones',
  lookup_groups: 'Grupos de Catalogo',
  lookup_values: 'Items de Catalogo',
  system_reports: 'Reportes del Sistema',
  report_parameters: 'Parametros de Reporte',
  system_messages: 'Mensajes del Sistema',
};

function getToken() {
  return localStorage.getItem('tt-access-token') || localStorage.getItem('access_token') || publicApiToken;
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

export default function TranslationsManagement() {
  const [family, setFamily] = useState<Family>('menu_actions');
  const [entityType, setEntityType] = useState<EntityType>('menu_groups');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [languageCode, setLanguageCode] = useState('es');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<RowData | null>(null);
  const [form, setForm] = useState({
    label: '',
    secondary: '',
    description: '',
    notes: '',
    text: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  const availableEntityTypes = useMemo(() => FAMILY_OPTIONS[family].entityTypes, [family]);

  const loadLanguages = async () => {
    const res = await fetch(`${API}/catalogs/languages`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando idiomas');
    const langs: Language[] = data.languages || [];
    setLanguages(langs);
    if (!langs.some((l) => l.code === languageCode)) {
      const preferred = langs.find((l) => l.is_default)?.code || langs[0]?.code || 'es';
      setLanguageCode(preferred);
    }
  };

  const loadRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        language_code: languageCode,
      });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`${API}/${entityType}?${params.toString()}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando traducciones');
      setRows(data.rows || []);
    } catch (e: any) {
      setError(e.message || 'Error cargando traducciones');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        await loadLanguages();
      } catch (e: any) {
        setError(e.message || 'Error cargando idiomas');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const firstType = FAMILY_OPTIONS[family].entityTypes[0];
    if (!FAMILY_OPTIONS[family].entityTypes.includes(entityType)) {
      setEntityType(firstType);
    }
  }, [family, entityType]);

  useEffect(() => {
    if (!languageCode) return;
    void loadRows();
  }, [entityType, languageCode]);

  const onSearch = async () => {
    await loadRows();
  };

  const openEdit = (row: RowData) => {
    setEditingRow(row);
    setForm({
      label: row.translation.label ?? row.base_label ?? '',
      secondary: row.translation.secondary ?? row.base_secondary ?? '',
      description: row.translation.description ?? row.base_secondary ?? '',
      notes: row.translation.notes ?? row.context ?? '',
      text: row.translation.text ?? row.base_label ?? '',
      is_active: row.translation.is_active ?? true,
    });
    setPanelError(null);
    setEditOpen(true);
  };

  const save = async () => {
    if (!editingRow) return;
    setSaving(true);
    setPanelError(null);
    try {
      const payload: any = { language_code: languageCode };
      if (entityType === 'menu_groups' || entityType === 'screens' || entityType === 'actions' || entityType === 'lookup_groups' || entityType === 'lookup_values' || entityType === 'report_parameters') {
        payload.label = form.label;
      }
      if (entityType === 'menu_groups' || entityType === 'screens' || entityType === 'lookup_groups' || entityType === 'lookup_values') {
        payload.secondary = form.secondary;
      }
      if (entityType === 'system_reports' || entityType === 'report_parameters') {
        payload.description = form.description;
      }
      if (entityType === 'system_reports') {
        payload.notes = form.notes;
      }
      if (entityType === 'system_messages') {
        payload.text = form.text;
        payload.is_active = form.is_active;
      }
      if (entityType === 'system_reports') {
        payload.label = form.label;
      }

      const res = await fetch(`${API}/${entityType}/${editingRow.entity_id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando traduccion');
      setEditOpen(false);
      await loadRows();
    } catch (e: any) {
      setPanelError(e.message || 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  const showSecondary = entityType === 'menu_groups' || entityType === 'screens' || entityType === 'lookup_groups' || entityType === 'lookup_values';
  const showDescription = entityType === 'system_reports' || entityType === 'report_parameters';
  const showNotes = entityType === 'system_reports';
  const showText = entityType === 'system_messages';
  const showActiveToggle = entityType === 'system_messages';

  return (
    <div className="p-6 max-w-full flex flex-col h-full gap-4">
      <SystemAdminPageHeader
        icon={Languages}
        title="Gestion de Traducciones"
        subtitle="Menus, acciones, catalogos, reportes y mensajes por idioma"
        rightSlot={(
          <>
            <HeaderInfoTips
              items={[
                {
                  title: 'Uso recomendado',
                  text: 'Traduce primero textos base y luego catálogos, pantallas y acciones para mantener consistencia.',
                  variant: 'tip',
                },
              ]}
            />
            <HeaderRefreshButton onClick={loadRows} />
          </>
        )}
      />
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FAMILY_OPTIONS) as Family[]).map((key) => (
          <button
            key={key}
            onClick={() => setFamily(key)}
            className={`px-3 py-2 text-sm rounded-lg border ${
              family === key
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {FAMILY_OPTIONS[key].label}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as EntityType)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableEntityTypes.map((type) => (
                <option key={type} value={type}>
                  {ENTITY_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Idioma</label>
            <select
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.language_name} ({lang.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Clave o texto base"
                  className="w-full pl-7 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button onClick={onSearch} className="px-3 py-2 text-sm text-white bg-[#0074D9] rounded-lg hover:bg-blue-700">
                Filtrar
              </button>
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          Mostrando {rows.length} de {rows.length} {ENTITY_LABELS[entityType].toLowerCase()}
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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Base</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contexto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Traduccion</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
                      No hay registros para mostrar
                    </td>
                  </tr>
                ) : rows.map((row) => {
                  const translationPreview =
                    entityType === 'system_messages'
                      ? (row.translation.text || '(sin traduccion)')
                      : (row.translation.label || '(sin traduccion)');
                  return (
                    <tr key={row.entity_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{row.key}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{row.base_label}</div>
                        {row.base_secondary ? <div className="text-xs text-gray-500">{row.base_secondary}</div> : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{row.context || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{translationPreview}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <GridActionIconButton
                            onClick={() => openEdit(row)}
                            icon={<Edit2 className="w-4 h-4" />}
                            label="Editar traducción"
                            tone="blue"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editOpen && editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-xl border border-gray-200 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div>
                <h2 className="font-semibold text-gray-900">Editar Traduccion</h2>
                <p className="text-xs text-gray-500 mt-1">{editingRow.key} Â· {ENTITY_LABELS[entityType]} Â· {languageCode}</p>
              </div>
              <button onClick={() => setEditOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {panelError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {panelError}
                </div>
              )}

              <div className="rounded-lg border bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Texto base</p>
                <p className="text-sm font-medium text-gray-900">{editingRow.base_label}</p>
                {editingRow.base_secondary ? <p className="text-xs text-gray-600 mt-1">{editingRow.base_secondary}</p> : null}
              </div>

              {!showText && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Texto principal *</label>
                  <input
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {showSecondary && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Texto secundario</label>
                  <input
                    value={form.secondary}
                    onChange={(e) => setForm({ ...form, secondary: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {showDescription && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion *</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}

              {showNotes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}

              {showText && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Texto traducido *</label>
                  <textarea
                    value={form.text}
                    onChange={(e) => setForm({ ...form, text: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}

              {showActiveToggle && (
                <div className="flex items-center gap-3">
                  <input
                    id="msg-active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                  <label htmlFor="msg-active" className="text-sm text-gray-700">Traduccion activa</label>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-100">Cancelar</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#0074D9] text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60">
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


