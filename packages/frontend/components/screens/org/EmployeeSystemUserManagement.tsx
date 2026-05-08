'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Eye, EyeOff, KeyRound, RefreshCw, Save, Search, Shield } from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';

interface EmployeeUserRow {
  employee_id: string;
  tenant_id: string;
  employee_code: string | null;
  employee_lastname: string | null;
  employee_name: string | null;
  employee_is_active: boolean;
  user_id: string | null;
  username: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  preferred_language_code: string | null;
  user_is_active: boolean | null;
}

interface LanguageOption {
  code: string;
  language_name: string;
}

function getToken() {
  return localStorage.getItem('tt-access-token') || publicApiToken;
}

function suggestUsername(row: EmployeeUserRow): string {
  const code = String(row.employee_code || '').trim();
  if (code) return code.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const name = `${row.employee_name || ''}.${row.employee_lastname || ''}`.toLowerCase();
  return name.replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '').replace(/\.+/g, '.').replace(/^\./, '').replace(/\.$/, '');
}

export function EmployeeSystemUserManagement() {
  const [rows, setRows] = useState<EmployeeUserRow[]>([]);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: '',
    display_name: '',
    email: '',
    phone: '',
    preferred_language_code: '',
    password: '',
    confirm_password: '',
    is_active: true,
  });
  const [showPassword, setShowPassword] = useState(false);

  const selectedRow = useMemo(
    () => rows.find((row) => row.employee_id === selectedEmployeeId) || null,
    [rows, selectedEmployeeId]
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const fullName = `${row.employee_lastname || ''} ${row.employee_name || ''}`.toLowerCase();
      return (
        String(row.employee_code || '').toLowerCase().includes(term) ||
        fullName.includes(term) ||
        String(row.username || '').toLowerCase().includes(term) ||
        String(row.email || '').toLowerCase().includes(term)
      );
    });
  }, [rows, search]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rowsRes, catalogsRes] = await Promise.all([
        fetch('http://localhost:3001/organization/employee-users', {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch('http://localhost:3001/organization/employee-users/catalogs', {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      const rowsPayload = await rowsRes.json().catch(() => ({}));
      const catalogsPayload = await catalogsRes.json().catch(() => ({}));
      if (!rowsRes.ok) throw new Error(rowsPayload.error || `HTTP ${rowsRes.status}`);
      if (!catalogsRes.ok) throw new Error(catalogsPayload.error || `HTTP ${catalogsRes.status}`);

      const loadedRows: EmployeeUserRow[] = rowsPayload.rows || [];
      setRows(loadedRows);
      setLanguages(catalogsPayload.catalogs?.languages || []);

      if (!selectedEmployeeId && loadedRows.length > 0) {
        setSelectedEmployeeId(loadedRows[0].employee_id);
      }
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedRow) return;
    setForm({
      username: selectedRow.username || suggestUsername(selectedRow),
      display_name: selectedRow.display_name || `${selectedRow.employee_name || ''} ${selectedRow.employee_lastname || ''}`.trim(),
      email: selectedRow.email || '',
      phone: selectedRow.phone || '',
      preferred_language_code: selectedRow.preferred_language_code || '',
      password: '',
      confirm_password: '',
      is_active: selectedRow.user_is_active ?? true,
    });
  }, [selectedRow]);

  const handleSave = async () => {
    if (!selectedRow) return;
    if (!form.username.trim()) {
      setError('Username es obligatorio');
      return;
    }
    if (!form.email.trim()) {
      setError('Email es obligatorio');
      return;
    }
    if (!selectedRow.user_id && !form.password.trim()) {
      setError('Password es obligatorio para crear el usuario por primera vez');
      return;
    }
    if (form.password.trim() && form.password.trim().length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (form.password.trim() !== form.confirm_password.trim()) {
      setError('Password y confirmar password deben coincidir');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:3001/organization/employee-users/${selectedRow.employee_id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: form.username.trim(),
          display_name: form.display_name.trim() || null,
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          preferred_language_code: form.preferred_language_code || null,
          password: form.password.trim() || null,
          is_active: form.is_active,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || `HTTP ${res.status}`);
      await loadData();
      setForm((prev) => ({ ...prev, password: '', confirm_password: '' }));
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Usuario del Sistema por Empleado</h2>
            <p className="text-sm text-gray-500">
              Crear o actualizar credenciales para Turnos Platinium. El rol asignado será <strong>EMPLOYEE</strong>.
            </p>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="size-4" />
            Recargar
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2">
            <Search className="size-4 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar empleado..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <div className="max-h-[540px] space-y-2 overflow-y-auto pr-1">
            {loading ? (
              <p className="text-sm text-gray-500">Cargando empleados...</p>
            ) : filteredRows.length === 0 ? (
              <p className="text-sm text-gray-500">No hay empleados para mostrar.</p>
            ) : (
              filteredRows.map((row) => {
                const isSelected = row.employee_id === selectedEmployeeId;
                const fullName = `${row.employee_lastname || ''} ${row.employee_name || ''}`.trim();
                return (
                  <button
                    key={row.employee_id}
                    type="button"
                    onClick={() => setSelectedEmployeeId(row.employee_id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      isSelected
                        ? 'border-[#0074D9] bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{fullName || 'Empleado sin nombre'}</p>
                        <p className="text-xs text-gray-500">Código: {row.employee_code || '-'}</p>
                        <p className="text-xs text-gray-500">
                          Usuario: {row.username || 'No registrado'}
                        </p>
                        <p className="text-xs text-gray-500">{row.email || 'Sin email'}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.user_id ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {row.user_id ? 'Vinculado' : 'Pendiente'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          {!selectedRow ? (
            <p className="text-sm text-gray-500">Selecciona un empleado para administrar su usuario.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="text-sm font-semibold text-blue-900">
                  {`${selectedRow.employee_lastname || ''} ${selectedRow.employee_name || ''}`.trim() || 'Empleado'}
                </p>
                <p className="text-xs text-blue-700">
                  Código: {selectedRow.employee_code || '-'} · User ID: {selectedRow.user_id || 'Sin vínculo'}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  <Shield className="size-3.5" />
                  Rol objetivo: EMPLOYEE
                </p>
                <p className="mt-1 inline-flex items-center gap-1 rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  Scope objetivo: EMPLOYEE
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <label className="text-sm font-medium text-gray-700">
                  Username *
                  <input
                    type="text"
                    value={form.username}
                    onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-sm font-medium text-gray-700">
                  Display Name
                  <input
                    type="text"
                    value={form.display_name}
                    onChange={(event) => setForm((prev) => ({ ...prev, display_name: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-sm font-medium text-gray-700">
                  Email *
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-sm font-medium text-gray-700">
                  Teléfono
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-sm font-medium text-gray-700">
                  Idioma preferido
                  <select
                    value={form.preferred_language_code}
                    onChange={(event) => setForm((prev) => ({ ...prev, preferred_language_code: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Sin preferencia</option>
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.language_name} ({lang.code})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-gray-700">
                  {selectedRow.user_id ? 'Nueva contraseña (opcional)' : 'Contraseña inicial *'}
                  <div className="relative mt-1">
                    <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                      className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </label>

                <label className="text-sm font-medium text-gray-700">
                  Confirmar contraseña
                  <div className="relative mt-1">
                    <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.confirm_password}
                      onChange={(event) => setForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
                      className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm"
                    />
                  </div>
                </label>

                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                    className="size-4 rounded border-gray-300"
                  />
                  Usuario activo
                </label>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-[#0074D9] px-4 py-2 text-sm font-medium text-white hover:bg-[#005bb5] disabled:opacity-60"
              >
                {saving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                {saving ? 'Guardando...' : selectedRow.user_id ? 'Actualizar Usuario' : 'Crear Usuario'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
