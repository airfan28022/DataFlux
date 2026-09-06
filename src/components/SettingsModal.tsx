import React, { useState } from 'react';
import { TeacherProfile } from '../types';
import { dataService } from '../services/dataService';
import { GAS_CODE_TEMPLATE } from '../services/gasCodeTemplate';
import { DEFAULT_DRIVE_FOLDER_ID } from '../utils/helpers';
import {
  Settings,
  KeyRound,
  User,
  School,
  HardDrive,
  Code,
  Download,
  Upload,
  Check,
  Copy,
  X,
  ExternalLink,
  RefreshCw,
  Sparkles
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

  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'gas' | 'backup'>('profile');
  const [copiedGasCode, setCopiedGasCode] = useState(false);
  const [isTestingGas, setIsTestingGas] = useState(false);

  if (!isOpen) return null;

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    dataService.saveProfile(profile);
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

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordMsg({ text: 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน', isError: true });
      return;
    }

    dataService.saveProfile({ adminPasswordHash: newPasswordInput });
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setPasswordMsg({ text: 'เปลี่ยนรหัสผ่าน Admin สำเร็จเรียบร้อยแล้ว!', isError: false });
  };

  const handleCopyGasCode = () => {
    navigator.clipboard.writeText(GAS_CODE_TEMPLATE);
    setCopiedGasCode(true);
    dataService.notifyToast('success', 'คัดลอกโค้ด GAS สำเร็จ', 'นำโค้ดไปวางใน Google Apps Script ได้ทันที');
    setTimeout(() => setCopiedGasCode(false), 3000);
  };

  const handleTestGas = async () => {
    if (!profile.gasWebAppUrl) {
      dataService.notifyToast('warning', 'กรุณาระบุ URL ของ Google Apps Script Web App ก่อนทดสอบ');
      return;
    }
    setIsTestingGas(true);
    await dataService.syncWithGoogleAppsScript();
    setIsTestingGas(false);
  };

  const handleExportBackup = () => {
    const json = dataService.exportDatabaseJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_classroom_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    dataService.notifyToast('success', 'สำรองข้อมูลสำเร็จ', 'ดาวน์โหลดไฟล์ JSON สำรองข้อมูลเรียบร้อยแล้ว');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        if (confirm('การนำเข้าข้อมูลจะเขียนทับข้อมูลปัจจุบัน คุณต้องการดำเนินการต่อหรือไม่?')) {
          dataService.importDatabaseJson(content);
          setProfile(dataService.getProfile());
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-emerald-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm shadow-emerald-200">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">ตั้งค่าระบบและการเชื่อมต่อ</h3>
              <p className="text-xs text-slate-500">จัดการข้อมูลครูประจำชั้น รหัสผ่าน และการเชื่อมต่อ Google</p>
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
          <button
            onClick={() => setActiveTab('gas')}
            className={`py-3 px-3.5 border-b-2 font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'gas'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <HardDrive className="w-4 h-4" /> Google Drive & Sheets (GAS)
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-3.5 border-b-2 font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Download className="w-4 h-4" /> สำรองข้อมูล (Backup)
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
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm shadow-emerald-200 transition-colors"
                >
                  บันทึกการเปลี่ยนแปลง
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Password Change */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <p className="text-xs text-slate-500">
                รหัสผ่านเริ่มต้นสำหรับ Admin: <span className="font-semibold text-emerald-700">456789</span>
              </p>

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
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm shadow-emerald-200 transition-colors"
                >
                  อัปเดตรหัสผ่าน Admin
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Google Apps Script & Drive */}
          {activeTab === 'gas' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-xs space-y-2">
                <div className="font-semibold text-emerald-900 flex items-center gap-1.5 text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> ข้อมูลการเชื่อมต่อ Google Workspace
                </div>
                <p className="text-emerald-800">
                  ระบบได้ตั้งค่าโฟลเดอร์สำหรับจัดเก็บรูปภาพ Google Drive เริ่มต้นไว้ที่ Folder ID:
                  <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200 ml-1">
                    {DEFAULT_DRIVE_FOLDER_ID}
                  </span>
                </p>
                <p className="text-slate-600">
                  ท่านสามารถคัดลอกโค้ด Google Apps Script (Code.gs) ด้านล่างไปสร้าง Web App เพื่อเชื่อมโยงฐานข้อมูล Google Sheets ให้ซิงค์ข้อมูลจริงได้ทันที
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Apps Script Web App URL (ถ้ามี)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={profile.gasWebAppUrl}
                    onChange={(e) => setProfile({ ...profile, gasWebAppUrl: e.target.value })}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-xs font-mono outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleTestGas}
                    disabled={isTestingGas}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingGas ? 'animate-spin' : ''}`} />
                    <span>ทดสอบเชื่อมต่อ</span>
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-900 text-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Code className="w-4 h-4" /> โค้ด Google Apps Script (Code.gs) พร้อมใช้งาน
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyGasCode}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                  >
                    {copiedGasCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedGasCode ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ด'}</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono max-h-48 overflow-y-auto text-slate-300 p-2 bg-slate-950 rounded-xl border border-slate-800">
                  {GAS_CODE_TEMPLATE}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: Backup & Restore */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                ระบบจัดเก็บข้อมูลใน Local Cache ที่รวดเร็วและปลอดภัย ท่านสามารถดาวน์โหลดไฟล์สำรองข้อมูล JSON เก็บไว้ หรือนำเข้าเพื่อกู้คืนข้อมูลได้ตลอดเวลา
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                    <Download className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">ส่งออกข้อมูลสำรอง (Export JSON)</h4>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    ดาวน์โหลดข้อมูลทั้งหมด: นักเรียน, น้ำหนัก-ส่วนสูง, ออมทรัพย์, คะแนน, กิจกรรม
                  </p>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-colors"
                  >
                    ดาวน์โหลดไฟล์ Backup
                  </button>
                </div>

                <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">นำเข้าข้อมูลสำรอง (Import JSON)</h4>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    เลือกไฟล์ JSON ที่เคยดาวน์โหลดไว้ เพื่อกู้คืนข้อมูลสู่ระบบ
                  </p>
                  <label className="w-full py-2 bg-white border border-slate-300 hover:border-emerald-500 text-slate-700 rounded-xl text-xs font-medium text-center transition-colors cursor-pointer">
                    เลือกไฟล์ .json
                    <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
