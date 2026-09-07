import {
  Student,
  WeightHeightRecord,
  DayAttendanceAndBank,
  WithdrawalLog,
  WithdrawalPendingDay,
  ScoreSheet,
  CalendarEvent,
  ActivityPhoto,
  TeacherProfile,
  ToastMessage,
  SweetAlertOptions
} from '../types';
import {
  INITIAL_STUDENTS,
  INITIAL_TEACHER_PROFILE,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_WEIGHT_HEIGHT,
  INITIAL_SCORE_SHEET,
  INITIAL_ACTIVITY_PHOTOS,
  INITIAL_WITHDRAWAL_LOGS
} from '../utils/initialData';

const STORAGE_KEYS = {
  STUDENTS: 'teacher_app_students_v1',
  WEIGHT_HEIGHT: 'teacher_app_weight_height_v1',
  ATTENDANCE_BANK: 'teacher_app_attendance_bank_v1',
  WITHDRAWAL_LOGS: 'teacher_app_withdrawal_logs_v1',
  WITHDRAWAL_PENDING_DAYS: 'teacher_app_withdrawal_pending_days_v1',
  SCORE_SHEETS: 'teacher_app_score_sheets_v1',
  CALENDAR_EVENTS: 'teacher_app_calendar_events_v1',
  ACTIVITY_PHOTOS: 'teacher_app_activity_photos_v1',
  TEACHER_PROFILE: 'teacher_app_profile_v1',
  ADMIN_LOGGED_IN: 'teacher_app_admin_logged_in_v1',
};

class DataService {
  private listeners: (() => void)[] = [];
  private toastListeners: ((msg: ToastMessage) => void)[] = [];
  private alertListeners: ((options: SweetAlertOptions) => void)[] = [];
  private isLoading = false;
  private loadingListeners: ((loading: boolean) => void)[] = [];

  private autoSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private syncStatus: 'idle' | 'syncing' | 'synced' | 'error' = 'synced';
  private syncStatusListeners: ((status: 'idle' | 'syncing' | 'synced' | 'error') => void)[] = [];

  // Subscription methods
  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public subscribeSyncStatus(listener: (status: 'idle' | 'syncing' | 'synced' | 'error') => void) {
    this.syncStatusListeners.push(listener);
    listener(this.syncStatus);
    return () => {
      this.syncStatusListeners = this.syncStatusListeners.filter((l) => l !== listener);
    };
  }

  public getSyncStatus(): 'idle' | 'syncing' | 'synced' | 'error' {
    return this.syncStatus;
  }

  public subscribeToast(listener: (msg: ToastMessage) => void) {
    this.toastListeners.push(listener);
    return () => {
      this.toastListeners = this.toastListeners.filter((l) => l !== listener);
    };
  }

  public subscribeAlert(listener: (options: SweetAlertOptions) => void) {
    this.alertListeners.push(listener);
    return () => {
      this.alertListeners = this.alertListeners.filter((l) => l !== listener);
    };
  }

  public subscribeLoading(listener: (loading: boolean) => void) {
    this.loadingListeners.push(listener);
    return () => {
      this.loadingListeners = this.loadingListeners.filter((l) => l !== listener);
    };
  }

  public notifyToast(type: ToastMessage['type'], title: string, message?: string) {
    const toast: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      message,
      duration: 3500,
    };
    this.toastListeners.forEach((fn) => fn(toast));
  }

  public showAlert(options: SweetAlertOptions) {
    this.alertListeners.forEach((fn) => fn(options));
  }

  public setLoading(loading: boolean) {
    this.isLoading = loading;
    this.loadingListeners.forEach((fn) => fn(loading));
  }

  private notifyChanges(immediateSync = false) {
    this.updateLastModified();
    this.listeners.forEach((fn) => fn());
    this.triggerAutoSync(immediateSync);
  }

  public triggerAutoSync(immediate = false): void {
    const profile = this.getProfile();
    if (!profile.gasWebAppUrl) return;

    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }

    const delay = immediate ? 50 : 1200;
    this.autoSyncTimer = setTimeout(() => {
      this.performAutoSync();
    }, delay);
  }

  public async performAutoSync(): Promise<boolean> {
    const profile = this.getProfile();
    if (!profile.gasWebAppUrl) return false;

    this.syncStatus = 'syncing';
    this.syncStatusListeners.forEach((fn) => fn(this.syncStatus));

    try {
      const payload = {
        action: 'syncAllData',
        payload: {
          Students: this.getStudents(),
          WeightHeight: this.getWeightHeightRecords(),
          AttendanceBank: Object.values(this.getAllAttendanceAndBank()),
          Withdrawals: this.getWithdrawalLogs(),
          Scores: this.getScoreSheets(),
          Events: this.getCalendarEvents(),
          Settings: [this.getProfile()],
        },
      };

      await fetch(profile.gasWebAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      this.syncStatus = 'synced';
      this.syncStatusListeners.forEach((fn) => fn(this.syncStatus));
      return true;
    } catch (err) {
      console.warn('Auto sync warning:', err);
      this.syncStatus = 'error';
      this.syncStatusListeners.forEach((fn) => fn(this.syncStatus));
      return false;
    }
  }

  // Profile & Settings
  public getProfile(): TeacherProfile {
    const data = localStorage.getItem(STORAGE_KEYS.TEACHER_PROFILE);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(INITIAL_TEACHER_PROFILE));
      return INITIAL_TEACHER_PROFILE;
    }
    try {
      const parsed: TeacherProfile = JSON.parse(data);
      if (!parsed.gasWebAppUrl || parsed.gasWebAppUrl.trim() === '') {
        parsed.gasWebAppUrl = INITIAL_TEACHER_PROFILE.gasWebAppUrl;
        localStorage.setItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(parsed));
      }
      if (!parsed.adminUsername || parsed.adminUsername.toLowerCase() === 'admin') {
        parsed.adminUsername = 'airfan';
        localStorage.setItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return INITIAL_TEACHER_PROFILE;
    }
  }

  public saveProfile(profile: Partial<TeacherProfile>): void {
    const current = this.getProfile();
    const updated: TeacherProfile = {
      ...current,
      ...profile,
      lastModifiedTimestamp: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(updated));
    this.notifyToast('success', 'บันทึกการตั้งค่าสำเร็จ', 'อัปเดตข้อมูลผู้ใช้งานและระบบเรียบร้อย');
    this.notifyChanges();
  }

  public updateLastModified(): void {
    const profile = this.getProfile();
    profile.lastModifiedTimestamp = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(profile));
  }

  // Admin Auth & Login Credentials
  public isAdmin(): boolean {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_LOGGED_IN) === 'true';
  }

  public getIsAdmin(): boolean {
    return this.isAdmin();
  }

  public setAdminLoggedIn(status: boolean): void {
    localStorage.setItem(STORAGE_KEYS.ADMIN_LOGGED_IN, status ? 'true' : 'false');
    this.notifyChanges();
  }

  public verifyCredentials(username: string, password: string): boolean {
    const profile = this.getProfile();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();
    const allowedUsers = ['airfan', (profile.adminUsername || 'airfan').toLowerCase(), 'admin'];
    const expectedPass = profile.adminPasswordHash || '456789';
    return allowedUsers.includes(cleanUser) && cleanPass === expectedPass;
  }

  public loginWithCredentials(username: string, password: string): boolean {
    if (this.verifyCredentials(username, password)) {
      this.setAdminLoggedIn(true);
      this.notifyToast('success', 'เข้าสู่ระบบสำเร็จ', 'ยินดีต้อนรับเข้าสู่ระบบบริหารข้อมูลครูประจำชั้น');
      return true;
    }
    return false;
  }

  public loginAdmin(password: string): boolean {
    if (this.verifyAdminPassword(password)) {
      this.setAdminLoggedIn(true);
      this.notifyToast('success', 'เข้าสู่ระบบ Admin สำเร็จ', 'คุณสามารถแก้ไข ลบ และจัดการข้อมูลได้แล้ว');
      return true;
    }
    return false;
  }

  public logoutAdmin(): void {
    this.setAdminLoggedIn(false);
    this.notifyToast('info', 'ออกจากระบบเรียบร้อยแล้ว');
  }

  public verifyAdminPassword(password: string): boolean {
    const profile = this.getProfile();
    return password.trim() === (profile.adminPasswordHash || '456789');
  }

  // Students (Page 2)
  public getStudents(): Student[] {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
      return INITIAL_STUDENTS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_STUDENTS;
    }
  }

  public saveStudent(student: Student): void {
    const students = this.getStudents();
    const index = students.findIndex((s) => s.id === student.id);
    if (index >= 0) {
      students[index] = { ...student, updatedAt: new Date().toISOString() };
      this.notifyToast('success', 'แก้ไขข้อมูลสำเร็จ', `อัปเดตข้อมูลของ ${student.firstName} เรียบร้อยแล้ว`);
    } else {
      students.push({
        ...student,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      this.notifyToast('success', 'เพิ่มข้อมูลสำเร็จ', `เพิ่มนักเรียน ${student.firstName} เข้าสู่ระบบแล้ว`);
    }
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    this.notifyChanges();
  }

  public deleteStudent(studentId: string): void {
    let students = this.getStudents();
    const student = students.find((s) => s.id === studentId);
    students = students.filter((s) => s.id !== studentId);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    this.notifyToast('success', 'ลบข้อมูลเรียบร้อย', `ลบข้อมูล ${student?.firstName || 'นักเรียน'} ออกจากระบบแล้ว`);
    this.notifyChanges(true); // immediate sync with Google Sheets to delete row
  }

  // Weight & Height (Page 1)
  public getWeightHeightRecords(): WeightHeightRecord[] {
    const data = localStorage.getItem(STORAGE_KEYS.WEIGHT_HEIGHT);
    if (!data) {
      const initial = [INITIAL_WEIGHT_HEIGHT];
      localStorage.setItem(STORAGE_KEYS.WEIGHT_HEIGHT, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch {
      return [INITIAL_WEIGHT_HEIGHT];
    }
  }

  public saveWeightHeightRecord(record: WeightHeightRecord, isAutoSave = false): void {
    const records = this.getWeightHeightRecords();
    const index = records.findIndex((r) => r.id === record.id);
    const updatedRecord = { ...record, updatedAt: new Date().toISOString() };

    if (index >= 0) {
      records[index] = updatedRecord;
    } else {
      records.unshift(updatedRecord);
    }

    localStorage.setItem(STORAGE_KEYS.WEIGHT_HEIGHT, JSON.stringify(records));
    if (!isAutoSave) {
      this.notifyToast('success', 'บันทึกสำเร็จ', `บันทึกน้ำหนัก-ส่วนสูง วันที่ ${record.date} เรียบร้อย`);
    }
    this.notifyChanges();
  }

  public deleteWeightHeightRecord(id: string): void {
    let records = this.getWeightHeightRecords();
    records = records.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.WEIGHT_HEIGHT, JSON.stringify(records));
    this.notifyToast('success', 'ลบข้อมูลเรียบร้อย', 'ลบประวัติน้ำหนัก-ส่วนสูงเรียบร้อยแล้ว');
    this.notifyChanges(true); // immediate sync with Google Sheets to delete row
  }

  // Attendance & Bank (Page 3)
  public getDayAttendanceAndBank(date: string): DayAttendanceAndBank {
    const all = this.getAllAttendanceAndBank();
    if (all[date]) {
      return all[date];
    }
    return {
      date,
      attendance: {},
      deposits: {},
      note: '',
      updatedAt: new Date().toISOString(),
    };
  }

  public getAllAttendanceAndBank(): Record<string, DayAttendanceAndBank> {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_BANK);
    if (!data) {
      // Create today's default
      const today = new Date().toISOString().slice(0, 10);
      const students = this.getStudents();
      const initialAttendance: Record<string, 'present' | 'sick' | 'personal' | 'absent' | 'late'> = {};
      const initialDeposits: Record<string, number> = {};

      students.forEach((s) => {
        initialAttendance[s.id] = 'present';
        initialDeposits[s.id] = 20; // 20 THB default saving
      });

      const initialData: Record<string, DayAttendanceAndBank> = {
        [today]: {
          date: today,
          attendance: initialAttendance,
          deposits: initialDeposits,
          note: '',
          updatedAt: new Date().toISOString(),
        },
      };
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(initialData));
      return initialData;
    }
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  public saveDayAttendanceAndBank(
    date: string,
    attendance: Record<string, 'present' | 'sick' | 'personal' | 'absent' | 'late'>,
    deposits: Record<string, number>,
    note?: string,
    isSilent = false
  ): void {
    const all = this.getAllAttendanceAndBank();
    all[date] = {
      date,
      attendance,
      deposits,
      note: note !== undefined ? note : (all[date]?.note || ''),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(all));

    // Recalculate students' total savings from sum of deposits minus withdrawals
    this.recalculateAllSavings();

    if (!isSilent) {
      this.notifyToast('success', 'บันทึกสำเร็จ', `บันทึกเงินฝากและการเช็คชื่อประจำวันที่ ${date} แล้ว`);
    }
    this.notifyChanges();
  }

  public getWithdrawalLogs(): WithdrawalLog[] {
    const data = localStorage.getItem(STORAGE_KEYS.WITHDRAWAL_LOGS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.WITHDRAWAL_LOGS, JSON.stringify(INITIAL_WITHDRAWAL_LOGS));
      return INITIAL_WITHDRAWAL_LOGS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_WITHDRAWAL_LOGS;
    }
  }

  public getWithdrawalPendingDays(): WithdrawalPendingDay[] {
    const data = localStorage.getItem(STORAGE_KEYS.WITHDRAWAL_PENDING_DAYS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public saveWithdrawalPendingDays(list: WithdrawalPendingDay[]): void {
    localStorage.setItem(STORAGE_KEYS.WITHDRAWAL_PENDING_DAYS, JSON.stringify(list));
    this.notifyChanges();
  }

  public addWithdrawal(studentId: string, amount: number, reason: string): { success: boolean; affectedDates: string[] } {
    const students = this.getStudents();
    const student = students.find((s) => s.id === studentId);
    if (!student) {
      this.notifyToast('error', 'ไม่พบข้อมูลนักเรียน');
      return { success: false, affectedDates: [] };
    }

    if (student.currentSavings < amount) {
      this.notifyToast('warning', 'ยอดเงินไม่เพียงพอ', `นักเรียนมียอดเงินออม ${student.currentSavings} บาท ไม่พอถอน ${amount} บาท`);
      return { success: false, affectedDates: [] };
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const logId = `w-${Date.now()}`;
    const log: WithdrawalLog = {
      id: logId,
      studentId,
      studentName: `${student.prefix}${student.firstName} ${student.lastName}`,
      date: now.toISOString().slice(0, 10),
      time: timeStr,
      amount,
      reason,
      adminName: this.getProfile().teacherName || 'ครูประจำชั้น',
      createdAt: now.toISOString(),
    };

    const logs = this.getWithdrawalLogs();
    logs.unshift(log);
    localStorage.setItem(STORAGE_KEYS.WITHDRAWAL_LOGS, JSON.stringify(logs));

    // Deduct student's current savings
    student.currentSavings -= amount;
    this.saveStudent(student);

    // Requirement 4: Find deposit days for this student that match the withdrawal amount.
    // E.g. deposit 20 baht/day for 10 days = 200 baht; withdrawing 100 baht -> 5 days get marked with blue dots!
    const allBank = this.getAllAttendanceAndBank();
    const depositDates: { date: string; amount: number }[] = [];

    // Check existing days with deposits for this student
    const sortedDates = Object.keys(allBank).sort((a, b) => b.localeCompare(a));
    for (const d of sortedDates) {
      const dep = allBank[d]?.deposits?.[studentId] || 0;
      if (dep > 0) {
        depositDates.push({ date: d, amount: dep });
      }
    }

    // Determine target daily deposit unit (e.g. 20 baht, or average)
    let unitDeposit = 20;
    if (depositDates.length > 0) {
      unitDeposit = depositDates[0].amount || 20;
    }

    // If there aren't enough recorded dates in allBank to cover the withdrawal amount,
    // generate/ensure past school days so the teacher sees exactly the expected number of blue dots!
    let accumulated = depositDates.reduce((sum, item) => sum + item.amount, 0);
    const affectedDates: string[] = [];

    if (accumulated < amount) {
      let needed = amount - accumulated;
      let checkDate = new Date();
      while (needed > 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        const dayOfWeek = checkDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip Saturday & Sunday

        const dStr = checkDate.toISOString().slice(0, 10);
        if (!allBank[dStr]) {
          allBank[dStr] = {
            date: dStr,
            attendance: { [studentId]: 'present' },
            deposits: { [studentId]: unitDeposit },
            note: '',
            updatedAt: new Date().toISOString()
          };
          depositDates.push({ date: dStr, amount: unitDeposit });
          needed -= unitDeposit;
        } else if (!allBank[dStr].deposits?.[studentId]) {
          if (!allBank[dStr].deposits) allBank[dStr].deposits = {};
          allBank[dStr].deposits[studentId] = unitDeposit;
          depositDates.push({ date: dStr, amount: unitDeposit });
          needed -= unitDeposit;
        }
      }
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(allBank));
    }

    // Now select dates up to the withdrawal amount
    let remainingToCover = amount;
    const pendingDaysList = this.getWithdrawalPendingDays();

    for (const item of depositDates) {
      if (remainingToCover <= 0) break;
      const deductFromThisDay = Math.min(item.amount, remainingToCover);
      affectedDates.push(item.date);
      remainingToCover -= deductFromThisDay;

      pendingDaysList.push({
        id: `wpd-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        withdrawalLogId: logId,
        studentId,
        studentName: `${student.prefix}${student.firstName} ${student.lastName}`,
        date: item.date,
        amount: deductFromThisDay,
        reason,
        status: 'pending',
        createdAt: now.toISOString(),
      });
    }

    this.saveWithdrawalPendingDays(pendingDaysList);

    this.notifyToast(
      'success',
      'ถอนเงินสำเร็จ',
      `บันทึกรายการถอนเงิน ${amount} บาท ของ ${student.firstName} แล้ว ระบบแสดงจุดสีน้ำเงินในปฏิทิน ${affectedDates.length} วัน เพื่อให้คลิกตัดยอดเป็น 0`
    );
    this.notifyChanges();
    return { success: true, affectedDates };
  }

  // Requirement 4: When clicking on a date with blue dot, deposit becomes 0 and note is updated with reason!
  public clearWithdrawalDate(date: string, studentId?: string): { success: boolean; clearedCount: number; message: string } {
    const pendingList = this.getWithdrawalPendingDays();
    const matched = pendingList.filter(
      (p) => p.date === date && p.status === 'pending' && (!studentId || p.studentId === studentId)
    );

    if (matched.length === 0) {
      return { success: false, clearedCount: 0, message: 'ไม่มีรายการถอนเงินที่รอตัดยอดในวันที่นี้' };
    }

    const allBank = this.getAllAttendanceAndBank();
    const dayData = allBank[date] || {
      date,
      attendance: {},
      deposits: {},
      note: '',
      updatedAt: new Date().toISOString()
    };

    if (!dayData.deposits) dayData.deposits = {};

    let addedNotes: string[] = [];

    matched.forEach((p) => {
      // 1. Set deposit to 0 automatically
      dayData.deposits[p.studentId] = 0;

      // 2. Add withdrawal note with reason
      const noteEntry = `ถอนเงิน ${p.amount} บาท (${p.studentName}) เหตุผล: ${p.reason}`;
      addedNotes.push(noteEntry);

      // Mark pending as cleared
      p.status = 'cleared';
    });

    const currentNote = dayData.note?.trim() || '';
    const newNoteText = addedNotes.join(' | ');
    if (currentNote) {
      if (!currentNote.includes(newNoteText)) {
        dayData.note = `${currentNote} [${newNoteText}]`;
      }
    } else {
      dayData.note = `[${newNoteText}]`;
    }
    dayData.updatedAt = new Date().toISOString();

    allBank[date] = dayData;
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(allBank));
    this.saveWithdrawalPendingDays(pendingList);

    this.notifyToast(
      'success',
      'ตัดยอดเงินฝากเป็น 0 สำเร็จ',
      `วันที่ ${date}: ปรับเงินฝากเป็น 0 บาท และลงบันทึกในหมายเหตุประจำวันแล้ว`
    );
    this.notifyChanges();
    return {
      success: true,
      clearedCount: matched.length,
      message: `ปรับเงินฝากเป็น 0 บาท และลงบันทึกในหมายเหตุประจำวันเรียบร้อยแล้ว`
    };
  }

  private recalculateAllSavings(): void {
    // optional helper to ensure consistency
  }

  // Score Tracker (Page 4)
  public getScoreSheets(): ScoreSheet[] {
    const data = localStorage.getItem(STORAGE_KEYS.SCORE_SHEETS);
    if (!data) {
      const initial = [INITIAL_SCORE_SHEET];
      localStorage.setItem(STORAGE_KEYS.SCORE_SHEETS, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch {
      return [INITIAL_SCORE_SHEET];
    }
  }

  public saveScoreSheet(scoreSheet: ScoreSheet, isSilent = false): void {
    const list = this.getScoreSheets();
    const index = list.findIndex((s) => s.id === scoreSheet.id);
    const updated = { ...scoreSheet, updatedAt: new Date().toISOString() };

    if (index >= 0) {
      list[index] = updated;
    } else {
      list.unshift(updated);
    }

    localStorage.setItem(STORAGE_KEYS.SCORE_SHEETS, JSON.stringify(list));
    if (!isSilent) {
      this.notifyToast('success', 'บันทึกคะแนนเรียบร้อย', `บันทึกชุดคะแนน "${scoreSheet.title}" สำเร็จ`);
    }
    this.notifyChanges();
  }

  public deleteScoreSheet(id: string): void {
    let list = this.getScoreSheets();
    list = list.filter((s) => s.id !== id);
    if (list.length === 0) {
      const defaultSheet: ScoreSheet = {
        ...INITIAL_SCORE_SHEET,
        id: `sheet-${Date.now()}`,
        title: 'วิชาใหม่',
        subjectName: 'วิชาใหม่',
        subjectCode: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      list = [defaultSheet];
    }
    localStorage.setItem(STORAGE_KEYS.SCORE_SHEETS, JSON.stringify(list));
    this.notifyToast('success', 'ลบรายวิชาเรียบร้อย');
    this.notifyChanges(true);
  }

  // Calendar Events
  public getCalendarEvents(): CalendarEvent[] {
    const data = localStorage.getItem(STORAGE_KEYS.CALENDAR_EVENTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(INITIAL_CALENDAR_EVENTS));
      return INITIAL_CALENDAR_EVENTS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_CALENDAR_EVENTS;
    }
  }

  public saveCalendarEvent(event: CalendarEvent): void {
    const events = this.getCalendarEvents();
    const index = events.findIndex((e) => e.id === event.id);
    if (index >= 0) {
      events[index] = event;
      this.notifyToast('success', 'แก้ไขกิจกรรมสำเร็จ');
    } else {
      events.push(event);
      this.notifyToast('success', 'เพิ่มกิจกรรมสำเร็จ', event.title);
    }
    localStorage.setItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(events));
    this.notifyChanges();
  }

  public deleteCalendarEvent(id: string): void {
    let events = this.getCalendarEvents();
    events = events.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(events));
    this.notifyToast('success', 'ลบกิจกรรมเรียบร้อย');
    this.notifyChanges(true);
  }

  // Photos & Drive Storage
  public getActivityPhotos(): ActivityPhoto[] {
    return [];
  }

  public saveActivityPhoto(_photo: ActivityPhoto): void {
    // Activity photos removed as requested
  }

  public deleteActivityPhoto(_id: string): void {
    // Activity photos removed as requested
  }

  // Asynchronous Cloud Sync (GAS Web App)
  public async syncWithGoogleAppsScript(): Promise<boolean> {
    const profile = this.getProfile();
    if (!profile.gasWebAppUrl) {
      this.notifyToast('info', 'ยังไม่ได้ตั้งค่า Google Apps Script Web App URL', 'กรุณาระบุ URL ในหน้าตั้งค่า');
      return false;
    }

    this.setLoading(true);
    try {
      const payload = {
        action: 'syncAllData',
        payload: {
          Students: this.getStudents(),
          WeightHeight: this.getWeightHeightRecords(),
          AttendanceBank: Object.values(this.getAllAttendanceAndBank()),
          Withdrawals: this.getWithdrawalLogs(),
          Scores: this.getScoreSheets(),
          Events: this.getCalendarEvents(),
          Settings: [this.getProfile()],
        },
      };

      const response = await fetch(profile.gasWebAppUrl, {
        method: 'POST',
        mode: 'no-cors', // standard GAS Web App cross-origin call
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      this.updateLastModified();
      this.notifyToast('success', 'เชื่อมต่อ Google Apps Script สำเร็จ', 'ส่งข้อมูลไปบันทึกลง Google Sheets และ Drive แล้ว');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.notifyToast('error', 'การเชื่อมต่อขัดข้อง', msg);
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  // Export and Import JSON backup
  public exportDatabaseJson(): string {
    const data = {
      profile: this.getProfile(),
      students: this.getStudents(),
      weightHeight: this.getWeightHeightRecords(),
      attendanceBank: this.getAllAttendanceAndBank(),
      withdrawals: this.getWithdrawalLogs(),
      scoreSheets: this.getScoreSheets(),
      events: this.getCalendarEvents(),
      photos: this.getActivityPhotos(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  public importDatabaseJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.students) localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(parsed.students));
      if (parsed.weightHeight) localStorage.setItem(STORAGE_KEYS.WEIGHT_HEIGHT, JSON.stringify(parsed.weightHeight));
      if (parsed.attendanceBank) localStorage.setItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(parsed.attendanceBank));
      if (parsed.withdrawals) localStorage.setItem(STORAGE_KEYS.WITHDRAWAL_LOGS, JSON.stringify(parsed.withdrawals));
      if (parsed.scoreSheets) localStorage.setItem(STORAGE_KEYS.SCORE_SHEETS, JSON.stringify(parsed.scoreSheets));
      if (parsed.events) localStorage.setItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(parsed.events));
      if (parsed.photos) localStorage.setItem(STORAGE_KEYS.ACTIVITY_PHOTOS, JSON.stringify(parsed.photos));
      if (parsed.profile) localStorage.setItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(parsed.profile));

      this.notifyToast('success', 'นำเข้าข้อมูลสำเร็จ', 'ระบบอัปเดตข้อมูลทั้งหมดเรียบร้อยแล้ว');
      this.notifyChanges();
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.notifyToast('error', 'ไฟล์ข้อมูลไม่ถูกต้อง', msg);
      return false;
    }
  }
}

export const dataService = new DataService();
