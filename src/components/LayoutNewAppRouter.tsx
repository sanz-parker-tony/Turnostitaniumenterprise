/**
 * LayoutNew - App Router Compatible
 * Layout principal con sidebar dinámico basado en permisos
 * 
 * ✅ SIDEBAR 100% DINÁMICO DESDE BD
 * ✅ TRANSLATIONS EN ESPAÑOL
 * ✅ SIN HARDCODES
 */

'use client';

import { useState, useEffect, useMemo, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getIconComponent } from '@/utils/iconMapper';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Menu, Search, Bell, User, LogOut, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { Toaster } from 'sonner@2.0.3';
import logoTurnos from 'figma:asset/17ccf6801f7c83b8bea74fbd52400e5b6ac4d64a.png';
import { getSidebarDataFromRPC, SidebarGroup } from '@/lib/menu/getSidebarData';

interface LayoutNewProps {
  children: ReactNode;
}

export default function LayoutNew({ children }: LayoutNewProps) {
  const { user, profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [unreadCount] = useState(3);
  const [menuItems, setMenuItems] = useState<SidebarGroup[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  // Mock notifications
  const mockNotifications = [
    { id: 1, message: 'Nueva solicitud de permiso pendiente', time: 'Hace 5 min', type: 'warning', unread: true },
    { id: 2, message: 'Proceso de asistencia completado', time: 'Hace 1 hora', type: 'success', unread: true },
    { id: 3, message: 'Recordatorio: Revisar anomalías', time: 'Hace 2 horas', type: 'info', unread: false },
  ];

  // Cargar sidebar dinámicamente
  useEffect(() => {
    async function loadSidebar() {
      if (!user) {
        console.log('[SIDEBAR] Usuario no autenticado, skip loading');
        setIsLoadingMenu(false);
        return;
      }

      console.log('[SIDEBAR] Cargando datos del sidebar...');
      setIsLoadingMenu(true);

      try {
        const sidebarData = await getSidebarDataFromRPC();
        console.log('[SIDEBAR] Datos cargados:', sidebarData.length, 'grupos');
        setMenuItems(sidebarData);
      } catch (err) {
        console.error('[SIDEBAR] Error cargando sidebar:', err);
        setMenuItems([]);
      } finally {
        setIsLoadingMenu(false);
      }
    }

    loadSidebar();
  }, [user]);

  // Auto-expand grupo que contiene ruta actual
  useEffect(() => {
    if (menuItems.length > 0 && pathname) {
      for (const group of menuItems) {
        const hasActiveScreen = group.screens.some(s => s.routePath === pathname);
        if (hasActiveScreen && !expandedGroups.includes(group.groupKey)) {
          setExpandedGroups(prev => [...prev, group.groupKey]);
          break;
        }
      }
    }
  }, [pathname, menuItems]);

  const handleGroupClick = (groupKey: string) => {
    if (expandedGroups.includes(groupKey)) {
      setExpandedGroups(expandedGroups.filter(k => k !== groupKey));
    } else {
      setExpandedGroups([...expandedGroups, groupKey]);
    }
  };

  // Sin permisos
  if (menuItems.length === 0 && !isLoadingMenu) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sin Permisos Asignados</h2>
          <p className="text-gray-600 mb-6">
            Tu usuario no tiene permisos configurados. Contacta al administrador del sistema.
          </p>
          <Button onClick={signOut}>Cerrar Sesión</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" richColors />

      {/* Top Bar - Fixed */}
      <div className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-40 shadow-sm">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img src={logoTurnos} alt="Turnos Titanium Logo" className="w-10 h-10 rounded-xl shadow-md" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Turnos Titanium</h1>
                <p className="text-xs text-gray-600">Sistema de Control de Asistencias</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Global Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar empleado, turno..."
                className="pl-10 w-80 bg-gray-50 border-gray-300"
              />
            </div>

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-gray-100">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 px-1.5 min-w-5 h-5 bg-red-600 border-2 border-white">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-semibold">Notificaciones</h3>
                  <p className="text-xs text-gray-600 mt-0.5">{unreadCount} sin leer</p>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {mockNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-gray-200 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                        notif.unread ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          notif.type === 'warning' ? 'bg-yellow-500' :
                          notif.type === 'success' ? 'bg-green-600' :
                          'bg-blue-600'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{notif.message}</p>
                          <p className="text-xs text-gray-600 mt-1">{notif.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* User Menu */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 hover:bg-gray-100">
                  <div className="w-8 h-8 rounded-full bg-[#0074D9] flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium hidden md:block">{profile?.full_name || user?.email}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="end">
                <div className="space-y-1">
                  <div className="px-2 py-1.5 text-sm text-gray-900 font-medium">
                    {profile?.full_name || 'Usuario'}
                  </div>
                  <div className="px-2 py-1 text-xs text-gray-600">
                    {user?.email}
                  </div>
                  <div className="border-t border-gray-200 my-1"></div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={signOut}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Sidebar + Content */}
      <div className="flex pt-16">
        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-16 bottom-0 bg-white border-r border-gray-200 transition-all duration-300 overflow-y-auto ${
            sidebarOpen ? 'w-64' : 'w-0'
          }`}
        >
          <nav className="p-4 space-y-1">
            {menuItems.map((group) => {
              const GroupIcon = getIconComponent(group.iconKey);
              const isExpanded = expandedGroups.includes(group.groupKey);

              return (
                <div key={group.groupKey}>
                  {/* Group Header */}
                  <button
                    onClick={() => handleGroupClick(group.groupKey)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <GroupIcon className="w-4 h-4" />
                      <span>{group.groupName}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {/* Screens */}
                  {isExpanded && (
                    <div className="ml-6 mt-1 space-y-0.5">
                      {group.screens.map((screen) => {
                        const ScreenIcon = getIconComponent(screen.iconKey);
                        const isActive = pathname === screen.routePath;

                        return (
                          <Link
                            key={screen.screenKey}
                            href={screen.routePath}
                            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                              isActive
                                ? 'bg-[#0074D9] text-white font-medium'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <ScreenIcon className="w-4 h-4" />
                            <span>{screen.screenName}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main
          className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? 'ml-64' : 'ml-0'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}