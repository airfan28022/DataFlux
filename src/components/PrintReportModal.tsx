import React, { useState, useEffect } from 'react';
import { TeacherProfile } from '../types';
import { formatThaiDate } from '../utils/helpers';
import { Printer, X, Download, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  profile: TeacherProfile;
  customHeader?: React.ReactNode;
  customFooter?: React.ReactNode;
  signerName?: string;
  signerTitle?: string;
  hideClassroomInSignature?: boolean;
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
  customFooter,
  signerName,
  signerTitle,
  hideClassroomInSignature = false,
  hidePrintDate = false,
  orientation = 'portrait',
  extraControls,
  children,
}) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [selectedOrientation, setSelectedOrientation] = useState<'portrait' | 'landscape'>(orientation);

  useEffect(() => {
    setSelectedOrientation(orientation);
  }, [orientation]);

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
      const cleanFileName = (rawFileName.length > 50 ? rawFileName.slice(0, 50) : rawFileName) || 'report';
      const finalFileName = `${cleanFileName}_A4.pdf`;

      // Capture at high resolution (scale 2) for crisp Thai typography and lines
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      });

      const isLandscape = selectedOrientation === 'landscape';
      // Standard ISO A4 dimensions: 21.0 x 29.7 cm (210 x 297 mm)
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // A4 dimensions in mm: 210mm x 297mm (portrait) or 297mm x 210mm (landscape)
      const pageWidth = isLandscape ? 297 : 210;
      const pageHeight = isLandscape ? 210 : 297;
      const margin = 5; // 5mm margin to maximize usable A4 printable area
      const maxAvailableWidth = pageWidth - margin * 2;
      const maxAvailableHeight = pageHeight - margin * 2;

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Mathematically scale to fit BOTH width and height on exactly 1 single A4 page
      // Guaranteeing it will NEVER exceed or spill over to another page ("ห้ามเกินหน้าอื่น")
      const scaleX = maxAvailableWidth / imgWidth;
      const scaleY = maxAvailableHeight / imgHeight;
      const fitScale = Math.min(scaleX, scaleY);

      const finalRenderedWidth = imgWidth * fitScale;
      const finalRenderedHeight = imgHeight * fitScale;

      // Center within the single A4 page margins
      const posX = margin + (maxAvailableWidth - finalRenderedWidth) / 2;
      const posY = margin + Math.max(0, (maxAvailableHeight - finalRenderedHeight) / 2);

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', posX, posY, finalRenderedWidth, finalRenderedHeight);

      // Save strictly 1-page A4 document
      pdf.save(finalFileName);
    } catch (err) {
      console.error('PDF direct generation failed, falling back to window.print():', err);
      handlePrint();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const todayThai = formatThaiDate(new Date(), true);
  const isLandscape = selectedOrientation === 'landscape';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs print-modal-overlay">
      {/* Dynamic @page CSS rule for browser print */}
      <style>{`
        @media print {
          @page {
            size: A4 ${isLandscape ? 'landscape' : 'portrait'} !important;
            margin: 5mm !important;
          }
          #printable-report {
            width: ${isLandscape ? '297mm' : '210mm'} !important;
            max-width: 100% !important;
            padding: 5mm !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print-modal-content">
        {/* Modal Header (Hidden during print) */}
        <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 no-print">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  พิมพ์ / ดาวน์โหลดรายงานผล (A4)
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  ขนาด A4 (21.0 × 29.7 ซม.) 1 หน้าพอดี
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                ปรับขนาดอัตโนมัติให้ลงตัวในกระดาษ A4 หน้าเดียว ไม่ล้นหน้าอื่น
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Orientation Selector Tabs */}
            <div className="inline-flex items-center p-0.5 bg-slate-200/80 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setSelectedOrientation('landscape')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  isLandscape
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="เลือกกระดาษ A4 แนวนอน (29.7 × 21.0 ซม.)"
              >
                แนวนอน (29.7×21 ซม.)
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrientation('portrait')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  !isLandscape
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="เลือกกระดาษ A4 แนวตั้ง (21.0 × 29.7 ซม.)"
              >
                แนวตั้ง (21.0×29.7 ซม.)
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-200 cursor-pointer disabled:opacity-60"
              title="ดาวน์โหลดเป็นไฟล์ PDF ขนาด A4 หน้าเดียวพอดี"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>{isDownloadingPdf ? 'กำลังปรับขนาด A4...' : 'ดาวน์โหลด A4 (PDF)'}</span>
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

        {/* Printable Document Body - Centered and horizontally scrollable preview */}
        <div className="overflow-x-auto overflow-y-auto p-3 sm:p-6 bg-slate-100/70 flex justify-center print-modal-scroll">
          <div
            id="printable-report"
            className={`bg-white shadow-xl border border-slate-200 text-slate-800 text-xs font-serif-thai shrink-0 transition-all ${
              isLandscape
                ? 'w-[297mm] min-w-[297mm] max-w-[297mm] min-h-[210mm] p-6'
                : 'w-[210mm] min-w-[210mm] max-w-[210mm] min-h-[297mm] p-6'
            }`}
            style={{
              fontFamily: "'Sarabun', 'Kanit', sans-serif",
              boxSizing: 'border-box',
            }}
          >
            {/* School Official Header */}
            {customHeader ? (
              <div className="text-center border-b-2 border-slate-800 pb-2.5 mb-3">
                {customHeader}
                {!hidePrintDate && <p className="text-[11px] text-slate-500 mt-1">พิมพ์ออก ณ {todayThai}</p>}
              </div>
            ) : (
              <div className="text-center border-b-2 border-slate-800 pb-2.5 mb-3">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-wide">{profile.schoolName}</h2>
                <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5">
                  {profile.classroomName} ปีการศึกษา {profile.academicYear}
                </p>
                <h3 className="text-sm sm:text-base font-bold text-emerald-800 mt-1">{title}</h3>
                {subtitle && <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>}
                {!hidePrintDate && <p className="text-[11px] text-slate-500 mt-1">พิมพ์ออก ณ {todayThai}</p>}
              </div>
            )}

            {/* Document Content */}
            <div className="my-2">{children}</div>

            {/* Teacher Signature Block */}
            {customFooter !== undefined ? (
              customFooter
            ) : (
              <div className="mt-6 pt-2 flex justify-end">
                <div className="text-center w-64 space-y-1">
                  <p className="text-xs text-slate-700">ลงชื่อ ................................................................</p>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800">
                    ({signerName || (profile.teacherName && (profile.teacherName === 'ครูอีรฟัน' || profile.teacherName.includes('อีรฟัน')) ? 'นายอีรฟัน สะมะแอ' : profile.teacherName)})
                  </p>
                  {signerTitle !== undefined ? (
                    signerTitle ? <p className="text-[11px] text-slate-600">{signerTitle}</p> : null
                  ) : hideClassroomInSignature ? null : profile.classroomName ? (
                    <p className="text-[11px] text-slate-600">ครูประจำชั้น {profile.classroomName}</p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
