/**
 * Utility helpers for Google Drive, Thai Date formatting, BMI, and calculations.
 */

export const DEFAULT_DRIVE_FOLDER_ID = '1nymxjSukQ_exIWuN6HRehXRTFrPrfekP';

/**
 * Extracts Google Drive File ID from various link formats
 */
export function extractDriveFileId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If it's just an alphanumeric file ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  // https://drive.google.com/file/d/FILE_ID/view...
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // https://drive.google.com/open?id=FILE_ID or uc?id=FILE_ID
  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) return matchIdParam[1];

  return null;
}

/**
 * Converts Google Drive URL or File ID to direct streamable image URL
 */
export function getDriveDirectImageUrl(urlOrId: string): string {
  if (!urlOrId) return '';
  const fileId = extractDriveFileId(urlOrId);
  if (fileId) {
    // lh3.googleusercontent.com/d/ provides high reliability and no rate limit blocking
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return urlOrId;
}

/**
 * Returns direct URL to the Google Drive Folder
 */
export function getDriveFolderUrl(folderId = DEFAULT_DRIVE_FOLDER_ID): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

/**
 * Default fallback image placeholder SVG
 */
export const DEFAULT_AVATAR_PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

export const DEFAULT_IMAGE_PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';

/**
 * Thai Month Names
 */
export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_DAYS = [
  'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
];

/**
 * Formats a Date or ISO string into a Thai Buddhist Era date string
 * Example: "6 กันยายน 2569"
 */
export function formatThaiDate(dateInput: string | Date | number, includeDayName = false): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const year = d.getFullYear() + 543;

  if (includeDayName) {
    const dayName = THAI_DAYS[d.getDay()];
    return `${dayName}ที่ ${day} ${month} ${year}`;
  }
  return `${day} ${month} ${year}`;
}

/**
 * Formats date and time into full Thai string
 * Example: "วันอาทิตย์ที่ 6 กันยายน 2569 เวลา 12:45:10 น."
 */
export function formatThaiDateTime(dateInput: string | Date | number): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const datePart = formatThaiDate(d, true);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return `${datePart} เวลา ${hours}:${minutes}:${seconds} น.`;
}

/**
 * Calculates Age from Birth Date
 */
export function calculateAge(birthDateString: string): number {
  if (!birthDateString) return 0;
  const today = new Date();
  const birth = new Date(birthDateString);
  if (isNaN(birth.getTime())) return 0;

  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Calculates BMI and Thai health criteria according to Department of Health, Ministry of Public Health Thailand
 * (เกณฑ์มาตรฐานอ้างอิงการเจริญเติบโต สำนักโภชนาการ กรมอนามัย กระทรวงสาธารณสุข)
 * 
 * รองรับการแยกเกณฑ์ตามเพศ (ชาย / หญิง) และช่วงอายุวัยเรียน (เด็กชาย / เด็กหญิง)
 * สูตรคำนวณมาตรฐานสากล:
 * BMI = น้ำหนักตัว (กิโลกรัม) ÷ [ส่วนสูง (เมตร)]²
 */
export function calculateBMI(
  weightKg: number | '',
  heightCm: number | '',
  gender?: 'ชาย' | 'หญิง' | string,
  age?: number | ''
): {
  bmi: number;
  status: string;
  badgeColor: string;
  criteria: string;
} {
  const w = Number(weightKg);
  const h = Number(heightCm);
  if (!w || !h || w <= 0 || h <= 0) {
    return { bmi: 0, status: '-', badgeColor: 'bg-gray-100 text-gray-500 border border-gray-200', criteria: '-' };
  }

  const heightM = h / 100;
  // Standard BMI formula: weight (kg) / [height (m)]^2
  const rawBmi = w / (heightM * heightM);
  const bmi = Number(rawBmi.toFixed(2));
  const numericAge = typeof age === 'number' && age > 0 ? age : undefined;

  // Department of Health Thailand growth reference criteria by gender and age
  let underweightThreshold = 18.5;
  let normalUpperThreshold = 22.9;
  let overweightUpperThreshold = 24.9;
  let obese1UpperThreshold = 29.9;
  let labelPrefix = gender ? `เพศ${gender}` : 'เกณฑ์ทั่วไป';

  if (gender === 'ชาย') {
    if (numericAge && numericAge >= 5 && numericAge <= 17) {
      labelPrefix = `เด็กชาย (${numericAge} ปี)`;
      if (numericAge <= 7) {
        underweightThreshold = 13.5; normalUpperThreshold = 18.0; overweightUpperThreshold = 19.8; obese1UpperThreshold = 22.0;
      } else if (numericAge <= 9) {
        underweightThreshold = 14.0; normalUpperThreshold = 19.2; overweightUpperThreshold = 21.5; obese1UpperThreshold = 24.0;
      } else if (numericAge <= 11) {
        underweightThreshold = 14.8; normalUpperThreshold = 20.8; overweightUpperThreshold = 23.5; obese1UpperThreshold = 26.0;
      } else if (numericAge <= 13) {
        underweightThreshold = 15.5; normalUpperThreshold = 21.8; overweightUpperThreshold = 24.5; obese1UpperThreshold = 27.2;
      } else {
        underweightThreshold = 16.5; normalUpperThreshold = 22.5; overweightUpperThreshold = 25.0; obese1UpperThreshold = 28.5;
      }
    } else {
      labelPrefix = 'เพศชาย';
      underweightThreshold = 18.5;
      normalUpperThreshold = 22.9;
      overweightUpperThreshold = 24.9;
      obese1UpperThreshold = 29.9;
    }
  } else if (gender === 'หญิง') {
    if (numericAge && numericAge >= 5 && numericAge <= 17) {
      labelPrefix = `เด็กหญิง (${numericAge} ปี)`;
      if (numericAge <= 7) {
        underweightThreshold = 13.2; normalUpperThreshold = 18.2; overweightUpperThreshold = 20.0; obese1UpperThreshold = 22.5;
      } else if (numericAge <= 9) {
        underweightThreshold = 13.8; normalUpperThreshold = 19.5; overweightUpperThreshold = 22.0; obese1UpperThreshold = 24.5;
      } else if (numericAge <= 11) {
        underweightThreshold = 14.7; normalUpperThreshold = 21.2; overweightUpperThreshold = 23.8; obese1UpperThreshold = 26.5;
      } else if (numericAge <= 13) {
        underweightThreshold = 15.3; normalUpperThreshold = 22.2; overweightUpperThreshold = 25.0; obese1UpperThreshold = 27.8;
      } else {
        underweightThreshold = 16.2; normalUpperThreshold = 22.5; overweightUpperThreshold = 25.0; obese1UpperThreshold = 28.5;
      }
    } else {
      labelPrefix = 'เพศหญิง';
      underweightThreshold = 18.0;
      normalUpperThreshold = 22.5;
      overweightUpperThreshold = 24.9;
      obese1UpperThreshold = 29.9;
    }
  }

  if (bmi < underweightThreshold) {
    return {
      bmi,
      status: 'ผอม',
      badgeColor: 'bg-amber-50 text-amber-700 border border-amber-200',
      criteria: `${labelPrefix}: ผอม (< ${underweightThreshold})`
    };
  } else if (bmi >= underweightThreshold && bmi <= normalUpperThreshold) {
    return {
      bmi,
      status: 'สมส่วน',
      badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      criteria: `${labelPrefix}: สมส่วน (${underweightThreshold} - ${normalUpperThreshold})`
    };
  } else if (bmi > normalUpperThreshold && bmi <= overweightUpperThreshold) {
    return {
      bmi,
      status: 'ท้วม',
      badgeColor: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
      criteria: `${labelPrefix}: ท้วม (${(normalUpperThreshold + 0.1).toFixed(1)} - ${overweightUpperThreshold})`
    };
  } else if (bmi > overweightUpperThreshold && bmi <= obese1UpperThreshold) {
    return {
      bmi,
      status: 'เริ่มอ้วน',
      badgeColor: 'bg-orange-50 text-orange-700 border border-orange-200',
      criteria: `${labelPrefix}: เริ่มอ้วน (${(overweightUpperThreshold + 0.1).toFixed(1)} - ${obese1UpperThreshold})`
    };
  } else {
    return {
      bmi,
      status: 'อ้วน',
      badgeColor: 'bg-rose-50 text-rose-700 border border-rose-200',
      criteria: `${labelPrefix}: อ้วน (> ${obese1UpperThreshold})`
    };
  }
}

/**
 * Calculates grade from score percentage (0 - 100)
 */
export function calculateThaiGrade(percentage: number): { grade: string; text: string; color: string } {
  if (percentage >= 80) return { grade: '4', text: 'ดีเยี่ยม', color: 'text-emerald-700 bg-emerald-50' };
  if (percentage >= 75) return { grade: '3.5', text: 'ดีมาก', color: 'text-emerald-600 bg-emerald-50' };
  if (percentage >= 70) return { grade: '3', text: 'ดี', color: 'text-teal-600 bg-teal-50' };
  if (percentage >= 65) return { grade: '2.5', text: 'ค่อนข้างดี', color: 'text-blue-600 bg-blue-50' };
  if (percentage >= 60) return { grade: '2', text: 'ปานกลาง', color: 'text-amber-600 bg-amber-50' };
  if (percentage >= 55) return { grade: '1.5', text: 'พอใช้', color: 'text-orange-600 bg-orange-50' };
  if (percentage >= 50) return { grade: '1', text: 'ผ่านเกณฑ์ขั้นต่ำ', color: 'text-rose-600 bg-rose-50' };
  return { grade: '0', text: 'ไม่ผ่านเกณฑ์', color: 'text-red-700 bg-red-50' };
}

export function calculateGradeFromPercent(
  percentage: number,
  system: 'thai_standard' | 'letter_grade' = 'thai_standard'
): string {
  if (system === 'letter_grade') {
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  }
  // Thai standard
  if (percentage >= 80) return '4';
  if (percentage >= 75) return '3.5';
  if (percentage >= 70) return '3';
  if (percentage >= 65) return '2.5';
  if (percentage >= 60) return '2';
  if (percentage >= 55) return '1.5';
  if (percentage >= 50) return '1';
  return '0';
}
