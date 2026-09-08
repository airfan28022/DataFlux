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
  UserPlus
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

  // Auto-Save Status (Req 4: บันทึกข้อมูลอัตโนมัติ)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      academicYear: profile.academicYear || '2569',
      term: modalTerm,
      chapterCount: builtChapters.length,
      gradingSystem: modalGradingSystem,
      chapters: builtChapters,
      finalExamMaxScore: Number(modalFinalExamMaxScore) >= 0 ? Number(modalFinalExamMaxScore) : 30,
      finalExamScores: existingTarget?.finalExamScores || {},
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

  // Close popover when clicking outside
  const popoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveScorePopover(null);
      }
    };
    if (activeScorePopover) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeScorePopover]);

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">
                กรอกคะแนน & ตัดเกรด (Grade Tracker)
              </h2>
            </div>
            <p className="text-xs text-gray-500">
              สร้างวิชา กำหนด 1-8 บทเรียน บันทึกคะแนนรายเรื่อง เพิ่มเรื่องได้ไม่จำกัด สอบปลายภาค และสรุปตัดเกรดอัตโนมัติ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Main "+" Button for Pop-up Modal */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
            title="กดเพื่อสร้างรายวิชาใหม่และกำหนดบทเรียน"
          >
            <Plus className="w-4 h-4" />
            <span>+ สร้างวิชาใหม่</span>
          </button>

          {/* "แก้ไขข้อมูล" Button (Req 1) */}
          <button
            type="button"
            onClick={handleOpenEditModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="แก้ไขข้อมูลวิชา/จำนวนบทเรียน/คะแนนเก็บ/สอบปลายภาค"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>แก้ไขข้อมูล</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="พิมพ์ / บันทึกรายงานผลการเรียนเป็น PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>ดาวน์โหลด PDF</span>
          </button>
        </div>
      </div>

      {/* SUBJECT TABS BAR WITH TERM SEPARATION (Req 1: ปุ่มแยก 2 ปุ่ม "ภาคเรียนที่1" กับ "ภาคเรียนที่2") */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        {/* Term Separator 2 Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 mr-1">ภาคเรียน:</span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleSwitchTerm('1')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTermTab === '1'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-purple-700 hover:bg-slate-200/60'
                }`}
              >
                <span>ภาคเรียนที่ 1</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTermTab === '1'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {term1Sheets.length} วิชา
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchTerm('2')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTermTab === '2'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-purple-700 hover:bg-slate-200/60'
                }`}
              >
                <span>ภาคเรียนที่ 2</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTermTab === '2'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {term2Sheets.length} วิชา
                </span>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span>แสดงวิชาเฉพาะ</span>
            <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/60">
              ภาคเรียนที่ {activeTermTab}
            </span>
          </div>
        </div>

        {/* Subjects in the Active Term */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <span className="text-xs font-bold text-slate-400 pl-1 shrink-0">รายวิชา:</span>
          {currentTermSheets.length > 0 ? (
            currentTermSheets.map((sheet) => {
              const isActive = sheet.id === activeSheetId;
              return (
                <div
                  key={sheet.id}
                  className={`group flex items-center rounded-xl transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSheetId(sheet.id);
                      setActiveChapterTab(1);
                    }}
                    className="px-3.5 py-2 text-xs font-bold whitespace-nowrap cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{sheet.subjectName}</span>
                    {sheet.subjectCode && (
                      <span className="text-[10px] opacity-80 font-normal">({sheet.subjectCode})</span>
                    )}
                  </button>

                  {/* Delete button on active tab or on hover (Req 5) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSubject(sheet.id);
                    }}
                    className={`p-1.5 mr-1 rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? 'text-purple-200 hover:text-white hover:bg-purple-700'
                        : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title={`ลบรายวิชา "${sheet.subjectName}"`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="flex items-center gap-2 py-1 px-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs text-amber-800 font-medium">
              <span>ยังไม่มีรายวิชาในภาคเรียนที่ {activeTermTab}</span>
              <button
                type="button"
                onClick={() => handleOpenCreateModal(activeTermTab)}
                className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-0.5 ml-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มวิชาในภาคเรียนที่ {activeTermTab}</span>
              </button>
            </div>
          )}

          {/* Quick Plus Button in tabs bar */}
          <button
            type="button"
            onClick={() => handleOpenCreateModal(activeTermTab)}
            className="p-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/70 transition-colors cursor-pointer shrink-0 ml-1"
            title={`เพิ่มรายวิชาใหม่ในภาคเรียนที่ ${activeTermTab} (+)`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* UNIFIED SCORE WORKSPACE: Chapter Selector is directly attached to the score input table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* TOP ATTACHED BAR: Chapter Selector & Navigation (ติดกันกับหน้าใส่คะแนน) */}
        <div className="p-3.5 sm:p-4 bg-slate-50/75 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-700 mr-1 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-sky-600" />
                เลือกบทเรียน:
              </span>

              {/* Circular buttons for Chapter 1, 2, 3... */}
              {currentChapters.map((ch) => {
                const isSelected = activeChapterTab === ch.chapterNumber;
                return (
                  <button
                    key={`tab-circle-${ch.chapterNumber}`}
                    type="button"
                    onClick={() => setActiveChapterTab(ch.chapterNumber)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-black text-xs sm:text-sm transition-all flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-md ring-3 ring-sky-200 scale-105'
                        : 'bg-white text-slate-700 hover:bg-sky-50 hover:text-sky-700 border border-slate-200 shadow-2xs'
                    }`}
                    title={`${ch.title} (คะแนนเก็บเต็ม ${ch.maxScore || 15} คะแนน)`}
                  >
                    {ch.chapterNumber}
                  </button>
                );
              })}

              <div className="h-6 w-px bg-slate-200 mx-1" />

              {/* Final Exam Button */}
              <button
                type="button"
                onClick={() => setActiveChapterTab('final')}
                className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeChapterTab === 'final'
                    ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-200'
                    : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200 shadow-2xs'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📝 สอบปลายภาค</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                    activeChapterTab === 'final' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  เต็ม {activeSheet?.finalExamMaxScore !== undefined ? activeSheet.finalExamMaxScore : 30}
                </span>
              </button>

              {/* Overall Summary Tab Button */}
              <button
                type="button"
                onClick={() => setActiveChapterTab('summary')}
                className={`px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeChapterTab === 'summary'
                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-200'
                    : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-300 shadow-2xs'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>📊 รวมทุกบท</span>
              </button>
            </div>

            {/* Quick Stats Pill */}
            <div className="text-xs text-slate-500 flex items-center gap-3">
              <span>
                ภาคเรียนที่: <strong>{activeSheet?.term || 1}</strong>
              </span>
              <span>
                ปีการศึกษา: <strong>{profile.academicYear}</strong>
              </span>
              <span>
                คะแนนเฉลี่ย: <strong className="text-purple-700 font-bold">{averagePercentage}%</strong>
              </span>
            </div>
          </div>

          {/* Selected Chapter Detail Badge */}
          {typeof activeChapterTab === 'number' && currentActiveChapter && (
            <div className="bg-sky-50/90 border border-sky-200/90 rounded-xl px-3.5 py-2 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-sky-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                  {currentActiveChapter.chapterNumber}
                </div>
                <div>
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">
                    บทที่ {currentActiveChapter.chapterNumber}: {currentActiveChapter.title}
                  </span>
                  <span className="text-[11px] text-slate-500 ml-2">
                    (มีชื่อเรื่องคิดคะแนน {currentActiveChapter.topics.filter((t) => t?.trim()).length}/{currentActiveChapter.topics.length} เรื่อง)
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold text-sky-800 bg-sky-100/90 border border-sky-200 px-2.5 py-0.5 rounded-lg">
                คะแนนเก็บประจำบท: เต็ม <strong>{currentActiveChapter.maxScore || 15}</strong> คะแนน
              </span>
            </div>
          )}
        </div>

        {/* WORKSPACE CONTENT: DIRECTLY ATTACHED */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* VIEW 1: SINGLE CHAPTER SCORE GRID */}
          {typeof activeChapterTab === 'number' && currentActiveChapter && (
            <div className="space-y-4">
              {/* Sticky Table Container */}
              <div className="overflow-x-auto overflow-y-auto max-h-[70vh] border border-slate-200 rounded-2xl relative shadow-2xs">
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

                  {/* Dynamic Topic Columns (แคบเหมือนเดิม แต่ 2-3 บรรทัด) */}
                  {currentActiveChapter.topics.map((topicTitle, i) => {
                    const isTopicActive = !!topicTitle.trim();

                    return (
                      <th
                        key={`topic-head-${i}`}
                        className={`py-1.5 px-0.5 text-center w-16 min-w-[66px] sm:min-w-[72px] max-w-[80px] align-top sticky top-0 z-20 border-r border-slate-200/80 transition-colors ${
                          isTopicActive ? 'bg-sky-50/95' : 'bg-slate-100/95 opacity-80'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between px-0.5">
                            <span className="text-[9px] text-slate-500 font-bold block leading-none">
                              เรื่อง {i + 1}
                            </span>
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
                            title="พิมพ์ชื่อเรื่อง (เว้นว่างไว้จะไม่คิดคะแนน)"
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
                          <input
                            type="text"
                            defaultValue={`${student.prefix || ''}${student.firstName} ${student.lastName}`.trim()}
                            key={`ch-std-${student.id}-${student.prefix}-${student.firstName}-${student.lastName}`}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              const cur = `${student.prefix || ''}${student.firstName} ${student.lastName}`.trim();
                              if (val && val !== cur) {
                                handleUpdateStudentName(student.id, val);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            placeholder="พิมพ์ชื่อ - นามสกุล..."
                            className="w-full px-2 py-1 bg-transparent hover:bg-slate-100/80 focus:bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 rounded-lg text-xs font-semibold text-slate-800 transition-all outline-hidden border border-transparent hover:border-slate-300"
                            title="คลิกเพื่อแก้ไขชื่อ-สกุลได้ทุกเมื่อ (กด Enter หรือคลิกออกเพื่อบันทึกอัตโนมัติ)"
                          />
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
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-amber-50/70 p-3.5 sm:p-4 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <h3 className="text-sm font-bold text-amber-950">
                  แบบบันทึกคะแนนสอบปลายภาค (Final Examination)
                </h3>
                <span className="text-xs font-bold text-amber-900 bg-amber-200/70 px-2.5 py-0.5 rounded-md">
                  คะแนนเต็ม {activeSheet?.finalExamMaxScore !== undefined ? activeSheet.finalExamMaxScore : 30} คะแนน
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1">
                กรอกคะแนนสอบปลายภาคของนักเรียนแต่ละคน (0 ถึง {activeSheet?.finalExamMaxScore !== undefined ? activeSheet.finalExamMaxScore : 30}) คะแนนนี้จะนำไปรวมกับคะแนนเก็บทุกบทเพื่อตัดเกรดในแท็บ "รวมทุกบท"
              </p>
            </div>
          </div>

          {/* Sticky Table for Final Exam */}
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh] border border-slate-200 rounded-2xl relative shadow-2xs">
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
                    คะแนนสอบปลายภาค
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
                          <input
                            type="text"
                            defaultValue={`${student.prefix || ''}${student.firstName} ${student.lastName}`.trim()}
                            key={`exam-std-${student.id}-${student.prefix}-${student.firstName}-${student.lastName}`}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              const cur = `${student.prefix || ''}${student.firstName} ${student.lastName}`.trim();
                              if (val && val !== cur) {
                                handleUpdateStudentName(student.id, val);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            placeholder="พิมพ์ชื่อ - นามสกุล..."
                            className="w-full px-2 py-1 bg-transparent hover:bg-slate-100/80 focus:bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 rounded-lg text-xs font-semibold text-slate-800 transition-all outline-hidden border border-transparent hover:border-slate-300"
                            title="คลิกเพื่อแก้ไขชื่อ-สกุลได้ทุกเมื่อ (กด Enter หรือคลิกออกเพื่อบันทึกอัตโนมัติ)"
                          />
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
              คะแนนสอบปลายภาคจะนำไปรวมกับคะแนนเก็บของบทเรียนที่ 1 ถึง {currentChapters.length} ในหน้า "รวมทุกบท"
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
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: OVERALL SUMMARY TAB (คะแนนเก็บทุกบท + สอบปลายภาค + ตัดเกรด) */}
      {activeChapterTab === 'summary' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/60 p-3.5 sm:p-4 rounded-xl border border-emerald-200">
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

            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-sm shadow-emerald-200 cursor-pointer self-start sm:self-auto"
              title="บันทึกผลการประเมินเป็นไฟล์ PDF หรือสั่งพิมพ์"
            >
              <Download className="w-4 h-4" />
              <span>บันทึกเป็นไฟล์ PDF / พิมพ์สรุปผล</span>
            </button>
          </div>

          {/* Sticky Table Container for Overall Summary */}
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh] border border-slate-200 rounded-2xl relative shadow-2xs">
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
                    สอบปลายภาค
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
                        <input
                          type="text"
                          defaultValue={row.studentName}
                          key={`sum-std-${row.studentId}-${row.studentName}`}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val && val !== row.studentName) {
                              handleUpdateStudentName(row.studentId, val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          placeholder="พิมพ์ชื่อ - นามสกุล..."
                          className="w-full px-2 py-1 bg-transparent hover:bg-slate-100/80 focus:bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 rounded-lg text-xs font-semibold text-slate-800 transition-all outline-hidden border border-transparent hover:border-slate-300"
                          title="คลิกเพื่อแก้ไขชื่อ-สกุลได้ทุกเมื่อ (กด Enter หรือคลิกออกเพื่อบันทึกอัตโนมัติ)"
                        />
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
            </div>
          </div>
        </div>
      )}
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
                    คะแนนสอบปลายภาค (Final Examination) <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-amber-700">
                    กำหนดคะแนนเต็มสำหรับการสอบปลายภาค (เช่น 20 หรือ 30 คะแนน)
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

      {/* PRINT REPORT MODAL (Req 6: มีคอลัมน์สอบปลายภาคและคะแนนรวมสุทธิ) */}
      <PrintReportModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title={`แบบบันทึกผลการประเมินและสรุปผลการเรียน วิชา ${activeSheet?.subjectName || ''} (${activeSheet?.subjectCode || '-'})`}
        subtitle={`ภาคเรียนที่ ${activeSheet?.term || '1'} / ${profile.academicYear} • จำนวน ${currentChapters.length} บทเรียน`}
        profile={profile}
      >
        <table className="w-full border-collapse border border-slate-400 text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-400 font-bold">
              <th className="border border-slate-400 p-2 text-center w-12">ลำดับ</th>
              <th className="border border-slate-400 p-2 text-left">ชื่อ - นามสกุล นักเรียน</th>
              {currentChapters.map((ch) => (
                <th key={`p-head-${ch.chapterNumber}`} className="border border-slate-400 p-1 text-center">
                  {ch.title}
                  <span className="block text-[10px] font-normal">(เต็ม {ch.maxScore || 15})</span>
                </th>
              ))}
              <th className="border border-slate-400 p-2 text-center w-16">รวมคะแนนเก็บ</th>
              <th className="border border-slate-400 p-2 text-center w-16">
                สอบปลายภาค
                <span className="block text-[10px] font-normal">({activeSheet?.finalExamMaxScore || 30})</span>
              </th>
              <th className="border border-slate-400 p-2 text-center w-16">คะแนนรวม</th>
              <th className="border border-slate-400 p-2 text-center w-14">%</th>
              <th className="border border-slate-400 p-2 text-center w-14">เกรด</th>
            </tr>
          </thead>
          <tbody>
            {allStudentsSummary.map((row) => (
              <tr key={row.studentId} className="border-b border-slate-300">
                <td className="border border-slate-300 p-1.5 text-center">{row.order}</td>
                <td className="border border-slate-300 p-1.5 font-medium">{row.studentName}</td>
                {currentChapters.map((ch) => (
                  <td key={`p-cell-${ch.chapterNumber}`} className="border border-slate-300 p-1.5 text-center">
                    {row.chapterScaledScores[ch.chapterNumber] !== undefined
                      ? row.chapterScaledScores[ch.chapterNumber]
                      : '-'}
                  </td>
                ))}
                <td className="border border-slate-300 p-1.5 text-center font-bold">{row.totalChapterScaled}</td>
                <td className="border border-slate-300 p-1.5 text-center font-bold">{row.finalExamScore}</td>
                <td className="border border-slate-300 p-1.5 text-center font-black">{row.totalScore}</td>
                <td className="border border-slate-300 p-1.5 text-center font-bold">{row.percentage}%</td>
                <td className="border border-slate-300 p-1.5 text-center font-black">{row.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintReportModal>
    </div>
  );
};
