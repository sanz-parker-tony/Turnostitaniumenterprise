/**
 * Dashboard Layout - Wrapper con sidebar dinámico
 * Usa LayoutNewAppRouter para sidebar 100% dinámico
 */

import type { ReactNode } from 'react';
import LayoutNew from '@/components/LayoutNewAppRouter';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <LayoutNew>{children}</LayoutNew>;
}
