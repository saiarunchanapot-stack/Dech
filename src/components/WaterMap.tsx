import { useState, useCallback, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  MapMouseEvent,
} from '@vis.gl/react-google-maps';
import { WaterRequest } from '../types';
import { Navigation, MapPin, Layers, Phone, ExternalLink, Eye, EyeOff } from 'lucide-react';

export const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ||
  'AIzaSyAW9-E3I10MFLCAdvG799KMl2V8PPlXTmA';

export function maskPhoneNumber(phone: string): string {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-XXX-${digits.slice(6)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 2)}-XXX-${digits.slice(5)}`;
  }
  if (phone.length > 6) {
    return `${phone.slice(0, 3)}-XXX-${phone.slice(-3)}`;
  }
  return '***-***-****';
}

interface WaterMapProps {
  mode: 'picker' | 'overview';
  selectedLat?: number;
  selectedLng?: number;
  onLocationSelect?: (lat: number, lng: number, addressHint?: string) => void;
  requests?: WaterRequest[];
  onSelectRequest?: (req: WaterRequest) => void;
  className?: string;
  zoom?: number;
  highlightedRequestId?: string | null;
  revealedPhoneIds?: string[];
  onToggleRevealPhone?: (id: string) => void;
  maskPhones?: boolean;
}

export function WaterMap({
  mode,
  selectedLat = 13.7563,
  selectedLng = 100.5018,
  onLocationSelect,
  requests = [],
  onSelectRequest,
  className = 'h-[400px] w-full',
  zoom = 13,
  highlightedRequestId = null,
  revealedPhoneIds = [],
  onToggleRevealPhone,
  maskPhones = true,
}: WaterMapProps) {
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: selectedLat,
    lng: selectedLng,
  });
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [activeInfoWindowReq, setActiveInfoWindowReq] = useState<WaterRequest | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');

  const showLocationNotice = (msg: string) => {
    setLocationNotice(msg);
    setTimeout(() => {
      setLocationNotice(null);
    }, 4000);
  };

  // Sync center when selectedLat / Lng changes in picker mode
  useEffect(() => {
    if (selectedLat && selectedLng && mode === 'picker') {
      setMapCenter({ lat: selectedLat, lng: selectedLng });
    }
  }, [selectedLat, selectedLng, mode]);

  // Handle focus on highlighted request
  useEffect(() => {
    if (highlightedRequestId && requests.length > 0) {
      const match = requests.find((r) => r.id === highlightedRequestId);
      if (match) {
        setMapCenter({ lat: match.latitude, lng: match.longitude });
        setCurrentZoom(15);
        setActiveInfoWindowReq(match);
      }
    }
  }, [highlightedRequestId, requests]);

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=th`,
        { headers: { 'User-Agent': 'WaterRequestApp/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        return data.display_name || '';
      }
    } catch (e) {
      console.warn('Reverse geocoding error:', e);
    }
    return '';
  };

  const handleMapClick = useCallback(
    async (e: MapMouseEvent) => {
      if (mode !== 'picker' || !onLocationSelect || !e.detail.latLng) return;
      const lat = e.detail.latLng.lat;
      const lng = e.detail.latLng.lng;
      setMapCenter({ lat, lng });
      const address = await fetchAddress(lat, lng);
      onLocationSelect(lat, lng, address);
    },
    [mode, onLocationSelect]
  );

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      showLocationNotice('อุปกรณ์ของคุณไม่รองรับการระบุพิกัด GPS');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMapCenter({ lat, lng });
        setCurrentZoom(15);
        if (onLocationSelect) {
          const address = await fetchAddress(lat, lng);
          onLocationSelect(lat, lng, address);
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        showLocationNotice('ไม่สามารถดึงตำแหน่งปัจจุบันได้ กรุณากดเลือกจุดบนแผนที่โดยตรง');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-sky-200 shadow-sm ${className}`}>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          center={mapCenter}
          zoom={currentZoom}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          onClick={handleMapClick}
          mapTypeId={mapTypeId}
          disableDefaultUI={false}
          gestureHandling="greedy"
          className="h-full w-full"
        >
          {mode === 'picker' && (
            <AdvancedMarker
              position={{ lat: selectedLat, lng: selectedLng }}
              title="ตำแหน่งที่แจ้งปัญหา"
            >
              <Pin
                background="#0284c7"
                borderColor="#0369a1"
                glyphColor="#ffffff"
                scale={1.25}
              />
            </AdvancedMarker>
          )}

          {mode === 'overview' &&
            requests.map((req) => {
              const isResolved = req.status === 'เสร็จสิ้น';
              const pinColor = isResolved
                ? '#16a34a'
                : req.urgency === 'เร่งด่วนมาก'
                ? '#dc2626'
                : req.urgency === 'สูง'
                ? '#ea580c'
                : req.urgency === 'ปานกลาง'
                ? '#d97706'
                : '#0284c7';

              const isHighlighted = req.id === highlightedRequestId;

              return (
                <AdvancedMarker
                  key={req.id}
                  position={{ lat: req.latitude, lng: req.longitude }}
                  onClick={() => {
                    setActiveInfoWindowReq(req);
                    setMapCenter({ lat: req.latitude, lng: req.longitude });
                  }}
                  title={`${req.request_number} - ${req.reporter_name} (${req.urgency})`}
                >
                  <Pin
                    background={pinColor}
                    borderColor={isHighlighted ? '#fde047' : '#ffffff'}
                    glyphColor="#ffffff"
                    scale={isHighlighted ? 1.3 : 1.1}
                  />
                </AdvancedMarker>
              );
            })}

          {activeInfoWindowReq && (
            <InfoWindow
              position={{
                lat: activeInfoWindowReq.latitude,
                lng: activeInfoWindowReq.longitude,
              }}
              onCloseClick={() => setActiveInfoWindowReq(null)}
            >
              <div className="max-w-xs p-1.5 text-slate-800">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 mb-2">
                  <span className="font-bold text-sky-800 text-sm">
                    {activeInfoWindowReq.request_number}
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        activeInfoWindowReq.urgency === 'เร่งด่วนมาก'
                          ? 'bg-red-100 text-red-700'
                          : activeInfoWindowReq.urgency === 'สูง'
                          ? 'bg-orange-100 text-orange-700'
                          : activeInfoWindowReq.urgency === 'ปานกลาง'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {activeInfoWindowReq.urgency}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        activeInfoWindowReq.status === 'เสร็จสิ้น'
                          ? 'bg-emerald-100 text-emerald-800'
                          : activeInfoWindowReq.status === 'กำลังดำเนินการ'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {activeInfoWindowReq.status}
                    </span>
                  </div>
                </div>

                <div className="text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      👤 {activeInfoWindowReq.reporter_name}
                    </span>
                    <div className="flex items-center gap-1">
                      {revealedPhoneIds.includes(activeInfoWindowReq.id) || !maskPhones ? (
                        <>
                          <a
                            href={`tel:${activeInfoWindowReq.phone}`}
                            className="text-sky-600 hover:underline font-bold flex items-center gap-0.5 text-[11px]"
                          >
                            <Phone className="w-3 h-3" /> {activeInfoWindowReq.phone}
                          </a>
                          {onToggleRevealPhone && (
                            <button
                              type="button"
                              onClick={() => onToggleRevealPhone(activeInfoWindowReq.id)}
                              title="ปิดซ่อนเบอร์โทร (เป็นเอกๆ)"
                              className="p-0.5 text-slate-400 hover:text-slate-600 transition"
                            >
                              <EyeOff className="w-3 h-3" />
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                            {maskPhoneNumber(activeInfoWindowReq.phone)}
                          </span>
                          {onToggleRevealPhone && (
                            <button
                              type="button"
                              onClick={() => onToggleRevealPhone(activeInfoWindowReq.id)}
                              title="คลิกเปิดดูเบอร์โทรเฉพาะรายการนี้ (เป็นเอกๆ)"
                              className="p-0.5 text-sky-600 hover:text-sky-800 font-bold flex items-center gap-0.5 text-[10px]"
                            >
                              <Eye className="w-3 h-3" />
                              <span>ดูเบอร์</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-600 text-[11px] line-clamp-2">
                    📍 {activeInfoWindowReq.address || 'ไม่ได้ระบุที่อยู่'}
                  </p>

                  <p className="text-slate-800 text-xs bg-slate-50 p-2 rounded-lg border border-slate-200 line-clamp-3">
                    💬 {activeInfoWindowReq.problem_details}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectRequest) onSelectRequest(activeInfoWindowReq);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] transition"
                    >
                      ดูรายละเอียด
                    </button>
                    <a
                      href={activeInfoWindowReq.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1"
                    >
                      <span>เปิด Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* Floating Map Controls */}
      {locationNotice && (
        <div className="absolute top-3 left-3 right-3 sm:left-auto sm:right-32 z-20 bg-slate-900/90 text-white text-xs px-3.5 py-2 rounded-xl shadow-lg backdrop-blur flex items-center justify-between gap-2 border border-slate-700 animate-in fade-in">
          <span>{locationNotice}</span>
          <button
            type="button"
            onClick={() => setLocationNotice(null)}
            className="text-slate-400 hover:text-white"
          >
            &times;
          </button>
        </div>
      )}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
        <button
          type="button"
          onClick={() =>
            setMapTypeId((prev) => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))
          }
          className="flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-md backdrop-blur transition hover:bg-white active:scale-95 cursor-pointer"
          title="สลับมุมมองดาวเทียม/แผนที่"
        >
          <Layers className="h-3.5 w-3.5 text-sky-600" />
          {mapTypeId === 'roadmap' ? 'ดาวเทียม' : 'แผนที่'}
        </button>
      </div>

      {mode === 'picker' && (
        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-sky-700 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Navigation className={`h-3.5 w-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            {isLocating ? 'กำลังดึงพิกัด GPS...' : '📍 ใช้ตำแหน่งปัจจุบันของฉัน'}
          </button>
          <span className="rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow backdrop-blur">
            คลิกบนแผนที่เพื่อเปลี่ยนตำแหน่ง
          </span>
        </div>
      )}

      {mode === 'overview' && (
        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 rounded-xl bg-white/95 text-slate-800 px-3 py-1.5 text-xs font-bold shadow-md hover:bg-white transition active:scale-95 cursor-pointer border border-slate-200"
          >
            <Navigation className={`h-3.5 w-3.5 text-sky-600 ${isLocating ? 'animate-spin' : ''}`} />
            <span>ตำแหน่งของฉัน</span>
          </button>
          <span className="rounded-xl bg-slate-900/80 text-white px-3 py-1.5 text-xs font-semibold shadow backdrop-blur">
            ปักหมุดแล้ว {requests.length} จุด &bull; คลิกหมุดเพื่อดูข้อมูล
          </span>
        </div>
      )}
    </div>
  );
}
