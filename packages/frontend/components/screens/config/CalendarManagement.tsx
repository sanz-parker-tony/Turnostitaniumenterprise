'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';

interface OptionItem {
  id: string;
  company_id?: string | null;
  company_name?: string | null;
  company_code?: string | null;
  work_location_name?: string | null;
  work_location_code?: string | null;
  lookup_key?: string | null;
  lookup_label?: string | null;
  lookup_short_label?: string | null;
  icon_key?: string | null;
  icon_glyph?: string | null;
  icon_color?: string | null;
  sort_order?: number | null;
}

interface HolidayItem {
  id: string;
  tenant_id: string;
  company_id: string;
  country_id: string | null;
  state_id: string | null;
  city_id: string | null;
  work_location_id: string | null;
  holiday_type_id?: string | null;
  holiday_type_key?: string | null;
  holiday_type_label?: string | null;
  holiday_type_icon_key?: string | null;
  holiday_type_icon_glyph?: string | null;
  holiday_type_icon_color?: string | null;
  holiday_date: string;
  holiday_name: string;
  is_recurring: boolean;
  is_paid: boolean;
  is_working_day: boolean;
  is_active: boolean;
}

interface CalendarCatalogsResponse {
  catalogs: {
    companies: OptionItem[];
    work_locations: OptionItem[];
    countries: OptionItem[];
    states: OptionItem[];
    cities: OptionItem[];
    holiday_types: OptionItem[];
  };
}

interface CalendarItemsResponse {
  items: HolidayItem[];
}

type HolidayScope = 'national' | 'state' | 'city' | 'general';

type HolidayFormData = {
  company_id: string;
  country_id: string;
  state_id: string;
  city_id: string;
  work_location_id: string;
  holiday_type_id: string;
  holiday_date: string;
  holiday_name: string;
  is_recurring: boolean;
  is_paid: boolean;
  is_working_day: boolean;
  is_active: boolean;
};

function getToken() {
  return localStorage.getItem('tt-access-token') || publicApiToken;
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function toDateOnly(value: string | null | undefined): string {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getWeekdayOffsetMondayFirst(year: number, month: number) {
  const sundayFirst = new Date(year, month - 1, 1).getDay(); // 0..6 (Sun..Sat)
  return (sundayFirst + 6) % 7; // 0..6 (Mon..Sun)
}

function getScopeLabel(form: HolidayFormData) {
  if (normalizeNullableId(form.city_id)) return 'Local (ciudad)';
  if (normalizeNullableId(form.state_id)) return 'Provincial/Estatal';
  if (normalizeNullableId(form.country_id)) return 'Nacional';
  return 'General por empresa/localizacion';
}

function optionLabel(option: OptionItem) {
  return (
    option.lookup_label ||
    option.company_name ||
    option.work_location_name ||
    option.lookup_key ||
    option.id
  );
}

function toBoolean(value: any) {
  return value === true || value === 'true';
}

function normalizeNullableId(value: string | null | undefined): string | null {
  const raw = String(value || '').trim();
  if (!raw || raw === '0' || raw.toLowerCase() === 'null' || raw.toLowerCase() === 'undefined') {
    return null;
  }
  return raw;
}

function resolveValidId(
  value: string | null | undefined,
  options: OptionItem[]
): string | null {
  const normalized = normalizeNullableId(value);
  if (!normalized) return null;
  return options.some((option) => option.id === normalized) ? normalized : null;
}

function getHolidayScope(item: HolidayItem): HolidayScope {
  if (normalizeNullableId(item.city_id)) return 'city';
  if (normalizeNullableId(item.state_id)) return 'state';
  if (normalizeNullableId(item.country_id)) return 'national';
  return 'general';
}

function getHolidayScopeChipClass(item: HolidayItem): string {
  const scope = getHolidayScope(item);
  if (scope === 'national') return 'bg-blue-100 border-blue-300 text-blue-900';
  if (scope === 'state') return 'bg-green-100 border-green-300 text-green-900';
  if (scope === 'city') return 'bg-yellow-100 border-yellow-300 text-yellow-900';
  return 'bg-gray-100 border-gray-300 text-gray-800';
}

const WEEK_DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

export function CalendarManagement() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [companies, setCompanies] = useState<OptionItem[]>([]);
  const [workLocations, setWorkLocations] = useState<OptionItem[]>([]);
  const [countries, setCountries] = useState<OptionItem[]>([]);
  const [states, setStates] = useState<OptionItem[]>([]);
  const [cities, setCities] = useState<OptionItem[]>([]);
  const [holidayTypes, setHolidayTypes] = useState<OptionItem[]>([]);

  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedWorkLocationId, setSelectedWorkLocationId] = useState('');
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');

  const [holidays, setHolidays] = useState<HolidayItem[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<HolidayFormData>({
    company_id: '',
    country_id: '',
    state_id: '',
    city_id: '',
    work_location_id: '',
    holiday_type_id: '',
    holiday_date: '',
    holiday_name: '',
    is_recurring: false,
    is_paid: true,
    is_working_day: false,
    is_active: true,
  });

  const request = async (path: string, init?: RequestInit) => {
    const response = await fetch(`http://localhost:3001${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
        ...(init?.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || `HTTP ${response.status}`);
    }
    return payload;
  };

  const loadLocationCatalogs = async (countryId?: string, stateId?: string) => {
    const params = new URLSearchParams();
    if (countryId) params.set('country_id', countryId);
    if (stateId) params.set('state_id', stateId);
    const suffix = params.toString() ? `?${params.toString()}` : '';

    const payload = (await request(
      `/organization/holidays/location-catalogs${suffix}`
    )) as CalendarCatalogsResponse;

    setCompanies(payload.catalogs?.companies || []);
    setWorkLocations(payload.catalogs?.work_locations || []);
    setCountries(payload.catalogs?.countries || []);
    setStates(payload.catalogs?.states || []);
    setCities(payload.catalogs?.cities || []);
    setHolidayTypes(payload.catalogs?.holiday_types || []);
  };

  const loadMonth = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
      });
      if (selectedCompanyId) params.set('company_id', selectedCompanyId);
      if (selectedWorkLocationId) params.set('work_location_id', selectedWorkLocationId);
      const scopedCountry = normalizeNullableId(selectedCountryId);
      const scopedState = normalizeNullableId(selectedStateId);
      const scopedCity = normalizeNullableId(selectedCityId);
      if (scopedCountry) params.set('country_id', scopedCountry);
      if (scopedState) params.set('state_id', scopedState);
      if (scopedCity) params.set('city_id', scopedCity);

      const payload = (await request(
        `/organization/holidays/calendar?${params.toString()}`
      )) as CalendarItemsResponse;
      setHolidays(payload.items || []);
    } catch (err: any) {
      setError(err.message || 'Error cargando calendario');
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        await loadLocationCatalogs();
      } catch (err: any) {
        setError(err.message || 'Error cargando catalogos');
      }
    })();
  }, []);

  useEffect(() => {
    void loadMonth();
  }, [year, month, selectedCompanyId, selectedWorkLocationId, selectedCountryId, selectedStateId, selectedCityId]);

  const locationFilteredWorkLocations = useMemo(() => {
    if (!selectedCompanyId) return workLocations;
    return workLocations.filter((wl) => wl.company_id === selectedCompanyId);
  }, [workLocations, selectedCompanyId]);

  const holidayTypeById = useMemo(() => {
    const map = new Map<string, OptionItem>();
    holidayTypes.forEach((item) => {
      if (item?.id) map.set(item.id, item);
    });
    return map;
  }, [holidayTypes]);

  const resolveTypeFromHoliday = (item: HolidayItem): OptionItem | null =>
    holidayTypeById.get(String(item.holiday_type_id || '')) || null;

  const defaultHolidayTypeId = useMemo(() => {
    return holidayTypes[0]?.id || '';
  }, [holidayTypes]);

  const holidaysByDate = useMemo(() => {
    const grouped: Record<string, HolidayItem[]> = {};
    holidays.forEach((holiday) => {
      const dateOnly = toDateOnly(holiday.holiday_date);
      if (!dateOnly) return;
      if (!grouped[dateOnly]) grouped[dateOnly] = [];
      grouped[dateOnly].push({
        ...holiday,
        holiday_date: dateOnly,
        holiday_type_icon_key:
          holiday.holiday_type_icon_key ||
          holidayTypeById.get(String(holiday.holiday_type_id || ''))?.icon_key ||
          null,
        holiday_type_icon_glyph:
          holiday.holiday_type_icon_glyph ||
          holidayTypeById.get(String(holiday.holiday_type_id || ''))?.icon_glyph ||
          null,
        holiday_type_icon_color:
          holiday.holiday_type_icon_color ||
          holidayTypeById.get(String(holiday.holiday_type_id || ''))?.icon_color ||
          null,
        holiday_type_label:
          holiday.holiday_type_label ||
          holidayTypeById.get(String(holiday.holiday_type_id || ''))?.lookup_label ||
          null,
      });
    });
    return grouped;
  }, [holidays, holidayTypeById]);

  const dayRecords = selectedDate ? holidaysByDate[selectedDate] || [] : [];

  const resetFormForDate = (dateKey: string) => {
    setEditingId(null);
    setFormData({
      company_id: selectedCompanyId || '',
      country_id: selectedCountryId || '',
      state_id: selectedStateId || '',
      city_id: selectedCityId || '',
      work_location_id: selectedWorkLocationId || '',
      holiday_date: dateKey,
      holiday_name: '',
      holiday_type_id: defaultHolidayTypeId,
      is_recurring: false,
      is_paid: true,
      is_working_day: false,
      is_active: true,
    });
  };

  const fillFormFromHoliday = (holiday: HolidayItem) => {
    setEditingId(holiday.id);
    const holidayDateOnly = toDateOnly(holiday.holiday_date);
    setFormData({
      company_id: holiday.company_id || '',
      country_id: holiday.country_id || '',
      state_id: holiday.state_id || '',
      city_id: holiday.city_id || '',
      work_location_id: holiday.work_location_id || '',
      holiday_type_id: holiday.holiday_type_id || '',
      holiday_date: holidayDateOnly || holiday.holiday_date,
      holiday_name: holiday.holiday_name,
      is_recurring: toBoolean(holiday.is_recurring),
      is_paid: toBoolean(holiday.is_paid),
      is_working_day: toBoolean(holiday.is_working_day),
      is_active: toBoolean(holiday.is_active),
    });
  };

  const openAddModalForDay = (day: number) => {
    const dateKey = toDateKey(year, month, day);
    setSelectedDate(dateKey);
    resetFormForDate(dateKey);
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModalForHoliday = (holiday: HolidayItem) => {
    setSelectedDate(toDateOnly(holiday.holiday_date) || holiday.holiday_date);
    fillFormFromHoliday(holiday);
    setModalError(null);
    setModalOpen(true);
  };

  const changeCountry = async (countryId: string) => {
    setFormData((prev) => ({
      ...prev,
      country_id: countryId,
      state_id: '',
      city_id: '',
    }));
    await loadLocationCatalogs(countryId, '');
  };

  const changeState = async (stateId: string) => {
    setFormData((prev) => ({
      ...prev,
      state_id: stateId,
      city_id: '',
    }));
    await loadLocationCatalogs(formData.country_id, stateId);
  };

  const handleSave = async () => {
    setSaving(true);
    setModalError(null);
    try {
      if (!formData.company_id) throw new Error('Empresa es obligatoria');
      if (!formData.holiday_date) throw new Error('Fecha es obligatoria');
      if (!formData.holiday_name.trim()) throw new Error('Nombre de feriado es obligatorio');
      if (!normalizeNullableId(formData.holiday_type_id)) {
        throw new Error('Tipo de feriado es obligatorio');
      }
      if (!holidayTypeById.has(String(formData.holiday_type_id))) {
        throw new Error('Tipo de feriado invalido o inactivo');
      }

      const countryId = resolveValidId(formData.country_id, countries);
      const stateId = resolveValidId(formData.state_id, states);
      const cityId = resolveValidId(formData.city_id, cities);

      const payload = {
        ...formData,
        country_id: countryId,
        state_id: stateId,
        city_id: cityId,
        work_location_id: normalizeNullableId(formData.work_location_id),
        holiday_type_id: normalizeNullableId(formData.holiday_type_id),
      };

      if (editingId) {
        await request(`/organization/holidays/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await request('/organization/holidays', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      await loadMonth();
      setModalOpen(false);
      setModalError(null);
    } catch (err: any) {
      setModalError(err.message || 'Error guardando feriado');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    const confirmed = window.confirm('Esta accion eliminara el feriado. Desea continuar?');
    if (!confirmed) return;

    setSaving(true);
    setModalError(null);
    try {
      await request(`/organization/holidays/${editingId}`, {
        method: 'DELETE',
      });
      await loadMonth();
      setModalOpen(false);
      setModalError(null);
    } catch (err: any) {
      setModalError(err.message || 'Error eliminando feriado');
    } finally {
      setSaving(false);
    }
  };

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((prev) => prev - 1);
      return;
    }
    setMonth((prev) => prev - 1);
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((prev) => prev + 1);
      return;
    }
    setMonth((prev) => prev + 1);
  };

  const monthTitle = new Date(year, month - 1, 1).toLocaleDateString('es-EC', {
    month: 'long',
    year: 'numeric',
  });

  const daysInMonth = getDaysInMonth(year, month);
  const firstOffset = getWeekdayOffsetMondayFirst(year, month);
  const calendarCells = [
    ...Array.from({ length: firstOffset }).map(() => null as number | null),
    ...Array.from({ length: daysInMonth }).map((_, idx) => idx + 1),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion de Calendarios</h1>
          <p className="text-muted-foreground mt-1">
            Clic en un feriado para editarlo o en un espacio libre del dia para agregar uno nuevo
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-700">
            <span className="font-semibold">Alcance:</span>
            <span className="inline-flex items-center rounded border border-blue-300 bg-blue-100 px-2 py-0.5 text-blue-900">
              Nacional
            </span>
            <span className="inline-flex items-center rounded border border-green-300 bg-green-100 px-2 py-0.5 text-green-900">
              Provincia/Estado
            </span>
            <span className="inline-flex items-center rounded border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-yellow-900">
              Ciudad
            </span>
          </div>
          <button
            onClick={() => void loadMonth()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
          >
            <RefreshCw className="size-4" />
            Recargar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="rounded-lg border bg-white p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-700">Empresa</label>
            <select
              value={selectedCompanyId}
              onChange={(event) => {
                setSelectedCompanyId(event.target.value);
                setSelectedWorkLocationId('');
              }}
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              <option value="">-- Todas --</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {optionLabel(company)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Localizacion</label>
            <select
              value={selectedWorkLocationId}
              onChange={(event) => setSelectedWorkLocationId(event.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              <option value="">-- Todas --</option>
              {locationFilteredWorkLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {optionLabel(location)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Pais</label>
            <select
              value={selectedCountryId}
              onChange={(event) => {
                const nextCountry = event.target.value;
                setSelectedCountryId(nextCountry);
                setSelectedStateId('');
                setSelectedCityId('');
                void loadLocationCatalogs(nextCountry, '');
              }}
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              <option value="">-- Todos --</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {optionLabel(country)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Provincia/Estado</label>
            <select
              value={selectedStateId}
              onChange={(event) => {
                const nextState = event.target.value;
                setSelectedStateId(nextState);
                setSelectedCityId('');
                void loadLocationCatalogs(selectedCountryId, nextState);
              }}
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              <option value="">-- Todas --</option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {optionLabel(state)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Ciudad</label>
            <select
              value={selectedCityId}
              onChange={(event) => setSelectedCityId(event.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              <option value="">-- Todas --</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {optionLabel(city)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="inline-flex items-center justify-center p-2 rounded border hover:bg-gray-50"
            title="Mes anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <h2 className="text-lg font-semibold capitalize">{monthTitle}</h2>
          <button
            onClick={nextMonth}
            className="inline-flex items-center justify-center p-2 rounded border hover:bg-gray-50"
            title="Mes siguiente"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
              {day}
            </div>
          ))}
        </div>
        {loading ? (
          <div className="py-10 text-center text-gray-500">Cargando calendario...</div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="h-24 rounded-md border border-transparent bg-transparent"
                  />
                );
              }

              const dateKey = toDateKey(year, month, day);
              const dayItems = holidaysByDate[dateKey] || [];
              const hasHoliday = dayItems.length > 0;
              const firstItem = dayItems[0];
              const firstType = firstItem ? resolveTypeFromHoliday(firstItem) : null;
              const primaryTypeGlyph =
                firstItem?.holiday_type_icon_glyph ||
                firstType?.icon_glyph ||
                '';
              const headerTypePreview = dayItems.slice(0, 3);

              return (
                <div
                  key={dateKey}
                  onClick={() => openAddModalForDay(day)}
                  className={`h-32 rounded-md border p-2 text-left transition ${
                    hasHoliday
                      ? 'border-blue-400 bg-blue-50 hover:bg-blue-100'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-800">
                      <span>{day}</span>
                      {headerTypePreview.map((item) => {
                        const previewType = resolveTypeFromHoliday(item);
                        const previewGlyph = item.holiday_type_icon_glyph || previewType?.icon_glyph || '';
                        return (
                          <span key={`g-${item.id}`} className="text-[10px] leading-none">
                            {previewGlyph}
                          </span>
                        );
                      })}
                      {!headerTypePreview.length && hasHoliday && primaryTypeGlyph ? (
                        <span className="text-xs leading-none">{primaryTypeGlyph}</span>
                      ) : null}
                    </span>
                    {hasHoliday && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-blue-600 text-white text-[10px]">
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 space-y-1 overflow-y-auto max-h-20 pr-0.5">
                    {dayItems.map((item) => {
                      const holidayText =
                        String(item.holiday_name || '').trim() || '(Sin nombre)';
                      const itemType = resolveTypeFromHoliday(item);
                      const itemGlyph = item.holiday_type_icon_glyph || itemType?.icon_glyph || '';
                      return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModalForHoliday(item);
                        }}
                        className={`w-full text-left text-[11px] truncate rounded border px-1.5 py-0.5 ${getHolidayScopeChipClass(item)} hover:brightness-95`}
                        title={`Editar: ${holidayText}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {itemGlyph ? <span className="text-xs leading-none">{itemGlyph}</span> : null}
                          <span className="truncate">{holidayText}</span>
                        </span>
                      </button>
                    )})}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setModalOpen(false);
              setModalError(null);
            }}
          />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg border bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <div className="flex items-center">
                <h3 className="text-base font-semibold">
                  {editingId ? 'Editar feriado' : 'Nuevo feriado'} - {selectedDate}
                </h3>
              </div>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setModalError(null);
                }}
                className="p-1.5 rounded hover:bg-gray-200"
                title="Cerrar"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
              {modalError && (
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {modalError}
                </div>
              )}
              <div className="rounded-md border bg-white p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-700">Registros del dia</div>
                  <button
                    onClick={() => resetFormForDate(selectedDate)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs hover:bg-gray-100"
                  >
                    <Plus className="size-3" />
                    Nuevo en esta fecha
                  </button>
                </div>
                {dayRecords.length === 0 ? (
                  <div className="text-xs text-gray-500">
                    No hay feriados registrados para esta fecha. Completa el formulario para crear el primero.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {dayRecords.map((row) => (
                      (() => {
                        const rowType = holidayTypeById.get(String(row.holiday_type_id || '')) || null;
                        const rowGlyph = String(
                          row.holiday_type_icon_glyph || rowType?.icon_glyph || ''
                        ).trim();
                        return (
                      <div
                        key={row.id}
                        className={`flex items-center justify-between rounded border px-2 py-1.5 ${
                          editingId === row.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="inline-flex items-center gap-1.5 text-xs text-gray-700 truncate pr-2">
                          {rowGlyph ? <span className="text-sm leading-none">{rowGlyph}</span> : null}
                          <span className="truncate">{row.holiday_name}</span>
                        </div>
                        <button
                          onClick={() => fillFormFromHoliday(row)}
                          className="inline-flex items-center justify-center p-1.5 rounded border hover:bg-gray-100"
                          title="Editar registro"
                        >
                          <Pencil className="size-3" />
                        </button>
                      </div>
                        );
                      })()
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Empresa *</label>
                  <select
                    value={formData.company_id}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, company_id: event.target.value }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">-- Seleccionar --</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {optionLabel(company)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Fecha *</label>
                  <input
                    type="date"
                    value={formData.holiday_date}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, holiday_date: event.target.value }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Nombre feriado *</label>
                  <input
                    value={formData.holiday_name}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, holiday_name: event.target.value }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-sm"
                    placeholder="Ej: Independencia, Carnaval..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Tipo de feriado</label>
                  <select
                    value={formData.holiday_type_id}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, holiday_type_id: event.target.value }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">-- Seleccionar --</option>
                    {holidayTypes.map((holidayType) => (
                      <option key={holidayType.id} value={holidayType.id}>
                        {`${holidayType.icon_glyph || ''} ${holidayType.lookup_label || holidayType.lookup_key || holidayType.id}`.trim()}
                      </option>
                    ))}
                  </select>
                  {formData.holiday_type_id && !holidayTypeById.has(formData.holiday_type_id) ? (
                    <div className="text-[11px] text-amber-700">El tipo seleccionado ya no esta activo. Elige otro tipo.</div>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Pais</label>
                  <select
                    value={formData.country_id}
                    onChange={(event) => void changeCountry(event.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">-- No aplica --</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {optionLabel(country)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Provincia/Estado</label>
                  <select
                    value={formData.state_id}
                    onChange={(event) => void changeState(event.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">-- No aplica --</option>
                    {states.map((state) => (
                      <option key={state.id} value={state.id}>
                        {optionLabel(state)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Ciudad</label>
                  <select
                    value={formData.city_id}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, city_id: event.target.value }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">-- No aplica --</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {optionLabel(city)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2 lg:col-span-3">
                  <label className="text-xs font-medium text-gray-700">Localizacion de trabajo</label>
                  <select
                    value={formData.work_location_id}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, work_location_id: event.target.value }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">-- No aplica --</option>
                    {locationFilteredWorkLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {optionLabel(location)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Recurrente anual</label>
                  <select
                    value={String(formData.is_recurring)}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, is_recurring: event.target.value === 'true' }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="false">false</option>
                    <option value="true">true</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Feriado pagado</label>
                  <select
                    value={String(formData.is_paid)}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, is_paid: event.target.value === 'true' }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Es dia laborable</label>
                  <select
                    value={String(formData.is_working_day)}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_working_day: event.target.value === 'true',
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="false">false</option>
                    <option value="true">true</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Activo</label>
                  <select
                    value={String(formData.is_active)}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, is_active: event.target.value === 'true' }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </div>
              </div>

              <div className="rounded-md border bg-white px-3 py-2 text-xs text-gray-700 inline-flex items-center gap-2">
                <MapPin className="size-3.5 text-blue-700" />
                Alcance detectado: <strong>{getScopeLabel(formData)}</strong>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t bg-white">
              <div>
                {editingId && (
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-300 text-red-700 text-sm hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                    Eliminar
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setModalError(null);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-gray-100"
                >
                  <X className="size-4" />
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Save className="size-4" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
