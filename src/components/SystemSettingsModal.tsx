import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Settings,
  Mail,
  FileSpreadsheet,
  Trash2,
  Plus,
  RefreshCw,
  Download,
  AlertTriangle,
  ShieldCheck,
  Search,
  Filter,
  CheckSquare,
  Square,
  MapPin,
  Calendar,
  Phone,
} from 'lucide-react';
import { SystemSettings } from '../services/firestore';
import { WaterRequest } from '../types';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SystemSettings;
  onSaveSettings: (newSettings: SystemSettings) => void;
  requests: WaterRequest[];
  onDeleteSingleRequest: (req: WaterRequest) => void;
  onDeleteMultipleRequests?: (ids: string[]) => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
  onResetDemo: () => void;
  adminEmails: string[];
  onAddAdmin: (email: string) => void;
  onRemoveAdmin: (email: string) => void;
}

export function SystemSettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  requests,
  onDeleteSingleRequest,
  onDeleteMultipleRequests,
  onClearCompleted,
  onClearAll,
  onResetDemo,
  adminEmails,
  onAddAdmin,
  onRemoveAdmin,
}: SystemSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'item_delete' | 'general' | 'hotlines' | 'admins' | 'bulk_danger'>('item_delete');
  const [formSettings, setFormSettings] = useState<SystemSettings>({ ...settings });

  useEffect(() => {
    setFormSettings({ ...settings });
  }, [settings]);

  // Search & Filter for item-by-item deletion
  const [deleteSearch, setDeleteSearch] = useState('');
  const [deleteUrgencyFilter, setDeleteUrgencyFilter] = useState('');
  const [deleteStatusFilter, setDeleteStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // In-modal confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // New hotline inputs
  const [newHotlineName, setNewHotlineName] = useState('');
  const [newHotlineNumber, setNewHotlineNumber] = useState('');
  const [newHotlineCat, setNewHotlineCat] = useState('ฉุกเฉิน');

  // New admin input
  const [newAdminEmail, setNewAdminEmail] = useState('');

  // Item deletion filter
  const filteredDeleteList = useMemo(() => {
    return requests.filter((r) => {
      const matchSearch =
        !deleteSearch ||
        r.request_number.toLowerCase().includes(deleteSearch.toLowerCase()) ||
        r.reporter_name.toLowerCase().includes(deleteSearch.toLowerCase()) ||
        r.phone.includes(deleteSearch) ||
        r.address.toLowerCase().includes(deleteSearch.toLowerCase()) ||
        r.problem_details.toLowerCase().includes(deleteSearch.toLowerCase());
      const matchUrgency = !deleteUrgencyFilter || r.urgency === deleteUrgencyFilter;
      const matchStatus = !deleteStatusFilter || r.status === deleteStatusFilter;
      return matchSearch && matchUrgency && matchStatus;
    });
  }, [requests, deleteSearch, deleteUrgencyFilter, deleteStatusFilter]);

  if (!isOpen) return null;

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formSettings);
    onClose();
  };

  const handleAddHotline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotlineName.trim() || !newHotlineNumber.trim()) return;
    const updated = [
      ...formSettings.emergencyContacts,
      {
        id: `contact-${Date.now()}`,
        name: newHotlineName.trim(),
        number: newHotlineNumber.trim(),
        category: newHotlineCat,
      },
    ];
    const newS = { ...formSettings, emergencyContacts: updated };
    setFormSettings(newS);
    onSaveSettings(newS);
    setNewHotlineName('');
    setNewHotlineNumber('');
  };

  const handleRemoveHotline = (id: string) => {
    const updated = formSettings.emergencyContacts.filter((c) => c.id !== id);
    const newS = { ...formSettings, emergencyContacts: updated };
    setFormSettings(newS);
    onSaveSettings(newS);
  };

  const handleAddAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    onAddAdmin(newAdminEmail.trim());
    setNewAdminEmail('');
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredDeleteList.length && filteredDeleteList.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDeleteList.map((r) => r.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmDialog({
      title: 'ยืนยันการลบคำร้องที่เลือก',
      description: `คุณต้องการลบคำร้องที่เลือกทั้งหมดจำนวน ${selectedIds.length} รายการออกจากระบบใช่หรือไม่?`,
      confirmText: `ลบ ${selectedIds.length} รายการ`,
      isDanger: true,
      onConfirm: () => {
        if (onDeleteMultipleRequests) {
          onDeleteMultipleRequests(selectedIds);
        } else {
          selectedIds.forEach((id) => {
            const target = requests.find((r) => r.id === id);
            if (target) onDeleteSingleRequest(target);
          });
        }
        setSelectedIds([]);
        setConfirmDialog(null);
      },
    });
  };

  const handleExportCSV = () => {
    const headers = [
      'เลขที่คำร้อง',
      'วันที่แจ้ง',
      'ผู้แจ้ง',
      'เบอร์โทร',
      'อีเมล',
      'ระดับความเร่งด่วน',
      'รายละเอียดปัญหา',
      'ที่อยู่',
      'ละติจูด',
      'ลองจิจูด',
      'ลิงก์ Google Maps',
      'สถานะ',
      'วันที่เสร็จสิ้น',
      'บันทึกเจ้าหน้าที่',
    ];

    const rows = requests.map((r) => [
      `"${r.request_number}"`,
      `"${r.reported_at}"`,
      `"${r.reporter_name.replace(/"/g, '""')}"`,
      `"${r.phone}"`,
      `"${r.email}"`,
      `"${r.urgency}"`,
      `"${r.problem_details.replace(/"/g, '""')}"`,
      `"${r.address.replace(/"/g, '""')}"`,
      r.latitude,
      r.longitude,
      `"${r.google_maps_url}"`,
      `"${r.status}"`,
      `"${r.completed_at || ''}"`,
      `"${(r.admin_notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `water_requests_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-sky-100 animate-in fade-in zoom-in-95 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                จัดการระบบและลบข้อมูล (Admin Management)
              </h3>
              <p className="text-xs text-slate-500">
                ลบข้อมูลทีละรายการ ลบเป็นกลุ่ม จัดการสายด่วน และตั้งค่าระบบ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mt-5 gap-1 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('item_delete')}
            className={`px-3.5 py-2 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'item_delete'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" /> ลบข้อมูลทีละรายการ ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-3.5 py-2 rounded-xl transition shrink-0 ${
              activeTab === 'general' ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-600'
            }`}
          >
            ⚙️ แก้ไขข้อมูลระบบ &amp; เมล
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hotlines')}
            className={`px-3.5 py-2 rounded-xl transition shrink-0 ${
              activeTab === 'hotlines' ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-600'
            }`}
          >
            📞 เบอร์สายด่วน ({formSettings.emergencyContacts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admins')}
            className={`px-3.5 py-2 rounded-xl transition shrink-0 ${
              activeTab === 'admins' ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-600'
            }`}
          >
            🛡️ บัญชีผู้ดูแล ({adminEmails.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bulk_danger')}
            className={`px-3.5 py-2 rounded-xl transition shrink-0 ${
              activeTab === 'bulk_danger' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            📦 ล้างข้อมูลกลุ่ม / ส่งออก CSV
          </button>
        </div>

        {/* TAB 1: ITEM-BY-ITEM DELETION (USER REQUEST FOCUS) */}
        {activeTab === 'item_delete' && (
          <div className="mt-5 space-y-4">
            <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-rose-900 block text-sm">
                  🗑️ จัดการลบข้อมูลคำร้องทีละรายการ
                </span>
                <span className="text-slate-600 text-xs">
                  เลือกดูคำร้องแต่ละราย ตรวจสอบข้อมูล และกดปุ่มลบรายการนั้นออกจากฐานข้อมูลได้ทันที
                </span>
              </div>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center gap-1.5 shadow shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบที่เลือก ({selectedIds.length}) รายการ</span>
                </button>
              )}
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
              <div className="sm:col-span-6 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาเลขที่คำร้อง, ชื่อผู้แจ้ง, เบอร์โทร..."
                  value={deleteSearch}
                  onChange={(e) => setDeleteSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-rose-400 text-xs"
                />
              </div>
              <div className="sm:col-span-3">
                <select
                  value={deleteUrgencyFilter}
                  onChange={(e) => setDeleteUrgencyFilter(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none"
                >
                  <option value="">ทุกความเร่งด่วน</option>
                  <option value="เร่งด่วนมาก">🔴 เร่งด่วนมาก</option>
                  <option value="สูง">🟠 สูง</option>
                  <option value="ปานกลาง">🟡 ปานกลาง</option>
                  <option value="ต่ำ">🟢 ต่ำ</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <select
                  value={deleteStatusFilter}
                  onChange={(e) => setDeleteStatusFilter(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none"
                >
                  <option value="">ทุกสถานะ</option>
                  <option value="รอดำเนินการ">🟡 รอดำเนินการ</option>
                  <option value="กำลังดำเนินการ">🔵 กำลังดำเนินการ</option>
                  <option value="เสร็จสิ้น">🟢 เสร็จสิ้น</option>
                </select>
              </div>
            </div>

            {/* Select All Toggle Bar */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-slate-900"
              >
                {selectedIds.length === filteredDeleteList.length && filteredDeleteList.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-rose-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>
                  {selectedIds.length === filteredDeleteList.length && filteredDeleteList.length > 0
                    ? 'ยกเลิกการเลือกทั้งหมด'
                    : 'เลือกทั้งหมดในรายการนี้'}
                </span>
              </button>
              <span>
                แสดง {filteredDeleteList.length} จาก {requests.length} คำร้อง
              </span>
            </div>

            {/* Items List */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredDeleteList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="font-semibold text-xs">ไม่พบคำร้องตามเงื่อนไขที่ค้นหา</p>
                </div>
              ) : (
                filteredDeleteList.map((req) => {
                  const isChecked = selectedIds.includes(req.id);
                  return (
                    <div
                      key={req.id}
                      className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                        isChecked
                          ? 'bg-rose-50/70 border-rose-300 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleSelectId(req.id)}
                          className="mt-0.5 text-slate-400 hover:text-slate-600"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sky-800 text-xs sm:text-sm">
                              {req.request_number}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                req.urgency === 'เร่งด่วนมาก'
                                  ? 'bg-rose-100 text-rose-800'
                                  : req.urgency === 'สูง'
                                  ? 'bg-orange-100 text-orange-800'
                                  : req.urgency === 'ปานกลาง'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {req.urgency}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {req.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-slate-600 text-[11px]">
                            <span>👤 <strong>{req.reporter_name}</strong></span>
                            <span className="flex items-center gap-0.5 font-medium">
                              <Phone className="w-3 h-3 text-slate-400" /> {req.phone}
                            </span>
                            <span className="flex items-center gap-0.5 text-slate-400">
                              <Calendar className="w-3 h-3" />
                              {new Date(req.reported_at).toLocaleDateString('th-TH')}
                            </span>
                          </div>

                          <p className="text-slate-700 line-clamp-1 text-[11px]">
                            📍 {req.address} &bull; {req.problem_details}
                          </p>
                        </div>
                      </div>

                      {/* Single Item Delete Button */}
                      <div className="flex items-center justify-end sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => onDeleteSingleRequest(req)}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 font-bold text-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                          title={`ลบคำร้อง ${req.request_number}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบรายการนี้</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: GENERAL SETTINGS */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveGeneral} className="mt-5 space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อระบบ / หน่วยงาน
              </label>
              <input
                type="text"
                required
                value={formSettings.systemName}
                onChange={(e) => setFormSettings({ ...formSettings, systemName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-sky-500"
              />
            </div>

            <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-sky-950 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-sky-600" />
                  <span>ระบบส่งแจ้งเตือน Gmail API ตามเมลผู้ดูแล</span>
                </label>
                <span className="text-[11px] font-semibold text-sky-700 bg-sky-100/80 px-2.5 py-0.5 rounded-full">
                  มีผู้ดูแล {adminEmails.length} ท่าน
                </span>
              </div>

              {/* Mode Toggle: All Admins vs Custom/Single */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formSettings.notifyAllAdmins !== false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormSettings({
                        ...formSettings,
                        notifyAllAdmins: checked,
                        notifyEmail: checked ? adminEmails.join(', ') : formSettings.notifyEmail,
                      });
                    }}
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                  />
                  <span>ส่งแจ้งเตือน API ไปยังอีเมลผู้ดูแลระบบทุกคนโดยอัตโนมัติ (แนะนำ)</span>
                </label>
                <p className="text-[11px] text-slate-500 ml-6">
                  เมื่อเปิดตัวเลือกนี้ ทุกครั้งที่มีการเพิ่ม/ลบผู้ดูแลระบบ เป้าหมายแจ้งเตือนจะอัปเดตตามทันที
                </p>
              </div>

              {/* Custom / Specific Notification Emails */}
              <div className="pt-2 border-t border-sky-200/60 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  อีเมลเป้าหมายรับแจ้งเตือน (สามารถระบุหลายเมล คั่นด้วยเครื่องหมายจุลภาค ,):
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={
                      formSettings.notifyAllAdmins !== false
                        ? adminEmails.join(', ')
                        : formSettings.notifyEmail
                    }
                    disabled={formSettings.notifyAllAdmins !== false}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, notifyEmail: e.target.value })
                    }
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-sky-500 text-xs bg-white disabled:bg-slate-100 disabled:text-slate-600"
                    placeholder="เช่น saiarunchanapot@gmail.com, admin@water.gov.th"
                  />
                </div>

                {/* Quick Select Buttons from Admin List */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500">เลือกด่วนจากเมลผู้ดูแล:</span>
                  {adminEmails.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        setFormSettings({
                          ...formSettings,
                          notifyAllAdmins: false,
                          notifyEmail: em,
                        });
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-sky-200 text-sky-800 hover:bg-sky-50 font-medium transition cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setFormSettings({
                        ...formSettings,
                        notifyAllAdmins: true,
                        notifyEmail: adminEmails.join(', '),
                      });
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-700 text-white font-bold hover:bg-sky-800 transition cursor-pointer"
                  >
                    + ส่งทุกคน ({adminEmails.length})
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Google Sheets Spreadsheet ID
              </label>
              <div className="relative">
                <FileSpreadsheet className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="เช่น 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  value={formSettings.spreadsheetId}
                  onChange={(e) => setFormSettings({ ...formSettings, spreadsheetId: e.target.value })}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-sky-500 font-mono text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
              >
                ปิด
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold shadow transition"
              >
                บันทึกการตั้งค่า
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: HOTLINES */}
        {activeTab === 'hotlines' && (
          <div className="mt-5 space-y-4 text-xs">
            <form onSubmit={handleAddHotline} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="sm:col-span-5">
                <input
                  type="text"
                  required
                  placeholder="ชื่อหน่วยงาน/บริการ..."
                  value={newHotlineName}
                  onChange={(e) => setNewHotlineName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none"
                />
              </div>
              <div className="sm:col-span-4">
                <input
                  type="text"
                  required
                  placeholder="เบอร์โทร (เช่น 1125)..."
                  value={newHotlineNumber}
                  onChange={(e) => setNewHotlineNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none font-bold"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold transition flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่มเบอร์
                </button>
              </div>
            </form>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {formSettings.emergencyContacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <div>
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">{c.name}</span>
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold">
                      {c.number}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveHotline(c.id)}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                    title="ลบเบอร์นี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ADMINS */}
        {activeTab === 'admins' && (
          <div className="mt-5 space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">
                  ระบบส่งแจ้งเตือน Gmail API เชื่อมโยงกับเมลผู้ดูแลอัตโนมัติ
                </span>
                <span className="text-amber-800 text-[11px] block mt-0.5">
                  เมื่อคุณเพิ่มหรือลบอีเมลผู้ดูแลในหน้านี้ ระบบจะปรับเป้าหมายการแจ้งเตือนคำร้องใหม่ และการแจ้งเตือนเมื่อมีการเปลี่ยนแปลงสถานะไปยังอีเมลผู้ดูแลเหล่านี้โดยอัตโนมัติ
                </span>
              </div>
            </div>

            <form onSubmit={handleAddAdminSubmit} className="flex gap-2">
              <input
                type="email"
                required
                placeholder="เพิ่มอีเมลผู้ดูแลคนใหม่..."
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-sky-500 text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold transition flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มผู้ดูแล
              </button>
            </form>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {adminEmails.map((em) => (
                <div
                  key={em}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span className="font-mono font-bold text-slate-800">{em}</span>
                  </div>
                  {em.toLowerCase() === 'saiarunchanapot@gmail.com' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                      ผู้ดูแลหลัก (Super Admin)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRemoveAdmin(em)}
                      className="text-rose-600 hover:underline font-bold text-xs"
                    >
                      ลบสิทธิ์
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: BULK & DATA EXPORT */}
        {activeTab === 'bulk_danger' && (
          <div className="mt-5 space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-sky-600" /> ส่งออกข้อมูลเป็น CSV (Excel)
                </h4>
                <p className="text-slate-500 text-xs mt-0.5">
                  ดาวน์โหลดรายการคำร้องทั้งหมด {requests.length} รายการเป็นไฟล์ CSV พร้อมพิกัด
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition shrink-0"
              >
                ดาวน์โหลด CSV
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-amber-700" /> ล้างคำร้องที่ "เสร็จสิ้น" ทั้งหมด
                </h4>
                <p className="text-amber-800 text-xs mt-0.5">
                  ลบเฉพาะคำร้องที่ปิดงานแล้วออกจากตารางเพื่อเคลียร์หน้าจอ
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmDialog({
                    title: 'ล้างคำร้องที่เสร็จสิ้นแล้วทั้งหมด',
                    description: 'คุณต้องการลบคำร้องที่เสร็จสิ้นแล้วทั้งหมดออกจากระบบใช่หรือไม่?',
                    confirmText: 'ล้างคำร้องที่เสร็จสิ้น',
                    isDanger: false,
                    onConfirm: () => {
                      onClearCompleted();
                      setConfirmDialog(null);
                    },
                  });
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shrink-0 cursor-pointer"
              >
                ล้างคำร้องที่เสร็จสิ้น
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-rose-900 text-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" /> ลบคำร้องทั้งหมด (Clear All Data)
                </h4>
                <p className="text-rose-700 text-xs mt-0.5">
                  ลบคำร้องทุกรายการในฐานข้อมูล (ไม่สามารถกู้คืนได้)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmDialog({
                    title: '⚠️ คำเตือน: ลบคำร้องทั้งหมดออกจากระบบ',
                    description: 'คุณต้องการลบคำร้องทุกรายการออกจากฐานข้อมูลจริงหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้',
                    confirmText: 'ยืนยันลบข้อมูลทั้งหมด',
                    isDanger: true,
                    onConfirm: () => {
                      onClearAll();
                      setConfirmDialog(null);
                    },
                  });
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shrink-0 cursor-pointer"
              >
                ลบข้อมูลทั้งหมด
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-slate-600" /> คืนค่าข้อมูลตัวอย่างเริ่มต้น (Reset Demo)
                </h4>
                <p className="text-slate-500 text-xs mt-0.5">
                  โหลดชุดข้อมูลตัวอย่างคำร้อง 3 รายการเพื่อใช้ทดสอบระบบ
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmDialog({
                    title: 'คืนค่าข้อมูลตัวอย่างเริ่มต้น',
                    description: 'คุณต้องการโหลดข้อมูลตัวอย่างเริ่มต้นใช่หรือไม่?',
                    confirmText: 'รีเซ็ตข้อมูลตัวอย่าง',
                    isDanger: false,
                    onConfirm: () => {
                      onResetDemo();
                      setConfirmDialog(null);
                    },
                  });
                }}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold transition shrink-0 cursor-pointer"
              >
                รีเซ็ตข้อมูลตัวอย่าง
              </button>
            </div>
          </div>
        )}

        {/* In-Modal Confirmation Overlay */}
        {confirmDialog && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm rounded-3xl flex items-center justify-center p-6 z-50 animate-in fade-in">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 text-base">
                {confirmDialog.title}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {confirmDialog.description}
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className={`px-4 py-1.5 rounded-xl text-white font-bold text-xs shadow transition cursor-pointer ${
                    confirmDialog.isDanger
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-sky-600 hover:bg-sky-700'
                  }`}
                >
                  {confirmDialog.confirmText || 'ตกลง'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
