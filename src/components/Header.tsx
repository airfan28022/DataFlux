import React, { useState, useEffect } from 'react';
import { formatThaiDate } from '../utils/helpers';
import { dataService } from '../services/dataService';
import { TeacherProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import {
  GraduationCap,
  Settings,
  LogOut,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  isAdmin?: boolean;
  onAdminToggle?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  activeTab,
  setActiveTab,
  isAdmin: propIsAdmin,
  onAdminToggle,
  onLogout
}) => {
  const [profile, setProfile] = useState<TeacherProfile>(dataService.getProfile());
  const [isAdmin, setIsAdmin] = useState<boolean>(
    propIsAdmin !== undefined ? propIsAdmin : dataService.isAdmin()
  );
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('synced');

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

    const unsubSync = dataService.subscribeSyncStatus((status) => {
      setSyncStatus(status);
    });

    return () => {
      clearInterval(timer);
      unsubscribe();
      unsubSync();
    };
  }, []);

  const handleUserLogout = () => {
    if (onLogout) {
      onLogout();
    } else if (onAdminToggle) {
      onAdminToggle();
    } else {
      dataService.logoutAdmin();
    }
  };

  const timeString = currentTime.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateString = formatThaiDate(currentTime);

  return (
    <header className="h-16 bg-white border-b border-emerald-100 flex items-center justify-between px-4 sm:px-8 shadow-xs shrink-0 sticky top-0 z-40">
      {/* Left: Logo & Classroom info */}
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => setActiveTab && setActiveTab('dashboard')}
      >
        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0">
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

      {/* Right side: Auto-sync indicator, Clock, Admin user pill, Logout, Settings */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* PWA Install Button */}
        <PWAInstallButton variant="header" />

        {/* Automatic Google Sheets Sync Status (No manual button) */}
        <div
          className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl border transition-all select-none ${
            syncStatus === 'syncing'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
          }`}
          title="ระบบซิงค์ข้อมูลกับ Google Sheets อัตโนมัติเมื่อมีการเพิ่ม แก้ไข หรือลบข้อมูล"
        >
          {syncStatus === 'syncing' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              <span className="hidden md:inline">กำลังซิงค์ Sheets...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">ซิงค์ Sheets อัตโนมัติ</span>
            </>
          )}
        </div>

        {/* Real-time Clock */}
        <div className="text-right hidden md:block pl-1">
          <p className="text-sm font-semibold text-gray-700 tabular-nums leading-tight">
            {timeString}
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">
            {dateString}
          </p>
        </div>

        {/* Admin User pill with direct Logout */}
        <div className="flex items-center gap-2 border-l border-gray-100 pl-2 sm:pl-4">
          <div className="flex items-center gap-2 text-left">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
              AF
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1 leading-tight">
                <span className="text-xs font-semibold text-gray-800">
                  airfan
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <span className="text-[10px] text-emerald-600 block leading-tight font-medium">
                Admin (เข้าสู่ระบบแล้ว)
              </span>
            </div>
          </div>

          {/* Logout button */}
          <button
            type="button"
            onClick={handleUserLogout}
            title="ออกจากระบบ (สลับกลับไปหน้า Login)"
            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Settings button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all cursor-pointer"
            title="การตั้งค่าระบบและโปรไฟล์คุณครู"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
