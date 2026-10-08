import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { WaterRequest } from '../types';
import { Navigation, Layers, Phone, ExternalLink, Eye, EyeOff, MapPin } from 'lucide-react';

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyAW9-E3I10MFLCAdvG799KMl2V8PPlXTmA';

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
  onToggleRevealPhone?: (id: string, e?: React.MouseEvent) => void;
  maskPhones?: boolean;
  isAdmin?: boolean;
}

// Inner Controller to handle panning, geocoding, and interactive map behaviors
function GoogleMapInner({
  mode,
  selectedLat,
  selectedLng,
  onLocationSelect,
  requests,
  onSelectRequest,
  zoom = 13,
  highlightedRequestId,
  revealedPhoneIds,
  onToggleRevealPhone,
  maskPhones,
  isAdmin,
}: WaterMapProps & { selectedLat: number; selectedLng: number; requests: WaterRequest[] }) {
  const map = useMap();
  const geocodingLib = useMapsLibrary('geocoding');
  const geocoder = useMemo(
    () => (geocodingLib ? new geocodingLib.Geocoder() : null),
    [geocodingLib]
  );

  const [activeRequest, setActiveRequest] = useState<WaterRequest | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'hybrid'>('roadmap');

  const showLocationNotice = (msg: string) => {
    setLocationNotice(msg);
    setTimeout(() => {
      setLocationNotice(null);
    }, 4500);
  };

  // Reverse geocoding helper
  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string> => {
      if (geocoder) {
        try {
          const res = await geocoder.geocode({ location: { lat, lng } });
          if (res.results && res.results[0]) {
            return res.results[0].formatted_address;
          }
        } catch (e) {
          console.warn('Google Maps Geocoding error:', e);
        }
      }
      // Nominatim Thai fallback
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=th`,
          { headers: { 'User-Agent': 'WaterRequestApp/1.0' } }
        );
        if (res.ok) {
          const data = await res.json();
          return data.display_name || '';
        }
      } catch {
        // ignore
      }
      return '';
    },
    [geocoder]
  );

  // Sync highlighted request with active card & pan to it
  useEffect(() => {
    if (!highlightedRequestId || !map || requests.length === 0) return;
    const match = requests.find((r) => r.id === highlightedRequestId);
    if (match) {
      map.panTo({ lat: match.latitude, lng: match.longitude });
      map.setZoom(15);
      setActiveRequest(match);
    }
  }, [highlightedRequestId, map, requests]);

  // Center map on picker position when changed externally
  useEffect(() => {
    if (mode === 'picker' && map) {
      map.panTo({ lat: selectedLat, lng: selectedLng });
    }
  }, [mode, selectedLat, selectedLng, map]);

  // GPS Current Location Handler
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
        if (map) {
          map.panTo({ lat, lng });
          map.setZoom(15);
        }
        if (mode === 'picker') {
          const address = await reverseGeocode(lat, lng);
          onLocationSelect?.(lat, lng, address);
        }
        showLocationNotice('ระบุพิกัด GPS ปัจจุบันสำเร็จ');
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        showLocationNotice('ไม่สามารถดึงตำแหน่งปัจจุบันได้ กรุณาคลิกเลือกจุดบนแผนที่ Google Maps โดยตรง');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Map Click Handler in Picker Mode
  const handleMapClick = async (e: { detail: { latLng: { lat: number; lng: number } | null } }) => {
    if (mode !== 'picker' || !e.detail.latLng) return;
    const { lat, lng } = e.detail.latLng;
    const address = await reverseGeocode(lat, lng);
    onLocationSelect?.(lat, lng, address);
  };

  return (
    <>
      <Map
        mapId="DEMO_MAP_ID"
        defaultCenter={{ lat: selectedLat, lng: selectedLng }}
        defaultZoom={zoom}
        mapTypeId={mapTypeId}
        onClick={handleMapClick}
        disableDefaultUI={false}
        gestureHandling="greedy"
        className="h-full w-full"
      >
        {/* PICKER MODE: Single draggable marker */}
        {mode === 'picker' && (
          <AdvancedMarker
            position={{ lat: selectedLat, lng: selectedLng }}
            draggable={true}
            onDragEnd={async (e) => {
              if (e.latLng) {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                const address = await reverseGeocode(lat, lng);
                onLocationSelect?.(lat, lng, address);
              }
            }}
            title="ลากหมุดหรือคลิกบนแผนที่เพื่อเปลี่ยนตำแหน่ง"
          >
            <Pin
              background="#0284c7"
              borderColor="#0369a1"
              glyphColor="#ffffff"
              scale={1.25}
            />
          </AdvancedMarker>
        )}

        {/* OVERVIEW MODE: Render all request pins with color coding */}
        {mode === 'overview' &&
          requests.map((req) => {
            const isResolved = req.status === 'เสร็จสิ้น';
            const isHighlighted = req.id === highlightedRequestId;
            const bg = isResolved
              ? '#16a34a'
              : req.urgency === 'เร่งด่วนมาก'
              ? '#dc2626'
              : req.urgency === 'สูง'
              ? '#ea580c'
              : req.urgency === 'ปานกลาง'
              ? '#d97706'
              : '#0284c7';

            const border = isResolved
              ? '#14532d'
              : req.urgency === 'เร่งด่วนมาก'
              ? '#991b1b'
              : req.urgency === 'สูง'
              ? '#9a3412'
              : req.urgency === 'ปานกลาง'
              ? '#92400e'
              : '#0369a1';

            return (
              <AdvancedMarker
                key={req.id}
                position={{ lat: req.latitude, lng: req.longitude }}
                onClick={() => {
                  setActiveRequest(req);
                  if (map) {
                    map.panTo({ lat: req.latitude, lng: req.longitude });
                  }
                }}
                title={`${req.request_number} - ${req.reporter_name}`}
                zIndex={isHighlighted ? 999 : undefined}
              >
                <Pin
                  background={bg}
                  borderColor={isHighlighted ? '#fde047' : border}
                  glyphColor="#ffffff"
                  scale={isHighlighted ? 1.35 : 1.0}
                />
              </AdvancedMarker>
            );
          })}
      </Map>

      {/* Floating Notice Banner */}
      {locationNotice && (
        <div className="absolute top-3 left-14 sm:left-auto sm:right-32 z-20 bg-slate-900/90 text-white text-xs px-3.5 py-2 rounded-xl shadow-lg backdrop-blur flex items-center justify-between gap-2 border border-slate-700 animate-in fade-in">
          <span>{locationNotice}</span>
          <button
            type="button"
            onClick={() => setLocationNotice(null)}
            className="text-slate-400 hover:text-white cursor-pointer ml-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Map Layer Switcher (Roadmap / Satellite) */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
        <button
          type="button"
          onClick={() =>
            setMapTypeId((prev) => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))
          }
          className="flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-md backdrop-blur transition hover:bg-white active:scale-95 cursor-pointer border border-slate-200"
          title="สลับมุมมอง แผนที่ทั่วไป / ภาพถ่ายดาวเทียม"
        >
          <Layers className="h-3.5 w-3.5 text-sky-600" />
          <span>{mapTypeId === 'roadmap' ? 'ภาพดาวเทียม' : 'แผนที่ปกติ'}</span>
        </button>
        <div className="px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-mono text-center backdrop-blur">
          Google Maps
        </div>
      </div>

      {/* Bottom Controls for Picker Mode */}
      {mode === 'picker' && (
        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-sky-700 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Navigation className={`h-3.5 w-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'กำลังดึงพิกัด GPS...' : '📍 ใช้ตำแหน่งปัจจุบันของฉัน'}</span>
          </button>
          <span className="rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow backdrop-blur border border-slate-200">
            คลิกบนแผนที่ Google Maps หรือลากหมุดเพื่อเปลี่ยนพิกัด
          </span>
        </div>
      )}

      {/* Bottom Controls for Overview Mode */}
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
          <span className="rounded-xl bg-slate-900/85 text-white px-3 py-1.5 text-xs font-semibold shadow backdrop-blur">
            หมุด Google Maps ทั้งหมด {requests.length} จุด &bull; คลิกหมุดเพื่อดูข้อมูล
          </span>
        </div>
      )}

      {/* Interactive InfoCard for Active Request (Overview Mode) */}
      {mode === 'overview' && activeRequest && (
        <div className="absolute bottom-14 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-sm z-20 bg-white/98 rounded-2xl p-4 shadow-2xl border border-sky-200 backdrop-blur animate-in fade-in zoom-in-95 text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="font-bold text-sky-800 text-sm">
              {activeRequest.request_number}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeRequest.urgency === 'เร่งด่วนมาก'
                    ? 'bg-red-100 text-red-700'
                    : activeRequest.urgency === 'สูง'
                    ? 'bg-orange-100 text-orange-700'
                    : activeRequest.urgency === 'ปานกลาง'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-sky-100 text-sky-700'
                }`}
              >
                {activeRequest.urgency}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeRequest.status === 'เสร็จสิ้น'
                    ? 'bg-emerald-100 text-emerald-800'
                    : activeRequest.status === 'กำลังดำเนินการ'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {activeRequest.status}
              </span>
              <button
                type="button"
                onClick={() => setActiveRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 ml-1 text-sm font-bold"
              >
                &times;
              </button>
            </div>
          </div>

          <div className="space-y-1.5 text-slate-700">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">
                👤 {activeRequest.reporter_name}
              </span>

              {/* Phone display: Admin sees toggle/full, regular user strictly masked with NO reveal button */}
              <div className="flex items-center gap-1">
                {isAdmin ? (
                  revealedPhoneIds?.includes(activeRequest.id) || !maskPhones ? (
                    <>
                      <a
                        href={`tel:${activeRequest.phone}`}
                        className="text-sky-600 hover:underline font-bold flex items-center gap-0.5 text-[11px]"
                      >
                        <Phone className="w-3 h-3" /> {activeRequest.phone}
                      </a>
                      {onToggleRevealPhone && (
                        <button
                          type="button"
                          onClick={(e) => onToggleRevealPhone(activeRequest.id, e)}
                          title="ปิดซ่อนเบอร์โทร"
                          className="p-0.5 text-slate-400 hover:text-slate-600"
                        >
                          <EyeOff className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                        {maskPhoneNumber(activeRequest.phone)}
                      </span>
                      {onToggleRevealPhone && (
                        <button
                          type="button"
                          onClick={(e) => onToggleRevealPhone(activeRequest.id, e)}
                          title="คลิกเปิดดูเบอร์โทรเฉพาะรายการนี้ (Admin)"
                          className="p-0.5 text-sky-600 hover:text-sky-800 font-bold flex items-center gap-0.5 text-[10px] cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>ดูเบอร์</span>
                        </button>
                      )}
                    </>
                  )
                ) : (
                  // Regular user view: strictly masked phone number, NO reveal button!
                  <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                    {maskPhoneNumber(activeRequest.phone)}
                  </span>
                )}
              </div>
            </div>

            <p className="text-slate-600 text-[11px] line-clamp-1">
              📍 {activeRequest.address || 'ไม่ได้ระบุที่อยู่'}
            </p>

            <p className="text-slate-800 text-xs bg-slate-50 p-2 rounded-xl border border-slate-200 line-clamp-2">
              💬 {activeRequest.problem_details}
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  if (onSelectRequest) onSelectRequest(activeRequest);
                }}
                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition cursor-pointer"
              >
                ดูรายละเอียด
              </button>
              <a
                href={activeRequest.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1"
              >
                <MapPin className="w-3 h-3 text-red-500" />
                <span>เปิดนำทาง Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
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
  isAdmin = false,
}: WaterMapProps) {
  const initialLat = mode === 'picker' ? selectedLat : requests[0]?.latitude || selectedLat;
  const initialLng = mode === 'picker' ? selectedLng : requests[0]?.longitude || selectedLng;

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-sky-200 shadow-sm ${className}`}>
      <APIProvider
        apiKey={GOOGLE_MAPS_API_KEY}
        solutionChannel="gmp_git_agentskills_v1"
      >
        <GoogleMapInner
          mode={mode}
          selectedLat={initialLat}
          selectedLng={initialLng}
          onLocationSelect={onLocationSelect}
          requests={requests}
          onSelectRequest={onSelectRequest}
          zoom={zoom}
          highlightedRequestId={highlightedRequestId}
          revealedPhoneIds={revealedPhoneIds}
          onToggleRevealPhone={onToggleRevealPhone}
          maskPhones={maskPhones}
          isAdmin={isAdmin}
        />
      </APIProvider>
    </div>
  );
}
