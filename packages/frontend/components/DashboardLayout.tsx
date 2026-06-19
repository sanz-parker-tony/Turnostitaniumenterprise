/**
 * DashboardLayout - Layout principal con sidebar y header
 * El sidebar NO tiene scroll interno - el scroll es de toda la página
 */

'use client';

import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { MenuDebugger } from './MenuDebugger';
import { SidebarInset, SidebarProvider } from './ui/sidebar';
import { Router } from './Router';

interface DashboardLayoutProps {
  children?: ReactNode; // Opcional ahora
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile } = useAuth();
  const isEmployee = String(profile?.role_key || '').trim().toUpperCase() === 'EMPLOYEE';

  return (
    <SidebarProvider>
      <div className="flex w-full h-screen">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-auto">
          <AppHeader />
          <div className={`flex-1 ${isEmployee ? 'p-2 sm:p-4' : 'p-4'}`}>
            <div className={`rounded-xl bg-muted/50 min-h-full ${isEmployee ? 'p-2 sm:p-4' : 'p-4'}`}>
              {/* Si no se pasan children, usar el Router dinámico */}
              {children || <Router />}
            </div>
          </div>
        </SidebarInset>
      </div>
      {/* Herramienta de debugging del menú */}
      {!isEmployee ? <MenuDebugger /> : null}
    </SidebarProvider>
  );
}
