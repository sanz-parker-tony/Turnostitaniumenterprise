/**
 * Config > Work Patterns
 * Gestión de patrones de trabajo
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import { WorkPatternsManagement } from '@/components/screens/config/WorkPatternsManagement';

export default function ConfigWorkPatternsPage() {
  return (
    <ScreenPageShell
      screenKey="CONF_WORK_PATTERNS"
      title="Patrones de Trabajo"
      description="Gestión de patrones y ciclos de trabajo"
    >
      <WorkPatternsManagement />
    </ScreenPageShell>
  );
}

