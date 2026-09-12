import React from 'react';
import { TeacherProfile } from '../types';
import { formatThaiDate } from '../utils/helpers';
import { Printer, X, Download, FileText } from 'lucide-react';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  profile: TeacherProfile;
  customHeader?: React.ReactNode;
  hidePrintDate?: boolean;
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
  children,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const todayThai = formatThaiDate(new Date(), true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header (Hidden during actual print) */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">เอกสารสรุปผลการเรียน (บันทึกไฟล์ PDF / สั่งพิมพ์)</h3>
              <p className="text-xs text-slate-500">จัดรูปแบบ A4 มาตรฐาน (ในหน้าต่างพิมพ์ ให้เลือกปลายทางเป็น "Save as PDF" เพื่อบันทึกเป็นไฟล์ PDF)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm shadow-emerald-200 cursor-pointer"
              title="บันทึกเป็นไฟล์ PDF หรือสั่งพิมพ์เอกสาร"
            >
              <Download className="w-4 h-4" />
              <span>บันทึกเป็นไฟล์ PDF / สั่งพิมพ์</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-100 flex justify-center">
          <div
            id="printable-report"
            className="bg-white w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-10 shadow-lg border border-slate-200 text-slate-800 text-sm font-serif-thai"
            style={{ fontFamily: "'Sarabun', 'Kanit', sans-serif" }}
          >
            {/* School Official Header */}
            {customHeader ? (
              <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
                {customHeader}
                {!hidePrintDate && <p className="text-[11px] text-slate-500 mt-2">พิมพ์ออก ณ {todayThai}</p>}
              </div>
            ) : (
              <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
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
            <div className="mt-12 pt-6 flex justify-end">
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
