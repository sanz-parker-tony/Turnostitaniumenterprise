/**
 * ShiftManagement - Gestion de Horarios/Turnos
 * Pantalla CONFIG para TENANT_ADMIN
 */

'use client';

import { OrgMaintenance } from '../org/OrgMaintenance';

interface ShiftManagementProps {
  showHeader?: boolean;
}

export function ShiftManagement({ showHeader = true }: ShiftManagementProps) {
  return (
    <OrgMaintenance
      initialEntity="shifts"
      hideEntityTabs
      hideTopHeader={!showHeader}
      pageTitle={showHeader ? 'Gestion de Horarios' : undefined}
      pageDescription={showHeader ? 'Define y administra los horarios de trabajo' : undefined}
    />
  );
}
