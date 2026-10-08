import React, { useState, useEffect, useMemo, useId } from 'react';
import {
  Droplets,
  Phone,
  Send,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  MapPin,
  ExternalLink,
  Shield,
  FileSpreadsheet,
  Mail,
  User as UserIcon,
  LogOut,
  X,
  Radio,
  PhoneCall,
  Check,
  ShieldCheck,
  Lock,
  Trash2,
  FileText,
  Copy,
  Settings,
  Edit,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';
import { WaterRequest, UrgencyLevel, RequestStatus } from './types';
import { WaterMap, maskPhoneNumber } from './components/WaterMap';
import { AdminLoginModal } from './components/AdminLoginModal';
import { EditRequestModal } from './components/EditRequestModal';
import { SystemSettingsModal } from './components/SystemSettingsModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  AppUser,
  isAdminEmail,
  getAdminEmails,
  setAdminEmails,
  addAdminEmail,
  removeAdminEmail,
} from './services/auth';
import {
  createWaterRequestSpreadsheet,
  appendRequestToSheet,
  fetchRequestsFromSheet,
  updateRequestStatusInSheet,
} from './services/sheets';
import {
  sendWaterRequestEmail,
  sendRequestStatusUpdateEmail,
  formatRecipients,
} from './services/gmail';
import {
  fetchFirestoreRequests,
  saveRequestToFirestore,
  deleteRequestFromFirestore,
  clearAllRequestsFromFirestore,
  fetchSystemSettings,
  saveSystemSettingsToFirestore,
  SystemSettings,
  DEFAULT_SETTINGS,
} from './services/firestore';

const INITIAL_REQUESTS: WaterRequest[] = [
  {
    id: 'wtr-demo-1',
    request_number: 'WTR-20261002-001',
    reporter_name: 'สมชาย รักบ้านเกิด',
    phone: '081-234-5678',
    email: 'somchai.water@example.com',
    urgency: 'เร่งด่วนมาก',
    problem_details: 'ท่อเมนน้ำประปาแตกหน้าหมู่บ้าน น้ำพุ่งท่วมผิวถนนและไหลไม่หยุด ชาวบ้าน 50 หลังคาเรือนไม่มีน้ำใช้',
    address: 'หน้าหมู่บ้านสุขใจ ถ.สุขุมวิท ซอย 71 พระโขนงเหนือ วัฒนา กรุงเทพฯ 10110',
    latitude: 13.7198,
    longitude: 100.5982,
    google_maps_url: 'https://www.google.com/maps/search/?api=1&query=13.719800,100.598200',
    reported_at: '2026-10-02T07:15:00.000Z',
    status: 'กำลังดำเนินการ',
    admin_notes: 'จัดส่งรถซ่อมบำรุง กปน. สาขาสุขุมวิท เข้าตัดท่อเมนแล้ว คาดซ่อมเสร็จ 15:00 น.',
  },
  {
    id: 'wtr-demo-2',
    request_number: 'WTR-20261002-002',
    reporter_name: 'ประนอม จิตแจ่มใส',
    phone: '089-876-5432',
    email: 'pranom@example.com',
    urgency: 'สูง',
    problem_details: 'น้ำประปามีสีขุ่นแดง มีกลิ่นโคลน ไม่สามารถใช้อุปโภคหรือบริโภคได้ เป็นมา 2 วันแล้ว',
    address: 'ซอยรามคำแหง 24 แยก 14 แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240',
    latitude: 13.7548,
    longitude: 100.6212,
    google_maps_url: 'https://www.google.com/maps/search/?api=1&query=13.754800,100.621200',
    reported_at: '2026-10-02T07:45:00.000Z',
    status: 'รอดำเนินการ',
    admin_notes: 'ประสานทีมตรวจสอบคุณภาพน้ำและระบายตะกอนปลายท่อ',
  },
  {
    id: 'wtr-demo-3',
    request_number: 'WTR-20261002-003',
    reporter_name: 'ธนากร มั่งมี',
    phone: '085-112-2334',
    email: 'thanakorn@example.com',
    urgency: 'ปานกลาง',
    problem_details: 'แรงดันน้ำประปาอ่อนมาก ไหลเป็นหยดตั้งแต่ช่วงเช้า ชั้นสองไม่ไหลเลย',
    address: 'หมู่บ้านพฤกษาวิลล์ ถ.รังสิต-นครนายก คลอง 2 อ.ธัญบุรี จ.ปทุมธานี',
    latitude: 13.9924,
    longitude: 100.6558,
    google_maps_url: 'https://www.google.com/maps/search/?api=1&query=13.992400,100.655800',
    reported_at: '2026-10-01T15:20:00.000Z',
    status: 'เสร็จสิ้น',
    completed_at: '2026-10-02T06:00:00.000Z',
    admin_notes: 'ล้างทำความสะอาดมิเตอร์น้ำเรียบร้อย แรงดันน้ำปกติ',
  },
];

export default function App() {
  const reporterNameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const urgencyId = useId();
  const addressId = useId();
  const problemDetailsId = useId();
  const searchInputId = useId();
  const statusFilterId = useId();
  const urgencyFilterId = useId();

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showSystemSettingsModal, setShowSystemSettingsModal] = useState(false);
  const [adminList, setAdminList] = useState<string[]>(() => getAdminEmails());

  // System Settings State
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  // Google Sheets State
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('water_request_sheet_id') || '';
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    return localStorage.getItem('water_request_sheet_url') || '';
  });
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);

  // Requests Data
  const [requests, setRequests] = useState<WaterRequest[]>(() => {
    const saved = localStorage.getItem('water_requests_cache');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_REQUESTS;
  });

  // Form State
  const [formData, setFormData] = useState({
    reporter_name: '',
    phone: '',
    email: '',
    urgency: 'ปานกลาง' as UrgencyLevel,
    problem_details: '',
    address: 'กรุงเทพมหานครและปริมณฑล',
  });
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: 13.7563,
    lng: 100.5018,
  });

  // Modals & UI States
  const [detailModalReq, setDetailModalReq] = useState<WaterRequest | null>(null);
  const [editModalReq, setEditModalReq] = useState<WaterRequest | null>(null);
  const [deleteConfirmReq, setDeleteConfirmReq] = useState<WaterRequest | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [adminNotesDraft, setAdminNotesDraft] = useState('');
  const [confirmSubmitReq, setConfirmSubmitReq] = useState<WaterRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Filters & Tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [highlightedPinId, setHighlightedPinId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'dashboard' | 'form'>('map');

  // Phone Number Privacy Masking State (ปิดเบอร์โทรเฉพาะหน้า และเปิดดูเป็นเอกๆ)
  const [revealedPhoneIds, setRevealedPhoneIds] = useState<string[]>([]);
  const [globalPrivacyMode, setGlobalPrivacyMode] = useState<boolean>(true);

  const toggleRevealPhone = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRevealedPhoneIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isPhoneRevealed = (id: string): boolean => {
    if (!isAdmin) return false;
    if (!globalPrivacyMode) return true;
    return revealedPhoneIds.includes(id);
  };

  // Check if current user has admin privileges
  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.isAdmin) return true;
    return isAdminEmail(currentUser.email);
  }, [currentUser]);

  // Sync cache with localStorage
  useEffect(() => {
    localStorage.setItem('water_requests_cache', JSON.stringify(requests));
  }, [requests]);

  // Load Settings and Requests from Firestore on mount
  useEffect(() => {
    async function loadData() {
      const settings = await fetchSystemSettings();
      setSystemSettings(settings);
      if (settings.spreadsheetId && !spreadsheetId) {
        setSpreadsheetId(settings.spreadsheetId);
      }
      if (settings.adminEmails && settings.adminEmails.length > 0) {
        setAdminEmails(settings.adminEmails);
        setAdminList(getAdminEmails());
      }

      const firestoreReqs = await fetchFirestoreRequests();
      if (firestoreReqs.length > 0) {
        setRequests(firestoreReqs);
      }
    }
    loadData();
  }, [spreadsheetId]);

  // Auth Initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        if (token) setAccessToken(token);
        if (user.email && !formData.email) {
          setFormData((prev) => ({ ...prev, email: user.email || '' }));
        }
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, [formData.email]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setAccessToken(result.accessToken);
        showToast(`เข้าสู่ระบบด้วย Google สำเร็จ: ${result.user.email}`, 'success');
      }
    } catch (err: unknown) {
      console.error(err);
      showToast('ไม่สามารถเข้าสู่ระบบ Google ได้ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setAccessToken(null);
    showToast('ออกจากระบบเรียบร้อย', 'info');
  };

  // Google Sheets: Create or Connect Spreadsheet
  const handleCreateOrConnectSheet = async () => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      showToast('กรุณาเข้าสู่ระบบ Google ก่อนเพื่อเชื่อมต่อ Google Sheets', 'error');
      return;
    }

    setIsSyncingSheet(true);
    try {
      const res = await createWaterRequestSpreadsheet(token);
      setSpreadsheetId(res.spreadsheetId);
      setSpreadsheetUrl(res.spreadsheetUrl);
      localStorage.setItem('water_request_sheet_id', res.spreadsheetId);
      localStorage.setItem('water_request_sheet_url', res.spreadsheetUrl);

      // Save to system settings
      const newSettings = {
        ...systemSettings,
        spreadsheetId: res.spreadsheetId,
        spreadsheetUrl: res.spreadsheetUrl,
      };
      setSystemSettings(newSettings);
      await saveSystemSettingsToFirestore(newSettings);

      // Upload existing cached requests if any
      for (const req of requests) {
        await appendRequestToSheet(token, res.spreadsheetId, req).catch((e) => console.warn(e));
      }

      showToast('สร้างและเชื่อมต่อ Google Sheets สำเร็จเรียบร้อย!', 'success');
    } catch (e: unknown) {
      const err = e as Error;
      showToast(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Sheets', 'error');
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Sync data from Google Sheet & Firestore
  const handleRefreshData = async () => {
    setIsSyncingSheet(true);
    try {
      const token = accessToken || (await getAccessToken());
      if (token && spreadsheetId) {
        const fromSheet = await fetchRequestsFromSheet(token, spreadsheetId);
        if (fromSheet && fromSheet.length > 0) {
          setRequests(fromSheet);
          showToast(`ซิงค์ข้อมูลจาก Google Sheets สำเร็จ (${fromSheet.length} รายการ)`, 'success');
          return;
        }
      }

      const fromFirestore = await fetchFirestoreRequests();
      if (fromFirestore.length > 0) {
        setRequests(fromFirestore);
        showToast(`ซิงค์ข้อมูลล่าสุดจากฐานข้อมูลแล้ว (${fromFirestore.length} รายการ)`, 'success');
      } else {
        showToast('ข้อมูลอัปเดตเป็นปัจจุบันเรียบร้อย', 'info');
      }
    } catch (e) {
      console.error(e);
      showToast('ไม่สามารถซิงค์ข้อมูลได้', 'error');
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Pre-submit validation
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reporter_name.trim()) {
      showToast('กรุณากรอกชื่อผู้แจ้ง', 'error');
      return;
    }
    if (!formData.phone.trim()) {
      showToast('กรุณากรอกเบอร์โทรศัพท์ติดต่อ', 'error');
      return;
    }
    if (!formData.problem_details.trim()) {
      showToast('กรุณาระบุรายละเอียดของปัญหาความต้องการน้ำ', 'error');
      return;
    }

    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = String(requests.length + 1).padStart(3, '0');
    const requestNumber = `WTR-${stamp}-${count}`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${selectedCoords.lat.toFixed(6)},${selectedCoords.lng.toFixed(6)}`;

    const newReq: WaterRequest = {
      id: `wtr-${Date.now()}`,
      request_number: requestNumber,
      reporter_name: formData.reporter_name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || (currentUser?.email || ''),
      urgency: formData.urgency,
      problem_details: formData.problem_details.trim(),
      address: formData.address.trim() || 'ไม่ได้ระบุที่อยู่แน่ชัด',
      latitude: selectedCoords.lat,
      longitude: selectedCoords.lng,
      google_maps_url: mapsUrl,
      reported_at: new Date().toISOString(),
      status: 'รอดำเนินการ',
    };

    setConfirmSubmitReq(newReq);
  };

  // Execute Submission after User Confirmation
  const handleExecuteSubmit = async () => {
    if (!confirmSubmitReq) return;
    setIsSubmitting(true);

    try {
      const token = accessToken || (await getAccessToken());
      let savedToSheets = false;
      let emailSent = false;

      // 1. Save to Firestore Cloud DB
      await saveRequestToFirestore(confirmSubmitReq).catch((e) => console.warn(e));

      // 2. Save to Google Sheets if connected
      if (token && spreadsheetId) {
        try {
          await appendRequestToSheet(token, spreadsheetId, confirmSubmitReq);
          savedToSheets = true;
        } catch (sheetErr) {
          console.error('Failed to append to Google Sheets:', sheetErr);
        }
      }

      // 3. Send Gmail alert dynamically to admin emails
      if (token) {
        try {
          const targetRecipients =
            systemSettings.notifyAllAdmins !== false
              ? adminList
              : systemSettings.notifyEmail || 'saiarunchanapot@gmail.com';
          await sendWaterRequestEmail(token, confirmSubmitReq, targetRecipients);
          emailSent = true;
        } catch (emailErr) {
          console.error('Failed to send Gmail alert:', emailErr);
        }
      }

      // 4. Update local state
      setRequests((prev) => [confirmSubmitReq, ...prev]);

      // Reset form
      setFormData({
        reporter_name: '',
        phone: '',
        email: currentUser?.email || '',
        urgency: 'ปานกลาง',
        problem_details: '',
        address: 'กรุงเทพมหานครและปริมณฑล',
      });
      setConfirmSubmitReq(null);

      if (savedToSheets && emailSent) {
        showToast(`บันทึกคำร้อง ${confirmSubmitReq.request_number} ลง Google Sheets และส่งอีเมลแจ้งเตือนถึงผู้ดูแลสำเร็จ!`, 'success');
      } else if (savedToSheets) {
        showToast(`บันทึกคำร้องลง Google Sheets และฐานข้อมูลแล้ว`, 'success');
      } else if (emailSent) {
        showToast(`บันทึกคำร้องและส่งอีเมลแจ้งเตือนถึงผู้ดูแลสำเร็จ!`, 'success');
      } else {
        showToast(`บันทึกคำร้อง ${confirmSubmitReq.request_number} เรียบร้อยแล้ว`, 'success');
      }

      setActiveTab('dashboard');
    } catch (e: unknown) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Change Handler (Admin)
  const handleStatusChange = async (req: WaterRequest, newStatus: RequestStatus) => {
    if (!isAdmin) {
      setShowAdminModal(true);
      showToast('กรุณาเข้าสู่ระบบผู้ดูแลระบบด้วยอีเมลเพื่อเปลี่ยนสถานะ', 'error');
      return;
    }

    const oldStatus = req.status;
    const completedAt = newStatus === 'เสร็จสิ้น' ? new Date().toISOString() : '';
    const updated = requests.map((r) =>
      r.id === req.id ? { ...r, status: newStatus, completed_at: completedAt } : r
    );
    setRequests(updated);

    if (detailModalReq && detailModalReq.id === req.id) {
      setDetailModalReq({ ...detailModalReq, status: newStatus, completed_at: completedAt });
    }

    // Update in Firestore
    await saveRequestToFirestore({ ...req, status: newStatus, completed_at: completedAt });

    const token = accessToken || (await getAccessToken());
    if (token && spreadsheetId && req.sheetRowIndex) {
      await updateRequestStatusInSheet(token, spreadsheetId, req.sheetRowIndex, newStatus, completedAt).catch(
        (err) => console.warn('Failed to update status in sheet:', err)
      );
    }

    // Send API alert email for status change to admin emails and reporter
    if (token) {
      try {
        const targetRecipients =
          systemSettings.notifyAllAdmins !== false
            ? adminList
            : systemSettings.notifyEmail || 'saiarunchanapot@gmail.com';
        const allTargets = req.email
          ? `${formatRecipients(targetRecipients)}, ${req.email}`
          : targetRecipients;
        await sendRequestStatusUpdateEmail(
          token,
          { ...req, status: newStatus, completed_at: completedAt },
          oldStatus,
          newStatus,
          currentUser?.email || 'ผู้ดูแลระบบ',
          allTargets,
          req.admin_notes
        );
      } catch (err) {
        console.warn('Status change alert email failed:', err);
      }
    }

    showToast(`อัปเดตสถานะ ${req.request_number} เป็น "${newStatus}" และส่งแจ้งเตือนเรียบร้อย`, 'success');
  };

  // Save Request Edit (Admin)
  const handleSaveEditRequest = async (updatedReq: WaterRequest) => {
    const oldReq = requests.find((r) => r.id === updatedReq.id);
    setRequests((prev) => prev.map((r) => (r.id === updatedReq.id ? updatedReq : r)));
    if (detailModalReq?.id === updatedReq.id) setDetailModalReq(updatedReq);

    // Save to Firestore
    await saveRequestToFirestore(updatedReq);

    // Update in Sheets if present
    const token = accessToken || (await getAccessToken());
    if (token && spreadsheetId && updatedReq.sheetRowIndex) {
      await updateRequestStatusInSheet(
        token,
        spreadsheetId,
        updatedReq.sheetRowIndex,
        updatedReq.status,
        updatedReq.completed_at || ''
      ).catch((err) => console.warn(err));
    }

    // Send Gmail alert if status or details changed
    if (token) {
      try {
        const targetRecipients =
          systemSettings.notifyAllAdmins !== false
            ? adminList
            : systemSettings.notifyEmail || 'saiarunchanapot@gmail.com';
        const allTargets = updatedReq.email
          ? `${formatRecipients(targetRecipients)}, ${updatedReq.email}`
          : targetRecipients;
        await sendRequestStatusUpdateEmail(
          token,
          updatedReq,
          oldReq?.status || updatedReq.status,
          updatedReq.status,
          currentUser?.email || 'ผู้ดูแลระบบ',
          allTargets,
          updatedReq.admin_notes || 'มีการแก้ไขข้อมูลคำร้องโดยผู้ดูแลระบบ'
        );
      } catch (err) {
        console.warn('Edit update alert email failed:', err);
      }
    }

    showToast(`แก้ไขข้อมูลคำร้อง ${updatedReq.request_number} และส่งแจ้งเตือนเรียบร้อยแล้ว`, 'success');
  };

  // Save Admin Notes
  const handleSaveAdminNotes = async () => {
    if (!detailModalReq) return;
    const updated = requests.map((r) =>
      r.id === detailModalReq.id ? { ...r, admin_notes: adminNotesDraft } : r
    );
    setRequests(updated);
    const updatedDoc = { ...detailModalReq, admin_notes: adminNotesDraft };
    setDetailModalReq(updatedDoc);
    await saveRequestToFirestore(updatedDoc);

    const token = accessToken || (await getAccessToken());
    if (token) {
      try {
        const targetRecipients =
          systemSettings.notifyAllAdmins !== false
            ? adminList
            : systemSettings.notifyEmail || 'saiarunchanapot@gmail.com';
        await sendRequestStatusUpdateEmail(
          token,
          updatedDoc,
          updatedDoc.status,
          updatedDoc.status,
          currentUser?.email || 'ผู้ดูแลระบบ',
          targetRecipients,
          adminNotesDraft
        );
      } catch (e) {
        console.warn('Admin notes email notification failed:', e);
      }
    }
    showToast('บันทึกหมายเหตุเจ้าหน้าที่และส่งแจ้งเตือนเรียบร้อย', 'success');
  };

  // Delete Request (Admin only)
  const handleDeleteRequest = (req: WaterRequest) => {
    if (!isAdmin) {
      setShowAdminModal(true);
      return;
    }
    setDeleteConfirmReq(req);
  };

  const handleExecuteDelete = async (req: WaterRequest) => {
    setIsDeletingItem(true);
    try {
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      if (detailModalReq?.id === req.id) setDetailModalReq(null);
      if (editModalReq?.id === req.id) setEditModalReq(null);
      await deleteRequestFromFirestore(req.id);
      showToast(`ลบคำร้อง ${req.request_number} เรียบร้อยแล้ว`, 'info');
      setDeleteConfirmReq(null);
    } catch (e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการลบคำร้อง', 'error');
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleDeleteMultipleRequests = async (ids: string[]) => {
    setRequests((prev) => prev.filter((r) => !ids.includes(r.id)));
    if (detailModalReq && ids.includes(detailModalReq.id)) setDetailModalReq(null);
    if (editModalReq && ids.includes(editModalReq.id)) setEditModalReq(null);
    await Promise.all(ids.map((id) => deleteRequestFromFirestore(id))).catch((e) => console.warn(e));
    showToast(`ลบคำร้องที่เลือกจำนวน ${ids.length} รายการเรียบร้อยแล้ว`, 'info');
  };

  // Copy Dispatch Summary
  const handleCopyDispatch = (req: WaterRequest) => {
    const summary = `🚨 [แจ้งเหตุด่วนเรื่องน้ำ]
เลขที่: ${req.request_number}
ความเร่งด่วน: ${req.urgency}
ผู้แจ้ง: ${req.reporter_name} (${req.phone})
ที่อยู่: ${req.address}
รายละเอียด: ${req.problem_details}
พิกัด Google Maps: ${req.google_maps_url}`;
    navigator.clipboard.writeText(summary);
    showToast('คัดลอกข้อความสรุปสำหรับส่ง LINE / ข้อความเรียบร้อย', 'success');
  };

  // System Settings Handlers
  const handleSaveSystemSettings = async (newSettings: SystemSettings) => {
    setSystemSettings(newSettings);
    await saveSystemSettingsToFirestore(newSettings);
    showToast('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว', 'success');
  };

  const handleClearCompleted = async () => {
    const activeOnly = requests.filter((r) => r.status !== 'เสร็จสิ้น');
    const completedOnes = requests.filter((r) => r.status === 'เสร็จสิ้น');
    setRequests(activeOnly);
    for (const c of completedOnes) {
      await deleteRequestFromFirestore(c.id);
    }
    showToast('ล้างคำร้องที่เสร็จสิ้นแล้วทั้งหมดเรียบร้อย', 'info');
  };

  const handleClearAllRequests = async () => {
    setRequests([]);
    setDetailModalReq(null);
    setEditModalReq(null);
    await clearAllRequestsFromFirestore();
    showToast('ลบข้อมูลคำร้องทั้งหมดออกจากระบบเรียบร้อย', 'info');
  };

  const handleResetDemoData = async () => {
    setRequests(INITIAL_REQUESTS);
    for (const r of INITIAL_REQUESTS) {
      await saveRequestToFirestore(r);
    }
    showToast('คืนค่าข้อมูลตัวอย่างเริ่มต้นเรียบร้อยแล้ว', 'success');
  };

  // Admin Emails Management
  const handleAddAdmin = async (email: string) => {
    const ok = addAdminEmail(email);
    if (ok) {
      const updatedAdmins = getAdminEmails();
      setAdminList(updatedAdmins);
      const newSettings = {
        ...systemSettings,
        adminEmails: updatedAdmins,
        notifyEmail:
          systemSettings.notifyAllAdmins !== false
            ? updatedAdmins.join(', ')
            : systemSettings.notifyEmail,
      };
      setSystemSettings(newSettings);
      await saveSystemSettingsToFirestore(newSettings);
      showToast(`เพิ่ม ${email} เป็นผู้ดูแลระบบ และอัปเดตเป้าหมายแจ้งเตือน API อัตโนมัติแล้ว`, 'success');
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    const ok = removeAdminEmail(email);
    if (ok) {
      const updatedAdmins = getAdminEmails();
      setAdminList(updatedAdmins);
      const newSettings = {
        ...systemSettings,
        adminEmails: updatedAdmins,
        notifyEmail:
          systemSettings.notifyAllAdmins !== false
            ? updatedAdmins.join(', ')
            : systemSettings.notifyEmail,
      };
      setSystemSettings(newSettings);
      await saveSystemSettingsToFirestore(newSettings);
      showToast(`ลบสิทธิ์ผู้ดูแล ${email} และปรับเป้าหมายแจ้งเตือน API แล้ว`, 'info');
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchQuery =
        !searchQuery ||
        r.request_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.reporter_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.phone.includes(searchQuery) ||
        r.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.problem_details.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = !statusFilter || r.status === statusFilter;
      const matchUrgency = !urgencyFilter || r.urgency === urgencyFilter;
      return matchQuery && matchStatus && matchUrgency;
    });
  }, [requests, searchQuery, statusFilter, urgencyFilter]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === 'รอดำเนินการ').length,
      inProgress: requests.filter((r) => r.status === 'กำลังดำเนินการ').length,
      completed: requests.filter((r) => r.status === 'เสร็จสิ้น').length,
      critical: requests.filter((r) => r.urgency === 'เร่งด่วนมาก' && r.status !== 'เสร็จสิ้น').length,
    };
  }, [requests]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-bounce">
          <div
            className={`rounded-2xl px-4 py-3 shadow-2xl text-sm font-semibold flex items-center gap-3 border ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : toastMessage.type === 'error'
                ? 'bg-rose-600 text-white border-rose-500'
                : 'bg-sky-700 text-white border-sky-600'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative bg-gradient-to-r from-sky-950 via-sky-900 to-blue-950 text-white shadow-lg overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08),transparent)] pointer-events-none" />
        
        {/* Admin Mode Top Indicator Bar */}
        {isAdmin && (
          <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-sm">
            <div className="flex items-center justify-between max-w-7xl mx-auto w-full gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-950" />
                <span>โหมดผู้ดูแลระบบ (Admin) &bull; สิทธิ์แก้ไขข้อมูล/ระบบ และลบข้อมูล</span>
                <span className="hidden sm:inline text-slate-800 font-mono text-[11px]">
                  ({currentUser?.email})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSystemSettingsModal(true)}
                className="bg-slate-950 hover:bg-slate-800 text-amber-300 px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition text-[11px]"
              >
                <Settings className="w-3.5 h-3.5" /> จัดการระบบและลบข้อมูล
              </button>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center shadow-inner">
                <Droplets className="w-7 h-7 text-sky-200 fill-sky-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {systemSettings.systemName}
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> เรียลไทม์
                  </span>
                </div>
                <p className="text-sky-200 text-sm mt-0.5">
                  ระบบส่งต่อความช่วยเหลือ บันทึกลง Google Sheets แจ้งเตือนผ่าน Gmail พร้อมพิกัด Google Maps
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Admin Button */}
              {!isAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowAdminModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-slate-950" />
                  <span>เข้าสู่ระบบผู้ดูแล (ด้วยอีเมล)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSystemSettingsModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400/25 border border-amber-300/50 text-amber-200 hover:bg-amber-400/35 transition text-xs font-bold"
                >
                  <Settings className="w-4 h-4 text-amber-300" />
                  <span>จัดการระบบ</span>
                </button>
              )}

              {/* User Account */}
              {currentUser ? (
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-1.5 pr-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || ''}
                      className="w-8 h-8 rounded-full border border-white/30"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-sky-700 flex items-center justify-center text-xs font-bold">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                  <div className="text-left text-xs leading-tight">
                    <div className="font-bold truncate max-w-[130px]">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </div>
                    <div className="text-[10px] text-sky-200 truncate max-w-[130px]">
                      {currentUser.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="ออกจากระบบ"
                    className="ml-1 p-1 hover:bg-white/20 rounded-lg transition"
                  >
                    <LogOut className="w-4 h-4 text-sky-200" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSigningIn}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white text-slate-800 text-xs sm:text-sm font-bold shadow-md hover:bg-slate-50 transition active:scale-95 disabled:opacity-75"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{isSigningIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}</span>
                </button>
              )}

              {/* Google Sheets Connection Pill */}
              {spreadsheetUrl ? (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold transition border border-emerald-400/40 shadow"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>เปิด Google Sheets</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateOrConnectSheet}
                  disabled={isSyncingSheet || !currentUser}
                  title={!currentUser ? 'กรุณาเข้าสู่ระบบ Google ก่อน' : 'สร้าง Google Sheets สำหรับเก็บข้อมูล'}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition border border-white/20 disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                  <span>{isSyncingSheet ? 'กำลังสร้าง Sheets...' : 'เชื่อมต่อ Google Sheets'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Dynamic Hotlines Marquee Bar */}
          <div className="mt-5 pt-4 border-t border-sky-800/60 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-sky-200 flex items-center gap-1">
              <PhoneCall className="w-3.5 h-3.5 text-amber-300" /> สายด่วนฉุกเฉิน:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {systemSettings.emergencyContacts.map((contact) => (
                <a
                  key={contact.id}
                  href={`tel:${contact.number}`}
                  className="bg-sky-800/80 hover:bg-sky-700 px-2.5 py-1 rounded-lg border border-sky-600/40 text-sky-100 font-semibold transition"
                >
                  {contact.name} <strong>{contact.number}</strong>
                </a>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex bg-slate-200/80 p-1 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                activeTab === 'map'
                  ? 'bg-white text-sky-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>แดชบอร์ดแผนที่ปักหมุด ({requests.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-white text-sky-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📊 ตารางรายการคำร้อง</span>
              {isAdmin && (
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-ping" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'form'
                  ? 'bg-white text-sky-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📝 แจ้งปัญหาใหม่
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowSystemSettingsModal(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-bold hover:bg-amber-200 transition"
              >
                <Settings className="w-3.5 h-3.5" /> แก้ไขระบบ &amp; ลบข้อมูล
              </button>
            )}
            <button
              type="button"
              onClick={handleRefreshData}
              disabled={isSyncingSheet}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold shadow-sm hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin text-sky-600' : ''}`} />
              <span>{isSyncingSheet ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}</span>
            </button>
          </div>
        </div>

        {/* Status Counter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-8">
          <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">คำร้องทั้งหมด</span>
              <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                <Droplets className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-slate-800 mt-2">{stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700">รอดำเนินการ</span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-amber-600 mt-2">{stats.pending}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700">กำลังดำเนินการ</span>
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Radio className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-blue-600 mt-2">{stats.inProgress}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700">เสร็จสิ้น</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-2">{stats.completed}</div>
          </div>
        </div>

        {/* TAB 1: FORM SECTION */}
        {activeTab === 'form' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form Column */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-sky-100 shadow-xl">
              <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
                <div className="p-2.5 rounded-2xl bg-sky-100 text-sky-700">
                  <Droplets className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    แบบฟอร์มแจ้งปัญหาความต้องการน้ำ
                  </h2>
                  <p className="text-xs text-slate-500">
                    ข้อมูลจะถูกบันทึกลงชีตและส่งเตือนผ่านอีเมลพร้อมพิกัด Google Maps ทันที
                  </p>
                </div>
              </div>

              <form onSubmit={handlePreSubmit} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={reporterNameId} className="block text-xs font-bold text-slate-700 mb-1.5">
                      ชื่อ-นามสกุล ผู้แจ้ง *
                    </label>
                    <input
                      id={reporterNameId}
                      type="text"
                      required
                      placeholder="เช่น สมชาย ใจดี"
                      value={formData.reporter_name}
                      onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition"
                    />
                  </div>
                  <div>
                    <label htmlFor={phoneId} className="block text-xs font-bold text-slate-700 mb-1.5">
                      เบอร์โทรศัพท์ติดต่อ *
                    </label>
                    <input
                      id={phoneId}
                      type="tel"
                      required
                      placeholder="เช่น 081-234-5678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={emailId} className="block text-xs font-bold text-slate-700 mb-1.5">
                      อีเมลผู้แจ้ง (สำหรับรับแจ้งผล)
                    </label>
                    <input
                      id={emailId}
                      type="email"
                      placeholder="เช่น your-email@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition"
                    />
                  </div>
                  <div>
                    <label htmlFor={urgencyId} className="block text-xs font-bold text-slate-700 mb-1.5">
                      ระดับความเร่งด่วน *
                    </label>
                    <select
                      id={urgencyId}
                      value={formData.urgency}
                      onChange={(e) =>
                        setFormData({ ...formData, urgency: e.target.value as UrgencyLevel })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition font-semibold"
                    >
                      <option value="ต่ำ">🟢 ต่ำ (วางแผนล่วงหน้า)</option>
                      <option value="ปานกลาง">🟡 ปานกลาง (ไหลอ่อน/ขุ่นเล็กน้อย)</option>
                      <option value="สูง">🟠 สูง (ไม่มีน้ำใช้หลายครัวเรือน)</option>
                      <option value="เร่งด่วนมาก">🔴 เร่งด่วนมาก (ท่อเมนแตก/วิกฤตน้ำท่วมขัง)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor={addressId} className="block text-xs font-bold text-slate-700 mb-1.5">
                    สถานที่ / จุดสังเกต / ที่อยู่ *
                  </label>
                  <textarea
                    id={addressId}
                    rows={2}
                    placeholder="ระบุชื่อหมู่บ้าน ซอย ถนน จุดสังเกตใกล้เคียง..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition"
                  />
                </div>

                <div>
                  <label htmlFor={problemDetailsId} className="block text-xs font-bold text-slate-700 mb-1.5">
                    รายละเอียดปัญหาความต้องการน้ำ *
                  </label>
                  <textarea
                    id={problemDetailsId}
                    required
                    rows={3}
                    placeholder="เช่น ท่อเมนประปาแตก น้ำไม่ไหลตั้งแต่ 6 โมงเช้า ต้องการรถบรรทุกน้ำแจกจ่าย..."
                    value={formData.problem_details}
                    onChange={(e) => setFormData({ ...formData, problem_details: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition"
                  />
                </div>

                {/* Email Notification Target dynamically updating with admin emails */}
                <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-100 text-xs text-sky-950 space-y-2.5 shadow-sm">
                  <div className="font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sky-900">
                      <Mail className="w-4 h-4 text-sky-600" />
                      <span>ระบบแจ้งเตือน Gmail API ตามเมลผู้ดูแล</span>
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowSystemSettingsModal(true)}
                        className="text-[11px] text-sky-700 hover:underline font-bold"
                      >
                        ⚙️ จัดการเมลผู้ดูแล
                      </button>
                    )}
                  </div>

                  {systemSettings.notifyAllAdmins !== false ? (
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-slate-600 flex items-center justify-between">
                        <span>ส่งแจ้งเตือนอัตโนมัติถึงผู้ดูแลระบบ ({adminList.length} ท่าน):</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          เชื่อมโยงตามเมลผู้ดูแล
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {adminList.map((em) => (
                          <span
                            key={em}
                            className={`text-[11px] px-2 py-0.5 rounded-lg border font-mono ${
                              em === currentUser?.email
                                ? 'bg-sky-200 text-sky-900 border-sky-300 font-bold'
                                : 'bg-white text-slate-700 border-sky-100'
                            }`}
                          >
                            ✉️ {em}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={systemSettings.notifyEmail}
                        onChange={(e) => {
                          const newS = { ...systemSettings, notifyEmail: e.target.value };
                          setSystemSettings(newS);
                          saveSystemSettingsToFirestore(newS);
                        }}
                        disabled={!isAdmin}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-sky-200 text-xs outline-none disabled:bg-slate-100"
                        placeholder="อีเมลผู้รับแจ้งเตือน"
                      />
                    </div>
                  )}

                  {isAdmin && (
                    <div className="pt-2 border-t border-sky-200/50 flex items-center justify-between text-[11px]">
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={systemSettings.notifyAllAdmins !== false}
                          onChange={(e) => {
                            const newS = {
                              ...systemSettings,
                              notifyAllAdmins: e.target.checked,
                              notifyEmail: e.target.checked ? adminList.join(', ') : systemSettings.notifyEmail,
                            };
                            setSystemSettings(newS);
                            saveSystemSettingsToFirestore(newS);
                          }}
                          className="w-3.5 h-3.5 text-sky-600 rounded"
                        />
                        <span>ส่งถึงผู้ดูแลทุกคน ({adminList.length} คน)</span>
                      </label>
                      <span className="text-slate-400 text-[10px]">
                        API จะส่งแบบเรียลไทม์
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-bold shadow-lg shadow-sky-600/25 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>บันทึกและส่งรายงานคำร้อง</span>
                </button>
              </form>
            </div>

            {/* Map Column */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-white rounded-3xl p-5 border border-sky-100 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-sky-600" /> ปักหมุดพิกัด Google Maps
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      คลิกบนแผนที่หรือกดปุ่มพิกัดปัจจุบันเพื่อส่งพิกัดดาวเทียม
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-bold text-sky-700 bg-sky-50 px-2 py-1 rounded-md border border-sky-200">
                      {selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}
                    </span>
                  </div>
                </div>

                <WaterMap
                  mode="picker"
                  selectedLat={selectedCoords.lat}
                  selectedLng={selectedCoords.lng}
                  onLocationSelect={(lat, lng, addressHint) => {
                    setSelectedCoords({ lat, lng });
                    if (addressHint) {
                      setFormData((prev) => ({
                        ...prev,
                        address: addressHint,
                      }));
                    }
                  }}
                  className="h-[380px] w-full"
                  zoom={14}
                />

                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-semibold text-slate-700">
                    <span>ลิงก์ Google Maps สำหรับส่งต่อ:</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedCoords.lat.toFixed(6)},${selectedCoords.lng.toFixed(6)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1"
                    >
                      <span>เปิดทดสอบ</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 truncate bg-white p-1.5 rounded border border-slate-200">
                    https://www.google.com/maps/search/?api=1&query={selectedCoords.lat.toFixed(6)},{selectedCoords.lng.toFixed(6)}
                  </div>
                </div>
              </div>

              {/* Dynamic Emergency Hotlines Box */}
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200 rounded-3xl p-5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                    <Phone className="w-4 h-4 text-amber-700" /> สายด่วนฉุกเฉิน
                  </h4>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowSystemSettingsModal(true)}
                      className="text-[11px] text-amber-800 hover:underline font-bold"
                    >
                      + จัดการเบอร์
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {systemSettings.emergencyContacts.slice(0, 4).map((c) => (
                    <a
                      key={c.id}
                      href={`tel:${c.number}`}
                      className="p-2.5 rounded-xl bg-white border border-amber-300 text-center font-bold text-xs text-sky-800 hover:bg-sky-50 shadow-sm transition"
                    >
                      {c.name} <strong>{c.number}</strong>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DASHBOARD & TABLE */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Filter & Admin Action Bar */}
            <div className="bg-white p-4 rounded-3xl border border-sky-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <label htmlFor={searchInputId} className="sr-only">ค้นหาคำร้อง</label>
                <input
                  id={searchInputId}
                  type="text"
                  placeholder="ค้นหาเลขที่, ผู้แจ้ง, เบอร์โทร, สถานที่..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <Filter className="w-3.5 h-3.5" /> กรอง:
                </div>
                <label htmlFor={statusFilterId} className="sr-only">กรองสถานะ</label>
                <select
                  id={statusFilterId}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none"
                >
                  <option value="">ทุกสถานะ</option>
                  <option value="รอดำเนินการ">รอดำเนินการ</option>
                  <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                  <option value="เสร็จสิ้น">เสร็จสิ้น</option>
                </select>

                <label htmlFor={urgencyFilterId} className="sr-only">กรองความเร่งด่วน</label>
                <select
                  id={urgencyFilterId}
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none"
                >
                  <option value="">ทุกระดับความเร่งด่วน</option>
                  <option value="เร่งด่วนมาก">🔴 เร่งด่วนมาก</option>
                  <option value="สูง">🟠 สูง</option>
                  <option value="ปานกลาง">🟡 ปานกลาง</option>
                  <option value="ต่ำ">🟢 ต่ำ</option>
                </select>

                {/* Privacy Mode Toggle: แสดงเฉพาะผู้ดูแลระบบ (Admin) */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setGlobalPrivacyMode((prev) => !prev)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                      globalPrivacyMode
                        ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                    title="เปิด-ปิดการปิดบังเบอร์โทรศัพท์บนแดชบอร์ด (Admin Privacy Control)"
                  >
                    {globalPrivacyMode ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                        <span>ปิดเบอร์โทร &bull; ดูเป็นเอกๆ</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>แสดงเบอร์โทรทั้งหมด</span>
                      </>
                    )}
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowSystemSettingsModal(true)}
                    className="ml-auto px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Settings className="w-3.5 h-3.5" /> จัดการระบบ &amp; ลบข้อมูล
                  </button>
                )}
              </div>
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-3xl border border-sky-100 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-sky-50/80 text-sky-900 border-b border-sky-100 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-4">เลขที่คำร้อง</th>
                      <th className="px-4 py-4">วัน-เวลาแจ้ง</th>
                      <th className="px-4 py-4">ผู้แจ้ง / เบอร์โทร</th>
                      <th className="px-4 py-4">สถานที่ / พิกัด</th>
                      <th className="px-4 py-4">ระดับความเร่งด่วน</th>
                      <th className="px-4 py-4">สถานะการช่วยเหลือ</th>
                      <th className="px-4 py-4 text-center">จัดการคำร้อง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                          <Droplets className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                          <p className="font-semibold">ไม่พบรายการคำร้อง</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-5 py-3.5 font-bold text-sky-800">
                            {req.request_number}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap text-xs">
                            {new Date(req.reported_at).toLocaleString('th-TH', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900">{req.reporter_name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {isAdmin ? (
                                isPhoneRevealed(req.id) ? (
                                  <>
                                    <a
                                      href={`tel:${req.phone}`}
                                      className="text-xs text-sky-600 hover:underline flex items-center gap-1 font-semibold"
                                    >
                                      <Phone className="w-3 h-3" /> {req.phone}
                                    </a>
                                    <button
                                      type="button"
                                      onClick={(e) => toggleRevealPhone(req.id, e)}
                                      title="ปิดซ่อนเบอร์โทร (เป็นเอกๆ)"
                                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                    >
                                      <EyeOff className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                      {maskPhoneNumber(req.phone)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => toggleRevealPhone(req.id, e)}
                                      title="คลิกเพื่อเปิดดูเบอร์โทรเฉพาะรายการนี้ (Admin)"
                                      className="px-2 py-0.5 rounded-lg text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 font-bold transition flex items-center gap-1 text-[11px] cursor-pointer"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>ดูเบอร์</span>
                                    </button>
                                  </>
                                )
                              ) : (
                                // Regular user view: strictly masked phone number, NO "ดูเบอร์" button
                                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                  {maskPhoneNumber(req.phone)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 max-w-xs">
                            <div className="truncate font-medium text-slate-800">{req.address}</div>
                            <a
                              href={req.google_maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 mt-0.5"
                            >
                              <MapPin className="w-3 h-3 text-red-500" /> ดูบน Google Maps
                            </a>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                req.urgency === 'เร่งด่วนมาก'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : req.urgency === 'สูง'
                                  ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                  : req.urgency === 'ปานกลาง'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-sky-100 text-sky-800 border border-sky-200'
                              }`}
                            >
                              {req.urgency}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {isAdmin ? (
                              <select
                                value={req.status}
                                onChange={(e) =>
                                  handleStatusChange(req, e.target.value as RequestStatus)
                                }
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                                  req.status === 'เสร็จสิ้น'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : req.status === 'กำลังดำเนินการ'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                <option value="รอดำเนินการ">🟡 รอดำเนินการ</option>
                                <option value="กำลังดำเนินการ">🔵 กำลังดำเนินการ</option>
                                <option value="เสร็จสิ้น">🟢 เสร็จสิ้น</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold ${
                                  req.status === 'เสร็จสิ้น'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : req.status === 'กำลังดำเนินการ'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {req.status}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailModalReq(req);
                                  setAdminNotesDraft(req.admin_notes || '');
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition"
                              >
                                รายละเอียด
                              </button>

                              {isAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setEditModalReq(req)}
                                    title="แก้ไขข้อมูลคำร้อง (Admin)"
                                    className="p-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRequest(req)}
                                    title="ลบคำร้อง (Admin)"
                                    className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                onClick={() => handleCopyDispatch(req)}
                                title="คัดลอกสรุปคำร้องสำหรับส่งไลน์/ข้อความ"
                                className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: INTERACTIVE PINNED MAP DASHBOARD */}
        {activeTab === 'map' && (
          <div className="space-y-5">
            {/* Map Dashboard Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-sky-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <label htmlFor="map-search-input" className="sr-only">ค้นหาจุดปักหมุด</label>
                <input
                  id="map-search-input"
                  type="text"
                  placeholder="ค้นหาจุดปักหมุด, เลขที่, ผู้แจ้ง, สถานที่..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-sky-500"
                />
              </div>

              {/* Urgency Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto text-xs">
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    urgencyFilter === ''
                      ? 'bg-slate-900 text-white shadow'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ทั้งหมด ({requests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('เร่งด่วนมาก')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1 ${
                    urgencyFilter === 'เร่งด่วนมาก'
                      ? 'bg-rose-600 text-white shadow'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>เร่งด่วนมาก ({requests.filter((r) => r.urgency === 'เร่งด่วนมาก').length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('สูง')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    urgencyFilter === 'สูง'
                      ? 'bg-orange-600 text-white shadow'
                      : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                  }`}
                >
                  สูง ({requests.filter((r) => r.urgency === 'สูง').length})
                </button>
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('ปานกลาง')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    urgencyFilter === 'ปานกลาง'
                      ? 'bg-amber-500 text-white shadow'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  ปานกลาง ({requests.filter((r) => r.urgency === 'ปานกลาง').length})
                </button>
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('ต่ำ')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    urgencyFilter === 'ต่ำ'
                      ? 'bg-sky-600 text-white shadow'
                      : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                  }`}
                >
                  ต่ำ ({requests.filter((r) => r.urgency === 'ต่ำ').length})
                </button>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none ml-1"
                >
                  <option value="">ทุกสถานะ</option>
                  <option value="รอดำเนินการ">🟡 รอดำเนินการ</option>
                  <option value="กำลังดำเนินการ">🔵 กำลังดำเนินการ</option>
                  <option value="เสร็จสิ้น">🟢 เสร็จสิ้น</option>
                </select>

                {/* Map Privacy Toggle: แสดงเฉพาะผู้ดูแลระบบ */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setGlobalPrivacyMode((prev) => !prev)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer border ml-1 ${
                      globalPrivacyMode
                        ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                    title="เปิด-ปิดการปิดบังเบอร์โทรศัพท์บนแผนที่ (Admin Privacy Control)"
                  >
                    {globalPrivacyMode ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                        <span>ปิดเบอร์โทร &bull; ดูเป็นเอกๆ</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>แสดงเบอร์โทร</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Map & Pinned Locations Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Map Column (7 cols on lg, 8 on xl) */}
              <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-3xl p-5 sm:p-6 border border-sky-100 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-rose-500" /> แผนที่ปักหมุดจุดเกิดเหตุ (Google Maps Live)
                    </h2>
                    <p className="text-xs text-slate-500">
                      แสดงตำแหน่งหมุดความต้องการน้ำแบบเรียลไทม์บน Google Maps คลิกที่หมุดบนแผนที่เพื่อดูข้อมูลและเปิดนำทาง
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-sky-800 bg-sky-50 px-3 py-1 rounded-xl border border-sky-200 inline-block">
                      ปักหมุด {filteredRequests.length} จุด
                    </span>
                  </div>
                </div>

                {/* OpenStreetMap Overview Component */}
                <WaterMap
                  mode="overview"
                  requests={filteredRequests}
                  highlightedRequestId={highlightedPinId}
                  revealedPhoneIds={revealedPhoneIds}
                  onToggleRevealPhone={toggleRevealPhone}
                  maskPhones={globalPrivacyMode}
                  isAdmin={isAdmin}
                  onSelectRequest={(req) => {
                    setDetailModalReq(req);
                    setAdminNotesDraft(req.admin_notes || '');
                  }}
                  className="h-[520px] w-full"
                  zoom={12}
                />

                {/* Pin Color Legend */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-slate-500 font-bold">สัญลักษณ์หมุด:</span>
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <span className="w-3 h-3 rounded-full bg-red-600 inline-block shadow-sm" /> 🔴 เร่งด่วนมาก
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <span className="w-3 h-3 rounded-full bg-orange-500 inline-block shadow-sm" /> 🟠 สูง
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-sm" /> 🟡 ปานกลาง
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <span className="w-3 h-3 rounded-full bg-sky-600 inline-block shadow-sm" /> 🔵 ต่ำ
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-emerald-800">
                      <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block shadow-sm" /> 🟢 เสร็จสิ้น
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    * คลิกการ์ดด้านขวาเพื่อซูมไปที่หมุด
                  </div>
                </div>
              </div>

              {/* Pinned Locations Sidebar List (5 cols on lg, 4 on xl) */}
              <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl p-5 border border-sky-100 shadow-xl flex flex-col h-[640px]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-sky-600" />
                    <h3 className="font-bold text-slate-800 text-sm">
                      รายการหมุดที่ปักไว้ ({filteredRequests.length})
                    </h3>
                  </div>
                  {highlightedPinId && (
                    <button
                      type="button"
                      onClick={() => setHighlightedPinId(null)}
                      className="text-[11px] text-sky-600 hover:underline font-semibold"
                    >
                      ล้างการเลือก
                    </button>
                  )}
                </div>

                {/* Scrollable list of pinned requests */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mt-3">
                  {filteredRequests.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <MapPin className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-semibold">ไม่พบหมุดตามเงื่อนไขที่เลือก</p>
                    </div>
                  ) : (
                    filteredRequests.map((req) => {
                      const isSelected = req.id === highlightedPinId;
                      const isResolved = req.status === 'เสร็จสิ้น';
                      const badgeBg = isResolved
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : req.urgency === 'เร่งด่วนมาก'
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : req.urgency === 'สูง'
                        ? 'bg-orange-100 text-orange-800 border-orange-200'
                        : req.urgency === 'ปานกลาง'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-sky-100 text-sky-800 border-sky-200';

                      const dotColor = isResolved
                        ? 'bg-emerald-500'
                        : req.urgency === 'เร่งด่วนมาก'
                        ? 'bg-rose-600'
                        : req.urgency === 'สูง'
                        ? 'bg-orange-500'
                        : req.urgency === 'ปานกลาง'
                        ? 'bg-amber-500'
                        : 'bg-sky-600';

                      return (
                        <div
                          key={req.id}
                          onClick={() => setHighlightedPinId(req.id)}
                          className={`p-3.5 rounded-2xl border transition text-xs cursor-pointer ${
                            isSelected
                              ? 'bg-sky-50/80 border-sky-400 shadow-md ring-2 ring-sky-200'
                              : 'bg-slate-50/60 border-slate-200 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
                              <span className="font-bold text-sky-900 text-xs sm:text-sm">
                                {req.request_number}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeBg}`}>
                              {req.urgency}
                            </span>
                          </div>

                          <div className="text-slate-700 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-slate-900">
                                👤 {req.reporter_name}
                              </span>
                              <div className="flex items-center gap-1">
                                {isAdmin ? (
                                  isPhoneRevealed(req.id) ? (
                                    <>
                                      <a
                                        href={`tel:${req.phone}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-sky-600 font-bold hover:underline flex items-center gap-0.5"
                                      >
                                        <Phone className="w-3 h-3" /> {req.phone}
                                      </a>
                                      <button
                                        type="button"
                                        onClick={(e) => toggleRevealPhone(req.id, e)}
                                        title="ปิดซ่อนเบอร์โทร (เป็นเอกๆ)"
                                        className="p-0.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                                      >
                                        <EyeOff className="w-3 h-3" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                        {maskPhoneNumber(req.phone)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => toggleRevealPhone(req.id, e)}
                                        title="คลิกเปิดดูเบอร์โทรเฉพาะรายการนี้ (Admin)"
                                        className="p-0.5 text-sky-600 hover:text-sky-800 font-bold flex items-center gap-0.5 text-[10px] cursor-pointer"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>ดูเบอร์</span>
                                      </button>
                                    </>
                                  )
                                ) : (
                                  // Regular user view: strictly masked phone number, NO "ดูเบอร์" button
                                  <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                    {maskPhoneNumber(req.phone)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-slate-600 text-[11px] line-clamp-1">
                              📍 {req.address}
                            </p>

                            <p className="text-slate-800 text-[11px] line-clamp-2 bg-white p-2 rounded-xl border border-slate-100">
                              💬 {req.problem_details}
                            </p>
                          </div>

                          {/* Quick Actions */}
                          <div className="pt-2.5 mt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHighlightedPinId(req.id);
                              }}
                              className="text-sky-700 font-bold hover:underline flex items-center gap-0.5"
                            >
                              <MapPin className="w-3 h-3 text-red-500" /> โฟกัสหมุด
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailModalReq(req);
                                  setAdminNotesDraft(req.admin_notes || '');
                                }}
                                className="px-2 py-1 rounded-lg bg-sky-100 text-sky-800 hover:bg-sky-200 font-bold transition text-[10px]"
                              >
                                รายละเอียด
                              </button>
                              <a
                                href={req.google_maps_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded-lg bg-slate-200/70 hover:bg-slate-300 text-slate-700 transition"
                                title="เปิดใน Google Maps"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CONFIRMATION DIALOG (WORKSPACE COMPLIANCE) */}
      {confirmSubmitReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-sky-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-800">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-slate-900">
                  ยืนยันการส่งคำร้องแจ้งปัญหาน้ำ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmSubmitReq(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs sm:text-sm">
              <p className="text-slate-600">
                ระบบจะทำการประมวลผลและส่งต่อข้อมูลดังต่อไปนี้:
              </p>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">เลขที่คำร้อง:</span>
                  <span className="font-bold text-sky-800">{confirmSubmitReq.request_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ผู้แจ้ง:</span>
                  <span className="font-semibold text-slate-800">
                    {confirmSubmitReq.reporter_name} ({confirmSubmitReq.phone})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ระดับความเร่งด่วน:</span>
                  <span className="font-bold text-rose-600">{confirmSubmitReq.urgency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">พิกัดสถานที่:</span>
                  <span className="font-mono text-slate-800">
                    {confirmSubmitReq.latitude.toFixed(6)}, {confirmSubmitReq.longitude.toFixed(6)}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 text-slate-700">
                  <strong>รายละเอียด:</strong> {confirmSubmitReq.problem_details}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100 text-xs text-sky-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" /> ปฏิบัติการอัตโนมัติ:
                </div>
                <div className="ml-5 space-y-1">
                  <div>
                    &bull; บันทึกลง <strong>Google Sheets</strong>
                    {spreadsheetId ? ' (เชื่อมต่อแล้ว)' : ' (และเก็บสำรองในฐานข้อมูล Firestore)'}
                  </div>
                  <div>
                    &bull; ส่งอีเมลแจ้งเตือนผ่าน <strong>Gmail API</strong> ไปยัง{' '}
                    <span className="font-mono font-bold">
                      {systemSettings.notifyAllAdmins !== false
                        ? `ผู้ดูแลระบบทุกคน (${adminList.join(', ')})`
                        : systemSettings.notifyEmail || 'saiarunchanapot@gmail.com'}
                    </span>
                  </div>
                  <div>
                    &bull; ส่งพิกัดสถานที่แบบเรียลไทม์ผ่านลิงก์ <strong>Google Maps</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmSubmitReq(null)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังส่งข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>ยืนยันส่งข้อมูล</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL WITH EDIT & DELETE */}
      {detailModalReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-sky-100 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                  {detailModalReq.request_number}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  รายละเอียดปัญหาความต้องการน้ำ
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditModalReq(detailModalReq);
                        setDetailModalReq(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-sm"
                    >
                      <Edit className="w-3.5 h-3.5" /> แก้ไขคำร้อง
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRequest(detailModalReq)}
                      className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> ลบคำร้อง
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setDetailModalReq(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <span className="text-slate-400 text-xs block">ผู้แจ้ง:</span>
                  <span className="font-bold text-slate-800">{detailModalReq.reporter_name}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">เบอร์โทรศัพท์:</span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => toggleRevealPhone(detailModalReq.id)}
                        className="text-[11px] text-sky-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {isPhoneRevealed(detailModalReq.id) ? (
                          <>
                            <EyeOff className="w-3 h-3" /> ซ่อน
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" /> แสดงเบอร์
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="mt-1">
                    {isAdmin && isPhoneRevealed(detailModalReq.id) ? (
                      <a
                        href={`tel:${detailModalReq.phone}`}
                        className="font-bold text-sky-600 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" /> {detailModalReq.phone}
                      </a>
                    ) : (
                      <span className="font-mono text-slate-600 font-bold text-xs bg-slate-200/70 px-2 py-0.5 rounded">
                        {maskPhoneNumber(detailModalReq.phone)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1">
                <span className="text-slate-400 text-xs block">รายละเอียดปัญหา:</span>
                <p className="text-slate-800 whitespace-pre-line font-medium leading-relaxed">
                  {detailModalReq.problem_details}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1">
                <span className="text-slate-400 text-xs block">สถานที่เกิดเหตุ:</span>
                <p className="text-slate-800 font-medium">{detailModalReq.address}</p>
                <div className="pt-2 flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-500">
                    GPS: {detailModalReq.latitude.toFixed(6)}, {detailModalReq.longitude.toFixed(6)}
                  </span>
                  <a
                    href={detailModalReq.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow hover:bg-blue-700"
                  >
                    <MapPin className="w-3.5 h-3.5" /> เปิดนำทาง Google Maps
                  </a>
                </div>
              </div>

              {/* Map Preview for this Request (Google Maps) */}
              <div className="rounded-2xl overflow-hidden border border-slate-200">
                <WaterMap
                  mode="picker"
                  selectedLat={detailModalReq.latitude}
                  selectedLng={detailModalReq.longitude}
                  className="h-[200px] w-full"
                  zoom={15}
                  isAdmin={isAdmin}
                />
              </div>

              {/* Admin Notes Section */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-700" /> บันทึกการประสานงาน / หมายเหตุเจ้าหน้าที่:
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleSaveAdminNotes}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition"
                    >
                      บันทึกข้อความ
                    </button>
                  )}
                </div>
                {isAdmin ? (
                  <textarea
                    rows={2}
                    placeholder="ระบุข้อความการประสานงาน เช่น ส่งรถน้ำแล้ว, เปลี่ยนวาล์วแล้ว..."
                    value={adminNotesDraft}
                    onChange={(e) => setAdminNotesDraft(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-amber-300 text-xs outline-none focus:ring-2 focus:ring-amber-200"
                  />
                ) : (
                  <p className="text-slate-700 text-xs italic bg-white p-2.5 rounded-xl border border-amber-200">
                    {detailModalReq.admin_notes || 'ยังไม่มีบันทึกจากเจ้าหน้าที่'}
                  </p>
                )}
              </div>

              {/* Status Update bar inside modal */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div>
                  <span className="font-bold text-slate-700 text-xs block">สถานะปัจจุบัน:</span>
                  <span
                    className={`inline-block mt-1 px-3 py-1 rounded-xl text-xs font-bold ${
                      detailModalReq.status === 'เสร็จสิ้น'
                        ? 'bg-emerald-100 text-emerald-800'
                        : detailModalReq.status === 'กำลังดำเนินการ'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {detailModalReq.status}
                  </span>
                </div>

                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-semibold">เปลี่ยนเป็น:</span>
                    {(['รอดำเนินการ', 'กำลังดำเนินการ', 'เสร็จสิ้น'] as RequestStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleStatusChange(detailModalReq, st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          detailModalReq.status === st
                            ? 'bg-sky-600 text-white shadow'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailModalReq(null);
                      setShowAdminModal(true);
                    }}
                    className="text-xs text-sky-600 hover:underline font-bold"
                  >
                    เข้าสู่ระบบผู้ดูแลเพื่อเปลี่ยนสถานะ &rarr;
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT REQUEST MODAL (ADMIN ONLY) */}
      <EditRequestModal
        isOpen={Boolean(editModalReq)}
        request={editModalReq}
        onClose={() => setEditModalReq(null)}
        onSave={handleSaveEditRequest}
      />

      {/* SYSTEM SETTINGS & DATA MANAGEMENT MODAL (ADMIN ONLY) */}
      <SystemSettingsModal
        isOpen={showSystemSettingsModal}
        onClose={() => setShowSystemSettingsModal(false)}
        settings={systemSettings}
        onSaveSettings={handleSaveSystemSettings}
        requests={requests}
        onDeleteSingleRequest={(req) => setDeleteConfirmReq(req)}
        onDeleteMultipleRequests={handleDeleteMultipleRequests}
        onClearCompleted={handleClearCompleted}
        onClearAll={handleClearAllRequests}
        onResetDemo={handleResetDemoData}
        adminEmails={adminList}
        onAddAdmin={handleAddAdmin}
        onRemoveAdmin={handleRemoveAdmin}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteConfirmReq)}
        request={deleteConfirmReq}
        onClose={() => setDeleteConfirmReq(null)}
        onConfirm={handleExecuteDelete}
        isDeleting={isDeletingItem}
      />

      {/* ADMIN LOGIN MODAL */}
      <AdminLoginModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if ((user.isAdmin || isAdminEmail(user.email || '')) && user.email) {
            addAdminEmail(user.email);
            const updated = getAdminEmails();
            setAdminList(updated);
            const newSettings = {
              ...systemSettings,
              adminEmails: updated,
              notifyEmail: user.email,
            };
            setSystemSettings(newSettings);
            saveSystemSettingsToFirestore(newSettings).catch(console.warn);
          }
          showToast(`เข้าสู่ระบบผู้ดูแลระบบสำเร็จ: ${user.email} (อัปเดตแจ้งเตือน API ตามอีเมลนี้)`, 'success');
        }}
      />

      {/* Footer */}
      <footer className="mt-16 bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="text-slate-300 font-semibold">
            {systemSettings.systemName}
          </p>
          <p className="text-slate-500">
            ผสานการทำงานร่วมกับ Google Workspace (Google Sheets, Gmail), Google Maps Platform และ Firestore Cloud DB
          </p>
        </div>
      </footer>
    </div>
  );
}
