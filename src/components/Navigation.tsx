import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Users,
  PiggyBank,
  FileSpreadsheet
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  onTabChange?: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  onTabChange
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'แดชบอร์ดหลัก',
      code: 'HOME',
      icon: LayoutDashboard,
      badge: '',
    },
    {
      id: 'weight-height',
      label: 'น้ำหนัก - ส่วนสูง',
      code: 'PAGE 1',
      icon: Activity,
      badge: 'ชั่ง-วัด',
    },
    {
      id: 'students',
      label: 'ข้อมูลนักเรียน',
      code: 'PAGE 2',
      icon: Users,
      badge: 'ทะเบียน',
    },
    {
      id: 'bank-attendance',
      label: 'เงินฝาก & เช็คชื่อ',
      code: 'PAGE 3',
      icon: PiggyBank,
      badge: 'รายวัน',
    },
    {
      id: 'scores',
      label: 'กรอกคะแนน & ตัดเกรด',
      code: 'PAGE 4',
      icon: FileSpreadsheet,
      badge: 'ประเมิน',
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
    <nav className="bg-white border-b border-emerald-100 shadow-2xs sticky top-16 z-30 shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex space-x-1 sm:space-x-1.5 overflow-x-auto py-1.5 scrollbar-none items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-gray-600 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-emerald-600'}`} />
                <span>{item.label}</span>
                {item.code && item.code !== 'HOME' && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded transition-colors ${
                      isActive
                        ? 'bg-emerald-700 text-emerald-100'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {item.code}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
