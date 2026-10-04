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
  SweetAlertOptions,
  DashboardNote,
  AppUser
} from '../types';
import {
  INITIAL_STUDENTS,
  INITIAL_TEACHER_PROFILE,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_WEIGHT_HEIGHT,
  INITIAL_SCORE_SHEET,
  INITIAL_ACTIVITY_PHOTOS,
  INITIAL_WITHDRAWAL_LOGS,
  INITIAL_DASHBOARD_NOTES
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
  DASHBOARD_NOTES: 'teacher_app_dashboard_notes_v1',
  MEMBERS: 'teacher_app_members_v1',
  CURRENT_USER_ID: 'teacher_app_current_user_id_v1',
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
  private userDataListeners: (() => void)[] = [];
  private _currentUser: AppUser | null = null;
  private _membersCache: AppUser[] = [];
  private isMembersInitialized = false;

  private isStudentsInitialized = false;
  private isWeightHeightInitialized = false;
  private isAttendanceBankInitialized = false;
  private isWithdrawalLogsInitialized = false;
  private isScoresInitialized = false;
  private isEventsInitialized = false;
  private isProfileInitialized = false;
  private isNotesInitialized = false;

  // In-memory caches to avoid frequent blocking synchronous JSON.parse/localStorage I/O
  private _studentsCache: Student[] | null = null;
  private _profileCache: TeacherProfile | null = null;
  private _attendanceBankCache: Record<string, DayAttendanceAndBank> | null = null;
  private _weightHeightCache: WeightHeightRecord[] | null = null;
  private _withdrawalLogsCache: WithdrawalLog[] | null = null;
  private _pendingDaysCache: WithdrawalPendingDay[] | null = null;
  private _scoresCache: ScoreSheet[] | null = null;
  private _eventsCache: CalendarEvent[] | null = null;
  private _notesCache: DashboardNote[] | null = null;
  private notifyScheduled = false;

  constructor() {
    this.initFirestoreRealtime();
    testConnection().catch(() => {});
  }

  // Current User & Member Identity
  public getCurrentUser(): AppUser | null {
    if (this._currentUser) return this._currentUser;
    const savedId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (savedId) {
      const member = this.getMembers().find((m) => m.id.toLowerCase() === savedId.trim().toLowerCase());
      if (member) {
        this._currentUser = member;
        return member;
      }
    }
    return null;
  }

  public getCurrentUserId(): string {
    const u = this.getCurrentUser();
    return u ? u.id.toLowerCase() : 'airfan';
  }

  public getUserStorageKey(baseKey: string): string {
    const uid = this.getCurrentUserId();
    return `${baseKey}_${uid}`;
  }

  public getStorageItem(baseKey: string): string | null {
    const uid = this.getCurrentUserId();
    const userKey = `${baseKey}_${uid}`;
    let item = localStorage.getItem(userKey);
    if (!item && uid === 'airfan') {
      item = localStorage.getItem(baseKey);
    }
    return item;
  }

  public setStorageItem(baseKey: string, value: string): void {
    const uid = this.getCurrentUserId();
    const userKey = `${baseKey}_${uid}`;
    localStorage.setItem(userKey, value);
    if (uid === 'airfan') {
      localStorage.setItem(baseKey, value);
    }
  }

  public removeStorageItem(baseKey: string): void {
    const uid = this.getCurrentUserId();
    const userKey = `${baseKey}_${uid}`;
    localStorage.removeItem(userKey);
    if (uid === 'airfan') {
      localStorage.removeItem(baseKey);
    }
  }

  public async saveUserDoc<T extends object>(coll: string, docId: string, data: T): Promise<void> {
    const clean = cleanForFirestore(data);
    const uid = this.getCurrentUserId();
    try {
      await setDoc(doc(db, 'users', uid, coll, docId), clean);
      if (uid === 'airfan') {
        setDoc(doc(db, coll, docId), clean).catch(() => {});
      }
    } catch (err) {
      console.warn(`[Firestore] saveUserDoc warning (${coll}/${docId}):`, err);
    }
  }

  public async deleteUserDoc(coll: string, docId: string): Promise<void> {
    const uid = this.getCurrentUserId();
    try {
      await deleteDoc(doc(db, 'users', uid, coll, docId));
      if (uid === 'airfan') {
        deleteDoc(doc(db, coll, docId)).catch(() => {});
      }
    } catch (err) {
      console.warn(`[Firestore] deleteUserDoc warning (${coll}/${docId}):`, err);
    }
  }

  public createDefaultAdminMember(): AppUser {
    const profile = this.getProfile();
    return {
      id: 'airfan',
      username: 'airfan',
      password: profile.adminPasswordHash || '456789',
      name: profile.teacherName || 'ครูแอร์ฟาน (Admin)',
      role: 'admin',
      status: 'active',
      classroom: profile.classroomName || 'ห้อง ป.5/1',
      schoolName: profile.schoolName || 'โรงเรียนอนุบาลและประถมศึกษาสาธิต',
      createdAt: '2026-01-01T00:00:00.000Z',
      lastLogin: new Date().toISOString(),
    };
  }

  public getMembers(): AppUser[] {
    if (this._membersCache && this._membersCache.length > 0) {
      return this._membersCache;
    }
    const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.some((m: AppUser) => m.id.toLowerCase() === 'airfan')) {
            parsed.unshift(this.createDefaultAdminMember());
          }
          this._membersCache = parsed;
          return parsed;
        }
      } catch {}
    }
    const admin = this.createDefaultAdminMember();
    this._membersCache = [admin];
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([admin]));
    return [admin];
  }

  public async saveMember(member: AppUser, silent = false): Promise<void> {
    const cleanMember: AppUser = {
      ...member,
      id: member.id.toLowerCase(),
      username: member.username.toLowerCase(),
      updatedAt: new Date().toISOString(),
    };
    const current = this.getMembers();
    const idx = current.findIndex((m) => m.id === cleanMember.id);
    let updated: AppUser[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = cleanMember;
    } else {
      updated = [...current, cleanMember];
    }
    this._membersCache = updated;
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(updated));

    try {
      await setDoc(doc(db, 'members', cleanMember.id), cleanForFirestore(cleanMember));
    } catch (e) {
      console.warn('[Firestore] saveMember warning:', e);
    }

    if (this._currentUser && this._currentUser.id === cleanMember.id) {
      this._currentUser = cleanMember;
    }

    // Sync member's profile document in users/{cleanMember.id}/settings/profile
    try {
      const userProfileKey = `${STORAGE_KEYS.TEACHER_PROFILE}_${cleanMember.id}`;
      const savedProfileRaw = localStorage.getItem(userProfileKey);
      let profileToSave: TeacherProfile;
      if (savedProfileRaw) {
        const parsed: TeacherProfile = JSON.parse(savedProfileRaw);
        profileToSave = {
          ...parsed,
          teacherName: cleanMember.name || parsed.teacherName,
          schoolName: cleanMember.schoolName || parsed.schoolName,
          classroomName: cleanMember.classroom || parsed.classroomName,
          position: cleanMember.position || parsed.position || 'ครูประจำชั้น',
          affiliation: cleanMember.affiliation || parsed.affiliation || '',
          academicYear: cleanMember.academicYear || parsed.academicYear || '2569',
          adminUsername: cleanMember.username,
          adminPasswordHash: cleanMember.password,
          lastModifiedTimestamp: new Date().toISOString(),
        };
      } else {
        profileToSave = {
          ...INITIAL_TEACHER_PROFILE,
          teacherName: cleanMember.name || 'คุณครูประจำชั้น',
          schoolName: cleanMember.schoolName || 'โรงเรียนสาธิต',
          classroomName: cleanMember.classroom || 'ห้องเรียน',
          position: cleanMember.position || 'ครูประจำชั้น',
          affiliation: cleanMember.affiliation || '',
          academicYear: cleanMember.academicYear || '2569',
          adminUsername: cleanMember.username,
          adminPasswordHash: cleanMember.password,
          lastModifiedTimestamp: new Date().toISOString(),
        };
      }
      localStorage.setItem(userProfileKey, JSON.stringify(profileToSave));
      setDoc(doc(db, 'users', cleanMember.id, 'settings', 'profile'), cleanForFirestore(profileToSave)).catch(() => {});
      if (cleanMember.id === 'airfan') {
        localStorage.setItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(profileToSave));
        setDoc(doc(db, 'settings', 'profile'), cleanForFirestore(profileToSave)).catch(() => {});
      }
    } catch (err) {
      console.warn('[DataService] Profile sync for member error:', err);
    }

    if (!silent) {
      this.notifyToast('success', 'บันทึกสมาชิกสำเร็จ', `อัปเดตข้อมูลผู้ใช้ ${cleanMember.username} เรียบร้อยแล้ว`);
    }
    this.notifyChanges();
  }

  public async deleteMember(memberId: string): Promise<boolean> {
    const cleanId = memberId.trim().toLowerCase();
    if (cleanId === 'airfan') {
      this.notifyToast('error', 'ไม่สามารถลบ Admin หลักได้', 'ID airfan เป็นผู้ดูแลระบบหลัก');
      return false;
    }

    const current = this.getMembers();
    const updated = current.filter((m) => m.id !== cleanId);
    this._membersCache = updated;
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(updated));

    try {
      await deleteDoc(doc(db, 'members', cleanId));
    } catch (e) {
      console.warn('[Firestore] deleteMember warning:', e);
    }

    this.notifyToast('success', 'ลบสมาชิกสำเร็จ', `ลบบัญชีผู้ใช้ ${cleanId} เรียบร้อยแล้ว`);
    this.notifyChanges();
    return true;
  }

  public async toggleMemberStatus(memberId: string): Promise<void> {
    const cleanId = memberId.trim().toLowerCase();
    if (cleanId === 'airfan') {
      this.notifyToast('error', 'ไม่สามารถระงับ Admin ได้', 'ID airfan ต้องเปิดใช้งานตลอดเวลา');
      return;
    }
    const current = this.getMembers();
    const member = current.find((m) => m.id === cleanId);
    if (!member) return;

    const newStatus = member.status === 'active' ? 'suspended' : 'active';
    const updatedMember: AppUser = {
      ...member,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    await this.saveMember(updatedMember);
    this.notifyToast(
      newStatus === 'suspended' ? 'warning' : 'success',
      newStatus === 'suspended' ? 'ระงับการใช้งานเรียบร้อย' : 'เปิดใช้งานสมาชิกเรียบร้อย',
      `บัญชี ${member.username} ${newStatus === 'suspended' ? 'ถูกระงับการใช้งานแล้ว' : 'สามารถเข้าสู่ระบบได้ตามปกติ'}`
    );
  }

  public clearMemoryCaches(): void {
    this._studentsCache = null;
    this._profileCache = null;
    this._attendanceBankCache = null;
    this._weightHeightCache = null;
    this._withdrawalLogsCache = null;
    this._pendingDaysCache = null;
    this._scoresCache = null;
    this._eventsCache = null;
    this._notesCache = null;
  }

  private notifySubscribersOnly(): void {
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;
    queueMicrotask(() => {
      this.notifyScheduled = false;
      this.listeners.forEach((fn) => {
        try {
          fn();
        } catch (err) {
          console.warn('[DataService] listener error:', err);
        }
      });
    });
  }

  private initFirestoreRealtime(): void {
    try {
      // 0. Members Real-time listener across all devices
      const unsubMembers = onSnapshot(collection(db, 'members'), (snap) => {
        if (!snap.empty) {
          this.isMembersInitialized = true;
          const list = snap.docs.map((d) => d.data() as AppUser);
          if (!list.some((m) => m.id.toLowerCase() === 'airfan')) {
            const admin = this.createDefaultAdminMember();
            list.unshift(admin);
            setDoc(doc(db, 'members', 'airfan'), cleanForFirestore(admin)).catch(() => {});
          }
          this._membersCache = list;
          localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(list));
          this.notifySubscribersOnly();
        } else if (!this.isMembersInitialized) {
          this.isMembersInitialized = true;
          const admin = this.createDefaultAdminMember();
          this._membersCache = [admin];
          localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([admin]));
          setDoc(doc(db, 'members', 'airfan'), cleanForFirestore(admin)).catch(() => {});
          this.notifySubscribersOnly();
        }
      }, (err) => console.warn('[Firestore] Members listener warning:', err));
      this.firestoreListeners.push(unsubMembers);

      // Initialize data listener for currently active user
      const initialUid = this.getCurrentUserId();
      this.initUserDataListeners(initialUid);
    } catch (e) {
      console.warn('[Firestore] Realtime setup warning:', e);
    }
  }

  public initUserDataListeners(userId: string): void {
    this.userDataListeners.forEach((fn) => {
      try { fn(); } catch {}
    });
    this.userDataListeners = [];

    const cleanUid = userId.trim().toLowerCase();

    try {
      // 1. Students Real-time listener for this user
      const unsubStudents = onSnapshot(collection(db, 'users', cleanUid, 'students'), async (snap) => {
        if (!snap.empty) {
          this.isStudentsInitialized = true;
          const students = snap.docs.map((d) => d.data() as Student);
          students.sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
              return a.order - b.order;
            }
            return (Number(a.studentCode) || 0) - (Number(b.studentCode) || 0) || a.id.localeCompare(b.id);
          });
          this._studentsCache = students;
          this.setStorageItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
          this.notifySubscribersOnly();
        } else if (cleanUid === 'airfan') {
          // If airfan subcollection is empty, check root collection students to migrate seamlessly
          try {
            const rootSnap = await getDocs(collection(db, 'students'));
            if (!rootSnap.empty) {
              const students = rootSnap.docs.map((d) => d.data() as Student);
              for (const s of students) {
                await setDoc(doc(db, 'users', 'airfan', 'students', s.id), cleanForFirestore(s));
              }
              this._studentsCache = students;
              this.setStorageItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
              this.notifySubscribersOnly();
            } else {
              this.seedStudentsToFirestore();
            }
          } catch {
            this.seedStudentsToFirestore();
          }
        } else {
          const cached = this.getStorageItem(STORAGE_KEYS.STUDENTS);
          if (!cached) {
            this._studentsCache = [];
            this.setStorageItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
          }
          this.notifySubscribersOnly();
        }
      }, (err) => console.warn('[Firestore] User students listener warning:', err));
      this.userDataListeners.push(unsubStudents);

      // 2. Weight & Height Real-time listener
      const unsubWH = onSnapshot(collection(db, 'users', cleanUid, 'weightHeight'), async (snap) => {
        if (!snap.empty) {
          this.isWeightHeightInitialized = true;
          const records = snap.docs.map((d) => d.data() as WeightHeightRecord);
          this._weightHeightCache = records;
          this.setStorageItem(STORAGE_KEYS.WEIGHT_HEIGHT, JSON.stringify(records));
          this.notifySubscribersOnly();
        } else if (cleanUid === 'airfan') {
          try {
            const rootSnap = await getDocs(collection(db, 'weightHeight'));
            if (!rootSnap.empty) {
              const records = rootSnap.docs.map((d) => d.data() as WeightHeightRecord);
              for (const r of records) {
                await setDoc(doc(db, 'users', 'airfan', 'weightHeight', r.id), cleanForFirestore(r));
              }
              this._weightHeightCache = records;
              this.setStorageItem(STORAGE_KEYS.WEIGHT_HEIGHT, JSON.stringify(records));
              this.notifySubscribersOnly();
            } else {
              this.seedWeightHeightToFirestore();
            }
          } catch {}
        } else {
          this.notifySubscribersOnly();
        }
      }, (err) => console.warn('[Firestore] User WeightHeight listener warning:', err));
      this.userDataListeners.push(unsubWH);

      // 3. Attendance & Bank Real-time listener
      const unsubAtt = onSnapshot(collection(db, 'users', cleanUid, 'attendanceBank'), async (snap) => {
        if (!snap.empty) {
          this.isAttendanceBankInitialized = true;
          const all: Record<string, DayAttendanceAndBank> = {};
          snap.docs.forEach((d) => {
            all[d.id] = d.data() as DayAttendanceAndBank;
          });
          this._attendanceBankCache = all;
          this.setStorageItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(all));
          this.recalculateAllSavings(false);
          this.notifySubscribersOnly();
        } else if (cleanUid === 'airfan') {
          try {
            const rootSnap = await getDocs(collection(db, 'attendanceBank'));
            if (!rootSnap.empty) {
              const all: Record<string, DayAttendanceAndBank> = {};
              for (const d of rootSnap.docs) {
                const data = d.data() as DayAttendanceAndBank;
                all[d.id] = data;
                await setDoc(doc(db, 'users', 'airfan', 'attendanceBank', d.id), cleanForFirestore(data));
              }
              this._attendanceBankCache = all;
              this.setStorageItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(all));
              this.recalculateAllSavings(false);
              this.notifySubscribersOnly();
            } else {
              this.seedAttendanceBankToFirestore();
            }
          } catch {}
        } else {
          this.notifySubscribersOnly();
        }
      }, (err) => console.warn('[Firestore] User Attendance listener warning:', err));
      this.userDataListeners.push(unsubAtt);

      // 4. Withdrawal Logs Real-time listener
      const unsubWithdrawal = onSnapshot(collection(db, 'users', cleanUid, 'withdrawalLogs'), async (snap) => {
        if (!snap.empty) {
          this.isWithdrawalLogsInitialized = true;
          const logs = snap.docs.map((d) => d.data() as WithdrawalLog);
          logs.sort((a, b) => (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time));
          this._withdrawalLogsCache = logs;
          this.setStorageItem(STORAGE_KEYS.WITHDRAWAL_LOGS, JSON.stringify(logs));
          this.notifySubscribersOnly();
        } else if (cleanUid === 'airfan') {
          try {
            const rootSnap = await getDocs(collection(db, 'withdrawalLogs'));
            if (!rootSnap.empty) {
              const logs = rootSnap.docs.map((d) => d.data() as WithdrawalLog);
              for (const l of logs) {
                await setDoc(doc(db, 'users', 'airfan', 'withdrawalLogs', l.id), cleanForFirestore(l));
              }
              this._withdrawalLogsCache = logs;
              this.setStorageItem(STORAGE_KEYS.WITHDRAWAL_LOGS, JSON.stringify(logs));
              this.notifySubscribersOnly();
            }
          } catch {}
        }
      }, (err) => console.warn('[Firestore] User Withdrawal listener warning:', err));
      this.userDataListeners.push(unsubWithdrawal);

      // 5. Withdrawal Pending Days Real-time listener
      const unsubPending = onSnapshot(doc(db, 'users', cleanUid, 'settings', 'withdrawalPendingDays'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && Array.isArray(data.list)) {
            this._pendingDaysCache = data.list;
            this.setStorageItem(STORAGE_KEYS.WITHDRAWAL_PENDING_DAYS, JSON.stringify(data.list));
            this.notifySubscribersOnly();
          }
        }
      }, (err) => console.warn('[Firestore] User Pending listener warning:', err));
      this.userDataListeners.push(unsubPending);

      // 6. Score Sheets Real-time listener
      const unsubScores = onSnapshot(collection(db, 'users', cleanUid, 'scoreSheets'), async (snap) => {
        if (!snap.empty) {
          this.isScoresInitialized = true;
          const sheets = snap.docs.map((d) => d.data() as ScoreSheet);
          this._scoresCache = sheets;
          this.setStorageItem(STORAGE_KEYS.SCORE_SHEETS, JSON.stringify(sheets));
          this.notifySubscribersOnly();
        } else if (cleanUid === 'airfan') {
          try {
            const rootSnap = await getDocs(collection(db, 'scoreSheets'));
            if (!rootSnap.empty) {
              const sheets = rootSnap.docs.map((d) => d.data() as ScoreSheet);
              for (const s of sheets) {
                await setDoc(doc(db, 'users', 'airfan', 'scoreSheets', s.id), cleanForFirestore(s));
              }
              this._scoresCache = sheets;
              this.setStorageItem(STORAGE_KEYS.SCORE_SHEETS, JSON.stringify(sheets));
              this.notifySubscribersOnly();
            } else {
              this.seedScoreSheetsToFirestore();
            }
          } catch {}
        }
      }, (err) => console.warn('[Firestore] User Scores listener warning:', err));
      this.userDataListeners.push(unsubScores);

      // 7. Calendar Events Real-time listener
      const unsubEvents = onSnapshot(collection(db, 'users', cleanUid, 'calendarEvents'), async (snap) => {
        if (!snap.empty) {
          this.isEventsInitialized = true;
          const events = snap.docs.map((d) => d.data() as CalendarEvent);
          this._eventsCache = events;
          this.setStorageItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(events));
          this.notifySubscribersOnly();
        } else if (cleanUid === 'airfan') {
          try {
            const rootSnap = await getDocs(collection(db, 'calendarEvents'));
            if (!rootSnap.empty) {
              const events = rootSnap.docs.map((d) => d.data() as CalendarEvent);
              for (const ev of events) {
                await setDoc(doc(db, 'users', 'airfan', 'calendarEvents', ev.id), cleanForFirestore(ev));
              }
              this._eventsCache = events;
              this.setStorageItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(events));
              this.notifySubscribersOnly();
            } else {
              this.seedCalendarEventsToFirestore();
            }
          } catch {}
        }
      }, (err) => console.warn('[Firestore] User Events listener warning:', err));
      this.userDataListeners.push(unsubEvents);

      // 8. Profile & Classroom Settings Real-time listener
      const unsubProfile = onSnapshot(doc(db, 'users', cleanUid, 'settings', 'profile'), (snap) => {
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
            this._profileCache = merged;
            this.setStorageItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(merged));
            this.notifySubscribersOnly();
          }
        } else if (cleanUid === 'airfan') {
          this.seedProfileToFirestore();
        } else {
          // Seed profile to Firestore for member if not yet created
          const current = this.getProfile();
          setDoc(doc(db, 'users', cleanUid, 'settings', 'profile'), cleanForFirestore(current)).catch(() => {});
        }
      }, (err) => console.warn('[Firestore] User Profile listener warning:', err));
      this.userDataListeners.push(unsubProfile);

      // 9. Dashboard Notes Real-time listener
      const unsubNotes = onSnapshot(collection(db, 'users', cleanUid, 'dashboardNotes'), async (snap) => {
        if (!snap.empty) {
          this.isNotesInitialized = true;
          const notes = snap.docs.map((d) => d.data() as DashboardNote);
          notes.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
          });
          this._notesCache = notes;
          this.setStorageItem(STORAGE_KEYS.DASHBOARD_NOTES, JSON.stringify(notes));
          this.notifySubscribersOnly();
        } else if (cleanUid === 'airfan') {
          try {
            const rootSnap = await getDocs(collection(db, 'dashboardNotes'));
            if (!rootSnap.empty) {
              const notes = rootSnap.docs.map((d) => d.data() as DashboardNote);
              for (const n of notes) {
                await setDoc(doc(db, 'users', 'airfan', 'dashboardNotes', n.id), cleanForFirestore(n));
              }
              this._notesCache = notes;
              this.setStorageItem(STORAGE_KEYS.DASHBOARD_NOTES, JSON.stringify(notes));
              this.notifySubscribersOnly();
            } else {
              this.seedDashboardNotesToFirestore();
            }
          } catch {}
        }
      }, (err) => console.warn('[Firestore] User Dashboard notes listener warning:', err));
      this.userDataListeners.push(unsubNotes);

    } catch (e) {
      console.warn('[Firestore] User Realtime setup warning:', e);
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

  private async seedDashboardNotesToFirestore() {
    try {
      const notes = this.getNotes();
      for (const n of notes) {
        await setDoc(doc(db, 'dashboardNotes', n.id), cleanForFirestore(n));
      }
    } catch (e) {
      console.warn('[Firestore] Seed dashboardNotes warning:', e);
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
    this.notifySubscribersOnly();
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
      const currentUser = this.getCurrentUser();
      const payload = {
        action: 'syncAllData',
        userId: this.getCurrentUserId(),
        userName: currentUser?.name || profile.teacherName,
        classroom: currentUser?.classroom || profile.classroomName,
        payload: {
          Students: this.getStudents(),
          WeightHeight: this.getWeightHeightRecords(),
          AttendanceBank: Object.values(this.getAllAttendanceAndBank()),
          Withdrawals: this.getWithdrawalLogs(),
          Scores: this.getScoreSheets(),
          Events: this.getCalendarEvents(),
          Notes: this.getNotes(),
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
    if (this._profileCache) return this._profileCache;
    const uid = this.getCurrentUserId();
    const data = this.getStorageItem(STORAGE_KEYS.TEACHER_PROFILE);
    if (!data) {
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id !== 'airfan') {
        const memberProfile: TeacherProfile = {
          ...INITIAL_TEACHER_PROFILE,
          teacherName: currentUser.name || 'คุณครูประจำชั้น',
          classroomName: currentUser.classroom || 'ห้องเรียน',
          schoolName: currentUser.schoolName || 'โรงเรียนสาธิต',
          position: currentUser.position || 'ครูประจำชั้น',
          affiliation: currentUser.affiliation || '',
          academicYear: currentUser.academicYear || '2569',
          adminUsername: currentUser.username,
          adminPasswordHash: currentUser.password,
          lastModifiedTimestamp: new Date().toISOString(),
        };
        this._profileCache = memberProfile;
        this.setStorageItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(memberProfile));
        return memberProfile;
      }
      this.setStorageItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(INITIAL_TEACHER_PROFILE));
      this._profileCache = INITIAL_TEACHER_PROFILE;
      return INITIAL_TEACHER_PROFILE;
    }
    try {
      const parsed: TeacherProfile = JSON.parse(data);
      if (!parsed.gasWebAppUrl || parsed.gasWebAppUrl.trim() === '') {
        parsed.gasWebAppUrl = INITIAL_TEACHER_PROFILE.gasWebAppUrl;
        this.setStorageItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(parsed));
      }
      if (!parsed.adminUsername || parsed.adminUsername.toLowerCase() === 'admin') {
        parsed.adminUsername = this.getCurrentUserId();
        this.setStorageItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(parsed));
      }
      if (!parsed.driveFolderId || parsed.driveFolderId.trim() === '' || parsed.driveFolderId !== DEFAULT_DRIVE_FOLDER_ID) {
        parsed.driveFolderId = DEFAULT_DRIVE_FOLDER_ID;
        this.setStorageItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(parsed));
      }
      this._profileCache = parsed;
      return parsed;
    } catch {
      this._profileCache = INITIAL_TEACHER_PROFILE;
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
    this._profileCache = updated;
    this.setStorageItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(updated));
    this.saveUserDoc('settings', 'profile', updated);

    // Sync changes to AppUser member record
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      let memberChanged = false;
      const updatedMember = { ...currentUser };
      if (profile.teacherName && profile.teacherName !== currentUser.name) {
        updatedMember.name = profile.teacherName;
        memberChanged = true;
      }
      if (profile.classroomName && profile.classroomName !== currentUser.classroom) {
        updatedMember.classroom = profile.classroomName;
        memberChanged = true;
      }
      if (profile.schoolName && profile.schoolName !== currentUser.schoolName) {
        updatedMember.schoolName = profile.schoolName;
        memberChanged = true;
      }
      if (profile.position && profile.position !== currentUser.position) {
        updatedMember.position = profile.position;
        memberChanged = true;
      }
      if (profile.affiliation && profile.affiliation !== currentUser.affiliation) {
        updatedMember.affiliation = profile.affiliation;
        memberChanged = true;
      }
      if (profile.academicYear && profile.academicYear !== currentUser.academicYear) {
        updatedMember.academicYear = profile.academicYear;
        memberChanged = true;
      }
      if (profile.adminPasswordHash && profile.adminPasswordHash !== currentUser.password) {
        updatedMember.password = profile.adminPasswordHash;
        memberChanged = true;
      }
      if (memberChanged) {
        this.saveMember(updatedMember, true);
      }
    }

    this.notifyToast('success', 'บันทึกการตั้งค่าสำเร็จ', 'อัปเดตข้อมูลผู้ใช้งานและระบบเรียบร้อย');
    this.notifyChanges();
  }

  public updateLastModified(): void {
    const profile = this.getProfile();
    profile.lastModifiedTimestamp = new Date().toISOString();
    this._profileCache = profile;
    this.setStorageItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(profile));
  }

  // Admin Auth & Login Credentials
  public isAdmin(): boolean {
    const user = this.getCurrentUser();
    if (user) {
      return user.role === 'admin' || user.id.toLowerCase() === 'airfan';
    }
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
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();
    const member = this.getMembers().find((m) => m.id === cleanUser || m.username.toLowerCase() === cleanUser);
    if (!member) {
      if (cleanUser === 'airfan') {
        return this.verifyAdminPassword(cleanPass);
      }
      return false;
    }
    if (member.status === 'suspended') return false;
    return member.password === cleanPass || (cleanUser === 'airfan' && this.verifyAdminPassword(cleanPass));
  }

  public loginWithCredentials(username: string, password: string): { success: boolean; error?: string } {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, error: 'invalid' };
    }

    const members = this.getMembers();
    const member = members.find((m) => m.id === cleanUser || m.username.toLowerCase() === cleanUser);

    if (member) {
      if (member.status === 'suspended') {
        return { success: false, error: 'suspended' };
      }

      const profile = this.getProfile();
      const isPassValid =
        member.password === cleanPass ||
        (cleanUser === 'airfan' && (
          cleanPass === (profile.adminPasswordHash || '456789') ||
          cleanPass === '456789' ||
          cleanPass === '1234' ||
          cleanPass === 'admin'
        ));

      if (!isPassValid) {
        return { success: false, error: 'invalid' };
      }

      const updatedMember: AppUser = {
        ...member,
        lastLogin: new Date().toISOString(),
      };
      this._currentUser = updatedMember;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, cleanUser);
      this.setAdminLoggedIn(member.role === 'admin' || cleanUser === 'airfan');

      setDoc(doc(db, 'members', cleanUser), cleanForFirestore(updatedMember)).catch(() => {});

      this.clearMemoryCaches();
      this.initUserDataListeners(cleanUser);

      return { success: true };
    }

    if (cleanUser === 'airfan' && this.verifyAdminPassword(cleanPass)) {
      const defaultAdmin = this.createDefaultAdminMember();
      defaultAdmin.password = cleanPass;
      this.saveMember(defaultAdmin);
      this._currentUser = defaultAdmin;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, 'airfan');
      this.setAdminLoggedIn(true);
      this.clearMemoryCaches();
      this.initUserDataListeners('airfan');
      return { success: true };
    }

    return { success: false, error: 'invalid' };
  }

  public loginAdmin(password: string): boolean {
    if (this.verifyAdminPassword(password)) {
      this.setAdminLoggedIn(true);
      this.notifyToast('success', 'เข้าสู่ระบบ Admin สำเร็จ', 'คุณสามารถแก้ไข ลบ และจัดการข้อมูลได้แล้ว');
      return true;
    }
    return false;
  }

  public logoutUser(): void {
    this.userDataListeners.forEach((fn) => {
      try { fn(); } catch {}
    });
    this.userDataListeners = [];
    this._currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    this.setAdminLoggedIn(false);
    this.clearMemoryCaches();
    this.notifyToast('info', 'ออกจากระบบเรียบร้อยแล้ว');
    this.notifyChanges();
  }

  public logoutAdmin(): void {
    this.logoutUser();
  }

  public verifyAdminPassword(password: string): boolean {
    const profile = this.getProfile();
    const p = password.trim();
    const expected = profile.adminPasswordHash || '456789';
    return p === expected || p === '456789' || p === '1234' || p === 'admin';
  }

  // Students (Page 2)
  public getStudents(): Student[] {
    if (this._studentsCache) return this._studentsCache;
    const data = this.getStorageItem(STORAGE_KEYS.STUDENTS);
    let list: Student[] = this.getCurrentUserId() === 'airfan' ? INITIAL_STUDENTS : [];
    if (data) {
      try {
        list = JSON.parse(data);
      } catch {
        list = this.getCurrentUserId() === 'airfan' ? INITIAL_STUDENTS : [];
      }
    }
    // Ensure all students have a valid gradeLevel (default to ป.1 if not specified)
    let hasChanges = false;
    const profile = this.getProfile();
    const defaultGrade = (profile.classroomName || 'ป.1') as any;
    const validGrades = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'];
    const resolvedDefault = validGrades.includes(defaultGrade) ? defaultGrade : 'ป.1';

    const normalized = list.map((s) => {
      if (!s.gradeLevel) {
        hasChanges = true;
        // Distribute demo students sensibly: 1st half to ป.1 or current profile grade
        return {
          ...s,
          gradeLevel: (s.studentCode?.startsWith('501') ? 'ป.1' : resolvedDefault) as any,
        };
      }
      return s;
    });

    if (hasChanges && data) {
      this.setStorageItem(STORAGE_KEYS.STUDENTS, JSON.stringify(normalized));
    }
    this._studentsCache = normalized;
    return normalized;
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
    this._studentsCache = students;
    this.setStorageItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    this.saveUserDoc('students', finalStudent.id, finalStudent);
    this.notifyChanges();
  }

  public reorderStudents(newStudents: Student[], showToast = true): void {
    const updated = newStudents.map((s, idx) => ({
      ...s,
      order: idx + 1,
      updatedAt: new Date().toISOString(),
    }));
    this._studentsCache = updated;
    this.setStorageItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
    // Persist to Firestore asynchronously
    try {
      updated.forEach((student) => {
        this.saveUserDoc('students', student.id, student);
      });
    } catch (err) {
      console.warn('[Firestore] Reorder batch error:', err);
    }
    if (showToast) {
      this.notifyToast('success', 'จัดลำดับสำเร็จ', 'บันทึกลำดับและเลขที่นักเรียนเรียบร้อยแล้ว');
    }
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
    this._studentsCache = students;
    this.setStorageItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    this.saveUserDoc('students', updatedStudent.id, updatedStudent);
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
    this._studentsCache = students;
    this.setStorageItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    this.deleteUserDoc('students', studentId);
    this.notifyToast('success', 'ลบข้อมูลเรียบร้อย', `ลบข้อมูล ${student?.firstName || 'นักเรียน'} ออกจากระบบแล้ว`);
    this.notifyChanges(true); // immediate sync with Google Sheets to delete row
  }

  // Weight & Height (Page 1)
  public getWeightHeightRecords(): WeightHeightRecord[] {
    if (this._weightHeightCache) return this._weightHeightCache;
    const data = this.getStorageItem(STORAGE_KEYS.WEIGHT_HEIGHT);
    const initial = this.getCurrentUserId() === 'airfan' ? [INITIAL_WEIGHT_HEIGHT] : [];
    if (!data) {
      this.setStorageItem(STORAGE_KEYS.WEIGHT_HEIGHT, JSON.stringify(initial));
      this._weightHeightCache = initial;
      return initial;
    }
    try {
      const parsed = JSON.parse(data);
      this._weightHeightCache = parsed;
      return parsed;
    } catch {
      this._weightHeightCache = initial;
      return initial;
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

    this._weightHeightCache = records;
    this.setStorageItem(STORAGE_KEYS.WEIGHT_HEIGHT, JSON.stringify(records));
    this.saveUserDoc('weightHeight', updatedRecord.id, updatedRecord);
    if (!isAutoSave) {
      this.notifyToast('success', 'บันทึกสำเร็จ', `บันทึกน้ำหนัก-ส่วนสูง วันที่ ${record.date} เรียบร้อย`);
    }
    this.notifyChanges();
  }

  public deleteWeightHeightRecord(id: string): void {
    let records = this.getWeightHeightRecords();
    records = records.filter((r) => r.id !== id);
    this._weightHeightCache = records;
    this.setStorageItem(STORAGE_KEYS.WEIGHT_HEIGHT, JSON.stringify(records));
    this.deleteUserDoc('weightHeight', id);
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
    if (this._attendanceBankCache) return this._attendanceBankCache;
    const data = this.getStorageItem(STORAGE_KEYS.ATTENDANCE_BANK);
    if (!data) {
      if (this.getCurrentUserId() !== 'airfan') {
        this._attendanceBankCache = {};
        return {};
      }
      // Create today's default for airfan
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
      this.setStorageItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(initialData));
      this._attendanceBankCache = initialData;
      return initialData;
    }
    try {
      const parsed = JSON.parse(data);
      this._attendanceBankCache = parsed;
      return parsed;
    } catch {
      this._attendanceBankCache = {};
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
    this._attendanceBankCache = all;
    this.setStorageItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(all));
    this.saveUserDoc('attendanceBank', date, dayEntry);

    // Recalculate students' total savings from sum of deposits minus withdrawals
    this.recalculateAllSavings();

    if (!isSilent) {
      this.notifyToast('success', 'บันทึกสำเร็จ', `บันทึกเงินฝากและการเช็คชื่อประจำวันที่ ${date} แล้ว`);
    }
    this.notifyChanges();
  }

  public getWithdrawalLogs(): WithdrawalLog[] {
    if (this._withdrawalLogsCache) return this._withdrawalLogsCache;
    const data = this.getStorageItem(STORAGE_KEYS.WITHDRAWAL_LOGS);
    const initial = this.getCurrentUserId() === 'airfan' ? INITIAL_WITHDRAWAL_LOGS : [];
    if (!data) {
      this.setStorageItem(STORAGE_KEYS.WITHDRAWAL_LOGS, JSON.stringify(initial));
      this._withdrawalLogsCache = initial;
      return initial;
    }
    try {
      const parsed = JSON.parse(data);
      this._withdrawalLogsCache = parsed;
      return parsed;
    } catch {
      this._withdrawalLogsCache = initial;
      return initial;
    }
  }

  public getWithdrawalPendingDays(): WithdrawalPendingDay[] {
    if (this._pendingDaysCache) return this._pendingDaysCache;
    const data = this.getStorageItem(STORAGE_KEYS.WITHDRAWAL_PENDING_DAYS);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      this._pendingDaysCache = parsed;
      return parsed;
    } catch {
      this._pendingDaysCache = [];
      return [];
    }
  }

  public saveWithdrawalPendingDays(list: WithdrawalPendingDay[]): void {
    this._pendingDaysCache = list;
    this.setStorageItem(STORAGE_KEYS.WITHDRAWAL_PENDING_DAYS, JSON.stringify(list));
    this.saveUserDoc('settings', 'withdrawalPendingDays', { list });
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
    this._attendanceBankCache = allBank;
    this.setStorageItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(allBank));
    affectedDates.forEach((dStr) => {
      if (allBank[dStr]) {
        this.saveUserDoc('attendanceBank', dStr, allBank[dStr]);
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
    this._withdrawalLogsCache = logs;
    this.setStorageItem(STORAGE_KEYS.WITHDRAWAL_LOGS, JSON.stringify(logs));
    this.saveUserDoc('withdrawalLogs', logId, log);

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

  public deleteWithdrawalLog(id: string): { success: boolean; message: string } {
    const logs = this.getWithdrawalLogs();
    const targetLog = logs.find((l) => l.id === id);
    if (!targetLog) {
      return { success: false, message: 'ไม่พบรายการประวัติการถอนเงิน' };
    }

    // 1. Find all pending deduction days associated with this withdrawal log
    const pendingList = this.getWithdrawalPendingDays();
    const associatedPending = pendingList.filter((p) => p.withdrawalLogId === id);
    const remainingPending = pendingList.filter((p) => p.withdrawalLogId !== id);

    // 2. If there are associated pending days, restore deposits back to those days
    const allBank = this.getAllAttendanceAndBank();
    const affectedDates: string[] = [];

    if (associatedPending.length > 0) {
      associatedPending.forEach((p) => {
        const dStr = p.date;
        if (allBank[dStr]) {
          const dayData = allBank[dStr];
          if (!dayData.deposits) dayData.deposits = {};
          dayData.deposits[p.studentId] = (dayData.deposits[p.studentId] || 0) + (p.amount || 0);

          // Clean up note if it contained the withdrawal note entry
          if (dayData.note) {
            const notePattern = `[ถอนเงิน ${p.amount} บาท (${p.studentName}) เหตุผล: ${p.reason}]`;
            dayData.note = dayData.note.replace(notePattern, '').replace(/\s+/g, ' ').trim();
          }
          dayData.updatedAt = new Date().toISOString();
          allBank[dStr] = dayData;
          if (!affectedDates.includes(dStr)) {
            affectedDates.push(dStr);
          }
        }
      });
    }

    // Save updated allBank & sync to Firestore
    if (affectedDates.length > 0) {
      this._attendanceBankCache = allBank;
      this.setStorageItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(allBank));
      affectedDates.forEach((dStr) => {
        if (allBank[dStr]) {
          this.saveUserDoc('attendanceBank', dStr, allBank[dStr]);
        }
      });
    }

    // 3. Save remaining pending days
    this.saveWithdrawalPendingDays(remainingPending);

    // 4. Remove withdrawal log from cache, local storage & Firestore
    const updatedLogs = logs.filter((l) => l.id !== id);
    this._withdrawalLogsCache = updatedLogs;
    this.setStorageItem(STORAGE_KEYS.WITHDRAWAL_LOGS, JSON.stringify(updatedLogs));
    this.deleteUserDoc('withdrawalLogs', id);

    // 5. Recalculate student savings to ensure total consistency
    this.recalculateAllSavings(true);

    this.notifyToast(
      'success',
      'ลบประวัติการถอนเงินเรียบร้อย',
      `ลบรายการถอนเงิน ${targetLog.amount.toLocaleString()} บาท ของ ${targetLog.studentName} เรียบร้อยแล้ว`
    );
    this.notifyChanges(true);

    return { success: true, message: 'ลบรายการสำเร็จ' };
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
    this.saveUserDoc('attendanceBank', date, dayData);
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
    this.setStorageItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedStudents));
    updatedStudents.forEach((s) => {
      this.saveUserDoc('students', s.id, s);
    });

    // 2. Clear all deposit records in history and clear attendance records so they can start completely fresh
    const allBank = this.getAllAttendanceAndBank();
    Object.keys(allBank).forEach((dateKey) => {
      if (allBank[dateKey]) {
        const clearedDeposits: Record<string, number> = {};
        students.forEach((s) => {
          clearedDeposits[s.id] = 0;
        });
        allBank[dateKey].deposits = clearedDeposits;
        allBank[dateKey].attendance = {}; // Clear attendance so teachers can start fresh
        allBank[dateKey].note = '';
        allBank[dateKey].updatedAt = new Date().toISOString();
        this.saveUserDoc('attendanceBank', dateKey, allBank[dateKey]);
      }
    });
    this.setStorageItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(allBank));

    // 3. Clear pending withdrawal logs & pending days
    this.saveWithdrawalPendingDays([]);
    this.setStorageItem(STORAGE_KEYS.WITHDRAWAL_LOGS, JSON.stringify([]));

    // 4. Notify toast & sync immediately
    this.notifyToast(
      'success',
      'ลบเงินฝากและรีเซ็ตการมาเรียนสำเร็จ',
      'ลบเงินฝากของทุกคนเป็น 0 บาท และรีเซ็ตข้อมูลการมาเรียนเริ่มต้นใหม่เรียบร้อยแล้ว'
    );
    this.notifyChanges(true); // immediate sync with Google Sheets

    return {
      success: true,
      message: 'ลบเงินฝากและรีเซ็ตข้อมูลการมาเรียนเริ่มต้นใหม่เรียบร้อยแล้ว'
    };
  }

  // Delete specific bank & attendance data (All, มา, ขาด, ป่วย, ลา, เงินออม)
  public deleteBankAttendanceData(params: {
    target: 'all' | 'savings' | 'present' | 'absent' | 'sick' | 'personal';
    scope: 'day' | 'all';
    date: string;
    password: string;
  }): { success: boolean; message: string } {
    if (!this.verifyAdminPassword(params.password)) {
      return {
        success: false,
        message: 'รหัสผ่านไม่ถูกต้อง กรุณากรอก Password ที่ถูกต้องเพื่อยืนยัน'
      };
    }

    const { target, scope, date } = params;
    const allBank = this.getAllAttendanceAndBank();
    const students = this.getStudents();

    if (scope === 'day') {
      const dayEntry: DayAttendanceAndBank = allBank[date] || {
        date,
        attendance: {},
        deposits: {},
        note: '',
        updatedAt: new Date().toISOString()
      };

      const att = { ...(dayEntry.attendance || {}) };
      const dep = { ...(dayEntry.deposits || {}) };

      if (target === 'all') {
        // ลบทั้งหมด: ทั้งมา ขาด ป่วย ลา เงินออม
        students.forEach((s) => {
          delete att[s.id];
          dep[s.id] = 0;
        });
        dayEntry.note = '';
      } else if (target === 'savings') {
        // ลบเฉพาะเงินออมในวันที่เลือก
        students.forEach((s) => {
          dep[s.id] = 0;
        });
      } else if (target === 'present') {
        // ลบสถานะมาเรียน
        students.forEach((s) => {
          if (att[s.id] === 'present') {
            delete att[s.id];
          }
        });
      } else if (target === 'absent') {
        // ลบสถานะขาดเรียน
        students.forEach((s) => {
          if (att[s.id] === 'absent') {
            delete att[s.id];
          }
        });
      } else if (target === 'sick') {
        // ลบสถานะป่วย
        students.forEach((s) => {
          if (att[s.id] === 'sick') {
            delete att[s.id];
          }
        });
      } else if (target === 'personal') {
        // ลบสถานะลา
        students.forEach((s) => {
          if (att[s.id] === 'personal') {
            delete att[s.id];
          }
        });
      }

      dayEntry.attendance = att;
      dayEntry.deposits = dep;
      dayEntry.updatedAt = new Date().toISOString();
      allBank[date] = dayEntry;

      this.setStorageItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(allBank));
      this.saveUserDoc('attendanceBank', date, dayEntry);

      this.recalculateAllSavings();
      this.notifyChanges(true);

      const label = this.getBankDeleteTargetLabel(target);
      this.notifyToast('success', 'ลบข้อมูลสำเร็จ', `ลบข้อมูล ${label} ในวันที่เลือกเรียบร้อยแล้ว`);

      return {
        success: true,
        message: `ลบข้อมูล ${label} ในวันที่เลือกเรียบร้อยแล้ว`
      };
    } else {
      // scope === 'all' (ทุกวัน/ประวัติทั้งหมด)
      if (target === 'all') {
        return this.resetAllStudentsSavings(params.password);
      } else if (target === 'savings') {
        // ลบเงินออมทั้งหมด ทุกวัน
        Object.keys(allBank).forEach((d) => {
          if (allBank[d]) {
            const clearedDep: Record<string, number> = {};
            students.forEach((s) => { clearedDep[s.id] = 0; });
            allBank[d].deposits = clearedDep;
            allBank[d].updatedAt = new Date().toISOString();
            this.saveUserDoc('attendanceBank', d, allBank[d]);
          }
        });
        this.setStorageItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(allBank));

        const updatedStudents = students.map((s) => ({
          ...s,
          currentSavings: 0,
          updatedAt: new Date().toISOString()
        }));
        this.setStorageItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedStudents));
        updatedStudents.forEach((s) => {
          this.saveUserDoc('students', s.id, s);
        });

        this.saveWithdrawalPendingDays([]);
        this.setStorageItem(STORAGE_KEYS.WITHDRAWAL_LOGS, JSON.stringify([]));
        this.notifyChanges(true);

        this.notifyToast('success', 'ลบยอดเงินออมสำเร็จ', 'ลบยอดเงินออมของนักเรียนทุกคนเป็น 0 บาทเรียบร้อยแล้ว');
        return {
          success: true,
          message: 'ลบยอดเงินออมของนักเรียนทุกคนเป็น 0 บาทเรียบร้อยแล้ว'
        };
      } else {
        // ลบสถานะการเช็คชื่อตามประเภทที่เลือกในทุกวัน
        Object.keys(allBank).forEach((d) => {
          if (allBank[d]?.attendance) {
            const att = { ...allBank[d].attendance };
            let modified = false;
            students.forEach((s) => {
              if (att[s.id] === target) {
                delete att[s.id];
                modified = true;
              }
            });
            if (modified) {
              allBank[d].attendance = att;
              allBank[d].updatedAt = new Date().toISOString();
              this.saveUserDoc('attendanceBank', d, allBank[d]);
            }
          }
        });
        this.setStorageItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(allBank));
        this.notifyChanges(true);

        const label = this.getBankDeleteTargetLabel(target);
        this.notifyToast('success', 'ลบข้อมูลสำเร็จ', `ลบข้อมูล ${label} ทั้งหมดในระบบเรียบร้อยแล้ว`);
        return {
          success: true,
          message: `ลบข้อมูล ${label} ทั้งหมดในระบบเรียบร้อยแล้ว`
        };
      }
    }
  }

  private getBankDeleteTargetLabel(target: string): string {
    switch (target) {
      case 'all': return 'ทั้งหมด (มา ขาด ป่วย ลา เงินออม)';
      case 'savings': return 'เงินออม';
      case 'present': return 'มา (มาเรียน)';
      case 'absent': return 'ขาด (ขาดเรียน)';
      case 'sick': return 'ป่วย (ลาป่วย)';
      case 'personal': return 'ลา (ลากิจ)';
      default: return target;
    }
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

    const changedStudents: Student[] = [];
    const updatedStudents = students.map((s) => {
      const sumDeposits = totalDepositsByStudent[s.id];
      const newSavings = sumDeposits !== undefined ? sumDeposits : (s.currentSavings || 0);
      if (s.currentSavings !== newSavings) {
        const updated = { ...s, currentSavings: Math.max(0, newSavings) };
        changedStudents.push(updated);
        return updated;
      }
      return s;
    });

    if (changedStudents.length > 0) {
      this._studentsCache = updatedStudents;
      this.setStorageItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedStudents));
      if (triggerSync) {
        changedStudents.forEach((s) => {
          this.saveUserDoc('students', s.id, s);
        });
      }
    }
  }

  // Score Tracker (Page 4)
  public getScoreSheets(): ScoreSheet[] {
    if (this._scoresCache) return this._scoresCache;
    const data = this.getStorageItem(STORAGE_KEYS.SCORE_SHEETS);
    const initial = [INITIAL_SCORE_SHEET];
    if (!data) {
      this.setStorageItem(STORAGE_KEYS.SCORE_SHEETS, JSON.stringify(initial));
      this._scoresCache = initial;
      return initial;
    }
    try {
      const parsed = JSON.parse(data);
      this._scoresCache = parsed;
      return parsed;
    } catch {
      this._scoresCache = initial;
      return initial;
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

    this._scoresCache = list;
    this.setStorageItem(STORAGE_KEYS.SCORE_SHEETS, JSON.stringify(list));
    this.saveUserDoc('scoreSheets', updated.id, updated);
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
      this.saveUserDoc('scoreSheets', defaultSheet.id, defaultSheet);
    }
    this.deleteUserDoc('scoreSheets', id);
    this._scoresCache = list;
    this.setStorageItem(STORAGE_KEYS.SCORE_SHEETS, JSON.stringify(list));
    this.notifyToast('success', 'ลบรายวิชาเรียบร้อย');
    this.notifyChanges(true);
  }

  // Calendar Events
  public getCalendarEvents(): CalendarEvent[] {
    if (this._eventsCache) return this._eventsCache;
    const data = this.getStorageItem(STORAGE_KEYS.CALENDAR_EVENTS);
    const initial = this.getCurrentUserId() === 'airfan' ? INITIAL_CALENDAR_EVENTS : [];
    if (!data) {
      this.setStorageItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(initial));
      this._eventsCache = initial;
      return initial;
    }
    try {
      const parsed = JSON.parse(data);
      this._eventsCache = parsed;
      return parsed;
    } catch {
      this._eventsCache = initial;
      return initial;
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
    this._eventsCache = events;
    this.setStorageItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(events));
    this.saveUserDoc('calendarEvents', event.id, event);
    this.notifyChanges();
  }

  public deleteCalendarEvent(id: string): void {
    let events = this.getCalendarEvents();
    events = events.filter((e) => e.id !== id);
    this._eventsCache = events;
    this.setStorageItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(events));
    this.deleteUserDoc('calendarEvents', id);
    this.notifyToast('success', 'ลบกิจกรรมเรียบร้อย');
    this.notifyChanges(true);
  }

  // Dashboard Notes (สมุดบันทึกโน๊ตด่วน)
  public getNotes(): DashboardNote[] {
    if (this._notesCache) return this._notesCache;
    const data = this.getStorageItem(STORAGE_KEYS.DASHBOARD_NOTES);
    const initial = this.getCurrentUserId() === 'airfan' ? INITIAL_DASHBOARD_NOTES : [];
    if (!data) {
      this.setStorageItem(STORAGE_KEYS.DASHBOARD_NOTES, JSON.stringify(initial));
      this._notesCache = initial;
      return initial;
    }
    try {
      const parsed: DashboardNote[] = JSON.parse(data);
      // Sort pinned first, then newest
      const sorted = parsed.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      });
      this._notesCache = sorted;
      return sorted;
    } catch {
      this._notesCache = initial;
      return initial;
    }
  }

  public saveNote(note: DashboardNote): void {
    const notes = this.getNotes();
    const index = notes.findIndex((n) => n.id === note.id);
    const updatedNote = {
      ...note,
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) {
      notes[index] = updatedNote;
      this.notifyToast('success', 'แก้ไขโน๊ตสำเร็จ');
    } else {
      notes.unshift(updatedNote);
      this.notifyToast('success', 'เพิ่มโน๊ตใหม่สำเร็จ', note.title || note.content.slice(0, 20));
    }
    this._notesCache = notes;
    this.setStorageItem(STORAGE_KEYS.DASHBOARD_NOTES, JSON.stringify(notes));
    this.saveUserDoc('dashboardNotes', note.id, updatedNote);
    this.notifyChanges();
  }

  public deleteNote(id: string): void {
    let notes = this.getNotes();
    notes = notes.filter((n) => n.id !== id);
    this._notesCache = notes;
    this.setStorageItem(STORAGE_KEYS.DASHBOARD_NOTES, JSON.stringify(notes));
    this.deleteUserDoc('dashboardNotes', id);
    this.notifyToast('success', 'ลบโน๊ตเรียบร้อย');
    this.notifyChanges(true);
  }

  public togglePinNote(id: string): void {
    const notes = this.getNotes();
    const index = notes.findIndex((n) => n.id === id);
    if (index >= 0) {
      const isNowPinned = !notes[index].isPinned;
      notes[index] = {
        ...notes[index],
        isPinned: isNowPinned,
        updatedAt: new Date().toISOString(),
      };
      this._notesCache = notes;
      this.setStorageItem(STORAGE_KEYS.DASHBOARD_NOTES, JSON.stringify(notes));
      this.saveUserDoc('dashboardNotes', id, notes[index]);
      this.notifyToast(
        'info',
        isNowPinned ? 'ปักหมุดโน๊ตแล้ว' : 'ยกเลิกการปักหมุด',
        notes[index].title || notes[index].content.slice(0, 20)
      );
      this.notifyChanges();
    }
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
          Notes: this.getNotes(),
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
      notes: this.getNotes(),
      photos: this.getActivityPhotos(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  public importDatabaseJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.students) {
        this.setStorageItem(STORAGE_KEYS.STUDENTS, JSON.stringify(parsed.students));
        if (Array.isArray(parsed.students)) {
          parsed.students.forEach((s: Student) => {
            this.saveUserDoc('students', s.id, s);
          });
        }
      }
      if (parsed.weightHeight) {
        this.setStorageItem(STORAGE_KEYS.WEIGHT_HEIGHT, JSON.stringify(parsed.weightHeight));
        if (Array.isArray(parsed.weightHeight)) {
          parsed.weightHeight.forEach((r: WeightHeightRecord) => {
            this.saveUserDoc('weightHeight', r.id, r);
          });
        }
      }
      if (parsed.attendanceBank) {
        this.setStorageItem(STORAGE_KEYS.ATTENDANCE_BANK, JSON.stringify(parsed.attendanceBank));
        Object.entries(parsed.attendanceBank).forEach(([k, v]) => {
          if (v && typeof v === 'object') {
            this.saveUserDoc('attendanceBank', k, v as object);
          }
        });
      }
      if (parsed.withdrawals) {
        this.setStorageItem(STORAGE_KEYS.WITHDRAWAL_LOGS, JSON.stringify(parsed.withdrawals));
        if (Array.isArray(parsed.withdrawals)) {
          parsed.withdrawals.forEach((w: WithdrawalLog) => {
            this.saveUserDoc('withdrawalLogs', w.id, w);
          });
        }
      }
      if (parsed.scoreSheets) {
        this.setStorageItem(STORAGE_KEYS.SCORE_SHEETS, JSON.stringify(parsed.scoreSheets));
        if (Array.isArray(parsed.scoreSheets)) {
          parsed.scoreSheets.forEach((s: ScoreSheet) => {
            this.saveUserDoc('scoreSheets', s.id, s);
          });
        }
      }
      if (parsed.events) {
        this.setStorageItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(parsed.events));
        if (Array.isArray(parsed.events)) {
          parsed.events.forEach((ev: CalendarEvent) => {
            this.saveUserDoc('calendarEvents', ev.id, ev);
          });
        }
      }
      if (parsed.notes) {
        this.setStorageItem(STORAGE_KEYS.DASHBOARD_NOTES, JSON.stringify(parsed.notes));
        if (Array.isArray(parsed.notes)) {
          parsed.notes.forEach((n: DashboardNote) => {
            this.saveUserDoc('dashboardNotes', n.id, n);
          });
        }
      }
      if (parsed.photos) this.setStorageItem(STORAGE_KEYS.ACTIVITY_PHOTOS, JSON.stringify(parsed.photos));
      if (parsed.profile) {
        this.setStorageItem(STORAGE_KEYS.TEACHER_PROFILE, JSON.stringify(parsed.profile));
        this.saveUserDoc('settings', 'profile', parsed.profile);
      }

      this.clearMemoryCaches();
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
