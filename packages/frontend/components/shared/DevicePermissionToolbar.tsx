'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, Loader2, MapPin, ShieldAlert, XCircle } from 'lucide-react';
import { Button } from '../ui/button';

type DevicePermissionStatus = 'unknown' | 'checking' | 'granted' | 'denied' | 'unsupported';

type DevicePermissionToolbarProps = {
  variant?: 'compact' | 'panel';
  onCameraGranted?: () => void | Promise<void>;
  onLocationGranted?: (position: GeolocationPosition) => void | Promise<void>;
};

const CAMERA_STORAGE_KEY = 'tt-device-camera-enabled';
const LOCATION_STORAGE_KEY = 'tt-device-location-enabled';
const PERMISSIONS_EVENT = 'tt-device-permissions-changed';

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function isSecureBrowserContext(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext || isLocalhost();
}

function getStoredStatus(key: string): DevicePermissionStatus {
  if (typeof window === 'undefined') return 'unknown';
  const value = window.localStorage.getItem(key);
  return value === 'granted' || value === 'denied' ? value : 'unknown';
}

function saveStoredStatus(key: string, status: DevicePermissionStatus) {
  if (typeof window === 'undefined') return;
  if (status === 'granted' || status === 'denied') {
    window.localStorage.setItem(key, status);
  }
}

function notifyPermissionChange(detail: Partial<Record<'camera' | 'location', DevicePermissionStatus>>) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PERMISSIONS_EVENT, { detail }));
}

async function readPermissionState(name: string): Promise<DevicePermissionStatus> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
  try {
    const result = await navigator.permissions.query({ name: name as PermissionName });
    if (result.state === 'granted') return 'granted';
    if (result.state === 'denied') return 'denied';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function getStatusLabel(status: DevicePermissionStatus): string {
  if (status === 'granted') return 'Activo';
  if (status === 'denied') return 'Denegado';
  if (status === 'unsupported') return 'No soportado';
  if (status === 'checking') return 'Verificando';
  return 'Pendiente';
}

function StatusIcon({ status }: { status: DevicePermissionStatus }) {
  if (status === 'checking') return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  if (status === 'granted') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
  if (status === 'denied' || status === 'unsupported') return <XCircle className="h-3.5 w-3.5 text-red-600" />;
  return <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />;
}

export function DevicePermissionToolbar({
  variant = 'compact',
  onCameraGranted,
  onLocationGranted,
}: DevicePermissionToolbarProps) {
  const [cameraStatus, setCameraStatus] = useState<DevicePermissionStatus>(() => getStoredStatus(CAMERA_STORAGE_KEY));
  const [locationStatus, setLocationStatus] = useState<DevicePermissionStatus>(() => getStoredStatus(LOCATION_STORAGE_KEY));
  const [error, setError] = useState<string | null>(null);
  const secureContext = useMemo(() => isSecureBrowserContext(), []);
  const isPanel = variant === 'panel';

  const refreshPermissionStates = useCallback(async () => {
    if (typeof navigator === 'undefined') return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unsupported');
    } else {
      const nextCamera = await readPermissionState('camera');
      if (nextCamera !== 'unknown') {
        setCameraStatus(nextCamera);
        saveStoredStatus(CAMERA_STORAGE_KEY, nextCamera);
      }
    }

    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
    } else {
      const nextLocation = await readPermissionState('geolocation');
      if (nextLocation !== 'unknown') {
        setLocationStatus(nextLocation);
        saveStoredStatus(LOCATION_STORAGE_KEY, nextLocation);
      }
    }
  }, []);

  useEffect(() => {
    void refreshPermissionStates();
  }, [refreshPermissionStates]);

  const requestCamera = async () => {
    setError(null);
    if (!secureContext) {
      setCameraStatus('denied');
      setError('Camara requiere HTTPS o localhost.');
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unsupported');
      return;
    }

    setCameraStatus('checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      stream.getTracks().forEach((track) => track.stop());
      setCameraStatus('granted');
      saveStoredStatus(CAMERA_STORAGE_KEY, 'granted');
      notifyPermissionChange({ camera: 'granted' });
      await onCameraGranted?.();
    } catch (err: any) {
      setCameraStatus('denied');
      saveStoredStatus(CAMERA_STORAGE_KEY, 'denied');
      notifyPermissionChange({ camera: 'denied' });
      setError(err?.message || 'No se pudo activar la camara.');
    }
  };

  const requestLocation = async () => {
    setError(null);
    if (!secureContext) {
      setLocationStatus('denied');
      setError('Ubicacion requiere HTTPS o localhost.');
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('unsupported');
      return;
    }

    setLocationStatus('checking');
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        });
      });
      setLocationStatus('granted');
      saveStoredStatus(LOCATION_STORAGE_KEY, 'granted');
      notifyPermissionChange({ location: 'granted' });
      await onLocationGranted?.(position);
    } catch (err: any) {
      setLocationStatus('denied');
      saveStoredStatus(LOCATION_STORAGE_KEY, 'denied');
      notifyPermissionChange({ location: 'denied' });
      setError(err?.message || 'No se pudo activar la ubicacion.');
    }
  };

  const buttonBase = isPanel
    ? 'h-auto justify-start gap-2 px-3 py-2 text-left'
    : 'h-9 gap-1.5 px-2 text-xs';

  return (
    <div className={isPanel ? 'space-y-2 rounded-md border bg-slate-50 p-3' : 'hidden items-center gap-1 md:flex'}>
      {isPanel ? (
        <div>
          <p className="text-sm font-medium text-slate-900">Permisos del dispositivo</p>
          <p className="text-xs text-slate-600">Active camara y ubicacion antes de marcar asistencia.</p>
        </div>
      ) : null}

      <div className={isPanel ? 'grid grid-cols-1 gap-2 sm:grid-cols-2' : 'flex items-center gap-1'}>
        <Button
          type="button"
          variant="outline"
          className={buttonBase}
          onClick={() => void requestCamera()}
          disabled={cameraStatus === 'checking'}
          title={`Camara: ${getStatusLabel(cameraStatus)}`}
        >
          <Camera className="h-4 w-4" />
          <span>Camara</span>
          <StatusIcon status={cameraStatus} />
          {isPanel ? <span className="ml-auto text-xs text-slate-500">{getStatusLabel(cameraStatus)}</span> : null}
        </Button>

        <Button
          type="button"
          variant="outline"
          className={buttonBase}
          onClick={() => void requestLocation()}
          disabled={locationStatus === 'checking'}
          title={`Ubicacion: ${getStatusLabel(locationStatus)}`}
        >
          <MapPin className="h-4 w-4" />
          <span>Ubicacion</span>
          <StatusIcon status={locationStatus} />
          {isPanel ? <span className="ml-auto text-xs text-slate-500">{getStatusLabel(locationStatus)}</span> : null}
        </Button>
      </div>

      {!secureContext ? (
        <p className="text-xs text-amber-700">
          El navegador solo permite camara y ubicacion en HTTPS o localhost.
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export { PERMISSIONS_EVENT };
