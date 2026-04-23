/**
 * LayoutNewAppRouter.tsx
 * Layout para App Router de Next.js
 * Wrapper simple que permite contenido personalizado
 */

'use client';

import { ReactNode } from 'react';

interface LayoutNewAppRouterProps {
  children: ReactNode;
}

export default function LayoutNewAppRouter({ children }: LayoutNewAppRouterProps) {
  // Este es un layout simple que solo renderiza los children
  // El layout principal ya está definido en /app/dashboard/layout.tsx
  return <>{children}</>;
}
