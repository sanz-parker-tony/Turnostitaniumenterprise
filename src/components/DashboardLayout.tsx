/**
 * DashboardLayout - Layout principal con sidebar y header
 * El sidebar NO tiene scroll interno - el scroll es de toda la página
 */

'use client';

import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { MenuDebugger } from './MenuDebugger';
import { SidebarInset, SidebarProvider } from './ui/sidebar';
import { Router } from './Router';

interface DashboardLayoutProps {
  children?: ReactNode; // Opcional ahora
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex w-full h-screen">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-auto">
          <AppHeader />
          <div className="flex-1 p-4">
            <div className="rounded-xl bg-muted/50 p-4 min-h-full">
              {/* Si no se pasan children, usar el Router dinámico */}
              {children || <Router />}
            </div>
          </div>
        </SidebarInset>
      </div>
      {/* Herramienta de debugging del menú */}
      <MenuDebugger />
    </SidebarProvider>
  );
}