'use client';

/**
 * /org/wizard - Pagina del Asistente de Configuracion Organizacional
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import OrganizationWizard from '../../../components/wizards/OrganizationWizard';

export default function OrganizationWizardPage() {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(true);

  const handleComplete = () => {
    toast.success('Configuracion organizacional completada exitosamente');
    router.push('/org/companies');
  };

  const handleClose = () => {
    setShowWizard(false);
    router.back();
  };

  if (!showWizard) {
    return null;
  }

  return (
    <OrganizationWizard
      onClose={handleClose}
      onComplete={handleComplete}
    />
  );
}
