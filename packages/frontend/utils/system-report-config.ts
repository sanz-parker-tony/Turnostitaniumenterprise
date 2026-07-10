import { buildApiUrl } from './api-config';

export interface ReportDefinition {
  code: string;
  name: string;
}

export interface SystemReportMeta {
  id: string;
  report_code: string;
  report_name: string;
  report_description?: string | null;
  report_handler?: string | null;
  is_active?: boolean;
}

export interface SystemReportParameter {
  id: string;
  parameter_key: string;
  parameter_label: string;
  parameter_description?: string | null;
  is_required: boolean;
  default_value?: string | null;
  is_multi_value: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface SystemReportConfig {
  definition: ReportDefinition;
  report: SystemReportMeta | null;
  parameters: SystemReportParameter[];
  loaded: boolean;
}

export function defaultSystemReportConfig(definition: ReportDefinition): SystemReportConfig {
  return {
    definition,
    report: null,
    parameters: [],
    loaded: false,
  };
}

export async function fetchSystemReportConfig(
  definition: ReportDefinition,
  token: string
): Promise<SystemReportConfig> {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const reportsResponse = await fetch(buildApiUrl('/system-reports'), { headers });
  const reportsPayload = await reportsResponse.json().catch(() => ({}));
  if (!reportsResponse.ok) {
    throw new Error(reportsPayload?.error || `HTTP ${reportsResponse.status}`);
  }

  const report = ((reportsPayload?.reports || []) as SystemReportMeta[])
    .find((item) => item.report_code === definition.code && item.is_active !== false) || null;

  if (!report?.id) {
    return {
      ...defaultSystemReportConfig(definition),
      loaded: true,
    };
  }

  const parametersResponse = await fetch(buildApiUrl(`/system-reports/${report.id}/parameters`), { headers });
  const parametersPayload = await parametersResponse.json().catch(() => ({}));
  if (!parametersResponse.ok) {
    throw new Error(parametersPayload?.error || `HTTP ${parametersResponse.status}`);
  }

  const parameters = ((parametersPayload?.parameters || []) as SystemReportParameter[])
    .filter((parameter) => parameter.is_active !== false)
    .sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0));

  return {
    definition,
    report,
    parameters,
    loaded: true,
  };
}

export function getSystemReportName(config: SystemReportConfig): string {
  return config.report?.report_name || config.definition.name;
}

export function getReportParameter(config: SystemReportConfig, key: string): SystemReportParameter | null {
  return config.parameters.find((parameter) => parameter.parameter_key === key) || null;
}

export function isReportParameterEnabled(config: SystemReportConfig, key: string): boolean {
  if (!config.loaded || config.parameters.length === 0) return true;
  return Boolean(getReportParameter(config, key));
}

export function getReportParameterLabel(config: SystemReportConfig, key: string, fallback: string): string {
  return getReportParameter(config, key)?.parameter_label || fallback;
}
