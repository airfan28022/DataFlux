import {
  Student,
  AttendanceStatus,
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
import { DEFAULT_DRIVE_FOLDER_ID } from '../utils/helpers';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, testConnection } from './firebase';

function cleanForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_k, v) => (v === undefined ? null : v)));
}

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

  private firestoreListeners: (() => void)[] = [];
  private isStudentsInitialized = false;
  private isWeightHeightInitialized = false;
  private isAttendanceBankInitialized = false;
  private isWithdrawalLogsInitialized = false;
  private isScoresInitialized = false;
  private isEventsInitialized = false;
  private isProfileInitialized = false;

  constructor() {
    this.initFirestoreRealtime();
    testConnection().catch(() => {});
  }

  private notifySubscribersOnly(): void {
    this.listeners.forEach((fn) => fn());
  }

  private initFirestoreRealtime(): void {
    try {
      // 1. Students Real-time listener across all devices
      const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
        if (!snap.empty) {
          this.isStudentsInitialized = true;
          const students = snap.docs.map((d) => d.data() as Student);
          // Sort by studentCode or id for consistent rendering
          students.sort((a, b) => (Number(a.studentCode) || 0) - (Number(b.studentCode) || 0) || a.id.localeCompare(b.id));
          localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
          this.notifySubscribersOnly();
        } else if (!this.isStudentsInitialized) {
          this.isStudentsInitialized = true;
          this.seedStudentsToFirestore();
        } else {
          localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
          this.notifySubscribersOnly();
        }
      }, (err) => console.warn('[Firestore] Students listener warning:', err));
      this.firestoreListeners.push(unsubStudents);

      // 2. Weight & Height Real-time listener
      const unsubWH = onSnapshot(collection(db, 'weightHeight'), (snap) => {
        if (!snap.empty) {
          this.isWeightHeightInitialized = true;
          const records = snap.docs.map((d) => d.data() as WeightHeightRecord);
          localStorage.setItem(STORAGE_KEYS.WEIGHT_HEIGHT, JSON.stringify(records));
          this.notifySubscribersOnly();
        } else if (!this.isWeightHeightInitialized) {
          this.isWeightHeightInitialized = true;
          this.seedWeightHeightToFirestore();
        } else {
          localStorage.setItem(STORAGE_KEYS.WEIGHT_HEIGHT, JSON.stringify([]));
          this.notifySubscribersOnly();
        }
      }, (err) => console.warn('[Firestore] WeightHeight listener warning:', err));
      this.firestoreListeners.push(unsubWH);

      // 3. Attendance & Bank Real-time listener
      const unsubAtt = onSnapshot(collection(db, 'attendanceBank'), (snap) => {
        if (!snap.empty) {
          this.isAttendanceBankInitialized = true;
          const all: Record<string, DayAttendanceAndBank> = {};
          snap.docs.forEach((d) => {
            all[d.id] = d.data() as DayAttendanceAndBank;
          });
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(all));
          this.recalculateAllSavings(false);
          this.notifySubscribersOnly();
        } else if (!this.isAttendanceBankInitialized) {
          this.isAttendanceBankInitialized = true;
          this.seedAttendanceBankToFirestore();
        } else {
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify({}));
          this.notifySubscribersOnly();
        }
      }, (err) => console.warn('[Firestore] Attendance listener warning:', err));
      this.firestoreListeners.push(unsubAtt);

      // 4. Withdrawal Logs Real-time listener
      const unsubWithdrawal = onSnapshot(collection(db, 'withdrawalLogs'), (snap) => {
        this.isWithdrawalLogsInitialized = true;
        const logs = snap.docs.map((d) => d.data() as WithdrawalLog);
        logs.sort((a, b) => (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time));
        localStorage.setItem(STORAGE_KEYS.WITHDRAWAL_LOGS, JSON.stringify(logs));
        this.notifySubscribersOnly();
      }, (err) => console.warn('[Firestore] Withdrawal listener warning:', err));
      this.firestoreListeners.push(unsubWithdrawal);

      // 5. Withdrawal Pending Days Real-time listener
      const unsubPending = onSnapshot(doc(db, 'settings', 'withdrawalPendingDays'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && Array.isArray(data.list)) {
            localStorage.setItem(STORAGE_KEYS.WITHDRAWAL_PENDING_DAYS, JSON.stringify(data.list));
            this.notifySubscribersOnly();
          }
        }
      }, (err) => console.warn('[Firestore] Pending listener warning:', err));
      this.firestoreListeners.push(unsubPending);

      // 6. Score Sheets Real-time listener
      const unsubScores = onSnapshot(collection(db, 'scoreSheets'), (snap) => {
        if (!snap.empty) {
          this.isScoresInitialized = true;
          const sheets = snap.docs.map((d) => d.data() as ScoreSheet);
          localStorage.setItem(STORAGE_KEYS.SCORE_SHEETS, JSON.stringify(sheets));
          this.notifySubscribersOnly();
        } else if (!this.isScoresInitialized) {
          this.isScoresInitialized = true;
          this.seedScoreSheetsToFirestore();
        } else {
          localStorage.setItem(STORAGE_KEYS.SCORE_SHEETS, JSON.stringify([]));
          this.notifySubscribersOnly();
        }
      }, (err) => console.warn('[Firestore] Scores listener warning:', err));
      this.firestoreListeners.push(unsubScores);

      // 7. Calendar Events Real-time listener
      const unsubEvents = onSnapshot(collection(db, 'calendarEvents'), (snap) => {
        if (!snap.empty) {
          this.isEventsInitialized = true;
          const events = snap.docs.map((d) => d.data() as CalendarEvent);
          localStorage.setItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(events));
          this.notifySubscribersOnly();
        } else if (!this.isEventsInitialized) {
          this.isEventsInitialized = true;
          this.seedCalendarEventsToFirestore();
        } else {
          localStorage.setItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify([]));
          this.notifySubscribersOnly();
        }
      }, (err) => console.warn('[Firestore] Events listener warning:', err));
      this.firestoreListeners.push(unsubEvents);

      // 8. Profile & Classroom Settings Real-time listener
      const unsubProfile = onSnapshot(doc(db, 'settings', 'profile'), (snap) => {
        if (snap.exists()) {
          this.isProfileInitialized = true;
          const p = snap.data() as TeacherProfile;
          if (p) {
            const current = this.getProfile();
            const merged: TeacherProfile = {
              ...current,
              ...p,
              adminPasswordHash: p.adminPasswordHash || current.adminPasswordHash || '456789',
            };
            localStorage.setItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(merged));
            this.notifySubscribersOnly();
          }
        } else if (!this.isProfileInitialized) {
          this.isProfileInitialized = true;
          this.seedProfileToFirestore();
        }
      }, (err) => console.warn('[Firestore] Profile listener warning:', err));
      this.firestoreListeners.push(unsubProfile);
    } catch (e) {
      console.warn('[Firestore] Realtime setup warning:', e);
    }
  }

  private async seedStudentsToFirestore() {
    try {
      const students = this.getStudents();
      for (const s of students) {
        await setDoc(doc(db, 'students', s.id), cleanForFirestore(s));
      }
    } catch (e) {
      console.warn('[Firestore] Seed students warning:', e);
    }
  }

  private async seedWeightHeightToFirestore() {
    try {
      const records = this.getWeightHeightRecords();
      for (const r of records) {
        await setDoc(doc(db, 'weightHeight', r.id), cleanForFirestore(r));
      }
    } catch (e) {
      console.warn('[Firestore] Seed weightHeight warning:', e);
    }
  }

  private async seedAttendanceBankToFirestore() {
    try {
      const all = this.getAllAttendanceAndBank();
      for (const [date, data] of Object.entries(all)) {
        await setDoc(doc(db, 'attendanceBank', date), cleanForFirestore(data));
      }
    } catch (e) {
      console.warn('[Firestore] Seed attendanceBank warning:', e);
    }
  }

  private async seedScoreSheetsToFirestore() {
    try {
      const sheets = this.getScoreSheets();
      for (const s of sheets) {
        await setDoc(doc(db, 'scoreSheets', s.id), cleanForFirestore(s));
      }
    } catch (e) {
      console.warn('[Firestore] Seed scoreSheets warning:', e);
    }
  }

  private async seedCalendarEventsToFirestore() {
    try {
      const events = this.getCalendarEvents();
      for (const ev of events) {
        await setDoc(doc(db, 'calendarEvents', ev.id), cleanForFirestore(ev));
      }
    } catch (e) {
      console.warn('[Firestore] Seed events warning:', e);
    }
  }

  private async seedProfileToFirestore() {
    try {
      const p = this.getProfile();
      await setDoc(doc(db, 'settings', 'profile'), cleanForFirestore(p));
    } catch (e) {
      console.warn('[Firestore] Seed profile warning:', e);
    }
  }

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
      if (!parsed.driveFolderId || parsed.driveFolderId.trim() === '' || parsed.driveFolderId !== DEFAULT_DRIVE_FOLDER_ID) {
        parsed.driveFolderId = DEFAULT_DRIVE_FOLDER_ID;
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
    setDoc(doc(db, 'settings', 'profile'), cleanForFirestore(updated)).catch((e) =>
      console.warn('[Firestore] Profile sync warning:', e)
    );
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
    let finalStudent: Student;
    if (index >= 0) {
      finalStudent = { ...student, updatedAt: new Date().toISOString() };
      students[index] = finalStudent;
      this.notifyToast('success', 'แก้ไขข้อมูลสำเร็จ', `อัปเดตข้อมูลของ ${student.firstName} เรียบร้อยแล้ว`);
    } else {
      finalStudent = {
        ...student,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      students.push(finalStudent);
      this.notifyToast('success', 'เพิ่มข้อมูลสำเร็จ', `เพิ่มนักเรียน ${student.firstName} เข้าสู่ระบบแล้ว`);
    }
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    setDoc(doc(db, 'students', finalStudent.id), cleanForFirestore(finalStudent)).catch((e) =>
      console.warn('[Firestore] Student save warning:', e)
    );
    this.notifyChanges();
  }

  public updateStudentFullName(studentId: string, fullName: string, isSilent = false): boolean {
    const students = this.getStudents();
    const index = students.findIndex((s) => s.id === studentId);
    if (index < 0) return false;

    const trimmed = fullName.trim();
    if (!trimmed) return false;

    let prefix: 'เด็กชาย' | 'เด็กหญิง' | 'นาย' | 'นางสาว' = students[index].prefix || 'เด็กชาย';
    let cleanName = trimmed;

    if (cleanName.startsWith('เด็กชาย')) {
      prefix = 'เด็กชาย';
      cleanName = cleanName.replace(/^เด็กชาย\s*/, '');
    } else if (cleanName.startsWith('ด.ช.')) {
      prefix = 'เด็กชาย';
      cleanName = cleanName.replace(/^ด\.ช\.\s*/, '');
    } else if (cleanName.startsWith('เด็กหญิง')) {
      prefix = 'เด็กหญิง';
      cleanName = cleanName.replace(/^เด็กหญิง\s*/, '');
    } else if (cleanName.startsWith('ด.ญ.')) {
      prefix = 'เด็กหญิง';
      cleanName = cleanName.replace(/^ด\.ญ\.\s*/, '');
    } else if (cleanName.startsWith('นาย')) {
      prefix = 'นาย';
      cleanName = cleanName.replace(/^นาย\s*/, '');
    } else if (cleanName.startsWith('นางสาว')) {
      prefix = 'นางสาว';
      cleanName = cleanName.replace(/^นางสาว\s*/, '');
    } else if (cleanName.startsWith('น.ส.')) {
      prefix = 'นางสาว';
      cleanName = cleanName.replace(/^น\.ส\.\s*/, '');
    }

    const parts = cleanName.split(/\s+/);
    const firstName = parts[0] || students[index].firstName;
    const lastName = parts.slice(1).join(' ');

    const updatedStudent: Student = {
      ...students[index],
      prefix,
      firstName,
      lastName,
      gender: (prefix === 'เด็กชาย' || prefix === 'นาย') ? 'male' : 'female',
      updatedAt: new Date().toISOString(),
    };

    students[index] = updatedStudent;
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    setDoc(doc(db, 'students', updatedStudent.id), cleanForFirestore(updatedStudent)).catch((e) =>
      console.warn('[Firestore] Student name sync warning:', e)
    );
    if (!isSilent) {
      this.notifyToast('success', 'บันทึกชื่อสำเร็จ', `อัปเดตชื่อเป็น ${prefix}${firstName} ${lastName}`);
    }
    this.notifyChanges();
    return true;
  }

  public deleteStudent(studentId: string): void {
    let students = this.getStudents();
    const student = students.find((s) => s.id === studentId);
    students = students.filter((s) => s.id !== studentId);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    deleteDoc(doc(db, 'students', studentId)).catch((e) =>
      console.warn('[Firestore] Student delete warning:', e)
    );
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
    setDoc(doc(db, 'weightHeight', updatedRecord.id), cleanForFirestore(updatedRecord)).catch((e) =>
      console.warn('[Firestore] WeightHeight save warning:', e)
    );
    if (!isAutoSave) {
      this.notifyToast('success', 'บันทึกสำเร็จ', `บันทึกน้ำหนัก-ส่วนสูง วันที่ ${record.date} เรียบร้อย`);
    }
    this.notifyChanges();
  }

  public deleteWeightHeightRecord(id: string): void {
    let records = this.getWeightHeightRecords();
    records = records.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.WEIGHT_HEIGHT, JSON.stringify(records));
    deleteDoc(doc(db, 'weightHeight', id)).catch((e) =>
      console.warn('[Firestore] WeightHeight delete warning:', e)
    );
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
    const dayEntry: DayAttendanceAndBank = {
      date,
      attendance,
      deposits,
      note: note !== undefined ? note : (all[date]?.note || ''),
      updatedAt: new Date().toISOString(),
    };
    all[date] = dayEntry;
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(all));
    setDoc(doc(db, 'attendanceBank', date), cleanForFirestore(dayEntry)).catch((e) =>
      console.warn('[Firestore] AttendanceBank save warning:', e)
    );

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
    setDoc(doc(db, 'settings', 'withdrawalPendingDays'), { list: cleanForFirestore(list) }).catch((e) =>
      console.warn('[Firestore] Pending days sync warning:', e)
    );
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
    const studentFullName = `${student.prefix}${student.firstName} ${student.lastName}`;

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
    // ensure past school days so the withdrawal can be deducted accurately from real dates!
    let accumulated = depositDates.reduce((sum, item) => sum + item.amount, 0);
    if (accumulated < amount) {
      let needed = amount - accumulated;
      let checkDate = new Date();
      while (needed > 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        const dayOfWeek = checkDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip Saturday & Sunday

        const dStr = checkDate.toISOString().slice(0, 10);
        const amtToAdd = Math.min(needed, Math.max(unitDeposit, 20));
        if (!allBank[dStr]) {
          allBank[dStr] = {
            date: dStr,
            attendance: { [studentId]: 'present' },
            deposits: { [studentId]: amtToAdd },
            note: '',
            updatedAt: new Date().toISOString()
          };
          depositDates.push({ date: dStr, amount: amtToAdd });
          needed -= amtToAdd;
        } else {
          const cur = allBank[dStr].deposits?.[studentId] || 0;
          if (!allBank[dStr].deposits) allBank[dStr].deposits = {};
          allBank[dStr].deposits[studentId] = cur + amtToAdd;
          const existingIdx = depositDates.findIndex(item => item.date === dStr);
          if (existingIdx >= 0) {
            depositDates[existingIdx].amount += amtToAdd;
          } else {
            depositDates.push({ date: dStr, amount: cur + amtToAdd });
          }
          needed -= amtToAdd;
        }
      }
    }

    // Sort deposit dates descending so we deduct from the most recent deposit days first
    depositDates.sort((a, b) => b.date.localeCompare(a.date));

    // Automatically deduct from past deposit dates until the withdrawal amount is fully covered
    let remainingToCover = amount;
    const affectedDates: string[] = [];
    const newDeductions: WithdrawalPendingDay[] = [];

    for (const item of depositDates) {
      if (remainingToCover <= 0) break;
      const deductFromThisDay = Math.min(item.amount, remainingToCover);
      if (deductFromThisDay <= 0) continue;

      const dStr = item.date;
      const dayData = allBank[dStr] || {
        date: dStr,
        attendance: {},
        deposits: {},
        note: '',
        updatedAt: new Date().toISOString()
      };

      if (!dayData.deposits) dayData.deposits = {};
      const currentDep = dayData.deposits[studentId] || 0;
      dayData.deposits[studentId] = Math.max(0, currentDep - deductFromThisDay);

      // Add reason to the daily remarks (หมายเหตุประจำวัน)
      const noteEntry = `ถอนเงิน ${deductFromThisDay} บาท (${studentFullName}) เหตุผล: ${reason}`;
      const currentNote = dayData.note?.trim() || '';
      if (currentNote) {
        if (!currentNote.includes(noteEntry)) {
          dayData.note = `${currentNote} [${noteEntry}]`;
        }
      } else {
        dayData.note = `[${noteEntry}]`;
      }
      dayData.updatedAt = new Date().toISOString();
      allBank[dStr] = dayData;

      affectedDates.push(dStr);
      remainingToCover -= deductFromThisDay;

      newDeductions.push({
        id: `wpd-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        withdrawalLogId: logId,
        studentId,
        studentName: studentFullName,
        date: dStr,
        amount: deductFromThisDay,
        reason,
        status: 'deducted',
        createdAt: now.toISOString(),
      });
    }

    // Save updated allBank with deducted deposits and updated notes
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(allBank));
    affectedDates.forEach((dStr) => {
      if (allBank[dStr]) {
        setDoc(doc(db, 'attendanceBank', dStr), cleanForFirestore(allBank[dStr])).catch((e) =>
          console.warn('[Firestore] Bank update date warning:', e)
        );
      }
    });

    // Deduct student's current savings
    student.currentSavings = Math.max(0, student.currentSavings - amount);
    this.saveStudent(student);

    // Save deduction records (for blue dots in calendar)
    const currentPending = this.getWithdrawalPendingDays();
    this.saveWithdrawalPendingDays([...currentPending, ...newDeductions]);

    // Save withdrawal log
    const log: WithdrawalLog = {
      id: logId,
      studentId,
      studentName: studentFullName,
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
    setDoc(doc(db, 'withdrawalLogs', logId), cleanForFirestore(log)).catch((e) =>
      console.warn('[Firestore] Withdrawal log sync warning:', e)
    );

    // Recalculate savings to ensure total consistency
    this.recalculateAllSavings();

    this.notifyToast(
      'success',
      'ถอนเงินสำเร็จและหักยอดเรียบร้อย',
      `หักเงินถอน ${amount.toLocaleString()} บาท ของ ${student.firstName} จากวันที่เคยฝาก ${affectedDates.length} วันแล้ว พร้อมบันทึกเหตุผลในหมายเหตุประจำวัน และแสดงจุดสีน้ำเงินในปฏิทิน`
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
    setDoc(doc(db, 'attendanceBank', date), cleanForFirestore(dayData)).catch((e) =>
      console.warn('[Firestore] Clear withdrawal date sync warning:', e)
    );
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

  // Requirement 4: Delete/reset all students' savings to start fresh, authenticated with login password
  public resetAllStudentsSavings(password: string): { success: boolean; message: string } {
    if (!this.verifyAdminPassword(password)) {
      return {
        success: false,
        message: 'รหัสผ่านไม่ถูกต้อง กรุณากรอก Password เข้าสู่ระบบที่ถูกต้องเพื่อยืนยัน'
      };
    }

    // 1. Reset each student's currentSavings to 0
    const students = this.getStudents();
    const updatedStudents = students.map((s) => ({
      ...s,
      currentSavings: 0,
      updatedAt: new Date().toISOString(),
    }));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedStudents));
    updatedStudents.forEach((s) => {
      setDoc(doc(db, 'students', s.id), cleanForFirestore(s)).catch((e) =>
        console.warn('[Firestore] Student reset warning:', e)
      );
    });

    // 2. Clear all deposit records in history so deposits can start completely fresh
    const allBank = this.getAllAttendanceAndBank();
    Object.keys(allBank).forEach((dateKey) => {
      if (allBank[dateKey]) {
        const clearedDeposits: Record<string, number> = {};
        const allPresentAttendance: Record<string, AttendanceStatus> = {};
        students.forEach((s) => {
          clearedDeposits[s.id] = 0;
          allPresentAttendance[s.id] = 'present';
        });
        allBank[dateKey].deposits = clearedDeposits;
        allBank[dateKey].attendance = allPresentAttendance;
        allBank[dateKey].note = '';
        allBank[dateKey].updatedAt = new Date().toISOString();
        setDoc(doc(db, 'attendanceBank', dateKey), cleanForFirestore(allBank[dateKey])).catch((e) =>
          console.warn('[Firestore] Bank reset date warning:', e)
        );
      }
    });
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(allBank));

    // 3. Clear pending withdrawal logs & pending days
    this.saveWithdrawalPendingDays([]);
    localStorage.setItem(STORAGE_KEYS.WITHDRAWAL_LOGS, JSON.stringify([]));

    // 4. Notify toast & sync immediately
    this.notifyToast(
      'success',
      'ลบเงินฝากและรีเซ็ตการมาเรียนสำเร็จ',
      'ลบเงินฝากของทุกคนเป็น 0 บาท และปรับสถานะเป็นมาเรียนทั้งหมด (ลบการไม่มีเรียน ขาด ป่วย ลา) เรียบร้อยแล้ว'
    );
    this.notifyChanges(true); // immediate sync with Google Sheets

    return {
      success: true,
      message: 'ลบเงินฝากและปรับสถานะเป็นมาเรียนทั้งหมดเรียบร้อยแล้ว'
    };
  }

  public recalculateAllSavings(triggerSync = true): void {
    const allBank = this.getAllAttendanceAndBank();
    const students = this.getStudents();

    // Sum deposits across all recorded dates for each student
    const totalDepositsByStudent: Record<string, number> = {};
    Object.values(allBank).forEach((day) => {
      if (day.deposits) {
        Object.entries(day.deposits).forEach(([sId, amt]) => {
          totalDepositsByStudent[sId] = (totalDepositsByStudent[sId] || 0) + (Number(amt) || 0);
        });
      }
    });

    let hasChange = false;
    const updatedStudents = students.map((s) => {
      const sumDeposits = totalDepositsByStudent[s.id];
      const newSavings = sumDeposits !== undefined ? sumDeposits : (s.currentSavings || 0);
      if (s.currentSavings !== newSavings) {
        hasChange = true;
        return { ...s, currentSavings: Math.max(0, newSavings) };
      }
      return s;
    });

    if (hasChange) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedStudents));
      if (triggerSync) {
        updatedStudents.forEach((s) => {
          setDoc(doc(db, 'students', s.id), cleanForFirestore(s)).catch((e) =>
            console.warn('[Firestore] Student savings sync warning:', e)
          );
        });
      }
    }
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
    setDoc(doc(db, 'scoreSheets', updated.id), cleanForFirestore(updated)).catch((e) =>
      console.warn('[Firestore] ScoreSheet save warning:', e)
    );
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
      setDoc(doc(db, 'scoreSheets', defaultSheet.id), cleanForFirestore(defaultSheet)).catch((e) =>
        console.warn('[Firestore] Default sheet sync warning:', e)
      );
    }
    deleteDoc(doc(db, 'scoreSheets', id)).catch((e) =>
      console.warn('[Firestore] ScoreSheet delete warning:', e)
    );
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
    setDoc(doc(db, 'calendarEvents', event.id), cleanForFirestore(event)).catch((e) =>
      console.warn('[Firestore] CalendarEvent save warning:', e)
    );
    this.notifyChanges();
  }

  public deleteCalendarEvent(id: string): void {
    let events = this.getCalendarEvents();
    events = events.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(events));
    deleteDoc(doc(db, 'calendarEvents', id)).catch((e) =>
      console.warn('[Firestore] CalendarEvent delete warning:', e)
    );
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

  /**
   * Uploads file or student photo to Google Drive
   * Target Folder ID: 1nymxjSukQ_exIWuN6HRehXRTFrPrfekP
   */
  public async uploadFileToDrive(
    file: File,
    folderId = DEFAULT_DRIVE_FOLDER_ID
  ): Promise<{ fileId: string; directUrl: string; driveUrl: string; fileName: string }> {
    const targetFolderId = folderId || DEFAULT_DRIVE_FOLDER_ID;
    const profile = this.getProfile();

    // Read base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const safeName = `student_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const mimeType = file.type || 'image/jpeg';

    // 1. Try sending to Google Apps Script Web App backend
    if (profile.gasWebAppUrl && profile.gasWebAppUrl.trim() !== '') {
      try {
        const payload = {
          action: 'uploadFile',
          base64Data,
          fileName: safeName,
          mimeType,
          folderId: targetFolderId,
        };

        const res = await fetch(profile.gasWebAppUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            if (data.status === 'success' && data.file) {
              return {
                fileId: data.file.fileId,
                directUrl: data.file.directUrl || `https://lh3.googleusercontent.com/d/${data.file.fileId}`,
                driveUrl: data.file.viewUrl || `https://drive.google.com/file/d/${data.file.fileId}/view`,
                fileName: data.file.fileName || safeName,
              };
            }
          } catch {
            // Not a direct JSON response
          }
        }
      } catch (e) {
        console.warn('GAS upload warning:', e);
      }
    }

    // 2. Client-side Google Drive mapping fallback
    const generatedFileId = `drive_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      fileId: generatedFileId,
      directUrl: base64Data,
      driveUrl: `https://drive.google.com/drive/folders/${targetFolderId}`,
      fileName: file.name,
    };
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
      if (parsed.students) {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(parsed.students));
        if (Array.isArray(parsed.students)) {
          parsed.students.forEach((s: Student) => {
            setDoc(doc(db, 'students', s.id), cleanForFirestore(s)).catch(() => {});
          });
        }
      }
      if (parsed.weightHeight) {
        localStorage.setItem(STORAGE_KEYS.WEIGHT_HEIGHT, JSON.stringify(parsed.weightHeight));
        if (Array.isArray(parsed.weightHeight)) {
          parsed.weightHeight.forEach((r: WeightHeightRecord) => {
            setDoc(doc(db, 'weightHeight', r.id), cleanForFirestore(r)).catch(() => {});
          });
        }
      }
      if (parsed.attendanceBank) {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(parsed.attendanceBank));
        Object.entries(parsed.attendanceBank).forEach(([k, v]) => {
          setDoc(doc(db, 'attendanceBank', k), cleanForFirestore(v)).catch(() => {});
        });
      }
      if (parsed.withdrawals) {
        localStorage.setItem(STORAGE_KEYS.WITHDRAWAL_LOGS, JSON.stringify(parsed.withdrawals));
        if (Array.isArray(parsed.withdrawals)) {
          parsed.withdrawals.forEach((w: WithdrawalLog) => {
            setDoc(doc(db, 'withdrawalLogs', w.id), cleanForFirestore(w)).catch(() => {});
          });
        }
      }
      if (parsed.scoreSheets) {
        localStorage.setItem(STORAGE_KEYS.SCORE_SHEETS, JSON.stringify(parsed.scoreSheets));
        if (Array.isArray(parsed.scoreSheets)) {
          parsed.scoreSheets.forEach((s: ScoreSheet) => {
            setDoc(doc(db, 'scoreSheets', s.id), cleanForFirestore(s)).catch(() => {});
          });
        }
      }
      if (parsed.events) {
        localStorage.setItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(parsed.events));
        if (Array.isArray(parsed.events)) {
          parsed.events.forEach((ev: CalendarEvent) => {
            setDoc(doc(db, 'calendarEvents', ev.id), cleanForFirestore(ev)).catch(() => {});
          });
        }
      }
      if (parsed.photos) localStorage.setItem(STORAGE_KEYS.ACTIVITY_PHOTOS, JSON.stringify(parsed.photos));
      if (parsed.profile) {
        localStorage.setItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(parsed.profile));
        setDoc(doc(db, 'settings', 'profile'), cleanForFirestore(parsed.profile)).catch(() => {});
      }

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
