import React, { useState, useMemo, useEffect } from 'react';
import { GradeLevel, Student } from '../types';
import { dataService } from '../services/dataService';
import { ImageWithFallback } from './ImageWithFallback';
import {
  X,
  Copy,
  Check,
  Filter,
  Users,
  Search,
  CheckSquare,
  Square
} from 'lucide-react';

interface CopyAllStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGrade?: 'all' | GradeLevel;
}

const GRADES_LIST: GradeLevel[] = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'];

export const CopyAllStudentsModal: React.FC<CopyAllStudentsModalProps> = ({
  isOpen,
  onClose,
  defaultGrade = 'all',
}) => {
  const [allStudents, setAllStudents] = useState<Student[]>(() => dataService.getStudents());
  const [selectedGrade, setSelectedGrade] = useState<'all' | GradeLevel>(defaultGrade);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [copiedIndividualId, setCopiedIndividualId] = useState<string | null>(null);

  // Sync students from dataService whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const current = dataService.getStudents();
      setAllStudents(current);
      setSelectedGrade(defaultGrade);
      setSearchTerm('');
      setIsCopied(false);
    }
  }, [isOpen, defaultGrade]);

  // Filter students by grade and search query
  const filteredStudents = useMemo(() => {
    return allStudents.filter((s) => {
      const matchGrade = selectedGrade === 'all' || s.gradeLevel === selectedGrade;
      const q = searchTerm.toLowerCase().trim();
      const fullName = `${s.prefix || ''}${s.firstName} ${s.lastName} ${s.nickname || ''} ${s.studentCode || ''}`.toLowerCase();
      const matchSearch = !q || fullName.includes(q);
      return matchGrade && matchSearch;
    });
  }, [allStudents, selectedGrade, searchTerm]);

  // Automatically select all students when grade or search changes
  useEffect(() => {
    setSelectedStudentIds(filteredStudents.map((s) => s.id));
  }, [filteredStudents]);

  // Format text string for copying (ลำดับ. คำนำหน้า ชื่อ นามสกุล)
  const formattedText = useMemo(() => {
    const studentsToCopy = filteredStudents.filter((s) => selectedStudentIds.includes(s.id));
    if (studentsToCopy.length === 0) return '';
    return studentsToCopy
      .map((s, idx) => `${idx + 1}. ${s.prefix || ''}${s.firstName} ${s.lastName}`)
      .join('\n');
  }, [filteredStudents, selectedStudentIds]);

  if (!isOpen) return null;

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedStudentIds(filteredStudents.map((s) => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  const handleCopyAll = async () => {
    if (!formattedText) {
      dataService.notifyToast('warning', 'ไม่มีรายชื่อนักเรียน', 'กรุณาเลือกนักเรียนอย่างน้อย 1 คน');
      return;
    }

    try {
      await navigator.clipboard.writeText(formattedText);
      setIsCopied(true);
      const count = filteredStudents.filter((s) => selectedStudentIds.includes(s.id)).length;
      const gradeLabel = selectedGrade === 'all' ? 'ทุกชั้น' : selectedGrade;
      dataService.notifyToast(
        'success',
        'คัดลอกรายชื่อสำเร็จ',
        `คัดลอกรายชื่อนักเรียนชั้น ${gradeLabel} จำนวน ${count} คนแล้ว`
      );
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      dataService.notifyToast('info', 'คัดลอกรายชื่อนักเรียน', formattedText.slice(0, 50) + '...');
    }
  };

  const handleCopySingle = async (s: Student) => {
    const text = `${s.prefix || ''}${s.firstName} ${s.lastName}`.trim();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndividualId(s.id);
      dataService.notifyToast('success', 'คัดลอกรายชื่อ', text);
      setTimeout(() => setCopiedIndividualId(null), 2000);
    } catch {
      dataService.notifyToast('info', 'คัดลอกรายชื่อ', text);
    }
  };

  const selectedCount = filteredStudents.filter((s) => selectedStudentIds.includes(s.id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl shrink-0">
              <Copy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 text-sm sm:text-base truncate">
                คัดลอกรายชื่อนักเรียน จากหน้าข้อมูลนักเรียน
              </h3>
              <p className="text-xs text-slate-500 truncate">
                เลือกชั้นเรียนเพื่อคัดลอกรายชื่อ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white transition-colors cursor-pointer shrink-0"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grade Selection & Search Controls */}
        <div className="p-4 border-b border-slate-100 bg-white space-y-3">
          {/* Grade Pills */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-purple-600" />
                <span>เลือกระดับชั้น:</span>
              </span>
              <span className="text-[11px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-md">
                นักเรียน {filteredStudents.length} คน (เลือก {selectedCount} คน)
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedGrade('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                  selectedGrade === 'all'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>ทุกชั้น</span>
                <span className={`text-[10px] px-1 rounded-full ${selectedGrade === 'all' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {allStudents.length}
                </span>
              </button>

              {GRADES_LIST.map((grade) => {
                const count = allStudents.filter((s) => s.gradeLevel === grade).length;
                const isCurrent = selectedGrade === grade;
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setSelectedGrade(grade)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                      isCurrent
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{grade}</span>
                    <span className={`text-[10px] px-1 rounded-full ${isCurrent ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Box & Quick Selection Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อ, สกุล, รหัส..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-purple-400 text-xs outline-hidden"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 justify-end">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1.5 text-xs text-purple-700 hover:bg-purple-50 rounded-lg font-medium transition-colors cursor-pointer"
              >
                เลือกทั้งหมด ({filteredStudents.length})
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-colors cursor-pointer"
              >
                ยกเลิกเลือก
              </button>
            </div>
          </div>
        </div>

        {/* Content: Single Window / Pane Student List */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100 min-h-[220px] max-h-[50vh]">
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
                  onClick={() => toggleSelectStudent(s.id)}
                  className={`py-2 px-2.5 flex items-center justify-between gap-2.5 rounded-xl transition-colors group cursor-pointer ${
                    isChecked ? 'bg-purple-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="text-purple-600 shrink-0">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </div>

                    <span className="text-xs text-slate-400 font-semibold w-5 text-right shrink-0">
                      {idx + 1}.
                    </span>

                    <div className="w-7 h-7 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                      <ImageWithFallback
                        src={s.photoUrl}
                        alt={s.firstName}
                        isAvatar={true}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {fullName}
                        </span>
                        {s.nickname && (
                          <span className="text-[11px] text-slate-400 shrink-0">({s.nickname})</span>
                        )}
                        {s.gradeLevel && (
                          <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 font-bold rounded text-[10px]">
                            {s.gradeLevel}
                          </span>
                        )}
                      </div>
                      {s.studentCode && (
                        <div className="text-[10px] text-slate-400">
                          รหัส #{s.studentCode}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Single Copy Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopySingle(s);
                    }}
                    className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="คัดลอกเฉพาะชื่อคนนี้"
                  >
                    {copiedIndividualId === s.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-medium">
            เลือก: <span className="font-bold text-purple-700">{selectedCount}</span> / {filteredStudents.length} คน
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>

            <button
              type="button"
              onClick={handleCopyAll}
              disabled={selectedCount === 0}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                selectedCount > 0
                  ? isCopied
                    ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                    : 'bg-purple-600 hover:bg-purple-700 active:scale-95 text-white shadow-purple-600/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>คัดลอกสำเร็จแล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>คัดลอกรายชื่อ ({selectedCount} คน)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
