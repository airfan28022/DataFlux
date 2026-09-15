import React, { useState } from 'react';
import { TeacherProfile } from '../types';
import { formatThaiDate } from '../utils/helpers';
import { Printer, X, Download, FileText, Loader2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  profile: TeacherProfile;
  customHeader?: React.ReactNode;
  hidePrintDate?: boolean;
  orientation?: 'portrait' | 'landscape';
  extraControls?: React.ReactNode;
  children: React.ReactNode;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  profile,
  customHeader,
  hidePrintDate = false,
  orientation = 'portrait',
  extraControls,
  children,
}) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    if (title) {
      document.title = subtitle ? `${title} - ${subtitle}` : title;
    }
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('printable-report');
    if (!element) {
      handlePrint();
      return;
    }

    setIsDownloadingPdf(true);
    try {
      const rawFileName = `${title || 'รายงาน'}_${subtitle || ''}`
        .replace(/[\/\\?%*:|"<>•]/g, '_')
        .replace(/\s+/g, '_')
        .trim();
      const cleanFileName = rawFileName.length > 50 ? rawFileName.slice(0, 50) : rawFileName;

      const opt = {
        margin: [8, 8, 8, 8] as [number, number, number, number],
        filename: `${cleanFileName || 'report'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: (orientation || 'portrait') as 'portrait' | 'landscape' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF direct generation failed, falling back to window.print():', err);
      handlePrint();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const todayThai = formatThaiDate(new Date(), true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs print-modal-overlay">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print-modal-content">
        {/* Modal Header (Hidden during print) */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                พิมพ์ / ดาวน์โหลดรายงานผล (PDF)
              </h3>
              <p className="text-[11px] text-slate-500">
                สามารถกดดาวน์โหลดเป็นไฟล์ PDF ลงเครื่องได้โดยตรง หรือกดพิมพ์ผ่านหน้าต่างเบราว์เซอร์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-200 cursor-pointer disabled:opacity-60"
              title="ดาวน์โหลดเป็นไฟล์ .pdf บันทึกลงเครื่องทันที"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>{isDownloadingPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 cursor-pointer"
              title="สั่งพิมพ์ / บันทึกผ่านหน้าต่างพิมพ์ของเบราว์เซอร์"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">สั่งพิมพ์</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer ml-1"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Optional Extra Controls (e.g. Grade Filter Bar in Student Records) */}
        {extraControls && (
          <div className="px-5 py-2.5 bg-slate-100/80 border-b border-slate-200 no-print">
            {extraControls}
          </div>
        )}

        {/* Printable Document Body */}
        <div className="overflow-y-auto p-3 sm:p-6 bg-slate-100/70 flex justify-center print-modal-scroll">
          <div
            id="printable-report"
            className="bg-white w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-10 shadow-lg border border-slate-200 text-slate-800 text-xs sm:text-sm font-serif-thai"
            style={{ fontFamily: "'Sarabun', 'Kanit', sans-serif" }}
          >
            {/* School Official Header */}
            {customHeader ? (
              <div className="text-center border-b-2 border-slate-800 pb-4 mb-5">
                {customHeader}
                {!hidePrintDate && <p className="text-[11px] text-slate-500 mt-2">พิมพ์ออก ณ {todayThai}</p>}
              </div>
            ) : (
              <div className="text-center border-b-2 border-slate-800 pb-4 mb-5">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-wide">{profile.schoolName}</h2>
                <p className="text-sm font-semibold text-slate-700 mt-1">
                  {profile.classroomName} ปีการศึกษา {profile.academicYear}
                </p>
                <h3 className="text-base sm:text-lg font-bold text-emerald-800 mt-2">{title}</h3>
                {subtitle && <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>}
                {!hidePrintDate && <p className="text-[11px] text-slate-500 mt-2">พิมพ์ออก ณ {todayThai}</p>}
              </div>
            )}

            {/* Document Content */}
            <div className="my-4">{children}</div>

            {/* Teacher Signature Block */}
            <div className="mt-10 pt-4 flex justify-end">
              <div className="text-center w-64 space-y-2">
                <p className="text-xs text-slate-700">ลงชื่อ ................................................................</p>
                <p className="text-sm font-semibold text-slate-800">({profile.teacherName})</p>
                <p className="text-xs text-slate-600">ครูประจำชั้น {profile.classroomName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
