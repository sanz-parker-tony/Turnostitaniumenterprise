'use client';

import { type ComponentType, useEffect, useState } from 'react';
import {
  ArrowLeft,
  AtSign,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Loader2,
  MapPin,
  Network,
  Phone,
  UserRound,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { buildApiUrl } from '../../utils/api-config';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

type InfoItem = {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
};

function text(value: unknown): string {
  return String(value || '').trim() || '-';
}

function formatDate(value: unknown): string {
  const raw = String(value || '').slice(0, 10);
  if (!raw) return '-';
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString('es-EC');
}

function InfoGrid({ items }: { items: InfoItem[] }) {
  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex min-w-0 items-center gap-3 rounded-xl border bg-slate-50 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
              <dd className="truncate text-sm font-medium text-slate-900" title={item.value}>{item.value}</dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}

export default function EmployeeProfileDetails() {
  const { session, profile } = useAuth();
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!session?.access_token) return;
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(buildApiUrl('/dashboard/employee-summary'), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'No se pudo cargar la información del empleado');
        if (mounted) setPayload(data);
      } catch (err: any) {
        if (mounted) setError(err?.message || 'No se pudo cargar la información del empleado');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [session?.access_token]);

  const goBack = () => {
    window.history.pushState({}, '', '/dashboard');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const employee = payload?.employee || {};
  const company = payload?.employee_company || {};
  const personalItems: InfoItem[] = [
    { label: 'Nombre', value: text(`${employee.employee_name || ''} ${employee.employee_lastname || ''}`), icon: UserRound },
    { label: 'Código', value: text(employee.employee_code), icon: WalletCards },
    { label: 'Usuario', value: text(employee.user_display_name || profile?.display_name || profile?.email), icon: AtSign },
    { label: 'Teléfono', value: text(employee.phone), icon: Phone },
    { label: 'Fecha de nacimiento', value: formatDate(employee.birth_date), icon: CalendarDays },
    { label: 'Género', value: text(employee.gender_label), icon: UserRound },
  ];
  const companyItems: InfoItem[] = [
    { label: 'Empresa', value: text(company.company_name), icon: Building2 },
    { label: 'Localización', value: text(company.work_location_name), icon: MapPin },
    { label: 'Departamento', value: text(company.department_name), icon: Network },
    { label: 'Área', value: text(company.area_name), icon: Network },
    { label: 'Cargo', value: text(company.job_title_name), icon: BriefcaseBusiness },
    { label: 'Perfil', value: text(company.employee_profile_name), icon: UserRound },
    { label: 'Grupo de trabajo', value: text(company.work_group_name), icon: UsersRound },
    { label: 'Grupo de nómina', value: text(company.payroll_group_name), icon: WalletCards },
    { label: 'Centro de costo', value: text(company.cost_center_name), icon: Building2 },
    { label: 'Fecha de ingreso', value: formatDate(company.hire_date), icon: CalendarDays },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>Más información del empleado</CardTitle>
          <CardDescription>Información personal y datos vigentes de la relación laboral.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:px-6 sm:pb-6">
          {loading ? (
            <div className="flex min-h-52 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
          ) : (
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-2">
                <TabsTrigger value="personal" className="text-xs sm:text-sm">Datos personales</TabsTrigger>
                <TabsTrigger value="company" className="text-xs sm:text-sm">Datos laborales</TabsTrigger>
              </TabsList>
              <TabsContent value="personal" className="mt-3"><InfoGrid items={personalItems} /></TabsContent>
              <TabsContent value="company" className="mt-3"><InfoGrid items={companyItems} /></TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
