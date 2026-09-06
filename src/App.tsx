import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { ToastContainer } from './components/ToastContainer';
import { SweetAlertModal } from './components/SweetAlertModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { SettingsModal } from './components/SettingsModal';
import { DashboardView } from './views/DashboardView';
import { WeightHeightView } from './views/WeightHeightView';
import { StudentRecordsView } from './views/StudentRecordsView';
import { BankAttendanceView } from './views/BankAttendanceView';
import { GradeScoreView } from './views/GradeScoreView';
import { dataService } from './services/dataService';
import { TeacherProfile } from './types';
import { formatThaiDateTime } from './utils/helpers';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isAdmin, setIsAdmin] = useState<boolean>(dataService.getIsAdmin());
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [profile, setProfile] = useState<TeacherProfile>(dataService.getProfile());

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setIsAdmin(dataService.getIsAdmin());
      setProfile(dataService.getProfile());
    });
    return unsub;
  }, []);

  const handleAdminToggle = () => {
    if (isAdmin) {
      dataService.logoutAdmin();
    } else {
      setShowAdminLogin(true);
    }
  };

  const lastModifiedFormatted = profile.lastModifiedTimestamp
    ? formatThaiDateTime(profile.lastModifiedTimestamp).replace(/.*เวลา\s*/, '')
    : 'ไม่มีข้อมูล';

  return (
    <div className="min-h-screen bg-[#F8FAFB] text-gray-800 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900 antialiased overflow-x-hidden">
      {/* High Density Header */}
      <Header
        isAdmin={isAdmin}
        onAdminToggle={handleAdminToggle}
        onOpenSettings={() => setShowSettings(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* High Density Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content Area */}
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
          <span>Google Drive Folder ID:</span>
          <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] border border-emerald-100">
            {profile.driveFolderId || '1nymxjSukQ_exIWuN6HRehXRTFrPrfekP'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-gray-400">
          <span className="hidden sm:inline">Version 2.4.0 (Stable)</span>
          <span className="flex items-center gap-1.5 text-gray-500 font-medium">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span>แก้ไขล่าสุด: {lastModifiedFormatted}</span>
          </span>
        </div>
      </footer>

      {/* Modals and Global Overlays */}
      <AdminLoginModal
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <ToastContainer />
      <SweetAlertModal />
    </div>
  );
}
