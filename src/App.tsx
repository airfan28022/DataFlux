import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { ToastContainer } from './components/ToastContainer';
import { SweetAlertModal } from './components/SweetAlertModal';
import { SettingsModal } from './components/SettingsModal';
import { DashboardView } from './views/DashboardView';
import { WeightHeightView } from './views/WeightHeightView';
import { StudentRecordsView } from './views/StudentRecordsView';
import { BankAttendanceView } from './views/BankAttendanceView';
import { GradeScoreView } from './views/GradeScoreView';
import { LoginView } from './views/LoginView';
import { dataService } from './services/dataService';
import { TeacherProfile } from './types';
import { formatThaiDateTime } from './utils/helpers';
import { CheckCircle2, X } from 'lucide-react';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity

export default function App() {
  // REQUIREMENT 1: Must be on Login page on every entry/refresh. Never auto-login.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [inactivityNotice, setInactivityNotice] = useState<string | null>(null);
  const [showLoginSuccessNotice, setShowLoginSuccessNotice] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [profile, setProfile] = useState<TeacherProfile>(dataService.getProfile());

  const lastActivityTimestamp = useRef<number>(Date.now());

  // Reset admin state on initial load to guarantee login wall on every fresh entry
  useEffect(() => {
    dataService.setAdminLoggedIn(false);
  }, []);

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setIsAdmin(dataService.getIsAdmin());
      setProfile(dataService.getProfile());
    });
    return unsub;
  }, []);

  const handleLoginSuccess = () => {
    lastActivityTimestamp.current = Date.now();
    setInactivityNotice(null);
    setIsAuthenticated(true);
    setIsAdmin(true);
    setShowLoginSuccessNotice(true);
    setTimeout(() => {
      setShowLoginSuccessNotice(false);
    }, 1400); // แสดงแปปเดียวและหายทันที
  };

  const handleLogout = useCallback((reason?: 'manual' | 'inactivity') => {
    dataService.logoutAdmin();
    setIsAuthenticated(false);
    setIsAdmin(false);
    if (reason === 'inactivity') {
      setInactivityNotice('ไม่มีการเคลื่อนไหวบนเว็บไซต์เกิน 15 นาที ระบบจึงนำท่านกลับสู่หน้าเข้าสู่ระบบเพื่อความปลอดภัย');
    } else {
      setInactivityNotice(null);
    }
  }, []);

  // REQUIREMENT 1 (cont.): 15-minute inactivity tracker
  useEffect(() => {
    if (!isAuthenticated) return;

    lastActivityTimestamp.current = Date.now();

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleUserActivity = () => {
      lastActivityTimestamp.current = Date.now();
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    const intervalId = setInterval(() => {
      const inactiveDuration = Date.now() - lastActivityTimestamp.current;
      if (inactiveDuration >= INACTIVITY_TIMEOUT_MS) {
        handleLogout('inactivity');
      }
    }, 10000); // verify every 10 seconds

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(intervalId);
    };
  }, [isAuthenticated, handleLogout]);

  const lastModifiedFormatted = profile.lastModifiedTimestamp
    ? formatThaiDateTime(profile.lastModifiedTimestamp).replace(/.*เวลา\s*/, '')
    : 'ไม่มีข้อมูล';

  // If not authenticated, ALWAYS display the Login screen
  if (!isAuthenticated) {
    return (
      <>
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          inactivityNotice={inactivityNotice}
        />
        <ToastContainer />
        <SweetAlertModal />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB] text-gray-800 flex flex-col md:flex-row font-sans selection:bg-emerald-100 selection:text-emerald-900 antialiased">
      {/* Centered Login Success Alert (แสดงข้อความ "เข้าสู่ระบบสำเร็จ" ตรงกลางเว็ปเลย แสดงแปปเดียวและหายทันที) */}
      {showLoginSuccessNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs pointer-events-none transition-all duration-300 animate-fade-in">
          <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/15 max-w-xs w-full flex flex-col items-center text-center transform transition-all animate-bounce-short">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-500/30 mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              เข้าสู่ระบบสำเร็จ
            </h3>
            <p className="text-xs text-slate-300 mt-1.5 font-medium">
              ยินดีต้อนรับคุณครู{profile.teacherName ? ` ${profile.teacherName}` : ''} เข้าสู่ระบบ
            </p>
          </div>
        </div>
      )}

      {/* Left Sidebar Navigation (Sticky h-screen on tablet & desktop, emerald green theme) */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setShowSettings(true)}
        onLogout={() => handleLogout('manual')}
      />

      {/* Main Right Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          isAdmin={isAdmin}
          onAdminToggle={() => handleLogout('manual')}
          onLogout={() => handleLogout('manual')}
          onOpenSettings={() => setShowSettings(true)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Content Body */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          {activeTab === 'dashboard' && (
            <DashboardView onNavigate={setActiveTab} isAdmin={isAdmin} />
          )}
          {activeTab === 'weight-height' && (
            <WeightHeightView isAdmin={isAdmin} />
          )}
          {activeTab === 'students' && (
            <StudentRecordsView isAdmin={isAdmin} />
          )}
          {activeTab === 'bank-attendance' && (
            <BankAttendanceView isAdmin={isAdmin} />
          )}
          {activeTab === 'scores' && (
            <GradeScoreView isAdmin={isAdmin} />
          )}
        </main>

        {/* High Density Footer */}
        <footer className="h-10 sm:h-11 bg-white border-t border-emerald-100 flex flex-wrap items-center justify-between px-4 sm:px-8 text-[10px] sm:text-[11px] text-gray-400 shrink-0 mt-auto gap-2">
          <div className="flex items-center gap-2">
            <span>ระบบหลังบ้านเชื่อมต่อ Google Drive & Sheets อัตโนมัติ</span>
            <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] border border-emerald-100">
              Auto-Sync Active
            </span>
          </div>

          <div className="flex items-center gap-4 text-gray-400">
            <span className="hidden sm:inline">Version 2.5.0 (Cloudflare Ready)</span>
            <span className="flex items-center gap-1.5 text-gray-500 font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>แก้ไขล่าสุด: {lastModifiedFormatted}</span>
            </span>
          </div>
        </footer>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <ToastContainer />
      <SweetAlertModal />
    </div>
  );
}
