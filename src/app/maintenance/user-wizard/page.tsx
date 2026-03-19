'use client';

/**
 * /maintenance/user-wizard - Página del Asistente de Usuarios
 * Screen: MAINT_USER_WIZARD
 * Ejecuta: TENANT_ADMIN
 */

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function UserWizardPage() {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(true);

  const handleComplete = () => {
    toast.success('Usuario creado exitosamente con todos sus permisos');
    router.push('/dashboard'); // O a la pantalla de usuarios
  };

  const handleClose = () => {
    router.back();
  };

  if (!showWizard) {
    return null;
  }

  return (
    <UserWizard 
      onClose={handleClose}
      onComplete={handleComplete}
    />
  );
}