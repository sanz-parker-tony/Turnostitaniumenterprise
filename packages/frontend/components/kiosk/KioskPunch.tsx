'use client';

import { buildApiUrl } from '../../utils/api-config';
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeftCircle,
  ArrowRightCircle,
  Building2,
  Camera,
  DoorClosed,
  DoorOpen,
  Loader2,
  MapPin,
  MonitorSmartphone,
  User,
  Utensils,
  UtensilsCrossed,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/backend/client';
import { formatClientDate, formatClientDateTime, formatClientTime, getClientTimeZone } from '@/utils/date-time';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const LOCATION_CACHE_MAX_AGE_MS = 45_000;
const LOCATION_REQUEST_TIMEOUT_MS = 6_000;
const CLIENT_APP_INSTANCE_STORAGE_KEY = 'tt-client-app-instance-id';
interface SelectOption {
  id: string;
  lookup_key?: string;
  lookup_label?: string;
  lookup_short_label?: string;
  punch_key_value?: number;
  movement_direction?: 'IN' | 'OUT' | string | null;
  icon_key?: string | null;
  kiosk_column?: 'LEFT' | 'RIGHT' | string | null;
  company_id?: string | null;
  company_name?: string | null;
  device_name?: string | null;
  device_serial_number?: string | null;
}

interface EmployeeContext {
  id: string;
  employee_code: string | null;
  employee_name: string | null;
  employee_lastname: string | null;
  employee_photo_path?: string | null;
  company_id: string | null;
  company_name: string | null;
}

interface ContextPayload {
  employee: EmployeeContext;
  companies: SelectOption[];
  devices: SelectOption[];
  punch_keys: SelectOption[];
  punch_sources: SelectOption[];
  punch_statuses: SelectOption[];
}

function getFullName(employee: EmployeeContext | null): string {
  if (!employee) return '';
  return `${employee.employee_name || ''} ${employee.employee_lastname || ''}`.trim() || employee.employee_code || 'Empleado';
}

function getBrowserPosition(
  timeoutMs = LOCATION_REQUEST_TIMEOUT_MS,
  maximumAgeMs = LOCATION_CACHE_MAX_AGE_MS
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Este navegador no soporta geolocalizacion'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: timeoutMs,
      maximumAge: maximumAgeMs,
    });
  });
}

function getOrCreateClientAppInstanceId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const current = window.localStorage.getItem(CLIENT_APP_INSTANCE_STORAGE_KEY);
    if (current) return current;
    const next =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `tt-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(CLIENT_APP_INSTANCE_STORAGE_KEY, next);
    return next;
  } catch {
    return null;
  }
}

function detectClientDeviceType(): 'mobile' | 'tablet' | 'desktop' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const userAgent = navigator.userAgent || '';
  const maxTouchPoints = Number((navigator as any).maxTouchPoints || 0);
  const isTouch = maxTouchPoints > 1;
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|kindle|silk/.test(ua)) return 'tablet';
  if (/mobi|iphone|android.*mobile|windows phone/.test(ua)) return 'mobile';
  if (/android/.test(ua) && isTouch) return 'tablet';
  return 'desktop';
}

function collectPunchClientMetadata() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return {
      clientDeviceType: 'other',
      clientPlatform: null,
      clientAppInstanceId: null,
      clientUserAgent: null,
      clientMetadata: {},
    };
  }

  const nav = navigator as any;
  const screenInfo = typeof window.screen !== 'undefined' ? window.screen : null;
  const userAgentData = nav.userAgentData || null;
  const clientDeviceType = detectClientDeviceType();
  const clientPlatform = userAgentData?.platform || navigator.platform || null;
  const clientAppInstanceId = getOrCreateClientAppInstanceId();
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection || null;

  return {
    clientDeviceType,
    clientPlatform,
    clientAppInstanceId,
    clientUserAgent: navigator.userAgent || null,
    clientMetadata: {
      app_instance_id: clientAppInstanceId,
      device_type: clientDeviceType,
      platform: clientPlatform,
      user_agent: navigator.userAgent || null,
      user_agent_brands: userAgentData?.brands || null,
      user_agent_mobile: userAgentData?.mobile ?? null,
      language: navigator.language || null,
      languages: Array.isArray(navigator.languages) ? navigator.languages : null,
      time_zone: getClientTimeZone(),
      screen: screenInfo
        ? {
          width: screenInfo.width,
          height: screenInfo.height,
          avail_width: screenInfo.availWidth,
          avail_height: screenInfo.availHeight,
          color_depth: screenInfo.colorDepth,
          pixel_depth: screenInfo.pixelDepth,
        }
        : null,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        device_pixel_ratio: window.devicePixelRatio || 1,
      },
      hardware_concurrency: nav.hardwareConcurrency || null,
      device_memory_gb: nav.deviceMemory || null,
      max_touch_points: nav.maxTouchPoints || 0,
      connection: connection
        ? {
          effective_type: connection.effectiveType || null,
          downlink: connection.downlink || null,
          rtt: connection.rtt || null,
          save_data: connection.saveData || null,
        }
        : null,
      standalone_display:
        window.matchMedia?.('(display-mode: standalone)')?.matches ||
        Boolean(nav.standalone) ||
        false,
      captured_at: new Date().toISOString(),
    },
  };
}

function DeviceStatusIcon({
  active,
  label,
  title,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      title={title}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 ${
        active
          ? 'border-emerald-300 bg-emerald-100 text-emerald-700 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]'
          : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default function KioskPunch() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastPositionRef = useRef<GeolocationPosition | null>(null);
  const cameraStartRunRef = useRef(0);
  const cameraReadyRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [savingLookupId, setSavingLookupId] = useState<string | null>(null);
  const [context, setContext] = useState<ContextPayload | null>(null);
  const [lastMarkAt, setLastMarkAt] = useState<string | null>(null);
  const [lastMarkTimeZone, setLastMarkTimeZone] = useState<string | null>(null);
  const [defaultPunchStatusId, setDefaultPunchStatusId] = useState('');
  const [clockNow, setClockNow] = useState<Date>(new Date());
  const [photoFailed, setPhotoFailed] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    cameraReadyRef.current = cameraReady;
  }, [cameraReady]);

  const request = async (path: string, init?: RequestInit) => {
    const api = createClient();
    const { data: { session } } = await api.auth.getSession();
    const token =
      session?.access_token ||
      localStorage.getItem('tt-access-token') ||
      localStorage.getItem('access_token');
    if (!token) throw new Error('No hay sesion activa. Inicia sesion para marcar.');

    const doFetch = async (bearer: string) => {
      const response = await fetch(buildApiUrl(`${path}`), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearer}`,
          ...(init?.headers || {}),
        },
      });
      const payload = await response.json().catch(() => ({}));
      return { response, payload };
    };

    let { response, payload } = await doFetch(token);
    if (response.status === 401 && session?.access_token && token !== session.access_token) {
      const retry = await doFetch(session.access_token);
      response = retry.response;
      payload = retry.payload;
    }
    if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
    return payload;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setClockNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async (attempt = 1) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Este navegador no soporta camara.');
      setCameraReady(false);
      return;
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setCameraError('La camara requiere HTTPS.');
      setCameraReady(false);
      return;
    }

    const currentRun = ++cameraStartRunRef.current;
    try {
      stopCamera();
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'user' } },
        audio: false,
      });
      if (currentRun !== cameraStartRunRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          setCameraReady(false);
          setCameraError('La camara se desconecto. Reintentando...');
          window.setTimeout(() => void startCamera(), 500);
        };
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraReady(true);
      setCameraError(null);
    } catch (err: any) {
      setCameraReady(false);
      const message = err?.message || 'No se pudo acceder a la camara';
      setCameraError(message);

      const retryable = ['NotReadableError', 'AbortError', 'OverconstrainedError'].includes(err?.name);
      if (retryable && attempt < 4) {
        const retryDelayMs = 700 * attempt;
        window.setTimeout(() => void startCamera(attempt + 1), retryDelayMs);
      }
    }
  }, [stopCamera]);

  const refreshLocation = useCallback(async () => {
    try {
      const position = await getBrowserPosition();
      lastPositionRef.current = position;
      setLocationReady(true);
      setLocationAccuracy(Number.isFinite(position.coords.accuracy) ? Math.round(position.coords.accuracy) : null);
      setLocationError(null);
      return position;
    } catch (err: any) {
      setLocationReady(false);
      setLocationAccuracy(null);
      setLocationError(err?.message || 'No se pudo obtener la ubicacion geografica.');
      throw err;
    }
  }, []);

  const getLocationForPunch = useCallback(async () => {
    const cachedPosition = lastPositionRef.current;
    const cachedAt = Number(cachedPosition?.timestamp || 0);
    if (
      cachedPosition &&
      Number.isFinite(cachedAt) &&
      Date.now() - cachedAt <= LOCATION_CACHE_MAX_AGE_MS &&
      Number.isFinite(cachedPosition.coords.latitude) &&
      Number.isFinite(cachedPosition.coords.longitude)
    ) {
      return cachedPosition;
    }

    return refreshLocation();
  }, [refreshLocation]);

  useEffect(() => {
    const activateDevices = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void startCamera();
      void refreshLocation().catch(() => undefined);
    };

    activateDevices();

    const handleVisibleOrFocus = () => {
      if (!streamRef.current || !cameraReadyRef.current) {
        void startCamera();
      } else if (videoRef.current) {
        void videoRef.current.play().catch(() => undefined);
      }
      void refreshLocation().catch(() => undefined);
    };

    window.addEventListener('focus', handleVisibleOrFocus);
    window.addEventListener('pageshow', handleVisibleOrFocus);
    document.addEventListener('visibilitychange', handleVisibleOrFocus);

    return () => {
      window.removeEventListener('focus', handleVisibleOrFocus);
      window.removeEventListener('pageshow', handleVisibleOrFocus);
      document.removeEventListener('visibilitychange', handleVisibleOrFocus);
      cameraStartRunRef.current += 1;
      stopCamera();
    };
  }, [refreshLocation, startCamera, stopCamera]);

  const captureSnapshotBase64 = (): string | null => {
    const video = videoRef.current;
    if (!video || !cameraReady || video.videoWidth <= 0 || video.videoHeight <= 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const orderedPunchKeys = useMemo(() => {
    const items = context?.punch_keys || [];
    return [...items]
      .filter((item) => Number.isFinite(Number(item.punch_key_value)))
      .sort((a, b) => Number(a.punch_key_value) - Number(b.punch_key_value));
  }, [context]);

  const movementByKey = useMemo(() => {
    const map = new Map<string, SelectOption>();
    orderedPunchKeys.forEach((item) => {
      map.set(String(item.lookup_key || ''), item);
    });
    return map;
  }, [orderedPunchKeys]);

  const punchKeysByColumn = useMemo(() => ({
    left: orderedPunchKeys.filter((item) => item.kiosk_column === 'LEFT'),
    right: orderedPunchKeys.filter((item) => item.kiosk_column === 'RIGHT'),
  }), [orderedPunchKeys]);

  const currentCompanyName = useMemo(() => {
    if (!context) return '-';
    const employeeCompanyId = context.employee.company_id;
    if (!employeeCompanyId) return context.employee.company_name || '-';
    const matched = context.companies.find((company) => company.id === employeeCompanyId);
    return matched?.company_name || context.employee.company_name || '-';
  }, [context]);

  const activeDevice = useMemo(() => {
    if (!context) return null;
    const employeeCompanyId = context.employee.company_id;
    return context.devices.find((device) => device.company_id === employeeCompanyId) || context.devices[0] || null;
  }, [context]);

  const activeDeviceLabel = useMemo(() => {
    if (!activeDevice) return 'Aplicacion Web';
    return `${activeDevice.device_name || 'Dispositivo'}${activeDevice.device_serial_number ? ` (${activeDevice.device_serial_number})` : ''}`;
  }, [activeDevice]);

  const employeePhoto = useMemo(() => {
    const raw = context?.employee?.employee_photo_path;
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `/${trimmed.replace(/^\/+/, '')}`;
  }, [context]);

  const loadContext = async () => {
    setLoading(true);
    try {
      const payload = (await request('/kiosk/mark/context')) as ContextPayload;
      setContext(payload);
      setPhotoFailed(false);
      setDefaultPunchStatusId(payload.punch_statuses?.[0]?.id || '');

      const recent = await request('/kiosk/my-punches?limit=1');
      const latest = recent?.data?.[0];
      setLastMarkAt(latest?.punch_datetime || null);
      setLastMarkTimeZone(latest?.punch_time_zone || null);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar datos de marcacion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadContext();
  }, []);

  const submitPunch = async (punchKeyLookupId: string) => {
    if (!context?.employee?.company_id) {
      toast.error('No se pudo determinar la empresa del empleado');
      return;
    }
    if (!cameraReady) {
      toast.error('La camara no esta lista. Autorice el acceso y reintente.');
      return;
    }

    const snapshotBase64 = captureSnapshotBase64();
    if (!snapshotBase64) {
      toast.error('No se pudo capturar la foto de marcacion.');
      return;
    }

    let latitud: number;
    let longitud: number;
    let locationAccuracyMeters: number | null = null;
    try {
      const position = await getLocationForPunch();
      latitud = position.coords.latitude;
      longitud = position.coords.longitude;
      locationAccuracyMeters = Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null;
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo obtener la ubicacion geografica.');
      return;
    }

    setSavingLookupId(punchKeyLookupId);
    try {
      const clientPunchDate = new Date();
      const clientMetadata = collectPunchClientMetadata();
      const payload = await request('/kiosk/mark/punch', {
        method: 'POST',
        body: JSON.stringify({
          company_id: context.employee.company_id,
          time_clock_device_id: activeDevice?.id || null,
          punch_key_lookup_id: punchKeyLookupId,
          punch_datetime: clientPunchDate.toISOString(),
          client_time_zone: getClientTimeZone(),
          snapshot_base64: snapshotBase64,
          latitud,
          longitud,
          location_accuracy_meters: locationAccuracyMeters,
          client_user_agent: clientMetadata.clientUserAgent,
          client_device_type: clientMetadata.clientDeviceType,
          client_platform: clientMetadata.clientPlatform,
          client_app_instance_id: clientMetadata.clientAppInstanceId,
          client_metadata: clientMetadata.clientMetadata,
        }),
      });
      if (payload?.route_tracking) {
        setLastMarkAt(payload?.route_tracking_point?.tracking_datetime || clientPunchDate.toISOString());
        setLastMarkTimeZone(payload?.route_tracking_point?.tracking_time_zone || payload?.tracking_time_zone || getClientTimeZone());
        toast.success('Punto de recorrido registrado. No afecta asistencia.');
      } else {
        setLastMarkAt(payload?.punch?.punch_datetime || clientPunchDate.toISOString());
        setLastMarkTimeZone(payload?.punch?.punch_time_zone || payload?.punch_time_zone || getClientTimeZone());
        toast.success('Marcacion registrada con camara y geolocalizacion');
      }
      if (payload?.location_validation?.message) {
        toast.info(String(payload.location_validation.message));
      }
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo registrar la marcacion');
    } finally {
      setSavingLookupId(null);
    }
  };

  const renderKeyButton = (lookupKey: string, compact = false) => {
    const item = movementByKey.get(lookupKey);
    const keyNumber = Number(item?.punch_key_value);
    const isSaving = item?.id ? savingLookupId === item.id : false;
    const disabled = !item || !!savingLookupId;

    const isStartKey = item?.movement_direction === 'IN';
    const toneClass = isStartKey
      ? 'border-emerald-400 bg-emerald-50 hover:bg-emerald-100'
      : 'border-rose-400 bg-rose-50 hover:bg-rose-100';
    const bubbleClass = isStartKey
      ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
      : 'bg-rose-100 border-rose-300 text-rose-800';
    const iconByKey: Record<string, ComponentType<{ className?: string }>> = {
      DoorOpen,
      Utensils,
      UtensilsCrossed,
      DoorClosed,
      ArrowRightCircle,
      ArrowLeftCircle,
    };
    const Icon = iconByKey[String(item?.icon_key || '')] || MonitorSmartphone;

    return (
      <Button
        key={lookupKey}
        onClick={() => item?.id && void submitPunch(item.id)}
        disabled={disabled}
        title={item?.lookup_label || item?.lookup_short_label || lookupKey || `Tecla ${keyNumber}`}
        variant="outline"
        className={`w-full border-2 flex flex-col items-center justify-center text-center shadow-sm ${
          compact
            ? 'h-11 min-w-0 rounded-xl px-0 py-0'
            : 'h-20 sm:h-24 rounded-2xl px-3 py-2'
        } ${toneClass}`}
      >
        {isSaving ? (
          <Loader2 className={`${compact ? 'h-5 w-5' : 'mb-2 h-5 w-5'} animate-spin`} />
        ) : (
          <span className={`inline-flex items-center justify-center rounded-full border ${
            compact ? 'h-8 w-8' : 'mb-2 h-10 w-10'
          } ${bubbleClass}`}>
            <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
          </span>
        )}
        <span className={compact ? 'sr-only' : 'text-sm font-medium leading-tight'}>
          {item?.lookup_label || item?.lookup_short_label || lookupKey || `Tecla ${keyNumber}`}
        </span>
      </Button>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!context) {
    return (
      <Card className="max-w-5xl mx-auto">
        <CardContent className="py-10 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-gray-700">No fue posible cargar la informacion de marcacion.</p>
        </CardContent>
      </Card>
    );
  }

  const employeeName = getFullName(context.employee);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-2 sm:space-y-5">
      <Card className="w-full max-w-[964px] border-2 border-slate-300 shadow-lg">
        <CardHeader className="hidden pb-2 sm:block">
          <CardTitle className="text-2xl">Marcar</CardTitle>
          <CardDescription>Interfaz de marcacion tipo reloj biometrico.</CardDescription>
        </CardHeader>
        <CardContent className="timeclock-layout-container space-y-2 p-2 sm:space-y-5 sm:p-6">
          <div className="rounded-xl border bg-slate-50 p-2 sm:p-4 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
            <div className="hidden min-w-0 items-center gap-3 sm:flex">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-600 text-white flex items-center justify-center overflow-hidden">
                {employeePhoto && !photoFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={employeePhoto}
                    alt={employeeName}
                    className="w-full h-full object-cover"
                    onError={() => setPhotoFailed(true)}
                  />
                ) : (
                  <User className="w-6 h-6 sm:w-7 sm:h-7" />
                )}
              </div>
              <div className="min-w-0">
                <p className="break-words font-semibold text-slate-900">{employeeName}</p>
                <p className="text-xs text-slate-600 sm:text-sm">Codigo: {context.employee.employee_code || '-'}</p>
              </div>
            </div>
            <div className="flex w-full items-center justify-end gap-3 text-xs text-slate-700 sm:w-auto sm:justify-between sm:text-sm">
              <div className="hidden min-w-0 space-y-1 sm:block">
                <p className="flex items-center gap-1"><Building2 className="w-4 h-4" /> Empresa: {currentCompanyName}</p>
                <p className="hidden items-center gap-1 sm:flex"><MonitorSmartphone className="w-4 h-4" /> Dispositivo: {activeDeviceLabel}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <DeviceStatusIcon
                  active={cameraReady}
                  icon={Camera}
                  label="Camara"
                  title={cameraReady ? 'Camara activa' : cameraError || 'Camara no activa'}
                  onClick={() => void startCamera()}
                />
                <DeviceStatusIcon
                  active={locationReady}
                  icon={MapPin}
                  label="GPS"
                  title={
                    locationReady
                      ? `Ubicacion activa${locationAccuracy ? `, precision ${locationAccuracy} m` : ''}`
                      : locationError || 'Ubicacion no activa'
                  }
                  onClick={() => void refreshLocation().catch((err: any) => toast.error(err?.message || 'No se pudo obtener la ubicacion geografica.'))}
                />
              </div>
            </div>
          </div>

          <div className="timeclock-punch-layout grid grid-cols-2 items-start gap-2 sm:gap-4">
            <div className="timeclock-left-actions order-1 hidden space-y-3">
              {punchKeysByColumn.left.map((item) => renderKeyButton(String(item.lookup_key || '')))}
            </div>

            <div className="timeclock-camera-column order-1 col-span-2 space-y-2 sm:space-y-3">
              <div className="h-[40dvh] min-h-[220px] overflow-hidden bg-black sm:h-[312px] sm:min-h-0">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="timeclock-below-actions grid grid-cols-6 gap-1.5 sm:hidden">
                {orderedPunchKeys.map((item) => renderKeyButton(String(item.lookup_key || ''), true))}
              </div>
              <div className="timeclock-below-actions hidden grid-cols-6 gap-2 sm:grid">
                {orderedPunchKeys.map((item) => renderKeyButton(String(item.lookup_key || '')))}
              </div>

              <div className="rounded-2xl border-2 border-slate-700 bg-slate-950 text-white h-14 sm:h-24 px-3 sm:px-5 py-2 sm:py-3 flex items-center justify-between shadow-inner">
                <div className="leading-tight">
                  <p className="text-slate-300 text-[11px] uppercase tracking-widest">Hora del sistema</p>
                  <p className="hidden text-slate-300 text-[13px] capitalize sm:block">{formatClientDate(clockNow)}</p>
                </div>
                <p className="text-2xl sm:text-5xl font-semibold tabular-nums leading-none">{formatClientTime(clockNow)}</p>
              </div>
              {lastMarkAt && (
                <p className="hidden text-xs text-slate-600 sm:block">
                  Ultima marcacion: {formatClientDateTime(lastMarkAt, 'es-EC', lastMarkTimeZone || undefined)}
                </p>
              )}
              <p className="hidden text-xs text-slate-600 sm:block">
                {cameraReady
                  ? 'Captura automatica activa: al marcar se toma una foto y se guarda con el id de marcacion.'
                  : `Camara no disponible: ${cameraError || 'inicializando...'}`}
              </p>
              <p className="hidden text-xs text-slate-600 sm:block">
                {locationReady
                  ? `Ubicacion activa${locationAccuracy ? `, precision aproximada ${locationAccuracy} m` : ''}.`
                  : `Ubicacion no disponible: ${locationError || 'active la ubicacion antes de marcar.'}`}
              </p>
            </div>

            <div className="timeclock-right-actions order-3 hidden space-y-3">
              {punchKeysByColumn.right.map((item) => renderKeyButton(String(item.lookup_key || '')))}
            </div>
          </div>

          <div className="hidden rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-700 sm:block">
            <p><span className="font-medium">Fuente:</span> Aplicacion Web</p>
            <p><span className="font-medium">Notas:</span> marcacion manual via web</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
