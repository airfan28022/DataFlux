import React, { useState, useEffect } from 'react';
import { TeacherProfile } from '../types';
import { dataService } from '../services/dataService';
import { MemberManagement } from './MemberManagement';
import {
  Settings,
  KeyRound,
  User,
  Users,
  X,
  CheckCircle2,
  ShieldCheck,
  Building,
  School
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState<TeacherProfile>(() => dataService.getProfile());
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const isAdmin = dataService.isAdmin();
  const membersCount = dataService.getMembers().length;
  const currentUserId = dataService.getCurrentUserId();
  const currentUser = dataService.getCurrentUser();

  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'members'>(
    isAdmin ? 'members' : 'profile'
  );

  // Sync profile & active tab every time modal opens or data changes
  useEffect(() => {
    if (isOpen) {
      setProfile(dataService.getProfile());
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setPasswordMsg(null);
      setActiveTab(dataService.isAdmin() ? 'members' : 'profile');
    }
  }, [isOpen]);

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      if (isOpen) {
        setProfile(dataService.getProfile());
      }
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    dataService.saveProfile(profile);
    onClose();
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    const isCurrentValid = isAdmin
      ? dataService.verifyAdminPassword(currentPasswordInput)
      : (currentUser?.password === currentPasswordInput.trim() || currentPasswordInput.trim() === profile.adminPasswordHash);

    if (!isCurrentValid) {
      setPasswordMsg({ text: 'รหัสผ่านปัจจุบันไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง', isError: true });
      return;
    }

    if (!newPasswordInput || newPasswordInput.length < 4) {
      setPasswordMsg({ text: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร', isError: true });
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordMsg({ text: 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน', isError: true });
      return;
    }

    dataService.saveProfile({ adminPasswordHash: newPasswordInput });
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setPasswordMsg({
      text: isAdmin ? 'เปลี่ยนรหัสผ่าน Admin สำเร็จเรียบร้อยแล้ว!' : 'เปลี่ยนรหัสผ่านของคุณสำเร็จเรียบร้อยแล้ว!',
      isError: false,
    });
    setTimeout(() => {
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className={`bg-white rounded-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-emerald-100 overflow-hidden transition-all duration-300 ${
        activeTab === 'members' ? 'max-w-4xl' : 'max-w-xl'
      }`}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm shadow-emerald-200">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">ตั้งค่าระบบและบัญชีครู</h3>
              <p className="text-xs text-slate-500">จัดการข้อมูลประจำชั้น จัดการสมาชิก รหัสผ่าน และระบบหลังบ้าน</p>
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
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 text-xs font-medium overflow-x-auto">
          {isAdmin && (
            <button
              onClick={() => setActiveTab('members')}
              className={`py-3 px-3.5 border-b-2 font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'members'
                  ? 'border-emerald-600 text-emerald-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>จัดการสมาชิก</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                {membersCount}
              </span>
            </button>
          )}
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
            <KeyRound className="w-4 h-4" /> {isAdmin ? 'เปลี่ยนรหัสผ่าน Admin' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-sm text-slate-700">
          {/* TAB 0: Members Management (Admin Only) */}
          {activeTab === 'members' && isAdmin && (
            <MemberManagement />
          )}

          {/* TAB 1: Profile */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSave} className="space-y-4">
              {/* Account badge & isolation notice */}
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-bold text-emerald-950">
                    บัญชี: <span className="font-mono text-emerald-700">{currentUserId}</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    isAdmin
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-emerald-800 border border-emerald-300'
                  }`}>
                    {isAdmin ? 'ผู้ดูแลระบบ (Admin)' : 'คุณครูประจำชั้น (สมาชิก)'}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700/90 font-medium">
                  *ข้อมูลโปรไฟล์แยกเฉพาะบุคคล ไม่กระทบผู้ใช้งานท่านอื่น
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อ-สกุล ครูผู้ใช้งาน</label>
                  <input
                    type="text"
                    value={profile.teacherName || ''}
                    onChange={(e) => setProfile({ ...profile, teacherName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ตำแหน่ง</label>
                  <input
                    type="text"
                    value={profile.position || ''}
                    onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm outline-hidden"
                    placeholder="เช่น ครูชำนาญการ, ครูประจำชั้น"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>โรงเรียน</span>
                    <span className="text-[10px] text-emerald-600 font-normal">แยกตามผู้ใช้</span>
                  </label>
                  <input
                    type="text"
                    value={profile.schoolName || ''}
                    onChange={(e) => setProfile({ ...profile, schoolName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm outline-hidden"
                    placeholder="กรอกชื่อโรงเรียน"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">สังกัด (สพป./สพม.)</label>
                  <input
                    type="text"
                    value={profile.affiliation || ''}
                    onChange={(e) => setProfile({ ...profile, affiliation: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm outline-hidden"
                    placeholder="เช่น สพป. เชียงใหม่ เขต 1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>ชั้นเรียนประจำ</span>
                    <span className="text-[10px] text-emerald-600 font-normal">แยกตามผู้ใช้</span>
                  </label>
                  <input
                    type="text"
                    value={profile.classroomName || ''}
                    onChange={(e) => setProfile({ ...profile, classroomName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm outline-hidden"
                    placeholder="เช่น ประถมศึกษาปีที่ 5/1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>ปีการศึกษา</span>
                    <span className="text-[10px] text-emerald-600 font-normal">แยกตามผู้ใช้</span>
                  </label>
                  <input
                    type="text"
                    value={profile.academicYear || ''}
                    onChange={(e) => setProfile({ ...profile, academicYear: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm outline-hidden"
                    placeholder="เช่น 2569"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm shadow-emerald-200 transition-colors cursor-pointer"
                >
                  บันทึกข้อมูลครู
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Change Password */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md mx-auto">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  {isAdmin ? 'รหัสผ่าน Admin สำหรับการจัดการระบบ' : `เปลี่ยนรหัสผ่านสำหรับผู้ใช้ (${currentUserId})`}
                </p>
                <p>
                  {isAdmin
                    ? 'ใช้สำหรับเข้าสู่ระบบในฐานะ Admin และยืนยันการทำรายการสำคัญ'
                    : 'ใช้สำหรับเข้าสู่ระบบบัญชีของคุณในครั้งต่อไป'}
                </p>
              </div>

              {passwordMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    passwordMsg.isError
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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
                  placeholder="กรอกรหัสผ่านปัจจุบัน"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-sm outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสผ่านใหม่</label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่อย่างน้อย 4 ตัวอักษร"
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
                  {isAdmin ? 'อัปเดตรหัสผ่าน Admin' : 'อัปเดตรหัสผ่านใหม่'}
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
          <span className="text-[11px] text-slate-400 font-mono">Cloud Sync Active</span>
        </div>
      </div>
    </div>
  );
};
