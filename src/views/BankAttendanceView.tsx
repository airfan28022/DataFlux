import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, TeacherProfile, AttendanceStatus, DayAttendanceAndBank, WithdrawalLog, WithdrawalPendingDay } from '../types';
import { dataService } from '../services/dataService';
import { formatThaiDate } from '../utils/helpers';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { PrintReportModal } from '../components/PrintReportModal';
import { CopyAllStudentsModal } from '../components/CopyAllStudentsModal';
import confetti from 'canvas-confetti';
import {
  PiggyBank,
  Calendar,
  CheckSquare,
  ArrowDownRight,
  History,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  X,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  FileText,
  UserCheck
} from 'lucide-react';

interface BankAttendanceViewProps {
  isAdmin: boolean;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const WEEKDAY_NAMES = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export const BankAttendanceView: React.FC<BankAttendanceViewProps> = ({ isAdmin }) => {
  // Custom Copied Students filter state (บันทึกลง localStorage เพื่อให้เป็นชั้นนั้นเป็นค่าเริ่มต้นทุกครั้งที่เปิดใช้งาน)
  const [customCopiedGrade, setCustomCopiedGrade] = useState<string | null>(() => {
    try {
      return localStorage.getItem('bank_copied_grade') || null;
    } catch {
      return null;
    }
  });
  const [customCopiedStudentIds, setCustomCopiedStudentIds] = useState<string[] | null>(() => {
    try {
      const saved = localStorage.getItem('bank_copied_students');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const all = dataService.getStudents();
    try {
      const savedGrade = localStorage.getItem('bank_copied_grade');
      const savedIdsStr = localStorage.getItem('bank_copied_students');
      if (savedGrade && savedGrade !== 'ทุกชั้น') {
        const filtered = all.filter((s) => s.gradeLevel === savedGrade);
        if (filtered.length > 0) return filtered;
      }
      if (savedIdsStr) {
        const ids: string[] = JSON.parse(savedIdsStr);
        if (ids && ids.length > 0) {
          const filtered = all.filter((s) => ids.includes(s.id));
          if (filtered.length > 0) return filtered;
        }
      }
    } catch {
      // fallback
    }
    return all;
  });
  const [profile, setProfile] = useState<TeacherProfile>(dataService.getProfile());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Current day's attendance, deposit & note state
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [depositsMap, setDepositsMap] = useState<Record<string, number>>({});
  const [dayNote, setDayNote] = useState<string>('');
  const [withdrawalLogs, setWithdrawalLogs] = useState<WithdrawalLog[]>(dataService.getWithdrawalLogs());
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalPendingDay[]>(dataService.getWithdrawalPendingDays());
  const [allHistoryRecords, setAllHistoryRecords] = useState<Record<string, DayAttendanceAndBank>>(dataService.getAllAttendanceAndBank());

  // Calendar Modal State
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

  // Withdrawal Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawStudentId, setWithdrawStudentId] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState<number>(50);
  const [withdrawReason, setWithdrawReason] = useState('');

  // History Log Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Print PDF Modal
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Reset / Delete Modal State (เลือก มา, ขาด, ป่วย, ลา, เงินออม และ All สำหรับลบทั้งหมด)
  type DeleteTarget = 'all' | 'savings' | 'present' | 'absent' | 'sick' | 'personal';

  const [showResetModal, setShowResetModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>('all');
  const [deleteScope, setDeleteScope] = useState<'day' | 'all'>('day');
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Daily Note Fullscreen Pop-up Modal State
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [isNoteFullscreen, setIsNoteFullscreen] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);

  // Table Fullscreen Pop-up State
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);

  // Copied student state for feedback
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);

  // Modal คัดลอกรายชื่อนักเรียนทั้งหมด จากหน้าข้อมูลนักเรียน (เลือกชั้นได้)
  const [showCopyAllStudentsModal, setShowCopyAllStudentsModal] = useState(false);

  // Mobile / Full-screen Student Pop-up Modal (Req: ตรงหน้าฝากเงิน & เช็คชื่อ เมื่อกดชื่อ จะแสดงpop-up หน้าเต็มพอดี และมีกรอกใส่เงินฝาก หรือ เลือก ม,ป,ล,ข ลงเสร็จกดบันทึก)
  const [selectedStudentModal, setSelectedStudentModal] = useState<Student | null>(null);
  const [modalAttendance, setModalAttendance] = useState<AttendanceStatus | null>('present');
  const [modalDeposit, setModalDeposit] = useState<number>(0);

  const handleOpenStudentModal = (student: Student) => {
    setSelectedStudentModal(student);
    setModalAttendance(attendanceMap[student.id] || null);
    setModalDeposit(depositsMap[student.id] || 0);
  };

  const handleSaveStudentModal = () => {
    if (!selectedStudentModal) return;
    const sId = selectedStudentModal.id;
    if (modalAttendance) {
      handleAttendanceChange(sId, modalAttendance);
    } else {
      const updatedAtt = { ...attendanceMap };
      delete updatedAtt[sId];
      setAttendanceMap(updatedAtt);
      dataService.saveDayAttendanceAndBank(selectedDate, updatedAtt, depositsMap, dayNote, true);
      setAllHistoryRecords(dataService.getAllAttendanceAndBank());
    }
    handleDepositChange(sId, modalDeposit);
    dataService.notifyToast(
      'success',
      `บันทึกข้อมูล ${selectedStudentModal.prefix || ''}${selectedStudentModal.firstName} แล้ว`,
      modalAttendance
        ? `สถานะ: ${modalAttendance === 'present' ? 'มาเรียน' : modalAttendance === 'sick' ? 'ป่วย' : modalAttendance === 'personal' ? 'ลากิจ' : 'ขาดเรียน'} | เงินฝาก: ${modalDeposit} บาท`
        : `ลบ/ยกเลิกสถานะการเช็คชื่อแล้ว | เงินฝาก: ${modalDeposit} บาท`
    );
    setSelectedStudentModal(null);
  };

  const handleNextStudentInModal = () => {
    if (!selectedStudentModal) return;
    const sId = selectedStudentModal.id;
    if (modalAttendance) {
      handleAttendanceChange(sId, modalAttendance);
    } else {
      const updatedAtt = { ...attendanceMap };
      delete updatedAtt[sId];
      setAttendanceMap(updatedAtt);
      dataService.saveDayAttendanceAndBank(selectedDate, updatedAtt, depositsMap, dayNote, true);
      setAllHistoryRecords(dataService.getAllAttendanceAndBank());
    }
    handleDepositChange(sId, modalDeposit);

    const currentIndex = students.findIndex((s) => s.id === selectedStudentModal.id);
    if (currentIndex < students.length - 1) {
      const nextStudent = students[currentIndex + 1];
      setSelectedStudentModal(nextStudent);
      setModalAttendance(attendanceMap[nextStudent.id] || null);
      setModalDeposit(depositsMap[nextStudent.id] || 0);
    } else {
      setSelectedStudentModal(null);
      dataService.notifyToast('success', 'บันทึกครบทุกคนแล้ว');
    }
  };

  const handlePrevStudentInModal = () => {
    if (!selectedStudentModal) return;
    const sId = selectedStudentModal.id;
    if (modalAttendance) {
      handleAttendanceChange(sId, modalAttendance);
    } else {
      const updatedAtt = { ...attendanceMap };
      delete updatedAtt[sId];
      setAttendanceMap(updatedAtt);
      dataService.saveDayAttendanceAndBank(selectedDate, updatedAtt, depositsMap, dayNote, true);
      setAllHistoryRecords(dataService.getAllAttendanceAndBank());
    }
    handleDepositChange(sId, modalDeposit);

    const currentIndex = students.findIndex((s) => s.id === selectedStudentModal.id);
    if (currentIndex > 0) {
      const prevStudent = students[currentIndex - 1];
      setSelectedStudentModal(prevStudent);
      setModalAttendance(attendanceMap[prevStudent.id] || null);
      setModalDeposit(depositsMap[prevStudent.id] || 0);
    }
  };

  // Load data for the selected date
  const loadDayData = (date: string) => {
    const allRecords = dataService.getAllAttendanceAndBank();
    const isExistingRecord = !!allRecords[date];
    const dayData = dataService.getDayAttendanceAndBank(date);
    const initialAtt: Record<string, AttendanceStatus> = {};
    const initialDep: Record<string, number> = {};

    const allStudents = dataService.getStudents();
    let currentStudents = allStudents;
    if (customCopiedGrade && customCopiedGrade !== 'ทุกชั้น') {
      const filtered = allStudents.filter((s) => s.gradeLevel === customCopiedGrade);
      if (filtered.length > 0) {
        currentStudents = filtered;
      } else if (customCopiedStudentIds && customCopiedStudentIds.length > 0) {
        currentStudents = allStudents.filter((s) => customCopiedStudentIds.includes(s.id));
      }
    } else if (customCopiedStudentIds && customCopiedStudentIds.length > 0) {
      currentStudents = allStudents.filter((s) => customCopiedStudentIds.includes(s.id));
    }
    
    setStudents(currentStudents);

    if (isExistingRecord) {
      // If the date already exists in records (saved, created, or reset),
      // respect stored attendance exactly without re-injecting 'present' if deleted/unset.
      currentStudents.forEach((s) => {
        if (dayData.attendance && dayData.attendance[s.id]) {
          initialAtt[s.id] = dayData.attendance[s.id];
        }
        initialDep[s.id] = dayData.deposits && dayData.deposits[s.id] !== undefined ? dayData.deposits[s.id] : 0;
      });

      setAttendanceMap(initialAtt);
      setDepositsMap(initialDep);
      setDayNote(dayData.note || '');
    } else {
      // First time opening a brand-new day: auto-mark 'present' for convenience
      currentStudents.forEach((s) => {
        initialAtt[s.id] = 'present';
        initialDep[s.id] = 0;
      });

      setAttendanceMap(initialAtt);
      setDepositsMap(initialDep);
      setDayNote('');

      dataService.saveDayAttendanceAndBank(date, initialAtt, initialDep, '', true);
    }
  };

  useEffect(() => {
    loadDayData(selectedDate);
  }, [selectedDate, customCopiedGrade, customCopiedStudentIds]);

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      const all = dataService.getStudents();
      if (customCopiedGrade && customCopiedGrade !== 'ทุกชั้น') {
        const filtered = all.filter((s) => s.gradeLevel === customCopiedGrade);
        if (filtered.length > 0) {
          setStudents(filtered);
        } else if (customCopiedStudentIds && customCopiedStudentIds.length > 0) {
          setStudents(all.filter((s) => customCopiedStudentIds.includes(s.id)));
        } else {
          setStudents(all);
        }
      } else if (customCopiedStudentIds && customCopiedStudentIds.length > 0) {
        setStudents(all.filter((s) => customCopiedStudentIds.includes(s.id)));
      } else {
        setStudents(all);
      }
      setProfile(dataService.getProfile());
      setWithdrawalLogs(dataService.getWithdrawalLogs());
      setAllHistoryRecords(dataService.getAllAttendanceAndBank());
      setPendingWithdrawals(dataService.getWithdrawalPendingDays());
    });
    return unsub;
  }, [customCopiedGrade, customCopiedStudentIds]);

  // นำรายชื่อที่คัดลอกมาแทนที่ข้อมูลเดิมทันทีตามจำนวนจริงของชั้นที่เลือก (บันทึกจำไว้ถาวร)
  const handleApplyStudentsBank = (selectedStudents: Student[], gradeLabel: string) => {
    const newIds = selectedStudents.map((s) => s.id);
    setCustomCopiedGrade(gradeLabel);
    setCustomCopiedStudentIds(newIds);
    setStudents(selectedStudents);
    try {
      localStorage.setItem('bank_copied_grade', gradeLabel);
      localStorage.setItem('bank_copied_students', JSON.stringify(newIds));
    } catch (e) {
      console.warn(e);
    }

    const newAtt: Record<string, AttendanceStatus> = {};
    const newDep: Record<string, number> = {};
    selectedStudents.forEach((s) => {
      if (attendanceMap[s.id]) {
        newAtt[s.id] = attendanceMap[s.id];
      }
      newDep[s.id] = depositsMap[s.id] || 0;
    });

    setAttendanceMap(newAtt);
    setDepositsMap(newDep);

    dataService.saveDayAttendanceAndBank(selectedDate, newAtt, newDep, dayNote, true);
    setAllHistoryRecords(dataService.getAllAttendanceAndBank());

    dataService.notifyToast(
      'success',
      'คัดลอกรายชื่อสำเร็จ',
      `คัดลอกรายชื่อนักเรียนชั้น ${gradeLabel} (${selectedStudents.length} คน) เรียบร้อยแล้ว (บันทึกเป็นค่าเริ่มต้น)`
    );
    setShowCopyAllStudentsModal(false);
  };

  const handleResetCopiedGrade = () => {
    setCustomCopiedGrade(null);
    setCustomCopiedStudentIds(null);
    try {
      localStorage.removeItem('bank_copied_grade');
      localStorage.removeItem('bank_copied_students');
    } catch (e) {
      console.warn(e);
    }
    const all = dataService.getStudents();
    setStudents(all);
    dataService.notifyToast('info', 'แสดงนักเรียนทั้งหมด', `แสดงรายชื่อนักเรียนทุกชั้น (${all.length} คน)`);
  };

  // Handle Note input change (auto-saves silently)
  const handleNoteChange = (text: string) => {
    setDayNote(text);
    dataService.saveDayAttendanceAndBank(selectedDate, attendanceMap, depositsMap, text, true);
    setAllHistoryRecords(dataService.getAllAttendanceAndBank());
  };

  // Attendance status handler (ม, ป, ล, ข)
  // When clicking the active status again, toggle it off (delete/clear attendance for this student)
  // When status is sick (ป), personal (ล), or absent (ข), deposit for today is reset to 0
  const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
    const isCurrent = attendanceMap[studentId] === status;
    const updatedAtt = { ...attendanceMap };
    if (isCurrent) {
      delete updatedAtt[studentId];
    } else {
      updatedAtt[studentId] = status;
    }
    setAttendanceMap(updatedAtt);

    let updatedDep = { ...depositsMap };
    if (!isCurrent && (status === 'sick' || status === 'personal' || status === 'absent')) {
      updatedDep = { ...updatedDep, [studentId]: 0 };
      setDepositsMap(updatedDep);
    }
    dataService.saveDayAttendanceAndBank(selectedDate, updatedAtt, updatedDep, dayNote, true);
    setAllHistoryRecords(dataService.getAllAttendanceAndBank());
  };

  const depositSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (depositSaveTimeoutRef.current) {
        clearTimeout(depositSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleDepositChange = (studentId: string, amount: number) => {
    const updated = { ...depositsMap, [studentId]: Math.max(0, amount) };
    setDepositsMap(updated);

    if (depositSaveTimeoutRef.current) {
      clearTimeout(depositSaveTimeoutRef.current);
    }
    depositSaveTimeoutRef.current = setTimeout(() => {
      dataService.saveDayAttendanceAndBank(selectedDate, attendanceMap, updated, dayNote, true);
      setAllHistoryRecords(dataService.getAllAttendanceAndBank());
    }, 250);
  };

  // Confirm Delete Bank & Attendance Data (มา, ขาด, ป่วย, ลา, เงินออม, All)
  const handleConfirmDeleteData = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassword) {
      setResetError('กรุณากรอก Password เข้าสู่ระบบ');
      return;
    }
    const res = dataService.deleteBankAttendanceData({
      target: deleteTarget,
      scope: deleteScope,
      date: selectedDate,
      password: resetPassword,
    });
    if (res.success) {
      setShowResetModal(false);
      setResetPassword('');
      setResetError('');
      loadDayData(selectedDate);
      setAllHistoryRecords(dataService.getAllAttendanceAndBank());
      setStudents(dataService.getStudents());
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } else {
      setResetError(res.message);
    }
  };

  // Handler to mark all students as present ('present') for today (ไอคอนสำหรับกดเพื่อกลายเป็นมาเรียนทั้งหมด หรือ ทุกคนมาเรียน)
  const handleMarkAllPresent = () => {
    if (!students || students.length === 0) {
      dataService.notifyToast('warning', 'ไม่พบข้อมูลนักเรียน');
      return;
    }

    const updatedAtt: Record<string, AttendanceStatus> = { ...attendanceMap };
    students.forEach((s) => {
      updatedAtt[s.id] = 'present';
    });

    setAttendanceMap(updatedAtt);
    dataService.saveDayAttendanceAndBank(selectedDate, updatedAtt, depositsMap, dayNote, true);
    setAllHistoryRecords(dataService.getAllAttendanceAndBank());

    dataService.notifyToast(
      'success',
      'ทุกคนมาเรียนทั้งหมด',
      `ปรับสถานะนักเรียนเป็นมาเรียนทุกคน (${students.length} คน) เรียบร้อยแล้ว`
    );

    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // Ignore confetti fallback
    }
  };

  // Navigate dates (Previous / Next / Today)
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    setSelectedDate(today);
    setCalendarMonth(new Date());
  };

  // Handle Withdrawal
  const handleConfirmWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawStudentId) {
      dataService.notifyToast('warning', 'กรุณาเลือกนักเรียนที่จะถอนเงิน');
      return;
    }
    if (!withdrawAmount || withdrawAmount <= 0) {
      dataService.notifyToast('warning', 'กรุณาระบุจำนวนเงินที่ถูกต้อง');
      return;
    }
    if (!withdrawReason.trim()) {
      dataService.notifyToast('warning', 'กรุณาระบุเหตุผลการถอนเงิน');
      return;
    }

    const result = dataService.addWithdrawal(withdrawStudentId, withdrawAmount, withdrawReason.trim());
    if (result.success) {
      setShowWithdrawModal(false);
      setWithdrawAmount(50);
      setWithdrawReason('');
      setWithdrawStudentId('');
      setWithdrawalLogs(dataService.getWithdrawalLogs());
      setPendingWithdrawals(dataService.getWithdrawalPendingDays());
      setAllHistoryRecords(dataService.getAllAttendanceAndBank());
      loadDayData(selectedDate);
    }
  };

  // Cumulative student attendance statistics across all saved dates (ม, ป, ล, ข)
  const studentCumulativeStats = useMemo(() => {
    const stats: Record<string, { present: number; sick: number; personal: number; absent: number }> = {};
    const studentIds = new Set<string>();
    students.forEach((s) => {
      stats[s.id] = { present: 0, sick: 0, personal: 0, absent: 0 };
      studentIds.add(s.id);
    });

    const allDates = new Set(Object.keys(allHistoryRecords));
    allDates.add(selectedDate);

    allDates.forEach((dateKey) => {
      const att = dateKey === selectedDate ? attendanceMap : (allHistoryRecords[dateKey]?.attendance || {});
      for (const [studentId, st] of Object.entries(att)) {
        if (studentIds.has(studentId)) {
          if (st === 'present') stats[studentId].present += 1;
          else if (st === 'sick') stats[studentId].sick += 1;
          else if (st === 'personal') stats[studentId].personal += 1;
          else if (st === 'absent') stats[studentId].absent += 1;
        }
      }
    });

    return stats;
  }, [students, allHistoryRecords, selectedDate, attendanceMap]);

  // Real-time cumulative savings for each student across all recorded dates
  const studentCumulativeSavings = useMemo(() => {
    const savings: Record<string, number> = {};
    const studentIds = new Set<string>();
    students.forEach((s) => {
      savings[s.id] = 0;
      studentIds.add(s.id);
    });

    const allDates = new Set(Object.keys(allHistoryRecords));
    allDates.add(selectedDate);

    allDates.forEach((dateKey) => {
      const dayDeposits = dateKey === selectedDate ? depositsMap : (allHistoryRecords[dateKey]?.deposits || {});
      for (const [sId, amt] of Object.entries(dayDeposits)) {
        if (studentIds.has(sId)) {
          const val = Number(amt) || 0;
          if (val > 0) {
            savings[sId] = (savings[sId] || 0) + val;
          }
        }
      }
    });

    return savings;
  }, [students, allHistoryRecords, selectedDate, depositsMap]);

  // Statistics for a given date
  const getDayStats = (dateStr: string) => {
    let dayAtt: Record<string, AttendanceStatus> = {};
    let dayDep: Record<string, number> = {};
    let note = '';

    if (dateStr === selectedDate) {
      dayAtt = attendanceMap;
      dayDep = depositsMap;
      note = dayNote;
    } else if (allHistoryRecords[dateStr]) {
      dayAtt = allHistoryRecords[dateStr].attendance || {};
      dayDep = allHistoryRecords[dateStr].deposits || {};
      note = allHistoryRecords[dateStr].note || '';
    }

    const depositors = Object.values(dayDep).filter((v) => Number(v) > 0).length;
    const totalDeposit = Object.values(dayDep).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const present = Object.values(dayAtt).filter((s) => s === 'present').length;
    const personal = Object.values(dayAtt).filter((s) => s === 'personal').length;
    const sick = Object.values(dayAtt).filter((s) => s === 'sick').length;
    const absent = Object.values(dayAtt).filter((s) => s === 'absent').length;

    return { depositors, totalDeposit, present, personal, sick, absent, note };
  };

  // Current selected day statistics
  const currentDayStats = getDayStats(selectedDate);

  // Total classroom savings calculated from real-time student cumulative savings
  const classroomAllSavings = useMemo(() => {
    return Object.values(studentCumulativeSavings).reduce((sum: number, val: number) => sum + (Number(val) || 0), 0);
  }, [studentCumulativeSavings]);

  // Total cumulative attendance counts across all students
  const classroomCumulativeStats = useMemo(() => {
    let totalPresent = 0;
    let totalSick = 0;
    let totalPersonal = 0;
    let totalAbsent = 0;
    (Object.values(studentCumulativeStats) as { present: number; sick: number; personal: number; absent: number }[]).forEach((st) => {
      totalPresent += st.present;
      totalSick += st.sick;
      totalPersonal += st.personal;
      totalAbsent += st.absent;
    });
    return { totalPresent, totalSick, totalPersonal, totalAbsent };
  }, [studentCumulativeStats]);

  const selectedStudentForWithdraw = students.find((s) => s.id === withdrawStudentId);

  // Calendar calculations for the Pop-up Modal
  const calYear = calendarMonth.getFullYear();
  const calMonth = calendarMonth.getMonth();
  const daysInCalMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();

  const handlePrevMonth = () => {
    setCalendarMonth(new Date(calYear, calMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(new Date(calYear, calMonth + 1, 1));
  };

  // Check dots for date (Req 4: Blue dot for withdrawal pending clearance)
  const getDayDotStatus = (dayNum: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    let hasDeposit = false;
    let hasAbsence = false;
    let hasNote = false;

    // Check if date has blue dot withdrawal deduction
    const deductedItems = pendingWithdrawals.filter((p) => p.date === dateStr);
    const hasBlueDot = deductedItems.length > 0;

    if (dateStr === selectedDate) {
      hasDeposit = Object.values(depositsMap).some((v) => (Number(v) || 0) > 0);
      hasAbsence = Object.values(attendanceMap).some(
        (st) => st === 'sick' || st === 'personal' || st === 'absent'
      );
      hasNote = !!dayNote?.trim();
    } else {
      const record = allHistoryRecords[dateStr];
      if (record) {
        if (record.deposits) {
          hasDeposit = Object.values(record.deposits).some((v) => (Number(v) || 0) > 0);
        }
        if (record.attendance) {
          hasAbsence = Object.values(record.attendance).some(
            (st) => st === 'sick' || st === 'personal' || st === 'absent'
          );
        }
        hasNote = !!record.note?.trim();
      }
    }

    return { dateStr, hasDeposit, hasAbsence, hasNote, hasBlueDot, deductedItems };
  };

  // Click on date in calendar pop-up
  const handleCalendarDayClick = (dateStr: string) => {
    if (dateStr === selectedDate) {
      // Clicking the already selected date closes the popup
      setShowCalendarModal(false);
    } else {
      setSelectedDate(dateStr);
      loadDayData(dateStr);
    }
  };

  const handleCalendarDayDoubleClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    loadDayData(dateStr);
    setShowCalendarModal(false);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header Card - Single-row compact bar for tablet view */}
      <div className="flex items-center justify-between gap-2.5 bg-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <PiggyBank className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-gray-900 truncate">
            เงินฝาก & เช็คชื่อ (Bank & Attendance)
          </h2>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* ไอคอนสำหรับกดเพื่อกลายเป็นมาเรียนทั้งหมด หรือ ทุกคนมาเรียน */}
          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 border border-emerald-300 rounded-xl transition-all cursor-pointer"
            title="กดเพื่อให้ทุกคนเป็นมาเรียนทั้งหมด (ทุกคนมาเรียน)"
            aria-label="ทุกคนมาเรียนทั้งหมด"
          >
            <UserCheck className="w-4 h-4 text-emerald-700" />
          </button>

          {/* ปุ่มลบข้อมูล (เลือก มา, ขาด, ป่วย, ลา, เงินออม และ All) */}
          <button
            type="button"
            onClick={() => {
              setDeleteTarget('all');
              setResetPassword('');
              setResetError('');
              setShowResetModal(true);
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 rounded-xl transition-all cursor-pointer"
            title="ลบข้อมูล (เลือก มา, ขาด, ป่วย, ลา, เงินออม หรือ All)"
            aria-label="ลบข้อมูล"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
          </button>

          {/* แก้3: ปุ่มประวัติ ให้มีเฉพาะสัญลักษณ์ เอาออกข้อความเพื่อให้ปุ่มแคบ */}
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200/80 rounded-xl transition-all cursor-pointer relative"
            title={`ประวัติการถอน (${withdrawalLogs.length})`}
            aria-label="ประวัติการถอนเงิน"
          >
            <History className="w-4 h-4 text-slate-600" />
            {withdrawalLogs.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {withdrawalLogs.length > 9 ? '9+' : withdrawalLogs.length}
              </span>
            )}
          </button>

          {/* แก้4: ปุ่มถอนเงิน ให้มีแค่คำว่า "ถอน" */}
          <button
            type="button"
            onClick={() => setShowWithdrawModal(true)}
            className="h-8 sm:h-9 px-2.5 sm:px-3 flex items-center justify-center gap-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="ทำรายการถอนเงินฝากของนักเรียน"
          >
            <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>ถอน</span>
          </button>

          {/* แก้5: ปุ่มดาวน์โหลด ให้มีแค่สัญลักษณ์เครื่องปริ้น */}
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl shadow-xs transition-all cursor-pointer"
            title="พิมพ์ / บันทึกรายงานเป็น PDF"
            aria-label="พิมพ์รายงานเป็นไฟล์ PDF"
          >
            <Printer className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* COMPACT NOTE BAR */}
      <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs">
        {/* Daily Note Input with Expand Pop-up Button */}
        <div className="flex items-center gap-2 bg-amber-50/70 border border-amber-200/90 rounded-xl px-3 py-1.5 transition-all focus-within:border-amber-400 focus-within:bg-amber-50 shadow-2xs">
          <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-bold text-amber-900 shrink-0 whitespace-nowrap hidden sm:inline">
              หมายเหตุประจำวัน:
            </span>
            <input
              type="text"
              value={dayNote}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="เช่น วันนี้มีกิจกรรมทัศนศึกษา ไม่ได้เก็บเงินออม, วันหยุดโรงเรียน..."
              className="w-full bg-transparent text-xs text-slate-800 placeholder:text-amber-700/40 outline-hidden font-medium truncate"
            />
          </div>
          {dayNote && (
            <span className="text-[10px] bg-amber-200/70 text-amber-800 px-1.5 py-0.5 rounded-md font-semibold shrink-0">
              บันทึกแล้ว
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowNoteModal(true)}
            className="w-7 h-7 flex items-center justify-center bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-all shadow-2xs cursor-pointer border border-amber-300 shrink-0"
            title="บันทึกรายละเอียดหมายเหตุแบบเต็มหน้าจอ"
            aria-label="ขยายหน้าต่างหมายเหตุ"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-800" />
          </button>
        </div>
      </div>

      {/* Main Attendance & Deposit Table Workspace with Fullscreen Pop-up (แก้8) */}
      <div
        className={
          isTableFullscreen
            ? 'fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 flex flex-col animate-in fade-in duration-150'
            : 'contents'
        }
      >
        <div
          className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col overflow-hidden ${
            isTableFullscreen ? 'w-full h-full shadow-2xl' : 'p-3.5 sm:p-4'
          }`}
        >
          {/* Header row inside table container */}
          <div
            className={`flex items-center justify-between gap-2 shrink-0 ${
              isTableFullscreen ? 'p-3.5 bg-slate-50/90 border-b border-slate-200' : 'pb-3'
            }`}
          >
            {/* แก้6 & แก้7: บัญชีเช็คชื่อ-และฝากเงิน ร่วมกับปฏิทินที่แสดงเฉพาะสัญลักษณ์เท่านั้น ไม่มีข้อความใดๆ ทั้งสิ้น */}
            <div className="flex items-center gap-2 min-w-0">
              <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                บัญชีเช็คชื่อและการฝากเงิน: {formatThaiDate(selectedDate)}
              </h3>

              {/* ปฏิทินแสดงเฉพาะสัญลักษณ์เท่านั้น (แก้6) */}
              <button
                type="button"
                onClick={() => setShowCalendarModal(true)}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 border border-emerald-300 rounded-xl transition-all cursor-pointer shrink-0"
                title="เปิดปฏิทินเลือกวัน"
                aria-label="เปิดปฏิทิน"
              >
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700" />
              </button>

              {/* ปุ่มสัญลักษณ์คัดลอก สำหรับคัดลอกรายชื่อนักเรียนทั้งหมด จากหน้าข้อมูลนักเรียน (เลือกชั้นได้ เช่น ป.1 ป.2 ...) */}
              <button
                type="button"
                onClick={() => setShowCopyAllStudentsModal(true)}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-700 border border-purple-300 rounded-xl transition-all cursor-pointer shrink-0"
                title="คัดลอกรายชื่อนักเรียนทั้งหมด จากหน้าข้อมูลนักเรียน (เลือกชั้นได้ เช่น ป.1, ป.2...)"
                aria-label="คัดลอกรายชื่อนักเรียนทั้งหมด"
              >
                <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-700" />
              </button>

              {/* ไอคอนสำหรับกดเพื่อกลายเป็นมาเรียนทั้งหมด หรือ ทุกคนมาเรียน */}
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 border border-emerald-300 rounded-xl transition-all cursor-pointer shrink-0"
                title="กดเพื่อให้ทุกคนเป็นมาเรียนทั้งหมด (ทุกคนมาเรียน)"
                aria-label="ทุกคนมาเรียนทั้งหมด"
              >
                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700" />
              </button>

              {customCopiedGrade && (
                <div 
                  className="flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 pl-2.5 pr-1.5 py-0.5 rounded-lg text-xs font-semibold shrink-0 transition-colors"
                >
                  <span 
                    onClick={() => setShowCopyAllStudentsModal(true)}
                    className="cursor-pointer hover:underline"
                    title="กดเพื่อเปลี่ยนชั้นเรียนหรือคัดลอกรายชื่อใหม่"
                  >
                    ชั้น {customCopiedGrade} ({students.length} คน)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetCopiedGrade();
                    }}
                    className="p-0.5 text-purple-400 hover:text-purple-700 hover:bg-purple-200/60 rounded-full cursor-pointer transition-colors"
                    title="ล้างการเลือกและแสดงนักเรียนทั้งหมด"
                    aria-label="ล้างการเลือกชั้นเรียน"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Right side controls: เลื่อนวัน ซ้าย-ขวา (ไม่มีคำว่าวันนี้), จำนวนนักเรียน, ปุ่มขยายตารางเฉพาะไอคอน (แก้8) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* เลื่อนวัน ซ้าย-ขวา เท่านั้น ไม่มีคำว่าวันนี้ (แก้7) */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={handlePrevDay}
                  className="p-1 sm:p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all cursor-pointer"
                  title="วันก่อนหน้า"
                  aria-label="วันก่อนหน้า"
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextDay}
                  className="p-1 sm:p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all cursor-pointer"
                  title="วันถัดไป"
                  aria-label="วันถัดไป"
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              <span className="text-[11px] sm:text-xs text-slate-500 font-medium hidden md:inline">
                {students.length} คน
              </span>

              {/* แก้8: ปุ่มขยายตรงตารางเงินฝากเป็น pop-up ให้มีแค่สัญลักษณ์ขยายไม่ต้องมีข้อความใดๆทั้งสิ้น */}
              {isTableFullscreen ? (
                <button
                  type="button"
                  onClick={() => setIsTableFullscreen(false)}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl shadow-xs transition-all cursor-pointer"
                  title="ย่อหน้าต่างกลับ"
                  aria-label="ย่อหน้าต่าง"
                >
                  <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsTableFullscreen(true)}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer"
                  title="ขยายตารางเต็มหน้าจอ (Pop-up)"
                  aria-label="ขยายตาราง"
                >
                  <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 bg-slate-50 z-10">
                  <th className="py-2.5 px-2.5 w-12 text-center">ลำดับ</th>
                  <th className="py-2.5 px-3 min-w-[200px]">
                    <span>รูป / ชื่อ-สกุล นักเรียน</span>
                  </th>
                  <th className="py-2.5 px-2 w-36 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>สถานะมาเรียน</span>
                      <button
                        type="button"
                        onClick={handleMarkAllPresent}
                        className="w-5 h-5 flex items-center justify-center rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-all cursor-pointer active:scale-90"
                        title="กดเพื่อให้ทุกคนเป็นมาเรียนทั้งหมด (ทุกคนมาเรียน)"
                        aria-label="ทุกคนมาเรียนทั้งหมด"
                      >
                        <UserCheck className="w-3 h-3 text-emerald-700" />
                      </button>
                    </div>
                  </th>
                  <th className="py-2.5 px-2 w-28 text-center">ฝากเงินวันนี้</th>
                  <th className="py-2.5 px-2 w-16 text-center text-emerald-700 bg-emerald-50/40">มารวม</th>
                  <th className="py-2.5 px-2 w-16 text-center text-amber-700 bg-amber-50/40">ป่วยรวม</th>
                  <th className="py-2.5 px-2 w-16 text-center text-blue-700 bg-blue-50/40">ลารวม</th>
                  <th className="py-2.5 px-2 w-16 text-center text-rose-700 bg-rose-50/40">ขาดรวม</th>
                  <th className="py-2.5 px-3 w-28 text-right bg-emerald-100/40 text-emerald-900 font-bold">
                    ยอดรวม
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student, index) => {
                  const currentStatus = attendanceMap[student.id];
                  const currentDeposit = depositsMap[student.id] || 0;
                  const stats = studentCumulativeStats[student.id] || { present: 0, sick: 0, personal: 0, absent: 0 };

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2 px-2.5 text-center text-slate-500 font-medium">{index + 1}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleOpenStudentModal(student)}
                            className="flex items-center gap-2.5 text-left group/std hover:opacity-90 transition-all cursor-pointer min-w-0"
                            title="กดเพื่อเปิดป๊อปอัปเช็คชื่อและฝากเงิน (ม, ป, ล, ข)"
                          >
                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 group-hover/std:border-emerald-500 bg-slate-100 shrink-0 transition-colors shadow-2xs">
                              <ImageWithFallback
                                src={student.photoUrl}
                                alt={student.firstName}
                                isAvatar={true}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-800 text-xs truncate group-hover/std:text-emerald-700 underline decoration-slate-300 group-hover/std:decoration-emerald-500 underline-offset-2">
                                  {student.prefix}{student.firstName} {student.lastName}
                                </span>
                                {student.nickname && (
                                  <span className="text-[10px] text-slate-500 shrink-0">({student.nickname})</span>
                                )}
                                <span className="inline-flex md:hidden text-[9px] bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded font-medium border border-emerald-200 shrink-0">
                                  กดบันทึก
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                                <span>#{student.studentCode}</span>
                                {student.gradeLevel && (
                                  <span className="px-1 py-0.2 bg-purple-50 text-purple-600 rounded font-medium text-[8.5px]">
                                    {student.gradeLevel}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const nameToCopy = `${student.prefix || ''}${student.firstName} ${student.lastName}`.trim();
                              navigator.clipboard.writeText(nameToCopy).then(() => {
                                setCopiedStudentId(student.id);
                                dataService.notifyToast('success', 'คัดลอกชื่อนักเรียนแล้ว', nameToCopy);
                                setTimeout(() => setCopiedStudentId(null), 2000);
                              }).catch(() => {
                                // Fallback if clipboard API is constrained
                                dataService.notifyToast('info', 'คัดลอกชื่อนักเรียน', nameToCopy);
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-purple-600 rounded-md hover:bg-purple-50 transition-colors cursor-pointer shrink-0 ml-auto"
                            title="คัดลอกชื่อ-นามสกุลนักเรียน"
                          >
                            {copiedStudentId === student.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Attendance Status Selector (ม, ป, ล, ข) */}
                      <td className="py-2 px-2 text-center">
                        <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                          <button
                            type="button"
                            onClick={() => handleAttendanceChange(student.id, 'present')}
                            className={`w-7 h-6 rounded text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={currentStatus === 'present' ? 'คลิกเพื่อลบ/ยกเลิกสถานะมาเรียน (ม)' : 'มาเรียน (ม)'}
                          >
                            ม
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAttendanceChange(student.id, 'sick')}
                            className={`w-7 h-6 rounded text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === 'sick'
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
                            }`}
                            title={currentStatus === 'sick' ? 'คลิกเพื่อลบ/ยกเลิกสถานะป่วย (ป)' : 'ป่วย (ป)'}
                          >
                            ป
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAttendanceChange(student.id, 'personal')}
                            className={`w-7 h-6 rounded text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === 'personal'
                                ? 'bg-blue-500 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                            }`}
                            title={currentStatus === 'personal' ? 'คลิกเพื่อลบ/ยกเลิกสถานะลา (ล)' : 'ลากิจ (ล)'}
                          >
                            ล
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAttendanceChange(student.id, 'absent')}
                            className={`w-7 h-6 rounded text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === 'absent'
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                            }`}
                            title={currentStatus === 'absent' ? 'คลิกเพื่อลบ/ยกเลิกสถานะขาด (ข)' : 'ขาดเรียน (ข)'}
                          >
                            ข
                          </button>
                        </div>
                      </td>

                      {/* Deposit input / Auto display "ป, ล, ข" when marked absent/sick/leave */}
                      <td className="py-2 px-2 text-center">
                        {currentStatus === 'sick' ? (
                          <div className="w-20 mx-auto py-1 px-2 bg-amber-50 text-amber-700 font-bold border border-amber-200 rounded-lg text-xs text-center">
                            ป
                          </div>
                        ) : currentStatus === 'personal' ? (
                          <div className="w-20 mx-auto py-1 px-2 bg-blue-50 text-blue-700 font-bold border border-blue-200 rounded-lg text-xs text-center">
                            ล
                          </div>
                        ) : currentStatus === 'absent' ? (
                          <div className="w-20 mx-auto py-1 px-2 bg-rose-50 text-rose-700 font-bold border border-rose-200 rounded-lg text-xs text-center">
                            ข
                          </div>
                        ) : (
                          <div className="relative w-22 mx-auto">
                            <input
                              type="number"
                              min="0"
                              step="5"
                              value={currentDeposit || ''}
                              onChange={(e) =>
                                handleDepositChange(student.id, e.target.value ? Number(e.target.value) : 0)
                              }
                              placeholder="0"
                              className="w-full pl-2 pr-6 py-1 text-center font-bold text-slate-800 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-100 text-xs outline-hidden"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                              ฿
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Cumulative Present Total (ม) */}
                      <td className="py-2 px-2 text-center bg-emerald-50/20">
                        <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60" title={`มาเรียนสะสม ${stats.present} วัน`}>
                          {stats.present}
                        </span>
                      </td>

                      {/* Cumulative Sick Total (ป) */}
                      <td className="py-2 px-2 text-center bg-amber-50/20">
                        <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/60" title={`ป่วยสะสม ${stats.sick} วัน`}>
                          {stats.sick}
                        </span>
                      </td>

                      {/* Cumulative Personal Leave Total (ล) */}
                      <td className="py-2 px-2 text-center bg-blue-50/20">
                        <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/60" title={`ลากิจสะสม ${stats.personal} วัน`}>
                          {stats.personal}
                        </span>
                      </td>

                      {/* Cumulative Absent Total (ข) */}
                      <td className="py-2 px-2 text-center bg-rose-50/20">
                        <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200/60" title={`ขาดเรียนสะสม ${stats.absent} วัน`}>
                          {stats.absent}
                        </span>
                      </td>

                      {/* Cumulative Savings */}
                      <td className="py-2 px-3 text-right bg-emerald-50/30">
                        <span className="font-bold text-emerald-800 text-xs sm:text-sm">
                          {(studentCumulativeSavings[student.id] || 0).toLocaleString()} ฿
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SUMMARY STATS BOXES AT THE BOTTOM (Req 2: หน้าฝากเงิน ตรงที่แสดง ฝากเงินวันนี้ , มาเรียน, ลากิจ ที่เป็นกล่องสีเหลี่ม ทั้ง 6 ให้แสดงด้านล่างสุด) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>สรุปยอดประจำวัน: {formatThaiDate(selectedDate)}</span>
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">รวมสถิติประจำวันและสะสมทั้งหมด</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* ฝากเงินวันนี้ */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 flex flex-col justify-between shadow-2xs">
            <span className="text-xs text-amber-800 font-bold">ฝากเงินวันนี้</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-lg sm:text-xl font-black text-amber-700">
                {currentDayStats.depositors} <span className="text-xs font-semibold text-amber-800">คน</span>
              </span>
              <span className="text-xs font-bold text-amber-600">
                {currentDayStats.totalDeposit.toLocaleString()} ฿
              </span>
            </div>
          </div>

          {/* มาเรียน (ม) */}
          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-800 font-bold">มาเรียน (ม)</span>
              <span className="text-[10px] text-emerald-600 font-semibold">สะสม {classroomCumulativeStats.totalPresent}</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-lg sm:text-xl font-black text-emerald-700">
                {currentDayStats.present} <span className="text-xs font-semibold text-emerald-800">คน</span>
              </span>
              <span className="text-xs font-medium text-emerald-600">
                / {students.length} คน
              </span>
            </div>
          </div>

          {/* ป่วย (ป) */}
          <div className="bg-orange-50/80 border border-orange-200/80 rounded-2xl p-3 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-orange-800 font-bold">ป่วย (ป)</span>
              <span className="text-[10px] text-orange-600 font-semibold">สะสม {classroomCumulativeStats.totalSick}</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-lg sm:text-xl font-black text-orange-700">
                {currentDayStats.sick} <span className="text-xs font-semibold text-orange-800">คน</span>
              </span>
              <span className="text-xs font-medium text-orange-600">ครั้ง</span>
            </div>
          </div>

          {/* ลากิจ (ล) */}
          <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-800 font-bold">ลากิจ (ล)</span>
              <span className="text-[10px] text-blue-600 font-semibold">สะสม {classroomCumulativeStats.totalPersonal}</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-lg sm:text-xl font-black text-blue-700">
                {currentDayStats.personal} <span className="text-xs font-semibold text-blue-800">คน</span>
              </span>
              <span className="text-xs font-medium text-blue-600">ครั้ง</span>
            </div>
          </div>

          {/* ขาดเรียน (ข) */}
          <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-3 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-rose-800 font-bold">ขาดเรียน (ข)</span>
              <span className="text-[10px] text-rose-600 font-semibold">สะสม {classroomCumulativeStats.totalAbsent}</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-lg sm:text-xl font-black text-rose-700">
                {currentDayStats.absent} <span className="text-xs font-semibold text-rose-800">คน</span>
              </span>
              <span className="text-xs font-medium text-rose-600">ครั้ง</span>
            </div>
          </div>

          {/* เงินออมทั้งห้อง */}
          <div className="bg-teal-50/80 border border-teal-200/80 rounded-2xl p-3 flex flex-col justify-between shadow-2xs">
            <span className="text-xs text-teal-800 font-bold">เงินออมทั้งห้อง</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-lg sm:text-xl font-black text-teal-700">
                {classroomAllSavings.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-teal-600">บาท</span>
            </div>
          </div>
        </div>
      </div>

      {/* CALENDAR POP-UP MODAL (ตามที่ผู้ใช้สั่ง: เมื่อกดจะแสดงเป็น pop-up เมื่อเลือกวันที่ กด 2 ครั้ง ก็จะปิดหน้าต่างอัตโนมัติ และแสดงบัญชีเงินฝากว่า วันดังกล่าวฝากกี่คน ลากิจ ป่วย ขาดกี่คน พร้อมเพิ่มข้อความ) */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">ปฏิทินบันทึกเงินฝาก & เช็คชื่อ</h3>
                  <p className="text-[11px] text-slate-500">
                    💡 คลิก 1 ครั้งเพื่อดูข้อมูล • ดับเบิ้ลคลิก (กด 2 ครั้ง) เพื่อเลือกวันที่และปิดหน้าต่างทันที
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* Calendar Month Navigation */}
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 cursor-pointer transition-all"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="text-center font-bold text-slate-800 text-xs sm:text-sm">
                  {THAI_MONTHS[calMonth]} พ.ศ. {calYear + 543}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(new Date())}
                    className="px-2 py-1 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-white transition-all cursor-pointer"
                  >
                    เดือนนี้
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 cursor-pointer transition-all"
                    title="เดือนถัดไป"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Weekday Header */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 border-b border-slate-100 pb-1">
                {WEEKDAY_NAMES.map((w, idx) => (
                  <div key={w} className={idx === 0 ? 'text-rose-500' : ''}>
                    {w}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-9" />
                ))}

                {Array.from({ length: daysInCalMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const { dateStr, hasDeposit, hasAbsence, hasNote, hasBlueDot } = getDayDotStatus(dayNum);
                  const isSelected = dateStr === selectedDate;
                  const isToday = dateStr === new Date().toISOString().slice(0, 10);

                  const blueDotTitle = hasBlueDot
                    ? ` • มีการหักเงินถอนอัตโนมัติ`
                    : '';

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => handleCalendarDayClick(dateStr)}
                      onDoubleClick={() => handleCalendarDayDoubleClick(dateStr)}
                      className={`h-9 rounded-xl text-xs font-semibold flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-bold shadow-sm ring-2 ring-emerald-300'
                          : hasBlueDot
                          ? 'bg-blue-50/70 text-blue-900 font-bold border-2 border-blue-400 hover:bg-blue-100/80 shadow-2xs'
                          : isToday
                          ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-300'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-100'
                      }`}
                      title={`${formatThaiDate(dateStr)}${blueDotTitle}${hasDeposit ? ' • มีฝากเงิน' : ''}${hasAbsence ? ' • มีขาด/ป่วย/ลา' : ''}${hasNote ? ' • มีข้อความบันทึก' : ''}`}
                    >
                      <span>{dayNum}</span>

                      {/* Dots: Blue (Withdrawal), Green (Deposit), Red (Sick/Leave/Absent), Amber (Note) */}
                      <div className="flex items-center gap-0.5 absolute bottom-1">
                        {hasBlueDot && (
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isSelected ? 'bg-blue-300 ring-1 ring-white' : 'bg-blue-600 ring-1 ring-blue-300 animate-pulse'
                            }`}
                            title="ถอนเงิน"
                          />
                        )}
                        {hasDeposit && !hasBlueDot && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-white' : 'bg-emerald-500'
                            }`}
                            title="ฝากเงิน"
                          />
                        )}
                        {hasAbsence && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-rose-200' : 'bg-rose-500'
                            }`}
                            title="ขาด/ป่วย/ลา"
                          />
                        )}
                        {hasNote && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-amber-200' : 'bg-amber-500'
                            }`}
                            title="บันทึก"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dots Legend */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-1 ring-blue-300 inline-block animate-pulse" />
                  <span className="font-bold text-blue-800">ถอนเงิน (หักเงินอัตโนมัติ)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span>มีการฝากเงิน</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  <span>ขาด / ป่วย / ลากิจ</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  <span>บันทึก</span>
                </span>
              </div>

              {/* Selected Date Information & Daily Note */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>วันที่เลือก: {formatThaiDate(selectedDate, true)}</span>
                  </div>
                  {pendingWithdrawals.some((p) => p.date === selectedDate) && (
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                      มีรายการหักเงินถอน
                    </span>
                  )}
                </div>

                {/* If there are withdrawal deductions for this selected day, show brief summary */}
                {pendingWithdrawals.filter((p) => p.date === selectedDate).length > 0 && (
                  <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs space-y-1">
                    <p className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                      <span>บันทึกการหักเงินถอนในวันนี้:</span>
                    </p>
                    <div className="space-y-0.5 text-[11px] text-blue-800 pl-2">
                      {pendingWithdrawals
                        .filter((p) => p.date === selectedDate)
                        .map((p) => (
                          <div key={p.id}>
                            • {p.studentName}: หัก {p.amount.toLocaleString()} บาท ({p.reason})
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Editable Note inside modal */}
                <div className="pt-0.5">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    หมายเหตุประจำวัน:
                  </label>
                  <input
                    type="text"
                    value={dayNote}
                    onChange={(e) => handleNoteChange(e.target.value)}
                    placeholder="เช่น วันนี้มีกิจกรรมทัศนศึกษา..."
                    className="w-full px-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:border-amber-500 outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
              <span className="text-[11px] text-slate-500">
                กด 2 ครั้งที่วันที่เพื่อปิดหน้าต่าง
              </span>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>เลือกวันที่นี้ & ปิดหน้าต่าง</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAWAL MODAL */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-800 text-sm">ทำรายการถอนเงินออมนักเรียน</h3>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmWithdraw} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เลือกนักเรียนที่ต้องการถอนเงิน <span className="text-rose-500">*</span>
                </label>
                <select
                  value={withdrawStudentId}
                  onChange={(e) => setWithdrawStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-amber-500 text-xs outline-hidden"
                  required
                >
                  <option value="">-- กรุณาเลือกนักเรียน --</option>
                  {students.map((s) => {
                    const balance = studentCumulativeSavings[s.id] ?? s.currentSavings;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.prefix}{s.firstName} {s.lastName} (คงเหลือ: {balance.toLocaleString()} บาท)
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedStudentForWithdraw && (
                <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                  <span className="text-amber-900">ยอดเงินออมปัจจุบัน:</span>
                  <span className="font-bold text-amber-800 text-sm">
                    {(studentCumulativeSavings[selectedStudentForWithdraw.id] ?? selectedStudentForWithdraw.currentSavings).toLocaleString()} บาท
                  </span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  จำนวนเงินที่ต้องการถอน (บาท) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedStudentForWithdraw ? (studentCumulativeSavings[selectedStudentForWithdraw.id] ?? selectedStudentForWithdraw.currentSavings) : 999999}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  placeholder="เช่น 100"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-amber-500 text-sm font-bold text-rose-700 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เหตุผลการถอนเงิน <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  placeholder="เช่น นำไปซื้อสมุดวาดภาพ, ค่าอุปกรณ์การเรียน..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-amber-500 text-xs outline-hidden"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium text-xs shadow-xs cursor-pointer"
                >
                  ยืนยันการตัดยอดเงิน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAWAL HISTORY LOG MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-800 text-sm">ประวัติการถอนเงินออมนักเรียน (History Log)</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 text-xs flex-1">
              {withdrawalLogs.length === 0 ? (
                <p className="text-center py-8 text-slate-400">ยังไม่มีประวัติการถอนเงินในห้องเรียน</p>
              ) : (
                withdrawalLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="font-bold text-slate-800 text-sm">{log.studentName}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {formatThaiDate(log.date, true)} เวลา {log.time} น.
                      </div>
                      <div className="mt-2 p-2 bg-white rounded-lg border border-amber-200/80">
                        <span className="text-[11px] text-amber-800 font-semibold block mb-0.5">
                          เหตุผลการถอนเงิน:
                        </span>
                        <span className="text-sm font-bold text-slate-900 leading-snug">
                          {log.reason}
                        </span>
                      </div>
                    </div>

                    <span className="font-black text-rose-600 text-sm shrink-0 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                      -{log.amount.toLocaleString()} ฿
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRINT / DOWNLOAD PDF REPORT MODAL */}
      {(() => {
        const line1 = 'รายงานออมทรัพย์และสถิติมาเรียน';
        const classroomText = (profile.classroomName && !profile.classroomName.includes('6/1'))
          ? profile.classroomName
          : 'ชั้นประถมศึกษาปีที่ 5';
        const yearText = profile.academicYear || '2569';
        const line2 = `${classroomText} ภาคเรียนที่ 1 ปีการศึกษา ${yearText}`;

        return (
          <PrintReportModal
            isOpen={showPrintModal}
            onClose={() => setShowPrintModal(false)}
            title={line1}
            subtitle={line2}
            profile={{ ...profile, classroomName: classroomText }}
            hidePrintDate={true}
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
                  <th className="border border-slate-400 p-2 text-center w-20">มารวม</th>
                  <th className="border border-slate-400 p-2 text-center w-20">ป่วยรวม</th>
                  <th className="border border-slate-400 p-2 text-center w-20">ลารวม</th>
                  <th className="border border-slate-400 p-2 text-center w-20">ขาดรวม</th>
                  <th className="border border-slate-400 p-2 text-right w-28">ยอดรวม</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => {
                  const stats = studentCumulativeStats[s.id] || { present: 0, sick: 0, personal: 0, absent: 0 };
                  const totalSavings = studentCumulativeSavings[s.id] || 0;

                  return (
                    <tr key={s.id} className="border-b border-slate-300">
                      <td className="border border-slate-300 p-2 text-center font-medium">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-medium">
                        {s.prefix}{s.firstName} {s.lastName}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-semibold text-emerald-800">
                        {stats.present}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-semibold text-amber-800">
                        {stats.sick}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-semibold text-blue-800">
                        {stats.personal}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-semibold text-rose-800">
                        {stats.absent}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-bold text-emerald-800">
                        {totalSavings.toLocaleString()} ฿
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <td colSpan={2} className="border border-slate-400 p-2.5 text-right">
                    รวมทั้งหมด ({students.length} คน):
                  </td>
                  <td className="border border-slate-400 p-2.5 text-center text-emerald-900 font-bold">
                    {classroomCumulativeStats.totalPresent}
                  </td>
                  <td className="border border-slate-400 p-2.5 text-center text-amber-900 font-bold">
                    {classroomCumulativeStats.totalSick}
                  </td>
                  <td className="border border-slate-400 p-2.5 text-center text-blue-900 font-bold">
                    {classroomCumulativeStats.totalPersonal}
                  </td>
                  <td className="border border-slate-400 p-2.5 text-center text-rose-900 font-bold">
                    {classroomCumulativeStats.totalAbsent}
                  </td>
                  <td className="border border-slate-400 p-2.5 text-right font-black text-emerald-900">
                    {classroomAllSavings.toLocaleString()} ฿
                  </td>
                </tr>
              </tfoot>
            </table>
          </PrintReportModal>
        );
      })()}

      {/* DELETE / RESET DATA CONFIRMATION MODAL (Req: เลือกว่าจะลบ มา, ขาด, ป่วย, ลา, เงินออม และ All สำหรับลบทั้งหมด) */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-rose-100 max-w-lg w-full animate-bounce-short my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    เลือกลบข้อมูล
                  </h3>
                  <p className="text-xs text-rose-600 font-medium mt-0.5">
                    เลือกว่าจะลบ มา, ขาด, ป่วย, ลา, เงินออม หรือ All
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetPassword('');
                  setResetError('');
                }}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDeleteData} className="space-y-4">
              {/* Scope Selector: เฉพาะวันที่เลือก VS ทุกวันในระบบ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. เลือกขอบเขตที่ต้องการลบ:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteScope('day')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      deleteScope === 'day'
                        ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-slate-900">เฉพาะวันที่เลือก</span>
                      {deleteScope === 'day' && <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[3]" />}
                    </div>
                    <div className="text-[10.5px] text-slate-500 truncate">{formatThaiDate(selectedDate)}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteScope('all')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      deleteScope === 'all'
                        ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-slate-900">ทุกวันในระบบ</span>
                      {deleteScope === 'all' && <Check className="w-3.5 h-3.5 text-rose-600 stroke-[3]" />}
                    </div>
                    <div className="text-[10.5px] text-slate-500">รีเซ็ตเริ่มต้นใหม่ทั้งหมด</div>
                  </button>
                </div>
              </div>

              {/* Option Selector Grid: มา, ขาด, ป่วย, ลา, เงินออม, All */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  2. เลือกรายการที่ต้องการลบ ({deleteScope === 'day' ? `เฉพาะวันที่ ${formatThaiDate(selectedDate)}` : 'ทุกวันในระบบ'}):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: 'all' as DeleteTarget,
                      label: 'All (ลบทั้งหมด)',
                      sub: 'มา, ขาด, ป่วย, ลา, เงินออม',
                      badge: 'All',
                      badgeClass: 'px-2 py-0.5 bg-rose-100 text-rose-700 border-rose-200',
                      activeBorder: 'border-rose-500',
                      activeBg: 'bg-rose-50/70',
                      activeRing: 'ring-rose-500/20',
                      checkBg: 'bg-rose-600',
                    },
                    {
                      id: 'savings' as DeleteTarget,
                      label: 'เงินออม',
                      sub: 'ลบยอดเงินฝากเป็น 0 ฿',
                      badge: '฿',
                      badgeClass: 'w-6 h-6 bg-amber-100 text-amber-700 border-amber-200',
                      activeBorder: 'border-amber-500',
                      activeBg: 'bg-amber-50/70',
                      activeRing: 'ring-amber-500/20',
                      checkBg: 'bg-amber-600',
                    },
                    {
                      id: 'present' as DeleteTarget,
                      label: 'มา',
                      sub: 'ลบสถานะมาเรียน (ม)',
                      badge: 'ม',
                      badgeClass: 'w-6 h-6 bg-emerald-100 text-emerald-700 border-emerald-200',
                      activeBorder: 'border-emerald-500',
                      activeBg: 'bg-emerald-50/70',
                      activeRing: 'ring-emerald-500/20',
                      checkBg: 'bg-emerald-600',
                    },
                    {
                      id: 'absent' as DeleteTarget,
                      label: 'ขาด',
                      sub: 'ลบสถานะขาดเรียน (ข)',
                      badge: 'ข',
                      badgeClass: 'w-6 h-6 bg-rose-100 text-rose-700 border-rose-200',
                      activeBorder: 'border-rose-500',
                      activeBg: 'bg-rose-50/70',
                      activeRing: 'ring-rose-500/20',
                      checkBg: 'bg-rose-600',
                    },
                    {
                      id: 'sick' as DeleteTarget,
                      label: 'ป่วย',
                      sub: 'ลบสถานะลาป่วย (ป)',
                      badge: 'ป',
                      badgeClass: 'w-6 h-6 bg-amber-100 text-amber-700 border-amber-200',
                      activeBorder: 'border-amber-500',
                      activeBg: 'bg-amber-50/70',
                      activeRing: 'ring-amber-500/20',
                      checkBg: 'bg-amber-600',
                    },
                    {
                      id: 'personal' as DeleteTarget,
                      label: 'ลา',
                      sub: 'ลบสถานะลากิจ (ล)',
                      badge: 'ล',
                      badgeClass: 'w-6 h-6 bg-blue-100 text-blue-700 border-blue-200',
                      activeBorder: 'border-blue-500',
                      activeBg: 'bg-blue-50/70',
                      activeRing: 'ring-blue-500/20',
                      checkBg: 'bg-blue-600',
                    },
                  ].map((opt) => {
                    const isSelected = deleteTarget === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDeleteTarget(opt.id)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                          isSelected
                            ? `${opt.activeBorder} ${opt.activeBg} ring-2 ${opt.activeRing}`
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span
                            className={`inline-flex items-center justify-center font-bold rounded-lg border text-xs ${opt.badgeClass}`}
                          >
                            {opt.badge}
                          </span>
                          {isSelected && (
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-white ${opt.checkBg}`}
                            >
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                          <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                            {opt.sub}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Warning / Information Box */}
              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs text-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    สรุปรายการที่จะลบ ({deleteScope === 'day' ? `เฉพาะวันที่ ${formatThaiDate(selectedDate)}` : 'ทุกวันในระบบ เพื่อเริ่มใหม่'}):
                  </span>
                </div>
                <p className="leading-relaxed text-slate-600 text-[11px]">
                  {deleteScope === 'day'
                    ? deleteTarget === 'all'
                      ? `รีเซ็ตข้อมูลเช็คชื่อ (มา, ขาด, ป่วย, ลา) และเงินฝากทั้งหมดของวันที่ ${formatThaiDate(selectedDate)}`
                      : deleteTarget === 'savings'
                      ? `รีเซ็ตยอดเงินฝากของวันที่ ${formatThaiDate(selectedDate)} เป็น 0 บาท`
                      : deleteTarget === 'absent'
                      ? `ลบสถานะ "ขาดเรียน (ข)" ของวันที่ ${formatThaiDate(selectedDate)}`
                      : deleteTarget === 'sick'
                      ? `ลบสถานะ "ป่วย (ป)" ของวันที่ ${formatThaiDate(selectedDate)}`
                      : deleteTarget === 'personal'
                      ? `ลบสถานะ "ลา (ล)" ของวันที่ ${formatThaiDate(selectedDate)}`
                      : `ลบสถานะ "มาเรียน (ม)" ของวันที่ ${formatThaiDate(selectedDate)}`
                    : deleteTarget === 'all'
                    ? 'รีเซ็ตข้อมูลเช็คชื่อและยอดเงินฝากทั้งหมดทุกวันในระบบให้เป็น 0 บาทเพื่อเริ่มใหม่'
                    : deleteTarget === 'savings'
                    ? 'รีเซ็ตยอดเงินฝากทั้งหมดทุกวันในระบบเป็น 0 บาท'
                    : deleteTarget === 'absent'
                    ? 'ลบสถานะ "ขาดเรียน (ข)" ทุกวันในระบบ'
                    : deleteTarget === 'sick'
                    ? 'ลบสถานะ "ป่วย (ป)" ทุกวันในระบบ'
                    : deleteTarget === 'personal'
                    ? 'ลบสถานะ "ลา (ล)" ทุกวันในระบบ'
                    : 'ลบสถานะ "มาเรียน (ม)" ทุกวันในระบบเพื่อเริ่มเช็คชื่อใหม่'}
                </p>
              </div>

              {/* Password confirmation */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>กรุณากรอกรหัสผ่าน (Password) เพื่อยืนยัน</span>
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={resetPassword}
                    onChange={(e) => {
                      setResetPassword(e.target.value);
                      if (resetError) setResetError('');
                    }}
                    placeholder="กรอก Password เช่น 456789 หรือ 1234"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all outline-hidden pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {resetError && (
                  <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                    <X className="w-3.5 h-3.5" />
                    <span>{resetError}</span>
                  </p>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetPassword('');
                    setResetError('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {deleteTarget === 'all'
                      ? `ยืนยันลบ: All ทั้งหมด (${deleteScope === 'day' ? 'เฉพาะวันนี้' : 'ทุกวันในระบบ'})`
                      : deleteTarget === 'savings'
                      ? `ยืนยันลบ: เงินออม (${deleteScope === 'day' ? 'เฉพาะวันนี้' : 'ทุกวันในระบบ'})`
                      : deleteTarget === 'present'
                      ? `ยืนยันลบ: มา (${deleteScope === 'day' ? 'เฉพาะวันนี้' : 'ทุกวันในระบบ'})`
                      : deleteTarget === 'absent'
                      ? `ยืนยันลบ: ขาด (${deleteScope === 'day' ? 'เฉพาะวันนี้' : 'ทุกวันในระบบ'})`
                      : deleteTarget === 'sick'
                      ? `ยืนยันลบ: ป่วย (${deleteScope === 'day' ? 'เฉพาะวันนี้' : 'ทุกวันในระบบ'})`
                      : `ยืนยันลบ: ลา (${deleteScope === 'day' ? 'เฉพาะวันนี้' : 'ทุกวันในระบบ'})`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Note Fullscreen Pop-up Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div
            className={`bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 transition-all duration-300 ${
              isNoteFullscreen
                ? 'w-full h-full rounded-none fixed inset-0'
                : 'w-full max-w-3xl max-h-[90vh]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-amber-50/50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span>หมายเหตุประจำวัน / เหตุผลที่ไม่ฝากเงิน</span>
                  </h3>
                  <p className="text-xs text-amber-800 font-medium">
                    ประจำวันที่ {formatThaiDate(selectedDate, true)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsNoteFullscreen(!isNoteFullscreen)}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                  title={isNoteFullscreen ? 'ย่อกลับขนาดปกติ' : 'ขยายเต็มหน้าจอ'}
                >
                  {isNoteFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 flex flex-col gap-4 overflow-y-auto">
              {/* Quick Template Presets */}
              <div>
                <span className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>เหตุผลที่พบบ่อย (คลิกเพื่อเลือกข้อความอย่างรวดเร็ว):</span>
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {[
                    'วันนี้มีกิจกรรมทัศนศึกษา ไม่ได้เก็บเงินออม',
                    'วันหยุดนักขัตฤกษ์ / วันหยุดพิเศษของสถานศึกษา',
                    'วันสอบปลายภาค / สอบกลางภาคเรียน',
                    'กิจกรรมวันสำคัญทางศาสนา / พิธีไหว้ครู / วันแม่',
                    'กิจกรรมการแข่งขันกีฬาสี / กิจกรรมลูกเสือ-เนตรนารี',
                    'ไม่ได้เก็บเงินออมเนื่องจากเตรียมปิดภาคเรียน',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        const newText = dayNote ? `${dayNote}\n${preset}` : preset;
                        handleNoteChange(newText);
                      }}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-50/80 hover:bg-amber-100 text-amber-900 border border-amber-200/80 transition-all font-medium cursor-pointer text-left hover:scale-[1.01]"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Big Textarea */}
              <div className="flex-1 flex flex-col min-h-[220px]">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>รายละเอียดหมายเหตุ (พิมพ์ได้หลายบรรทัดอย่างละเอียด):</span>
                  </label>
                  <span className="text-xs text-slate-400">
                    {dayNote.length} ตัวอักษร
                  </span>
                </div>
                <textarea
                  value={dayNote}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  placeholder="พิมพ์รายละเอียดหมายเหตุประจำวัน เช่น เหตุผลที่ไม่เก็บเงินออมในวันนี้, รายละเอียดกิจกรรมพิเศษ, หรือข้อความบันทึกช่วยจำสำหรับครู..."
                  rows={isNoteFullscreen ? 16 : 8}
                  className="w-full flex-1 p-4 bg-slate-50/70 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-hidden font-normal leading-relaxed resize-y transition-all"
                  autoFocus
                />
              </div>

              {/* Status Note */}
              <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/60">
                <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ระบบบันทึกข้อมูลอัตโนมัติเรียบร้อยแล้ว</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  กดปุ่ม ESC หรือคลิกบันทึกและปิดเมื่อเสร็จสิ้น
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <div className="flex items-center gap-2">
                {dayNote && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(dayNote);
                        setCopiedNote(true);
                        setTimeout(() => setCopiedNote(false), 2000);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200"
                    >
                      {copiedNote ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>คัดลอกข้อความ</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNoteChange('')}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ล้างข้อความ</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>บันทึกและปิด</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal คัดลอกรายชื่อนักเรียนทั้งหมด จากหน้าข้อมูลนักเรียน (เลือกชั้นได้) */}
      <CopyAllStudentsModal
        isOpen={showCopyAllStudentsModal}
        onClose={() => setShowCopyAllStudentsModal(false)}
        onApplyStudents={handleApplyStudentsBank}
        defaultGrade={customCopiedGrade && customCopiedGrade !== 'ทุกชั้น' ? (customCopiedGrade as any) : 'all'}
        title="คัดลอกรายชื่อนักเรียน (หน้าเงินฝาก/เช็คชื่อ)"
        subtitle="เลือกชั้นเรียนเพื่อคัดลอกรายชื่อทั้งหมด"
      />

      {/* Mobile / Fullscreen Student Pop-up Modal for Bank & Attendance (Req: เมื่อกดชื่อ จะแสดงpop-up หน้าเต็มพอดี และมีกรอกใส่เงินฝาก หรือ เลือก ม,ป,ล,ข ลงเสร็จกดบันทึก) */}
      {selectedStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full h-full md:h-auto md:max-w-lg md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-6 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/20 border-2 border-white/50 shadow-inner shrink-0">
                  <ImageWithFallback
                    src={selectedStudentModal.photoUrl}
                    alt={selectedStudentModal.firstName}
                    isAvatar={true}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] bg-white/25 px-2 py-0.5 rounded-full font-bold">
                      เลขที่ {students.findIndex((s) => s.id === selectedStudentModal.id) + 1}
                    </span>
                    <span className="text-[11px] text-emerald-100 font-medium">
                      {selectedStudentModal.gradeLevel || profile.classroomName || 'ป.6/1'}
                    </span>
                    <span className="text-[10px] text-emerald-200">
                      (คนที่ {students.findIndex((s) => s.id === selectedStudentModal.id) + 1}/{students.length})
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white truncate mt-0.5">
                    {selectedStudentModal.prefix}{selectedStudentModal.firstName} {selectedStudentModal.lastName}
                  </h3>
                  {selectedStudentModal.nickname && (
                    <p className="text-xs text-emerald-100 font-normal">
                      ชื่อเล่น: {selectedStudentModal.nickname}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentModal(null)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
                aria-label="ปิดหน้าต่าง"
                title="ปิดหน้าต่าง"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5 flex-1 bg-slate-50/50">
              {/* Date Information Card */}
              <div className="flex items-center justify-between bg-emerald-50/80 px-3.5 py-2.5 rounded-xl border border-emerald-200/80 text-xs text-emerald-900 shadow-2xs">
                <span className="font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  <span>วันที่บันทึก:</span>
                </span>
                <span className="font-bold text-emerald-800">{formatThaiDate(selectedDate)}</span>
              </div>

              {/* 1. Attendance Status Selection (เลือก ม, ป, ล, ข) */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                <label className="block text-xs font-bold text-slate-700 mb-2.5">
                  1. เลือกสถานะการมาเรียน (ม, ป, ล, ข):
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    {
                      status: 'present',
                      key: 'ม',
                      label: 'มาเรียน',
                      badge: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400',
                      inactive: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300',
                    },
                    {
                      status: 'sick',
                      key: 'ป',
                      label: 'ป่วย',
                      badge: 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-300',
                      inactive: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300',
                    },
                    {
                      status: 'personal',
                      key: 'ล',
                      label: 'ลากิจ',
                      badge: 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-300',
                      inactive: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300',
                    },
                    {
                      status: 'absent',
                      key: 'ข',
                      label: 'ขาดเรียน',
                      badge: 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-300',
                      inactive: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50 hover:border-rose-300',
                    },
                  ].map((item) => {
                    const isSelected = modalAttendance === item.status;
                    return (
                      <button
                        key={item.status}
                        type="button"
                        onClick={() => {
                          if (modalAttendance === item.status) {
                            setModalAttendance(null);
                          } else {
                            setModalAttendance(item.status as AttendanceStatus);
                            if (item.status !== 'present') {
                              setModalDeposit(0);
                            }
                          }
                        }}
                        className={`p-3 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer border ${
                          isSelected ? item.badge : item.inactive
                        }`}
                        title={isSelected ? `คลิกเพื่อลบ/ยกเลิกสถานะ ${item.label}` : item.label}
                      >
                        <span className="text-2xl font-black">{item.key}</span>
                        <span className={`text-[11px] font-semibold mt-1 ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">
                    สถานะปัจจุบัน:{' '}
                    <strong className="text-slate-800">
                      {modalAttendance === 'present'
                        ? 'มาเรียน (ม)'
                        : modalAttendance === 'sick'
                        ? 'ป่วย (ป)'
                        : modalAttendance === 'personal'
                        ? 'ลากิจ (ล)'
                        : modalAttendance === 'absent'
                        ? 'ขาดเรียน (ข)'
                        : 'ยังไม่มีสถานะ (ลบ/ล้างแล้ว)'}
                    </strong>
                  </span>
                  {modalAttendance && (
                    <button
                      type="button"
                      onClick={() => setModalAttendance(null)}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-0.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      ลบ/ล้างสถานะ
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Deposit Amount Input (กรอกใส่เงินฝาก) */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700">
                    2. กรอกจำนวนเงินฝากวันนี้ (บาท):
                  </label>
                  <span className="text-xs text-slate-500">
                    ยอดสะสมเดิม: <strong className="text-emerald-700 font-bold">฿{(selectedStudentModal.currentSavings || 0).toLocaleString()}</strong>
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={modalDeposit === 0 ? '' : modalDeposit}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      setModalDeposit(val);
                    }}
                    placeholder="0"
                    disabled={modalAttendance !== 'present'}
                    className="w-full text-center text-3xl font-black text-slate-800 py-3 px-4 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 bg-white outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    บาท
                  </span>
                </div>

                {/* Quick amount chips */}
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-3 flex-wrap">
                  {[0, 5, 10, 20, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      disabled={modalAttendance !== 'present'}
                      onClick={() => setModalDeposit(amt)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        modalDeposit === amt
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {amt === 0 ? '0 บ.' : `+${amt} บ.`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Cumulative Attendance Overview */}
              <div className="bg-slate-100/70 p-3 rounded-xl border border-slate-200 flex items-center justify-around text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">มาเรียนสะสม</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {studentCumulativeStats[selectedStudentModal.id]?.present || 0} วัน
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-300" />
                <div>
                  <span className="text-[10px] text-slate-500 block">ป่วย</span>
                  <span className="font-bold text-amber-600 text-sm">
                    {studentCumulativeStats[selectedStudentModal.id]?.sick || 0} วัน
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-300" />
                <div>
                  <span className="text-[10px] text-slate-500 block">ลากิจ</span>
                  <span className="font-bold text-blue-600 text-sm">
                    {studentCumulativeStats[selectedStudentModal.id]?.personal || 0} วัน
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-300" />
                <div>
                  <span className="text-[10px] text-slate-500 block">ขาดเรียน</span>
                  <span className="font-bold text-rose-600 text-sm">
                    {studentCumulativeStats[selectedStudentModal.id]?.absent || 0} วัน
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Footer Actions (ลงเสร็จกดบันทึก, หรือเปลี่ยนคนได้ทันที) */}
            <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrevStudentInModal}
                disabled={students.findIndex((s) => s.id === selectedStudentModal.id) === 0}
                className="px-3 sm:px-4 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="นักเรียนคนก่อนหน้า"
              >
                ◀ ก่อนหน้า
              </button>

              <button
                type="button"
                onClick={handleSaveStudentModal}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>บันทึกข้อมูล</span>
              </button>

              <button
                type="button"
                onClick={handleNextStudentInModal}
                className="px-3 sm:px-4 py-3 text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 rounded-2xl font-bold text-xs transition-colors cursor-pointer"
                title="บันทึกและไปคนถัดไป"
              >
                ถัดไป ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
