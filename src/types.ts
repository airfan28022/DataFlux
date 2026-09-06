export type AttendanceStatus = 'present' | 'sick' | 'personal' | 'absent' | 'late';

export interface DynamicField {
  id: string;
  label: string;
  value: string;
}

export interface Student {
  id: string;
  studentCode: string;
  prefix: 'เด็กชาย' | 'เด็กหญิง' | 'นาย' | 'นางสาว';
  firstName: string;
  lastName: string;
  nickname: string;
  birthDate: string; // YYYY-MM-DD
  age: number;
  gender: 'male' | 'female';
  livesWith: string; // เช่น บิดา-มารดา, ปู่ย่า, ตา-ยาย, ญาติ
  commuteMethod: string; // เช่น เดิน, รถโรงเรียน, มอเตอร์ไซค์, รถยนต์ส่วนบุคคล
  dailyAllowance: number; // บาท
  parentOccupation: string;
  parentPhone: string;
  address?: string;
  bloodType?: string;
  chronicDisease?: string;
  photoUrl?: string;
  driveFileId?: string;
  dynamicFields?: DynamicField[];
  currentSavings: number; // เงินออมสะสม
  createdAt: string;
  updatedAt: string;
}

export interface WeightHeightRow {
  id: string;
  order: number;
  studentId?: string;
  studentName: string;
  age: number | '';
  weight: number | ''; // กก.
  height: number | ''; // ซม.
  bmi?: number;
  status?: string; // ผอม, สมส่วน, ท้วม, อ้วน
}

export interface WeightHeightRecord {
  id: string;
  date: string; // YYYY-MM-DD
  academicYear: string;
  term: '1' | '2';
  note?: string;
  rows: WeightHeightRow[];
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  note?: string;
}

export interface DayAttendanceAndBank {
  date: string; // YYYY-MM-DD
  attendance: Record<string, AttendanceStatus>; // studentId -> status
  deposits: Record<string, number>; // studentId -> deposit amount
  note?: string; // ข้อความ/เหตุผลที่นักเรียนไม่ฝากเงิน หรือหมายเหตุประจำวัน
  updatedAt: string;
}

export interface WithdrawalLog {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  time: string;
  amount: number;
  reason: string;
  adminName: string;
  createdAt: string;
}

export type GradingSystem = 'thai_standard' | 'letter_grade';

export interface StudentScoreRow {
  studentId: string;
  order: number;
  studentName: string;
  chapterScores: Record<number, number | '-'>;
  totalScore: number;
  percentage: number;
  grade: string;
}

export interface ScoreItem {
  scores: (number | '-' | null)[]; // 10 items, 0-5 or '-'
}

export interface ScoreChapter {
  chapterNumber: number; // 1 to 8
  title: string; // e.g. "บทที่ 1: การบวกและการลบ"
  maxScore?: number; // คะแนนเก็บของบทนั้นๆ เช่น 15, 20
  topics?: string[]; // หัวข้อเรื่องทั้ง 10 เรื่อง (ความยาว 10 ช่อง, ว่างเปล่า = ไม่คิดคะแนน)
  // studentId -> array of 10 score items (0-5, '-' หรือ null)
  scores: Record<string, (number | '-' | null)[]>;
  maxScorePerItem?: number; // Default 5
  totalItems?: number; // 10 items
  weightPercentage?: number;
}

export interface ScoreSheet {
  id: string;
  title?: string;
  subjectName: string;
  subjectCode?: string;
  classroom?: string;
  term: '1' | '2';
  academicYear: string;
  chapterCount: number; // 1 to 8
  gradingSystem: GradingSystem;
  scores: StudentScoreRow[];
  totalChapters?: number;
  chapters?: ScoreChapter[];
  finalExamMaxScore?: number; // คะแนนสอบปลายภาค เช่น 20 หรือ 30 คะแนน
  finalExamScores?: Record<string, number | '-' | null>; // studentId -> คะแนนสอบปลายภาค
  studentList?: Array<{
    id: string;
    studentId?: string;
    order: number;
    name: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  description?: string;
  color: 'emerald' | 'teal' | 'blue' | 'amber' | 'rose' | 'purple';
  category?: string;
  createdAt: string;
}

export interface ActivityPhoto {
  id: string;
  title: string;
  description?: string;
  driveUrl: string;
  driveFileId?: string;
  date: string;
  category?: string;
  createdAt: string;
}

export interface TeacherProfile {
  teacherName: string;
  schoolName: string;
  classroomName: string;
  academicYear: string;
  adminUsername: string;
  adminPasswordHash: string; // Default: '456789'
  gasWebAppUrl: string;
  driveFolderId: string;
  lastModifiedTimestamp: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface SweetAlertOptions {
  type: 'success' | 'error' | 'warning' | 'info' | 'question';
  title: string;
  text?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}
