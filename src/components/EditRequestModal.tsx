import { useState, useEffect } from 'react';
import { X, Save, MapPin, AlertTriangle } from 'lucide-react';
import { WaterRequest, UrgencyLevel, RequestStatus } from '../types';
import { WaterMap } from './WaterMap';

interface EditRequestModalProps {
  isOpen: boolean;
  request: WaterRequest | null;
  onClose: () => void;
  onSave: (updated: WaterRequest) => void;
}

export function EditRequestModal({ isOpen, request, onClose, onSave }: EditRequestModalProps) {
  const [formData, setFormData] = useState<WaterRequest | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (request) {
      setFormData({ ...request });
      setErrorMsg(null);
    }
  }, [request]);

  if (!isOpen || !formData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reporter_name.trim() || !formData.phone.trim()) {
      setErrorMsg('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      return;
    }
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${formData.latitude.toFixed(6)},${formData.longitude.toFixed(6)}`;
    onSave({
      ...formData,
      google_maps_url: mapsUrl,
      completed_at: formData.status === 'เสร็จสิ้น' ? (formData.completed_at || new Date().toISOString()) : '',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-sky-100 animate-in fade-in zoom-in-95 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              แก้ไขข้อมูลคำร้อง: {formData.request_number}
            </span>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              แก้ไขข้อมูลและสถานะ (โหมดผู้ดูแลระบบ)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อผู้แจ้ง *
              </label>
              <input
                type="text"
                required
                value={formData.reporter_name}
                onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เบอร์โทรศัพท์ *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                อีเมลผู้แจ้ง
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ระดับความเร่งด่วน
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value as UrgencyLevel })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none"
              >
                <option value="ต่ำ">🟢 ต่ำ</option>
                <option value="ปานกลาง">🟡 ปานกลาง</option>
                <option value="สูง">🟠 สูง</option>
                <option value="เร่งด่วนมาก">🔴 เร่งด่วนมาก</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                สถานะการดำเนินงาน
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as RequestStatus })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none"
              >
                <option value="รอดำเนินการ">🟡 รอดำเนินการ</option>
                <option value="กำลังดำเนินการ">🔵 กำลังดำเนินการ</option>
                <option value="เสร็จสิ้น">🟢 เสร็จสิ้น</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              สถานที่ / ที่อยู่ / จุดสังเกต
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              รายละเอียดปัญหาความต้องการน้ำ
            </label>
            <textarea
              rows={3}
              value={formData.problem_details}
              onChange={(e) => setFormData({ ...formData, problem_details: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              บันทึกการประสานงาน / หมายเหตุเจ้าหน้าที่ (Admin Notes)
            </label>
            <textarea
              rows={2}
              placeholder="เช่น จัดส่งรถน้ำ 10,000 ลิตร, ซ่อมท่อเมนแล้ว..."
              value={formData.admin_notes || ''}
              onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-amber-50/50 text-xs outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>

          {/* Interactive Map Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-500" /> ตำแหน่งพิกัดบน Google Maps (คลิกเพื่อแก้ไขจุดปักหมุด)
              </label>
              <span className="font-mono text-[11px] font-bold text-sky-700">
                {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
              </span>
            </div>
            <WaterMap
              mode="picker"
              selectedLat={formData.latitude}
              selectedLng={formData.longitude}
              onLocationSelect={(lat, lng, addressHint) => {
                setFormData((prev) =>
                  prev
                    ? {
                        ...prev,
                        latitude: lat,
                        longitude: lng,
                        address: addressHint || prev.address,
                      }
                    : null
                );
              }}
              className="h-[220px] w-full"
              zoom={15}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการแก้ไข</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
