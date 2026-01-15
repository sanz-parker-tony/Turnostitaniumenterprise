/**
 * Root Layout - Turnos Titanium
 * Layout principal con AuthProvider
 */

import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Turnos Titanium - Control de Asistencias',
  description: 'Sistema de gestión de turnos y control de asistencias para empresas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <PermissionsProvider>
            {children}
            <Toaster position="top-right" richColors />
          </PermissionsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
