import React, { useState } from 'react';
import { dataService } from '../services/dataService';
import {
  GraduationCap,
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: () => void;
  inactivityNotice?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, inactivityNotice }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const profile = dataService.getProfile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('กรุณาระบุ User ID');
      return;
    }

    if (!password) {
      setErrorMessage('กรุณาระบุรหัสผ่าน (Password)');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const isValid = dataService.loginWithCredentials(username, password);
      if (isValid) {
        setIsSubmitting(false);
        onLoginSuccess();
      } else {
        setIsSubmitting(false);
        setErrorMessage('User ID หรือ Password ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0F172A] to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 relative overflow-hidden font-sans select-none">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 text-slate-800 relative z-10 transition-all">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3.5 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
            ระบบบริหารข้อมูลครูประจำชั้น
          </h1>
          <p className="text-xs font-semibold text-emerald-700 mt-1">
            {profile.schoolName || 'โรงเรียนอนุบาลและประถมศึกษาสาธิต'}
          </p>
          <p className="text-[11px] text-slate-500">
            {profile.classroomName || 'ห้อง ป.6/1'} | ประจำปีการศึกษา {profile.academicYear || '2569'}
          </p>
        </div>

        {/* Inactivity Notice Banner if timed out */}
        {inactivityNotice && (
          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start gap-2.5 leading-relaxed shadow-xs">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">ระบบตัดการเชื่อมต่ออัตโนมัติ</p>
              <p className="text-[11px] text-amber-700">{inactivityNotice}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium flex items-center gap-2 animate-shake shadow-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>User ID (ชื่อผู้ใช้)</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="กรอก User ID"
                autoComplete="off"
                className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-hidden transition-all bg-slate-50/50 hover:bg-white focus:bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Password (รหัสผ่าน)</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="กรอกรหัสผ่าน"
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-hidden transition-all bg-slate-50/50 hover:bg-white focus:bg-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>กำลังตรวจสอบ...</span>
                </>
              ) : (
                <>
                  <span>เข้าสู่ระบบ (Sign In)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security and Inactivity Info */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>ระบบความปลอดภัย: ต้องลงชื่อเข้าใช้ทุกครั้งที่เข้าเว็บ</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>ออกจากระบบอัตโนมัติเมื่อไม่มีการเคลื่อนไหวเกิน 15 นาที</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mt-1">
            <Sparkles className="w-3 h-3 text-teal-500 shrink-0" />
            <span>ระบบเชื่อมโยงและซิงค์ฐานข้อมูล Google Sheets อัตโนมัติ</span>
          </div>
        </div>
      </div>

      {/* System Footer Note */}
      <div className="mt-6 text-center text-xs text-slate-400 font-light">
        <p>Classroom Management System • ระบบความปลอดภัยมาตรฐาน 256-bit</p>
      </div>
    </div>
  );
};
