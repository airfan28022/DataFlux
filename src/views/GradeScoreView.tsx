import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Student,
  ScoreSheet,
  ScoreChapter,
  GradingSystem,
  TeacherProfile
} from '../types';
import { dataService } from '../services/dataService';
import { calculateGradeFromPercent } from '../utils/helpers';
import { PrintReportModal } from '../components/PrintReportModal';
import { CopyStudentModal } from '../components/CopyStudentModal';
import { CopyAllStudentsModal } from '../components/CopyAllStudentsModal';
import confetti from 'canvas-confetti';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Save,
  Printer,
  Sliders,
  Award,
  BookOpen,
  X,
  FileText,
  RotateCcw,
  CheckCircle2,
  Download,
  UserPlus,
  Maximize2,
  Minimize2,
  Copy,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Check
} from 'lucide-react';

interface GradeScoreViewProps {
  isAdmin: boolean;
}

interface SheetStudent {
  id: string;
  order: number;
  firstName: string;
  lastName: string;
  prefix?: string;
  nickname?: string;
}

interface ChapterFormItem {
  chapterNumber: number;
  title: string;
  maxScore: number;
}

type ActiveTabType = number | 'final' | 'summary';

export const GradeScoreView: React.FC<GradeScoreViewProps> = ({ isAdmin }) => {
  const [scoreSheets, setScoreSheets] = useState<ScoreSheet[]>(dataService.getScoreSheets());
  const [students, setStudents] = useState<Student[]>(dataService.getStudents());
  const [profile, setProfile] = useState<TeacherProfile>(dataService.getProfile());

  // Active Term Tab ('1' | '2') according to Req 1: ตรงรายวิชา ให้มีปุ่มแยก 2 ปุ่ม "ภาคเรียนที่1" กับ "ภาคเรียนที่2"
  const [activeTermTab, setActiveTermTab] = useState<'1' | '2'>('1');

  const term1Sheets = useMemo(() => scoreSheets.filter((s) => (s.term || '1') === '1'), [scoreSheets]);
  const term2Sheets = useMemo(() => scoreSheets.filter((s) => (s.term || '1') === '2'), [scoreSheets]);
  const currentTermSheets = activeTermTab === '1' ? term1Sheets : term2Sheets;

  // Active Score Sheet ID
  const [activeSheetId, setActiveSheetId] = useState<string>(() => {
    const sheets = dataService.getScoreSheets();
    return sheets[0]?.id || `sheet-${Date.now()}`;
  });

  const activeSheet = useMemo(() => {
    const foundInTerm = currentTermSheets.find((s) => s.id === activeSheetId);
    if (foundInTerm) return foundInTerm;
    if (currentTermSheets.length > 0) return currentTermSheets[0];
    return scoreSheets.find((s) => s.id === activeSheetId) || scoreSheets[0];
  }, [currentTermSheets, scoreSheets, activeSheetId]);

  // Current sheet students list (supports custom student counts/names per subject/class)
  const currentSheetStudents: SheetStudent[] = useMemo(() => {
    if (activeSheet?.studentList && activeSheet.studentList.length > 0) {
      return activeSheet.studentList;
    }
    return students.map((s, idx) => ({
      id: s.id,
      order: s.order || idx + 1,
      firstName: s.firstName,
      lastName: s.lastName,
      prefix: s.prefix || '',
      nickname: s.nickname || '',
    }));
  }, [activeSheet?.studentList, students]);

  // Active Chapter View: 1 to N (circular buttons), or 'final' for สอบปลายภาค, or 'summary' for รวมทุกบท
  const [activeChapterTab, setActiveChapterTab] = useState<ActiveTabType>(1);

  // Pop-up Modal State for Create & Edit ("แก้ไขข้อมูล")
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [modalSelectedSheetId, setModalSelectedSheetId] = useState<string>('');
  const [modalSubjectName, setModalSubjectName] = useState('');
  const [modalSubjectCode, setModalSubjectCode] = useState('');
  const [modalClassroom, setModalClassroom] = useState('');
  const [modalTerm, setModalTerm] = useState<'1' | '2'>('1');
  const [modalChapterCount, setModalChapterCount] = useState<number>(2);
  const [modalFinalExamMaxScore, setModalFinalExamMaxScore] = useState<number>(30);
  const [modalChapters, setModalChapters] = useState<ChapterFormItem[]>([
    { chapterNumber: 1, title: 'บทที่ 1: การเรียนรู้พื้นฐาน', maxScore: 35 },
    { chapterNumber: 2, title: 'บทที่ 2: การประยุกต์ใช้', maxScore: 35 },
  ]);
  const [modalGradingSystem, setModalGradingSystem] = useState<GradingSystem>('thai_standard');

  // Interactive Quick Score Popover State for 0-5
  const [activeScorePopover, setActiveScorePopover] = useState<{
    studentId: string;
    topicIndex: number;
  } | null>(null);

  // Print PDF Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Copy Student Modal State (แก้5: คัดลอก/ดึงข้อมูลนักเรียนจากทะเบียนนักเรียน)
  const [showCopyStudentModal, setShowCopyStudentModal] = useState(false);
  const [showCopyAllStudentsModal, setShowCopyAllStudentsModal] = useState(false);
  const [targetStudentRowId, setTargetStudentRowId] = useState<string | null>(null);

  // Auto-Save Status (Req 4: บันทึกข้อมูลอัตโนมัติ)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fullscreen Table State: ขยายเต็มตารางคะแนน
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);

  // State for "เลือกวิชา" Dropdown (ไม่ต้องเลื่อนซ้าย-ขวา)
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const subjectDropdownRef = useRef<HTMLDivElement>(null);

  // State for expanding topic full text in table header ("กดตรงเรื่องแล้วแสดงข้อความแบบเต็มๆ")
  const [expandedTopicIdx, setExpandedTopicIdx] = useState<number | null>(null);
  const topicPopoverRef = useRef<HTMLDivElement>(null);

  // Mobile / Fullscreen Student Score Pop-up Modal (Req: หน้ากรอกคะแนน - ส่วนสูง แสดงหน้าเต็ม mobile พอดี เมื่อกดชื่อ จะแสดงpop-up ให้ลงคะแนนให้เรียบร้อย ลงเสร็จก็กดบันทึก)
  const [selectedScoreModalStudent, setSelectedScoreModalStudent] = useState<SheetStudent | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<'chapter' | 'final'>('chapter');
  const [modalSelectedChapterIdx, setModalSelectedChapterIdx] = useState<number>(0);
  const [modalTopicScores, setModalTopicScores] = useState<(number | '-')[]>([]);
  const [modalFinalScore, setModalFinalScore] = useState<number | ''>('');

  const handleOpenScoreModal = (student: SheetStudent) => {
    setSelectedScoreModalStudent(student);

    let chIdx = 0;
    if (typeof activeChapterTab === 'number') {
      chIdx = Math.max(0, Math.min(currentChapters.length - 1, activeChapterTab - 1));
      setModalActiveTab('chapter');
    } else if (activeChapterTab === 'final') {
      setModalActiveTab('final');
    } else {
      setModalActiveTab('chapter');
    }
    setModalSelectedChapterIdx(chIdx);

    const targetCh = currentChapters[chIdx];
    const initialTopics = targetCh && targetCh.scores[student.id]
      ? [...targetCh.scores[student.id]]
      : Array(targetCh ? targetCh.topics.length : 10).fill('-');

    setModalTopicScores(initialTopics);

    const initialExam = activeSheet?.finalExamScores?.[student.id];
    setModalFinalScore(typeof initialExam === 'number' ? initialExam : '');
  };

  const handleSwitchModalChapter = (newChIdx: number) => {
    if (!selectedScoreModalStudent) return;
    setModalSelectedChapterIdx(newChIdx);
    setModalActiveTab('chapter');
    const targetCh = currentChapters[newChIdx];
    const newTopics = targetCh && targetCh.scores[selectedScoreModalStudent.id]
      ? [...targetCh.scores[selectedScoreModalStudent.id]]
      : Array(targetCh ? targetCh.topics.length : 10).fill('-');
    setModalTopicScores(newTopics);
  };

  const handleSaveScoreModal = () => {
    if (!selectedScoreModalStudent || !activeSheet) return;
    const sId = selectedScoreModalStudent.id;

    let updatedChapters = [...currentChapters];
    if (modalActiveTab === 'chapter' && modalSelectedChapterIdx >= 0 && modalSelectedChapterIdx < currentChapters.length) {
      const chNum = currentChapters[modalSelectedChapterIdx].chapterNumber;
      updatedChapters = updatedChapters.map((ch) => {
        if (ch.chapterNumber === chNum) {
          return {
            ...ch,
            scores: {
              ...ch.scores,
              [sId]: [...modalTopicScores],
            },
          };
        }
        return ch;
      });
    }

    let updatedFinalScores = { ...(activeSheet.finalExamScores || {}) };
    if (modalActiveTab === 'final' || modalFinalScore !== '') {
      if (typeof modalFinalScore === 'number') {
        updatedFinalScores[sId] = modalFinalScore;
      }
    }

    const updatedSheet: ScoreSheet = {
      ...activeSheet,
      chapters: updatedChapters,
      finalExamScores: updatedFinalScores,
      updatedAt: new Date().toISOString(),
    };

    dataService.saveScoreSheet(updatedSheet, true);
    triggerAutoSaveEffect();
    dataService.notifyToast(
      'success',
      `บันทึกคะแนน ${selectedScoreModalStudent.prefix || ''}${selectedScoreModalStudent.firstName} เรียบร้อยแล้ว`
    );
    setSelectedScoreModalStudent(null);
  };

  const handleNextStudentInScoreModal = () => {
    if (!selectedScoreModalStudent || !activeSheet) return;
    const sId = selectedScoreModalStudent.id;
    let updatedChapters = [...currentChapters];
    if (modalActiveTab === 'chapter' && modalSelectedChapterIdx >= 0 && modalSelectedChapterIdx < currentChapters.length) {
      const chNum = currentChapters[modalSelectedChapterIdx].chapterNumber;
      updatedChapters = updatedChapters.map((ch) => {
        if (ch.chapterNumber === chNum) {
          return {
            ...ch,
            scores: {
              ...ch.scores,
              [sId]: [...modalTopicScores],
            },
          };
        }
        return ch;
      });
    }

    let updatedFinalScores = { ...(activeSheet.finalExamScores || {}) };
    if (typeof modalFinalScore === 'number') {
      updatedFinalScores[sId] = modalFinalScore;
    }

    const updatedSheet: ScoreSheet = {
      ...activeSheet,
      chapters: updatedChapters,
      finalExamScores: updatedFinalScores,
      updatedAt: new Date().toISOString(),
    };
    dataService.saveScoreSheet(updatedSheet, true);
    triggerAutoSaveEffect();

    const currIdx = currentSheetStudents.findIndex((s) => s.id === selectedScoreModalStudent.id);
    if (currIdx < currentSheetStudents.length - 1) {
      const nextStd = currentSheetStudents[currIdx + 1];
      setSelectedScoreModalStudent(nextStd);

      const targetCh = updatedChapters[modalSelectedChapterIdx];
      const nextTopics = targetCh && targetCh.scores[nextStd.id]
        ? [...targetCh.scores[nextStd.id]]
        : Array(targetCh ? targetCh.topics.length : 10).fill('-');
      setModalTopicScores(nextTopics);

      const nextExam = updatedFinalScores[nextStd.id];
      setModalFinalScore(typeof nextExam === 'number' ? nextExam : '');
    } else {
      setSelectedScoreModalStudent(null);
      dataService.notifyToast('success', 'บันทึกคะแนนครบทุกคนแล้ว');
    }
  };

  const handlePrevStudentInScoreModal = () => {
    if (!selectedScoreModalStudent || !activeSheet) return;
    const currIdx = currentSheetStudents.findIndex((s) => s.id === selectedScoreModalStudent.id);
    if (currIdx > 0) {
      const prevStd = currentSheetStudents[currIdx - 1];
      setSelectedScoreModalStudent(prevStd);

      const targetCh = currentChapters[modalSelectedChapterIdx];
      const prevTopics = targetCh && targetCh.scores[prevStd.id]
        ? [...targetCh.scores[prevStd.id]]
        : Array(targetCh ? targetCh.topics.length : 10).fill('-');
      setModalTopicScores(prevTopics);

      const prevExam = activeSheet.finalExamScores?.[prevStd.id];
      setModalFinalScore(typeof prevExam === 'number' ? prevExam : '');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTableFullscreen) {
        setIsTableFullscreen(false);
      }
    };
    if (isTableFullscreen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTableFullscreen]);

  const triggerAutoSaveEffect = () => {
    setAutoSaveStatus('saving');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      setAutoSaveStatus('saved');
    }, 600);
  };

  // Sync dataService subscriptions
  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      const sheets = dataService.getScoreSheets();
      setScoreSheets(sheets);
      setStudents(dataService.getStudents());
      setProfile(dataService.getProfile());
    });
    return unsub;
  }, []);

  // Ensure current active sheet has initialized chapters structure (Normalize)
  const currentChapters: ScoreChapter[] = useMemo(() => {
    if (!activeSheet) return [];

    const count = activeSheet.chapterCount || 2;
    const existingChapters = activeSheet.chapters || [];

    const result: ScoreChapter[] = [];
    for (let c = 1; c <= count; c++) {
      const found = existingChapters.find((ch) => ch.chapterNumber === c);
      if (found) {
        const rawTopics = found.topics || [];
        // Ensure at least 10 items initially if empty
        const initialTopics = rawTopics.length > 0 ? [...rawTopics] : Array.from({ length: 10 }).map((_, idx) =>
          idx < 5 ? `เรื่องที่ ${idx + 1}` : ''
        );

        result.push({
          ...found,
          title: found.title || `บทที่ ${c}`,
          maxScore: found.maxScore !== undefined ? found.maxScore : 15,
          topics: initialTopics,
          scores: found.scores || {},
        });
      } else {
        const defaultTopics = Array.from({ length: 10 }).map((_, idx) =>
          idx < 5 ? `เรื่องที่ ${idx + 1}` : ''
        );
        result.push({
          chapterNumber: c,
          title: `บทที่ ${c}`,
          maxScore: 15,
          topics: defaultTopics,
          scores: {},
        });
      }
    }
    return result;
  }, [activeSheet]);

  // Switch Term Filter ('1' | '2') - Req 1
  const handleSwitchTerm = (term: '1' | '2') => {
    setActiveTermTab(term);
    const targetSheets = term === '1' ? term1Sheets : term2Sheets;
    if (targetSheets.length > 0) {
      setActiveSheetId(targetSheets[0].id);
      setActiveChapterTab(1);
    }
  };

  // Open Pop-up Modal to Create a New Subject (+)
  const handleOpenCreateModal = (specificTerm?: '1' | '2') => {
    const termToUse = specificTerm || activeTermTab;
    setIsEditingExisting(false);
    setModalSelectedSheetId('');
    setModalSubjectName('วิชาใหม่');
    setModalSubjectCode('');
    const defaultClass = profile.gradeLevel
      ? (profile.gradeLevel.startsWith('ป.') ? `ชั้นประถมศึกษาปีที่ ${profile.gradeLevel.replace('ป.', '')}` : profile.gradeLevel)
      : (profile.classroomName || 'ชั้นประถมศึกษาปีที่ 1');
    setModalClassroom(defaultClass);
    setModalTerm(termToUse);
    setModalChapterCount(2);
    setModalFinalExamMaxScore(30);
    setModalChapters([
      { chapterNumber: 1, title: 'บทที่ 1: การเรียนรู้พื้นฐาน', maxScore: 35 },
      { chapterNumber: 2, title: 'บทที่ 2: การประยุกต์ใช้', maxScore: 35 },
    ]);
    setModalGradingSystem('thai_standard');
    setShowConfigModal(true);
  };

  // Open Pop-up Modal to "แก้ไขข้อมูล"
  const handleOpenEditModal = () => {
    const targetSheet = activeSheet || scoreSheets[0];
    if (!targetSheet) return;

    setIsEditingExisting(true);
    setModalSelectedSheetId(targetSheet.id);
    loadSheetDataIntoModal(targetSheet);
    setShowConfigModal(true);
  };

  // Load a sheet's properties into modal state
  const loadSheetDataIntoModal = (sheet: ScoreSheet) => {
    setModalSubjectName(sheet.subjectName);
    setModalSubjectCode(sheet.subjectCode || '');
    let initialClass = sheet.classroom || '';
    if (!initialClass) {
      const sheetIds = new Set((sheet.studentList || []).map((s) => s.id));
      const matched = students.filter((s) => sheetIds.has(s.id));
      const grades = Array.from(new Set(matched.map((s) => s.gradeLevel).filter(Boolean))) as string[];
      if (grades.length === 1) {
        const g = grades[0];
        initialClass = g.startsWith('ป.') ? `ชั้นประถมศึกษาปีที่ ${g.replace('ป.', '')}` : `ชั้น ${g}`;
      } else if (profile.gradeLevel) {
        initialClass = profile.gradeLevel.startsWith('ป.') ? `ชั้นประถมศึกษาปีที่ ${profile.gradeLevel.replace('ป.', '')}` : profile.gradeLevel;
      } else {
        initialClass = profile.classroomName || 'ชั้นประถมศึกษาปีที่ 1';
      }
    }
    setModalClassroom(initialClass);
    setModalTerm(sheet.term);
    const count = sheet.chapterCount || sheet.chapters?.length || 2;
    setModalChapterCount(count);

    const chs: ChapterFormItem[] = [];
    for (let i = 1; i <= count; i++) {
      const found = sheet.chapters?.find((c) => c.chapterNumber === i);
      chs.push({
        chapterNumber: i,
        title: found?.title || `บทที่ ${i}`,
        maxScore: found?.maxScore !== undefined ? found.maxScore : 15,
      });
    }
    setModalChapters(chs);
    setModalFinalExamMaxScore(sheet.finalExamMaxScore !== undefined ? sheet.finalExamMaxScore : 30);
    setModalGradingSystem(sheet.gradingSystem || 'thai_standard');
  };

  // Switch subject inside the "แก้ไขข้อมูล" modal dropdown
  const handleSwitchModalSheet = (sheetId: string) => {
    setModalSelectedSheetId(sheetId);
    const target = scoreSheets.find((s) => s.id === sheetId);
    if (target) {
      loadSheetDataIntoModal(target);
    }
  };

  // When chapter count changes in modal (1 to 8):
  const handleModalChapterCountSelect = (newCount: number) => {
    const clamped = Math.min(8, Math.max(1, newCount));
    setModalChapterCount(clamped);

    const updated: ChapterFormItem[] = [];
    for (let i = 1; i <= clamped; i++) {
      const existing = modalChapters.find((c) => c.chapterNumber === i);
      if (existing) {
        updated.push(existing);
      } else {
        updated.push({
          chapterNumber: i,
          title: `บทที่ ${i}: หน่วยการเรียนรู้ที่ ${i}`,
          maxScore: 15,
        });
      }
    }
    setModalChapters(updated);
  };

  // Save Subject Configuration from Pop-up Modal
  const handleSaveConfigModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSubjectName.trim()) {
      dataService.notifyToast('warning', 'กรุณาระบุชื่อวิชา');
      return;
    }

    const targetSheetId = isEditingExisting && modalSelectedSheetId ? modalSelectedSheetId : `sheet-${Date.now()}`;
    const existingTarget = scoreSheets.find((s) => s.id === targetSheetId);

    // Build chapters
    const builtChapters: ScoreChapter[] = modalChapters.map((mCh) => {
      const existing = existingTarget?.chapters?.find((c) => c.chapterNumber === mCh.chapterNumber);
      return {
        chapterNumber: mCh.chapterNumber,
        title: mCh.title.trim() || `บทที่ ${mCh.chapterNumber}`,
        maxScore: Number(mCh.maxScore) > 0 ? Number(mCh.maxScore) : 15,
        topics: existing?.topics || Array.from({ length: 10 }).map((_, idx) => (idx < 5 ? `เรื่องที่ ${idx + 1}` : '')),
        scores: existing?.scores || {},
      };
    });

    const newSheet: ScoreSheet = {
      id: targetSheetId,
      subjectName: modalSubjectName.trim(),
      subjectCode: modalSubjectCode.trim(),
      classroom: modalClassroom.trim() || existingTarget?.classroom || undefined,
      academicYear: profile.academicYear || '2569',
      term: modalTerm,
      chapterCount: builtChapters.length,
      gradingSystem: modalGradingSystem,
      chapters: builtChapters,
      finalExamMaxScore: Number(modalFinalExamMaxScore) >= 0 ? Number(modalFinalExamMaxScore) : 30,
      finalExamScores: existingTarget?.finalExamScores || {},
      studentList: existingTarget?.studentList,
      scores: [],
      createdAt: existingTarget?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dataService.saveScoreSheet(newSheet);
    setActiveTermTab(modalTerm);
    setActiveSheetId(targetSheetId);
    setActiveChapterTab(1);
    setShowConfigModal(false);

    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.65 },
      });
    } catch {
      // ignore
    }
  };

  // Delete subject (Works from modal or from subject bar)
  const handleDeleteSubject = (sheetIdToDelete: string) => {
    const target = scoreSheets.find((s) => s.id === sheetIdToDelete);
    if (!target) return;

    dataService.showAlert({
      type: 'warning',
      title: 'ยืนยันการลบรายวิชา?',
      text: `คุณต้องการลบรายวิชา "${target.subjectName}" ใช่หรือไม่? ข้อมูลคะแนนทั้งหมดของวิชานี้จะถูกลบ`,
      showCancelButton: true,
      confirmButtonText: 'ลบวิชานี้',
      cancelButtonText: 'ยกเลิก',
      onConfirm: () => {
        dataService.deleteScoreSheet(sheetIdToDelete);
        setShowConfigModal(false);

        const remaining = scoreSheets.filter((s) => s.id !== sheetIdToDelete);
        if (remaining.length > 0) {
          setActiveSheetId(remaining[0].id);
        } else {
          const fresh = dataService.getScoreSheets();
          setActiveSheetId(fresh[0]?.id || '');
        }
        setActiveChapterTab(1);
      },
    });
  };

  // Active Chapter Object
  const currentActiveChapter = useMemo(() => {
    if (typeof activeChapterTab !== 'number') return null;
    return currentChapters.find((ch) => ch.chapterNumber === activeChapterTab) || currentChapters[0];
  }, [currentChapters, activeChapterTab]);

  // Handle student name change directly from table (supports per-sheet student lists)
  const handleUpdateStudentName = (studentId: string, newFullName: string) => {
    if (!activeSheet || !newFullName.trim()) return;

    const currentList = currentSheetStudents;
    const updatedList = currentList.map((s) => {
      if (s.id === studentId) {
        let prefix = s.prefix || '';
        let rest = newFullName.trim();
        const prefixes = ['เด็กชาย', 'เด็กหญิง', 'ด.ช.', 'ด.ญ.', 'นาย', 'นางสาว', 'น.ส.'];
        for (const p of prefixes) {
          if (rest.startsWith(p)) {
            prefix = p;
            rest = rest.substring(p.length).trim();
            break;
          }
        }
        const parts = rest.split(/\s+/);
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';
        return {
          ...s,
          prefix,
          firstName: firstName || newFullName.trim(),
          lastName,
        };
      }
      return s;
    });

    const updatedSheet: ScoreSheet = {
      ...activeSheet,
      studentList: updatedList,
      updatedAt: new Date().toISOString(),
    };

    dataService.saveScoreSheet(updatedSheet, true);
    triggerAutoSaveEffect();
  };

  // Copy / Pick student from student registry (แก้5)
  const handleCopySingleStudent = (pickedStudent: Student) => {
    if (!activeSheet) return;
    if (targetStudentRowId) {
      // Replace specific student row with picked student info
      const updatedList = currentSheetStudents.map((s) => {
        if (s.id === targetStudentRowId) {
          return {
            ...s,
            prefix: pickedStudent.prefix || '',
            firstName: pickedStudent.firstName,
            lastName: pickedStudent.lastName,
            nickname: pickedStudent.nickname || '',
          };
        }
        return s;
      });
      const updatedSheet: ScoreSheet = {
        ...activeSheet,
        studentList: updatedList,
        updatedAt: new Date().toISOString(),
      };
      dataService.saveScoreSheet(updatedSheet, true);
      triggerAutoSaveEffect();
      dataService.notifyToast('success', 'คัดลอกข้อมูลนักเรียนแล้ว', `เปลี่ยนชื่อเป็น ${pickedStudent.prefix || ''}${pickedStudent.firstName} ${pickedStudent.lastName}`);
    } else {
      // Add as new row if no target row specified
      const currentList = currentSheetStudents;
      const newOrder = currentList.length + 1;
      const newStudent: SheetStudent = {
        id: pickedStudent.id || `std-row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        order: newOrder,
        prefix: pickedStudent.prefix || '',
        firstName: pickedStudent.firstName,
        lastName: pickedStudent.lastName,
        nickname: pickedStudent.nickname || '',
      };
      const updatedList = [...currentList, newStudent];
      const updatedSheet: ScoreSheet = {
        ...activeSheet,
        studentList: updatedList,
        updatedAt: new Date().toISOString(),
      };
      dataService.saveScoreSheet(updatedSheet, true);
      triggerAutoSaveEffect();
      dataService.notifyToast('success', 'เพิ่มนักเรียนแล้ว', `เพิ่ม ${pickedStudent.prefix || ''}${pickedStudent.firstName} ${pickedStudent.lastName}`);
    }
  };

  // Bulk import students from a grade level or multiple selection (แทนที่ข้อมูลเดิมทันทีตามจำนวนจริงของแต่ละชั้นที่เลือก)
  const handleCopyMultipleStudents = (selectedStudents: Student[], gradeLabel?: string) => {
    if (!activeSheet || selectedStudents.length === 0) return;

    // ข้อมูลชื่อเก่าจะถูกลบอัตโนมัติ และชื่อคัดลอกใหม่จะมาแทนที่ ตามจำนวนจริงของแต่ละชั้นที่เลือก
    const updatedList: SheetStudent[] = selectedStudents.map((st, idx) => ({
      id: st.id,
      order: idx + 1,
      prefix: st.prefix || '',
      firstName: st.firstName,
      lastName: st.lastName,
      nickname: st.nickname || '',
    }));

    const detectedGrade = selectedStudents[0]?.gradeLevel;
    const finalGradeLabel = gradeLabel || detectedGrade || activeSheet.classroom;

    const updatedSheet: ScoreSheet = {
      ...activeSheet,
      classroom: detectedGrade || activeSheet.classroom,
      studentList: updatedList,
      updatedAt: new Date().toISOString(),
    };
    dataService.saveScoreSheet(updatedSheet, true);
    setScoreSheets(dataService.getScoreSheets());
    triggerAutoSaveEffect();
    dataService.notifyToast(
      'success',
      'คัดลอกรายชื่อสำเร็จ',
      `คัดลอกรายชื่อนักเรียนชั้น ${finalGradeLabel} (${updatedList.length} คน) เรียบร้อยแล้ว`
    );
    setShowCopyStudentModal(false);
    setShowCopyAllStudentsModal(false);
  };

  // Add a new student row to this specific class/sheet
  const handleAddStudentRow = () => {
    if (!activeSheet) return;
    const currentList = currentSheetStudents;
    const newOrder = currentList.length + 1;
    const newStudent: SheetStudent = {
      id: `std-row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      order: newOrder,
      prefix: '',
      firstName: `นักเรียนคนที่ ${newOrder}`,
      lastName: '',
      nickname: '',
    };
    const updatedList = [...currentList, newStudent];
    const updatedSheet: ScoreSheet = {
      ...activeSheet,
      studentList: updatedList,
      updatedAt: new Date().toISOString(),
    };

    dataService.saveScoreSheet(updatedSheet, true);
    triggerAutoSaveEffect();
    dataService.notifyToast('success', 'เพิ่มแถวนักเรียนเรียบร้อย', `เพิ่มนักเรียนลำดับที่ ${newOrder} ในชั้นนี้แล้ว`);
  };

  // Remove a student row from this specific class/sheet
  const handleRemoveStudentRow = (studentId: string, studentName: string) => {
    if (!activeSheet) return;

    dataService.showAlert({
      type: 'warning',
      title: 'ยืนยันลบแถวนักเรียน?',
      text: `คุณต้องการลบ "${studentName}" ออกจากรายวิชานี้ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: 'ลบแถวนี้',
      cancelButtonText: 'ยกเลิก',
      onConfirm: () => {
        const filtered = currentSheetStudents.filter((s) => s.id !== studentId);
        const reordered = filtered.map((s, idx) => ({ ...s, order: idx + 1 }));

        const updatedChapters = currentChapters.map((ch) => {
          const scores = { ...ch.scores };
          delete scores[studentId];
          return { ...ch, scores };
        });
        const finalExamScores = { ...(activeSheet.finalExamScores || {}) };
        delete finalExamScores[studentId];

        const updatedSheet: ScoreSheet = {
          ...activeSheet,
          chapters: updatedChapters,
          finalExamScores,
          studentList: reordered,
          updatedAt: new Date().toISOString(),
        };

        dataService.saveScoreSheet(updatedSheet, true);
        triggerAutoSaveEffect();
        dataService.notifyToast('success', 'ลบแถวนักเรียนเรียบร้อย');
      },
    });
  };

  // Update a topic's title in the active chapter (Req 2 & 4: 2 บรรทัด & บันทึกอัตโนมัติ)
  const handleUpdateTopicTitle = (chapterNum: number, topicIdx: number, newTitle: string) => {
    if (!activeSheet) return;

    const updatedChapters = currentChapters.map((ch) => {
      if (ch.chapterNumber === chapterNum) {
        const newTopics = [...ch.topics];
        newTopics[topicIdx] = newTitle;
        return { ...ch, topics: newTopics };
      }
      return ch;
    });

    const updatedSheet: ScoreSheet = {
      ...activeSheet,
      chapters: updatedChapters,
      chapterCount: updatedChapters.length,
      updatedAt: new Date().toISOString(),
    };

    dataService.saveScoreSheet(updatedSheet, true);
    triggerAutoSaveEffect();
  };

  // Add a new topic (เรื่องที่ 11, 12...) to the active chapter
  const handleAddTopic = (chapterNum: number) => {
    if (!activeSheet) return;

    const updatedChapters = currentChapters.map((ch) => {
      if (ch.chapterNumber === chapterNum) {
        const newTopicIndex = ch.topics.length + 1;
        const newTopics = [...ch.topics, `เรื่องที่ ${newTopicIndex}`];
        return { ...ch, topics: newTopics };
      }
      return ch;
    });

    const updatedSheet: ScoreSheet = {
      ...activeSheet,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    };

    dataService.saveScoreSheet(updatedSheet, true);
    triggerAutoSaveEffect();
    dataService.notifyToast('success', 'เพิ่มเรื่องสำเร็จ', `เพิ่มเรื่องที่ ${currentActiveChapter?.topics.length ? currentActiveChapter.topics.length + 1 : 1} เรียบร้อย`);
  };

  // Remove a topic from the active chapter
  const handleRemoveTopic = (chapterNum: number, topicIdx: number) => {
    if (!activeSheet) return;

    dataService.showAlert({
      type: 'warning',
      title: 'ยืนยันการลบเรื่อง?',
      text: `คุณต้องการลบ "เรื่องที่ ${topicIdx + 1}" ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: 'ลบเรื่อง',
      cancelButtonText: 'ยกเลิก',
      onConfirm: () => {
        const updatedChapters = currentChapters.map((ch) => {
          if (ch.chapterNumber === chapterNum) {
            const newTopics = ch.topics.filter((_, idx) => idx !== topicIdx);
            const newScores: Record<string, (number | '-' | null)[]> = {};
            Object.entries(ch.scores).forEach(([stdId, arr]) => {
              newScores[stdId] = arr.filter((_, idx) => idx !== topicIdx);
            });
            return { ...ch, topics: newTopics, scores: newScores };
          }
          return ch;
        });

        const updatedSheet: ScoreSheet = {
          ...activeSheet,
          chapters: updatedChapters,
          updatedAt: new Date().toISOString(),
        };

        dataService.saveScoreSheet(updatedSheet, true);
        triggerAutoSaveEffect();
        dataService.notifyToast('success', 'ลบเรื่องเรียบร้อย');
      },
    });
  };

  // Set a student's score for a specific topic (0, 1, 2, 3, 4, 5, or '-')
  const handleSetTopicScore = (
    studentId: string,
    chapterNum: number,
    topicIdx: number,
    score: number | '-'
  ) => {
    if (!activeSheet) return;

    const updatedChapters = currentChapters.map((ch) => {
      if (ch.chapterNumber === chapterNum) {
        const studentScores = ch.scores[studentId] ? [...ch.scores[studentId]] : Array(ch.topics.length).fill('-');
        while (studentScores.length < ch.topics.length) studentScores.push('-');
        studentScores[topicIdx] = score;

        return {
          ...ch,
          scores: {
            ...ch.scores,
            [studentId]: studentScores,
          },
        };
      }
      return ch;
    });

    const updatedSheet: ScoreSheet = {
      ...activeSheet,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    };

    dataService.saveScoreSheet(updatedSheet, true);
    triggerAutoSaveEffect();
    setActiveScorePopover(null);
  };

  // Set Final Exam Score for a student
  const handleSetFinalExamScore = (studentId: string, value: number | '-') => {
    if (!activeSheet) return;
    const max = activeSheet.finalExamMaxScore !== undefined ? activeSheet.finalExamMaxScore : 30;

    let finalVal: number | '-' = value;
    if (typeof value === 'number') {
      finalVal = Math.max(0, Math.min(max, value));
    }

    const currentScores = { ...(activeSheet.finalExamScores || {}) };
    currentScores[studentId] = finalVal;

    const updatedSheet: ScoreSheet = {
      ...activeSheet,
      finalExamScores: currentScores,
      updatedAt: new Date().toISOString(),
    };

    dataService.saveScoreSheet(updatedSheet, true);
    triggerAutoSaveEffect();
  };

  // Fill full scores for final exam
  const handleFillAllFinalExamMax = () => {
    if (!activeSheet) return;
    const max = activeSheet.finalExamMaxScore !== undefined ? activeSheet.finalExamMaxScore : 30;
    const newScores: Record<string, number> = {};
    currentSheetStudents.forEach((s) => {
      newScores[s.id] = max;
    });

    const updatedSheet: ScoreSheet = {
      ...activeSheet,
      finalExamScores: newScores,
      updatedAt: new Date().toISOString(),
    };

    dataService.saveScoreSheet(updatedSheet);
    triggerAutoSaveEffect();
    dataService.notifyToast('success', 'บันทึกสำเร็จ', `เติมคะแนนสอบปลายภาคเต็ม (${max}) ให้ทุกคนเรียบร้อยแล้ว`);
  };

  // Clear final exam scores
  const handleClearFinalExam = () => {
    if (!activeSheet) return;

    dataService.showAlert({
      type: 'warning',
      title: 'ยืนยันล้างคะแนนสอบปลายภาค?',
      text: 'คุณต้องการล้างคะแนนสอบปลายภาคทั้งหมดใช่หรือไม่?',
      showCancelButton: true,
      confirmButtonText: 'ล้างคะแนน',
      cancelButtonText: 'ยกเลิก',
      onConfirm: () => {
        const updatedSheet: ScoreSheet = {
          ...activeSheet,
          finalExamScores: {},
          updatedAt: new Date().toISOString(),
        };

        dataService.saveScoreSheet(updatedSheet);
        triggerAutoSaveEffect();
        dataService.notifyToast('success', 'ล้างคะแนนสอบปลายภาคเรียบร้อย');
      },
    });
  };

  // SCALING / WEIGHTING CALCULATION:
  // Loops across all topics dynamically. If column has no title -> excluded from calculation.
  const computeChapterStudentScore = (chapter: ScoreChapter, studentId: string) => {
    const scores = chapter.scores[studentId] || [];
    const topics = chapter.topics || [];

    let activeTopicsCount = 0;
    let rawScore = 0;

    for (let i = 0; i < topics.length; i++) {
      const topicTitle = topics[i]?.trim();
      if (topicTitle && topicTitle.length > 0) {
        activeTopicsCount++;
        const val = scores[i];
        if (typeof val === 'number') {
          rawScore += Math.max(0, Math.min(5, val));
        }
      }
    }

    const maxRawScore = activeTopicsCount * 5;
    const targetMax = chapter.maxScore || 15;

    let scaledScore = 0;
    if (maxRawScore > 0) {
      scaledScore = Number(((rawScore / maxRawScore) * targetMax).toFixed(2));
    }

    return {
      activeTopicsCount,
      rawScore,
      maxRawScore,
      targetMax,
      scaledScore,
    };
  };

  // Compute all students' scores across all chapters + Final Exam for summary table
  const allStudentsSummary = useMemo(() => {
    const gradingSys = activeSheet?.gradingSystem || 'thai_standard';
    const finalExamMax = activeSheet?.finalExamMaxScore !== undefined ? activeSheet.finalExamMaxScore : 30;
    const finalExamScores = activeSheet?.finalExamScores || {};

    return currentSheetStudents.map((student, idx) => {
      const chapterScaledScores: Record<number, number> = {};
      let totalChapterScaled = 0;
      let totalChapterMax = 0;

      currentChapters.forEach((ch) => {
        const stats = computeChapterStudentScore(ch, student.id);
        chapterScaledScores[ch.chapterNumber] = stats.scaledScore;
        totalChapterScaled += stats.scaledScore;
        totalChapterMax += stats.targetMax;
      });

      // Final exam score
      const rawFinal = finalExamScores[student.id];
      const finalExamNum = typeof rawFinal === 'number' ? rawFinal : 0;
      const totalScore = Number((totalChapterScaled + finalExamNum).toFixed(1));
      const grandMax = totalChapterMax + finalExamMax;

      const percentage = grandMax > 0 ? Number(((totalScore / grandMax) * 100).toFixed(1)) : 0;
      const grade = calculateGradeFromPercent(percentage, gradingSys);

      return {
        studentId: student.id,
        order: idx + 1,
        studentName: `${student.prefix || ''}${student.firstName} ${student.lastName}`.trim(),
        nickname: student.nickname,
        chapterScaledScores,
        totalChapterScaled: Number(totalChapterScaled.toFixed(1)),
        totalChapterMax,
        finalExamScore: typeof rawFinal === 'number' ? rawFinal : (rawFinal === '-' ? '-' : '-'),
        finalExamNum,
        totalScore,
        totalTargetMax: grandMax,
        percentage,
        grade,
      };
    });
  }, [currentSheetStudents, currentChapters, activeSheet]);

  // Overall Statistics
  const averagePercentage =
    allStudentsSummary.length > 0
      ? (allStudentsSummary.reduce((sum, r) => sum + r.percentage, 0) / allStudentsSummary.length).toFixed(1)
      : '0';

  const gradeCounts: Record<string, number> = {};
  allStudentsSummary.forEach((r) => {
    gradeCounts[r.grade] = (gradeCounts[r.grade] || 0) + 1;
  });

  // Fill all 5 for current active chapter
  const handleFillAllFives = () => {
    if (!currentActiveChapter || !activeSheet) return;
    const chNum = currentActiveChapter.chapterNumber;
    const newScores: Record<string, (number | '-')[]> = {};

    currentSheetStudents.forEach((s) => {
      const arr = Array(currentActiveChapter.topics.length).fill('-');
      currentActiveChapter.topics.forEach((t, idx) => {
        if (t?.trim()) arr[idx] = 5;
      });
      newScores[s.id] = arr;
    });

    const updatedChapters = currentChapters.map((ch) => {
      if (ch.chapterNumber === chNum) {
        return { ...ch, scores: newScores };
      }
      return ch;
    });

    const updatedSheet: ScoreSheet = {
      ...activeSheet,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    };

    dataService.saveScoreSheet(updatedSheet);
    dataService.notifyToast('success', 'บันทึกคะแนนเต็ม', `กำหนดคะแนนเต็ม (5) ให้ทุกคนใน ${currentActiveChapter.title} เรียบร้อยแล้ว`);
  };

  // Clear scores for current chapter
  const handleClearChapterScores = () => {
    if (!currentActiveChapter || !activeSheet) return;

    dataService.showAlert({
      type: 'warning',
      title: 'ยืนยันล้างคะแนนประจำบท?',
      text: `คุณต้องการล้างคะแนนใน ${currentActiveChapter.title} ทั้งหมดใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: 'ล้างคะแนน',
      cancelButtonText: 'ยกเลิก',
      onConfirm: () => {
        const chNum = currentActiveChapter.chapterNumber;
        const updatedChapters = currentChapters.map((ch) => {
          if (ch.chapterNumber === chNum) {
            return { ...ch, scores: {} };
          }
          return ch;
        });

        const updatedSheet: ScoreSheet = {
          ...activeSheet,
          chapters: updatedChapters,
          updatedAt: new Date().toISOString(),
        };

        dataService.saveScoreSheet(updatedSheet);
        dataService.notifyToast('success', 'ล้างคะแนนเรียบร้อย');
      },
    });
  };

  // Filter subjects in active term by search query
  const filteredTermSheets = useMemo(() => {
    if (!subjectSearchQuery.trim()) return currentTermSheets;
    const q = subjectSearchQuery.toLowerCase().trim();
    return currentTermSheets.filter(
      (s) =>
        s.subjectName.toLowerCase().includes(q) ||
        (s.subjectCode && s.subjectCode.toLowerCase().includes(q)) ||
        (s.classroom && s.classroom.toLowerCase().includes(q))
    );
  }, [currentTermSheets, subjectSearchQuery]);

  // Navigate to previous/next subject
  const handlePrevSubject = () => {
    if (currentTermSheets.length <= 1) return;
    const currentIdx = currentTermSheets.findIndex((s) => s.id === activeSheetId);
    const newIdx = currentIdx <= 0 ? currentTermSheets.length - 1 : currentIdx - 1;
    setActiveSheetId(currentTermSheets[newIdx].id);
    setActiveChapterTab(1);
  };

  const handleNextSubject = () => {
    if (currentTermSheets.length <= 1) return;
    const currentIdx = currentTermSheets.findIndex((s) => s.id === activeSheetId);
    const newIdx = currentIdx >= currentTermSheets.length - 1 ? 0 : currentIdx + 1;
    setActiveSheetId(currentTermSheets[newIdx].id);
    setActiveChapterTab(1);
  };

  // Close popover, subject dropdown, and topic popup when clicking outside
  const popoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        setActiveScorePopover(null);
      }
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(target)) {
        setIsSubjectDropdownOpen(false);
      }
      if (topicPopoverRef.current && !topicPopoverRef.current.contains(target)) {
        if (!(e.target as HTMLElement).closest('.topic-toggle-btn')) {
          setExpandedTopicIdx(null);
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-16 w-full max-w-full min-w-0">
      {/* Top Header Card - Single row compact bar for tablet & clean layout */}
      <div className="flex items-center justify-between gap-2.5 bg-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <FileSpreadsheet className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-gray-900 truncate">
            กรอกคะแนน & ตัดเกรด (Grade Tracker)
          </h2>
        </div>

        {/* 3 Action Buttons on the exact same line: "+" create, edit icon, printer icon */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* 1. ปุ่มสร้างใหม่: สัญลักษณ์ "+" */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl shadow-xs transition-all cursor-pointer"
            title="สร้างวิชาใหม่ (+)"
            aria-label="สร้างวิชาใหม่"
          >
            <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
          </button>

          {/* 2. ปุ่มแก้ไขข้อมูล: สัญลักษณ์ Sliders/Edit ไม่มีข้อความ */}
          <button
            type="button"
            onClick={handleOpenEditModal}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200/80 rounded-xl transition-all cursor-pointer"
            title="แก้ไขข้อมูลวิชา / บทเรียน / คะแนนเก็บ"
            aria-label="แก้ไขข้อมูลวิชา"
          >
            <Sliders className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-600" />
          </button>

          {/* 3. ปุ่มดาวน์โหลด: สัญลักษณ์เครื่องปริ้น */}
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 border border-emerald-200 rounded-xl transition-all cursor-pointer"
            title="พิมพ์ / ดาวน์โหลดรายงานผลการเรียนเป็น PDF"
            aria-label="พิมพ์หรือดาวน์โหลดรายงานผลการเรียน"
          >
            <Printer className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>
      </div>

      {/* SUBJECT SELECTOR BAR: แทนที่การเลื่อนซ้าย-ขวา ด้วยเมนูดรอปดาวน์ "เลือกวิชา" ที่กดแล้วแสดงรายการวิชาลงมาให้เลือกทันที */}
      <div className="bg-emerald-50/80 p-2 sm:p-2.5 rounded-2xl border border-emerald-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Term selector + "เลือกวิชา" Dropdown */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {/* Compact Term Selector Buttons */}
            <div className="inline-flex items-center p-0.5 bg-white/90 rounded-lg border border-emerald-200/90 shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => handleSwitchTerm('1')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  activeTermTab === '1'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/70'
                }`}
                title="สลับไปภาคเรียนที่ 1"
              >
                <span>ภาคเรียนที่ 1</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${
                    activeTermTab === '1' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {term1Sheets.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchTerm('2')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  activeTermTab === '2'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/70'
                }`}
                title="สลับไปภาคเรียนที่ 2"
              >
                <span>ภาคเรียนที่ 2</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${
                    activeTermTab === '2' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {term2Sheets.length}
                </span>
              </button>
            </div>

            <div className="h-5 w-px bg-emerald-300/80 shrink-0 hidden sm:block mx-0.5" />

            {/* "เลือกวิชา" Dropdown Menu Component (กดแล้วแสดงลงมาให้เลือก ไม่ต้องเลื่อนซ้าย-ขวา) */}
            <div className="relative shrink-0" ref={subjectDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsSubjectDropdownOpen((prev) => !prev);
                  setSubjectSearchQuery('');
                }}
                className={`px-3 py-1.5 bg-white hover:bg-emerald-50/90 active:scale-[0.99] text-emerald-950 border rounded-xl transition-all shadow-2xs cursor-pointer flex items-center justify-between gap-2.5 min-w-[200px] sm:min-w-[260px] max-w-[340px] sm:max-w-md ${
                  isSubjectDropdownOpen ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-emerald-300'
                }`}
                title="คลิกเพื่อเลือกรายวิชาที่จะกรอกคะแนน (แสดงรายการลงมาให้เลือก)"
                aria-expanded={isSubjectDropdownOpen}
                aria-haspopup="listbox"
                aria-label="เลือกวิชาที่จะกรอกคะแนน"
              >
                <div className="flex items-center gap-2 min-w-0 text-left">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-medium text-emerald-800 shrink-0">วิชา:</span>
                      <span className="text-xs font-bold text-emerald-950 truncate max-w-[140px] sm:max-w-[190px]">
                        {activeSheet?.subjectName || 'เลือกวิชา...'}
                      </span>
                      {activeSheet?.subjectCode && (
                        <span className="text-[10px] text-emerald-700 opacity-80 font-normal shrink-0">
                          ({activeSheet.subjectCode})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {activeSheet?.classroom && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-md font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                      {activeSheet.classroom.replace('ชั้นประถมศึกษาปีที่ ', 'ป.')}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-emerald-700 transition-transform duration-200 ${
                      isSubjectDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Dropdown Popover แสดงรายการวิชาลงมาให้เลือก */}
              {isSubjectDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-40 w-80 sm:w-96 bg-white rounded-2xl border border-emerald-200 shadow-xl p-2.5 animate-in fade-in zoom-in-95 duration-150">
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-1">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-slate-800">
                        เลือกวิชาที่จะกรอกคะแนน (ภาคเรียนที่ {activeTermTab})
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {currentTermSheets.length} วิชา
                    </span>
                  </div>

                  {/* Search box if 4 or more subjects */}
                  {currentTermSheets.length >= 4 && (
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={subjectSearchQuery}
                        onChange={(e) => setSubjectSearchQuery(e.target.value)}
                        placeholder="พิมพ์เพื่อค้นหารายวิชา..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:border-emerald-500 focus:bg-white outline-hidden"
                        autoFocus
                      />
                      {subjectSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setSubjectSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* List of Subjects */}
                  <div className="max-h-64 overflow-y-auto space-y-1 pr-0.5">
                    {filteredTermSheets.length > 0 ? (
                      filteredTermSheets.map((sheet) => {
                        const isActive = sheet.id === activeSheetId;
                        const totalMax =
                          (sheet.chapters || []).reduce((sum, c) => sum + (c.maxScore || 15), 0) +
                          (sheet.finalExamMaxScore ?? 30);

                        return (
                          <div
                            key={sheet.id}
                            onClick={() => {
                              setActiveSheetId(sheet.id);
                              setActiveChapterTab(1);
                              setIsSubjectDropdownOpen(false);
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer group ${
                              isActive
                                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                : 'hover:bg-emerald-50 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                                  isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs truncate">{sheet.subjectName}</span>
                                  {sheet.subjectCode && (
                                    <span
                                      className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {sheet.subjectCode}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] mt-0.5 opacity-80">
                                  {sheet.classroom && (
                                    <span>{sheet.classroom.replace('ชั้นประถมศึกษาปีที่ ', 'ป.')}</span>
                                  )}
                                  <span>•</span>
                                  <span>{sheet.chapters?.length || sheet.chapterCount || 0} บท</span>
                                  <span>•</span>
                                  <span>เต็ม {totalMax} คะแนน</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isActive && <Check className="w-4 h-4 text-white mr-1" />}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSubject(sheet.id);
                                }}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isActive
                                    ? 'text-emerald-200 hover:text-white hover:bg-emerald-700'
                                    : 'text-slate-300 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                                title={`ลบรายวิชา "${sheet.subjectName}"`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-500">
                        {subjectSearchQuery ? 'ไม่พบรายวิชาที่ตรงกับการค้นหา' : 'ยังไม่มีรายวิชาในภาคเรียนนี้'}
                      </div>
                    )}
                  </div>

                  {/* Dropdown Footer Actions */}
                  <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSubjectDropdownOpen(false);
                        handleOpenCreateModal(activeTermTab);
                      }}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>เพิ่มรายวิชาใหม่ (+)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSubjectDropdownOpen(false);
                        handleOpenEditModal();
                      }}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="แก้ไขข้อมูลวิชานี้และบทเรียน"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>แก้ไขวิชา</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ปุ่มกดสลับวิชาก่อนหน้า/ถัดไป สะดวกไม่ต้องเปิดเมนูก็เปลี่ยนวิชาได้ */}
            {currentTermSheets.length > 1 && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handlePrevSubject}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-emerald-800 hover:bg-emerald-100/80 border border-emerald-300/80 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="สลับไปวิชาก่อนหน้า"
                  aria-label="วิชาก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextSubject}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-emerald-800 hover:bg-emerald-100/80 border border-emerald-300/80 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="สลับไปวิชาถัดไป"
                  aria-label="วิชาถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ปุ่มบวกเพิ่มวิชาด่วน */}
            <button
              type="button"
              onClick={() => handleOpenCreateModal(activeTermTab)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
              title={`เพิ่มรายวิชาใหม่ในภาคเรียนที่ ${activeTermTab} (+)`}
              aria-label="เพิ่มรายวิชาใหม่"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* UNIFIED SCORE WORKSPACE: Chapter Selector is directly attached to the score input table */}
      <div
        className={
          isTableFullscreen
            ? 'fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 flex flex-col animate-in fade-in duration-150'
            : 'contents'
        }
      >
        <div
          className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col overflow-hidden ${
            isTableFullscreen ? 'w-full h-full shadow-2xl' : ''
          }`}
        >
          {/* TOP ATTACHED BAR: Chapter Selector & Navigation (เน้น Tablet View สะอาดตา บรรทัดเดียว) */}
          <div className="px-3.5 py-2.5 bg-slate-50/75 border-b border-slate-200 shrink-0">
            <div className="flex items-center justify-between gap-2">
              {/* Left Side: Chapter Title in front, followed by small circular buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none min-w-0 py-0.5">
                {/* ชื่อบท / ชื่อแท็บที่เลือกอยู่ด้านหน้าสุด */}
                <div className="flex items-center gap-1.5 shrink-0 pr-1 border-r border-slate-200">
                  <BookOpen className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 whitespace-nowrap max-w-[130px] sm:max-w-[200px] md:max-w-xs truncate">
                    {typeof activeChapterTab === 'number' && currentActiveChapter
                      ? `บทที่ ${currentActiveChapter.chapterNumber}: ${currentActiveChapter.title}`
                      : activeChapterTab === 'final'
                      ? 'คะแนนสอบปลายภาค'
                      : 'สรุปรวมทุกบทเรียน'}
                  </span>
                </div>

                {/* Circular buttons for Chapter 1, 2, 3... ขนาดเล็ก */}
                <div className="flex items-center gap-1 shrink-0">
                  {currentChapters.map((ch) => {
                    const isSelected = activeChapterTab === ch.chapterNumber;
                    return (
                      <button
                        key={`tab-circle-${ch.chapterNumber}`}
                        type="button"
                        onClick={() => setActiveChapterTab(ch.chapterNumber)}
                        className={`w-7 h-7 rounded-full font-bold text-xs transition-all flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-300 scale-105'
                            : 'bg-white text-slate-700 hover:bg-sky-50 hover:text-sky-700 border border-slate-200'
                        }`}
                        title={`บทที่ ${ch.chapterNumber}: ${ch.title} (เต็ม ${ch.maxScore || 15} คะแนน)`}
                        aria-label={`บทที่ ${ch.chapterNumber}`}
                      >
                        {ch.chapterNumber}
                      </button>
                    );
                  })}
                </div>

                <div className="h-4 w-px bg-slate-200 shrink-0 mx-0.5" />

                {/* แก้2: ปุ่มสอบ ปรับเป็นวงกลมแล้วเป็นตัวอักษร "ส" */}
                <button
                  type="button"
                  onClick={() => setActiveChapterTab('final')}
                  className={`w-7 h-7 rounded-full font-black text-xs transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                    activeChapterTab === 'final'
                      ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-300 scale-105'
                      : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-300'
                  }`}
                  title={`สอบปลายภาค (เต็ม ${activeSheet?.finalExamMaxScore !== undefined ? activeSheet.finalExamMaxScore : 30} คะแนน)`}
                  aria-label="สอบปลายภาค"
                >
                  ส
                </button>

                {/* แก้3: ปุ่มรวมทุกบท ปรับเป็นวงกลมคำว่า "All" */}
                <button
                  type="button"
                  onClick={() => setActiveChapterTab('summary')}
                  className={`w-7 h-7 rounded-full font-bold text-[11px] transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                    activeChapterTab === 'summary'
                      ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300 scale-105'
                      : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-300'
                  }`}
                  title="รวมทุกบทเรียน และสรุปเกรด"
                  aria-label="รวมทุกบทเรียน"
                >
                  All
                </button>

                {/* สัญลักษณ์เครื่องปริ้น แสดงอยู่ทุกวิชา ถัดจากสัญลักษณ์ "All" ตรงบทหรือที่กรอกคะแนน เพื่อที่จะสามารถดาวน์โหลดได้ตรงวิชา และตรงชั้นเรียน */}
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="w-7 h-7 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-900 border border-emerald-300 flex items-center justify-center shrink-0 cursor-pointer transition-all shadow-2xs hover:scale-105 active:scale-95 ml-0.5"
                  title={`พิมพ์ / ดาวน์โหลดรายงานผลการเรียน (${activeSheet?.subjectName || 'วิชานี้'} - ${activeSheet?.classroom || profile.classroomName || 'ตรงชั้นเรียน'})`}
                  aria-label="พิมพ์หรือดาวน์โหลดรายงานผลการเรียน"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>

                {/* สัญลักษณ์คัดลอกรายชื่อจากชั้นเรียน ถัดจากไอคอนเครื่องปริ้น All */}
                <button
                  type="button"
                  onClick={() => {
                    setTargetStudentRowId(null);
                    setShowCopyAllStudentsModal(true);
                  }}
                  className="w-7 h-7 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-900 border border-purple-300 flex items-center justify-center shrink-0 cursor-pointer transition-all shadow-2xs hover:scale-105 active:scale-95 ml-0.5"
                  title="คัดลอกรายชื่อจากชั้นเรียน"
                  aria-label="คัดลอกรายชื่อจากชั้นเรียน"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Right Side: แก้6 ปุ่มขยาย/ย่อ ไม่ต้องมีข้อความ แสดงสัญลักษณ์พอ */}
              <div className="flex items-center gap-1.5 shrink-0 pl-1">
                {isTableFullscreen ? (
                  <button
                    type="button"
                    onClick={() => setIsTableFullscreen(false)}
                    className="w-8 h-8 flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                    title="ย่อหน้าต่างกลับ (Esc)"
                    aria-label="ย่อหน้าต่าง"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsTableFullscreen(true)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer active:scale-95"
                    title="ขยายตารางเต็มหน้าต่าง"
                    aria-label="ขยายตารางเต็มหน้าต่าง"
                  >
                    <Maximize2 className="w-4 h-4 text-slate-600" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* WORKSPACE CONTENT: DIRECTLY ATTACHED */}
          <div className={`p-4 sm:p-5 space-y-4 ${isTableFullscreen ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}`}>
            {/* VIEW 1: SINGLE CHAPTER SCORE GRID */}
            {typeof activeChapterTab === 'number' && currentActiveChapter && (
              <div className={`space-y-4 ${isTableFullscreen ? 'flex-1 min-h-0 flex flex-col' : ''}`}>
                {/* Sticky Table Container */}
                <div className={`overflow-x-auto overflow-y-auto border border-slate-200 rounded-2xl relative shadow-2xs ${
                  isTableFullscreen ? 'flex-1 min-h-0' : 'max-h-[70vh]'
                }`}>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 z-20 shadow-xs border-b border-slate-200">
                      <tr className="bg-slate-100 text-slate-700 font-semibold">
                        {/* Sticky left columns */}
                        <th className="py-2.5 px-2.5 w-12 text-center align-bottom sticky top-0 left-0 z-30 bg-slate-100 border-r border-slate-200">
                          ลำดับ
                        </th>
                        <th className="py-2.5 px-3 min-w-[190px] align-bottom sticky top-0 left-12 z-30 bg-slate-100 border-r border-slate-200">
                          ชื่อ - นามสกุล นักเรียน
                        </th>

                  {/* Dynamic Topic Columns: กดตรงเรื่องแล้วแสดงข้อความแบบเต็มๆ ถ้าไม่กดก็แสดงปกติเหมือนหน้าปัจจุบัน */}
                  {currentActiveChapter.topics.map((topicTitle, i) => {
                    const isTopicActive = !!topicTitle.trim();
                    const isExpanded = expandedTopicIdx === i;

                    return (
                      <th
                        key={`topic-head-${i}`}
                        className={`py-1.5 px-0.5 text-center align-top sticky top-0 z-20 border-r border-slate-200/80 transition-all ${
                          isExpanded
                            ? 'bg-sky-100/95 ring-2 ring-sky-500 z-30 w-44 min-w-[170px]'
                            : isTopicActive
                            ? 'bg-sky-50/95 w-16 min-w-[66px] sm:min-w-[72px] max-w-[80px]'
                            : 'bg-slate-100/95 opacity-80 w-16 min-w-[66px] sm:min-w-[72px] max-w-[80px]'
                        }`}
                      >
                        <div className="space-y-0.5 relative">
                          {/* Header row: Clickable "เรื่อง i+1" button */}
                          <div className="flex items-center justify-between px-0.5 gap-0.5">
                            <button
                              type="button"
                              onClick={() => setExpandedTopicIdx(isExpanded ? null : i)}
                              className={`topic-toggle-btn text-[9px] font-bold px-1 py-0.5 rounded transition-all cursor-pointer flex items-center gap-0.5 ${
                                isExpanded
                                  ? 'bg-sky-700 text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-sky-900 bg-white/70 hover:bg-sky-100 border border-slate-200/80'
                              }`}
                              title={isExpanded ? 'คลิกเพื่อย่อกลับ' : 'คลิกเพื่อแสดงข้อความแบบเต็มๆ'}
                            >
                              <span>เรื่อง {i + 1}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-2.5 h-2.5" />
                              ) : (
                                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                              )}
                            </button>

                            {currentActiveChapter.topics.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTopic(currentActiveChapter.chapterNumber, i)}
                                className="text-slate-300 hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                                title={`ลบเรื่องที่ ${i + 1}`}
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>

                          {/* When NOT expanded: แสดงปกติเหมือนหน้าปัจจุบัน */}
                          {!isExpanded && (
                            <>
                              <textarea
                                rows={2}
                                value={topicTitle}
                                onChange={(e) =>
                                  handleUpdateTopicTitle(
                                    currentActiveChapter.chapterNumber,
                                    i,
                                    e.target.value
                                  )
                                }
                                placeholder="ชื่อเรื่อง..."
                                className="w-full px-1 py-0.5 text-center font-bold text-[10px] rounded-md border border-slate-300 focus:border-sky-500 bg-white outline-hidden shadow-2xs resize-none leading-tight break-words"
                                title="พิมพ์ชื่อเรื่อง (หรือคลิกที่ 'เรื่อง' ด้านบนเพื่อดูข้อความเต็ม)"
                              />
                              {isTopicActive ? (
                                <span className="inline-block text-[8px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded leading-tight">
                                  เต็ม 5
                                </span>
                              ) : (
                                <span className="inline-block text-[8px] font-medium text-slate-400 bg-slate-200/80 px-1 py-0.2 rounded leading-tight">
                                  ไม่คิดคะแนน
                                </span>
                              )}
                            </>
                          )}

                          {/* When EXPANDED: แสดงข้อความแบบเต็มๆ พร้อมช่องแก้ไขแบบกว้าง */}
                          {isExpanded && (
                            <div className="space-y-1.5 p-1 bg-white rounded-lg border border-sky-300 shadow-sm text-left">
                              <div className="p-1.5 bg-sky-50/70 rounded-md border border-sky-100">
                                <span className="text-[9px] font-bold text-sky-800 block mb-0.5">
                                  ข้อความเต็ม:
                                </span>
                                <p className="text-[11px] font-semibold text-slate-800 break-words leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                                  {topicTitle.trim() || '(ยังไม่ได้ระบุชื่อเรื่อง)'}
                                </p>
                              </div>

                              <textarea
                                rows={3}
                                value={topicTitle}
                                onChange={(e) =>
                                  handleUpdateTopicTitle(
                                    currentActiveChapter.chapterNumber,
                                    i,
                                    e.target.value
                                  )
                                }
                                placeholder="แก้ไขชื่อเรื่องเต็ม..."
                                className="w-full px-1.5 py-1 text-left font-semibold text-[10px] rounded-md border border-slate-200 focus:border-sky-500 bg-slate-50 focus:bg-white outline-hidden shadow-2xs resize-none leading-tight break-words"
                                title="แก้ไขชื่อเรื่อง"
                              />

                              <div className="flex items-center justify-between text-[9px] pt-0.5 border-t border-slate-100">
                                <span className="font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">
                                  เต็ม 5 คะแนน
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setExpandedTopicIdx(null)}
                                  className="text-sky-700 font-bold hover:underline cursor-pointer"
                                >
                                  ย่อกลับ
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Floating Popover: แสดงป๊อปอัปข้อความเต็มเมื่อกด เพื่อความชัดเจนบนหน้าจอที่มีการเลื่อน */}
                          {isExpanded && (
                            <div
                              ref={topicPopoverRef}
                              className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-slate-900 text-white p-3 rounded-2xl shadow-2xl border border-slate-700 w-72 text-left animate-in fade-in zoom-in-95 duration-150"
                            >
                              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-700">
                                <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                                  <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                                  เรื่องที่ {i + 1} (ข้อความเต็ม)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setExpandedTopicIdx(null)}
                                  className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                                  title="ปิด"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="py-1">
                                <p className="text-xs font-medium text-slate-100 leading-relaxed break-words max-h-48 overflow-y-auto whitespace-pre-wrap">
                                  {topicTitle.trim() || 'ยังไม่ได้ระบุชื่อเรื่อง (เว้นว่างไว้จะไม่คิดคะแนน)'}
                                </p>
                              </div>

                              <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                                <span>
                                  คะแนนเต็ม: <strong className="text-emerald-400 font-bold">5 คะแนน</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setExpandedTopicIdx(null)}
                                  className="text-sky-300 hover:text-sky-200 hover:underline font-bold cursor-pointer"
                                >
                                  ย่อกลับปกติ
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}

                  {/* Button to add topic 11, 12... (Req 4) */}
                  <th className="py-2 px-2 text-center w-16 align-middle sticky top-0 z-20 bg-slate-100 border-r border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleAddTopic(currentActiveChapter.chapterNumber)}
                      className="p-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all shadow-2xs cursor-pointer w-full"
                      title={`เพิ่มเรื่องที่ ${currentActiveChapter.topics.length + 1}`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ เรื่อง</span>
                    </button>
                  </th>

                  {/* Raw Score Total */}
                  <th className="py-2.5 px-2 w-20 text-center sticky top-0 z-20 bg-slate-100 font-bold align-bottom border-r border-slate-200">
                    คะแนนดิบ
                  </th>

                  {/* Scaled Score for Chapter */}
                  <th className="py-2.5 px-3 w-28 text-center sticky top-0 z-20 bg-emerald-50 text-emerald-800 font-bold align-bottom">
                    คะแนนเก็บ
                    <span className="block text-[10px] text-emerald-600 font-normal">
                      (เต็ม {currentActiveChapter.maxScore || 15})
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentSheetStudents.map((student, idx) => {
                  const studentScores = currentActiveChapter.scores[student.id] || [];
                  const stats = computeChapterStudentScore(currentActiveChapter, student.id);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-2.5 text-center text-slate-500 font-medium sticky left-0 z-10 bg-white border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-2 sticky left-12 z-10 bg-white border-r border-slate-100 min-w-[190px]">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenScoreModal(student)}
                            className="flex-1 text-left px-2 py-1 rounded-lg text-xs font-semibold text-slate-800 hover:text-purple-700 hover:bg-purple-50 transition-colors truncate cursor-pointer flex items-center justify-between gap-1 group/sname"
                            title="กดที่ชื่อเพื่อเปิดหน้าต่างลงคะแนน (Pop-up เต็มจอ)"
                          >
                            <span className="truncate">
                              {`${student.prefix || ''}${student.firstName} ${student.lastName}`.trim() || 'ระบุชื่อ...'}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold bg-purple-50 text-purple-700 border border-purple-200 shrink-0 group-hover/sname:bg-purple-600 group-hover/sname:text-white transition-colors">
                              ลงคะแนน
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetStudentRowId(student.id);
                              setShowCopyStudentModal(true);
                            }}
                            className="p-1 text-purple-600 hover:text-purple-800 rounded-md hover:bg-purple-50 transition-colors cursor-pointer shrink-0"
                            title="คัดลอก/เลือกชื่อนักเรียนจากทะเบียนประวัติ (แก้5)"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveStudentRow(student.id, `${student.prefix || ''}${student.firstName} ${student.lastName}`.trim())}
                            className="p-1 text-slate-300 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            title="ลบแถวนักเรียนคนนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Topic Score Cells with interactive popup choices 0,1,2,3,4,5 or - */}
                      {currentActiveChapter.topics.map((topicTitle, topicIdx) => {
                        const isTopicActive = !!topicTitle.trim();
                        const rawVal = studentScores[topicIdx];
                        const displayVal = rawVal !== undefined ? rawVal : '-';
                        const isPopoverOpen =
                          activeScorePopover?.studentId === student.id &&
                          activeScorePopover?.topicIndex === topicIdx;

                        return (
                          <td
                            key={`cell-${student.id}-${topicIdx}`}
                            className={`py-1 px-1 text-center relative border-r border-slate-100 ${
                              !isTopicActive ? 'bg-slate-50/40 opacity-60' : ''
                            }`}
                          >
                            <button
                              type="button"
                              disabled={!isTopicActive}
                              onClick={() => {
                                if (isPopoverOpen) {
                                  setActiveScorePopover(null);
                                } else {
                                  setActiveScorePopover({
                                    studentId: student.id,
                                    topicIndex: topicIdx,
                                  });
                                }
                              }}
                              className={`w-9 h-8 rounded-lg font-bold text-xs transition-all flex items-center justify-center mx-auto cursor-pointer ${
                                !isTopicActive
                                  ? 'bg-transparent text-slate-300 cursor-not-allowed'
                                  : displayVal === '-' || displayVal === null
                                  ? 'bg-slate-100 text-slate-400 hover:bg-sky-100 hover:text-sky-700'
                                  : displayVal === 5
                                  ? 'bg-emerald-100 text-emerald-800 font-black shadow-2xs'
                                  : displayVal === 0
                                  ? 'bg-rose-100 text-rose-700 font-black'
                                  : 'bg-sky-100 text-sky-800 font-bold'
                              }`}
                              title={
                                isTopicActive
                                  ? `คลิกเพื่อเลือกคะแนน (0-5 หรือ -)`
                                  : 'ไม่ได้ตั้งชื่อเรื่อง จึงไม่คิดคะแนน'
                              }
                            >
                              {displayVal}
                            </button>

                            {/* Floating Popover Choices 0..5, - */}
                            {isPopoverOpen && (
                              <div
                                ref={popoverRef}
                                className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-40 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 flex items-center gap-1"
                              >
                                {[5, 4, 3, 2, 1, 0, '-'].map((choice) => (
                                  <button
                                    key={`btn-${choice}`}
                                    type="button"
                                    onClick={() =>
                                      handleSetTopicScore(
                                        student.id,
                                        currentActiveChapter.chapterNumber,
                                        topicIdx,
                                        choice as number | '-'
                                      )
                                    }
                                    className={`w-7 h-7 rounded-lg text-xs font-black transition-transform hover:scale-110 cursor-pointer flex items-center justify-center ${
                                      choice === 5
                                        ? 'bg-emerald-500 text-white'
                                        : choice === 0
                                        ? 'bg-rose-500 text-white'
                                        : choice === '-'
                                        ? 'bg-slate-200 text-slate-700'
                                        : 'bg-sky-500 text-white'
                                    }`}
                                  >
                                    {choice}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Empty cell under + topic button */}
                      <td className="py-2 px-2 text-center bg-slate-50/40 border-r border-slate-100" />

                      {/* Raw Score */}
                      <td className="py-2 px-2 text-center bg-slate-50/40 font-bold text-slate-700 border-r border-slate-100">
                        {stats.rawScore}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          /{stats.maxRawScore}
                        </span>
                      </td>

                      {/* Scaled Score */}
                      <td className="py-2 px-3 text-center bg-emerald-50/40 font-black text-emerald-800 text-sm">
                        {stats.scaledScore}
                      </td>
                    </tr>
                  );
                })}

                {/* Add Student Row in Table */}
                <tr>
                  <td colSpan={currentActiveChapter.topics.length + 5} className="p-2.5 bg-slate-50/70 border-t border-slate-200 text-center">
                    <button
                      type="button"
                      onClick={handleAddStudentRow}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-purple-50 text-purple-700 border border-dashed border-purple-300 hover:border-purple-400 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      title="เพิ่มแถวนักเรียนใหม่ในชั้นนี้"
                    >
                      <UserPlus className="w-4 h-4 text-purple-600" />
                      <span>+ เพิ่มแถวนักเรียน (เพิ่มชื่อนักเรียนในรายวิชานี้)</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bottom Bar: Action buttons & Auto-Save indicator (ปุ่มล้างคะแนน กับ เติมคะแนน 5 ทุกคน และบันทึกอัตโนมัติอยู่ด้านล่างเลย) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              คะแนนดิบจะคิดเฉพาะเรื่องที่กรอกชื่อเรื่อง (เรื่องละ 5 คะแนน) และนำไปคำนวณเฉลี่ยเทียบกับคะแนนเก็บ{' '}
              <strong className="text-slate-900">{currentActiveChapter.maxScore || 15} คะแนน</strong> โดยอัตโนมัติ
            </div>

            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              {/* บันทึกอัตโนมัติ */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-semibold select-none">
                <CheckCircle2 className={`w-3.5 h-3.5 text-emerald-600 shrink-0 ${autoSaveStatus === 'saving' ? 'animate-spin' : ''}`} />
                <span>{autoSaveStatus === 'saving' ? 'กำลังบันทึกอัตโนมัติ...' : 'บันทึกอัตโนมัติ'}</span>
              </div>

              {/* เพิ่มแถวนักเรียน */}
              <button
                type="button"
                onClick={handleAddStudentRow}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="เพิ่มแถวนักเรียนใหม่ในชั้นนี้"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ เพิ่มแถวนักเรียน</span>
              </button>


              {/* เติมคะแนน 5 ทุกคน */}
              <button
                type="button"
                onClick={handleFillAllFives}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="ใส่คะแนนเต็ม (5) ให้ทุกคนในหัวข้อที่คิดคะแนน"
              >
                เติมคะแนน 5 ทุกคน
              </button>

              {/* ล้างคะแนน */}
              <button
                type="button"
                onClick={handleClearChapterScores}
                className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="ล้างคะแนนในบทนี้"
              >
                ล้างคะแนน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: FINAL EXAM SCORE TAB (Req 6: สอบปลายภาค) */}
      {activeChapterTab === 'final' && (
        <div className={`space-y-4 ${isTableFullscreen ? 'flex-1 min-h-0 flex flex-col' : ''}`}>
          {/* Header Card */}
          <div className="bg-amber-50/70 p-3.5 sm:p-4 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <h3 className="text-sm font-bold text-amber-950">
                  แบบบันทึกคะแนนสอบ (Examination)
                </h3>
                <span className="text-xs font-bold text-amber-900 bg-amber-200/70 px-2.5 py-0.5 rounded-md">
                  คะแนนเต็ม {activeSheet?.finalExamMaxScore !== undefined ? activeSheet.finalExamMaxScore : 30} คะแนน
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1">
                กรอกคะแนนสอบของนักเรียนแต่ละคน (0 ถึง {activeSheet?.finalExamMaxScore !== undefined ? activeSheet.finalExamMaxScore : 30}) คะแนนนี้จะนำไปรวมกับคะแนนเก็บทุกบทเพื่อตัดเกรดในแท็บ "รวมทุกบท"
              </p>
            </div>
          </div>

          {/* Sticky Table for Final Exam */}
          <div className={`overflow-x-auto overflow-y-auto border border-slate-200 rounded-2xl relative shadow-2xs ${
            isTableFullscreen ? 'flex-1 min-h-0' : 'max-h-[70vh]'
          }`}>
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-20 shadow-xs border-b border-slate-200">
                <tr className="bg-slate-100 text-slate-700 font-semibold">
                  <th className="py-2.5 px-3 w-12 text-center align-bottom sticky top-0 left-0 z-30 bg-slate-100 border-r border-slate-200">
                    ลำดับ
                  </th>
                  <th className="py-2.5 px-4 min-w-[190px] align-bottom sticky top-0 left-12 z-30 bg-slate-100 border-r border-slate-200">
                    ชื่อ - นามสกุล นักเรียน
                  </th>
                  <th className="py-2.5 px-4 w-44 text-center sticky top-0 z-20 bg-amber-100/90 text-amber-950 font-bold border-r border-slate-200">
                    คะแนนสอบ
                    <span className="block text-[10px] text-amber-800 font-normal">
                      (เต็ม {activeSheet?.finalExamMaxScore || 30} คะแนน)
                    </span>
                  </th>
                  <th className="py-2.5 px-3 w-32 text-center sticky top-0 z-20 bg-slate-100 font-bold border-r border-slate-200">
                    คิดเป็น %
                  </th>
                  <th className="py-2.5 px-3 w-36 text-center sticky top-0 z-20 bg-emerald-50 text-emerald-800 font-bold">
                    ผลการประเมิน
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentSheetStudents.map((student, idx) => {
                  const rawScore = activeSheet?.finalExamScores?.[student.id];
                  const scoreVal = typeof rawScore === 'number' ? rawScore : '';
                  const maxExam = activeSheet?.finalExamMaxScore || 30;
                  const pct = typeof rawScore === 'number' && maxExam > 0 ? Number(((rawScore / maxExam) * 100).toFixed(1)) : null;
                  const isPass = pct !== null ? pct >= 50 : null;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-medium sticky left-0 z-10 bg-white border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-2 sticky left-12 z-10 bg-white border-r border-slate-100 min-w-[190px]">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenScoreModal(student)}
                            className="flex-1 text-left px-2 py-1 rounded-lg text-xs font-semibold text-slate-800 hover:text-amber-800 hover:bg-amber-50 transition-colors truncate cursor-pointer flex items-center justify-between gap-1 group/sname"
                            title="กดที่ชื่อเพื่อเปิดหน้าต่างลงคะแนนสอบ (Pop-up เต็มจอ)"
                          >
                            <span className="truncate">
                              {`${student.prefix || ''}${student.firstName} ${student.lastName}`.trim() || 'ระบุชื่อ...'}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0 group-hover/sname:bg-amber-600 group-hover/sname:text-white transition-colors">
                              ลงคะแนนสอบ
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetStudentRowId(student.id);
                              setShowCopyStudentModal(true);
                            }}
                            className="p-1 text-purple-600 hover:text-purple-800 rounded-md hover:bg-purple-50 transition-colors cursor-pointer shrink-0"
                            title="คัดลอก/เลือกชื่อนักเรียนจากทะเบียนประวัติ (แก้5)"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveStudentRow(student.id, `${student.prefix || ''}${student.firstName} ${student.lastName}`.trim())}
                            className="p-1 text-slate-300 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            title="ลบแถวนักเรียนคนนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Final Exam Input Cell */}
                      <td className="py-2 px-4 text-center border-r border-slate-100">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={maxExam}
                            value={scoreVal}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                handleSetFinalExamScore(student.id, '-');
                              } else {
                                handleSetFinalExamScore(student.id, Number(val));
                              }
                            }}
                            placeholder="-"
                            className="w-20 px-2.5 py-1.5 text-center font-black text-sm rounded-lg border border-amber-300 focus:border-amber-600 bg-white outline-hidden shadow-2xs"
                          />
                          <span className="text-[11px] text-slate-400">/{maxExam}</span>
                        </div>
                      </td>

                      {/* Percentage */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-100 font-bold text-slate-700">
                        {pct !== null ? `${pct}%` : '-'}
                      </td>

                      {/* Pass / Needs Improvement Badge */}
                      <td className="py-2.5 px-3 text-center">
                        {isPass === null ? (
                          <span className="text-slate-400 text-xs">-</span>
                        ) : isPass ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-emerald-100 text-emerald-800">
                            ✓ ผ่านเกณฑ์
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-rose-100 text-rose-800">
                            ต้องปรับปรุง
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Add Student Row in Final Exam Table */}
                <tr>
                  <td colSpan={5} className="p-2.5 bg-slate-50/70 border-t border-slate-200 text-center">
                    <button
                      type="button"
                      onClick={handleAddStudentRow}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-purple-50 text-purple-700 border border-dashed border-purple-300 hover:border-purple-400 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      title="เพิ่มแถวนักเรียนใหม่ในชั้นนี้"
                    >
                      <UserPlus className="w-4 h-4 text-purple-600" />
                      <span>+ เพิ่มแถวนักเรียน (เพิ่มชื่อนักเรียนในรายวิชานี้)</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bottom Bar for Final Exam: Action buttons & Auto-Save indicator */}
          <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-amber-900">
              คะแนนสอบจะนำไปรวมกับคะแนนเก็บของบทเรียนที่ 1 ถึง {currentChapters.length} ในหน้า "รวมทุกบท"
            </div>

            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              {/* บันทึกอัตโนมัติ */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100/90 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold select-none">
                <CheckCircle2 className={`w-3.5 h-3.5 text-amber-700 shrink-0 ${autoSaveStatus === 'saving' ? 'animate-spin' : ''}`} />
                <span>{autoSaveStatus === 'saving' ? 'กำลังบันทึกอัตโนมัติ...' : 'บันทึกอัตโนมัติ'}</span>
              </div>

              {/* เพิ่มแถวนักเรียน */}
              <button
                type="button"
                onClick={handleAddStudentRow}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                title="เพิ่มแถวนักเรียนใหม่ในชั้นนี้"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ เพิ่มแถวนักเรียน</span>
              </button>


              {/* เติมคะแนนเต็มทุกคน */}
              <button
                type="button"
                onClick={handleFillAllFinalExamMax}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title={`ใส่คะแนนเต็ม (${activeSheet?.finalExamMaxScore || 30}) ให้ทุกคน`}
              >
                เติมคะแนน {activeSheet?.finalExamMaxScore || 30} ทุกคน
              </button>

              {/* ล้างคะแนน */}
              <button
                type="button"
                onClick={handleClearFinalExam}
                className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="ล้างคะแนนสอบปลายภาค"
              >
                ล้างคะแนน
              </button>

              {/* ปิดหน้าต่างเต็มจอ */}
              {isTableFullscreen && (
                <button
                  type="button"
                  onClick={() => setIsTableFullscreen(false)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="ปิดหน้าต่างขยายเต็ม"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>ปิดหน้าต่าง</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: OVERALL SUMMARY TAB (คะแนนเก็บทุกบท + สอบปลายภาค + ตัดเกรด) */}
      {activeChapterTab === 'summary' && (
        <div className={`space-y-4 ${isTableFullscreen ? 'flex-1 min-h-0 flex flex-col' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/60 p-3.5 sm:p-4 rounded-xl border border-emerald-200 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-emerald-950">
                  ตารางสรุปผลคะแนนรวมทุกบทเรียนและตัดเกรด
                </h3>
              </div>
              <p className="text-xs text-emerald-800 mt-1">
                รวบรวมคะแนนเก็บเฉลี่ยของทุกบท + คะแนนสอบปลายภาค ({activeSheet?.finalExamMaxScore || 30} คะแนน) คำนวณร้อยละ และตัดเกรดอัตโนมัติ
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-sm shadow-emerald-200 cursor-pointer self-start sm:self-auto"
                title="บันทึกผลการประเมินเป็นไฟล์ PDF หรือสั่งพิมพ์"
              >
                <Download className="w-4 h-4" />
                <span>บันทึก PDF / พิมพ์สรุปผล</span>
              </button>
            </div>
          </div>

          {/* Sticky Table Container for Overall Summary */}
          <div className={`overflow-x-auto overflow-y-auto border border-slate-200 rounded-2xl relative shadow-2xs ${
            isTableFullscreen ? 'flex-1 min-h-0' : 'max-h-[70vh]'
          }`}>
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-20 shadow-xs border-b border-slate-200">
                <tr className="bg-slate-100 text-slate-700 font-semibold">
                  <th className="py-3 px-2.5 w-12 text-center align-bottom sticky top-0 left-0 z-30 bg-slate-100 border-r border-slate-200">
                    ลำดับ
                  </th>
                  <th className="py-3 px-3 min-w-[190px] align-bottom sticky top-0 left-12 z-30 bg-slate-100 border-r border-slate-200">
                    ชื่อ - นามสกุล นักเรียน
                  </th>

                  {/* Chapter Scaled Score Columns */}
                  {currentChapters.map((ch) => (
                    <th
                      key={`sum-head-${ch.chapterNumber}`}
                      className="py-3 px-2 text-center min-w-[90px] sticky top-0 z-20 bg-slate-100 border-r border-slate-200"
                    >
                      <span className="font-bold text-slate-800 block">{ch.title}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        (เต็ม {ch.maxScore || 15})
                      </span>
                    </th>
                  ))}

                  {/* Total Scaled Chapters Score */}
                  <th className="py-3 px-3 w-24 text-center sticky top-0 z-20 bg-purple-50 text-purple-900 font-bold border-r border-slate-200">
                    รวมคะแนนเก็บ
                    <span className="block text-[10px] text-purple-700 font-normal">
                      (เต็ม {allStudentsSummary[0]?.totalChapterMax || 0})
                    </span>
                  </th>

                  {/* Final Exam Column (Req 6) */}
                  <th className="py-3 px-3 w-24 text-center sticky top-0 z-20 bg-amber-100/90 text-amber-950 font-bold border-r border-slate-200">
                    สอบ
                    <span className="block text-[10px] text-amber-800 font-normal">
                      (เต็ม {activeSheet?.finalExamMaxScore || 30})
                    </span>
                  </th>

                  {/* Grand Total Score */}
                  <th className="py-3 px-3 w-24 text-center sticky top-0 z-20 bg-slate-200/90 text-slate-900 font-black border-r border-slate-200">
                    คะแนนรวมสุทธิ
                    <span className="block text-[10px] text-slate-600 font-normal">
                      (เต็ม {allStudentsSummary[0]?.totalTargetMax || 100})
                    </span>
                  </th>

                  {/* Percentage */}
                  <th className="py-3 px-3 w-20 text-center sticky top-0 z-20 bg-sky-50 text-sky-800 font-bold border-r border-slate-200">
                    ร้อยละ (%)
                  </th>

                  {/* Grade Column */}
                  <th className="py-3 px-3 w-20 text-center sticky top-0 z-20 bg-emerald-50 font-bold text-emerald-800">
                    เกรด
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allStudentsSummary.map((row) => (
                  <tr key={row.studentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-2.5 text-center text-slate-500 font-medium sticky left-0 z-10 bg-white border-r border-slate-100">
                      {row.order}
                    </td>
                    <td className="py-1.5 px-2 sticky left-12 z-10 bg-white border-r border-slate-100 min-w-[190px]">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const std = currentSheetStudents.find((s) => s.id === row.studentId);
                            if (std) handleOpenScoreModal(std);
                          }}
                          className="flex-1 text-left px-2 py-1 rounded-lg text-xs font-semibold text-slate-800 hover:text-emerald-800 hover:bg-emerald-50 transition-colors truncate cursor-pointer flex items-center justify-between gap-1 group/sname"
                          title="กดที่ชื่อเพื่อเปิดหน้าต่างลงคะแนน (Pop-up เต็มจอ)"
                        >
                          <span className="truncate">{row.studentName}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 group-hover/sname:bg-emerald-600 group-hover/sname:text-white transition-colors">
                            ลงคะแนน
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetStudentRowId(row.studentId);
                            setShowCopyStudentModal(true);
                          }}
                          className="p-1 text-purple-600 hover:text-purple-800 rounded-md hover:bg-purple-50 transition-colors cursor-pointer shrink-0"
                          title="คัดลอก/เลือกชื่อนักเรียนจากทะเบียนประวัติ (แก้5)"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStudentRow(row.studentId, row.studentName)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                          title="ลบแถวนักเรียนคนนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Scaled Chapter Score Cells */}
                    {currentChapters.map((ch) => {
                      const score = row.chapterScaledScores[ch.chapterNumber] || 0;
                      return (
                        <td key={`val-${row.studentId}-${ch.chapterNumber}`} className="py-2.5 px-2 text-center border-r border-slate-100">
                          <span className="font-bold text-slate-800 text-xs">{score}</span>
                        </td>
                      );
                    })}

                    {/* Total Scaled Chapters Score */}
                    <td className="py-2.5 px-3 text-center bg-purple-50/40 font-bold text-purple-900 text-xs border-r border-slate-100">
                      {row.totalChapterScaled}
                    </td>

                    {/* Final Exam Score */}
                    <td className="py-2.5 px-3 text-center bg-amber-50/40 font-bold text-amber-900 text-xs border-r border-slate-100">
                      {row.finalExamScore}
                    </td>

                    {/* Grand Total Scaled Score */}
                    <td className="py-2.5 px-3 text-center bg-slate-50/60 font-black text-slate-900 text-sm border-r border-slate-100">
                      {row.totalScore}
                    </td>

                    {/* Percentage */}
                    <td className="py-2.5 px-3 text-center bg-sky-50/40 font-bold text-sky-700 text-xs sm:text-sm border-r border-slate-100">
                      {row.percentage}%
                    </td>

                    {/* Grade Badge */}
                    <td className="py-2.5 px-3 text-center bg-emerald-50/40">
                      <span
                        className={`inline-block px-3 py-1 rounded-xl font-black text-xs ${
                          row.grade === '4' || row.grade === 'A'
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.grade === '0' || row.grade === 'F'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {row.grade}
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Add Student Row in Summary Table */}
                <tr>
                  <td colSpan={currentChapters.length + 7} className="p-2.5 bg-slate-50/70 border-t border-slate-200 text-center">
                    <button
                      type="button"
                      onClick={handleAddStudentRow}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-purple-50 text-purple-700 border border-dashed border-purple-300 hover:border-purple-400 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      title="เพิ่มแถวนักเรียนใหม่ในชั้นนี้"
                    >
                      <UserPlus className="w-4 h-4 text-purple-600" />
                      <span>+ เพิ่มแถวนักเรียน (เพิ่มชื่อนักเรียนในรายวิชานี้)</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Distribution & Statistics Bar with PDF Export */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-slate-600">
                คะแนนเฉลี่ยทั้งห้อง: <strong className="text-purple-700 font-bold">{averagePercentage}%</strong>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400 text-xs mr-1">การกระจายเกรด:</span>
                {Object.entries(gradeCounts).map(([grd, count]) => (
                  <span
                    key={grd}
                    className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold text-[11px]"
                  >
                    เกรด {grd}: {count} คน
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAddStudentRow}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="เพิ่มแถวนักเรียนใหม่ในชั้นนี้"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ เพิ่มแถวนักเรียน</span>
              </button>


              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer shrink-0"
                title="บันทึกผลการประเมินเป็นไฟล์ PDF"
              >
                <Download className="w-4 h-4" />
                <span>บันทึกเป็นไฟล์ PDF / พิมพ์เอกสาร</span>
              </button>

              {/* ปิดหน้าต่างเต็มจอ */}
              {isTableFullscreen && (
                <button
                  type="button"
                  onClick={() => setIsTableFullscreen(false)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="ปิดหน้าต่างขยายเต็ม"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>ปิดหน้าต่าง</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>

      {/* POP-UP MODAL: "แก้ไขข้อมูล" / CREATE SUBJECT (Req 1, 5, 6) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-2xs">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {isEditingExisting ? 'แก้ไขข้อมูลรายวิชาและโครงสร้างบทเรียน' : 'สร้างชุดรายวิชาใหม่ (+)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    กำหนดชื่อวิชา ภาคเรียน จำนวนบทเรียน (1-8) คะแนนเก็บแต่ละบท และคะแนนสอบปลายภาค
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveConfigModal} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Req 1: In Edit Mode, Show Subject Dropdown to select any existing subject */}
              {isEditingExisting && (
                <div className="bg-purple-50/80 p-3 rounded-2xl border border-purple-200">
                  <label className="block font-bold text-purple-900 mb-1.5 text-xs flex items-center justify-between">
                    <span>เลือกรายวิชาที่ต้องการแก้ไข:</span>
                    <span className="text-[11px] font-normal text-purple-600">สลับวิชาเพื่อแก้ไขได้ทันที</span>
                  </label>
                  <select
                    value={modalSelectedSheetId}
                    onChange={(e) => handleSwitchModalSheet(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-purple-300 font-bold text-slate-800 text-xs shadow-2xs outline-hidden cursor-pointer"
                  >
                    {scoreSheets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subjectName} {s.subjectCode ? `(${s.subjectCode})` : ''} - ภาคเรียนที่ {s.term}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 1. Subject Name & Subject Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ชื่อวิชา <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={modalSubjectName}
                    onChange={(e) => setModalSubjectName(e.target.value)}
                    placeholder="เช่น คณิตศาสตร์, ภาษาไทย, วิทยาศาสตร์..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-500 text-xs font-bold outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    รหัสวิชา (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={modalSubjectCode}
                    onChange={(e) => setModalSubjectCode(e.target.value)}
                    placeholder="เช่น ค 15101, ท 15101"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-500 text-xs outline-hidden"
                  />
                </div>
              </div>

              {/* Classroom / Grade level selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ระดับชั้น / ห้องเรียน <span className="text-purple-600 font-normal text-[11px]">(ตรงชั้นเรียน เช่น ป.1, ป.2, ป.3)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={
                      ['ชั้นประถมศึกษาปีที่ 1', 'ชั้นประถมศึกษาปีที่ 2', 'ชั้นประถมศึกษาปีที่ 3', 'ชั้นประถมศึกษาปีที่ 4', 'ชั้นประถมศึกษาปีที่ 5', 'ชั้นประถมศึกษาปีที่ 6'].includes(modalClassroom)
                        ? modalClassroom
                        : 'custom'
                    }
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        setModalClassroom(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                  >
                    <option value="ชั้นประถมศึกษาปีที่ 1">ชั้นประถมศึกษาปีที่ 1 (ป.1)</option>
                    <option value="ชั้นประถมศึกษาปีที่ 2">ชั้นประถมศึกษาปีที่ 2 (ป.2)</option>
                    <option value="ชั้นประถมศึกษาปีที่ 3">ชั้นประถมศึกษาปีที่ 3 (ป.3)</option>
                    <option value="ชั้นประถมศึกษาปีที่ 4">ชั้นประถมศึกษาปีที่ 4 (ป.4)</option>
                    <option value="ชั้นประถมศึกษาปีที่ 5">ชั้นประถมศึกษาปีที่ 5 (ป.5)</option>
                    <option value="ชั้นประถมศึกษาปีที่ 6">ชั้นประถมศึกษาปีที่ 6 (ป.6)</option>
                    <option value="custom">กำหนดเองหรือพิมพ์ระบุ...</option>
                  </select>
                  <input
                    type="text"
                    value={modalClassroom}
                    onChange={(e) => setModalClassroom(e.target.value)}
                    placeholder="ระบุ เช่น ชั้นประถมศึกษาปีที่ 1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-500 text-xs font-bold outline-hidden"
                  />
                </div>
              </div>

              {/* 2. Term Selection & Grading System */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ภาคเรียน</label>
                  <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setModalTerm('1')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        modalTerm === '1'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-purple-700'
                      }`}
                    >
                      ภาคเรียนที่ 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalTerm('2')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        modalTerm === '2'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-purple-700'
                      }`}
                    >
                      ภาคเรียนที่ 2
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ระบบตัดเกรด</label>
                  <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setModalGradingSystem('thai_standard')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        modalGradingSystem === 'thai_standard'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-purple-700'
                      }`}
                    >
                      เกรด 4 - 0
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalGradingSystem('letter_grade')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        modalGradingSystem === 'letter_grade'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-purple-700'
                      }`}
                    >
                      เกรด A - F
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Number of Chapters Selector (Req 1: แก้ไขกี่บท) */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block font-bold text-slate-800 mb-2">
                  บทที่สอน (มีให้เลือก 1 ถึง 8 บท)
                </label>
                <div className="grid grid-cols-8 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <button
                      key={`num-${num}`}
                      type="button"
                      onClick={() => handleModalChapterCountSelect(num)}
                      className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        modalChapterCount === num
                          ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-200'
                          : 'bg-slate-50 text-slate-700 hover:bg-purple-50 border border-slate-200'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Dynamic Chapters List (Req 1: แก้ไขชื่อของบท และ คะแนนเก็บ) */}
              <div className="space-y-2.5 pt-2">
                <span className="block font-bold text-slate-800">
                  กำหนดชื่อบทและคะแนนเก็บของแต่ละบท (รวม {modalChapterCount} บท):
                </span>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {modalChapters.map((ch, idx) => (
                    <div
                      key={`m-ch-${ch.chapterNumber}`}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-3"
                    >
                      <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0 text-xs">
                        {ch.chapterNumber}
                      </span>

                      {/* Chapter Title Input */}
                      <div className="flex-1">
                        <input
                          type="text"
                          value={ch.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setModalChapters((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, title: val } : item))
                            );
                          }}
                          placeholder={`บทที่ ${ch.chapterNumber}: ...`}
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 focus:border-purple-500 text-xs font-semibold outline-hidden"
                          required
                        />
                      </div>

                      {/* Chapter Target Max Score Input */}
                      <div className="w-32 shrink-0 flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={ch.maxScore}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setModalChapters((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, maxScore: val } : item))
                            );
                          }}
                          className="w-16 px-2 py-1.5 bg-white text-center rounded-lg border border-slate-200 focus:border-purple-500 text-xs font-bold outline-hidden"
                          required
                        />
                        <span className="text-[11px] text-slate-500">คะแนน</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Req 6: Final Exam Score Configuration */}
              <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between gap-3">
                <div>
                  <label className="block font-bold text-amber-950 text-xs mb-0.5">
                    คะแนนสอบ (Examination) <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-amber-700">
                    กำหนดคะแนนเต็มสำหรับการสอบ (เช่น 20 หรือ 30 คะแนน)
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={modalFinalExamMaxScore}
                    onChange={(e) => setModalFinalExamMaxScore(Math.max(0, Number(e.target.value)))}
                    className="w-20 px-2.5 py-1.5 bg-white text-center rounded-lg border border-amber-300 focus:border-amber-600 text-xs font-black outline-hidden"
                    required
                  />
                  <span className="text-xs font-bold text-amber-900">คะแนน</span>
                </div>
              </div>

              {/* Total Calculation Preview */}
              {(() => {
                const sumChapters = modalChapters.reduce((sum, ch) => sum + (Number(ch.maxScore) || 0), 0);
                const totalScore = sumChapters + (Number(modalFinalExamMaxScore) || 0);
                return (
                  <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs flex items-center justify-between text-slate-700 font-semibold flex-wrap gap-2">
                    <span>
                      คะแนนเก็บ {modalChapters.length} บท รวม: <strong className="text-purple-700">{sumChapters}</strong> คะแนน
                    </span>
                    <span>
                      + ปลายภาค: <strong className="text-amber-700">{modalFinalExamMaxScore}</strong> คะแนน
                    </span>
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-300 font-black text-slate-900">
                      = รวมทั้งสิ้น {totalScore} คะแนน
                    </span>
                  </div>
                );
              })()}

              {/* Modal Footer Actions (Req 5: มีปุ่มลบวิชาได้) */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {isEditingExisting && modalSelectedSheetId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteSubject(modalSelectedSheetId)}
                    className="px-3.5 py-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบวิชานี้</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>บันทึกข้อมูลวิชา</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT REPORT MODAL (แบบสรุปผลการเรียน) */}
      {(() => {
        const rawSubj = activeSheet?.subjectName?.trim() || '';
        const subjText = rawSubj.startsWith('วิชา') ? rawSubj : `วิชา ${rawSubj || 'วิทยาศาสตร์และเทคโนโลยี'}`;
        const subjCodeText = activeSheet?.subjectCode?.trim() ? ` (${activeSheet.subjectCode.trim()})` : '';
        const line1 = `แบบสรุปผลการเรียน ${subjText}${subjCodeText}`;

        // หาชั้นเรียนให้ตรงกับวิชาและนักเรียนในหน้านี้ (ตรงวิชา และตรงชั้นเรียน)
        let classroomText = activeSheet?.classroom?.trim() || '';
        if (!classroomText) {
          // ตรวจสอบจากระดับชั้นของนักเรียนที่เรียนในวิชานี้
          const sheetStudentIds = new Set(currentSheetStudents.map((s) => s.id));
          const matchedStudents = students.filter((s) => sheetStudentIds.has(s.id));
          const gradeLevelsInSheet = Array.from(
            new Set(matchedStudents.map((s) => s.gradeLevel).filter(Boolean))
          ) as string[];
          if (gradeLevelsInSheet.length === 1) {
            const g = gradeLevelsInSheet[0];
            classroomText = g.startsWith('ป.')
              ? `ชั้นประถมศึกษาปีที่ ${g.replace('ป.', '')}`
              : `ชั้น ${g}`;
          } else if (gradeLevelsInSheet.length > 1) {
            classroomText = `ชั้น ${gradeLevelsInSheet.join(', ')}`;
          } else if (profile.gradeLevel) {
            const g = profile.gradeLevel;
            classroomText = g.startsWith('ป.')
              ? `ชั้นประถมศึกษาปีที่ ${g.replace('ป.', '')}`
              : `ชั้น ${g}`;
          } else if (profile.classroomName && !profile.classroomName.includes('6/1')) {
            classroomText = profile.classroomName.startsWith('ชั้น')
              ? profile.classroomName
              : `ชั้น ${profile.classroomName}`;
          } else {
            classroomText = 'ชั้นประถมศึกษาปีที่ 1';
          }
        }
        const termText = activeSheet?.term || '1';
        const yearText = profile.academicYear || '2569';
        const line2 = `${classroomText} ภาคเรียนที่ ${termText} ปีการศึกษา ${yearText}`;

        return (
          <PrintReportModal
            isOpen={showPrintModal}
            onClose={() => setShowPrintModal(false)}
            title={line1}
            subtitle={line2}
            profile={{ ...profile, classroomName: classroomText }}
            orientation="landscape"
            customHeader={
              <div className="space-y-1.5 text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-normal">
                  {line1}
                </h2>
                <p className="text-sm sm:text-base font-semibold text-slate-700">
                  {line2}
                </p>
              </div>
            }
          >
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 font-bold">
                  <th className="border border-slate-400 p-2 text-center w-12">ลำดับ</th>
                  <th className="border border-slate-400 p-2 text-left">ชื่อ - นามสกุล นักเรียน</th>
                  {currentChapters.map((ch) => (
                    <th key={`p-head-${ch.chapterNumber}`} className="border border-slate-400 p-1.5 text-center">
                      {ch.title}
                      <span className="block text-[10px] font-normal text-slate-600">(เต็ม {ch.maxScore || 15})</span>
                    </th>
                  ))}
                  <th className="border border-slate-400 p-2 text-center w-24">
                    รวมคะแนนเก็บ
                    <span className="block text-[10px] font-normal text-slate-600">(เต็ม {activeSheet?.collectMaxScore || 70})</span>
                  </th>
                  <th className="border border-slate-400 p-2 text-center w-20">
                    สอบปลายภาค
                    <span className="block text-[10px] font-normal text-slate-600">(เต็ม {activeSheet?.finalExamMaxScore || 30})</span>
                  </th>
                  <th className="border border-slate-400 p-2 text-center w-20 bg-slate-200/70 font-black">
                    คะแนนรวม
                    <span className="block text-[10px] font-bold text-slate-700">(เต็ม 100)</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {allStudentsSummary.map((row) => (
                  <tr key={row.studentId} className="border-b border-slate-300 hover:bg-slate-50/50">
                    <td className="border border-slate-300 p-2 text-center font-medium">{row.order}</td>
                    <td className="border border-slate-300 p-2 font-medium">{row.studentName}</td>
                    {currentChapters.map((ch) => (
                      <td key={`p-cell-${ch.chapterNumber}`} className="border border-slate-300 p-2 text-center">
                        {row.chapterScaledScores[ch.chapterNumber] !== undefined
                          ? row.chapterScaledScores[ch.chapterNumber]
                          : '-'}
                      </td>
                    ))}
                    <td className="border border-slate-300 p-2 text-center font-bold text-slate-800">{row.totalChapterScaled}</td>
                    <td className="border border-slate-300 p-2 text-center font-bold text-slate-800">{row.finalExamScore}</td>
                    <td className="border border-slate-300 p-2 text-center font-black text-slate-900 bg-slate-100/50">{row.totalScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintReportModal>
        );
      })()}

      {/* Modal คัดลอก/เลือกข้อมูลนักเรียนจากทะเบียนประวัติ (แก้5) */}
      <CopyStudentModal
        isOpen={showCopyStudentModal}
        onClose={() => {
          setShowCopyStudentModal(false);
          setTargetStudentRowId(null);
        }}
        onSelectStudent={handleCopySingleStudent}
        onSelectMultiple={handleCopyMultipleStudents}
        title={targetStudentRowId ? 'เลือกนักเรียนเพื่อเปลี่ยนชื่อแถวนี้' : 'เลือกรายชื่อนักเรียนลงตารางคะแนน'}
        description={targetStudentRowId ? 'คลิกที่นักเรียนเพื่อนำชื่อมาใส่ในแถวนี้ทันที' : 'เลือกรายคน หรือคัดลอกทั้งชั้นเรียนเพื่อนำชื่อลงในตารางคะแนน'}
        enableMultiple={!targetStudentRowId}
      />

      {/* Modal คัดลอกรายชื่อนักเรียนทั้งหมดตามชั้นเรียน (แทนที่ข้อมูลเดิมทันทีตามจำนวนจริง) */}
      <CopyAllStudentsModal
        isOpen={showCopyAllStudentsModal}
        onClose={() => setShowCopyAllStudentsModal(false)}
        defaultGrade={(activeSheet?.classroom as any) || 'all'}
        onApplyStudents={handleCopyMultipleStudents}
        title="คัดลอกรายชื่อนักเรียน (หน้ากรอกคะแนน)"
        subtitle="เลือกชั้นเรียนเพื่อคัดลอกรายชื่อทั้งหมด"
      />

      {/* Pop-up กรอกคะแนนแบบเต็มจอสำหรับมือถือ / กรอกสะดวก (Req: เมื่อกดชื่อ จะแสดงpop-up ให้ลงคะแนนให้เรียบร้อย ลงเสร็จก็กดบันทึก) */}
      {selectedScoreModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full h-full md:h-auto md:max-h-[92vh] md:max-w-lg md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-purple-700 to-indigo-700 text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                    คนที่ {currentSheetStudents.findIndex((s) => s.id === selectedScoreModalStudent.id) + 1} จาก {currentSheetStudents.length}
                  </span>
                  <span className="text-purple-200 text-xs truncate">
                    {activeSheet?.subjectName || 'รายวิชา'}
                  </span>
                </div>
                <h3 className="text-base font-bold truncate mt-0.5">
                  {selectedScoreModalStudent.prefix}{selectedScoreModalStudent.firstName} {selectedScoreModalStudent.lastName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScoreModalStudent(null)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer shrink-0"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Chapter / Final Tabs in Modal */}
            <div className="bg-purple-50/70 px-3 py-2 border-b border-purple-100 flex items-center gap-1.5 overflow-x-auto scrollbar-thin shrink-0">
              {currentChapters.map((ch, idx) => (
                <button
                  key={`modal-ch-tab-${ch.chapterNumber}`}
                  type="button"
                  onClick={() => handleSwitchModalChapter(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    modalActiveTab === 'chapter' && modalSelectedChapterIdx === idx
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-white text-purple-900 hover:bg-purple-100/70 border border-purple-200'
                  }`}
                >
                  บทที่ {ch.chapterNumber}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setModalActiveTab('final')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  modalActiveTab === 'final'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-amber-900 hover:bg-amber-100/70 border border-amber-200'
                }`}
              >
                สอบปลายภาค (ส)
              </button>
            </div>

            {/* Modal Body - Score Inputs */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
              {modalActiveTab === 'chapter' && (
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-xl border border-purple-150 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-950">
                        {currentChapters[modalSelectedChapterIdx]?.title || `บทที่ ${modalSelectedChapterIdx + 1}`}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                        คะแนนรวมบทนี้:{' '}
                        {modalTopicScores.reduce<number>((acc, cur) => (typeof cur === 'number' ? acc + cur : acc), 0)} /{' '}
                        {currentChapters[modalSelectedChapterIdx]?.topics.filter((t) => !!t.trim()).length * 5} คะแนน
                      </span>
                    </div>
                  </div>

                  {currentChapters[modalSelectedChapterIdx]?.topics.map((topicTitle, tIdx) => {
                    const currentVal = modalTopicScores[tIdx];
                    return (
                      <div
                        key={`modal-topic-${tIdx}`}
                        className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            เรื่องที่ {tIdx + 1}: {topicTitle || `กิจกรรมการเรียนรู้ที่ ${tIdx + 1}`}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            คะแนน: {currentVal !== undefined && currentVal !== '-' ? `${currentVal} / 5` : 'ยังไม่ลงคะแนน'}
                          </span>
                        </div>

                        {/* Quick Selection Pills: 5, 4, 3, 2, 1, 0, - */}
                        <div className="grid grid-cols-7 gap-1 pt-1">
                          {[5, 4, 3, 2, 1, 0, '-'].map((val) => {
                            const isSelected = currentVal === val;
                            return (
                              <button
                                key={`val-btn-${val}`}
                                type="button"
                                onClick={() => {
                                  const updated = [...modalTopicScores];
                                  while (updated.length <= tIdx) updated.push('-');
                                  updated[tIdx] = val as number | '-';
                                  setModalTopicScores(updated);
                                }}
                                className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center ${
                                  isSelected
                                    ? val === '-'
                                      ? 'bg-slate-700 text-white ring-2 ring-slate-400'
                                      : 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300 scale-102'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {modalActiveTab === 'final' && (
                <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-amber-950">คะแนนสอบปลายภาค (Final Exam)</h4>
                      <p className="text-xs text-amber-800">
                        คะแนนเต็ม {activeSheet?.finalExamMaxScore !== undefined ? activeSheet.finalExamMaxScore : 30} คะแนน
                      </p>
                    </div>
                    <span className="text-lg font-black text-amber-700">
                      {modalFinalScore !== '' ? modalFinalScore : '-'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      ระบุคะแนนสอบที่ได้
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={activeSheet?.finalExamMaxScore !== undefined ? activeSheet.finalExamMaxScore : 30}
                      value={modalFinalScore}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') {
                          setModalFinalScore('');
                        } else {
                          const n = Number(v);
                          const max = activeSheet?.finalExamMaxScore !== undefined ? activeSheet.finalExamMaxScore : 30;
                          setModalFinalScore(Math.max(0, Math.min(max, n)));
                        }
                      }}
                      placeholder="0"
                      className="w-full text-center text-xl font-bold py-2.5 px-3 rounded-xl border-2 border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden"
                    />
                  </div>

                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                      ปุ่มลัดคะแนนสอบ:
                    </span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        activeSheet?.finalExamMaxScore || 30,
                        Math.round((activeSheet?.finalExamMaxScore || 30) * 0.8),
                        Math.round((activeSheet?.finalExamMaxScore || 30) * 0.7),
                        Math.round((activeSheet?.finalExamMaxScore || 30) * 0.5),
                        0,
                      ].map((presetVal) => (
                        <button
                          key={`final-preset-${presetVal}`}
                          type="button"
                          onClick={() => setModalFinalScore(presetVal)}
                          className="py-1.5 text-xs font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
                        >
                          {presetVal}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer: Prev / Save / Next */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrevStudentInScoreModal}
                disabled={currentSheetStudents.findIndex((s) => s.id === selectedScoreModalStudent.id) === 0}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">ก่อนหน้า</span>
              </button>

              <button
                type="button"
                onClick={handleSaveScoreModal}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>บันทึกคะแนน</span>
              </button>

              <button
                type="button"
                onClick={handleNextStudentInScoreModal}
                disabled={currentSheetStudents.findIndex((s) => s.id === selectedScoreModalStudent.id) === currentSheetStudents.length - 1}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-purple-700 hover:bg-purple-50 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <span className="hidden sm:inline">คนถัดไป</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
