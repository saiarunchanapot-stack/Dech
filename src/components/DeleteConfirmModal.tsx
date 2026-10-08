import { AlertTriangle, Trash2, X } from 'lucide-react';
import { WaterRequest } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  request: WaterRequest | null;
  onClose: () => void;
  onConfirm: (req: WaterRequest) => void;
  isDeleting?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  request,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteConfirmModalProps) {
  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 animate-in fade-in zoom-in-95 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base sm:text-lg text-slate-900">
              ยืนยันการลบข้อมูลคำร้อง
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs sm:text-sm">
          <p className="text-slate-600">
            คุณต้องการลบข้อมูลคำร้องนี้ออกจากระบบใช่หรือไม่? การดำเนินการนี้ไม่สามารถกู้คืนได้:
          </p>

          <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">เลขที่คำร้อง:</span>
              <span className="font-bold text-sky-800">{request.request_number}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">ผู้แจ้ง:</span>
              <span className="font-bold text-slate-800">{request.reporter_name} ({request.phone})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">ระดับความเร่งด่วน:</span>
              <span className="font-bold text-rose-700">{request.urgency}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">สถานะ:</span>
              <span className="font-bold text-slate-700">{request.status}</span>
            </div>
            <div className="border-t border-rose-200/60 pt-2 text-slate-700">
              <strong>รายละเอียด:</strong> {request.problem_details}
            </div>
          </div>

          <p className="text-[11px] text-rose-600 font-medium">
            * ข้อมูลจะถูกลบออกจากฐานข้อมูล Cloud Firestore และหน่วยความจำของระบบทันที
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => onConfirm(request)}
            disabled={isDeleting}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'กำลังลบข้อมูล...' : 'ยืนยันลบคำร้องนี้'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
