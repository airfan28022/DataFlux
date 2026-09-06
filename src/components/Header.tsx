import React, { useState, useEffect } from 'react';
import { formatThaiDate, formatThaiDateTime } from '../utils/helpers';
import { dataService } from '../services/dataService';
import { TeacherProfile } from '../types';
import {
  GraduationCap,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Settings,
  CloudUpload,
  LogOut,
  KeyRound,
  CalendarDays,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  isAdmin?: boolean;
  onAdminToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  activeTab,
  setActiveTab,
  isAdmin: propIsAdmin,
  onAdminToggle
}) => {
  const [profile, setProfile] = useState<TeacherProfile>(dataService.getProfile());
  const [isAdmin, setIsAdmin] = useState<boolean>(
    propIsAdmin !== undefined ? propIsAdmin : dataService.isAdmin()
  );
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('Admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (propIsAdmin !== undefined) {
      setIsAdmin(propIsAdmin);
    }
  }, [propIsAdmin]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const unsubscribe = dataService.subscribe(() => {
      setProfile(dataService.getProfile());
      setIsAdmin(dataService.isAdmin());
    });

    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (loginUsername !== (profile.adminUsername || 'Admin')) {
      setLoginError('User ID ไม่ถูกต้อง (ค่าเริ่มต้น: Admin)');
      return;
    }
    if (!dataService.verifyAdminPassword(loginPassword)) {
      setLoginError('รหัสผ่านไม่ถูกต้อง (ค่าเริ่มต้น: 456789)');
      return;
    }
    dataService.setAdminLoggedIn(true);
    setShowAdminLoginModal(false);
    setLoginPassword('');
    dataService.notifyToast('success', 'เข้าสู่โหมดผู้ดูแล (Admin) สำเร็จ', 'คุณสามารถแก้ไข ลบ และจัดการข้อมูลทั้งหมดได้');
  };

  const handleLogout = () => {
    dataService.setAdminLoggedIn(false);
    dataService.notifyToast('info', 'ออกจากโหมดผู้ดูแลแล้ว', 'สลับเป็นมุมมองคุณครูทั่วไป (Read/Standard Mode)');
  };

  const handleCloudSync = async () => {
    setIsSyncing(true);
    await dataService.syncWithGoogleAppsScript();
    setIsSyncing(false);
  };

  // Format real-time clock and date for High Density layout
  const timeString = currentTime.toLocaleTimeString('th-TH', { hour12: false });
  const dateString = formatThaiDate(currentTime, true);

  return (
    <>
      <header className="h-16 bg-white border-b border-emerald-100 flex items-center justify-between px-4 sm:px-8 shadow-xs shrink-0 sticky top-0 z-40">
        {/* Left: Logo & Classroom info */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setActiveTab && setActiveTab('dashboard')}
        >
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-xs shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight truncate max-w-[200px] sm:max-w-md">
              ระบบบริหารข้อมูลครูประจำชั้น
            </h1>
            <p className="text-xs text-emerald-600 font-medium truncate max-w-[200px] sm:max-w-md">
              {profile.teacherName} | ห้อง {profile.classroomName || 'ป.6/1'}
            </p>
          </div>
        </div>

        {/* Right side: Clock, Admin mode, Settings */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Real-time Clock in High Density style */}
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-gray-700 tabular-nums leading-tight">
              {timeString}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">
              {dateString}
            </p>
          </div>

          {/* Quick GAS Sync Button */}
          {profile.gasWebAppUrl && (
            <button
              type="button"
              onClick={handleCloudSync}
              disabled={isSyncing}
              className="hidden lg:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition-colors"
              title="ซิงค์ข้อมูลกับ Google Sheets / Drive"
            >
              <CloudUpload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ Sheets'}</span>
            </button>
          )}

          {/* Admin / User pill */}
          <div className="flex items-center gap-2 border-l border-gray-100 pl-3 sm:pl-6">
            <button
              type="button"
              onClick={onAdminToggle || (() => (isAdmin ? handleLogout() : setShowAdminLoginModal(true)))}
              className="flex items-center gap-2 text-left group cursor-pointer"
              title={isAdmin ? 'ออกจากโหมด Admin' : 'เข้าสู่โหมด Admin'}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors shrink-0 ${
                  isAdmin
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200'
                }`}
              >
                {isAdmin ? 'AD' : 'TC'}
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1 leading-tight">
                  <span className="text-xs font-semibold text-gray-800">
                    {isAdmin ? 'Admin' : 'Teacher'}
                  </span>
                  {isAdmin ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ) : null}
                </div>
                <span className="text-[10px] text-gray-400 block leading-tight">
                  {isAdmin ? 'สิทธิ์แก้ไขเต็ม' : 'คลิกเพื่อล็อกอิน'}
                </span>
              </div>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={onAdminToggle || handleLogout}
                title="ออกจากโหมดแอดมิน"
                className="text-gray-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            {/* Settings button */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all cursor-pointer"
              title="การตั้งค่าระบบและโปรไฟล์คุณครู"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Admin Login Modal */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-emerald-100 relative">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-slate-800">เข้าสู่ระบบผู้ดูแล (Admin)</h3>
            <p className="text-xs text-center text-slate-500 mb-5">
              ค่าเริ่มต้นระบบ: <span className="font-semibold text-emerald-700">Admin</span> / รหัสผ่าน:{' '}
              <span className="font-semibold text-emerald-700">456789</span>
            </p>

            {loginError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">User ID</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm outline-hidden"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสผ่าน (Password)</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่าน (เริ่มต้น 456789)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm outline-hidden"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminLoginModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm shadow-emerald-200"
                >
                  เข้าสู่ระบบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
