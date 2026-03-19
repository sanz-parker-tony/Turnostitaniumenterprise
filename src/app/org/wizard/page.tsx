'use client';

/**
 * /org/wizard - Página del Asistente de Configuración Organizacional
 * Screen: ORG_WIZARD
 * Ejecuta: TENANT_ADMIN
 */

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function OrganizationWizardPage() {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(true);

  const handleComplete = () => {
    toast.success('Configuración organizacional completada exitosamente');
    router.push('/org/companies');
  };

  const handleClose = () => {
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