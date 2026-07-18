/**
 * DashboardLayout - Layout principal con sidebar y header
 * El sidebar NO tiene scroll interno - el scroll es de toda la pagina
 */

'use client';

import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { SidebarInset, SidebarProvider } from './ui/sidebar';
import { Router } from './Router';

interface DashboardLayoutProps {
  children?: ReactNode; // Opcional ahora
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile } = useAuth();
  const roleKey = String(profile?.role_key || '').trim().toUpperCase();
  const isEmployee = roleKey === 'EMPLOYEE';

  return (
    <SidebarProvider>
      <div className="flex h-svh w-full min-w-0">
        <AppSidebar />
        <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <AppHeader />
          <div className={`flex flex-1 flex-col ${isEmployee ? 'p-2 sm:p-4' : 'p-4'}`}>
            <div className={`flex-1 rounded-xl bg-muted/50 ${isEmployee ? 'p-2 sm:p-4' : 'p-4'}`}>
              {/* Si no se pasan children, usar el Router dinamico */}
              {children || <Router />}
            </div>
            <footer className="shrink-0 px-2 pb-1 pt-3 text-center text-[10px] text-muted-foreground sm:text-sm">
              Titanium Labs Corp.&trade; &middot; &copy; 2026 &middot; Todos los derechos reservados
            </footer>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
