import React, { useState, useEffect, useMemo } from 'react';
import { Student, TeacherProfile, AttendanceStatus, DayAttendanceAndBank, WithdrawalLog, WithdrawalPendingDay } from '../types';
import { dataService } from '../services/dataService';
import { formatThaiDate } from '../utils/helpers';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { PrintReportModal } from '../components/PrintReportModal';
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
  AlertTriangle
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
  const [students, setStudents] = useState<Student[]>(dataService.getStudents());
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

  // Reset All Savings Modal State (Req 4: ลบเงินฝากของนักเรียนทั้งหมด เพื่อเริ่มฝากใหม่ ยืนยันด้วย Password)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Load data for the selected date (Req 7: ให้ขึ้นสถานะมาเรียน ม อัตโนมัติเองเลย)
  const loadDayData = (date: string) => {
    const dayData = dataService.getDayAttendanceAndBank(date);
    const initialAtt: Record<string, AttendanceStatus> = {};
    const initialDep: Record<string, number> = {};

    const currentStudents = dataService.getStudents();
    let hasUnsetAttendance = false;
    currentStudents.forEach((s) => {
      if (!dayData.attendance || !dayData.attendance[s.id]) {
        initialAtt[s.id] = 'present';
        hasUnsetAttendance = true;
      } else {
        initialAtt[s.id] = dayData.attendance[s.id];
      }
      initialDep[s.id] = dayData.deposits && dayData.deposits[s.id] !== undefined ? dayData.deposits[s.id] : 0;
    });

    setAttendanceMap(initialAtt);
    setDepositsMap(initialDep);
    setDayNote(dayData.note || '');

    // Auto-mark present silently if first time opening day
    if (hasUnsetAttendance) {
      dataService.saveDayAttendanceAndBank(date, initialAtt, initialDep, dayData.note || '', true);
    }
  };

  useEffect(() => {
    loadDayData(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setStudents(dataService.getStudents());
      setProfile(dataService.getProfile());
      setWithdrawalLogs(dataService.getWithdrawalLogs());
      setAllHistoryRecords(dataService.getAllAttendanceAndBank());
      setPendingWithdrawals(dataService.getWithdrawalPendingDays());
    });
    return unsub;
  }, []);

  // Handle Note input change (auto-saves silently)
  const handleNoteChange = (text: string) => {
    setDayNote(text);
    dataService.saveDayAttendanceAndBank(selectedDate, attendanceMap, depositsMap, text, true);
    setAllHistoryRecords(dataService.getAllAttendanceAndBank());
  };

  // Attendance status handler (ม, ป, ล, ข)
  // When status is sick (ป), personal (ล), or absent (ข), deposit for today is reset to 0
  const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
    const updatedAtt = { ...attendanceMap, [studentId]: status };
    setAttendanceMap(updatedAtt);

    let updatedDep = { ...depositsMap };
    if (status === 'sick' || status === 'personal' || status === 'absent') {
      updatedDep = { ...updatedDep, [studentId]: 0 };
      setDepositsMap(updatedDep);
    }
    dataService.saveDayAttendanceAndBank(selectedDate, updatedAtt, updatedDep, dayNote, true);
    setAllHistoryRecords(dataService.getAllAttendanceAndBank());
  };

  const handleDepositChange = (studentId: string, amount: number) => {
    const updated = { ...depositsMap, [studentId]: Math.max(0, amount) };
    setDepositsMap(updated);
    dataService.saveDayAttendanceAndBank(selectedDate, attendanceMap, updated, dayNote, true);
    setAllHistoryRecords(dataService.getAllAttendanceAndBank());
  };

  // Confirm Reset All Savings (Req 4)
  const handleConfirmResetSavings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassword) {
      setResetError('กรุณากรอก Password เข้าสู่ระบบ');
      return;
    }
    const res = dataService.resetAllStudentsSavings(resetPassword);
    if (res.success) {
      setShowResetModal(false);
      setResetPassword('');
      setResetError('');
      loadDayData(selectedDate);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } else {
      setResetError(res.message);
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
      // Auto open calendar modal so teacher sees the blue dots immediately
      setShowCalendarModal(true);
    }
  };

  // Cumulative student attendance statistics across all saved dates (ม, ป, ล, ข)
  const studentCumulativeStats = useMemo(() => {
    const stats: Record<string, { present: number; sick: number; personal: number; absent: number }> = {};
    students.forEach((s) => {
      stats[s.id] = { present: 0, sick: 0, personal: 0, absent: 0 };
    });

    const allDates = new Set(Object.keys(allHistoryRecords));
    allDates.add(selectedDate);

    allDates.forEach((dateKey) => {
      const att = dateKey === selectedDate ? attendanceMap : (allHistoryRecords[dateKey]?.attendance || {});
      Object.entries(att).forEach(([studentId, st]) => {
        if (stats[studentId]) {
          if (st === 'present') stats[studentId].present += 1;
          else if (st === 'sick') stats[studentId].sick += 1;
          else if (st === 'personal') stats[studentId].personal += 1;
          else if (st === 'absent') stats[studentId].absent += 1;
        }
      });
    });

    return stats;
  }, [students, allHistoryRecords, selectedDate, attendanceMap]);

  // Real-time cumulative savings for each student across all recorded dates
  const studentCumulativeSavings = useMemo(() => {
    const savings: Record<string, number> = {};
    students.forEach((s) => {
      savings[s.id] = 0;
    });

    const allDates = new Set(Object.keys(allHistoryRecords));
    allDates.add(selectedDate);

    allDates.forEach((dateKey) => {
      const dayDeposits = dateKey === selectedDate ? depositsMap : (allHistoryRecords[dateKey]?.deposits || {});
      Object.entries(dayDeposits).forEach(([sId, amt]) => {
        const val = Number(amt) || 0;
        if (val > 0) {
          savings[sId] = (savings[sId] || 0) + val;
        }
      });
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

    // Check if date has pending blue dot withdrawal
    const pendingItems = pendingWithdrawals.filter((p) => p.date === dateStr && p.status === 'pending');
    const hasBlueDot = pendingItems.length > 0;

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

    return { dateStr, hasDeposit, hasAbsence, hasNote, hasBlueDot, pendingItems };
  };

  // Click on date in calendar pop-up
  // Requirement 4: เมื่อได้กดวันที่ ที่มีจุดสีน้ำเงิน เงินฝากนั้นจะเป็น 0 อัตโนมัติ พร้อมแจ้งเหตุผลตรงที่หมายเหตุประจำวัน ว่าถอนเงิน พร้อมเหตุผล
  const handleCalendarDayClick = (dateStr: string) => {
    const pendingItems = pendingWithdrawals.filter((p) => p.date === dateStr && p.status === 'pending');
    
    if (pendingItems.length > 0) {
      // Execute clearance: deposit -> 0, note -> withdrawal with reason
      dataService.clearWithdrawalDate(dateStr);
      setPendingWithdrawals(dataService.getWithdrawalPendingDays());
      setAllHistoryRecords(dataService.getAllAttendanceAndBank());
      setSelectedDate(dateStr);
      loadDayData(dateStr);
    } else {
      if (dateStr === selectedDate) {
        // Second click on the same date -> Close popup as requested!
        setShowCalendarModal(false);
      } else {
        setSelectedDate(dateStr);
      }
    }
  };

  const handleCalendarDayDoubleClick = (dateStr: string) => {
    const pendingItems = pendingWithdrawals.filter((p) => p.date === dateStr && p.status === 'pending');
    if (pendingItems.length > 0) {
      dataService.clearWithdrawalDate(dateStr);
      setPendingWithdrawals(dataService.getWithdrawalPendingDays());
      setAllHistoryRecords(dataService.getAllAttendanceAndBank());
      loadDayData(dateStr);
    }
    setSelectedDate(dateStr);
    setShowCalendarModal(false);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">
                เงินฝาก & เช็คชื่อ (Bank & Attendance)
              </h2>
            </div>
            <p className="text-xs text-gray-500">
              บันทึกการมาเรียนและการออมเงิน พร้อมสรุปรายวันและประวัติการถอน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Req 4: Button to delete all students' savings to start fresh with password */}
          <button
            type="button"
            onClick={() => {
              setResetPassword('');
              setResetError('');
              setShowResetModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="ลบเงินฝากของนักเรียนทั้งหมด เพื่อเริ่มฝากใหม่ (ต้องยืนยันด้วย Password)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>ลบเงินฝากทั้งหมด</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>ประวัติการถอน ({withdrawalLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWithdrawModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>ถอนเงิน</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="ดาวน์โหลดรายงานหรือบันทึกเป็นไฟล์ PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ดาวน์โหลดไฟล์ PDF</span>
          </button>
        </div>
      </div>

      {/* COMPACT CALENDAR TRIGGER & DATE SELECTION BAR */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Compact Date Selector Button with pop-up trigger */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowCalendarModal(true)}
              className="flex items-center gap-2.5 px-3.5 py-2 bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-300/80 rounded-xl transition-all shadow-2xs text-left group cursor-pointer"
              title="คลิกเพื่อเปิดปฏิทินบันทึกเงินฝาก & เช็คชื่อ"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-emerald-800 font-medium block leading-tight">
                  วันที่เลือกบันทึก (คลิกเพื่อเปิดปฏิทิน)
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-800">
                  {formatThaiDate(selectedDate, true)}
                </span>
              </div>
              <span className="text-[11px] bg-white text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold ml-1">
                ปฏิทิน ▾
              </span>
            </button>

            {/* Prev / Today / Next Quick Buttons (Req 8: เลื่อนไปวันอื่นเป็นการเลื่อนเปล่าๆ ไม่มีข้อความ) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={handlePrevDay}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg text-xs transition-all cursor-pointer"
                title="วันก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-2 py-1 text-slate-700 hover:text-emerald-700 font-bold text-xs hover:bg-white rounded-lg transition-all cursor-pointer"
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={handleNextDay}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg text-xs transition-all cursor-pointer"
                title="วันถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: Auto-save & Status indicator (Req 6 & 7: เอาออกคำว่า บันทึกข้อมูล และ เช็คมาทุกคน จัดให้เรียบร้อย) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>บันทึกข้อมูลอัตโนมัติ</span>
            </span>
          </div>
        </div>

        {/* Daily Note Input */}
        <div className="flex items-center gap-2.5 bg-amber-50/60 border border-amber-200/80 rounded-xl px-3.5 py-2 transition-all focus-within:border-amber-400 focus-within:bg-amber-50">
          <MessageSquare className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[11px] font-bold text-amber-900 shrink-0 whitespace-nowrap">
              หมายเหตุประจำวัน / เหตุผลที่ไม่ฝากเงิน:
            </span>
            <input
              type="text"
              value={dayNote}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="เช่น วันนี้มีกิจกรรมทัศนศึกษา ไม่ได้เก็บเงินออม, วันหยุดโรงเรียน, วันสอบปลายภาค..."
              className="w-full bg-transparent text-xs text-slate-800 placeholder:text-amber-700/40 outline-hidden font-medium"
            />
          </div>
          {dayNote && (
            <span className="text-[10px] bg-amber-200/70 text-amber-800 px-2 py-0.5 rounded-md font-semibold shrink-0">
              บันทึกแล้ว
            </span>
          )}
        </div>
      </div>

      {/* Main Attendance & Deposit Table (จัดหน้าให้เรียบร้อยสบายตา) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            <span>บัญชีเช็คชื่อและการฝากเงิน: {formatThaiDate(selectedDate)}</span>
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">นักเรียนทั้งหมด {students.length} คน</span>
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              title="ดาวน์โหลดรายงานเป็นไฟล์ PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลด PDF</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-2.5 px-2.5 w-12 text-center">ลำดับ</th>
                <th className="py-2.5 px-3 min-w-[200px]">รูป / ชื่อ-สกุล นักเรียน</th>
                <th className="py-2.5 px-2 w-36 text-center">สถานะมาเรียน</th>
                <th className="py-2.5 px-2 w-28 text-center">ฝากเงินวันนี้</th>
                <th className="py-2.5 px-2 w-16 text-center text-emerald-700 bg-emerald-50/40">มารวม (ม)</th>
                <th className="py-2.5 px-2 w-16 text-center text-amber-700 bg-amber-50/40">ป่วยรวม (ป)</th>
                <th className="py-2.5 px-2 w-16 text-center text-blue-700 bg-blue-50/40">ลากิจรวม (ล)</th>
                <th className="py-2.5 px-2 w-16 text-center text-rose-700 bg-rose-50/40">ขาดรวม (ข)</th>
                <th className="py-2.5 px-3 w-32 text-right bg-emerald-100/40 text-emerald-900 font-bold">
                  ยอดออมสะสม
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student, index) => {
                const currentStatus = attendanceMap[student.id] || 'present';
                const currentDeposit = depositsMap[student.id] || 0;
                const stats = studentCumulativeStats[student.id] || { present: 0, sick: 0, personal: 0, absent: 0 };

                return (
                  <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-2.5 text-center text-slate-500 font-medium">{index + 1}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                          <ImageWithFallback
                            src={student.photoUrl}
                            alt={student.firstName}
                            isAvatar={true}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800 text-xs">
                            {student.prefix}{student.firstName} {student.lastName}
                          </span>
                          {student.nickname && (
                            <span className="text-[10px] text-slate-500 ml-1">({student.nickname})</span>
                          )}
                          <span className="block text-[9px] text-slate-400">#{student.studentCode}</span>
                        </div>
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
                          title="มาเรียน (ม)"
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
                          title="ป่วย (ป)"
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
                          title="ลากิจ (ล)"
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
                          title="ขาดเรียน (ข)"
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

      {/* SUMMARY STATS BOXES AT THE BOTTOM (Req 2: หน้าฝากเงิน ตรงที่แสดง ฝากเงินวันนี้ , มาเรียน, ลากิจ ที่เป็นกล่องสีเหลี่ม ทั้ง 6 ให้แสดงด้านล่างสุด) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>สรุปยอดประจำวัน: {formatThaiDate(selectedDate)}</span>
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">รวมสถิติประจำวันและสะสมทั้งหมด</span>
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="ดาวน์โหลดรายงานหรือพิมพ์เป็นไฟล์ PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลด PDF</span>
            </button>
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
                  const { dateStr, hasDeposit, hasAbsence, hasNote, hasBlueDot, pendingItems } = getDayDotStatus(dayNum);
                  const isSelected = dateStr === selectedDate;
                  const isToday = dateStr === new Date().toISOString().slice(0, 10);

                  const blueDotTitle = hasBlueDot
                    ? ` • มีรายการถอนเงิน ${pendingItems.length} รายการ (คลิกเพื่อปรับเงินฝากเป็น 0 และบันทึกหมายเหตุอัตโนมัติ)`
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

              {/* Dots Legend (Req 5: อธิบายจุดน้ำเงินใช้คำสั้นๆพอ 'ถอนเงิน' และสีส้มเป็น 'บันทึก') */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-1 ring-blue-300 inline-block animate-pulse" />
                  <span className="font-bold text-blue-800">ถอนเงิน</span>
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

              {/* Day Breakdown Preview for the selected date inside modal */}
              {(() => {
                const previewStats = getDayStats(selectedDate);
                return (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ข้อมูลประจำวัน: {formatThaiDate(selectedDate, true)}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                        วันที่เลือก
                      </span>
                    </div>

                    {/* Stats Grid inside modal */}
                    <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                      <div className="bg-amber-100/50 p-2 rounded-xl border border-amber-200/60">
                        <span className="text-[10px] text-amber-800 block">ฝากเงิน</span>
                        <strong className="text-amber-900 font-bold">{previewStats.depositors} คน</strong>
                        <span className="text-[9px] text-amber-700 block">({previewStats.totalDeposit} บ.)</span>
                      </div>
                      <div className="bg-blue-100/50 p-2 rounded-xl border border-blue-200/60">
                        <span className="text-[10px] text-blue-800 block">ลากิจ</span>
                        <strong className="text-blue-900 font-bold">{previewStats.personal} คน</strong>
                      </div>
                      <div className="bg-orange-100/50 p-2 rounded-xl border border-orange-200/60">
                        <span className="text-[10px] text-orange-800 block">ป่วย</span>
                        <strong className="text-orange-900 font-bold">{previewStats.sick} คน</strong>
                      </div>
                      <div className="bg-rose-100/50 p-2 rounded-xl border border-rose-200/60">
                        <span className="text-[10px] text-rose-800 block">ขาด</span>
                        <strong className="text-rose-900 font-bold">{previewStats.absent} คน</strong>
                      </div>
                    </div>

                    {/* Blue dot pending indicator in modal preview */}
                    {pendingWithdrawals.filter((p) => p.date === selectedDate && p.status === 'pending').length > 0 && (
                      <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-blue-950">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-300 animate-pulse shrink-0" />
                          <div>
                            <p className="font-bold text-blue-900">มีรายการถอนเงินที่รอตัดยอด (จุดสีน้ำเงิน)</p>
                            <p className="text-[10px] text-blue-700">
                              {pendingWithdrawals
                                .filter((p) => p.date === selectedDate && p.status === 'pending')
                                .map((p) => `${p.studentName}: ถอน ${p.amount} บ. (${p.reason})`)
                                .join(', ')}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            dataService.clearWithdrawalDate(selectedDate);
                            setPendingWithdrawals(dataService.getWithdrawalPendingDays());
                            setAllHistoryRecords(dataService.getAllAttendanceAndBank());
                            loadDayData(selectedDate);
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] shadow-xs cursor-pointer shrink-0"
                        >
                          ปรับเงินฝากเป็น 0 ทันที
                        </button>
                      </div>
                    )}

                    {/* Editable Note inside modal */}
                    <div className="pt-1">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        ข้อความบันทึก / เหตุผลที่ไม่ฝากเงิน:
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
                );
              })()}
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
      <PrintReportModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="รายงานข้อมูลการออมทรัพย์และสถิติการมาเรียนนักเรียน"
        subtitle={`ข้อมูล ณ ${formatThaiDate(selectedDate, true)} • ห้องเรียน ${profile.classroomName}`}
        profile={profile}
      >
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          <div className="p-2 border border-amber-300 rounded-lg bg-amber-50/70 text-amber-900">
            <span className="block text-[10px] text-amber-700 font-medium">ยอดฝากวันนี้</span>
            <span className="font-bold text-sm text-amber-800">{currentDayStats.totalDeposit.toLocaleString()} ฿</span>
          </div>
          <div className="p-2 border border-emerald-300 rounded-lg bg-emerald-50/70 text-emerald-900">
            <span className="block text-[10px] text-emerald-700 font-medium">มาเรียน (ม) วันนี้ / สะสม</span>
            <span className="font-bold text-sm text-emerald-800">{currentDayStats.present} / {classroomCumulativeStats.totalPresent} วัน</span>
          </div>
          <div className="p-2 border border-orange-300 rounded-lg bg-orange-50/70 text-orange-900">
            <span className="block text-[10px] text-orange-700 font-medium">ป่วย (ป) วันนี้ / สะสม</span>
            <span className="font-bold text-sm text-orange-800">{currentDayStats.sick} / {classroomCumulativeStats.totalSick} ครั้ง</span>
          </div>
          <div className="p-2 border border-blue-300 rounded-lg bg-blue-50/70 text-blue-900">
            <span className="block text-[10px] text-blue-700 font-medium">ลากิจ (ล) วันนี้ / สะสม</span>
            <span className="font-bold text-sm text-blue-800">{currentDayStats.personal} / {classroomCumulativeStats.totalPersonal} ครั้ง</span>
          </div>
          <div className="p-2 border border-rose-300 rounded-lg bg-rose-50/70 text-rose-900">
            <span className="block text-[10px] text-rose-700 font-medium">ขาด (ข) วันนี้ / สะสม</span>
            <span className="font-bold text-sm text-rose-800">{currentDayStats.absent} / {classroomCumulativeStats.totalAbsent} ครั้ง</span>
          </div>
        </div>

        <table className="w-full border-collapse border border-slate-400 text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-400 font-bold">
              <th className="border border-slate-400 p-2 text-center w-10">ลำดับ</th>
              <th className="border border-slate-400 p-2 text-left">ชื่อ - นามสกุล นักเรียน</th>
              <th className="border border-slate-400 p-2 text-center w-20">สถานะวันนี้</th>
              <th className="border border-slate-400 p-2 text-right w-24">ฝากวันนี้</th>
              <th className="border border-slate-400 p-2 text-center w-16">มารวม (ม)</th>
              <th className="border border-slate-400 p-2 text-center w-16">ป่วยรวม (ป)</th>
              <th className="border border-slate-400 p-2 text-center w-16">ลารวม (ล)</th>
              <th className="border border-slate-400 p-2 text-center w-16">ขาดรวม (ข)</th>
              <th className="border border-slate-400 p-2 text-right w-28">ยอดออมสะสม</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, idx) => {
              const currentStatus = attendanceMap[s.id] || 'present';
              const currentDep = depositsMap[s.id] || 0;
              const stats = studentCumulativeStats[s.id] || { present: 0, sick: 0, personal: 0, absent: 0 };
              const totalSavings = studentCumulativeSavings[s.id] || 0;
              const statusLabel =
                currentStatus === 'present'
                  ? 'มา (ม)'
                  : currentStatus === 'sick'
                  ? 'ป่วย (ป)'
                  : currentStatus === 'personal'
                  ? 'ลา (ล)'
                  : 'ขาด (ข)';

              return (
                <tr key={s.id} className="border-b border-slate-300">
                  <td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
                  <td className="border border-slate-300 p-1.5 font-medium">
                    {s.prefix}{s.firstName} {s.lastName}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center">{statusLabel}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-medium">
                    {currentDep > 0 ? `${currentDep.toLocaleString()} ฿` : '-'}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-emerald-800">
                    {stats.present}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-amber-800">
                    {stats.sick}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-blue-800">
                    {stats.personal}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-rose-800">
                    {stats.absent}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-right font-bold text-emerald-800">
                    {totalSavings.toLocaleString()} ฿
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
              <td colSpan={3} className="border border-slate-400 p-2 text-right">
                รวมทั้งหมด ({students.length} คน):
              </td>
              <td className="border border-slate-400 p-2 text-right text-amber-900">
                {currentDayStats.totalDeposit.toLocaleString()} ฿
              </td>
              <td className="border border-slate-400 p-2 text-center text-emerald-900">
                {classroomCumulativeStats.totalPresent}
              </td>
              <td className="border border-slate-400 p-2 text-center text-amber-900">
                {classroomCumulativeStats.totalSick}
              </td>
              <td className="border border-slate-400 p-2 text-center text-blue-900">
                {classroomCumulativeStats.totalPersonal}
              </td>
              <td className="border border-slate-400 p-2 text-center text-rose-900">
                {classroomCumulativeStats.totalAbsent}
              </td>
              <td className="border border-slate-400 p-2 text-right font-black text-emerald-900">
                {classroomAllSavings.toLocaleString()} ฿
              </td>
            </tr>
          </tfoot>
        </table>
      </PrintReportModal>

      {/* RESET ALL SAVINGS CONFIRMATION MODAL (Req 4: ลบเงินฝากของนักเรียนทั้งหมด เพื่อเริ่มฝากใหม่ ยืนยันด้วย Password) */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-rose-100 max-w-md w-full animate-bounce-short">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  ลบเงินฝากของนักเรียนทั้งหมด
                </h3>
                <p className="text-xs text-rose-600 font-semibold mt-0.5">
                  เพื่อเริ่มฝากใหม่ (ต้องยืนยันด้วย Password เข้าสู่ระบบ)
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50/80 border border-rose-200/80 rounded-2xl mb-4 text-xs text-rose-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>คำเตือนสำคัญ:</span>
              </div>
              <p className="leading-relaxed text-rose-800/90 text-[11px]">
                การดำเนินการนี้จะรีเซ็ตยอดเงินฝากสะสมของนักเรียนทุกคนเป็น 0 บาท และล้างประวัติเงินฝากเดิม เพื่อให้คุณครูสามารถเริ่มต้นบันทึกรอบใหม่ได้ทันที
              </p>
            </div>

            <form onSubmit={handleConfirmResetSavings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>กรุณากรอกรหัสผ่านเข้าสู่ระบบ (Password)</span>
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={resetPassword}
                    onChange={(e) => {
                      setResetPassword(e.target.value);
                      if (resetError) setResetError('');
                    }}
                    placeholder="กรอก Password เพื่อยืนยัน"
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
                  <span>ยืนยันลบเงินฝากทั้งหมด</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
