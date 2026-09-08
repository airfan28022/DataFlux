import React, { useState } from 'react';
import { TeacherProfile } from '../types';
import { dataService } from '../services/dataService';
import {
  Settings,
  KeyRound,
  User,
  X,
  CheckCircle2,
  ShieldCheck,
  CloudCheck
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState<TeacherProfile>(dataService.getProfile());
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  if (!isOpen) return null;

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    dataService.saveProfile(profile);
    onClose();
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!dataService.verifyAdminPassword(currentPasswordInput)) {
      setPasswordMsg({ text: 'รหัสผ่านปัจจุบันไม่ถูกต้อง', isError: true });
      return;
    }

    if (!newPasswordInput || newPasswordInput.length < 4) {
      setPasswordMsg({ text: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร', isError: true });
      return;
    }

    if (!newPasswordInput !== !confirmPasswordInput && newPasswordInput !== confirmPasswordInput) {
      setPasswordMsg({ text: 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน', isError: true });
      return;
    }

    dataService.saveProfile({ adminPasswordHash: newPasswordInput });
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setPasswordMsg({ text: 'เปลี่ยนรหัสผ่าน Admin สำเร็จเรียบร้อยแล้ว!', isError: false });
    setTimeout(() => {
      onClose();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-emerald-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm shadow-emerald-200">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">ตั้งค่าระบบและบัญชีครู</h3>
              <p className="text-xs text-slate-500">จัดการข้อมูลประจำชั้นและรหัสผ่านผู้ดูแลระบบ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3.5 border-b-2 font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="w-4 h-4" /> ข้อมูลครู & ห้องเรียน
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`py-3 px-3.5 border-b-2 font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'password'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <KeyRound className="w-4 h-4" /> เปลี่ยนรหัสผ่าน Admin
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-sm text-slate-700">
          {/* TAB 1: Profile */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อ-สกุล ครูผู้ใช้งาน</label>
                  <input
                    type="text"
                    value={profile.teacherName}
                    onChange={(e) => setProfile({ ...profile, teacherName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อโรงเรียน</label>
                  <input
                    type="text"
                    value={profile.schoolName}
                    onChange={(e) => setProfile({ ...profile, schoolName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชั้น / ห้องเรียน</label>
                  <input
                    type="text"
                    value={profile.classroomName}
                    onChange={(e) => setProfile({ ...profile, classroomName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ปีการศึกษา</label>
                  <input
                    type="text"
                    value={profile.academicYear}
                    onChange={(e) => setProfile({ ...profile, academicYear: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm shadow-emerald-200 transition-colors cursor-pointer"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Password Change */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md mx-auto">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>รหัสผ่านเริ่มต้นสำหรับ Admin คือ <strong className="text-emerald-700">456789</strong></span>
              </div>

              {passwordMsg && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
                    passwordMsg.isError
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  {passwordMsg.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสผ่านปัจจุบัน</label>
                <input
                  type="password"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  placeholder="กรอกรหัสผ่านปัจจุบัน (เริ่มต้น 456789)"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสผ่านใหม่ (New Password)</label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="อย่างน้อย 4 ตัวอักษร"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
                <input
                  type="password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm outline-hidden"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm shadow-emerald-200 transition-colors cursor-pointer"
                >
                  อัปเดตรหัสผ่าน Admin
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Clean Background Services Indicator */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>ระบบหลังบ้านเชื่อมต่อ Google Sheets และ Drive ทำงานอัตโนมัติ</span>
          </div>
          <span className="text-[11px] text-slate-400">Security Encrypted</span>
        </div>
      </div>
    </div>
  );
};
