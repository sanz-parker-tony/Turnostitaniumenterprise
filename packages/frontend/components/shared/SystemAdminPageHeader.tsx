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
    <div className="flex items-start justify-between gap-2 rounded-xl border bg-white px-3 py-4 sm:gap-4 sm:px-5">
      <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2ECC71]/10 sm:h-11 sm:w-11">
          <Icon className="h-5 w-5 text-[#2ECC71]" />
        </div>
        <div className="min-w-0">
          <h1 className="break-words text-xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">{resolvedTitle}</h1>
          <p className="mt-1 break-words text-xs text-gray-500 sm:text-sm">{resolvedSubtitle}</p>
        </div>
      </div>
      {rightSlot ? <div className="flex shrink-0 items-start gap-2 [&_button]:h-11 [&_button]:min-h-11">{rightSlot}</div> : null}
    </div>
  );
}


