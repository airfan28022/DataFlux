import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  Tablet,
  CheckCircle2,
  Share2,
  PlusSquare,
  X
} from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'settings' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'settings',
  className = ''
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      {/* 1. Header Variant (if needed in future) */}
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer ${className}`}
          title="ดาวน์โหลดและติดตั้งเป็นแอปบนมือถือ/แท็บเล็ต"
        >
          <Download className="w-3.5 h-3.5 animate-bounce" />
          <span>ติดตั้งเป็นแอป</span>
        </button>
      )}

      {/* 2. Sidebar Variant (if needed in future) */}
      {variant === 'sidebar' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`w-full flex items-center justify-between p-2.5 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 rounded-xl text-xs text-white transition-all cursor-pointer group ${className}`}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/30 text-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Download className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-white text-[11px] leading-tight">ดาวน์โหลดเป็น App</p>
              <p className="text-[10px] text-emerald-300/80">ใช้งานบนมือถือ & Tablet</p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-700/60 text-emerald-200 px-1.5 py-0.5 rounded font-mono">
            PWA
          </span>
        </button>
      )}

      {/* 3. Settings Variant (Used in Settings Modal) */}
      {variant === 'settings' && (
        <div className="p-4 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 border border-emerald-200/80 rounded-2xl space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-sm border border-emerald-200 bg-[#A8CBAB] shrink-0">
                <img
                  src="/app-logo.png"
                  alt="ครู"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">ดาวน์โหลดและติดตั้งเป็น Application</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  รองรับทั้ง iPhone, iPad, Android และ Tablet เปิดใช้งานได้เต็มจอเหมือนแอปทั่วไป
                </p>
              </div>
            </div>
            {isInstalled && (
              <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                ติดตั้งแล้ว
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isInstallable ? 'คลิกเพื่อติดตั้งแอปลงเครื่องทันที' : 'ดูขั้นตอนการติดตั้งบนมือถือและแท็บเล็ต'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Detailed Modal Guide for Mobile / Tablet */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-emerald-100 overflow-hidden">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-md border border-white/40 bg-[#A8CBAB] shrink-0">
                  <img
                    src="/app-logo.png"
                    alt="ครู"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    วิธีติดตั้งเป็นแอป (PWA Application)
                  </h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    ใช้งานบนมือถือ iPhone, iPad, Android หรือ Tablet แบบเต็มจอ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* Android / Chromium direct install trigger */}
              {isInstallable && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-emerald-900 text-xs sm:text-sm">
                      อุปกรณ์ของคุณพร้อมติดตั้งทันที
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      กดปุ่มด้านล่างเพื่อเพิ่มแอปลงหน้าจอโฮม
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await install();
                      setShowModal(false);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    ติดตั้งทันที
                  </button>
                </div>
              )}

              {/* iOS / iPadOS Guide */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs sm:text-sm">
                  <Tablet className="w-4 h-4 text-blue-600" />
                  <span>สำหรับ iPhone และ iPad (Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-slate-600 text-xs pl-1">
                  <li>
                    เปิดเว็บไซต์นี้ด้วยเบราว์เซอร์ <strong>Safari</strong>
                  </li>
                  <li className="flex items-center gap-1.5 flex-wrap">
                    <span>แตะปุ่ม</span>
                    <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-semibold text-[11px]">
                      <Share2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>แชร์ (Share)</span>
                    </span>
                    <span>ที่แถบล่างหรือบนของหน้าจอ</span>
                  </li>
                  <li className="flex items-center gap-1.5 flex-wrap">
                    <span>เลื่อนลงมาแล้วแตะเลือก</span>
                    <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-semibold text-[11px]">
                      <PlusSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)</span>
                    </span>
                  </li>
                  <li>
                    แตะ <strong>"เพิ่ม" (Add)</strong> ที่มุมบนขวา
                    แอปจะปรากฏเป็นไอคอนบนหน้าจอโฮมของคุณพร้อมเปิดใช้งานทันที
                  </li>
                </ol>
              </div>

              {/* Android / Chrome Guide */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs sm:text-sm">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>สำหรับมือถือ Android / แท็บเล็ต (Chrome / Samsung Internet):</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-slate-600 text-xs pl-1">
                  <li>
                    เปิดเว็บไซต์ด้วยเบราว์เซอร์ <strong>Google Chrome</strong>
                  </li>
                  <li>
                    แตะจุด 3 จุด (<strong>⋮</strong>) ที่มุมบนขวาของเบราว์เซอร์
                  </li>
                  <li>
                    แตะเลือก <strong>"ติดตั้งแอป" (Install app)</strong> หรือ <strong>"เพิ่มลงในหน้าจอหลัก"</strong>
                  </li>
                  <li>
                    กดยืนยันการติดตั้ง จากนั้นระบบจะสร้างไอคอนแอปลงในเครื่องทันที
                  </li>
                </ol>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                เข้าใจแล้ว / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
