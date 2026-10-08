import { useState } from 'react';
import { ShieldCheck, Mail, Lock, User, X, LogIn, UserPlus } from 'lucide-react';
import { signInWithEmail, registerAdminWithEmail, googleSignIn, AppUser } from '../services/auth';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AppUser) => void;
}

export function AdminLoginModal({ isOpen, onClose, onLoginSuccess }: AdminLoginModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('saiarunchanapot@gmail.com');
  const [password, setPassword] = useState('password');
  const [name, setName] = useState('ผู้ดูแลระบบ');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (tab === 'login') {
        const user = await signInWithEmail(email, password);
        onLoginSuccess(user);
        onClose();
      } else {
        const user = await registerAdminWithEmail(email, password, name);
        onLoginSuccess(user);
        onClose();
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        onLoginSuccess(res.user);
        onClose();
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdmin = async () => {
    setEmail('saiarunchanapot@gmail.com');
    setPassword('password');
    setIsLoading(true);
    try {
      const user = await signInWithEmail('saiarunchanapot@gmail.com', 'password');
      onLoginSuccess(user);
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'ล็อกอินด่วนไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-sky-100 animate-in fade-in zoom-in-95 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-sky-100 text-sky-800">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                เข้าสู่ระบบผู้ดูแลระบบ (Admin)
              </h3>
              <p className="text-xs text-slate-500">
                จัดการคำร้อง เปลี่ยนสถานะ และตรวจสอบประวัติ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mt-5">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-white text-sky-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> เข้าสู่ระบบด้วยอีเมล
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'bg-white text-sky-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> ลงทะเบียนเจ้าหน้าที่
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailSubmit} className="mt-5 space-y-3.5">
          {tab === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อเจ้าหน้าที่ / ตำแหน่ง
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="เช่น นายช่างฝ่ายจัดการน้ำ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              อีเมลผู้ดูแลระบบ *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="email"
                required
                placeholder="เช่น saiarunchanapot@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              รหัสผ่าน *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                required
                placeholder="กรอกรหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-sm shadow-md transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isLoading ? (
              <span>กำลังตรวจสอบข้อมูล...</span>
            ) : tab === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบผู้ดูแล</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>ลงทะเบียนเจ้าหน้าที่</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
          <button
            type="button"
            onClick={handleGoogleAdminLogin}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer"
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
            <span>เข้าสู่ระบบด้วย Google Account ผู้ดูแล</span>
          </button>

          {/* Quick Demo Admin Button */}
          <button
            type="button"
            onClick={handleQuickAdmin}
            disabled={isLoading}
            className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>⚡ ล็อกอินด่วน: saiarunchanapot@gmail.com</span>
          </button>
        </div>
      </div>
    </div>
  );
}
