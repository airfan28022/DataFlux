import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  Tablet,
  CheckCircle2,
  Share2,
  PlusSquare,
  X,
  Cloud,
  Globe,
  HelpCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'settings' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = ''
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'install' | 'cloudflare'>('install');

  // If already installed and variant is header, display a subtle installed indicator or allow opening guide
  if (isInstalled && variant === 'header') {
    return (
      <button
        onClick={() => setShowModal(true)}
        className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        title="แอปติดตั้งบนเครื่องเรียบร้อยแล้ว"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span className="hidden md:inline">ติดตั้งบนเครื่องแล้ว</span>
      </button>
    );
  }

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
      {/* 1. Header Variant */}
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

      {/* 2. Sidebar Variant */}
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

      {/* 3. Settings Variant */}
      {variant === 'settings' && (
        <div className="p-4 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 border border-emerald-200/80 rounded-2xl space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                <Smartphone className="w-5 h-5" />
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isInstallable ? 'คลิกเพื่อติดตั้งแอปทันที' : 'ดูขั้นตอนการติดตั้งบนมือถือ/แท็บเล็ต'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveModalTab('cloudflare');
                setShowModal(true);
              }}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5 text-amber-600" />
              <span>วิธีเปิดให้ดาวน์โหลดผ่าน Cloudflare</span>
            </button>
          </div>
        </div>
      )}

      {/* Detailed Modal Guide for Mobile/Tablet & Cloudflare */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-emerald-100 overflow-hidden">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    ติดตั้งเป็นแอป (PWA App) & Cloudflare
                  </h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    ใช้งานบนมือถือ Tablet หรือ PC แบบเต็มจอไม่ต้องผ่าน URL
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

            {/* Tab navigation */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveModalTab('install')}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeModalTab === 'install'
                    ? 'border-emerald-600 text-emerald-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>วิธีติดตั้งบนมือถือ / แท็บเล็ต</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab('cloudflare')}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeModalTab === 'cloudflare'
                    ? 'border-emerald-600 text-emerald-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Cloud className="w-4 h-4 text-amber-500" />
                <span>การนำขึ้นผ่าน Cloudflare</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {activeModalTab === 'install' && (
                <div className="space-y-4">
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
              )}

              {activeModalTab === 'cloudflare' && (
                <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5">
                    <Cloud className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-900 text-xs">
                        ทำไมต้องผ่าน Cloudflare?
                      </h4>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        การติดตั้งเป็นแอป (PWA) บนมือถือ/แท็บเล็ต <strong>จำเป็นต้องมี HTTPS (SSL)</strong> ซึ่ง Cloudflare มีบริการ <strong>Cloudflare Pages</strong> และ <strong>SSL ฟรี 100%</strong> พร้อมระบบ CDN ที่ทำให้แอปโหลดเร็วมากในทุกอุปกรณ์
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">
                        1
                      </span>
                      <span>วิธีที่ 1: นำขึ้นด้วย Cloudflare Pages (แนะนำที่สุด - ง่ายและฟรี)</span>
                    </h4>
                    <div className="pl-6 space-y-1.5 text-slate-600">
                      <p>1. ส่งออกโค้ด (Export) หรือเชื่อมต่อ Repository เข้ากับ <strong>GitHub</strong></p>
                      <p>2. เข้าไปที่ <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-semibold underline">dash.cloudflare.com</a> แล้วไปที่เมนู <strong>Workers & Pages</strong></p>
                      <p>3. เลือก <strong>Create application</strong> &gt; แท็บ <strong>Pages</strong> &gt; เชื่อมต่อกับ GitHub</p>
                      <p>4. ตั้งค่า Build Settings:</p>
                      <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-xl font-mono text-[11px] space-y-1">
                        <p>Framework preset: <span className="text-white">Vite</span></p>
                        <p>Build command: <span className="text-white">npm run build</span></p>
                        <p>Build output directory: <span className="text-white">dist</span></p>
                      </div>
                      <p>5. กด <strong>Save and Deploy</strong> คุณจะได้ URL เช่น <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-800 font-mono">https://my-app.pages.dev</code> ซึ่งมือถือทุกเครื่องสามารถกดติดตั้งเป็น App ได้ทันที</p>
                    </div>

                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5 pt-2">
                      <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[11px]">
                        2
                      </span>
                      <span>วิธีที่ 2: ใช้โดเมนของตนเองผ่าน Cloudflare DNS</span>
                    </h4>
                    <div className="pl-6 space-y-1.5 text-slate-600">
                      <p>
                        หากมีโดเมนของโรงเรียน เช่น <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">teacher.school.ac.th</code> สามารถชี้ DNS มาที่ Cloudflare แล้วเปิดระบบ <strong>Proxied (สัญลักษณ์ก้อนเมฆสีส้ม)</strong> เพื่อรับ HTTPS ฟรีอัตโนมัติ
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-[11px] text-emerald-800 font-medium">
                      โปรเจกต์นี้ได้รับการตั้งค่าไฟล์ Service Worker, Web App Manifest, และไอคอนขนาด 192x192 / 512x512 ไว้ครบถ้วนสมบูรณ์แล้ว
                    </span>
                  </div>
                </div>
              )}
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
