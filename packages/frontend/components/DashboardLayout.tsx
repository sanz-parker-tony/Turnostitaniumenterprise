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
  const roleKey = String(profile?.role_key || '').trim().toUpperCase();
  const isEmployee = roleKey === 'EMPLOYEE';
  const isTenantAdmin = roleKey === 'TENANT_ADMIN';

  return (
    <SidebarProvider>
      <div className="flex w-full h-screen">
        <AppSidebar />
        <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-auto">
          <AppHeader />
          <div className={`flex flex-1 flex-col ${isEmployee ? 'p-2 sm:p-4' : 'p-4'}`}>
            <div className={`flex-1 rounded-xl bg-muted/50 ${isEmployee ? 'p-2 sm:p-4' : 'p-4'}`}>
              {/* Si no se pasan children, usar el Router dinámico */}
              {children || <Router />}
            </div>
            {isTenantAdmin ? (
              <footer className="shrink-0 pt-3 text-center text-sm text-muted-foreground">
                Titanium Labs Corp.™ 2026 © | Todos los derechos reservados
              </footer>
            ) : null}
          </div>
        </SidebarInset>
      </div>
      {/* Herramienta de debugging del menú */}
      {!isEmployee ? <MenuDebugger /> : null}
    </SidebarProvider>
  );
}
