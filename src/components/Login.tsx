import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Clock, AlertCircle, Loader2, Eye, EyeOff, Database, Shield } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import logoTurnos from 'figma:asset/17ccf6801f7c83b8bea74fbd52400e5b6ac4d64a.png';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRecoverPassword, setShowRecoverPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    console.log('🔐 Intentando login con:', email);

    try {
      // Login con Supabase Auth
      console.log('📡 Llamando a Supabase Auth...');
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      console.log('📡 Respuesta de Supabase:', { data, error: signInError });

      if (signInError) {
        // Manejar errores específicos
        console.error('❌ Error de Supabase:', signInError);
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Email o contraseña incorrectos');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Por favor, confirma tu email antes de iniciar sesión');
        } else {
          setError(signInError.message);
        }
        setIsLoading(false);
        return;
      }

      if (!data.session) {
        console.error('❌ No se pudo crear sesión');
        setError('No se pudo crear la sesión');
        setIsLoading(false);
        return;
      }

      console.log('✅ Sesión creada exitosamente');
      console.log('📦 Session data:', {
        userId: data.user.id,
        email: data.user.email,
        hasAccessToken: !!data.session.access_token
      });

      // Login exitoso - Supabase Auth maneja la sesión automáticamente
      // El AuthContext detectará el cambio y actualizará el estado
      console.log('✅ LOGIN EXITOSO - AuthContext actualizará automáticamente');
      console.log('👤 Usuario autenticado:', data.user.email);
      console.log('⏳ Esperando a que AuthContext y PermissionsContext se actualicen...');
      
      setError('');
      setIsLoading(false);
      
      // El componente App.tsx detectará la sesión y mostrará el Layout
      
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      setError('Error inesperado al iniciar sesión. Intenta nuevamente.');
      setIsLoading(false);
    }
  };

  const handleRecoverPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setShowRecoverPassword(false);
    alert('Se ha enviado un correo de recuperación');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
          {/* Encabezado Institucional */}
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4">
              <img 
                src={logoTurnos} 
                alt="Turnos Titanium" 
                className="w-16 h-16 rounded-xl shadow-md" 
              />
            </div>
            
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              Turnos Titanium
            </h1>
            <p className="text-sm text-gray-600 mb-2">
              Plataforma Empresarial de Control de Asistencias
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Shield className="w-3 h-3" />
              <span>Acceso Seguro On-Premise</span>
            </div>
          </div>

          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#0074D9] hover:bg-[#0074D9]/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                'Acceder al sistema'
              )}
            </Button>
          </form>

          <div className="mt-6 flex justify-between text-sm">
            <Dialog open={showRecoverPassword} onOpenChange={setShowRecoverPassword}>
              <DialogTrigger asChild>
                <button className="text-[#0074D9] hover:text-[#0074D9]/80">
                  Recuperar contraseña
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Recuperar Contraseña</DialogTitle>
                  <DialogDescription>
                    Ingrese su correo electrónico para recibir instrucciones
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRecoverPassword} className="space-y-4">
                  <div>
                    <Label htmlFor="recover-email">Correo Electrónico</Label>
                    <Input id="recover-email" type="email" required />
                  </div>
                  <Button type="submit" className="w-full">
                    Enviar Instrucciones
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Footer Discreto */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-xs text-gray-400">
              Turnos Titanium Enterprise v2.5.1
            </p>
            <p className="text-center text-xs text-gray-400 mt-1">
              © 2025 Titanium-Labs Corp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}