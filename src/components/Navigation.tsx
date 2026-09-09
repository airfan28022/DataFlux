import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Activity,
  Users,
  PiggyBank,
  FileSpreadsheet,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  Settings,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { TeacherProfile, Student } from '../types';

interface NavigationProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  onTabChange?: (tab: string) => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  onTabChange,
  onOpenSettings,
  onLogout,
}) => {
  const [profile, setProfile] = useState<TeacherProfile>(dataService.getProfile());
  const [students, setStudents] = useState<Student[]>(dataService.getStudents());

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setProfile(dataService.getProfile());
      setStudents(dataService.getStudents());
    });
    return unsub;
  }, []);

  const totalStudents = students.length;
  const maleCount = students.filter((s) => s.gender === 'male' || s.prefix === 'ด.ช.' || s.prefix === 'นาย').length;
  const femaleCount = students.filter((s) => s.gender === 'female' || s.prefix === 'ด.ญ.' || s.prefix === 'นางสาว').length;
  const totalSavings = students.reduce((sum, s) => sum + (s.currentSavings || 0), 0);

  // Today attendance
  const todayStr = new Date().toISOString().slice(0, 10);
  const allAtt = dataService.getAllAttendanceAndBank();
  const todayAtt = allAtt[todayStr]?.attendance || {};
  const presentCount = Object.values(todayAtt).filter((v) => v === 'present').length || totalStudents;

  const navItems = [
    {
      id: 'dashboard',
      label: 'แดชบอร์ดหลัก',
      shortLabel: 'แดชบอร์ด',
      icon: LayoutDashboard,
      desc: 'ภาพรวม & ปฏิทินกิจกรรม',
    },
    {
      id: 'weight-height',
      label: 'น้ำหนัก - ส่วนสูง',
      shortLabel: 'น้ำหนัก/สูง',
      icon: Activity,
      desc: 'ตรวจวัด & วิเคราะห์ BMI',
    },
    {
      id: 'bank-attendance',
      label: 'เงินฝาก & เช็คชื่อ',
      shortLabel: 'เงินฝาก/ชื่อ',
      icon: PiggyBank,
      desc: 'ธนาคาร & เช็คชื่อประจำวัน',
    },
    {
      id: 'scores',
      label: 'กรอกคะแนน & ตัดเกรด',
      shortLabel: 'ตัดเกรด',
      icon: FileSpreadsheet,
      desc: 'ประเมินตัวชี้วัด & GPA',
    },
    {
      id: 'students',
      label: 'ข้อมูลนักเรียน',
      shortLabel: 'ข้อมูล นร.',
      icon: Users,
      desc: 'ทะเบียน & บันทึกสุขภาพ',
    },
  ];

  const handleTabClick = (id: string) => {
    if (typeof setActiveTab === 'function') {
      setActiveTab(id);
    }
    if (typeof onTabChange === 'function') {
      onTabChange(id);
    }
  };

  return (
    <>
      {/* Left Sidebar Navigation (Tablet & Desktop only: md:flex, sticky h-screen) */}
      <aside className="hidden md:flex md:w-64 lg:w-72 xl:w-80 shrink-0 bg-gradient-to-b from-emerald-900 via-[#064E3B] to-[#022c22] text-white border-r border-emerald-700/50 shadow-xl md:sticky md:top-0 md:h-screen flex-col justify-between z-30 overflow-y-auto scrollbar-none select-none">
      {/* Top Branding Section */}
      <div className="p-4 sm:p-5 border-b border-emerald-700/40 bg-emerald-950/40">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-950/50 shrink-0 border border-emerald-300/40">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-white tracking-tight leading-tight truncate">
              ระบบข้อมูลครูประจำชั้น
            </h1>
            <p className="text-[11px] text-emerald-300 font-medium truncate mt-0.5">
              {profile.schoolName || 'โรงเรียนสาธิต'}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] bg-emerald-700/80 text-emerald-100 px-2 py-0.5 rounded-md font-semibold border border-emerald-600/60">
                {profile.classroomName || 'ห้อง ป.6/1'}
              </span>
              <span className="text-[10px] text-emerald-300/80">
                ปี {profile.academicYear || '2569'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Navigation Items & Summary Section */}
      <div className="p-3 sm:p-4 space-y-5 flex-1">
        {/* Navigation List */}
        <div>
          <p className="text-[10px] font-bold text-emerald-300/70 uppercase tracking-wider px-3 mb-2">
            เมนูหลักของระบบ
          </p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer group text-left ${
                    isActive
                      ? 'bg-emerald-500/25 text-white font-bold border-l-4 border-emerald-400 shadow-md shadow-emerald-950/30 backdrop-blur-xs'
                      : 'text-emerald-100/75 hover:text-white hover:bg-emerald-800/40 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-emerald-800/60 text-emerald-200 group-hover:bg-emerald-700 group-hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate font-semibold leading-tight">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-emerald-300/60 block truncate font-normal">
                        {item.desc}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary Card Box (Req: ใส่ข้อความสรุปๆ เพื่อให้หน้าเต็มและสวยงาม) */}
        <div className="bg-emerald-950/60 border border-emerald-700/50 rounded-2xl p-3.5 space-y-3 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-800/60">
            <span className="text-[11px] font-bold text-emerald-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>สรุปภาพรวมห้องเรียน</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="ระบบพร้อมใช้งาน" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-emerald-900/40 p-2 rounded-xl border border-emerald-800/40">
              <span className="text-[10px] text-emerald-300/80 block">นักเรียนทั้งหมด</span>
              <span className="text-sm font-black text-white">{totalStudents} คน</span>
              <span className="text-[9px] text-emerald-400/90 block mt-0.5">
                (ช {maleCount} / ญ {femaleCount})
              </span>
            </div>

            <div className="bg-emerald-900/40 p-2 rounded-xl border border-emerald-800/40">
              <span className="text-[10px] text-emerald-300/80 block">ยอดเงินออมรวม</span>
              <span className="text-sm font-black text-amber-300">
                ฿ {totalSavings >= 1000 ? `${(totalSavings / 1000).toFixed(1)}k` : totalSavings}
              </span>
              <span className="text-[9px] text-emerald-300/70 block mt-0.5">
                {totalSavings.toLocaleString()} บาท
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] text-emerald-100/90 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-emerald-300/70">เช็คชื่อวันนี้:</span>
              <span className="font-semibold text-emerald-200">
                มาเรียน {presentCount} / {totalStudents} คน
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-emerald-300/70">Google Sheets:</span>
              <span className="text-emerald-300 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                <span>ซิงค์อัตโนมัติ</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-emerald-300/70">โหมดการทำงาน:</span>
              <span className="text-emerald-200 font-medium">ครูประจำชั้น (Admin)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Profile & Actions Footer */}
      <div className="p-3 sm:p-4 border-t border-emerald-700/50 bg-emerald-950/70 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0 border border-emerald-400/30">
              {profile.teacherName ? profile.teacherName.charAt(0) : 'T'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {profile.teacherName || 'คุณครูประจำชั้น'}
              </p>
              <p className="text-[10px] text-emerald-300/80 truncate">
                {profile.schoolName || 'โรงเรียนสาธิต'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1.5 text-emerald-300 hover:text-white hover:bg-emerald-800/60 rounded-lg transition-colors cursor-pointer"
                title="ตั้งค่าระบบ"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 text-rose-300 hover:text-rose-100 hover:bg-rose-900/50 rounded-lg transition-colors cursor-pointer"
                title="ออกจากระบบ"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>

    {/* Mobile Bottom Navigation Bar (Mobile only: < md, fixed at bottom, persists and does not scroll away) */}
    <nav
      aria-label="เมนูหลักสำหรับมือถือ"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-emerald-100/90 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] px-1.5 pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom,0.45rem))] select-none"
    >
      <div className="grid grid-cols-5 gap-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabClick(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer relative active:scale-95 ${
                isActive
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-emerald-600 font-medium'
              }`}
            >
              {/* Active top pill indicator */}
              {isActive && (
                <span className="absolute -top-1.5 w-8 h-1 bg-emerald-600 rounded-full shadow-xs" />
              )}
              <div
                className={`w-9 h-7 rounded-lg flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-emerald-100/80 text-emerald-700 shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-tight mt-0.5 whitespace-nowrap">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  </>
  );
};
