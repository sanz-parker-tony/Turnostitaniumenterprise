'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionsContext';

type Props = {
  icon: LucideIcon;
  title?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
};

export default function SystemAdminPageHeader({ icon: Icon, title, subtitle, rightSlot }: Props) {
  const { getScreenByPath } = usePermissions();
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updatePath = () => setCurrentPath(window.location.pathname);
    updatePath();
    window.addEventListener('popstate', updatePath);
    return () => window.removeEventListener('popstate', updatePath);
  }, []);

  const currentScreen = useMemo(() => getScreenByPath(currentPath), [getScreenByPath, currentPath]);
  const resolvedTitle = currentScreen?.screen_name || title || '';
  const resolvedSubtitle =
    subtitle || (currentScreen ? `${currentScreen.menu_group_name} · ${currentScreen.menu_label}` : '');

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border bg-white px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2ECC71]/10">
          <Icon className="h-5 w-5 text-[#2ECC71]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{resolvedTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">{resolvedSubtitle}</p>
        </div>
      </div>
      {rightSlot ? <div className="flex items-center gap-2 [&_button]:h-11 [&_button]:min-h-11">{rightSlot}</div> : null}
    </div>
  );
}


