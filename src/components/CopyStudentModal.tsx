import React, { useState, useMemo } from 'react';
import { Student, GradeLevel } from '../types';
import { dataService } from '../services/dataService';
import { ImageWithFallback } from './ImageWithFallback';
import { X, Copy, Check, Filter, Search, Users } from 'lucide-react';

interface CopyStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  onSelectStudent?: (student: Student) => void;
  onSelectMultiple?: (students: Student[]) => void;
}

export const CopyStudentModal: React.FC<CopyStudentModalProps> = ({
  isOpen,
  onClose,
  title = 'คัดลอก / เลือกข้อมูลนักเรียนจากทะเบียนนักเรียน',
  subtitle = 'เลือกชั้นประถมศึกษาเพื่อดึงรายชื่อนักเรียนมาใช้งาน',
  onSelectStudent,
  onSelectMultiple,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<'all' | GradeLevel>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const students = dataService.getStudents();

  // Filter students based on grade and search query
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchGrade = selectedGrade === 'all' || s.gradeLevel === selectedGrade;
      const q = searchTerm.toLowerCase().trim();
      const fullName = `${s.prefix || ''}${s.firstName} ${s.lastName} ${s.nickname || ''} ${s.studentCode || ''}`.toLowerCase();
      const matchSearch = !q || fullName.includes(q);
      return matchGrade && matchSearch;
    });
  }, [students, selectedGrade, searchTerm]);

  if (!isOpen) return null;

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredStudents.map((s) => s.id);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedStudentIds.includes(id));
    if (isAllSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleConfirmMultiple = () => {
    if (onSelectMultiple && selectedStudentIds.length > 0) {
      const selected = students.filter((s) => selectedStudentIds.includes(s.id));
      onSelectMultiple(selected);
      onClose();
    }
  };

  const gradesList: GradeLevel[] = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">{title}</h3>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grade Filter Pill Buttons */}
        <div className="p-4 border-b border-slate-100 bg-white space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-purple-600" />
              <span>เลือกชั้นเรียน:</span>
            </span>
            <span className="text-[11px] text-slate-500">
              พบ {filteredStudents.length} คน
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedGrade('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedGrade === 'all'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทุกชั้น (ป.1 - ป.6)
            </button>
            {gradesList.map((g) => {
              const countInGrade = students.filter((s) => s.gradeLevel === g).length;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGrade(g)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedGrade === g
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {g} {countInGrade > 0 && <span className="text-[10px] opacity-80">({countInGrade})</span>}
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ, นามสกุล หรือรหัสนักเรียน..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-purple-400 text-xs outline-hidden"
            />
          </div>
        </div>

        {/* List of Students */}
        <div className="overflow-y-auto flex-1 p-3 divide-y divide-slate-100 max-h-[50vh]">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs">ไม่พบนักเรียนในระดับชั้นนี้</p>
            </div>
          ) : (
            filteredStudents.map((s, idx) => {
              const isChecked = selectedStudentIds.includes(s.id);
              const fullName = `${s.prefix || ''}${s.firstName} ${s.lastName}`;

              return (
                <div
                  key={s.id}
                  className="py-2.5 px-3 flex items-center justify-between gap-3 hover:bg-purple-50/50 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {onSelectMultiple && (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectStudent(s.id)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-400 border-slate-300 cursor-pointer shrink-0"
                      />
                    )}
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                      <ImageWithFallback
                        src={s.photoUrl}
                        alt={s.firstName}
                        isAvatar={true}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {fullName}
                        </span>
                        {s.nickname && (
                          <span className="text-[11px] text-slate-400 shrink-0">({s.nickname})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>#{s.studentCode || idx + 1}</span>
                        <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 font-bold rounded">
                          {s.gradeLevel || 'ป.1'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Single Selection Copy button */}
                  {onSelectStudent && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectStudent(s);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-white group-hover:bg-purple-600 group-hover:text-white text-purple-700 border border-purple-200 group-hover:border-purple-600 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1 shrink-0"
                      title="คัดลอกชื่อนักเรียนคนนี้"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอก</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          {onSelectMultiple ? (
            <>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-xs font-semibold text-purple-700 hover:text-purple-800 cursor-pointer"
              >
                เลือกทั้งหมดในชั้นนี้ ({filteredStudents.length})
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMultiple}
                  disabled={selectedStudentIds.length === 0}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                    selectedStudentIds.length > 0
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>ดึงนักเรียนที่เลือก ({selectedStudentIds.length} คน)</span>
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
